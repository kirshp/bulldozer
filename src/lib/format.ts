/** Number / percent formatting helpers (ported from data_processor.py). */

export function formatNumber(n: number): string {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export function formatFull(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function formatPct(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/** Format a change value with the right unit: percent or percentage points. */
export function formatChange(value: number, mode: 'pct' | 'pp' = 'pct'): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}${mode === 'pp' ? 'pp' : '%'}`;
}

export function pctClass(pct: number): 'up' | 'down' | 'flat' {
  if (pct > 0.5) return 'up';
  if (pct < -0.5) return 'down';
  return 'flat';
}
