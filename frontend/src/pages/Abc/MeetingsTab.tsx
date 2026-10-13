// ABC voting and meetings (A5): voting weights from land and production, meetings with notices, attendance and
// weighted quorum, motions with votes entered by the secretary, minutes approved by the board.
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
import type { AbcMeeting } from "@/types/abc";
import { formatDateTime } from "@/utils/formatters";
import { CalendarClock, Megaphone, Printer, Scale, Vote } from "lucide-react";
import { useState } from "react";

const pct = (x: number) => `${(x * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

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

function Weights({ orgId }: { orgId: number }) {
  const [season, setSeason] = useState<string>("");
  const [newSeason, setNewSeason] = useState("");
  const [prod, setProd] = useState<Record<number, string>>({});
  const w = useAsync(() => api.abcWeights(orgId, season || null), [orgId, season]);
  const { msg, run } = useRun(w.reload);
  const d = w.data;
  const target = season || newSeason.trim() || d?.season || "";
  return (
    <Card icon={<Scale className="size-5" />} title={tr("abc.vote.weights")}
      description={d ? tr(d.equal_weights ? "abc.vote.equal" : d.land_only ? "abc.vote.landOnly" : "abc.vote.formula",
        { land: pct(d.land_factor), prod: pct(d.production_factor) }) : undefined}>
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      {w.loading && !d ? <LoadingState /> : w.error || !d ? <ErrorState message={w.error} onRetry={w.reload} /> : (
        <>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <div className="w-48">
              <Label>{tr("abc.vote.season")}</Label>
              <Select value={season || d.season || ""} placeholder="—" onChange={setSeason}
                options={d.seasons.map((s) => ({ value: s, label: s }))} />
            </div>
            {d.can_record && (
              <div className="w-48">
                <Label>{tr("abc.vote.newSeason")}</Label>
                <Input value={newSeason} placeholder="2018 E.C. irrigated" onChange={(e) => setNewSeason(e.target.value)} />
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-start text-theme-xs text-gray-500">
                  <th className="px-2 py-1 text-start">{tr("abc.form.member")}</th>
                  <th className="px-2 py-1 text-end">{tr("abc.vote.land")}</th>
                  <th className="px-2 py-1 text-end">{tr("abc.vote.production")}</th>
                  <th className="px-2 py-1 text-end">{tr("abc.vote.weight")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {d.members.map((m) => (
                  <tr key={m.farmer_id}>
                    <td className="px-2 py-1.5 text-gray-800 dark:text-white/90">{m.member_no ? `#${m.member_no} ` : ""}{m.name}</td>
                    <td className="px-2 py-1.5 text-end">{m.land_ha} {tr("unit.ha")}</td>
                    <td className="px-2 py-1.5 text-end">
                      {d.can_record && target ? (
                        <span className="inline-flex items-center gap-1">
                          <input className="w-20 rounded border border-gray-300 px-1.5 py-0.5 text-end text-sm dark:border-gray-700 dark:bg-transparent"
                            inputMode="decimal" value={prod[m.farmer_id] ?? (season || !newSeason ? String(m.production_qt) : "")}
                            onChange={(e) => setProd({ ...prod, [m.farmer_id]: e.target.value })}
                            onBlur={() => {
                              const v = prod[m.farmer_id];
                              if (v !== undefined && v !== "") void run(() => api.abcRecordProduction(orgId, {
                                farmer_id: m.farmer_id, season: target, quantity_qt: Number(v), source: "estimate" }));
                            }} />
                          <span className="text-theme-xs text-gray-500">qt</span>
                        </span>
                      ) : `${m.production_qt} qt`}
                    </td>
                    <td className="px-2 py-1.5 text-end font-semibold">{pct(m.weight)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-theme-xs text-gray-500">{tr("abc.vote.weightsHint")}</p>
        </>
      )}
    </Card>
  );
}

