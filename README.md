# BullDozer

Marketing analytics & research platform, built on the **Madeira Ativa** analytics engine.
Served at **https://shpara.com/bulldozer** (Astro static build, `base: /bulldozer`).

> Only **public, parsed** data. Every dataset carries its source, licence, unit and parse date.

## Sections

| Section | Route | What |
|---|---|---|
| Surveys | `/bulldozer/surveys` | Parsed public opinion & market surveys (Eurobarometer, Gallup …) |
| Macro | `/bulldozer/macro` | IMF / World Bank indicators from open APIs |
| Glossary | `/bulldozer/glossary` | Plain-language explanations of every metric |
| Dashboard | `/bulldozer/dataset/<slug>` | KPIs, leaders, movers, group rollups per dataset |

## Architecture

```
src/
  lib/analytics.ts   # generic port of Madeira data_processor.py
                     # KPI, top movers, group rollups, period-over-period trends
  lib/format.ts      # number / percent formatting
  data/
    datasets.ts      # registry — every dataset + provenance metadata
    surveys/*.json    macro/*.json   # normalised observations
    glossary.ts      # metric definitions
  components/        # KpiRow, BarList, MoversTable, Provenance
  pages/             # index, surveys/, macro/, glossary/, dataset/[slug]
scripts/fetch_imf.mjs # pulls real IMF DataMapper data (no API key)
```

### Data model

One long-format `Observation`: `{ entity, period, value, group? }` — the same shape
the Madeira pipeline used for `region / date / search_volume`, generalised so
surveys, macro indicators and (later) brand data all flow through one analytics layer.

## Develop

```bash
npm install
npm run dev          # http://localhost:4321/bulldozer/
npm run build        # → dist/
npm run data:build   # rebuild all datasets from curated sources (macro + surveys)
npm run parse:macro  # IMF WEO tidy → src/data/macro/*.json
npm run parse:surveys# Gapminder + World Happiness → src/data/surveys/*.json
npm run fetch:imf    # optional: live IMF DataMapper API fallback
```

## Data sources

The parsers read curated, public, tidy exports from local paths (overridable by env):

| Parser | Default source | Env override |
|---|---|---|
| `parse:macro` | `~/Documents/tableau_data/macro/imf_weo_apr2026_tidy.csv` | `IMF_WEO_CSV`, `REF_YEAR` |
| `parse:surveys` (Gapminder) | `…/BK/Opros/Inter_survey/Gapminder/` | `GAPMINDER_DIR` |
| `parse:surveys` (WHR) | `~/Documents/tableau_data/happiness/whr_tidy.csv` | `WHR_CSV` |

Output is small normalised JSON (latest two periods per indicator) committed to
the repo. Russian region/indicator labels in the sources are mapped to English.
Each parser soft-skips when its source is absent, so CI without the curated
files still succeeds.

## Add a dataset

1. Drop a normalised JSON in `src/data/surveys/` or `src/data/macro/`
   (shape: `{ meta: {...provenance}, data: [Observation] }`).
2. Register it in `src/data/datasets.ts`.
   A dashboard at `/bulldozer/dataset/<slug>` is generated automatically.

## Change semantics (pct vs pp)

Datasets in percentage/rate units (`%`, `% YoY`) are compared in **percentage
points (pp)** — e.g. trust 58→61 is `+3.0pp`, GDP growth 0.7→−0.2 is `−0.9pp`.
Count/volume datasets use **multiplicative percent (%)**. The mode is derived
from the unit in `src/data/datasets.ts` (`deriveChangeMode`) and threaded
through the analytics layer, dashboards and the Telegram digest.

## Automation & access

GitHub Actions workflows (`.github/workflows/`):

| Workflow | Schedule | Does |
|---|---|---|
| `update-data.yml` | Mon 06:00 UTC | runs parsers (`fetch:imf`, …), commits data changes |
| `telegram-digest.yml` | Mon 06:30 UTC | posts a top-movers digest to Telegram |

Secrets (set in GitHub → Settings → Secrets and variables → Actions; never
commit values — see `.env.example`):

- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — digest delivery (`npm run digest`).
- Deploy token for the chosen host (`VERCEL_TOKEN` / `CLOUDFLARE_API_TOKEN` …).

## Deploy

Static Astro export (`npm run build` → `dist/`), host-agnostic:

- **Vercel** — connect the repo, build `npm run build`, output `dist`. For a
  subdomain (`bulldozer.shpara.com`) drop `base` to `'/'` in `astro.config.mjs`.
- **Cloudflare Pages** — same build/output; add Workers + D1/R2 if a server
  data layer is needed.
- The `base: '/bulldozer'` setting path-prefixes the build for mounting under
  `…/bulldozer`; remove it for a root/subdomain deploy.
