import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  IndianRupee,
  RefreshCw,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  Star,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { AdminLayout } from "../layouts/AdminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import { Button } from "../../../components/ui/Button";
import { adminApi } from "../api";

export function AdminOverviewPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  // 1. Overview KPIs
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
    isRefetching,
  } = useQuery({
    queryKey: ["admin-stats-overview", range],
    queryFn: () => adminApi.getOverviewStats(range),
  });

  // 2. Revenue Trend
  const { data: trendData, isLoading: isTrendLoading } = useQuery({
    queryKey: ["admin-stats-revenue-trend", range],
    queryFn: () => adminApi.getRevenueTrend(range),
  });

  // 3. Appointments by Status Distribution
  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: ["admin-stats-status-dist"],
    queryFn: () => adminApi.getAppointmentsByStatus(),
  });

  // 4. Top Doctors
  const { data: topDoctorsData, isLoading: isDoctorsLoading } = useQuery({
    queryKey: ["admin-stats-top-doctors", range],
    queryFn: () => adminApi.getTopDoctors(range),
  });

  // 5. Specialty Demand
  const { data: specialtyData, isLoading: isSpecialtyLoading } = useQuery({
    queryKey: ["admin-stats-specialty-demand"],
    queryFn: () => adminApi.getSpecialtyDemand(),
  });

  const handleRefreshAll = () => {
    refetchOverview();
  };

  const statCards = [
    {
      title: "Total Platform Revenue",
      value: `₹${Number(overviewData?.total_revenue || 0).toLocaleString("en-IN")}`,
      delta: overviewData?.revenue_growth_pct ?? 0,
      icon: IndianRupee,
      bgColor: "bg-teal-50",
      textColor: "text-teal-700",
      borderColor: "border-teal-200",
      subtitle: "from completed consultations",
    },
    {
      title: "Total Appointments",
      value: (overviewData?.total_appointments || 0).toLocaleString("en-IN"),
      delta: overviewData?.appointments_growth_pct ?? 0,
      icon: CalendarDays,
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
      subtitle: `${overviewData?.completed_count || 0} completed • ${overviewData?.cancelled_count || 0} cancelled`,
    },
    {
      title: "Active Clinicians",
      value: (overviewData?.active_doctors || 0).toLocaleString("en-IN"),
      delta: overviewData?.doctors_growth_pct ?? 0,
      icon: Stethoscope,
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
      borderColor: "border-emerald-200",
      subtitle: "verified doctors on platform",
    },
    {
      title: "Active Patients",
      value: (overviewData?.active_patients || 0).toLocaleString("en-IN"),
      delta: overviewData?.patients_growth_pct ?? 0,
      icon: Users,
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
      subtitle: `${overviewData?.new_users_this_period || 0} new in this window`,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 font-sans pb-12">
        {/* ─── Header & Time Range Controls ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-ink flex items-center gap-2.5">
              <Activity className="text-teal-700" size={28} />
              Platform Analytics & Overview
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Real-time telehealth performance metrics, volume trends, and clinician analytics
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Range Toggle Chips */}
            <div className="bg-white p-1 rounded-xl border border-border flex items-center shadow-2xs">
              {(["7d", "30d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    range === r
                      ? "bg-teal-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-ink hover:bg-slate-50"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={isRefetching}
              onClick={handleRefreshAll}
              className="text-xs"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* ─── KPI Metric Cards (4 Cards) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            const isPositive = card.delta >= 0;
            return (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-3 relative overflow-hidden transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {card.title}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl ${card.bgColor} ${card.textColor} border ${card.borderColor} flex items-center justify-center`}
                  >
                    <Icon size={18} />
                  </div>
                </div>

                {isOverviewLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div>
                    <div className="text-2xl font-bold font-heading text-ink tabular-nums">
                      {card.value}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                          isPositive ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp size={14} />
                        ) : (
                          <TrendingDown size={14} />
                        )}
                        {Math.abs(card.delta)}%
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        vs prior period
                      </span>
                    </div>

                    <p className="text-[11px] text-muted mt-2 border-t border-slate-100 pt-2">
                      {card.subtitle}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Main Charts Row (Revenue Trend & Status Distribution) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend (2 cols) */}
          <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-heading text-ink">
                  Revenue & Consultation Trend
                </h3>
                <p className="text-xs text-muted">
                  Daily completed consultation revenue (₹) over the last {range.toUpperCase()}
                </p>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
                {range.toUpperCase()} Range
              </span>
            </div>

            {isTrendLoading ? (
              <Skeleton className="h-72 w-full rounded-xl" variant="rect" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0F766E" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`;
                      }}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip
                      formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
                      labelFormatter={(label: any) => {
                        const d = new Date(label);
                        return d.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        });
                      }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0F766E"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Appointment Status Distribution Donut (1 col) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-border shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold font-heading text-ink">
                Appointments by Status
              </h3>
              <p className="text-xs text-muted">Current platform status breakdown</p>
            </div>

            {isStatusLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" variant="rect" />
            ) : (
              <>
                <div className="h-52 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="count"
                      >
                        {(statusData || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, _name: any, props: any) => [
                          `${val} (${props.payload.percentage}%)`,
                          props.payload.label,
                        ]}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          fontSize: "11px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold font-heading text-ink tabular-nums">
                      {overviewData?.total_appointments || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Bookings
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  {(statusData || []).map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between text-xs py-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-slate-600 font-medium">{item.label}</span>
                      </div>
                      <span className="font-bold text-ink tabular-nums">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Secondary Analytics Grid (Specialty Demand & Top Doctors) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Specialty Demand Bar Chart */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-heading text-ink">
                  Specialty Booking Demand
                </h3>
                <p className="text-xs text-muted">
                  Total consultation volume per clinical specialty
                </p>
              </div>
            </div>

            {isSpecialtyLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" variant="rect" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={specialtyData || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val} Bookings`, "Volume"]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="bookings_count" fill="#0F766E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Performing Doctors Table */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-heading text-ink">
                  Top Clinicians by Revenue
                </h3>
                <p className="text-xs text-muted">
                  Highest volume and completion rate doctors
                </p>
              </div>
            </div>

            {isDoctorsLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" variant="rect" />
            ) : (topDoctorsData || []).length > 0 ? (
              <div className="space-y-3">
                {(topDoctorsData || []).map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-slate-50/70 hover:bg-slate-100/70 transition-colors rounded-xl border border-slate-200/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-ink truncate">
                          Dr. {doc.name}
                        </h4>
                        <p className="text-[11px] text-muted truncate">
                          {doc.specialty} • {doc.city}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-teal-800 tabular-nums">
                        ₹{Number(doc.revenue).toLocaleString("en-IN")}
                      </div>
                      <div className="flex items-center gap-1.5 justify-end text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center text-amber-600 font-bold">
                          <Star size={10} className="fill-amber-500 text-amber-500 mr-0.5" />
                          {doc.avg_rating}
                        </span>
                        <span>•</span>
                        <span>{doc.completed_count} consults</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted">
                No doctor activity records for this period.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
