import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar,
  CalendarClock,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileText,
  IndianRupee,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  Users,
  X,
  XCircle,
  ChevronRight,
  Stethoscope,
  CalendarCheck2,
  Video,
  Filter,
} from "lucide-react";

export const TIMEFRAME_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 Days" },
  { key: "20d", label: "Last 20 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "all", label: "All Time" },
] as const;

export type TimeframeKey = (typeof TIMEFRAME_OPTIONS)[number]["key"];
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Avatar } from "../../../components/ui/Avatar";
import { Badge, type BadgeVariant } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Modal } from "../../../components/ui/Modal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useAuthStore } from "../../../stores/authStore";
import { bookingsApi } from "../../bookings/api";
import {
  dashboardApi,
  type DoctorPatientSummary,
  type DoctorTodayAppointment,
} from "../api";

function formatIndianDate(dateString: string | Date | null): string {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatIndianTime(dateString: string | Date): string {
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-xl text-xs space-y-1.5 font-sans">
        <p className="font-bold text-teal-300">{label}</p>
        <div className="space-y-1">
          {payload.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-slate-300 font-medium">{item.name}:</span>
              <span className="font-bold text-white tabular-nums">
                {item.name === "Revenue" ? `₹${item.value}` : item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function DoctorDashboard() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const doctorId = user?.doctor_profile?.id;

  // Search filter for patients
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatientSummary | null>(null);
  const [patientModalOpen, setPatientModalOpen] = useState(false);

  // Cancellation modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Timeframe filter state (today, 7d, 20d, 30d, all)
  const [timeframe, setTimeframe] = useState<TimeframeKey>("today");

  // Fetch Doctor Dashboard Telemetry
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["dashboard-doctor", timeframe],
    queryFn: () => dashboardApi.getDoctorDashboard(timeframe),
    staleTime: 30000,
  });

  const currentOption = TIMEFRAME_OPTIONS.find((o) => o.key === timeframe) || TIMEFRAME_OPTIONS[0];
  const timeframeLabel = data?.timeframe_label || currentOption.label;

  // Fetch Doctor Patients List
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ["doctor-patients", doctorId],
    queryFn: () => (doctorId ? dashboardApi.getDoctorPatients(doctorId) : []),
    enabled: !!doctorId,
    staleTime: 30000,
  });

  // Action Mutations
  const confirmMutation = useMutation({
    mutationFn: (id: number) => bookingsApi.confirmAppointment(id),
    onSuccess: () => {
      toast({
        title: "Appointment Confirmed",
        description: "Patient appointment has been marked confirmed.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-doctor"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: () => {
      toast({
        title: "Action Failed",
        description: "Unable to confirm appointment.",
        variant: "danger",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => bookingsApi.completeAppointment(id),
    onSuccess: () => {
      toast({
        title: "Consultation Completed",
        description: "Session marked completed. Revenue and metrics updated.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-doctor"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-patients"] });
    },
    onError: () => {
      toast({
        title: "Action Failed",
        description: "Unable to complete appointment.",
        variant: "danger",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      bookingsApi.cancelAppointment(id, reason),
    onSuccess: () => {
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been cancelled.",
        variant: "info",
      });
      setCancelModalOpen(false);
      setCancelReason("");
      setCancelTargetId(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard-doctor"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (err: any) => {
      toast({
        title: "Cancellation Failed",
        description: err?.response?.data?.detail || "Unable to cancel.",
        variant: "danger",
      });
    },
  });

  const filteredPatients = (patientsData || []).filter((p) => {
    const q = patientSearch.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const checklist = data?.profile_completion_checklist;
  const isProfileIncomplete = data ? !data.is_profile_complete : false;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ─── Greeting Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
            <Stethoscope size={14} className="text-teal-700" />
            Doctor Clinical Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink">
            Welcome back, Dr. {user?.full_name?.replace(/^Dr\.?\s*/i, "") || "Doctor"}
          </h1>
          <p className="text-xs sm:text-sm text-muted font-medium">
            {todayFormatted}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => refetch()}
            loading={isFetching}
            title="Refresh clinical metrics"
          >
            Refresh
          </Button>

          <Link to="/schedule">
            <Button variant="primary" size="md" icon={CalendarClock}>
              Manage Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Timeframe Filter Bar (Today, Last 7 Days, Last 20 Days, Last 30 Days, All Time) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
            <Filter size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink">Dashboard Filter</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                {timeframeLabel}
              </span>
            </div>
            <p className="text-[11px] text-muted">Showing clinical metrics, consultations & trends for {timeframeLabel.toLowerCase()}</p>
          </div>
        </div>

        {/* Small Filter Pill Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 overflow-x-auto">
          {TIMEFRAME_OPTIONS.map((opt) => {
            const isActive = timeframe === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTimeframe(opt.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-teal-800 text-white shadow-xs scale-100"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Profile Incomplete Checklist Banner ─── */}
      {isProfileIncomplete && checklist && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                <ShieldAlert size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold font-heading text-amber-900">
                  Doctor Profile Incomplete ({checklist.percentage}% Complete)
                </h3>
                <p className="text-xs text-amber-800/90 max-w-2xl">
                  Complete all required registration and credential fields to activate public patient discovery and slot bookings.
                </p>
              </div>
            </div>

            <Link to="/profile">
              <Button
                variant="secondary"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shrink-0"
              >
                Complete Profile
              </Button>
            </Link>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-amber-200/70 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${checklist.percentage}%` }}
            />
          </div>

          {/* Checklist Badges */}
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {Object.entries(checklist.items).map(([key, done]) => {
              const label = key
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");

              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-[11px] ${
                    done
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-white text-amber-900 border border-amber-300"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 size={12} className="text-emerald-700" />
                  ) : (
                    <XCircle size={12} className="text-amber-600" />
                  )}
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Stat Cards Row (2x2 on mobile, 4 Columns on lg) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-3.5 sm:p-5 rounded-2xl border border-border shadow-xs space-y-2 sm:space-y-3"
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <Skeleton variant="circle" className="w-9 h-9 sm:w-12 sm:h-12" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="w-16 h-3" />
                  <Skeleton className="w-10 h-5" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-border shadow-xs flex items-center gap-2.5 sm:gap-4 transition-all hover:border-teal-300">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-teal-700 sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider truncate">
                  {timeframe === "today" ? "Today's Slots" : `${timeframeLabel} Slots`}
                </p>
                <h3 className="text-xl sm:text-2xl font-extrabold font-heading text-ink mt-0.5 tabular-nums">
                  {data?.today_schedule?.length ?? 0}
                </h3>
              </div>
            </div>

            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-border shadow-xs flex items-center gap-2.5 sm:gap-4 transition-all hover:border-emerald-300">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-emerald-700 sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider truncate">
                  {timeframe === "today" ? "Completed" : `${timeframeLabel} Completed`}
                </p>
                <h3 className="text-xl sm:text-2xl font-extrabold font-heading text-emerald-700 mt-0.5 tabular-nums">
                  {data?.completed_today_count ?? 0}
                </h3>
              </div>
            </div>

            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-border shadow-xs flex items-center gap-2.5 sm:gap-4 transition-all hover:border-sky-300">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
                <Users size={18} className="text-sky-700 sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider truncate">
                  {timeframe === "today" ? "Patients" : `${timeframeLabel} Patients`}
                </p>
                <h3 className="text-xl sm:text-2xl font-extrabold font-heading text-sky-800 mt-0.5 tabular-nums">
                  {data?.total_patients_served ?? 0}
                </h3>
              </div>
            </div>

            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-border shadow-xs flex items-center gap-2.5 sm:gap-4 transition-all hover:border-amber-300">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Star size={18} className="text-amber-500 fill-amber-500 sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider truncate">
                  Rating
                </p>
                <h3 className="text-xl sm:text-2xl font-extrabold font-heading text-amber-600 mt-0.5 tabular-nums">
                  {Number(data?.avg_rating || 0).toFixed(1)}{" "}
                  <span className="text-[10px] font-semibold text-muted">
                    ({data?.rating_count ?? 0})
                  </span>
                </h3>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Schedule Timeline ─── */}
      <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold font-heading text-ink flex items-center gap-2">
              <CalendarClock size={20} className="text-teal-700" />
              {timeframe === "today"
                ? "Today's Consultation Schedule"
                : `${timeframeLabel} Consultation Queue`}
            </h2>
            <p className="text-xs text-muted">
              {timeframe === "today"
                ? "Live patient consultation queue with immediate action controls"
                : `Reviewing appointments and sessions recorded in ${timeframeLabel.toLowerCase()}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-surface px-3 py-1 rounded-full border border-border tabular-nums">
              {timeframe === "today" ? "Today's Completed Revenue" : `${timeframeLabel} Revenue`}: ₹{Number(data?.today_revenue || 0).toFixed(0)}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-24" variant="rect" />
            ))}
          </div>
        ) : data?.today_schedule && data.today_schedule.length > 0 ? (
          <div className="space-y-3">
            {data.today_schedule.map((appt: DoctorTodayAppointment) => (
              <div
                key={appt.id}
                className="bg-surface p-4 sm:p-5 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-teal-300"
              >
                {/* Left: Date & Time in tabular-nums */}
                <div className="md:w-48 shrink-0 flex items-center gap-2.5 text-slate-900 font-bold text-sm tabular-nums">
                  <Clock size={16} className="text-teal-700 shrink-0" />
                  <div>
                    {timeframe !== "today" && (
                      <p className="text-xs text-teal-800 font-bold">
                        {formatIndianDate(appt.start_time)}
                      </p>
                    )}
                    <p className="text-xs text-slate-700 font-semibold">
                      {formatIndianTime(appt.start_time)} - {formatIndianTime(appt.end_time)}
                    </p>
                  </div>
                </div>

                {/* Center: Patient Mini Profile */}
                <div className="flex-1 flex items-start gap-3.5">
                  <Avatar
                    name={appt.patient.full_name}
                    src={appt.patient.profile_picture}
                    size="md"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold font-heading text-ink">
                        {appt.patient.full_name}
                      </h4>
                      <Badge
                        variant={statusBadgeVariantMap[appt.status] || "neutral"}
                        size="sm"
                      >
                        {appt.status}
                      </Badge>
                      <span className="text-[11px] font-semibold text-muted">
                        Ref: {appt.booking_code}
                      </span>
                    </div>

                    <p className="text-xs text-muted">
                      Phone: {appt.patient.phone}
                      {appt.patient.gender ? ` • Gender: ${appt.patient.gender}` : ""}
                    </p>

                    {appt.symptoms && (
                      <p className="text-xs text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-border inline-block max-w-lg truncate">
                        <span className="font-bold text-slate-900">Symptoms:</span> {appt.symptoms}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Inline Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                  {appt.status === "PENDING" && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Check}
                      loading={confirmMutation.isPending}
                      onClick={() => confirmMutation.mutate(appt.id)}
                      className="text-teal-700 hover:text-teal-800 hover:bg-teal-50 text-xs font-bold"
                      title="Confirm Appointment"
                    >
                      Confirm
                    </Button>
                  )}

                  {appt.status !== "CANCELLED_BY_PATIENT" &&
                    appt.status !== "CANCELLED_BY_DOCTOR" && (
                      <Link to={`/consult/${appt.id}`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Video}
                          className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs"
                          title="Enter Telehealth Consultation Stage"
                        >
                          Join Room
                        </Button>
                      </Link>
                    )}

                  {appt.status !== "COMPLETED" &&
                    appt.status !== "CANCELLED_BY_PATIENT" &&
                    appt.status !== "CANCELLED_BY_DOCTOR" && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={CheckCheck}
                        loading={completeMutation.isPending}
                        onClick={() => completeMutation.mutate(appt.id)}
                        className="text-xs font-bold"
                        title="Mark Consultation Completed"
                      >
                        Complete
                      </Button>
                    )}

                  {appt.status !== "COMPLETED" &&
                    appt.status !== "CANCELLED_BY_PATIENT" &&
                    appt.status !== "CANCELLED_BY_DOCTOR" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={X}
                        onClick={() => {
                          setCancelTargetId(appt.id);
                          setCancelModalOpen(true);
                        }}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
                        title="Cancel Appointment"
                      >
                        Cancel
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarCheck2}
            title={
              timeframe === "today"
                ? "No consultations scheduled for today"
                : `No consultations found for ${timeframeLabel.toLowerCase()}`
            }
            description={
              timeframe === "today"
                ? "Your daily schedule is clear. Check weekly slot rules or open new slots in Schedule."
                : `No appointments were recorded in ${timeframeLabel.toLowerCase()}. Try selecting a broader timeframe like Last 20 Days or All Time.`
            }
            action={
              <Link to="/schedule">
                <Button variant="outline" size="sm" icon={CalendarClock}>
                  Configure Slots
                </Button>
              </Link>
            }
          />
        )}
      </div>

      {/* ─── Monthly/Daily Trends Bar Chart (Recharts) ─── */}
      <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold font-heading text-ink flex items-center gap-2">
              <IndianRupee size={20} className="text-teal-700" />
              {timeframe === "7d" || timeframe === "20d" || timeframe === "30d"
                ? `Daily Consultations & Trends (${timeframeLabel})`
                : "Monthly Consultations & Telehealth Trends"}
            </h2>
            <p className="text-xs text-muted">
              {timeframe === "7d" || timeframe === "20d" || timeframe === "30d"
                ? `Day-by-day analytics of scheduled consultations and completed sessions over ${timeframeLabel.toLowerCase()}`
                : "Rolling 12-month analytics of scheduled consultations and completed sessions"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="w-full h-72" variant="rect" />
        ) : data?.monthly_appointments && data.monthly_appointments.length > 0 ? (
          <div className="w-full h-[220px] sm:h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.monthly_appointments}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  dataKey="month"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                />
                <Bar
                  dataKey="count"
                  name="Total Consultations"
                  fill="#99F6E4"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="completed"
                  name="Completed Sessions"
                  fill="#0D9488"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No historical trend telemetry"
            description="Consultation metrics will populate as patients book and complete sessions."
          />
        )}
      </div>

      {/* ─── My Patients Section with Search ─── */}
      <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold font-heading text-ink flex items-center gap-2">
              <Users size={20} className="text-teal-700" />
              My Patient Directory
            </h2>
            <p className="text-xs text-muted">
              Distinct clinical patient records, visit histories, and digital prescriptions
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search patient name or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-teal-700 bg-surface"
            />
          </div>
        </div>

        {patientsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-24" variant="rect" />
            ))}
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="bg-surface p-4 rounded-2xl border border-border shadow-xs flex items-center justify-between gap-4 hover:border-teal-300 transition-all cursor-pointer"
                onClick={() => {
                  setSelectedPatient(patient);
                  setPatientModalOpen(true);
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={patient.full_name}
                    src={patient.profile_picture}
                    size="md"
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold font-heading text-ink truncate">
                      {patient.full_name}
                    </h4>
                    <p className="text-xs text-muted">{patient.phone}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 tabular-nums">
                        {patient.total_visits} Visits
                      </span>
                      {patient.last_visit_date && (
                        <span className="text-[11px] text-muted">
                          Last: {formatIndianDate(patient.last_visit_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <ChevronRight size={18} className="text-muted shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={
              patientSearch
                ? "No matching patients found"
                : "No patient records on file"
            }
            description={
              patientSearch
                ? "Try adjusting your search criteria."
                : "Patients who book appointments with you will appear in your clinical directory."
            }
          />
        )}
      </div>

      {/* ─── Patient History Detail Modal ─── */}
      <Modal
        open={patientModalOpen}
        onClose={() => {
          setPatientModalOpen(false);
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
                  setPatientModalOpen(false);
                  setSelectedPatient(null);
                }}
              >
                Close Record
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Cancel Modal ─── */}
      <Modal
        open={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setCancelReason("");
        }}
        title="Cancel Appointment"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Please provide a clinical or scheduling reason for cancelling this appointment. The patient will be notified immediately.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Emergency surgery, doctor unavailable, schedule conflict..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-teal-700 min-h-[90px] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelReason("");
              }}
            >
              Keep Appointment
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={cancelMutation.isPending}
              onClick={() => {
                if (!cancelTargetId || !cancelReason.trim()) {
                  toast({
                    title: "Reason Required",
                    description: "Please specify a cancellation reason.",
                    variant: "warning",
                  });
                  return;
                }
                cancelMutation.mutate({ id: cancelTargetId, reason: cancelReason });
              }}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
