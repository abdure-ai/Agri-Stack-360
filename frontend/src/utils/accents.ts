// utils/accents.ts — colour accents for cards, icon tiles and links.
//
// Class names are written out in full (never built from strings) so Tailwind
// can see and generate them. Each accent works in light and dark mode.

export type Accent = "green" | "blue" | "amber" | "violet" | "rose" | "teal" | "sky" | "orange";

export interface AccentClasses {
  /** Soft tinted card background (gradient into the card colour). */
  surface: string;
  /** Border that matches the surface. */
  border: string;
  /** Rounded icon tile: tinted background + strong icon colour. */
  tile: string;
  /** Solid strip / dot colour. */
  bar: string;
  /** Strong text colour for numbers and links. */
  text: string;
  /** Hover state for clickable tiles. */
  hover: string;
}

export const ACCENTS: Record<Accent, AccentClasses> = {
  green: {
    surface: "bg-linear-to-br from-emerald-50 via-white to-white dark:from-emerald-500/10 dark:via-white/[0.03] dark:to-white/[0.03]",
    border: "border-emerald-100 dark:border-emerald-500/20",
    tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    hover: "hover:border-emerald-300 hover:bg-emerald-50 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10",
  },
  blue: {
    surface: "bg-linear-to-br from-blue-50 via-white to-white dark:from-blue-500/10 dark:via-white/[0.03] dark:to-white/[0.03]",
    border: "border-blue-100 dark:border-blue-500/20",
    tile: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    bar: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    hover: "hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10",
  },
  amber: {
    surface: "bg-linear-to-br from-amber-50 via-white to-white dark:from-amber-500/10 dark:via-white/[0.03] dark:to-white/[0.03]",
    border: "border-amber-100 dark:border-amber-500/20",
    tile: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    hover: "hover:border-amber-300 hover:bg-amber-50 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/10",
  },
  violet: {
    surface: "bg-linear-to-br from-violet-50 via-white to-white dark:from-violet-500/10 dark:via-white/[0.03] dark:to-white/[0.03]",
    border: "border-violet-100 dark:border-violet-500/20",
    tile: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
    bar: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-400",
    hover: "hover:border-violet-300 hover:bg-violet-50 dark:hover:border-violet-500/40 dark:hover:bg-violet-500/10",
  },
  rose: {
    surface: "bg-linear-to-br from-rose-50 via-white to-white dark:from-rose-500/10 dark:via-white/[0.03] dark:to-white/[0.03]",
    border: "border-rose-100 dark:border-rose-500/20",
    tile: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    bar: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    hover: "hover:border-rose-300 hover:bg-rose-50 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10",
  },
  teal: {
    surface: "bg-linear-to-br from-teal-50 via-white to-white dark:from-teal-500/10 dark:via-white/[0.03] dark:to-white/[0.03]",
    border: "border-teal-100 dark:border-teal-500/20",
    tile: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
    bar: "bg-teal-500",
    text: "text-teal-700 dark:text-teal-400",
    hover: "hover:border-teal-300 hover:bg-teal-50 dark:hover:border-teal-500/40 dark:hover:bg-teal-500/10",
  },
  sky: {
    surface: "bg-linear-to-br from-sky-50 via-white to-white dark:from-sky-500/10 dark:via-white/[0.03] dark:to-white/[0.03]",
    border: "border-sky-100 dark:border-sky-500/20",
    tile: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
    bar: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-400",
    hover: "hover:border-sky-300 hover:bg-sky-50 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10",
  },
  orange: {
    surface: "bg-linear-to-br from-orange-50 via-white to-white dark:from-orange-500/10 dark:via-white/[0.03] dark:to-white/[0.03]",
    border: "border-orange-100 dark:border-orange-500/20",
    tile: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
    bar: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    hover: "hover:border-orange-300 hover:bg-orange-50 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10",
  },
};

/** Fixed colour per crop, so a crop looks the same on every screen. */
const CROP_ACCENTS: Record<string, Accent> = {
  Teff: "amber",
  Maize: "orange",
  Wheat: "violet",
  Sorghum: "rose",
  Bean: "teal",
  Sesame: "sky",
};
const ROTATION: Accent[] = ["green", "blue", "amber", "violet", "rose", "teal", "sky", "orange"];

export function cropAccent(crop: string): Accent {
  if (CROP_ACCENTS[crop]) return CROP_ACCENTS[crop];
  let h = 0;
  for (const ch of crop) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ROTATION[h % ROTATION.length];
}

/** Accent for each sidebar page, shared by quick links and page cards. */
export const PAGE_ACCENTS: Record<string, Accent> = {
  "/": "green",
  "/market": "blue",
  "/crop-health": "green",
  "/inputs": "orange",
  "/financial": "violet",
  "/advisory": "sky",
  "/profile": "teal",
  "/admin/users": "rose",
  "/admin/roles": "violet",
  "/admin/permissions": "blue",
  "/admin/data-sync": "amber",
  "/admin/knowledge": "teal",
  "/admin/ai-keys": "violet",
};

/** Fixed colour per role on the user-management screens. */
export const ROLE_ACCENTS: Record<string, Accent> = {
  farmer: "green",
  agent: "teal",
  trader: "orange",
  admin: "rose",
};

/** Colour per permission area on the Permissions screen. */
export const AREA_ACCENTS: Record<string, Accent> = {
  "Market & advice": "blue",
  "Farms & crop health": "green",
  "Inputs & finance": "violet",
  Administration: "rose",
};
