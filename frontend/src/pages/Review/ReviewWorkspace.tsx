import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import DatasetTab from "./DatasetTab";
import TipsTab from "./TipsTab";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { am } from "@/i18n/am";
import { tr, type MessageKey } from "@/i18n/core";
import { en } from "@/i18n/en";
import { useI18n } from "@/i18n/I18nProvider";
import { om } from "@/i18n/om";
import { ti } from "@/i18n/ti";
import type { Correction, ReviewCase, TranslationReviewRow } from "@/types/api";
import { formatDateTime } from "@/utils/formatters";
import {
  Download,
  FileUp,
  Images,
  Inbox,
  Languages,
  Table2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Tab = "queue" | "tips" | "content" | "labels" | "dataset" | "translations";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(url);
}

/** Agronomist workspace: forwarded questions, content tables, photo labels, translation approval. */
export default function ReviewWorkspace() {
  const [tab, setTab] = useState<Tab>("queue");
  return (
    <>
      <PageMeta
        title={`${tr("nav.review")} | ${tr("app.name")}`}
        description={tr("review.description")}
      />
      <PageHeader
        title={tr("nav.review")}
        description={tr("review.description")}
      />
      <Tabs
        variant="underline"
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "queue", label: tr("review.tab.queue") },
          { id: "tips", label: tr("review.tab.tips") },
          { id: "content", label: tr("review.tab.content") },
          { id: "labels", label: tr("review.tab.labels") },
          { id: "dataset", label: tr("review.tab.dataset") },
          { id: "translations", label: tr("review.tab.translations") },
        ]}
      />
      {tab === "queue" && <Queue />}
      {tab === "tips" && <TipsTab />}
      {tab === "content" && <ContentTables />}
      {tab === "labels" && <Labels />}
      {tab === "dataset" && <DatasetTab />}
      {tab === "translations" && <Translations />}
    </>
  );
}

// ── Forwarded questions ──

function Queue() {
  const list = useAsync(() => api.reviewQueue(), []);
  if (list.loading) return <LoadingState />;
  if (list.error)
    return <ErrorState message={list.error} onRetry={list.reload} />;
  if (!list.data?.length)
    return (
      <Card>
        <EmptyState
          icon={<Inbox className="size-6" />}
          title={tr("review.queueEmpty")}
        />
      </Card>
    );
  return (
    <div className="space-y-4">
      {list.data.map((c) => (
        <CaseCard key={c.id} item={c} onDone={list.reload} />
      ))}
    </div>
  );
}

