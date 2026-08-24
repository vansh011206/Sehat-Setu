import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  CalendarDays,
  ShieldAlert,
  ArrowLeft,
  ShieldCheck,
  X,
  type LucideIcon,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "../../../stores/authStore";

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

const adminNav: NavItem[] = [
  { label: "Overview & Analytics", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "Doctors Management", to: "/admin/doctors", icon: Stethoscope },
  { label: "Patients Directory", to: "/admin/patients", icon: Users },
  { label: "Appointments Audit", to: "/admin/appointments", icon: CalendarDays },
  { label: "Audit & Security Logs", to: "/admin/audit-logs", icon: ShieldAlert },
];

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const { user, clearAuth } = useAuthStore();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/60">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck size={18} />
            </div>
            <div>
              <span className="text-base font-bold font-heading tracking-tight text-white">
                Sehat<span className="text-teal-400">Setu</span>
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-teal-400">
                Admin Console
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-6 px-3.5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Platform Management
          </div>

          {adminNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-teal-700 text-white shadow-xs font-bold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon size={17} className="shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Info & Switch */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/40 space-y-2">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-teal-800 text-teal-200 font-bold text-xs flex items-center justify-center">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || "Admin"}</p>
              <span className="text-[10px] font-semibold text-teal-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Super Admin
              </span>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Return to User App</span>
          </Link>

          <button
            onClick={() => clearAuth()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
