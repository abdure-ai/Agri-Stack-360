import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { ErrorState, LoadingState } from "@/components/common/States";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAsync } from "@/hooks/useAsync";
import type { PermissionInfo, Role, RoleInfo } from "@/types/api";
import { cn } from "@/utils";
import { ACCENTS, ROLE_ACCENTS } from "@/utils/accents";
import { tr } from "@/i18n/core";
import { permArea, permLabel, roleDescription, roleLabel } from "@/utils/constants";
import { Banknote, Check, Factory, Handshake, HeartHandshake, Landmark, Microscope, Scale, ShoppingBasket, Tractor, ShieldCheck, Sprout, Stethoscope, Store, Users as UsersIcon, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";

const ROLE_ICONS: Record<Role, LucideIcon> = {
  farmer: Sprout,
  agent: Stethoscope,
  agronomist: Microscope,
  trader: Store,
  government: Landmark,
  supplier: Factory,
  agro_dealer: ShoppingBasket,
  abc_manager: Handshake,
  farm_manager: Tractor,
  regulator: Scale,
  ngo_staff: HeartHandshake,
  lender: Banknote,
  ati_officer: Landmark,
  admin: ShieldCheck,
};

export default function Roles() {
  const roles = useAsync(() => api.adminRoles(), []);
  const permissions = useAsync(() => api.adminPermissions(), []);
  const loading = roles.loading || permissions.loading;
  const error = roles.error || permissions.error;

  return (
    <>
      <PageMeta title={`${tr("nav.roles")} | ${tr("app.name")}`} description={tr("roles.meta")} />
      <PageHeader title={tr("nav.roles")} description={tr("roles.description")} />

      {loading ? (
        <Card>
          <LoadingState label={tr("roles.loading")} />
        </Card>
      ) : error || !roles.data || !permissions.data ? (
        <Card>
          <ErrorState
            message={error}
            onRetry={() => {
              roles.reload();
              permissions.reload();
            }}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <Alert
            variant="info"
            title={tr("roles.howGiven")}
            message={
              <>
                {tr("roles.howGivenBody")}{" "}
                <Link to="/admin/users" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                  {tr("roles.openUsers")}
                </Link>
              </>
            }
          />
          <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
            {roles.data.map((r) => (
              <RoleCard key={r.role} role={r} permissions={permissions.data!} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function RoleCard({ role: r, permissions }: { role: RoleInfo; permissions: PermissionInfo[] }) {
  const navigate = useNavigate();
  const accent = ROLE_ACCENTS[r.role] ?? "green";
  const a = ACCENTS[accent];
  const Icon = ROLE_ICONS[r.role] ?? UsersIcon;
  const granted = permissions.filter((p) => r.permissions.includes(p.name));
  const areas = [...new Set(granted.map((p) => p.area))];

  return (
    <Card
      accent={accent}
      icon={<Icon className="size-5" />}
      className="h-full"
      title={roleLabel(r.role)}
      description={roleDescription(r.role, r.description)}
      actions={
        <Badge size="sm" color={r.self_register ? "success" : "warning"}>
          {tr(r.self_register ? "roles.openSignup" : "roles.byAdmin")}
        </Badge>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className={cn("rounded-xl border p-4", a.border, a.surface)}>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("roles.people")}</p>
            <p className={cn("mt-1 text-2xl font-bold", a.text)}>{r.user_count}</p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("roles.activeCount", { n: r.active_count })}</p>
          </div>
          <div className={cn("rounded-xl border p-4", a.border, a.surface)}>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("nav.permissions")}</p>
            <p className={cn("mt-1 text-2xl font-bold", a.text)}>
              {r.permissions.length}
              <span className="text-sm font-medium text-gray-400"> / {permissions.length}</span>
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("roles.areas", { n: areas.length })}</p>
          </div>
        </div>

        <div className="space-y-4">
          {areas.map((area) => (
            <div key={area}>
              <p className="mb-2 text-theme-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">{permArea(area)}</p>
              <ul className="space-y-1.5">
                {granted
                  .filter((p) => p.area === area)
                  .map((p) => (
                    <li key={p.name} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                      <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", a.tile)}>
                        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                      {permLabel(p.name, p.label)}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Button size="xs" variant="outline" onClick={() => navigate(`/admin/users?role=${r.role}`)}>
            {tr("roles.viewUsers", { role: roleLabel(r.role) })}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => navigate("/admin/permissions")}>
            {tr("roles.compareAll")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
