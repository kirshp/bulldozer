/**
 * Generic analytics layer for BullDozer.
 *
 * Ported and generalised from the Madeira Ativa Python pipeline
 * (data_processor.py): instead of betting-brand search volumes, this works on
 * any long-format dataset of observations and computes the same family of
 * metrics — KPIs, top movers, group rollups and period-over-period trends.
 */

/** One observation: an entity measured in a period, optionally tagged. */
export interface Observation {
  entity: string; // e.g. country, respondent segment, brand
  period: string; // ISO-ish: "2025-04", "2025-W15", "2025"
  value: number;
  group?: string; // optional rollup dimension (region, category…)
  iso?: string; // ISO 3166-1 alpha-3, for map rendering
}

export interface Kpi {
  totalValue: number;
  totalPct: number; // % change of total vs previous period
  growthCount: number;
  declineCount: number;
  stableCount: number;
  totalEntities: number;
  currPeriod: string;
  prevPeriod: string;
}

export interface Change {
  entity: string;
  curr: number;
  prev: number;
  delta: number;
  pct: number;
}

export type ChangeMode = 'pct' | 'pp';

const STABLE_BAND = 0.5; // ±0.5 (percent for 'pct', percentage points for 'pp')

/** Period-over-period change of one entity, in the units of `mode`:
 *  'pct' → multiplicative percent; 'pp' → percentage-point delta. */
export function changeValue(curr: number, prev: number, mode: ChangeMode): number {
  if (mode === 'pp') return curr - prev;
  return prev ? ((curr - prev) / prev) * 100 : 0;
}

export function periods(data: Observation[]): string[] {
  return [...new Set(data.map((d) => d.period))].sort();
}

export function lastTwoPeriods(data: Observation[]): [string, string] {
  const p = periods(data);
  return [p[p.length - 2], p[p.length - 1]];
}

/** Sum of value per entity within a single period. */
export function entityTotals(data: Observation[], period: string): Map<string, number> {
  const totals = new Map<string, number>();
  for (const d of data) {
    if (d.period !== period) continue;
    totals.set(d.entity, (totals.get(d.entity) ?? 0) + d.value);
  }
  return totals;
}

export function computeKpi(data: Observation[], mode: ChangeMode = 'pct'): Kpi {
  const [prevPeriod, currPeriod] = lastTwoPeriods(data);
  const curr = entityTotals(data, currPeriod);
  const prev = entityTotals(data, prevPeriod);

  const entities = new Set([...curr.keys(), ...prev.keys()]);
  let growthCount = 0;
  let declineCount = 0;
  let stableCount = 0;
  for (const e of entities) {
    if (!prev.has(e)) continue; // no baseline → not classifiable
    const change = changeValue(curr.get(e) ?? 0, prev.get(e) ?? 0, mode);
    if (change > STABLE_BAND) growthCount++;
    else if (change < -STABLE_BAND) declineCount++;
    else stableCount++;
  }

  const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
  const mean = (m: Map<string, number>) => (m.size ? sum(m) / m.size : 0);
  const totalValue = sum(curr);

  // Headline delta: rates move in points (mean change), volumes in percent.
  const headlineDelta =
    mode === 'pp'
      ? Math.round((mean(curr) - mean(prev)) * 10) / 10
      : (() => {
          const totalPrev = sum(prev);
          return totalPrev ? Math.round(((totalValue - totalPrev) / totalPrev) * 100) : 0;
        })();

  return {
    totalValue,
    totalPct: headlineDelta,
    growthCount,
    declineCount,
    stableCount,
    totalEntities: entities.size,
    currPeriod,
    prevPeriod,
  };
}

