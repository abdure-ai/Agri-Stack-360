import type { ReactNode } from "react";
import { tr } from "@/i18n/core";
import { Link } from "react-router";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-hand side; when omitted a Home › Title breadcrumb is shown. */
  actions?: ReactNode;
  /** Plain-text title for the breadcrumb when `title` is not a string. */
  crumb?: string;
}

export default function PageHeader({ title, description, actions, crumb }: PageHeaderProps) {
  const crumbText = crumb ?? (typeof title === "string" ? title : "");
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : (
        crumbText && (
          <nav aria-label={tr("common.breadcrumb")}>
            <ol className="flex items-center gap-1.5">
              <li>
                <Link className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400" to="/dashboard">
                  {tr("common.home")}
                  <svg className="stroke-current rtl:rotate-180" width="17" height="16" viewBox="0 0 17 16" fill="none" aria-hidden="true">
                    <path d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366" stroke="" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
              <li className="text-sm text-gray-800 dark:text-white/90">{crumbText}</li>
            </ol>
          </nav>
        )
      )}
    </div>
  );
}
