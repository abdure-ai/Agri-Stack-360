import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/States";
import AreaPicker, {
  EMPTY_AREA,
  type AreaValue,
} from "@/components/form/AreaPicker";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAdminOrg } from "@/hooks/useAdminOrg";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import type { NgoProject } from "@/types/api";
import { formatFullDate, todayISO } from "@/utils/formatters";
import { Download, FolderKanban, Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(url);
}

const FIGURES: { key: string; label: MessageKey }[] = [
  { key: "farmers", label: "reports.farmers" },
  { key: "farmers_reached", label: "reports.reached" },
  { key: "questions", label: "reports.questions" },
  { key: "photo_checks", label: "reports.photoChecks" },
  { key: "outcome_improved", label: "ngo.improved" },
  { key: "outbreak_alerts", label: "reports.outbreakAlerts" },
];

/** NGO / development project workspace: projects, their woredas, advisory messages and aggregated impact. */
export default function NgoPortal() {
  const scope = useAdminOrg("ngo");
  if (!scope.gate) return <Ngo key={scope.orgId ?? "mine"} orgId={scope.orgId} picker={scope.picker} />;
  return (
    <>
      <PageMeta title={`${tr("nav.ngo")} | ${tr("app.name")}`} description={tr("ngo.description")} />
      <PageHeader title={tr("nav.ngo")} description={tr("ngo.description")} actions={scope.picker} />
      {scope.gate}
    </>
  );
}

function Ngo({ orgId, picker }: { orgId: number | null; picker?: ReactNode }) {
  const data = useAsync(() => api.ngoProjects(orgId), [orgId]);
  const [name, setName] = useState("");
  const [start, setStart] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.ngoCreateProject(orgId, { name: name.trim(), start_date: start });
      setName("");
      data.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageMeta
        title={`${tr("nav.ngo")} | ${tr("app.name")}`}
        description={tr("ngo.description")}
      />
      <PageHeader
        title={data.data?.org.name ?? tr("nav.ngo")}
        description={tr("ngo.description")}
        actions={picker}
      />
      <Card
        className="mb-4"
        accent="teal"
        icon={<Plus className="size-5" />}
        title={tr("ngo.new")}
      >
        <form
          onSubmit={create}
          noValidate
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-0 flex-1">
            <Label htmlFor="ngo-name">{tr("orgs.name")}</Label>
            <Input
              id="ngo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Label htmlFor="ngo-start">{tr("ngo.start")}</Label>
            <Input
              id="ngo-start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={name.trim().length < 2}>
            {tr("orgs.create")}
          </Button>
        </form>
        {error && <Alert className="mt-3" variant="error" message={error} />}
      </Card>
      {data.loading ? (
        <LoadingState />
      ) : data.error || !data.data ? (
        <ErrorState message={data.error} onRetry={data.reload} />
      ) : !data.data.projects.length ? (
        <Card>
          <EmptyState title={tr("ngo.none")} />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.data.projects.map((p) => (
            <ProjectCard key={p.id} orgId={orgId} project={p} onChanged={data.reload} />
          ))}
        </div>
      )}
    </>
  );
}

function ProjectCard({
  orgId,
  project,
  onChanged,
}: {
  orgId: number | null;
  project: NgoProject;
  onChanged: () => void;
}) {
  const impact = useAsync(
    () => api.ngoImpact(orgId, project.id),
    [project.id, project.areas.length],
  );
  const [area, setArea] = useState<AreaValue>(EMPTY_AREA);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(
    action: () => Promise<unknown>,
    ok?: (r: unknown) => string,
  ) {
    setMsg(null);
    try {
      const r = await action();
      if (ok) setMsg({ ok: true, text: ok(r) });
      onChanged();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  }

  const t = impact.data?.summary?.totals as
    Record<string, number | string> | undefined;
  return (
    <Card
      accent="violet"
      icon={<FolderKanban className="size-5" />}
      title={project.name}
      description={tr("ngo.since", {
        date: formatFullDate(project.start_date),
      })}
      actions={
        <span className="flex items-center gap-2">
          <Badge
            size="sm"
            color={project.status === "active" ? "success" : "light"}
          >
            {tr(project.status === "active" ? "buy.open" : "buy.closed")}
          </Badge>
          <Button
            size="xs"
            variant="outline"
            startIcon={<Download className="size-3.5" />}
            onClick={async () =>
              saveBlob(
                await api.ngoImpactCsv(orgId, project.id),
                `impact-project-${project.id}.csv`,
              )
            }
          >
            {tr("reports.export")}
          </Button>
        </span>
      }
    >
      {msg && (
        <Alert
          className="mb-3"
          variant={msg.ok ? "success" : "error"}
          message={msg.text}
        />
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
              {tr("ngo.areas")}
            </h4>
            <div className="mb-2 flex flex-wrap gap-2">
              {project.areas.length ? (
                project.areas.map((a) => (
                  <span
                    key={a.woreda_pcode}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-theme-xs dark:bg-white/5"
                  >
                    {a.woreda}
                    <button
                      type="button"
                      aria-label={tr("supplier.remove")}
                      className="text-gray-400 hover:text-error-600"
                      onClick={() =>
                        run(() => api.ngoRemoveArea(orgId, project.id, a.woreda_pcode))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-theme-sm text-gray-500">
                  {tr("ngo.noAreas")}
                </span>
              )}
            </div>
            <AreaPicker
              idPrefix={`ngo-${project.id}`}
              value={area}
              onChange={setArea}
            />
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              disabled={!area.woreda_pcode}
              onClick={() =>
                run(async () => {
                  await api.ngoAddArea(orgId, project.id, area.woreda_pcode);
                  setArea(EMPTY_AREA);
                })
              }
            >
              {tr("ngo.addArea")}
            </Button>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
              {tr("ngo.message")}
            </h4>
            <TextArea
              rows={2}
              value={text}
              onChange={setText}
              placeholder=""
              hint={tr("ngo.messageHint")}
            />
            <Button
              className="mt-2"
              size="sm"
              disabled={text.trim().length < 3 || !project.areas.length}
              onClick={() =>
                run(
                  async () => {
                    const r = await api.ngoBroadcast(orgId, project.id, text.trim());
                    setText("");
                    return r;
                  },
                  (r) =>
                    tr("ngo.sent", {
                      sent: String((r as { sent: number | string }).sent),
                      total: String(
                        (r as { farmers_in_area: number | string })
                          .farmers_in_area,
                      ),
                    }),
                )
              }
            >
              {tr("abc.send")}
            </Button>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
            {tr("ngo.impact")}
          </h4>
          {impact.loading ? (
            <LoadingState />
          ) : !t ? (
            <p className="text-theme-sm text-gray-500">{tr("ngo.noAreas")}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {FIGURES.map((f) => (
                  <div
                    key={f.key}
                    className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
                  >
                    <p className="text-theme-xs text-gray-500">{tr(f.label)}</p>
                    <p className="text-xl font-semibold text-gray-800 dark:text-white/90">
                      {String(t[f.key] ?? "—")}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-theme-xs text-gray-500">
                {tr("reports.suppressedNote")}
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
