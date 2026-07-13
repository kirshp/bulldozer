/**
 * European Social Survey → country-level indicators (weighted means, 0–10),
 * from a Python pre-step that writes ess.csv (iso2, trust_people, life_sat,
 * dem_sat, trust_parl). Pooled recent rounds.
 *   node scripts/parse_ess.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { gapminderRows, REGION_4, writeDataset, round } from './lib/datasets.mjs';

const CSV = process.env.ESS_CSV ||
  '/private/tmp/claude-501/-Users-kirillshpara/025d8691-cfe3-48e0-a982-db40cbef8a62/scratchpad/ess.csv';
const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const PERIOD = '2023';

const DIMS = [
  { col: 'trust_people', slug: 'ess-trust-people', title: 'Trust in People (ESS)', valueLabel: 'Most people can be trusted (0–10)', topic: 'attitudes', summary: 'Mean generalised social trust on a 0–10 scale.' },
  { col: 'dem_sat', slug: 'ess-democracy-satisfaction', title: 'Satisfaction with Democracy (ESS)', valueLabel: 'Satisfied with how democracy works (0–10)', topic: 'governance', summary: 'Mean satisfaction with the way democracy works in the country (0–10).' },
];

async function alpha2Map() {
  const m = new Map();
  for (const r of await gapminderRows()) {
    const a2 = (r.iso3166_1_alpha2 || '').toUpperCase(), a3 = (r.iso3166_1_alpha3 || '').toUpperCase();
    if (a2 && a3) m.set(a2, { iso: a3, name: r.name || a2, region: REGION_4[r.world_4region] || 'Europe' });
  }
  return m;
}

async function main() {
  let text;
  try { text = await readFile(CSV, 'utf8'); } catch { console.warn('– ESS CSV missing (run Python pre-step); skipped.'); return; }
  const geo = await alpha2Map();
  const rows = [...parseCsvObjects(text)];
  for (const d of DIMS) {
    const data = [];
    for (const r of rows) {
      const g = geo.get((r.iso2 || '').toUpperCase()); const v = Number(r[d.col]);
      if (!g || r[d.col] === '' || Number.isNaN(v)) continue;
      data.push({ entity: g.name, group: g.region, period: PERIOD, value: round(v, 2), iso: g.iso });
    }
    if (!data.length) continue;
    await writeDataset('survey', d.slug, {
      title: d.title, valueLabel: d.valueLabel, unit: 'mean 0–10', changeMode: 'pp', topic: d.topic,
      summary: `${d.summary} European Social Survey, pooled recent rounds.`,
      source: 'European Social Survey', license: 'ESS terms — public aggregates',
      url: 'https://www.europeansocialsurvey.org/', parsedAt: new Date().toISOString().slice(0, 10),
    }, data);
  }
  console.log(`✓ ESS → ${rows.length} countries`);
}
main().catch((e) => { console.error('✗ parse_ess failed:', e.message); process.exit(1); });
