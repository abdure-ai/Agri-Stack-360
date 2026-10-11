import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import StatCard from "@/components/common/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { LANGUAGE_NAMES as UI_LANGUAGE_NAMES, isLang, tr, trTerm } from "@/i18n/core";
import type { KnowledgeDocument, KnowledgeHit, KnowledgeUploadResult } from "@/types/api";
import { formatDateTime, formatNumber } from "@/utils/formatters";
import { Archive, ArchiveRestore, BookOpenText, FileUp, Layers, RefreshCw, Search, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";

const TH = "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3.5 text-theme-sm text-gray-600 dark:text-gray-400";

const docLanguageName = (code: string | null | undefined) =>
  !code ? "—" : isLang(code) ? UI_LANGUAGE_NAMES[code] : code === "mixed" ? tr("kb.mixed") : code;
const languageOptions = () => [
  { value: "", label: tr("kb.detect") },
  ...["am", "om", "ti", "en", "mixed"].map((code) => ({ value: code, label: docLanguageName(code) })),
];

export default function KnowledgeBase() {
  const docs = useAsync(() => api.knowledgeDocuments(), []);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [notice, setNotice] = useState<{ variant: "success" | "warning" | "error"; message: string } | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const list = docs.data ?? [];
  const active = list.filter((d) => d.status === "active");
  const chunks = active.reduce((n, d) => n + d.chunk_count, 0);
  const embedded = active.reduce((n, d) => n + (d.embedded_count ?? 0), 0);
  const missing = list.reduce((n, d) => n + d.chunk_count - (d.embedded_count ?? 0), 0);

  async function reindex() {
    setReindexing(true);
    setNotice(null);
    try {
      const r = await api.knowledgeReindex();
      setNotice(
        r.warning
          ? { variant: "warning", message: `${tr("kb.embeddedPartial", { n: r.embedded, left: r.remaining })} ${r.warning}` }
          : { variant: "success", message: r.embedded ? tr("kb.embedded", { n: r.embedded }) : tr("kb.allEmbedded") },
      );
      docs.reload();
    } catch (e) {
      setNotice({ variant: "error", message: errorMessage(e) });
    } finally {
      setReindexing(false);
    }
  }

  async function setStatus(d: KnowledgeDocument, status: "active" | "archived") {
    setBusyId(d.id);
    setNotice(null);
    try {
      const updated = await api.knowledgeUpdate(d.id, { status });
      docs.setData((l) => l?.map((x) => (x.id === d.id ? { ...x, ...updated } : x)) ?? null);
    } catch (e) {
      setNotice({ variant: "error", message: errorMessage(e) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageMeta title={`${tr("nav.knowledge")} | ${tr("app.name")}`} description={tr("kb.meta")} />
      <PageHeader
        title={tr("nav.knowledge")}
        description={tr("kb.description")}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              loading={reindexing}
              disabled={!missing}
              onClick={reindex}
              startIcon={<RefreshCw className="size-4" />}
            >
              {tr("kb.reindex")}{missing ? ` (${missing})` : ""}
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)} startIcon={<FileUp className="size-4" />}>
              {tr("kb.uploadPdf")}
            </Button>
          </>
        }
      />

      {notice && <Alert className="mb-6" variant={notice.variant} message={notice.message} />}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        <StatCard label={tr("kb.activeDocs")} value={formatNumber(active.length)} icon={<BookOpenText className="size-6" />} accent="teal" />
        <StatCard label={tr("kb.passages")} value={formatNumber(chunks)} icon={<Layers className="size-6" />} accent="blue" />
        <StatCard
          label={tr("kb.readyMeaning")}
          value={chunks ? `${Math.round((embedded / chunks) * 100)}%` : "—"}
          icon={<Sparkles className="size-6" />}
          accent="violet"
        />
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <Card className="col-span-12" bodyClassName="p-0 sm:p-0" title={tr("kb.documents")} icon={<BookOpenText className="size-5" />} accent="teal">
          {docs.loading ? (
            <LoadingState />
          ) : docs.error ? (
            <ErrorState message={docs.error} onRetry={docs.reload} />
          ) : !list.length ? (
            <EmptyState
              icon={<BookOpenText className="size-6" />}
              title={tr("kb.noDocs")}
              description={tr("kb.noDocsHint")}
              action={<Button onClick={() => setUploadOpen(true)}>{tr("kb.uploadPdf")}</Button>}
            />
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className={`${TH} ps-5 sm:ps-6`}>{tr("kb.title")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("kb.crops")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("form.language")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("kb.pages")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("kb.passages")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("kb.added")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("common.status")}</TableCell>
                    <TableCell isHeader className={`${TH} pe-5 text-end sm:pe-6`}>{tr("common.actions")}</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {list.map((d) => {
                    const emb = d.embedded_count ?? 0;
                    return (
                      <TableRow key={d.id} className={d.status === "archived" ? "opacity-60" : ""}>
                        <TableCell className={`${TD} ps-5 sm:ps-6`}>
                          <p className="font-medium text-gray-800 dark:text-white/90">{d.title}</p>
                          {d.version_label && <p className="text-theme-xs text-gray-500">{d.version_label}</p>}
                        </TableCell>
                        <TableCell className={TD}>{d.crops.map((c) => trTerm("crop", c)).join(", ")}</TableCell>
                        <TableCell className={TD}>{docLanguageName(d.language)}</TableCell>
                        <TableCell className={TD}>{d.page_count ?? "—"}</TableCell>
                        <TableCell className={TD}>
                          <span className="me-2">{d.chunk_count}</span>
                          {emb < d.chunk_count && (
                            <Badge size="sm" color="warning">
                              {tr("kb.embeddedOf", { n: emb, total: d.chunk_count })}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={`${TD} whitespace-nowrap`}>{formatDateTime(d.created_at)}</TableCell>
                        <TableCell className={TD}>
                          <Badge size="sm" color={d.status === "active" ? "success" : "light"}>
                            {tr(d.status === "active" ? "kb.inUse" : "kb.archived")}
                          </Badge>
                        </TableCell>
                        <TableCell className={`${TD} pe-5 text-end sm:pe-6`}>
                          {d.status === "active" ? (
                            <Button
                              size="xs"
                              variant="ghost"
                              loading={busyId === d.id}
                              onClick={() => setStatus(d, "archived")}
                              startIcon={<Archive className="size-4" />}
                            >
                              {tr("kb.archive")}
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant="ghost"
                              loading={busyId === d.id}
                              onClick={() => setStatus(d, "active")}
                              startIcon={<ArchiveRestore className="size-4" />}
                            >
                              {tr("kb.restore")}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <TrySearch />
      </div>

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploaded={(r) => {
            docs.reload();
            setNotice(
              r.warning || r.pages_needing_ocr.length
                ? {
                    variant: "warning",
                    message: [
                      tr("kb.addedNotice", { title: r.document.title, pages: r.pages, chunks: r.chunks }),
                      r.warning,
                      r.pages_needing_ocr.length ? tr("kb.ocrSkipped", { pages: r.pages_needing_ocr.join(", ") }) : null,
                    ]
                      .filter(Boolean)
                      .join(" "),
                  }
                : { variant: "success", message: tr("kb.addedNotice", { title: r.document.title, pages: r.pages, chunks: r.chunks }) },
            );
          }}
        />
      )}
    </>
  );
}

function TrySearch() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<KnowledgeHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  async function run(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      setHits(await api.knowledgeSearch(q.trim()));
      setOpen(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      className="col-span-12"
      accent="violet"
      icon={<Search className="size-5" />}
      title={tr("kb.test")}
      description={tr("kb.testHint")}
    >
      <form onSubmit={run} className="flex gap-2">
        <div className="flex-1">
          <Input placeholder={tr("kb.testPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button type="submit" loading={busy} disabled={q.trim().length < 2}>
          {tr("common.search")}
        </Button>
      </form>
      {error && <Alert className="mt-4" variant="error" message={error} />}
      {hits && (
        <ol className="mt-4 space-y-2">
          {!hits.length && <p className="text-sm text-gray-500">{tr("kb.noPassages")}</p>}
          {hits.map((h, i) => (
            <li key={i} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <button type="button" className="w-full text-start" onClick={() => setOpen(open === i ? null : i)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    <span className="me-2 text-brand-500">S{i + 1}</span>
                    {h.citation}
                  </p>
                  <div className="flex gap-1.5">
                    {h.keyword_rank != null && (
                      <Badge size="sm" color="light">
                        {tr("kb.wordRank", { n: h.keyword_rank + 1 })}
                      </Badge>
                    )}
                    {h.vector_rank != null && (
                      <Badge size="sm" color="info">
                        {tr("kb.meaningRank", { n: h.vector_rank + 1 })}
                      </Badge>
                    )}
                  </div>
                </div>
                {h.section && <p className="mt-0.5 text-theme-xs text-gray-500">§ {h.section}</p>}
                <p className={`mt-2 text-theme-sm whitespace-pre-wrap text-gray-600 dark:text-gray-400 ${open === i ? "" : "line-clamp-3"}`}>
                  {h.text}
                </p>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (r: KnowledgeUploadResult) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [crops, setCrops] = useState("wheat");
  const [language, setLanguage] = useState("");
  const [version, setVersion] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return setError(tr("kb.choosePdf"));
    if (!file.name.toLowerCase().endsWith(".pdf"))
      return setError(tr("kb.pdfOnly"));
    if (!title.trim() || !crops.trim()) return setError(tr("kb.titleCropsRequired"));
    setBusy(true);
    setError(null);
    try {
      const r = await api.knowledgeUpload({
        file,
        title: title.trim(),
        crops,
        language,
        version_label: version.trim(),
        source_url: sourceUrl.trim(),
      });
      onUploaded(r);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} className="m-4 max-w-[560px]">
      <form onSubmit={submit} className="space-y-4 p-6 sm:p-8">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">{tr("kb.uploadTitle")}</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tr("kb.uploadHint")}
          </p>
        </div>
        {error && <Alert variant="error" message={error} />}
        <div>
          <Label htmlFor="kb-file">{tr("kb.pdfFile")}</Label>
          <input
            id="kb-file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !title) setTitle(f.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " "));
            }}
            className="block w-full text-sm text-gray-600 file:me-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 dark:text-gray-400 dark:file:bg-brand-500/15 dark:file:text-brand-400"
          />
        </div>
        <div>
          <Label htmlFor="kb-title">{tr("kb.title")}</Label>
          <Input id="kb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="MoA Irrigated Wheat Production Manual" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="kb-crops">{tr("kb.crops")}</Label>
            <Input id="kb-crops" value={crops} onChange={(e) => setCrops(e.target.value)} placeholder="wheat, barley" />
          </div>
          <div>
            <Label htmlFor="kb-lang">{tr("form.language")}</Label>
            <Select id="kb-lang" options={languageOptions()} value={language} onChange={setLanguage} />
          </div>
          <div>
            <Label htmlFor="kb-version">{tr("kb.version")}</Label>
            <Input id="kb-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2016 E.C." />
          </div>
          <div>
            <Label htmlFor="kb-url">{tr("kb.sourceLink")}</Label>
            <Input id="kb-url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://www.moa.gov.et/…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {tr("common.cancel")}
          </Button>
          <Button type="submit" loading={busy}>
            {tr("kb.upload")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
