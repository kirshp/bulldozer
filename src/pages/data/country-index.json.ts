import type { APIRoute } from 'astro';
import { datasets } from '@data/datasets';

/** Build a per-country profile: every indicator's latest value + rank. */
export const GET: APIRoute = () => {
  const byIso: Record<string, any> = {};

  for (const ds of datasets) {
    const periods = [...new Set(ds.data.map((o) => o.period))].sort();
    const period = periods[periods.length - 1];
    const rows = ds.data.filter((o) => o.period === period && o.iso);
    const ranked = [...rows].sort((a, b) => b.value - a.value);
    const total = ranked.length;
    ranked.forEach((o, i) => {
      const iso = o.iso!;
      if (!byIso[iso]) byIso[iso] = { iso, name: o.entity, region: o.group ?? '', items: [] };
      byIso[iso].items.push({
        slug: ds.slug, title: ds.title, kind: ds.kind, unit: ds.unit,
        value: o.value, period, rank: i + 1, total,
      });
    });
  }

  // sort each country's items by kind then title
  for (const c of Object.values(byIso) as any[]) {
    c.items.sort((a: any, b: any) => (a.kind === b.kind ? a.title.localeCompare(b.title) : a.kind < b.kind ? 1 : -1));
  }

  const countries = Object.values(byIso)
    .filter((c: any) => c.items.length >= 5)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return new Response(JSON.stringify(countries), { headers: { 'Content-Type': 'application/json' } });
};
