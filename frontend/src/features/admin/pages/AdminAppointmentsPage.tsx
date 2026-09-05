import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Download,
  RefreshCw,
  Search,
  ShieldAlert,
  Edit3,
} from "lucide-react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { ResponsiveTable, type Column } from "../../../components/ui/ResponsiveTable";
import { adminApi, type AdminAppointmentItem } from "../api";
import { exportToCsv } from "../utils/exportCsv";

const STATUS_FILTERS = [
  { label: "All Statuses", value: "ALL" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Pending", value: "PENDING" },
  { label: "Patient Cancelled", value: "CANCELLED_BY_PATIENT" },
  { label: "Doctor Cancelled", value: "CANCELLED_BY_DOCTOR" },
  { label: "Missed", value: "MISSED" },
];

export function AdminAppointmentsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<AdminAppointmentItem | null>(null);
  const [targetStatus, setTargetStatus] = useState("COMPLETED");
  const [auditNote, setAuditNote] = useState("");
  const [formError, setFormError] = useState("");

  // Fetch appointments list
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: [
      "admin-appointments-list",
      statusFilter,
      search,
      startDate,
      endDate,
    ],
    queryFn: () =>
      adminApi.getAppointments({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: search || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page_size: 50,
      }),
  });

  const appointments = data?.results || [];

  // Override status mutation
  const overrideMutation = useMutation({
    mutationFn: ({ id, status, audit_note }: { id: number; status: string; audit_note: string }) =>
      adminApi.overrideAppointmentStatus(id, { status, audit_note }),
    onSuccess: () => {
      setOverrideModalOpen(false);
      setSelectedAppt(null);
      setAuditNote("");
      setFormError("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-stats-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats-status-dist"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Failed to override status.");
    },
  });

  const handleOpenOverride = (appt: AdminAppointmentItem) => {
    setSelectedAppt(appt);
    setTargetStatus(appt.status);
    setAuditNote("");
    setFormError("");
    setOverrideModalOpen(true);
  };

  const handleSubmitOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditNote.trim()) {
      setFormError("An audit note is required to log why this status was changed.");
      return;
    }
    if (!selectedAppt) return;

    overrideMutation.mutate({
      id: selectedAppt.id,
      status: targetStatus,
      audit_note: auditNote.trim(),
    });
  };

  const handleExportCsv = () => {
    exportToCsv(
      "sehatsetu_appointments_audit",
      [
        { header: "Appointment ID", accessor: (a) => a.id },
        { header: "Booking Reference", accessor: (a) => a.booking_code },
        { header: "Doctor Name", accessor: (a) => a.doctor.name },
        { header: "Specialty", accessor: (a) => a.doctor.specialty },
        { header: "Patient Name", accessor: (a) => a.patient.name },
        { header: "Patient Phone", accessor: (a) => a.patient.phone },
        { header: "Status", accessor: (a) => a.status },
        { header: "Fee (INR)", accessor: (a) => a.fee },
        {
          header: "Scheduled Slot Start",
          accessor: (a) => new Date(a.start_time).toLocaleString("en-IN"),
        },
        {
          header: "Scheduled Slot End",
          accessor: (a) => new Date(a.end_time).toLocaleString("en-IN"),
        },
        { header: "Reported Symptoms", accessor: (a) => a.symptoms || "N/A" },
      ],
      appointments
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
            Confirmed
          </span>
        );
      case "PENDING":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Pending
          </span>
        );
      case "CANCELLED_BY_PATIENT":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled (Patient)
          </span>
        );
      case "CANCELLED_BY_DOCTOR":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled (Doctor)
          </span>
        );
      case "MISSED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Missed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const appointmentColumns: Column<AdminAppointmentItem>[] = [
    {
      key: "booking_code",
      header: "Booking Code",
      render: (appt) => (
        <span className="font-mono font-bold text-xs text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
          {appt.booking_code}
        </span>
      ),
    },
    {
      key: "doctor",
      header: "Doctor",
      render: (appt) => (
        <div className="text-left">
          <p className="font-bold text-ink truncate">{appt.doctor.name}</p>
          <p className="text-[11px] text-muted truncate">{appt.doctor.specialty}</p>
        </div>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      render: (appt) => (
        <div className="text-left">
          <p className="font-bold text-slate-900 truncate">{appt.patient.name}</p>
          <p className="text-[11px] text-muted truncate">{appt.patient.phone}</p>
        </div>
      ),
    },
    {
      key: "slot_time",
      header: "Slot Time",
      render: (appt) => {
        const startDt = new Date(appt.start_time);
        return (
          <div className="text-left md:text-left">
            <p className="font-semibold text-slate-800">
              {startDt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            <p className="text-[11px] text-muted">
              {startDt.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        );
      },
    },
    {
      key: "fee",
      header: "Fee",
      render: (appt) => <span className="font-bold text-ink tabular-nums">₹{appt.fee}</span>,
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (appt) => getStatusBadge(appt.status),
    },
    {
      key: "actions",
      header: "Admin Action",
      className: "text-right",
      render: (appt) => (
        <button
          onClick={() => handleOpenOverride(appt)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors border border-teal-200 cursor-pointer min-h-[36px]"
        >
          <Edit3 size={13} />
          <span>Override</span>
        </button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 font-sans pb-12">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-ink flex items-center gap-2.5">
              <CalendarDays size={24} className="text-teal-700" />
              Appointments Audit & Override Center
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Audit booking flows, filter edge cases, and manually override consultation states with required audit notes
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleExportCsv}
              disabled={appointments.length === 0}
              className="text-xs font-bold w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={isRefetching}
              onClick={() => refetch()}
              className="text-xs w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* ─── Filters & Search ─── */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-border shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search booking code, doctor, patient..."
                className="w-full bg-slate-50 border border-border text-ink text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-border text-slate-700 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer min-h-[44px] w-full"
                title="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-border text-slate-700 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer min-h-[44px] w-full"
                title="End Date"
              />
            </div>
          </div>

          {/* Status Chips - Scrollable on mobile */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 overflow-x-auto scrollbar-none pb-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 min-h-[36px] ${
                  statusFilter === f.value
                    ? "bg-teal-800 text-white shadow-2xs font-bold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Appointments Table (Responsive Table / Mobile Card List) ─── */}
        <ResponsiveTable
          columns={appointmentColumns}
          data={appointments}
          keyExtractor={(a) => a.id}
          isLoading={isLoading}
          emptyMessage="No appointments found matching the status filter or search parameters."
        />

        {/* ─── Status Override Modal (Bottom Sheet on Mobile) ─── */}
        <Modal
          open={overrideModalOpen && !!selectedAppt}
          onClose={() => {
            setOverrideModalOpen(false);
            setSelectedAppt(null);
          }}
          title="Override Appointment Status"
          size="md"
        >
          {selectedAppt && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading text-ink">
                    Manual State Override
                  </h3>
                  <p className="text-xs text-muted font-mono">
                    Booking Code: {selectedAppt.booking_code}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitOverride} className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs text-slate-700">
                  <p>
                    <span className="font-bold">Doctor:</span> {selectedAppt.doctor.name}
                  </p>
                  <p>
                    <span className="font-bold">Patient:</span> {selectedAppt.patient.name} ({selectedAppt.patient.phone})
                  </p>
                  <p>
                    <span className="font-bold">Current Status:</span>{" "}
                    <span className="font-bold text-teal-800">
                      {selectedAppt.status}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Status
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-border text-ink text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium cursor-pointer min-h-[44px]"
                  >
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="CANCELLED_BY_PATIENT">CANCELLED_BY_PATIENT</option>
                    <option value="CANCELLED_BY_DOCTOR">CANCELLED_BY_DOCTOR</option>
                    <option value="MISSED">MISSED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Audit Note <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    placeholder="Provide justification for manual override (e.g. 'Patient completed consultation over direct audio failover due to network disconnect')..."
                    className="w-full bg-slate-50 border border-border text-ink text-xs p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 min-h-[80px]"
                    required
                  />
                </div>

                {formError && (
                  <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {formError}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOverrideModalOpen(false);
                      setSelectedAppt(null);
                    }}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={overrideMutation.isPending}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 font-bold"
                  >
                    Apply Status Override
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
