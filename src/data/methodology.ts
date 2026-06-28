/** Per-source methodology & vintage notes — surfaced on dataset pages so the
 *  numbers are honest about how and when they were produced. Keyed by slug
 *  prefix; centralised here so we don't fake period labels in the data. */
export interface Methodology { vintage?: string; method?: string }

export function methodologyFor(slug: string): Methodology {
  if (slug.startsWith('imf-'))
    return { method: 'Years after the latest actual are IMF estimates/projections, not outturns.' };
  if (slug.startsWith('ess-'))
    return { vintage: 'Pooled recent rounds (~2017–2023)', method: 'Weighted by post-stratification weight (pspwght); country mean on the 0–10 item.' };
  if (slug.startsWith('afro-'))
    return { vintage: 'Round 9 (2021–2023)', method: 'Weighted by within-country weight (withinwt_ea); share giving the stated response.' };
  if (slug.startsWith('wvs-'))
    return { vintage: 'Wave 7 (2017–2022)', method: 'Weighted by W_WEIGHT; Welzel cultural-values index, country mean.' };
  if (slug.startsWith('lits-'))
    return { vintage: 'LiTS IV (~2022–2023)', method: 'Country mean of the item; transition region only, single wave.' };
  if (slug.startsWith('hofstede-'))
    return { vintage: 'Dimension matrix (2010)', method: 'Published national scores (0–100); a fixed model, not a time series.' };
  if (slug.startsWith('sdr2-'))
    return { vintage: 'Pooled harmonized waves (to ~2017)', method: 'SDR2 harmonization across 22 survey projects; weighted by T_WEIGHT_L2U; country mean of the harmonized target item.' };
  if (slug === 'wrp-resilience')
    return { vintage: 'World Risk Poll 2023', method: 'Weighted by WGT; Resilience Index rescaled to 0–100.' };
  return {};
}
