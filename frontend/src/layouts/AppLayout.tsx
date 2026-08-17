import type { ReactNode } from "react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children?: ReactNode;
  showSidebar?: boolean;
}

export function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        {showSidebar && (
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main
          className={`flex-1 p-4 sm:p-6 lg:p-8 transition-all ${
            showSidebar ? "lg:ml-64" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto">{children || <Outlet />}</div>
        </main>
      </div>

      {/* Footer */}
      <footer
        className={`border-t border-slate-200 bg-white px-6 py-4 transition-all ${
          showSidebar ? "lg:ml-64" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>SehatSetu — ABDM Compliant Telehealth & Clinic Booking</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-teal-800 transition-colors">Privacy</a>
            <a href="#" className="hover:text-teal-800 transition-colors">Terms</a>
            <a href="#" className="hover:text-teal-800 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
