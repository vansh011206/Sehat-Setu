import { Link } from "react-router-dom";
import { Activity, ChevronDown, LogOut, Menu, User } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { Avatar } from "../components/ui/Avatar";
import { useState, useRef, useEffect } from "react";
import { NotificationBell } from "../features/notifications/components/NotificationBell";
import { LanModeBadge } from "../components/LanModeBadge";

interface NavbarProps {
  onMenuToggle: () => void;
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setDropdownOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/80 backdrop-blur-lg border-b border-border">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Left — Logo + Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>

          <Link to="/" className="flex items-center gap-2.5 min-h-[44px]">
            <div className="w-9 h-9 rounded-xl bg-primary-900 flex items-center justify-center shrink-0">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-base sm:text-lg font-bold font-heading text-ink">
              Sehat<span className="text-primary-900">Setu</span>
            </span>
          </Link>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* LAN demo: LAN Mode network IP indicator */}
          <LanModeBadge />

          {isAuthenticated && user ? (
            <>
              {/* Real-time Notification Bell */}
              <NotificationBell />

              {/* Avatar dropdown */}
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 min-w-[44px] min-h-[44px] rounded-xl hover:bg-surface transition-colors cursor-pointer"
                  aria-label="User account menu"
                >
                  <Avatar
                    src={user.profile_picture}
                    name={user.full_name}
                    size="sm"
                  />
                  <span className="hidden md:block text-sm font-medium text-ink max-w-[120px] truncate">
                    {user.full_name}
                  </span>
                  <ChevronDown size={14} className="text-muted hidden md:block" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 max-w-[calc(100vw-24px)] bg-white rounded-2xl border border-border shadow-modal py-1 animate-fade-in z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-ink truncate">{user.full_name}</p>
                      <p className="text-xs text-muted truncate">{user.phone}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface transition-colors min-h-[44px]"
                    >
                      <User size={16} className="text-muted" />
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors cursor-pointer min-h-[44px]"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-primary-900 hover:bg-primary-100 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-900 hover:bg-primary-500 rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
