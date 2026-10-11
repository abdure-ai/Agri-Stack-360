import { api } from "@/api/client";
import DotMap, { type MapDot } from "@/components/charts/DotMap";
import Card from "@/components/common/Card";
import { ErrorState, LoadingState } from "@/components/common/States";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import type { ReportCount, SupplierReport } from "@/types/api";
import { TrendingUp } from "lucide-react";

const TH =
  "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300";
const band = (n: ReportCount): MapDot["size"] =>
  typeof n !== "number" ? "low" : n >= 10 ? "high" : n >= 5 ? "medium" : "low";

/** Supplier demand: photo checks of the diseases their products target, and crop area, by zone; plus a
 *  map of code warnings by woreda (possible counterfeits of their products). */
export default function DemandCard({
  orgId,
  report,
}: {
  orgId: number | null;
  report: SupplierReport | null;
}) {
  const demand = useAsync(() => api.supplierDemand(90, orgId), [orgId]);
  const d = demand.data;

  const warningDots: MapDot[] = (report?.by_woreda ?? [])
    .filter((w) => w.warnings > 0 && w.latitude != null && w.longitude != null)
    .map((w) => ({
      key: `warn-${w.pcode}`,
      latitude: w.latitude!,
      longitude: w.longitude!,
      size: w.warnings >= 10 ? "high" : w.warnings >= 5 ? "medium" : "low",
      group: "warnings",
      groupLabel: tr("demand.warnings"),
      title: `${w.woreda}: ${w.warnings}`,
    }));
  const demandDots: MapDot[] = (d?.zones ?? [])
    .filter((z) => z.latitude != null && z.longitude != null)
    .map((z) => ({
      key: `zone-${z.pcode}`,
      latitude: z.latitude!,
      longitude: z.longitude!,
      size: band(z.photo_checks_total),
      group: "checks",
      groupLabel: tr("demand.checks"),
      title: `${z.zone}: ${z.photo_checks_total}`,
    }));

  return (
    <Card
      accent="orange"
      icon={<TrendingUp className="size-5" />}
      title={tr("demand.title")}
      description={tr("demand.hint")}
    >
      {demand.loading ? (
        <LoadingState />
      ) : demand.error || !d ? (
        <ErrorState message={demand.error} onRetry={demand.reload} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
          <DotMap
            dots={[...demandDots, ...warningDots]}
            label={tr("demand.title")}
          />
          <div className="max-w-full overflow-x-auto">
            {!d.zones.length ? (
              <p className="text-theme-sm text-gray-500">
                {tr("reports.noData")}
              </p>
            ) : (
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className={TH}>
                      {tr("reports.col.zone")}
                    </TableCell>
                    <TableCell isHeader className={TH}>
                      {tr("demand.checks")}
                    </TableCell>
                    <TableCell isHeader className={TH}>
                      {tr("outlook.farms")}
                    </TableCell>
                    <TableCell isHeader className={TH}>
                      {tr("outlook.area")}
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {d.zones.map((z) => (
                    <TableRow key={z.pcode}>
                      <TableCell className={TD}>
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {z.zone}
                        </span>
                        <span className="block text-theme-xs text-gray-400">
                          {z.region}
                        </span>
                      </TableCell>
                      <TableCell className={TD}>
                        {z.photo_checks_total}
                      </TableCell>
                      <TableCell className={TD}>{z.farms_growing}</TableCell>
                      <TableCell className={TD}>
                        {z.area_ha != null
                          ? `${z.area_ha} ${tr("unit.ha")}`
                          : tr("outlook.hidden")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
              {tr("reports.suppressedNote")}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
