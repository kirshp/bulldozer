/**
 * Dataset registry. Every dataset here is PUBLIC and parsed from an open
 * source — provenance (source, licence, url, parsedAt) is mandatory metadata
 * and is surfaced in the UI.
 */
import type { Observation } from '@lib/analytics';

import eurobarometerTrust from './surveys/eurobarometer-trust.json';
import gallupOptimism from './surveys/gallup-economic-optimism.json';
import imfGdpGrowth from './macro/imf-gdp-growth.json';

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
  meta: Omit<DatasetMeta, 'slug' | 'changeMode'>;
  data: Observation[];
}

/** Percentage / rate units are compared in percentage points; everything
 *  else (counts, volumes) multiplicatively. */
function deriveChangeMode(unit: string): ChangeMode {
  return unit.includes('%') ? 'pp' : 'pct';
}

const registry: Record<string, RawDataset> = {
  'eurobarometer-trust': eurobarometerTrust as RawDataset,
  'gallup-economic-optimism': gallupOptimism as RawDataset,
  'imf-gdp-growth': imfGdpGrowth as RawDataset,
};

export const datasets: Dataset[] = Object.entries(registry).map(([slug, d]) => ({
  slug,
  ...d.meta,
  changeMode: deriveChangeMode(d.meta.unit),
  data: d.data,
}));

export function getDataset(slug: string): Dataset | undefined {
  return datasets.find((d) => d.slug === slug);
}

export function datasetsByKind(kind: DatasetKind): Dataset[] {
  return datasets.filter((d) => d.kind === kind);
}
