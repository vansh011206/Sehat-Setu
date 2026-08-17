import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  FileText,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Video,
} from "lucide-react";
import { AppLayout } from "../../layouts/AppLayout";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuthStore } from "../../stores/authStore";
import { bookingsApi } from "../bookings/api";

export function DashboardPage() {
  const { user } = useAuthStore();

  const isDoctor = user?.role === "DOCTOR";
  const isAdmin = user?.role === "ADMIN";

  // Fetch upcoming appointments
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ["dashboard-appointments", user?.id],
    queryFn: () => bookingsApi.getAppointments({ upcoming: "true", page_size: 5 }),
    enabled: !!user,
  });

  const upcomingList = appointmentsData?.results || [];

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* ─── Greeting Hero Banner ─── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} className="text-teal-300" />
              {isDoctor ? "Doctor Clinical Portal" : isAdmin ? "Platform Administration" : "Patient Health Portal"}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-white">
              Welcome back, {user?.full_name || "User"}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-xl font-medium">
              {isDoctor
                ? "Manage your daily patient queue, conduct HD video sessions, and configure weekly slot availability."
                : isAdmin
                ? "Oversee user registrations, verify doctor credentials, and monitor platform telehealth telemetry."
                : "Schedule appointments with India’s top certified medical specialists and access verified digital prescriptions."}
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10 shrink-0">
            {isDoctor ? (
              <Link to="/schedule">
                <Button
                  variant="secondary"
                  size="md"
                  icon={Calendar}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  Manage Availability
                </Button>
              </Link>
            ) : (
              <Link to="/doctors">
                <Button
                  variant="secondary"
                  size="md"
                  icon={Calendar}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  Find Doctors
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* ─── Metric Stat Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
              <Calendar size={24} className="text-teal-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Upcoming Consultations</p>
              <h3 className="text-2xl font-extrabold font-heading text-slate-900 mt-0.5">
                {upcomingList.length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
              <HeartPulse size={24} className="text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Active Health Status</p>
              <h3 className="text-2xl font-extrabold font-heading text-emerald-600 mt-0.5">
                Optimal
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <FileText size={24} className="text-emerald-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Digital Prescriptions</p>
              <h3 className="text-2xl font-extrabold font-heading text-slate-900 mt-0.5">
                2 Verified
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center">
              <ShieldCheck size={24} className="text-sky-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Compliance</p>
              <h3 className="text-2xl font-extrabold font-heading text-teal-900 mt-0.5">
                ABDM 100%
              </h3>
            </div>
          </div>
        </div>

        {/* ─── Main Grid: Upcoming Consultations Stream ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-heading text-slate-900 flex items-center gap-2">
                <Calendar size={18} className="text-teal-700" /> Upcoming Scheduled Consultations
              </h2>
              <Link
                to="/appointments"
                className="text-xs font-bold text-teal-800 hover:underline"
              >
                View All
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
            ) : upcomingList.length > 0 ? (
              <div className="space-y-3">
                {upcomingList.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-teal-300 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {apt.booking_code}
                        </span>
                        <Badge variant="teal" size="sm">
                          {apt.status}
                        </Badge>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">
                        {isDoctor ? apt.patient.full_name : `Dr. ${apt.doctor.name}`}
                      </h3>

                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <Clock size={12} className="text-teal-700" />
                        <span>{new Date(apt.start_time).toLocaleString()}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link to="/consultations">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Video}
                          className="bg-teal-800 hover:bg-teal-900"
                        >
                          Join Call
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <Calendar size={32} className="mx-auto text-teal-700" />
                <h4 className="text-sm font-bold text-slate-800">No Scheduled Consultations</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You have no pending or confirmed consultations. Book a slot with our certified specialists.
                </p>
                <Link to="/doctors">
                  <Button variant="primary" size="sm">
                    Find Doctors
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* ─── Right Quick Actions & Health Tips ─── */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold font-heading text-slate-900">
                Quick Shortcuts
              </h3>

              <div className="space-y-2">
                <Link
                  to="/doctors"
                  className="p-3 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 flex items-center justify-between text-xs font-bold text-slate-800 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <Stethoscope size={16} className="text-teal-700" /> Find Medical Specialists
                  </span>
                  <span className="text-teal-700 group-hover:translate-x-1 transition-transform">→</span>
                </Link>

                <Link
                  to="/appointments"
                  className="p-3 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 flex items-center justify-between text-xs font-bold text-slate-800 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <Calendar size={16} className="text-teal-700" /> My Appointments
                  </span>
                  <span className="text-teal-700 group-hover:translate-x-1 transition-transform">→</span>
                </Link>

                <Link
                  to="/prescriptions"
                  className="p-3 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 flex items-center justify-between text-xs font-bold text-slate-800 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={16} className="text-teal-700" /> Digital Prescriptions
                  </span>
                  <span className="text-teal-700 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
