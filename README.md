# We roam, we nest.

[![Pages](https://github.com/brucerry/roamnest/actions/workflows/pages.yml/badge.svg)](https://github.com/brucerry/roamnest/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A responsive globe itinerary planner for cities, daily notes and attractions. Explore geography and
city-local clocks, arrange visits, open directions, and save private JSON backups.

---

## Build and run

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run build
npm start
```

`npm run build:static` produces the static site in `dist/`;
relative assets support hosting under `/roamnest/`. Each build clears previous generated output.

---

## Project structure

| Path                            | Responsibility                                        |
| ------------------------------- | ----------------------------------------------------- |
| `src/main.ts`                   | Application setup and planner events                  |
| `src/domain/`                   | Itineraries, places, validation, storage and backups  |
| `src/features/planner/`         | City map and attraction editing                       |
| `src/features/globe/`           | Globe rendering, motion, routes and geographic labels |
| `src/services/`                 | Optional location services                            |
| `src/i18n/`                     | Translation behavior and locale dictionaries          |
| `src/ui/`                       | Shared menus, popups, tooltips and transitions        |
| `src/styles/`                   | Stylesheets loaded in cascade order by `index.css`    |
| `public/`                       | Bundled geography, images and licensed vendor assets  |
| `scripts/`                      | Build, loopback preview and release audit             |
| `tests/unit/`, `tests/browser/` | Functional tests and portable browser checks          |

---

## Development checks

```sh
npm run format
npm run format:check
npm run typecheck
npm test
```

Source uses four-space indentation and a 100-column wrapping target. Prettier and EditorConfig keep
the style consistent; bundled data and vendor files retain their original formatting.

For browser checks, install Chromium with
`node node_modules/playwright-core/cli.js install chromium`, then run `npm run test:browser`,
`npm run test:views` and `npm run test:globe-effects` after building. These suites use disposable
fixtures and isolated loopback servers. Set `ROAMNEST_TEST_WEBKIT=1` to also run WebKit in the
base-path suite where supported and installed.

Run `npm run audit:release` and review staged files before committing or publishing. The audit
checks public files, build output and reachable Git history for private artifacts.

---

## Deployment

The Pages workflow validates pushes and pull requests. After release approval, choose GitHub Actions
as the Pages source and run the workflow on `main` with **deploy** enabled.

---

## Data and privacy

Trips stay in this browser; export backups before clearing storage. Optional IP lookup, map tiles,
road routing and external directions disclose the data sent to each provider. Coordinates may
represent an area rather than an entrance. Live flight and hotel prices are unavailable.

The globe includes generalized forest biomes, major rivers and static Explore stars. Optional route
effects simulate 18 researched directional airport pairs; their paths and timing are illustrative,
with source limits shown in the route panel.

Bundled assets retain their own licenses. See
[third-party notices and service limits](THIRD_PARTY.md).
