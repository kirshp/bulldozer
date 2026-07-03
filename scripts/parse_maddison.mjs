/**
 * Maddison Project Database 2023 — long-run GDP per capita and total GDP.
 *   node scripts/parse_maddison.mjs
 * The Groningen dataverse download sits behind a bot check, so we fetch the
 * same MPD 2023 series from Our World in Data's grapher mirror (CC BY 4.0).
 * Unlike the other macro sources we keep classic Maddison benchmark years —
 * the centuries-long view is the whole point of this database.
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects, parseCsvRows } from './lib/csv.mjs';
import { REGION_4, writeDataset, round } from './lib/datasets.mjs';

const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');

/** Classic Maddison benchmarks + the last year in MPD 2023. */
const BENCHMARKS = ['1870', '1913', '1950', '1973', '1990', '2000', '2010', '2022'];

const INDICATORS = [
  { grapher: 'gdp-per-capita-maddison', slug: 'maddison-gdp-per-capita', title: 'GDP per Capita (Long Run)',
    unit: 'intl-$ (2011 prices)', dp: 0, summary: 'Output per person over 150 years, adjusted for inflation and cross-country prices.' },
  { grapher: 'gdp-maddison-project-database', slug: 'maddison-gdp', title: 'Total GDP (Long Run)',
    unit: 'intl-$ (2011 prices)', dp: 0, summary: 'Total economic output over 150 years, adjusted for inflation and cross-country prices.' },
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

async function main() {
  console.log('Maddison Project Database 2023 (via OWID) →');
  const region = await iso3Region();
  for (const cfg of INDICATORS) {
    const res = await fetch(`https://ourworldindata.org/grapher/${cfg.grapher}.csv?csvType=full&useColumnShortNames=true`);
    if (!res.ok) { console.warn(`– ${cfg.slug}: fetch failed (${res.status})`); continue; }
    const text = await res.text();
    const header = parseCsvRows(text.slice(0, text.indexOf('\n')))[0];
    const valueKey = header.find((h) => !['entity', 'code', 'year'].includes(h.toLowerCase()) && !h.includes('annotation'));

    const data = [];
    for (const r of parseCsvObjects(text)) {
      const iso = (r.code || '').toUpperCase();
      if (!/^[A-Z]{3}$/.test(iso) || !BENCHMARKS.includes(r.year)) continue;
      const v = Number(r[valueKey]);
      if (Number.isNaN(v)) continue;
      data.push({ entity: r.entity, group: region.get(iso) || 'Other', period: r.year, value: round(v, cfg.dp), iso });
    }
    if (data.length < 200) { console.warn(`– ${cfg.slug}: only ${data.length} rows, skipping`); continue; }
    await writeDataset('macro', cfg.slug, {
      title: cfg.title, summary: `${cfg.summary} Maddison Project Database 2023, benchmark years ${BENCHMARKS[0]}–${BENCHMARKS.at(-1)}.`,
      unit: cfg.unit, valueLabel: cfg.title, changeMode: 'pct', topic: 'economy',
      // 'via OWID' and not the full name — the OWID catalogue card collects
      // datasets by substring match, and these belong to the Maddison card
      source: 'Maddison Project Database 2023 (via OWID)', license: 'CC BY 4.0',
      url: 'https://www.rug.nl/ggdc/historicaldevelopment/maddison/', parsedAt: new Date().toISOString().slice(0, 10),
    }, data);
  }
}
main().catch((e) => { console.error('✗ parse_maddison failed:', e.message); process.exit(1); });
