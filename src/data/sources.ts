/**
 * Catalogue of survey programmes and data sources we have gathered.
 * `live` = data is already ingested into BullDozer; `catalog` = collected /
 * documented, available as microdata or on request from the official source.
 * Every entry carries an official link and a short description.
 */
export type SourceStatus = 'live' | 'catalog';

export interface Source {
  name: string;
  url: string;
  description: string;
  status: SourceStatus;
  category: string;
  /** substring matched against dataset `source` to count live datasets */
  match?: string;
}

export const sources: Source[] = [
  // ── Macro & economics ──────────────────────────────────────────────
  { name: 'IMF World Economic Outlook', url: 'https://www.imf.org/en/Publications/WEO', status: 'live', category: 'Macro & economics', match: 'IMF World Economic Outlook',
    description: 'IMF projections and estimates of growth, inflation, debt, employment and external balances for ~190 economies.' },
  { name: 'World Bank — World Development Indicators', url: 'https://databank.worldbank.org/source/world-development-indicators', status: 'live', category: 'Macro & economics', match: 'World Development Indicators',
    description: 'The World Bank’s flagship cross-country compilation of development statistics: economy, population, health, environment.' },
  { name: 'Maddison Project Database', url: 'https://www.rug.nl/ggdc/historicaldevelopment/maddison/', status: 'catalog', category: 'Macro & economics',
    description: 'Long-run historical GDP per capita and population back to year 1, for comparing economic development over centuries.' },
  { name: 'Penn World Table', url: 'https://www.rug.nl/ggdc/productivity/pwt/', status: 'live', category: 'Macro & economics', match: 'Penn World Table',
    description: 'Cross-country national accounts with comparable measures of output, inputs and productivity (GDP per hour worked).' },
  { name: 'OECD — Taxing Wages', url: 'https://www.oecd.org/en/data/datasets/taxing-wages.html', status: 'live', category: 'Macro & economics', match: 'OECD',
    description: 'Tax wedge on labour — taxes and contributions as a share of total labour cost across OECD countries.' },
  { name: 'BIS — Credit statistics', url: 'https://www.bis.org/statistics/totcredit.htm', status: 'live', category: 'Macro & economics', match: 'Bank for International Settlements',
    description: 'Credit to the private non-financial sector, households and government as a share of GDP, from the Bank for International Settlements.' },

  // ── Governance & democracy ─────────────────────────────────────────
  { name: 'V-Dem — Varieties of Democracy', url: 'https://www.v-dem.net/data/the-v-dem-dataset/', status: 'live', category: 'Governance & democracy', match: 'V-Dem',
    description: 'Expert-coded indices of electoral, liberal, participatory, deliberative and egalitarian democracy, 1900–present.' },
  { name: 'Quality of Government (QoG)', url: 'https://www.gu.se/en/quality-government/qog-data', status: 'live', category: 'Governance & democracy', match: 'Quality of Government',
    description: 'University of Gothenburg compilation harmonising governance, corruption, rule-of-law and institutional indicators.' },

  // ── Wellbeing & values ─────────────────────────────────────────────
  { name: 'World Happiness Report', url: 'https://worldhappiness.report/', status: 'live', category: 'Wellbeing & values', match: 'World Happiness Report',
    description: 'Cantril-ladder life evaluations from the Gallup World Poll, plus the six factors that explain happiness.' },
  { name: 'Gapminder', url: 'https://www.gapminder.org/data/', status: 'live', category: 'Wellbeing & values', match: 'Gapminder',
    description: 'Curated long-run development indicators — income, health, education, demography — harmonised for every country.' },
  { name: 'World Values Survey (WVS)', url: 'https://www.worldvaluessurvey.org/', status: 'catalog', category: 'Wellbeing & values',
    description: 'Global survey of values and beliefs across ~100 societies. Wave 7 SPSS microdata gathered; questionnaire and codebook on hand.' },
  { name: 'European Values Study (EVS)', url: 'https://europeanvaluesstudy.eu/', status: 'catalog', category: 'Wellbeing & values',
    description: 'Large-scale, repeated survey of human values across Europe; integrated dataset available via GESIS.' },
  { name: 'Wellcome Global Monitor', url: 'https://wellcome.org/reports/wellcome-global-monitor', status: 'catalog', category: 'Wellbeing & values',
    description: 'Gallup study of how people worldwide think and feel about science and health; full crosstabs collected.' },
  { name: 'World Risk Poll', url: 'https://wrp.lrfoundation.org.uk/', status: 'live', category: 'Risk & resilience', match: 'World Risk Poll',
    description: 'Lloyd’s Register Foundation / Gallup global study of how people experience and cope with risk — the Resilience Index.' },
  { name: 'WorldRiskIndex', url: 'https://weltrisikobericht.de/en/', status: 'live', category: 'Risk & resilience', match: 'WorldRiskIndex',
    description: 'IFHV / Bündnis Entwicklung Hilft model of disaster risk from extreme natural events and climate change — exposure × vulnerability.' },
  { name: 'INFORM Risk Index', url: 'https://drmkc.jrc.ec.europa.eu/inform-index', status: 'live', category: 'Risk & resilience', match: 'INFORM',
    description: 'EC Joint Research Centre / IASC index of humanitarian crisis and disaster risk, including hazard, vulnerability and coping capacity.' },

  // ── Public opinion (regional barometers) ───────────────────────────
  { name: 'Eurobarometer', url: 'https://europa.eu/eurobarometer/', status: 'catalog', category: 'Public opinion barometers',
    description: 'European Commission’s standard survey of public opinion across EU member states since 1974.' },
  { name: 'European Social Survey (ESS)', url: 'https://www.europeansocialsurvey.org/', status: 'catalog', category: 'Public opinion barometers',
    description: 'Academically-driven, methodologically rigorous biennial survey of attitudes and behaviour across Europe.' },
  { name: 'ISSP — International Social Survey Programme', url: 'https://issp.org/', status: 'catalog', category: 'Public opinion barometers',
    description: 'Annual cross-national survey on rotating social-science themes (role of government, religion, work…).' },
  { name: 'Afrobarometer', url: 'https://www.afrobarometer.org/', status: 'catalog', category: 'Public opinion barometers',
    description: 'Pan-African survey of attitudes on democracy, governance and quality of life; Round 9 merged dataset gathered.' },
  { name: 'Arab Barometer', url: 'https://www.arabbarometer.org/', status: 'catalog', category: 'Public opinion barometers',
    description: 'Public opinion across the Middle East and North Africa on politics, economy and society.' },
  { name: 'Caucasus Barometer (CRRC)', url: 'https://caucasusbarometer.org/', status: 'catalog', category: 'Public opinion barometers',
    description: 'Annual household survey for Armenia, Azerbaijan and Georgia from the Caucasus Research Resource Centers.' },
  { name: 'EBRD — Life in Transition Survey (LiTS)', url: 'https://www.ebrd.com/what-we-do/economic-research-and-data/data/lits.html', status: 'live', category: 'Public opinion barometers', match: 'EBRD — Life in Transition',
    description: 'Attitudes to transition, markets and democracy across Central/Eastern Europe and Central Asia. Trust, risk tolerance, religion and more.' },
  { name: 'SDR — Survey Data Recycling', url: 'https://dataharmonization.org/', status: 'catalog', category: 'Public opinion barometers',
    description: 'Large harmonised ex-post integration of international survey projects; SDR2 master file gathered.' },

  // ── Health & demography ────────────────────────────────────────────
  { name: 'DHS — Demographic and Health Surveys', url: 'https://dhsprogram.com/', status: 'catalog', category: 'Health & demography',
    description: 'Nationally-representative household surveys on population, health and nutrition in low- and middle-income countries.' },
  { name: 'MICS — Multiple Indicator Cluster Surveys', url: 'https://mics.unicef.org/', status: 'catalog', category: 'Health & demography',
    description: 'UNICEF-supported household surveys tracking the situation of children and women worldwide.' },
  { name: 'SHARE — Health, Ageing and Retirement', url: 'https://share-eric.eu/', status: 'catalog', category: 'Health & demography',
    description: 'Longitudinal panel on health, socio-economics and social networks of Europeans aged 50+.' },
  { name: 'EU-SILC', url: 'https://ec.europa.eu/eurostat/web/income-and-living-conditions', status: 'catalog', category: 'Health & demography',
    description: 'EU statistics on income and living conditions — the reference source for poverty and social-exclusion indicators.' },
  { name: 'EHIS — European Health Interview Survey', url: 'https://ec.europa.eu/eurostat/web/microdata/european-health-interview-survey', status: 'catalog', category: 'Health & demography',
    description: 'Harmonised survey of health status, determinants and care use across EU member states.' },
  { name: 'GGP — Generations and Gender Programme', url: 'https://www.ggp-i.org/', status: 'catalog', category: 'Health & demography',
    description: 'Longitudinal study of family dynamics, fertility and relationships across generations.' },
  { name: 'IPUMS International', url: 'https://international.ipums.org/', status: 'catalog', category: 'Health & demography',
    description: 'The world’s largest collection of harmonised census microdata, covering hundreds of censuses across nations.' },
];

export const sourceCategories = [
  'Macro & economics',
  'Governance & democracy',
  'Wellbeing & values',
  'Risk & resilience',
  'Public opinion barometers',
  'Health & demography',
];

/** Macro page shows economic sources; Surveys page shows the rest. */
export function sourcesByKind(kind: 'macro' | 'survey'): Source[] {
  return sources.filter((s) =>
    kind === 'macro' ? s.category === 'Macro & economics' : s.category !== 'Macro & economics',
  );
}
