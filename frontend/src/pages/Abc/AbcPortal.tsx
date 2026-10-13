import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import type { AbcOverview } from "@/types/api";
import { formatDateTime, formatFullDate } from "@/utils/formatters";
import {
  Download,
  Handshake,
  Megaphone,
  ShoppingCart,
  Sprout,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import CompanyTab from "./CompanyTab";
import FormationTab from "./FormationTab";
import RegistryTab from "./RegistryTab";
import SharesTab from "./SharesTab";
import MeetingsTab from "./MeetingsTab";
import FinanceTab from "./FinanceTab";
import InputsTab from "./InputsTab";

type Tab = "company" | "formation" | "members" | "shares" | "meetings" | "finance" | "inputs" | "contributions" | "planning" | "messages" | "buyers";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(url);
}

/** ABC workspace. Everyone with a role in the ABC: company (profile, rules, team, history). ABC managers also:
 *  members who accepted, contributions, crop planning, messages to members, buyer requests. */
export default function AbcPortal() {
  const { user, can } = useAuth();
  const companies = user?.abc_companies ?? [];
  const [orgId, setOrgId] = useState<number | null>(companies[0]?.org_id ?? null);
  const company = useAsync(() => api.abcCompany(orgId), [orgId]);
  const isManager = can("abc:manage");
  const overview = useAsync(() => (isManager ? api.abcOverview() : Promise.resolve(null)), [isManager]);
  const [tab, setTab] = useState<Tab>("company");
  const ov = overview.data;

  return (
    <>
      <PageMeta
        title={`${tr("nav.abc")} | ${tr("app.name")}`}
        description={tr("abc.description")}
      />
      <PageHeader
        title={company.data?.org.name ?? ov?.org.name ?? tr("nav.abc")}
        description={tr("abc.description")}
        actions={isManager && (
          <Button
            size="sm"
            variant="outline"
            startIcon={<Download className="size-4" />}
            onClick={async () =>
              saveBlob(await api.abcReportCsv(), "abc-report.csv")
            }
          >
            {tr("abc.report")}
          </Button>
        )}
      />
      {companies.length > 1 && (
        <div className="mb-4 max-w-sm">
          <Label htmlFor="abc-pick">{tr("abc.pickCompany")}</Label>
          <Select id="abc-pick" value={String(orgId ?? "")} onChange={(v) => setOrgId(Number(v))}
            options={companies.map((c) => ({ value: String(c.org_id), label: c.name }))} />
        </div>
      )}
      {tab === "company" && (company.loading ? (
        <LoadingState />
      ) : company.error || !company.data ? (
        <ErrorState message={company.error} onRetry={company.reload} />
      ) : null)}
      {!isManager ? (
        company.data && (
          <>
            <Tabs variant="underline" className="mb-4" value={tab} onChange={setTab}
              tabs={[{ id: "company", label: tr("abc.tab.company") }, { id: "formation", label: tr("abc.tab.formation") },
                { id: "members", label: tr("abc.tab.members") }, { id: "shares", label: tr("abc.tab.shares") },
                { id: "meetings", label: tr("abc.tab.meetings") },
                ...(company.data.capabilities.includes("finance_read") ? [{ id: "finance" as const, label: tr("abc.tab.finance") }] : []),
                { id: "inputs", label: tr("abc.tab.inputs") }]} />
            {tab === "company" && <CompanyTab c={company.data} onChanged={company.reload} />}
            {tab === "members" && <RegistryTab orgId={company.data.org.id} />}
            {tab === "shares" && <SharesTab orgId={company.data.org.id} />}
            {tab === "meetings" && <MeetingsTab orgId={company.data.org.id} />}
            {tab === "finance" && <FinanceTab orgId={company.data.org.id} />}
            {tab === "inputs" && <InputsTab orgId={company.data.org.id} />}
            {tab === "formation" && <FormationTab orgId={company.data.org.id} />}
          </>
        )
      ) : overview.loading ? (
        <LoadingState />
      ) : overview.error || !ov ? (
        <ErrorState message={overview.error} onRetry={overview.reload} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "abc.members" as MessageKey, value: ov.members.length },
              { label: "abc.invited" as MessageKey, value: ov.invited.length },
              {
                label: "abc.area" as MessageKey,
                value: `${ov.crops.reduce((s, c) => s + c.area_ha, 0).toFixed(1)} ${tr("unit.ha")}`,
              },
              {
                label: "abc.contributions" as MessageKey,
                value: ov.contributions.reduce((s, c) => s + c.n, 0),
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {tr(s.label)}
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
          <Tabs
            variant="underline"
            className="mb-4"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "company", label: tr("abc.tab.company") },
              { id: "formation", label: tr("abc.tab.formation") },
              { id: "members", label: tr("abc.tab.members") },
              { id: "shares", label: tr("abc.tab.shares") },
              { id: "meetings", label: tr("abc.tab.meetings") },
              { id: "finance", label: tr("abc.tab.finance") },
              { id: "inputs", label: tr("abc.tab.inputs") },
              { id: "contributions", label: tr("abc.tab.contributions") },
              { id: "planning", label: tr("abc.tab.planning") },
              { id: "messages", label: tr("abc.tab.messages") },
              { id: "buyers", label: tr("abc.tab.buyers") },
            ]}
          />
          {tab === "company" && company.data && <CompanyTab c={company.data} onChanged={company.reload} />}
          {tab === "formation" && company.data && <FormationTab orgId={company.data.org.id} />}
          {tab === "members" && company.data && <RegistryTab orgId={company.data.org.id} />}
          {tab === "shares" && company.data && <SharesTab orgId={company.data.org.id} />}
          {tab === "meetings" && company.data && <MeetingsTab orgId={company.data.org.id} />}
          {tab === "finance" && company.data && <FinanceTab orgId={company.data.org.id} />}
          {tab === "inputs" && company.data && <InputsTab orgId={company.data.org.id} />}
          {tab === "contributions" && (
            <Contributions ov={ov} onChanged={overview.reload} />
          )}
          {tab === "planning" && <Planning />}
          {tab === "messages" && <Messages ov={ov} />}
          {tab === "buyers" && <Buyers />}
        </>
      )}
    </>
  );
}

