import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />
      {/* Panel — Bottom sheet on mobile, centered card on tablet/desktop */}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-t-3xl sm:rounded-2xl shadow-modal animate-slide-up sm:animate-fade-in max-h-[90dvh] flex flex-col overflow-hidden z-10`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)" }}
      >
        {/* Mobile top drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header (sticky on scrollable bottom sheet) */}
        {title && (
          <div className="flex items-center justify-between px-5 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3 border-b border-slate-100 shrink-0 bg-white">
            <h2 className="text-base sm:text-lg font-bold font-heading text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>
        )}
        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body
  );
}
