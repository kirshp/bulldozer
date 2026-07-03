#!/usr/bin/env python3
"""Freedom House FIW Excel -> tidy CSV (name,edition,status,total).

The aggregate-scores workbook needs pandas/openpyxl, so this pre-step runs in
Python; parse_fiw.mjs picks up the tidy CSV and does ISO mapping + dataset
output. Source file is archived next to the tidy CSV.
  python3 scripts/extract_fiw.py <fiw.xlsx>
"""
import csv
import pathlib
import shutil
import sys

import pandas as pd

OUT_DIR = pathlib.Path.home() / 'Documents' / 'tableau_data' / 'macro'
SHEET = 'FIW13-24'

def main() -> None:
    src = pathlib.Path(sys.argv[1])
    df = pd.read_excel(src, sheet_name=SHEET, header=1)
    df = df[['Country/Territory', 'C/T', 'Edition', 'Status', 'Total']].dropna(subset=['Total'])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / 'fiw_tidy.csv'
    with out.open('w', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(['name', 'ct', 'edition', 'status', 'total'])
        for r in df.itertuples(index=False):
            w.writerow([r[0], r[1], int(r[2]), r[3], int(r[4])])
    shutil.copy2(src, OUT_DIR / 'fiw_all_data_2013_2024.xlsx')
    print(f'ok {len(df)} rows -> {out}')

if __name__ == '__main__':
    main()
