import { useState } from "react";
import {
  CheckCircle2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { AppLayout } from "../layouts/AppLayout";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ResponsiveTable, type Column } from "../components/ui/ResponsiveTable";

interface MockUser {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: string;
  status: string;
  registeredAt: string;
  specialty?: string;
}

const mockUsers: MockUser[] = [
  {
    id: 1,
    name: "System Administrator",
    phone: "+919876543210",
    email: "admin@sehatsetu.com",
    role: "ADMIN",
    status: "Active",
    registeredAt: "2026-08-01",
  },
  {
    id: 2,
    name: "Aarav Kumar",
    phone: "+919876543211",
    email: "patient@sehatsetu.com",
    role: "PATIENT",
    status: "Active",
    registeredAt: "2026-08-05",
  },
  {
    id: 3,
    name: "Dr. Rajesh Sharma",
    phone: "+919876543212",
    email: "dr.sharma@sehatsetu.com",
    role: "DOCTOR",
    status: "Verified",
    specialty: "Cardiology",
    registeredAt: "2026-08-02",
  },
  {
    id: 4,
    name: "Dr. Priya Patel",
    phone: "+919876543213",
    email: "dr.patel@sehatsetu.com",
    role: "DOCTOR",
    status: "Verified",
    specialty: "Dermatology",
    registeredAt: "2026-08-03",
  },
];

export function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const filteredUsers = mockUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const userColumns: Column<MockUser>[] = [
    {
      key: "name",
      header: "User Details",
      render: (u) => (
        <div className="text-left">
          <div className="font-bold text-slate-900">{u.name}</div>
          <div className="text-slate-400 text-[11px] font-normal">{u.email}</div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (u) => <span className="font-medium text-slate-700">{u.phone}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <Badge
          variant={
            u.role === "ADMIN"
              ? "danger"
              : u.role === "DOCTOR"
              ? "teal"
              : "default"
          }
          size="sm"
        >
          {u.role}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
          <CheckCircle2 size={13} /> {u.status}
        </span>
      ),
    },
    {
      key: "registeredAt",
      header: "Registered Date",
      render: (u) => <span className="text-slate-500">{u.registeredAt}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: () => (
        <Button variant="outline" size="sm" className="min-h-[36px]">
          View Audit
        </Button>
      ),
    },
  ];

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900">
              User & Doctor Directory Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Admin audit table for role authorizations, medical credential verifications, and user accounts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="info" size="md">
              <ShieldCheck size={14} className="mr-1" />
              Admin Portal
            </Badge>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex-1 w-full">
            <Input
              type="text"
              placeholder="Search user name, phone (+91...), or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {["ALL", "PATIENT", "DOCTOR", "ADMIN"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[36px] cursor-pointer ${
                  roleFilter === r
                    ? "bg-teal-800 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-teal-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table (Responsive Table / Mobile Card List) */}
        <ResponsiveTable
          columns={userColumns}
          data={filteredUsers}
          keyExtractor={(u) => u.id}
          emptyMessage="No users found matching the selected filters."
        />
      </div>
    </AppLayout>
  );
}
