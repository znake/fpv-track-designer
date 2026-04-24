# Store — Zustand State Management

**Domain:** Global app state via Zustand slice pattern

## STRUCTURE
```
store/
├── index.ts           # Combined store (ConfigSlice + TrackSlice)
├── configSlice.ts     # Config state + default preset
└── trackSlice.ts      # Track state + undo/redo
```

## CONVENTIONS
- **Slice pattern** — each domain gets its own slice file with `StateCreator`
- **Combined in index.ts** — `type AppState = ConfigSlice & TrackSlice`
- **DevTools middleware** — enabled on root store
- **Undo/redo** — `past`/`future` arrays, `MAX_HISTORY=50`, clears future on new action
- **`import type` required** — `verbatimModuleSyntax: true`

## WHERE TO LOOK
| Task | File |
|------|------|
| Add config setting | `configSlice.ts` — add to interface + initial state + action |
| Add track action | `trackSlice.ts` — use `pushHistory()` for undoable actions |
| Add new domain slice | Create `newSlice.ts` + add to `AppState` type + spread in index.ts |

## KEY PATTERNS
```typescript
// Undoable action pattern
const action = (payload) => set((state) => {
  const history = pushHistory(state)  // saves current to past, clears future
  return { ...newState, ...history }
})
```

## NOTES
- `trackSlice.ts` duplicates `moveGate`/`rotateGate` logic from `utils/gateOperations.ts`
- `commitGateDrag()` pushes history without snapshotting (avoids undo stack pollution during drag)
