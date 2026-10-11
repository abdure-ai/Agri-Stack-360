import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Input from "@/components/form/input/InputField";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useAsync } from "@/hooks/useAsync";
import type { PermissionInfo, Role } from "@/types/api";
import { cn } from "@/utils";
import { ACCENTS, AREA_ACCENTS, ROLE_ACCENTS } from "@/utils/accents";
import { tr } from "@/i18n/core";
import { permArea, permDescription, permLabel, roleLabel, ROLES } from "@/utils/constants";
import { Check, KeyRound, Landmark, Sprout, TrendingUp, type LucideIcon } from "lucide-react";
import { useState } from "react";

const TH = "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300";

const AREA_ICONS: Record<string, LucideIcon> = {
  "Market & advice": TrendingUp,
  "Farms & crop health": Sprout,
  "Inputs & finance": Landmark,
  Administration: KeyRound,
};

export default function Permissions() {
  const permissions = useAsync(() => api.adminPermissions(), []);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const rows = (permissions.data ?? []).filter(
    (p) =>
      !q ||
      [p.label, p.description, p.name, p.area, permLabel(p.name, p.label), permDescription(p.name, p.description)].some((t) =>
        t.toLowerCase().includes(q),
      ),
  );
  const areas = [...new Set(rows.map((p) => p.area))];

  return (
    <>
      <PageMeta title={`${tr("nav.permissions")} | ${tr("app.name")}`} description={tr("perms.meta")} />
      <PageHeader
        title={tr("nav.permissions")}
        description={tr("perms.description")}
        actions={
          <div className="w-64">
            <Input placeholder={tr("perms.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      />

      {permissions.loading ? (
        <Card>
          <LoadingState label={tr("perms.loading")} />
        </Card>
      ) : permissions.error || !permissions.data ? (
        <Card>
          <ErrorState message={permissions.error} onRetry={permissions.reload} />
        </Card>
      ) : !rows.length ? (
        <Card>
          <EmptyState title={tr("perms.noMatch")} description={tr("perms.noMatchHint")} />
        </Card>
      ) : (
        <div className="space-y-6">
          <RoleLegend permissions={permissions.data} />
          {areas.map((area) => (
            <AreaCard key={area} area={area} permissions={rows.filter((p) => p.area === area)} />
          ))}
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {tr("perms.footer")} <code className="font-mono">backend/permissions.py</code>
          </p>
        </div>
      )}
    </>
  );
}

/** One coloured chip per role with how many permissions it holds. */
function RoleLegend({ permissions }: { permissions: PermissionInfo[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {ROLES.map((role) => {
        const a = ACCENTS[ROLE_ACCENTS[role] ?? "green"];
        const count = permissions.filter((p) => p.roles.includes(role)).length;
        return (
          <div key={role} className={cn("relative overflow-hidden rounded-xl border p-4", a.border, a.surface)}>
            <span className={cn("absolute inset-x-0 top-0 h-1", a.bar)} aria-hidden="true" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{roleLabel(role)}</p>
            <p className={cn("mt-1 text-2xl font-bold", a.text)}>
              {count}
              <span className="text-sm font-medium text-gray-400"> / {permissions.length}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

function AreaCard({ area, permissions }: { area: string; permissions: PermissionInfo[] }) {
  const Icon = AREA_ICONS[area] ?? KeyRound;
  return (
    <Card
      accent={AREA_ACCENTS[area] ?? "blue"}
      icon={<Icon className="size-5" />}
      title={permArea(area)}
      description={tr(permissions.length === 1 ? "perms.count1" : "perms.countN", { n: permissions.length })}
      bodyClassName="px-0 sm:px-0 pb-2"
    >
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${TH} ps-5 sm:ps-6`}>
                {tr("perms.permission")}
              </TableCell>
              {ROLES.map((role) => (
                <TableCell key={role} isHeader className={`${TH} w-32 text-center`}>
                  {roleLabel(role)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {permissions.map((p) => (
              <TableRow key={p.name}>
                <TableCell className={`${TD} ps-5 sm:ps-6`}>
                  <p className="font-medium text-gray-800 dark:text-white/90">{permLabel(p.name, p.label)}</p>
                  <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{permDescription(p.name, p.description)}</p>
                  <code className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-theme-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
                    {p.name}
                  </code>
                </TableCell>
                {ROLES.map((role) => (
                  <TableCell key={role} className={`${TD} text-center`}>
                    <RoleCell role={role} allowed={p.roles.includes(role)} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function RoleCell({ role, allowed }: { role: Role; allowed: boolean }) {
  if (!allowed) {
    return (
      <span className="text-gray-300 dark:text-gray-700" aria-label={tr("perms.notAllowed", { role: roleLabel(role) })}>
        —
      </span>
    );
  }
  const a = ACCENTS[ROLE_ACCENTS[role] ?? "green"];
  return (
    <span
      className={cn("mx-auto flex size-7 items-center justify-center rounded-full", a.tile)}
      aria-label={tr("perms.allowed", { role: roleLabel(role) })}
    >
      <Check className="size-4" strokeWidth={3} />
    </span>
  );
}
