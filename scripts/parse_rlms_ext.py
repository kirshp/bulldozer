#!/usr/bin/env python3
"""RLMS-HSE (English release) → extended dashboard (English, 1994–2024).

RLMS is a single-country panel (Russia), so the shape differs from the
cross-country survey_dash engine: instead of a "by country" panel this shows
a 30-year trend, by sex and by age, for each indicator. Reuses the same
weighted-share + 95% CI + significance math.

Source file is large (1.9GB, 4000+ vars) — read only the columns we need.
Run:  python3 scripts/parse_rlms_ext.py
"""
import math
import pathlib
import subprocess
import sys
import tempfile

import numpy as np
import pandas as pd
import pyreadstat

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent / 'lib'))
from survey_dash import wshare, sig_gap  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOME = pathlib.Path.home()
RLMS_DIR = HOME / 'Library/Mobile Documents/com~apple~CloudDocs/BK/Opros/RLMS'
ARCHIVE = RLMS_DIR / 'RLMS_IND_1994_2024_eng.7z'

AGE_BANDS = [(25, '15–25'), (40, '26–40'), (60, '41–60'), (200, '61+')]
MISSING = {99999997, 99999998, 99999999}

INDS = [
    ('m71', {1}, {1, 2}, 'Currently smokes', 'Share who currently smoke cigarettes.'),
    ('j123', {1}, {1, 2}, 'Used the internet (last 12m)', 'Share who used the internet in the past 12 months.'),
    ('j197', {1}, {1, 2}, 'Has a bank card', 'Share who own a plastic bank card.'),
    ('j65', {1, 2}, {1, 2, 3, 4, 5}, 'Satisfied with life', 'Fully or rather satisfied with their life at present.'),
]


def load(sav_path):
    want = ['year', 'inwgt', 'h5', 'h6_2'] + [c for c, *_ in INDS]
    _, meta = pyreadstat.read_sav(str(sav_path), metadataonly=True)
    cols = [c for c in want if c in meta.column_names]
    df, _ = pyreadstat.read_sav(str(sav_path), usecols=cols)
    for c in want:
        if c not in df.columns:
            df[c] = np.nan
    df['w'] = df['inwgt'].clip(lower=0).fillna(0)
    a = df['h6_2']
    df['ageg'] = np.select([a <= 25, a <= 40, a <= 60, a > 60], [1, 2, 3, 4], default=0)
    return df


def clean(series, valid):
    return series.where(~series.isin(MISSING) & series.isin(valid))


def bar(name, cell, maxv, extra=''):
    if not cell:
        return f'<div class="row"><span class="lbl">{name}</span><span class="track"></span><span class="val">—</span></div>'
    w = cell['pct'] / maxv * 100
    ciw = cell['ci'] / maxv * 100
    return (f'<div class="row"><span class="lbl">{name}{extra}</span>'
            f'<span class="track"><span class="fill" style="width:{w:.1f}%"></span>'
            f'<span class="ci" style="left:calc({w:.1f}% - {ciw:.1f}%);width:{2 * ciw:.1f}%"></span></span>'
            f'<span class="val">{cell["pct"]:.0f}<em>±{cell["ci"]:.1f}</em></span></div>')


def section(lbl, blurb, df, code, pos, base):
    d = df.copy()
    d[code] = clean(d[code], base)
    valid = d[code].notna()
    d = d[valid]
    pos_mask = d[code].isin(pos).to_numpy()
    w = d['w'].to_numpy()

    years = sorted(d['year'].dropna().unique())
    trend = {}
    for y in years:
        mk = (d['year'] == y).to_numpy()
        if mk.sum() >= 100:
            trend[int(y)] = wshare(w[mk], pos_mask[mk])
    overall = wshare(w, pos_mask)

    men_mk = (d['h5'] == 1).to_numpy(); women_mk = (d['h5'] == 2).to_numpy()
    men, women = wshare(w[men_mk], pos_mask[men_mk]), wshare(w[women_mk], pos_mask[women_mk])
    g = sig_gap(men, women)

    age_cells = {}
    for i, (_, nm) in enumerate(AGE_BANDS, 1):
        mk = (d['ageg'] == i).to_numpy()
        if mk.sum() >= 100:
            age_cells[nm] = wshare(w[mk], pos_mask[mk])

    maxv = max([c['pct'] for c in trend.values() if c] + [60]) * 1.05
    tbars = ''.join(bar(str(y), c, maxv) for y, c in trend.items())
    sbars = bar('Men', men, maxv) + bar('Women', women, maxv, f' <b class="sig">{g}</b>' if g else '')
    abars = ''.join(bar(nm, age_cells.get(nm), maxv) for _, nm in AGE_BANDS)

    return f"""<section class="ind"><h2>{lbl} <span class="ov">{overall['pct']:.0f}%<em>±{overall['ci']:.1f}</em></span></h2>
<p class="blurb">{blurb} Weighted, Russia, {years[0]:.0f}–{years[-1]:.0f}.</p>
<div class="grid"><div class="panel"><h3>By year</h3>{tbars}</div>
<div class="side"><div class="panel"><h3>By sex <span class="note">gap sig.: {g or 'n/s'}</span></h3>{sbars}</div>
<div class="panel"><h3>By age</h3>{abars}</div></div></div></section>"""


