/**
 * Eurostat open aggregates — EU-SILC (poverty, deprivation) and EHIS (obesity,
 * smoking). Microdata for both is research-access only; the aggregate country
 * indicators are fully open via the dissemination API (JSON-stat, no key).
 *   node scripts/parse_eurostat.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { REGION_4, pickPeriodsN, writeDataset, round } from './lib/datasets.mjs';

const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const REF_YEAR = new Date().getFullYear();

/** Eurostat geo (mostly ISO2, but EL/UK) → ISO3. Aggregates (EU*, EA*) and XK are skipped. */
const GEO_ISO3 = {
  BE: 'BEL', BG: 'BGR', CZ: 'CZE', DK: 'DNK', DE: 'DEU', EE: 'EST', IE: 'IRL', EL: 'GRC',
  ES: 'ESP', FR: 'FRA', HR: 'HRV', IT: 'ITA', CY: 'CYP', LV: 'LVA', LT: 'LTU', LU: 'LUX',
  HU: 'HUN', MT: 'MLT', NL: 'NLD', AT: 'AUT', PL: 'POL', PT: 'PRT', RO: 'ROU', SI: 'SVN',
  SK: 'SVK', FI: 'FIN', SE: 'SWE', IS: 'ISL', NO: 'NOR', CH: 'CHE', UK: 'GBR', ME: 'MNE',
  MK: 'MKD', AL: 'ALB', RS: 'SRB', TR: 'TUR', BA: 'BIH', MD: 'MDA', UA: 'UKR', GE: 'GEO',
};

const INDICATORS = [
  { code: 'ilc_li02', slug: 'silc-poverty-risk', title: 'At-Risk-of-Poverty Rate',
    filters: { unit: 'PC', rskpovth: 'B_60', statinfo: 'MED_EI', sex: 'T', age: 'TOTAL' },
    study: 'EU-SILC', topic: 'economy',
    summary: 'Share of people with disposable income below 60% of the national median.' },
  { code: 'ilc_mdsd11', slug: 'silc-deprivation', title: 'Severe Material & Social Deprivation',
    filters: { unit: 'PC', sex: 'T', age: 'TOTAL' },
    study: 'EU-SILC', topic: 'economy',
    summary: 'Share of people unable to afford at least 7 of 13 essential items and activities.' },
  { code: 'hlth_ehis_bm1e', slug: 'ehis-obesity', title: 'Obesity (BMI ≥ 30)',
    filters: { unit: 'PC', bmi: 'BMI_GE30', isced11: 'TOTAL', sex: 'T', age: 'TOTAL' },
    study: 'EHIS', topic: 'health',
    summary: 'Share of adults with a body mass index of 30 or more.' },
  { code: 'hlth_ehis_sk3e', slug: 'ehis-smoking', title: 'Daily Cigarette Smokers',
    filters: { unit: 'PC', smoking: 'TOTAL', isced11: 'TOTAL', sex: 'T', age: 'TOTAL' },
    study: 'EHIS', topic: 'health',
    summary: 'Share of adults who smoke cigarettes every day.' },
];

async function iso3Region() {
  const m = new Map();
  try {
    for (const r of parseCsvObjects(await readFile(GAP, 'utf8'))) {
      const a3 = (r.iso3166_1_alpha3 || '').toUpperCase();
      if (a3) m.set(a3, REGION_4[r.world_4region] || 'Other');
    }
  } catch {}
  return m;
}

/** Flatten a JSON-stat response where every dimension except geo and time is fixed. */
function* observations(js) {
  const dims = js.id;
  const size = js.size;
  const geoIdx = dims.indexOf('geo');
  const timeIdx = dims.indexOf('time');
  const geoCat = js.dimension.geo.category;
  const timeCat = js.dimension.time.category;
  const geos = Object.entries(geoCat.index); // [code, position]
  const times = Object.entries(timeCat.index);
  // stride of a dimension = product of sizes of all dimensions after it
  const stride = dims.map((_, i) => size.slice(i + 1).reduce((a, b) => a * b, 1));
  for (const [geo, gi] of geos) for (const [time, ti] of times) {
    const flat = gi * stride[geoIdx] + ti * stride[timeIdx];
    const v = js.value[flat];
    if (v == null) continue;
    yield { geo, name: geoCat.label[geo], time, value: v };
  }
}

async function main() {
  console.log('Eurostat (EU-SILC + EHIS) →');
  const region = await iso3Region();
  for (const cfg of INDICATORS) {
    const qs = new URLSearchParams({ format: 'JSON', lang: 'EN', ...cfg.filters });
    const res = await fetch(`${API}/${cfg.code}?${qs}`);
    if (!res.ok) { console.warn(`– ${cfg.slug}: fetch failed (${res.status})`); continue; }
    const js = await res.json();
    // every requested dimension must have collapsed to one category
    for (const k of Object.keys(cfg.filters)) {
      const n = Object.keys(js.dimension[k].category.index).length;
      if (n !== 1) throw new Error(`${cfg.code}: dimension ${k} has ${n} categories, expected 1`);
    }
    const byIso = new Map(); const yearCounts = new Map();
    for (const o of observations(js)) {
      const iso = GEO_ISO3[o.geo];
      if (!iso) continue; // EU/EA aggregates, Kosovo
      let rec = byIso.get(iso); if (!rec) byIso.set(iso, rec = { name: o.name.replace(/\s*\(.*$/, ''), byYear: {} });
      rec.byYear[o.time] = o.value;
      yearCounts.set(o.time, (yearCounts.get(o.time) ?? 0) + 1);
    }
    const periods = pickPeriodsN(yearCounts, 8, REF_YEAR);
    if (!periods.length) { console.warn(`– ${cfg.slug}: no usable years`); continue; }
    const data = [];
    for (const [iso, rec] of byIso) for (const p of periods) {
      if (rec.byYear[p] == null) continue;
      data.push({ entity: rec.name, group: region.get(iso) || 'Europe', period: p, value: round(rec.byYear[p], 1), iso });
    }
    await writeDataset('macro', cfg.slug, {
      title: cfg.title, summary: `${cfg.summary} Eurostat ${cfg.study}, ${periods[0]}–${periods.at(-1)}.`,
      unit: '%', valueLabel: cfg.title, changeMode: 'pp', topic: cfg.topic,
      source: `Eurostat — ${cfg.study}`, license: 'CC BY 4.0 (Eurostat reuse policy)',
      url: `https://ec.europa.eu/eurostat/databrowser/view/${cfg.code}/default/table`, parsedAt: new Date().toISOString().slice(0, 10),
    }, data);
  }
}
main().catch((e) => { console.error('✗ parse_eurostat failed:', e.message); process.exit(1); });
