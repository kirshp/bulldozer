#!/usr/bin/env python3
"""Three flagship composite indices from the QoG time-series file (already on
disk for the other QoG datasets): Environmental Performance Index (Yale),
Economic Freedom of the World (Fraser) and the Global Peace Index (IEP).

None are on OWID; QoG bundles all three, so we read them straight from
qog_std_ts_jan26.sav. Writes src/data/macro/*.json in the registry format.
  python3 scripts/parse_qog_indices.py
"""
import json
import pathlib

import pyreadstat

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOME = pathlib.Path.home()
SAV = HOME / 'Library/Mobile Documents/com~apple~CloudDocs/BK/Opros/Inter_survey/QoG_Quality_of_Government/qog_std_ts_jan26.sav'

GEO = json.loads((ROOT / 'scripts/lib/gapminder_geo.json').read_text())
REGION = {'africa': 'Africa', 'americas': 'Americas', 'asia': 'Asia', 'europe': 'Europe'}
ISO_REGION = {r['iso3166_1_alpha3']: REGION.get(r['world_4region'], 'Other') for r in GEO}
# clean international names (QoG cname is verbose: "Viet Nam", "…(the)")
NAMES = {k: v['common'] for k, v in json.loads((ROOT / 'src/data/country-names.json').read_text()).items()}

IND = [
    dict(col='epi_epi', slug='epi-environmental-performance', title='Environmental Performance Index',
         unit='score 0–100', topic='environment', dp=1,
         summary='Yale EPI — 0–100 ranking of environmental health and ecosystem vitality (higher = better).',
         source='Environmental Performance Index (Yale, via QoG)', url='https://epi.yale.edu/'),
    dict(col='fi_index', slug='fraser-economic-freedom', title='Economic Freedom of the World',
         unit='score 0–10', topic='economy', dp=2,
         summary='Fraser Institute — economic freedom across size of government, property rights, sound money, trade and regulation (higher = freer).',
         source='Economic Freedom of the World (Fraser Institute, via QoG)', url='https://www.fraserinstitute.org/economic-freedom'),
    dict(col='gpi_gpi', slug='gpi-global-peace', title='Global Peace Index',
         unit='score 1–5 (lower = more peaceful)', topic='safety', dp=3,
         summary='Institute for Economics & Peace — level of peacefulness across safety, conflict and militarisation. Note: a LOWER score is more peaceful.',
         source='Global Peace Index (Institute for Economics & Peace, via QoG)', url='https://www.visionofhumanity.org/'),
]


def pick_periods(counts, n=8):
    years = sorted((y for y, c in counts.items() if c >= 40), reverse=True)[:n]
    return sorted(years)


def main():
    print('QoG composite indices → EPI, Fraser EFW, Global Peace')
    if not SAV.exists():
        print('  – QoG .sav not found; skipped (local-only source).'); return
    cols = ['ccodealp', 'cname', 'year'] + [i['col'] for i in IND]
    df, _ = pyreadstat.read_sav(str(SAV), usecols=cols)
    for ind in IND:
        rows, counts = [], {}
        for _, r in df.iterrows():
            iso = str(r['ccodealp']).upper()
            v = r[ind['col']]
            if len(iso) != 3 or v != v:  # NaN check
                continue
            y = str(int(r['year']))
            rows.append((iso, NAMES.get(iso, str(r['cname'])), y, float(v)))
            counts[y] = counts.get(y, 0) + 1
        periods = pick_periods(counts)
        data = [{'entity': nm, 'group': ISO_REGION.get(iso, 'Other'), 'period': y,
                 'value': round(v, ind['dp']), 'iso': iso}
                for iso, nm, y, v in rows if y in periods]
        out = {
            'meta': {'title': ind['title'], 'summary': f"{ind['summary']} {periods[0]}–{periods[-1]}.",
                     'unit': ind['unit'], 'valueLabel': ind['title'], 'changeMode': 'pp', 'topic': ind['topic'],
                     'source': ind['source'], 'license': 'Free for research use (QoG standard dataset)',
                     'url': ind['url'], 'parsedAt': '2026', 'kind': 'macro'},
            'data': sorted(data, key=lambda x: -x['value']),
        }
        (ROOT / 'src/data/macro' / f"{ind['slug']}.json").write_text(json.dumps(out, ensure_ascii=False))
        print(f"  ✓ {ind['slug']}: {len(data)} obs, {periods[0]}–{periods[-1]}, top {data[0]['entity']} {data[0]['value']}")


if __name__ == '__main__':
    main()
