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
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-border shadow-lg"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)" }}
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer ${
                  isActive
                    ? "text-teal-800 font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-xl transition-all ${
                      isActive ? "bg-teal-50 text-teal-800" : ""
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
                  </div>
                  <span className="text-[10px] leading-none tracking-tight">
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
