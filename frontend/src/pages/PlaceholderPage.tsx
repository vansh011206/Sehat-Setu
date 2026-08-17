/**
 * Placeholder page for routes that are not yet implemented.
 * Shows a "coming soon" screen with a relevant lucide icon and skeleton demo.
 */

import type { LucideIcon } from "lucide-react";
import {
  Search,
  CalendarDays,
  LayoutDashboard,
  ShieldCheck,
  Clock,
  CalendarClock,
  Users,
  FileText,
  BarChart3,
} from "lucide-react";
import { SkeletonCard } from "../components/ui/Skeleton";

interface PlaceholderConfig {
  icon: LucideIcon;
  title: string;
  description: string;
}

const pages: Record<string, PlaceholderConfig> = {
  doctors: {
    icon: Search,
    title: "Find Doctors",
    description:
      "Browse verified doctors by specialty, location, and availability. This feature is coming soon.",
  },
  appointments: {
    icon: CalendarDays,
    title: "Appointments",
    description:
      "View and manage your upcoming and past appointments. This feature is coming soon.",
  },
  dashboard: {
    icon: LayoutDashboard,
    title: "Dashboard",
    description:
      "Your personalized health dashboard with quick stats and upcoming appointments. Coming soon.",
  },
  admin: {
    icon: ShieldCheck,
    title: "Admin Panel",
    description:
      "Platform administration — manage users, doctors, and analytics. Coming soon.",
  },
  history: {
    icon: Clock,
    title: "Consultation History",
    description:
      "View your past consultations, prescriptions, and medical records. Coming soon.",
  },
  schedule: {
    icon: CalendarClock,
    title: "Doctor Schedule",
    description:
      "Manage your availability and time slots for patient bookings. Coming soon.",
  },
  patients: {
    icon: Users,
    title: "My Patients",
    description:
      "View and manage your patient list and their records. Coming soon.",
  },
  prescriptions: {
    icon: FileText,
    title: "Prescriptions",
    description:
      "Create and manage digital prescriptions for your patients. Coming soon.",
  },
  "admin/users": {
    icon: Users,
    title: "User Management",
    description:
      "Manage all platform users, roles, and permissions. Coming soon.",
  },
  "admin/analytics": {
    icon: BarChart3,
    title: "Platform Analytics",
    description:
      "View platform metrics, usage statistics, and growth trends. Coming soon.",
  },
};

export function PlaceholderPage({ page }: { page: string }) {
  const config = pages[page] || {
    icon: LayoutDashboard,
    title: "Coming Soon",
    description: "This feature is under development.",
  };

  const Icon = config.icon;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
          <Icon size={28} className="text-primary-900" />
        </div>
        <h1 className="text-2xl font-bold font-heading text-ink mb-2">
          {config.title}
        </h1>
        <p className="text-sm text-muted max-w-md mx-auto">
          {config.description}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold">
          Under Development
        </div>
      </div>

      {/* Skeleton demo */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
