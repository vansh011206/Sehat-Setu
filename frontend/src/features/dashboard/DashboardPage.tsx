import { useState } from "react";
import { AppLayout } from "../../layouts/AppLayout";
import { useAuthStore } from "../../stores/authStore";
import { PatientDashboard } from "./components/PatientDashboard";
import { DoctorDashboard } from "./components/DoctorDashboard";
import { Button } from "../../components/ui/Button";
import { Stethoscope, User } from "lucide-react";

export function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const [adminViewRole, setAdminViewRole] = useState<"DOCTOR" | "PATIENT">("PATIENT");

  const effectiveRole = isAdmin ? adminViewRole : user?.role;

  return (
    <AppLayout showSidebar={true}>
      {isAdmin && (
        <div className="mb-6 p-4 rounded-2xl bg-white border border-teal-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              Admin View Switcher
            </span>
            <span className="text-xs text-muted">
              Preview dashboards as either Patient or Doctor role
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={adminViewRole === "PATIENT" ? "primary" : "outline"}
              size="sm"
              icon={User}
              onClick={() => setAdminViewRole("PATIENT")}
            >
              Patient View
            </Button>
            <Button
              variant={adminViewRole === "DOCTOR" ? "primary" : "outline"}
              size="sm"
              icon={Stethoscope}
              onClick={() => setAdminViewRole("DOCTOR")}
            >
              Doctor View
            </Button>
          </div>
        </div>
      )}

      {effectiveRole === "DOCTOR" ? <DoctorDashboard /> : <PatientDashboard />}
    </AppLayout>
  );
}
