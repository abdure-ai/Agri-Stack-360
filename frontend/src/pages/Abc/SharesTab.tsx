// ABC shares (A4): share value and shares offered, members' pledges and payments, issued shares and certificates,
// transfers with board approval. Rule checks (minimum, 15% cap, upfront part, deadline) run on the server; a refused
// action comes back as a rule code and is shown in the user's language.
import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import type { AbcShareMember, AbcSharesOverview, PayMethod } from "@/types/abc";
import { formatDateTime, formatETB, formatFullDate } from "@/utils/formatters";
import { ArrowRightLeft, BellRing, Coins, Gavel, Printer, Receipt } from "lucide-react";
import { useState } from "react";

const METHODS: PayMethod[] = ["cash", "bank", "telebirr", "mpesa", "other"];
const FLAG_COLOR = { overdue: "error", due_soon: "warning", minimum_unpaid: "warning", no_minimum: "light", over_cap: "error" } as const;

function useAction(onDone: () => void) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (action: () => Promise<unknown>, okText?: string) => {
    setMsg(null);
    try {
      await action();
      if (okText) setMsg({ ok: true, text: okText });
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  };
  return { msg, run, setMsg };
}

function PaymentFields({ value, onChange }: {
  value: { amount: string; method: PayMethod; reference: string };
  onChange: (v: { amount: string; method: PayMethod; reference: string }) => void;
}) {
  return (
    <>
      <div className="w-32">
        <Label>{tr("abc.sh.amount")}</Label>
        <Input inputMode="decimal" value={value.amount} onChange={(e) => onChange({ ...value, amount: e.target.value })} />
      </div>
      <div className="w-36">
        <Label>{tr("abc.sh.method")}</Label>
        <Select value={value.method} onChange={(v) => onChange({ ...value, method: v as PayMethod })}
          options={METHODS.map((m) => ({ value: m, label: tr(`abc.pay.${m}` as MessageKey) }))} />
      </div>
      {value.method !== "cash" && (
        <div className="w-36">
          <Label>{tr("abc.sh.reference")}</Label>
          <Input value={value.reference} onChange={(e) => onChange({ ...value, reference: e.target.value })} />
        </div>
      )}
    </>
  );
}

const num = (v: string) => Number(v.replace(/,/g, ""));

