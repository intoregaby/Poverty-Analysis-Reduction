import React, { useMemo, useState } from "react";
import L from "leaflet";
import { Marker, useMap, useMapEvents } from "react-leaflet";

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// The countries that touch Rwanda, placed just outside its border so a reader always knows which way is which.
export const NEIGHBOURS = [
  { name: "Uganda", at: [-0.88, 29.95] },
  { name: "Tanzania", at: [-2.2, 31.25] },
  { name: "Burundi", at: [-3.12, 29.75] },
  { name: "DR Congo", at: [-2.2, 28.55] },
];

// The view that shows all of Rwanda and the names of its neighbours.
export function viewBounds(geo) {
  const bounds = L.geoJSON(geo).getBounds();
  NEIGHBOURS.forEach((country) => bounds.extend(country.at));
  return bounds;
}

function ringCentroid(ring) {
  let area = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    const cross = x1 * y2 - x2 * y1;
    area += cross; cx += (x1 + x2) * cross; cy += (y1 + y2) * cross;
  }
  area /= 2;
  return area ? { lng: cx / (6 * area), lat: cy / (6 * area), area: Math.abs(area) } : null;
}

// One label point per area: the centre of its largest piece.
export function labelPoints(geo) {
  return geo.features.map((feature) => {
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    let best = null;
    let total = 0;
    for (const polygon of polygons) {
      const centre = ringCentroid(polygon[0]);
      if (!centre) continue;
      total += centre.area;
      if (!best || centre.area > best.area) best = centre;
    }
    return best ? { name: feature.properties.shapeName, lat: best.lat, lng: best.lng, area: total } : null;
  }).filter(Boolean);
}

// Dark text on pale fills, white text on strong fills.
export function isDark(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!match) return false;
  const value = parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.58;
}

// Names that would overlap are left out (larger areas and the chosen one win) and appear as the reader zooms in.
export function placeLabels(points, map, zoom, chosen, tall, charWidth = 5.3) {
  const order = [...points].sort((a, b) => Number(b.name === chosen) - Number(a.name === chosen) || b.area - a.area);
  const taken = [];
  const kept = [];
  for (const point of order) {
    const centre = map.project([point.lat, point.lng], zoom);
    const width = point.name.length * charWidth + 4;
    const height = tall ? 24 : 11;
    const box = { x1: centre.x - width / 2, x2: centre.x + width / 2, y1: centre.y - height / 2, y2: centre.y + height / 2 };
    if (point.name !== chosen && taken.some((other) => box.x1 < other.x2 && box.x2 > other.x1 && box.y1 < other.y2 && box.y2 > other.y1)) continue;
    taken.push(box);
    kept.push(point);
  }
  return kept;
}

function labelIcon(name, fill, value, chosen) {
  const dark = isDark(fill);
  return L.divIcon({
    className: "map-label",
    iconSize: [0, 0],
    html: `<span class="map-label-text${chosen ? " is-selected" : ""}" style="color:${dark ? "#FFFFFF" : "#0A2540"};--halo:${dark ? "rgba(10,37,64,.75)" : "rgba(255,255,255,.9)"}">${escapeHtml(name)}${value ? `<small>${escapeHtml(value)}</small>` : ""}</span>`,
  });
}

// District names printed on the map, without hovering.
export default function MapLabels({ geo, selected, fillOf, valueOf, showNames, hideFocus }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const points = useMemo(() => labelPoints(geo), [geo]);
  // With one district in focus, only that district is named, with its figure.
  const showValues = zoom >= 9.25 || Boolean(selected);

  const visible = useMemo(() => {
    if (!showNames || hideFocus) return [];
    if (selected) return points.filter((point) => point.name === selected);
    return placeLabels(points, map, zoom, null, showValues);
  }, [points, zoom, selected, showNames, showValues, hideFocus, map]);

  return <>
    {visible.map((point) => (
      <Marker key={point.name} position={[point.lat, point.lng]} icon={labelIcon(point.name, fillOf(point.name), showValues ? valueOf(point.name) : "", point.name === selected)} interactive={false} keyboard={false} zIndexOffset={point.name === selected ? 1000 : 0} />
    ))}
    {!selected && NEIGHBOURS.map((country) => (
      <Marker key={country.name} position={country.at} interactive={false} keyboard={false}
        icon={L.divIcon({ className: "map-label", iconSize: [0, 0], html: `<span class="map-country">${escapeHtml(country.name)}</span>` })} />
    ))}
  </>;
}

// Sector names inside the focused district, each with its number of sample records.
export function SectorLabels({ geo, chosen, fillOf, valueOf, showNames }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const points = useMemo(() => labelPoints(geo), [geo]);
  const visible = useMemo(() => (showNames ? placeLabels(points, map, zoom, chosen, true, 5.2) : []), [points, zoom, chosen, showNames, map]);
  return <>{visible.map((point) => (
    <Marker key={point.name} position={[point.lat, point.lng]} icon={labelIcon(point.name, fillOf(point.name), valueOf(point.name), point.name === chosen)} interactive={false} keyboard={false} zIndexOffset={point.name === chosen ? 1000 : 0} />
  ))}</>;
}