function CaseCard({ item, onDone }: { item: ReviewCase; onDone: () => void }) {
  const [text, setText] = useState("");
  const [promote, setPromote] = useState(false);
  const [kbQuestion, setKbQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await api.reviewAnswer(item.id, {
        text: text.trim(),
        kb_question: promote ? kbQuestion.trim() : null,
        kb_crop: "wheat",
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title={tr(`da.esc.${item.reason}` as MessageKey)}
      description={[item.farmer_woreda, formatDateTime(item.created_at)]
        .filter(Boolean)
        .join(" · ")}
    >
      <div className="space-y-3 text-theme-sm text-gray-700 dark:text-gray-300">
        {item.question && (
          <p>
            <span className="text-theme-xs font-medium text-gray-500 uppercase">
              {tr("da.question")}:{" "}
            </span>
            {item.question}
          </p>
        )}
        {item.answer && <p className="text-gray-500">{item.answer}</p>}
        {item.note && (
          <p>
            <span className="text-theme-xs font-medium text-gray-500 uppercase">
              {tr("review.daNote")}:{" "}
            </span>
            {item.note}
          </p>
        )}
        <div>
          <Label>{tr("da.answerLabel")}</Label>
          <TextArea
            rows={3}
            value={text}
            onChange={setText}
            placeholder=""
            hint={tr("da.answerHint")}
            disabled={busy}
          />
        </div>
        <Checkbox
          checked={promote}
          onChange={setPromote}
          label={tr("review.promote")}
        />
        {promote && (
          <div>
            <Label>{tr("review.kbQuestion")}</Label>
            <Input
              value={kbQuestion}
              onChange={(e) => setKbQuestion(e.target.value)}
              hint={tr("review.kbQuestionHint")}
            />
          </div>
        )}
        {error && <Alert variant="error" message={error} />}
        <div className="flex justify-end">
          <Button
            size="sm"
            loading={busy}
            disabled={
              text.trim().length < 2 ||
              (promote && kbQuestion.trim().length < 5)
            }
            onClick={send}
          >
            {tr("da.send")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── Content tables ──

function ContentTables() {
  const tables = [
    {
      id: "calendar" as const,
      label: "review.table.calendar" as MessageKey,
      file: "crop_calendar_rules.csv",
    },
    {
      id: "protocols" as const,
      label: "review.table.protocols" as MessageKey,
      file: "treatment_protocols.csv",
    },
    {
      id: "dosage" as const,
      label: "review.table.dosage" as MessageKey,
      file: "dosage_rules.csv",
    },
  ];
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function upload(
    id: (typeof tables)[number]["id"],
    file: File | undefined,
  ) {
    if (!file) return;
    setMessage(null);
    try {
      const r = await api.reviewUploadTable(id, file);
      setMessage({
        ok: true,
        text: tr("review.uploaded", { n: r.loaded, p: r.placeholders }),
      });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    }
  }

  return (
    <Card
      accent="green"
      icon={<Table2 className="size-5" />}
      title={tr("review.tab.content")}
      description={tr("review.contentHint")}
    >
      {message && (
        <Alert
          className="mb-4"
          variant={message.ok ? "success" : "error"}
          message={message.text}
        />
      )}
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {tables.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <span className="font-medium text-gray-800 dark:text-white/90">
              {tr(t.label)}
            </span>
            <span className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                startIcon={<Download className="size-4" />}
                onClick={async () =>
                  saveBlob(await api.reviewTableCsv(t.id), t.file)
                }
              >
                {tr("review.download")}
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
                <FileUp className="size-4" aria-hidden="true" />
                {tr("review.upload")}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => upload(t.id, e.target.files?.[0])}
                />
              </label>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ── Photo labels ──

function Photo({ id }: { id: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let current: string | null = null;
    api
      .reviewImage(id)
      .then((b) => {
        current = URL.createObjectURL(b);
        setUrl(current);
      })
      .catch(() => undefined);
    return () => {
      if (current) URL.revokeObjectURL(current);
    };
  }, [id]);
  return url ? (
    <img src={url} alt="" className="size-28 rounded-lg object-cover" />
  ) : (
    <div className="size-28 rounded-lg bg-gray-100 dark:bg-white/5" />
  );
}

function Labels() {
  const { lang } = useI18n();
  const list = useAsync(() => api.reviewCorrections(), []);
  const diseases = useAsync(() => api.reviewDiseases(lang), [lang]);
  const [picked, setPicked] = useState<Record<number, string>>({});
  const name = (k: string | null) =>
    k
      ? (diseases.data?.find((d) => d.key === k)?.name ?? k.replace(/_/g, " "))
      : tr("monitor.uncertain");

  async function save(c: Correction) {
    await api.reviewLabel(c.id, picked[c.id] ?? c.da_disease);
    list.reload();
  }

  return (
    <Card
      accent="violet"
      icon={<Images className="size-5" />}
      title={tr("review.tab.labels")}
      description={tr("review.labelsHint")}
      actions={
        <Button
          size="sm"
          variant="outline"
          startIcon={<Download className="size-4" />}
          onClick={async () =>
            saveBlob(await api.reviewTrainingCsv(), "training_labels.csv")
          }
        >
          {tr("review.exportLabels")}
        </Button>
      }
    >
      {list.loading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <EmptyState title={tr("review.noCorrections")} />
      ) : (
        <ul className="space-y-3">
          {list.data.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
            >
              {c.has_image ? (
                <Photo id={c.id} />
              ) : (
                <div className="size-28 rounded-lg bg-gray-100 dark:bg-white/5" />
              )}
              <div className="min-w-0 flex-1 text-theme-sm">
                <p>
                  {tr("review.model")}: <b>{name(c.model_disease)}</b> (
                  {Math.round(c.confidence * 100)}%)
                </p>
                <p>
                  {tr("review.da")}: <b>{name(c.da_disease)}</b>
                </p>
                <p className="text-theme-xs text-gray-500">
                  {formatDateTime(c.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-48">
                  <Select
                    aria-label={tr("review.label")}
                    options={(diseases.data ?? []).map((d) => ({
                      value: d.key,
                      label: d.name,
                    }))}
                    value={picked[c.id] ?? c.label ?? c.da_disease}
                    onChange={(v) => setPicked((p) => ({ ...p, [c.id]: v }))}
                  />
                </div>
                <Button size="sm" onClick={() => save(c)}>
                  {tr("review.saveLabel")}
                </Button>
                {c.label && (
                  <Badge size="sm" color="success">
                    {tr("review.labelled")}
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Translations ──

const UI: Record<"am" | "om" | "ti", Record<string, string>> = { am, om, ti };
const PAGE = 40;

function Translations() {
  const [source, setSource] = useState<"ui" | "advisory">("ui");
  const [lang, setLang] = useState<"am" | "om" | "ti">("am");
  const [query, setQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [page, setPage] = useState(0);
  const advisory = useAsync(() => api.reviewAdvisoryTexts(), []);
  const reviews = useAsync(() => api.reviewTranslations(), []);

  const done = useMemo(() => {
    const m = new Map<string, TranslationReviewRow>();
    for (const r of reviews.data ?? [])
      m.set(`${r.source}|${r.lang}|${r.key}`, r);
    return m;
  }, [reviews.data]);

  const rows = useMemo(() => {
    const base: Record<string, string> =
      source === "ui" ? en : (advisory.data?.en.texts ?? {});
    const local: Record<string, string> =
      source === "ui" ? UI[lang] : (advisory.data?.[lang].texts ?? {});
    const q = query.trim().toLowerCase();
    return Object.keys(base)
      .filter((k) => !onlyOpen || !done.has(`${source}|${lang}|${k}`))
      .filter(
        (k) =>
          !q ||
          k.toLowerCase().includes(q) ||
          base[k].toLowerCase().includes(q) ||
          (local[k] ?? "").toLowerCase().includes(q),
      )
      .map((k) => ({ key: k, en: base[k], local: local[k] ?? "" }));
  }, [source, lang, query, onlyOpen, done, advisory.data]);

  async function decide(
    key: string,
    status: "approved" | "changes",
    suggestion?: string,
  ) {
    await api.reviewTranslation({
      source,
      lang,
      key,
      status,
      suggestion: suggestion ?? null,
    });
    reviews.reload();
  }

  const shown = rows.slice(page * PAGE, (page + 1) * PAGE);
  return (
    <Card
      accent="sky"
      icon={<Languages className="size-5" />}
      title={tr("review.tab.translations")}
      description={tr("review.translationsHint")}
      actions={
        <Button
          size="sm"
          variant="outline"
          startIcon={<Download className="size-4" />}
          onClick={async () =>
            saveBlob(
              await api.reviewTranslationsCsv(),
              "translation_reviews.csv",
            )
          }
        >
          {tr("review.exportReviews")}
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Select
            aria-label={tr("review.source")}
            value={source}
            onChange={(v) => {
              setSource(v as "ui" | "advisory");
              setPage(0);
            }}
            options={[
              { value: "ui", label: tr("review.sourceUi") },
              { value: "advisory", label: tr("review.sourceAdvisory") },
            ]}
          />
        </div>
        <div className="w-40">
          <Select
            aria-label={tr("form.language")}
            value={lang}
            onChange={(v) => {
              setLang(v as "am" | "om" | "ti");
              setPage(0);
            }}
            options={[
              { value: "am", label: "አማርኛ" },
              { value: "om", label: "Afaan Oromoo" },
              { value: "ti", label: "ትግርኛ" },
            ]}
          />
        </div>
        <div className="w-56">
          <Input
            placeholder={tr("review.search")}
            aria-label={tr("review.search")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Checkbox
          checked={onlyOpen}
          onChange={(v) => {
            setOnlyOpen(v);
            setPage(0);
          }}
          label={tr("review.onlyOpen")}
        />
        <span className="text-theme-xs text-gray-500">
          {tr("review.count", { n: rows.length })}
        </span>
      </div>
      {advisory.loading || reviews.loading ? (
        <LoadingState />
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {shown.map((r) => (
            <TranslationRow
              key={r.key}
              row={r}
              review={done.get(`${source}|${lang}|${r.key}`)}
              onDecide={decide}
            />
          ))}
        </ul>
      )}
      {rows.length > PAGE && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            size="xs"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹
          </Button>
          <span className="text-theme-xs text-gray-500">
            {page + 1} / {Math.ceil(rows.length / PAGE)}
          </span>
          <Button
            size="xs"
            variant="outline"
            disabled={(page + 1) * PAGE >= rows.length}
            onClick={() => setPage((p) => p + 1)}
          >
            ›
          </Button>
        </div>
      )}
    </Card>
  );
}

function TranslationRow({
  row,
  review,
  onDecide,
}: {
  row: { key: string; en: string; local: string };
  review: TranslationReviewRow | undefined;
  onDecide: (
    key: string,
    status: "approved" | "changes",
    suggestion?: string,
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review?.suggestion ?? row.local);
  return (
    <li className="py-3 text-theme-sm">
      <p className="font-mono text-theme-xs text-gray-400">{row.key}</p>
      <p className="text-gray-600 dark:text-gray-400">{row.en}</p>
      <p className="text-gray-900 dark:text-white/90">{row.local || "—"}</p>
      {review && (
        <p className="mt-1 text-theme-xs">
          <Badge
            size="sm"
            color={review.status === "approved" ? "success" : "warning"}
          >
            {tr(
              review.status === "approved"
                ? "review.approved"
                : "review.changes",
            )}
          </Badge>{" "}
          {review.suggestion && (
            <span className="text-gray-600 dark:text-gray-300">
              → {review.suggestion}
            </span>
          )}
        </p>
      )}
      {editing ? (
        <div className="mt-2 space-y-2">
          <TextArea rows={2} value={text} onChange={setText} placeholder="" />
          <div className="flex gap-2">
            <Button
              size="xs"
              onClick={async () => {
                await onDecide(row.key, "changes", text);
                setEditing(false);
              }}
              disabled={!text.trim()}
            >
              {tr("review.saveSuggestion")}
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setEditing(false)}>
              {tr("common.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => onDecide(row.key, "approved")}
          >
            {tr("review.approve")}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
            {tr("review.suggest")}
          </Button>
        </div>
      )}
    </li>
  );
}
