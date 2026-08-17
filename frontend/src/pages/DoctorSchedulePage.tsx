import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Save,
  Stethoscope,
  User,
  Video,
} from "lucide-react";
import type { AvailabilityRule } from "../features/doctors/api";
import { doctorsApi } from "../features/doctors/api";
import { bookingsApi } from "../features/bookings/api";
import { AppLayout } from "../layouts/AppLayout";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { useAuthStore } from "../stores/authStore";

const WEEKDAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 7, name: "Sunday" },
];

export function DoctorSchedulePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const doctorId = user?.id || 1; // Fallback for testing/admin

  const [rules, setRules] = useState<AvailabilityRule[]>([
    { weekday: 1, start_time: "09:00", end_time: "17:00", slot_duration: 30, is_active: true },
    { weekday: 2, start_time: "09:00", end_time: "17:00", slot_duration: 30, is_active: true },
    { weekday: 3, start_time: "09:00", end_time: "17:00", slot_duration: 30, is_active: true },
    { weekday: 4, start_time: "09:00", end_time: "17:00", slot_duration: 30, is_active: true },
    { weekday: 5, start_time: "09:00", end_time: "17:00", slot_duration: 30, is_active: true },
    { weekday: 6, start_time: "09:00", end_time: "14:00", slot_duration: 30, is_active: true },
    { weekday: 7, start_time: "09:00", end_time: "13:00", slot_duration: 30, is_active: false },
  ]);

  // Fetch today's appointments for this doctor
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: appointmentsData, isLoading: isLoadingAppointments, refetch: refetchAppointments } = useQuery({
    queryKey: ["doctor-today-appointments", todayStr],
    queryFn: () => bookingsApi.getAppointments({ date: todayStr }),
  });

  // Save rules mutation
  const saveRulesMutation = useMutation({
    mutationFn: (rulesToSave: AvailabilityRule[]) =>
      doctorsApi.updateAvailability(doctorId, rulesToSave),
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Schedule Saved",
        message: "Your weekly consultation availability rules have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["doctor-availability", doctorId] });
    },
    onError: (err: any) => {
      addToast({
        type: "error",
        title: "Update Failed",
        message: err?.response?.data?.detail || "Could not update availability rules.",
      });
    },
  });

  // Complete appointment mutation
  const completeMutation = useMutation({
    mutationFn: (id: number) => bookingsApi.completeAppointment(id),
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Consultation Completed",
        message: "Appointment marked as completed. Digital prescription unlocked.",
      });
      refetchAppointments();
    },
  });

  const handleRuleChange = (
    weekday: number,
    field: keyof AvailabilityRule,
    value: any
  ) => {
    setRules((prev) =>
      prev.map((r) => (r.weekday === weekday ? { ...r, [field]: value } : r))
    );
  };

  const handleSaveSchedule = () => {
    saveRulesMutation.mutate(rules);
  };

  const todayAppointments = appointmentsData?.results || [];

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-8 max-w-5xl mx-auto pb-12">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900">
              Doctor Schedule & Working Hours
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Configure weekly working hours, slot durations, and view today’s patient consultation schedule.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            icon={Save}
            isLoading={saveRulesMutation.isPending}
            onClick={handleSaveSchedule}
          >
            Save Weekly Schedule
          </Button>
        </div>

        {/* ─── 1. Weekly Availability Rules Matrix ─── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-teal-700" /> Recurring Weekly Working Hours
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              Slots generate automatically for 14 days
            </span>
          </div>

          <div className="space-y-3 divide-y divide-slate-100">
            {WEEKDAYS.map((day) => {
              const rule =
                rules.find((r) => r.weekday === day.id) || {
                  weekday: day.id,
                  start_time: "09:00",
                  end_time: "17:00",
                  slot_duration: 30,
                  is_active: false,
                };

              return (
                <div
                  key={day.id}
                  className={`pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl transition-all ${
                    rule.is_active ? "bg-teal-50/40 border border-teal-100" : "bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center gap-3 w-36">
                    <input
                      type="checkbox"
                      id={`day-${day.id}`}
                      checked={rule.is_active}
                      onChange={(e) =>
                        handleRuleChange(day.id, "is_active", e.target.checked)
                      }
                      className="w-4 h-4 text-teal-800 rounded border-slate-300 focus:ring-teal-700"
                    />
                    <label
                      htmlFor={`day-${day.id}`}
                      className={`text-xs font-bold ${
                        rule.is_active ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {day.name}
                    </label>
                  </div>

                  {rule.is_active ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-medium">From:</span>
                        <input
                          type="time"
                          value={rule.start_time.slice(0, 5)}
                          onChange={(e) =>
                            handleRuleChange(day.id, "start_time", e.target.value)
                          }
                          className="p-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-medium">To:</span>
                        <input
                          type="time"
                          value={rule.end_time.slice(0, 5)}
                          onChange={(e) =>
                            handleRuleChange(day.id, "end_time", e.target.value)
                          }
                          className="p-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-medium">Slot:</span>
                        <select
                          value={rule.slot_duration}
                          onChange={(e) =>
                            handleRuleChange(
                              day.id,
                              "slot_duration",
                              Number(e.target.value)
                            )
                          }
                          className="p-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white"
                        >
                          <option value={15}>15 Mins</option>
                          <option value={30}>30 Mins</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Unavailable / Clinic Closed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 2. Today's Patient Appointments Queue ─── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
                <Stethoscope size={18} className="text-teal-700" /> Today's Consultation Schedule
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage live patient queue and mark completed video consultations.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={() => refetchAppointments()}
            >
              Refresh Queue
            </Button>
          </div>

          {isLoadingAppointments ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          ) : todayAppointments.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        {apt.booking_code}
                      </span>
                      <Badge
                        variant={apt.status === "COMPLETED" ? "success" : "teal"}
                        size="sm"
                      >
                        {apt.status}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                      <User size={14} className="text-teal-700" />
                      {apt.patient.full_name} ({apt.patient.phone})
                    </h4>

                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} className="text-teal-700" />
                      {new Date(apt.start_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(apt.end_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>

                    {apt.symptoms && (
                      <p className="text-xs text-slate-600 italic mt-0.5">
                        Symptoms: {apt.symptoms}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Video}
                      onClick={() => window.open("/consultations", "_self")}
                    >
                      Start Call
                    </Button>
                    {apt.status !== "COMPLETED" && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={CheckCircle2}
                        isLoading={completeMutation.isPending}
                        onClick={() => completeMutation.mutate(apt.id)}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Calendar size={28} className="mx-auto text-slate-400" />
              <h5 className="text-xs font-bold text-slate-700">No Consultations Scheduled for Today</h5>
              <p className="text-[11px] text-slate-500">
                Any upcoming appointments booked by patients for today will appear in this live queue.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
