import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { LogIn, Phone, Lock, Zap } from "lucide-react";
import { Button, Input, Card } from "../../components/ui";
import { useToast } from "../../components/ui/Toast";
import { authApi } from "./api";
import { useAuthStore } from "../../stores/authStore";
import type { AxiosError } from "axios";

const DEMO_ACCOUNTS = [
  { label: "Patient", phone: "+919876543211", password: "Demo@1234" },
  { label: "Doctor", phone: "+919876543212", password: "Demo@1234" },
  { label: "Admin", phone: "+919876543210", password: "Demo@1234" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({ phone_or_email: "", password: "" });
  const [error, setError] = useState("");

  const rawFrom = (location.state as { from?: string })?.from;
  const from =
    rawFrom && rawFrom !== "/login" && rawFrom !== "/register"
      ? rawFrom
      : "/dashboard";

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(form),
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
      toast("Welcome back!", "success");
      const dest = data.user.role === "ADMIN" ? "/admin/users" : from;
      navigate(dest, { replace: true });
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      if (!err.response || err.code === "ERR_NETWORK" || err.message?.includes("Network Error")) {
        setError(
          "Backend server is offline or unreachable on http://localhost:8000. Please start the backend server."
        );
      } else if (err.response?.status === 429) {
        setError("Too many login attempts. Please wait a few minutes and try again.");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Invalid credentials. Please check your phone/email and password.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.phone_or_email || !form.password) {
      setError("Both fields are required.");
      return;
    }
    loginMutation.mutate();
  };

  const fillDemo = (phone: string, password: string) => {
    setForm({ phone_or_email: phone, password });
    setError("");
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold font-heading text-slate-900">Welcome Back</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sign in to your SehatSetu account
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Phone or Email"
            placeholder="+919876543211 or user@email.com"
            icon={Phone}
            value={form.phone_or_email}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, phone_or_email: e.target.value }));
              setError("");
            }}
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            type="password"
            icon={Lock}
            value={form.password}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, password: e.target.value }));
              setError("");
            }}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3 font-medium leading-relaxed">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="button"
              disabled
              className="text-xs text-slate-400 cursor-not-allowed"
            >
              Forgot Password?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={loginMutation.isPending}
            icon={LogIn}
          >
            Sign In
          </Button>
        </form>

        {/* Demo accounts */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center mb-3 flex items-center justify-center gap-1.5 font-medium">
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            Quick Demo Login (1-Click Auto Fill)
          </p>
          <div className="flex gap-2">
            {DEMO_ACCOUNTS.map((demo) => (
              <Button
                key={demo.label}
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => fillDemo(demo.phone, demo.password)}
              >
                {demo.label}
              </Button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-teal-800 font-bold hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </Card>
    </div>
  );
}
