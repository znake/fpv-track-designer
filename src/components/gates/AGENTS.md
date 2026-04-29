# Gates — 3D Components

**Domain:** R3F gate representations, opening indicators, 3D edit handles (fixed gate set)

## STRUCTURE
```
gates/
├── StandardGate.tsx          # Blue square frame
├── HGate.tsx                 # H-gate with deterministic side backrest
├── DoubleHGate.tsx           # Stacked H-gate pair
├── DiveGate.tsx              # Cube-like dive gate with top approach behavior
├── DoubleGate.tsx            # Two stacked gates
├── LadderGate.tsx            # Three stacked gates
├── StartFinishGate.tsx       # Start panel + text
├── Flag.tsx                  # Pole + flag marker
├── OctagonalTunnelGate.tsx   # Octagonal tunnel / legacy asymmetric replacement
├── Gate.tsx                  # Dispatcher: GateType → component
├── GateHandles.tsx           # Html overlay: move/rotate/elevate/insert/delete
├── GateOpeningIndicators.tsx # Maps openings to entry/exit indicators
├── GateEntryIndicator.tsx    # Per-opening planes, labels, swap icon
└── index.ts                  # Barrel export (incomplete — missing LadderGate)
```

## CONVENTIONS
- Gate components accept the shared `GateComponentProps` shape: position, rotation degrees, openings, labels, selection, click handlers.
- Use `meshStandardMaterial` with solid colors from `useTheme()` / `getGateColors()`; no textures.
- Selection highlight is emissive color/intensity on visible frame meshes.
- `Gate.tsx` maps `GateType` to components and owns read-only handling plus opening label/direction callbacks.
- `GateHandles.tsx` uses drei `<Html>` for DOM overlays in 3D space.
- Opening indicators are green entry / red exit planes; label/swap interactions route through store actions.

## WHERE TO LOOK
| Task | File |
|------|------|
| Change fixed gate set | Component, `Gate.tsx`, `src/types/gate.ts`, defaults, schema/tests |
| Change gate appearance | Individual gate `.tsx` file + `src/types/theme.ts` / `src/utils/themeColors.ts` if color-related |
| Modify selection behavior | `Gate.tsx`, `src/hooks/useGateSelection.ts` |
| Modify handles / drag / insert | `GateHandles.tsx`, `src/store/trackSlice.ts` |
| Modify opening indicators | `GateOpeningIndicators.tsx`, `GateEntryIndicator.tsx`, `src/utils/gateOpenings.ts` |
| Change path behavior through gates | `src/utils/flightPath.ts`, `src/utils/gateSequence.ts` |

## ANTI-PATTERNS
- Do not add user-defined/custom gate types.
- Do not add per-gate sizing; dimensions are shared constants/global behavior.
- Do not bypass `Gate.tsx` when adding a fixed gate type.
- Do not trust the barrel for all imports until `LadderGate` is exported there.

## NOTES
- `Scene.tsx` imports `Gate` directly (`../gates/Gate`) and bypasses the barrel.
- `GateHandles.tsx` is the largest component; it coordinates drag refs, OrbitControls disabling, insert positions, and history commits.
- Insert handles prefer flight-path samples when available and fall back to rotated gate offsets.
