# Gates — 3D Components

**Domain:** R3F gate representations, opening indicators, 3D edit handles (fixed gate set)
**Code state:** b738218 (2026-10-28, worktree)

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
└── index.ts                  # Stale barrel: zero importers and incomplete (see root)
```

## CONVENTIONS
- Each gate component declares its own local props interface (there is no shared exported `GateComponentProps` type): position, rotation in degrees, openings, labels, selection state, click handlers.
- Use `meshStandardMaterial` with solid colors from `useTheme()` / `getGateColors()`; no textures.
- Selection highlight is emissive color/intensity on visible frame meshes.
- `Gate.tsx` maps `GateType` to components and owns read-only handling plus opening label/direction callbacks.
- `GateHandles.tsx` uses drei `<Html>` for DOM overlays in 3D space.
- Opening indicators are green entry / red exit planes; label/swap interactions route through store actions.
- Drag math: move is clamped to the field bounds, elevate moves at 0.03 m per pixel with y floored at 0, rotate runs at 1 degree per pixel and rounds to 15 only while `config.snapGatesToGrid` is on. The rotate/elevate math exists twice (`GateHandles.tsx` and `src/hooks/useGateMoveDrag.ts`) — change both copies together.

## WHERE TO LOOK
| Task | File |
|------|------|
| Change fixed gate set | Component, `Gate.tsx`, `src/types/gate.ts`, defaults, schema/tests |
| Change gate appearance | Individual gate `.tsx` file + `src/types/theme.ts` / `src/utils/themeColors.ts` if color-related |
| Modify selection behavior | `Gate.tsx`, `src/hooks/useGateSelection.ts` |
| Modify handles / drag / insert / delete | `GateHandles.tsx`, `src/hooks/useGateMoveDrag.ts`, `src/store/trackSlice.ts`, `src/App.tsx` (delete dialog) |
| Modify opening indicators | `GateOpeningIndicators.tsx`, `GateEntryIndicator.tsx`, `src/utils/gateOpenings.ts` |
| Change path behavior through gates | `src/utils/flightPath.ts`, `src/utils/gateSequence.ts` |

## ANTI-PATTERNS
- Do not bypass `Gate.tsx` when adding a fixed gate type.
- Do not import through `index.ts`; import gate files directly.

## NOTES
- `Scene.tsx` imports `Gate` directly (`../gates/Gate`) and bypasses the barrel.
- Drag wiring: the move handle and a gate-body press both run through `src/hooks/useGateMoveDrag.ts` (ground raycast -> `setGatePosition` -> one `commitGateDrag` entry). At press, Shift switches that press-drag to the vertical 0.03 m/px elevation and Ctrl switches it to rotation (`setGateRotation`, 1 deg/px, 15 deg snap while grid snap is on); travel past 3 px selects the gate non-additively. `GateHandles` owns its own rotate/elevate handles and sets `isDraggingGate` so the trailing click does not reselect. Rotation drags record no undo entry and leave `isTrackModified` false.
- `GateHandles.tsx` is the largest component; it coordinates drag refs, OrbitControls disabling, insert positions, and history commits. Its path memo uses `calculateFlightPathWithControlPoints()` so previews follow the custom-shaped ideal line.
- Gate drag semantics never touch `track.idealLinePoints`: moving, elevating, rotating, inserting, and deleting gates keeps authored point data unchanged; points whose leg pair disappears remain dormant rather than being remapped.
- Insert handles prefer visible flight-path samples when available and fall back to rotated gate offsets. They read `flightPath.path.sampledLegs`, select with `getClosestPathPoint()`, and preserve the `centerTarget` X/Z fallbacks. The new gate's Y stays `selectedGate.position.y`; the preview handle follows the visible line.
- `src/components/icons/GateIcon.tsx` mirrors each gate's 3D geometry as an SVG silhouette (front view, except the dive cube in 3/4 isometric); its header comment still claims a 1 m small-flag pole although `FlagSmall` uses `GATE_BASE_HEIGHT` (1.2 m). Keep the silhouettes in sync when geometry changes.
- `start-finish` is a singleton: the store allows only one such gate at a time (`isSingletonGateType` / `hasSingletonGateConflict` in `src/store/trackSlice.ts`).
- The legacy schema map sends the old `asymmetric` gate type to `double-h` (`LEGACY_GATE_TYPE_MAP` in `src/schemas/track.schema.ts`); `OctagonalTunnelGate` is an ordinary gate type, not a legacy replacement.
- Handle constants live in `GateHandles.tsx`: `HANDLE_CLEARANCE_ABOVE_GATE = 0.5`, `INSERT_HANDLE_OFFSET_Y = 0.9`, `FALLBACK_INSERT_DISTANCE = 3`; the shared elevation step `GATE_ELEVATION_METERS_PER_PIXEL = 0.03` lives in `src/constants/gateDimensions.ts` and is used by the elevate handle and the Shift press-drag.
