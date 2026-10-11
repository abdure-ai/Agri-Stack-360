// utils/formatters.ts — ETB, number and date formatting in the interface language.
// Month names come from the i18n dictionaries: browsers lack Afaan Oromoo and Tigrinya date data.

import { tr, trTerm, type MessageKey } from "@/i18n/core";

const monthName = (d: Date) => tr(`month.${d.getMonth() + 1}` as MessageKey);
const pad2 = (n: number) => String(n).padStart(2, "0");

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact" });

/** "12,500" */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return integer.format(Math.round(value));
}

/** "12K" — axis ticks */
export function formatCompact(value: number): string {
  return compact.format(value);
}

/** "12,500 ETB" or "12,500 ETB/Quintal" */
export function formatETB(value: number | null | undefined, unit = ""): string {
  if (value === null || value === undefined) return "—";
  const formatted = integer.format(Math.round(value));
  const etb = tr("unit.etb");
  return unit ? `${formatted} ${etb}/${trTerm("unit", unit)}` : `${formatted} ${etb}`;
}

/** Signed percentage with a direction: "+3.2%" / "up" */
export function formatPct(value: number | null | undefined): {
  text: string;
  direction: "up" | "down" | "flat";
} {
  if (value === null || value === undefined) return { text: "—", direction: "flat" };
  const sign = value > 0 ? "+" : "";
  return {
    text: `${sign}${value.toFixed(1)}%`,
    direction: value > 0 ? "up" : value < 0 ? "down" : "flat",
  };
}

/** "Jun 2025" */
export function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${monthName(d)} ${d.getFullYear()}`;
}

/** "11 Aug 2026" */
export function formatFullDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${monthName(d)} ${d.getFullYear()}`;
}

/** "Aug '26" — chart axis labels */
export function formatAxisDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${monthName(d)} '${String(d.getFullYear()).slice(2)}`;
}

/** "3 Oct, 11:58" — timestamps (ISO with time) */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${monthName(d)}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "45s", "12 min", "2 h 5 min" */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return tr("time.seconds", { n: s });
  const m = Math.round(s / 60);
  if (m < 60) return tr("time.minutes", { n: m });
  return tr("time.hoursMinutes", { h: Math.floor(m / 60), m: m % 60 });
}

/** Whole days between an ISO date and today. */
export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr + "T00:00:00").getTime();
  return Math.floor(ms / 86_400_000);
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Clamp a date string to [min, max]. */
export function clampDate(dateStr: string, min: string, max: string): string {
  if (!dateStr) return min;
  if (dateStr < min) return min;
  if (dateStr > max) return max;
  return dateStr;
}

export function capitalize(s: string | null | undefined): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/** Show roughly `maxTicks` evenly spaced labels on a date axis. */
export function makeDateTickFormatter(dates: string[], maxTicks = 8) {
  const step = Math.max(1, Math.ceil(dates.length / maxTicks));
  const shown = new Set(dates.filter((_, i) => i % step === 0));
  return (val: string) => (shown.has(val) ? formatAxisDate(val) : "");
}

/**
 * Monday of the week containing `iso` (YYYY-MM-DD). Markets report on
 * different days, so charts group by week to show one point per week.
 */
export function weekOf(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
