import type { ReactNode } from "react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children?: ReactNode;
  showSidebar?: boolean;
}

export function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen min-h-dvh bg-slate-50 flex flex-col">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 pt-14 sm:pt-16 min-w-0">
        {/* Sidebar (Desktop visible, mobile drawer when toggled) */}
        {showSidebar && (
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        {/* Main content: pb-24 on mobile prevents bottom nav occlusion */}
        <main
          className={`flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 transition-all ${
            showSidebar ? "lg:ml-64" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto w-full min-w-0">{children || <Outlet />}</div>
        </main>
      </div>

      {/* Footer: add mb-16 on mobile so it doesn't get covered by bottom nav */}
      <footer
        className={`border-t border-slate-200 bg-white px-4 sm:px-6 py-4 mb-16 lg:mb-0 transition-all ${
          showSidebar ? "lg:ml-64" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p className="text-center sm:text-left">SehatSetu — ABDM Compliant Telehealth & Clinic Booking</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-teal-800 transition-colors">Privacy</a>
            <a href="#" className="hover:text-teal-800 transition-colors">Terms</a>
            <a href="#" className="hover:text-teal-800 transition-colors">Support</a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (<lg) */}
      <BottomNav />
    </div>
  );
}
