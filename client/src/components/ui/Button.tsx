import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "icon" | "gold" | "brand";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] active:scale-[0.97]",
          variant === "primary" &&
            "bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 text-white shadow-[0_6px_24px_rgba(225,29,72,0.3)] hover:shadow-[0_10px_36px_rgba(225,29,72,0.45)] hover:brightness-110 hover:scale-[1.02] focus-visible:ring-rose-500 border border-rose-500/40",
          variant === "brand" &&
            "bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 text-white shadow-[0_8px_32px_rgba(225,29,72,0.35)] hover:shadow-[0_12px_48px_rgba(225,29,72,0.5)] hover:brightness-110 hover:scale-[1.03] focus-visible:ring-rose-500 border border-rose-400/30",
          variant === "gold" &&
            "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white shadow-[0_6px_24px_rgba(245,158,11,0.3)] hover:shadow-[0_10px_36px_rgba(245,158,11,0.45)] hover:brightness-110 hover:scale-[1.02] focus-visible:ring-amber-500 border border-amber-500/40",
          variant === "secondary" &&
            "bg-white/[0.06] text-slate-100 border border-white/[0.1] hover:border-white/[0.18] hover:bg-white/[0.1] focus-visible:ring-slate-500 backdrop-blur-sm",
          variant === "ghost" &&
            "bg-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] border border-transparent focus-visible:ring-slate-500",
          variant === "danger" &&
            "bg-red-600/90 text-white hover:bg-red-500 shadow-[0_6px_20px_rgba(239,68,68,0.35)] focus-visible:ring-red-400",
          variant === "icon" &&
            "rounded-full bg-white/[0.06] text-slate-300 border border-white/[0.1] hover:text-slate-100 hover:bg-white/[0.1] focus-visible:ring-slate-500 p-2",
          variant !== "icon" && size === "sm" && "px-3 py-1.5 text-xs gap-1.5",
          variant !== "icon" && size === "md" && "px-5 py-2.5 text-sm gap-2",
          variant !== "icon" && size === "lg" && "px-7 py-3 text-base gap-2.5",
          className
        )}
        disabled={disabled ?? loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
export { Button };
