import { api, partnerLogoSrc } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import type { WebsitePartner } from "@/types/feedback";
import { cn } from "@/utils";
import { ArrowDown, ArrowUp, Handshake } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

const LOGO_TYPES = "image/png,image/jpeg,image/webp";

/** Admin: the partners and logos on the public website ("We have worked with"). */
export default function WebsitePartners() {
  const list = useAsync(() => api.adminPartners(), []);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function move(index: number, by: -1 | 1) {
    const ids = (list.data ?? []).map((p) => p.id);
    const j = index + by;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    void run(() => api.reorderPartners(ids));
  }

  return (
    <>
      <PageMeta title={`${tr("nav.websitePartners")} | ${tr("app.name")}`} description={tr("wp.description")} />
      <PageHeader title={tr("nav.websitePartners")} description={tr("wp.description")} />
      <AddPartner onAdded={list.reload} />
      {error && <Alert className="mb-4" variant="error" message={error} />}
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <Card>
          <EmptyState icon={<Handshake className="size-6" />} title={tr("wp.none")} />
        </Card>
      ) : (
        <ul className="space-y-3">
          {list.data.map((p, i) => (
            <PartnerRow
              key={p.id}
              partner={p}
              first={i === 0}
              last={i === list.data!.length - 1}
              onMove={(by) => move(i, by)}
              run={run}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function AddPartner({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createPartner(name.trim(), logo);
      setName("");
      setLogo(null);
      if (fileRef.current) fileRef.current.value = "";
      onAdded();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-6" title={tr("wp.add")}>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <Label htmlFor="wp-name">{tr("wp.name")}</Label>
          <Input id="wp-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="wp-logo">{tr("wp.logo")}</Label>
          <input
            id="wp-logo"
            ref={fileRef}
            type="file"
            accept={LOGO_TYPES}
            onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2.5 file:font-medium file:text-brand-700 dark:text-gray-300"
          />
        </div>
        <Button type="submit" disabled={busy || !name.trim()}>
          {tr("wp.add")}
        </Button>
      </form>
      <p className="mt-2 text-theme-xs text-gray-500">{tr("wp.logoHint")}</p>
      {error && <Alert className="mt-3" variant="error" message={error} />}
    </Card>
  );
}

function PartnerRow({ partner, first, last, onMove, run }: {
  partner: WebsitePartner;
  first: boolean;
  last: boolean;
  onMove: (by: -1 | 1) => void;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(partner.name);
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <li className={cn("rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]", !partner.active && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-40 shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-2 dark:border-gray-700">
          {partner.logo_url ? (
            <img src={partnerLogoSrc(partner.logo_url)} alt={partner.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-center text-theme-xs text-gray-500">{tr("wp.noLogo")}</span>
          )}
        </div>
        <div className="flex min-w-48 flex-1 items-center gap-2">
          <Input aria-label={tr("wp.name")} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          {name.trim() !== partner.name && (
            <Button size="sm" disabled={!name.trim()} onClick={() => run(() => api.updatePartner(partner.id, { name: name.trim() }))}>
              {tr("wp.save")}
            </Button>
          )}
        </div>
        {!partner.active && <Badge size="sm" color="light">{tr("wp.hidden")}</Badge>}
        <div className="flex items-center gap-1">
          <Button size="xs" variant="ghost" disabled={first} aria-label={tr("wp.moveUp")} onClick={() => onMove(-1)}>
            <ArrowUp className="size-4" />
          </Button>
          <Button size="xs" variant="ghost" disabled={last} aria-label={tr("wp.moveDown")} onClick={() => onMove(1)}>
            <ArrowDown className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={LOGO_TYPES}
          className="hidden"
          aria-label={partner.logo_url ? tr("wp.replace") : tr("wp.upload")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void run(() => api.setPartnerLogo(partner.id, file));
          }}
        />
        <Button size="xs" variant="outline" onClick={() => fileRef.current?.click()}>
          {partner.logo_url ? tr("wp.replace") : tr("wp.upload")}
        </Button>
        {partner.logo_url && (
          <Button size="xs" variant="ghost" onClick={() => run(() => api.removePartnerLogo(partner.id))}>
            {tr("wp.removeLogo")}
          </Button>
        )}
        <Button size="xs" variant="outline" onClick={() => run(() => api.updatePartner(partner.id, { active: !partner.active }))}>
          {partner.active ? tr("wp.hide") : tr("wp.show")}
        </Button>
        <Button size="xs" variant="danger" onClick={() => setConfirming(true)}>
          {tr("wp.delete")}
        </Button>
      </div>
      <ConfirmDialog
        isOpen={confirming}
        title={tr("wp.delete")}
        message={tr("wp.deleteConfirm", { name: partner.name })}
        confirmLabel={tr("wp.delete")}
        destructive
        onConfirm={() => {
          setConfirming(false);
          void run(() => api.deletePartner(partner.id));
        }}
        onClose={() => setConfirming(false)}
      />
    </li>
  );
}
