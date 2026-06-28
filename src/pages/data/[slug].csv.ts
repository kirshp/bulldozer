import type { APIRoute } from 'astro';
import { datasets, getDataset } from '@data/datasets';

export function getStaticPaths() {
  return datasets.map((d) => ({ params: { slug: d.slug } }));
}

const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export const GET: APIRoute = ({ params }) => {
  const ds = getDataset(params.slug!);
  if (!ds) return new Response('Not found', { status: 404 });
  const header = 'entity,iso,group,period,value';
  const rows = ds.data.map((o) => [esc(o.entity), o.iso ?? '', esc(o.group ?? ''), o.period, o.value].join(','));
  const csv = [header, ...rows].join('\n') + '\n';
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ds.slug}.csv"`,
    },
  });
};
