// ABC formation and registration (A2): readiness checklist from the rules, recognition, documents, founding
// agreement signatures, registration record. Every change is checked again on the server (formation capability).
import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import { ABC_DOC_KINDS, type AbcDocKind, type AbcFormation, type AbcReadinessItem } from "@/types/abc";
import { formatDateTime, formatETB, formatFullDate } from "@/utils/formatters";
import { BadgeCheck, CheckCircle2, CircleDashed, FileText, FileUp, PenLine, Stamp } from "lucide-react";
import { useState, type FormEvent } from "react";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

const kindName = (k: string) => tr(`abc.doc.${k}` as MessageKey);

function amount(key: AbcReadinessItem["key"], v: AbcReadinessItem["have"]): string {
  if (v === null || v === undefined || v === "") return "—";
  if ((key === "paid_capital" || key === "declared_paid") && typeof v === "number") return formatETB(v);
  if (key === "recognition" && typeof v === "string") return formatFullDate(v);
  return typeof v === "number" ? v.toLocaleString() : String(v);
}

function Checklist({ f }: { f: AbcFormation }) {
  const done = f.readiness.items.filter((i) => i.ok).length;
  return (
    <Card
      accent={f.readiness.ready ? "green" : "amber"}
      icon={<BadgeCheck className="size-5" />}
      title={tr("abc.form.checklist")}
      description={tr("abc.form.checklistHint", { done, total: f.readiness.items.length })}
    >
      <ul className="space-y-2">
        {f.readiness.items.map((i) => (
          <li key={i.key} className="flex items-start gap-3">
            {i.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-500" /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-gray-400" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{tr(`abc.ready.${i.key}` as MessageKey)}</p>
              <p className="text-theme-xs text-gray-500">
                {i.need !== null && i.need !== undefined
                  ? tr("abc.form.haveNeed", { have: amount(i.key, i.have), need: amount(i.key, i.need) })
                  : i.have ? amount(i.key, i.have) : tr(i.ok ? "abc.form.done" : "abc.form.missing")}
                {i.rules.some((r) => r.verification_status === "PLACEHOLDER_VERIFY") && (
                  <span className="ms-2 text-warning-600">{tr("abc.form.draftRule")}</span>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {f.readiness.items.find((i) => i.key === "paid_capital" && !i.ok) && (
        <p className="mt-3 text-theme-xs text-gray-500">{tr("abc.form.sharesLater")}</p>
      )}
    </Card>
  );
}

function Documents({ f, orgId, onChanged }: { f: AbcFormation; orgId: number; onChanged: () => void }) {
  const [kind, setKind] = useState<AbcDocKind>("founding_agreement");
  const [title, setTitle] = useState("");
  const [years, setYears] = useState("5");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setMsg(null);
    try {
      await api.abcUploadDocument(orgId, kind, title.trim() || kindName(kind), file, kind === "business_plan" ? Number(years) : null);
      setMsg({ ok: true, text: tr("abc.form.uploaded") });
      setFile(null);
      setTitle("");
      onChanged();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  }

  return (
    <Card icon={<FileText className="size-5" />} title={tr("abc.form.documents")} description={tr("abc.form.documentsHint")}>
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      {f.documents.length ? (
        <ul className="mb-4 divide-y divide-gray-100 dark:divide-gray-800">
          {f.documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {d.title} <span className="text-theme-xs font-normal text-gray-500">v{d.version}{d.plan_years ? ` · ${tr("abc.form.years", { n: d.plan_years })}` : ""}</span>
                </p>
                <p className="text-theme-xs text-gray-500">{kindName(d.kind)} · {formatDateTime(d.uploaded_at)} · {d.uploaded_by ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                {!d.latest && <Badge size="sm" color="light">{tr("abc.form.older")}</Badge>}
                <Button size="xs" variant="outline" onClick={async () => saveBlob(await api.abcDocumentFile(orgId, d.id), d.filename)}>
                  {tr("abc.form.download")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={tr("abc.form.noDocuments")} />
      )}
      {f.can_edit && (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="doc-kind">{tr("abc.form.kind")}</Label>
            <Select id="doc-kind" value={kind} onChange={(v) => setKind(v as AbcDocKind)}
              options={ABC_DOC_KINDS.map((k) => ({ value: k, label: kindName(k) }))} />
          </div>
          <div>
            <Label htmlFor="doc-title">{tr("abc.form.title")}</Label>
            <Input id="doc-title" value={title} placeholder={kindName(kind)} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {kind === "business_plan" && (
            <div>
              <Label htmlFor="doc-years">{tr("abc.form.planYears")}</Label>
              <Select id="doc-years" value={years} onChange={setYears}
                options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: tr("abc.form.years", { n }) }))} />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
              <FileUp className="size-4" aria-hidden="true" />
              {file ? file.name : tr("abc.form.chooseFile")}
              <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <span className="ms-3 text-theme-xs text-gray-500">{tr("abc.form.fileTypes")}</span>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={!file}>{tr("abc.form.upload")}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function Recognition({ f, orgId, onChanged }: { f: AbcFormation; orgId: number; onChanged: () => void }) {
  const rec = f.formation;
  const docs = f.documents.filter((d) => d.kind === "recognition");
  const [authority, setAuthority] = useState(rec.recognition_authority ?? "");
  const [on, setOn] = useState(rec.recognized_on ?? "");
  const [doc, setDoc] = useState(rec.recognition_doc_id ? String(rec.recognition_doc_id) : docs[0] ? String(docs[0].id) : "");
  const [error, setError] = useState<string | null>(null);
  return (
    <Card icon={<Stamp className="size-5" />} title={tr("abc.form.recognition")} description={tr("abc.form.recognitionHint")}>
      {error && <Alert className="mb-3" variant="error" message={error} />}
      {rec.recognized_on && (
        <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
          {tr("abc.form.recognizedBy", { authority: rec.recognition_authority ?? "—", date: formatFullDate(rec.recognized_on) })}
        </p>
      )}
      {f.can_edit && (
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await api.abcSetRecognition(orgId, { authority: authority.trim(), recognized_on: on, doc_id: doc ? Number(doc) : null });
              onChanged();
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <div>
            <Label htmlFor="rec-auth">{tr("abc.form.authority")}</Label>
            <Input id="rec-auth" value={authority} onChange={(e) => setAuthority(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rec-on">{tr("abc.form.date")}</Label>
            <Input id="rec-on" type="date" value={on} onChange={(e) => setOn(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rec-doc">{tr("abc.form.letter")}</Label>
            <Select id="rec-doc" value={doc} placeholder="—" onChange={setDoc}
              options={docs.map((d) => ({ value: String(d.id), label: `${d.title} v${d.version}` }))} />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" size="sm" disabled={authority.trim().length < 3 || !on}>{tr("common.save")}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function Signatures({ f, orgId, onChanged }: { f: AbcFormation; orgId: number; onChanged: () => void }) {
  const sig = f.signatures;
  const scans = f.documents.filter((d) => d.kind === "other" || d.kind === "founding_agreement");
  const [farmer, setFarmer] = useState("");
  const [scan, setScan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const unsigned = sig.members.filter((m) => !m.signature);
  return (
    <Card icon={<PenLine className="size-5" />} title={tr("abc.form.agreement")}
      description={sig.document ? tr("abc.form.signedCount", { signed: sig.signed, total: sig.total, v: sig.document.version }) : tr("abc.form.noAgreement")}>
      {error && <Alert className="mb-3" variant="error" message={error} />}
      {sig.document && (
        <>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div className="h-full bg-success-500" style={{ width: `${sig.total ? (100 * sig.signed) / sig.total : 0}%` }} />
          </div>
          <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto text-sm dark:divide-gray-800">
            {sig.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="text-gray-800 dark:text-white/90">{m.name}</span>
                {m.signature ? (
                  <span className="text-theme-xs text-success-600">
                    {tr(m.signature.method === "app" ? "abc.form.signedApp" : "abc.form.signedScan")} · {formatFullDate(m.signature.signed_at.slice(0, 10))}
                  </span>
                ) : (
                  <span className="text-theme-xs text-gray-400">{tr("abc.form.notSigned")}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-theme-xs text-gray-500">{tr("abc.form.signHow")}</p>
          {f.can_edit && unsigned.length > 0 && (
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                try {
                  await api.abcRecordScan(orgId, Number(farmer), Number(scan));
                  setFarmer("");
                  onChanged();
                } catch (err) {
                  setError(errorMessage(err));
                }
              }}
            >
              <div className="w-48">
                <Label htmlFor="sig-farmer">{tr("abc.form.member")}</Label>
                <Select id="sig-farmer" value={farmer} placeholder="—" onChange={setFarmer}
                  options={unsigned.map((m) => ({ value: String(m.id), label: m.name }))} />
              </div>
              <div className="w-56">
                <Label htmlFor="sig-scan">{tr("abc.form.scan")}</Label>
                <Select id="sig-scan" value={scan} placeholder="—" onChange={setScan}
                  options={scans.map((d) => ({ value: String(d.id), label: `${d.title} v${d.version}` }))} />
              </div>
              <Button type="submit" size="sm" disabled={!farmer || !scan}>{tr("abc.form.recordScan")}</Button>
            </form>
          )}
        </>
      )}
    </Card>
  );
}

function Registration({ f, orgId, onChanged }: { f: AbcFormation; orgId: number; onChanged: () => void }) {
  const r = f.formation;
  const certs = f.documents.filter((d) => d.kind === "registration_certificate");
  const [form, setForm] = useState({ authority: "", number: "", on: "", cert: certs[0] ? String(certs[0].id) : "", reason: "" });
  const [error, setError] = useState<string | null>(null);
  if (f.status === "registered") {
    return (
      <Card accent="green" icon={<Stamp className="size-5" />} title={tr("abc.form.registered")}>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {tr("abc.form.registeredLine", { authority: r.registration_authority ?? "—", number: r.registration_number ?? "—",
            date: r.registered_on ? formatFullDate(r.registered_on) : "—" })}
        </p>
        {r.override_reason && <p className="mt-2 text-theme-xs text-warning-600">{tr("abc.form.overrideNote", { reason: r.override_reason })}</p>}
      </Card>
    );
  }
  if (!f.can_edit) return null;
  const needsOverride = !f.readiness.ready;
  return (
    <Card icon={<Stamp className="size-5" />} title={tr("abc.form.register")}
      description={needsOverride ? (f.is_admin ? tr("abc.form.adminOverride") : tr("abc.form.notReady")) : tr("abc.form.readyHint")}>
      {error && <Alert className="mb-3" variant="error" message={error} />}
      {(!needsOverride || f.is_admin) && (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await api.abcRegister(orgId, { authority: form.authority.trim(), number: form.number.trim(), registered_on: form.on,
                certificate_doc_id: Number(form.cert), override_reason: needsOverride ? form.reason.trim() : null });
              onChanged();
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <div>
            <Label htmlFor="reg-auth">{tr("abc.form.regAuthority")}</Label>
            <Input id="reg-auth" value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="reg-no">{tr("abc.form.regNumber")}</Label>
            <Input id="reg-no" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="reg-on">{tr("abc.form.date")}</Label>
            <Input id="reg-on" type="date" value={form.on} onChange={(e) => setForm({ ...form, on: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="reg-cert">{tr("abc.doc.registration_certificate")}</Label>
            <Select id="reg-cert" value={form.cert} placeholder="—" onChange={(v) => setForm({ ...form, cert: v })}
              options={certs.map((d) => ({ value: String(d.id), label: `${d.title} v${d.version}` }))} />
          </div>
          {needsOverride && (
            <div className="sm:col-span-2">
              <Label>{tr("abc.form.overrideReason")}</Label>
              <TextArea rows={2} value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} />
            </div>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm"
              disabled={!form.authority.trim() || !form.number.trim() || !form.on || !form.cert || (needsOverride && form.reason.trim().length < 10)}>
              {tr("abc.form.registerButton")}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function FormationTab({ orgId }: { orgId: number }) {
  const f = useAsync(() => api.abcFormation(orgId), [orgId]);
  if (f.loading && !f.data) return <LoadingState />;
  if (f.error || !f.data) return <ErrorState message={f.error} onRetry={f.reload} />;
  const data = f.data;
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-4 xl:col-span-5">
        <Checklist f={data} />
        <Registration key={`reg-${data.status}-${data.documents.length}`} f={data} orgId={orgId} onChanged={f.reload} />
      </div>
      <div className="col-span-12 space-y-4 xl:col-span-7">
        <Recognition key={`rec-${data.formation.recognized_on ?? ""}-${data.documents.length}`} f={data} orgId={orgId} onChanged={f.reload} />
        <Signatures f={data} orgId={orgId} onChanged={f.reload} />
        <Documents f={data} orgId={orgId} onChanged={f.reload} />
        <p className="text-theme-xs text-gray-500">{data.official_record_note}</p>
      </div>
    </div>
  );
}
