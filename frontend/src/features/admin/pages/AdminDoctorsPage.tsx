import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  Star,
  Stethoscope,
  UserCheck,
  UserX,
} from "lucide-react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { ResponsiveTable, type Column } from "../../../components/ui/ResponsiveTable";
import { adminApi, type AdminDoctorItem } from "../api";
import { exportToCsv } from "../utils/exportCsv";

export function AdminDoctorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedDoctor, setSelectedDoctor] = useState<AdminDoctorItem | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Fetch doctors list
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-doctors-list", search, availabilityFilter, statusFilter],
    queryFn: () =>
      adminApi.getDoctors({
        search: search || undefined,
        is_available:
          availabilityFilter === "AVAILABLE"
            ? true
            : availabilityFilter === "UNAVAILABLE"
            ? false
            : undefined,
        is_active:
          statusFilter === "ACTIVE"
            ? true
            : statusFilter === "DEACTIVATED"
            ? false
            : undefined,
        page_size: 50,
      }),
  });

  const doctors = data?.results || [];

  // Toggle availability mutation
  const toggleAvailMutation = useMutation({
    mutationFn: ({ id, is_available }: { id: number; is_available: boolean }) =>
      adminApi.updateDoctor(id, { is_available }),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(
        ["admin-doctors-list", search, availabilityFilter, statusFilter],
        (old: any) => {
          if (!old || !old.results) return old;
          return {
            ...old,
            results: old.results.map((d: AdminDoctorItem) =>
              d.id === variables.id
                ? { ...d, is_available: variables.is_available }
                : d
            ),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["admin-stats-overview"] });
    },
  });

  // Toggle active / deactivate mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      adminApi.updateDoctor(id, { is_active }),
    onSuccess: () => {
      setConfirmModalOpen(false);
      setSelectedDoctor(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-stats-overview"] });
    },
  });

  const handleExportCsv = () => {
    exportToCsv(
      "sehatsetu_doctors_directory",
      [
        { header: "Doctor ID", accessor: (d) => d.id },
        { header: "Full Name", accessor: (d) => d.name },
        { header: "Phone Number", accessor: (d) => d.phone },
        { header: "Email Address", accessor: (d) => d.email },
        { header: "Specialty", accessor: (d) => d.specialty },
        { header: "City", accessor: (d) => d.city },
        { header: "Consultation Fee (INR)", accessor: (d) => d.fee },
        { header: "Avg Rating", accessor: (d) => d.avg_rating },
        { header: "Total Appointments", accessor: (d) => d.appointments_count },
        { header: "Available for Booking", accessor: (d) => (d.is_available ? "YES" : "NO") },
        { header: "Account Status", accessor: (d) => (d.is_active ? "ACTIVE" : "INACTIVE") },
        { header: "Joined Date", accessor: (d) => d.joined },
      ],
      doctors
    );
  };

  const doctorColumns: Column<AdminDoctorItem>[] = [
    {
      key: "doctor",
      header: "Doctor",
      render: (doc) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0">
            {doc.name.charAt(0)}
          </div>
          <div className="min-w-0 text-left">
            <p className="font-bold text-ink truncate">Dr. {doc.name}</p>
            <p className="text-[11px] text-muted truncate">
              {doc.phone} • {doc.qualification}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "specialty",
      header: "Specialty & City",
      render: (doc) => (
        <div className="text-left md:text-left">
          <span className="font-semibold text-slate-900 block">{doc.specialty}</span>
          <span className="text-[11px] text-muted">{doc.city}</span>
        </div>
      ),
    },
    {
      key: "fee",
      header: "Fee",
      render: (doc) => <span className="font-bold text-ink tabular-nums">₹{doc.fee}</span>,
    },
    {
      key: "rating",
      header: "Rating",
      render: (doc) => (
        <div className="flex items-center gap-1 font-bold text-amber-600">
          <Star size={13} className="fill-amber-500 text-amber-500" />
          <span className="tabular-nums">{doc.avg_rating}</span>
          <span className="text-[10px] text-muted font-normal">({doc.rating_count})</span>
        </div>
      ),
    },
    {
      key: "appointments",
      header: "Appointments",
      render: (doc) => (
        <span className="font-bold text-slate-800 tabular-nums">{doc.appointments_count}</span>
      ),
    },
    {
      key: "availability",
      header: "Availability",
      render: (doc) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleAvailMutation.mutate({
              id: doc.id,
              is_available: !doc.is_available,
            });
          }}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            doc.is_available ? "bg-teal-700" : "bg-slate-300"
          }`}
          title={doc.is_available ? "Click to mark Unavailable" : "Click to mark Available"}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
              doc.is_available ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (doc) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
            doc.is_active
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {doc.is_active ? "Active" : "Deactivated"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (doc) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to={`/doctors/${doc.id}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
            title="View Public Profile"
          >
            <ExternalLink size={15} />
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDoctor(doc);
              setConfirmModalOpen(true);
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              doc.is_active
                ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
            }`}
            title={doc.is_active ? "Deactivate Doctor Account" : "Reactivate Doctor Account"}
          >
            {doc.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 font-sans pb-12">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-ink flex items-center gap-2.5">
              <Stethoscope size={24} className="text-teal-700" />
              Doctor Management Directory
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              View clinician credentials, toggle instant slot availability, and audit doctor accounts
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleExportCsv}
              disabled={doctors.length === 0}
              className="text-xs font-bold w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={isRefetching}
              onClick={() => refetch()}
              className="text-xs w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* ─── Filters & Search ─── */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-border shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by doctor name, phone, city..."
              className="w-full bg-slate-50 border border-border text-ink text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Availability Filter */}
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="flex-1 md:flex-none bg-slate-50 border border-border text-slate-700 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium cursor-pointer min-h-[44px]"
            >
              <option value="ALL">All Availability</option>
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 md:flex-none bg-slate-50 border border-border text-slate-700 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium cursor-pointer min-h-[44px]"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>
        </div>

        {/* ─── Doctors Table (Responsive: Desktop Table / Mobile Card List) ─── */}
        <ResponsiveTable
          columns={doctorColumns}
          data={doctors}
          keyExtractor={(d) => d.id}
          isLoading={isLoading}
          emptyMessage="No doctors found matching the search criteria or availability filter."
        />

        {/* ─── Deactivate / Reactivate Modal (Bottom Sheet on Mobile) ─── */}
        <Modal
          open={confirmModalOpen && !!selectedDoctor}
          onClose={() => {
            setConfirmModalOpen(false);
            setSelectedDoctor(null);
          }}
          title={selectedDoctor?.is_active ? "Deactivate Doctor Account" : "Reactivate Doctor Account"}
          size="md"
        >
          {selectedDoctor && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {selectedDoctor.is_active
                  ? `Are you sure you want to deactivate Dr. ${selectedDoctor.name}'s account? They will not be able to log in or accept consultations.`
                  : `Are you sure you want to reactivate Dr. ${selectedDoctor.name}'s account? They will regain access to their portal and patient bookings.`}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfirmModalOpen(false);
                    setSelectedDoctor(null);
                  }}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                >
                  Cancel
                </Button>
                <Button
                  variant={selectedDoctor.is_active ? "danger" : "primary"}
                  size="sm"
                  loading={toggleActiveMutation.isPending}
                  onClick={() =>
                    toggleActiveMutation.mutate({
                      id: selectedDoctor.id,
                      is_active: !selectedDoctor.is_active,
                    })
                  }
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 font-bold"
                >
                  {selectedDoctor.is_active ? "Confirm Deactivation" : "Confirm Reactivation"}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