function MemberShares({ m, ov, orgId, onChanged }: { m: AbcShareMember; ov: AbcSharesOverview; orgId: number; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const hasMinimum = m.pledges.some((p) => p.kind === "minimum");
  const [shares, setShares] = useState(String(ov.min_shares));
  const [payNow, setPayNow] = useState({ amount: "", method: "cash" as PayMethod, reference: "" });
  const [payFor, setPayFor] = useState<Record<number, { amount: string; method: PayMethod; reference: string }>>({});
  const { msg, run } = useAction(onChanged);

  return (
    <li className="py-2.5">
      <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 text-start" onClick={() => setOpen((o) => !o)}>
        <span>
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">{m.member_no ? `#${m.member_no} · ` : ""}{m.name}</span>
          <span className="block text-theme-xs text-gray-500">
            {tr("abc.sh.memberLine", { held: m.held, pledged: m.pledged, paid: formatETB(m.paid_etb), owed: formatETB(m.owed_etb) })}
          </span>
        </span>
        <span className="flex flex-wrap gap-1">
          {m.flags.map((f) => <Badge key={f} size="sm" color={FLAG_COLOR[f]}>{tr(`abc.flag.${f}` as MessageKey)}</Badge>)}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          {msg && <Alert variant={msg.ok ? "success" : "error"} message={msg.text} />}
          {m.pledges.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-2.5 text-sm dark:border-gray-800 dark:bg-transparent">
              <p className="font-medium text-gray-800 dark:text-white/90">
                {tr(`abc.sh.kind.${p.kind}` as MessageKey)}: {tr("abc.sh.sharesN", { n: p.shares })}
                <span className="ms-2 text-theme-xs font-normal text-gray-500">
                  {formatFullDate(p.pledged_on)}{p.due_on ? ` · ${tr("abc.sh.dueOn", { date: formatFullDate(p.due_on) })}` : ""}
                </span>
              </p>
              <p className="text-theme-xs text-gray-500">{tr("abc.sh.paidOwed", { paid: formatETB(p.paid_etb), owed: formatETB(p.owed_etb) })}</p>
              {ov.can_edit && p.status === "open" && (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <PaymentFields value={payFor[p.id] ?? { amount: String(p.owed_etb), method: "cash", reference: "" }}
                    onChange={(v) => setPayFor({ ...payFor, [p.id]: v })} />
                  <Button size="sm" onClick={() => {
                    const v = payFor[p.id] ?? { amount: String(p.owed_etb), method: "cash" as PayMethod, reference: "" };
                    void run(async () => {
                      const r = await api.abcSharePay(orgId, { pledge_id: p.id, amount_etb: num(v.amount), method: v.method, reference: v.reference || null });
                      return r;
                    }, tr("abc.sh.paid"));
                  }}>{tr("abc.sh.recordPayment")}</Button>
                </div>
              )}
            </div>
          ))}
          {ov.can_edit && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-28">
                <Label>{tr(hasMinimum ? "abc.sh.extraShares" : "abc.sh.minimumShares")}</Label>
                <Input inputMode="numeric" value={shares} onChange={(e) => setShares(e.target.value)} />
              </div>
              <PaymentFields value={payNow} onChange={setPayNow} />
              <Button size="sm" variant="outline" disabled={!Number(shares)}
                onClick={() => run(() => api.abcPledge(orgId, {
                  farmer_id: m.id, shares: Number(shares), kind: hasMinimum ? "extra" : "minimum",
                  first_payment: payNow.amount ? { amount_etb: num(payNow.amount), method: payNow.method, reference: payNow.reference || null } : null,
                }), tr("abc.sh.pledged"))}>
                {tr("abc.sh.addPledge")}
              </Button>
              <p className="w-full text-theme-xs text-gray-500">
                {hasMinimum ? tr("abc.sh.extraHint", { pct: ov.upfront_percent, years: ov.deadline_years }) : tr("abc.sh.minimumHint", { n: ov.min_shares })}
              </p>
            </div>
          )}
          <Button size="xs" variant="ghost" startIcon={<Printer className="size-4" />} onClick={() => printCertificate(orgId, m)}>
            {tr("abc.sh.printCertificate")}
          </Button>
        </div>
      )}
    </li>
  );
}

