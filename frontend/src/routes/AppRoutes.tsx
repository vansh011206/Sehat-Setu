import { Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";

// Features & Pages
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ProfilePage } from "../features/auth/ProfilePage";
import { DoctorListPage } from "../features/doctors/DoctorListPage";
import { DoctorDetailPage } from "../features/doctors/DoctorDetailPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { AppointmentsPage } from "../pages/AppointmentsPage";
import { DoctorSchedulePage } from "../pages/DoctorSchedulePage";
import { ConsultationsPage } from "../pages/ConsultationsPage";
import { PrescriptionsPage } from "../pages/PrescriptionsPage";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { NotFoundPage } from "../pages/NotFoundPage";

// Route Guards
import { RedirectIfAuth, RequireAuth, RequireRole } from "../features/auth/guards";

export function AppRoutes() {
  return (
    <Routes>
      {/* ─── Public Landing ─── */}
      <Route path="/" element={<LandingPage />} />

      {/* ─── Public Doctor Discovery ─── */}
      <Route path="/doctors" element={<DoctorListPage />} />
      <Route path="/doctors/:id" element={<DoctorDetailPage />} />

      {/* ─── Auth Flow ─── */}
      <Route
        element={
          <RedirectIfAuth>
            <AuthLayout />
          </RedirectIfAuth>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* ─── Protected App Routes (Requires Authenticated Session) ─── */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/consultations" element={<ConsultationsPage />} />
        <Route path="/prescriptions" element={<PrescriptionsPage />} />

        {/* Doctor-Specific Routes */}
        <Route element={<RequireRole allowedRoles={["DOCTOR", "ADMIN"]} />}>
          <Route path="/schedule" element={<DoctorSchedulePage />} />
          <Route path="/patients" element={<DoctorSchedulePage />} />
        </Route>

        {/* Admin-Specific Routes */}
        <Route element={<RequireRole allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/analytics" element={<DashboardPage />} />
        </Route>
      </Route>

      {/* ─── 404 Fallback ─── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
