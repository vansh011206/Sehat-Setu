import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning" | "danger";

export interface ToastOptions {
  type?: ToastVariant;
  variant?: ToastVariant;
  title?: string;
  message?: string;
  description?: string;
}

interface ToastItem {
  id: number;
  title?: string;
  message: string;
  variant: "success" | "error" | "info" | "warning";
}

export interface ToastContextType {
  toast: (messageOrOptions: string | ToastOptions, variant?: ToastVariant) => void;
  addToast: (messageOrOptions: string | ToastOptions, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

const icons: Record<"success" | "error" | "info" | "warning", typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

const variantClasses: Record<"success" | "error" | "info" | "warning", string> = {
  success: "bg-emerald-700 text-white shadow-md",
  error: "bg-red-700 text-white shadow-md",
  info: "bg-teal-800 text-white shadow-md",
  warning: "bg-amber-600 text-white shadow-md",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (messageOrOptions: string | ToastOptions, variant: ToastVariant = "success") => {
      const id = ++toastId;
      let msg = "";
      let title: string | undefined;
      let rawV: ToastVariant = variant;

      if (typeof messageOrOptions === "string") {
        msg = messageOrOptions;
      } else {
        msg = messageOrOptions.message || messageOrOptions.description || "";
        title = messageOrOptions.title;
        rawV = messageOrOptions.type || messageOrOptions.variant || variant;
      }

      const v: "success" | "error" | "info" | "warning" =
        rawV === "danger" ? "error" : rawV;

      setToasts((prev) => [...prev, { id, message: msg, title, variant: v }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast, addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const Icon = icons[t.variant] || CheckCircle2;
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg border border-white/20 animate-slide-in ${variantClasses[t.variant]}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                {t.title && <p className="font-bold text-sm leading-tight mb-0.5">{t.title}</p>}
                <p className="font-medium opacity-95">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 opacity-70 hover:opacity-100 transition-opacity cursor-pointer p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
