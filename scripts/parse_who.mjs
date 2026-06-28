/**
 * WHO Global Health Observatory (GHO) → macro datasets, fetched live from the
 * open OData API (reproducible, no microdata). Country-level, both sexes, the
 * latest available year per country. Roadmap themes: alcohol & tobacco.
 *   node scripts/parse_who.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { REGION_4, writeDataset, round } from './lib/datasets.mjs';

const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const API = 'https://ghoapi.azureedge.net/api';
const PARSED = new Date().toISOString().slice(0, 10);

async function geo() {
  const m = new Map();
  try {
    for (const r of parseCsvObjects(await readFile(GAP, 'utf8'))) {
      const a3 = (r.iso3166_1_alpha3 || '').toUpperCase();
      if (a3) m.set(a3, { name: r.name, region: REGION_4[r.world_4region] || 'Other' });
    }
  } catch {}
  return m;
}

/** Fetch one GHO indicator → latest both-sexes value per country, ignoring
 *  future projections (WHO modelled series run to 2030 — keep actuals only). */
async function ghoLatest(code, maxYear = 2022) {
  const url = `${API}/${code}?$filter=SpatialDimType eq 'COUNTRY' and Dim1 eq 'SEX_BTSX'`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GHO ${code}: ${res.status}`);
  const rows = (await res.json()).value || [];
  const latest = new Map(); // iso3 -> {year, value}
  for (const r of rows) {
    if (r.NumericValue == null || r.TimeDim > maxYear) continue;
    const iso = r.SpatialDim, year = r.TimeDim;
    const cur = latest.get(iso);
    if (!cur || year > cur.year) latest.set(iso, { year, value: r.NumericValue });
  }
  return latest;
}

async function emit(slug, code, meta, g) {
  let latest;
  try { latest = await ghoLatest(code); } catch (e) { console.warn(`– ${slug}: ${e.message}; skipped.`); return; }
  const data = [...latest.entries()].map(([iso, { year, value }]) => {
    const info = g.get(iso);
    return { entity: info?.name || iso, group: info?.region || 'Other', period: String(year), value: round(value, 2), iso };
  });
  await writeDataset('macro', slug, { ...meta, parsedAt: PARSED }, data);
}

async function main() {
  const g = await geo();
  await emit('who-alcohol', 'SA_0000001688', {
    title: 'Alcohol Consumption per Capita', valueLabel: 'Litres of pure alcohol per person (15+)', unit: 'litres', changeMode: 'pct', topic: 'health',
    summary: 'Total recorded + unrecorded alcohol consumption per person aged 15+, in litres of pure alcohol. WHO Global Health Observatory.',
    source: 'WHO Global Health Observatory', license: 'CC BY-NC-SA 3.0 IGO', url: 'https://www.who.int/data/gho',
  }, g);
  await emit('who-tobacco', 'M_Est_tob_curr_std', {
    title: 'Tobacco Use Prevalence', valueLabel: 'Age-standardised current tobacco use (15+)', unit: '%', changeMode: 'pp', topic: 'health',
    summary: 'Age-standardised prevalence of current tobacco use among people aged 15+, both sexes. WHO Global Health Observatory.',
    source: 'WHO Global Health Observatory', license: 'CC BY-NC-SA 3.0 IGO', url: 'https://www.who.int/data/gho',
  }, g);
  console.log('✓ WHO GHO: datasets written');
}
main();
