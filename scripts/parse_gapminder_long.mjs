/**
 * Long historical Gapminder series for the bubble chart / bar race:
 *  - income per person (PPP), 1800→2018
 *  - life expectancy at birth (IHME), 1990→2013
 * From the local DDF datapoint files; geo→ISO3/name/region via the entities file.
 *   node scripts/parse_gapminder_long.mjs
 */
import { readFile, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { REGION_4, writeDataset } from './lib/datasets.mjs';

const DIR = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder');
const PARSED = new Date().toISOString().slice(0, 10);
const COMMON = { source: 'Gapminder', license: 'CC BY 4.0', url: 'https://www.gapminder.org/data/', parsedAt: PARSED };

async function geoMap() {
  const m = new Map();
  for (const r of parseCsvObjects(await readFile(join(DIR, 'ddf--entities--geo--country.csv'), 'utf8'))) {
    const iso = (r.iso3166_1_alpha3 || '').toUpperCase();
    if (r.country && iso) m.set(r.country.toLowerCase(), { iso, name: r.name, region: REGION_4[r.world_4region] || 'Other' });
  }
  return m;
}

/** Parse a DDF datapoints file → observations, dropping years before `minYear`. */
async function ddf(file, measure, geo, minYear) {
  const rows = [];
  for (const r of parseCsvObjects(await readFile(join(DIR, file), 'utf8'))) {
    const g = geo.get((r.geo || '').toLowerCase());
    const year = Number(r.time), v = Number(r[measure]);
    if (!g || !year || year < minYear || Number.isNaN(v)) continue;
    rows.push({ entity: g.name, group: g.region, period: String(year), value: v, iso: g.iso });
  }
  return rows;
}

async function main() {
  const geo = await geoMap();

  const income = await ddf('ddf--datapoints--income_per_person_with_projections--by--geo--time.csv', 'income_per_person_with_projections', geo, 1800);
  await writeDataset('macro', 'gapminder-income', {
    title: 'Income per Person', valueLabel: 'GDP per capita, PPP (constant intl$)', unit: 'intl$', changeMode: 'pct', topic: 'economy',
    summary: 'Income per person — GDP per capita adjusted for inflation and price differences (PPP), the long Gapminder series back to 1800. Great for the bubble chart and bar race.', ...COMMON,
  }, income);
  console.log(`✓ gapminder-income: ${income.length} obs, ${new Set(income.map((o) => o.period)).size} years`);

  const life = await ddf('ddf--datapoints--life_expectancy_at_birth_data_from_ihme--by--geo--time.csv', 'life_expectancy_at_birth_data_from_ihme', geo, 1990);
  // overwrite the existing short life-expectancy with the longer IHME series (single registry file)
  try { await unlink(join(homedir(), 'Projects', 'bulldozer', 'src', 'data', 'surveys', 'gapminder-life-expectancy.json')); } catch {}
  await writeDataset('macro', 'gapminder-life-expectancy', {
    title: 'Life Expectancy', valueLabel: 'Life expectancy at birth (years)', unit: 'years', changeMode: 'pp', topic: 'health',
    summary: 'Life expectancy at birth, in years (IHME), 1990–2013. Pairs with income on the bubble chart.', ...COMMON,
  }, life);
  console.log(`✓ gapminder-life-expectancy: ${life.length} obs, ${new Set(life.map((o) => o.period)).size} years`);
}
main();
