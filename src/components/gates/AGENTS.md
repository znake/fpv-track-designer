# Gates — 3D Components

**Domain:** R3F gate representations (8 types)

## STRUCTURE
```
gates/
├── StandardGate.tsx    # Blue square frame
├── HGate.tsx           # Red with flag on top
├── AsymmetricGate.tsx  # Purple, standard gate + offset H-gate on top
├── DiveGate.tsx        # Pink, cube frame with 6 open faces
├── DoubleGate.tsx      # Green, two stacked gates (2m apart)
├── LadderGate.tsx      # Orange, three stacked gates (1.5m apart)
├── StartFinishGate.tsx # Dark with checkered panel
├── Flag.tsx            # Gray pole + red triangular flag
├── Gate.tsx            # Dispatcher: GateType → component
└── index.ts            # Barrel export

## CONVENTIONS
- Each gate accepts: `position`, `rotation` (degrees), `size` (multiplier), `isSelected`, `onClick`
- Use `meshStandardMaterial` with solid colors — no textures
- Selection highlight: `emissive` + `emissiveIntensity` on all meshes
- `Gate.tsx` maps `GateType` enum to correct component

## WHERE TO LOOK
| Task | File |
|------|------|
| Add new gate type | Create new `.tsx` + add to `Gate.tsx` dispatcher + `GateType` in types |
| Change gate appearance | Individual gate `.tsx` files |
| Modify selection behavior | `Gate.tsx` + `useGateSelection` hook |