function NewMeeting({ orgId, onCreated }: { orgId: number; onCreated: (id: number) => void }) {
  const [f, setF] = useState({ kind: "general_assembly", title: "", when: "", location: "", agenda: "" });
  const { msg, run } = useRun(() => undefined);
  return (
    <Card icon={<CalendarClock className="size-5" />} title={tr("abc.meet.new")} description={tr("abc.meet.newHint")}>
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>{tr("abc.meet.kind")}</Label>
          <Select value={f.kind} onChange={(v) => setF({ ...f, kind: v })}
            options={(["general_assembly", "board"] as const).map((k) => ({ value: k, label: tr(`abc.meet.kind.${k}` as MessageKey) }))} />
        </div>
        <div>
          <Label>{tr("abc.meet.when")}</Label>
          <Input type="datetime-local" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} />
        </div>
        <div>
          <Label>{tr("abc.form.title")}</Label>
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div>
          <Label>{tr("abc.meet.place")}</Label>
          <Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>{tr("abc.meet.agenda")}</Label>
          <TextArea rows={3} value={f.agenda} placeholder={tr("abc.meet.agendaHint")} onChange={(v) => setF({ ...f, agenda: v })} />
        </div>
      </div>
      <Button className="mt-3" size="sm" disabled={f.title.trim().length < 3 || !f.when}
        onClick={() => run(async () => {
          const m = await api.abcCreateMeeting(orgId, { kind: f.kind, title: f.title.trim(), scheduled_at: f.when,
            location: f.location.trim() || null, agenda: f.agenda.split("\n") });
          onCreated(m.id);
        })}>{tr("abc.meet.create")}</Button>
    </Card>
  );
}

function printMinutes(m: AbcMeeting) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  const motions = m.motions.map((mo) => `<li><b>${esc(mo.title)}</b>: ${esc(tr(`abc.motion.result.${mo.result ?? "open"}` as MessageKey))}
    (${esc(tr("abc.motion.yes"))} ${pct(mo.tally.weights.yes)}, ${esc(tr("abc.motion.no"))} ${pct(mo.tally.weights.no)})</li>`).join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(m.title)}</title>
