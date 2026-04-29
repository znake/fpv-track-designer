# FPV TRACK DESIGNER - PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-27
**Commit:** 2c6b99a
**Branch:** main

## OVERVIEW
Desktop-only 3D FPV drone racing track designer. React 19 + Vite + R3F/Drei scene, Zustand slices, Tailwind v4 UI, Vitest coverage, JSON-like local persistence.

## STRUCTURE
```
fpv-track-designer/
├── src/
│   ├── App.tsx                 # top-level app orchestration, dialogs, sidebar/scene composition
│   ├── main.tsx                # Vite/React entry, StrictMode + ErrorBoundary
│   ├── components/
│   │   ├── gates/              # fixed gate components + handles/opening indicators
│   │   ├── scene/              # R3F Canvas, flight path, grid, camera controllers
│   │   ├── ui/                 # shadcn primitives mixed with app panels/dialogs
│   │   ├── layout/             # TopBar, LeftToolPanel, PoleCounter app shell
│   │   └── icons/              # custom GateIcon
│   ├── hooks/                  # keyboard shortcuts, R3F gate selection
│   ├── schemas/                # track export/import validation boundary
│   ├── store/                  # Zustand config + track slices
│   ├── types/                  # shared domain contracts
│   ├── utils/                  # generator, flight path, gate ops, storage, sequence/openings
│   ├── constants/              # shared gate dimensions
│   └── lib/                    # cn helper for shadcn classes
├── public/                     # static assets
└── vite.config.ts              # React + Tailwind v4 + Vitest config
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| App shell / first-load flow | `src/App.tsx`, `src/main.tsx` | StrictMode is enabled; keep mount effects idempotent |
| Add/change gate visuals | `src/components/gates/`, `src/types/gate.ts` | Fixed gate set; no custom user-defined gate types |
| Change 3D scene/camera | `src/components/scene/` | R3F hooks stay under the single Canvas owner |
| Change sidebar/dialog UI | `src/components/ui/`, `src/components/layout/` | UI mixes shadcn primitives and app-specific panels |
| Track generation | `src/utils/generator.ts` | Min 3m gate distance, nearest-neighbor order |
| Flight path logic | `src/utils/flightPath.ts` | Dense geometry/avoidance algorithm; test edge cases |
| Store state/actions | `src/store/configSlice.ts`, `src/store/trackSlice.ts` | Use slice pattern and dirty-state workflow |
| Import/export validation | `src/schemas/track.schema.ts` | Persistence boundary, legacy normalization, error shape |
| Persistence | `src/utils/storage.ts` | Browser `localStorage` only; use schema helpers |
| Keyboard/mouse selection | `src/hooks/`, `src/components/gates/GateHandles.tsx` | Desktop mouse/keyboard only |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `App` | component | `src/App.tsx` | Top-level UI, dialogs, first-load generation |
| `createAppStore` / `useAppStore` | Zustand store | `src/store/index.ts` | Combines config + track slices with devtools |
| `createTrackSlice` | Zustand slice | `src/store/trackSlice.ts` | Track state, selection, undo/redo, dirty-state, destructive actions |
| `generateTrack` | function | `src/utils/generator.ts` | Random track generation and initial sequence |
| `calculateFlightPath` | function | `src/utils/flightPath.ts` | Path segments, samples, arrows, gate-specific avoidance |
| `GateHandles` | component | `src/components/gates/GateHandles.tsx` | Move/rotate/elevate/insert/delete controls in 3D |
| `Scene` | component | `src/components/scene/Scene.tsx` | Single Canvas owner and scene composition |
| `serializeTrack` / `deserializeTrack` | functions | `src/schemas/track.schema.ts` | Export/import shape validation and normalization |

## CONVENTIONS
- Named exports by default. `App.tsx` is the lone default export.
- `import type` for type-only imports. `verbatimModuleSyntax` is enabled.
- `@/*` aliases cross-domain imports; relative imports are common for nearby gates/scene files.
- Tests are co-located as `*.test.ts` or `*.test.tsx`; no shared Vitest setup file.
- Vitest config lives in `vite.config.ts` with `globals: true` and `environment: 'jsdom'`.
- Tailwind v4 is CSS-first via `@tailwindcss/vite` and `@import "tailwindcss"`; no `tailwind.config.js`.
- Zustand state uses slice files merged in `src/store/index.ts`.
- UI components use shadcn/Radix primitives plus `cn` from `src/lib/utils.ts`.
- Do not run Playwright/browser QA unless the user explicitly requests it; the user handles visual QA by default.

## ANTI-PATTERNS (THIS PROJECT)
- No `as any`, `@ts-ignore`, or silent type suppression.
- No backend/API/database/auth flows; persistence is browser `localStorage` only.
- No per-gate size adjustment; `config.gateSize` is global.
- No custom gate type creation; the app has a fixed gate type set.
- No mobile/touch gesture scope; desktop mouse/keyboard only.
- Do not duplicate schema validation in storage/import flows; route through `src/schemas`.
- Do not bypass the unsaved-changes flow for destructive actions.

## UNIQUE STYLES
- Gate rotation: 0-330 in 30 degree steps.
- Gate movement: N/S/E/W, 1m increments, clamped to field bounds.
- Undo/redo: `past`/`future` arrays, `MAX_HISTORY=50`, dirty flag captured in history entries.
- Flight path: gate-sequence visits, Bezier sampling, arrows every 5m.
- Camera controls: Space/right-click pan, Shift vertical pan, wheel/middle-click smooth zoom.
- Import/export schema keeps legacy compatibility explicit, e.g. old `asymmetric` gate type mapping.

## COMMANDS
```bash
npm run dev      # Vite dev server at localhost:5173
npm run build    # tsc -b && vite build
npm run test     # vitest (watch/default mode)
npm run lint     # eslint .
npm run preview  # preview production build
```

## NOTES
- Chunk size warning from R3F/Drei bundle is acceptable for MVP.
- `src/assets/hero.png`, `react.svg`, `vite.svg` are template/unused leftovers.
- `src/components/gates/index.ts` barrel is incomplete (missing `LadderGate`) and currently bypassed by `Scene.tsx`.
- `trackSlice.ts` duplicates `moveGate`/`rotateGate` logic from `utils/gateOperations.ts`.
- Test libraries live in `dependencies`; they would normally be `devDependencies`.
- Root has untracked QA screenshots (`fpv-*-qa.png`); keep generated QA artifacts out of commits unless intentionally requested.
- Avoid creating visual QA screenshots unless explicitly requested.
