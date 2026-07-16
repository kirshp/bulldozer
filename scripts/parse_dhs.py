#!/usr/bin/env python3
"""DHS (Demographic and Health Surveys) → Central Asia comparison + dashboard.

DHS microdata is one country per file (unlike the multi-country barometers),
so this reads the Individual Recode (women 15–49) for every country we have
and builds a small cross-country comparison. DHS variable codes (Vxxx) are
standardised across phases, so the same logic applies to each file even
though survey years differ (that's normal for DHS — countries are surveyed on
their own schedule). Writes:
  src/data/surveys/dhs-*.json
  public/dashboards/dhs.html
Run once after refreshing the microdata:  python3 scripts/parse_dhs.py
"""
import json
import pathlib

import pandas as pd
import pyreadstat

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOME = pathlib.Path.home()
BASE = HOME / 'Library/Mobile Documents/com~apple~CloudDocs/BK/Opros/Inter_survey/DHS_Demographic_and_Health_Surveys'

# Individual Recode (women 15-49) — the standard file for these indicators.
# UZ 2002 is a Health Examination Survey (different file layout, no IR) — skipped.
SURVEYS = [
    dict(iso='TJK', name='Tajikistan', year=2023, path='TJ_2023_DHS_07152026_1132_251793/TJIR81SV/TJIR81FL.sav'),
    dict(iso='KGZ', name='Kyrgyzstan', year=2012, path='KY_2012_DHS_07152026_1132_251793/KYIR61SV/KYIR61FL.SAV'),
    dict(iso='KAZ', name='Kazakhstan', year=1999, path='KK_1999_DHS_07152026_1131_251793/KKIR42SV/KKIR42FL.SAV'),
]
REGION = 'Europe & Central Asia'

IND = [
    dict(slug='dhs-female-literacy', title="Women's Literacy", topic='education',
         label='Can read a full sentence', summary='Share of women 15–49 able to read a whole sentence (tested with a card).'),
    dict(slug='dhs-women-working', title='Women Currently Working', topic='economy',
         label='Currently working', summary='Share of women 15–49 currently employed (excl. currently pregnant/looking-only nuance — DHS “currently working” item).'),
    dict(slug='dhs-modern-contraception', title='Modern Contraceptive Use', topic='health',
         label='Uses a modern method (married women)', summary='Share of currently married/in-union women 15–49 using a modern contraceptive method.'),
    dict(slug='dhs-child-marriage', title='Child Marriage', topic='demographics',
         label='Married before age 18', summary='Share of women 20–49 who were first married or in union before age 18.'),
]

WANT = ['V005', 'V012', 'V155', 'V714', 'V313', 'V501', 'V511']

def load(survey):
    p = BASE / survey['path']
    _, meta = pyreadstat.read_sav(str(p), metadataonly=True)
    have = [c for c in WANT if c in meta.column_names]  # older waves lack e.g. V155
    df, _ = pyreadstat.read_sav(str(p), usecols=have)
    for c in WANT:
        if c not in df.columns:
            df[c] = float('nan')  # metric masks yield empty base → share() returns None → skipped
    df['wt'] = df['V005'] / 1_000_000
    return df

def share(df, mask_pos, mask_base):
    base = df.loc[mask_base, 'wt'].sum()
    if base <= 0:
        return None
    pos = df.loc[mask_pos & mask_base, 'wt'].sum()
    return round(pos / base * 100, 1)

