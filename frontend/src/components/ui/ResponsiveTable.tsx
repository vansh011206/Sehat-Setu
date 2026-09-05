// mobile: reusable responsive table that switches between desktop <table> and mobile stacked card list
import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  skeletonRowCount?: number;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
  onRowClick,
  isLoading = false,
  skeletonRowCount = 4,
}: ResponsiveTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {/* Desktop Skeleton */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-border">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="p-3.5">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: skeletonRowCount }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="p-3.5">
                      <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Skeleton Cards */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: skeletonRowCount }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-2xl border border-border shadow-2xs space-y-3 animate-pulse"
            >
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border p-8 text-center text-xs text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      {/* ─── Desktop Table View (md+) ─── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-white shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-border">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-3.5 whitespace-nowrap ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                onClick={() => onRowClick && onRowClick(item)}
                className={`transition-colors ${
                  onRowClick
                    ? "cursor-pointer hover:bg-slate-50/80"
                    : "hover:bg-slate-50/50"
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`p-3.5 ${col.className || ""}`}>
                    {col.render
                      ? col.render(item, index)
                      : String((item as any)[col.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Mobile Card List View (<md) ─── */}
      <div className="md:hidden space-y-3">
        {data.map((item, index) => (
          <div
            key={keyExtractor(item, index)}
            onClick={() => onRowClick && onRowClick(item)}
            className={`bg-white p-4 rounded-2xl border border-border shadow-xs space-y-2.5 transition-all ${
              onRowClick ? "cursor-pointer active:scale-[0.99]" : ""
            }`}
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div
                  key={col.key}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <span className="font-semibold text-muted shrink-0 text-[11px] pt-0.5">
                    {col.header}
                  </span>
                  <div className="text-right text-ink font-medium min-w-0 max-w-[65%] break-words">
                    {col.render
                      ? col.render(item, index)
                      : String((item as any)[col.key] ?? "-")}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
