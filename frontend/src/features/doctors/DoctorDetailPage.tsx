import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Calendar,
  IndianRupee,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
  Stethoscope,
} from "lucide-react";
import { doctorsApi } from "./api";
import { ReviewModal } from "./ReviewModal";
import { BookingModal } from "../bookings/BookingModal";
import { AppLayout } from "../../layouts/AppLayout";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

export function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const doctorId = Number(id);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewPage] = useState(1);

  // Fetch full doctor profile
  const {
    data: doctor,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["doctor-detail", doctorId],
    queryFn: () => doctorsApi.getDoctorDetail(doctorId),
    enabled: !isNaN(doctorId),
  });

  // Fetch paginated reviews
  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ["doctor-reviews", doctorId, reviewPage],
    queryFn: () => doctorsApi.getDoctorReviews(doctorId, reviewPage),
    enabled: !isNaN(doctorId),
  });

  if (isLoading) {
    return (
      <AppLayout showSidebar={true}>
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-8 w-40 rounded-xl" />
          <Skeleton className="h-64 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 md:col-span-2 rounded-3xl" />
            <Skeleton className="h-48 rounded-3xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError || !doctor) {
    return (
      <AppLayout showSidebar={true}>
        <div className="max-w-md mx-auto py-12">
          <EmptyState
            icon={Stethoscope}
            title="Doctor Profile Not Found"
            description="The specialist profile you are looking for may have been removed or is temporarily unavailable."
            action={
              <Link to="/doctors">
                <Button variant="primary" size="md">
                  Back to Doctor Directory
                </Button>
              </Link>
            }
          />
        </div>
      </AppLayout>
    );
  }

  const starDist = doctor.star_distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const totalReviews = doctor.rating_count || 1;

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Back Link */}
        <Link
          to="/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Doctor Directory
        </Link>

        {/* ─── Profile Header Card ─── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar
              src={doctor.photo || undefined}
              name={doctor.name}
              size="xl"
              className="bg-teal-800 text-white font-bold text-2xl w-24 h-24 rounded-2xl shadow-sm"
            />

            <div className="flex-1 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900">
                      Dr. {doctor.name}
                    </h1>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        doctor.is_available
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          doctor.is_available ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`}
                      />
                      {doctor.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {doctor.qualification}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Consultation Fee
                  </span>
                  <span className="text-2xl font-extrabold text-teal-900 font-heading flex items-center sm:justify-end">
                    <IndianRupee size={20} />
                    {doctor.fee}
                  </span>
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="teal" size="md">
                  {doctor.specialty?.name || "Specialist"}
                </Badge>
                {doctor.experience > 0 && (
                  <Badge variant="neutral" size="md">
                    <Award size={13} className="mr-1 text-amber-600" />
                    {doctor.experience} Years Experience
                  </Badge>
                )}
                {doctor.registration_number && (
                  <Badge variant="info" size="md">
                    <ShieldCheck size={13} className="mr-1" />
                    Reg: {doctor.registration_number}
                  </Badge>
                )}
              </div>

              {/* Rating Summary + CTA row */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl text-amber-900 font-bold text-sm">
                    <Star size={16} className="fill-amber-400 text-amber-400" />
                    <span>{doctor.avg_rating}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Based on <strong className="text-slate-800">{doctor.rating_count}</strong> verified reviews
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    icon={MessageSquare}
                    onClick={() => setIsReviewOpen(true)}
                  >
                    Write Review
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    icon={Calendar}
                    onClick={() => setIsBookingOpen(true)}
                  >
                    Book Appointment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Details 2-Column Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: About & Reviews */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio / About */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-2">
              <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
                <Stethoscope size={18} className="text-teal-700" /> About Dr. {doctor.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {doctor.bio || "Certified medical specialist dedicated to evidence-based clinical consultations, preventative wellness, and personalized patient care."}
              </p>
            </div>

            {/* Ratings Breakdown Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
                  <Star size={18} className="text-amber-500 fill-amber-500" /> Patient Rating Breakdown
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  {doctor.rating_count} total ratings
                </span>
              </div>

              {/* 5 to 1 Star Progress Bars */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = starDist[star] || 0;
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-bold text-slate-600 flex items-center gap-1">
                        {star} <Star size={11} className="fill-amber-400 text-amber-400" />
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-medium text-slate-400 text-[11px]">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Patient Reviews Feed */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
                  <MessageSquare size={18} className="text-teal-700" /> Patient Reviews & Feedback
                </h3>
              </div>

              {isLoadingReviews ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </div>
              ) : reviewsData && reviewsData.results.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {reviewsData.results.map((rev) => (
                    <div key={rev.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                            {rev.patient_name.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            {rev.patient_name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md text-amber-800 text-[11px] font-bold">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          {rev.rating}.0
                        </div>
                      </div>

                      {rev.review_text && (
                        <p className="text-xs text-slate-600 leading-relaxed pl-9">
                          "{rev.review_text}"
                        </p>
                      )}

                      <span className="text-[10px] text-slate-400 block pl-9">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                  No written reviews yet. Be the first to share your experience after your consultation.
                </div>
              )}
            </div>
          </div>

          {/* Right 1 Col: Clinic Information Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
                <MapPin size={18} className="text-teal-700" /> Clinic & Location
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Clinic Name</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {doctor.clinic_name || "Primary Medical Consultation Center"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Address</span>
                  <span className="text-slate-600 leading-relaxed mt-0.5 block">
                    {doctor.clinic_address || `${doctor.city || "New Delhi"}, India`}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">City</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {doctor.city || "New Delhi"}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Button
                  variant="primary"
                  size="md"
                  icon={Calendar}
                  onClick={() => setIsBookingOpen(true)}
                  className="w-full"
                >
                  Schedule Appointment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Modals ─── */}
        <BookingModal
          doctor={doctor}
          open={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
        />

        <ReviewModal
          doctorId={doctor.id}
          doctorName={doctor.name}
          open={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
        />
      </div>
    </AppLayout>
  );
}
