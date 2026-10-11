import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/States";
import FactorList from "@/components/financial/FactorList";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import type { CreditReport, CreditRequestStatus } from "@/types/api";
import { formatDateTime, formatFullDate } from "@/utils/formatters";
import { FileSearch, Landmark, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

const STATUS: Record<
  CreditRequestStatus,
  { label: MessageKey; color: "success" | "warning" | "light" | "error" }
> = {
  not_shared: { label: "credit.status.not_shared", color: "warning" },
  pending: { label: "credit.status.pending", color: "warning" },
  declined: { label: "credit.status.declined", color: "light" },
  approved: { label: "credit.status.approved", color: "success" },
  expired: { label: "credit.status.expired", color: "light" },
  revoked: { label: "credit.status.revoked", color: "error" },
};

/** Bank / MFI workspace: ask farmers to share their credit profile; open a report while the approval lasts. */
export default function LenderPortal() {
  const list = useAsync(() => api.creditRequests(), []);
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createCreditRequest(phone.trim(), purpose.trim());
      setMsg({ ok: true, text: tr("credit.sent") });
      setPhone("");
      setPurpose("");
      list.reload();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  }

  return (
    <>
      <PageMeta
        title={`${tr("nav.lender")} | ${tr("app.name")}`}
        description={tr("credit.description")}
      />
      <PageHeader title={tr("nav.lender")} description={tr("credit.description")} />
      <Card
        className="mb-4"
        accent="teal"
        icon={<Send className="size-5" />}
        title={tr("credit.new")}
        description={tr("credit.newHint")}
      >
        <form onSubmit={send} noValidate className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <Label htmlFor="credit-phone">{tr("credit.phone")}</Label>
            <Input
              id="credit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="credit-purpose">{tr("credit.purpose")}</Label>
            <Input
              id="credit-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={phone.trim().length < 9 || purpose.trim().length < 3}
          >
            {tr("credit.send")}
          </Button>
        </form>
        {msg && (
          <Alert
            className="mt-3"
            variant={msg.ok ? "success" : "error"}
            message={msg.text}
          />
        )}
      </Card>
      <Card accent="violet" icon={<Landmark className="size-5" />} title={tr("credit.mine")}>
        {list.loading ? (
          <LoadingState />
        ) : list.error || !list.data ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : !list.data.length ? (
          <EmptyState title={tr("credit.none")} />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {list.data.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white/90">
                      {r.farmer_name ?? r.phone}
                    </p>
                    <p className="text-theme-xs text-gray-500">
                      {r.purpose} · {formatDateTime(r.requested_at)}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    <Badge size="sm" color={STATUS[r.status].color}>
                      {tr(STATUS[r.status].label)}
                    </Badge>
                    {r.status === "approved" && (
                      <Button
                        size="xs"
                        variant="outline"
                        startIcon={<FileSearch className="size-3.5" />}
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                      >
                        {tr(openId === r.id ? "credit.hide" : "credit.open")}
                      </Button>
                    )}
                  </span>
                </div>
                {openId === r.id && <ReportView id={r.id} />}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-theme-xs text-gray-500">{tr("credit.privacy")}</p>
      </Card>
    </>
  );
}

function ReportView({ id }: { id: number }) {
  const rep = useAsync(() => api.creditReport(id), [id]);
  if (rep.loading) return <LoadingState />;
  if (rep.error || !rep.data)
    return <ErrorState message={rep.error} onRetry={rep.reload} />;
  const r: CreditReport = rep.data;
  return (
    <div className="mt-3 space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-theme-sm text-gray-600 dark:text-gray-300">
          {r.farmer.name} · {r.farmer.phone} · {[r.farmer.woreda, r.farmer.zone, r.farmer.region].filter(Boolean).join(", ")}
        </p>
        <p className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {tr("credit.score", { score: r.score })}
        </p>
      </div>
      <p className="text-theme-sm text-gray-600 dark:text-gray-300">
        {tr("credit.farms", {
          count: r.farms.count,
          area: r.farms.area_ha,
          crops: r.farms.crops.join(", ") || "—",
        })}
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FactorList title={tr("fin.helping")} factors={r.positive_factors} positive />
        <FactorList title={tr("fin.holdingBack")} factors={r.risk_factors} />
      </div>
      <p className="text-theme-xs text-gray-500">
        {tr("credit.validUntil", { date: formatFullDate(r.valid_until) })} · {tr("credit.method")}
      </p>
    </div>
  );
}
