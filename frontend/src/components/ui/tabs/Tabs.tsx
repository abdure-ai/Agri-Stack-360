import { cn } from "@/utils";
import type { ReactNode } from "react";

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** "segmented" = template ChartTab pill group; "underline" = page-level tabs. */
  variant?: "segmented" | "underline";
  className?: string;
  "aria-label"?: string;
}

export default function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  variant = "segmented",
  className,
  ...aria
}: TabsProps<T>) {
  if (variant === "underline") {
    return (
      <div role="tablist" className={cn("flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800", className)} {...aria}>
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={value === t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              value === t.id
                ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={cn("inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900", className)}
      {...aria}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-theme-sm font-medium whitespace-nowrap transition-colors",
            value === t.id
              ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
