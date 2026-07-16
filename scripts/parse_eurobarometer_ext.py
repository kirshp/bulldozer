#!/usr/bin/env python3
"""Eurobarometer microdata → extended dashboard (groups + significance).

Reads the GESIS Standard/Special Eurobarometer file (ZA8904) and builds the
same extended view as the Latinobarómetro dashboard: weighted shares with 95%
confidence intervals, broken down by country, sex and age, across several
topics (politics, wellbeing, digital behaviour, media & science). Single wave,
so there is no trend column.

Writes public/dashboards/eurobarometer.html and copies it into the source
folder.  Run:  python3 scripts/parse_eurobarometer_ext.py
"""
import math
import pathlib
import shutil

import numpy as np
import pyreadstat
import sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent / 'lib'))
from survey_dash import write_site_dataset  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOME = pathlib.Path.home()
SRC = HOME / 'Library/Mobile Documents/com~apple~CloudDocs/BK/Opros/Inter_survey/Eurobarometer'
FILE = 'ZA8904_v1-0-0.sav'
WAVE = '2024'

CC = {'AL': 'Albania', 'AT': 'Austria', 'BA': 'Bosnia & H.', 'BE': 'Belgium', 'BG': 'Bulgaria',
      'CY': 'Cyprus', 'CZ': 'Czechia', 'DE': 'Germany', 'DK': 'Denmark', 'EE': 'Estonia',
      'ES': 'Spain', 'FI': 'Finland', 'FR': 'France', 'GB': 'United Kingdom', 'GR': 'Greece',
      'HR': 'Croatia', 'HU': 'Hungary', 'IE': 'Ireland', 'IT': 'Italy', 'LT': 'Lithuania',
      'LU': 'Luxembourg', 'LV': 'Latvia', 'ME': 'Montenegro', 'MK': 'North Macedonia',
      'MT': 'Malta', 'NL': 'Netherlands', 'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania',
      'RS': 'Serbia', 'SE': 'Sweden', 'SI': 'Slovenia', 'SK': 'Slovakia', 'TR': 'Türkiye'}
SEX = {1: 'Men', 2: 'Women'}
AGE = {1: '15–25', 2: '26–40', 3: '41–60', 4: '61+'}

# (topic, code, positive cats, base cats, label, blurb, [site dataset spec])
INDS = [
    ('Politics & democracy', 'sd18a', {1, 2}, {1, 2, 3, 4}, 'Satisfaction with democracy',
     'Very or fairly satisfied with the way democracy works in their country.',
     dict(slug='eb-democracy-satisfaction', title='Satisfaction with Democracy', topic='governance')),
    ('Politics & democracy', 'd73_1', {1}, {1, 2, 3}, 'Country on the right track',
     'Things in their country are going in the right direction.'),
    ('Wellbeing & lifestyle', 'd70', {1, 2}, {1, 2, 3, 4}, 'Satisfaction with life',
     'Very or fairly satisfied with the life they lead.',
     dict(slug='eb-life-satisfaction', title='Life Satisfaction (Eurobarometer)', topic='wellbeing')),
    ('Digital behaviour', 'netuse', {1, 2, 3}, {1, 2, 3, 4, 5, 6, 7}, 'Weekly internet use',
     'Use the internet at least about once a week.',
     dict(slug='eb-weekly-internet-use', title='Weekly Internet Use', topic='connectivity')),
    ('Media & science', 'qa12_2', {1, 2}, {1, 2, 3, 4}, 'Engage with science media',
     'Regularly or occasionally watch documentaries or read/listen to science content.'),
    ('Media & science', 'qa17_8', {2}, {1, 2}, 'Climate-science literacy',
     'Correctly answer that climate change is not caused mainly by natural processes.'),
]

SITE_SOURCE = 'Eurobarometer'
SITE_LICENSE = 'Free for research use (GESIS)'
SITE_URL = 'https://europa.eu/eurobarometer/'


def wshare(w, pos):
    sw = w.sum()
    if sw <= 0:
        return None
    p = w[pos].sum() / sw
    n_eff = sw * sw / (w * w).sum()
    se = math.sqrt(max(p * (1 - p), 1e-9) / n_eff)
    return dict(pct=round(p * 100, 1), ci=round(1.96 * se * 100, 1), n=int(round(n_eff)))


