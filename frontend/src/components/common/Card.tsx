import { cn } from "@/utils";
import { ACCENTS, type Accent } from "@/utils/accents";
import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Right side of the header row (buttons, badges). */
  actions?: ReactNode;
  /** Icon shown in a coloured tile next to the title (uses `accent`). */
  icon?: ReactNode;
  /** Colour theme: a strip along the top and the icon tile colour. */
  accent?: Accent;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  onClick?: () => void;
}

/** Template card: rounded-2xl, bordered, white / translucent in dark mode. */
export default function Card({ title, description, actions, icon, accent, children, className, bodyClassName, onClick }: CardProps) {
  const hasHeader = title || description || actions;
  const a = accent ? ACCENTS[accent] : null;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]",
        onClick && "cursor-pointer transition hover:border-brand-300 dark:hover:border-brand-800",
        className,
      )}
      onClick={onClick}
    >
      {a && <span className={cn("absolute inset-x-0 top-0 h-1", a.bar)} aria-hidden="true" />}
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  a ? a.tile : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                )}
                aria-hidden="true"
              >
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>}
              {description && <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-5 sm:p-6", hasHeader && "pt-4 sm:pt-4", bodyClassName)}>{children}</div>
    </div>
  );
}
