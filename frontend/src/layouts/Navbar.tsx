import { Link } from "react-router-dom";
import { Activity, ChevronDown, LogOut, Menu, User } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { Avatar } from "../components/ui/Avatar";
import { useState, useRef, useEffect } from "react";
import { NotificationBell } from "../features/notifications/components/NotificationBell";

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
    <nav className="fixed top-0 left-0 right-0 z-40 h-14 sm:h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="h-full px-3.5 sm:px-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        {/* Left — Logo + Admin/Sidebar Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hamburger toggle for Admin or mobile sidebar */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <Menu size={19} />
          </button>

          <Link to="/" className="flex items-center gap-2 min-h-[40px] group select-none">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-800 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-teal-900 transition-colors">
              <Activity size={18} className="text-white" />
            </div>
            <span className="text-base sm:text-lg font-black font-heading tracking-tight text-slate-900">
              Sehat<span className="text-teal-800">Setu</span>
            </span>
          </Link>
        </div>

        {/* Right — User controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {isAuthenticated && user ? (
            <>
              {/* Real-time Notification Bell */}
              <NotificationBell />

              {/* User Avatar Dropdown */}
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer ring-2 ring-teal-700/15 focus:outline-none"
                  aria-label="User account menu"
                >
                  <Avatar
                    src={user.profile_picture}
                    name={user.full_name}
                    size="sm"
                  />
                  <span className="hidden md:block text-xs sm:text-sm font-bold text-slate-800 max-w-[120px] truncate pl-1">
                    {user.full_name.split(" ")[0]}
                  </span>
                  <ChevronDown size={14} className="text-slate-400 hidden md:block" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-24px)] bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 animate-fadeIn z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.full_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.phone}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        {user.role}
                      </span>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors min-h-[40px]"
                    >
                      <User size={15} className="text-slate-400" />
                      My Profile
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer min-h-[40px]"
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/login"
                className="px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-teal-800 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-all shadow-xs shrink-0"
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
