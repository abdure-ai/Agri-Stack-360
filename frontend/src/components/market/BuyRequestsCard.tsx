import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { EmptyState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, trTerm } from "@/i18n/core";
import { formatDateTime, formatFullDate } from "@/utils/formatters";
import { Megaphone } from "lucide-react";
import { useState, type FormEvent } from "react";

const CROPS = [
  "wheat",
  "teff",
  "maize",
  "barley",
  "sorghum",
  "bean",
  "onion",
  "tomato",
  "potato",
];

/** Trader: ask ABCs for a crop and quantity, and read their answers (ABC contacts come with the answer). */
export default function BuyRequestsCard() {
  const mine = useAsync(() => api.myBuyRequests(), []);
  const regions = useAsync(() => api.geoAreas(null), []);
  const [form, setForm] = useState({
    crop: "wheat",
    quantity: "",
    region: "",
    needed_by: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createBuyRequest({
        crop: form.crop,
        quantity_qt: Number(form.quantity),
        region_pcode: form.region || null,
        needed_by: form.needed_by || null,
        note: form.note || null,
      });
      setForm((f) => ({ ...f, quantity: "", note: "" }));
      mine.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      accent="violet"
      icon={<Megaphone className="size-5" />}
      title={tr("buy.title")}
      description={tr("buy.hint")}
    >
      <form
        onSubmit={submit}
        noValidate
        className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end"
      >
        <div>
          <Label htmlFor="br-crop">{tr("seasons.crop")}</Label>
          <Select
            id="br-crop"
            options={CROPS.map((c) => ({ value: c, label: trTerm("crop", c) }))}
            value={form.crop}
            onChange={(v) => set("crop", v)}
          />
        </div>
        <div>
          <Label htmlFor="br-qty">{tr("buy.quantity")}</Label>
          <Input
            id="br-qty"
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="br-region">{tr("common.region")}</Label>
          <Select
            id="br-region"
            placeholder={tr("buy.anyRegion")}
            placeholderSelectable
            options={(regions.data ?? []).map((r) => ({
              value: r.pcode,
              label: r.name,
            }))}
            value={form.region}
            onChange={(v) => set("region", v)}
          />
        </div>
        <div>
          <Label htmlFor="br-date">{tr("buy.neededBy")}</Label>
          <Input
            id="br-date"
            type="date"
            value={form.needed_by}
            onChange={(e) => set("needed_by", e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          loading={busy}
          disabled={!(Number(form.quantity) > 0)}
        >
          {tr("buy.post")}
        </Button>
        <div className="sm:col-span-5">
          <Input
            placeholder={tr("buy.note")}
            aria-label={tr("buy.note")}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </div>
      </form>
      {error && <Alert className="mb-4" variant="error" message={error} />}
      {mine.loading ? (
        <LoadingState />
      ) : !mine.data?.length ? (
        <EmptyState title={tr("buy.none")} />
      ) : (
        <ul className="space-y-3">
          {mine.data.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-gray-800 dark:text-white/90">
                  {trTerm("crop", b.crop)} · {b.quantity_qt}{" "}
                  {tr("unit.quintal")}
                  {b.region && (
                    <span className="font-normal text-gray-500">
                      {" "}
                      · {b.region}
                    </span>
                  )}
                  {b.needed_by && (
                    <span className="font-normal text-gray-500">
                      {" "}
                      · {formatFullDate(b.needed_by)}
                    </span>
                  )}
                </p>
                <span className="flex items-center gap-2">
                  <Badge
                    size="sm"
                    color={b.status === "open" ? "success" : "light"}
                  >
                    {tr(b.status === "open" ? "buy.open" : "buy.closed")}
                  </Badge>
                  {b.status === "open" && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={async () => {
                        await api.closeBuyRequest(b.id);
                        mine.reload();
                      }}
                    >
                      {tr("da.close")}
                    </Button>
                  )}
                </span>
              </div>
              {!b.responses?.length ? (
                <p className="mt-1 text-theme-xs text-gray-500">
                  {tr("buy.noAnswers")}
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-theme-sm">
                  {b.responses.map((r, i) => (
                    <li
                      key={i}
                      className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]"
                    >
                      <span className="font-medium">{r.abc}</span>
                      {r.phone && (
                        <a
                          className="ms-2 text-brand-600"
                          href={`tel:${r.phone}`}
                        >
                          {r.phone}
                        </a>
                      )}
                      {r.quantity_qt != null && (
                        <span className="ms-2 text-gray-500">
                          {r.quantity_qt} {tr("unit.quintal")}
                        </span>
                      )}
                      <p className="text-gray-700 dark:text-gray-300">
                        {r.message}
                      </p>
                      <p className="text-theme-xs text-gray-400">
                        {formatDateTime(r.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
