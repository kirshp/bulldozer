/**
 * World Risk Poll 2023 (Gallup / Lloyd's Register Foundation) — additional
 * country-level indicators beyond the Resilience Index already on the site.
 * Python pre-step (wrp_extra.py) reads 23_wrp.sav, computes weighted shares
 * (by WGT) and writes wrp_extra.csv: iso3,name,year,climate_threat,worry_crime,
 * disaster_exp,can_protect,discrim_skin.
 *   python3 scratchpad/wrp_extra.py 23_wrp.sav scratchpad/wrp_extra.csv
 *   node scripts/parse_wrp_extra.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { REGION_4, writeDataset } from './lib/datasets.mjs';

const CSV = process.env.WRP_EXTRA_CSV ||
  '/private/tmp/claude-501/-Users-kirillshpara/025d8691-cfe3-48e0-a982-db40cbef8a62/scratchpad/wrp_extra.csv';
const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const PERIOD = '2023';
const COMMON = {
  source: 'World Risk Poll (Lloyd’s Register Foundation / Gallup)',
  license: 'CC BY 4.0', url: 'https://wrp.lrfoundation.org.uk/', parsedAt: new Date().toISOString().slice(0, 10),
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
  try { text = await readFile(CSV, 'utf8'); } catch { console.warn('– WRP extra CSV missing (run Python pre-step); skipped.'); return; }
  const reg = await region();
  const rows = [...parseCsvObjects(text)];
  const build = (col) => rows
    .filter((r) => r[col] !== undefined && r[col] !== '')
    .map((r) => ({ entity: r.name, group: reg.get(r.iso3.toUpperCase()) || 'Other', period: PERIOD, value: Number(r[col]), iso: r.iso3.toUpperCase() }))
    .filter((o) => o.iso && Number.isFinite(o.value));

  await writeDataset('survey', 'wrp-climate-threat', {
    title: 'Climate Seen as a Threat', valueLabel: 'Share calling climate change a threat to their country', unit: '%', changeMode: 'pp', topic: 'environment',
    summary: 'Share who see climate change as a very or somewhat serious threat to their country in the next 20 years. World Risk Poll 2023.', ...COMMON,
  }, build('climate_threat'));

  await writeDataset('survey', 'wrp-worry-crime', {
    title: 'Worry About Violent Crime', valueLabel: 'Share worried violent crime could seriously harm them', unit: '%', changeMode: 'pp', topic: 'safety',
    summary: 'Share who are very or somewhat worried that violent crime could cause them serious harm. World Risk Poll 2023.', ...COMMON,
  }, build('worry_crime'));

  await writeDataset('survey', 'wrp-disaster-experienced', {
    title: 'Experienced a Disaster', valueLabel: 'Share who experienced a disaster in the past 5 years', unit: '%', changeMode: 'pp', topic: 'risk',
    summary: 'Share who report having personally experienced a disaster in their country in the past five years. World Risk Poll 2023.', ...COMMON,
  }, build('disaster_exp'));

  await writeDataset('survey', 'wrp-can-protect', {
    title: 'Confident Can Protect Family', valueLabel: 'Share confident they could protect their family in a disaster', unit: '%', changeMode: 'pp', topic: 'risk',
    summary: 'Share who believe they could protect themselves or their family in a future disaster. World Risk Poll 2023.', ...COMMON,
  }, build('can_protect'));

  await writeDataset('survey', 'wrp-discrimination', {
    title: 'Experienced Discrimination (Skin Colour)', valueLabel: 'Share who experienced discrimination due to skin colour', unit: '%', changeMode: 'pp', topic: 'safety',
    summary: 'Share who report having experienced discrimination because of the colour of their skin. World Risk Poll 2023.', ...COMMON,
  }, build('discrim_skin'));

  console.log('✓ WRP extra: 5 datasets written');
}
main();
