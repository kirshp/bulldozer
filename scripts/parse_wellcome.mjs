/**
 * Wellcome Global Monitor 2018 (Gallup) — trust in science & vaccine attitudes,
 * 143 countries. The source is the public crosstabs workbook, which already
 * gives weighted Column N % per response; a Python pre-step (wgm_agg.py) sums
 * the positive responses per country and maps names → ISO3 (pycountry):
 *   iso3,name,trust_science,trust_scientists,vacc_safe,vacc_effective
 *   python3 scratchpad/wgm_agg.py wgm2018_crosstabs_all_countries.xlsx scratchpad/wgm_agg.csv
 *   node scripts/parse_wellcome.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { gapminderRows, REGION_4, writeDataset } from './lib/datasets.mjs';

const CSV = process.env.WGM_CSV ||
  '/private/tmp/claude-501/-Users-kirillshpara/025d8691-cfe3-48e0-a982-db40cbef8a62/scratchpad/wgm_agg.csv';
const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const PERIOD = '2018';
const COMMON = {
  source: 'Wellcome Global Monitor 2018 (Gallup)', license: 'CC BY 4.0',
  url: 'https://wellcome.org/reports/wellcome-global-monitor/2018', parsedAt: new Date().toISOString().slice(0, 10),
};

async function region() {
  const m = new Map();
  try {
    for (const r of await gapminderRows()) {
      const a3 = (r.iso3166_1_alpha3 || '').toUpperCase();
      if (a3) m.set(a3, REGION_4[r.world_4region] || 'Other');
    }
  } catch {}
  return m;
}

async function main() {
  let text;
  try { text = await readFile(CSV, 'utf8'); } catch { console.warn('– Wellcome CSV missing (run Python pre-step); skipped.'); return; }
  const reg = await region();
  const rows = [...parseCsvObjects(text)];
  const build = (col) => rows
    .filter((r) => r[col] !== undefined && r[col] !== '')
    .map((r) => ({ entity: r.name, group: reg.get(r.iso3.toUpperCase()) || 'Other', period: PERIOD, value: Number(r[col]), iso: r.iso3.toUpperCase() }))
    .filter((o) => o.iso && Number.isFinite(o.value));

  await writeDataset('survey', 'wgm-trust-science', {
    title: 'Trust in Science', valueLabel: 'Share who trust science a lot or some', unit: '%', changeMode: 'pp', topic: 'attitudes',
    summary: 'Share who say they trust science a lot or some. Wellcome Global Monitor 2018.', ...COMMON,
  }, build('trust_science'));

  await writeDataset('survey', 'wgm-trust-scientists', {
    title: 'Trust in Scientists', valueLabel: 'Share who trust scientists a lot or some', unit: '%', changeMode: 'pp', topic: 'attitudes',
    summary: 'Share who say they trust scientists in their country a lot or some. Wellcome Global Monitor 2018.', ...COMMON,
  }, build('trust_scientists'));

  await writeDataset('survey', 'wgm-vaccines-safe', {
    title: 'Believe Vaccines Are Safe', valueLabel: 'Share who agree vaccines are safe', unit: '%', changeMode: 'pp', topic: 'health',
    summary: 'Share who strongly or somewhat agree that vaccines are safe. Wellcome Global Monitor 2018.', ...COMMON,
  }, build('vacc_safe'));

  await writeDataset('survey', 'wgm-vaccines-effective', {
    title: 'Believe Vaccines Are Effective', valueLabel: 'Share who agree vaccines are effective', unit: '%', changeMode: 'pp', topic: 'health',
    summary: 'Share who strongly or somewhat agree that vaccines are effective. Wellcome Global Monitor 2018.', ...COMMON,
  }, build('vacc_effective'));

  console.log('✓ Wellcome Global Monitor: 4 datasets written');
}
main();
