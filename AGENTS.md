# FPV TRACK DESIGNER - PROJECT KNOWLEDGE BASE

**Generated:** 2026-10-28
**Code state:** 78693b5 (2026-10-28, worktree)
**Branch:** main

## OVERVIEW
Desktop-first (mouse/keyboard primary, with touch pan/pinch support) 3D FPV drone racing track designer plus a standalone read-only share viewer. React 19 + Vite/Vitest, R3F/Drei scene, Zustand slices, Tailwind v4/shadcn UI, schema-guarded local persistence and compressed share links.

## STRUCTURE
```
fpv-track-designer/
├── index.html                 # editor app HTML entry -> src/main.tsx
├── viewer.html                # share-viewer HTML entry -> src/viewer-main.tsx
├── src/
│   ├── App.tsx                # editor shell: dialogs, first-load flow, scene composition
│   ├── i18n.ts                # typed DE/EN translations + localStorage language store
│   ├── index.css              # Tailwind v4 CSS entry + theme tokens
│   ├── main.tsx               # editor bootstrap, StrictMode + ErrorBoundary
│   ├── viewer-main.tsx        # hash payload decode + viewer bootstrap
│   ├── viewer-store.ts        # viewer-only Zustand store; no editor mutations
│   ├── components/
│   │   ├── gates/             # fixed 3D gate components + handles/opening indicators
│   │   ├── layout/            # TopBar, LeftToolPanel, PoleCounter app shell
│   │   ├── scene/             # single R3F Canvas owner, camera controllers, themes
│   │   ├── ui/                # shadcn primitives + editor panels/dialogs
│   │   ├── viewer/            # read-only share viewer UI
│   │   ├── icons/             # gate-type SVG icon
│   │   └── ErrorBoundary.tsx  # only class component; hardcoded DE copy
│   ├── hooks/                 # keyboard shortcuts, R3F selection, drag hooks, theme selector
│   ├── lib/                   # `cn` class-merge helper
│   ├── schemas/               # track export/import validation boundary
│   ├── store/                 # editor Zustand config + track slices
│   ├── types/                 # domain contracts + theme presets
│   ├── utils/                 # generator, flight path, storage, share links, pole count
│   └── constants/             # shared gate dimensions
├── vite.config.ts             # editor build + Vitest config
├── vite.config.viewer.ts      # single-file viewer build to dist-viewer/
├── Dockerfile / Dockerfile.viewer  # editor nginx + static-only viewer nginx
├── nginx.conf                 # editor nginx: /api/shorten-track proxy + SPA fallback
├── docker-compose.yml         # local editor-only compose (8080:80)
├── .env.development/.production/.example  # build-time VITE_* values, all baked in
├── public/                    # favicon.svg, icons.svg, screenshot.png
├── CHANGELOG.md               # German user-facing release log; checked before every commit
├── README.md / components.json # German feature readme; shadcn config
└── docs/                      # Coolify deploy, German user docs, docs audit
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Editor app shell / first-load flow | `src/App.tsx`, `src/main.tsx`, `src/AGENTS.md` | StrictMode is enabled; mount effects must be idempotent |
| Translations / language toggle | `src/i18n.ts` | Add DE + EN keys together; consumers use `useTranslation()` |
| Top toolbar / side tools / pole counter | `src/components/layout/`, `src/components/layout/AGENTS.md` | Import/export, FPV toggle, share, shuffle, shell controls; the pole-counter badge opens a per-type breakdown and lists the types that can't be built from poles (hurdle, dive, octagonal-tunnel) separately |
| Share viewer / read-only links | `src/viewer-main.tsx`, `src/viewer-store.ts`, `src/components/viewer/` | Hash payload -> decoded track/config -> read-only `Scene`; empty and undecodable payloads show translated error states, the help dialog auto-opens once per browser (cookie), and the track downloads as JSON |
| Saved tracks / gallery | `src/components/ui/TrackGallery.tsx`, `src/hooks/useKeyboardShortcuts.ts`, `src/components/layout/LeftToolPanel.tsx` | Open with `G`; list, load, duplicate, and delete tracks saved in `localStorage` |
| Official tracks / track library | `tracks/`, `src/utils/officialTracks.ts`, `src/components/ui/OfficialTracksDialog.tsx`, `src/components/layout/LeftToolPanel.tsx`, `docs/OFFIZIELLE-TRACKS-HINZUFUEGEN.md` | Repository track JSONs are bundled at build; the left-panel trophy button opens the list and loads a track through `requestDestructiveAction`; the runbook is the step-by-step for adding a new track and deploying it |
| Add/change gate visuals | `src/components/gates/`, `src/types/gate.ts`, `src/utils/gateTypeOptions.ts` | Fixed set of 11 types (`standard`, `h-gate`, `double-h`, `hurdle`, `dive`, `double`, `ladder`, `start-finish`, `flag`, `flag-small`, `octagonal-tunnel`); UI labels come from `gateTypeLabels` in `src/i18n.ts`, so also update `src/components/icons/GateIcon.tsx`, the per-type theme colors, `POLES_PER_GATE`, and the default quantities/openings together |
| Change 3D scene/camera/themes | `src/components/scene/`, `src/types/theme.ts`, `src/utils/themeColors.ts` | R3F hooks stay under the single Canvas owner |
| Field presets / venues | `src/types/venue.ts`, `src/utils/venuePresets.ts`, `src/components/scene/VenueObstacles.tsx`, `src/components/ui/GateConfigPanel.tsx` | "Last OG3" (10.5 x 22.7 m, four hall pillars); picking a preset writes `config.venueId`, locks the field-size inputs, and renders the pillars as raycast-inert obstacles in the scene; the last pick is remembered per browser (`fpv-track-designer-venue`, `src/utils/venuePreference.ts`) and seeds the next visit |
| Change panels/dialog UI | `src/components/ui/` | shadcn primitives plus app-specific dialogs/panels |
| Track generation | `src/utils/generator.ts` | Min 3m gate distance, nearest-neighbor order, 30 degree rotation alignment |
| Flight path logic | `src/utils/flightPath.ts`, `src/utils/idealLine.ts` | Dense geometry/avoidance algorithm; test edge cases |
| Ideal-line point editing | `src/components/scene/FlightPathEditor.tsx`, `FlightPathPointControls.tsx`, `src/hooks/useFlightPathPointDrag.ts`, `src/utils/idealLine.ts`, `src/utils/gateInsertion.ts`, `src/store/trackSlice.ts` | Hovering a path line shows a `+` that expands into gate-or-point; the point inserts there and is dragged like a gate (press + travel on the dot for X/Z, Shift at the press for Y, plus move/elevate handles), the gate opens the normal insert dialog; points live on `track.idealLinePoints` and never dirty the track by selection alone |
| Regeneration prompt | `src/utils/generationConfig.ts`, `src/components/ui/ApplyConfigFooter.tsx` | `hasConfigDrift()` decides whether applying settings offers a regenerate |
| Store state/actions | `src/store/configSlice.ts`, `src/store/trackSlice.ts` | Slice pattern, history, dirty-state workflow |
| Persistence / import / export / share | `src/schemas/track.schema.ts`, `src/utils/storage.ts`, `src/utils/shareTrack.ts` | Schema-guarded `localStorage` CRUD; `lz-string` compressed `z.` payloads with legacy base64 fallback |
| Keyboard/mouse selection | `src/hooks/`, `src/components/gates/GateHandles.tsx` | Desktop mouse/keyboard first; shortcut tests in hooks |
| Unsaved-changes guard | `src/components/ui/UnsavedChangesDialog.tsx`, `src/store/trackSlice.ts` | Destructive actions stage through `requestDestructiveAction`; the dialog offers cancel / save first / discard |
| FPV fly-through | `src/components/scene/FpvFlyThrough.tsx`, `src/App.tsx` | Automated camera flight along the ideal line; disabled with fewer than 2 gates (editor and viewer) |
| User-visible change / release notes | `CHANGELOG.md`, `README.md`, `docs/NUTZERDOKUMENTATION.md`, `src/i18n.ts` | Changelog check before every commit; in-app help rows and the user manual are part of the feature's definition of done |

## CODE MAP
| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `App` | component | `src/App.tsx` | 1 | Editor orchestration, dialogs, first-load generation |
| `useTranslation` / `translateOutsideReact` | functions | `src/i18n.ts` | 17 | UI translations plus viewer bootstrap error text |
| `TopBar` / `LeftToolPanel` | components | `src/components/layout/` | 4 / 4 | Shell controls, import/export, share, shuffle, settings |
| `ViewerApp` / `loadTrackFromHash` | component / function | `src/components/viewer/ViewerApp.tsx`, `src/viewer-main.tsx` | 4 / 1 | Read-only viewer shell, export/help controls; hash decode into viewer store |
| `useAppStore` | Zustand store | `src/store/index.ts` | 28 | Combined editor store (config + track slices) with devtools |
| `useViewerStore` | Zustand store | `src/viewer-store.ts` | 3 | Viewer-only `{ track, config, error }` state |
| `createTrackSlice` | Zustand slice | `src/store/trackSlice.ts` | 3 | Selection incl. ideal-line points, undo/redo, dirty-state, destructive actions |
| `generateTrack` | function | `src/utils/generator.ts` | 6 | Random track generation and initial sequence |
| `calculateFlightPath` / `calculateFlightPathWithControlPoints` | functions | `src/utils/flightPath.ts` | 2 / 4 | Base route (called only by its test); the wrapper applies per-leg ideal-line points for scene, FPV and insertion previews |
| `GateHandles` | component | `src/components/gates/GateHandles.tsx` | 2 | Move/rotate/elevate/insert/delete controls in 3D |
| `Scene` | component | `src/components/scene/Scene.tsx` | 3 | Single Canvas owner (App + ViewerApp); imports `useAppStore` |
| `serializeTrack` / `deserializeTrack` | functions | `src/schemas/track.schema.ts` | 7 / 5 | Export/import shape validation and normalization |
| `encodeTrackSharePayload` / `decodeTrackSharePayload` | functions | `src/utils/shareTrack.ts` | 2 | Compressed share payload boundary; QR PNG/SVG in `qrCode.ts` |
| `FpvFlyThrough` | component | `src/components/scene/FpvFlyThrough.tsx` | 2 | Automated FPV camera flight |
| `VENUE_PRESETS` / `getVenuePreset` | constant / function | `src/utils/venuePresets.ts` | 3 / 5 | Venue presets (field size + obstacles) and lookup by `VenueId` |
| `PoleCounter` / `calculatePoleBreakdown` | component / function | `src/components/layout/PoleCounter.tsx`, `src/utils/poleCount.ts` | 3 / 3 | Pole-count badge plus per-type breakdown with a `notBuildable` flag |

## CONVENTIONS
- Named exports by default. `App.tsx` is the lone default export.
- `import type` for type-only imports; `verbatimModuleSyntax` and `erasableSyntaxOnly` are enabled (no enums, namespaces, or constructor parameter properties).
- `@/*` aliases cross-domain imports; nearby gate/scene/store/type files often use relative imports.
- Tests are co-located as `*.test.ts` or `*.test.tsx`; no shared Vitest setup file.
- Vitest config lives in `vite.config.ts` with `globals: true` and `environment: 'jsdom'`.
- Tailwind v4 is CSS-first via `@tailwindcss/vite`, `@import "tailwindcss"`, `tw-animate-css`, and `shadcn/tailwind.css`; no `tailwind.config.js`.
- Zustand editor state uses slice files merged in `src/store/index.ts`; viewer state is a separate tiny store in `src/viewer-store.ts`.
- UI components use shadcn/Radix primitives plus `cn` from `src/lib/utils.ts`.
- Viewer build uses `vite.config.viewer.ts`, `vite-plugin-singlefile`, `viewer.html`, and renames output to `dist-viewer/index.html`.
- `vite-plugin-singlefile` is single-entry only; keep editor and viewer builds as separate commands/outputs.
- Do not run Playwright/browser QA unless explicitly requested; the user handles visual QA by default.

## ANTI-PATTERNS (THIS PROJECT)
- No `as any`, `@ts-ignore`, or silent type suppression.
- No backend/database/auth scope; persistence is browser `localStorage`, n8n short-link proxy, and share-link hash payloads only.
- No per-gate size adjustment; gate dimensions are shared constants/global config behavior.
- No custom gate type creation; the app has a fixed gate type set.
- No new mobile/touch gestures beyond the existing two-finger pan and pinch zoom; mouse/keyboard stay the primary input.
- Do not duplicate schema validation in storage/import/share flows; route through `src/schemas`.
- Do not bypass the unsaved-changes flow for destructive editor actions; route them through `requestDestructiveAction` and the three-action dialog (cancel / save first / discard).
- Do not expose editor mutation actions in the read-only viewer store/UI.
- Do not assume `src/components/gates/index.ts` is authoritative; it is incomplete (missing `LadderGate`, `FlagSmall`, `GateHandles`, `GateOpeningIndicators`) and bypassed by `Scene.tsx`/`Gate.tsx`.
- Do not commit a user-visible feat, fix, or removal without a `CHANGELOG.md` entry; pure internal work stays out of the changelog.

## UNIQUE STYLES
- Gate drag: moving runs through the move handle or a press-drag on the gate body (`src/hooks/useGateMoveDrag.ts`); at press, Shift switches to 0.03 m/px vertical and Ctrl to rotation at 1 degree per pixel that rounds to 15 only while `config.snapGatesToGrid` is on. Both rotation paths (`GateHandles` handle and Ctrl press-drag) record no undo entry and leave the dirty flag false. The generator aligns new gates to 30 degree steps; the store `moveGate` (N/S/E/W, default 1 m) and `rotateGate` actions and `DirectionalPad` have no UI caller.
- Snap grid: sizes are 0.3 m, 0.5 m, and 1.0 m (`SNAP_GRID_SIZES`); the fallback step is `GATE_BASE_WIDTH / 4` = 0.3 m.
- Undo/redo: `past`/`future` arrays, `MAX_HISTORY=50`, dirty flag captured in history entries.
- Flight path: gate-sequence visits, Bezier sampling, disjoint native `THREE.Line` segments, arrows along path.
- Ideal-line points: optional `track.idealLinePoints` shape the route per leg; dormant points (dead leg refs) stay stored but render nothing.
- UI copy is bilingual through `src/i18n.ts`; add DE/EN keys together.

## CHANGELOG
`CHANGELOG.md` is the user-facing release log: German, one `## YYYY-MM-DD` heading per commit date, groups **Neu / Geändert / Behoben / Entfernt / Dokumentation**, short commit sha in parentheses, newest first; work that is not committed yet lives under `## Unveröffentlicht`.

Check it before every commit:
- **Entry required** when a user or viewer visitor can notice the change: new feature or gesture, changed behaviour or copy that changes what the app promises, bug fix, removed control or feature. Write the entry in the same commit under `## Unveröffentlicht`; move it under a dated heading once the commit carries that date.
- **No entry** for refactors, tests, comments, internal `AGENTS.md` refreshes, and wording-only doc corrections that do not change what the docs promise.
- Keep entries short and behavioural (what the user sees), not a file list and not a restatement of the commit message, and never a claim that was not verified against the code.
- Move the documentation surfaces with the feature: `README.md`, `docs/NUTZERDOKUMENTATION.md`, the in-app help in `src/i18n.ts`, and the nested `AGENTS.md` files. Refresh `docs/dokumentations-audit.md` (stamped with the HEAD it describes) whenever a documentation pass lands.

## COMMANDS
```bash
npm run dev            # Vite editor dev server at localhost:5173
npm run build          # tsc -b && vite build
npm run build:viewer   # single-file viewer build to dist-viewer/
npm run build:all      # editor build + viewer build
npm run test           # vitest (watch/default mode)
npm run lint           # eslint .
npm run preview        # preview production editor build only
```

## NOTES
- Chunk size warning from R3F/Drei bundle is acceptable for MVP.
- `src/assets/hero.png`, `react.svg`, `vite.svg` are template/unused leftovers.
- `utils/gateOperations.ts` is dead in production (only its own test imports it); `src/store/trackSlice.ts` reimplements `moveGate`/`rotateGate` inline.
- Test libraries live in `dependencies` (normally `devDependencies`); `@testing-library/jest-dom` is declared but never imported (no Vitest setup file), so tests use plain matchers.
- Root has generated QA/build artifacts at times (`qa-*.png`, `dist/`, `dist-viewer/`); keep generated artifacts out of commits unless intentionally requested.
- `docs/` holds `coolify-track-sharing.md` (two-service deploy + n8n proxy), `NUTZERDOKUMENTATION.md` (German user docs), and `dokumentations-audit.md`; `CHANGELOG.md` at the repo root is the user-facing log.
- No CI workflows exist; build/test/lint are run manually.
- Short-link flow: the dev Vite server and the editor nginx both proxy `/api/shorten-track` to the n8n webhook; use `/webhook/shorten-track`, not `/webhook-test/`. `.env.development` and `.env.production` set only `VITE_TRACK_SHORTENER_ENDPOINT`; `.env.example` additionally documents `VITE_VIEWER_DOMAIN`, which is optional and falls back to the `DEFAULT_VIEWER_DOMAIN` constant in `src/utils/shareTrack.ts`. All `VITE_*` values are baked in at build time.
- `components/scene/Scene.tsx` and `Grid.tsx` import `useAppStore` at module level, so the viewer bundle includes the editor store even though the viewer passes `track`/`configOverride`.
- `types/gate.ts` comments `rotation` as continuous (0-359), which matches the app: `GateHandles` writes continuous degrees; only the UI-less `trackSlice.rotateGate` action snaps to ±30°.
- Gate type catalog: exactly 11 types, defined in `src/types/gate.ts`, labeled bilingually in `src/i18n.ts` (`gateTypeLabels`), and ordered for UI/metrics in `src/utils/gateTypeOptions.ts`.
- First-visit flow: `src/App.tsx` generates a starter track while no track exists and opens the help dialog once per browser using the `fpv-track-designer-visited` cookie (max-age `60 * 60 * 24 * 365`, one year).
- Max pole limit: browser preference `fpv-track-designer-max-poles` (default 60, `src/utils/poleLimit.ts`); the pole-count badge turns destructive above it and opens a one-shot alert dialog. It never travels in exports or share links.
- Viewer: an empty hash shows `viewerMissingPayload` and an undecodable one `viewerInvalidPayload` (`src/viewer-main.tsx`); `ViewerApp` adds the error title, a "no track loaded" state, a JSON download, and a help dialog that auto-opens once via the `fpv-track-viewer-help-seen` cookie.
- Official tracks: `tracks/**/*.json` are bundled at build via `import.meta.glob('/tracks/**/*.json', { query: '?raw', eager: true })`, each file goes through `deserializeTrack()`, and broken or invalid files show up as a hint (with their file names) inside the official-tracks dialog instead of breaking the app. The repository file is both the entry identity and the display name: the card and the loaded track are named after the file without `.json`, files that share an exported `track.id` or `track.name` are still listed separately, and loading rewrites the track id to `official:<sourceFile>`. Adding a track means dropping the exported JSON into `tracks/` and rebuilding — `docs/OFFIZIELLE-TRACKS-HINZUFUEGEN.md` is the full runbook for that (validate, changelog, commit, push to `origin main`, Coolify rebuild).
- Toolchain requires Node `^20.19.0 || >=22.12.0` (Vite's engine range); `package.json` pins no `engines` field. Docker images diverge: editor `node:20-alpine`, viewer `node:24-alpine`.
