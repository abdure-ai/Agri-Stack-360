import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Select from "@/components/form/Select";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import type { OrgType } from "@/types/api";
import { useState, type ReactNode } from "react";

/**
 * Organisation scope for org portals (dealer, ABC, commercial farm, NGO). Members work in their own organisation
 * (orgId = null, the server uses their membership). Admins (orgs:manage) belong to none, so they pick one and every
 * call passes its org_id.
 *   picker - organisation dropdown for the page header (admins only)
 *   gate   - shown instead of the portal while the list loads, or when there is no organisation of this type
 */
export function useAdminOrg(type: OrgType): { isAdmin: boolean; orgId: number | null; picker?: ReactNode; gate: ReactNode | null } {
  const { can } = useAuth();
  const isAdmin = can("orgs:manage");
  const orgs = useAsync(() => (isAdmin ? api.adminOrgs(type) : Promise.resolve([])), [isAdmin, type]);
  const [picked, setPicked] = useState<number | null>(null);
  const orgId = isAdmin ? (picked ?? orgs.data?.[0]?.id ?? null) : null;
  if (!isAdmin) return { isAdmin, orgId: null, gate: null };
  const picker = orgs.data?.length ? (
    <div className="w-64">
      <Select
        aria-label={tr("supplier.chooseOrg")}
        options={orgs.data.map((o) => ({ value: String(o.id), label: o.name }))}
        value={orgId ? String(orgId) : ""}
        onChange={(v) => setPicked(Number(v))}
      />
    </div>
  ) : undefined;
  const gate = orgs.loading ? (
    <LoadingState />
  ) : orgs.error ? (
    <ErrorState message={orgs.error} onRetry={orgs.reload} />
  ) : !orgs.data?.length ? (
    <Card>
      <EmptyState title={tr("orgs.none")} />
    </Card>
  ) : null;
  return { isAdmin, orgId, picker, gate };
}
