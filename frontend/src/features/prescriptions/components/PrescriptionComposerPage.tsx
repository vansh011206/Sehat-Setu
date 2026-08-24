import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Breadcrumbs } from "../../../components/ui/Breadcrumbs";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useAuthStore } from "../../../stores/authStore";
import { bookingsApi } from "../../bookings/api";
import {
  prescriptionsApi,
  type MedicineItem,
  type PrescriptionDetail,
} from "../api";

const FREQUENCY_OPTIONS = [
  "1-0-1 (Morning & Night)",
  "1-0-0 (Morning only)",
  "0-1-0 (Afternoon only)",
  "0-0-1 (Night only)",
  "1-1-1 (Thrice daily)",
  "1-1-1-1 (4 times daily)",
  "SOS (As needed for pain/fever)",
  "Once a week",
];

const FOLLOW_UP_OPTIONS = [
  { label: "No follow-up required", value: null },
  { label: "3 Days", value: 3 },
  { label: "5 Days", value: 5 },
  { label: "7 Days (1 Week)", value: 7 },
  { label: "10 Days", value: 10 },
  { label: "14 Days (2 Weeks)", value: 14 },
  { label: "1 Month (30 Days)", value: 30 },
];

export function PrescriptionComposerPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const idNum = Number(appointmentId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUpDays, setFollowUpDays] = useState<number | null>(7);
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    {
      name: "Amoxicillin and Clavulanate 625mg",
      dosage: "1 Tablet",
      frequency: "1-0-1 (After Food)",
      duration: "5 Days",
      instructions: "Take with water after meals. Complete full course.",
    },
    {
      name: "Paracetamol 650mg",
      dosage: "1 Tablet",
      frequency: "SOS (As needed for pain/fever)",
      duration: "3 Days",
      instructions: "Take only if body temperature exceeds 99.5 F.",
    },
  ]);

  const [createdPrescription, setCreatedPrescription] =
    useState<PrescriptionDetail | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // Fetch appointment details
  const {
    data: appointment,
    isLoading: apptLoading,
    error: apptError,
  } = useQuery({
    queryKey: ["appointment-detail", idNum],
    queryFn: () => bookingsApi.getAppointmentDetail(idNum),
    enabled: !isNaN(idNum),
  });

  // Handle adding a medicine row
  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: "",
        dosage: "1 Tablet",
        frequency: "1-0-1 (After Food)",
        duration: "5 Days",
        instructions: "After meals with water",
      },
    ]);
  };

  // Handle removing a medicine row
  const handleRemoveMedicine = (index: number) => {
    if (medicines.length <= 1) {
      toast({
        title: "Minimum Requirement",
        description: "Prescription must contain at least one medication.",
        variant: "warning",
      });
      return;
    }
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle field change in a medicine row
  const handleMedicineChange = (
    index: number,
    field: keyof MedicineItem,
    value: string
  ) => {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Save Prescription Mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const cleanedMedicines = medicines
        .filter((m) => m.name.trim().length > 0)
        .map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim() || "1 Unit",
          frequency: m.frequency,
          duration: m.duration.trim() || "5 Days",
          instructions: m.instructions.trim(),
        }));

      if (cleanedMedicines.length === 0) {
        throw new Error("Please enter at least one valid medicine name.");
      }

      return prescriptionsApi.createAppointmentPrescription(idNum, {
        diagnosis: diagnosis.trim(),
        medicines: cleanedMedicines,
        advice: advice.trim(),
        follow_up_in_days: followUpDays,
      });
    },
    onSuccess: (data) => {
      setCreatedPrescription(data);
      setSuccessModalOpen(true);
      toast({
        title: "e-Prescription Generated",
        description: `Verified digital prescription ${data.verification_code} created successfully.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["appointment-detail", idNum] });
      queryClient.invalidateQueries({ queryKey: ["my-prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Generate",
        description:
          err?.response?.data?.detail ||
          err?.message ||
          "Please verify all prescription fields and try again.",
        variant: "danger",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      toast({
        title: "Diagnosis Required",
        description: "Please specify the clinical diagnosis before generating.",
        variant: "warning",
      });
      return;
    }
    saveMutation.mutate();
  };

  if (apptLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center space-y-4">
        <Skeleton className="w-64 h-8" />
        <Skeleton className="w-96 h-64" variant="rect" />
      </div>
    );
  }

  if (apptError || !appointment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-border max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold font-heading text-ink">
            Appointment Not Found
          </h2>
          <p className="text-xs text-muted">
            The consultation record could not be loaded or you do not have permission to issue prescriptions for it.
          </p>
          <Link to="/dashboard">
            <Button variant="primary" size="sm" icon={ArrowLeft}>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const doctorName = user?.full_name?.startsWith("Dr.")
    ? user.full_name
    : `Dr. ${user?.full_name || appointment.doctor.name}`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* ─── Top Header Bar ─── */}
      <header className="bg-white border-b border-border sticky top-0 z-20 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/consult/${idNum}`)}
              className="p-2 rounded-xl text-slate-500 hover:text-ink hover:bg-slate-100 transition-colors cursor-pointer"
              title="Return to Consult Room"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <Breadcrumbs
                items={[
                  { label: "Dashboard", to: "/dashboard" },
                  { label: `Consult #${appointment.id}`, to: `/consult/${idNum}` },
                  { label: "e-Prescription Composer" },
                ]}
              />
              <h1 className="text-base sm:text-lg font-bold font-heading text-ink flex items-center gap-2">
                <FileText size={18} className="text-teal-700" />
                Digital e-Prescription Composer
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/consult/${idNum}`)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={FileText}
              loading={saveMutation.isPending}
              onClick={handleSubmit}
              className="font-bold shadow-xs"
            >
              Generate e-Prescription
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Composer & Live Preview Split Grid ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ─── Left Side (55% / 7 cols): Structured Input Form ─── */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-xs"
          >
            {/* Patient & Consultation Summary Card */}
            <div className="bg-teal-50/70 border border-teal-100 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {appointment.patient.full_name.charAt(0)}
                </div>
                <div>
                  <span className="font-bold text-sm text-teal-950 block">
                    {appointment.patient.full_name}
                  </span>
                  <span className="text-teal-700 font-medium">
                    Phone: {appointment.patient.phone || "N/A"}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right font-medium text-teal-900 space-y-0.5">
                <div>
                  Ref: <span className="font-bold text-teal-950">{appointment.booking_code}</span>
                </div>
                <div className="text-[11px] text-teal-700">
                  {appointment.doctor.specialty?.name || "Specialist"} Consultation
                </div>
              </div>
            </div>

            {/* Diagnosis Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Clinical Diagnosis / Primary Assessment <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute Bronchitis with Mild Allergic Rhinitis, Stage-1 Hypertension"
                className="w-full bg-white border border-border text-ink text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent font-medium shadow-2xs"
              />
            </div>

            {/* Dynamic Medicines Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Prescribed Medications (Rx) <span className="text-rose-500">*</span>
                  </h3>
                  <p className="text-[11px] text-muted">
                    Add standard medicines, dosage frequency, and patient instructions
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={handleAddMedicine}
                  className="text-teal-700 border-teal-200 hover:bg-teal-50 text-xs font-bold"
                >
                  Add Medicine
                </Button>
              </div>

              <div className="space-y-3">
                {medicines.map((med, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative group transition-colors hover:border-teal-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-900 bg-teal-100/80 px-2.5 py-0.5 rounded-md">
                        #{index + 1} Medication
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(index)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove Medicine"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Medicine Name */}
                      <div className="sm:col-span-7 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Medicine Name & Strength
                        </label>
                        <input
                          type="text"
                          required
                          value={med.name}
                          onChange={(e) =>
                            handleMedicineChange(index, "name", e.target.value)
                          }
                          placeholder="e.g. Amoxicillin 625mg, Pantocid 40mg"
                          className="w-full bg-white border border-border text-ink text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                      </div>

                      {/* Dosage */}
                      <div className="sm:col-span-5 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Dosage / Form
                        </label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) =>
                            handleMedicineChange(index, "dosage", e.target.value)
                          }
                          placeholder="e.g. 1 Tablet, 5ml Syrup"
                          className="w-full bg-white border border-border text-ink text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                      </div>

                      {/* Frequency */}
                      <div className="sm:col-span-6 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Frequency
                        </label>
                        <select
                          value={med.frequency}
                          onChange={(e) =>
                            handleMedicineChange(index, "frequency", e.target.value)
                          }
                          className="w-full bg-white border border-border text-ink text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 cursor-pointer"
                        >
                          {FREQUENCY_OPTIONS.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Duration */}
                      <div className="sm:col-span-6 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) =>
                            handleMedicineChange(index, "duration", e.target.value)
                          }
                          placeholder="e.g. 5 Days, 10 Days, 1 Month"
                          className="w-full bg-white border border-border text-ink text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                      </div>

                      {/* Instructions */}
                      <div className="sm:col-span-12 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Special Instructions / Timing
                        </label>
                        <input
                          type="text"
                          value={med.instructions}
                          onChange={(e) =>
                            handleMedicineChange(
                              index,
                              "instructions",
                              e.target.value
                            )
                          }
                          placeholder="e.g. Take after food with warm water, avoid dairy"
                          className="w-full bg-white border border-border text-ink text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advice Textarea */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Physician's Advice & Lifestyle Guidance
              </label>
              <textarea
                rows={3}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="e.g. Drink plenty of warm fluids. Avoid cold drinks, direct AC exposure, and dust. Steam inhalation twice daily."
                className="w-full bg-white border border-border text-ink text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent font-medium shadow-2xs"
              />
            </div>

            {/* Follow-up Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Follow-up Consultation
              </label>
              <select
                value={followUpDays === null ? "null" : String(followUpDays)}
                onChange={(e) => {
                  const val = e.target.value;
                  setFollowUpDays(val === "null" ? null : Number(val));
                }}
                className="w-full bg-white border border-border text-ink text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer font-medium"
              >
                {FOLLOW_UP_OPTIONS.map((opt) => (
                  <option
                    key={String(opt.value)}
                    value={opt.value === null ? "null" : String(opt.value)}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit CTA */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={FileText}
                loading={saveMutation.isPending}
                className="font-bold shadow-sm"
              >
                Save & Generate e-Prescription
              </Button>
            </div>
          </form>

          {/* ─── Right Side (45% / 5 cols): Live PDF-like Clinical Preview ─── */}
          <div className="lg:col-span-5 sticky top-24 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText size={14} className="text-teal-700" />
                Live Document Preview
              </span>
              <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
                PDF Layout Ready
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-6 text-slate-900 space-y-4 text-xs">
              {/* Document Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-3 gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-teal-900 font-heading tracking-tight">
                    SEHATSETU
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight">
                    Digital Telehealth Network<br />
                    Govt. of India Telemedicine Compliant
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-bold text-xs text-slate-900 block">
                    {doctorName}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {appointment.doctor.specialty?.name || "Specialist"} • {appointment.doctor.qualification || "MBBS, MD"}
                  </span>
                  <span className="text-[10px] text-teal-800 font-semibold block">
                    Reg: {(appointment.doctor as any)?.registration_number || "REG-MCI-2026"}
                  </span>
                </div>
              </div>

              {/* Patient Meta Block */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-900">{appointment.patient.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-medium text-slate-800">
                    {new Date().toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking Ref:</span>
                  <span className="font-bold text-teal-800">{appointment.booking_code}</span>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="bg-teal-50/80 border border-teal-200 rounded-lg p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block mb-0.5">
                  Diagnosis
                </span>
                <p className="font-semibold text-teal-950 text-xs">
                  {diagnosis || "Clinical assessment in progress..."}
                </p>
              </div>

              {/* Rx Table */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900 block">
                  Rx — Prescribed Medicines ({medicines.filter((m) => m.name.trim()).length})
                </span>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-teal-800 text-white font-bold">
                      <tr>
                        <th className="p-1.5">#</th>
                        <th className="p-1.5">Medicine</th>
                        <th className="p-1.5">Freq</th>
                        <th className="p-1.5">Dur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {medicines
                        .filter((m) => m.name.trim().length > 0)
                        .map((m, idx) => (
                          <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                            <td className="p-1.5 font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-1.5">
                              <span className="font-bold text-slate-900 block">{m.name}</span>
                              <span className="text-[9px] text-slate-500">{m.dosage} • {m.instructions}</span>
                            </td>
                            <td className="p-1.5 font-medium text-slate-700">{m.frequency}</td>
                            <td className="p-1.5 font-medium text-slate-700">{m.duration}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Advice */}
              {advice && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">
                    Advice & Precautions
                  </span>
                  <p className="text-slate-800 leading-relaxed">{advice}</p>
                </div>
              )}

              {/* Follow up */}
              {followUpDays && (
                <p className="text-[11px] text-slate-600 font-medium">
                  Follow up in <strong>{followUpDays} days</strong> or SOS.
                </p>
              )}

              {/* Digital Signature */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <div>
                  <span className="font-bold text-slate-800 block">Verification Code</span>
                  <span className="font-mono text-teal-700">SHTS-XXXXXXX</span>
                </div>
                <div className="text-right">
                  <span className="italic text-teal-900 font-serif text-xs block">
                    {doctorName}
                  </span>
                  <span>Digitally Signed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Success Modal with PDF Viewer & Download ─── */}
      <Modal
        open={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="e-Prescription Generated Successfully"
        size="lg"
      >
        {createdPrescription && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-emerald-950 block text-sm">
                  Verified Digital Prescription Created
                </span>
                <span className="text-emerald-700 font-medium">
                  Verification Code: <strong className="font-mono">{createdPrescription.verification_code}</strong>
                </span>
              </div>
            </div>

            {/* Embedded PDF Viewer if available */}
            {createdPrescription.pdf_url && (
              <div className="border border-slate-200 rounded-xl overflow-hidden h-96 bg-slate-100 shadow-inner">
                <iframe
                  src={createdPrescription.pdf_url}
                  className="w-full h-full border-0"
                  title="Generated e-Prescription PDF"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
              <Link
                to={`/verify/${createdPrescription.verification_code}`}
                target="_blank"
                className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1.5"
              >
                <ShieldCheck size={14} />
                Public Verification Link <ExternalLink size={12} />
              </Link>

              <div className="flex items-center gap-2">
                {createdPrescription.pdf_url && (
                  <a
                    href={createdPrescription.pdf_url}
                    download={`Prescription_${createdPrescription.verification_code}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="secondary" size="sm" icon={Download}>
                      Download PDF
                    </Button>
                  </a>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate("/dashboard")}
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
