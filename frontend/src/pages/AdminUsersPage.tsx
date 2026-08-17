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

const mockUsers = [
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

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-slate-900">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search user name, phone (+91...), or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {["ALL", "PATIENT", "DOCTOR", "ADMIN"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
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

        {/* Users Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Phone / Identifier</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 font-bold text-slate-900">
                      <div>{u.name}</div>
                      <div className="text-slate-400 text-[11px] font-normal">{u.email}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-700">{u.phone}</td>
                    <td className="p-4">
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
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 size={13} /> {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{u.registeredAt}</td>
                    <td className="p-4 text-right">
                      <Button variant="outline" size="sm">
                        View Audit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
