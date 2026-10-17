# FPV TRACK DESIGNER - PROJECT KNOWLEDGE BASE

**Generated:** 2026-10-16
**Code state:** db57870 (2026-10-16)
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
│   ├── hooks/                 # keyboard shortcuts, R3F selection, theme selector
│   ├── schemas/               # track export/import validation boundary
│   ├── store/                 # editor Zustand config + track slices
│   ├── types/                 # domain contracts + theme presets
│   ├── utils/                 # generator, flight path, storage, share links, pole count
│   ├── constants/             # shared gate dimensions
│   └── lib/                   # cn helper for shadcn classes
├── vite.config.ts             # editor build + Vitest config
├── vite.config.viewer.ts      # single-file viewer build to dist-viewer/
├── Dockerfile                 # editor nginx container
├── Dockerfile.viewer          # static viewer nginx container
├── nginx.conf                 # editor nginx: /api/shorten-track proxy + SPA fallback
├── docker-compose.yml         # local editor-only compose (8080:80)
├── .env.development/.production  # build-time VITE_TRACK_SHORTENER_ENDPOINT per mode
├── .env.example               # documents VITE_VIEWER_DOMAIN + VITE_TRACK_SHORTENER_ENDPOINT
├── public/                    # favicon.svg, icons.svg, screenshot.png
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
| Add/change gate visuals | `src/components/gates/`, `src/types/gate.ts`, `src/utils/gateTypeOptions.ts` | Fixed set of 11 types (`standard`, `h-gate`, `double-h`, `hurdle`, `dive`, `double`, `ladder`, `start-finish`, `flag`, `flag-small`, `octagonal-tunnel`); update dispatcher/schema/tests together |
| Change 3D scene/camera/themes | `src/components/scene/`, `src/types/theme.ts`, `src/utils/themeColors.ts` | R3F hooks stay under the single Canvas owner |
| Field presets / venues | `src/types/venue.ts`, `src/utils/venuePresets.ts`, `src/components/scene/VenueObstacles.tsx`, `src/components/ui/GateConfigPanel.tsx` | "Last OG3" (10.5 x 22.7 m, four hall pillars); picking a preset writes `config.venueId`, locks the field-size inputs, and renders the pillars as raycast-inert obstacles in the scene |
| Change panels/dialog UI | `src/components/ui/` | shadcn primitives plus app-specific dialogs/panels |
| Track generation | `src/utils/generator.ts` | Min 3m gate distance, nearest-neighbor order, 30 degree rotation alignment |
| Flight path logic | `src/utils/flightPath.ts` | Dense geometry/avoidance algorithm; test edge cases |
| Store state/actions | `src/store/configSlice.ts`, `src/store/trackSlice.ts` | Slice pattern, history, dirty-state workflow |
| Import/export validation | `src/schemas/track.schema.ts` | Persistence boundary, legacy normalization, error shape |
| Persistence | `src/utils/storage.ts` | Browser `localStorage`; route validation through schemas |
| Share-link payloads | `src/utils/shareTrack.ts` | `lz-string` compressed `z.` payloads + legacy base64 fallback |
| Keyboard/mouse selection | `src/hooks/`, `src/components/gates/GateHandles.tsx` | Desktop mouse/keyboard first; shortcut tests in hooks |
| Unsaved-changes guard | `src/components/ui/UnsavedChangesDialog.tsx`, `src/store/trackSlice.ts` | Destructive actions stage through `requestDestructiveAction`; the dialog offers cancel / save first / discard |
| FPV fly-through | `src/components/scene/FpvFlyThrough.tsx`, `src/App.tsx` | Automated camera flight along the ideal line; disabled with fewer than 2 gates (editor and viewer) |
| First-visit onboarding | `src/App.tsx` | Generates a starter track while none exists and opens the help dialog once per browser via cookie |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `App` | component | `src/App.tsx` | Editor orchestration, dialogs, first-load generation |
| `useTranslation` / `translateOutsideReact` | functions | `src/i18n.ts` | UI translations plus viewer bootstrap error text |
| `TopBar` / `LeftToolPanel` | components | `src/components/layout/` | Shell controls, import/export, share, shuffle, settings |
| `ViewerApp` | component | `src/components/viewer/ViewerApp.tsx` | Read-only viewer shell, export/help controls |
| `loadTrackFromHash` | function | `src/viewer-main.tsx` | Decodes shared-track hash into viewer store |
| `useAppStore` | Zustand store | `src/store/index.ts` | Combined editor store (config + track slices) with devtools |
| `useViewerStore` | Zustand store | `src/viewer-store.ts` | Viewer-only `{ track, config, error }` state |
| `createTrackSlice` | Zustand slice | `src/store/trackSlice.ts` | Selection, undo/redo, dirty-state, destructive actions |
| `generateTrack` | function | `src/utils/generator.ts` | Random track generation and initial sequence |
| `calculateFlightPath` | function | `src/utils/flightPath.ts` | Path segments, samples, arrows, gate-specific avoidance |
| `GateHandles` | component | `src/components/gates/GateHandles.tsx` | Move/rotate/elevate/insert/delete controls in 3D |
| `Scene` | component | `src/components/scene/Scene.tsx` | Single Canvas owner (used by App + ViewerApp); imports `useAppStore` |
| `serializeTrack` / `deserializeTrack` | functions | `src/schemas/track.schema.ts` | Export/import shape validation and normalization |
| `encodeTrackSharePayload` / `decodeTrackSharePayload` | functions | `src/utils/shareTrack.ts` | Compressed share link payload boundary |
| `THEME_PRESETS` | constant | `src/types/theme.ts` | Minimal/realistic/night renderer and color presets |
| `downloadTrackQrCodePng` / `createTrackQrCodeSvg` | functions | `src/utils/qrCode.ts` | Share QR PNG/SVG generation |
| `FpvFlyThrough` | component | `src/components/scene/FpvFlyThrough.tsx` | Automated FPV camera flight |
| `VENUE_PRESETS` / `getVenuePreset` | constant / function | `src/utils/venuePresets.ts` | Venue presets (field size + obstacles) and lookup by `VenueId` |
| `VenueObstacles` | component | `src/components/scene/VenueObstacles.tsx` | Renders the active venue's fixed obstacles (hall pillars) |
| `TrackGallery` | component | `src/components/ui/TrackGallery.tsx` | Saved-track sheet: list, load, duplicate, delete |
| `PoleCounter` / `calculatePoleBreakdown` | component / function | `src/components/layout/PoleCounter.tsx`, `src/utils/poleCount.ts` | Pole-count badge plus per-type breakdown with a `notBuildable` flag |
| `UnsavedChangesDialog` | component | `src/components/ui/UnsavedChangesDialog.tsx` | Cancel / save first / discard for staged destructive actions |

