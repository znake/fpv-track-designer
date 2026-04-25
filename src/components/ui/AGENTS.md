# UI Components — Sidebar Panels & shadcn Primitives

**Domain:** 28 UI files: shadcn primitives + 4 app-specific panels

## STRUCTURE
```
ui/
├── GateConfigPanel.tsx    # Gate quantities and field size settings
├── SaveTrackDialog.tsx    # Name + save track to localStorage
├── TrackGallery.tsx       # Saved tracks list with load/delete
├── KeyboardShortcutsDialog.tsx  # Keyboard shortcut reference
├── directional-pad.tsx    # N/S/E/W movement pad (1m steps)
├── icon-button.tsx        # Tooltip + Button composition
├── button.tsx             # shadcn Button (with button-variants.ts)
├── badge.tsx              # shadcn Badge
├── card.tsx               # shadcn Card
├── dialog.tsx             # shadcn Dialog
├── input.tsx              # shadcn Input
├── label.tsx              # shadcn Label
├── select.tsx             # shadcn Select
├── slider.tsx             # shadcn Slider
├── sheet.tsx              # shadcn Sheet
├── tabs.tsx               # shadcn Tabs
├── toggle.tsx             # shadcn Toggle
├── toggle-group.tsx       # shadcn ToggleGroup
├── tooltip.tsx            # shadcn Tooltip
├── separator.tsx          # shadcn Separator
├── scroll-area.tsx        # shadcn ScrollArea
├── collapsible.tsx        # shadcn Collapsible
├── popover.tsx            # shadcn Popover
└── *-variants.ts          # Variant definitions (button, badge, tabs, toggle)
```

## CONVENTIONS
- All panels use Tailwind CSS (gray-800/700 palette, purple accents)
- Each panel is self-contained — imports store directly via `useAppStore`
- shadcn primitives import `cn` from `@/lib/utils` (clsx + tailwind-merge)
- Consistent heading: `<h2 className="text-lg font-semibold text-white">`
- Button states: `hover:bg-gray-600`, `focus:ring-2 focus:ring-purple-400`
- Disabled states: `disabled:bg-gray-600 disabled:text-gray-400`

## WHERE TO LOOK
| Task | File |
|------|------|
| Add sidebar panel | Create new `.tsx` + add to `App.tsx` sidebar |
| Change button styling | All files — consistent Tailwind classes |
| Add keyboard shortcut | `useKeyboardShortcuts.ts` hook (pattern to follow) |