def main():
    print('DHS Central Asia →')
    results = {i['slug']: [] for i in IND}
    dash = {}
    for s in SURVEYS:
        fp = BASE / s['path']
        if not fp.exists():
            print(f"  – {s['iso']}: file missing, skipped")
            continue
        df = load(s)
        period = str(s['year'])
        row = {}

        v = share(df, df['V155'].isin([1, 2]), df['V155'].isin([0, 1, 2]))
        if v is not None:
            results['dhs-female-literacy'].append({'entity': s['name'], 'group': REGION, 'period': period, 'value': v, 'iso': s['iso']})
            row['dhs-female-literacy'] = v

        v = share(df, df['V714'] == 1, df['V714'].isin([0, 1]))
        if v is not None:
            results['dhs-women-working'].append({'entity': s['name'], 'group': REGION, 'period': period, 'value': v, 'iso': s['iso']})
            row['dhs-women-working'] = v

        married = df['V501'].isin([1, 2])
        v = share(df, df['V313'] == 3, married)
        if v is not None:
            results['dhs-modern-contraception'].append({'entity': s['name'], 'group': REGION, 'period': period, 'value': v, 'iso': s['iso']})
            row['dhs-modern-contraception'] = v

        # child marriage: women 20-49 (so they've had the chance to reach 18), V511 = age at first union
        base20 = (df['V012'] >= 20) & df['V511'].notna() & (df['V511'] < 90)
        v = share(df, df['V511'] < 18, base20)
        if v is not None:
            results['dhs-child-marriage'].append({'entity': s['name'], 'group': REGION, 'period': period, 'value': v, 'iso': s['iso']})
            row['dhs-child-marriage'] = v

        dash[s['iso']] = {'name': s['name'], 'year': s['year'], **row}
        print(f"  ✓ {s['iso']} {s['year']}: {list(row.keys())}")

    for ind in IND:
        data = sorted(results[ind['slug']], key=lambda r: -r['value'])
        if len(data) < 2:  # a 1-country "dataset" is useless on a world map
            print(f"  – {ind['slug']}: only {len(data)} country, not registered")
            continue
        out = {
            'meta': {
                'title': ind['title'], 'summary': ind['summary'] + ' DHS individual-recode microdata, latest available survey per country.',
                'unit': '%', 'valueLabel': ind['label'], 'changeMode': 'pp', 'topic': ind['topic'],
                'source': 'DHS — Demographic and Health Surveys', 'license': 'Free for research use (DHS Program, registration required)',
                'url': 'https://dhsprogram.com/', 'method': 'Weighted (V005); each country is its own latest available DHS wave.',
                'parsedAt': '2026',
            },
            'data': data,
        }
        (ROOT / 'src/data/surveys' / f"{ind['slug']}.json").write_text(json.dumps(out, ensure_ascii=False))
        print(f"  ✓ {ind['slug']}: {len(data)} countries")

    write_dashboard(dash)

def write_dashboard(dash):
    inds = IND
    isos = list(dash)
    th = ''.join(f'<th title="{ind["summary"]}">{ind["title"]}</th>' for ind in inds)
    body = ''
    for iso in isos:
        r = dash[iso]
        cells = ''
        for ind in inds:
            v = r.get(ind['slug'])
            txt = '—' if v is None else f'{v:.0f}%'
            cells += f'<td>{txt}</td>'
        body += f'<tr><th class="c">{r["name"]} <em>{iso} · {r["year"]}</em></th>{cells}</tr>'
    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DHS — Central Asia comparison</title>
<style>
:root{{--bg:#0e0f11;--card:#1c1f23;--border:#2a2e33;--text:#e7e9ec;--dim:#9aa1a9;--accent:#ffb000}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 Inter,system-ui,sans-serif;padding:24px}}
h1{{font-size:22px;margin:0 0 4px}}.sub{{color:var(--dim);margin:0 0 18px;font-size:14px;max-width:70ch}}
.wrap{{overflow-x:auto;border:1px solid var(--border);border-radius:12px}}
table{{border-collapse:collapse;width:100%;min-width:600px}}
th,td{{padding:9px 14px;text-align:center;font-variant-numeric:tabular-nums;border-bottom:1px solid var(--border)}}
thead th{{background:var(--card);font-size:12.5px;color:var(--dim);font-weight:600}}
th.c{{text-align:left;white-space:nowrap;background:var(--card)}}th.c em{{color:var(--dim);font-style:normal;font-size:11px}}
.foot{{color:var(--dim);font-size:12.5px;margin-top:14px}}.foot a{{color:var(--accent)}}
</style></head><body>
<h1>DHS — Central Asia, women 15–49</h1>
<p class="sub">Each country surveyed on its own DHS schedule (years differ — that's normal for DHS, not a data gap). Weighted shares from the Individual Recode file.</p>
<div class="wrap"><table><thead><tr><th class="c">Country</th>{th}</tr></thead><tbody>{body}</tbody></table></div>
<p class="foot">Source: <a href="https://dhsprogram.com/" target="_blank" rel="noopener">DHS Program</a> · aggregated by BullDozer · registration-access microdata, free for research use.</p>
</body></html>"""
    (ROOT / 'public/dashboards/dhs.html').write_text(html)
    print('  ✓ public/dashboards/dhs.html')

if __name__ == '__main__':
    main()
