/**
 * Largest companies directory → src/data/companies.json.
 * Base list (name, industry, revenue, employees, HQ) from the Wikipedia
 * "List of largest companies by revenue" table; logo, country ISO-3 and a
 * one-line description enriched from Wikidata (same approach as country
 * coat-of-arms). Public, factual, reproducible — no scraping of company sites.
 *   node scripts/parse_company_directory.mjs
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'companies.json');
const UA = { 'User-Agent': 'BullDozer/1.0 (aurapark888@gmail.com)' };
const num = (s) => { const m = (s || '').match(/[\d][\d,.]*/); return m ? Number(m[0].replace(/,/g, '')) : null; };
const firstLink = (s) => { const m = (s || '').match(/\[\[([^\]]+)\]\]/); return m ? (m[1].split('|')[1] || m[1].split('|')[0]).trim() : null; };

async function wiki(params) {
  return (await fetch('https://en.wikipedia.org/w/api.php?format=json&' + new URLSearchParams(params), { headers: UA })).json();
}

async function main() {
  const wt = (await wiki({ action: 'parse', page: 'List_of_largest_companies_by_revenue', prop: 'wikitext', section: 1 })).parse.wikitext['*'];
  const table = wt.slice(wt.indexOf('{|'), wt.indexOf('|}'));

  // Only the rank + linked company name are reliable from the table (rowspans in
  // the HQ column shift the other cells); everything else comes from Wikidata.
  const rows = [];
  for (const block of table.split(/\n\|-/)) {
    if (!/scope="row"/.test(block)) continue;
    const title0 = block.match(/\[\[([^\]]+)\]\]/);
    if (!title0) continue;
    const [title, disp] = title0[1].split('|');
    rows.push({ title: title.trim(), name: (disp || title).trim() });
  }

  // Resolve Wikidata QIDs for the article titles (batched)
  const titleToQid = {};
  for (let i = 0; i < rows.length; i += 45) {
    const batch = rows.slice(i, i + 45).map((r) => r.title);
    const pages = (await wiki({ action: 'query', prop: 'pageprops', titles: batch.join('|'), redirects: '1' })).query;
    const norm = {}; for (const n of pages.normalized || []) norm[n.from] = n.to;
    const red = {}; for (const r of pages.redirects || []) red[r.from] = r.to;
    const byTitle = {}; for (const p of Object.values(pages.pages)) byTitle[p.title] = p.pageprops?.wikibase_item;
    for (const t of batch) titleToQid[t] = byTitle[red[norm[t] || t] || norm[t] || t];
  }

  // Wikidata: logo (P154), country ISO3 (P17→P298), industry (P452), description
  const qids = [...new Set(Object.values(titleToQid).filter(Boolean))];
  const q = `SELECT ?c ?logo ?iso ?industryLabel ?desc WHERE {
    VALUES ?c { ${qids.map((q) => 'wd:' + q).join(' ')} }
    OPTIONAL { ?c wdt:P154 ?logo }
    OPTIONAL { ?c wdt:P17 ?country . ?country wdt:P298 ?iso }
    OPTIONAL { ?c wdt:P452 ?industry . ?industry rdfs:label ?industryLabel FILTER(lang(?industryLabel)='en') }
    OPTIONAL { ?c schema:description ?desc FILTER(lang(?desc)='en') }
  }`;
  const wd = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { headers: { ...UA, Accept: 'application/sparql-results+json' } });
  const meta = {};
  if (wd.ok) for (const b of (await wd.json()).results.bindings) {
    const m = meta[b.c.value.split('/').pop()] ||= {};
    if (b.logo && !m.logo) m.logo = b.logo.value.replace(/^http:/, 'https:'); // avoid mixed-content blocking on https
    if (b.iso && !m.iso) m.iso = b.iso.value.toUpperCase();
    if (b.industryLabel && !m.industry) m.industry = b.industryLabel.value;
    if (b.desc && !m.desc) m.desc = b.desc.value;
  } else { console.warn('  Wikidata enrich failed', wd.status); }

  const out = rows.map((r, i) => {
    const m = meta[titleToQid[r.title]] || {};
    return { rank: i + 1, name: r.name, industry: m.industry || null, iso: m.iso || null, logo: m.logo || null, desc: m.desc || null, wiki: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}` };
  });
  await writeFile(OUT, JSON.stringify(out));
  console.log(`✓ companies.json: ${out.length} (${out.filter((c) => c.logo).length} logos, ${out.filter((c) => c.iso).length} countries)`);
  console.log('  top:', out.slice(0, 4).map((c) => `${c.name} $${c.revenueBn}bn`).join(' · '));
}
main();
