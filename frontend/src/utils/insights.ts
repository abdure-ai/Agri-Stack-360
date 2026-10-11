// utils/insights.ts
// Plain-language market analysis for farmers and agricultural traders.
// Language target: simple, short sentences, no technical jargon.

import type {
  ForecastResponse,
  MarketFilters,
  PricePoint,
  RegionalPoint,
  SpreadPoint,
} from '@/types/api'
import { tr, trTerm } from '@/i18n/core'
import { formatETB, formatMonthYear } from './formatters'

export interface Insight {
  headline: string
  bullets: string[]
}

export type SellAction = 'wait' | 'hold' | 'sellNow' | 'sellSoon' | 'sellUrgently'

export interface Recommendation extends Insight {
  action: SellAction
  label: string
  color: string
  bg: string
  changePct: number
  changeColor: string
  currentPrice: number
  forecastPrice: number
  uncertainty: number
}

function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }
function stdDev(arr: number[]) {
  const m = avg(arr)
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length)
}
function pctChange(val: number, base: number) { return base ? ((val - base) / Math.abs(base)) * 100 : 0 }

// ── Time Series ──────────────────────────────────────────────────────────────

export function analyzeTimeSeries(rawRows: PricePoint[], filters: MarketFilters | null, unit: string): Insight | null {
  // Aggregate to ONE value per date (average across all reporting markets).
  // rawRows has one row per market per date — we must aggregate first so the
  // statistics match what the chart line actually shows.
  const byDate: Record<string, number[]> = {}
  for (const r of (rawRows || [])) {
    if (r.price_avg == null) continue
    if (!byDate[r.date]) byDate[r.date] = []
    byDate[r.date].push(r.price_avg)
  }
  const sorted = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, prices]) => ({ date, p: avg(prices) }))

  if (sorted.length < 12) return null

  const vals    = sorted.map(r => r.p)
  const n       = vals.length
  const qN      = Math.max(3, Math.floor(n / 4))
  const startA  = avg(vals.slice(0, qN))
  const endA    = avg(vals.slice(-qN))
  const trend   = pctChange(endA, startA)
  const mean    = avg(vals)
  const cv      = (stdDev(vals) / mean) * 100
  const maxP     = Math.max(...vals)
  const peakDate = sorted[vals.indexOf(maxP)].date
  const current  = vals[n - 1]
  const fromPeak = pctChange(current, maxP)
  const prior8   = vals.slice(-12, -4)
  const recent4  = vals.slice(-4)
  const momentum = prior8.length ? pctChange(avg(recent4), avg(prior8)) : 0

  const crop   = filters?.crop ? trTerm('crop', filters.crop) : tr('ins.thisCrop')
  const where  = filters?.region ? trTerm('region', filters.region) : ''
  const cropWhere = where ? tr('ins.cropInRegion', { crop, region: where }) : crop

  // Simple headline
  let headline: string
  if (trend > 2)       headline = tr('ins.ts.up', { crop: cropWhere, pct: trend.toFixed(0) })
  else if (trend < -2) headline = tr('ins.ts.down', { crop: cropWhere, pct: Math.abs(trend).toFixed(0) })
  else                 headline = tr('ins.ts.flat', { crop: cropWhere })

  const bullets: string[] = []

  // Price direction — plain cause
  if (trend > 5) {
    bullets.push(tr('ins.ts.rising'))
  } else if (trend > 2) {
    bullets.push(tr('ins.ts.slowUp'))
  } else if (trend < -5) {
    bullets.push(tr('ins.ts.falling'))
  } else if (trend < -2) {
    bullets.push(tr('ins.ts.slowDown'))
  } else {
    bullets.push(tr('ins.ts.steady'))
  }

  // Peak and current
  if (current < maxP * 0.94) {
    bullets.push(tr('ins.ts.belowPeak', {
      peak: formatETB(maxP, unit), month: formatMonthYear(peakDate), now: formatETB(current, unit), pct: Math.abs(fromPeak).toFixed(0),
    }))
  } else {
    bullets.push(tr('ins.ts.nearPeak', { peak: formatETB(maxP, unit), month: formatMonthYear(peakDate) }))
  }

  // Volatility — plain language
  if (cv > 22) {
    bullets.push(tr('ins.ts.volatile'))
  } else if (cv > 11) {
    bullets.push(tr('ins.ts.moderate'))
  } else {
    bullets.push(tr('ins.ts.stable'))
  }

  // Recent momentum
  if (momentum > 4 && prior8.length >= 4) {
    bullets.push(tr('ins.ts.momUp'))
  } else if (momentum < -4 && prior8.length >= 4) {
    bullets.push(tr('ins.ts.momDown'))
  }

  return { headline, bullets }
}

// ── Regional Comparison ──────────────────────────────────────────────────────

