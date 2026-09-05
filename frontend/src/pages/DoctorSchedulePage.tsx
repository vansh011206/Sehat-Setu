import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Save,
  Sparkles,
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

  const doctorId = user?.doctor_profile?.id || user?.id || 1;

  const [rules, setRules] = useState<AvailabilityRule[]>([
    { weekday: 1, start_time: "09:00", end_time: "17:00", slot_duration: 30, is_active: true },
    { weekday: 2, start_time: "09:00", end_time: "17:00", slot_duration: 30, is_active: true },
    { weekday: 3, start_time: "09:00", end_time: "17:00", slot_duration: 30, is_active: true },
    { weekday: 4, start_time: "09:00", end_time: "17:00", slot_duration: 30, is_active: true },
    { weekday: 5, start_time: "09:00", end_time: "17:00", slot_duration: 30, is_active: true },
    { weekday: 6, start_time: "09:00", end_time: "14:00", slot_duration: 30, is_active: true },
    { weekday: 7, start_time: "09:00", end_time: "13:00", slot_duration: 30, is_active: false },
  ]);

  // Load existing availability rules if already saved
  const { data: savedRulesData } = useQuery({
    queryKey: ["doctor-rules", doctorId],
    queryFn: () => (doctorId ? doctorsApi.getAvailabilityRules(doctorId) : Promise.resolve([])),
    enabled: !!doctorId,
  });

  useEffect(() => {
    if (savedRulesData && savedRulesData.length > 0) {
      setRules((prev) =>
        prev.map((defaultRule) => {
          const matched = savedRulesData.find((r) => r.weekday === defaultRule.weekday);
          if (!matched) return defaultRule;
          return {
            ...defaultRule,
            start_time: typeof matched.start_time === "string" ? matched.start_time.slice(0, 5) : defaultRule.start_time,
            end_time: typeof matched.end_time === "string" ? matched.end_time.slice(0, 5) : defaultRule.end_time,
            slot_duration: matched.slot_duration || defaultRule.slot_duration,
            is_active: typeof matched.is_active === "boolean" ? matched.is_active : defaultRule.is_active,
          };
        })
      );
    }
  }, [savedRulesData]);

  // Fetch today's appointments for this doctor
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: appointmentsData, isLoading: isLoadingAppointments, refetch: refetchAppointments } = useQuery({
    queryKey: ["doctor-today-appointments", doctorId, todayStr],
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
      queryClient.invalidateQueries({ queryKey: ["doctor-rules", doctorId] });
      queryClient.invalidateQueries({ queryKey: ["doctor-availability", doctorId] });
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      let errorMsg = "Could not update availability rules.";
      if (typeof data === "string") {
        errorMsg = data;
      } else if (data?.detail) {
        errorMsg = data.detail;
      } else if (Array.isArray(data)) {
        const found = data.find((item) => item && typeof item === "object" && Object.keys(item).length > 0);
        if (found) {
          const firstKey = Object.keys(found)[0];
          const val = found[firstKey];
          errorMsg = Array.isArray(val) ? val[0] : String(val);
        }
      } else if (typeof data === "object" && data !== null) {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        errorMsg = Array.isArray(val) ? val[0] : String(val);
      }
      addToast({
        type: "error",
        title: "Update Failed",
        message: errorMsg,
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
        message: "Appointment marked as completed.",
      });
      queryClient.invalidateQueries({ queryKey: ["doctor-today-appointments", doctorId, todayStr] });
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
    const payload = rules.map((r) => ({
      weekday: r.weekday,
      start_time: r.start_time.length === 5 ? `${r.start_time}:00` : r.start_time,
      end_time: r.end_time.length === 5 ? `${r.end_time}:00` : r.end_time,
      slot_duration: r.slot_duration,
      is_active: r.is_active,
    }));
    saveRulesMutation.mutate(payload);
  };

  const todayAppointments = appointmentsData?.results || [];

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-8 max-w-5xl mx-auto pb-12">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-heading text-slate-900">
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
            className="w-full sm:w-auto min-h-[44px] font-bold"
          >
            Save Weekly Schedule
          </Button>
        </div>

        {/* ─── 1. Weekly Availability Rules Matrix ─── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm sm:text-base font-bold font-heading text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-teal-700" /> Recurring Weekly Working Hours
            </h3>
            <span className="text-[11px] sm:text-xs text-teal-800 font-semibold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              Slots generate automatically for 7 days
            </span>
          </div>

          {/* Quick Presets Bar - Horizontal scrollable on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0">
              <Sparkles size={13} className="text-teal-700" /> Presets:
            </span>
            <button
              type="button"
              onClick={() => {
                setRules((prev) =>
                  prev.map((r) => ({
                    ...r,
                    start_time: "09:00",
                    end_time: "17:00",
                    slot_duration: 30,
                    is_active: r.weekday <= 5,
                  }))
                );
                addToast({ type: "info", title: "Preset Applied", message: "Mon-Fri 9:00 AM - 5:00 PM (30 min slots)" });
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 text-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0 min-h-[36px]"
            >
              Mon - Fri (9 AM - 5 PM)
            </button>
            <button
              type="button"
              onClick={() => {
                setRules((prev) =>
                  prev.map((r) => ({
                    ...r,
                    start_time: "10:00",
                    end_time: "18:00",
                    slot_duration: 15,
                    is_active: r.weekday <= 6,
                  }))
                );
                addToast({ type: "info", title: "Preset Applied", message: "Mon-Sat 10:00 AM - 6:00 PM (15 min slots)" });
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 text-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0 min-h-[36px]"
            >
              Mon - Sat (10 AM - 6 PM)
            </button>
            <button
              type="button"
              onClick={() => {
                setRules((prev) =>
                  prev.map((r) => ({
                    ...r,
                    start_time: "09:00",
                    end_time: "14:00",
                    slot_duration: 30,
                    is_active: true,
                  }))
                );
                addToast({ type: "info", title: "Preset Applied", message: "All 7 Days (Morning 9 AM - 2 PM)" });
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 text-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0 min-h-[36px]"
            >
              7 Days (Morning 9 AM - 2 PM)
            </button>
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
                  className={`pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl transition-all ${
                    rule.is_active ? "bg-teal-50/40 border border-teal-100" : "bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-h-[36px]">
                    <input
                      type="checkbox"
                      id={`day-${day.id}`}
                      checked={rule.is_active}
                      onChange={(e) =>
                        handleRuleChange(day.id, "is_active", e.target.checked)
                      }
                      className="w-5 h-5 text-teal-800 rounded border-slate-300 focus:ring-teal-700 cursor-pointer shrink-0"
                    />
                    <label
                      htmlFor={`day-${day.id}`}
                      className={`text-xs sm:text-sm font-bold cursor-pointer select-none ${
                        rule.is_active ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {day.name}
                    </label>
                  </div>

                  {rule.is_active ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-wrap">
                      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-400 font-medium">From:</span>
                          <input
                            type="time"
                            value={rule.start_time.slice(0, 5)}
                            onChange={(e) =>
                              handleRuleChange(day.id, "start_time", e.target.value)
                            }
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-1 focus:ring-teal-700 min-h-[40px] w-full sm:w-auto"
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
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-1 focus:ring-teal-700 min-h-[40px] w-full sm:w-auto"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs pt-1 sm:pt-0">
                        <span className="text-slate-400 font-medium">Slot:</span>
                        <div className="flex items-center gap-1">
                          {[15, 30, 45, 60].map((dur) => (
                            <button
                              key={dur}
                              type="button"
                              onClick={() => handleRuleChange(day.id, "slot_duration", dur)}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer min-h-[36px] ${
                                rule.slot_duration === dur
                                  ? "bg-teal-800 text-white border-teal-800"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-teal-400"
                              }`}
                            >
                              {dur}m
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-400 italic">
                      Clinic Closed / No Appointments
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="md"
              icon={Save}
              isLoading={saveRulesMutation.isPending}
              onClick={handleSaveSchedule}
              className="w-full sm:w-auto min-h-[44px] font-bold"
            >
              Save Weekly Schedule
            </Button>
          </div>
        </div>

        {/* ─── 2. Today's Patient Appointments Queue ─── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold font-heading text-slate-900 flex items-center gap-2">
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
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
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

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Video}
                      onClick={() => window.open("/consultations", "_self")}
                      className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
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
                        className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
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
