// ABC finance basics (A6): summary, simple ledger (large expenses wait for the board), member accounts with
// receipts and statements, Excel export. Shown to roles with finance access; changes need the finance role.
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
import type { AbcMemberAccount, AbcStatement } from "@/types/abc";
import { formatETB, formatFullDate } from "@/utils/formatters";
import { BookOpen, Download, Printer, Wallet } from "lucide-react";
import { useState } from "react";

const METHODS = ["cash", "bank", "telebirr", "mpesa", "other"] as const;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

function useRun(onDone: () => void) {
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

function printStatement(st: AbcStatement) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  const rows = st.transactions.map((t) => `<tr${t.status === "void" ? ' style="text-decoration:line-through;color:#999"' : ""}>
    <td>${esc(formatFullDate(t.txn_date))}</td><td>${esc(tr(`abc.txn.${t.kind}` as MessageKey))}${t.receipt_no ? ` (${esc(t.receipt_no)})` : ""}</td>
    <td>${esc(t.description ?? "")}</td><td style="text-align:right">${esc(formatETB(t.balance_effect))}</td>
    <td style="text-align:right">${esc(formatETB(t.running_balance_etb))}</td></tr>`).join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(tr("abc.fin.statement"))}</title>
<style>body{font-family:system-ui,sans-serif;margin:40px;color:#111}table{border-collapse:collapse;width:100%;margin-top:12px}
td,th{border:1px solid #bbb;padding:5px 8px;font-size:13px;text-align:left}.note{margin-top:28px;font-size:12px;color:#555}</style>
<h1>${esc(st.org ?? "")}</h1><h2>${esc(tr("abc.fin.statement"))}: ${esc(st.name ?? "")}</h2>
<p>${esc(tr("abc.fin.statementLine", { balance: formatETB(st.balance_etb), shares: st.shares_held }))}</p>
<table><tr><th>${esc(tr("abc.form.date"))}</th><th>${esc(tr("abc.fin.what"))}</th><th>${esc(tr("abc.fin.description"))}</th>
<th>${esc(tr("abc.fin.effect"))}</th><th>${esc(tr("abc.fin.balance"))}</th></tr>${rows}</table>
<p class="note">${esc(st.official_record_note)}</p><script>window.print()</script>`);
  w.document.close();
}

function Summary({ orgId, version }: { orgId: number; version: number }) {
  const s = useAsync(() => api.abcFinanceSummary(orgId), [orgId, version]);
  if (!s.data) return s.error ? <ErrorState message={s.error} onRetry={s.reload} /> : <LoadingState />;
  const d = s.data;
  const cards: [MessageKey, number][] = [["abc.fin.shareCapital", d.share_capital_etb], ["abc.fin.income", d.income_etb],
    ["abc.fin.expenses", d.expense_etb], ["abc.fin.assets", d.assets_bought_etb], ["abc.fin.loans", d.loans_received_etb - d.loans_repaid_etb],
    ["abc.fin.cash", d.cash_estimate_etb], ["abc.fin.membersOwe", d.members_owe_etb], ["abc.fin.pending", d.pending_approval_etb]];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map(([k, v]) => (
        <div key={k} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
          <p className="text-theme-xs text-gray-500">{tr(k)}</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{formatETB(v)}</p>
        </div>
      ))}
    </div>
  );
}

function Ledger({ orgId, canEdit, limit, onChanged, version }: { orgId: number; canEdit: boolean; limit: number | null; onChanged: () => void; version: number }) {
  const list = useAsync(() => api.abcLedger(orgId), [orgId, version]);
  const [f, setF] = useState({ kind: "expense", category: "", amount: "", counterparty: "", description: "", method: "cash", reference: "", direction: "in" });
  const { msg, run } = useRun(onChanged);
  const [toBoard, setToBoard] = useState(false);
  return (
    <Card icon={<BookOpen className="size-5" />} title={tr("abc.fin.ledger")}
      description={limit != null ? tr("abc.fin.limitHint", { limit: formatETB(limit) }) : tr("abc.fin.noLimit")}>
      {msg && <Alert className="mb-3" variant={msg.ok ? (toBoard ? "info" : "success") : "error"} message={msg.ok && toBoard ? tr("abc.fin.sentToBoard") : msg.text} />}
      {canEdit && (
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <div>
            <Label>{tr("abc.fin.kind")}</Label>
            <Select value={f.kind} onChange={(v) => setF({ ...f, kind: v })}
              options={(["income", "expense", "asset", "liability"] as const).map((k) => ({ value: k, label: tr(`abc.fin.kind.${k}` as MessageKey) }))} />
          </div>
          <div>
            <Label>{tr("abc.fin.category")}</Label>
            <Input value={f.category} placeholder={tr("abc.fin.categoryHint")} onChange={(e) => setF({ ...f, category: e.target.value })} />
          </div>
          <div>
            <Label>{tr("abc.sh.amount")}</Label>
            <Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </div>
          {f.kind === "liability" && (
            <div>
              <Label>{tr("abc.fin.direction")}</Label>
              <Select value={f.direction} onChange={(v) => setF({ ...f, direction: v })}
                options={[{ value: "in", label: tr("abc.fin.loanIn") }, { value: "out", label: tr("abc.fin.loanOut") }]} />
            </div>
          )}
          <div>
            <Label>{tr("abc.fin.counterparty")}</Label>
            <Input value={f.counterparty} onChange={(e) => setF({ ...f, counterparty: e.target.value })} />
          </div>
          <div>
            <Label>{tr("abc.sh.method")}</Label>
            <Select value={f.method} onChange={(v) => setF({ ...f, method: v })}
              options={METHODS.map((m) => ({ value: m, label: tr(`abc.pay.${m}` as MessageKey) }))} />
          </div>
          <div>
            <Label>{tr("abc.sh.reference")}</Label>
            <Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>{tr("abc.fin.description")}</Label>
            <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button size="sm" disabled={f.category.trim().length < 2 || !Number(f.amount)}
              onClick={() => run(async () => {
                const r = await api.abcAddLedger(orgId, { kind: f.kind, category: f.category.trim(), amount_etb: Number(f.amount.replace(/,/g, "")),
                  counterparty: f.counterparty.trim() || null, description: f.description.trim() || null, method: f.method,
                  reference: f.reference.trim() || null, direction: f.direction });
                setF({ ...f, category: "", amount: "", counterparty: "", description: "", reference: "" });
                setToBoard(r.status === "pending");
              }, tr("abc.fin.posted"))}>
              {tr("abc.fin.add")}
            </Button>
          </div>
        </div>
      )}
      {list.data?.length ? (
        <ul className="max-h-[28rem] divide-y divide-gray-100 overflow-y-auto text-sm dark:divide-gray-800">
          {list.data.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
              <span className="min-w-0">
                <span className="font-medium text-gray-800 dark:text-white/90">{e.category}</span>
                <span className="block text-theme-xs text-gray-500">
                  {formatFullDate(e.entry_date)} · {tr(`abc.fin.kind.${e.kind}` as MessageKey)}{e.counterparty ? ` · ${e.counterparty}` : ""}
                  {e.description ? ` · ${e.description}` : ""}{e.void_reason ? ` · ${e.void_reason}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                {e.status !== "posted" && <Badge size="sm" color={e.status === "pending" ? "warning" : "error"}>{tr(`abc.fin.status.${e.status}` as MessageKey)}</Badge>}
                <span className={e.status === "void" || e.status === "rejected" ? "text-gray-400 line-through" : e.direction === "in" ? "font-semibold text-success-600" : "font-semibold text-gray-800 dark:text-white/90"}>
                  {e.direction === "in" ? "+" : "−"}{formatETB(e.amount_etb)}
                </span>
                {canEdit && e.source === "manual" && e.status === "posted" && (
                  <Button size="xs" variant="ghost" onClick={() => {
                    const reason = window.prompt(tr("abc.fin.voidReason"));
                    if (reason && reason.trim().length >= 3) void run(() => api.abcVoidLedger(orgId, e.id, reason.trim()));
                  }}>{tr("abc.fin.void")}</Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={tr("abc.fin.noEntries")} />
      )}
    </Card>
  );
}

