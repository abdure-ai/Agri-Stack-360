// utils/constants.ts — fixed lists shared across pages

import { tr, type MessageKey } from "@/i18n/core";
import type { Role } from "@/types/api";

/** Regions covered by the NMIS market data (matches backend auth_router.REGIONS). */
export const REGIONS = ["Oromia", "Amhara", "SNNP", "Sidama", "South West", "Tigray"];

export const ROLES: Role[] = ["farmer", "agent", "agronomist", "trader", "government", "supplier", "agro_dealer", "abc_manager", "farm_manager", "regulator", "ngo_staff", "lender", "admin"];

/** Permission label / description in the interface language; falls back to the server's English text. */
export function permLabel(name: string, fallback?: string): string {
  const key = `perm.${name.replace(/:/g, "_")}` as MessageKey;
  return key in PERM_KEYS ? tr(key) : fallback ?? name;
}

export function permDescription(name: string, fallback?: string): string {
  const key = `perm.${name.replace(/:/g, "_")}.desc` as MessageKey;
  return key in PERM_KEYS ? tr(key) : fallback ?? "";
}

const AREA_KEYS: Record<string, MessageKey> = {
  "Market & advice": "permArea.market",
  "Farms & crop health": "permArea.farms",
  "Inputs & finance": "permArea.inputs",
  Administration: "nav.administration",
};

/** Permission group heading ("Market & advice", …) in the interface language. */
export function permArea(area: string): string {
  return AREA_KEYS[area] ? tr(AREA_KEYS[area]) : area;
}

/** What a role can do, in the interface language. */
export function roleDescription(role: string, fallback?: string): string {
  const key = `role.${role}.desc` as MessageKey;
  return key in PERM_KEYS ? tr(key) : fallback ?? "";
}

// Keys that exist in the dictionaries (checked at runtime so unknown server values fall back).
const PERM_KEYS: Record<string, true> = Object.fromEntries(
  [
    "market_read", "advisory_use", "profile_manage", "farms_manage_own", "farms_read_region", "farms_manage_all",
    "crop_health_use", "inputs_read", "financial_read", "users_manage", "platform_stats", "sync_manage",
    "models_retrain", "knowledge_manage", "advisory_admin",
  ]
    .flatMap((p) => [`perm.${p}`, `perm.${p}.desc`])
    .concat(["role.farmer.desc", "role.agent.desc", "role.trader.desc", "role.admin.desc"])
    .map((k) => [k, true]),
);

/** Role name in the current interface language. */
export function roleLabel(role: Role | string | null | undefined): string {
  return role && (ROLES as string[]).includes(role) ? tr(`role.${role as Role}`) : (role ?? "");
}

/** Crops with a dedicated disease library in the crop-health service. */
export const DIAGNOSABLE_CROPS = ["Maize", "Teff", "Coffee"];

export const SUPPLIER_CATEGORIES = ["Seeds", "Fertilizer", "Fungicide", "Herbicide"];
