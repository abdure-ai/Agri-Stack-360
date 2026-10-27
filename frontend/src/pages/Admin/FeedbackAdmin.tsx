import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import StatCard from "@/components/common/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import {
  FEEDBACK_STATUSES,
  INTEREST_LABELS,
  INTERESTS,
  LIKED_LABELS,
  VISITOR_TYPE_LABELS,
  VISITOR_TYPES,
  type FeedbackFilters,
  type FeedbackItem,
  type FeedbackStatus,
} from "@/types/feedback";
import { formatDateTime } from "@/utils/formatters";
import { Download, MessageSquareHeart, Star } from "lucide-react";
import { useState } from "react";

const STATUS_COLOR = { new: "warning", contacted: "info", closed: "light" } as const;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

/** Top entries of a tally as "Label (n)". */
function topList(tally: Record<string, number>, labels: Record<string, string>, n = 3): string {
  const entries = Object.entries(tally).slice(0, n);
  return entries.length ? entries.map(([k, v]) => `${labelOf(labels, k)} (${v})`).join(", ") : "—";
}

/** Admin view of the public website feedback (/feedback): summary, filters, follow-up status, notes, CSV. */
export default function FeedbackAdmin() {
  const [filters, setFilters] = useState<FeedbackFilters>({});
  const key = JSON.stringify(filters);
  const list = useAsync(() => api.adminFeedback(filters), [key]);
  const summary = useAsync(() => api.adminFeedbackSummary(filters), [key]);
  const [exportError, setExportError] = useState<string | null>(null);

  const set = (k: keyof FeedbackFilters) => (v: string) =>
    setFilters((f) => ({ ...f, [k]: k === "min_rating" ? (v ? Number(v) : undefined) : v || undefined }));

  async function exportCsv() {
    setExportError(null);
    try {
      saveBlob(await api.adminFeedbackExport(filters), "agristack-feedback.csv");
    } catch (err) {
      setExportError(errorMessage(err));
    }
  }

  const s = summary.data;
  const sources = Object.keys(s?.sources ?? {});
  const all = tr("fb.filter.all");
  return (
    <>
      <PageMeta title={`${tr("nav.feedback")} | ${tr("app.name")}`} description={tr("fb.description")} />
      <PageHeader
        title={tr("nav.feedback")}
        description={tr("fb.description")}
        actions={
          <Button size="sm" variant="outline" startIcon={<Download className="size-4" />} onClick={exportCsv}>
            {tr("fb.exportCsv")}
          </Button>
        }
      />
      {exportError && <Alert className="mb-4" variant="error" message={exportError} />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={tr("fb.total")} value={s?.count ?? "—"} loading={summary.loading} accent="green" />
        <StatCard
          label={tr("fb.avgRating")}
          value={s?.average_rating != null ? `${s.average_rating.toFixed(1)} / 5` : "—"}
          loading={summary.loading}
          icon={<Star className="size-6" />}
        />
        <StatCard label={tr("fb.topLiked")} value={<span className="text-base">{s ? topList(s.liked, LIKED_LABELS) : "—"}</span>} loading={summary.loading} />
        <StatCard label={tr("fb.interests")} value={<span className="text-base">{s ? topList(s.interests, INTEREST_LABELS) : "—"}</span>} loading={summary.loading} />
      </div>

      {s && s.page_views.length > 0 && (
        <Card className="mb-6" title={tr("fb.pageViews")}>
          <ul className="flex flex-wrap gap-2 text-theme-sm text-gray-700 dark:text-gray-300">
            {s.page_views.map((v) => (
              <li key={`${v.path}|${v.source}`} className="rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-white/5">
                {v.path} · {v.source === "direct" ? tr("fb.source.direct") : v.source}: <strong>{v.views}</strong>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <div>
            <Label htmlFor="fb-type">{tr("fb.filter.type")}</Label>
            <Select id="fb-type" value={filters.visitor_type ?? ""} onChange={set("visitor_type")} placeholder={all}
              options={VISITOR_TYPES.map((v) => ({ value: v, label: VISITOR_TYPE_LABELS[v] }))} />
          </div>
          <div>
            <Label htmlFor="fb-interest">{tr("fb.filter.interest")}</Label>
            <Select id="fb-interest" value={filters.interest ?? ""} onChange={set("interest")} placeholder={all}
              options={INTERESTS.map((v) => ({ value: v, label: INTEREST_LABELS[v] }))} />
          </div>
          <div>
            <Label htmlFor="fb-rating">{tr("fb.filter.rating")}</Label>
            <Select id="fb-rating" value={String(filters.min_rating ?? "")} onChange={set("min_rating")} placeholder={all}
              options={[5, 4, 3, 2].map((n) => ({ value: String(n), label: tr("fb.filter.minRating", { n }) }))} />
          </div>
          <div>
            <Label htmlFor="fb-source">{tr("fb.filter.source")}</Label>
            <Select id="fb-source" value={filters.source ?? ""} onChange={set("source")} placeholder={all}
              options={sources.filter((v) => v !== "direct").map((v) => ({ value: v, label: v }))} />
          </div>
          <div>
            <Label htmlFor="fb-status">{tr("fb.filter.status")}</Label>
            <Select id="fb-status" value={filters.status ?? ""} onChange={set("status")} placeholder={all}
              options={FEEDBACK_STATUSES.map((v) => ({ value: v, label: tr(`fb.status.${v}`) }))} />
          </div>
          <div>
            <Label htmlFor="fb-from">{tr("fb.filter.from")}</Label>
            <Input id="fb-from" type="date" value={filters.date_from ?? ""} onChange={(e) => set("date_from")(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fb-to">{tr("fb.filter.to")}</Label>
            <Input id="fb-to" type="date" value={filters.date_to ?? ""} onChange={(e) => set("date_to")(e.target.value)} />
          </div>
        </div>
        {Object.values(filters).some(Boolean) && (
          <Button className="mt-3" size="xs" variant="ghost" onClick={() => setFilters({})}>
            {tr("fb.filter.clear")}
          </Button>
        )}
      </Card>

      {list.loading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <Card>
          <EmptyState icon={<MessageSquareHeart className="size-6" />} title={tr("fb.none")} />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.data.map((f) => (
            <FeedbackRow key={f.id} item={f} onChanged={() => summary.reload()} />
          ))}
        </div>
      )}
    </>
  );
}

function FeedbackRow({ item, onChanged }: { item: FeedbackItem; onChanged: () => void }) {
  const [current, setCurrent] = useState(item);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(patch: { status?: FeedbackStatus; notes?: string }) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      setCurrent(await api.updateFeedback(item.id, patch));
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const contact = [current.email, current.phone].filter(Boolean).join(" · ");
  return (
    <details className="group rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 p-4">
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-gray-800 dark:text-white/90">
            {current.name}
            {current.organisation && <span className="font-normal text-gray-500"> · {current.organisation}</span>}
          </span>
          <span className="block text-theme-xs text-gray-500">
            {VISITOR_TYPE_LABELS[current.visitor_type] ?? current.visitor_type} · {formatDateTime(current.created_at)}
            {current.source ? ` · ${current.source}` : ""}
          </span>
        </span>
        <span className="text-theme-sm text-amber-500" aria-label={`${current.rating} / 5`}>
          {"★".repeat(current.rating)}
          <span className="text-gray-300 dark:text-gray-700">{"★".repeat(5 - current.rating)}</span>
        </span>
        <Badge size="sm" color={STATUS_COLOR[current.status]}>{tr(`fb.status.${current.status}`)}</Badge>
      </summary>
      <div className="space-y-3 border-t border-gray-100 p-4 text-theme-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">
        <p>
          <strong>{tr("fb.col.contact")}:</strong> {contact || "—"} ·{" "}
          {current.may_contact ? tr("fb.contactOk") : tr("fb.contactNo")}
        </p>
        {current.liked.length > 0 && (
          <p>
            <strong>{tr("fb.liked")}:</strong> {current.liked.map((k) => labelOf(LIKED_LABELS, k)).join(", ")}
          </p>
        )}
        {current.interests.length > 0 && (
          <p>
            <strong>{tr("fb.interests")}:</strong> {current.interests.map((k) => labelOf(INTEREST_LABELS, k)).join(", ")}
          </p>
        )}
        {current.comments && (
          <p className="whitespace-pre-line">
            <strong>{tr("fb.comments")}:</strong> {current.comments}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{tr("fb.filter.status")}:</span>
          {FEEDBACK_STATUSES.map((st) => (
            <Button
              key={st}
              size="xs"
              variant={current.status === st ? "primary" : "outline"}
              disabled={busy || current.status === st}
              onClick={() => save({ status: st })}
            >
              {tr(`fb.status.${st}`)}
            </Button>
          ))}
        </div>
        <div>
          <Label htmlFor={`fb-notes-${item.id}`}>{tr("fb.notes")}</Label>
          <textarea
            id={`fb-notes-${item.id}`}
            rows={2}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:text-white/90"
          />
          <div className="mt-2 flex items-center gap-3">
            <Button size="xs" disabled={busy || notes === (current.notes ?? "")} onClick={() => save({ notes })}>
              {tr("fb.save")}
            </Button>
            {saved && <span className="text-theme-xs text-success-600">{tr("fb.saved")}</span>}
          </div>
        </div>
        {error && <Alert variant="error" message={error} />}
      </div>
    </details>
  );
}
