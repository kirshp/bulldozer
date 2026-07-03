/**
 * Parse Latinobarómetro Informe 2024 aggregates — country-level shares extracted
 * from the public report PDF ("La Democracia Resiliente") into tidy CSVs, kept in
 * Inter_survey/Latinobarometro. 18 Latin American countries, 1995–2024.
 *   node scripts/parse_latinobarometro.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { writeDataset } from './lib/datasets.mjs';

const DIR = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs',
  'BK', 'Opros', 'Inter_survey', 'Latinobarometro');
const URL = 'https://www.latinobarometro.org/';

// Spanish table names → English entity + ISO3. All countries are Americas.
const COUNTRY = {
  'México': ['Mexico', 'MEX'], 'Argentina': ['Argentina', 'ARG'], 'Panamá': ['Panama', 'PAN'],
  'Costa Rica': ['Costa Rica', 'CRI'], 'República Dominicana': ['Dominican Republic', 'DOM'],
  'Guatemala': ['Guatemala', 'GTM'], 'Ecuador': ['Ecuador', 'ECU'], 'Honduras': ['Honduras', 'HND'],
  'Chile': ['Chile', 'CHL'], 'Paraguay': ['Paraguay', 'PRY'], 'Venezuela': ['Venezuela', 'VEN'],
  'El Salvador': ['El Salvador', 'SLV'], 'Colombia': ['Colombia', 'COL'], 'Uruguay': ['Uruguay', 'URY'],
  'Brasil': ['Brazil', 'BRA'], 'Bolivia': ['Bolivia', 'BOL'], 'Perú': ['Peru', 'PER'],
  'Nicaragua': ['Nicaragua', 'NIC'],
};

const DATASETS = [
  {
    file: 'lb_support_democracy.csv', slug: 'lb-support-democracy',
    title: 'Support for Democracy (Latinobarómetro)', valueLabel: 'Democracy preferable',
    summary: 'Share who say democracy is preferable to any other form of government. Latinobarómetro 2024 report, 1995–2024.',
    vintage: '1995–2024 (waves; no fieldwork in some years)',
  },
  {
    file: 'lb_satisfaction_democracy.csv', slug: 'lb-satisfaction-democracy',
    title: 'Satisfaction with Democracy (Latinobarómetro)', valueLabel: 'Satisfied with democracy',
    summary: 'Share very or fairly satisfied with the way democracy works in their country. Latinobarómetro 2024 report, 1995–2024.',
    vintage: '1995–2024 (waves; Nicaragua not measured since 2020)',
  },
  {
    file: 'lb_interpersonal_trust.csv', slug: 'lb-interpersonal-trust',
    title: 'Interpersonal Trust (Latinobarómetro)', valueLabel: 'Most people can be trusted',
    summary: 'Share who say most people can be trusted. Latinobarómetro 2024 report, single 2024 wave.',
    vintage: '2024 wave', topic: 'attitudes',
  },
];

async function main() {
  console.log('Latinobarómetro 2024 → country aggregates');
  for (const cfg of DATASETS) {
    let text;
    try { text = await readFile(join(DIR, cfg.file), 'utf8'); }
    catch { console.warn(`– ${cfg.slug}: source not found; skipped.`); continue; }
    const data = [];
    for (const r of parseCsvObjects(text)) {
      const geo = COUNTRY[r.country];
      if (!geo) continue; // regional average row — the site computes its own
      data.push({ entity: geo[0], group: 'Americas', period: r.year, value: Number(r.value), iso: geo[1] });
    }
    await writeDataset('survey', cfg.slug, {
      title: cfg.title, summary: cfg.summary, unit: '%', valueLabel: cfg.valueLabel,
      changeMode: 'pp', topic: cfg.topic ?? 'governance', vintage: cfg.vintage,
      method: 'Country aggregates as published in the Informe 2024 (report tables, weighted national samples ~1,000–1,200 per country).',
      source: 'Latinobarómetro (Informe 2024)', license: 'Latinobarómetro — public report aggregates',
      url: URL, parsedAt: new Date().toISOString().slice(0, 10),
    }, data);
  }
}
main().catch((e) => { console.error('✗ parse_latinobarometro failed:', e.message); process.exit(1); });
