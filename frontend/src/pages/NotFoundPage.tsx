import { Link } from "react-router-dom";
import { Home, Stethoscope } from "lucide-react";
import { AppLayout } from "../layouts/AppLayout";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <AppLayout showSidebar={false}>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-teal-50 text-teal-800 flex items-center justify-center shadow-xs border border-teal-100">
          <Stethoscope size={40} className="text-teal-700" />
        </div>

        <div className="space-y-1 max-w-md">
          <span className="text-4xl font-extrabold font-heading text-teal-900">404</span>
          <h1 className="text-xl font-bold font-heading text-slate-900">
            Medical Page Not Found
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            The clinical page or specialist record you requested does not exist or has been moved.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Link to="/">
            <Button variant="outline" size="md" icon={Home}>
              Back to Home
            </Button>
          </Link>
          <Link to="/doctors">
            <Button variant="primary" size="md" icon={Stethoscope}>
              Browse Doctors
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
