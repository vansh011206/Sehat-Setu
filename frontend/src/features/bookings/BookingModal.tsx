import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  IndianRupee,
  Lock,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import type { DoctorDetail, DoctorListItem } from "../doctors/api";
import { doctorsApi } from "../doctors/api";
import { bookingsApi } from "./api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../components/ui/Toast";

interface BookingModalProps {
  doctor: DoctorListItem | DoctorDetail;
  open: boolean;
  onClose: () => void;
}

export function BookingModal({ doctor, open, onClose }: BookingModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<{
    start_time: string;
    end_time: string;
  } | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBookingCode, setConfirmedBookingCode] = useState<string | null>(null);

  // Fetch 14-day doctor availability
  const { data: availability, isLoading: isLoadingAvailability, refetch: refetchAvailability } = useQuery({
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
      setStep(4); // Success step
      queryClient.invalidateQueries({ queryKey: ["doctor-availability", doctor.id] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      addToast({
        type: "success",
        title: "Appointment Booked!",
        message: `Booking ref ${data.booking_code} confirmed with Dr. ${doctor.name}.`,
      });
    },
    onError: (err: any) => {
      const responseData = err?.response?.data;
      if (err?.response?.status === 409 || responseData?.code === "SLOT_TAKEN") {
        setBookingError("This slot was just taken by another patient. Please select a different time.");
        refetchAvailability();
        setStep(2);
      } else if (responseData?.detail) {
        setBookingError(responseData.detail);
      } else {
        setBookingError("Failed to book appointment. Please try again.");
      }
    },
  });

  const activeDay = availability && availability[selectedDateIndex] ? availability[selectedDateIndex] : null;

  const handleSlotSelect = (slot: { start_time: string; end_time: string }) => {
    setSelectedSlot(slot);
    setBookingError(null);
    setStep(3);
  };

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

  const formatSlotTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const resetAndClose = () => {
    setStep(1);
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
      title={step === 4 ? "Appointment Confirmed" : `Book with Dr. ${doctor.name}`}
    >
      <div className="space-y-6">
        {/* Doctor Banner */}
        {step !== 4 && (
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-teal-50/80 border border-teal-100">
            <div className="w-12 h-12 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              {doctor.name.replace("Dr. ", "").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 truncate">Dr. {doctor.name}</h4>
                <Badge variant="teal" size="sm">
                  {doctor.specialty?.name || "Specialist"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-teal-700" />
                  {doctor.city}
                </span>
                <span>•</span>
                <span className="font-semibold text-slate-700 flex items-center">
                  <IndianRupee size={12} />
                  {doctor.fee}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        {step !== 4 && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: "Select Date" },
              { num: 2, label: "Select Time" },
              { num: 3, label: "Confirm Booking" },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => s.num < step && setStep(s.num as any)}
                disabled={s.num > step}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center transition-all border ${
                  step === s.num
                    ? "bg-teal-800 text-white border-teal-800 shadow-xs"
                    : step > s.num
                    ? "bg-teal-50 text-teal-800 border-teal-200 cursor-pointer"
                    : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                }`}
              >
                Step {s.num}: {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Error Alert */}
        {bookingError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <span>{bookingError}</span>
          </div>
        )}

        {/* ─── STEP 1: Date Strip ─── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Choose Consultation Date (Next 14 Days)
              </label>
              <span className="text-xs text-teal-800 font-semibold flex items-center gap-1">
                <Calendar size={13} /> 14 Days Available
              </span>
            </div>

            {isLoadingAvailability ? (
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : availability && availability.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {availability.map((day, idx) => {
                  const isSelected = selectedDateIndex === idx;
                  const dateObj = new Date(day.date);
                  const isToday = idx === 0;
                  const isTomorrow = idx === 1;
                  const availableSlotCount = day.slots.filter((s) => !s.booked && !s.is_past).length;

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        setSelectedDateIndex(idx);
                        setSelectedSlot(null);
                        setStep(2);
                      }}
                      className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-1 group ${
                        isSelected
                          ? "bg-teal-800 text-white border-teal-800 shadow-md scale-102"
                          : "bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:shadow-xs"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          isSelected ? "text-teal-200" : "text-slate-400"
                        }`}
                      >
                        {isToday ? "Today" : isTomorrow ? "Tom" : day.day_name.slice(0, 3)}
                      </span>
                      <span className="text-lg font-extrabold font-heading">
                        {dateObj.getDate()}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? "bg-teal-700 text-teal-100"
                            : availableSlotCount > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {availableSlotCount > 0 ? `${availableSlotCount} slots` : "No slots"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl">
                No availability configured for this doctor.
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="md"
                iconRight={ArrowRight}
                onClick={() => setStep(2)}
                disabled={!activeDay}
              >
                Next: Select Time Slot
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Time Slots Grid ─── */}
        {step === 2 && activeDay && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Time Slot
                </label>
                <p className="text-xs font-bold text-slate-800">
                  {formatDateDisplay(activeDay.date)} ({activeDay.day_name})
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
                onClick={() => setStep(1)}
              >
                Change Date
              </Button>
            </div>

            {/* Slots Chips */}
            {activeDay.slots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1">
                {activeDay.slots.map((slot, index) => {
                  const isBooked = slot.booked;
                  const isPast = slot.is_past;
                  const isUnavailable = isBooked || isPast;
                  const isSelected =
                    selectedSlot?.start_time === slot.start_time;

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => handleSlotSelect(slot)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                          : isUnavailable
                          ? "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed line-through opacity-70"
                          : "bg-white border-slate-200 text-slate-800 hover:border-teal-500 hover:bg-teal-50/50 cursor-pointer"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className={isSelected ? "text-teal-200" : isUnavailable ? "text-slate-300" : "text-teal-700"} />
                        {formatSlotTime(slot.start_time)}
                      </span>
                      {isBooked ? (
                        <span className="text-[10px] uppercase font-bold text-slate-400 not-italic flex items-center gap-0.5">
                          <Lock size={10} /> Taken
                        </span>
                      ) : isPast ? (
                        <span className="text-[10px] text-slate-400 not-italic">Past</span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold">Free</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Clock size={28} className="mx-auto text-slate-400" />
                <h5 className="text-xs font-bold text-slate-700">No Slots Available Today</h5>
                <p className="text-[11px] text-slate-500">
                  Dr. {doctor.name} has no consultation slots for this date. Please pick another date.
                </p>
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  Pick Another Date
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: Confirm & Summary ─── */}
        {step === 3 && activeDay && selectedSlot && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Confirm Booking Summary
              </label>
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
                onClick={() => setStep(2)}
              >
                Change Time
              </Button>
            </div>

            {/* Booking Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Calendar size={13} className="text-teal-700" />
                    {formatDateDisplay(activeDay.date)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Time Slot</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Clock size={13} className="text-teal-700" />
                    {formatSlotTime(selectedSlot.start_time)} - {formatSlotTime(selectedSlot.end_time)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Doctor</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Stethoscope size={13} className="text-teal-700" />
                    Dr. {doctor.name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Consultation Fee</span>
                  <span className="font-extrabold text-teal-900 flex items-center gap-0.5 text-sm mt-0.5">
                    <IndianRupee size={14} />
                    {doctor.fee}
                  </span>
                </div>
              </div>

              {/* Symptoms input */}
              <div className="pt-2 border-t border-slate-200">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Reason for Visit / Symptoms (Optional)
                </label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Mild chest pain after exercise, headache, regular prescription renewal..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-teal-800 font-medium">
                <ShieldCheck size={14} className="text-teal-700" />
                <span>Instant Confirmation with Verified Digital Booking Reference</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={CheckCircle2}
                isLoading={bookMutation.isPending}
                onClick={handleConfirmBooking}
              >
                Confirm Appointment
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Success Screen ─── */}
        {step === 4 && confirmedBookingCode && (
          <div className="text-center py-6 px-2 space-y-5">
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

            {/* Booking Code Banner */}
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
                  const text = `Telehealth Consultation with Dr. ${doctor.name} - Ref: ${confirmedBookingCode}`;
                  window.open(
                    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                      text
                    )}`,
                    "_blank"
                  );
                }}
              >
                Add to Google Calendar
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
        )}
      </div>
    </Modal>
  );
}