function Contributions({
  ov,
  onChanged,
}: {
  ov: AbcOverview;
  onChanged: () => void;
}) {
  const list = useAsync(() => api.abcContributions(), []);
  const [form, setForm] = useState({
    farmer: "",
    kind: "land",
    description: "",
    quantity: "",
    unit: "",
  });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.abcAddContribution({
        farmer_id: Number(form.farmer),
        kind: form.kind,
        description: form.description || null,
        quantity: form.quantity ? Number(form.quantity) : null,
        unit: form.unit || null,
      });
      setForm((f) => ({ ...f, description: "", quantity: "" }));
      list.reload();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card
      accent="amber"
      icon={<Handshake className="size-5" />}
      title={tr("abc.tab.contributions")}
      description={tr("abc.contributionsNote")}
    >
      <form
        onSubmit={add}
        noValidate
        className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-6 sm:items-end"
      >
        <div className="sm:col-span-2">
          <Label htmlFor="ct-farmer">{tr("da.col.farmer")}</Label>
          <Select
            id="ct-farmer"
            placeholder="—"
            options={ov.members.map((m) => ({
              value: String(m.id),
              label: m.name,
            }))}
            value={form.farmer}
            onChange={(v) => set("farmer", v)}
          />
        </div>
        <div>
          <Label htmlFor="ct-kind">{tr("orgs.type")}</Label>
          <Select
            id="ct-kind"
            value={form.kind}
            onChange={(v) => set("kind", v)}
            options={["land", "livestock", "labour"].map((k) => ({
              value: k,
              label: tr(`abc.kind.${k}` as MessageKey),
            }))}
          />
        </div>
        <div>
          <Label htmlFor="ct-qty">{tr("abc.quantity")}</Label>
          <Input
            id="ct-qty"
            type="number"
            min={0}
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ct-unit">{tr("abc.unit")}</Label>
          <Input
            id="ct-unit"
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={!form.farmer}>
          {tr("abc.add")}
        </Button>
        <div className="sm:col-span-6">
          <Input
            placeholder={tr("abc.descField")}
            aria-label={tr("abc.descField")}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </form>
      {error && <Alert className="mb-4" variant="error" message={error} />}
      <ul className="divide-y divide-gray-100 text-theme-sm dark:divide-gray-800">
        {(list.data ?? []).map((c) => (
          <li key={c.id} className="py-2">
            <span className="font-medium text-gray-800 dark:text-white/90">
              {c.farmer_name}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {" "}
              · {tr(`abc.kind.${c.kind}` as MessageKey)}
              {c.quantity != null ? ` · ${c.quantity} ${c.unit ?? ""}` : ""}
              {c.description ? ` · ${c.description}` : ""} ·{" "}
              {formatFullDate(c.created_at)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Planning() {
  const plan = useAsync(() => api.abcPlanning(), []);
  const stage = (k: string) =>
    k === "unknown" ? tr("outlook.unknown") : trTerm("stage", k);
  if (plan.loading) return <LoadingState />;
  if (plan.error || !plan.data)
    return <ErrorState message={plan.error} onRetry={plan.reload} />;
  const p = plan.data;
  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
      <Card
        icon={<Sprout className="size-5" />}
        accent="green"
        title={tr("abc.byStage")}
      >
        <ul className="space-y-1.5 text-theme-sm">
          {p.by_stage.map((r) => (
            <li
              key={`${r.crop}-${r.stage_key}`}
              className="flex justify-between gap-2"
            >
              <span>
                {trTerm("crop", r.crop)} · {stage(r.stage_key)}
              </span>
              <span className="font-medium">
                {r.farms} · {r.area_ha} {tr("unit.ha")}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card
        accent="sky"
        title={tr("abc.upcoming")}
        description={tr("abc.upcomingHint")}
      >
        {!p.upcoming.length ? (
          <p className="text-theme-sm text-gray-500">—</p>
        ) : (
          <ul className="space-y-1.5 text-theme-sm">
            {p.upcoming.map((r) => (
              <li
                key={`${r.crop}-${r.stage_key}`}
                className="flex justify-between gap-2"
              >
                <span>
                  {trTerm("crop", r.crop)} · {stage(r.stage_key)}
                  {r.first_date ? ` · ${formatFullDate(r.first_date)}` : ""}
                </span>
                <span className="font-medium">
                  {r.farms} · {r.area_ha} {tr("unit.ha")}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-theme-xs text-gray-500 italic">
          {tr("abc.quantitiesNote")}
        </p>
      </Card>
      <Card accent="amber" title={tr("outlook.harvest")}>
        <ul className="space-y-1.5 text-theme-sm">
          {p.harvest.map((r) => (
            <li
              key={`${r.crop}-${r.month}`}
              className="flex justify-between gap-2"
            >
              <span>
                {trTerm("crop", r.crop)} ·{" "}
                {r.month === "unknown" ? tr("outlook.unknown") : r.month}
              </span>
              <span className="font-medium">
                {r.farms} · {r.area_ha} {tr("unit.ha")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-theme-xs text-gray-500">
          {tr("outlook.estimated")}
        </p>
      </Card>
    </div>
  );
}

function Messages({ ov }: { ov: AbcOverview }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function send() {
    setMsg(null);
    try {
      const r = await api.abcBroadcast(text.trim());
      setMsg({
        ok: true,
        text: tr("abc.sent", {
          n: r.sent,
          skipped: r.no_consent + r.suppressed,
        }),
      });
      setText("");
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  }
  return (
    <Card
      accent="violet"
      icon={<Megaphone className="size-5" />}
      title={tr("abc.tab.messages")}
      description={tr("abc.messagesHint", { n: ov.members.length })}
    >
      <TextArea rows={3} value={text} onChange={setText} placeholder="" />
      {msg && (
        <Alert
          className="mt-3"
          variant={msg.ok ? "success" : "error"}
          message={msg.text}
        />
      )}
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          disabled={text.trim().length < 3 || !ov.members.length}
          onClick={send}
        >
          {tr("abc.send")}
        </Button>
      </div>
    </Card>
  );
}

function Buyers() {
  const list = useAsync(() => api.abcBuyRequests(), []);
  const [answer, setAnswer] = useState<
    Record<number, { text: string; qty: string }>
  >({});
  return (
    <Card
      accent="orange"
      icon={<ShoppingCart className="size-5" />}
      title={tr("abc.tab.buyers")}
      description={tr("abc.buyersHint")}
    >
      {list.loading ? (
        <LoadingState />
      ) : !list.data?.length ? (
        <EmptyState title={tr("abc.noBuyers")} />
      ) : (
        <ul className="space-y-3">
          {list.data.map((b) => {
            const a = answer[b.id] ?? { text: "", qty: "" };
            return (
              <li
                key={b.id}
                className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
              >
                <p className="font-medium text-gray-800 dark:text-white/90">
                  {trTerm("crop", b.crop)} · {b.quantity_qt}{" "}
                  {tr("unit.quintal")}
                  {b.region && (
                    <span className="font-normal text-gray-500">
                      {" "}
                      · {b.region}
                    </span>
                  )}
                  {b.needed_by && (
                    <span className="font-normal text-gray-500">
                      {" "}
                      · {formatFullDate(b.needed_by)}
                    </span>
                  )}
                </p>
                {b.note && (
                  <p className="text-theme-sm text-gray-600 dark:text-gray-400">
                    {b.note}
                  </p>
                )}
                <p className="text-theme-xs text-gray-400">
                  {formatDateTime(b.created_at)}
                </p>
                {b.responded ? (
                  <Badge size="sm" color="success">
                    {tr("abc.answered")}
                  </Badge>
                ) : (
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        placeholder={tr("abc.answerPlaceholder")}
                        aria-label={tr("abc.answerPlaceholder")}
                        value={a.text}
                        onChange={(e) =>
                          setAnswer((s) => ({
                            ...s,
                            [b.id]: { ...a, text: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        min={1}
                        placeholder={tr("unit.quintal")}
                        aria-label={tr("buy.quantity")}
                        value={a.qty}
                        onChange={(e) =>
                          setAnswer((s) => ({
                            ...s,
                            [b.id]: { ...a, qty: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={a.text.trim().length < 3}
                      onClick={async () => {
                        await api.abcRespond(
                          b.id,
                          a.text.trim(),
                          a.qty ? Number(a.qty) : null,
                        );
                        list.reload();
                      }}
                    >
                      {tr("da.send")}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
