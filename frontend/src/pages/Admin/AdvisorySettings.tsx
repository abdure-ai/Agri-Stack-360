import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { ErrorState, LoadingState } from "@/components/common/States";
import Switch from "@/components/form/switch/Switch";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import type { AdvisorySetting } from "@/types/api";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

const label = (key: string) => tr(`settings.${key}` as MessageKey);
const hint = (key: string) => tr(`settings.${key}.hint` as MessageKey);

/** Advisory thresholds (advisory_settings): photo-check confidence, outbreak alerts, alert limits, dose policy. */
export default function AdvisorySettings() {
  const settings = useAsync(() => api.advisorySettings(), []);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      <PageMeta title={`${tr("nav.advisorySettings")} | ${tr("app.name")}`} description={tr("settings.description")} />
      <PageHeader title={tr("nav.advisorySettings")} description={tr("settings.description")} />
      <Alert className="mb-4" variant="info" message={tr("settings.note")} />
      {notice && <Alert className="mb-4" variant="success" message={notice} />}
      <Card accent="violet" icon={<SlidersHorizontal className="size-5" />} title={tr("nav.advisorySettings")}>
        {settings.loading ? (
          <LoadingState />
        ) : settings.error ? (
          <ErrorState message={settings.error} onRetry={settings.reload} />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {(settings.data ?? [])
              .filter((s) => s.type !== "text")
              .map((s) => (
                <SettingRow
                  key={s.key}
                  setting={s}
                  onSaved={(updated) => {
                    settings.setData((list) => list?.map((x) => (x.key === updated.key ? updated : x)) ?? null);
                    setNotice(tr("settings.saved", { name: label(updated.key) }));
                  }}
                />
              ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function SettingRow({ setting, onSaved }: { setting: AdvisorySetting; onSaved: (s: AdvisorySetting) => void }) {
  const [value, setValue] = useState(setting.value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string) {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateAdvisorySetting(setting.key, next);
      setValue(updated.value);
      onSaved(updated);
    } catch (err) {
      setError(errorMessage(err));
      setValue(setting.value);
    } finally {
      setBusy(false);
    }
  }

  const fmt = (v: string | null) => (setting.type === "bool" ? tr(v === "1" ? "settings.on" : "settings.off") : (v ?? "—"));

  return (
    <li className="grid grid-cols-1 gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="font-medium text-gray-800 dark:text-white/90">{label(setting.key)}</p>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">{hint(setting.key)}</p>
        <p className="mt-1 text-theme-xs text-gray-400">
          {setting.type !== "bool" && setting.min != null && setting.max != null && (
            <>{tr("settings.allowed", { min: setting.min, max: setting.max })} · </>
          )}
          {tr("settings.default", { value: fmt(setting.default) })}
        </p>
        {error && <p className="mt-1 text-theme-sm text-error-600 dark:text-error-500">{error}</p>}
      </div>
      {setting.type === "bool" ? (
        <Switch checked={value === "1"} disabled={busy} onChange={(on) => save(on ? "1" : "0")} label={fmt(value)} />
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-28">
            <Input
              type="number"
              aria-label={label(setting.key)}
              value={value}
              min={setting.min ?? undefined}
              max={setting.max ?? undefined}
              step={setting.type === "int" ? 1 : 0.05}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <Button size="sm" loading={busy} disabled={value === setting.value || value === ""} onClick={() => save(value)}>
            {tr("settings.save")}
          </Button>
        </div>
      )}
    </li>
  );
}
