import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import type { DatasetImage } from "@/types/api";
import { formatDateTime } from "@/utils/formatters";
import { Database, Download } from "lucide-react";
import { useEffect, useState } from "react";

type Filter = "all" | "unlabelled" | "labelled" | "excluded";
const FILTERS: { id: Filter; label: MessageKey }[] = [
  { id: "all", label: "dataset.filter.all" },
  { id: "unlabelled", label: "dataset.filter.unlabelled" },
  { id: "labelled", label: "dataset.filter.labelled" },
  { id: "excluded", label: "dataset.filter.excluded" },
];

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

/** Crop photos kept with the farmers' training consent: counts, review (exclude bad photos), ZIP export. */
export default function DatasetTab() {
  const [filter, setFilter] = useState<Filter>("all");
  const summary = useAsync(() => api.datasetSummary(), []);
  const list = useAsync(
    () =>
      api.datasetImages({
        status: filter === "excluded" ? "excluded" : filter === "all" ? undefined : "included",
        labelled: filter === "labelled" ? true : filter === "unlabelled" ? false : undefined,
      }),
    [filter],
  );
  const { lang } = useI18n();
  const diseases = useAsync(() => api.reviewDiseases(lang), [lang]);
  const [msg, setMsg] = useState<string | null>(null);
  const reload = () => {
    summary.reload();
    list.reload();
  };

  async function exportZip(labelledOnly: boolean) {
    setMsg(null);
    try {
      saveBlob(await api.datasetExport(labelledOnly), `crop-photo-dataset${labelledOnly ? "-labelled" : ""}.zip`);
    } catch (err) {
      setMsg(errorMessage(err));
    }
  }

  const s = summary.data;
  return (
    <Card
      accent="sky"
      icon={<Database className="size-5" />}
      title={tr("review.tab.dataset")}
      description={tr("dataset.description")}
      actions={
        <span className="flex flex-wrap gap-2">
          <Button size="xs" variant="outline" startIcon={<Download className="size-3.5" />} onClick={() => exportZip(true)}>
            {tr("dataset.exportLabelled")}
          </Button>
          <Button size="xs" variant="outline" startIcon={<Download className="size-3.5" />} onClick={() => exportZip(false)}>
            {tr("dataset.exportAll")}
          </Button>
        </span>
      }
    >
      {msg && <Alert className="mb-3" variant="error" message={msg} />}
      {s && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["dataset.included", s.included],
              ["dataset.labelled", s.labelled],
              ["dataset.excluded", s.excluded],
              ["dataset.farmers", s.farmers_consenting],
            ] as [MessageKey, number][]
          ).map(([label, n]) => (
            <div key={label} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-theme-xs text-gray-500">{tr(label)}</p>
              <p className="text-xl font-semibold text-gray-800 dark:text-white/90">{n}</p>
            </div>
          ))}
        </div>
      )}
      {s && Object.keys(s.by_model_label).length > 0 && (
        <p className="mb-4 text-theme-xs text-gray-500">
          {tr("dataset.byModel")}:{" "}
          {Object.entries(s.by_model_label)
            .map(([k, n]) => `${k} ${n}`)
            .join(" · ")}
          {" — "}
          {tr("dataset.bySource")}:{" "}
          {Object.entries(s.by_source)
            .map(([k, n]) => `${k} ${n}`)
            .join(" · ")}
        </p>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f.id} size="xs" variant={filter === f.id ? "primary" : "outline"} onClick={() => setFilter(f.id)}>
            {tr(f.label)}
          </Button>
        ))}
      </div>
      {list.loading ? (
        <LoadingState />
      ) : list.error || !list.data ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data.length ? (
        <EmptyState title={tr("dataset.none")} description={tr("dataset.noneHint")} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.data.map((img) => (
            <DatasetItem key={img.id} img={img} diseases={diseases.data ?? []} onChanged={reload} />
          ))}
        </ul>
      )}
      <p className="mt-4 text-theme-xs text-gray-500">{tr("dataset.labelHint")}</p>
    </Card>
  );
}

function DatasetItem({
  img,
  diseases,
  onChanged,
}: {
  img: DatasetImage;
  diseases: { key: string; name: string }[];
  onChanged: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [label, setLabel] = useState(img.label ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current: string | null = null;
    api
      .datasetImage(img.id)
      .then((b) => {
        current = URL.createObjectURL(b);
        setUrl(current);
      })
      .catch(() => undefined);
    return () => {
      if (current) URL.revokeObjectURL(current);
    };
  }, [img.id]);

  async function setStatus(status: "included" | "excluded") {
    setError(null);
    try {
      await api.datasetSetStatus(img.id, status, status === "excluded" ? reason.trim() : null);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function saveLabel() {
    if (!img.diagnosis_id || !label) return;
    setError(null);
    try {
      await api.reviewLabel(img.diagnosis_id, label);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <li className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      {url ? (
        <img src={url} alt="" className="mb-2 aspect-[4/3] w-full rounded-lg object-cover" />
      ) : (
        <div className="mb-2 aspect-[4/3] w-full rounded-lg bg-gray-100 dark:bg-white/5" />
      )}
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        {img.label ? (
          <Badge size="sm" color="success">
            {img.label} ({tr(img.label_source === "agronomist" ? "dataset.byAgronomist" : "dataset.byDa")})
          </Badge>
        ) : (
          <Badge size="sm" color="warning">
            {tr("dataset.filter.unlabelled")}
          </Badge>
        )}
        {img.status === "excluded" && (
          <Badge size="sm" color="error">
            {tr("dataset.excluded")}
          </Badge>
        )}
      </div>
      <p className="text-theme-xs text-gray-500">
        {tr("dataset.model")}: {img.model_label ?? "—"}
        {img.model_confidence != null && ` ${Math.round(img.model_confidence * 100)}%`} · {img.capture_source} ·{" "}
        {formatDateTime(img.created_at)}
      </p>
      {img.excluded_reason && <p className="text-theme-xs text-error-600">{img.excluded_reason}</p>}
      {error && <p className="text-theme-xs text-error-600">{error}</p>}
      {img.diagnosis_id && img.status === "included" && (
        <div className="mt-2 flex items-center gap-2">
          <Select
            options={diseases.map((d) => ({ value: d.key, label: d.name }))}
            value={label}
            onChange={setLabel}
            placeholder={tr("dataset.pickLabel")}
            className="min-w-0 flex-1"
          />
          <Button size="xs" disabled={!label || label === img.reviewed_label} onClick={saveLabel}>
            {tr("dataset.saveLabel")}
          </Button>
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        {img.status === "included" ? (
          <>
            <Input placeholder={tr("dataset.reason")} value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button size="xs" variant="outline" disabled={!reason.trim()} onClick={() => setStatus("excluded")}>
              {tr("dataset.exclude")}
            </Button>
          </>
        ) : (
          <Button size="xs" variant="outline" onClick={() => setStatus("included")}>
            {tr("dataset.include")}
          </Button>
        )}
      </div>
    </li>
  );
}
