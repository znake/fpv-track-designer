# Gates — 3D Components

**Domain:** R3F gate representations, opening indicators, 3D edit handles (fixed gate set)
**Code state:** 56756ed (2026-10-27, worktree)

## STRUCTURE
```
gates/
├── StandardGate.tsx          # Blue square frame
├── HGate.tsx                 # H-gate with deterministic side backrest
├── DoubleHGate.tsx           # Stacked H-gate pair
├── HurdleGate.tsx            # Raised bar; lower body + opening above
├── DiveGate.tsx              # Cube-like dive gate with top approach behavior
├── DoubleGate.tsx            # Two stacked gates
├── LadderGate.tsx            # Three stacked gates
├── StartFinishGate.tsx       # Start panel + text
├── Flag.tsx                  # Pole + flag marker
├── FlagSmall.tsx             # 1.2m pole + proportionally smaller plate
├── OctagonalTunnelGate.tsx   # Octagonal 8-edge tunnel, length 2
├── Gate.tsx                  # Dispatcher: GateType → component
├── GateHandles.tsx           # Html overlay: move/rotate/elevate/insert/delete
├── GateOpeningIndicators.tsx # Maps openings to entry/exit indicators
├── GateEntryIndicator.tsx    # Per-opening planes, labels, swap icon
└── index.ts                  # Incomplete barrel; no importers (missing LadderGate, FlagSmall, GateHandles, GateOpeningIndicators)
```

## CONVENTIONS
- Each gate component declares its own local props interface (there is no shared exported `GateComponentProps` type): position, rotation in degrees, openings, labels, selection state, click handlers.
- Use `meshStandardMaterial` with solid colors from `useTheme()` / `getGateColors()`; no textures.
- Selection highlight is emissive color/intensity on visible frame meshes.
- `Gate.tsx` maps `GateType` to components and owns read-only handling plus opening label/direction callbacks.
- `GateHandles.tsx` uses drei `<Html>` for DOM overlays in 3D space.
- Opening indicators are green entry / red exit planes; label/swap interactions route through store actions.
- `GateHandles` drag semantics: move is clamped to the field bounds, rotate runs at 1 degree per pixel and only rounds to 15 degrees while `config.snapGatesToGrid` is on, and elevate moves at 0.03 m per pixel with y floored at 0.

## WHERE TO LOOK
| Task | File |
|------|------|
| Change fixed gate set | Component, `Gate.tsx`, `src/types/gate.ts`, defaults, schema/tests |
| Change gate appearance | Individual gate `.tsx` file + `src/types/theme.ts` / `src/utils/themeColors.ts` if color-related |
| Modify selection behavior | `Gate.tsx`, `src/hooks/useGateSelection.ts` |
| Modify handles / drag / insert / delete | `GateHandles.tsx`, `src/store/trackSlice.ts`, `src/App.tsx` (delete dialog) |
| Modify opening indicators | `GateOpeningIndicators.tsx`, `GateEntryIndicator.tsx`, `src/utils/gateOpenings.ts` |
| Change path behavior through gates | `src/utils/flightPath.ts`, `src/utils/gateSequence.ts` |

## ANTI-PATTERNS
- Do not add user-defined/custom gate types.
- Do not add per-gate sizing; dimensions are shared constants/global behavior.
- Do not bypass `Gate.tsx` when adding a fixed gate type.
- Do not trust the barrel; it lacks `LadderGate`, `FlagSmall`, `GateHandles`, and `GateOpeningIndicators`, and has no importers. Import gate files directly.

## NOTES
- `Scene.tsx` imports `Gate` directly (`../gates/Gate`) and bypasses the barrel.
- Drag wiring: the move handle and a press-and-drag on the gate body both run through `src/hooks/useGateMoveDrag.ts` (ground raycast -> `setGatePosition` -> one `commitGateDrag` entry); holding Shift during a gate-body press switches that same press-drag to the vertical 0.03 m/px elevation used by the elevate handle; `GateHandles` itself owns rotate (`setGateRotation`) and elevate (`setGatePosition`) drags and sets `isDraggingGate` so the trailing click does not reselect.
- `GateHandles.tsx` is the largest component; it coordinates drag refs, OrbitControls disabling, insert positions, and history commits. Its path memo uses `calculateFlightPathWithControlPoints()` so previews follow the custom-shaped ideal line.
- Gate drag semantics never touch `track.idealLinePoints`: moving, elevating, rotating, inserting, and deleting gates keeps authored point data unchanged; points whose leg pair disappears remain dormant rather than being remapped.
- `GateType` set (`src/types/gate.ts`): standard, h-gate, double-h, hurdle, dive, double, ladder, start-finish, flag, flag-small, octagonal-tunnel.
- Insert handles prefer visible flight-path samples when available and fall back to rotated gate offsets. They read `flightPath.path.sampledLegs`, select with `getClosestPathPoint()`, and preserve the `centerTarget` X/Z fallbacks. The new gate's Y stays `selectedGate.position.y`; the preview handle follows the visible line.
- `src/components/icons/GateIcon.tsx` mirrors each gate's 3D geometry as an SVG silhouette (front view, except the dive cube in 3/4 isometric); its header comment still claims a 1 m small-flag pole although `FlagSmall` uses `GATE_BASE_HEIGHT` (1.2 m). Keep the silhouettes in sync when geometry changes.
- `start-finish` is a singleton: the store allows only one such gate at a time (`isSingletonGateType` / `hasSingletonGateConflict` in `src/store/trackSlice.ts`).
- The legacy schema map sends the old `asymmetric` gate type to `double-h` (`LEGACY_GATE_TYPE_MAP` in `src/schemas/track.schema.ts`); `OctagonalTunnelGate` is an ordinary gate type, not a legacy replacement.
- Handle constants live in `GateHandles.tsx`: `DEGREES_PER_PIXEL = 1`, `ROTATION_SNAP_STEP_DEGREES = 15`, `HANDLE_CLEARANCE_ABOVE_GATE = 0.5`, `INSERT_HANDLE_OFFSET_Y = 0.9`, `FALLBACK_INSERT_DISTANCE = 3`; the shared elevation step `GATE_ELEVATION_METERS_PER_PIXEL = 0.03` lives in `src/constants/gateDimensions.ts` and is used by both the elevate handle and the Shift press-drag.
- The rotate handle only rounds while grid snap is active; the store action `rotateGate` (plus/minus 30 degrees) has no UI caller, and the generator rounds gate rotations to 30 degrees.
