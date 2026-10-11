import { api } from "@/api/client";
import ListenButton from "@/components/advisory/ListenButton";
import { LanguagePicker } from "@/components/advisory/LanguagePicker";
import Card from "@/components/common/Card";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { ApiError } from "@/api/client";
import { errorMessage } from "@/hooks/useAsync";
import { queuePhoto } from "@/offline/outbox";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import type {
  AdvisoryDiagnosis,
  AdvisoryLanguage,
  DiagnosisOutcome,
  EcologicalInput,
  InputOffer,
  ModelPrediction,
  ProductCard,
  TreatmentPlan,
} from "@/types/api";
import { cn } from "@/utils";
import { formatFullDate } from "@/utils/formatters";
import {
  Camera,
  CloudRain,
  FlaskConical,
  HeartPulse,
  ImagePlus,
  Leaf,
  MapPin,
  Mountain,
  PhoneCall,
  ShieldCheck,
  Store,
  ThermometerSun,
  Droplets,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

const CONDITION_LABELS: Record<keyof EcologicalInput, { label: MessageKey; unit: string; icon: React.ReactNode }> = {
  altitude_m: { label: "photo.cond.altitude", unit: "m", icon: <Mountain className="size-4" /> },
  temperature_C: { label: "photo.cond.temperature", unit: "°C", icon: <ThermometerSun className="size-4" /> },
  humidity_pct: { label: "photo.cond.humidity", unit: "%", icon: <Droplets className="size-4" /> },
  precipitation_mm_per_week: { label: "photo.cond.rain", unit: "mm", icon: <CloudRain className="size-4" /> },
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

// ── Form ─────────────────────────────────────────────────────────────────────

export function PhotoCheckForm({
  farmId,
  language,
  onLanguage,
  onResult,
}: {
  farmId: number | null;
  language: AdvisoryLanguage;
  onLanguage: (l: AdvisoryLanguage) => void;
  onResult: (r: AdvisoryDiagnosis | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [source, setSource] = useState<"camera" | "gallery" | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError(tr("photo.needPhoto"));
      return;
    }
    setBusy(true);
    setError(null);
    setQueued(false);
    onResult(null);
    try {
      onResult(await api.advisoryDiagnose(file, { farm_id: farmId, language, capture_source: source }));
    } catch (err) {
      // No connection: keep the photo on this phone and check it when the connection is back.
      if (!(err instanceof ApiError) && (await queuePhoto(file, farmId, language, source))) {
        setQueued(true);
        setFile(null);
        return;
      }
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {error && <Alert variant="error" message={error} />}
      {queued && <Alert variant="info" message={tr("offline.queuedPhoto")} />}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setSource("camera");
          onResult(null);
        }}
      />
      <input
        ref={gallery}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setSource("gallery");
          onResult(null);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed transition",
          preview
            ? "border-transparent p-0"
            : "border-gray-300 px-6 py-10 hover:border-brand-400 hover:bg-brand-25 dark:border-gray-700 dark:hover:border-brand-700 dark:hover:bg-brand-500/5",
        )}
      >
        {preview ? (
          <img src={preview} alt={tr("photo.selectedLeaf")} className="max-h-72 w-full rounded-xl object-contain" />
        ) : (
          <>
            <span className="flex size-12 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
              <Camera className="size-6" />
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-white/90">{tr("photo.take")}</span>
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">
              {tr("photo.tips")}
            </span>
          </>
        )}
      </button>
      <div className="flex flex-wrap gap-4">
        {preview && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-1.5 text-theme-sm font-medium text-brand-500 hover:text-brand-600"
          >
            <Camera className="size-4" /> {tr("photo.different")}
          </button>
        )}
        <button
          type="button"
          onClick={() => gallery.current?.click()}
          className="inline-flex items-center gap-1.5 text-theme-sm font-medium text-brand-500 hover:text-brand-600"
        >
          <ImagePlus className="size-4" /> {tr("photo.fromGallery")}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1.5 text-theme-xs font-medium text-gray-500 dark:text-gray-400">{tr("photo.showIn")}</p>
          <LanguagePicker value={language} onChange={(l) => onLanguage(l ?? "en")} allowAuto={false} disabled={busy} />
        </div>
        <Button type="submit" loading={busy} disabled={!file} startIcon={<Leaf className="size-4" />}>
          {tr("photo.check")}
        </Button>
      </div>
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        {tr("photo.whyConditions")}
      </p>
    </form>
  );
}

