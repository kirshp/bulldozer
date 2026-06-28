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
npm run fetch:imf    # refresh IMF macro data (optionally: node scripts/fetch_imf.mjs PCPIPCH 2023,2024)
```

## Add a dataset

1. Drop a normalised JSON in `src/data/surveys/` or `src/data/macro/`
   (shape: `{ meta: {...provenance}, data: [Observation] }`).
2. Register it in `src/data/datasets.ts`.
   A dashboard at `/bulldozer/dataset/<slug>` is generated automatically.

## Deploy (Cloudflare Pages)

- Build command: `npm run build`, output dir: `dist`.
- Because `astro.config.mjs` sets `base: '/bulldozer'`, the build is already
  path-prefixed and can be mounted under `shpara.com/bulldozer`
  (CF Pages project + route, or a path-mounted Worker / `_routes`).
- For a quick static drop into the existing site, copy `dist/` into
  `~/shpara1/bulldozer/`.
