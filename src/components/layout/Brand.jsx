import React from "react";

export default function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-[13px] font-semibold text-white shadow-sm">
        IR
      </div>
      <div className="leading-tight">
        <p className="text-[13px] font-semibold tracking-tight text-ink">Ireme</p>
        <p className="text-[10.5px] text-sub">NISR · Track 2</p>
      </div>
    </div>
  );
}