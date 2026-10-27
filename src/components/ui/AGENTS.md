# UI Components — Panels, Dialogs & shadcn Primitives

**Domain:** 35 UI files plus this `AGENTS.md`: editor panels/dialogs, shadcn/Radix primitives, variant helpers
**Code state:** 56756ed (2026-10-27, worktree)

## STRUCTURE
```
ui/
├── GateConfigPanel.tsx       # Gate quantities + field size + field preset (venue) settings
├── ThemeConfigPanel.tsx      # Theme preset picker (minimal/realistic/night)
├── ApplyConfigFooter.tsx     # Drift-gated Apply button that regenerates the track
├── SaveTrackDialog.tsx       # Name + save track to localStorage
├── TrackGallery.tsx          # Saved tracks list with load/delete/duplicate
├── ShareTrackDialog.tsx      # Long/short viewer link, QR preview, PNG/SVG download
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
- All user-facing copy goes through `useTranslation()`; add DE + EN keys together in `src/i18n.ts`. Known hardcoded exceptions: `DirectionalPad` aria-labels, shadcn `dialog`/`sheet` "Close" text, and `ViewerApp`'s "FPV Track Viewer" eyebrow.
- Destructive editor actions use `UnsavedChangesDialog`, not ad-hoc confirm dialogs.

## WHERE TO LOOK
| Task | File |
|------|------|
| Gate quantities / field size / field preset | `GateConfigPanel.tsx`, `ApplyConfigFooter.tsx` |
| Theme preset picker | `ThemeConfigPanel.tsx`, `src/types/theme.ts` |
| Save current track | `SaveTrackDialog.tsx` |
| Load/delete/duplicate saved tracks | `TrackGallery.tsx` |
| Share current track | `ShareTrackDialog.tsx`, `src/utils/shareTrack.ts` |
| Unsaved destructive-action flow | `UnsavedChangesDialog.tsx`, `src/store/trackSlice.ts` |
| Keyboard shortcut reference | `KeyboardShortcutsDialog.tsx`, `src/hooks/useKeyboardShortcuts.ts` |
| Primitive styling | primitive file + matching `*-variants.ts` if present |

## NOTES
- `ApplyConfigFooter` renders only while `hasConfigDrift(config, generationConfig)` is true; its Apply button regenerates via `generateTrack(config)` (active config, so the remembered venue's field size applies) through `requestDestructiveAction`, never a separate discard button.
- The DE/EN language toggle lives in `TopBar` (`toggleLanguage`), which flips every translated string at once.

## TESTING
- Co-located RTL tests exist for `GateConfigPanel`, `ThemeConfigPanel`, `TrackGallery`, and `ShareTrackDialog`.
- `GateConfigPanel` drives the venue `Select` through `pointerDown` + `click` and needs local element mocks jsdom lacks: `hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`, `scrollIntoView`, and `ResizeObserver`.
- Mock browser APIs locally in the relevant suite (`localStorage`, clipboard, URL, random UUID).
- Do not snapshot broad shadcn output; test app behavior and accessible labels instead.
- `directional-pad.tsx` has no caller in the editor UI (`GateHandles` owns dragging); keep it in sync if you wire it up.