export function analyzeRegional(rawRows: RegionalPoint[], filters: MarketFilters | null, unit: string): Insight | null {
  if (!rawRows || rawRows.length < 6) return null

  const sorted   = [...rawRows].sort((a, b) => a.date.localeCompare(b.date))
  const allDates = [...new Set(sorted.map(r => r.date))]
  const recentSet = new Set(allDates.slice(-4))

  const recentMap: Record<string, number[]> = {}
  for (const r of sorted) {
    if (!recentSet.has(r.date) || r.price_avg == null) continue
    if (!recentMap[r.region]) recentMap[r.region] = []
    recentMap[r.region].push(r.price_avg)
  }
  const recentAvg = Object.fromEntries(
    Object.entries(recentMap).map(([reg, arr]) => [reg, avg(arr)])
  )

  const regions = Object.keys(recentAvg)
  if (regions.length < 2) return null

  const priceVals = Object.values(recentAvg)
  const maxReg = regions.reduce((a, b) => recentAvg[a] > recentAvg[b] ? a : b)
  const minReg = regions.reduce((a, b) => recentAvg[a] < recentAvg[b] ? a : b)
  const maxP   = recentAvg[maxReg]
  const minP   = recentAvg[minReg]
  const spread = pctChange(maxP, minP)
  const natAvg = avg(priceVals)

  const crop = filters?.crop ? trTerm('crop', filters.crop) : tr('ins.thisCrop')
  const maxName = trTerm('region', maxReg)
  const minName = trTerm('region', minReg)
  const unitName = unit ? trTerm('unit', unit) : tr('ins.unit')

  const headline = spread > 20
    ? tr('ins.reg.different', { crop, max: maxName, min: minName })
    : tr('ins.reg.similar', { crop })

  const bullets: string[] = []

  // Best and worst region
  bullets.push(tr('ins.reg.bestWorst', {
    max: maxName, maxPrice: formatETB(maxP, unit), min: minName, minPrice: formatETB(minP, unit),
    diff: formatETB(maxP - minP, unit), unit: unitName,
  }))

  // National average
  bullets.push(tr('ins.reg.average', { n: regions.length, price: formatETB(natAvg, unit) }))

  // Convergence / divergence
  if (allDates.length >= 8) {
    const thirdN   = Math.max(2, Math.floor(allDates.length / 3))
    const earlySet = new Set(allDates.slice(0, thirdN))
    const lateSet  = new Set(allDates.slice(-thirdN))
    const earlyMap: Record<string, number[]> = {}; const lateMap: Record<string, number[]> = {}
    for (const r of sorted) {
      if (r.price_avg == null) continue
      if (earlySet.has(r.date)) { earlyMap[r.region] = earlyMap[r.region] || []; earlyMap[r.region].push(r.price_avg) }
      if (lateSet.has(r.date))  { lateMap[r.region]  = lateMap[r.region]  || []; lateMap[r.region].push(r.price_avg) }
    }
    const earlyVals = Object.values(earlyMap).map(a => avg(a))
    const lateVals  = Object.values(lateMap).map(a => avg(a))
    if (earlyVals.length >= 2 && lateVals.length >= 2) {
      const earlyCV = (stdDev(earlyVals) / avg(earlyVals)) * 100
      const lateCV  = (stdDev(lateVals)  / avg(lateVals))  * 100
      if (Math.abs(lateCV - earlyCV) > 3) {
        if (lateCV < earlyCV) {
          bullets.push(tr('ins.reg.converging'))
        } else {
          bullets.push(tr('ins.reg.diverging'))
        }
      }
    }
  }

  // Transport advice
  if (spread > 30) {
    bullets.push(tr('ins.reg.bigGap', { pct: spread.toFixed(0), max: maxName, min: minName }))
  } else if (spread < 8) {
    bullets.push(tr('ins.reg.close'))
  }

  return { headline, bullets }
}

// ── Retail–Producer Spread ───────────────────────────────────────────────────

export function analyzeSpread(rawRows: SpreadPoint[], filters: MarketFilters | null, unit: string): Insight | null {
  // Aggregate spread by date (average across all markets per week)
  const byDate: Record<string, { spread: number[]; spread_pct: number[] }> = {}
  for (const r of (rawRows || [])) {
    if (r.spread == null || r.spread_pct == null) continue
    if (!byDate[r.date]) byDate[r.date] = { spread: [], spread_pct: [] }
    byDate[r.date].spread.push(r.spread)
    byDate[r.date].spread_pct.push(r.spread_pct)
  }
  const aggregated = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ spread: avg(v.spread), spread_pct: avg(v.spread_pct) }))

  if (aggregated.length < 6) return null

  const sorted    = aggregated
  const spreads   = sorted.map(r => r.spread)
  const pcts      = sorted.map(r => r.spread_pct)
  const avgSpread = avg(spreads)
  const avgPct    = avg(pcts)
  const n         = sorted.length
  const thirdN    = Math.max(2, Math.floor(n / 3))
  const earlyPct  = avg(pcts.slice(0, thirdN))
  const latePct   = avg(pcts.slice(-thirdN))
  const trend     = earlyPct ? pctChange(latePct, earlyPct) : 0

  const crop = filters?.crop ? trTerm('crop', filters.crop) : tr('ins.thisCrop')

  let headline: string
  if (avgPct > 40) {
    headline = tr('ins.spr.large', { crop })
  } else if (avgPct > 20) {
    headline = tr('ins.spr.medium', { crop, pct: avgPct.toFixed(0) })
  } else {
    headline = tr('ins.spr.small', { crop })
  }

  const bullets: string[] = []

  // Main spread fact
  bullets.push(tr('ins.spr.fact', {
    unit: unit ? trTerm('unit', unit) : tr('ins.unit'), crop, amount: formatETB(avgSpread, unit), pct: avgPct.toFixed(0),
  }))

  // Trend
  if (trend > 5) {
    bullets.push(tr('ins.spr.growing'))
  } else if (trend < -5) {
    bullets.push(tr('ins.spr.shrinking'))
  } else {
    bullets.push(tr('ins.spr.same'))
  }

  // Action advice
  if (avgPct > 40) {
    bullets.push(tr('ins.spr.veryHigh', { pct: avgPct.toFixed(0) }))
  } else if (avgPct < 10) {
    bullets.push(tr('ins.spr.fair'))
  }

  return { headline, bullets }
}

