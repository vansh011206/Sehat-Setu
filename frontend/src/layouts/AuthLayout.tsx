import { Outlet } from "react-router-dom";
import { Activity } from "lucide-react";
import { Link } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-surface to-white flex flex-col">
      {/* Simple header */}
      <header className="p-4 lg:p-6">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-900 flex items-center justify-center">
            <Activity size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold font-heading text-ink">
            Sehat<span className="text-primary-900">Setu</span>
          </span>
        </Link>
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-muted">
        SehatSetu — Your Health, One Click Away
      </footer>
    </div>
  );
}
