import { api } from "@/api/client";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { tr, trTerm } from "@/i18n/core";
import type { AdminArea } from "@/types/api";
import { cn } from "@/utils";
import { useEffect, useState } from "react";

/** Address as official P-codes (eth_admin_boundaries). Empty string = not chosen. */
export interface AreaValue {
  region_pcode: string;
  zone_pcode: string;
  woreda_pcode: string;
}

export const EMPTY_AREA: AreaValue = { region_pcode: "", zone_pcode: "", woreda_pcode: "" };

export function areaFrom(u?: { region_pcode?: string | null; zone_pcode?: string | null; woreda_pcode?: string | null } | null): AreaValue {
  return { region_pcode: u?.region_pcode ?? "", zone_pcode: u?.zone_pcode ?? "", woreda_pcode: u?.woreda_pcode ?? "" };
}

/** The most specific P-code chosen, which is what the server stores. */
export function areaPcode(a: AreaValue): string {
  return a.woreda_pcode || a.zone_pcode || a.region_pcode;
}

// Areas never change while the app runs; fetch each list once.
const cache = new Map<string, Promise<AdminArea[]>>();
function load(parent: string | null): Promise<AdminArea[]> {
  const key = parent ?? "";
  if (!cache.has(key)) {
    const p = api
      .geoAreas(parent)
      .then((list) => list.filter((a) => !/contested/i.test(a.name)))
      .catch((e) => {
        cache.delete(key);
        throw e;
      });
    cache.set(key, p);
  }
  return cache.get(key)!;
}

function useAreas(parent: string | null, enabled: boolean) {
  const key = parent ?? "";
  const [state, setState] = useState<{ key: string; areas: AdminArea[]; failed: boolean } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    load(parent)
      .then((areas) => live && setState({ key, areas, failed: false }))
      .catch(() => live && setState({ key, areas: [], failed: true }));
    return () => {
      live = false;
    };
  }, [key, parent, enabled]);
  // Results for an earlier parent are ignored until the new list arrives.
  const current = enabled && state?.key === key ? state : null;
  return { areas: current?.areas ?? [], loading: enabled && !current, failed: !!current?.failed };
}

// Region names have translations; zone and woreda names are shown as in the official list.
const opts = (areas: AdminArea[]) =>
  areas.map((a) => ({ value: a.pcode, label: a.level === "region" ? trTerm("region", a.name) : a.name }));

/** Region → zone → woreda dropdowns. Each list loads when its parent is chosen. */
export default function AreaPicker({
  value,
  onChange,
  idPrefix = "area",
  regionLocked = false,
  required = false,
  className,
}: {
  value: AreaValue;
  onChange: (v: AreaValue) => void;
  idPrefix?: string;
  /** Agents cannot move their own region (it decides whose farms they see). */
  regionLocked?: boolean;
  required?: boolean;
  className?: string;
}) {
  const regions = useAreas(null, true);
  const zones = useAreas(value.region_pcode || null, !!value.region_pcode);
  const woredas = useAreas(value.zone_pcode || null, !!value.zone_pcode);
  const failed = regions.failed || zones.failed || woredas.failed;

  return (
    <div className={cn("grid gap-4 sm:grid-cols-3", className)}>
      <div>
        <Label htmlFor={`${idPrefix}-region`}>
          Region {required && <span className="text-error-500">*</span>}
        </Label>
        <Select
          id={`${idPrefix}-region`}
          placeholder={regions.loading ? tr("common.loading") : tr("area.chooseRegion")}
          options={opts(regions.areas)}
          value={value.region_pcode}
          disabled={regionLocked || regions.loading}
          onChange={(v) => onChange({ region_pcode: v, zone_pcode: "", woreda_pcode: "" })}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-zone`}>{tr("common.zone")}</Label>
        <Select
          id={`${idPrefix}-zone`}
          placeholder={zones.loading ? tr("common.loading") : value.region_pcode ? tr("area.chooseZone") : tr("area.regionFirst")}
          options={opts(zones.areas)}
          value={value.zone_pcode}
          disabled={!value.region_pcode || zones.loading || (regionLocked && !value.region_pcode)}
          onChange={(v) => onChange({ ...value, zone_pcode: v, woreda_pcode: "" })}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-woreda`}>{tr("common.woreda")}</Label>
        <Select
          id={`${idPrefix}-woreda`}
          placeholder={woredas.loading ? tr("common.loading") : value.zone_pcode ? tr("area.chooseWoreda") : tr("area.zoneFirst")}
          options={opts(woredas.areas)}
          value={value.woreda_pcode}
          disabled={!value.zone_pcode || woredas.loading}
          onChange={(v) => onChange({ ...value, woreda_pcode: v })}
        />
      </div>
      {failed && (
        <p className="text-theme-xs text-error-500 sm:col-span-3">{tr("area.loadFailed")}</p>
      )}
    </div>
  );
}
