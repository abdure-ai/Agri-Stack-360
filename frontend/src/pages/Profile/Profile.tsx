import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import ConsentCard from "@/components/profile/ConsentCard";
import SeasonsModal from "@/components/profile/SeasonsModal";
import AbcInvitationsCard from "@/components/profile/AbcInvitationsCard";
import CreditRequestsCard from "@/components/profile/CreditRequestsCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import type { Farm, FarmInput, FarmStatus } from "@/types/api";
import AreaPicker, { areaFrom, areaPcode } from "@/components/form/AreaPicker";
import { LANGUAGE_NAMES, LANGUAGES as UI_LANGUAGES, tr, trTerm, type MessageKey } from "@/i18n/core";
import { roleLabel } from "@/utils/constants";
import { formatFullDate } from "@/utils/formatters";
import { CalendarDays, Tractor, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";

const LANGUAGES = UI_LANGUAGES.map((code) => ({ value: code, label: LANGUAGE_NAMES[code] }));

const STATUS_KEYS: { value: FarmStatus; label: MessageKey }[] = [
  { value: "healthy", label: "farm.status.healthy" },
  { value: "warning", label: "farm.status.warning" },
  { value: "critical", label: "farm.status.critical" },
];
const statusOptions = () => STATUS_KEYS.map((s) => ({ value: s.value, label: tr(s.label) }));

const STATUS_COLOR: Record<FarmStatus, "success" | "warning" | "error"> = {
  healthy: "success",
  warning: "warning",
  critical: "error",
};

const EMPTY_FARM: FarmInput = {
  field_name: "",
  crop_name: "",
  variety: "",
  area_ha: null,
  planted_date: "",
  status: "healthy",
  notes: "",
};

export default function Profile() {
  const { can } = useAuth();
  // Agents and admins work with other people's farms on Crop Health instead.
  const ownsFarms = can("farms:manage:own") && !can("farms:manage:all", "farms:read:region");
  return (
    <>
      <PageMeta title={`${tr("nav.profile")} | ${tr("app.name")}`} description={tr("profile.meta")} />
      <PageHeader title={tr("nav.profile")} description={tr("profile.description")} />
      <div className="space-y-6">
        <ProfileCard />
        {ownsFarms && <FarmsCard />}
        {ownsFarms && <AbcInvitationsCard />}
        {ownsFarms && <CreditRequestsCard />}
        {ownsFarms && <ConsentCard />}
      </div>
    </>
  );
}

function ProfileCard() {
  const { user, updateUser, can } = useAuth();
  // An agent's region decides whose farms they support; only an admin can move it.
  const regionLocked = can("farms:read:region") && !can("farms:manage:all");
  const [form, setForm] = useState({
    name: user?.name ?? "",
    language: user?.language ?? "en",
  });
  const initialArea = areaFrom(user);
  const [area, setArea] = useState(initialArea);
  // Addresses typed before the official area lists existed have names but no P-codes.
  const legacyAddress = !user?.region_pcode && [user?.region, user?.zone, user?.woreda].filter(Boolean).join(" / ");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setStatus(null);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setStatus({ ok: false, text: tr("profile.nameEmpty") });
      return;
    }
    setBusy(true);
    try {
      const pcode = areaPcode(area);
      const saved = await api.updateProfile({
        name: form.name.trim(),
        language: form.language,
        ...(pcode && pcode !== areaPcode(initialArea) ? { area_pcode: pcode } : {}),
      });
      updateUser(saved);
      setStatus({ ok: true, text: tr("profile.saved") });
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card accent="teal" icon={<UserRound className="size-5" />} title={tr("profile.personal")} description={user ? `${roleLabel(user.role)} · ${user.phone}` : undefined}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {status && <Alert variant={status.ok ? "success" : "error"} message={status.text} />}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label htmlFor="p-name">{tr("form.fullName")}</Label>
            <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="p-phone">{tr("form.phone")}</Label>
            <Input id="p-phone" value={user?.phone ?? ""} disabled hint={tr("profile.phoneHint")} />
          </div>
          <div>
            <Label htmlFor="p-lang">{tr("form.language")}</Label>
            <Select id="p-lang" options={LANGUAGES} value={form.language} onChange={(v) => set("language", v)} />
          </div>
        </div>
        <div>
          <AreaPicker
            idPrefix="p"
            value={area}
            onChange={(v) => {
              setArea(v);
              setStatus(null);
            }}
            regionLocked={regionLocked}
          />
          {regionLocked && (
            <p className="mt-1.5 text-xs text-gray-500">
              {tr("profile.regionLocked")}
            </p>
          )}
          {legacyAddress && (
            <p className="mt-1.5 text-xs text-warning-600 dark:text-warning-400">
              {tr("profile.legacyAddress", { address: legacyAddress })}
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={busy}>
            {tr("common.saveChanges")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function FarmsCard() {
  const farms = useAsync(() => api.getFarms(), []);
  const [editing, setEditing] = useState<Farm | "new" | null>(null);
  const [seasonsOf, setSeasonsOf] = useState<Farm | null>(null);
  const [deleting, setDeleting] = useState<Farm | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.deleteFarm(deleting.id);
      farms.setData((list) => list?.filter((f) => f.id !== deleting.id) ?? null);
      setDeleting(null);
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  function onSaved(farm: Farm) {
    farms.setData((list) => {
      const rest = (list ?? []).filter((f) => f.id !== farm.id);
      return editing === "new" ? [...rest, farm] : (list ?? []).map((f) => (f.id === farm.id ? farm : f));
    });
    setEditing(null);
  }

  return (
    <Card
      accent="green"
      icon={<Tractor className="size-5" />}
      title={tr("dash.myFarms")}
      description={tr("profile.farmsHint")}
      actions={
        <Button size="sm" startIcon={<PlusIcon className="size-4" />} onClick={() => setEditing("new")}>
          {tr("profile.addFarm")}
        </Button>
      }
    >
      {deleteError && <Alert variant="error" message={deleteError} className="mb-4" />}
      {farms.loading ? (
        <LoadingState />
      ) : farms.error ? (
        <ErrorState message={farms.error} onRetry={farms.reload} />
      ) : !farms.data?.length ? (
        <EmptyState title={tr("dash.noFarmsYet")} description={tr("profile.firstField")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {farms.data.map((f) => (
            <div key={f.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate font-semibold text-gray-800 dark:text-white/90">{f.field_name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {trTerm("crop", f.crop_name)}
                    {f.variety ? ` · ${f.variety}` : ""}
                  </p>
                </div>
                <Badge size="sm" color={STATUS_COLOR[f.status] ?? "light"}>
                  {statusOptions().find((s) => s.value === f.status)?.label ?? f.status}
                </Badge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-theme-xs">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{tr("profile.area")}</dt>
                  <dd className="text-gray-800 dark:text-white/90">{f.area_ha ? `${f.area_ha} ${tr("unit.ha")}` : "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{tr("profile.planted")}</dt>
                  <dd className="text-gray-800 dark:text-white/90">{formatFullDate(f.planted_date)}</dd>
                </div>
              </dl>
              {f.notes && <p className="mt-3 line-clamp-2 text-theme-xs text-gray-500 dark:text-gray-400">{f.notes}</p>}
              <div className="mt-4 flex gap-2">
                <Button size="xs" variant="outline" startIcon={<PencilIcon className="size-4" />} onClick={() => setEditing(f)}>
                  {tr("common.edit")}
                </Button>
                <Button size="xs" variant="outline" startIcon={<CalendarDays className="size-4" />} onClick={() => setSeasonsOf(f)}>
                  {tr("seasons.button")}
                </Button>
                <Button size="xs" variant="danger" startIcon={<TrashBinIcon className="size-4" />} onClick={() => setDeleting(f)}>
                  {tr("common.delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {seasonsOf && (
        <SeasonsModal
          farm={seasonsOf}
          onClose={() => {
            setSeasonsOf(null);
            farms.reload();
          }}
        />
      )}
      {editing && <FarmModal farm={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={onSaved} />}

      <ConfirmDialog
        isOpen={!!deleting}
        title={tr("profile.deleteTitle")}
        message={deleting ? tr("profile.deleteMessage", { name: deleting.field_name }) : undefined}
        confirmLabel={tr("common.delete")}
        destructive
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </Card>
  );
}

function FarmModal({ farm, onClose, onSaved }: { farm: Farm | null; onClose: () => void; onSaved: (f: Farm) => void }) {
  const [form, setForm] = useState<FarmInput>(() => (farm ? { ...EMPTY_FARM, ...farm } : EMPTY_FARM));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FarmInput>(k: K, v: FarmInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.field_name.trim() || !form.crop_name.trim()) {
      setError(tr("profile.fieldRequired"));
      return;
    }
    if (form.area_ha != null && (Number.isNaN(form.area_ha) || form.area_ha <= 0)) {
      setError(tr("profile.areaPositive"));
      return;
    }
    const payload: FarmInput = {
      ...form,
      field_name: form.field_name.trim(),
      crop_name: form.crop_name.trim(),
      variety: form.variety?.trim() || null,
      planted_date: form.planted_date || null,
      notes: form.notes?.trim() || null,
    };
    setBusy(true);
    setError(null);
    try {
      const saved = farm ? await api.updateFarm(farm.id, payload) : await api.addFarm(payload);
      // Some endpoints return only an id; merge so the list stays complete.
      onSaved({ ...payload, ...saved, id: saved?.id ?? farm?.id ?? Date.now() } as Farm);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-2xl p-6 sm:p-8">
      <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">{tr(farm ? "profile.editFarm" : "dash.addFarm")}</h3>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{tr("profile.oneField")}</p>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <Alert variant="error" message={error} />}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="fm-name">{tr("profile.fieldName")} *</Label>
            <Input id="fm-name" placeholder={tr("profile.fieldNamePlaceholder")} value={form.field_name} onChange={(e) => set("field_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fm-crop">{tr("market.crop")} *</Label>
            <Input id="fm-crop" placeholder={tr("profile.cropPlaceholder")} value={form.crop_name} onChange={(e) => set("crop_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fm-variety">{tr("market.variety")}</Label>
            <Input id="fm-variety" placeholder={tr("common.optional")} value={form.variety ?? ""} onChange={(e) => set("variety", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fm-area">{tr("profile.areaHa")}</Label>
            <Input
              id="fm-area"
              type="number"
              min="0"
              step={0.1}
              value={form.area_ha ?? ""}
              onChange={(e) => set("area_ha", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="fm-planted">{tr("profile.plantingDate")}</Label>
            <Input id="fm-planted" type="date" value={form.planted_date ?? ""} onChange={(e) => set("planted_date", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fm-status">{tr("profile.condition")}</Label>
            <Select id="fm-status" options={statusOptions()} value={form.status} onChange={(v) => set("status", v as FarmStatus)} />
          </div>
        </div>
        <div>
          <Label>{tr("profile.notes")}</Label>
          <TextArea placeholder={tr("profile.notesPlaceholder")} value={form.notes ?? ""} onChange={(v) => set("notes", v)} />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {tr("common.cancel")}
          </Button>
          <Button type="submit" size="sm" loading={busy}>
            {tr(farm ? "common.saveChanges" : "profile.addFarm")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
