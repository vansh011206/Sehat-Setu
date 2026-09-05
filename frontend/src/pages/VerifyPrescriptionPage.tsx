import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  CheckCircle2,
  Download,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { prescriptionsApi } from "../features/prescriptions/api";

export function VerifyPrescriptionPage() {
  const { code: urlCode } = useParams<{ code?: string }>();
  const [inputCode, setInputCode] = useState(urlCode || "");
  const [searchCode, setSearchCode] = useState(urlCode || "");

  useEffect(() => {
    if (urlCode) {
      setInputCode(urlCode);
      setSearchCode(urlCode);
    }
  }, [urlCode]);

  const {
    data: result,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["verify-prescription", searchCode],
    queryFn: () => prescriptionsApi.verifyPrescription(searchCode),
    enabled: searchCode.trim().length > 0,
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setSearchCode(inputCode.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between">
      {/* ─── Public Brand Header ─── */}
      <header className="bg-white border-b border-border px-4 sm:px-8 py-4 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center font-extrabold text-base shadow-xs">
              S
            </div>
            <div>
              <span className="font-extrabold text-lg text-ink font-heading tracking-tight">
                SehatSetu
              </span>
              <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider block -mt-1">
                Official Document Verification
              </span>
            </div>
          </Link>

          <Link to="/login">
            <Button variant="outline" size="sm" icon={User} className="text-xs">
              Sign In to Portal
            </Button>
          </Link>
        </div>
      </header>

      {/* ─── Main Verification Card ─── */}
      <main className="max-w-2xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink">
            Verify e-Prescription Authenticity
          </h1>
          <p className="text-xs sm:text-sm text-muted max-w-md mx-auto">
            Validate tamper-evident digital prescriptions issued across the SehatSetu Telehealth Clinical Network.
          </p>
        </div>

        {/* Search Code Input */}
        <form
          onSubmit={handleSearch}
          className="bg-white p-2 sm:p-3 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              required
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter Code (e.g. SHTS-8XK2PL3)"
              className="w-full bg-transparent border-0 text-ink text-sm sm:text-base font-mono font-bold pl-11 pr-4 py-2.5 focus:outline-none placeholder:font-sans placeholder:font-normal min-h-[44px]"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={ShieldCheck}
            className="font-bold shrink-0 w-full sm:w-auto min-h-[44px]"
          >
            Verify Now
          </Button>
        </form>

        {/* Verification Results Display */}
        {isLoading ? (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-xs space-y-4">
            <Skeleton className="w-1/2 h-6 mx-auto" />
            <Skeleton className="w-3/4 h-4 mx-auto" />
            <Skeleton className="w-full h-32" variant="rect" />
          </div>
        ) : result && result.valid ? (
          <div className="bg-white rounded-2xl border border-teal-200 shadow-md p-4 sm:p-8 space-y-6 animate-fadeIn">
            {/* Authenticity Banner */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 sm:p-4 rounded-xl flex items-start gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-emerald-950 font-heading">
                  Authentic & Verified Medical Prescription
                </h2>
                <p className="text-xs text-emerald-700 font-medium">
                  This e-prescription was issued by a registered medical practitioner on SehatSetu and is legally valid under Indian Telemedicine Guidelines 2020.
                </p>
              </div>
            </div>

            {/* Document Metadata Table */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              <div className="p-3 sm:p-3.5 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted font-medium">Verification Code</span>
                <span className="font-mono font-extrabold text-teal-900 text-base sm:text-lg break-all">
                  {result.verification_code}
                </span>
              </div>

              <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted font-medium">Prescribing Doctor</span>
                <span className="font-bold text-ink text-sm">
                  {result.doctor_name}
                </span>
              </div>

              <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted font-medium">Medical License / Reg No</span>
                <span className="font-bold text-teal-800 break-all">
                  {result.doctor_registration}
                </span>
              </div>

              <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted font-medium">Clinical Specialty</span>
                <span className="font-medium text-slate-800">
                  {result.specialty} ({result.clinic_city})
                </span>
              </div>

              <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted font-medium">Patient Name (Masked)</span>
                <span className="font-bold text-ink">
                  {result.patient_name_masked}
                </span>
              </div>

              <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted font-medium">Date of Issue</span>
                <span className="font-medium text-slate-800">{result.date}</span>
              </div>

              <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted font-medium">Clinical Diagnosis</span>
                <span className="font-semibold text-slate-900">{result.diagnosis}</span>
              </div>

              <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted font-medium">Prescribed Medications</span>
                <span className="font-bold text-teal-800">
                  {result.medicines_count} Active Medications
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-muted flex items-center gap-1">
                <Lock size={12} className="text-teal-700" />
                End-to-End Cryptographically Verified
              </span>

              {result.pdf_url && (
                <a
                  href={result.pdf_url}
                  download={`Prescription_${result.verification_code}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button variant="primary" size="sm" icon={Download} className="w-full sm:w-auto min-h-[44px]">
                    Download Verified PDF
                  </Button>
                </a>
              )}
            </div>
          </div>
        ) : searchCode && (isError || (result && !result.valid)) ? (
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-6 sm:p-8 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert size={26} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold font-heading text-rose-950">
                Prescription Verification Failed
              </h2>
              <p className="text-xs text-muted max-w-sm mx-auto">
                No active or verified medical prescription was found matching verification code{" "}
                <strong className="font-mono text-slate-800">{searchCode}</strong>.
              </p>
            </div>
            <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-xl max-w-md mx-auto">
              Please check the alphanumeric verification code on your physical or digital prescription document and verify that it matches the <strong>SHTS-XXXXXXX</strong> format.
            </div>
          </div>
        ) : null}
      </main>

      {/* ─── Public Footer ─── */}
      <footer className="bg-white border-t border-border py-6 px-4 text-center text-xs text-muted">
        <div className="max-w-4xl mx-auto space-y-1">
          <p className="font-medium text-slate-700">
            SehatSetu Clinical Document Verification Service
          </p>
          <p className="text-[11px]">
            In compliance with Information Technology Act, 2000 and Indian Telemedicine Practice Guidelines.
          </p>
        </div>
      </footer>
    </div>
  );
}
