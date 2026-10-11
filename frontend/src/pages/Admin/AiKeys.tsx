import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import StatCard from "@/components/common/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import type { AiKey, AiKeyStatus } from "@/types/api";
import { formatDateTime } from "@/utils/formatters";
import { ArrowDown, ArrowUp, CircleCheck, Clock, KeySquare, Plus, RotateCcw, Trash2, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";

const TH = "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3.5 text-theme-sm text-gray-600 dark:text-gray-400";

const STATUS: Record<AiKeyStatus, { color: "success" | "warning" | "error" | "light" | "info"; label: MessageKey }> = {
  unknown: { color: "light", label: "aikeys.status.unknown" },
  ok: { color: "success", label: "aikeys.status.ok" },
  quota: { color: "warning", label: "aikeys.status.quota" },
  rate_limited: { color: "info", label: "aikeys.status.rateLimited" },
  invalid: { color: "error", label: "aikeys.status.invalid" },
  error: { color: "error", label: "aikeys.status.error" },
};

/** A key is cooling down while its cooldown time is in the future. */
function coolingUntil(until: string | null | undefined): string | null {
  return until && new Date(until).getTime() > Date.now() ? until : null;
}

function StatusBadge({ status, until, enabled = true }: { status: AiKeyStatus; until?: string | null; enabled?: boolean }) {
  if (!enabled) {
    return (
      <Badge size="sm" color="light">
        {tr("aikeys.status.disabled")}
      </Badge>
    );
  }
  const s = STATUS[status] ?? STATUS.unknown;
  const cool = coolingUntil(until);
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge size="sm" color={s.color}>
        {tr(s.label)}
      </Badge>
      {cool && (
        <span className="inline-flex items-center gap-1 text-theme-xs text-gray-500">
          <Clock className="size-3" /> {tr("aikeys.until", { date: formatDateTime(cool) })}
        </span>
      )}
    </div>
  );
}

