/** Shared helpers for the data parsers. */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { parseCsvObjects } from './csv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');

/** Gapminder country registry rows ({iso3166_1_alpha3, world_4region, name}).
 *  Reads the local iCloud CSV when available; on CI (no iCloud) falls back to
 *  the bundled snapshot so ISO→region mapping never hard-fails the build. */
const GAPMINDER_CSV = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
export async function gapminderRows() {
  try {
    return [...parseCsvObjects(await readFile(GAPMINDER_CSV, 'utf8'))];
  } catch {
    return JSON.parse(await readFile(join(__dirname, 'gapminder_geo.json'), 'utf8'));
  }
}

/** Russian → English region labels used across the tidy macro/survey files.
 *  Keys stay as \u escapes on purpose (repo policy: ASCII-only sources) —
 *  don't unescape them back to readable Cyrillic. */
export const REGION_RU_EN = {
  '\u0410\u043c\u0435\u0440\u0438\u043a\u0430': 'Americas',
  '\u0410\u0444\u0440\u0438\u043a\u0430 \u044e\u0436\u043d\u0435\u0435 \u0421\u0430\u0445\u0430\u0440\u044b': 'Sub-Saharan Africa',
  '\u0411\u043b.\u0412\u043e\u0441\u0442\u043e\u043a/\u0421\u0435\u0432.\u0410\u0444\u0440.': 'Middle East & North Africa',
  '\u0411\u043b\u0438\u0436\u043d.\u0412\u043e\u0441\u0442\u043e\u043a/\u0421\u0435\u0432.\u0410\u0444\u0440.': 'Middle East & North Africa',
  '\u0412\u043e\u0441\u0442.\u0410\u0437\u0438\u044f/\u0422\u0438\u0445\u043e\u043e\u043a\u0435\u0430\u043d.': 'East Asia & Pacific',
  '\u0415\u0432\u0440\u043e\u043f\u0430/\u0426\u0435\u043d\u0442\u0440.\u0410\u0437\u0438\u044f': 'Europe & Central Asia',
  '\u042e\u0436\u043d\u0430\u044f \u0410\u0437\u0438\u044f': 'South Asia',
  '—': 'Advanced / other',
};

/** Gapminder world_4region → English. (Gapminder uses the plural "americas".) */
export const REGION_4 = {
  africa: 'Africa',
  americas: 'Americas',
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
