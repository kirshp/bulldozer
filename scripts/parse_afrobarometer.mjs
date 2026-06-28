/**
 * Afrobarometer Round 9 → country-level attitude indicators (weighted %),
 * from a Python pre-step that writes afrobarometer.csv
 * (country, dem_pref, trust_pres, is_democracy).
 *   node scripts/parse_afrobarometer.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { REGION_4, writeDataset, round } from './lib/datasets.mjs';

const CSV = process.env.AFRO_CSV ||
  '/private/tmp/claude-501/-Users-kirillshpara/025d8691-cfe3-48e0-a982-db40cbef8a62/scratchpad/afrobarometer.csv';
const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const PERIOD = '2023';

const ALIAS = {
  'cabo verde': 'CPV', 'congo-brazzaville': 'COG', "côte d'ivoire": 'CIV', 'eswatini': 'SWZ',
  'tanzania': 'TZA', 'the gambia': 'GMB', 'gambia': 'GMB', 'são tomé and príncipe': 'STP',
};

const DIMS = [
  { col: 'dem_pref', slug: 'afro-democracy-support', title: 'Support for Democracy (Afrobarometer)', valueLabel: 'Democracy preferable', summary: 'Share who say democracy is preferable to any other kind of government.' },
  { col: 'trust_pres', slug: 'afro-trust-president', title: 'Trust in the President (Afrobarometer)', valueLabel: 'Trust the president', summary: 'Share who trust the president “somewhat” or “a lot”.' },
  { col: 'is_democracy', slug: 'afro-perceived-democracy', title: 'Perceived Democracy (Afrobarometer)', valueLabel: 'See country as a democracy', summary: 'Share who see their country as a democracy (with minor problems or fully).' },
];

async function geoMap() {
  const m = new Map();
  for (const r of parseCsvObjects(await readFile(GAP, 'utf8'))) {
    const a3 = (r.iso3166_1_alpha3 || '').toUpperCase();
    if (a3 && r.name) m.set(r.name.toLowerCase(), { iso: a3, region: REGION_4[r.world_4region] || 'Africa' });
  }
  return m;
}

async function main() {
  let text;
  try { text = await readFile(CSV, 'utf8'); } catch { console.warn('– Afrobarometer CSV missing (run Python pre-step); skipped.'); return; }
  const geo = await geoMap();
  const rows = [...parseCsvObjects(text)];
  const resolve = (name) => geo.get(name.toLowerCase()) || (ALIAS[name.toLowerCase()] ? { iso: ALIAS[name.toLowerCase()], region: 'Africa' } : null);

  for (const d of DIMS) {
    const data = [];
    for (const r of rows) {
      const g = resolve(r.country); const v = Number(r[d.col]);
      if (!g || r[d.col] === '' || Number.isNaN(v)) continue;
      data.push({ entity: r.country, group: g.region, period: PERIOD, value: round(v, 1), iso: g.iso });
    }
    if (!data.length) continue;
    await writeDataset('survey', d.slug, {
      title: d.title, valueLabel: d.valueLabel, unit: '%', changeMode: 'pp', topic: 'governance',
      summary: `${d.summary} Afrobarometer Round 9, ${PERIOD}.`,
      source: 'Afrobarometer (Round 9)', license: 'Afrobarometer terms — public aggregates',
      url: 'https://www.afrobarometer.org/', parsedAt: new Date().toISOString().slice(0, 10),
    }, data);
  }
  console.log(`✓ Afrobarometer → ${rows.length} countries`);
}
main().catch((e) => { console.error('✗ parse_afrobarometer failed:', e.message); process.exit(1); });
