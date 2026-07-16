/**
 * PISA — mean student performance in mathematics, science and reading.
 *   node scripts/parse_pisa.mjs
 * Fetched from Our World in Data's unified `academic-performance` grapher
 * (subject picked via query parameter); underlying data is the OECD PISA
 * study, triennial waves since 2000.
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects, parseCsvRows } from './lib/csv.mjs';
import { gapminderRows, REGION_4, writeDataset, pickPeriodsN, round } from './lib/datasets.mjs';

const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');

const SUBJECTS = [
  { subject: 'mathematics', slug: 'pisa-mathematics', title: 'PISA Mathematics Score' },
  { subject: 'science', slug: 'pisa-science', title: 'PISA Science Score' },
  { subject: 'reading', slug: 'pisa-reading', title: 'PISA Reading Score' },
];

async function iso3Region() {
  const m = new Map();
  for (const r of await gapminderRows()) {
    const a3 = (r.iso3166_1_alpha3 || '').toUpperCase();
    if (a3) m.set(a3, REGION_4[r.world_4region] || 'Other');
  }
  return m;
}

async function main() {
  console.log('PISA scores (via OWID) →');
  const region = await iso3Region();
  for (const cfg of SUBJECTS) {
    const res = await fetch(`https://ourworldindata.org/grapher/academic-performance.csv?sex=both&subject=${cfg.subject}&csvType=full&useColumnShortNames=true`);
    if (!res.ok) { console.warn(`– ${cfg.slug}: fetch failed (${res.status})`); continue; }
    const text = await res.text();
    const header = parseCsvRows(text.slice(0, text.indexOf('\n')))[0];
    const valueKey = header.find((h) => !['entity', 'code', 'year'].includes(h.toLowerCase()) && !h.includes('annotation'));

    const rows = [];
    const counts = new Map();
    for (const r of parseCsvObjects(text)) {
      const iso = (r.code || '').toUpperCase();
      if (!/^[A-Z]{3}$/.test(iso) || !region.has(iso)) continue;
      const v = Number(r[valueKey]);
      if (Number.isNaN(v)) continue;
      rows.push({ entity: r.entity, group: region.get(iso), period: r.year, value: round(v, 0), iso });
      counts.set(r.year, (counts.get(r.year) ?? 0) + 1);
    }
    const periods = pickPeriodsN(counts, 8);
    const data = rows.filter((r) => periods.includes(r.period));
    if (data.length < 150) { console.warn(`– ${cfg.slug}: only ${data.length} rows, skipping`); continue; }
    await writeDataset('macro', cfg.slug, {
      title: cfg.title, unit: 'PISA score', valueLabel: `Mean ${cfg.subject} score (15-year-olds)`,
      changeMode: 'pp', topic: 'education',
      summary: `Mean performance of 15-year-old students on the PISA ${cfg.subject} scale (OECD average anchored near 500). Triennial waves.`,
      // source deliberately avoids the study owner's acronym — the Taxing
      // Wages card matches on that substring and would collect these
      source: 'PISA international student assessment (via OWID)', license: 'CC BY 4.0',
      url: 'https://www.oecd.org/en/about/programmes/pisa.html', parsedAt: new Date().toISOString().slice(0, 10),
    }, data);
  }
}
main().catch((e) => { console.error('✗ parse_pisa failed:', e.message); process.exit(1); });
