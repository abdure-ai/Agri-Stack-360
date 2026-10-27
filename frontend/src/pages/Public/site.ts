// pages/Public/site.ts — shared by the public website pages (landing, feedback, privacy)

const SOURCE_KEY = "as360_src";

/** Where this visit came from (?src=expo on the printed QR codes), kept for the rest of the visit. */
export function visitSource(search: string): string | null {
  const src = new URLSearchParams(search).get("src");
  try {
    if (src) sessionStorage.setItem(SOURCE_KEY, src);
    return src ?? sessionStorage.getItem(SOURCE_KEY);
  } catch {
    return src;
  }
}

export const PHONE = "+251 935 444 997";
export const PHONE_HREF = "tel:+251935444997";

/** Primary (green), accent (gold) and quiet (outline) link-buttons, pill-shaped, at least 44 px tall. */
export const BUTTON = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-base font-semibold text-white shadow-theme-xs hover:bg-brand-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-700",
  accent:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-base font-semibold text-brand-950 shadow-theme-xs hover:bg-amber-300 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
  outline:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-700 bg-white px-5 py-3 text-base font-semibold text-brand-800 hover:bg-brand-25 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-700",
};
