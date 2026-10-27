# Hooks — Editor Interaction

**Domain:** Keyboard shortcuts, R3F gate selection and gate-body dragging, active theme resolution. Editor-only; not used by the read-only viewer.
**Code state:** 56756ed (2026-10-27, worktree)

## STRUCTURE
```
hooks/
├── useKeyboardShortcuts.ts       # Global keydown map -> store actions + UI callbacks
├── useKeyboardShortcuts.test.tsx # Shortcut coverage
├── useGateMoveDrag.ts            # Ground drag from the move handle and from a gate-body press
├── useGateMoveDrag.test.tsx      # Press-vs-click threshold, field clamp, commit coverage
├── useGateSelection.ts           # R3F click -> selectGate, additive selection guard
└── useTheme.ts                   # config.theme -> getThemeConfig()
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| Change shortcut map | `useKeyboardShortcuts.ts`, `src/components/ui/KeyboardShortcutsDialog.tsx` | S shuffle, Cmd/Ctrl+S save, G gallery, Cmd/Ctrl+Z undo, Cmd/Ctrl+Y or Cmd/Ctrl+Shift+Z redo, Escape, Backspace delete (single selection only), Enter confirms the open delete dialog; the dialog's key list is a second copy that must change with the map |
| Change gate click/selection | `useGateSelection.ts`, `src/store/trackSlice.ts` | Shift/Meta/Ctrl = additive; ignored while dragging or camera-gesturing |
| Change gate-body / move-handle dragging | `useGateMoveDrag.ts`, `src/components/gates/Gate.tsx`, `GateHandles.tsx` | Ground-raycast X/Z through `setGatePosition`, one `commitGateDrag` undo entry, controls disabled, `isDraggingGate` set so the follow-up click is not a selection |
| Change active theme hook | `useTheme.ts`, `src/utils/themeColors.ts`, `src/types/theme.ts` | Thin selector over `config.theme` |

## CONVENTIONS
- Hooks may read editor state via `useAppStore` (including `@/store`); they are editor shell, not shadcn primitives.
- Shortcuts must early-return when the event target is `INPUT`, `TEXTAREA`, or `isContentEditable`.
- `useKeyboardShortcuts` takes callbacks (`onSave`, `onShuffle`, `onOpenGallery`, `onEscape`) and owns undo/redo/select/delete itself.
- `useTheme` returns a resolved `ThemeConfig`; do not read `config.theme` directly in components that need colors.
- R3F hooks (`useGateSelection`, `useGateMoveDrag`) return handler props and own their listeners; camera pan/zoom controllers are components in `src/components/scene/`, not hooks.
- Escape is not a pure callback: it runs `onEscape` (App maps it to leaving FPV), clears the gate selection, and closes the delete dialog.

## ANTI-PATTERNS
- Do not import editor hooks into `src/components/viewer/` or `src/viewer-store.ts`.
- Do not call `preventDefault()` on typing keys before the input-target guard.
- Do not encode shortcut behavior in components; extend `useKeyboardShortcuts`.
- Do not duplicate theme lookup logic outside `useTheme` / `getThemeConfig`.

## NOTES
- Backspace only opens the delete dialog when exactly one gate is selected (`selectedGateId` set and `selectedGateIds.length === 1`).
- Undo is Cmd/Ctrl+Z (without Shift); redo accepts Cmd/Ctrl+Y and Cmd/Ctrl+Shift+Z.

## TESTING
- `useKeyboardShortcuts.test.tsx` is the shortcut regression suite; extend it (and `KeyboardShortcutsDialog`) when adding or changing keys.
- `useGateMoveDrag.test.tsx` covers press-without-travel as a click, field clamping, the dragging flag, and one commit per drag.
- `useGateSelection` and `useTheme` have no co-located tests; add one if behavior grows beyond a store selector.