async function printCertificate(orgId: number, m: AbcShareMember) {
  const c = await api.abcCertificates(orgId, m.id);
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  const rows = c.certificates.map((x) => `<tr><td>${esc(x.certificate_no)}</td><td>${x.shares}</td><td>${esc(formatFullDate(x.created_at.slice(0, 10)))}</td></tr>`).join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(tr("abc.sh.certificate"))}</title>
<style>body{font-family:system-ui,sans-serif;margin:40px;color:#111}h1{font-size:22px}table{border-collapse:collapse;margin-top:16px}
td,th{border:1px solid #999;padding:6px 12px;text-align:left}.note{margin-top:32px;font-size:12px;color:#555}</style>
<h1>${esc(c.org)}</h1><h2>${esc(tr("abc.sh.certificate"))}</h2>
<p>${esc(tr("abc.sh.certFor", { name: m.name, no: m.member_no ?? "—" }))}</p>
<p>${esc(tr("abc.sh.certHeld", { n: m.held, value: c.share_value_etb ? formatETB(c.share_value_etb) : "—" }))}</p>
<table><tr><th>${esc(tr("abc.sh.certNo"))}</th><th>${esc(tr("abc.sh.shares"))}</th><th>${esc(tr("abc.form.date"))}</th></tr>${rows}</table>
<p class="note">${esc(c.official_record_note)}</p><script>window.print()</script>`);
  w.document.close();
}

function Setup({ ov, orgId, onChanged }: { ov: AbcSharesOverview; orgId: number; onChanged: () => void }) {
  const [value, setValue] = useState(ov.share_value_etb ? String(ov.share_value_etb) : "");
  const [offered, setOffered] = useState(ov.shares_offered ? String(ov.shares_offered) : "");
  const { msg, run } = useAction(onChanged);
  const t = ov.totals;
  return (
    <Card accent="green" icon={<Coins className="size-5" />} title={tr("abc.sh.setup")}
      description={tr("abc.sh.rulesLine", { min: ov.min_shares, cap: ov.cap_percent, upfront: ov.upfront_percent, years: ov.deadline_years })}>
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [tr("abc.sh.pledgedShares"), String(t.pledged_shares)],
          [tr("abc.sh.issuedShares"), String(t.issued_shares)],
          [tr("abc.sh.paidTotal"), formatETB(t.paid_etb)],
          [tr("abc.sh.subscribed"), t.subscribed_percent != null ? `${t.subscribed_percent}%` : "—"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-theme-xs text-gray-500">{l}</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{v}</p>
          </div>
        ))}
      </div>
      {ov.can_edit && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-40">
            <Label>{tr("abc.sh.shareValue")}</Label>
            <Input inputMode="decimal" value={value} disabled={t.pledged_shares > 0} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="w-40">
            <Label>{tr("abc.sh.sharesOffered")}</Label>
            <Input inputMode="numeric" value={offered} onChange={(e) => setOffered(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => run(() => api.abcShareSetup(orgId, {
            ...(value && t.pledged_shares === 0 ? { share_value_etb: num(value) } : {}),
            ...(offered ? { shares_offered: Number(offered) } : {}),
          }), tr("abc.saved"))}>{tr("common.save")}</Button>
          {ov.cap_shares != null && <p className="w-full text-theme-xs text-gray-500">{tr("abc.sh.capLine", { n: ov.cap_shares })}</p>}
        </div>
      )}
    </Card>
  );
}

function Approvals({ orgId, onChanged }: { orgId: number; onChanged: () => void }) {
  const list = useAsync(() => api.abcApprovals(orgId), [orgId]);
  const { msg, run } = useAction(() => { list.reload(); onChanged(); });
  const items = list.data?.approvals ?? [];
  if (!items.length) return null;
  return (
    <Card icon={<Gavel className="size-5" />} title={tr("abc.sh.approvals")} description={tr("abc.sh.approvalsHint")}>
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
        {items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-800 dark:text-white/90">
                {a.kind === "share_transfer"
                  ? tr("abc.sh.transferLine", { shares: a.summary.shares, from: a.summary.from, to: a.summary.to })
                  : a.kind}
              </p>
              <p className="text-theme-xs text-gray-500">
                {String(a.summary.reason ?? "")} · {a.requested_by_name ?? "—"} · {formatDateTime(a.requested_at)}
                {a.decided_by_name && ` · ${tr(`abc.appr.${a.status}` as MessageKey)}: ${a.decided_by_name}`}
              </p>
            </div>
            {a.status === "pending" && list.data?.can_approve ? (
              <span className="flex gap-2">
                <Button size="xs" onClick={() => run(() => api.abcDecide(orgId, a.id, "approve"))}>{tr("abc.appr.approve")}</Button>
                <Button size="xs" variant="outline" onClick={() => run(() => api.abcDecide(orgId, a.id, "reject"))}>{tr("abc.appr.reject")}</Button>
              </span>
            ) : (
              <Badge size="sm" color={a.status === "approved" ? "success" : a.status === "rejected" ? "error" : "warning"}>
                {tr(`abc.appr.${a.status}` as MessageKey)}
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Transfer({ ov, orgId, onChanged }: { ov: AbcSharesOverview; orgId: number; onChanged: () => void }) {
  const [f, setF] = useState({ from: "", to: "", shares: "", reason: "" });
  const { msg, run } = useAction(onChanged);
  const holders = ov.members.filter((m) => m.held > 0);
  if (!ov.can_edit || !holders.length) return null;
  return (
    <Card icon={<ArrowRightLeft className="size-5" />} title={tr("abc.sh.transfer")} description={tr("abc.sh.transferHint")}>
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label>{tr("abc.sh.from")}</Label>
          <Select value={f.from} placeholder="—" onChange={(v) => setF({ ...f, from: v })}
            options={holders.map((m) => ({ value: String(m.id), label: `${m.name} (${m.held})` }))} />
        </div>
        <div>
          <Label>{tr("abc.sh.to")}</Label>
          <Select value={f.to} placeholder="—" onChange={(v) => setF({ ...f, to: v })}
            options={ov.members.filter((m) => String(m.id) !== f.from).map((m) => ({ value: String(m.id), label: m.name }))} />
        </div>
        <div>
          <Label>{tr("abc.sh.shares")}</Label>
          <Input inputMode="numeric" value={f.shares} onChange={(e) => setF({ ...f, shares: e.target.value })} />
        </div>
        <div>
          <Label>{tr("abc.sh.reason")}</Label>
          <Input value={f.reason} placeholder={tr("abc.sh.reasonHint")} onChange={(e) => setF({ ...f, reason: e.target.value })} />
        </div>
      </div>
      <Button className="mt-3" size="sm" disabled={!f.from || !f.to || !Number(f.shares) || f.reason.trim().length < 3}
        onClick={() => run(() => api.abcShareTransfer(orgId, { from_farmer: Number(f.from), to_farmer: Number(f.to),
          shares: Number(f.shares), reason: f.reason.trim() }), tr("abc.sh.transferSent"))}>
        {tr("abc.sh.askApproval")}
      </Button>
    </Card>
  );
}

function Payments({ ov, orgId, onChanged }: { ov: AbcSharesOverview; orgId: number; onChanged: () => void }) {
  const list = useAsync(() => api.abcSharePayments(orgId), [orgId, ov.totals.paid_etb]);
  const { msg, run } = useAction(onChanged);
  if (!list.data?.length) return null;
  return (
    <Card icon={<Receipt className="size-5" />} title={tr("abc.sh.payments")}>
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto text-sm dark:divide-gray-800">
        {list.data.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
            <span className="min-w-0">
              <span className="font-medium text-gray-800 dark:text-white/90">{p.receipt_no}</span> · {p.name}
              <span className="block text-theme-xs text-gray-500">
                {formatFullDate(p.paid_on)} · {tr(`abc.pay.${p.method}` as MessageKey)}{p.reference ? ` ${p.reference}` : ""} · {p.recorded_by ?? "—"}
                {p.reverse_reason && ` · ${p.reverse_reason}`}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className={p.status === "reversed" ? "text-gray-400 line-through" : "font-semibold text-gray-800 dark:text-white/90"}>{formatETB(p.amount_etb)}</span>
              {ov.can_finance && p.status === "confirmed" && (
                <Button size="xs" variant="ghost" onClick={() => {
                  const reason = window.prompt(tr("abc.sh.reverseReason"));
                  if (reason && reason.trim().length >= 3) void run(() => api.abcShareReverse(orgId, p.id, reason.trim()));
                }}>{tr("abc.sh.reverse")}</Button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function SharesTab({ orgId }: { orgId: number }) {
  const [version, setVersion] = useState(0);
  const ov = useAsync(() => api.abcShares(orgId), [orgId, version]);
  const reload = () => setVersion((v) => v + 1);
  const reminders = useAction(() => undefined);
  if (ov.loading && !ov.data) return <LoadingState />;
  if (ov.error || !ov.data) return <ErrorState message={ov.error} onRetry={ov.reload} />;
  const d = ov.data;
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-4 xl:col-span-7">
        <Setup key={`${d.share_value_etb}-${d.shares_offered}`} ov={d} orgId={orgId} onChanged={reload} />
        <Card title={tr("abc.sh.members")} description={tr("abc.sh.membersHint")}
          actions={d.can_edit && (
            <Button size="xs" variant="outline" startIcon={<BellRing className="size-4" />}
              onClick={() => reminders.run(async () => {
                const r = await api.abcShareReminders(orgId);
                reminders.setMsg({ ok: true, text: tr("abc.sh.remindersSent", { n: r.sent }) });
              })}>{tr("abc.sh.reminders")}</Button>
          )}>
          {reminders.msg && <Alert className="mb-3" variant={reminders.msg.ok ? "success" : "error"} message={reminders.msg.text} />}
          {!d.share_value_etb ? (
            <EmptyState title={tr("abc.sh.setFirst")} />
          ) : d.members.length ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {d.members.map((m) => <MemberShares key={m.id} m={m} ov={d} orgId={orgId} onChanged={reload} />)}
            </ul>
          ) : (
            <EmptyState title={tr("abc.reg.none")} />
          )}
          <p className="mt-3 text-theme-xs text-gray-500">{d.official_record_note}</p>
        </Card>
      </div>
      <div className="col-span-12 space-y-4 xl:col-span-5">
        <Approvals key={`appr-${version}`} orgId={orgId} onChanged={reload} />
        <Transfer ov={d} orgId={orgId} onChanged={reload} />
        <Payments ov={d} orgId={orgId} onChanged={reload} />
      </div>
    </div>
  );
}
