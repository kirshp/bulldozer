/** Shared helpers for the data parsers. */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');

/** Russian → English region labels used across the tidy macro/survey files. */
export const REGION_RU_EN = {
  'Америка': 'Americas',
  'Африка южнее Сахары': 'Sub-Saharan Africa',
  'Бл.Восток/Сев.Афр.': 'Middle East & North Africa',
  'Ближн.Восток/Сев.Афр.': 'Middle East & North Africa',
  'Вост.Азия/Тихоокеан.': 'East Asia & Pacific',
  'Европа/Центр.Азия': 'Europe & Central Asia',
  'Южная Азия': 'South Asia',
  '—': 'Advanced / other',
};

/** Gapminder world_4region → English. */
export const REGION_4 = {
  africa: 'Africa',
  america: 'Americas',
  asia: 'Asia',
  europe: 'Europe',
};

export function enRegion(ru) {
  return REGION_RU_EN[ru?.trim()] ?? (ru?.trim() || 'Other');
}

/** The two most recent periods present, optionally capped at `maxYear`. */
export function latestTwo(periods, maxYear) {
  let years = [...new Set(periods)].map(Number).filter((y) => !Number.isNaN(y));
  if (maxYear) years = years.filter((y) => y <= maxYear);
  years.sort((a, b) => a - b);
  return years.slice(-2).map(String);
}

/** The most recent N periods present, optionally capped at `maxYear`. */
export function latestN(periods, n, maxYear) {
  let years = [...new Set(periods)].map(Number).filter((y) => !Number.isNaN(y));
  if (maxYear) years = years.filter((y) => y <= maxYear);
  years.sort((a, b) => a - b);
  return years.slice(-n).map(String);
}

/** The most recent N years with decent coverage (coverage-aware), capped. */
export function pickPeriodsN(counts, n, maxYear) {
  let entries = [...counts.entries()].map(([y, c]) => [Number(y), c]).filter(([y]) => !Number.isNaN(y));
  if (maxYear) entries = entries.filter(([y]) => y <= maxYear);
  if (!entries.length) return [];
  const maxCount = Math.max(...entries.map(([, c]) => c));
  const threshold = Math.max(5, maxCount * 0.5);
  let eligible = entries.filter(([, c]) => c >= threshold).sort((a, b) => a[0] - b[0]);
  if (eligible.length < 2) eligible = entries.sort((a, b) => a[0] - b[0]);
  return eligible.slice(-n).map(([y]) => String(y));
}

/** Pick the two most recent years that have decent coverage, so a sparse
 *  tail (a handful of late reporters) doesn't produce a thin dashboard.
 *  `counts` is a Map<yearString, entityCount>. */
export function pickPeriods(counts, maxYear) {
  let entries = [...counts.entries()].map(([y, n]) => [Number(y), n]).filter(([y]) => !Number.isNaN(y));
  if (maxYear) entries = entries.filter(([y]) => y <= maxYear);
  if (entries.length < 2) return entries.sort((a, b) => a[0] - b[0]).map(([y]) => String(y));
  const maxCount = Math.max(...entries.map(([, n]) => n));
  const threshold = Math.max(5, maxCount * 0.5);
  let eligible = entries.filter(([, n]) => n >= threshold).sort((a, b) => a[0] - b[0]);
  if (eligible.length < 2) eligible = entries.sort((a, b) => a[0] - b[0]);
  return eligible.slice(-2).map(([y]) => String(y));
}

/** Write a normalised dataset {meta, data} as pretty JSON. */
export async function writeDataset(kind, slug, meta, data) {
  const dir = join(ROOT, 'src', 'data', kind === 'macro' ? 'macro' : 'surveys');
  await mkdir(dir, { recursive: true });
  const out = { meta: { ...meta, kind }, data };
  const dest = join(dir, `${slug}.json`);
  await writeFile(dest, JSON.stringify(out, null, 2) + '\n');
  console.log(`  ✓ ${slug}: ${data.length} obs → ${dest.replace(ROOT + '/', '')}`);
}

export function round(v, dp = 2) {
  const m = 10 ** dp;
  return Math.round(v * m) / m;
}
