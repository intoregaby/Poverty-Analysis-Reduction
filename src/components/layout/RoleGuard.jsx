import React from "react";
import { Navigate, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useRole } from "@/lib/DemoAuthContext";
import { supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

export default function RoleGuard({ roles }) {
  const role = useRole();
  const { isAuthenticated, isLoadingAuth, isLoadingProfile, profileError } = useAuth();
  const outletContext = useOutletContext();
  const location = useLocation();

  if (supabaseConfigured && (isLoadingAuth || isLoadingProfile)) {
    return <div className="grid min-h-[60vh] place-items-center text-sm text-sub" role="status">Checking account access…</div>;
  }

  if (supabaseConfigured && !isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  if (!role && !supabaseConfigured) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  if (!role) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#FEF3F2]">
            <ShieldAlert className="h-6 w-6 text-[#B42318]" />
          </div>
          <h2 className="text-[16px] font-semibold text-ink">Account access is not set up</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-sub">
            {profileError
              ? "We could not load your access profile. Please try again or contact the platform administrator."
              : "Your signed-in account does not have a platform profile and approved role yet. Contact the platform administrator."}
          </p>
        </div>
      </div>
    );
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
