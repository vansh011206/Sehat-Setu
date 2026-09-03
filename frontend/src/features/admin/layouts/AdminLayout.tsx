import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Menu, ShieldCheck, ArrowLeft } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";
import { NotificationBell } from "../../notifications/components/NotificationBell";
import { useAuthStore } from "../../../stores/authStore";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-ink flex flex-col">
      {/* Admin Sidebar */}
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-ink hover:bg-slate-100 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-800 flex items-center justify-center shadow-xs">
                <Activity size={18} className="text-white" />
              </div>
              <span className="text-base font-bold font-heading text-slate-900 hidden sm:block">
                Sehat<span className="text-teal-800">Setu</span>
              </span>
            </Link>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
              <ShieldCheck size={14} className="text-teal-700" />
              <span>Admin Console</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-slate-500 hover:text-teal-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft size={13} />
              <span>General Dashboard</span>
            </Link>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Profile pill */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-teal-800 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : "AD"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-ink leading-tight">
                  {user?.full_name || "Admin"}
                </p>
                <p className="text-[10px] text-muted leading-tight">
                  Super Administrator
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
}
