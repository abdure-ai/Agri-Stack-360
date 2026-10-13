// Livestock prices and outlook (backend/routers/livestock.py).

export interface LivestockSummary {
  reports: number;
  markets: number;
  first_date: string | null;
  last_date: string | null;
  imported_at: string | null;
  animals: { animal: string; reports: number; markets: number; regions: number; first_date: string; last_date: string }[];
  regions: string[];
  source: string;
  source_url: string;
}

export type LivestockReasonCode =
  | "no_data" | "period" | "too_few" | "no_season" | "short_period" | "few_reports" | "stale" | "checked" | "no_trend" | "not_checked";

export interface LivestockReason {
  code: LivestockReasonCode;
  params: Record<string, number | string>;
  /** English text, for clients without the translations. */
  text: string;
}

export interface LivestockForecast {
  animal: string;
  region: string | null;
  status: "ok" | "insufficient" | "no_data";
  confidence: "high" | "medium" | "low" | null;
  direction?: "up" | "down" | "flat";
  change_pct?: number;
  /** 80% range of the 4-week change, in %. */
  range_pct?: [number, number];
  horizon_days: number;
  reports?: number;
  markets?: number;
  first_date?: string;
  last_date?: string;
  span_days?: number;
  trained_at?: string;
  reasons: LivestockReason[];
  source: string;
}

export interface LivestockPoint { date: string; min: number; max: number; avg: number }

export interface LivestockSeries {
  market: string;
  region: string;
  animal: string;
  breed: string;
  sex: string;
  production_type: string;
  body_condition: string;
  grade: string;
  points: LivestockPoint[];
  latest: LivestockPoint;
  change_pct: number | null;
  outlook: { date: string; avg: number; low: number; high: number } | null;
}

export interface LivestockPrices {
  animal: string;
  region: string | null;
  forecast: LivestockForecast;
  series: LivestockSeries[];
  source: string;
}

export interface LivestockImportResult {
  added: number;
  updated: number;
  rejected: number;
  errors: string[];
  forecasts: number;
}
