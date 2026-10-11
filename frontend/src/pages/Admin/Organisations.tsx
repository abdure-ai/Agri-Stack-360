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
import Switch from "@/components/form/switch/Switch";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import type { Organisation, OrgType } from "@/types/api";
import { Building2, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

// Organisation types that can be created today (each needs its matching user role).
const ORG_TYPES: OrgType[] = ["supplier", "agro_dealer", "abc", "commercial_farm", "ngo"];

/** Admin: organisations (suppliers, agro-dealer shops) and their users (users need the matching role first). */
export default function Organisations() {
  const orgs = useAsync(() => api.adminOrgs(), []);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<OrgType>("supplier");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.adminCreateOrg(name.trim(), note.trim(), type);
      setName("");
      setNote("");
      orgs.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageMeta
        title={`${tr("nav.orgs")} | ${tr("app.name")}`}
        description={tr("orgs.description")}
      />
      <PageHeader title={tr("nav.orgs")} description={tr("orgs.description")} />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-4">
          <Card
            accent="teal"
            icon={<Plus className="size-5" />}
            title={tr("orgs.new")}
          >
            <form onSubmit={create} noValidate className="space-y-4">
              {error && <Alert variant="error" message={error} />}
              <div>
                <Label htmlFor="org-type">{tr("orgs.type")}</Label>
                <Select
                  id="org-type"
                  options={ORG_TYPES.map((t) => ({
                    value: t,
                    label: tr(`orgs.type.${t}` as MessageKey),
                  }))}
                  value={type}
                  onChange={(v) => setType(v as OrgType)}
                />
              </div>
              <div>
                <Label htmlFor="org-name">{tr("orgs.name")}</Label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="org-note">{tr("orgs.note")}</Label>
                <Input
                  id="org-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                loading={busy}
                disabled={name.trim().length < 2}
              >
                {tr("orgs.create")}
              </Button>
            </form>
          </Card>
        </div>
        <div className="col-span-12 space-y-4 xl:col-span-8">
          {orgs.loading ? (
            <LoadingState />
          ) : orgs.error ? (
            <ErrorState message={orgs.error} onRetry={orgs.reload} />
          ) : !orgs.data?.length ? (
            <Card>
              <EmptyState title={tr("orgs.none")} />
            </Card>
          ) : (
            orgs.data.map((o) => (
              <OrgCard key={o.id} org={o} onChanged={orgs.reload} />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function OrgCard({
  org,
  onChanged,
}: {
  org: Organisation;
  onChanged: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"owner" | "staff">("staff");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      icon={<Building2 className="size-5" />}
      accent={org.status === "active" ? "blue" : "rose"}
      title={org.name}
      description={[
        tr(`orgs.type.${org.type}` as MessageKey),
        org.woreda,
        org.note,
        org.type === "supplier"
          ? tr("orgs.batchesCount", { n: org.batches ?? 0 })
          : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {org.type === "agro_dealer" && (
            <Switch
              checked={!!org.verified}
              disabled={busy}
              onChange={(v) =>
                run(() => api.adminUpdateOrg(org.id, { verified: v }))
              }
              label={tr("shops.badge")}
            />
          )}
          <Badge
            size="sm"
            color={org.status === "active" ? "success" : "error"}
          >
            {org.status === "active"
              ? tr("supplier.active")
              : tr("orgs.suspended")}
          </Badge>
          <Button
            size="xs"
            variant={org.status === "active" ? "danger" : "outline"}
            disabled={busy}
            onClick={() =>
              run(() =>
                api.adminUpdateOrg(org.id, {
                  status: org.status === "active" ? "suspended" : "active",
                }),
              )
            }
          >
            {org.status === "active" ? tr("orgs.suspend") : tr("orgs.activate")}
          </Button>
        </div>
      }
    >
      {error && <Alert className="mb-3" variant="error" message={error} />}
      <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
        {tr("orgs.members")}
      </h4>
      <ul className="mb-4 divide-y divide-gray-100 dark:divide-gray-800">
        {(org.member_list ?? []).map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-2 py-2 text-theme-sm"
          >
            <span className="text-gray-800 dark:text-white/90">
              {m.name} <span className="text-gray-500">· {m.phone}</span>
            </span>
            <span className="flex items-center gap-2">
              <Badge
                size="sm"
                color={m.member_role === "owner" ? "primary" : "light"}
              >
                {tr(m.member_role === "owner" ? "orgs.owner" : "orgs.staff")}
              </Badge>
              <Button
                size="xs"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  run(() => api.adminRemoveOrgMember(org.id, m.id))
                }
              >
                {tr("supplier.remove")}
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api.adminAddOrgMember(org.id, phone.trim(), role);
            setPhone("");
          });
        }}
      >
        <div className="w-48">
          <Label htmlFor={`om-phone-${org.id}`}>{tr("orgs.phone")}</Label>
          <Input
            id={`om-phone-${org.id}`}
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="w-32">
          <Select
            aria-label={tr("orgs.members")}
            options={[
              { value: "staff", label: tr("orgs.staff") },
              { value: "owner", label: tr("orgs.owner") },
            ]}
            value={role}
            onChange={(v) => setRole(v as "owner" | "staff")}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={busy || phone.trim().length < 9}
        >
          {tr("orgs.addMember")}
        </Button>
      </form>
    </Card>
  );
}
