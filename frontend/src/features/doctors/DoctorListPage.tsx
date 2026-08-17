import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Calendar,
  Filter,
  IndianRupee,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  Stethoscope,
  X,
} from "lucide-react";
import type { DoctorListItem } from "./api";
import { doctorsApi } from "./api";
import { SpecialtyIcon } from "./SpecialtyIcon";
import { BookingModal } from "../bookings/BookingModal";
import { AppLayout } from "../../layouts/AppLayout";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Skeleton } from "../../components/ui/Skeleton";

const CITIES = [
  { value: "", label: "All Cities" },
  { value: "New Delhi", label: "New Delhi" },
  { value: "Bengaluru", label: "Bengaluru" },
  { value: "Mumbai", label: "Mumbai" },
  { value: "Hyderabad", label: "Hyderabad" },
  { value: "Chennai", label: "Chennai" },
  { value: "Kolkata", label: "Kolkata" },
  { value: "Pune", label: "Pune" },
];

const SORT_OPTIONS = [
  { value: "rating", label: "Highest Rated" },
  { value: "fee_asc", label: "Fee: Low to High" },
  { value: "fee_desc", label: "Fee: High to Low" },
  { value: "experience", label: "Most Experienced" },
];

export function DoctorListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search input with 400ms debounce
  const initialSearch = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  // Filters from URL
  const selectedSpecialty = searchParams.get("specialty") || "";
  const selectedCity = searchParams.get("city") || "";
  const selectedRating = searchParams.get("min_rating") || "";
  const selectedMaxFee = searchParams.get("max_fee") || "";
  const selectedSort = (searchParams.get("sort") as any) || "rating";

  // Mobile filters toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Booking modal target
  const [bookingDoctor, setBookingDoctor] = useState<DoctorListItem | null>(null);

  // Debounce search query by 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      updateFilter("search", searchInput || null);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "" && value !== "0") {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete("page"); // reset page on filter change
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSearchParams({});
  };

  // Fetch specialties (cached 5 mins)
  const { data: specialties = [] } = useQuery({
    queryKey: ["specialties"],
    queryFn: doctorsApi.getSpecialties,
    staleTime: 5 * 60 * 1000,
  });

  // Query doctors directory keyed by full filter state
  const filterParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      specialty: selectedSpecialty || undefined,
      city: selectedCity || undefined,
      min_rating: selectedRating ? Number(selectedRating) : undefined,
      max_fee: selectedMaxFee ? Number(selectedMaxFee) : undefined,
      sort: selectedSort,
    }),
    [
      debouncedSearch,
      selectedSpecialty,
      selectedCity,
      selectedRating,
      selectedMaxFee,
      selectedSort,
    ]
  );

  const {
    data: doctorData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["doctors", filterParams],
    queryFn: () => doctorsApi.getDoctors(filterParams),
  });

  const doctors = doctorData?.results || [];
  const totalCount = doctorData?.count || 0;

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      selectedSpecialty ||
      selectedCity ||
      selectedRating ||
      selectedMaxFee
  );

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-6">
        {/* ─── Page Title Banner ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900">
              Find & Book Doctors
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Consult certified medical specialists for video sessions or clinic visits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={SlidersHorizontal}
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden"
            >
              Filters {hasActiveFilters && "(Active)"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={() => refetch()}
              className={isFetching ? "animate-spin" : ""}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* ─── Specialty Quick Filter Chips ─── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => updateFilter("specialty", null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 shrink-0 ${
              !selectedSpecialty
                ? "bg-teal-800 text-white border-teal-800 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"
            }`}
          >
            <Stethoscope size={14} />
            All Specialties
          </button>

          {specialties.map((spec) => {
            const isSelected = selectedSpecialty === spec.slug;
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => updateFilter("specialty", isSelected ? null : spec.slug)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? "bg-teal-800 text-white border-teal-800 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"
                }`}
              >
                <SpecialtyIcon iconName={spec.icon_name} size={14} />
                {spec.name}
                {spec.doctor_count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? "bg-teal-700 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {spec.doctor_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Main Content Grid: Sidebar + List ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ─── Filter Sidebar (Desktop / Collapsible Mobile) ─── */}
          <div
            className={`lg:col-span-1 space-y-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs self-start lg:sticky lg:top-24 ${
              showMobileFilters ? "block" : "hidden lg:block"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Filter size={14} className="text-teal-700" /> Filter Directory
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] font-bold text-teal-800 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* City select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Location / City</label>
              <Select
                options={CITIES}
                value={selectedCity}
                onChange={(e) => updateFilter("city", e.target.value)}
              />
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Minimum Rating</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: "", label: "Any" },
                  { value: "4.0", label: "4.0+" },
                  { value: "4.5", label: "4.5+" },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => updateFilter("min_rating", r.value || null)}
                    className={`py-1.5 text-xs rounded-xl font-bold border transition-all flex items-center justify-center gap-1 ${
                      selectedRating === r.value
                        ? "bg-teal-800 text-white border-teal-800 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"
                    }`}
                  >
                    {r.value && <Star size={12} className="fill-amber-400 text-amber-400" />}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Fee Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Max Fee (INR)</label>
                <span className="text-xs font-bold text-teal-800">
                  {selectedMaxFee ? `≤ ₹${selectedMaxFee}` : "Any Fee"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: "", label: "Any" },
                  { value: "500", label: "Up to ₹500" },
                  { value: "800", label: "Up to ₹800" },
                  { value: "1200", label: "Up to ₹1200" },
                ].map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => updateFilter("max_fee", f.value || null)}
                    className={`py-1.5 text-xs rounded-xl font-semibold border transition-all ${
                      selectedMaxFee === f.value
                        ? "bg-teal-800 text-white border-teal-800 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Doctors List Stream ─── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Top controls: Search & Sort */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search doctor name, specialty, or condition..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  icon={Search}
                  className="bg-slate-50 border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Sort:</span>
                <Select
                  options={SORT_OPTIONS}
                  value={selectedSort}
                  onChange={(e) => updateFilter("sort", e.target.value)}
                  className="w-44 text-xs"
                />
              </div>
            </div>

            {/* Active Filters Pills */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-500 font-semibold">Active Filters:</span>
                {debouncedSearch && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-900 border border-teal-200">
                    "{debouncedSearch}"
                    <button onClick={() => setSearchInput("")}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedSpecialty && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-900 border border-teal-200">
                    Specialty: {selectedSpecialty}
                    <button onClick={() => updateFilter("specialty", null)}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedCity && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-900 border border-teal-200">
                    City: {selectedCity}
                    <button onClick={() => updateFilter("city", null)}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedRating && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-900 border border-teal-200">
                    {selectedRating}+ Stars
                    <button onClick={() => updateFilter("min_rating", null)}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedMaxFee && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-900 border border-teal-200">
                    Fee ≤ ₹{selectedMaxFee}
                    <button onClick={() => updateFilter("max_fee", null)}>
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Result count */}
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{doctors.length}</span> of{" "}
              <span className="font-bold text-slate-800">{totalCount}</span> verified specialists
            </div>

            {/* Doctor Cards Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 rounded-2xl" />
                ))}
              </div>
            ) : doctors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top row: Avatar + Name + Rating */}
                      <div className="flex items-start gap-3.5 mb-3">
                        <Avatar
                          src={doc.photo || undefined}
                          name={doc.name}
                          size="lg"
                          className="bg-teal-800 text-white font-bold"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="text-base font-bold font-heading text-slate-900 truncate">
                              Dr. {doc.name}
                            </h3>
                            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-bold text-amber-800 shrink-0">
                              <Star size={13} className="fill-amber-400 text-amber-400" />
                              <span>{doc.avg_rating}</span>
                              <span className="text-[10px] text-amber-600 font-normal">
                                ({doc.rating_count})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge variant="teal" size="sm">
                              {doc.specialty?.name || "Specialist"}
                            </Badge>
                            {doc.experience > 0 && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                {doc.experience} yrs exp
                              </span>
                            )}
                          </div>

                          {doc.qualification && (
                            <p className="text-xs text-slate-400 mt-1 truncate">
                              {doc.qualification}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Clinic & Location info */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1 mb-4">
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin size={13} className="text-teal-700 shrink-0" />
                          <span className="font-semibold text-slate-800">{doc.city || "Online"}</span>
                          {doc.clinic_name && <span className="text-slate-400">• {doc.clinic_name}</span>}
                        </p>
                      </div>
                    </div>

                    {/* Footer: Fee + Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Consultation Fee
                        </span>
                        <span className="text-base font-extrabold text-teal-900 font-heading flex items-center">
                          <IndianRupee size={15} />
                          {doc.fee}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link to={`/doctors/${doc.id}`}>
                          <Button variant="outline" size="sm">
                            Profile
                          </Button>
                        </Link>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Calendar}
                          onClick={() => setBookingDoctor(doc)}
                        >
                          Book Slot
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Stethoscope}
                title="No Doctors Match Your Filters"
                description="Try adjusting your search keywords, broadening your price range, or selecting a different city."
                action={
                  <Button variant="primary" size="sm" onClick={clearAllFilters}>
                    Clear All Filters
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* ─── 3-Step Booking Modal ─── */}
        {bookingDoctor && (
          <BookingModal
            doctor={bookingDoctor}
            open={!!bookingDoctor}
            onClose={() => setBookingDoctor(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}
