import { Route, Routes } from "react-router-dom";
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
import { DoctorPatientsPage } from "../pages/DoctorPatientsPage";
import { ConsultationsPage } from "../pages/ConsultationsPage";
import { PrescriptionsPage } from "../pages/PrescriptionsPage";
import { NotificationsPage } from "../pages/NotificationsPage";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ConsultPage } from "../features/consult/ConsultPage";
import { PrescriptionComposerPage } from "../features/prescriptions/components/PrescriptionComposerPage";
import { VerifyPrescriptionPage } from "../pages/VerifyPrescriptionPage";
import { AdminOverviewPage } from "../features/admin/pages/AdminOverviewPage";
import { AdminDoctorsPage } from "../features/admin/pages/AdminDoctorsPage";
import { AdminPatientsPage } from "../features/admin/pages/AdminPatientsPage";
import { AdminAppointmentsPage } from "../features/admin/pages/AdminAppointmentsPage";
import { AdminAuditLogsPage } from "../features/admin/pages/AdminAuditLogsPage";

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

      {/* ─── Public Prescription Verification ─── */}
      <Route path="/verify" element={<VerifyPrescriptionPage />} />
      <Route path="/verify/:code" element={<VerifyPrescriptionPage />} />

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
        <Route path="/history" element={<AppointmentsPage />} />
        <Route path="/consultations" element={<ConsultationsPage />} />
        <Route path="/consult/:appointmentId" element={<ConsultPage />} />
        <Route path="/prescriptions" element={<PrescriptionsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Doctor-Specific Routes */}
        <Route element={<RequireRole allowedRoles={["DOCTOR", "ADMIN"]} />}>
          <Route path="/schedule" element={<DoctorSchedulePage />} />
          <Route path="/patients" element={<DoctorPatientsPage />} />
          <Route
            path="/consult/:appointmentId/prescription"
            element={<PrescriptionComposerPage />}
          />
        </Route>

        {/* Admin Console & Analytics Routes */}
        <Route element={<RequireRole allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminOverviewPage />} />
          <Route path="/admin/overview" element={<AdminOverviewPage />} />
          <Route path="/admin/doctors" element={<AdminDoctorsPage />} />
          <Route path="/admin/patients" element={<AdminPatientsPage />} />
          <Route path="/admin/appointments" element={<AdminAppointmentsPage />} />
          <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/analytics" element={<AdminOverviewPage />} />
        </Route>
      </Route>

      {/* ─── 404 Fallback ─── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
