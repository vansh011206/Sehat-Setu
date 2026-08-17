import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  IndianRupee,
  MapPin,
  RefreshCw,
  Stethoscope,
  Video,
  XCircle,
} from "lucide-react";
import type { Appointment, AppointmentStatus } from "../features/bookings/api";
import { bookingsApi } from "../features/bookings/api";
import { AppLayout } from "../layouts/AppLayout";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";

const CANCELLATION_REASONS = [
  "Schedule conflict / Personal emergency",
  "Feeling better / Symptoms resolved",
  "Booked another doctor / Earlier slot",
  "Need to reschedule consultation",
  "Other medical reasons",
];

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState(CANCELLATION_REASONS[0]);
  const [cancelCustomNotes, setCancelCustomNotes] = useState("");

  // Fetch appointments
  const {
    data: appointmentsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["appointments", activeTab],
    queryFn: () =>
      bookingsApi.getAppointments({
        upcoming: activeTab === "upcoming" ? "true" : activeTab === "past" ? "false" : undefined,
      }),
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      bookingsApi.cancelAppointment(id, reason),
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Appointment Cancelled",
        message: "Your appointment has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setCancellingAppointment(null);
    },
    onError: (err: any) => {
      addToast({
        type: "error",
        title: "Cancellation Failed",
        message: err?.response?.data?.detail || "Could not cancel appointment.",
      });
    },
  });

  const handleConfirmCancel = () => {
    if (!cancellingAppointment) return;
    const finalReason = `${cancelReasonPreset}: ${cancelCustomNotes}`.trim();
    cancelMutation.mutate({
      id: cancellingAppointment.id,
      reason: finalReason,
    });
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="teal" size="sm">Confirmed</Badge>;
      case "PENDING":
        return <Badge variant="warning" size="sm">Pending</Badge>;
      case "COMPLETED":
        return <Badge variant="success" size="sm">Completed</Badge>;
      case "CANCELLED_BY_PATIENT":
        return <Badge variant="danger" size="sm">Cancelled by You</Badge>;
      case "CANCELLED_BY_DOCTOR":
        return <Badge variant="danger" size="sm">Cancelled by Doctor</Badge>;
      case "MISSED":
        return <Badge variant="neutral" size="sm">Missed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const appointments = appointmentsData?.results || [];

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900">
              My Consultations
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track upcoming video consultations, in-clinic visits, and consultation history.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={() => refetch()}
              className={isFetching ? "animate-spin" : ""}
            >
              Refresh
            </Button>
            <Link to="/doctors">
              <Button variant="primary" size="sm" icon={Calendar}>
                Book New Slot
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {[
            { key: "upcoming", label: "Upcoming Consultations" },
            { key: "past", label: "Past & Completed" },
            { key: "all", label: "All Appointments" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-teal-800 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-teal-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((apt) => {
              const startDate = new Date(apt.start_time);
              const endDate = new Date(apt.end_time);
              const isFuture = startDate > new Date();
              const canCancel =
                (apt.status === "CONFIRMED" || apt.status === "PENDING") && isFuture;

              return (
                <div
                  key={apt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-3 flex-1">
                    {/* Top Row: Ref code + Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold font-heading text-teal-900 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                        {apt.booking_code}
                      </span>
                      {getStatusBadge(apt.status)}
                    </div>

                    {/* Doctor Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {apt.doctor.name.replace("Dr. ", "").charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Dr. {apt.doctor.name}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Stethoscope size={12} className="text-teal-700" />
                          <span>{apt.doctor.specialty?.name || "Specialist"}</span>
                          <span>•</span>
                          <MapPin size={12} className="text-teal-700" />
                          <span>{apt.doctor.city}</span>
                        </p>
                      </div>
                    </div>

                    {/* Date / Time */}
                    <div className="flex items-center gap-4 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Calendar size={13} className="text-teal-700" />
                        {startDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Clock size={13} className="text-teal-700" />
                        {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="flex items-center font-extrabold text-teal-900 ml-auto">
                        <IndianRupee size={12} />
                        {apt.fee_at_booking}
                      </span>
                    </div>

                    {apt.symptoms && (
                      <p className="text-xs text-slate-500 line-clamp-1 italic">
                        Symptoms: {apt.symptoms}
                      </p>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                    <Link to="/consultations">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Video}
                        className="bg-teal-800 hover:bg-teal-900"
                      >
                        Enter Room
                      </Button>
                    </Link>

                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={XCircle}
                        onClick={() => setCancellingAppointment(apt)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Cancel Slot
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title={
              activeTab === "upcoming"
                ? "No Upcoming Consultations"
                : "No Appointment Records Found"
            }
            description="You do not have any scheduled appointments in this view. Browse specialists to book a time slot."
            action={
              <Link to="/doctors">
                <Button variant="primary" size="md" icon={Calendar}>
                  Find & Book Doctors
                </Button>
              </Link>
            }
          />
        )}

        {/* ─── Cancel Confirmation Modal ─── */}
        {cancellingAppointment && (
          <Modal
            open={!!cancellingAppointment}
            onClose={() => setCancellingAppointment(null)}
            title={`Cancel Appointment (${cancellingAppointment.booking_code})`}
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to cancel your consultation with{" "}
                <strong className="text-slate-900">Dr. {cancellingAppointment.doctor.name}</strong>{" "}
                scheduled for{" "}
                <strong className="text-slate-900">
                  {new Date(cancellingAppointment.start_time).toLocaleString()}
                </strong>
                ?
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Reason for Cancellation
                </label>
                <select
                  value={cancelReasonPreset}
                  onChange={(e) => setCancelReasonPreset(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-700 focus:outline-none"
                >
                  {CANCELLATION_REASONS.map((r, idx) => (
                    <option key={idx} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={cancelCustomNotes}
                  onChange={(e) => setCancelCustomNotes(e.target.value)}
                  placeholder="Provide any additional context..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-700 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setCancellingAppointment(null)}
                >
                  Keep Appointment
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  icon={XCircle}
                  isLoading={cancelMutation.isPending}
                  onClick={handleConfirmCancel}
                >
                  Confirm Cancellation
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppLayout>
  );
}
