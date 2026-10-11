import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import type { ReviewTip, TipInput } from "@/types/api";
import { formatFullDate } from "@/utils/formatters";
import { Lightbulb, Plus, Sparkles } from "lucide-react";
import { useState } from "react";

const LANGS = ["en", "am", "om", "ti"] as const;
const LANG_NAMES: Record<(typeof LANGS)[number], string> = { en: "English", am: "አማርኛ", om: "Afaan Oromoo", ti: "ትግርኛ" };
const AUDIENCES: { id: string; label: MessageKey }[] = [
  { id: "all", label: "tips.aud.all" },
  { id: "farmer", label: "role.farmer" },
  { id: "agent", label: "role.agent" },
  { id: "abc_manager", label: "role.abc_manager" },
  { id: "farm_manager", label: "role.farm_manager" },
  { id: "trader", label: "role.trader" },
  { id: "ngo_staff", label: "role.ngo_staff" },
  { id: "government", label: "role.government" },
];
const STATUS_COLOR = { draft: "warning", approved: "success", rejected: "light" } as const;

function isoDay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Daily tips: AI drafts (from the MoA guidelines) or hand-written; nothing is published until approved here. */
export default function TipsTab() {
  const [status, setStatus] = useState<"draft" | "approved" | "rejected">("draft");
  const list = useAsync(() => api.reviewTips(status), [status]);
  const [date, setDate] = useState(isoDay(1)); // AI drafts: tomorrow by default
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [writing, setWriting] = useState(false);

  async function draftNow() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.reviewDraftTips(date);
      setMsg({ ok: true, text: tr("tips.drafted", { n: r.created, date: formatFullDate(r.tip_date) }) });
      setStatus("draft");
      list.reload();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      accent="amber"
      icon={<Lightbulb className="size-5" />}
      title={tr("review.tab.tips")}
      description={tr("tips.reviewHint")}
      actions={
        <span className="flex flex-wrap items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button size="sm" loading={busy} startIcon={<Sparkles className="size-4" />} onClick={draftNow}>
            {tr("tips.draftNow")}
          </Button>
          <Button size="sm" variant="outline" startIcon={<Plus className="size-4" />} onClick={() => setWriting(true)}>
            {tr("tips.write")}
          </Button>
        </span>
      }
    >
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      {writing && (
        <div className="mb-4">
          <TipEditor
            initial={{ tip_date: isoDay(0), title: { en: "" }, body: { en: "" }, audience: ["all"], region_pcode: null, crop: "wheat" }}
            onCancel={() => setWriting(false)}
            onSave={async (data, publish) => {
              await api.reviewCreateTip(data, publish);
              setWriting(false);
              setStatus(publish ? "approved" : "draft");
              list.reload();
            }}
          />
        </div>
      )}
      <div className="mb-4 flex gap-2">
        {(["draft", "approved", "rejected"] as const).map((s) => (
          <Button key={s} size="xs" variant={status === s ? "primary" : "outline"} onClick={() => setStatus(s)}>
            {tr(`tips.status.${s}`)}
          </Button>
        ))}
      </div>
      {list.loading ? (
        <LoadingState />
      ) : list.error || !list.data ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data.length ? (
        <EmptyState title={tr("tips.noneHere")} />
      ) : (
        <ul className="space-y-4">
          {list.data.map((t) => (
            <TipRow key={t.id} tip={t} onChanged={list.reload} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function TipRow({ tip, onChanged }: { tip: ReviewTip; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(d: "approve" | "reject") {
    setError(null);
    try {
      await api.reviewDecideTip(tip.id, d);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (editing)
    return (
      <li>
        <TipEditor
          initial={{ tip_date: tip.tip_date, title: tip.title, body: tip.body, audience: tip.audience, region_pcode: tip.region_pcode, crop: tip.crop }}
          onCancel={() => setEditing(false)}
          onSave={async (data, publish) => {
            await api.reviewUpdateTip(tip.id, data, publish);
            setEditing(false);
            onChanged();
          }}
        />
      </li>
    );

  const missing = LANGS.filter((l) => !tip.body[l]);
  return (
    <li className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge size="sm" color={STATUS_COLOR[tip.status]}>
          {tr(`tips.status.${tip.status}`)}
        </Badge>
        <Badge size="sm" color="light">
          {tr(`tips.origin.${tip.origin}`)}
        </Badge>
        <span className="text-theme-xs text-gray-500">
          {formatFullDate(tip.tip_date)} · {tip.region_pcode ?? tr("tips.national")} · {tip.audience.join(", ")}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {LANGS.filter((l) => tip.body[l]).map((l) => (
          <div key={l}>
            <p className="text-theme-xs font-medium text-gray-500">{LANG_NAMES[l]}</p>
            <p className="font-semibold text-gray-800 dark:text-white/90">{tip.title[l]}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{tip.body[l]}</p>
          </div>
        ))}
      </div>
      {tip.sources.length > 0 && (
        <p className="mt-2 text-theme-xs text-gray-500">{tip.sources.map((s) => `[${s.ref}] ${s.citation}`).join(" · ")}</p>
      )}
      {missing.length > 0 && (
        <p className="mt-1 text-theme-xs text-warning-600">{tr("tips.missingLangs", { langs: missing.map((l) => LANG_NAMES[l]).join(", ") })}</p>
      )}
      {error && <p className="mt-1 text-theme-xs text-error-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {tip.status !== "approved" && (
          <Button size="xs" onClick={() => decide("approve")}>
            {tr("tips.approve")}
          </Button>
        )}
        {tip.status !== "rejected" && (
          <Button size="xs" variant="outline" onClick={() => decide("reject")}>
            {tr("tips.reject")}
          </Button>
        )}
        <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
          {tr("tips.edit")}
        </Button>
      </div>
    </li>
  );
}

function TipEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: TipInput;
  onSave: (data: TipInput, publish: boolean) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<TipInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const setText = (field: "title" | "body", lang: string, value: string) =>
    setForm((f) => ({ ...f, [field]: { ...f[field], [lang]: value } }));
  const toggleAudience = (id: string) =>
    setForm((f) => {
      if (id === "all") return { ...f, audience: ["all"] };
      const rest = f.audience.filter((a) => a !== "all" && a !== id);
      const next = f.audience.includes(id) ? rest : [...rest, id];
      return { ...f, audience: next.length ? next : ["all"] };
    });

  async function save(publish: boolean) {
    setError(null);
    try {
      await onSave(form, publish);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand-200 p-4 dark:border-brand-800">
      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Label>{tr("tips.date")}</Label>
          <Input type="date" value={form.tip_date} onChange={(e) => setForm({ ...form, tip_date: e.target.value })} />
        </div>
        <div className="w-44">
          <Label>{tr("tips.region")}</Label>
          <Input
            value={form.region_pcode ?? ""}
            placeholder={tr("tips.national")}
            onChange={(e) => setForm({ ...form, region_pcode: e.target.value || null })}
          />
        </div>
      </div>
      <div>
        <Label>{tr("tips.audience")}</Label>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <Button
              key={a.id}
              size="xs"
              variant={form.audience.includes(a.id) ? "primary" : "outline"}
              onClick={() => toggleAudience(a.id)}
            >
              {tr(a.label)}
            </Button>
          ))}
        </div>
      </div>
      {LANGS.map((l) => (
        <div key={l} className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div>
            <Label>
              {LANG_NAMES[l]} · {tr("tips.title")}
              {l === "en" && " *"}
            </Label>
            <Input value={form.title[l] ?? ""} onChange={(e) => setText("title", l, e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>
              {LANG_NAMES[l]} · {tr("tips.text")}
              {l === "en" && " *"}
            </Label>
            <TextArea rows={2} value={form.body[l] ?? ""} onChange={(v) => setText("body", l, v)} />
          </div>
        </div>
      ))}
      <p className="text-theme-xs text-gray-500">{tr("tips.editorHint")}</p>
      {error && <Alert variant="error" message={error} />}
      <div className="flex gap-2">
        <Button size="sm" disabled={!form.title.en?.trim() || !form.body.en?.trim()} onClick={() => save(true)}>
          {tr("tips.savePublish")}
        </Button>
        <Button size="sm" variant="outline" disabled={!form.title.en?.trim() || !form.body.en?.trim()} onClick={() => save(false)}>
          {tr("tips.saveDraft")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {tr("tips.cancel")}
        </Button>
      </div>
    </div>
  );
}
