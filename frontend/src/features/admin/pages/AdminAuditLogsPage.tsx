import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Code,
  Eye,
  History,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";
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

  return (
    <AdminLayout>
      <div className="space-y-6 font-sans pb-12">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-ink flex items-center gap-2.5">
              <ShieldAlert size={24} className="text-teal-700" />
              Administrative Audit & Security Log
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Immutable audit records tracking administrator actions, doctor toggles, and manual consultation state overrides
            </p>
          </div>

          <div className="flex items-center gap-2.5">
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
          </div>
        </div>

        {/* ─── Filters & Search ─── */}
        <div className="bg-white p-4 rounded-2xl border border-border shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
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
              className="w-full bg-slate-50 border border-border text-ink text-xs pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-50 border border-border text-slate-700 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium cursor-pointer"
            >
              {ACTION_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── Audit Logs Table ─── */}
        <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action Type</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Target</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td colSpan={6} className="p-4">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                ) : logs.length > 0 ? (
                  logs.map((log) => {
                    const dt = new Date(log.created_at);
                    const hasChanges =
                      log.changes && Object.keys(log.changes).length > 0;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
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
                        </td>

                        {/* Action Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>

                        {/* Actor */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-bold text-ink">{log.actor_name}</p>
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                            {log.actor_role}
                          </span>
                        </td>

                        {/* Target */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {log.target_model ? (
                            <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {log.target_model} #{log.target_id}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                          <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                            {log.description}
                          </p>
                        </td>

                        {/* Details */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {hasChanges ? (
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors border border-teal-200 cursor-pointer"
                            >
                              <Eye size={13} />
                              <span>Diff</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <EmptyState
                        icon={History}
                        title="No audit entries found"
                        description="Administrative security and override actions will appear here."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── JSON Diff Details Modal ─── */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-border shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
                    <Code size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-heading text-ink">
                      Audit Changes Diff
                    </h3>
                    <p className="text-[11px] text-muted">
                      Log #{selectedLog.id} • {selectedLog.action}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

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
                <pre className="bg-slate-900 text-teal-300 font-mono text-xs p-3.5 rounded-xl overflow-x-auto max-h-64 border border-slate-800">
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
