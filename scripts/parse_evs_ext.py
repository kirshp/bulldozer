#!/usr/bin/env python3
"""EVS (European Values Study 2017, ZA7500) → extended dashboard via survey_dash.

The GESIS release ships the .sav inside a .zip; we extract it to a temp dir so
nothing large is written back into iCloud.
"""
import pathlib
import sys
import tempfile
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent / 'lib'))
from survey_dash import generate  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOME = pathlib.Path.home()
SRC = HOME / 'Library/Mobile Documents/com~apple~CloudDocs/BK/Opros/Inter_survey/EVS_European_Values_Study'
ZIP = SRC / 'ZA7500_v5-0-0.sav.zip'

CC = {'AL': 'Albania', 'AM': 'Armenia', 'AT': 'Austria', 'AZ': 'Azerbaijan', 'BA': 'Bosnia & H.',
      'BG': 'Bulgaria', 'BY': 'Belarus', 'CH': 'Switzerland', 'CZ': 'Czechia', 'DE': 'Germany',
      'DK': 'Denmark', 'EE': 'Estonia', 'ES': 'Spain', 'FI': 'Finland', 'FR': 'France',
      'GB': 'United Kingdom', 'GE': 'Georgia', 'HR': 'Croatia', 'HU': 'Hungary', 'IS': 'Iceland',
      'IT': 'Italy', 'LT': 'Lithuania', 'LV': 'Latvia', 'ME': 'Montenegro', 'MK': 'North Macedonia',
      'NL': 'Netherlands', 'NO': 'Norway', 'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania',
      'RS': 'Serbia', 'RU': 'Russia', 'SE': 'Sweden', 'SI': 'Slovenia', 'SK': 'Slovakia',
      'UA': 'Ukraine'}


def main():
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(ZIP) as z:
            name = next(n for n in z.namelist() if n.endswith('.sav'))
            z.extract(name, tmp)
        cfg = dict(
            name='EVS', wave='2017–2020', file=pathlib.Path(tmp) / name,
            weight='gweight', country_col='c_abrv', sex_col='v225', age_col='age',
            country_map=CC, sex_map={1: 'Male', 2: 'Female'}, min_cell=40,
            out_html=ROOT / 'public/dashboards/evs.html',
            folder_copy=SRC / 'evs_extended_dashboard.html',
            root=ROOT, site_source='European Values Study', site_license='Free for research use (GESIS)',
            site_url='https://europeanvaluesstudy.eu/',
            title='EVS — extended dashboard',
            lead='Weighted values across Europe from the European Values Study (2017), broken down by country, sex and age with 95% confidence intervals — happiness, trust, politics and social values.',
            sigkey='Men–women gap: <b>·</b> n/s · <b>**</b> p&lt;0.05 · <b>***</b> p&lt;0.01. Cells with fewer than 40 respondents are hidden.',
            foot='Source: <a href="https://europeanvaluesstudy.eu/" target="_blank" rel="noopener">European Values Study</a> 2017 (GESIS ZA7500 v5) · aggregated by BullDozer · weighted (gweight), Kish effective N for intervals.',
            inds=[
                ('Wellbeing & lifestyle', 'v7', {1, 2}, {1, 2, 3, 4}, 'Happiness',
                 'Very or quite happy, taking all things together.',
                 dict(slug='evs-happiness', title='Happiness (EVS)', topic='wellbeing')),
                ('Society & values', 'v31', {1}, {1, 2}, 'Interpersonal trust',
                 'Most people can be trusted (vs. can’t be too careful).',
                 dict(slug='evs-interpersonal-trust', title='Interpersonal Trust (EVS)', topic='attitudes')),
                ('Society & values', 'v37', {1, 2}, {1, 2, 3, 4}, 'Trust in other nationalities',
                 'Trust people of another nationality completely or somewhat.'),
                ('Politics & democracy', 'v5', {1, 2}, {1, 2, 3, 4}, 'Politics matters',
                 'Say politics is very or quite important in their life.'),
                ('Values & religion', 'v6', {1, 2}, {1, 2, 3, 4}, 'Religion matters',
                 'Say religion is very or quite important in their life.'),
                ('Values & religion', 'v153', {6, 7, 8, 9, 10}, list(range(1, 11)), 'Acceptance of homosexuality',
                 'Rate homosexuality 6–10 on a 1–10 justifiable scale (a common tolerance measure).',
                 dict(slug='evs-tolerance-homosexuality', title='Acceptance of Homosexuality (EVS)', topic='attitudes')),
            ],
        )
        generate(cfg)


if __name__ == '__main__':
    main()
