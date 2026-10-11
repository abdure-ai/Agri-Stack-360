import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import StatCard from "@/components/common/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import AreaPicker, { areaFrom, areaPcode } from "@/components/form/AreaPicker";
import Input from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { DownloadIcon, EyeCloseIcon, EyeIcon, GroupIcon } from "@/icons";
import type { AdminUser, AdminUserUpdate, Permission, PermissionInfo, Role, RoleInfo } from "@/types/api";
import { cn } from "@/utils";
import { ACCENTS, ROLE_ACCENTS } from "@/utils/accents";
import { LANGUAGE_NAMES, LANGUAGES as UI_LANGUAGES, tr, trTerm } from "@/i18n/core";
import { permLabel, REGIONS, roleLabel, ROLES } from "@/utils/constants";
import { exportCsv } from "@/utils/exportCsv";
import { formatDateTime, formatNumber } from "@/utils/formatters";
import {
  BadgeCheck,
  EllipsisVertical,
  HeartPulse,
  KeyRound,
  Pencil,
  Tractor,
  UserPen,
  Users as UsersIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";

const TH = "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300";

const LANGUAGES = UI_LANGUAGES.map((code) => ({ value: code, label: LANGUAGE_NAMES[code] }));

type Dialog =
  | { kind: "edit"; user: AdminUser }
  | { kind: "password"; user: AdminUser }
  | { kind: "active"; user: AdminUser; active: boolean };

/** What a role change adds and removes, in plain words. */
function roleDiff(roles: RoleInfo[] | null, permissions: PermissionInfo[] | null, from: Role, to: Role) {
  const perms = (r: Role) => new Set<Permission>(roles?.find((x) => x.role === r)?.permissions ?? []);
  const label = (p: Permission) => permLabel(p, permissions?.find((x) => x.name === p)?.label);
  const a = perms(from);
  const b = perms(to);
  return {
    gains: [...b].filter((p) => !a.has(p)).map(label),
    loses: [...a].filter((p) => !b.has(p)).map(label),
  };
}

export default function Users() {
  const { user: me } = useAuth();
  const stats = useAsync(() => api.adminStats(), []);
  const users = useAsync(() => api.adminUsers(), []);
  const roles = useAsync(() => api.adminRoles(), []);
  const permissions = useAsync(() => api.adminPermissions(), []);

  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  // ?role=agent (linked from the Roles page) pre-filters the table
  const roleFilter = ROLES.includes(params.get("role") as Role) ? (params.get("role") as Role) : "";
  const setRoleFilter = (r: string) => setParams(r ? { role: r } : {}, { replace: true });

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingRegion, setSavingRegion] = useState<number | null>(null);

  const q = search.trim().toLowerCase();
  const rows = (users.data ?? []).filter(
    (u) =>
      (!roleFilter || u.role === roleFilter) &&
      (!q || u.name.toLowerCase().includes(q) || u.phone.includes(q) || u.region?.toLowerCase().includes(q)),
  );

  function replaceUser(updated: AdminUser) {
    users.setData((list) => list?.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)) ?? null);
  }

  async function applyActive() {
    if (dialog?.kind !== "active") return;
    setBusy(true);
    setError(null);
    try {
      replaceUser(await api.adminUpdateUser(dialog.user.id, { is_active: dialog.active }));
      stats.reload();
      roles.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDialog(null);
      setBusy(false);
    }
  }

  async function changeRegion(u: AdminUser, region: string) {
    setSavingRegion(u.id);
    setError(null);
    try {
      replaceUser(await api.adminUpdateUser(u.id, { region: region || null }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingRegion(null);
    }
  }

  const byRole = stats.data?.users_by_role ?? {};

  return (
    <>
      <PageMeta title={`${tr("nav.users")} | ${tr("app.name")}`} description={tr("users.meta")} />
      <PageHeader title={tr("nav.users")} description={tr("users.description")} />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
          <StatCard
            accent="blue"
            icon={<UsersIcon className="size-6" />}
            label={tr("users.total")}
            loading={stats.loading}
            value={formatNumber(stats.data?.total_users)}
            footer={ROLES.filter((r) => byRole[r]).map((r) => `${byRole[r]} ${roleLabel(r)}`).join(" · ")}
          />
          <StatCard accent="teal" icon={<Tractor className="size-6" />} label={tr("users.farms")} loading={stats.loading} value={formatNumber(stats.data?.total_farms)} />
          <StatCard
            accent="amber"
            icon={<HeartPulse className="size-6" />}
            label={tr("users.openReports")}
            loading={stats.loading}
            value={formatNumber(stats.data?.open_health_reports)}
            tone={stats.data?.open_health_reports ? "warning" : "default"}
          />
          <StatCard accent="green" icon={<BadgeCheck className="size-6" />} label={tr("users.resolvedReports")} loading={stats.loading} value={formatNumber(stats.data?.resolved_health_reports)} tone="success" />
        </div>

        {error && <Alert variant="error" message={error} />}
        {notice && <Alert variant="success" message={notice} />}

        <Card
          accent="rose"
          icon={<UsersIcon className="size-5" />}
          title={tr("users.all")}
          actions={
            <>
              <div className="w-56">
                <Input placeholder={tr("users.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="w-44">
                <Select
                  aria-label={tr("users.filterRole")}
                  placeholder={tr("users.allRoles")}
                  options={ROLES.map((r) => ({ value: r, label: roleLabel(r) }))}
                  value={roleFilter}
                  onChange={setRoleFilter}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                startIcon={<DownloadIcon className="size-4" />}
                disabled={!rows.length}
                onClick={() => exportCsv(rows, "agri-stack-users.csv")}
              >
                CSV
              </Button>
            </>
          }
          bodyClassName="px-0 sm:px-0 pb-2"
        >
          {users.loading ? (
            <LoadingState />
          ) : users.error ? (
            <ErrorState message={users.error} onRetry={users.reload} />
          ) : !rows.length ? (
            <EmptyState icon={<GroupIcon className="size-6" />} title={tr("users.noMatch")} description={tr("users.noMatchHint")} />
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className={`${TH} ps-5 sm:ps-6`}>{tr("common.name")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("common.phone")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("common.region")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("users.farmsCol")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("users.joined")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("form.role")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("common.active")}</TableCell>
                    <TableCell isHeader className={`${TH} pe-5 text-end sm:pe-6`}>{tr("common.actions")}</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((u) => {
                    const isMe = u.id === me?.id;
                    const agentWithoutRegion = u.role === "agent" && !u.region;
                    return (
                      <TableRow key={u.id} className={u.is_active ? "" : "opacity-60"}>
                        <TableCell className={`${TD} ps-5 font-medium text-gray-800 sm:ps-6 dark:text-white/90`}>
                          {u.name}
                          {isMe && (
                            <span className="ms-2">
                              <Badge size="sm" color="primary">
                                {tr("common.you")}
                              </Badge>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={TD}>{u.phone}</TableCell>
                        <TableCell className={TD}>
                          <div className="w-36" title={agentWithoutRegion ? tr("users.agentRegionHint") : undefined}>
                            <Select
                              aria-label={tr("users.regionFor", { name: u.name })}
                              placeholder={tr("users.noRegion")}
                              options={REGIONS.map((r) => ({ value: r, label: trTerm("region", r) }))}
                              value={u.region ?? ""}
                              disabled={savingRegion === u.id}
                              className={agentWithoutRegion ? "border-warning-400 dark:border-warning-500/60" : undefined}
                              onChange={(v) => v !== (u.region ?? "") && changeRegion(u, v)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className={TD}>{u.farm_count ?? 0}</TableCell>
                        <TableCell className={`${TD} whitespace-nowrap`}>{formatDateTime(u.created_at)}</TableCell>
                        <TableCell className={TD}>
                          <RoleLabel role={u.role} />
                        </TableCell>
                        <TableCell className={TD}>
                          <Switch
                            checked={!!u.is_active}
                            disabled={isMe}
                            onChange={(on) => setDialog({ kind: "active", user: u, active: on })}
                          />
                        </TableCell>
                        <TableCell className={`${TD} pe-5 text-end sm:pe-6`}>
                          <ActionsMenu
                            user={u}
                            onEdit={() => {
                              setNotice(null);
                              setDialog({ kind: "edit", user: u });
                            }}
                            onResetPassword={() => {
                              setNotice(null);
                              setDialog({ kind: "password", user: u });
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {dialog?.kind === "edit" && (
        <EditUserModal
          user={dialog.user}
          isMe={dialog.user.id === me?.id}
          roles={roles.data}
          permissions={permissions.data}
          agents={(users.data ?? []).filter((u) => u.role === "agent" && u.is_active)}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            replaceUser(updated);
            stats.reload();
            roles.reload();
            setDialog(null);
            setNotice(tr("users.savedNotice", { name: updated.name }));
          }}
        />
      )}

      {dialog?.kind === "password" && (
        <ResetPasswordModal
          user={dialog.user}
          onClose={() => setDialog(null)}
          onDone={() => {
            setNotice(tr("users.passwordNotice", { name: dialog.user.name }));
            setDialog(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={dialog?.kind === "active"}
        busy={busy}
        destructive={dialog?.kind === "active" && !dialog.active}
        title={
          dialog?.kind === "active" ? tr(dialog.active ? "users.reactivateQ" : "users.deactivateQ", { name: dialog.user.name }) : ""
        }
        message={
          dialog?.kind === "active" && !dialog.active ? tr("users.deactivateBody") : tr("users.reactivateBody")
        }
        confirmLabel={tr(dialog?.kind === "active" && !dialog.active ? "users.deactivate" : "users.reactivate")}
        onConfirm={applyActive}
        onClose={() => setDialog(null)}
      />
    </>
  );
}

/** Role shown as read-only text in the role's colour. */
function RoleLabel({ role }: { role: Role }) {
  const a = ACCENTS[ROLE_ACCENTS[role] ?? "green"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-medium whitespace-nowrap", a.tile)}>
      <span className={cn("size-1.5 rounded-full", a.bar)} aria-hidden="true" />
      {roleLabel(role)}
    </span>
  );
}

/**
 * Row menu. Rendered with fixed positioning so the table's horizontal
 * scroll area cannot clip it on the last rows.
 */
function ActionsMenu({ user, onEdit, onResetPassword }: { user: AdminUser; onEdit: () => void; onResetPassword: () => void }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (open) return setPos(null);
    const r = buttonRef.current!.getBoundingClientRect();
    const menuHeight = 100;
    const top = r.bottom + 6 + menuHeight > window.innerHeight ? r.top - menuHeight - 6 : r.bottom + 6;
    setPos({ top, right: window.innerWidth - r.right });
  }

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tr("users.actionsFor", { name: user.name })}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
          open
            ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
            : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5",
        )}
      >
        {tr("common.actions")}
        <EllipsisVertical className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-99 w-52 rounded-xl border border-gray-200 bg-white p-1.5 text-start shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
        >
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setPos(null);
              onEdit();
            }}
          >
            <UserPen className="size-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            {tr("users.editUser")}
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setPos(null);
              onResetPassword();
            }}
          >
            <KeyRound className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            {tr("users.resetPassword")}
          </button>
        </div>
      )}
    </>
  );
}

function EditUserModal({
  user,
  isMe,
  roles,
  permissions,
  agents,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  isMe: boolean;
  roles: RoleInfo[] | null;
  permissions: PermissionInfo[] | null;
  /** Active extension agents, for a farmer's Development Agent. */
  agents: AdminUser[];
  onClose: () => void;
  onSaved: (u: AdminUser) => void;
}) {
  const initial = {
    name: user.name,
    role: user.role,
    area: areaFrom(user),
    language: user.language || "en",
    is_active: !!user.is_active,
    da: user.assigned_da_id ? String(user.assigned_da_id) : "",
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
  };

  // Only send what changed, so the server's checks apply to real changes only
  const patch: AdminUserUpdate = {};
  if (form.name.trim() !== initial.name) patch.name = form.name.trim();
  if (form.role !== initial.role) patch.role = form.role;
  if (areaPcode(form.area) && areaPcode(form.area) !== areaPcode(initial.area)) patch.area_pcode = areaPcode(form.area);
  if (form.language !== initial.language) patch.language = form.language;
  if (form.is_active !== initial.is_active) patch.is_active = form.is_active;
  const daChanged = user.role === "farmer" && form.da !== initial.da;
  const dirty = Object.keys(patch).length > 0 || daChanged;

  const diff = form.role !== initial.role ? roleDiff(roles, permissions, initial.role, form.role) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(tr("profile.nameEmpty"));
      return;
    }
    if (form.role === "agent" && !form.area.region_pcode && !user.region) {
      setError(tr("users.agentNeedsRegion"));
      return;
    }
    setBusy(true);
    try {
      let updated = Object.keys(patch).length ? await api.adminUpdateUser(user.id, patch) : user;
      if (daChanged) {
        const r = await api.assignDa(user.id, form.da ? Number(form.da) : null);
        updated = { ...updated, assigned_da_id: r.assigned_da_id };
      }
      onSaved(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-2xl p-6 sm:p-8">
      <div className="mb-6 flex items-start gap-3 pe-12">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
          <Pencil className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{tr("users.editUser")}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user.phone} · {tr("users.joinedOn", { date: formatDateTime(user.created_at) })}
            {" · "}
            {user.last_login ? tr("users.lastSignIn", { date: formatDateTime(user.last_login) }) : tr("users.neverSignedIn")}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <Alert variant="error" message={error} />}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="eu-name">{tr("form.fullName")}</Label>
            <Input id="eu-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="eu-phone">{tr("form.phone")}</Label>
            <Input id="eu-phone" value={user.phone} disabled hint={tr("users.phoneHint")} />
          </div>
          <div>
            <Label htmlFor="eu-role">{tr("form.role")}</Label>
            <Select
              id="eu-role"
              options={ROLES.map((r) => ({ value: r, label: roleLabel(r) }))}
              value={form.role}
              disabled={isMe}
              onChange={(v) => set("role", v as Role)}
            />
            {isMe && <p className="mt-1.5 text-xs text-gray-500">{tr("users.ownRole")}</p>}
          </div>
          <div>
            <Label htmlFor="eu-lang">{tr("form.language")}</Label>
            <Select id="eu-lang" options={LANGUAGES} value={form.language} onChange={(v) => set("language", v)} />
          </div>
          <div className="sm:col-span-2">
            <AreaPicker idPrefix="eu" value={form.area} onChange={(v) => set("area", v)} />
            {!user.region_pcode && (user.region || user.zone || user.woreda) && (
              <p className="mt-1.5 text-xs text-warning-600 dark:text-warning-400">
                {tr("users.legacyAddress", { address: [user.region, user.zone, user.woreda].filter(Boolean).join(" / ") })}
              </p>
            )}
          </div>
          {user.role === "farmer" && (
            <div>
              <Label htmlFor="eu-da">{tr("users.da")}</Label>
              <Select
                id="eu-da"
                placeholder={tr("users.noDa")}
                placeholderSelectable
                options={agents.map((a) => ({ value: String(a.id), label: [a.name, a.woreda || a.region].filter(Boolean).join(" · ") }))}
                value={form.da}
                onChange={(v) => set("da", v)}
              />
            </div>
          )}
          <div className="flex items-end pb-2.5">
            <Switch
              checked={form.is_active}
              disabled={isMe}
              onChange={(v) => set("is_active", v)}
              label={tr(form.is_active ? "users.accountActive" : "users.accountOff")}
            />
          </div>
        </div>

        {diff && (
          <Alert variant={form.role === "admin" || initial.role === "admin" ? "warning" : "info"} title={tr("users.changingRole", { role: roleLabel(form.role) })}>
            <span className="block">{tr("users.takesEffect")}</span>
            {diff.gains.length > 0 && <span className="mt-1 block">{tr("users.gains", { list: diff.gains.join(", ") })}</span>}
            {diff.loses.length > 0 && <span className="mt-1 block">{tr("users.loses", { list: diff.loses.join(", ") })}</span>}
          </Alert>
        )}
        {!form.is_active && initial.is_active && (
          <Alert variant="warning" message={tr("users.deactivateWarn")} />
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {tr("common.cancel")}
          </Button>
          <Button type="submit" size="sm" loading={busy} disabled={!dirty}>
            {tr("common.saveChanges")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Easy-to-read temporary password (no 0/O or 1/l look-alikes). */
function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(8));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function ResetPasswordModal({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError(tr("signup.errPassword"));
      return;
    }
    if (password !== confirm) {
      setError(tr("signup.errMismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.adminResetPassword(user.id, password);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-md p-6 sm:p-8">
      <div className="mb-6 flex items-start gap-3 pe-12">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          <KeyRound className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{tr("users.resetPassword")}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tr("users.setNewFor", { name: user.name, phone: user.phone })}
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <Alert variant="error" message={error} />}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="rp-new" className="mb-0">
              {tr("users.newPassword")}
            </Label>
            <button
              type="button"
              onClick={() => {
                const p = generatePassword();
                setPassword(p);
                setConfirm(p);
                setShow(true);
                setError(null);
              }}
              className="text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {tr("users.generate")}
            </button>
          </div>
          <div className="relative">
            <Input
              id="rp-new"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder={tr("signup.passwordHint")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? tr("form.hidePassword") : tr("form.showPassword")}
              className="absolute inset-e-4 top-1/2 z-30 -translate-y-1/2 text-gray-500 dark:text-gray-400"
            >
              {show ? <EyeIcon className="size-5" /> : <EyeCloseIcon className="size-5" />}
            </button>
          </div>
        </div>
        <div>
          <Label htmlFor="rp-confirm">{tr("signup.repeatPassword")}</Label>
          <Input
            id="rp-confirm"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {tr("users.giveInPerson")}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {tr("common.cancel")}
          </Button>
          <Button type="submit" size="sm" loading={busy}>
            {tr("users.setPassword")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
