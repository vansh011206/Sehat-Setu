import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  FileText,
  HeartPulse,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Stethoscope,
  Video,
  X,
  XCircle,
  ArrowRight,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Avatar } from "../../../components/ui/Avatar";
import { Badge, type BadgeVariant } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Modal } from "../../../components/ui/Modal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useAuthStore } from "../../../stores/authStore";
import { bookingsApi } from "../../bookings/api";
import { dashboardApi } from "../api";

function formatIndianDate(dateString: string | Date): string {
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

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const firstName = name ? name.trim().split(" ")[0] : "there";
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

const statusBadgeVariantMap: Record<string, BadgeVariant> = {
  CONFIRMED: "success",
  PENDING: "warning",
  COMPLETED: "teal",
  CANCELLED_BY_PATIENT: "danger",
  CANCELLED_BY_DOCTOR: "danger",
  MISSED: "neutral",
};

export function PatientDashboard() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Fetch Patient Dashboard Data
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["dashboard-patient"],
    queryFn: dashboardApi.getPatientDashboard,
    staleTime: 30000,
  });

  // Next appointment countdown timer
  const upcomingAppt = data?.stats?.upcoming_appointment;
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  } | null>(null);

  useEffect(() => {
    if (!upcomingAppt?.start_time) {
      setTimeLeft(null);
      return;
    }

    const target = new Date(upcomingAppt.start_time).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [upcomingAppt?.start_time]);

  // Cancel Appointment Mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      bookingsApi.cancelAppointment(id, reason),
    onSuccess: () => {
      toast({
        title: "Appointment Cancelled",
        description: "Your consultation has been successfully cancelled.",
        variant: "info",
      });
      setCancelModalOpen(false);
      setCancelReason("");
      setSelectedApptId(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard-patient"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (err: any) => {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.reason?.[0] ||
        "Unable to cancel appointment. Please try again.";
      toast({
        title: "Cancellation Failed",
        description: errorMsg,
        variant: "danger",
      });
    },
  });

  const handleCancelSubmit = () => {
    if (!selectedApptId) return;
    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      toast({
        title: "Reason Required",
        description: "Please provide a valid cancellation reason.",
        variant: "warning",
      });
      return;
    }
    cancelMutation.mutate({ id: selectedApptId, reason: cancelReason });
  };

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ─── Greeting Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
            <HeartPulse size={14} className="text-teal-700" />
            Patient Health Dashboard
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink">
            {getGreeting(user?.full_name)}
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
            className={isFetching ? "animate-spin" : ""}
            title="Refresh dashboard data"
          >
            Refresh
          </Button>

          <Link to="/doctors">
            <Button variant="primary" size="md" icon={CalendarPlus}>
              Book Consultation
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Stat Cards Row (4 Columns Responsive) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton variant="circle" className="w-12 h-12" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="w-20 h-3" />
                  <Skeleton className="w-12 h-6" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4 transition-all hover:border-teal-300">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                <Calendar size={22} className="text-teal-700" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                  Total Bookings
                </p>
                <h3 className="text-2xl font-extrabold font-heading text-ink mt-0.5 tabular-nums">
                  {data?.stats?.total_appointments ?? 0}
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4 transition-all hover:border-emerald-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} className="text-emerald-700" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                  Completed Visits
                </p>
                <h3 className="text-2xl font-extrabold font-heading text-emerald-700 mt-0.5 tabular-nums">
                  {data?.stats?.completed_count ?? 0}
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4 transition-all hover:border-rose-300">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <XCircle size={22} className="text-rose-700" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                  Cancelled / Missed
                </p>
                <h3 className="text-2xl font-extrabold font-heading text-slate-700 mt-0.5 tabular-nums">
                  {data?.stats?.cancelled_count ?? 0}
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4 transition-all hover:border-sky-300">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
                <FileText size={22} className="text-sky-700" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                  Digital Prescriptions
                </p>
                <h3 className="text-2xl font-extrabold font-heading text-sky-800 mt-0.5 tabular-nums">
                  {data?.stats?.prescriptions_count ?? 0}
                </h3>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Next Appointment Hero Card ─── */}
      <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-teal-700" />
            <h2 className="text-lg font-bold font-heading text-ink">
              Next Consultation
            </h2>
          </div>
          {upcomingAppt && (
            <Badge variant={statusBadgeVariantMap[upcomingAppt.status] || "teal"}>
              {upcomingAppt.status}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-28" variant="rect" />
          </div>
        ) : upcomingAppt ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Left 2 Cols: Doctor & Time Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-start gap-4">
                <Avatar
                  name={upcomingAppt.doctor.name}
                  src={upcomingAppt.doctor.photo}
                  size="xl"
                />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold font-heading text-ink">
                      Dr. {upcomingAppt.doctor.name}
                    </h3>
                    <Badge variant="teal" size="sm">
                      {upcomingAppt.doctor.specialty.name}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted">
                    {upcomingAppt.doctor.qualification}
                  </p>
                  <p className="text-xs text-muted flex items-center gap-1">
                    <MapPin size={12} className="text-teal-700" />
                    {upcomingAppt.doctor.clinic_name} • {upcomingAppt.doctor.city}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 bg-surface p-3.5 rounded-xl border border-border">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-teal-700" />
                  <span>{formatIndianDate(upcomingAppt.start_time)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-teal-700" />
                  <span className="tabular-nums">
                    {formatIndianTime(upcomingAppt.start_time)} -{" "}
                    {formatIndianTime(upcomingAppt.end_time)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-teal-700" />
                  <span>Ref: {upcomingAppt.booking_code}</span>
                </div>
                <div className="ml-auto font-bold text-teal-900 tabular-nums">
                  Fee: ₹{Number(upcomingAppt.fee_at_booking).toFixed(0)}
                </div>
              </div>
            </div>

            {/* Right Col: Live Countdown Ticker & Action Buttons */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                Time Until Consultation
              </span>

              {timeLeft && !timeLeft.isPast ? (
                <div className="grid grid-cols-4 gap-2 text-center w-full">
                  <div className="bg-white rounded-xl py-2 px-1 border border-teal-100 shadow-xs">
                    <span className="block text-xl font-extrabold text-teal-900 tabular-nums">
                      {String(timeLeft.days).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted">
                      Days
                    </span>
                  </div>
                  <div className="bg-white rounded-xl py-2 px-1 border border-teal-100 shadow-xs">
                    <span className="block text-xl font-extrabold text-teal-900 tabular-nums">
                      {String(timeLeft.hours).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted">
                      Hours
                    </span>
                  </div>
                  <div className="bg-white rounded-xl py-2 px-1 border border-teal-100 shadow-xs">
                    <span className="block text-xl font-extrabold text-teal-900 tabular-nums">
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted">
                      Mins
                    </span>
                  </div>
                  <div className="bg-white rounded-xl py-2 px-1 border border-teal-100 shadow-xs">
                    <span className="block text-xl font-extrabold text-teal-900 tabular-nums">
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted">
                      Secs
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-bold text-teal-900 bg-white px-4 py-2 rounded-xl border border-teal-200">
                  Ready for Consultation
                </div>
              )}

              <div className="flex flex-col w-full gap-2">
                <Link to={`/consult/${upcomingAppt.id}`} className="w-full">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Video}
                    className="w-full justify-center font-bold shadow-xs"
                    title="Enter Telehealth Consultation Room"
                  >
                    Join Video Consult
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => {
                    setSelectedApptId(upcomingAppt.id);
                    setCancelModalOpen(true);
                  }}
                  className="w-full justify-center text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  Cancel Appointment
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No upcoming consultations scheduled"
            description="Book your next consultation with certified specialists across 8+ specialties."
            action={
              <Link to="/doctors">
                <Button variant="primary" size="md" icon={CalendarPlus}>
                  Find Doctors
                </Button>
              </Link>
            }
          />
        )}
      </div>

      {/* ─── Main Grid: Recent Bookings & Recommended Doctors ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Consultations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading text-ink flex items-center gap-2">
              <Calendar size={18} className="text-teal-700" />
              Recent Consultations
            </h2>
            <Link
              to="/appointments"
              className="text-xs font-bold text-teal-800 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-20" variant="rect" />
              ))}
            </div>
          ) : data?.recent_appointments && data.recent_appointments.length > 0 ? (
            <div className="space-y-3">
              {data.recent_appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-white p-4 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-teal-200"
                >
                  <div className="flex items-center gap-3.5">
                    <Avatar
                      name={appt.doctor.name}
                      src={appt.doctor.photo}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold font-heading text-ink">
                          Dr. {appt.doctor.name}
                        </h4>
                        <Badge
                          variant={
                            statusBadgeVariantMap[appt.status] || "neutral"
                          }
                          size="sm"
                        >
                          {appt.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted">
                        {appt.doctor.specialty.name} • {appt.doctor.city}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                    <span className="text-xs font-semibold text-slate-700">
                      {formatIndianDate(appt.start_time)}
                    </span>
                    <span className="text-[11px] text-muted tabular-nums">
                      {formatIndianTime(appt.start_time)} • Ref: {appt.booking_code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-border p-8">
              <EmptyState
                icon={Calendar}
                title="No past consultation history"
                description="Your past visits, prescriptions, and follow-ups will appear here."
              />
            </div>
          )}
        </div>

        {/* Right Col: Quick Actions Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-heading text-ink flex items-center gap-2">
            <Sparkles size={18} className="text-teal-700" />
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <Link
              to="/doctors"
              className="bg-white p-4 rounded-2xl border border-border shadow-xs hover:border-teal-400 hover:shadow-sm transition-all flex items-center gap-3.5 group"
            >
              <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 group-hover:bg-teal-700 group-hover:text-white transition-colors shrink-0">
                <Search size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-ink group-hover:text-teal-800 transition-colors">
                  Find a Doctor
                </h4>
                <p className="text-xs text-muted">
                  Explore verified specialists by city & specialty
                </p>
              </div>
              <ArrowRight size={14} className="text-muted group-hover:text-teal-800 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/appointments"
              className="bg-white p-4 rounded-2xl border border-border shadow-xs hover:border-teal-400 hover:shadow-sm transition-all flex items-center gap-3.5 group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors shrink-0">
                <CalendarPlus size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-ink group-hover:text-teal-800 transition-colors">
                  Book Slot
                </h4>
                <p className="text-xs text-muted">
                  Reserve a real-time clinic or video consultation
                </p>
              </div>
              <ArrowRight size={14} className="text-muted group-hover:text-teal-800 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/prescriptions"
              className="bg-white p-4 rounded-2xl border border-border shadow-xs hover:border-teal-400 hover:shadow-sm transition-all flex items-center gap-3.5 group"
            >
              <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 group-hover:bg-sky-700 group-hover:text-white transition-colors shrink-0">
                <FileText size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-ink group-hover:text-teal-800 transition-colors">
                  My Prescriptions
                </h4>
                <p className="text-xs text-muted">
                  Access signed digital health records
                </p>
              </div>
              <ArrowRight size={14} className="text-muted group-hover:text-teal-800 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/appointments"
              className="bg-white p-4 rounded-2xl border border-border shadow-xs hover:border-teal-400 hover:shadow-sm transition-all flex items-center gap-3.5 group"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:bg-amber-700 group-hover:text-white transition-colors shrink-0">
                <Clock size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-ink group-hover:text-teal-800 transition-colors">
                  Medical History
                </h4>
                <p className="text-xs text-muted">
                  View full logs of appointments & notes
                </p>
              </div>
              <ArrowRight size={14} className="text-muted group-hover:text-teal-800 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Recommended Doctors Horizontal Scroll ─── */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-heading text-ink flex items-center gap-2">
              <Stethoscope size={18} className="text-teal-700" />
              Recommended Specialists
            </h2>
            <p className="text-xs text-muted">
              Top-rated verified doctors curated for your location
            </p>
          </div>
          <Link
            to="/doctors"
            className="text-xs font-bold text-teal-800 hover:underline flex items-center gap-1"
          >
            Explore Directory <ArrowRight size={12} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-72 h-44 shrink-0" variant="rect" />
            ))}
          </div>
        ) : data?.recommended_doctors && data.recommended_doctors.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-3">
            {data.recommended_doctors.map((doc) => (
              <div
                key={doc.id}
                className="w-72 shrink-0 bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={doc.name} src={doc.photo} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold font-heading text-ink truncate">
                        Dr. {doc.name}
                      </h4>
                      <Badge variant="teal" size="sm" className="mt-0.5">
                        {doc.specialty.name}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted">
                    <p className="flex items-center gap-1 truncate">
                      <MapPin size={12} className="text-teal-700 shrink-0" />
                      {doc.city} {doc.clinic_name ? `• ${doc.clinic_name}` : ""}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <Star size={13} className="text-amber-500 fill-amber-500" />
                        {Number(doc.avg_rating).toFixed(1)}{" "}
                        <span className="text-muted font-normal">
                          ({doc.rating_count})
                        </span>
                      </span>
                      <span className="font-bold text-teal-900 tabular-nums">
                        ₹{Number(doc.fee).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border mt-3">
                  <Link to={`/doctors/${doc.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center text-xs font-bold"
                    >
                      Book Slot
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Stethoscope}
            title="No doctor recommendations currently available"
            description="Explore our complete medical directory to connect with verified practitioners."
          />
        )}
      </div>

      {/* ─── Cancel Appointment Confirmation Modal ─── */}
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
            Are you sure you want to cancel this scheduled consultation? Please note that patients may cancel up to 6 hours before consultation start time.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Scheduling conflict, feeling better, need to reschedule..."
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
              onClick={handleCancelSubmit}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
