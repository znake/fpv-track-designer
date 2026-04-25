# FPV TRACK DESIGNER — PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-24
**Commit:** 8419a1f
**Branch:** main

## OVERVIEW
3D FPV drone racing track designer. Random track generation, gate fine-tuning, JSON persistence. Desktop-only, no backend.

## STRUCTURE
```
fpv-track-designer/
├── src/
│   ├── components/
│   │   ├── gates/       # 8 gate 3D components + dispatcher + handles
│   │   ├── scene/       # R3F Canvas, flight path, grid, camera controllers
│   │   ├── ui/          # shadcn primitives + 4 sidebar panels
│   │   └── layout/      # TopBar, LeftToolPanel
│   ├── hooks/           # useGateSelection, useKeyboardShortcuts
│   ├── schemas/         # track.schema.ts (Zod JSON validation)
│   ├── store/           # Zustand slices (config + track)
│   ├── types/           # Gate, Track, Config interfaces
│   └── utils/           # generator, flightPath, gateOperations, gateOpenings, gateSequence, storage
├── public/              # Static assets
└── vite.config.ts       # React + Tailwind v4 + Vitest (inline)
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
| Camera controls | `src/components/scene/CameraPan.tsx`, `CameraVerticalPan.tsx`, `SmoothZoom.tsx` |
| Gate openings/sequence | `src/utils/gateOpenings.ts`, `src/utils/gateSequence.ts` |
| Keyboard shortcuts | `src/hooks/useKeyboardShortcuts.ts` |

## CONVENTIONS
- **Named exports only** — no default exports except App.tsx
- **`import type` required** — `verbatimModuleSyntax: true` in tsconfig
- **PascalCase** for components, **camelCase** for utils/hooks
- **Tests co-located** — `*.test.ts` next to source file
- **Zustand slice pattern** — each domain gets its own slice file
- **Tailwind v4** — CSS-based config via `@import "tailwindcss"`, no tailwind.config.js
- **Import style split** — `gates/` and `scene/` use relative paths, `ui/` and `layout/` use `@/` alias. Prefer `@/` for consistency.

## ANTI-PATTERNS
- ❌ No `as any` or `@ts-ignore` — strict TS enforced
- ❌ No backend/API calls — localStorage only
- ❌ No per-gate size adjustment — global `config.gateSize` only
- ❌ No custom gate type creation — fixed 8 types
- ❌ No mobile touch gestures — desktop mouse/keyboard only
- ❌ No auth, no database, no AR/VR, no video export

## UNIQUE STYLES
- Gate rotation: 0-330 in 30° steps (12 positions)
- Gate movement: N/S/E/W, 1m increments, clamped to field bounds
- Undo/redo: past/future arrays, MAX_HISTORY=50
- Min gate distance: 3m enforced by generator
- Flight path: nearest-neighbor ordering, arrows every 5m
- R3F camera: Space+click pan, Shift+click vertical pan, wheel smooth zoom

## COMMANDS
```bash
npm run dev      # Dev server at localhost:5173
npm run build    # tsc -b && vite build
npm run test     # vitest --run
npm run lint     # eslint .
```

## COMMIT POLICY
- **Sofort committen** nach jeder gröberen Änderung, sobald Tests durchgelaufen sind und ein Task als abgeschlossen gilt.
- Trigger für einen Commit:
  - Eine logische Einheit / ein Task ist fertig (Feature, Bugfix, Refactor-Schritt).
  - `npm run test` und `npm run build` laufen ohne Fehler durch.
  - `lsp_diagnostics` ist sauber auf den geänderten Dateien.
- Nicht warten, bis sich mehrere Tasks anhäufen — lieber kleine, atomare Commits als ein großer Sammel-Commit.
- Commit-Message kurz und im Stil des Repos halten; auf das *Warum* fokussieren, nicht nur auf das *Was*.
- Niemals committen, wenn Tests/Build fehlschlagen oder der Stand bewusst kaputt ist.

## NOTES
- `src/assets/hero.png`, `react.svg`, `vite.svg` — unused template assets
- Chunk size warning (>500KB) from R3F+drei bundle — acceptable for MVP
- ErrorBoundary wraps entire app in main.tsx
- Test libraries (`vitest`, `@testing-library/*`) are in `dependencies` — should be `devDependencies`
- `src/components/gates/index.ts` barrel is incomplete (missing LadderGate) and unused
- `trackSlice.ts` duplicates `moveGate`/`rotateGate` logic from `utils/gateOperations.ts`