def load():
    want = ['w1', 'isocntry', 'd10', 'd11'] + [t[1] for t in INDS]
    df, _ = pyreadstat.read_sav(str(SRC / FILE), usecols=want)
    df['cc'] = df['isocntry'].astype(str).str.split('-').str[0]
    df = df[df['cc'].isin(CC)].copy()
    df['w1'] = df['w1'].clip(lower=0).fillna(0)
    a = df['d11']
    df['ageg'] = np.select([a <= 25, a <= 40, a <= 60, a > 60], [1, 2, 3, 4], default=0)
    return df


def cells(df, code, pos_set, base_set):
    base = df[code].isin(base_set)
    d = df[base]
    w = d['w1'].to_numpy()
    pos = d[code].isin(pos_set).to_numpy()
    out = {'overall': wshare(w, pos), 'country': {}, 'sex': {}, 'age': {}}
    for cc, nm in CC.items():
        mk = (d['cc'] == cc).to_numpy()
        if mk.sum() >= 40:
            out['country'][nm] = wshare(w[mk], pos[mk])
    for sid, nm in SEX.items():
        mk = (d['d10'] == sid).to_numpy()
        if mk.sum() >= 40:
            out['sex'][nm] = wshare(w[mk], pos[mk])
    for aid, nm in AGE.items():
        mk = (d['ageg'] == aid).to_numpy()
        if mk.sum() >= 40:
            out['age'][nm] = wshare(w[mk], pos[mk])
    return out


def sig_gap(a, b):
    if not a or not b:
        return ''
    sea, seb = a['ci'] / 1.96, b['ci'] / 1.96
    z = abs(a['pct'] - b['pct']) / math.sqrt(sea * sea + seb * seb + 1e-9)
    return '***' if z > 2.58 else '**' if z > 1.96 else '·'


def bar(name, cell, maxv, extra=''):
    if not cell:
        return f'<div class="row"><span class="lbl">{name}</span><span class="track"></span><span class="val">—</span></div>'
    w = cell['pct'] / maxv * 100
    ciw = cell['ci'] / maxv * 100
    return (f'<div class="row"><span class="lbl">{name}{extra}</span>'
            f'<span class="track"><span class="fill" style="width:{w:.1f}%"></span>'
            f'<span class="ci" style="left:calc({w:.1f}% - {ciw:.1f}%);width:{2 * ciw:.1f}%"></span></span>'
            f'<span class="val">{cell["pct"]:.0f}<em>±{cell["ci"]:.1f}</em></span></div>')


def section(lbl, blurb, c):
    country = sorted(c['country'].items(), key=lambda kv: -(kv[1]['pct'] if kv[1] else 0))
    maxv = max([v['pct'] for _, v in country if v] + [60]) * 1.05
    cbars = ''.join(bar(n, v, maxv) for n, v in country)
    men, women = c['sex'].get('Men'), c['sex'].get('Women')
    g = sig_gap(men, women)
    sbars = bar('Men', men, maxv) + bar('Women', women, maxv, f' <b class="sig">{g}</b>' if g else '')
    abars = ''.join(bar(n, c['age'].get(n), maxv) for n in AGE.values())
    ov = c['overall']
    return f"""<section class="ind"><h2>{lbl} <span class="ov">{ov['pct']:.0f}%<em>±{ov['ci']:.1f}</em></span></h2>
<p class="blurb">{blurb} Weighted average across {len(country)} countries, {WAVE}. Bars show 95% confidence intervals.</p>
<div class="grid"><div class="panel"><h3>By country</h3>{cbars}</div>
<div class="side"><div class="panel"><h3>By sex <span class="note">gap sig.: {g or 'n/s'}</span></h3>{sbars}</div>
<div class="panel"><h3>By age</h3>{abars}</div></div></div></section>"""


