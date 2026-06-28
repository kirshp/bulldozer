/**
 * Caucasus Barometer (CRRC) — South Caucasus only (Armenia, Azerbaijan,
 * Georgia). We use the 2013 Regional wave because it is the last one that
 * still includes Azerbaijan. Clearly scoped as a regional set — the honest
 * vintage/scope note lives in src/data/methodology.ts (cb-).
 * Python pre-step (cb_agg.py) writes cb_agg.csv:
 *   iso3,name,trust_army,trust_police,trust_eu,life_satisfaction
 *   python3 scratchpad/cb_agg.py CB_2013_Regional_dataset.sav scratchpad/cb_agg.csv
 *   node scripts/parse_caucasus.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { REGION_4, writeDataset } from './lib/datasets.mjs';

const CSV = process.env.CB_CSV ||
  '/private/tmp/claude-501/-Users-kirillshpara/025d8691-cfe3-48e0-a982-db40cbef8a62/scratchpad/cb_agg.csv';
const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const PERIOD = '2013';
const COMMON = {
  source: 'Caucasus Barometer (CRRC)', license: 'CRRC terms — public aggregates',
  url: 'https://caucasusbarometer.org/', parsedAt: new Date().toISOString().slice(0, 10),
};

async function region() {
  const m = new Map();
  try {
    for (const r of parseCsvObjects(await readFile(GAP, 'utf8'))) {
      const a3 = (r.iso3166_1_alpha3 || '').toUpperCase();
      if (a3) m.set(a3, REGION_4[r.world_4region] || 'Other');
    }
  } catch {}
  return m;
}

async function main() {
  let text;
  try { text = await readFile(CSV, 'utf8'); } catch { console.warn('– Caucasus Barometer CSV missing (run Python pre-step); skipped.'); return; }
  const reg = await region();
  const rows = [...parseCsvObjects(text)];
  const build = (col) => rows
    .filter((r) => r[col] !== undefined && r[col] !== '')
    .map((r) => ({ entity: r.name, group: reg.get(r.iso3.toUpperCase()) || 'Other', period: PERIOD, value: Number(r[col]), iso: r.iso3.toUpperCase() }))
    .filter((o) => o.iso && Number.isFinite(o.value));

  await writeDataset('survey', 'cb-trust-army', {
    title: 'Trust in the Army (S. Caucasus)', valueLabel: 'Share who trust the army', unit: '%', changeMode: 'pp', topic: 'attitudes',
    summary: 'Share who somewhat or fully trust the army. Caucasus Barometer 2013 — Armenia, Azerbaijan, Georgia.', ...COMMON,
  }, build('trust_army'));

  await writeDataset('survey', 'cb-trust-police', {
    title: 'Trust in the Police (S. Caucasus)', valueLabel: 'Share who trust the police', unit: '%', changeMode: 'pp', topic: 'attitudes',
    summary: 'Share who somewhat or fully trust the police. Caucasus Barometer 2013 — Armenia, Azerbaijan, Georgia.', ...COMMON,
  }, build('trust_police'));

  await writeDataset('survey', 'cb-trust-eu', {
    title: 'Trust in the EU (S. Caucasus)', valueLabel: 'Share who trust the European Union', unit: '%', changeMode: 'pp', topic: 'attitudes',
    summary: 'Share who somewhat or fully trust the European Union. Caucasus Barometer 2013 — Armenia, Azerbaijan, Georgia.', ...COMMON,
  }, build('trust_eu'));

  await writeDataset('survey', 'cb-life-satisfaction', {
    title: 'Life Satisfaction (S. Caucasus)', valueLabel: 'Mean life satisfaction (1–10)', unit: 'index 1–10', changeMode: 'pp', topic: 'wellbeing',
    summary: 'Mean overall life satisfaction on a 1–10 scale. Caucasus Barometer 2013 — Armenia, Azerbaijan, Georgia.', ...COMMON,
  }, build('life_satisfaction'));

  console.log('✓ Caucasus Barometer: 4 datasets written');
}
main();
