import { api } from "@/api/client";
import Card from "@/components/common/Card";
import DemoDataNotice from "@/components/common/DemoDataNotice";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import type { CreditProfile, LoanProduct } from "@/types/api";
import { formatNumber } from "@/utils/formatters";
import { Gauge, HandCoins, Landmark, ListChecks } from "lucide-react";
import { useNavigate } from "react-router";
import FactorList from "@/components/financial/FactorList";

function band(score: number) {
  if (score >= 75) return { label: tr("fin.band.strong"), color: "#12b76a", text: "text-success-600 dark:text-success-500" };
  if (score >= 60) return { label: tr("fin.band.good"), color: "#1f8a57", text: "text-brand-600 dark:text-brand-400" };
  if (score >= 45) return { label: tr("fin.band.fair"), color: "#f79009", text: "text-warning-600 dark:text-warning-400" };
  return { label: tr("fin.band.needsWork"), color: "#f04438", text: "text-error-600 dark:text-error-500" };
}

/** Steps a user can take, based on which score factors are missing. */
function improvementTips(profile: CreditProfile): string[] {
  const have = new Set((profile.positive_factors ?? []).map((f) => f.code ?? f.label));
  const tips: string[] = [];
  if (!have.has("farm_records")) tips.push(tr("fin.tip.farms"));
  if (!have.has("region")) tips.push(tr("fin.tip.region"));
  if (!have.has("zone")) tips.push(tr("fin.tip.zone"));
  if (!have.has("farm_scale") && !have.has("smallholder")) tips.push(tr("fin.tip.size"));
  if ((profile.risk_factors ?? []).length) tips.push(tr("fin.tip.resolve"));
  if (!have.has("track_record")) tips.push(tr("fin.tip.track"));
  return tips;
}

export default function Financial() {
  const navigate = useNavigate();
  const profile = useAsync(() => api.creditProfile(), []);
  const loans = useAsync(() => api.loanProducts(), []);

  return (
    <>
      <PageMeta title={`${tr("nav.financial")} | ${tr("app.name")}`} description={tr("fin.meta")} />
      <PageHeader title={tr("nav.financial")} description={tr("fin.description")} />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-5">
          <Card className="h-full" accent="violet" icon={<Gauge className="size-5" />} title={tr("fin.yourScore")}>
            {profile.loading ? (
              <LoadingState label={tr("fin.calculating")} />
            ) : profile.error || !profile.data ? (
              <ErrorState message={profile.error} onRetry={profile.reload} />
            ) : (
              <ScorePanel profile={profile.data} onImprove={() => navigate("/profile")} />
            )}
          </Card>
        </div>

        <div className="col-span-12 space-y-4 md:space-y-6 xl:col-span-7">
          {loans.data?.demo_data && <DemoDataNotice message="demo.message.loans" />}
          {profile.data && (
            <Card accent="blue" icon={<ListChecks className="size-5" />} title={tr("fin.whatAffects")}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FactorList title={tr("fin.helping")} factors={profile.data.positive_factors ?? []} positive />
                <FactorList title={tr("fin.holdingBack")} factors={profile.data.risk_factors ?? []} />
              </div>
            </Card>
          )}

          <Card accent="green" icon={<HandCoins className="size-5" />} title={tr("fin.loans")} description={tr("fin.loansHint")}>
            {loans.loading ? (
              <LoadingState label={tr("fin.findingLoans")} />
            ) : loans.error ? (
              <ErrorState message={loans.error} onRetry={loans.reload} />
            ) : !loans.data?.matched?.length ? (
              <EmptyState title={tr("fin.noLoans")} description={tr("fin.noLoansHint")} />
            ) : (
              <div className="space-y-3">
                {loans.data.matched.map((l) => (
                  <LoanRow key={l.id} loan={l} />
                ))}
              </div>
            )}
          </Card>

          {!!loans.data?.ineligible?.length && (
            <Card accent="amber" icon={<Landmark className="size-5" />} title={tr("fin.notYet")}>
              <div className="space-y-3">
                {loans.data.ineligible.map((l) => (
                  <LoanRow key={l.id} loan={l} muted />
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function ScorePanel({ profile, onImprove }: { profile: CreditProfile; onImprove: () => void }) {
  const b = band(profile.score);
  const r = 70;
  const circ = 2 * Math.PI * r;
  const tips = improvementTips(profile);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 180 180" className="size-48" role="img" aria-label={tr("fin.scoreAria", { score: profile.score })}>
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--chart-grid)" strokeWidth="14" />
          <circle
            cx="90"
            cy="90"
            r={r}
            fill="none"
            stroke={b.color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${(profile.score / 100) * circ} ${circ}`}
            transform="rotate(-90 90 90)"
          />
          <text x="90" y="88" textAnchor="middle" className="fill-gray-800 text-4xl font-bold dark:fill-white/90">
            {profile.score}
          </text>
          <text x="90" y="112" textAnchor="middle" className="fill-gray-500 text-xs">
            {tr("fin.outOf100")}
          </text>
        </svg>
        <p className={`mt-2 text-lg font-semibold ${b.text}`}>{b.label}</p>
      </div>

      {profile.ai_explanation && <p className="text-sm text-gray-600 dark:text-gray-400">{profile.ai_explanation}</p>}

      {tips.length > 0 && (
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
          <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">{tr("fin.raise")}</h4>
          <ul className="space-y-1.5">
            {tips.map((t) => (
              <li key={t} className="flex gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
          <Button size="xs" variant="outline" className="mt-4" onClick={onImprove}>
            {tr("fin.updateProfile")}
          </Button>
        </div>
      )}
    </div>
  );
}

function LoanRow({ loan, muted }: { loan: LoanProduct; muted?: boolean }) {
  const reason =
    loan.match_status === "ineligible_role"
      ? tr("fin.notForRole")
      : loan.match_status === "score_too_low"
        ? tr("fin.needsPoints", { n: loan.score_gap })
        : null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
      <div className="min-w-0">
        <p className={muted ? "font-medium text-gray-500 dark:text-gray-400" : "font-medium text-gray-800 dark:text-white/90"}>
          {loan.product_name}
        </p>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">{loan.lender}</p>
        {reason && (
          <div className="mt-1.5">
            <Badge size="sm" color="warning">
              {reason}
            </Badge>
          </div>
        )}
      </div>
      <dl className="grid shrink-0 grid-cols-3 gap-4 text-theme-xs sm:text-end">
        <div>
          <dt className="text-gray-500 dark:text-gray-400">{tr("fin.upTo")}</dt>
          <dd className="font-semibold text-gray-800 dark:text-white/90">
            {loan.max_amount != null ? `${formatNumber(loan.max_amount)} ${tr("unit.etb")}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">{tr("fin.interest")}</dt>
          <dd className="font-semibold text-gray-800 dark:text-white/90">{tr("fin.perYear", { rate: loan.interest_rate })}</dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">{loan.term_months ? tr("fin.months", { n: loan.term_months }) : tr("fin.monthly")}</dt>
          <dd className="font-semibold text-gray-800 dark:text-white/90">
            {loan.monthly_payment != null ? `${formatNumber(loan.monthly_payment)} ${tr("unit.etb")}` : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