// ── Result ───────────────────────────────────────────────────────────────────

function PredictionColumn({
  title,
  subtitle,
  prediction,
  highlight,
  empty,
}: {
  title: string;
  subtitle: string;
  prediction: ModelPrediction | null;
  highlight: boolean;
  empty: string;
}) {
  const top = prediction
    ? Object.entries(prediction.probabilities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : [];
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        highlight
          ? "border-brand-200 bg-brand-25 dark:border-brand-500/30 dark:bg-brand-500/5"
          : "border-gray-200 dark:border-gray-800",
      )}
    >
      <p className="text-theme-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">{title}</p>
      <p className="text-theme-xs text-gray-400">{subtitle}</p>
      {prediction ? (
        <>
          <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
            {prediction.disease} <span className="text-sm font-medium text-gray-500">{pct(prediction.confidence)}</span>
          </p>
          <ul className="mt-2 space-y-1.5">
            {top.map(([label, p]) => (
              <li key={label} className="text-theme-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{trTerm("model", label)}</span>
                  <span>{pct(p)}</span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={cn("h-full rounded-full", highlight ? "bg-brand-500" : "bg-gray-400")}
                    style={{ width: pct(p) }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{empty}</p>
      )}
    </div>
  );
}

function ModelComparison({ result }: { result: AdvisoryDiagnosis }) {
  const m = result.model;
  if (!m.photo_only && !m.with_conditions) return null;
  const used = result.mode === "photo_and_conditions";
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">{tr("photo.howDecided")}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <PredictionColumn
          title={tr("photo.photoOnly")}
          subtitle={tr("photo.photoOnlyHint")}
          prediction={m.photo_only}
          highlight={!used}
          empty="—"
        />
        <PredictionColumn
          title={tr("photo.withConditions")}
          subtitle={tr("photo.withConditionsHint")}
          prediction={m.with_conditions}
          highlight={used}
          empty={tr("photo.conditionsNotUsed")}
        />
      </div>
      {m.ecological_input && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(CONDITION_LABELS) as (keyof EcologicalInput)[]).map((k) => (
            <div key={k} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]">
              <p className="flex items-center gap-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
                {CONDITION_LABELS[k].icon}
                {tr(CONDITION_LABELS[k].label)}
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {Math.round(m.ecological_input![k] * 10) / 10} {CONDITION_LABELS[k].unit}
              </p>
            </div>
          ))}
        </div>
      )}
      {!!m.out_of_range.length && (
        <ul className="mt-3 space-y-1 text-theme-xs text-gray-500 dark:text-gray-400">
          {m.out_of_range.map((o) => (
            <li key={o.feature}>
              {CONDITION_LABELS[o.feature] ? tr(CONDITION_LABELS[o.feature].label) : o.feature}:{" "}
              {tr("photo.outOfRange", {
                value: `${Math.round(o.value * 10) / 10} ${CONDITION_LABELS[o.feature]?.unit ?? ""}`.trim(),
                min: o.training_min,
                max: o.training_max,
              })}
            </li>
          ))}
        </ul>
      )}
      {m.version && <p className="mt-2 text-theme-xs text-gray-400">{tr("market.fc.model", { model: m.version })}</p>}
    </div>
  );
}

