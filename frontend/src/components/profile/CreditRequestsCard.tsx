import { api } from "@/api/client";
import Card from "@/components/common/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import { formatFullDate } from "@/utils/formatters";
import { Landmark } from "lucide-react";

/** Banks / MFIs that asked to see the farmer's credit profile: approve (30 days), decline, or withdraw. */
export default function CreditRequestsCard() {
  const list = useAsync(() => api.myCreditRequests(), []);
  if (!list.data?.length) return null;

  async function decide(id: number, decision: "approve" | "decline" | "revoke") {
    await api.decideCreditRequest(id, decision);
    list.reload();
  }

  return (
    <Card
      accent="amber"
      icon={<Landmark className="size-5" />}
      title={tr("creditInv.title")}
      description={tr("creditInv.hint")}
    >
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {list.data.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-800 dark:text-white/90">{r.lender}</p>
              <p className="text-theme-xs text-gray-500">{r.purpose}</p>
            </div>
            {r.status === "pending" ? (
              <span className="flex gap-2">
                <Button size="sm" onClick={() => decide(r.id, "approve")}>
                  {tr("creditInv.approve")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => decide(r.id, "decline")}>
                  {tr("abcInv.decline")}
                </Button>
              </span>
            ) : r.status === "approved" ? (
              <span className="flex items-center gap-2">
                <Badge size="sm" color="success">
                  {tr("creditInv.sharedUntil", { date: formatFullDate(r.expires_at) })}
                </Badge>
                <Button size="xs" variant="ghost" onClick={() => decide(r.id, "revoke")}>
                  {tr("creditInv.revoke")}
                </Button>
              </span>
            ) : (
              <Badge size="sm" color="light">
                {tr(`credit.status.${r.status}` as MessageKey)}
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
