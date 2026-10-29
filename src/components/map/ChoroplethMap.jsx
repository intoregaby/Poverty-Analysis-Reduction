import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, ZoomControl } from "react-leaflet";
import MapLabels, { SectorLabels, viewBounds } from "@/components/map/MapLabels";
import { ArrowLeft, Maximize2, Type } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { NATIONAL_EICV7 } from "@/data/dashboardEvidence";
import { sectorSample } from "@/data/sectorSamples";
import { describeValue, fillFor, isSmallSampleLayer, MAP_LAYERS } from "@/lib/mapLayers";

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// Sector shades: the more sample records in a sector, the darker. Sectors with none stay pale.
export const SECTOR_SHADES = ["#F1F4F9", "#C6EDE6", "#96DFD3", "#5FCCBC", "#14B8A6"];
const pct = (value) => `${(value * 100).toFixed(0)}%`;

// `rowsByName` maps a district name to its EICV7 row. The map never reads data any other way.
// With a district chosen, its real sectors are drawn on top and coloured by sample programme records.
export default function ChoroplethMap({ geo, layer, selected, onSelect, rowsByName, sectorGeo, sectorStatus, sector, onSelectSector, sectorIndex, locked = false }) {
  const [map, setMap] = useState(null);
  const [showNames, setShowNames] = useState(true);
  const bounds = useMemo(() => viewBounds(geo), [geo]);
  const featureLayers = useRef({});
  const sectorLayers = useRef({});
  const live = useRef(/** @type {any} */ ({}));

  // The sectors of the focused district only.
  const sectorData = useMemo(() => (selected && sectorGeo ? { type: "FeatureCollection", features: sectorGeo.features.filter((feature) => feature.properties.district === selected) } : null), [selected, sectorGeo]);
  const sectorMax = useMemo(() => Math.max(1, ...(sectorData?.features || []).map((feature) => sectorSample(sectorIndex, selected, feature.properties.shapeName)?.enrolled || 0)), [sectorData, sectorIndex, selected]);
  const sectorFill = useCallback((name) => {
    const count = sectorSample(live.current.sectorIndex, live.current.selected, name)?.enrolled || 0;
    if (!count) return SECTOR_SHADES[0];
    return SECTOR_SHADES[1 + Math.min(3, Math.floor((count / live.current.sectorMax) * 4 - 0.0001))];
  }, []);
  live.current = { locked, layer, selected, rowsByName, onSelect, sector, onSelectSector, sectorIndex, sectorMax, sectorsOn: Boolean(sectorData) };

  const styleFor = useCallback((name, hovered = false) => {
    const { layer: key, selected: chosen, rowsByName: rows } = live.current;
    const row = rows[name];
    const isSelected = name === chosen;
    // While one district is in focus the rest are greyed out and cannot be hovered or clicked.
    if (chosen && !isSelected) return { fillColor: "#DDE3EC", fillOpacity: 0.55, color: "#FFFFFF", weight: 0.6, dashArray: undefined };
    // With its sectors drawn on top, the district is only an outline around them.
    if (isSelected && live.current.sectorsOn) return { fillColor: "#FFFFFF", fillOpacity: 0, color: "#0A2540", weight: 3, dashArray: undefined };
    return {
      fillColor: fillFor(key, row, NATIONAL_EICV7),
      fillOpacity: 0.95,
      color: isSelected || hovered ? "#0A2540" : "#FFFFFF",
      weight: isSelected ? 3 : hovered ? 2 : 0.8,
      dashArray: isSmallSampleLayer(key, row) ? "3 3" : undefined,
    };
  }, []);

  const sectorStyle = useCallback((name, hovered = false) => {
    const chosen = live.current.sector;
    const dimmed = Boolean(chosen) && name !== chosen;
    return { fillColor: sectorFill(name), fillOpacity: dimmed ? 0.4 : 0.92, color: name === chosen || hovered ? "#0A2540" : "#FFFFFF", weight: name === chosen ? 3 : hovered ? 2 : 1.1, dashArray: undefined };
  }, [sectorFill]);

  const tooltipFor = useCallback((name) => {
    const { layer: key, rowsByName: rows } = live.current;
    const row = rows[name];
    const config = MAP_LAYERS[key];
    const lines = [`<strong>${escapeHtml(name)}</strong>`, `${escapeHtml(config.label)}: <b>${escapeHtml(describeValue(key, row, NATIONAL_EICV7))}</b>${config.unit ? ` <span style="color:#697386">${escapeHtml(config.unit)}</span>` : ""}`];
    if (row && key === "vup") lines.push(`<span style="color:#697386">${row.samplePoorHouseholds} poor households surveyed</span>`);
    if (isSmallSampleLayer(key, row)) lines.push('<span style="color:#B54708">Small sample: read with care</span>');
    if (!row) lines.push('<span style="color:#697386">No data for this district</span>');
    return lines.join("<br/>");
  }, []);

  const sectorTooltip = useCallback((name) => {
    const data = sectorSample(live.current.sectorIndex, live.current.selected, name);
    const lines = [`<strong>${escapeHtml(name)}</strong> <span style="color:#697386">sector</span>`];
    if (!data) lines.push('<span style="color:#697386">No sample records in this sector</span>');
    else {
      lines.push(`<b>${data.enrolled}</b> sample program members`);
      if (data.payments.total) lines.push(`${pct(data.problemRate)} of October payments had a problem`);
    }
    lines.push('<span style="color:#B54708">Sample data</span>');
    return lines.join("<br/>");
  }, []);

  // Repaint when the layer or the selection changes. The shapes are never rebuilt.
  useEffect(() => {
    for (const [name, shape] of Object.entries(featureLayers.current)) {
      shape.setStyle(styleFor(name));
      const element = shape.getElement?.();
      if (element) { const disabled = Boolean(selected) && (name !== selected || Boolean(sectorData)); element.style.pointerEvents = disabled ? "none" : ""; element.style.cursor = disabled ? "default" : ""; }
    }
  }, [layer, selected, rowsByName, styleFor, sectorData]);

  useEffect(() => {
    for (const [name, shape] of Object.entries(sectorLayers.current)) shape.setStyle(sectorStyle(name));
  }, [sector, sectorIndex, sectorData, sectorStyle]);

  // Follow the size of the box the map sits in. The first time it has a real size, fit all of Rwanda into it;
  // after that only re-measure, so a reader's own zoom is never undone by a window resize.
  const sized = useRef(false);
  useEffect(() => {
    if (!map || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      map.invalidateSize();
      if (!sized.current) { sized.current = true; if (!live.current.selected) map.fitBounds(bounds, { padding: [16, 16] }); }
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, bounds]);

  // Choosing a district glides into it, choosing a sector glides into that sector, and going back glides out one step.
  const wasFocused = useRef(false);
  useEffect(() => {
    if (!map) return;
    const sectorShape = selected && sector && sectorLayers.current[sector];
    if (sectorShape) { map.flyToBounds(sectorShape.getBounds(), { maxZoom: 12, padding: [56, 56], duration: 0.8 }); return; }
    const shape = selected && featureLayers.current[selected];
    if (shape) {
      shape.bringToFront();
      map.flyToBounds(shape.getBounds(), { maxZoom: 10.5, padding: [48, 48], duration: 0.9 });
      wasFocused.current = true;
    } else if (wasFocused.current) {
      wasFocused.current = false;
      map.flyToBounds(bounds, { padding: [16, 16], duration: 0.8 });
    }
  }, [selected, sector, map, bounds]);

  // One step back: from a sector to its district, from a district to all of Rwanda.
  // A scoped user stops at their own district: back goes from a sector to the district and no further.
  const back = () => { if (live.current.sector) live.current.onSelectSector(null); else if (live.current.selected && !live.current.locked) live.current.onSelect(null); };
  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (event) => { if (event.key === "Escape") back(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const resetView = () => {
    if (live.current.selected && !live.current.locked) live.current.onSelect(null);
    else if (live.current.selected && live.current.sector) live.current.onSelectSector(null);
    else if (map) map.flyToBounds(bounds, { padding: [16, 16], duration: 0.8 });
  };

  const onEachFeature = (feature, shape) => {
    const name = feature.properties.shapeName;
    featureLayers.current[name] = shape;
    shape.bindTooltip(() => tooltipFor(name), { sticky: true, direction: "top", className: "district-tooltip" });
    shape.on({
      mouseover: () => { shape.setStyle(styleFor(name, true)); if (!live.current.sectorsOn) shape.bringToFront(); },
      mouseout: () => shape.setStyle(styleFor(name)),
      // A greyed-out district cannot be chosen while another is in focus. Clicking the focused one leaves focus.
      click: () => { const chosen = live.current.selected; if (chosen && name !== chosen) return; if (live.current.locked) return; live.current.onSelect(name === chosen ? null : name); },
    });
  };

  const onEachSector = (feature, shape) => {
    const name = feature.properties.shapeName;
    sectorLayers.current[name] = shape;
    shape.bindTooltip(() => sectorTooltip(name), { sticky: true, direction: "top", className: "district-tooltip" });
    shape.on({
      mouseover: () => { shape.setStyle(sectorStyle(name, true)); shape.bringToFront(); },
      mouseout: () => shape.setStyle(sectorStyle(name)),
      click: () => live.current.onSelectSector(name === live.current.sector ? null : name),
    });
  };

  const valueText = (name) => { const count = sectorSample(sectorIndex, selected, name)?.enrolled || 0; return count ? String(count) : ""; };

  return (
    <div className="relative isolate h-full w-full">
      <MapContainer ref={setMap} bounds={bounds} boundsOptions={{ padding: [16, 16] }} minZoom={7} maxZoom={12} zoomControl={false} scrollWheelZoom={false}
        zoomSnap={0.25} className="h-full w-full bg-[#F7F9FC]" attributionControl={false}>
        <GeoJSON data={geo} style={(feature) => styleFor(feature.properties.shapeName)} onEachFeature={onEachFeature} />
        {sectorData && <GeoJSON key={selected} data={sectorData} style={(feature) => sectorStyle(feature.properties.shapeName)} onEachFeature={onEachSector} />}
        <MapLabels geo={geo} selected={selected} showNames={showNames} hideFocus={Boolean(sectorData)} fillOf={(name) => fillFor(layer, rowsByName[name], NATIONAL_EICV7)} valueOf={(name) => describeValue(layer, rowsByName[name], NATIONAL_EICV7)} />
        {sectorData && <SectorLabels key={`labels-${selected}`} geo={sectorData} chosen={sector} showNames={showNames} fillOf={sectorFill} valueOf={valueText} />}
        <ZoomControl position="bottomright" />
      </MapContainer>
      {selected && !(locked && !sector) && <button type="button" onClick={back} aria-label={sector ? `Back to ${selected}` : "Back to all of Rwanda"}
        className="absolute left-3 top-3 z-[500] inline-flex h-9 items-center gap-2 rounded-md border border-brand/30 bg-white px-3 text-[12px] font-medium text-ink shadow-md hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand">
        <ArrowLeft className="h-3.5 w-3.5 text-brand" aria-hidden="true" />{sector ? `Back to ${selected}` : "Back to all of Rwanda"}<kbd className="ml-1 rounded border border-hairline bg-canvas px-1 text-[10px] text-sub">Esc</kbd>
      </button>}
      {selected && sectorStatus === "loading" && <p role="status" className="absolute bottom-3 left-1/2 z-[500] -translate-x-1/2 rounded-full border border-hairline bg-white px-3 py-1.5 text-[11.5px] text-sub shadow-sm">Loading sectors…</p>}
      {selected && sectorStatus === "error" && <p role="alert" className="absolute bottom-3 left-1/2 z-[500] -translate-x-1/2 rounded-full border border-red-200 bg-white px-3 py-1.5 text-[11.5px] text-red-700 shadow-sm">Sector outlines could not be loaded.</p>}
      <button type="button" onClick={resetView} aria-label="Show all of Rwanda"
        className="absolute right-3 top-3 z-[500] inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-white px-2.5 text-[11.5px] font-medium text-ink shadow-sm hover:bg-canvas focus-visible:outline-2 focus-visible:outline-brand">
        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />Reset
      </button>
      <button type="button" onClick={() => setShowNames((value) => !value)} aria-pressed={showNames} aria-label="Show district names"
        className={`absolute right-3 top-12 z-[500] inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-medium shadow-sm focus-visible:outline-2 focus-visible:outline-brand ${showNames ? "border-brand/40 bg-brand-soft text-brand" : "border-hairline bg-white text-ink hover:bg-canvas"}`}>
        <Type className="h-3.5 w-3.5" aria-hidden="true" />Names
      </button>
    </div>
  );
}
