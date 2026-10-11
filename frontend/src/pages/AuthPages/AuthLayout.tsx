import GridShape from "@/components/common/GridShape";
import Logo from "@/components/common/Logo";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import LanguageSwitcher from "@/components/header/LanguageSwitcher";
import { tr, type MessageKey } from "@/i18n/core";
import type { ReactNode } from "react";

const POINTS: MessageKey[] = ["auth.point1", "auth.point2", "auth.point3"];

/** Two-column auth shell: form on the left, brand panel on the right. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-1 bg-white p-6 sm:p-0 dark:bg-gray-900">
      <div className="relative flex min-h-screen w-full flex-col justify-center sm:p-0 lg:flex-row dark:bg-gray-900">
        <div className="flex w-full flex-1 flex-col lg:w-1/2">{children}</div>

        <div className="relative hidden h-screen w-full items-center bg-brand-950 lg:sticky lg:top-0 lg:grid lg:w-1/2 dark:bg-white/5">
          <div className="relative z-1 flex items-center justify-center">
            <GridShape />
            <div className="flex max-w-sm flex-col items-center px-6">
              <Logo inverted size="lg" className="mb-6" />
              <p className="text-center text-gray-400 dark:text-white/60">
                {tr("auth.tagline")}
              </p>
              <ul className="mt-8 space-y-3">
                {POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-gray-300 dark:text-white/70">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-400" aria-hidden="true" />
                    {tr(p)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="absolute inset-e-6 top-6 z-50">
          <LanguageSwitcher />
        </div>

        <div className="fixed inset-e-6 bottom-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
