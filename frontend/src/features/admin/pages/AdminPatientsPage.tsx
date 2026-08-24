import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
  Users,
  Calendar,
} from "lucide-react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { adminApi } from "../api";
import { exportToCsv } from "../utils/exportCsv";

export function AdminPatientsPage() {
  const [search, setSearch] = useState("");
  const [expandedPatientId, setExpandedPatientId] = useState<number | null>(null);

  // Fetch patients list
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-patients-list", search],
    queryFn: () => adminApi.getPatients({ search: search || undefined, page_size: 50 }),
  });

  // Fetch patient appointment history when expanded
  const { data: appointmentHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["admin-patient-history", expandedPatientId],
    queryFn: () =>
      expandedPatientId
        ? adminApi.getPatientAppointments(expandedPatientId)
        : Promise.resolve([]),
    enabled: !!expandedPatientId,
  });

  const patients = data?.results || [];

  const toggleExpand = (patientId: number) => {
    setExpandedPatientId((prev) => (prev === patientId ? null : patientId));
  };

  const handleExportCsv = () => {
    exportToCsv(
      "sehatsetu_patients_directory",
      [
        { header: "Patient ID", accessor: (p) => p.id },
        { header: "Full Name", accessor: (p) => p.name },
        { header: "Phone Number", accessor: (p) => p.phone },
        { header: "Email Address", accessor: (p) => p.email },
        { header: "Total Appointments", accessor: (p) => p.appointments_count },
        { header: "Total Spent (INR)", accessor: (p) => p.total_spent },
        { header: "Account Status", accessor: (p) => (p.is_active ? "ACTIVE" : "INACTIVE") },
        { header: "Joined Date", accessor: (p) => p.joined },
        { header: "Last Visit Date", accessor: (p) => p.last_appointment_date || "N/A" },
      ],
      patients
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 font-sans pb-12">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-ink flex items-center gap-2.5">
              <Users size={24} className="text-teal-700" />
              Patient Accounts Directory
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Manage patient profiles, view lifetime consultation spending, and expand appointment histories
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleExportCsv}
              disabled={patients.length === 0}
              className="text-xs font-bold"
            >
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={isRefetching}
              onClick={() => refetch()}
              className="text-xs"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* ─── Search Bar ─── */}
        <div className="bg-white p-4 rounded-2xl border border-border shadow-2xs">
          <div className="relative max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients by name, phone, email..."
              className="w-full bg-slate-50 border border-border text-ink text-xs pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
        </div>

        {/* ─── Patients Table ─── */}
        <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-8"></th>
                  <th className="py-3.5 px-4">Patient Name</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4 text-center">Appointments</th>
                  <th className="py-3.5 px-4">Total Spent</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4">Last Visit</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td colSpan={7} className="p-4">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                ) : patients.length > 0 ? (
                  patients.map((pat) => {
                    const isExpanded = expandedPatientId === pat.id;

                    return (
                      <React.Fragment key={pat.id}>
                        <tr
                          onClick={() => toggleExpand(pat.id)}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                            isExpanded ? "bg-teal-50/30" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 text-slate-400">
                            {isExpanded ? (
                              <ChevronDown size={16} className="text-teal-700" />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center shrink-0">
                                {pat.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-ink truncate">
                                  {pat.name}
                                </p>
                                <span className="text-[10px] text-muted">
                                  ID #{pat.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-medium text-slate-800">{pat.phone}</p>
                            <p className="text-[11px] text-muted">{pat.email}</p>
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-800 tabular-nums">
                            {pat.appointments_count}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-teal-800 tabular-nums">
                            ₹{Number(pat.total_spent).toLocaleString("en-IN")}
                          </td>

                          <td className="py-3.5 px-4 text-muted">{pat.joined}</td>

                          <td className="py-3.5 px-4">
                            {pat.last_appointment_date ? (
                              <span className="text-slate-800 font-medium">
                                {pat.last_appointment_date}
                              </span>
                            ) : (
                              <span className="text-slate-400">No visits yet</span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Row with Appointment Records */}
                        {isExpanded && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={7} className="p-4 pl-12">
                              <div className="bg-white p-4 rounded-xl border border-border shadow-2xs space-y-3">
                                <h4 className="text-xs font-bold text-ink flex items-center gap-2">
                                  <Calendar size={14} className="text-teal-700" />
                                  Consultation History for {pat.name}
                                </h4>

                                {isHistoryLoading ? (
                                  <Skeleton className="h-16 w-full rounded-lg" />
                                ) : (appointmentHistory || []).length > 0 ? (
                                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                                    {(appointmentHistory || []).map((appt) => (
                                      <div
                                        key={appt.id}
                                        className="p-3 flex items-center justify-between gap-3 text-xs"
                                      >
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-[11px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                              {appt.booking_code}
                                            </span>
                                            <span className="font-bold text-ink">
                                              {appt.doctor_name}
                                            </span>
                                            <span className="text-[11px] text-muted">
                                              ({appt.specialty})
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-slate-500 mt-0.5">
                                            {appt.date} • {appt.symptoms || "Regular Checkup"}
                                          </p>
                                        </div>

                                        <div className="text-right shrink-0">
                                          <span className="text-xs font-bold text-ink tabular-nums block">
                                            ₹{appt.fee}
                                          </span>
                                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                            {appt.status}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted py-2">
                                    No appointment history recorded for this patient.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <EmptyState
                        icon={Users}
                        title="No patients found"
                        description="Try searching with a different name or phone number."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
