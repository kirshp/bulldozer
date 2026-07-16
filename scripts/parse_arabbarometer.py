#!/usr/bin/env python3
"""Arab Barometer Wave VIII (2023–24) → country aggregates + a results dashboard.

Microdata is registration-access (kept off the repo); this reads the local CSV,
computes weighted top-response shares per country, and writes:
  src/data/surveys/ab-*.json        (site datasets)
  public/dashboards/arabbarometer.html
Run once after refreshing the microdata:  python3 scripts/parse_arabbarometer.py
"""
import json
import os
import pathlib

import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOME = pathlib.Path.home()
CSV = HOME / 'Library/Mobile Documents/com~apple~CloudDocs/BK/Opros/Inter_survey/Afrobarometer/ArabBarometer_WaveVIII_English_v2/ArabBarometer_WaveVIII_English_v3.csv'
PERIOD = '2024'

# COUNTRY code → (ISO3, name, region) — region from the Gapminder registry
GEO = {r['iso3166_1_alpha3']: r for r in json.load(open(ROOT / 'scripts/lib/gapminder_geo.json'))}
REG4 = {'africa': 'Sub-Saharan Africa', 'americas': 'Americas', 'asia': 'Asia', 'europe': 'Europe & Central Asia'}
COUNTRY = {
    7: 'IRQ', 8: 'JOR', 9: 'KWT', 10: 'LBN', 12: 'MRT', 13: 'MAR', 15: 'PSE', 21: 'TUN',
}
NAME = {'IRQ': 'Iraq', 'JOR': 'Jordan', 'KWT': 'Kuwait', 'LBN': 'Lebanon', 'MRT': 'Mauritania',
        'MAR': 'Morocco', 'PSE': 'Palestine', 'TUN': 'Tunisia'}

# indicator: var, positive response codes, missing codes excluded from base
IND = [
    dict(slug='ab-interpersonal-trust', var='Q103', pos=[1], title='Interpersonal Trust',
         topic='attitudes', label='Most people can be trusted',
         summary='Share who say “most people can be trusted” (vs. “must be careful”).'),
    dict(slug='ab-support-democracy', var='Q516_4', pos=[1, 2], title='Support for Democracy',
         topic='governance', label='Democracy is better than other systems',
         summary='Agree that democracy, despite its problems, is better than any other form of government.'),
    dict(slug='ab-perceived-corruption', var='Q210', pos=[1, 2], title='Perceived State Corruption',
         topic='governance', label='Corruption widespread in state institutions',
         summary='See corruption in national state institutions to a large or medium extent.'),
    dict(slug='ab-emigration-desire', var='Q104', pos=[1], title='Desire to Emigrate',
         topic='attitudes', label='Has considered emigrating',
         summary='Share who have thought about emigrating to live in another country.'),
    dict(slug='ab-religiosity', var='Q609', pos=[1], title='Religiosity',
         topic='attitudes', label='Describes self as religious',
         summary='Share who describe themselves as religious (vs. somewhat / not religious).'),
    dict(slug='ab-economy-good', var='Q101', pos=[1, 2], title='Economy Rated Good',
         topic='economy', label='Current economic situation is good',
         summary='Rate the current national economic situation as good or very good.'),
]
MISSING = {98, 99}

def main():
    if not CSV.exists():
        print('– Arab Barometer CSV missing; skipped.')
        return
    cols = ['COUNTRY', 'WT'] + [i['var'] for i in IND]
    df = pd.read_csv(CSV, usecols=cols, low_memory=False)
    df['iso'] = df['COUNTRY'].map(COUNTRY)
    df = df[df['iso'].notna()]

    dash_rows = {}  # iso -> {slug: value}
    for ind in IND:
        v = ind['var']
        data = []
        for iso, g in df.groupby('iso'):
            s = g[[v, 'WT']].dropna(subset=[v])
            s = s[~s[v].isin(MISSING)]
            base = s['WT'].sum()
            if base <= 0:
                continue
            pos = s[s[v].isin(ind['pos'])]['WT'].sum()
            val = round(pos / base * 100, 1)
            reg = REG4.get(GEO.get(iso, {}).get('world_4region'), 'Other')
            data.append({'entity': NAME[iso], 'group': reg, 'period': PERIOD, 'value': val, 'iso': iso})
            dash_rows.setdefault(iso, {})[ind['slug']] = val
        data.sort(key=lambda r: -r['value'])
        out = {
            'meta': {
                'title': ind['title'], 'summary': ind['summary'] + ' Arab Barometer Wave VIII, 2023–24.',
                'unit': '%', 'valueLabel': ind['label'], 'changeMode': 'pp', 'topic': ind['topic'],
                'source': 'Arab Barometer (Wave VIII)', 'license': 'Free for research use (Arab Barometer)',
                'url': 'https://www.arabbarometer.org/', 'vintage': 'Wave VIII (2023–24)',
                'method': 'Weighted (WT); “don’t know” and refusals excluded from the base.',
                'parsedAt': PERIOD,
            },
            'data': data,
        }
        (ROOT / 'src/data/surveys' / f"{ind['slug']}.json").write_text(json.dumps(out, ensure_ascii=False))
        print(f"  ✓ {ind['slug']}: {len(data)} countries")

    write_dashboard(dash_rows)