def main():
    print('Eurobarometer extended dashboard →')
    df = load()
    print(f'  loaded {len(df):,} respondents, {df["cc"].nunique()} countries')
    body, last = '', None
    for ind in INDS:
        topic, code, pos, base, lbl, blurb = ind[:6]
        site = ind[6] if len(ind) > 6 else None
        c = cells(df, code, pos, base)
        if not c['overall']:
            print(f'  – {lbl}: no data, skipped'); continue
        if topic != last:
            body += f'<h2 class="topichdr">{topic}</h2>'; last = topic
        body += section(lbl, blurb, c)
        print(f'  ✓ {lbl}: {c["overall"]["pct"]}% ({len(c["country"])} countries)')
        if site:
            write_site_dataset(ROOT, site['slug'], site['title'], site['topic'], lbl, '%',
                                blurb, SITE_SOURCE, SITE_LICENSE, SITE_URL, WAVE, c['country'])
    html = TEMPLATE.replace('{{BODY}}', body).replace('{{WAVE}}', WAVE)
    out = ROOT / 'public/dashboards/eurobarometer.html'
    out.write_text(html)
    shutil.copy(out, SRC / 'eurobarometer_extended_dashboard.html')
    print(f'  ✓ {out}\n  ✓ copied into source folder')


TEMPLATE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Eurobarometer — extended dashboard</title>
<style>
:root{--bg:#0e0f11;--card:#16181b;--card2:#1c1f23;--border:#2a2e33;--text:#e7e9ec;--dim:#9aa1a9;--accent:#ffb000}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 Inter,system-ui,sans-serif;padding:24px;max-width:1100px;margin:0 auto}
h1{font-size:23px;margin:0 0 2px}.lead{color:var(--dim);margin:0 0 18px;font-size:14px;max-width:80ch}
.topichdr{font-size:13px;text-transform:uppercase;letter-spacing:2px;color:var(--accent);margin:22px 0 8px;border-bottom:1px solid var(--border);padding-bottom:5px}
.ind{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:14px}
.ind h2{font-size:18px;margin:0 0 2px;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.ind h2 .ov{color:var(--accent);font-variant-numeric:tabular-nums}.ind h2 .ov em{font-style:normal;font-size:12px;color:var(--dim);margin-left:2px}
.blurb{color:var(--dim);font-size:13px;margin:0 0 14px}
.grid{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}@media(max-width:720px){.grid{grid-template-columns:1fr}}
.panel{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:12px}
.panel h3{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin:0 0 10px;font-weight:600}
.panel h3 .note{text-transform:none;letter-spacing:0;color:var(--accent);font-weight:600;margin-left:6px}
.row{display:grid;grid-template-columns:110px 1fr 62px;align-items:center;gap:10px;font-size:13px;margin:5px 0}
.lbl{color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sig{color:var(--accent)}
.track{position:relative;height:13px;background:#0e0f11;border:1px solid var(--border);border-radius:5px}
.fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--accent),#ff7a00);border-radius:5px}
.ci{position:absolute;top:50%;height:2px;background:rgba(255,255,255,.55);transform:translateY(-50%)}
.val{text-align:right;font-variant-numeric:tabular-nums;color:var(--dim)}.val em{font-style:normal;font-size:10px;opacity:.7;margin-left:1px}
.foot{color:var(--dim);font-size:12px;margin-top:16px}.foot a{color:var(--accent)}
.sigkey{font-size:11.5px;color:var(--dim);margin:0 0 18px}
</style></head><body>
<h1>Eurobarometer — extended dashboard</h1>
<p class="lead">Weighted attitudes across Europe from the Eurobarometer microdata, broken down by country, sex and age with 95% confidence intervals — politics, wellbeing, digital behaviour and science/media.</p>
<p class="sigkey">Men–women gap: <b>·</b> n/s · <b>**</b> p&lt;0.05 · <b>***</b> p&lt;0.01. Cells with fewer than 40 respondents are hidden. Germany and the UK reported as single countries.</p>
{{BODY}}
<p class="foot">Source: <a href="https://europa.eu/eurobarometer/" target="_blank" rel="noopener">Eurobarometer</a> (GESIS ZA8904, {{WAVE}}) · aggregated by BullDozer · weighted (w1), Kish effective N for intervals.</p>
</body></html>"""

if __name__ == '__main__':
    main()
