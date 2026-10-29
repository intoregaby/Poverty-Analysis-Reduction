import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Brand from "@/components/layout/Brand";
import GuidedTour from "@/components/tour/GuidedTour";
import { useAuth } from "@/lib/AuthContext";
import { useDemoAuth, useRole } from "@/lib/DemoAuthContext";

export default function DashboardShell() {
  const [open, setOpen] = useState(false);
  const [tourRequest, setTourRequest] = useState(0);
  
  const role = useRole();
  const { user } = useAuth();
  const { demoUser } = useDemoAuth();
  const tourScope = `${demoUser ? `demo:${demoUser.role}` : user?.id || user?.email || "visitor"}:${role}`;
  const startTour = () => setTourRequest((request) => request + 1);

  return (
    <div className="min-h-screen bg-canvas font-body text-ink antialiased">
      <div className="flex">
        <aside className="sticky top-0 z-40 hidden h-screen max-h-dvh w-[238px] self-start shrink-0 border-r border-hairline bg-white lg:block">
          <Sidebar onStartTour={startTour} />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex h-14 items-center justify-between border-b border-hairline bg-white px-4 lg:hidden">
            <Brand />
            <button
              onClick={() => setOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-md border border-hairline text-sub"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
          <Outlet context={{ startTour }} />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#0A2540]/30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-[270px] flex-col bg-white shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 grid h-7 w-7 place-items-center rounded-md text-sub hover:bg-canvas"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar onStartTour={startTour} />
          </div>
        </div>
      )}

      <GuidedTour key={tourScope} role={role} scope={tourScope} request={tourRequest} onMenuChange={setOpen} />
    </div>
  );
}