function Product({ p }: { p: ProductCard }) {
  const rows: [string, string | number | null][] = [
    [tr("photo.p.dosePerHa"), p.dose_per_ha],
    [tr("photo.p.perKnapsack"), p.dose_per_knapsack],
    [tr("photo.p.water"), p.water_volume_l_per_ha && `${p.water_volume_l_per_ha} ${tr("unit.lPerHa")}`],
    [tr("photo.p.maxSprays"), p.max_applications],
    [tr("photo.p.interval"), p.interval_days],
    [tr("photo.p.phi"), p.pre_harvest_interval_days],
    [tr("photo.p.reentry"), p.re_entry_hours && tr("photo.hours", { n: p.re_entry_hours })],
    [tr("photo.p.rainFree"), p.rain_free_hours && tr("photo.hours", { n: p.rain_free_hours })],
  ];
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-800 dark:text-white/90">{p.product_name}</p>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {p.active_ingredient}
            {p.registration_number && ` · ${tr("photo.reg", { n: p.registration_number })}`}
          </p>
        </div>
        {p.verified ? (
          <Badge size="sm" color="success">
            {tr("photo.verified")}
          </Badge>
        ) : (
          <Badge size="sm" color="warning">
            {tr("photo.placeholder")}
          </Badge>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {rows
          .filter(([, v]) => v !== null && v !== undefined && v !== "")
          .map(([k, v]) => (
            <div key={k}>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{k}</dt>
              <dd className="text-sm font-medium text-gray-800 dark:text-white/90">{v}</dd>
            </div>
          ))}
      </dl>
      {!!p.ppe_required.length && (
        <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">{tr("photo.ppe", { items: p.ppe_required.map((x) => trTerm("ppe", x)).join(", ") })}</p>
      )}
    </div>
  );
}

function Offer({ o }: { o: InputOffer }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
          {o.supplier}
          {o.sponsored && (
            <span className="ms-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 uppercase dark:bg-white/5">
              {tr("photo.sponsored")}
            </span>
          )}
        </p>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {o.product_name}
          {o.distance_km !== null && (
            <>
              {" · "}
              <MapPin className="inline size-3" /> {o.distance_km} {tr("unit.km")}
            </>
          )}
          {o.in_stock === false && ` · ${tr("photo.outOfStock")}`}
        </p>
      </div>
      {o.price_etb !== null && (
        <p className="shrink-0 text-sm font-semibold text-gray-800 dark:text-white/90">
          {o.price_etb.toLocaleString()} {tr("unit.etb")}{o.unit && <span className="text-theme-xs font-normal text-gray-500"> / {o.unit}</span>}
        </p>
      )}
    </li>
  );
}