## CONVENTIONS
- Named exports by default. `App.tsx` is the lone default export.
- `import type` for type-only imports. `verbatimModuleSyntax` is enabled.
- `erasableSyntaxOnly` is enabled: no enums, namespaces, or constructor parameter properties.
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

## UNIQUE STYLES
- Gate rotation: the rotate handle is continuous at 1 degree per pixel and rounds to 15 degree steps only while `config.snapGatesToGrid` is on; the generator aligns new gates to 30 degree steps.
- Gate movement: the visible path is the free move-handle drag; the store `moveGate` (N/S/E/W, default 1 m) and `rotateGate` (plus/minus 30 degree) actions and `DirectionalPad` have no UI caller.
- Snap grid: sizes are 0.3 m, 0.5 m, and 1.0 m (`SNAP_GRID_SIZES`); the fallback step is `GATE_BASE_WIDTH / 4` = 0.3 m.
- Undo/redo: `past`/`future` arrays, `MAX_HISTORY=50`, dirty flag captured in history entries.
- Flight path: gate-sequence visits, Bezier sampling, disjoint native `THREE.Line` segments, arrows along path.
- Camera controls: Space/right-click pan, Shift vertical pan, wheel/middle-click smooth zoom.
- Themes: `minimal`, `realistic`, `night`; night enables bloom/neon emissive gates.
- Import/export schema keeps legacy compatibility explicit, e.g. old `asymmetric` gate type mapping.
- Share links use compressed `z.` payloads and still decode legacy base64-url payloads.
- UI copy is bilingual through `src/i18n.ts`; add DE/EN keys together.

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
- Docker deploys editor and viewer separately; the viewer container is static-only.
- Chunk size warning from R3F/Drei bundle is acceptable for MVP.
- `src/assets/hero.png`, `react.svg`, `vite.svg` are template/unused leftovers.
- `src/components/gates/index.ts` barrel is incomplete (missing `LadderGate`, `FlagSmall`, `GateHandles`, `GateOpeningIndicators`) and has no importers; `Scene.tsx` and `Gate.tsx` import gate files directly.
- `utils/gateOperations.ts` is dead in production (only its own test imports it); `trackSlice.ts` reimplements `moveGate`/`rotateGate` inline.
- Test libraries live in `dependencies` (normally `devDependencies`); `@testing-library/jest-dom` is declared but never imported (no Vitest setup file), so tests use plain matchers.
- Root has generated QA/build artifacts at times (`qa-*.png`, `dist/`, `dist-viewer/`); keep generated artifacts out of commits unless intentionally requested.
- Avoid creating visual QA screenshots unless explicitly requested.
- `docs/` holds `coolify-track-sharing.md` (two-service deploy + n8n proxy), `NUTZERDOKUMENTATION.md` (German user docs), and `dokumentations-audit.md`.
- `utils/qrCode.ts` generates share QR PNG/SVG via `qrcode`; `ShareTrackDialog` previews via `dangerouslySetInnerHTML`.
- No CI workflows exist; build/test/lint are run manually.
- Short-link flow: the dev Vite server and the editor nginx both proxy `/api/shorten-track` to the n8n webhook; use `/webhook/shorten-track`, not `/webhook-test/`. `.env.development` and `.env.production` set only `VITE_TRACK_SHORTENER_ENDPOINT`; `.env.example` additionally documents `VITE_VIEWER_DOMAIN`, which is optional and falls back to the `DEFAULT_VIEWER_DOMAIN` constant in `src/utils/shareTrack.ts`. All `VITE_*` values are baked in at build time.
- `components/scene/Scene.tsx` and `Grid.tsx` import `useAppStore` at module level, so the viewer bundle includes the editor store even though the viewer passes `track`/`configOverride`.
- `types/gate.ts` comments `rotation` as continuous (0-359), but `trackSlice.rotateGate` applies ±30° steps (0-330); the comment is stale.
- Gate type catalog: exactly 11 types, defined in `src/types/gate.ts` and labeled in `src/utils/gateTypeOptions.ts` (see WHERE TO LOOK).
- Pole counter: `calculatePoleBreakdown` in `src/utils/poleCount.ts` sums poles per type and flags `notBuildable` for every type with `polesPerGate === 0`, which is hurdle, dive, and octagonal-tunnel.
- First-visit flow: `src/App.tsx` generates a starter track while no track exists and opens the help dialog once per browser using the `fpv-track-designer-visited` cookie (max-age `60 * 60 * 24 * 365`, one year).
- Viewer: an empty hash shows `viewerMissingPayload` and an undecodable one `viewerInvalidPayload` (`src/viewer-main.tsx`); `ViewerApp` adds the error title, a "no track loaded" state, a JSON download, and a help dialog that auto-opens once via the `fpv-track-viewer-help-seen` cookie.
- Toolchain requires Node `^20.19.0 || >=22.12.0` (Vite's engine range); `package.json` pins no `engines` field.
