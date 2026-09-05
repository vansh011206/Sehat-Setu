import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  IndianRupee,
  Lock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sunrise,
  Sun,
  Sunset,
  ChevronRight,
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Avatar } from "../../components/ui/Avatar";
import { useToast } from "../../components/ui/Toast";
import { useAuthStore } from "../../stores/authStore";
import { doctorsApi } from "../doctors/api";
import { bookingsApi } from "./api";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  doctor: {
    id: number;
    name: string;
    specialty: string | { name: string };
    qualification?: string;
    city?: string;
    fee: number | string;
    rating?: number;
    experience?: number;
  };
}

function formatSlotTime(timeStr: string): string {
  try {
    const d = new Date(timeStr);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return timeStr;
  }
}

function formatDateDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

export function BookingModal({ open, onClose, doctor }: BookingModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const { addToast } = useToast();

  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<{
    start_time: string;
    end_time: string;
  } | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBookingCode, setConfirmedBookingCode] = useState<string | null>(null);

  // Fetch 7-day doctor availability
  const {
    data: availability,
    isLoading: isLoadingAvailability,
    refetch: refetchAvailability,
  } = useQuery({
    queryKey: ["doctor-availability", doctor.id],
    queryFn: () => doctorsApi.getAvailability(doctor.id),
    enabled: open,
    staleTime: 30000,
  });

  // Mutation to book appointment
  const bookMutation = useMutation({
    mutationFn: bookingsApi.bookAppointment,
    onSuccess: (data) => {
      setConfirmedBookingCode(data.booking_code);
      queryClient.invalidateQueries({ queryKey: ["doctor-availability", doctor.id] });
      queryClient.invalidateQueries({ queryKey: ["appointments", user?.id] });
      addToast({
        type: "success",
        title: "Appointment Booked!",
        message: `Booking ref ${data.booking_code} confirmed with Dr. ${doctor.name}.`,
      });
    },
    onError: (err: any) => {
      const responseData = err?.response?.data;
      if (err?.response?.status === 409 || responseData?.code === "SLOT_TAKEN") {
        setBookingError("This slot was just taken by another patient. Please choose a different slot.");
        refetchAvailability();
        setSelectedSlot(null);
      } else if (responseData?.detail) {
        setBookingError(responseData.detail);
      } else {
        setBookingError("Failed to book appointment. Please try again.");
      }
    },
  });

  // Active day slots
  const activeDay =
    availability && availability[selectedDateIndex]
      ? availability[selectedDateIndex]
      : null;

  // Group slots into Morning, Afternoon, Evening
  const { morningSlots, afternoonSlots, eveningSlots } = useMemo(() => {
    if (!activeDay?.slots) {
      return { morningSlots: [], afternoonSlots: [], eveningSlots: [] };
    }

    const m: typeof activeDay.slots = [];
    const a: typeof activeDay.slots = [];
    const e: typeof activeDay.slots = [];

    activeDay.slots.forEach((slot) => {
      const d = new Date(slot.start_time);
      const hour = d.getHours();
      if (hour < 12) {
        m.push(slot);
      } else if (hour < 16) {
        a.push(slot);
      } else {
        e.push(slot);
      }
    });

    return { morningSlots: m, afternoonSlots: a, eveningSlots: e };
  }, [activeDay]);

  const handleConfirmBooking = () => {
    if (!isAuthenticated) {
      addToast({
        type: "warning",
        title: "Authentication Required",
        message: "Please sign in to confirm your appointment.",
      });
      navigate("/login");
      return;
    }

    if (!selectedSlot) return;

    setBookingError(null);
    bookMutation.mutate({
      doctor_id: doctor.id,
      start_time: selectedSlot.start_time,
      symptoms: symptoms.trim(),
    });
  };

  const resetAndClose = () => {
    setSelectedDateIndex(0);
    setSelectedSlot(null);
    setSymptoms("");
    setBookingError(null);
    setConfirmedBookingCode(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={confirmedBookingCode ? "Appointment Confirmed" : "Book Doctor Consultation"}
      size="lg"
    >
      <div className="space-y-5">
        {/* ─── DOCTOR SUMMARY BANNER ─── */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-50/80 to-slate-50 border border-teal-100 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={doctor.name} size="md" className="shrink-0 ring-2 ring-teal-600/20" />
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-slate-900 truncate font-heading">
                Dr. {doctor.name}
              </h4>
              <p className="text-xs text-teal-800 font-medium truncate">
                {typeof doctor.specialty === "string" ? doctor.specialty : doctor.specialty?.name}
                {doctor.city && ` • ${doctor.city}`}
                {doctor.experience ? ` • ${doctor.experience}+ yrs exp` : ""}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Consult Fee
            </span>
            <span className="text-base sm:text-lg font-black text-teal-900 flex items-center justify-end font-heading">
              <IndianRupee size={15} />
              {doctor.fee}
            </span>
          </div>
        </div>

        {/* ─── ERROR BANNER ─── */}
        {bookingError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <span>{bookingError}</span>
          </div>
        )}

        {/* ─── CONFIRMATION VIEW (SUCCESS) ─── */}
        {confirmedBookingCode ? (
          <div className="text-center py-5 space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} className="text-emerald-700" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold font-heading text-slate-900">
                Appointment Scheduled!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your consultation has been confirmed with Dr. {doctor.name}.
              </p>
            </div>

            {/* Booking Code Card */}
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 inline-block max-w-xs mx-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">
                Booking Reference Code
              </span>
              <span className="text-2xl font-extrabold font-heading text-teal-900 tracking-wider">
                {confirmedBookingCode}
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                size="md"
                icon={Calendar}
                onClick={() => {
                  const text = `Consultation with Dr. ${doctor.name} - Ref: ${confirmedBookingCode}`;
                  window.open(
                    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                      text
                    )}`,
                    "_blank"
                  );
                }}
              >
                Add to Calendar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  resetAndClose();
                  navigate("/appointments");
                }}
              >
                View My Appointments
              </Button>
            </div>
          </div>
        ) : (
          /* ─── SCHEDULE & SLOT SELECTION VIEW ─── */
          <div className="space-y-4">
            {/* Header with 7-Day Badge */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar size={13} className="text-teal-700" />
                Select Consultation Date (Next 7 Days)
              </label>
              <span className="text-[11px] text-teal-800 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                7 Days Available
              </span>
            </div>

            {/* 7-Day Pill Bar */}
            {isLoadingAvailability ? (
              <div className="flex overflow-x-auto pb-2 scrollbar-none snap-x gap-2 sm:grid sm:grid-cols-7">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 min-w-[64px] sm:min-w-0 rounded-2xl shrink-0" />
                ))}
              </div>
            ) : availability && availability.length > 0 ? (
              <div className="flex overflow-x-auto pb-2 scrollbar-none snap-x gap-2 sm:grid sm:grid-cols-7">
                {availability.slice(0, 7).map((day, idx) => {
                  const isSelected = selectedDateIndex === idx;
                  const dateObj = new Date(day.date);
                  const isToday = idx === 0;
                  const isTomorrow = idx === 1;
                  const availableCount = day.slots.filter(
                    (s) => !s.booked && !s.is_past
                  ).length;

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        setSelectedDateIndex(idx);
                        setSelectedSlot(null);
                        setBookingError(null);
                      }}
                      className={`snap-start shrink-0 min-w-[64px] sm:min-w-0 p-2 sm:p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-1 group cursor-pointer ${
                        isSelected
                          ? "bg-teal-800 text-white border-teal-800 shadow-md scale-102"
                          : "bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:shadow-2xs"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          isSelected ? "text-teal-200" : "text-slate-400"
                        }`}
                      >
                        {isToday ? "Today" : isTomorrow ? "Tom" : day.day_name.slice(0, 3)}
                      </span>
                      <span className="text-base sm:text-lg font-black font-heading leading-tight">
                        {dateObj.getDate()}
                      </span>
                      <span
                        className={`text-[9px] font-semibold px-1 py-0.2 rounded-md truncate max-w-full ${
                          isSelected
                            ? "bg-teal-700 text-teal-100"
                            : availableCount > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {availableCount > 0 ? `${availableCount} open` : "None"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl">
                No schedule rules configured for this doctor yet.
              </div>
            )}

            {/* Slots Categorized by Morning / Afternoon / Evening */}
            {activeDay && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock size={13} className="text-teal-700" />
                    Available Slots for {formatDateDisplay(activeDay.date)} ({activeDay.day_name})
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {activeDay.slots.filter((s) => !s.booked && !s.is_past).length} slots available
                  </span>
                </div>

                {activeDay.slots.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs space-y-1">
                    <Clock size={20} className="mx-auto text-slate-400" />
                    <p className="font-semibold text-slate-700">No Consultation Slots on this day</p>
                    <p className="text-[11px] text-slate-400">
                      The doctor is not available on this date. Please select another day above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {/* 1. Morning Slots */}
                    {morningSlots.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider">
                          <Sunrise size={13} className="text-amber-500" /> Morning (Before 12 PM)
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {morningSlots.map((slot, i) => renderSlotButton(slot, i))}
                        </div>
                      </div>
                    )}

                    {/* 2. Afternoon Slots */}
                    {afternoonSlots.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider">
                          <Sun size={13} className="text-orange-500" /> Afternoon (12 PM - 4 PM)
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {afternoonSlots.map((slot, i) => renderSlotButton(slot, i))}
                        </div>
                      </div>
                    )}

                    {/* 3. Evening Slots */}
                    {eveningSlots.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider">
                          <Sunset size={13} className="text-indigo-500" /> Evening (After 4 PM)
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {eveningSlots.map((slot, i) => renderSlotButton(slot, i))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── SELECTED SLOT & CONFIRMATION BOX ─── */}
            {selectedSlot && activeDay && (
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-800 block">
                      Selected Appointment Time
                    </span>
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 text-sm">
                      <Calendar size={14} className="text-teal-700" />
                      {formatDateDisplay(activeDay.date)} • {formatSlotTime(selectedSlot.start_time)} - {formatSlotTime(selectedSlot.end_time)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-teal-800 block">
                      Amount Due
                    </span>
                    <span className="font-black text-teal-900 text-sm flex items-center justify-end">
                      <IndianRupee size={13} /> {doctor.fee}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Reason for Consultation / Symptoms (Optional)
                  </label>
                  <input
                    type="text"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="e.g. Mild chest pain, routine review, follow-up..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-teal-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-1 text-[11px] text-teal-800 font-medium">
                    <ShieldCheck size={14} className="text-teal-700 shrink-0" />
                    <span>Instant digital booking reference</span>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto min-h-[44px]"
                    iconRight={ChevronRight}
                    isLoading={bookMutation.isPending}
                    onClick={handleConfirmBooking}
                  >
                    Confirm Booking
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );

  function renderSlotButton(slot: { start_time: string; end_time: string; booked: boolean; is_past: boolean }, index: number) {
    const isBooked = slot.booked;
    const isPast = slot.is_past;
    const isUnavailable = isBooked || isPast;
    const isSelected = selectedSlot?.start_time === slot.start_time;

    return (
      <button
        key={index}
        type="button"
        disabled={isUnavailable}
        onClick={() => {
          setSelectedSlot(slot);
          setBookingError(null);
        }}
        className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
          isSelected
            ? "bg-teal-800 text-white border-teal-800 shadow-sm scale-102"
            : isUnavailable
            ? "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed line-through opacity-60"
            : "bg-white border-slate-200 text-slate-800 hover:border-teal-500 hover:bg-teal-50/50 cursor-pointer shadow-2xs"
        }`}
      >
        <span className="flex items-center gap-1">
          <Clock
            size={12}
            className={
              isSelected
                ? "text-teal-200"
                : isUnavailable
                ? "text-slate-300"
                : "text-teal-700"
            }
          />
          {formatSlotTime(slot.start_time)}
        </span>
        {isBooked ? (
          <span className="text-[9px] uppercase font-bold text-slate-400 not-italic flex items-center gap-0.5">
            <Lock size={9} /> Taken
          </span>
        ) : isPast ? (
          <span className="text-[9px] text-slate-400 not-italic">Past</span>
        ) : (
          <span
            className={`text-[9px] font-bold ${
              isSelected ? "text-teal-100" : "text-emerald-600"
            }`}
          >
            Open
          </span>
        )}
      </button>
    );
  }
}
