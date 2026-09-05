import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { ResponsiveTable, type Column } from "../../../components/ui/ResponsiveTable";
import { adminApi, type AuditLogItem } from "../api";

const ACTION_FILTERS = [
  { label: "All Actions", value: "" },
  { label: "Availability Toggles", value: "DOCTOR_AVAILABILITY_TOGGLE" },
  { label: "Status Overrides", value: "APPOINTMENT_STATUS_OVERRIDE" },
  { label: "Doctor Status Changes", value: "DOCTOR_STATUS_UPDATE" },
  { label: "Doctor Deactivations", value: "DOCTOR_DEACTIVATED" },
];

export function AdminAuditLogsPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Fetch audit logs
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-audit-logs", actionFilter, search],
    queryFn: () =>
      adminApi.getAuditLogs({
        action: actionFilter || undefined,
        search: search || undefined,
        page_size: 50,
      }),
  });

  const logs = data?.results || [];

  const getActionBadge = (action: string) => {
    switch (action) {
      case "APPOINTMENT_STATUS_OVERRIDE":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Status Override
          </span>
        );
      case "DOCTOR_AVAILABILITY_TOGGLE":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
            Availability Toggle
          </span>
        );
      case "DOCTOR_DEACTIVATED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            Doctor Deactivated
          </span>
        );
      case "DOCTOR_STATUS_UPDATE":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            Doctor Status Update
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {action}
          </span>
        );
    }
  };

  const logColumns: Column<AuditLogItem>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (log) => {
        const dt = new Date(log.created_at);
        return (
          <div className="text-left md:text-left whitespace-nowrap">
            <p className="font-semibold text-slate-800">
              {dt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            <p className="text-[11px] text-muted">
              {dt.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>
        );
      },
    },
    {
      key: "action",
      header: "Action Type",
      render: (log) => getActionBadge(log.action),
    },
    {
      key: "actor",
      header: "Actor",
      render: (log) => (
        <div className="text-left md:text-left">
          <p className="font-bold text-ink">{log.actor_name}</p>
          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
            {log.actor_role}
          </span>
        </div>
      ),
    },
    {
      key: "target",
      header: "Target",
      render: (log) =>
        log.target_model ? (
          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
            {log.target_model} #{log.target_id}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "description",
      header: "Description",
      render: (log) => (
        <p className="text-xs text-slate-700 leading-relaxed line-clamp-2 text-left">
          {log.description}
        </p>
      ),
    },
    {
      key: "details",
      header: "Details",
      className: "text-right",
      render: (log) => {
        const hasChanges = log.changes && Object.keys(log.changes).length > 0;
        return hasChanges ? (
          <button
            onClick={() => setSelectedLog(log)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors border border-teal-200 cursor-pointer min-h-[36px]"
          >
            <Eye size={13} />
            <span>Diff</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-400">—</span>
        );
      },
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 font-sans pb-12">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-ink flex items-center gap-2.5">
              <ShieldAlert size={24} className="text-teal-700" />
              Administrative Audit & Security Log
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Immutable audit records tracking administrator actions, doctor toggles, and manual consultation state overrides
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
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
              placeholder="Search audit descriptions, target ID..."
              className="w-full bg-slate-50 border border-border text-ink text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full md:w-auto bg-slate-50 border border-border text-slate-700 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium cursor-pointer min-h-[44px]"
            >
              {ACTION_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── Audit Logs Table (Responsive Table / Mobile Card List) ─── */}
        <ResponsiveTable
          columns={logColumns}
          data={logs}
          keyExtractor={(l) => l.id}
          isLoading={isLoading}
          emptyMessage="No audit entries found matching the action filter or search parameters."
        />

        {/* ─── JSON Diff Details Modal (Bottom Sheet on Mobile) ─── */}
        <Modal
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Changes Diff — Log #${selectedLog?.id || ""}`}
          size="md"
        >
          {selectedLog && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <p>
                  <span className="font-bold">Actor:</span> {selectedLog.actor_name} ({selectedLog.actor_role})
                </p>
                <p>
                  <span className="font-bold">Description:</span> {selectedLog.description}
                </p>
                <p>
                  <span className="font-bold">Timestamp:</span>{" "}
                  {new Date(selectedLog.created_at).toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Changes Payload (JSON)
                </label>
                <pre className="bg-slate-900 text-teal-300 font-mono text-xs p-3.5 rounded-xl overflow-x-auto max-h-64 border border-slate-800 max-w-full break-words whitespace-pre-wrap">
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
