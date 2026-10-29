import React from "react";
import { Navigate, Outlet, useOutletContext } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useRole } from "@/lib/DemoAuthContext";

export default function RoleGuard({ roles }) {
  const role = useRole();
  const outletContext = useOutletContext();

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(role)) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#FEF3F2]">
            <ShieldAlert className="h-6 w-6 text-[#B42318]" />
          </div>
          <h2 className="text-[16px] font-semibold text-ink">No access to this panel</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-sub">
            Your role does not permit this page. An administrator controls who can reach each panel.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet context={outletContext} />;
}
