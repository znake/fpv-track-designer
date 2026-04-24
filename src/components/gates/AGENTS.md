# Gates — 3D Components

**Domain:** R3F gate representations (8 types)

## STRUCTURE
```
gates/
├── StandardGate.tsx    # Blue square frame
├── HGate.tsx           # Red with backrest flag
├── DoubleHGate.tsx     # Purple stacked H-gate pair
├── DiveGate.tsx        # Pink, cube frame with 6 open faces
├── DoubleGate.tsx      # Green, two stacked gates (2m apart)
├── LadderGate.tsx      # Orange, three stacked gates (1.5m apart)
├── StartFinishGate.tsx # White with checkered panel + "Start" label
├── Flag.tsx            # Gray pole + red triangular flag
├── Gate.tsx            # Dispatcher: GateType → component
├── GateHandles.tsx     # Html overlay: move/rotate/insert/delete handles
├── GateOpeningIndicators.tsx  # Maps openings to indicators
├── GateEntryIndicator.tsx     # Per-opening green/red planes + labels
└── index.ts            # Barrel export (incomplete — missing LadderGate)
```

## CONVENTIONS
- Each gate accepts: `position`, `rotation` (degrees), `size` (multiplier), `isSelected`, `onClick`
- Use `meshStandardMaterial` with solid colors — no textures
- Selection highlight: `emissive` + `emissiveIntensity` on all meshes
- `Gate.tsx` maps `GateType` enum to correct component
- GateHandles uses drei's `<Html>` for DOM overlays in 3D space

## WHERE TO LOOK
| Task | File |
|------|------|
| Add new gate type | Create new `.tsx` + add to `Gate.tsx` dispatcher + `GateType` in types |
| Change gate appearance | Individual gate `.tsx` files |
| Modify selection behavior | `Gate.tsx` + `useGateSelection` hook |
| Modify handles | `GateHandles.tsx` |
| Modify opening indicators | `GateOpeningIndicators.tsx`, `GateEntryIndicator.tsx` |

## NOTES
- Barrel export (`index.ts`) is incomplete: missing `LadderGate`
- `Scene.tsx` imports `Gate` directly (`../gates/Gate`) bypassing the barrel
- `GateHandles.tsx` (524 lines) is the largest component — handles move, rotate, insert, delete