def main():
    print('RLMS-HSE extended dashboard (English) →')
    with tempfile.TemporaryDirectory() as tmp:
        print(f'  extracting {ARCHIVE.name} …')
        subprocess.run(['7z', 'x', f'-o{tmp}', '-y', str(ARCHIVE)], check=True,
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        sav = next(pathlib.Path(tmp).glob('*.sav'))
        df = load(sav)
        print(f'  loaded {len(df):,} person-waves, {df["year"].nunique()} survey years')
        body = ''
        for code, pos, base, lbl, blurb in INDS:
            body += section(lbl, blurb, df, code, pos, base)
            print(f'  ✓ {lbl}')
    html = TEMPLATE.replace('{{BODY}}', body)
    out = ROOT / 'public/dashboards/rlms.html'
    out.write_text(html)
    (RLMS_DIR / 'rlms_extended_dashboard_eng.html').write_text(html)
    print(f'  ✓ {out}\n  ✓ copied into source folder')


TEMPLATE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RLMS-HSE — extended dashboard</title>
<style>
:root{--bg:#0e0f11;--card:#16181b;--card2:#1c1f23;--border:#2a2e33;--text:#e7e9ec;--dim:#9aa1a9;--accent:#ffb000}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 Inter,system-ui,sans-serif;padding:24px;max-width:1100px;margin:0 auto}
h1{font-size:23px;margin:0 0 2px}.lead{color:var(--dim);margin:0 0 18px;font-size:14px;max-width:80ch}
.ind{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:14px}
.ind h2{font-size:18px;margin:0 0 2px;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.ind h2 .ov{color:var(--accent);font-variant-numeric:tabular-nums}.ind h2 .ov em{font-style:normal;font-size:12px;color:var(--dim);margin-left:2px}
.blurb{color:var(--dim);font-size:13px;margin:0 0 14px}
.grid{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}@media(max-width:720px){.grid{grid-template-columns:1fr}}
.panel{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:12px;max-height:520px;overflow-y:auto}
.panel h3{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin:0 0 10px;font-weight:600;position:sticky;top:0;background:var(--card2)}
.panel h3 .note{text-transform:none;letter-spacing:0;color:var(--accent);font-weight:600;margin-left:6px}
.row{display:grid;grid-template-columns:70px 1fr 62px;align-items:center;gap:10px;font-size:13px;margin:5px 0}
.lbl{color:var(--text);white-space:nowrap}.sig{color:var(--accent)}
.track{position:relative;height:13px;background:#0e0f11;border:1px solid var(--border);border-radius:5px}
.fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--accent),#ff7a00);border-radius:5px}
.ci{position:absolute;top:50%;height:2px;background:rgba(255,255,255,.55);transform:translateY(-50%)}
.val{text-align:right;font-variant-numeric:tabular-nums;color:var(--dim)}.val em{font-style:normal;font-size:10px;opacity:.7;margin-left:1px}
.foot{color:var(--dim);font-size:12px;margin-top:16px}.foot a{color:var(--accent)}
.sigkey{font-size:11.5px;color:var(--dim);margin:0 0 18px}
</style></head><body>
<h1>RLMS-HSE — extended dashboard</h1>
<p class="lead">Weighted trends from the Russia Longitudinal Monitoring Survey (1994–2024), the deepest open microdata on everyday life in Russia — smoking, internet use, bank cards and life satisfaction, by year, sex and age.</p>
<p class="sigkey">Men–women gap: <b>·</b> n/s · <b>**</b> p&lt;0.05 · <b>***</b> p&lt;0.01. Years with fewer than 100 respondents are hidden.</p>
{{BODY}}
<p class="foot">Source: <a href="https://rlms-hse.cpc.unc.edu/" target="_blank" rel="noopener">RLMS-HSE</a> (HSE / UNC Population Center) · aggregated by BullDozer · weighted (inwgt).</p>
</body></html>"""

if __name__ == '__main__':
    main()
