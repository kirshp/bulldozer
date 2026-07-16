#!/usr/bin/env python3
"""Latinobarómetro microdata → extended dashboard (groups + significance).

Beyond the long report-based trend series already on the site, this reads the
2020 + 2023 microdata to build a richer dashboard: weighted shares with 95%
confidence intervals, broken down by country, sex and age group, plus the
2020→2023 shift. Significance uses the Kish effective sample size from the
survey weights, so the intervals honour the weighting.

Writes public/dashboards/latinobarometro.html and copies the same file into the
source folder (so it travels with the raw data in iCloud).
Run:  python3 scripts/parse_latinobarometro_ext.py
"""
import math
import pathlib
import shutil

import pyreadstat

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOME = pathlib.Path.home()
SRC = HOME / 'Library/Mobile Documents/com~apple~CloudDocs/BK/Opros/Inter_survey/Latinobarometro'
WAVES = {2020: 'F00011659-Latinobarometro_2020_Esp_Spss_v1_0/Latinobarometro_2020_Eng_Spss_v1_0.sav',
         2023: 'Latinobarometro_2023_Eng_Spss_v1_0.sav'}

CTRY = {32: 'Argentina', 68: 'Bolivia', 76: 'Brazil', 152: 'Chile', 170: 'Colombia',
        188: 'Costa Rica', 214: 'Dominican Rep.', 218: 'Ecuador', 222: 'El Salvador',
        320: 'Guatemala', 340: 'Honduras', 484: 'Mexico', 558: 'Nicaragua', 591: 'Panama',
        600: 'Paraguay', 604: 'Peru', 858: 'Uruguay', 862: 'Venezuela'}  # Spain (724) excluded
SEX = {1: 'Men', 2: 'Women'}
AGE = {1: '16–25', 2: '26–40', 3: '41–60', 4: '61+'}

# indicator = (code, positive categories, base = valid categories, label, blurb)
INDS = [
    ('P10STGBS', {1}, {1, 2, 3}, 'Support for democracy',
     'Democracy is preferable to any other kind of government.'),
    ('P11STGBS.A', {1, 2}, {1, 2, 3, 4}, 'Satisfaction with democracy',
     'Very or fairly satisfied with the way democracy works.'),
    ('P9STGBS', {1}, {1, 2}, 'Interpersonal trust',
     'One can trust most people (vs. can never be too careful).'),
]


def wshare(w, pos):
    """Weighted share (%) + 95% CI half-width + effective N, for boolean arrays."""
    sw = w.sum()
    if sw <= 0:
        return None
    p = (w[pos]).sum() / sw
    n_eff = sw * sw / (w * w).sum()  # Kish effective sample size
    se = math.sqrt(max(p * (1 - p), 1e-9) / n_eff)
    return dict(pct=round(p * 100, 1), ci=round(1.96 * se * 100, 1), n=int(round(n_eff)))


def load(year):
    path = SRC / WAVES[year]
    cols = ['WT', 'IDENPA', 'SEXO', 'REEDAD'] + [c for c, *_ in INDS]
    df, _ = pyreadstat.read_sav(str(path), usecols=cols)
    df = df[df['IDENPA'].isin(CTRY)].copy()
    df['WT'] = df['WT'].clip(lower=0).fillna(0)
    return df


def cells(df, code, pos_set, base_set):
    """Return dashboard rows for one indicator/one wave."""
    import numpy as np
    val = df[code]
    base = val.isin(base_set)
    d = df[base]
    w = d['WT'].to_numpy()
    pos = d[code].isin(pos_set).to_numpy()
    out = {'overall': wshare(w, pos), 'country': {}, 'sex': {}, 'age': {}}
    for cid, cname in CTRY.items():
        mk = (d['IDENPA'] == cid).to_numpy()
        if mk.sum() >= 30:
            out['country'][cname] = wshare(w[mk], pos[mk])
    for sid, sname in SEX.items():
        mk = (d['SEXO'] == sid).to_numpy()
        if mk.sum() >= 30:
            out['sex'][sname] = wshare(w[mk], pos[mk])
    for aid, aname in AGE.items():
        mk = (d['REEDAD'] == aid).to_numpy()
        if mk.sum() >= 30:
            out['age'][aname] = wshare(w[mk], pos[mk])
    return out


def sig_gap(a, b):
    """Two-proportion significance flag between two cells (CIs → SEs)."""
    if not a or not b:
        return ''
    sea, seb = a['ci'] / 1.96, b['ci'] / 1.96
    z = abs(a['pct'] - b['pct']) / math.sqrt(sea * sea + seb * seb + 1e-9)
    return '***' if z > 2.58 else '**' if z > 1.96 else '·'


# ── HTML rendering ────────────────────────────────────────────────────────
def bar(name, cell, maxv, extra=''):
    if not cell:
        return f'<div class="row"><span class="lbl">{name}</span><span class="track"></span><span class="val">—</span></div>'
    w = cell['pct'] / maxv * 100
    ciw = cell['ci'] / maxv * 100
    return (f'<div class="row"><span class="lbl">{name}{extra}</span>'
            f'<span class="track"><span class="fill" style="width:{w:.1f}%"></span>'
            f'<span class="ci" style="left:calc({w:.1f}% - {ciw:.1f}%);width:{2*ciw:.1f}%"></span></span>'
            f'<span class="val">{cell["pct"]:.0f}<em>±{cell["ci"]:.1f}</em></span></div>')


