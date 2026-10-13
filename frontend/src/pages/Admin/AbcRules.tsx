// Admin: the ABC legal rules (minimum members, share value, ownership cap, ...). A change is a new value from a
// date, with its source; older values stay as history. Code reads the value in force on each day.
import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import { RuleStatus, ruleName, ruleValue } from "@/pages/Abc/abcLabels";
import { ABC_TYPES, type AbcRule } from "@/types/abc";
import { formatFullDate } from "@/utils/formatters";
import { Scale } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

const typeName = (t: string) => (t === "*" ? tr("abc.type.all") : tr(`abc.type.${t}` as MessageKey));

export default function AbcRules() {
  const rules = useAsync(() => api.abcAllRules(), []);
  const keys = useMemo(() => [...new Set((rules.data ?? []).map((r) => r.key))], [rules.data]);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ key: "", abc_type: "*", value: "", effective_from: today, source: "",
    verification_status: "verified", note: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const unitOf = (key: string) => rules.data?.find((r) => r.key === key)?.unit ?? null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const raw = Number(form.value.replace(/,/g, ""));
    const unit = unitOf(form.key);
    try {
      await api.abcAddRule({ key: form.key, abc_type: form.abc_type, value: unit === "fraction" ? raw / 100 : raw, unit,
        effective_from: form.effective_from, source: form.source.trim(), verification_status: form.verification_status,
        note: form.note.trim() || null });
      setMsg({ ok: true, text: tr("abc.rules.added") });
      setForm({ ...form, value: "", source: "", note: "" });
      rules.reload();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  }

  const grouped = useMemo(() => {
    const g = new Map<string, AbcRule[]>();
    for (const r of rules.data ?? []) g.set(r.key, [...(g.get(r.key) ?? []), r]);
    return [...g.entries()];
  }, [rules.data]);

  return (
    <>
      <PageMeta title={`${tr("nav.abcRules")} | ${tr("app.name")}`} description={tr("abc.rules.description")} />
      <PageHeader title={tr("nav.abcRules")} description={tr("abc.rules.description")} />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-8">
          <Card icon={<Scale className="size-5" />} title={tr("abc.rules.all")}>
            {rules.loading ? (
              <LoadingState />
            ) : rules.error ? (
              <ErrorState message={rules.error} onRetry={rules.reload} />
            ) : (
              <div className="space-y-5">
                {grouped.map(([key, rows]) => (
                  <div key={key}>
                    <h3 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">{ruleName(key)}</h3>
                    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 px-3 dark:divide-gray-800 dark:border-gray-800">
                      {rows.map((r) => (
                        <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                          <div className="min-w-0 flex-1 text-theme-xs text-gray-500">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{typeName(r.abc_type)}</span>
                            {" · "}{tr("abc.ruleSince", { date: formatFullDate(r.effective_from) })}
                            {r.created_by_name && ` · ${r.created_by_name}`}
                            <br />{r.source}{r.note && ` · ${r.note}`}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{ruleValue(r)}</span>
                            <RuleStatus status={r.verification_status} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="col-span-12 xl:col-span-4">
          <Card title={tr("abc.rules.new")} description={tr("abc.rules.newHint")}>
            {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label htmlFor="r-key">{tr("abc.rules.rule")}</Label>
                <Select id="r-key" value={form.key} placeholder="—" onChange={(v) => setForm({ ...form, key: v })}
                  options={keys.map((k) => ({ value: k, label: ruleName(k) }))} />
              </div>
              <div>
                <Label htmlFor="r-type">{tr("abc.company.type")}</Label>
                <Select id="r-type" value={form.abc_type} onChange={(v) => setForm({ ...form, abc_type: v })}
                  options={["*", ...ABC_TYPES].map((t) => ({ value: t, label: typeName(t) }))} />
              </div>
              <div>
                <Label htmlFor="r-value">
                  {tr("abc.rules.value")}{form.key && unitOf(form.key) ? ` (${unitOf(form.key) === "fraction" ? "%" : tr(`abc.unit.${unitOf(form.key)}` as MessageKey)})` : ""}
                </Label>
                <Input id="r-value" inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="r-from">{tr("abc.rules.from")}</Label>
                <Input id="r-from" type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="r-source">{tr("abc.rules.source")}</Label>
                <Input id="r-source" value={form.source} placeholder={tr("abc.rules.sourceHint")} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="r-status">{tr("abc.rules.status")}</Label>
                <Select id="r-status" value={form.verification_status} onChange={(v) => setForm({ ...form, verification_status: v })}
                  options={[
                    { value: "verified", label: tr("abc.ruleVerified") },
                    { value: "PLACEHOLDER_VERIFY", label: tr("abc.ruleDraft") },
                    { value: "platform_default", label: tr("abc.rulePlatform") },
                  ]} />
              </div>
              <Button type="submit" size="sm" disabled={!form.key || !form.value.trim() || form.source.trim().length < 5}>
                {tr("abc.rules.save")}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
