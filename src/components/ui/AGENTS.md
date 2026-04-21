# UI Components — Sidebar Panels

**Domain:** 6 sidebar UI panels for track configuration

## STRUCTURE
```
ui/
├── GateConfigPanel.tsx    # Gate quantities, field size, gate size selector
├── GateAdjustment.tsx     # Rotation ±30°, position N/S/E/W (when gate selected)
├── TrackControls.tsx      # Shuffle, save, load, new track
├── TrackGallery.tsx       # Saved tracks list with load/delete
├── JsonImportExport.tsx   # Export/download JSON, import from file
└── UndoRedo.tsx           # Undo/redo buttons + Ctrl+Z/Y shortcuts
```

## CONVENTIONS
- All panels use Tailwind CSS (gray-800/700 palette, purple accents)
- Each panel is self-contained — imports store directly via `useAppStore`
- Consistent heading: `<h2 className="text-lg font-semibold text-white">`
- Button states: `hover:bg-gray-600`, `focus:ring-2 focus:ring-purple-400`
- Disabled states: `disabled:bg-gray-600 disabled:text-gray-400`

## WHERE TO LOOK
| Task | File |
|------|------|
| Add sidebar panel | Create new `.tsx` + add to `App.tsx` sidebar |
| Change button styling | All files — consistent Tailwind classes |
| Add keyboard shortcut | `UndoRedo.tsx` (pattern to follow) |