// ── Forecast Recommendation ──────────────────────────────────────────────────

export function buildForecastRecommendation(
  forecast: ForecastResponse | null,
  currentPrice: number | null,
  _unit: string,
): Recommendation | null {
  if (!forecast?.predictions?.length || currentPrice == null) return null

  const preds       = forecast.predictions
  const lastPred    = preds[preds.length - 1]
  const forecastP   = lastPred.price_median_etb
  const changePct   = pctChange(forecastP, currentPrice)
  const uncertainty = pctChange(lastPred.price_high_etb - lastPred.price_low_etb, forecastP)
  const weeksN      = forecast.weeks_ahead
  const timeStr     = weeksN <= 1 ? tr('ins.time.week1') : weeksN <= 2 ? tr('ins.time.weeks', { n: weeksN })
    : weeksN <= 4 ? tr('ins.time.month1') : weeksN <= 8 ? tr('ins.time.months2') : tr('ins.time.months3')
  const crop   = trTerm('crop', forecast.crop)
  const region = trTerm('region', forecast.region)

  let action: SellAction, color: string, bg: string
  if      (changePct > 8)   { action = 'wait';         color = '#039855'; bg = 'rgba(18,183,106,0.12)' }
  else if (changePct > 3)   { action = 'hold';         color = '#1f8a57'; bg = 'rgba(31,138,87,0.12)' }
  else if (changePct >= -3) { action = 'sellNow';      color = '#1570ef'; bg = 'rgba(46,144,250,0.12)' }
  else if (changePct >= -8) { action = 'sellSoon';     color = '#dc6803'; bg = 'rgba(247,144,9,0.12)' }
  else                      { action = 'sellUrgently'; color = '#d92d20'; bg = 'rgba(240,68,56,0.12)'  }
  const label = tr(`ins.action.${action}`)

  // Simple headline
  let headline: string
  const absChange = Math.abs(changePct).toFixed(0)
  if (changePct > 3) {
    headline = tr('ins.fc.up', { crop, region, pct: absChange, time: timeStr })
  } else if (changePct < -3) {
    headline = tr('ins.fc.down', { crop, region, pct: absChange, time: timeStr })
  } else {
    headline = tr('ins.fc.flat', { crop, region, time: timeStr })
  }

  const changeColor = changePct > 1 ? '#039855' : changePct < -1 ? '#d92d20' : 'var(--chart-text)'

  const bullets: string[] = []

  // Main advice — very direct
  if (action === 'wait' || action === 'hold') {
    bullets.push(tr('ins.fc.adviceWait', { time: timeStr, pct: absChange }))
  } else if (action === 'sellNow') {
    bullets.push(tr('ins.fc.adviceNow'))
  } else {
    bullets.push(tr('ins.fc.adviceSoon'))
  }

  // Uncertainty — simple
  if (uncertainty > 30) {
    bullets.push(tr('ins.fc.uncertainHigh'))
  } else if (uncertainty > 15) {
    bullets.push(tr('ins.fc.uncertainMid'))
  } else {
    bullets.push(tr('ins.fc.reliable'))
  }

  // Data confidence — plain
  if (forecast.confidence === 'high') {
    bullets.push(tr('ins.fc.dataHigh', { n: forecast.data_history_weeks }))
  } else if (forecast.confidence === 'medium') {
    bullets.push(tr('ins.fc.dataMedium', { n: forecast.data_history_weeks }))
  } else if (forecast.confidence === 'low') {
    bullets.push(tr('ins.fc.dataLow', { n: forecast.data_history_weeks }))
  } else {
    bullets.push(tr('ins.fc.dataVeryLow', { n: forecast.data_history_weeks }))
  }

  // Production decision
  if (changePct > 3) {
    bullets.push(tr('ins.fc.growMore', { crop }))
  } else if (changePct < -3) {
    bullets.push(tr('ins.fc.growCareful', { crop }))
  } else {
    bullets.push(tr('ins.fc.growSafe', { crop }))
  }

  return { action, label, color, bg, headline, bullets, changePct, changeColor, currentPrice, forecastPrice: forecastP, uncertainty }
}
