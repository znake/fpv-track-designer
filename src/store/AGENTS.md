# Store — Editor Zustand State

**Domain:** Global editor state via Zustand slice pattern. The share viewer uses separate `src/viewer-store.ts`.
**Code state:** b738218 (2026-10-28, worktree)

## STRUCTURE
```
store/
├── index.ts        # Combined editor store (ConfigSlice + TrackSlice) with devtools
├── configSlice.ts  # Config state, default preset, theme/display/generation settings
└── trackSlice.ts   # Track state, selection incl. ideal-line points, drag, undo/redo, unsaved-change flow
```

## CONVENTIONS
- Slice pattern: each editor domain gets a `StateCreator` slice file.
- `src/store/index.ts` defines `type AppState = ConfigSlice & TrackSlice` and spreads slices into `create()`.
- DevTools middleware is enabled only on the editor root store.
- `import type` is required for type-only imports.
- Config actions update nested config immutably; `theme` values come from `src/types/theme.ts`.
- The initial `config` comes from `createInitialConfig()`: factory defaults plus the venue remembered in this browser (`utils/venuePreference.ts`). `setVenue` writes that preference, `resetToDefault` clears it, and `setConfig` (gallery load, import, share) leaves it untouched.
- Committed track actions call `pushHistory()` and set `isTrackModified: true`. The live setters `setGatePosition` and `setFlightPathPointPosition` only draft state and capture `dragHistoryEntry` once; `commitGateDrag()` turns that draft into the undo entry. `setGateRotation` captures nothing, so rotation drags stay outside history and leave the dirty flag untouched.

## WHERE TO LOOK
| Task | File |
|------|------|
| Add config setting | `configSlice.ts` + `src/types/config.ts` + schema serialization if persisted |
| Add theme setting | `configSlice.ts`, `src/types/theme.ts`, `ThemeConfigPanel.tsx` |
| Add track action | `trackSlice.ts` — use `pushHistory()` for undoable actions |
| Add new editor domain slice | New slice file + `AppState` type + spread in `index.ts` |
| Change viewer state | `src/viewer-store.ts`, not this directory |

## KEY PATTERNS
```typescript
const action = (payload) => set((state) => {
  const history = pushHistory(state)
  return { ...newState, ...history, isTrackModified: true }
})
```

## IDEAL-LINE POINT EDITING
`selectedFlightPathPointId: string | null` is transient editor state and never dirties the track by itself.

- `insertFlightPathPoint(insertion)` creates one stable-ID point with its leg ref, clamped base `u`, and exact hover position. It selects the point and records one dirty undo entry. `deleteFlightPathPoint(id)` removes it and records another undoable edit; deleting the selected point clears the selection.
- `selectFlightPathPoint(id)` clears gate selection and dialogs; gate and point selection are exclusive.
- `setFlightPathPointPosition(id, position)` is the live drag setter. It applies the same field clamp, ground floor, and snap policy as gates and captures `dragHistoryEntry` once without dirtying during the draft.
- `commitGateDrag()` turns that draft into one undo entry, sets `isTrackModified`, caps history at 50, and clears redo. `cancelFlightPathPointDrag()` restores only `idealLinePoints` from the draft.
- Point selection resets in `setTrack`, `replaceTrack`, every `selectGate` branch, `setSelectedGates`, gate insertion, deletion, undo, and redo; `insertFlightPathPoint` selects the new point instead. `syncCurrentTrack` keeps it.
- Gate mutations and `syncCurrentTrack` spread the track, so authored points survive unchanged; points whose leg ref no longer exists are dormant rather than remapped.

## DIRTY-STATE / UNSAVED-CHANGES FLOW
`isTrackModified` is the single source of truth for unsaved editor changes.

- Set `true` by undoable mutations such as `updateGate`, `moveGate`, `moveSelectedGates`, `rotateGate`, `insertGateAtIndex`, `deleteSelectedGates`, `toggleGateDirection`, `moveGateSequenceEntry`, `snapAllGatesToGrid`, and move/elevate drag commits. Rotation drags (Ctrl press-drag, rotate handle) add no past entry and leave it `false`.
- Reset to `false` by `setTrack`, `replaceTrack`, and `markTrackSaved` after successful localStorage save.
- Stored in `TrackHistoryEntry` so undo/redo restores the dirty flag of each snapshot.

Destructive actions (Shuffle, Import JSON, Gallery Load/Duplicate, Apply Config) MUST go through `requestDestructiveAction(action, title, description)`. If dirty, the action is staged in `pendingDestructiveAction` and `components/ui/UnsavedChangesDialog.tsx` presents:

- **Abbrechen** → `cancelDestructiveAction()`
- **Zuerst speichern** → `saveBeforeDestructiveAction()` opens the global save dialog; `markTrackSaved()` then runs the staged action
- **Verwerfen** → `confirmDestructiveAction()`

The global save dialog is store-driven via `isSaveDialogOpen`, `openSaveDialog()`, and `dismissSaveDialog()`.

## NOTES
- `trackSlice.ts` reimplements the `moveGate`/`rotateGate` helpers from `utils/gateOperations.ts` inline; keep the two in sync only if that test-only helper is ever wired up.
- The `moveGate`/`rotateGate` actions and `DirectionalPad` (`src/components/ui/directional-pad.tsx`) currently have no callers in the editor UI; rotation runs through the `GateHandles` rotate handle or a Ctrl press-drag on the gate body. Keep them in sync if you wire them up.
- `MAX_HISTORY = 50`; `pushHistory` snapshots `{ track, selectedGateId, selectedGateIds, isTrackModified }`, caps `past` at 50 entries and always clears `future` — with `currentTrack` null only `past` survives.
- Every committed mutation normalizes through `normalizeTrack` (`enforceSingletonGates` + `normalizeGates` + `normalizeGateSequence`). The live setters `setGatePosition`, `setGateRotation`, and `setFlightPathPointPosition` write raw state and touch neither `updatedAt` nor history. Transient `isDraggingGate` / `setDraggingGate` makes gate selection ignore the click that ends a drag.
- `commitGateDrag()` pushes the drag-start snapshot once, avoiding undo stack pollution during pointer moves.

## TESTING
- `trackSlice.test.ts` is the largest suite; keep new store invariants there.
- `configSlice.test.ts` covers the default config and the stored-venue lifecycle (`createInitialConfig`, `setVenue`, `resetToDefault`, `setConfig`).
- Cover ideal-line point insertion/deletion, selection clearing, field/snap movement, cancel versus commit, and survival across gate mutations.
- Use isolated Zustand stores with `create<...>()(...)` for slice tests.
- Cover dirty-state and history together: undo/redo must restore `isTrackModified` snapshots.
- Destructive-action tests should exercise cancel, save-before-action, and discard paths.
