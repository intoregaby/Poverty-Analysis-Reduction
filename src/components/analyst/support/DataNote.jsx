import React from "react";
import { TriangleAlert } from "lucide-react";
import InfoTip from "@/components/analyst/support/InfoTip";

// Amber triangle that opens a short data note: where our figure differs from NISR's published one, or why a year is
// missing. It is the same popover as the eye icon, with its own icon, colour and tour marker.
export default function DataNote({ label, children }) {
  return (
    <span className="ml-1 inline-block align-middle">
      <InfoTip label={label} icon={TriangleAlert} note ariaLabel={`Data note: ${label}`} tourName="data-note">{children}</InfoTip>
    </span>
  );
}
