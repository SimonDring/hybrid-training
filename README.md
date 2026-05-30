# Hybrid Training Plan — PWA

A fully installable Progressive Web App. Offline-capable, mobile-first, no backend (yet).

This document covers what the codebase looks like, how to run it, how to test it, and where to put new code.

---

## File structure

```
.
├── index.html              # App shell (loads src/app.js as ES module)
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── README.md               # This file
├── docs/
│   └── SCHEMA.md           # Data model spec — source of truth for v4 + future Supabase
├── icons/                  # App icons (see icons/README.md)
├── src/
│   ├── app.js              # Bootstrap — imports modules, wires globals, starts router
│   ├── modules/
│   │   ├── Storage.js      # localStorage wrapper. Zero deps.
│   │   ├── Database.js     # Typed entity facade. Depends on Storage.
│   │   ├── State.js        # Backwards-compat v3 facade. Depends on Database.
│   │   ├── SessionHelper.js# Predicates. Depends on State.
│   │   ├── Utils.js        # Pure helpers. Zero deps.
│   │   └── Router.js       # Stack navigation. Depends on Screens registry.
│   ├── data/
│   │   └── Plan.js         # Static training programme content. Zero deps.
│   ├── pwa/
│   │   └── PWA.js          # Service worker registration + install hints. Zero deps.
│   ├── screens/
│   │   ├── index.js        # Registry — maps route names to screen modules
│   │   ├── home.js         # Home dashboard
│   │   ├── phases.js       # Phases list + drill-down (phase/week/session detail)
│   │   ├── tracking.js     # Tracking hub + check-in + metrics + trends + log
│   │   ├── profile.js      # Profile + overview + decisions + principles + reassess
│   │   └── settings.js     # Settings (theme, data, PWA, about)
│   └── styles/
│       └── main.css        # All styles (will be split as it grows)
└── tests/
    └── data-layer.js       # Node-runnable smoke tests for the data layer
```

---

## Module dependency graph

Read this as "X depends on what it points to."

```
                      Storage
                         ↑
                      Database
                         ↑
                       State
                         ↑
                   SessionHelper
                         ↑
        ┌────────────────┼────────────────┬────────────────┐
        ↑                ↑                ↑                ↑
   screens/home    screens/phases   screens/tracking  screens/profile  screens/settings
        ↑                ↑                ↑                ↑                ↑
        └────────────────┴────────────────┼────────────────┴────────────────┘
                                          ↑
                                  screens/index.js (registry)
                                          ↑
                                       Router
                                          ↑
                                       app.js  ← also imports PWA, Plan, Utils
```

The clean direction means you can:
- Test Storage in isolation (zero imports)
- Test Database knowing only Storage is needed
- Swap any single layer (e.g. Database from localStorage to Supabase) without touching layers above

---

## Running locally

The app uses native ES modules, so it must be served over HTTP — opening `index.html` via `file://` won't work (browsers block module imports from `file:`).

```bash
# From the project root
python3 -m http.server 8000
# Open http://localhost:8000
```

Or with Node:

```bash
npx http-server -p 8000
```

---

## Running tests

```bash
node tests/data-layer.js
```

21 assertions covering migration, CRUD, session lifecycle, and import/export. Exit code 0 = all pass. Run before every commit.

---

## Deploying to GitHub Pages

1. Push the whole directory to your repo
2. Settings → Pages → set source to branch + folder `/` (root)
3. Wait ~30s for the deploy
4. Open `https://<your-username>.github.io/<repo-name>/`

All paths are relative (`./...`), so subdirectory deployments work without changes.

---

## Where to add new code

| To add… | Put it in… |
|---|---|
| A new screen | `src/screens/<name>.js`, then register in `src/screens/index.js` |
| A new data table | Document in `docs/SCHEMA.md`, then implement in `src/modules/Database.js` |
| New training content | `src/data/Plan.js` |
| A new utility function | `src/modules/Utils.js` (if zero deps; otherwise its own module) |
| New styles | `src/styles/main.css` |
| Backend integration code | New module (e.g. `src/modules/Supabase.js`, `Strava.js`) |

---

## Migration roadmap

- **Stage 1** ✓ Architecture stabilisation (current)
- **Stage 2** React migration (Vite)
- **Stage 3** Supabase backend
- **Stage 4** Auth + multi-user
- **Stage 5** Strava integration
- **Stage 6** Fitbit / Google Health
- **Stage 7** Recovery dashboard
- **Stage 8** AI adaptation engine
- **Stage 9** React Native / App Store

---

## PWA installation

### iPhone / iPad (Safari only)
Open the URL in Safari → Share → Add to Home Screen.

### Android
Browser shows install prompt automatically. Or browser menu → Install app. Or in-app: Settings → App → Install on this device.

### Desktop (Chrome / Edge)
Address bar shows install icon, or browser menu → Install Hybrid.

---

## Updating after deploy

Bump `CACHE_VERSION` in `sw.js` on every meaningful deploy. Users will see a green "Update available — Reload" toast within 30 minutes (or on next launch).
