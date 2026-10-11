// components/charts/chartTheme.ts — shared Recharts styling driven by the
// --chart-* tokens in index.css, so every chart follows light / dark mode.

import { formatCompact } from "@/utils/formatters";

export const GRID_PROPS = {
  stroke: "var(--chart-grid)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const AXIS_PROPS = {
  stroke: "var(--chart-axis)",
  tick: { fill: "var(--chart-text)", fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;

export const Y_AXIS_PROPS = {
  ...AXIS_PROPS,
  width: 56,
  tickFormatter: (v: number) => formatCompact(v),
} as const;

export const TOOLTIP_PROPS = {
  contentStyle: {
    background: "var(--chart-tooltip-bg)",
    border: "1px solid var(--chart-tooltip-border)",
    borderRadius: 12,
    fontSize: 12,
    boxShadow: "0 4px 8px -2px rgba(16,24,40,0.1)",
  },
  labelStyle: { color: "var(--chart-text)", fontWeight: 500, marginBottom: 4 },
  itemStyle: { padding: 0 },
} as const;

export const LEGEND_PROPS = {
  iconType: "circle" as const,
  iconSize: 8,
  wrapperStyle: { fontSize: 12, color: "var(--chart-text)", paddingTop: 8 },
};
