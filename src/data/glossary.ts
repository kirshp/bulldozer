/** Plain-language definitions of the metrics & methods used across BullDozer. */
export interface Term {
  term: string;
  short: string;
  body: string;
}

export const glossary: Term[] = [
  {
    term: 'Period-over-period change',
    short: 'How a value moved versus the previous period.',
    body: 'The percentage difference between the latest period and the one before it. BullDozer classifies each entity as improving (> +0.5%), declining (< −0.5%) or stable (within the ±0.5% band) so small noise is not read as a trend.',
  },
  {
    term: 'Group rollup',
    short: 'Aggregating entities into regions or categories.',
    body: 'Individual entities (countries, segments, brands) are summed into named groups. The group change is the average of member changes, which keeps large and small members comparable rather than letting one dominate the total.',
  },
  {
    term: 'Top movers',
    short: 'The biggest risers and fallers.',
    body: 'Entities ranked by period-over-period percent change. Risers are positive moves, fallers negative. A move from a zero baseline is excluded because a percentage change is undefined when the previous value is zero.',
  },
  {
    term: 'Real GDP growth',
    short: 'Inflation-adjusted change in economic output.',
    body: 'The annual percentage change in the value of all goods and services an economy produces, after stripping out price changes. Sourced from the IMF World Economic Outlook (indicator NGDP_RPCH).',
  },
  {
    term: 'CPI inflation',
    short: 'How fast consumer prices are rising.',
    body: 'The annual percentage change in the average price of a basket of consumer goods and services (Consumer Price Index). IMF DataMapper indicator PCPIPCH.',
  },
  {
    term: 'Net trust',
    short: 'Trust minus distrust in a survey.',
    body: 'In opinion surveys, the share who say they trust an institution. When both trust and distrust are reported, net trust is the trust share minus the distrust share — a single signed number that is easy to compare across markets.',
  },
  {
    term: 'Provenance',
    short: 'Where a number came from.',
    body: 'Every dataset carries its source, licence, unit and the date it was parsed. BullDozer only publishes public, parsed data and cites the original open source so any figure can be traced back.',
  },
];