def write_dashboard(rows):
    inds = IND
    isos = sorted(rows, key=lambda i: -sum(rows[i].values()) / max(1, len(rows[i])))
    # percentile shade per indicator (amber ramp)
    cols_vals = {ind['slug']: sorted(rows[i].get(ind['slug'], 0) for i in isos) for ind in inds}

    def shade(slug, val):
        vals = [v for v in cols_vals[slug] if v is not None]
        if not vals:
            return '#16181b'
        lo, hi = min(vals), max(vals)
        t = 0 if hi == lo else (val - lo) / (hi - lo)
        # dark → amber
        r = int(0x16 + t * (0xff - 0x16)); g = int(0x18 + t * (0xb0 - 0x18)); b = int(0x1b + t * (0x00 - 0x1b))
        return f'rgb({r},{g},{b})'

    th = ''.join(f'<th title="{ind["summary"]}">{ind["title"]}</th>' for ind in inds)
    body = ''
    for iso in isos:
        cells = ''
        for ind in inds:
            v = rows[iso].get(ind['slug'])
            txt = '—' if v is None else f'{v:.0f}%'
            fg = '#1a1300' if v is not None and v >= 55 else '#e7e9ec'
            cells += f'<td style="background:{shade(ind["slug"], v) if v is not None else "#16181b"};color:{fg}">{txt}</td>'
        body += f'<tr><th class="c">{NAME[iso]} <em>{iso}</em></th>{cells}</tr>'

    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arab Barometer Wave VIII — results by country</title>
<style>
:root{{--bg:#0e0f11;--card:#1c1f23;--border:#2a2e33;--text:#e7e9ec;--dim:#9aa1a9;--accent:#ffb000}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 Inter,system-ui,sans-serif;padding:24px}}
h1{{font-size:22px;margin:0 0 4px}}.sub{{color:var(--dim);margin:0 0 18px;font-size:14px;max-width:70ch}}
.wrap{{overflow-x:auto;border:1px solid var(--border);border-radius:12px}}
table{{border-collapse:collapse;width:100%;min-width:720px}}
th,td{{padding:9px 12px;text-align:center;font-variant-numeric:tabular-nums;border-bottom:1px solid var(--border)}}
thead th{{position:sticky;top:0;background:var(--card);font-size:12.5px;color:var(--dim);text-align:center;font-weight:600}}
th.c{{text-align:left;white-space:nowrap;background:var(--card);position:sticky;left:0}}th.c em{{color:var(--dim);font-style:normal;font-size:11px}}
.foot{{color:var(--dim);font-size:12.5px;margin-top:14px}}.foot a{{color:var(--accent)}}
</style></head><body>
<h1>Arab Barometer — Wave VIII <span style="color:var(--accent)">(2023–24)</span></h1>
<p class="sub">Weighted share giving the headline response, by country. Cells shaded by column (darker = lower, amber = higher). Eight MENA countries; “don’t know” and refusals excluded from each base.</p>
<div class="wrap"><table><thead><tr><th class="c">Country</th>{th}</tr></thead><tbody>{body}</tbody></table></div>
<p class="foot">Source: <a href="https://www.arabbarometer.org/" target="_blank" rel="noopener">Arab Barometer</a> Wave VIII · aggregated by BullDozer · free for research use.</p>
</body></html>"""
    (ROOT / 'public/dashboards/arabbarometer.html').write_text(html)
    print('  ✓ public/dashboards/arabbarometer.html')

if __name__ == '__main__':
    main()
