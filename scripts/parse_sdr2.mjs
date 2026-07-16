/**
 * SDR2 — Survey Data Recycling (harmonized meta-base of 22 survey projects,
 * 4.4M respondents, pooled to ~2017). Python pre-step (sdr2_agg.py) reads the
 * 1 GB MASTER.sav, keeps only the target columns and writes a weighted
 * country-level CSV: iso2,name,trgov,trparl,trparty,trleg,petition,demonst,union,n.
 *   python3 scratchpad/sdr2_agg.py MASTER.sav scratchpad/sdr2_agg.csv
 *   node scripts/parse_sdr2.mjs
 * We publish only concepts the site doesn't already cover (institutional trust
 * + political participation), so there's no double-sourcing of trust-in-people
 * (ESS) or satisfaction-with-democracy (ESS).
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { gapminderRows, REGION_4, writeDataset } from './lib/datasets.mjs';

const CSV = process.env.SDR2_CSV ||
  '/private/tmp/claude-501/-Users-kirillshpara/025d8691-cfe3-48e0-a982-db40cbef8a62/scratchpad/sdr2_agg.csv';
const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const ALPHA2 = join(homedir(), 'Projects', 'bulldozer', 'src', 'data', 'iso-alpha2.json');
const PERIOD = '2017'; // synthetic; honest vintage lives in src/data/methodology.ts (sdr2-)
const PARSED = new Date().toISOString().slice(0, 10);

async function geo() {
  // alpha2 -> { iso3, region } from the project's alpha3->alpha2 table + Gapminder regions.
  const a3a2 = JSON.parse(await readFile(ALPHA2, 'utf8'));
  const a2toa3 = Object.fromEntries(Object.entries(a3a2).map(([a3, a2]) => [a2, a3]));
  const region = new Map();
  try {
    for (const r of await gapminderRows()) {
      const a3 = (r.iso3166_1_alpha3 || '').toUpperCase();
      if (a3) region.set(a3, REGION_4[r.world_4region] || 'Other');
    }
  } catch {}
  return { a2toa3, region };
}

const COMMON = {
  source: 'SDR2 — Survey Data Recycling (Harvard Dataverse)',
  license: 'SDR2 terms — public aggregates', url: 'https://dataharmonization.org/', parsedAt: PARSED,
};

async function main() {
  let text;
  try { text = await readFile(CSV, 'utf8'); } catch { console.warn('– SDR2 CSV missing (run Python pre-step); skipped.'); return; }
  const { a2toa3, region } = await geo();
  const rows = [...parseCsvObjects(text)];

  const build = (col) => rows
    .filter((r) => r[col] !== undefined && r[col] !== '') // pandas writes NaN as empty → genuine missing
    .map((r) => {
      const iso = (a2toa3[r.iso2] || '').toUpperCase();
      return { entity: r.name, group: region.get(iso) || 'Other', period: PERIOD, value: Number(r[col]), iso };
    })
    .filter((o) => o.iso && Number.isFinite(o.value));

  const trust = (slug, col, what) => writeDataset('survey', slug, {
    title: `Trust in ${what}`, valueLabel: `Mean trust (0 distrust ↔ 10 full trust)`, unit: 'index 0–10', changeMode: 'pp', topic: 'attitudes',
    summary: `Average trust in ${what} on a 0–10 scale, harmonized across survey projects. SDR2 pooled waves.`, ...COMMON,
  }, build(col));

  await trust('sdr2-trust-government', 'trgov', 'government');
  await trust('sdr2-trust-parliament', 'trparl', 'parliament');
  await trust('sdr2-trust-parties', 'trparty', 'political parties');
  await trust('sdr2-trust-legal', 'trleg', 'the legal system');

  await writeDataset('survey', 'sdr2-petition', {
    title: 'Signed a Petition', valueLabel: 'Share who have signed a petition', unit: '%', changeMode: 'pp', topic: 'attitudes',
    summary: 'Share of adults who report having signed a petition, harmonized across survey projects. SDR2 pooled waves.', ...COMMON,
  }, build('petition'));

  await writeDataset('survey', 'sdr2-demonstration', {
    title: 'Attended a Demonstration', valueLabel: 'Share who have demonstrated', unit: '%', changeMode: 'pp', topic: 'attitudes',
    summary: 'Share of adults who report having taken part in a lawful demonstration, harmonized across survey projects. SDR2 pooled waves.', ...COMMON,
  }, build('demonst'));

  await writeDataset('survey', 'sdr2-union-membership', {
    title: 'Trade Union Membership', valueLabel: 'Share who are union members', unit: '%', changeMode: 'pp', topic: 'attitudes',
    summary: 'Share of adults who are currently members of a trade union, harmonized across survey projects. SDR2 pooled waves.', ...COMMON,
  }, build('union'));

  console.log('✓ SDR2: 7 datasets written');
}
main();
