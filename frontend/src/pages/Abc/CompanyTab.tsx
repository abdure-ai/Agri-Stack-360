// ABC company core (A1): profile, legal rules in force, team roles, history. Rights come from the person's
// roles in this ABC (company.capabilities), checked again on the server for every change.
import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import { ABC_ROLES, ABC_TYPES, type AbcCompany, type AbcRole } from "@/types/abc";
import { formatDateTime, formatFullDate } from "@/utils/formatters";
import { Building2, History, Scale, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { RuleStatus, roleName, ruleName, ruleValue } from "./abcLabels";

function Profile({ c, onSaved }: { c: AbcCompany; onSaved: () => void }) {
  const p = c.profile;
  const canManage = c.capabilities.includes("manage");
  const [form, setForm] = useState({
    abc_type: p.abc_type,
    kebele: p.kebele ?? "",
    fiscal_year_start: p.fiscal_year_start,
    declared_capital_etb: p.declared_capital_etb != null ? String(p.declared_capital_etb) : "",
    board_approval_limit_etb: p.board_approval_limit_etb != null ? String(p.board_approval_limit_etb) : "",
    exit_refund_policy: p.exit_refund_policy ?? "",
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const num = (v: string) => (v.trim() ? Number(v.replace(/,/g, "")) : null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.abcUpdateCompany(c.org.id, {
        abc_type: form.abc_type,
        kebele: form.kebele.trim() || null,
        fiscal_year_start: form.fiscal_year_start,
        declared_capital_etb: num(form.declared_capital_etb),
        board_approval_limit_etb: num(form.board_approval_limit_etb),
        exit_refund_policy: form.exit_refund_policy.trim() || null,
      });
      setMsg({ ok: true, text: tr("abc.saved") });
      onSaved();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  }

  return (
    <Card
      accent="green"
      icon={<Building2 className="size-5" />}
      title={tr("abc.company.profile")}
      actions={<Badge color={p.status === "registered" ? "success" : "warning"}>{tr(`abc.status.${p.status}` as MessageKey)}</Badge>}
    >
      {msg && <Alert className="mb-4" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="abc-type">{tr("abc.company.type")}</Label>
          <Select
            id="abc-type"
            value={form.abc_type}
            disabled={!canManage || p.status !== "formation"}
            onChange={(v) => setForm({ ...form, abc_type: v as typeof form.abc_type })}
            options={ABC_TYPES.map((t) => ({ value: t, label: tr(`abc.type.${t}` as MessageKey) }))}
          />
        </div>
        <div>
          <Label htmlFor="abc-kebele">{tr("abc.company.kebele")}</Label>
          <Input id="abc-kebele" value={form.kebele} disabled={!canManage} onChange={(e) => setForm({ ...form, kebele: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="abc-fy">{tr("abc.company.fiscalYear")}</Label>
          <Select
            id="abc-fy"
            value={form.fiscal_year_start}
            disabled={!canManage}
            onChange={(v) => setForm({ ...form, fiscal_year_start: v as typeof form.fiscal_year_start })}
            options={(["hamle", "meskerem", "january"] as const).map((f) => ({ value: f, label: tr(`abc.fy.${f}` as MessageKey) }))}
          />
        </div>
        <div>
          <Label htmlFor="abc-capital">{tr("abc.company.declaredCapital")}</Label>
          <Input id="abc-capital" inputMode="decimal" value={form.declared_capital_etb} disabled={!canManage}
            onChange={(e) => setForm({ ...form, declared_capital_etb: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="abc-limit">{tr("abc.company.approvalLimit")}</Label>
          <Input id="abc-limit" inputMode="decimal" value={form.board_approval_limit_etb} disabled={!canManage}
            onChange={(e) => setForm({ ...form, board_approval_limit_etb: e.target.value })} />
          <p className="mt-1 text-theme-xs text-gray-500">{tr("abc.company.approvalLimitHint")}</p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="abc-exit">{tr("abc.company.exitPolicy")}</Label>
          <TextArea rows={2} value={form.exit_refund_policy} disabled={!canManage}
            onChange={(v) => setForm({ ...form, exit_refund_policy: v })} />
        </div>
        {canManage && (
          <div className="sm:col-span-2">
            <Button type="submit" size="sm">{tr("common.save")}</Button>
          </div>
        )}
      </form>
      <p className="mt-4 text-theme-xs text-gray-500">{c.official_record_note}</p>
    </Card>
  );
}

function Rules({ c }: { c: AbcCompany }) {
  return (
    <Card icon={<Scale className="size-5" />} title={tr("abc.company.rules")} description={tr("abc.company.rulesHint")}>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {c.rules.map((r) => (
          <li key={r.key} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{ruleName(r.key)}</p>
              <p className="line-clamp-1 text-theme-xs text-gray-500" title={r.source}>
                {tr("abc.ruleSince", { date: formatFullDate(r.effective_from) })} · {r.source}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{ruleValue(r)}</span>
              <RuleStatus status={r.verification_status} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Team({ c, onChanged }: { c: AbcCompany; onChanged: () => void }) {
  const canTeam = c.capabilities.includes("team");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AbcRole>("board_member");
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card icon={<Users className="size-5" />} title={tr("abc.company.team")} description={tr("abc.company.teamHint")}>
      {error && <Alert className="mb-3" variant="error" message={error} />}
      {c.team.length ? (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {c.team.map((m) => (
            <li key={`${m.user_id}-${m.role}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{m.name}</p>
                <p className="text-theme-xs text-gray-500">{m.phone} · {tr("abc.since", { date: formatFullDate(m.since.slice(0, 10)) })}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge size="sm" color="light">{roleName(m.role)}</Badge>
                {canTeam && (
                  <Button size="xs" variant="ghost" onClick={() => run(() => api.abcRemoveTeam(c.org.id, m.user_id, m.role))}>
                    {tr("supplier.remove")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={tr("abc.company.noTeam")} />
      )}
      {canTeam && (
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api.abcAddTeam(c.org.id, phone.trim(), role);
              setPhone("");
            });
          }}
        >
          <div className="w-44">
            <Label htmlFor="team-phone">{tr("abc.company.phone")}</Label>
            <Input id="team-phone" inputMode="tel" value={phone} placeholder="09…" onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="w-56">
            <Label htmlFor="team-role">{tr("abc.company.role")}</Label>
            <Select id="team-role" value={role} onChange={(v) => setRole(v as AbcRole)}
              options={ABC_ROLES.map((r) => ({ value: r, label: roleName(r) }))} />
          </div>
          <Button type="submit" size="sm" disabled={phone.trim().length < 9}>{tr("abc.company.addRole")}</Button>
        </form>
      )}
    </Card>
  );
}

function HistoryCard({ orgId }: { orgId: number }) {
  const h = useAsync(() => api.abcHistory(orgId), [orgId]);
  return (
    <Card icon={<History className="size-5" />} title={tr("abc.company.history")}>
      {h.loading ? (
        <LoadingState />
      ) : h.error ? (
        <ErrorState message={h.error} onRetry={h.reload} />
      ) : !h.data?.length ? (
        <EmptyState title={tr("abc.company.noHistory")} />
      ) : (
        <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
          {h.data.map((e) => (
            <li key={e.id} className="py-2">
              <p className="font-medium text-gray-800 dark:text-white/90">{tr(`abc.action.${e.action}` as MessageKey)}</p>
              <p className="text-theme-xs text-gray-500">{formatDateTime(e.created_at)} · {e.actor ?? "—"}</p>
              {e.detail && (
                <p className="mt-0.5 break-words font-mono text-[11px] text-gray-500">
                  {e.detail.before ? JSON.stringify(e.detail.before) : "—"} → {e.detail.after ? JSON.stringify(e.detail.after) : "—"}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function CompanyTab({ c, onChanged }: { c: AbcCompany; onChanged: () => void }) {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-4 xl:col-span-7">
        <Profile key={c.profile.updated_at ?? ""} c={c} onSaved={onChanged} />
        <Team c={c} onChanged={onChanged} />
      </div>
      <div className="col-span-12 space-y-4 xl:col-span-5">
        <Rules c={c} />
        {c.capabilities.includes("audit_read") && <HistoryCard orgId={c.org.id} />}
      </div>
    </div>
  );
}
