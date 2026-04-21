# FPV TRACK DESIGNER — PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-21
**Stack:** React 19 + Vite 8 + TypeScript 6 + R3F + Zustand 5 + Tailwind v4 + Vitest

## OVERVIEW
3D FPV drone racing track designer. Random track generation, gate fine-tuning, JSON persistence. Desktop-only, no backend.

## STRUCTURE
```
fpv-track-designer/
├── src/
│   ├── components/
│   │   ├── gates/       # 7 gate 3D components + dispatcher
│   │   ├── scene/       # R3F scene, flight path, grid
│   │   └── ui/          # 6 sidebar panels
│   ├── hooks/           # useGateSelection
│   ├── schemas/         # track.schema.ts (JSON validation)
│   ├── store/           # Zustand slices (config + track)
│   ├── types/           # Gate, Track, Config interfaces
│   └── utils/           # generator, flightPath, gateOperations, storage
├── public/              # Static assets
└── vite.config.ts       # React + Tailwind v4 + Vitest
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Add gate type | `src/components/gates/`, `src/types/gate.ts` |
| Change track generation | `src/utils/generator.ts` |
| Modify store state | `src/store/configSlice.ts` or `src/store/trackSlice.ts` |
| Add UI panel | `src/components/ui/` |
| Change 3D scene | `src/components/scene/Scene.tsx` |
| Flight path logic | `src/utils/flightPath.ts` |
| Storage/persistence | `src/utils/storage.ts` |

## CONVENTIONS
- **Named exports only** — no default exports except App.tsx
- **`import type` required** — `verbatimModuleSyntax: true` in tsconfig
- **PascalCase** for components, **camelCase** for utils/hooks
- **Tests co-located** — `*.test.ts` next to source file
- **Zustand slice pattern** — each domain gets its own slice file
- **Tailwind v4** — CSS-based config via `@import "tailwindcss"`, no tailwind.config.js

## ANTI-PATTERNS
- ❌ No `as any` or `@ts-ignore` — strict TS enforced
- ❌ No backend/API calls — localStorage only
- ❌ No per-gate size adjustment — global `config.gateSize` only
- ❌ No custom gate type creation — fixed 7 types
- ❌ No mobile touch gestures — desktop mouse/keyboard only
- ❌ No auth, no database, no AR/VR, no video export

## UNIQUE STYLES
- Gate rotation: 0-330 in 30° steps (12 positions)
- Gate movement: N/S/E/W, 1m increments, clamped to field bounds
- Undo/redo: past/future arrays, MAX_HISTORY=50
- Min gate distance: 3m enforced by generator
- Flight path: nearest-neighbor ordering, arrows every 5m

## COMMANDS
```bash
npm run dev      # Dev server at localhost:5173
npm run build    # tsc -b && vite build
npm run test     # vitest --run
npm run lint     # eslint .
```

## NOTES
- `src/App.css` is leftover Vite template (dead code, not imported)
- `src/assets/hero.png`, `react.svg`, `vite.svg` — unused template assets
- Chunk size warning (>500KB) from R3F+drei bundle — acceptable for MVP
- ErrorBoundary wraps entire app in main.tsx
