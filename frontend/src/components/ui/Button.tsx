import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2, type LucideIcon } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  isLoading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-teal-800 text-white hover:bg-teal-900 focus-visible:ring-teal-700 shadow-sm",
  secondary:
    "bg-amber-500 text-slate-950 hover:bg-amber-600 focus-visible:ring-amber-500 shadow-sm",
  outline:
    "border border-slate-200 text-slate-800 bg-white hover:bg-slate-50 hover:border-teal-400 focus-visible:ring-teal-700",
  ghost:
    "text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-teal-700",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-xs font-bold gap-2 rounded-xl",
  lg: "h-12 px-6 text-sm font-bold gap-2.5 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      isLoading = false,
      icon: Icon,
      iconRight: IconRight,
      children,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const isBusy = loading || isLoading;
    const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;

    return (
      <button
        ref={ref}
        disabled={disabled || isBusy}
        className={`inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isBusy ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : Icon ? (
          <Icon size={iconSize} />
        ) : null}
        {children}
        {IconRight && !isBusy && <IconRight size={iconSize} />}
      </button>
    );
  }
);

Button.displayName = "Button";
