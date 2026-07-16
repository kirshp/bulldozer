#!/usr/bin/env python3
"""ISSP (Environment IV, 2020, ZA7650) → extended dashboard via survey_dash."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent / 'lib'))
from survey_dash import generate  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOME = pathlib.Path.home()
SRC = HOME / 'Library/Mobile Documents/com~apple~CloudDocs/BK/Opros/Inter_survey/ISSP_International_Social_Survey_Programme'

CC = {'AT': 'Austria', 'AU': 'Australia', 'CH': 'Switzerland', 'CN': 'China', 'DE': 'Germany',
      'DK': 'Denmark', 'ES': 'Spain', 'FI': 'Finland', 'FR': 'France', 'HR': 'Croatia',
      'HU': 'Hungary', 'IN': 'India', 'IS': 'Iceland', 'IT': 'Italy', 'JP': 'Japan',
      'KR': 'South Korea', 'LT': 'Lithuania', 'NO': 'Norway', 'NZ': 'New Zealand',
      'PH': 'Philippines', 'RU': 'Russia', 'SE': 'Sweden', 'SI': 'Slovenia', 'SK': 'Slovakia',
      'TH': 'Thailand', 'TW': 'Taiwan', 'US': 'United States', 'ZA': 'South Africa'}

T10 = list(range(0, 11))
cfg = dict(
    name='ISSP', wave='2020', file=SRC / 'ZA7650_v2-0-0.sav',
    weight='WEIGHT', country_col='c_alphan', sex_col='SEX', age_col='AGE',
    country_map=CC, sex_map={1: 'Male', 2: 'Female'}, min_cell=40,
    out_html=ROOT / 'public/dashboards/issp.html',
    folder_copy=SRC / 'issp_extended_dashboard.html',
    title='ISSP — extended dashboard',
    lead='Weighted attitudes across the ISSP Environment module (2020), broken down by country, sex and age with 95% confidence intervals — trust, media, the environment and what people will give up for it.',
    sigkey='Men–women gap: <b>·</b> n/s · <b>**</b> p&lt;0.05 · <b>***</b> p&lt;0.01. Cells with fewer than 40 respondents are hidden.',
    foot='Source: <a href="https://issp.org/" target="_blank" rel="noopener">ISSP</a> Environment IV (GESIS ZA7650, 2020) · aggregated by BullDozer · weighted, Kish effective N for intervals.',
    inds=[
        ('Society & values', 'v10', {4, 5}, {1, 2, 3, 4, 5}, 'Interpersonal trust',
         'Most people can be trusted (top-2 of a 5-point scale).'),
        ('Politics & democracy', 'v14', {6, 7, 8, 9, 10}, T10, 'Trust in parliament',
         'Above-midpoint trust in the national parliament (0–10 scale).'),
        ('Media', 'v12', {6, 7, 8, 9, 10}, T10, 'Trust in the news media',
         'Above-midpoint trust in the news media (0–10 scale).'),
        ('Environment & values', 'v15', {4, 5}, {1, 2, 3, 4, 5}, 'Concern for the environment',
         'Concerned about environmental issues (top-2 of a 5-point scale).'),
        ('Consumption & lifestyle', 'v26', {1, 2}, {1, 2, 3, 4, 5}, 'Willing to pay more (green)',
         'Very or fairly willing to pay much higher prices to protect the environment.'),
    ],
)

if __name__ == '__main__':
    generate(cfg)