/** `pct` holds the change in the units of `mode` (percent or percentage points). */
export function computeChanges(data: Observation[], mode: ChangeMode = 'pct'): Change[] {
  const [prevPeriod, currPeriod] = lastTwoPeriods(data);
  const curr = entityTotals(data, currPeriod);
  const prev = entityTotals(data, prevPeriod);

  const entities = new Set([...curr.keys(), ...prev.keys()]);
  const records: Change[] = [];
  for (const e of entities) {
    const cv = curr.get(e) ?? 0;
    const pv = prev.get(e) ?? 0;
    if (mode === 'pct' && pv === 0) continue; // undefined percent change
    records.push({ entity: e, curr: cv, prev: pv, delta: cv - pv, pct: changeValue(cv, pv, mode) });
  }
  return records.sort((a, b) => b.pct - a.pct);
}

export function topGrowth(data: Observation[], n = 10, mode: ChangeMode = 'pct'): Change[] {
  return computeChanges(data, mode)
    .filter((c) => c.pct > 0)
    .slice(0, n);
}

export function topDecline(data: Observation[], n = 10, mode: ChangeMode = 'pct'): Change[] {
  return computeChanges(data, mode)
    .filter((c) => c.pct < 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, n);
}

export function topByVolume(data: Observation[], n = 15): Change[] {
  const [prevPeriod, currPeriod] = lastTwoPeriods(data);
  const curr = entityTotals(data, currPeriod);
  const prev = entityTotals(data, prevPeriod);
  return [...curr.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([entity, cv]) => {
      const pv = prev.get(entity) ?? 0;
      const delta = cv - pv;
      return { entity, curr: cv, prev: pv, delta, pct: pv ? (delta / pv) * 100 : 0 };
    });
}

export interface GroupRollup {
  group: string;
  members: number;
  value: number;
  pct: number;
}

export function groupRollups(data: Observation[], mode: ChangeMode = 'pct'): GroupRollup[] {
  const [prevPeriod, currPeriod] = lastTwoPeriods(data);
  const groups = new Map<string, Observation[]>();
  for (const d of data) {
    if (!d.group) continue;
    const arr = groups.get(d.group) ?? [];
    arr.push(d);
    groups.set(d.group, arr);
  }

  const result: GroupRollup[] = [];
  for (const [group, rows] of groups) {
    const currRows = rows.filter((r) => r.period === currPeriod);
    const prevRows = rows.filter((r) => r.period === prevPeriod);
    const currVal = currRows.reduce((a, b) => a + b.value, 0);
    const prevVal = prevRows.reduce((a, b) => a + b.value, 0);
    const members = new Set(currRows.map((r) => r.entity)).size;
    if (members === 0) continue;

    // For rates, report the change of the group mean (in points); for volumes,
    // the percent change of the group total. `value` is mean for rates, sum for volumes.
    const value =
      mode === 'pp' ? Math.round((currVal / members) * 10) / 10 : currVal;
    const pct =
      mode === 'pp'
        ? Math.round((currVal / members - prevVal / (prevRows.length || 1)) * 10) / 10
        : Math.round((prevVal ? ((currVal - prevVal) / prevVal) * 100 : 0) * 10) / 10;
    result.push({ group, members, value, pct });
  }
  return result.sort((a, b) => b.value - a.value);
}

/** Period-over-period % change series, per group. */
export function trendByGroup(data: Observation[]): Record<string, { periods: string[]; pctChanges: number[] }> {
  const allPeriods = periods(data);
  const out: Record<string, { periods: string[]; pctChanges: number[] }> = {};
  const groups = new Set(data.map((d) => d.group).filter(Boolean) as string[]);

  for (const g of groups) {
    const series = allPeriods.map((p) =>
      data.filter((d) => d.group === g && d.period === p).reduce((a, b) => a + b.value, 0),
    );
    if (series.length < 2) continue;
    const pctChanges: number[] = [];
    for (let i = 1; i < series.length; i++) {
      pctChanges.push(series[i - 1] > 0 ? ((series[i] - series[i - 1]) / series[i - 1]) * 100 : 0);
    }
    out[g] = { periods: allPeriods.slice(1), pctChanges };
  }
  return out;
}
