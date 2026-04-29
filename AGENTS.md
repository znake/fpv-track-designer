# FPV TRACK DESIGNER - PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-29
**Commit:** 693d87f
**Branch:** main

## OVERVIEW
Desktop-only 3D FPV drone racing track designer plus standalone read-only share viewer. React 19 + Vite/Vitest, R3F/Drei scene, Zustand slices, Tailwind v4/shadcn UI, schema-guarded local persistence and compressed share links.

## STRUCTURE
```
fpv-track-designer/
├── index.html                 # editor app HTML entry → src/main.tsx
├── viewer.html                # share-viewer HTML entry → src/viewer-main.tsx
├── src/
│   ├── App.tsx                # editor shell: dialogs, sidebar, scene composition
│   ├── main.tsx               # editor bootstrap, StrictMode + ErrorBoundary
│   ├── viewer-main.tsx        # hash payload decode + viewer bootstrap
│   ├── viewer-store.ts        # viewer-only Zustand store; no editor mutations
│   ├── components/
│   │   ├── gates/             # fixed 3D gate components + handles/opening indicators
│   │   ├── scene/             # single R3F Canvas owner, camera controllers, themes
│   │   ├── ui/                # shadcn primitives + editor panels/dialogs
│   │   ├── layout/            # TopBar, LeftToolPanel, PoleCounter app shell
│   │   └── viewer/            # read-only share viewer UI
│   ├── hooks/                 # keyboard, R3F selection, theme hook
│   ├── schemas/               # track export/import validation boundary
│   ├── store/                 # editor Zustand config + track slices
│   ├── types/                 # domain contracts + theme presets
│   ├── utils/                 # generator, flight path, storage, share links, helpers
│   ├── constants/             # shared gate dimensions
│   └── lib/                   # cn helper for shadcn classes
├── vite.config.ts             # editor build + Vitest config
└── vite.config.viewer.ts      # single-file viewer build to dist-viewer/
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Editor app shell / first-load flow | `src/App.tsx`, `src/main.tsx` | StrictMode is enabled; mount effects must be idempotent |
| Share viewer / read-only track links | `src/viewer-main.tsx`, `src/viewer-store.ts`, `src/components/viewer/` | Hash payload → decoded track/config → read-only `Scene` |
| Add/change gate visuals | `src/components/gates/`, `src/types/gate.ts` | Fixed gate set; update dispatcher/schema/tests together |
| Change 3D scene/camera/themes | `src/components/scene/`, `src/types/theme.ts`, `src/utils/themeColors.ts` | R3F hooks stay under the single Canvas owner |
| Change sidebar/dialog UI | `src/components/ui/`, `src/components/layout/` | shadcn primitives plus app-specific panels/dialogs |
| Track generation | `src/utils/generator.ts` | Min 3m gate distance, nearest-neighbor order, 30° rotation alignment |
| Flight path logic | `src/utils/flightPath.ts` | Dense geometry/avoidance algorithm; test edge cases |
| Store state/actions | `src/store/configSlice.ts`, `src/store/trackSlice.ts` | Slice pattern, history, dirty-state workflow |
| Import/export validation | `src/schemas/track.schema.ts` | Persistence boundary, legacy normalization, error shape |
| Persistence | `src/utils/storage.ts` | Browser `localStorage`; route validation through schemas |
| Share-link payloads | `src/utils/shareTrack.ts` | `lz-string` compressed `z.` payloads + legacy base64 fallback |
| Keyboard/mouse selection | `src/hooks/`, `src/components/gates/GateHandles.tsx` | Desktop mouse/keyboard only |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `App` | component | `src/App.tsx` | Editor orchestration, dialogs, first-load generation |
| `ViewerApp` | component | `src/components/viewer/ViewerApp.tsx` | Read-only viewer shell, export/help controls |
| `loadTrackFromHash` | function | `src/viewer-main.tsx` | Decodes shared-track hash into viewer store |
| `createAppStore` / `useAppStore` | Zustand store | `src/store/index.ts` | Combines config + track slices with devtools |
| `useViewerStore` | Zustand store | `src/viewer-store.ts` | Viewer-only `{ track, config, error }` state |
| `createTrackSlice` | Zustand slice | `src/store/trackSlice.ts` | Selection, undo/redo, dirty-state, destructive actions |
| `generateTrack` | function | `src/utils/generator.ts` | Random track generation and initial sequence |
| `calculateFlightPath` | function | `src/utils/flightPath.ts` | Path segments, samples, arrows, gate-specific avoidance |
| `GateHandles` | component | `src/components/gates/GateHandles.tsx` | Move/rotate/elevate/insert/delete controls in 3D |
| `Scene` | component | `src/components/scene/Scene.tsx` | Single Canvas owner, theme-specific scene composition |
| `serializeTrack` / `deserializeTrack` | functions | `src/schemas/track.schema.ts` | Export/import shape validation and normalization |
| `encodeTrackSharePayload` / `decodeTrackSharePayload` | functions | `src/utils/shareTrack.ts` | Compressed share link payload boundary |
| `THEME_PRESETS` | constant | `src/types/theme.ts` | Minimal/realistic/night renderer and color presets |

## CONVENTIONS
- Named exports by default. `App.tsx` is the lone default export.
- `import type` for type-only imports. `verbatimModuleSyntax` is enabled.
- `@/*` aliases cross-domain imports; relative imports are common within nearby gates/scene/store/type files.
- Tests are co-located as `*.test.ts` or `*.test.tsx`; no shared Vitest setup file.
- Vitest config lives in `vite.config.ts` with `globals: true` and `environment: 'jsdom'`.
- Tailwind v4 is CSS-first via `@tailwindcss/vite`, `@import "tailwindcss"`, `tw-animate-css`, and `shadcn/tailwind.css`; no `tailwind.config.js`.
- Zustand editor state uses slice files merged in `src/store/index.ts`; viewer state is a separate tiny store in `src/viewer-store.ts`.
- UI components use shadcn/Radix primitives plus `cn` from `src/lib/utils.ts`.
- Viewer build uses `vite.config.viewer.ts`, `vite-plugin-singlefile`, `viewer.html`, and renames output to `dist-viewer/index.html`.
- Do not run Playwright/browser QA unless the user explicitly requests it; the user handles visual QA by default.

## ANTI-PATTERNS (THIS PROJECT)
- No `as any`, `@ts-ignore`, or silent type suppression.
- No backend/API/database/auth flows; persistence is browser `localStorage` and share-link hash payloads only.
- No per-gate size adjustment; gate dimensions are shared constants/global config behavior.
- No custom gate type creation; the app has a fixed gate type set.
- No mobile/touch gesture scope; desktop mouse/keyboard only.
- Do not duplicate schema validation in storage/import flows; route through `src/schemas`.
- Do not bypass the unsaved-changes flow for destructive editor actions.
- Do not expose editor mutation actions in the read-only viewer store/UI.

## UNIQUE STYLES
- Gate rotation: 0-330 in 30 degree steps.
- Gate movement: N/S/E/W, 1m increments; optional snap-grid uses smaller subdivisions during drag.
- Undo/redo: `past`/`future` arrays, `MAX_HISTORY=50`, dirty flag captured in history entries.
- Flight path: gate-sequence visits, Bezier sampling, disjoint native `THREE.Line` segments, arrows along path.
- Camera controls: Space/right-click pan, Shift vertical pan, wheel/middle-click smooth zoom.
- Themes: `minimal`, `realistic`, `night`; night enables bloom/neon emissive gates.
- Import/export schema keeps legacy compatibility explicit, e.g. old `asymmetric` gate type mapping.
- Share links use compressed `z.` payloads and still decode legacy base64-url payloads.

## COMMANDS
```bash
npm run dev            # Vite editor dev server at localhost:5173
npm run build          # tsc -b && vite build
npm run build:viewer   # single-file viewer build to dist-viewer/
npm run build:all      # editor build + viewer build
npm run test           # vitest (watch/default mode)
npm run lint           # eslint .
npm run preview        # preview production editor build
```

## NOTES
- No in-repo GitHub Actions workflows were found.
- Chunk size warning from R3F/Drei bundle is acceptable for MVP.
- `src/assets/hero.png`, `react.svg`, `vite.svg` are template/unused leftovers.
- `src/components/gates/index.ts` barrel is incomplete (missing `LadderGate`) and currently bypassed by `Scene.tsx`.
- `trackSlice.ts` duplicates `moveGate`/`rotateGate` logic from `utils/gateOperations.ts`.
- Test libraries live in `dependencies`; they would normally be `devDependencies`.
- Root has untracked/generated QA or build artifacts at times (`fpv-*-qa.png`, `dist-viewer/`); keep generated artifacts out of commits unless intentionally requested.
- Avoid creating visual QA screenshots unless explicitly requested.
