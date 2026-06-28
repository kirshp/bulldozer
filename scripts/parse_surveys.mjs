/**
 * Parse curated public survey aggregates into BullDozer datasets:
 *  - Gapminder ddf datapoints (country-level indicators)
 *  - World Happiness Report tidy export (Cantril ladder)
 *
 *   node scripts/parse_surveys.mjs
 *   GAPMINDER_DIR=/path WHR_CSV=/path node scripts/parse_surveys.mjs
 *
 * Sources are local/curated (iCloud BK/Opros, tableau_data); output committed.
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvRows, parseCsvObjects } from './lib/csv.mjs';
import { enRegion, REGION_4, latestTwo, pickPeriods, writeDataset, round } from './lib/datasets.mjs';

const ICLOUD = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs');
const GAPMINDER_DIR = process.env.GAPMINDER_DIR || join(ICLOUD, 'BK', 'Opros', 'Inter_survey', 'Gapminder');
const WHR_CSV = process.env.WHR_CSV || join(homedir(), 'Documents', 'tableau_data', 'happiness', 'whr_tidy.csv');

const GAPMINDER_SRC = {
  source: 'Gapminder (open data, ddf)',
  license: 'CC BY 4.0',
  url: 'https://www.gapminder.org/data/',
  parsedAt: new Date().toISOString().slice(0, 10),
};

const GAPMINDER = [
  { file: 'ddf--datapoints--hdi_human_development_index--by--geo--time.csv',
    slug: 'gapminder-hdi', title: 'Human Development Index', unit: 'index 0–1', valueLabel: 'HDI', changeMode: 'pp', dp: 3,
    summary: 'Composite index of life expectancy, education and income (0–1).' },
  { file: 'ddf--datapoints--life_expectancy_at_birth_data_from_ihme--by--geo--time.csv',
    slug: 'gapminder-life-expectancy', title: 'Life Expectancy', unit: 'years', valueLabel: 'Life expectancy at birth', changeMode: 'pp', dp: 1,
    summary: 'Average number of years a newborn is expected to live (IHME).' },
  { file: 'ddf--datapoints--literacy_rate_adult_total_percent_of_people_ages_15_and_above--by--geo--time.csv',
    slug: 'gapminder-literacy', title: 'Adult Literacy', unit: '%', valueLabel: 'Adult literacy rate', changeMode: 'pp', dp: 1,
    summary: 'Share of people aged 15+ who can read and write.' },
  { file: 'ddf--datapoints--inequality_index_gini--by--geo--time.csv',
    slug: 'gapminder-gini', title: 'Income Inequality (Gini)', unit: 'index 0–100', valueLabel: 'Gini index', changeMode: 'pp', dp: 1,
    summary: 'Gini index of income inequality (0 = equal, 100 = unequal).' },
  { file: 'ddf--datapoints--internet_users--by--geo--time.csv',
    slug: 'gapminder-internet', title: 'Internet Users', unit: '%', valueLabel: 'Internet users', changeMode: 'pp', dp: 1,
    summary: 'Share of the population using the internet.' },
  { file: 'ddf--datapoints--income_per_person_with_projections--by--geo--time.csv',
    slug: 'gapminder-income', title: 'Income per Person', unit: 'int$', valueLabel: 'GDP/capita PPP', changeMode: 'pct', dp: 0,
    summary: 'GDP per capita, PPP, inflation-adjusted international dollars.' },
];

async function loadGeoMap() {
  const text = await readFile(join(GAPMINDER_DIR, 'ddf--entities--geo--country.csv'), 'utf8');
  const map = new Map();
  for (const row of parseCsvObjects(text)) {
    if (row['is--country'] !== 'TRUE') continue;
    map.set(row.country, {
      name: row.name || row.country,
      region: REGION_4[row.world_4region] || 'Other',
    });
  }
  return map;
}

async function parseGapminder(geoMap) {
  for (const cfg of GAPMINDER) {
    let text;
    try {
      text = await readFile(join(GAPMINDER_DIR, cfg.file), 'utf8');
    } catch {
      console.log(`  – ${cfg.slug}: source missing, skipped`);
      continue;
    }
    const header = parseCsvRows(text.slice(0, text.indexOf('\n')))[0];
    const valueKey = header.find((h) => h !== 'geo' && h !== 'time');

    // geo → year → value, plus coverage count per year
    const byGeo = new Map();
    const yearCounts = new Map();
    for (const row of parseCsvObjects(text)) {
      if (!geoMap.has(row.geo)) continue;
      const v = Number(row[valueKey]);
      if (Number.isNaN(v)) continue;
      yearCounts.set(row.time, (yearCounts.get(row.time) ?? 0) + 1);
      let rec = byGeo.get(row.geo);
      if (!rec) byGeo.set(row.geo, (rec = {}));
      rec[row.time] = v;
    }
    const [prev, curr] = pickPeriods(yearCounts);
    if (!prev || !curr) {
      console.log(`  – ${cfg.slug}: not enough years, skipped`);
      continue;
    }

    const data = [];
    for (const [geo, rec] of byGeo) {
      const g = geoMap.get(geo);
      for (const period of [prev, curr]) {
        if (rec[period] == null) continue;
        data.push({ entity: g.name, group: g.region, period, value: round(rec[period], cfg.dp) });
      }
    }
    await writeDataset('survey', cfg.slug, {
      title: cfg.title,
      summary: `${cfg.summary} Gapminder, ${prev}–${curr}.`,
      unit: cfg.unit,
      valueLabel: cfg.valueLabel,
      changeMode: cfg.changeMode,
      ...GAPMINDER_SRC,
    }, data);
  }
}

async function parseWHR() {
  let text;
  try {
    text = await readFile(WHR_CSV, 'utf8');
  } catch {
    console.log('  – whr-happiness: source missing, skipped');
    return;
  }
  const byCountry = new Map();
  const years = new Set();
  for (const row of parseCsvObjects(text)) {
    if (row.indicator_code !== 'Ladder') continue;
    const v = Number(row.value);
    if (Number.isNaN(v)) continue;
    years.add(row.year);
    let rec = byCountry.get(row.country);
    if (!rec) byCountry.set(row.country, (rec = { region: enRegion(row.region), byYear: {} }));
    rec.byYear[row.year] = v;
  }
  const [prev, curr] = latestTwo([...years]);
  if (!prev || !curr) {
    console.log('  – whr-happiness: not enough years, skipped');
    return;
  }
  const data = [];
  for (const [country, rec] of byCountry) {
    for (const period of [prev, curr]) {
      if (rec.byYear[period] == null) continue;
      data.push({ entity: country, group: rec.region, period, value: round(rec.byYear[period], 3) });
    }
  }
  await writeDataset('survey', 'whr-happiness', {
    title: 'Happiness (Cantril Ladder)',
    summary: `Self-reported life evaluation on a 0–10 ladder. World Happiness Report, ${prev}–${curr}.`,
    unit: 'score 0–10',
    valueLabel: 'Life evaluation',
    changeMode: 'pp',
    source: 'World Happiness Report (Gallup World Poll)',
    license: 'CC BY 4.0',
    url: 'https://worldhappiness.report/',
    parsedAt: new Date().toISOString().slice(0, 10),
  }, data);
}

async function main() {
  console.log('Surveys → Gapminder + World Happiness Report');
  let geoMap;
  try {
    geoMap = await loadGeoMap();
  } catch {
    console.error(`✗ Gapminder entities not found in ${GAPMINDER_DIR}. Skipping Gapminder.`);
    geoMap = new Map();
  }
  if (geoMap.size) await parseGapminder(geoMap);
  await parseWHR();
}

main().catch((err) => {
  console.error('✗ parse_surveys failed:', err.message);
  process.exit(1);
});
