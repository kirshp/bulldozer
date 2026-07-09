# Walkadog 🐾

**Voluntariado nos refúgios da Madeira** — mapa da ilha, escala de turnos, cobertura, lembretes e relatórios.

Volunteers pick the days they can walk and care for the shelter dogs; the app turns
those picks into an island-wide coverage schedule with reminders, gap tracking and
reports. Inspired by the "Madeira Ativa" style: island map, work slots, information.

**Live preview (works on mobile):**
https://claude.ai/code/artifact/6b4e25d1-b0b7-4e31-9c00-3fce677632c4

## What it does

- **Island map** — schematic Madeira with a pin per shelter; pin colour = coverage
  (red = no volunteers, amber = thin, green = covered). Tap a pin to open its rota.
- **Sign-up** — tap a day in the shelter card (mobile-friendly) or a cell in the
  21-day grid (desktop overview) to add/remove your shift.
- **Reminders** — export your shifts as a calendar file (`.ics`) → Google/Apple/Outlook.
- **Report** — coverage %, days still to cover, and per-volunteer contribution.
- PT / EN, light / dark, fully responsive (no horizontal scroll on phones).

## Files

```
walkadog/
  index.html         # the whole app — self-contained (inline CSS + JS + data)
  data/shelters.json # shelter list, mirrored for a future backend
  README.md
```

`index.html` needs **no build step** — open it directly, or drop it at a web path.

## Run / deploy

- **Locally:** just open `index.html` in a browser.
- **At shpara.com/walkadog:** it is one static file, so:
  ```bash
  mkdir -p ~/shpara1/walkadog
  cp index.html ~/shpara1/walkadog/index.html
  # then your usual Cloudflare Pages deploy for ~/shpara1
  ```

## Data model (built for a shared backend later)

Storage is isolated behind `loadState()` / `saveState()` in `index.html`
(currently `localStorage`, single-device). Swap those two functions for REST /
Supabase / Cloudflare calls to make the schedule shared across all volunteers and
to enable server-side push / email reminders.

```
shelter  { id, name, council, coast, need, x, y, focus:{pt,en} }
signup   key "<shelterId>|<YYYY-MM-DD>" → [ volunteerName, ... ]
```

## Status

Prototype. Shelter localities, focus and daily need are **sample values** and must be
confirmed with each association before real use.
