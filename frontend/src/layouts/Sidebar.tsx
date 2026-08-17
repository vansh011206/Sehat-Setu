import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  CalendarDays,
  Clock,
  CalendarClock,
  Users,
  FileText,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const patientNav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Find Doctors", to: "/doctors", icon: Search },
  { label: "Appointments", to: "/appointments", icon: CalendarDays },
  { label: "History", to: "/history", icon: Clock },
];

const doctorNav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Schedule", to: "/schedule", icon: CalendarClock },
  { label: "Patients", to: "/patients", icon: Users },
  { label: "Prescriptions", to: "/prescriptions", icon: FileText },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Analytics", to: "/admin/analytics", icon: ShieldCheck },
];

function getNavItems(role?: string): NavItem[] {
  switch (role) {
    case "DOCTOR":
      return doctorNav;
    case "ADMIN":
      return adminNav;
    default:
      return patientNav;
  }
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, isAuthenticated } = useAuthStore();
  const navItems = isAuthenticated ? getNavItems(user?.role) : patientNav;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-16 left-0 bottom-0 z-30 w-64 bg-white border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile close */}
        <div className="flex items-center justify-end p-3 lg:hidden">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary-100 text-primary-900 font-semibold"
                    : "text-muted hover:text-ink hover:bg-surface"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-border">
          <div className="rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 p-4">
            <p className="text-xs font-semibold text-primary-900 mb-1">
              Need Help?
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Contact our support team for any questions about your health journey.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
