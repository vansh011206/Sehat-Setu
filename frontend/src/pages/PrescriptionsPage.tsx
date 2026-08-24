import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { AppLayout } from "../layouts/AppLayout";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuthStore } from "../stores/authStore";
import { prescriptionsApi, type PrescriptionDetail } from "../features/prescriptions/api";

function formatIndianDate(dateString: string | Date): string {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PrescriptionsPage() {
  const { user } = useAuthStore();
  const isDoctor = user?.role === "DOCTOR";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrescription, setSelectedPrescription] =
    useState<PrescriptionDetail | null>(null);

  // Fetch prescriptions list from API
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["prescriptions-list", isDoctor ? "doctor" : "patient"],
    queryFn: () =>
      isDoctor
        ? prescriptionsApi.getDoctorPrescriptions()
        : prescriptionsApi.getMyPrescriptions(),
  });

  const prescriptions = data?.results || [];

  // Filter prescriptions based on search query
  const filteredPrescriptions = prescriptions.filter((p) => {
    const q = searchQuery.toLowerCase();
    const docName = p.doctor?.name?.toLowerCase() || "";
    const patName = p.patient?.full_name?.toLowerCase() || "";
    const diag = p.diagnosis?.toLowerCase() || "";
    const vCode = p.verification_code?.toLowerCase() || "";
    const bCode = p.booking_code?.toLowerCase() || "";
    return (
      docName.includes(q) ||
      patName.includes(q) ||
      diag.includes(q) ||
      vCode.includes(q) ||
      bCode.includes(q)
    );
  });

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
        {/* ─── Breadcrumbs & Header ─── */}
        <div>
          <Breadcrumbs
            items={[
              { label: "Dashboard", to: "/dashboard" },
              { label: "Digital e-Prescriptions" },
            ]}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div>
              <h1 className="text-2xl font-bold font-heading text-ink flex items-center gap-2">
                <FileText size={24} className="text-teal-700" />
                {isDoctor ? "Issued Digital Prescriptions" : "My e-Prescriptions"}
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-0.5">
                {isDoctor
                  ? "Manage and track tamper-evident digital prescriptions issued to your patients"
                  : "Access and download verified digital prescriptions issued by your doctors"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                loading={isRefetching}
                onClick={() => refetch()}
                className="text-xs"
              >
                Refresh
              </Button>
              <Link to="/verify">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ShieldCheck}
                  className="text-xs font-bold"
                >
                  Verify Prescription
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Search & Filters Bar ─── */}
        <div className="bg-white p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="relative w-full sm:w-96">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by diagnosis, doctor, patient, code..."
              className="w-full bg-slate-50 border border-border text-ink text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="text-xs text-muted font-medium shrink-0">
            Showing <strong>{filteredPrescriptions.length}</strong> prescriptions
          </div>
        </div>

        {/* ─── Prescriptions Cards Grid ─── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" variant="rect" />
            ))}
          </div>
        ) : filteredPrescriptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPrescriptions.map((p) => {
              const medCount = p.medicines?.length || 0;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-border p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Date & Code Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                        <Calendar size={13} className="text-teal-700" />
                        {formatIndianDate(p.created_at)}
                      </span>
                      <span className="text-[11px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md">
                        {p.verification_code}
                      </span>
                    </div>

                    {/* Doctor / Patient Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 border border-teal-100 flex items-center justify-center font-bold text-sm shrink-0">
                        {isDoctor
                          ? p.patient?.full_name?.charAt(0) || "P"
                          : p.doctor?.name?.charAt(0) || "D"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-ink truncate">
                          {isDoctor
                            ? p.patient?.full_name
                            : `Dr. ${p.doctor?.name}`}
                        </h3>
                        <p className="text-xs text-muted truncate">
                          {isDoctor
                            ? `Phone: ${p.patient?.phone || "N/A"}`
                            : `${p.doctor?.specialty?.name || "Specialist"} • ${p.doctor?.city || "New Delhi"}`}
                        </p>
                      </div>
                    </div>

                    {/* Diagnosis Box */}
                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                        Diagnosis
                      </span>
                      <p className="font-semibold text-slate-900 line-clamp-1">
                        {p.diagnosis}
                      </p>
                    </div>

                    {/* Medicines snippet */}
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="flex items-center gap-1 font-medium text-teal-900">
                        <Stethoscope size={13} className="text-teal-700" />
                        {medCount} {medCount === 1 ? "Medicine" : "Medicines"} Prescribed
                      </span>
                      {p.follow_up_in_days && (
                        <span className="text-[11px] text-slate-500">
                          Follow-up: {p.follow_up_in_days}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={FileText}
                      onClick={() => setSelectedPrescription(p)}
                      className="text-xs"
                    >
                      View Details
                    </Button>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/verify/${p.verification_code}`}
                        target="_blank"
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                        title="Verify Authenticity"
                      >
                        <ShieldCheck size={14} />
                        Verify
                      </Link>

                      {p.pdf_url && (
                        <a
                          href={p.pdf_url}
                          download={`Prescription_${p.verification_code}.pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Download}
                            className="text-xs"
                          >
                            PDF
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title={
              searchQuery
                ? "No matching prescriptions found"
                : "No digital prescriptions yet"
            }
            description={
              searchQuery
                ? "Try searching with a different diagnosis or code."
                : isDoctor
                ? "Prescriptions you generate during consultations will be archived here."
                : "Prescriptions issued by your doctors will appear here with instant PDF downloads."
            }
            action={
              <Link to="/appointments">
                <Button variant="primary" size="sm" icon={Calendar}>
                  View Consultations
                </Button>
              </Link>
            }
          />
        )}

        {/* ─── Detail Modal with PDF Viewer & Full Breakdown ─── */}
        <Modal
          open={!!selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
          title={`Digital Prescription — ${selectedPrescription?.verification_code || ""}`}
          size="lg"
        >
          {selectedPrescription && (
            <div className="space-y-5 text-ink">
              {/* Doctor / Patient Header */}
              <div className="bg-teal-50/70 border border-teal-100 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h3 className="font-bold text-sm text-teal-950">
                    Dr. {selectedPrescription.doctor.name}
                  </h3>
                  <p className="text-teal-700">
                    {selectedPrescription.doctor.specialty?.name || "Specialist"} • Reg:{" "}
                    {selectedPrescription.doctor.registration_number || "REG-MCI-2026"}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Patient: <strong>{selectedPrescription.patient.full_name}</strong> • Ref:{" "}
                    <strong>{selectedPrescription.booking_code}</strong>
                  </p>
                </div>

                <div className="text-left sm:text-right font-medium text-teal-900 space-y-1">
                  <div>
                    Issued: <strong>{formatIndianDate(selectedPrescription.created_at)}</strong>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold flex items-center sm:justify-end gap-1">
                    <ShieldCheck size={14} /> Verified e-Prescription
                  </div>
                </div>
              </div>

              {/* Diagnosis Box */}
              <div className="space-y-1 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Diagnosis
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {selectedPrescription.diagnosis}
                </p>
              </div>

              {/* Prescribed Medications Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Prescribed Medications (Rx)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-teal-800 text-white font-bold">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Medicine Name</th>
                        <th className="p-2.5">Dosage</th>
                        <th className="p-2.5">Frequency</th>
                        <th className="p-2.5">Duration</th>
                        <th className="p-2.5">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPrescription.medicines?.map((m, idx) => (
                        <tr
                          key={idx}
                          className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}
                        >
                          <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900">{m.name}</td>
                          <td className="p-2.5 text-slate-700">{m.dosage}</td>
                          <td className="p-2.5 text-slate-700">{m.frequency}</td>
                          <td className="p-2.5 text-slate-700">{m.duration}</td>
                          <td className="p-2.5 text-slate-600 text-[11px]">{m.instructions || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Advice */}
              {selectedPrescription.advice && (
                <div className="space-y-1 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    Physician's Advice & Lifestyle Guidance
                  </span>
                  <p className="text-slate-800 leading-relaxed">
                    {selectedPrescription.advice}
                  </p>
                </div>
              )}

              {/* Follow up */}
              {selectedPrescription.follow_up_in_days && (
                <div className="text-xs text-slate-700 font-medium">
                  Recommended follow-up in{" "}
                  <strong>{selectedPrescription.follow_up_in_days} days</strong> or SOS in case of acute distress.
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                <Link
                  to={`/verify/${selectedPrescription.verification_code}`}
                  target="_blank"
                  className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1.5"
                >
                  <ShieldCheck size={14} />
                  Public Verification Link <ExternalLink size={12} />
                </Link>

                <div className="flex items-center gap-2">
                  {selectedPrescription.pdf_url && (
                    <a
                      href={selectedPrescription.pdf_url}
                      download={`Prescription_${selectedPrescription.verification_code}.pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="primary" size="sm" icon={Download}>
                        Download PDF
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPrescription(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
