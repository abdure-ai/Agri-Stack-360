import { api } from "@/api/client";
import Card from "@/components/common/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import Alert from "@/components/ui/alert/Alert";
import { useState } from "react";
import { tr, type MessageKey } from "@/i18n/core";
import { Handshake } from "lucide-react";

/** The farmer's ABC memberships: accept an invitation (shares plots and crop seasons with the ABC), or leave. */
export default function AbcInvitationsCard() {
  const list = useAsync(() => api.myAbcInvitations(), []);
  const memberships = useAsync(() => api.myAbcMemberships(), []);
  const votes = useAsync(() => api.myAbcVotes(), []);
  const orders = useAsync(() => api.myAbcOrders(), []);
  const bookings = useAsync(() => api.myAbcBookings(), []);
  const [book, setBook] = useState<{ org: number; service: string; date: string; ha: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!list.data?.length) return null;
  const agreementOf = (orgId: number) => memberships.data?.find((m) => m.org_id === orgId);

  async function readAgreement(orgId: number) {
    const blob = await api.myAbcAgreementFile(orgId);
    window.open(URL.createObjectURL(blob), "_blank", "noopener");
  }

  async function sign(orgId: number) {
    setError(null);
    try {
      await api.signMyAbcAgreement(orgId);
      memberships.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function decide(
    orgId: number,
    decision: "accept" | "decline" | "leave",
  ) {
    await api.decideAbcInvitation(orgId, decision);
    list.reload();
  }

  return (
    <Card
      accent="amber"
      icon={<Handshake className="size-5" />}
      title={tr("abcInv.title")}
      description={tr("abcInv.hint")}
    >
      {error && <Alert className="mb-3" variant="error" message={error} />}
      {orders.data?.filter((o) => o.status === "suggested").map((o) => (
        <div key={`o${o.id}`} className="mb-3 rounded-lg bg-success-50 p-3 text-sm dark:bg-success-500/10">
          <p className="text-gray-800 dark:text-white/90">
            {tr("abcInv.orderSuggested", { org: o.org, product: o.product_name, qty: o.suggested_qty ?? "—", unit: o.unit ?? "", ha: o.area_ha })}
          </p>
          {o.rate_text && <p className="text-theme-xs text-gray-500">{tr("abc.inp.rateLine", { rate: o.rate_text, source: o.rate_source ?? "—" })}</p>}
          <span className="mt-2 flex flex-wrap gap-2">
            <Button size="xs" onClick={async () => { await api.confirmMyAbcOrder(o.id, o.suggested_qty); orders.reload(); }}>{tr("abcInv.orderConfirm")}</Button>
            <Button size="xs" variant="outline" onClick={async () => {
              const v = window.prompt(tr("abcInv.orderOther", { unit: o.unit ?? "" }));
              if (v !== null && v.trim() !== "" && !Number.isNaN(Number(v))) { await api.confirmMyAbcOrder(o.id, Number(v)); orders.reload(); }
            }}>{tr("abcInv.orderChange")}</Button>
            <Button size="xs" variant="ghost" onClick={async () => { await api.confirmMyAbcOrder(o.id, 0); orders.reload(); }}>{tr("abcInv.orderDecline")}</Button>
          </span>
        </div>
      ))}
      {votes.data?.filter((v) => !v.confirmed_at).map((v) => (
        <div key={v.id} className="mb-3 rounded-lg bg-brand-50 p-3 text-sm dark:bg-brand-500/10">
          <p className="text-gray-800 dark:text-white/90">
            {tr("abcInv.voteRecorded", { meeting: v.meeting, motion: v.motion, choice: tr(`abc.motion.${v.choice}`) })}
          </p>
          <span className="mt-2 flex flex-wrap gap-2">
            <Button size="xs" onClick={async () => { await api.confirmMyAbcVote(v.id, true); votes.reload(); }}>{tr("abcInv.voteCorrect")}</Button>
            <Button size="xs" variant="outline" onClick={async () => { await api.confirmMyAbcVote(v.id, false); votes.reload(); }}>{tr("abcInv.voteWrong")}</Button>
          </span>
        </div>
      ))}
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {list.data.map((i) => (
          <li
            key={i.org_id}
            className="flex flex-wrap items-center justify-between gap-2 py-3"
          >
            <span className="font-medium text-gray-800 dark:text-white/90">
              {i.name}
            </span>
            {i.status === "invited" ? (
              <span className="flex gap-2">
                <Button size="sm" onClick={() => decide(i.org_id, "accept")}>
                  {tr("abcInv.accept")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => decide(i.org_id, "decline")}
                >
                  {tr("abcInv.decline")}
                </Button>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Badge size="sm" color="success">
                  {tr("abcInv.member")}
                </Badge>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => decide(i.org_id, "leave")}
                >
                  {tr("abcInv.leave")}
                </Button>
              </span>
            )}
            {i.status !== "invited" && (
              <div className="w-full text-sm">
                {bookings.data?.filter((b) => b.org_id === i.org_id && b.status !== "cancelled").slice(0, 3).map((b) => (
                  <p key={b.id} className="text-theme-xs text-gray-600 dark:text-gray-400">
                    {tr(`abc.mac.svc.${b.service}` as MessageKey)} · {b.scheduled_date ?? b.requested_date} · {tr(`abc.mac.status.${b.status}` as MessageKey)}
                    {b.machine ? ` · ${b.machine}` : ""}
                  </p>
                ))}
                {book?.org === i.org_id ? (
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <select className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900" value={book.service}
                      onChange={(e) => setBook({ ...book, service: e.target.value })}>
                      {["ploughing", "planting", "spraying", "harvesting", "threshing", "transport"].map((s) => (
                        <option key={s} value={s}>{tr(`abc.mac.svc.${s}` as MessageKey)}</option>
                      ))}
                    </select>
                    <input type="date" className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900" value={book.date}
                      onChange={(e) => setBook({ ...book, date: e.target.value })} />
                    <input inputMode="decimal" placeholder={tr("unit.ha")} className="w-20 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                      value={book.ha} onChange={(e) => setBook({ ...book, ha: e.target.value })} />
                    <Button size="xs" disabled={!book.date} onClick={async () => {
                      setError(null);
                      try {
                        await api.myAbcBook({ org_id: i.org_id, service: book.service, requested_date: book.date, area_ha: book.ha ? Number(book.ha) : null });
                        setBook(null);
                        bookings.reload();
                      } catch (err) {
                        setError(errorMessage(err));
                      }
                    }}>{tr("abcInv.bookSend")}</Button>
                  </span>
                ) : (
                  <Button className="mt-1" size="xs" variant="outline"
                    onClick={() => setBook({ org: i.org_id, service: "ploughing", date: new Date().toISOString().slice(0, 10), ha: "" })}>
                    {tr("abcInv.book")}
                  </Button>
                )}
              </div>
            )}
            {i.status !== "invited" && agreementOf(i.org_id)?.agreement && (
              <div className="w-full rounded-lg bg-gray-50 p-3 text-sm dark:bg-white/[0.03]">
                {agreementOf(i.org_id)?.signed ? (
                  <p className="text-success-600">{tr("abcInv.signed", { date: agreementOf(i.org_id)!.signed!.signed_at.slice(0, 10) })}</p>
                ) : (
                  <>
                    <p className="text-gray-700 dark:text-gray-300">{tr("abcInv.agreementHint")}</p>
                    <span className="mt-2 flex flex-wrap gap-2">
                      <Button size="xs" variant="outline" onClick={() => readAgreement(i.org_id)}>{tr("abcInv.read")}</Button>
                      <Button size="xs" onClick={() => sign(i.org_id)}>{tr("abcInv.confirm")}</Button>
                    </span>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
