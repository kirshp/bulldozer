/**
 * Dataset registry. Every dataset is PUBLIC and parsed from an open source —
 * provenance (source, licence, url, parsedAt) is mandatory and surfaced in the
 * UI. JSON files in ./surveys and ./macro are auto-registered, so the parsers
 * (scripts/parse_*.mjs) can add datasets without touching code.
 */
import type { Observation } from '@lib/analytics';

export type DatasetKind = 'survey' | 'macro';
export type ChangeMode = 'pct' | 'pp';

export interface DatasetMeta {
  slug: string;
  title: string;
  kind: DatasetKind;
  summary: string;
  source: string;
  license: string;
  url: string;
  parsedAt: string; // ISO date
  unit: string;
  valueLabel: string;
  /** How period-over-period change is expressed: percentage points for
   *  rate/percentage data, multiplicative percent for counts/volumes. */
  changeMode: ChangeMode;
}

export interface Dataset extends DatasetMeta {
  data: Observation[];
}

interface RawDataset {
  meta: Omit<DatasetMeta, 'slug' | 'changeMode'> & { changeMode?: ChangeMode };
  data: Observation[];
}

/** Percentage / rate units compare in percentage points; counts multiplicatively. */
function deriveChangeMode(unit: string): ChangeMode {
  return unit.includes('%') ? 'pp' : 'pct';
}

const surveyModules = import.meta.glob<{ default: RawDataset }>('./surveys/*.json', { eager: true });
const macroModules = import.meta.glob<{ default: RawDataset }>('./macro/*.json', { eager: true });

function build(modules: Record<string, { default: RawDataset }>): Dataset[] {
  return Object.entries(modules).map(([path, mod]) => {
    const slug = path.split('/').pop()!.replace(/\.json$/, '');
    const raw = mod.default;
    return {
      slug,
      ...raw.meta,
      changeMode: raw.meta.changeMode ?? deriveChangeMode(raw.meta.unit),
      data: raw.data,
    };
  });
}

export const datasets: Dataset[] = [...build(surveyModules), ...build(macroModules)].sort((a, b) =>
  a.title.localeCompare(b.title),
);

export function getDataset(slug: string): Dataset | undefined {
  return datasets.find((d) => d.slug === slug);
}

export function datasetsByKind(kind: DatasetKind): Dataset[] {
  return datasets.filter((d) => d.kind === kind);
}
