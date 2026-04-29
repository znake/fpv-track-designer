# UI Components — Panels, Dialogs & shadcn Primitives

**Domain:** 34 UI files: editor panels/dialogs, shadcn/Radix primitives, variant helpers

## STRUCTURE
```
ui/
├── GateConfigPanel.tsx       # Gate quantities, field size, theme settings
├── ApplyConfigFooter.tsx     # Apply/discard footer for config changes
├── SaveTrackDialog.tsx       # Name + save track to localStorage
├── TrackGallery.tsx          # Saved tracks list with load/delete/duplicate
├── ShareTrackDialog.tsx      # Generate/copy compressed viewer URL
├── UnsavedChangesDialog.tsx  # Destructive-action save/discard/cancel flow
├── KeyboardShortcutsDialog.tsx
├── directional-pad.tsx       # N/S/E/W movement pad
├── icon-button.tsx           # Tooltip + Button composition
├── *-variants.ts             # cva variant definitions
└── button/dialog/input/...   # shadcn primitives
```

## CONVENTIONS
- App-specific panels may import `useAppStore` directly; primitives must stay store-agnostic.
- shadcn primitives import `cn` from `@/lib/utils` and keep Radix composition patterns.
- Variant files (`button-variants.ts`, `badge-variants.ts`, `tabs-variants.ts`, `toggle-variants.ts`) own `cva` class maps.
- Theme-aware visual language uses dark cockpit surfaces, sky-blue/slate panels, and warm yellow primary accents.
- Dialog copy is currently German; keep user-facing viewer/editor strings consistent.
- Destructive editor actions use `UnsavedChangesDialog`, not ad-hoc confirm dialogs.

## WHERE TO LOOK
| Task | File |
|------|------|
| Gate quantities / field / theme settings | `GateConfigPanel.tsx`, `ApplyConfigFooter.tsx` |
| Save current track | `SaveTrackDialog.tsx` |
| Load/delete/duplicate saved tracks | `TrackGallery.tsx` |
| Share current track | `ShareTrackDialog.tsx`, `src/utils/shareTrack.ts` |
| Unsaved destructive-action flow | `UnsavedChangesDialog.tsx`, `src/store/trackSlice.ts` |
| Keyboard shortcut reference | `KeyboardShortcutsDialog.tsx`, `src/hooks/useKeyboardShortcuts.ts` |
| Primitive styling | primitive file + matching `*-variants.ts` if present |

## TESTING
- Co-located RTL tests exist for `GateConfigPanel`, `TrackGallery`, and `ShareTrackDialog`.
- Mock browser APIs locally in the relevant suite (`localStorage`, clipboard, URL, random UUID).
- Do not snapshot broad shadcn output; test app behavior and accessible labels instead.
