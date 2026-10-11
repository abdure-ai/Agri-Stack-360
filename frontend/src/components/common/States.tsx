import Button from "@/components/ui/button/Button";
import { tr } from "@/i18n/core";
import { cn } from "@/utils";
import type { ReactNode } from "react";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label={tr("common.loading")}
      className={cn(
        "inline-block size-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-400",
        className,
      )}
    />
  );
}

export function LoadingState({ label = tr("common.loading"), className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      <Spinner />
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h4>
      {description && <p className="mt-1.5 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = tr("state.somethingWrong"),
  message,
  onRetry,
}: {
  title?: string;
  message?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      title={title}
      description={message}
      action={
        onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            {tr("common.retry")}
          </Button>
        )
      }
    />
  );
}
