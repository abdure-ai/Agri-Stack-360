// My ABC (A9): a member's own shares and certificates, payments due, voting weight, account, input orders,
// machinery bookings, meetings and votes to confirm, with read-aloud. Only the member's own records.
import { api } from "@/api/client";
import ListenButton from "@/components/advisory/ListenButton";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import type { MyAbcSummary } from "@/types/abc";
import { formatDateTime, formatETB, formatFullDate } from "@/utils/formatters";
import { CalendarClock, Coins, ShoppingBasket, Tractor, Vote, Wallet } from "lucide-react";
import { useState } from "react";

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
  return { msg, run };
}

const pct = (x: number) => `${(x * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

function aloud(s: MyAbcSummary): string {
  const parts = [tr("myabc.say.shares", { n: s.shares_held, org: s.org.name })];
  if (s.owed_on_shares_etb > 0) parts.push(tr("myabc.say.owedShares", { amount: formatETB(s.owed_on_shares_etb) }));
  parts.push(tr(s.account.balance_etb > 0 ? "myabc.say.owe" : "myabc.say.nothingOwed", { amount: formatETB(s.account.balance_etb) }));
  if (s.voting_weight) parts.push(tr("myabc.say.weight", { pct: pct(s.voting_weight.weight) }));
  if (s.meetings[0]) parts.push(tr("myabc.say.meeting", { title: s.meetings[0].title, date: formatDateTime(s.meetings[0].scheduled_at) }));
  return parts.join(" ");
}

function Summary({ s, onChanged }: { s: MyAbcSummary; onChanged: () => void }) {
  const { lang } = useI18n();
  const { msg, run } = useRun(onChanged);
  const [book, setBook] = useState({ service: "ploughing", date: new Date().toISOString().slice(0, 10), plot: "" });
  return (
    <div className="space-y-4">
      {msg && <Alert variant={msg.ok ? "success" : "error"} message={msg.text} />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {s.member_no ? tr("myabc.memberNo", { no: s.member_no }) : ""} · {tr(`abc.status.${s.status}` as MessageKey)}
        </p>
        <ListenButton text={aloud(s)} language={lang} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([["myabc.shares", String(s.shares_held)], ["myabc.owedShares", formatETB(s.owed_on_shares_etb)],
          ["myabc.balance", formatETB(s.account.balance_etb)], ["myabc.weight", s.voting_weight ? pct(s.voting_weight.weight) : "—"]] as [MessageKey, string][])
          .map(([k, v]) => (
            <div key={k} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-theme-xs text-gray-500">{tr(k)}</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{v}</p>
            </div>
          ))}
      </div>

      {!!s.votes_to_confirm.length && (
        <Card icon={<Vote className="size-5" />} title={tr("myabc.votes")}>
          <ul className="space-y-2 text-sm">
            {s.votes_to_confirm.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{tr("abcInv.voteRecorded", { meeting: v.meeting, motion: v.motion, choice: tr(`abc.motion.${v.choice}`) })}</span>
                <span className="flex gap-2">
                  <Button size="xs" onClick={() => run(() => api.confirmMyAbcVote(v.id, true))}>{tr("abcInv.voteCorrect")}</Button>
                  <Button size="xs" variant="outline" onClick={() => run(() => api.confirmMyAbcVote(v.id, false))}>{tr("abcInv.voteWrong")}</Button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-4 xl:col-span-6">
          <Card icon={<Coins className="size-5" />} title={tr("abc.tab.shares")}
            description={s.share_value_etb ? tr("myabc.shareValue", { value: formatETB(s.share_value_etb) }) : undefined}>
            {s.pledges.length ? (
              <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
                {s.pledges.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span>{tr(`abc.sh.kind.${p.kind}` as MessageKey)}: {tr("abc.sh.sharesN", { n: p.shares })}
                      {p.due_on ? <span className="text-theme-xs text-gray-500"> · {tr("abc.sh.dueOn", { date: formatFullDate(p.due_on) })}</span> : null}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-theme-xs">{tr("abc.sh.paidOwed", { paid: formatETB(p.paid_etb), owed: formatETB(p.owed_etb) })}</span>
                      {p.overdue && <Badge size="sm" color="error">{tr("abc.flag.overdue")}</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title={tr("myabc.noShares")} />}
            {!!s.certificates.length && (
              <p className="mt-2 text-theme-xs text-gray-500">{tr("myabc.certificates", { list: s.certificates.map((c) => `${c.certificate_no} (${c.shares})`).join(", ") })}</p>
            )}
          </Card>
          <Card icon={<Wallet className="size-5" />} title={tr("myabc.account")} description={tr("abc.fin.accountsHint")}>
            {s.account.transactions.length ? (
              <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
                {s.account.transactions.slice().reverse().map((t) => (
                  <li key={t.id} className={`flex flex-wrap justify-between gap-2 py-1.5 ${t.status === "void" ? "line-through opacity-60" : ""}`}>
                    <span>{formatFullDate(t.txn_date)} · {tr(`abc.txn.${t.kind}` as MessageKey)}{t.receipt_no ? ` · ${t.receipt_no}` : ""}
                      {t.description ? <span className="text-theme-xs text-gray-500"> · {t.description}</span> : null}</span>
                    <span className="font-medium">{t.balance_effect > 0 ? "+" : ""}{formatETB(t.balance_effect)}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title={tr("abc.fin.noTxns")} />}
          </Card>
          {s.voting_weight && (
            <Card title={tr("abc.vote.weights")}>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {tr("myabc.weightLine", { pct: pct(s.voting_weight.weight), land: s.voting_weight.land_ha, prod: s.voting_weight.production_qt,
                  label: s.voting_weight.snapshot })}
              </p>
            </Card>
          )}
        </div>
        <div className="col-span-12 space-y-4 xl:col-span-6">
          <Card icon={<CalendarClock className="size-5" />} title={tr("myabc.meetings")}>
            {s.meetings.length ? (
              <ul className="space-y-2 text-sm">
                {s.meetings.map((m) => (
                  <li key={m.id}>
                    <p className="font-medium text-gray-800 dark:text-white/90">{m.title}</p>
                    <p className="text-theme-xs text-gray-500">{tr(`abc.meet.kind.${m.kind}` as MessageKey)} · {formatDateTime(m.scheduled_at)}{m.location ? ` · ${m.location}` : ""}</p>
                    {!!m.agenda.length && <p className="text-theme-xs text-gray-600 dark:text-gray-400">{m.agenda.join(" · ")}</p>}
                  </li>
                ))}
              </ul>
            ) : <EmptyState title={tr("myabc.noMeetings")} />}
          </Card>
          <Card icon={<ShoppingBasket className="size-5" />} title={tr("myabc.orders")}>
            {s.orders.length ? (
              <ul className="space-y-2 text-sm">
                {s.orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{o.product_name} · {o.season}
                      <span className="block text-theme-xs text-gray-500">{tr("abc.inp.suggested")}: {o.suggested_qty ?? "—"} {o.unit ?? ""} · {o.area_ha} {tr("unit.ha")}</span></span>
                    {o.status === "suggested" ? (
                      <span className="flex gap-2">
                        <Button size="xs" onClick={() => run(() => api.confirmMyAbcOrder(o.id, o.suggested_qty), tr("abc.saved"))}>{tr("abcInv.orderConfirm")}</Button>
                        <Button size="xs" variant="ghost" onClick={() => run(() => api.confirmMyAbcOrder(o.id, 0))}>{tr("abcInv.orderDecline")}</Button>
                      </span>
                    ) : <Badge size="sm" color={o.status === "declined" ? "light" : "success"}>{tr(`abc.inp.status.${o.status}` as MessageKey)}</Badge>}
                  </li>
                ))}
              </ul>
            ) : <EmptyState title={tr("myabc.noOrders")} />}
          </Card>
          <Card icon={<Tractor className="size-5" />} title={tr("abc.mac.bookings")}>
            {!!s.bookings.length && (
              <ul className="mb-3 divide-y divide-gray-100 text-sm dark:divide-gray-800">
                {s.bookings.slice().reverse().map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span>{tr(`abc.mac.svc.${b.service}` as MessageKey)} · {formatFullDate(b.scheduled_date ?? b.requested_date)}{b.machine ? ` · ${b.machine}` : ""}</span>
                    <span className="flex items-center gap-2">
                      <Badge size="sm" color={b.status === "done" ? "success" : b.status === "cancelled" ? "light" : "warning"}>{tr(`abc.mac.status.${b.status}` as MessageKey)}</Badge>
                      {(b.status === "requested" || b.status === "scheduled") && (
                        <Button size="xs" variant="ghost" onClick={() => run(() => api.myAbcCancelBooking(b.id))}>{tr("abc.meet.cancel")}</Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-36"><Label>{tr("myabc.service")}</Label>
                <Select value={book.service} onChange={(v) => setBook({ ...book, service: v })}
                  options={["ploughing", "planting", "spraying", "harvesting", "threshing", "transport"].map((x) => ({ value: x, label: tr(`abc.mac.svc.${x}` as MessageKey) }))} /></div>
              <div className="w-36"><Label>{tr("abc.form.date")}</Label><Input type="date" value={book.date} onChange={(e) => setBook({ ...book, date: e.target.value })} /></div>
              <div className="w-40"><Label>{tr("myabc.plot")}</Label>
                <Select value={book.plot} placeholder="—" onChange={(v) => setBook({ ...book, plot: v })}
                  options={s.plots.map((p) => ({ value: String(p.id), label: `${p.field_name}${p.area_ha ? ` (${p.area_ha} ${tr("unit.ha")})` : ""}` }))} /></div>
              <Button size="sm" disabled={!book.date} onClick={() => run(() => api.myAbcBook({ org_id: s.org.id, service: book.service,
                requested_date: book.date, farm_id: book.plot ? Number(book.plot) : null, area_ha: book.plot ? null : 0.5 }), tr("myabc.booked"))}>
                {tr("abcInv.bookSend")}</Button>
            </div>
          </Card>
          <Card title={tr("myabc.plots")}>
            {s.plots.length ? (
              <ul className="text-sm text-gray-700 dark:text-gray-300">
                {s.plots.map((p) => <li key={p.id}>{p.field_name}: {p.crop_name ? trTerm("crop", p.crop_name) : "—"}{p.area_ha ? ` · ${p.area_ha} ${tr("unit.ha")}` : ""}{p.irrigated ? ` · ${tr("abc.reg.irrigated")}` : ""}</li>)}
              </ul>
            ) : <EmptyState title={tr("abc.reg.noPlots")} />}
          </Card>
        </div>
      </div>
      <p className="text-theme-xs text-gray-500">{s.official_record_note}</p>
    </div>
  );
}

export default function MyAbc() {
  const list = useAsync(() => api.myAbcCompanies(), []);
  const [orgId, setOrgId] = useState<number | null>(null);
  const current = orgId ?? list.data?.[0]?.org_id ?? null;
  const [version, setVersion] = useState(0);
  const summary = useAsync(() => (current ? api.myAbcSummary(current) : Promise.resolve(null)), [current, version]);
  return (
    <>
      <PageMeta title={`${tr("nav.myAbc")} | ${tr("app.name")}`} description={tr("myabc.description")} />
      <PageHeader title={summary.data?.org.name ?? tr("nav.myAbc")} description={tr("myabc.description")} />
      {(list.data?.length ?? 0) > 1 && (
        <div className="mb-4 max-w-sm">
          <Label>{tr("abc.pickCompany")}</Label>
          <Select value={String(current ?? "")} onChange={(v) => setOrgId(Number(v))}
            options={(list.data ?? []).map((c) => ({ value: String(c.org_id), label: c.name }))} />
        </div>
      )}
      {list.loading || (summary.loading && !summary.data) ? <LoadingState /> : list.error || summary.error ? (
        <ErrorState message={list.error ?? summary.error} onRetry={() => { list.reload(); summary.reload(); }} />
      ) : !current ? <EmptyState title={tr("myabc.none")} /> : summary.data && (
        <Summary s={summary.data} onChanged={() => setVersion((v) => v + 1)} />
      )}
    </>
  );
}
