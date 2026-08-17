import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Save, User, Mail, Calendar, AlertCircle } from "lucide-react";
import { Button, Input, Select, Card, CardContent } from "../../components/ui";
import { Avatar } from "../../components/ui/Avatar";
import { useToast } from "../../components/ui/Toast";
import { Skeleton } from "../../components/ui/Skeleton";
import { authApi } from "./api";
import { useAuthStore, type AuthUser } from "../../stores/authStore";

export function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    gender: user?.gender || "",
    date_of_birth: user?.date_of_birth || "",
  });

  const { data: doctorProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["doctorProfile"],
    queryFn: authApi.getDoctorProfile,
    enabled: user?.role === "DOCTOR",
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("full_name", form.full_name);
      formData.append("email", form.email);
      formData.append("gender", form.gender);
      if (form.date_of_birth) formData.append("date_of_birth", form.date_of_birth);
      if (selectedFile) formData.append("profile_picture", selectedFile);
      return authApi.updateMe(formData);
    },
    onSuccess: (data: AuthUser) => {
      updateUser(data);
      toast("Profile updated successfully!", "success");
      setSelectedFile(null);
    },
    onError: () => {
      toast("Failed to update profile. Please try again.", "error");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (!user) return null;

  const showDoctorBanner =
    user.role === "DOCTOR" && doctorProfile && !doctorProfile.is_profile_complete;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold font-heading text-ink">My Profile</h1>

      {/* Doctor profile completion banner */}
      {showDoctorBanner && (
        <div className="flex items-start gap-3 bg-accent/10 border border-accent/30 rounded-2xl p-4">
          <AlertCircle size={20} className="text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-ink">
              Complete Your Professional Profile
            </p>
            <p className="text-xs text-muted mt-0.5">
              Patients can find you better when your profile is fully filled in. Go to
              the registration details to complete your profile.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardContent>
          {/* Avatar upload */}
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <Avatar
                src={previewUrl || user.profile_picture}
                name={user.full_name}
                size="xl"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary-900 text-white flex items-center justify-center shadow-md hover:bg-primary-500 transition-colors cursor-pointer"
              >
                <Camera size={14} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div>
              <h2 className="text-lg font-bold font-heading text-ink">
                {user.full_name}
              </h2>
              <p className="text-sm text-muted">{user.phone}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900">
                {user.role}
              </span>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <Input
              label="Full Name"
              icon={User}
              value={form.full_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, full_name: e.target.value }))
              }
            />
            <Input
              label="Phone Number"
              icon={User}
              value={user.phone}
              disabled
            />
            <Input
              label="Email"
              type="email"
              icon={Mail}
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, gender: e.target.value }))
              }
              options={[
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" },
              ]}
              placeholder="Select gender"
            />
            <Input
              label="Date of Birth"
              type="date"
              icon={Calendar}
              value={form.date_of_birth}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date_of_birth: e.target.value }))
              }
            />
          </div>

          <Button
            className="w-full mt-6"
            icon={Save}
            loading={updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Doctor profile details (loading state) */}
      {user.role === "DOCTOR" && profileLoading && (
        <Card>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-full" variant="rect" />
            <Skeleton className="h-10 w-full" variant="rect" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
