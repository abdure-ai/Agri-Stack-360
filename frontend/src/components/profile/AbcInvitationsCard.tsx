import { api } from "@/api/client";
import Card from "@/components/common/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import { Handshake } from "lucide-react";

/** The farmer's ABC memberships: accept an invitation (shares plots and crop seasons with the ABC), or leave. */
export default function AbcInvitationsCard() {
  const list = useAsync(() => api.myAbcInvitations(), []);
  if (!list.data?.length) return null;

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
          </li>
        ))}
      </ul>
    </Card>
  );
}