function PlanSection({ plan }: { plan: TreatmentPlan }) {
  return (
    <div className="space-y-5">
      {(!plan.verified || plan.warnings.length > 0) && (
        <Alert
          variant="warning"
          title={tr("photo.notChecked")}
          message={
            plan.warnings.length
              ? plan.warnings.join(" ")
              : tr("photo.notCheckedBody")
          }
        />
      )}

      {!!plan.cultural_practices.length && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
            <Leaf className="size-4 text-green-600" /> {tr("photo.inField")}
          </h4>
          <ol className="list-decimal space-y-1.5 ps-5 text-sm text-gray-700 dark:text-gray-300">
            {plan.cultural_practices.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
          {plan.scouting_advice && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{plan.scouting_advice}</p>}
        </div>
      )}

      {(plan.products.length > 0 || plan.recommended_active_ingredients.length > 0) && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
            <FlaskConical className="size-4 text-violet-600" /> {tr("photo.ifSpray")}
          </h4>
          {plan.products.length ? (
            <div className="space-y-3">
              {plan.products.map((p) => (
                <Product key={p.product_id} p={p} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tr("photo.approvedAI", { list: plan.recommended_active_ingredients.join(", ") })}
            </p>
          )}
        </div>
      )}

      {plan.weather_advice && <Alert variant="info" title={tr("photo.weather")} message={plan.weather_advice} />}

      {!!plan.offers.length && (
        <div>
          <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
            <Store className="size-4 text-orange-500" /> {tr("photo.whereToBuy")}
          </h4>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {plan.offers.map((o, i) => (
              <Offer key={`${o.supplier}-${o.product_id}-${i}`} o={o} />
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 rounded-xl bg-error-50 p-4 dark:bg-error-500/10">
        <ShieldCheck className="size-5 shrink-0 text-error-600 dark:text-error-400" />
        <p className="text-sm whitespace-pre-line text-error-800 dark:text-error-300">{plan.safety}</p>
      </div>

      {!!plan.sources.length && (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("photo.sources", { list: plan.sources.join(" · ") })}</p>
      )}
    </div>
  );
}

const KIND_TITLE: Record<AdvisoryDiagnosis["kind"], MessageKey> = {
  disease: "photo.kind.disease",
  healthy: "photo.kind.healthy",
  uncertain: "photo.kind.uncertain",
  invalid_photo: "photo.kind.invalid",
};

export function OutcomeButtons({ diagnosisId, compact }: { diagnosisId: number; compact?: boolean }) {
  const [state, setState] = useState<DiagnosisOutcome | "busy" | null>(null);
  const [escalated, setEscalated] = useState(false);
  async function send(o: DiagnosisOutcome) {
    setState("busy");
    try {
      const r = await api.diagnosisOutcome(diagnosisId, o);
      setEscalated(r.escalated);
      setState(o);
    } catch {
      setState(null);
    }
  }
  if (state && state !== "busy")
    return (
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        {tr("photo.thankYou")}
        {escalated && ` ${tr("photo.daVisit")}`}
      </p>
    );
  const opts: [DiagnosisOutcome, string][] = [
    ["improved", tr("photo.outcome.better")],
    ["same", tr("photo.outcome.same")],
    ["worse", tr("photo.outcome.worse")],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!compact && <span className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("photo.howNow")}</span>}
      {opts.map(([o, label]) => (
        <Button key={o} size="xs" variant={o === "worse" ? "danger" : "outline"} disabled={state === "busy"} onClick={() => send(o)}>
          {label}
        </Button>
      ))}
    </div>
  );
}

export function PhotoDiagnosisResult({ result }: { result: AdvisoryDiagnosis }) {
  const title = result.kind === "disease" && result.disease ? result.disease : tr(KIND_TITLE[result.kind]);
  const accent = result.kind === "disease" ? "rose" : result.kind === "healthy" ? "green" : "amber";
  return (
    <Card
      accent={accent}
      icon={<HeartPulse className="size-5" />}
      title={title}
      description={result.plan?.pathogen ? tr("crop.causedBy", { pathogen: result.plan.pathogen }) : undefined}
      actions={
        <>
          <ListenButton
            text={[title, ...result.notes, ...result.general_advice, ...(result.plan?.cultural_practices ?? [])].join("\n")}
            language={result.language}
          />
          {result.kind !== "invalid_photo" && <Badge color="light">{tr("photo.sure", { pct: pct(result.confidence) })}</Badge>}
          <Badge color={result.mode === "photo_and_conditions" ? "primary" : "light"}>
            {tr(result.mode === "photo_and_conditions" ? "photo.withConditions" : "photo.photoOnly")}
          </Badge>
        </>
      }
    >
      <div className="space-y-5">
        {!!result.notes.length && (
          <ul className="space-y-1.5">
            {result.notes.map((n) => (
              <li key={n} className="flex gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                {n}
              </li>
            ))}
          </ul>
        )}

        {result.escalated && (
          <p className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 dark:bg-teal-500/10 dark:text-teal-300">
            <PhoneCall className="size-4" /> {tr("photo.daCheck")}
          </p>
        )}

        {!!result.general_advice.length && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">{tr("photo.untilThen")}</h4>
            <ul className="list-disc space-y-1 ps-5 text-sm text-gray-700 dark:text-gray-300">
              {result.general_advice.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        <ModelComparison result={result} />

        {result.plan && <PlanSection plan={result.plan} />}

        {result.follow_up_date && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              {tr("photo.askAgain", { date: formatFullDate(result.follow_up_date) })}
            </p>
            <OutcomeButtons diagnosisId={result.diagnosis_id} />
          </div>
        )}
      </div>
    </Card>
  );
}
