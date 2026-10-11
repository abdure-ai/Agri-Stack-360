import { api } from "@/api/client";
import Card from "@/components/common/Card";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/States";
import Select from "@/components/form/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsync } from "@/hooks/useAsync";
import { tr, trTerm } from "@/i18n/core";
import { exportCsv } from "@/utils/exportCsv";
import { CalendarRange, Download } from "lucide-react";
import { useState } from "react";
import Button from "@/components/ui/button/Button";

const TH =
  "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300";
const CROPS = [
  "",
  "wheat",
  "teff",
  "maize",
  "barley",
  "sorghum",
  "onion",
  "tomato",
  "potato",
];

/** Expected harvests by zone and crop, from farmers' recorded crop seasons (aggregated, small numbers hidden). */
export default function SupplyOutlookCard() {
  const [crop, setCrop] = useState("wheat");
  const data = useAsync(() => api.supplyOutlook(crop || null), [crop]);
  const rows = data.data?.rows ?? [];

  return (
    <Card
      accent="amber"
      icon={<CalendarRange className="size-5" />}
      title={tr("outlook.title")}
      description={tr("outlook.hint")}
      actions={
        <div className="flex items-center gap-2">
          <div className="w-40">
            <Select
              aria-label={tr("seasons.crop")}
              options={CROPS.map((c) => ({
                value: c,
                label: c ? trTerm("crop", c) : tr("outlook.allCrops"),
              }))}
              value={crop}
              onChange={setCrop}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            startIcon={<Download className="size-4" />}
            disabled={!rows.length}
            onClick={() =>
              exportCsv(
                rows.map((r) => ({
                  region: r.region,
                  zone: r.zone,
                  crop: r.crop,
                  farms: r.farms,
                  area_ha: r.area_ha ?? "<5 farms",
                  harvest_months: Object.entries(r.harvest_months)
                    .map(([m, n]) => `${m}: ${n}`)
                    .join("; "),
                  estimated: r.harvest_estimated ? "yes" : "no",
                })),
                "supply-outlook.csv",
              )
            }
          >
            {tr("reports.export")}
          </Button>
        </div>
      }
      bodyClassName="p-0"
    >
      {data.loading ? (
        <LoadingState />
      ) : data.error ? (
        <ErrorState message={data.error} onRetry={data.reload} />
      ) : !rows.length ? (
        <EmptyState title={tr("outlook.none")} />
      ) : (
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell isHeader className={`${TH} ps-5`}>
                  {tr("reports.col.zone")}
                </TableCell>
                <TableCell isHeader className={TH}>
                  {tr("seasons.crop")}
                </TableCell>
                <TableCell isHeader className={TH}>
                  {tr("outlook.farms")}
                </TableCell>
                <TableCell isHeader className={TH}>
                  {tr("outlook.area")}
                </TableCell>
                <TableCell isHeader className={`${TH} pe-5`}>
                  {tr("outlook.harvest")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((r) => (
                <TableRow key={`${r.pcode}-${r.crop}`}>
                  <TableCell className={`${TD} ps-5`}>
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {r.zone}
                    </span>
                    <span className="block text-theme-xs text-gray-400">
                      {r.region}
                    </span>
                  </TableCell>
                  <TableCell className={TD}>{trTerm("crop", r.crop)}</TableCell>
                  <TableCell className={TD}>{r.farms}</TableCell>
                  <TableCell className={TD}>
                    {r.area_ha != null
                      ? `${r.area_ha} ${tr("unit.ha")}`
                      : tr("outlook.hidden")}
                  </TableCell>
                  <TableCell className={`${TD} pe-5`}>
                    {Object.entries(r.harvest_months).map(([m, n]) => (
                      <span key={m} className="me-3 inline-block">
                        {m === "unknown" ? tr("outlook.unknown") : m}: {n}
                      </span>
                    ))}
                    {r.harvest_estimated && (
                      <span className="block text-theme-xs text-gray-400">
                        {tr("outlook.estimated")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="px-5 py-3 text-theme-xs text-gray-500 dark:text-gray-400">
        {tr("reports.suppressedNote")}
      </p>
    </Card>
  );
}
