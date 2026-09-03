import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { AppLayout } from "../layouts/AppLayout";
import { Avatar } from "../components/ui/Avatar";
import { Badge, type BadgeVariant } from "../components/ui/Badge";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuthStore } from "../stores/authStore";
import {
  dashboardApi,
  type DoctorPatientSummary,
} from "../features/dashboard/api";

function formatIndianDate(dateString: string | Date | null): string {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const statusBadgeVariantMap: Record<string, BadgeVariant> = {
  CONFIRMED: "success",
  PENDING: "warning",
  COMPLETED: "teal",
  CANCELLED_BY_PATIENT: "danger",
  CANCELLED_BY_DOCTOR: "danger",
  MISSED: "neutral",
};

export function DoctorPatientsPage() {
  const { user } = useAuthStore();
  const doctorId = user?.doctor_profile?.id;

  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatientSummary | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: patients, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["doctor-patients", doctorId],
    queryFn: () => (doctorId ? dashboardApi.getDoctorPatients(doctorId) : []),
    enabled: !!doctorId,
    staleTime: 30000,
  });

  const filteredPatients = (patients || []).filter((p) => {
    const q = search.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Patients Directory" },
          ]}
        />

        {/* Header banner */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold font-heading text-ink flex items-center gap-2.5">
              <Users size={24} className="text-teal-700" />
              Patient Records & History
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Explore patient profiles, visit frequency, past consultations, and digital health records
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() => refetch()}
              loading={isFetching}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Search Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient name, phone, or email..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-teal-700 bg-surface"
            />
          </div>

          <div className="text-xs text-muted font-semibold self-end sm:self-center">
            Showing {filteredPatients.length} patient record{filteredPatients.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Patients Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-36" variant="rect" />
            ))}
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
              <Card
                key={patient.id}
                hover={true}
                className="p-5 flex flex-col justify-between cursor-pointer"
                onClick={() => {
                  setSelectedPatient(patient);
                  setModalOpen(true);
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3.5">
                    <Avatar
                      name={patient.full_name}
                      src={patient.profile_picture}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold font-heading text-ink truncate">
                        {patient.full_name}
                      </h3>
                      <p className="text-xs text-muted truncate">{patient.phone}</p>
                      {patient.email && (
                        <p className="text-[11px] text-muted truncate">
                          {patient.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
                    <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 tabular-nums">
                      {patient.total_visits} Total Visits
                    </span>
                    {patient.gender && (
                      <Badge variant="neutral" size="sm">
                        {patient.gender}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border mt-3 text-xs text-muted">
                  <span>
                    Last: {formatIndianDate(patient.last_visit_date)}
                  </span>
                  <ChevronRight size={16} className="text-teal-700" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border p-8">
            <EmptyState
              icon={Users}
              title={
                search ? "No matching patients found" : "No patient records on file"
              }
              description={
                search
                  ? "Try searching with a different name or phone number."
                  : "Patients who schedule consultations with you will automatically be added to your directory."
              }
            />
          </div>
        )}

        {/* Patient Detail Modal */}
        <Modal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedPatient(null);
          }}
          title={`Patient Record — ${selectedPatient?.full_name || ""}`}
          size="lg"
        >
          {selectedPatient && (
            <div className="space-y-6">
              {/* Header info */}
              <div className="flex items-center gap-4 bg-surface p-4 rounded-2xl border border-border">
                <Avatar
                  name={selectedPatient.full_name}
                  src={selectedPatient.profile_picture}
                  size="lg"
                />
                <div className="space-y-1">
                  <h3 className="text-base font-bold font-heading text-ink">
                    {selectedPatient.full_name}
                  </h3>
                  <p className="text-xs text-muted">
                    Phone: {selectedPatient.phone}{" "}
                    {selectedPatient.email ? `• Email: ${selectedPatient.email}` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="teal" size="sm">
                      {selectedPatient.total_visits} Total Consultations
                    </Badge>
                    {selectedPatient.gender && (
                      <Badge variant="neutral" size="sm">
                        {selectedPatient.gender}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Past Consultations */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-teal-700" />
                  Appointment History ({selectedPatient.past_appointments.length})
                </h4>

                {selectedPatient.past_appointments.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedPatient.past_appointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="bg-white p-3 rounded-xl border border-border flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-ink">
                            {formatIndianDate(appt.start_time)}
                          </span>
                          <span className="text-muted ml-2">
                            Ref: {appt.booking_code}
                          </span>
                          {appt.symptoms && (
                            <p className="text-[11px] text-slate-600 mt-0.5 truncate max-w-sm">
                              {appt.symptoms}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={statusBadgeVariantMap[appt.status] || "neutral"}
                          size="sm"
                        >
                          {appt.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No past appointments recorded.</p>
                )}
              </div>

              {/* Prescriptions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-teal-700" />
                  Issued Digital Prescriptions ({selectedPatient.prescriptions.length})
                </h4>

                {selectedPatient.prescriptions.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedPatient.prescriptions.map((rx) => (
                      <div
                        key={rx.id}
                        className="bg-white p-3 rounded-xl border border-border text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-teal-900">
                            Diagnosis: {rx.diagnosis}
                          </span>
                          <span className="text-muted text-[11px]">
                            {formatIndianDate(rx.created_at)}
                          </span>
                        </div>
                        {rx.medicines && rx.medicines.length > 0 && (
                          <p className="text-[11px] text-muted">
                            {rx.medicines.map((m) => m.name).join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No prescriptions issued yet.</p>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModalOpen(false);
                    setSelectedPatient(null);
                  }}
                >
                  Close Record
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
