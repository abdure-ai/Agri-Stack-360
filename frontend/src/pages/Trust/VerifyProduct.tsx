import { api } from "@/api/client";
import ListenButton from "@/components/advisory/ListenButton";
import Card from "@/components/common/Card";
import DemoDataNotice from "@/components/common/DemoDataNotice";
import VerifiedShopsCard from "@/components/trust/VerifiedShopsCard";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import type { TrustResult } from "@/types/api";
import { cn } from "@/utils";
import { formatFullDate } from "@/utils/formatters";
import { Camera, CircleAlert, Flag, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";

// The browser's built-in QR reader (Chrome on Android and others); not in TypeScript's DOM types yet.
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;
const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

/** Input Trust: check a pack's batch code (QR or typed) and report a suspected fake. */
export default function VerifyProduct() {
  const { lang } = useI18n();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [result, setResult] = useState<TrustResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const autoChecked = useRef(false);

  const check = useCallback(async (value: string) => {
    if (value.trim().length < 4) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await api.trustVerify(value));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);

  // Opened from a scanned label (…/verify?code=…): check straight away.
  useEffect(() => {
    const fromLink = params.get("code");
    if (fromLink && !autoChecked.current) {
      autoChecked.current = true;
      void check(fromLink);
    }
  }, [params, check]);

  const onScanned = useCallback(
    (value: string) => {
      setScanning(false);
      setCode(value);
      void check(value);
    },
    [check],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void check(code);
  }

  const verdict = result && (result.result === "genuine" ? tr("trust.genuineText") : tr(`trust.reason.${result.reason}` as MessageKey));

  return (
    <>
      <PageMeta title={`${tr("nav.verify")} | ${tr("app.name")}`} description={tr("trust.description")} />
      <PageHeader title={tr("nav.verify")} description={tr("trust.description")} />
      <div className="mb-4">
        <DemoDataNotice message="demo.message.trust" />
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-4 md:space-y-6 xl:col-span-7">
          <Card accent="teal" icon={<ShieldCheck className="size-5" />} title={tr("nav.verify")}>
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <div>
                <Label htmlFor="trust-code">{tr("trust.codeLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      id="trust-code"
                      value={code}
                      placeholder={tr("trust.codePlaceholder")}
                      autoCapitalize="characters"
                      autoComplete="off"
                      className="font-mono tracking-widest uppercase"
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                  <Button type="submit" loading={busy} disabled={code.trim().length < 4}>
                    {tr("trust.check")}
                  </Button>
                  <Button variant="outline" startIcon={<Camera className="size-4" />} onClick={() => setScanning((s) => !s)}>
                    {scanning ? tr("trust.scanStop") : tr("trust.scan")}
                  </Button>
                </div>
              </div>
              {scanning && (
                <Scanner onCode={onScanned} />
              )}
              {error && <Alert variant="error" message={error} />}
            </form>
          </Card>

          {result && (
            <div
              className={cn(
                "rounded-2xl border-2 p-5",
                result.result === "genuine"
                  ? "border-success-500 bg-success-50 dark:bg-success-500/10"
                  : "border-error-500 bg-error-50 dark:bg-error-500/10",
              )}
              role="status"
            >
              <div className="flex items-start gap-3">
                {result.result === "genuine" ? (
                  <ShieldCheck className="size-10 shrink-0 text-success-600" aria-hidden="true" />
                ) : (
                  <CircleAlert className="size-10 shrink-0 text-error-600" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p
                      className={cn(
                        "flex-1 text-2xl font-bold",
                        result.result === "genuine" ? "text-success-700 dark:text-success-500" : "text-error-700 dark:text-error-500",
                      )}
                    >
                      {result.result === "genuine" ? tr("trust.genuine") : tr("trust.warning")}
                    </p>
                    {verdict && <ListenButton text={`${result.result === "genuine" ? tr("trust.genuine") : tr("trust.warning")}. ${verdict}`} language={lang} compact />}
                  </div>
                  <p className="mt-1 text-theme-sm text-gray-800 dark:text-white/90">{verdict}</p>
                  <p className="mt-1 font-mono text-theme-xs text-gray-500">{result.code}</p>
                </div>
              </div>
              {result.product_name && (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-theme-sm">
                  {(
                    [
                      ["trust.product", result.product_name],
                      ["trust.ingredient", result.active_ingredient],
                      ["trust.registration", result.registration_number],
                      ["trust.supplier", result.org_name],
                      ["trust.batch", result.batch_number],
                      ["trust.expires", result.expires_on ? formatFullDate(result.expires_on) : null],
                    ] as [MessageKey, string | null | undefined][]
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{tr(k)}</dt>
                      <dd className="font-medium text-gray-800 dark:text-white/90">{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {result.result === "genuine" && <p className="mt-3 text-theme-xs text-gray-600 dark:text-gray-400">{tr("trust.batchNote")}</p>}
            </div>
          )}
          {result?.product_id && <VerifiedShopsCard productId={result.product_id} compact />}
        </div>

        <div className="col-span-12 xl:col-span-5">
          <FakeReportCard code={result?.code ?? (code.trim() || null)} />
        </div>
      </div>
    </>
  );
}

/** Camera preview that reads a QR with the browser's BarcodeDetector. */
function Scanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  // Camera access needs HTTPS (or localhost); on a phone over plain http the phone's own camera app
  // still opens the check page from the QR, so the message points to typing the code instead.
  const supported = !!Detector && !!navigator.mediaDevices?.getUserMedia;
  const [problem, setProblem] = useState<string | null>(supported ? null : tr("trust.scanUnsupported"));

  useEffect(() => {
    if (!supported || !Detector) return;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    const detector = new Detector({ formats: ["qr_code"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        stream = s;
        if (!video.current || stopped) return;
        video.current.srcObject = s;
        await video.current.play();
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            const found = await detector.detect(video.current);
            if (found[0]?.rawValue) {
              onCode(found[0].rawValue);
              return;
            }
          } catch {
            /* keep trying */
          }
          timer = window.setTimeout(tick, 300);
        };
        void tick();
      })
      .catch((err: unknown) => setProblem(errorMessage(err)));
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode, supported]);

  return problem ? (
    <Alert variant="warning" message={problem} />
  ) : (
    <video ref={video} className="aspect-square w-full max-w-sm rounded-xl bg-black object-cover" muted playsInline />
  );
}

function FakeReportCard({ code }: { code: string | null }) {
  const products = useAsync(() => api.trustProducts(), []);
  const [form, setForm] = useState({ product_id: "", product_text: "", shop_text: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.trustFakeReport({
        code,
        product_id: form.product_id ? Number(form.product_id) : null,
        product_text: form.product_text || null,
        shop_text: form.shop_text || null,
        note: form.note || null,
      });
      setMessage({ ok: true, text: tr("trust.reportSent") });
      setForm({ product_id: "", product_text: "", shop_text: "", note: "" });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card accent="rose" icon={<Flag className="size-5" />} title={tr("trust.reportTitle")} description={tr("trust.reportHint")}>
      <form onSubmit={send} noValidate className="space-y-4">
        {code && <p className="font-mono text-theme-sm text-gray-600 dark:text-gray-300">{code}</p>}
        <div>
          <Label htmlFor="fr-product">{tr("trust.reportProduct")}</Label>
          <Select
            id="fr-product"
            placeholder={tr("trust.notListed")}
            placeholderSelectable
            options={(products.data ?? []).map((p) => ({ value: String(p.id), label: p.product_name }))}
            value={form.product_id}
            onChange={(v) => set("product_id", v)}
          />
        </div>
        {!form.product_id && (
          <div>
            <Label htmlFor="fr-text">{tr("trust.reportProductText")}</Label>
            <Input id="fr-text" value={form.product_text} onChange={(e) => set("product_text", e.target.value)} />
          </div>
        )}
        <div>
          <Label htmlFor="fr-shop">{tr("trust.reportShop")}</Label>
          <Input id="fr-shop" value={form.shop_text} onChange={(e) => set("shop_text", e.target.value)} />
        </div>
        <div>
          <Label>{tr("trust.reportNote")}</Label>
          <TextArea rows={3} value={form.note} onChange={(v) => set("note", v)} placeholder="" />
        </div>
        {message && <Alert variant={message.ok ? "success" : "error"} message={message.text} />}
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={busy} disabled={!code && !form.product_id && !form.product_text.trim()}>
            {tr("trust.reportSend")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
