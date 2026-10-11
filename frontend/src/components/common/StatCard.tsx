import { cn } from "@/utils";
import { ACCENTS, type Accent } from "@/utils/accents";
import type { ReactNode } from "react";

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  /** Small line under the value; can hold a Badge. */
  footer?: ReactNode;
  /** Colour emphasis for the value. */
  tone?: "default" | "success" | "warning" | "error";
  /** Colour theme for the card: tinted background, icon tile and top strip. */
  accent?: Accent;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

const TONES = {
  default: "text-gray-800 dark:text-white/90",
  success: "text-success-600 dark:text-success-500",
  warning: "text-warning-600 dark:text-warning-400",
  error: "text-error-600 dark:text-error-500",
};

/** Metric tile in the template's EcommerceMetrics style, optionally colour-accented. */
export default function StatCard({ label, value, icon, footer, tone = "default", accent, loading, className, onClick }: StatCardProps) {
  const a = accent ? ACCENTS[accent] : null;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 md:p-6",
        a ? [a.surface, a.border] : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]",
        onClick && "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-theme-md",
        className,
      )}
      onClick={onClick}
    >
      {a && <span className={cn("absolute inset-x-0 top-0 h-1", a.bar)} aria-hidden="true" />}
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        {icon && (
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              a ? a.tile : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-28 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      ) : (
        <h4 className={cn("mt-1 text-title-sm font-bold", TONES[tone])}>{value}</h4>
      )}
      {footer && !loading && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">{footer}</div>
      )}
    </div>
  );
}