def section(ind_label, blurb, c23, c20):
    country = sorted(c23['country'].items(), key=lambda kv: -(kv[1]['pct'] if kv[1] else 0))
    maxv = max([v['pct'] for _, v in country if v] + [60]) * 1.05
    cbars = ''.join(bar(n, v, maxv) for n, v in country)
    # sex with significance between Men/Women
    men, women = c23['sex'].get('Men'), c23['sex'].get('Women')
    gsig = sig_gap(men, women)
    sbars = bar('Men', men, maxv) + bar('Women', women, maxv, f' <b class="sig">{gsig}</b>' if gsig else '')
    abars = ''.join(bar(n, c23['age'].get(n), maxv) for n in AGE.values())
    ov23, ov20 = c23['overall'], (c20['overall'] if c20 else None)
    delta = ''
    if ov23 and ov20:
        d = ov23['pct'] - ov20['pct']
        cls = 'up' if d > 0 else 'down' if d < 0 else 'flat'
        delta = f'<span class="delta {cls}">{d:+.1f} pp vs 2020</span>'
    return f"""<section class="ind"><h2>{ind_label} <span class="ov">{ov23['pct']:.0f}%<em>±{ov23['ci']:.1f}</em></span>{delta}</h2>
<p class="blurb">{blurb} Regional average across {len(country)} countries, weighted, 2023. Bars show 95% confidence intervals.</p>
<div class="grid"><div class="panel"><h3>By country</h3>{cbars}</div>
<div class="side"><div class="panel"><h3>By sex <span class="note">gap sig.: {gsig or 'n/s'}</span></h3>{sbars}</div>
<div class="panel"><h3>By age</h3>{abars}</div></div></div></section>"""


def main():
    print('Latinobarómetro extended dashboard →')
    data = {}
    for year in WAVES:
        df = load(year)
        data[year] = {code: cells(df, code, pos, base) for code, pos, base, *_ in INDS}
        print(f'  loaded {year}: {len(df):,} respondents, {df["IDENPA"].nunique()} countries')

    body = ''.join(section(lbl, blurb, data[2023][code], data[2020].get(code))
                   for code, pos, base, lbl, blurb in INDS)
    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Latinobarómetro — extended dashboard</title>
<style>
:root{{--bg:#0e0f11;--card:#16181b;--card2:#1c1f23;--border:#2a2e33;--text:#e7e9ec;--dim:#9aa1a9;--accent:#ffb000;--up:#34d399;--down:#f87171}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 Inter,system-ui,sans-serif;padding:24px;max-width:1100px;margin:0 auto}}
h1{{font-size:23px;margin:0 0 2px}}.lead{{color:var(--dim);margin:0 0 22px;font-size:14px;max-width:80ch}}
.ind{{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:18px}}
.ind h2{{font-size:18px;margin:0 0 2px;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}}
.ind h2 .ov{{color:var(--accent);font-variant-numeric:tabular-nums}}.ind h2 .ov em{{font-style:normal;font-size:12px;color:var(--dim);margin-left:2px}}
.delta{{font-size:12.5px;font-weight:600}}.up{{color:var(--up)}}.down{{color:var(--down)}}.flat{{color:var(--dim)}}
.blurb{{color:var(--dim);font-size:13px;margin:0 0 14px}}
.grid{{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}}@media(max-width:720px){{.grid{{grid-template-columns:1fr}}}}
.panel{{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:12px}}
.panel h3{{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin:0 0 10px;font-weight:600}}
.panel h3 .note{{text-transform:none;letter-spacing:0;color:var(--accent);font-weight:600;margin-left:6px}}
.row{{display:grid;grid-template-columns:96px 1fr 62px;align-items:center;gap:10px;font-size:13px;margin:5px 0}}
.lbl{{color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.sig{{color:var(--accent)}}
.track{{position:relative;height:13px;background:#0e0f11;border:1px solid var(--border);border-radius:5px}}
.fill{{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--accent),#ff7a00);border-radius:5px}}
.ci{{position:absolute;top:50%;height:2px;background:rgba(255,255,255,.55);transform:translateY(-50%)}}
.val{{text-align:right;font-variant-numeric:tabular-nums;color:var(--dim)}}.val em{{font-style:normal;font-size:10px;opacity:.7;margin-left:1px}}
.foot{{color:var(--dim);font-size:12px;margin-top:16px}}.foot a{{color:var(--accent)}}
.sigkey{{font-size:11.5px;color:var(--dim);margin:0 0 18px}}
</style></head><body>
<h1>Latinobarómetro — extended dashboard</h1>
<p class="lead">Weighted attitudes across Latin America from the Latinobarómetro microdata, broken down by country, sex and age with 95% confidence intervals. The main site carries the long 1995–2024 trend; this view adds the demographic detail the published report leaves out.</p>
<p class="sigkey">Significance of the men–women gap: <b>·</b> n/s · <b>**</b> p&lt;0.05 · <b>***</b> p&lt;0.01. Cells with fewer than 30 respondents are hidden.</p>
{body}
<p class="foot">Source: <a href="https://www.latinobarometro.org/" target="_blank" rel="noopener">Latinobarómetro</a> 2020 &amp; 2023 microdata · aggregated by BullDozer · weighted (WT), Kish effective N for intervals.</p>
</body></html>"""
    out = ROOT / 'public/dashboards/latinobarometro.html'
    out.write_text(html)
    shutil.copy(out, SRC / 'latinobarometro_extended_dashboard.html')
    print(f'  ✓ {out}\n  ✓ copied into source folder')


if __name__ == '__main__':
    main()
