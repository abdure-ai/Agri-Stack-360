import { api } from "@/api/client";
import Card from "@/components/common/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import Alert from "@/components/ui/alert/Alert";
import { useState } from "react";
import { tr } from "@/i18n/core";
import { Link } from "react-router";
import { Handshake } from "lucide-react";

/** The farmer's ABC memberships: accept an invitation (shares plots and crop seasons with the ABC), or leave. */
export default function AbcInvitationsCard() {
  const list = useAsync(() => api.myAbcInvitations(), []);
  const memberships = useAsync(() => api.myAbcMemberships(), []);

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
              <Link to="/my-abc" className="w-full text-theme-xs font-medium text-brand-600">{tr("abcInv.openMyAbc")}</Link>
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