<style>body{font-family:system-ui,sans-serif;margin:40px;color:#111;line-height:1.5}.note{margin-top:32px;font-size:12px;color:#555}pre{white-space:pre-wrap;font:inherit}</style>
<h1>${esc(m.title)}</h1><p>${esc(formatDateTime(m.scheduled_at))}${m.location ? " · " + esc(m.location) : ""}</p>
<p>${esc(tr("abc.meet.quorumLine", { present: m.quorum.present, eligible: m.quorum.eligible, pct: pct(m.quorum.fraction) }))}</p>
<h2>${esc(tr("abc.meet.motions"))}</h2><ul>${motions}</ul><h2>${esc(tr("abc.meet.minutes"))}</h2><pre>${esc(m.minutes ?? "")}</pre>
${m.minutes_approved_by_name ? `<p>${esc(tr("abc.meet.approvedBy", { name: m.minutes_approved_by_name, date: formatDateTime(m.minutes_approved_at ?? "") }))}</p>` : ""}
<p class="note">${esc(m.official_record_note)}</p><script>window.print()</script>`);
  w.document.close();
}

function MeetingDetail({ orgId, id, onChanged }: { orgId: number; id: number; onChanged: () => void }) {
  const m = useAsync(() => api.abcMeeting(orgId, id), [orgId, id]);
  const { msg, run } = useRun(() => { m.reload(); onChanged(); });
  const [present, setPresent] = useState<Set<number> | null>(null);
  const [motion, setMotion] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [minutes, setMinutes] = useState<string | null>(null);
  if (m.loading && !m.data) return <LoadingState />;
  if (m.error || !m.data) return <ErrorState message={m.error} onRetry={m.reload} />;
  const d = m.data;
  const here = present ?? new Set(d.voters.filter((v) => v.present).map((v) => v.user_id));
  const isGA = d.kind === "general_assembly";
  return (
    <Card icon={<Vote className="size-5" />} title={d.title}
      description={`${tr(`abc.meet.kind.${d.kind}` as MessageKey)} · ${formatDateTime(d.scheduled_at)}${d.location ? ` · ${d.location}` : ""}`}
      actions={<Badge color={d.status === "held" ? "success" : d.status === "cancelled" ? "error" : "warning"}>{tr(`abc.meet.status.${d.status}` as MessageKey)}</Badge>}>
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      {!!d.agenda.length && (
        <ol className="mb-3 list-decimal ps-5 text-sm text-gray-700 dark:text-gray-300">{d.agenda.map((a) => <li key={a}>{a}</li>)}</ol>
      )}
      {d.can_meet && d.status === "scheduled" && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" startIcon={<Megaphone className="size-4" />}
            onClick={() => run(async () => { const r = await api.abcNotify(orgId, d.id); return r; }, tr("abc.meet.noticeSent"))}>
            {d.notice_sent_at ? tr("abc.meet.noticeAgain") : tr("abc.meet.sendNotice")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => run(() => api.abcCancelMeeting(orgId, d.id))}>{tr("abc.meet.cancel")}</Button>
        </div>
      )}
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">{tr("abc.meet.attendance")}</h4>
        <Badge size="sm" color={d.quorum.met ? "success" : "warning"}>
          {tr("abc.meet.quorumBadge", { pct: pct(d.quorum.fraction), need: pct(d.quorum.need) })}
        </Badge>
      </div>
      <div className="mb-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={d.quorum.met ? "h-full bg-success-500" : "h-full bg-warning-500"} style={{ width: `${Math.min(100, d.quorum.fraction * 100)}%` }} />
      </div>
      <ul className="mb-2 grid max-h-56 gap-1 overflow-y-auto text-sm sm:grid-cols-2">
        {d.voters.map((v) => (
          <li key={v.user_id}>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-brand-500" disabled={!d.can_meet || d.status === "cancelled"} checked={here.has(v.user_id)}
                onChange={(e) => { const s = new Set(here); if (e.target.checked) s.add(v.user_id); else s.delete(v.user_id); setPresent(s); }} />
              <span className="flex-1 text-gray-700 dark:text-gray-300">{v.name}</span>
              {isGA && <span className="text-theme-xs text-gray-500">{pct(v.weight)}</span>}
            </label>
          </li>
        ))}
      </ul>
      {d.can_meet && present && (
        <Button size="sm" onClick={() => run(async () => { await api.abcAttendance(orgId, d.id, [...present]); setPresent(null); })}>
          {tr("abc.meet.saveAttendance")}
        </Button>
      )}

      <h4 className="mb-2 mt-5 text-sm font-semibold text-gray-800 dark:text-white/90">{tr("abc.meet.motions")}</h4>
      {d.motions.length ? (
        <ul className="space-y-3">
          {d.motions.map((mo) => (
            <li key={mo.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{mo.title}</p>
                <Badge size="sm" color={mo.result === "passed" ? "success" : mo.result ? "error" : "light"}>
                  {tr(`abc.motion.result.${mo.result ?? "open"}` as MessageKey)}
                </Badge>
              </div>
              <p className="mt-1 text-theme-xs text-gray-500">
                {tr("abc.motion.tally", { yes: pct(mo.tally.weights.yes), no: pct(mo.tally.weights.no), abstain: pct(mo.tally.weights.abstain),
                  ny: mo.tally.counts.yes, nn: mo.tally.counts.no, na: mo.tally.counts.abstain })}
              </p>
              {d.can_meet && mo.status === "open" && (
                <div className="mt-2 space-y-2">
                  <ul className="grid gap-1 text-sm sm:grid-cols-2">
                    {d.voters.filter((v) => v.present).map((v) => (
                      <li key={v.user_id} className="flex items-center gap-2">
                        <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{v.name}</span>
                        <select className="rounded border border-gray-300 px-1.5 py-0.5 text-sm dark:border-gray-700 dark:bg-gray-900"
                          value={choices[`${mo.id}:${v.user_id}`] ?? mo.votes[String(v.user_id)]?.choice ?? ""}
                          onChange={(e) => setChoices({ ...choices, [`${mo.id}:${v.user_id}`]: e.target.value })}>
                          <option value="">—</option>
                          {(["yes", "no", "abstain"] as const).map((c) => <option key={c} value={c}>{tr(`abc.motion.${c}` as MessageKey)}</option>)}
                        </select>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <Button size="xs" onClick={() => {
                      const votes = Object.entries(choices).filter(([k, v]) => k.startsWith(`${mo.id}:`) && v)
                        .map(([k, v]) => ({ user_id: Number(k.split(":")[1]), choice: v }));
                      if (votes.length) void run(() => api.abcVotes(orgId, mo.id, votes));
                    }}>{tr("abc.motion.saveVotes")}</Button>
                    <Button size="xs" variant="outline" onClick={() => run(() => api.abcCloseMotion(orgId, mo.id))}>{tr("abc.motion.close")}</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">{tr("abc.meet.noMotions")}</p>
      )}
      {d.can_meet && d.status !== "cancelled" && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Label>{tr("abc.meet.newMotion")}</Label>
            <Input value={motion} onChange={(e) => setMotion(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" disabled={motion.trim().length < 3}
            onClick={() => run(async () => { await api.abcAddMotion(orgId, d.id, motion.trim()); setMotion(""); })}>{tr("abc.meet.addMotion")}</Button>
        </div>
      )}

      <h4 className="mb-2 mt-5 text-sm font-semibold text-gray-800 dark:text-white/90">{tr("abc.meet.minutes")}</h4>
      {d.minutes_status === "approved" ? (
        <p className="text-theme-xs text-success-600">{tr("abc.meet.approvedBy", { name: d.minutes_approved_by_name ?? "—", date: formatDateTime(d.minutes_approved_at ?? "") })}</p>
      ) : null}
      {d.can_meet && d.minutes_status !== "approved" ? (
        <>
          <TextArea rows={5} value={minutes ?? d.minutes ?? ""} onChange={setMinutes} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!minutes || minutes.trim().length < 10}
              onClick={() => run(() => api.abcSaveMinutes(orgId, d.id, minutes!.trim()), tr("abc.saved"))}>{tr("abc.meet.saveMinutes")}</Button>
          </div>
        </>
      ) : (
        <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{d.minutes || "—"}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {d.can_approve && d.minutes_status === "draft" && (
          <Button size="sm" onClick={() => run(() => api.abcApproveMinutes(orgId, d.id))}>{tr("abc.meet.approveMinutes")}</Button>
        )}
        <Button size="sm" variant="ghost" startIcon={<Printer className="size-4" />} onClick={() => printMinutes(d)}>{tr("abc.meet.print")}</Button>
      </div>
      <p className="mt-3 text-theme-xs text-gray-500">{d.official_record_note}</p>
    </Card>
  );
}

export default function MeetingsTab({ orgId }: { orgId: number }) {
  const list = useAsync(() => api.abcMeetings(orgId), [orgId]);
  const [selected, setSelected] = useState<number | null>(null);
  const rows = list.data?.meetings ?? [];
  const current = selected ?? rows[0]?.id ?? null;
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-4 xl:col-span-5">
        <Card icon={<CalendarClock className="size-5" />} title={tr("abc.meet.list")}>
          {list.loading && !list.data ? <LoadingState /> : rows.length ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setSelected(r.id)}
                    className={`flex w-full items-center justify-between gap-2 py-2 text-start ${r.id === current ? "text-brand-600" : ""}`}>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{r.title}</span>
                      <span className="text-theme-xs text-gray-500">{tr(`abc.meet.kind.${r.kind}` as MessageKey)} · {formatDateTime(r.scheduled_at)}</span>
                    </span>
                    <Badge size="sm" color={r.status === "held" ? "success" : r.status === "cancelled" ? "error" : "warning"}>
                      {tr(`abc.meet.status.${r.status}` as MessageKey)}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          ) : <EmptyState title={tr("abc.meet.none")} />}
        </Card>
        {list.data?.can_meet && <NewMeeting orgId={orgId} onCreated={(id) => { setSelected(id); list.reload(); }} />}
        <Weights orgId={orgId} />
      </div>
      <div className="col-span-12 xl:col-span-7">
        {current ? <MeetingDetail key={current} orgId={orgId} id={current} onChanged={list.reload} /> : null}
      </div>
    </div>
  );
}