function MemberAccount({ a, orgId, canEdit, onChanged }: { a: AbcMemberAccount; orgId: number; canEdit: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const st = useAsync(() => (open ? api.abcStatement(orgId, a.farmer_id) : Promise.resolve(null)), [open, a.balance_etb]);
  const [f, setF] = useState({ kind: "repayment", amount: "", method: "cash", reference: "", description: "" });
  const { msg, run } = useRun(onChanged);
  return (
    <li className="py-2">
      <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 text-start" onClick={() => setOpen((o) => !o)}>
        <span>
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">{a.member_no ? `#${a.member_no} · ` : ""}{a.name}</span>
          <span className="block text-theme-xs text-gray-500">
            {tr("abc.fin.accountLine", { credit: formatETB(a.input_credit_etb), services: formatETB(a.services_etb), repaid: formatETB(a.repaid_etb) })}
          </span>
        </span>
        <span className={a.balance_etb > 0 ? "font-semibold text-warning-600" : "font-semibold text-gray-700 dark:text-gray-300"}>{formatETB(a.balance_etb)}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-white/[0.03]">
          {msg && <Alert variant={msg.ok ? "success" : "error"} message={msg.text} />}
          {st.data?.transactions.length ? (
            <ul className="text-theme-xs text-gray-600 dark:text-gray-400">
              {st.data.transactions.map((t) => (
                <li key={t.id} className={`flex justify-between gap-2 ${t.status === "void" ? "line-through opacity-60" : ""}`}>
                  <span>{formatFullDate(t.txn_date)} · {tr(`abc.txn.${t.kind}` as MessageKey)}{t.receipt_no ? ` · ${t.receipt_no}` : ""}{t.description ? ` · ${t.description}` : ""}</span>
                  <span className="flex items-center gap-2">
                    <span>{t.balance_effect > 0 ? "+" : ""}{formatETB(t.balance_effect)} → {formatETB(t.running_balance_etb)}</span>
                    {canEdit && t.status === "posted" && t.source === "manual" && (
                      <button type="button" className="text-error-600" onClick={() => {
                        const reason = window.prompt(tr("abc.fin.voidReason"));
                        if (reason && reason.trim().length >= 3) void run(() => api.abcVoidMemberTxn(orgId, t.id, reason.trim()));
                      }}>{tr("abc.fin.void")}</button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-theme-xs text-gray-500">{tr("abc.fin.noTxns")}</p>
          )}
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-40">
                <Label>{tr("abc.fin.kind")}</Label>
                <Select value={f.kind} onChange={(v) => setF({ ...f, kind: v })}
                  options={(["repayment", "input_credit", "service_charge", "produce_deduction", "adjustment"] as const).map((k) => ({ value: k, label: tr(`abc.txn.${k}` as MessageKey) }))} />
              </div>
              <div className="w-28">
                <Label>{tr("abc.sh.amount")}</Label>
                <Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
              </div>
              {f.kind === "repayment" && (
                <>
                  <div className="w-32">
                    <Label>{tr("abc.sh.method")}</Label>
                    <Select value={f.method} onChange={(v) => setF({ ...f, method: v })}
                      options={METHODS.map((m) => ({ value: m, label: tr(`abc.pay.${m}` as MessageKey) }))} />
                  </div>
                  {f.method !== "cash" && (
                    <div className="w-32">
                      <Label>{tr("abc.sh.reference")}</Label>
                      <Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
                    </div>
                  )}
                </>
              )}
              <div className="min-w-0 flex-1">
                <Label>{tr("abc.fin.description")}</Label>
                <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
              </div>
              <Button size="sm" disabled={!Number(f.amount)} onClick={() => run(async () => {
                await api.abcMemberTxn(orgId, a.farmer_id, { kind: f.kind, amount_etb: Number(f.amount.replace(/,/g, "")),
                  method: f.kind === "repayment" ? f.method : null, reference: f.reference.trim() || null, description: f.description.trim() || null });
                setF({ ...f, amount: "", reference: "", description: "" });
              }, tr(f.kind === "repayment" ? "abc.fin.receiptSent" : "abc.fin.posted"))}>{tr("abc.fin.add")}</Button>
            </div>
          )}
          {st.data && (
            <Button size="xs" variant="ghost" startIcon={<Printer className="size-4" />} onClick={() => printStatement(st.data!)}>{tr("abc.fin.printStatement")}</Button>
          )}
        </div>
      )}
    </li>
  );
}

export default function FinanceTab({ orgId }: { orgId: number }) {
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const summary = useAsync(() => api.abcFinanceSummary(orgId), [orgId, version]);
  const accounts = useAsync(() => api.abcMemberAccounts(orgId), [orgId, version]);
  if (summary.loading && !summary.data) return <LoadingState />;
  if (summary.error || !summary.data) return <ErrorState message={summary.error} onRetry={summary.reload} />;
  const s = summary.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-theme-xs text-gray-500">{tr("abc.fin.note")}</p>
        <Button size="sm" variant="outline" startIcon={<Download className="size-4" />}
          onClick={async () => saveBlob(await api.abcFinanceExport(orgId), `abc-${orgId}-finance.xlsx`)}>{tr("abc.fin.export")}</Button>
      </div>
      <Summary orgId={orgId} version={version} />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-7">
          <Ledger orgId={orgId} canEdit={s.can_edit} limit={s.approval_limit_etb} onChanged={reload} version={version} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <Card icon={<Wallet className="size-5" />} title={tr("abc.fin.accounts")} description={tr("abc.fin.accountsHint")}>
            {accounts.data?.length ? (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {accounts.data.map((a) => <MemberAccount key={a.farmer_id} a={a} orgId={orgId} canEdit={s.can_edit} onChanged={reload} />)}
              </ul>
            ) : (
              <EmptyState title={tr("abc.reg.none")} />
            )}
          </Card>
        </div>
      </div>
      <p className="text-theme-xs text-gray-500">{s.official_record_note}</p>
    </div>
  );
}
