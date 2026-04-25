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

## DIRTY-STATE / UNSAVED-CHANGES FLOW
`isTrackModified` (boolean) is the single source of truth for "the track has
unsaved changes". It is:
- Set `true` by every undoable mutation (`updateGate`, `moveGate`, `rotateGate`, `insertGateAtIndex`, `deleteSelectedGates`, `toggleGateDirection`, `moveGateSequenceEntry`, `duplicateGate`, `snapAllGatesToGrid`, `commitGateDrag`)
- Reset to `false` by `setTrack`, `replaceTrack`, and `markTrackSaved` (after a successful localStorage save)
- Tracked inside `TrackHistoryEntry` so undo/redo restores the dirty flag of the snapshot

Destructive actions (Shuffle, Import JSON, Gallery Load, Gallery Duplicate,
Apply Config) MUST be funnelled through `requestDestructiveAction(action,
title, description)`. When `isTrackModified` is `true` the call stages the
action in `pendingDestructiveAction` and the globally-mounted
`UnsavedChangesDialog` (in `components/ui/UnsavedChangesDialog.tsx`) shows a
3-button dialog:
- **Abbrechen** → `cancelDestructiveAction()` clears the staged action
- **Zuerst speichern** → `saveBeforeDestructiveAction()` opens `SaveTrackDialog`; on successful save `markTrackSaved()` runs the staged action automatically
- **Verwerfen** → `confirmDestructiveAction()` runs the staged action immediately

When `isTrackModified` is `false` `requestDestructiveAction` runs the action
synchronously without showing the dialog.

The global `SaveTrackDialog` is also store-driven via `isSaveDialogOpen`,
`openSaveDialog()`, and `dismissSaveDialog()` – use those instead of holding
a local `useState` boolean.

## NOTES
- `trackSlice.ts` duplicates `moveGate`/`rotateGate` logic from `utils/gateOperations.ts`
- `commitGateDrag()` pushes history without snapshotting (avoids undo stack pollution during drag)
