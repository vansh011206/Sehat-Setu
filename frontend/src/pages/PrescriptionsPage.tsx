import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  FileText,
  Printer,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { AppLayout } from "../layouts/AppLayout";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";

interface MedicineItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface MockPrescription {
  id: number;
  doctorName: string;
  specialty: string;
  qualification: string;
  registrationNumber: string;
  patientName: string;
  date: string;
  diagnosis: string;
  medicines: MedicineItem[];
  notes: string;
}

const mockPrescriptions: MockPrescription[] = [
  {
    id: 101,
    doctorName: "Dr. Rajesh Sharma",
    specialty: "Cardiology",
    qualification: "MBBS, MD (Cardiology), DM (AIIMS)",
    registrationNumber: "MCI-CARD-2012-8874",
    patientName: "Aarav Kumar",
    date: "2026-08-11",
    diagnosis: "Stage 1 Essential Hypertension & Mild Tachycardia",
    medicines: [
      {
        name: "Telmisartan 40mg",
        dosage: "1 Tablet",
        frequency: "Once Daily (Morning)",
        duration: "30 Days",
        instructions: "After breakfast with water",
      },
      {
        name: "Amlodipine 5mg",
        dosage: "1 Tablet",
        frequency: "Once Daily (Night)",
        duration: "30 Days",
        instructions: "Before bedtime",
      },
      {
        name: "CoQ10 100mg Supplement",
        dosage: "1 Capsule",
        frequency: "Once Daily",
        duration: "15 Days",
        instructions: "After lunch",
      },
    ],
    notes: "Reduce dietary sodium intake below 2g/day. Maintain regular BP log twice a week. Review after 4 weeks.",
  },
  {
    id: 102,
    doctorName: "Dr. Priya Patel",
    specialty: "Dermatology",
    qualification: "MBBS, MD (Dermatology)",
    registrationNumber: "GMC-DERM-2015-4421",
    patientName: "Aarav Kumar",
    date: "2026-07-15",
    diagnosis: "Contact Dermatitis & Skin Barrier Repair",
    medicines: [
      {
        name: "Hydrocortisone 1% Cream",
        dosage: "Thin layer",
        frequency: "Twice daily",
        duration: "7 Days",
        instructions: "Apply locally on affected areas",
      },
      {
        name: "Cetirizine 10mg",
        dosage: "1 Tablet",
        frequency: "1-0-0",
        duration: "5 Days",
        instructions: "If itching persists",
      },
    ],
    notes: "Avoid harsh soaps. Apply fragrance-free ceramides moisturizer twice daily.",
  },
];

export function PrescriptionsPage() {
  const [selectedRx, setSelectedRx] = useState<MockPrescription | null>(null);

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-slate-900">
              Digital Prescriptions
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Tamper-proof medical prescriptions issued by your certified attending doctors.
            </p>
          </div>
        </div>

        {/* Prescription List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {mockPrescriptions.map((rx) => (
            <div
              key={rx.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                      Rx #{rx.id}
                    </span>
                    <h3 className="text-base font-bold font-heading text-slate-900 mt-1">
                      {rx.diagnosis}
                    </h3>
                  </div>
                  <Badge variant="success" size="sm">
                    Verified
                  </Badge>
                </div>

                {/* Doctor info */}
                <div className="text-xs text-slate-600 space-y-1 mb-4">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Stethoscope size={14} className="text-teal-700" />
                    {rx.doctorName} ({rx.specialty})
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Reg No: {rx.registrationNumber} • {rx.qualification}
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-500 pt-1">
                    <Calendar size={13} className="text-teal-700" />
                    Issued on: {rx.date}
                  </p>
                </div>

                {/* Medicines summary preview */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4 text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Prescribed Medicines ({rx.medicines.length})
                  </span>
                  <ul className="space-y-1">
                    {rx.medicines.map((m, i) => (
                      <li key={i} className="font-medium text-slate-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                        <span>{m.name}</span>
                        <span className="text-slate-400 text-[11px]">({m.duration})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* View Action Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-teal-800 font-medium flex items-center gap-1">
                  <ShieldCheck size={14} /> Certified Digital Rx
                </span>

                <Button
                  variant="primary"
                  size="sm"
                  icon={FileText}
                  onClick={() => setSelectedRx(rx)}
                >
                  View Prescription
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Digital Prescription Detail Modal ─── */}
        {selectedRx && (
          <Modal
            open={!!selectedRx}
            onClose={() => setSelectedRx(null)}
            title={`Prescription Record #${selectedRx.id}`}
          >
            <div className="space-y-5 print:p-0">
              {/* Rx Header Letterhead */}
              <div className="p-4 rounded-2xl bg-teal-900 text-white flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold font-heading">{selectedRx.doctorName}</h3>
                  <p className="text-xs text-teal-200">{selectedRx.qualification}</p>
                  <p className="text-[11px] text-teal-300/80">Reg: {selectedRx.registrationNumber}</p>
                </div>
                <div className="text-right">
                  <Badge variant="warning" size="sm">SehatSetu Telehealth</Badge>
                  <p className="text-[11px] text-teal-200 mt-1">{selectedRx.date}</p>
                </div>
              </div>

              {/* Patient and Diagnosis */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Name</span>
                  <span className="font-bold text-slate-800">{selectedRx.patientName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Clinical Diagnosis</span>
                  <span className="font-bold text-teal-900">{selectedRx.diagnosis}</span>
                </div>
              </div>

              {/* Medicines Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Prescription Details (Rx)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Medicine</th>
                        <th className="p-2.5">Dosage / Frequency</th>
                        <th className="p-2.5">Duration</th>
                        <th className="p-2.5">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRx.medicines.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{m.name}</td>
                          <td className="p-2.5 text-slate-600">{m.dosage} ({m.frequency})</td>
                          <td className="p-2.5 text-slate-600">{m.duration}</td>
                          <td className="p-2.5 text-slate-600">{m.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Doctor Advice / Notes */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 block mb-1">Doctor's Advice & Lifestyle Notes:</span>
                <p className="text-amber-800 leading-relaxed">{selectedRx.notes}</p>
              </div>

              {/* Verified Digital Signature */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 size={16} />
                  <span>Electronically Signed & Verified by Medical Council</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Printer}
                  onClick={() => window.print()}
                >
                  Print Rx
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppLayout>
  );
}
