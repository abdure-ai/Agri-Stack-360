// utils/colors.ts — chart palettes (hex values taken from the @theme palette in index.css)

import type { PriceLevel } from "@/types/api";

/** Region colours — distinct hues, readable on light and dark backgrounds. */
export const REGION_COLORS: Record<string, string> = {
  Oromia: "#2e90fa", // blue
  Amhara: "#12b76a", // green
  SNNP: "#f79009", // amber
  Tigray: "#7a5af8", // purple
  Sidama: "#f04438", // red
  "South West": "#06aed4", // cyan
};

/** Up to five markets compared on one chart. */
export const MARKET_COLORS = ["#2e90fa", "#12b76a", "#f79009", "#7a5af8", "#ee46bc"];

export const PRICE_LEVEL_COLORS: Record<PriceLevel, string> = {
  retail: "#2e90fa",
  wholesale: "#12b76a",
  producer: "#f79009",
};

/** Heatmap stops: low prices cool, high prices warm. */
const HEAT_STOPS: [number, [number, number, number]][] = [
  [0.0, [209, 233, 255]],
  [0.33, [83, 177, 253]],
  [0.66, [253, 176, 34]],
  [1.0, [217, 45, 32]],
];

export const HEAT_GRADIENT_CSS = `linear-gradient(to right, ${HEAT_STOPS.map(
  ([, [r, g, b]]) => `rgb(${r},${g},${b})`,
).join(", ")})`;

/** Colour for a normalised value in [0, 1]. */
export function heatColor(norm: number): string {
  let lo = HEAT_STOPS[0];
  let hi = HEAT_STOPS[HEAT_STOPS.length - 1];
  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    if (norm >= HEAT_STOPS[i][0] && norm <= HEAT_STOPS[i + 1][0]) {
      lo = HEAT_STOPS[i];
      hi = HEAT_STOPS[i + 1];
      break;
    }
  }
  const t = (norm - lo[0]) / (hi[0] - lo[0] || 1);
  const mix = (a: number, b: number) => Math.round(a + t * (b - a));
  return `rgb(${mix(lo[1][0], hi[1][0])},${mix(lo[1][1], hi[1][1])},${mix(lo[1][2], hi[1][2])})`;
}

/** Normalise a value within [min, max] to [0, 1]. */
export function normalize(value: number, min: number, max: number): number {
  if (min === max) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