export default function AiKeys() {
  const data = useAsync(() => api.aiKeys(), []);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ variant: "success" | "error" | "warning"; message: string } | null>(null);
  const [deleting, setDeleting] = useState<AiKey | null>(null);

  const keys = data.data?.keys ?? [];
  const env = data.data?.env_key;

  async function run(tag: string, fn: () => Promise<unknown>, success?: string) {
    setBusy(tag);
    setNotice(null);
    try {
      await fn();
      if (success) setNotice({ variant: "success", message: success });
      data.reload();
    } catch (e) {
      setNotice({ variant: "error", message: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  async function test(k: AiKey) {
    setBusy(`test-${k.id}`);
    setNotice(null);
    try {
      const r = await api.aiKeyTest(k.id);
      setNotice(
        r.ok
          ? { variant: "success", message: tr("aikeys.testOk", { label: k.label }) }
          : { variant: "warning", message: tr("aikeys.testFailed", { label: k.label, message: r.message ?? r.status }) },
      );
      data.reload();
    } catch (e) {
      setNotice({ variant: "error", message: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  /** Swap priorities with the neighbour above/below. */
  function move(index: number, dir: -1 | 1) {
    const a = keys[index];
    const b = keys[index + dir];
    if (!a || !b) return;
    const pa = a.priority === b.priority ? b.priority + (dir === -1 ? 1 : -1) : b.priority;
    void run(`move-${a.id}`, async () => {
      await api.aiKeyUpdate(a.id, { priority: Math.max(0, pa) });
      await api.aiKeyUpdate(b.id, { priority: a.priority });
    });
  }

  return (
    <>
      <PageMeta title={`${tr("nav.aiKeys")} | ${tr("app.name")}`} description={tr("aikeys.meta")} />
      <PageHeader
        title={tr("nav.aiKeys")}
        description={tr("aikeys.description")}
        actions={
          <Button size="sm" onClick={() => setAdding(true)} startIcon={<Plus className="size-4" />}>
            {tr("aikeys.add")}
          </Button>
        }
      />

      {notice && <Alert className="mb-6" variant={notice.variant} message={notice.message} />}

      {data.loading && !data.data ? (
        <Card>
          <LoadingState />
        </Card>
      ) : data.error ? (
        <Card>
          <ErrorState message={data.error} onRetry={data.reload} />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
            <StatCard
              label={tr("aikeys.usableNow")}
              value={String(data.data?.usable_now ?? 0)}
              icon={<CircleCheck className="size-6" />}
              accent={data.data?.usable_now ? "green" : "rose"}
              tone={data.data?.usable_now ? "success" : "error"}
            />
            <StatCard
              label={tr("aikeys.nextFree")}
              value={data.data?.next_available_at ? formatDateTime(data.data.next_available_at) : "—"}
              icon={<Clock className="size-6" />}
              accent="amber"
            />
            <StatCard label={tr("aikeys.model")} value={data.data?.model ?? "—"} icon={<Zap className="size-6" />} accent="violet" />
          </div>

          {data.data && !data.data.usable_now && (
            <Alert variant="error" title={tr("aikeys.noneUsable")} message={tr("aikeys.noneUsableHint")} />
          )}

          <Card
            title={tr("aikeys.keys")}
            description={tr("aikeys.keysHint")}
            icon={<KeySquare className="size-5" />}
            accent="violet"
            bodyClassName="p-0 sm:p-0"
          >
            {!keys.length ? (
              <EmptyState
                icon={<KeySquare className="size-6" />}
                title={tr("aikeys.none")}
                description={tr("aikeys.noneHint")}
                action={<Button onClick={() => setAdding(true)}>{tr("aikeys.add")}</Button>}
              />
            ) : (
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                    <TableRow>
                      <TableCell isHeader className={`${TH} ps-5 sm:ps-6`}>{tr("aikeys.order")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("aikeys.label")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("common.status")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("aikeys.usesToday")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("aikeys.lastUsed")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("aikeys.enabled")}</TableCell>
                      <TableCell isHeader className={`${TH} pe-5 text-end sm:pe-6`}>{tr("common.actions")}</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {keys.map((k, i) => (
                      <TableRow key={k.id} className={k.enabled ? "" : "opacity-60"}>
                        <TableCell className={`${TD} ps-5 sm:ps-6`}>
                          <div className="flex items-center gap-1">
                            <span className="w-5 font-semibold text-gray-800 dark:text-white/90">{i + 1}</span>
                            <button
                              type="button"
                              aria-label={tr("aikeys.moveUp")}
                              disabled={i === 0 || !!busy}
                              onClick={() => move(i, -1)}
                              className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                            >
                              <ArrowUp className="size-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={tr("aikeys.moveDown")}
                              disabled={i === keys.length - 1 || !!busy}
                              onClick={() => move(i, 1)}
                              className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                            >
                              <ArrowDown className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className={TD}>
                          <p className="font-medium text-gray-800 dark:text-white/90">{k.label}</p>
                          <p className="font-mono text-theme-xs text-gray-500">•••• {k.key_last4}</p>
                        </TableCell>
                        <TableCell className={TD}>
                          <StatusBadge status={k.status} until={k.cooldown_until} enabled={k.enabled} />
                          {k.last_error && k.status !== "ok" && (
                            <p className="mt-1 max-w-xs truncate text-theme-xs text-gray-400" title={k.last_error}>
                              {k.last_error}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className={TD}>{k.uses_today}</TableCell>
                        <TableCell className={`${TD} whitespace-nowrap`}>{formatDateTime(k.last_used_at)}</TableCell>
                        <TableCell className={TD}>
                          <Switch
                            checked={k.enabled}
                            disabled={!!busy}
                            onChange={(on) => void run(`enable-${k.id}`, () => api.aiKeyUpdate(k.id, { enabled: on }))}
                          />
                        </TableCell>
                        <TableCell className={`${TD} pe-5 sm:pe-6`}>
                          <div className="flex justify-end gap-1">
                            <Button size="xs" variant="outline" loading={busy === `test-${k.id}`} disabled={!!busy} onClick={() => void test(k)}>
                              {tr("aikeys.test")}
                            </Button>
                            {(k.status !== "ok" && k.status !== "unknown") || coolingUntil(k.cooldown_until) ? (
                              <Button
                                size="xs"
                                variant="ghost"
                                startIcon={<RotateCcw className="size-4" />}
                                disabled={!!busy}
                                onClick={() => void run(`reset-${k.id}`, () => api.aiKeyReset(k.id), tr("aikeys.resetDone", { label: k.label }))}
                              >
                                {tr("aikeys.reset")}
                              </Button>
                            ) : null}
                            <Button size="xs" variant="ghost" aria-label={tr("common.delete")} disabled={!!busy} onClick={() => setDeleting(k)}>
                              <Trash2 className="size-4 text-error-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {env?.configured && (
            <Card title={tr("aikeys.envTitle")} description={tr("aikeys.envHint")} icon={<KeySquare className="size-5" />} accent="amber">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300">GEMINI_API_KEY •••• {env.key_last4}</span>
                  <StatusBadge status={env.status ?? "unknown"} until={env.cooldown_until} />
                </div>
                {coolingUntil(env.cooldown_until) || env.status === "invalid" ? (
                  <Button size="xs" variant="ghost" startIcon={<RotateCcw className="size-4" />} onClick={() => void run("env", () => api.aiKeyResetEnv())}>
                    {tr("aikeys.reset")}
                  </Button>
                ) : null}
              </div>
            </Card>
          )}

          <Alert variant="info" title={tr("aikeys.howTitle")} message={tr("aikeys.howBody")} />
        </div>
      )}

      {adding && (
        <AddKeyModal
          onClose={() => setAdding(false)}
          onAdded={(k) => {
            setAdding(false);
            setNotice({ variant: "success", message: tr("aikeys.added", { label: k.label }) });
            data.reload();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleting}
        title={tr("aikeys.deleteQ")}
        message={deleting ? tr("aikeys.deleteBody", { label: deleting.label, last4: deleting.key_last4 }) : undefined}
        confirmLabel={tr("common.delete")}
        destructive
        busy={busy === "delete"}
        onConfirm={() => {
          const k = deleting;
          setDeleting(null);
          if (k) void run("delete", () => api.aiKeyDelete(k.id), tr("aikeys.deleted", { label: k.label }));
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function AddKeyModal({ onClose, onAdded }: { onClose: () => void; onAdded: (k: AiKey) => void }) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || key.trim().length < 20) {
      setError(tr("aikeys.addInvalid"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onAdded(await api.aiKeyAdd({ label: label.trim(), api_key: key.trim() }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} className="m-4 max-w-[520px]">
      <form onSubmit={submit} className="space-y-4 p-6 sm:p-8">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">{tr("aikeys.addTitle")}</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tr("aikeys.addHint")}</p>
        </div>
        {error && <Alert variant="error" message={error} />}
        <div>
          <Label htmlFor="ak-label">{tr("aikeys.label")}</Label>
          <Input id="ak-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tr("aikeys.labelPlaceholder")} />
        </div>
        <div>
          <Label htmlFor="ak-key">{tr("aikeys.apiKey")}</Label>
          <Input
            id="ak-key"
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIza… / AQ.…"
          />
          <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">{tr("aikeys.storedEncrypted")}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {tr("common.cancel")}
          </Button>
          <Button type="submit" loading={busy}>
            {tr("aikeys.add")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
