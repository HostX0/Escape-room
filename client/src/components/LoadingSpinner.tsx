import { cn } from "../lib/utils";

export function LoadingSpinner({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeMap = { sm: "h-5 w-5", md: "h-10 w-10", lg: "h-14 w-14" };
  const padMap = { sm: "p-2", md: "p-8", lg: "p-12" };
  return (
    <div className={cn("flex items-center justify-center", padMap[size], className)}>
      <svg
        className={cn("animate-spin text-amber-400 drop-shadow-[0_0_18px_rgba(245,158,11,0.8)]", sizeMap[size])}
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}
