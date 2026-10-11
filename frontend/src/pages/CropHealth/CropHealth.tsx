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
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import DemoDataNotice from "@/components/common/DemoDataNotice";
import { useAuth } from "@/context/AuthContext";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { CheckCircleIcon } from "@/icons";
import type {
  AdvisoryDiagnosis,
  AdvisoryLanguage,
  Diagnosis,
  Farm,
  HealthReport,
  Severity,
} from "@/types/api";
import { cn } from "@/utils";
import { formatDateTime, formatFullDate } from "@/utils/formatters";
import {
  Camera,
  FileClock,
  HeartPulse,
  PenLine,
  Stethoscope,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { saveCheck } from "@/offline/outbox";
import SavedChecks from "./SavedChecks";
import { useNavigate } from "react-router";
import { PhotoCheckForm, PhotoDiagnosisResult } from "./PhotoDiagnosis";

const SEVERITY: Record<
  Severity,
  { color: "success" | "info" | "warning" | "error"; label: MessageKey }
> = {
  low: { color: "success", label: "severity.low" },
  moderate: { color: "warning", label: "severity.moderate" },
  high: { color: "error", label: "severity.high" },
  critical: { color: "error", label: "severity.critical" },
};

const EXAMPLES: MessageKey[] = ["crop.example1", "crop.example2", "crop.example3"];

export default function CropHealth() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  // Farmers check their own fields; agents (own region) and admins check other people's.
  const ownsFarms =
    can("farms:manage:own") && !can("farms:manage:all", "farms:read:region");
  const farms = useAsync(() => api.getFarms(), []);
  const reports = useAsync(() => api.getHealthReports(), []);

  const [chosenFarmId, setFarmId] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    (Diagnosis & { farm_name?: string; crop?: string }) | null
  >(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [mode, setMode] = useState<"photo" | "describe">("photo");
  const [photoResult, setPhotoResult] = useState<AdvisoryDiagnosis | null>(
    null,
  );
  const { lang } = useI18n();
  // Results default to the interface language.
  const [language, setLanguage] = useState<AdvisoryLanguage>(lang);

  // Default to the first farm until the user picks one
  const farmId = chosenFarmId || String(farms.data?.[0]?.id ?? "");

  const farm = farms.data?.find((f) => String(f.id) === farmId);
  const farmById = useMemo(
    () => new Map((farms.data ?? []).map((f) => [f.id, f])),
    [farms.data],
  );

  async function onDiagnose(e: FormEvent) {
    e.preventDefault();
    if (!farm) return;
    if (description.trim().length < 10) {
      setError(
        tr("crop.describeMore"),
      );
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setSaveState("idle");
    try {
      setResult(
        await api.diagnose({
          farm_id: farm.id,
          description: description.trim(),
          crop: farm.crop_name,
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!result || !farm) return;
    setSaveState("saving");
    setError(null);
    try {
      const saved = await api.saveHealthReport({ ...result, farm_id: farm.id });
      reports.setData((list) => [saved, ...(list ?? [])]);
      farms.reload();
      setSaveState("saved");
    } catch (err) {
      setError(errorMessage(err));
      setSaveState("idle");
    }
  }

  async function onResolve(report: HealthReport) {
    try {
      await api.resolveReport(report.id);
      reports.setData(
        (list) =>
          list?.map((r) => (r.id === report.id ? { ...r, resolved: 1 } : r)) ??
          null,
      );
      farms.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageMeta
        title={`${tr("nav.cropHealth")} | ${tr("app.name")}`}
        description={tr("crop.meta")}
      />
      <PageHeader
        title={tr("nav.cropHealth")}
        description={tr("crop.description")}
      />

      {farms.loading ? (
        <Card>
          <LoadingState label={tr("crop.loadingFarms")} />
        </Card>
      ) : farms.error ? (
        <Card>
          <ErrorState message={farms.error} onRetry={farms.reload} />
        </Card>
      ) : !farms.data?.length ? (
        <Card>
          <EmptyState
            title={tr(ownsFarms ? "crop.addFarmFirst" : "crop.noFarms")}
            description={
              ownsFarms
                ? tr("crop.addFarmHint")
                : can("farms:manage:all")
                  ? tr("dash.noFarmsAll")
                  : user?.region
                    ? tr("crop.noFarmsRegion", { region: trTerm("region", user.region) })
                    : tr("crop.noRegion")
            }
            action={
              ownsFarms && (
                <Button onClick={() => navigate("/profile")}>
                  {tr("crop.goToProfile")}
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 space-y-4 md:space-y-6 xl:col-span-7">
            <Card
              accent="green"
              icon={<Stethoscope className="size-5" />}
              title={tr("crop.checkField")}
              actions={
                <div
                  role="tablist"
                  className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-900"
                >
                  {(
                    [
                      [
                        "photo",
                        tr("crop.mode.photo"),
                        <Camera key="i" className="size-4" />,
                      ],
                      [
                        "describe",
                        tr("crop.mode.describe"),
                        <PenLine key="i" className="size-4" />,
                      ],
                    ] as const
                  ).map(([m, label, icon]) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      onClick={() => setMode(m)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-theme-sm font-medium transition",
                        mode === m
                          ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                          : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                      )}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="mb-5">
                <Label htmlFor="ch-farm">{tr("crop.whichField")}</Label>
                <Select
                  id="ch-farm"
                  options={farms.data.map((f) => ({
                    value: String(f.id),
                    label: `${f.field_name} — ${trTerm("crop", f.crop_name)}${!ownsFarms && f.owner_name ? ` (${f.owner_name})` : ""}`,
                  }))}
                  value={farmId}
                  onChange={(v) => {
                    setFarmId(v);
                    setResult(null);
                    setPhotoResult(null);
                  }}
                />
              </div>
              {mode === "photo" ? (
                <PhotoCheckForm
                  farmId={farm?.id ?? null}
                  language={language}
                  onLanguage={setLanguage}
                  onResult={(r) => {
                    setPhotoResult(r);
                    if (r) void saveCheck(r);
                  }}
                />
              ) : (
                <form onSubmit={onDiagnose} noValidate className="space-y-5">
                  {error && <Alert variant="error" message={error} />}
                  <DemoDataNotice subject="demo.subject.textDiagnosis" />
                  <div>
                    <Label>{tr("crop.whatDoYouSee")}</Label>
                    <TextArea
                      rows={4}
                      placeholder={tr("crop.describePlaceholder")}
                      value={description}
                      onChange={setDescription}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {EXAMPLES.map((ex) => (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => setDescription(tr(ex))}
                          className="rounded-full bg-gray-100 px-3 py-1 text-theme-xs text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                        >
                          {tr(ex)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" loading={busy} disabled={!farm}>
                      {tr("crop.checkMyCrop")}
                    </Button>
                  </div>
                </form>
              )}
            </Card>

            {mode === "photo" && photoResult && (
              <PhotoDiagnosisResult result={photoResult} />
            )}
            {mode === "photo" && !photoResult && <SavedChecks />}
            {mode === "describe" && result && (
              <DiagnosisCard
                result={result}
                saveState={saveState}
                onSave={onSave}
              />
            )}
          </div>

          <div className="col-span-12 xl:col-span-5">
            <Card
              accent="teal"
              icon={<FileClock className="size-5" />}
              title={tr("crop.history")}
              description={tr("crop.historyHint")}
            >
              {reports.loading ? (
                <LoadingState />
              ) : reports.error ? (
                <ErrorState message={reports.error} onRetry={reports.reload} />
              ) : !reports.data?.length ? (
                <EmptyState
                  title={tr("crop.noHistory")}
                  description={tr("crop.noHistoryHint")}
                />
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {reports.data.map((r) => (
                    <ReportRow
                      key={r.id}
                      report={r}
                      farm={farmById.get(r.farm_id)}
                      onResolve={() => onResolve(r)}
                    />
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function DiagnosisCard({
  result,
  saveState,
  onSave,
}: {
  result: Diagnosis & { farm_name?: string; crop?: string };
  saveState: "idle" | "saving" | "saved";
  onSave: () => void;
}) {
  const sev = SEVERITY[result.severity] ?? SEVERITY.low;
  return (
    <Card
      accent={
        sev.color === "error"
          ? "rose"
          : sev.color === "warning"
            ? "amber"
            : "green"
      }
      icon={<HeartPulse className="size-5" />}
      title={result.disease}
      description={result.pathogen ? tr("crop.causedBy", { pathogen: result.pathogen }) : undefined}
      actions={
        <>
          <Badge color={sev.color}>{tr("crop.risk", { level: tr(sev.label) })}</Badge>
          <Badge color="light">{tr("crop.match", { pct: Math.round(result.confidence) })}</Badge>
        </>
      }
    >
      <div className="space-y-5">
        {result.ai_explanation && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {result.ai_explanation}
          </p>
        )}

        {!!result.visual_cues?.length && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
              {tr("crop.signs")}
            </h4>
            <ul className="space-y-1.5">
              {result.visual_cues.map((c) => (
                <li
                  key={c}
                  className="flex gap-2.5 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-gray-400"
                    aria-hidden="true"
                  />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DemoDataNotice />
        {result.recommended_action && (
          <Alert
            variant={sev.color === "error" ? "warning" : "info"}
            title={tr("crop.whatToDoDemo")}
            message={result.recommended_action}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {result.follow_up_date && (
              <>
                {tr("crop.checkAgain", { date: formatFullDate(result.follow_up_date) })}{" "}
              </>
            )}
            {tr("crop.guideOnly")}
          </p>
          {saveState === "saved" ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-600 dark:text-success-500">
              <CheckCircleIcon className="size-5" /> {tr("crop.saved")}
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              loading={saveState === "saving"}
              onClick={onSave}
            >
              {tr("crop.saveToHistory")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function ReportRow({
  report,
  farm,
  onResolve,
}: {
  report: HealthReport;
  farm?: Farm;
  onResolve: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const sev = SEVERITY[report.severity] ?? SEVERITY.low;
  const resolved = !!report.resolved;
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {report.disease}
          </p>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {farm ? `${farm.field_name} · ` : ""}
            {formatDateTime(report.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {resolved ? (
            <Badge size="sm" color="success">
              {tr("crop.resolved")}
            </Badge>
          ) : (
            <>
              <Badge size="sm" color={sev.color}>
                {tr(sev.label)}
              </Badge>
              <Button
                size="xs"
                variant="ghost"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  await onResolve();
                  setBusy(false);
                }}
              >
                {tr("crop.markSolved")}
              </Button>
            </>
          )}
        </div>
      </div>
      {report.recommended_action && !resolved && (
        <p className="mt-1.5 line-clamp-2 text-theme-xs text-gray-500 dark:text-gray-400">
          {report.recommended_action}
        </p>
      )}
    </li>
  );
}
