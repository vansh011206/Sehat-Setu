// mobile: bottom navigation bar for mobile/tablet screens (<lg)
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  CalendarDays,
  CalendarClock,
  FileText,
  User,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const patientBottomNav: NavItem[] = [
  { label: "Home", to: "/dashboard", icon: LayoutDashboard },
  { label: "Doctors", to: "/doctors", icon: Search },
  { label: "Appts", to: "/appointments", icon: CalendarDays },
  { label: "Rx", to: "/prescriptions", icon: FileText },
  { label: "Profile", to: "/profile", icon: User },
];

const doctorBottomNav: NavItem[] = [
  { label: "Home", to: "/dashboard", icon: LayoutDashboard },
  { label: "Schedule", to: "/schedule", icon: CalendarClock },
  { label: "Appts", to: "/appointments", icon: CalendarDays },
  { label: "Rx", to: "/prescriptions", icon: FileText },
  { label: "Profile", to: "/profile", icon: User },
];

export function BottomNav() {
  const { user, isAuthenticated } = useAuthStore();

  // Admin has 5+ sub-sections and uses the slide-over admin drawer instead
  if (!isAuthenticated || user?.role === "ADMIN") {
    return null;
  }

  const items = user?.role === "DOCTOR" ? doctorBottomNav : patientBottomNav;

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/92 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] transition-all"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 6px)" }}
    >
      <div className="grid grid-cols-5 h-[58px] max-w-md mx-auto items-center px-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 transition-all duration-200 min-h-[44px] cursor-pointer group active:scale-95 ${
                  isActive
                    ? "text-teal-800"
                    : "text-slate-400 hover:text-slate-600"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-teal-800 text-white shadow-xs scale-105"
                        : "text-slate-500 group-hover:text-slate-800"
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
                  </div>
                  <span
                    className={`text-[10px] tracking-tight transition-colors ${
                      isActive ? "font-bold text-teal-800" : "font-medium text-slate-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
