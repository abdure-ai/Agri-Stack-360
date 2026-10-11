import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/States";
import AreaPicker, { type AreaValue } from "@/components/form/AreaPicker";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import type { EstateBlock } from "@/types/api";
import { formatFullDate, todayISO } from "@/utils/formatters";
import { BellRing, Download, LayoutGrid, Plus, Users } from "lucide-react";
import { useState, type FormEvent } from "react";

const TH =
  "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300";
const CROPS = [
  "wheat",
  "teff",
  "maize",
  "barley",
  "sorghum",
  "onion",
  "tomato",
  "potato",
  "mango",
];
const SEVERITY_COLOR = {
  none: "light",
  low: "info",
  medium: "warning",
  high: "error",
} as const;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(url);
}

/** Commercial farm: blocks with crop stage, scouting, disease alerts near the blocks, team, export. */
export default function EstatePortal() {
  const { lang } = useI18n();
  const ov = useAsync(() => api.estateOverview(), []);
  const diseases = useAsync(() => api.estateDiseases(lang), [lang]);
  const [editing, setEditing] = useState<EstateBlock | "new" | null>(null);
  const [scouting, setScouting] = useState<EstateBlock | null>(null);
  const name = (k: string | null | undefined) =>
    k
      ? (diseases.data?.find((d) => d.key === k)?.name ?? k.replace(/_/g, " "))
      : "—";
  const d = ov.data;

  return (
    <>
      <PageMeta
        title={`${tr("nav.estate")} | ${tr("app.name")}`}
        description={tr("estate.description")}
      />
      <PageHeader
        title={d?.org.name ?? tr("nav.estate")}
        description={tr("estate.description")}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              startIcon={<Plus className="size-4" />}
              onClick={() => setEditing("new")}
            >
              {tr("estate.addBlock")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              startIcon={<Download className="size-4" />}
              onClick={async () =>
                saveBlob(await api.estateReportCsv(), "farm-blocks.csv")
              }
            >
              {tr("reports.export")}
            </Button>
          </div>
        }
      />
      {ov.loading ? (
        <LoadingState />
      ) : ov.error || !d ? (
        <ErrorState message={ov.error} onRetry={ov.reload} />
      ) : (
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Tile label={tr("estate.blocks")} value={String(d.totals.blocks)} />
            <Tile
              label={tr("estate.area")}
              value={`${d.totals.area_ha} ${tr("unit.ha")}`}
            />
            <Tile label={tr("estate.alerts")} value={String(d.alerts.length)} />
          </div>

          {d.alerts.length > 0 && (
            <Card
              accent="rose"
              icon={<BellRing className="size-5" />}
              title={tr("estate.alerts")}
            >
              <ul className="space-y-2 text-theme-sm">
                {d.alerts.map((a, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <Badge
                      size="sm"
                      color={
                        a.kind === "scouting"
                          ? SEVERITY_COLOR[
                              (a.severity ??
                                "low") as keyof typeof SEVERITY_COLOR
                            ]
                          : "warning"
                      }
                    >
                      {a.block}
                    </Badge>
                    {a.kind === "scouting"
                      ? tr("estate.alertScouting", {
                          disease: name(a.disease_key),
                          severity: tr(
                            `estate.sev.${a.severity}` as MessageKey,
                          ),
                        })
                      : tr("estate.alertNearby", {
                          disease: a.disease ?? name(a.disease_key),
                          farms: a.farms ?? 0,
                          km: a.nearest_km ?? 0,
                        })}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card
            accent="green"
            icon={<LayoutGrid className="size-5" />}
            title={tr("estate.blocks")}
            bodyClassName="p-0"
          >
            {!d.blocks.length ? (
              <EmptyState title={tr("estate.noBlocks")} />
            ) : (
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                    <TableRow>
                      <TableCell isHeader className={`${TH} ps-5`}>
                        {tr("estate.block")}
                      </TableCell>
                      <TableCell isHeader className={TH}>
                        {tr("da.col.crop")}
                      </TableCell>
                      <TableCell isHeader className={TH}>
                        {tr("outlook.harvest")}
                      </TableCell>
                      <TableCell isHeader className={TH}>
                        {tr("estate.lastScouting")}
                      </TableCell>
                      <TableCell isHeader className={`${TH} pe-5`}>
                        {" "}
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {d.blocks.map((b) => (
                      <TableRow
                        key={b.id}
                        className={b.status === "active" ? "" : "opacity-60"}
                      >
                        <TableCell className={`${TD} ps-5`}>
                          <span className="font-medium text-gray-800 dark:text-white/90">
                            {b.name}
                          </span>
                          <span className="block text-theme-xs text-gray-400">
                            {b.area_ha} {tr("unit.ha")}
                            {b.woreda ? ` · ${b.woreda}` : ""} ·{" "}
                            {tr(`estate.status.${b.status}` as MessageKey)}
                          </span>
                        </TableCell>
                        <TableCell className={TD}>
                          {trTerm("crop", b.crop)}
                          {b.days_after_planting != null && (
                            <span className="block text-theme-xs text-gray-500">
                              {tr("da.day", { n: b.days_after_planting })}
                              {b.stage_key
                                ? ` · ${trTerm("stage", b.stage_key)}`
                                : ""}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={TD}>
                          {b.expected_harvest
                            ? formatFullDate(b.expected_harvest)
                            : "—"}
                          {b.harvest_estimated && (
                            <span className="block text-theme-xs text-gray-400">
                              {tr("estate.estimated")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={TD}>
                          {b.last_scouting ? (
                            <>
                              <Badge
                                size="sm"
                                color={
                                  SEVERITY_COLOR[
                                    b.last_scouting
                                      .severity as keyof typeof SEVERITY_COLOR
                                  ]
                                }
                              >
                                {tr(
                                  `estate.sev.${b.last_scouting.severity}` as MessageKey,
                                )}
                              </Badge>{" "}
                              {b.last_scouting.disease_key &&
                                name(b.last_scouting.disease_key)}
                              <span className="block text-theme-xs text-gray-400">
                                {formatFullDate(b.last_scouting.created_at)}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className={`${TD} pe-5`}>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setScouting(b)}
                            >
                              {tr("estate.scout")}
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setEditing(b)}
                            >
                              {tr("common.edit")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          <Card
            accent="blue"
            icon={<Users className="size-5" />}
            title={tr("estate.team")}
            description={tr("estate.teamHint")}
          >
            <ul className="divide-y divide-gray-100 text-theme-sm dark:divide-gray-800">
              {d.team.map((t) => (
                <li key={t.id} className="flex justify-between py-2">
                  <span>
                    {t.name} <span className="text-gray-500">· {t.phone}</span>
                  </span>
                  <Badge
                    size="sm"
                    color={t.member_role === "owner" ? "primary" : "light"}
                  >
                    {tr(
                      t.member_role === "owner" ? "orgs.owner" : "orgs.staff",
                    )}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
      {editing && (
        <BlockModal
          block={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            ov.reload();
          }}
        />
      )}
      {scouting && (
        <ScoutModal
          block={scouting}
          diseases={diseases.data ?? []}
          onClose={() => setScouting(null)}
          onSaved={() => {
            setScouting(null);
            ov.reload();
          }}
        />
      )}
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

function BlockModal({
  block,
  onClose,
  onSaved,
}: {
  block: EstateBlock | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: block?.name ?? "",
    area_ha: block ? String(block.area_ha) : "",
    crop: block?.crop ?? "wheat",
    variety: block?.variety ?? "",
    season: block?.season ?? "irrigated",
    planting_date: block?.planting_date ?? todayISO(),
    expected_harvest_date: block?.expected_harvest_date ?? "",
    status: block?.status ?? "active",
  });
  const [area, setArea] = useState<AreaValue>({
    region_pcode: block?.woreda_pcode?.slice(0, 4) ?? "",
    zone_pcode: block?.woreda_pcode?.slice(0, 6) ?? "",
    woreda_pcode: block?.woreda_pcode ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      ...form,
      area_ha: Number(form.area_ha),
      variety: form.variety || null,
      planting_date: form.planting_date || null,
      expected_harvest_date: form.expected_harvest_date || null,
      woreda_pcode: area.woreda_pcode || null,
    };
    try {
      if (block) await api.estateUpdateBlock(block.id, body);
      else await api.estateAddBlock(body);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-2xl p-6 sm:p-8">
      <h3 className="mb-5 pe-12 text-lg font-semibold text-gray-800 dark:text-white/90">
        {block ? block.name : tr("estate.addBlock")}
      </h3>
      <form onSubmit={save} noValidate className="space-y-4">
        {error && <Alert variant="error" message={error} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="eb-name">{tr("estate.block")}</Label>
            <Input
              id="eb-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="eb-area">{tr("profile.area")}</Label>
            <Input
              id="eb-area"
              type="number"
              min={0}
              step={0.1}
              value={form.area_ha}
              onChange={(e) => set("area_ha", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="eb-crop">{tr("seasons.crop")}</Label>
            <Select
              id="eb-crop"
              options={CROPS.map((c) => ({
                value: c,
                label: trTerm("crop", c),
              }))}
              value={form.crop}
              onChange={(v) => set("crop", v)}
            />
          </div>
          <div>
            <Label htmlFor="eb-variety">{tr("seasons.variety")}</Label>
            <Input
              id="eb-variety"
              value={form.variety}
              onChange={(e) => set("variety", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="eb-season">{tr("seasons.kind")}</Label>
            <Select
              id="eb-season"
              value={form.season}
              onChange={(v) => set("season", v as typeof form.season)}
              options={(["irrigated", "meher", "belg"] as const).map((k) => ({
                value: k,
                label: trTerm("season", k),
              }))}
            />
          </div>
          <div>
            <Label htmlFor="eb-status">{tr("estate.statusLabel")}</Label>
            <Select
              id="eb-status"
              value={form.status}
              onChange={(v) => set("status", v as typeof form.status)}
              options={(["active", "harvested", "fallow"] as const).map(
                (k) => ({
                  value: k,
                  label: tr(`estate.status.${k}` as MessageKey),
                }),
              )}
            />
          </div>
          <div>
            <Label htmlFor="eb-planted">{tr("seasons.planted")}</Label>
            <Input
              id="eb-planted"
              type="date"
              value={form.planting_date}
              onChange={(e) => set("planting_date", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="eb-harvest">{tr("seasons.harvest")}</Label>
            <Input
              id="eb-harvest"
              type="date"
              value={form.expected_harvest_date}
              onChange={(e) => set("expected_harvest_date", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <AreaPicker idPrefix="eb" value={area} onChange={setArea} />
          </div>
        </div>
        <div className="flex justify-between gap-3">
          {block ? (
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={async () => {
                await api.estateDeleteBlock(block.id);
                onSaved();
              }}
            >
              {tr("common.delete")}
            </Button>
          ) : (
            <span />
          )}
          <span className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={busy}
            >
              {tr("common.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={busy}
              disabled={!form.name.trim() || !(Number(form.area_ha) > 0)}
            >
              {tr("common.saveChanges")}
            </Button>
          </span>
        </div>
      </form>
    </Modal>
  );
}

function ScoutModal({
  block,
  diseases,
  onClose,
  onSaved,
}: {
  block: EstateBlock;
  diseases: { key: string; name: string; is_disease?: boolean }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    disease_key: "",
    severity: "none",
    incidence_pct: "",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.estateScout(block.id, {
        disease_key: form.disease_key || null,
        severity: form.severity,
        incidence_pct: form.incidence_pct ? Number(form.incidence_pct) : null,
        note: form.note || null,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-lg p-6 sm:p-8">
      <h3 className="mb-1 pe-12 text-lg font-semibold text-gray-800 dark:text-white/90">
        {tr("estate.scout")}: {block.name}
      </h3>
      <p className="mb-5 text-sm text-gray-500">{todayISO()}</p>
      <form onSubmit={save} noValidate className="space-y-4">
        {error && <Alert variant="error" message={error} />}
        <div>
          <Label htmlFor="sc-sev">{tr("estate.severity")}</Label>
          <Select
            id="sc-sev"
            value={form.severity}
            onChange={(v) => set("severity", v)}
            options={["none", "low", "medium", "high"].map((k) => ({
              value: k,
              label: tr(`estate.sev.${k}` as MessageKey),
            }))}
          />
        </div>
        {form.severity !== "none" && (
          <>
            <div>
              <Label htmlFor="sc-dis">{tr("estate.disease")}</Label>
              <Select
                id="sc-dis"
                placeholder="—"
                value={form.disease_key}
                onChange={(v) => set("disease_key", v)}
                options={diseases
                  .filter((x) => x.is_disease !== false)
                  .map((x) => ({ value: x.key, label: x.name }))}
              />
            </div>
            <div>
              <Label htmlFor="sc-inc">{tr("estate.incidence")}</Label>
              <Input
                id="sc-inc"
                type="number"
                min={0}
                max={100}
                value={form.incidence_pct}
                onChange={(e) => set("incidence_pct", e.target.value)}
              />
            </div>
          </>
        )}
        <div>
          <Label htmlFor="sc-note">{tr("estate.note")}</Label>
          <Input
            id="sc-note"
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            {tr("common.cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={form.severity !== "none" && !form.disease_key}
          >
            {tr("common.saveChanges")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
