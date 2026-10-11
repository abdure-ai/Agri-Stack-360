import { api } from "@/api/client";
import { ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, trTerm } from "@/i18n/core";
import type { CropSeason, Farm, SeasonKind } from "@/types/api";
import { formatFullDate, todayISO } from "@/utils/formatters";
import { useState, type FormEvent } from "react";

// Wheat first: the crop calendar and guidance cover irrigated wheat today. Other crops are recorded only
// (no calendar or advice until the Ministry manuals for them are added to the knowledge base).
const CROPS = ["wheat", "teff", "maize", "barley", "sorghum", "bean", "potato", "onion", "tomato", "mango"];
const KINDS: SeasonKind[] = ["irrigated", "meher", "belg"];
const STATUS_COLOR = { active: "success", harvested: "light", failed: "error" } as const;

/** A farm's crop seasons: what is planted when. One growing crop per field at a time. */
export default function SeasonsModal({ farm, onClose }: { farm: Farm; onClose: () => void }) {
  const seasons = useAsync(() => api.getSeasons(farm.id), [farm.id]);
  const [form, setForm] = useState({ crop: "wheat", variety: "", planting_date: todayISO(), season: "irrigated" as SeasonKind, harvest: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
  };

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      seasons.reload();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const ok = await run(() =>
      api.addSeason(farm.id, {
        crop: form.crop,
        variety: form.variety.trim() || null,
        planting_date: form.planting_date,
        season: form.season,
        expected_harvest_date: form.harvest || null,
      }),
    );
    if (ok) setForm((f) => ({ ...f, variety: "", harvest: "" }));
  }

  const harvest = (s: CropSeason) =>
    run(() =>
      api.updateSeason(farm.id, s.id, {
        crop: s.crop,
        variety: s.variety,
        planting_date: s.planting_date,
        season: s.season,
        expected_harvest_date: s.expected_harvest_date,
        status: "harvested",
      }),
    );

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-2xl p-6 sm:p-8">
      <h3 className="pe-12 text-lg font-semibold text-gray-800 dark:text-white/90">{tr("seasons.title", { field: farm.field_name })}</h3>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{tr("seasons.hint")}</p>
      {error && <Alert className="mb-4" variant="error" message={error} />}

      {seasons.loading ? (
        <LoadingState />
      ) : seasons.error ? (
        <ErrorState message={seasons.error} onRetry={seasons.reload} />
      ) : !seasons.data?.length ? (
        <p className="mb-5 text-theme-sm text-gray-500 dark:text-gray-400">{tr("seasons.none")}</p>
      ) : (
        <ul className="mb-6 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {seasons.data.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {trTerm("crop", s.crop)}
                  {s.variety ? ` · ${s.variety}` : ""} · {trTerm("season", s.season)}
                </p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {tr("seasons.planted")}: {formatFullDate(s.planting_date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge size="sm" color={STATUS_COLOR[s.status]}>
                  {tr(`seasons.status.${s.status}`)}
                </Badge>
                {s.status === "active" && (
                  <Button size="xs" variant="outline" disabled={busy} onClick={() => harvest(s)}>
                    {tr("seasons.markHarvested")}
                  </Button>
                )}
                <Button size="xs" variant="ghost" disabled={busy} onClick={() => run(() => api.deleteSeason(farm.id, s.id))}>
                  {tr("common.delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="se-crop">{tr("seasons.crop")}</Label>
            <Select id="se-crop" options={CROPS.map((c) => ({ value: c, label: trTerm("crop", c) }))} value={form.crop} onChange={(v) => set("crop", v)} />
          </div>
          {form.crop !== "wheat" && (
            <p className="text-theme-xs text-warning-600 sm:col-span-2 dark:text-warning-400">{tr("seasons.noGuidance")}</p>
          )}
          <div>
            <Label htmlFor="se-variety">{tr("seasons.variety")}</Label>
            <Input id="se-variety" value={form.variety} onChange={(e) => set("variety", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="se-planted">{tr("seasons.planted")}</Label>
            <Input id="se-planted" type="date" value={form.planting_date} onChange={(e) => set("planting_date", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="se-kind">{tr("seasons.kind")}</Label>
            <Select
              id="se-kind"
              options={KINDS.map((k) => ({ value: k, label: trTerm("season", k) }))}
              value={form.season}
              onChange={(v) => set("season", v as SeasonKind)}
            />
          </div>
          <div>
            <Label htmlFor="se-harvest">{tr("seasons.harvest")}</Label>
            <Input id="se-harvest" type="date" value={form.harvest} onChange={(e) => set("harvest", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {tr("common.close")}
          </Button>
          <Button type="submit" size="sm" loading={busy} disabled={!form.planting_date}>
            {tr("seasons.add")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
