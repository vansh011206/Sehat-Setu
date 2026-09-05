import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  UserPlus,
  Stethoscope,
  HeartPulse,
  Phone,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Award,
  MapPin,
  IndianRupee,
  Building2,
  FileText,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { Button, Input, Card } from "../../components/ui";
import { useToast } from "../../components/ui/Toast";
import { authApi, type RegisterPayload } from "./api";
import { doctorsApi } from "../doctors/api";
import { useAuthStore } from "../../stores/authStore";

type Role = "PATIENT" | "DOCTOR";

interface FormErrors {
  [key: string]: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>("PATIENT");
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    confirm_password: "",
    // Doctor fields
    specialty_id: "",
    specialty_name: "",
    qualification: "",
    years_of_experience: "",
    registration_number: "",
    bio: "",
    city: "",
    consultation_fee: "500",
    clinic_name: "",
    clinic_address: "",
  });

  // Fetch available specialties from backend
  const { data: specialties } = useQuery({
    queryKey: ["specialties"],
    queryFn: doctorsApi.getSpecialties,
    staleTime: 60000,
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep1 = (): boolean => {
    const errs: FormErrors = {};
    if (!form.full_name.trim()) errs.full_name = "Full name is required";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    else if (!/^\+91\d{10}$/.test(form.phone))
      errs.phone = "Phone must be in +91XXXXXXXXXX format";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email format";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 8)
      errs.password = "Password must be at least 8 characters";
    else if (!/[A-Za-z]/.test(form.password))
      errs.password = "Password must contain at least one letter";
    else if (!/\d/.test(form.password))
      errs.password = "Password must contain at least one number";
    if (form.password !== form.confirm_password)
      errs.confirm_password = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const registerMutation = useMutation({
    mutationFn: (data: RegisterPayload) => authApi.register(data),
    onSuccess: (data) => {
      const access =
        data.access ||
        (data as unknown as { tokens?: { access?: string } })?.tokens
          ?.access ||
        "";
      const refresh =
        data.refresh ||
        (data as unknown as { tokens?: { refresh?: string } })?.tokens
          ?.refresh ||
        "";

      setAuth(data.user, access, refresh);
      toast("Account created successfully!", "success");
      if (data.user.role === "DOCTOR") {
        navigate("/profile");
      } else {
        navigate("/dashboard");
      }
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: Record<string, any> } };
      if (err.response?.data) {
        const apiErrors: FormErrors = {};
        let firstMsg = "";
        Object.entries(err.response.data).forEach(([key, value]) => {
          const msg = Array.isArray(value) ? value[0] : String(value);
          apiErrors[key] = msg;
          if (!firstMsg) firstMsg = `${key.replace(/_/g, " ")}: ${msg}`;
        });
        setErrors(apiErrors);
        toast(firstMsg || "Registration failed. Please check form errors.", "error");
      } else {
        toast("Registration failed. Please try again.", "error");
      }
    },
  });

  const handleStep1Next = () => {
    if (validateStep1()) {
      if (role === "DOCTOR") {
        setStep(2);
      } else {
        registerMutation.mutate({
          full_name: form.full_name,
          phone: form.phone,
          email: form.email || undefined,
          password: form.password,
          confirm_password: form.confirm_password,
          role,
        });
      }
    }
  };

  const handleStep2Submit = () => {
    registerMutation.mutate({
      full_name: form.full_name,
      phone: form.phone,
      email: form.email || undefined,
      password: form.password,
      confirm_password: form.confirm_password,
      role,
      specialty_id: form.specialty_id ? Number(form.specialty_id) : undefined,
      specialty_name: form.specialty_name || undefined,
      qualification: form.qualification || undefined,
      years_of_experience: form.years_of_experience ? Number(form.years_of_experience) : 0,
      registration_number: form.registration_number || undefined,
      bio: form.bio || undefined,
      city: form.city || undefined,
      consultation_fee: form.consultation_fee ? Number(form.consultation_fee) : 500,
      clinic_name: form.clinic_name || undefined,
      clinic_address: form.clinic_address || undefined,
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold font-heading text-ink">
          Create Your Account
        </h1>
        <p className="text-sm text-muted mt-1">
          {step === 1
            ? "Join SehatSetu to access quality healthcare"
            : "Complete your professional profile"}
        </p>
      </div>

      {/* Step indicator */}
      {role === "DOCTOR" && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 1
                ? "bg-primary-900 text-white"
                : "bg-border text-muted"
            }`}
          >
            1
          </div>
          <div
            className={`w-12 h-0.5 ${
              step >= 2 ? "bg-primary-900" : "bg-border"
            }`}
          />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 2
                ? "bg-primary-900 text-white"
                : "bg-border text-muted"
            }`}
          >
            2
          </div>
        </div>
      )}

      <Card className="p-6">
        {step === 1 ? (
          <div className="space-y-4">
            {/* Role picker */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("PATIENT")}
                  className={`p-4 rounded-xl border-2 text-center transition-all duration-200 cursor-pointer ${
                    role === "PATIENT"
                      ? "border-primary-900 bg-primary-50"
                      : "border-border hover:border-muted"
                  }`}
                >
                  <HeartPulse
                    size={24}
                    className={`mx-auto mb-2 ${
                      role === "PATIENT" ? "text-primary-900" : "text-muted"
                    }`}
                  />
                  <p
                    className={`text-sm font-semibold ${
                      role === "PATIENT" ? "text-primary-900" : "text-ink"
                    }`}
                  >
                    Patient
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("DOCTOR")}
                  className={`p-4 rounded-xl border-2 text-center transition-all duration-200 cursor-pointer ${
                    role === "DOCTOR"
                      ? "border-primary-900 bg-primary-50"
                      : "border-border hover:border-muted"
                  }`}
                >
                  <Stethoscope
                    size={24}
                    className={`mx-auto mb-2 ${
                      role === "DOCTOR" ? "text-primary-900" : "text-muted"
                    }`}
                  />
                  <p
                    className={`text-sm font-semibold ${
                      role === "DOCTOR" ? "text-primary-900" : "text-ink"
                    }`}
                  >
                    Doctor
                  </p>
                </button>
              </div>
            </div>

            <Input
              label="Full Name"
              placeholder="Enter your full name"
              icon={User}
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              error={errors.full_name}
            />
            <Input
              label="Phone Number"
              placeholder="+919876543210"
              icon={Phone}
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              error={errors.phone}
            />
            <Input
              label="Email (optional)"
              placeholder="you@example.com"
              type="email"
              icon={Mail}
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              error={errors.email}
            />
            <Input
              label="Password"
              placeholder="Minimum 8 characters"
              type="password"
              icon={Lock}
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              error={errors.password}
            />
            <Input
              label="Confirm Password"
              placeholder="Re-enter password"
              type="password"
              icon={Lock}
              value={form.confirm_password}
              onChange={(e) => updateField("confirm_password", e.target.value)}
              error={errors.confirm_password}
            />

            <Button
              className="w-full"
              size="lg"
              onClick={handleStep1Next}
              loading={role === "PATIENT" && registerMutation.isPending}
              iconRight={ArrowRight}
            >
              {role === "DOCTOR" ? "Continue" : "Create Account"}
            </Button>

            <p className="text-center text-sm text-muted">
              Already have an account?{" "}
              <a href="/login" className="text-primary-900 font-semibold hover:underline">
                Sign In
              </a>
            </p>
          </div>
        ) : (
          /* Step 2 — Doctor Details */
          <div className="space-y-4">
            {/* Category / Specialty Dropdown with suggestions */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5 flex items-center justify-between">
                <span>Medical Specialty / Category</span>
                <span className="text-[11px] text-teal-800 font-semibold">e.g. Cardiologist, Sexologist</span>
              </label>

              <div className="relative">
                <select
                  value={form.specialty_id || form.specialty_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = (specialties || []).find((s) => String(s.id) === val || s.name.toLowerCase() === val.toLowerCase());
                    if (matched) {
                      setForm((prev) => ({ ...prev, specialty_id: String(matched.id), specialty_name: matched.name }));
                    } else {
                      setForm((prev) => ({ ...prev, specialty_id: "", specialty_name: val }));
                    }
                  }}
                  className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-border bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent cursor-pointer font-medium"
                >
                  <option value="">Select Specialty / Category...</option>
                  {(specialties || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="Sexologist">Sexologist / Sexual Health</option>
                  <option value="Cardiologist">Cardiologist / Heart Specialist</option>
                  <option value="Dermatologist">Dermatologist / Skin Specialist</option>
                  <option value="Pediatrician">Pediatrician / Child Specialist</option>
                  <option value="Orthopedic Surgeon">Orthopedic Surgeon / Bone & Joint</option>
                  <option value="Gynecologist">Gynecologist & Obstetrician</option>
                  <option value="General Physician">General Physician / Internal Medicine</option>
                  <option value="Psychiatrist">Psychiatrist / Mental Health</option>
                  <option value="ENT Specialist">ENT Specialist / Otolaryngologist</option>
                  <option value="Neurologist">Neurologist / Brain & Nerve</option>
                </select>
              </div>

              {/* Quick suggestion pills */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[11px] text-muted font-medium flex items-center gap-1">
                  <Sparkles size={11} className="text-teal-700" /> Suggestions:
                </span>
                {["Cardiology", "Sexologist", "Dermatology", "Pediatrics", "Gynecology"].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      const matched = (specialties || []).find((s) => s.name.toLowerCase() === name.toLowerCase());
                      if (matched) {
                        setForm((prev) => ({ ...prev, specialty_id: String(matched.id), specialty_name: matched.name }));
                      } else {
                        setForm((prev) => ({ ...prev, specialty_id: "", specialty_name: name }));
                      }
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer font-medium ${
                      form.specialty_name.toLowerCase() === name.toLowerCase() ||
                      form.specialty_id === String((specialties || []).find((s) => s.name.toLowerCase() === name.toLowerCase())?.id)
                        ? "bg-teal-700 text-white border-teal-700 shadow-2xs"
                        : "bg-slate-100/80 text-slate-700 border-slate-200 hover:border-teal-400"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Qualification"
              placeholder="e.g., MD Cardiology, AIIMS Delhi"
              icon={Award}
              value={form.qualification}
              onChange={(e) => updateField("qualification", e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Years of Experience"
                placeholder="e.g., 10"
                type="number"
                icon={Briefcase}
                value={form.years_of_experience}
                onChange={(e) => updateField("years_of_experience", e.target.value)}
              />
              <Input
                label="Registration No."
                placeholder="MCI-XXXX"
                icon={FileText}
                value={form.registration_number}
                onChange={(e) => updateField("registration_number", e.target.value)}
              />
            </div>
            <Input
              label="City"
              placeholder="e.g., New Delhi"
              icon={MapPin}
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
            <Input
              label="Consultation Fee (INR)"
              placeholder="e.g., 500"
              type="number"
              icon={IndianRupee}
              value={form.consultation_fee}
              onChange={(e) => updateField("consultation_fee", e.target.value)}
            />
            <Input
              label="Clinic Name"
              placeholder="e.g., HeartCare Clinic"
              icon={Building2}
              value={form.clinic_name}
              onChange={(e) => updateField("clinic_name", e.target.value)}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto min-h-[44px]"
                onClick={() => setStep(1)}
                icon={ArrowLeft}
              >
                Back
              </Button>
              <Button
                className="flex-1 min-h-[44px]"
                onClick={handleStep2Submit}
                loading={registerMutation.isPending}
                icon={UserPlus}
              >
                Create Account
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
