# Scene — R3F Canvas, Camera & Themes

**Domain:** 3D scene orchestration, theme-specific environment, camera controls, flight path visualization
**Code state:** b738218 (2026-10-28, worktree)

## STRUCTURE
```
scene/
├── Scene.tsx              # Single Canvas owner and theme-specific scene composition
├── Grid.tsx               # Ground plane, field boundary, and hand-built line grid
├── VenueObstacles.tsx     # Fixed obstacles of the active venue preset (hall pillars)
├── FlightPath.tsx         # Native THREE.Line segments + optional hover interaction
├── FlightPathEditor.tsx   # Editor-only line interaction and hover state
├── FlightPathPointControls.tsx # Custom point markers + press/marker and XZ/Y handle drag controls
├── FpvFlyThrough.tsx      # Automated first-person flight along the path
├── DroneRace.tsx          # Tinywhoop race (editor + viewer): four offset racers with neon strip, glow and fading trails
├── SkyDome.tsx            # Shader sky dome anchored to camera
├── CameraPan.tsx          # Space+click or right-click drag pan
└── SmoothZoom.tsx         # Wheel + middle-click smooth zoom
```

## CONVENTIONS
- R3F hooks stay below the Canvas; every scene file renders into `Scene`'s children.
- `Scene` accepts optional `track`, `configOverride`, `readOnly`, `fpvModeActive`, and `onFpvComplete` for the standalone viewer. It passes `currentTrack.idealLinePoints` into `calculateFlightPathWithControlPoints()` and shares the resulting path with `FlightPath` and FPV (FPV receives `path.sampledPoints`).
- With `showFlightPath` on, `Scene` uses exactly one render branch: `FlightPathEditor` in the editor outside FPV with no gate selected (single or multi), otherwise the plain `FlightPath`. The read-only viewer never mounts interaction, hover markers, or point controls.
- `FlightPathEditor` renders one interactive `FlightPath` plus `FlightPathPointControls`. Hovering a native line draws a 32 px `+` exactly under the cursor (`calculatePosition` pins it to the pointer, `pointer-events: none`), so the line stays traceable and the plus is never a click target; a left click on the line (delta <= 4 px) pins that spot and expands two symbols: a gate symbol (opens the existing gate-insertion dialog with the position from the resolver in `src/utils/gateInsertion.ts`: on the line, rotated along the tangent, inserted into the sequence before the leg's target visit) and an ideal-line point symbol (inserts a point at that visible position with its base-leg `u`). A second click on the line closes the menu, so does a click without a line hit, a click outside the scene, choosing a symbol, or opening the dialog. Leaving the canvas only clears the hover marker, so the menu stays reachable with the mouse. Existing points are plain yellow dots; pressing and dragging a dot moves it on the ground plane exactly like a gate body, `Ctrl` at the press switches to the vertical drag, and a press without travel still selects it. A selected point shows 44 px Move, up/down, and destructive delete controls in one row, mirroring the gate handle row. Move follows ground-raycast X/Z, elevation changes Y by 0.03 m/pixel, and all paths use `useFlightPathPointDrag` with the store's gate position policy and one history entry per drag. Deletion is a separate undoable store action. `FlightPathPointControls` unmounts and cancels a running drag while FPV is active.
- `DroneRace` runs in the editor and the read-only viewer, only while drones are on and outside FPV. The editor reads `showDrones` from the store (top-bar checkbox); `Scene` accepts an optional `showDrones` prop that overrides the store value, which is how `ViewerApp` toggles its own local state (default on). `Scene` passes `paused={isDraggingGate}`, so moving, rotating, or raising a gate hides and freezes the drones and they resume at the same lap distance. The per-racer motion math (speed, lateral and vertical sine offsets, phase) lives in `src/utils/droneRace.ts`, and `showDrones` is a session-level config flag that is never serialized into exports or share links.
- Camera controllers return `null` and are imperative via `useThree()`, refs, DOM listeners, and/or `useFrame()`.
- `FlightPath` creates one native `THREE.Line` per sampled segment to avoid implicit connections between disjoint curves.
- `Grid` draws cell (1 m) and section (5 m) lines as its own `<lineSegments>` from computed positions, takes theme colors through the `colors` prop from `Scene`, and only imports drei's `<Text>` for the `#FPVOOE` watermark, whose font size and orientation come from `calculateFieldWatermarkMetrics()` in `src/utils/fieldWatermark.ts`.
- `VenueObstacles` is props-only (`obstacles` + `color`) and store-free so the read-only viewer renders it too; every mesh is raycast-inert, so clicks pass through to the ground and gates. `Scene` resolves the obstacles from `getVenuePreset(config.venueId)` and renders the component in all three theme branches, with `theme.colors.obstacle` as the color.
- Theme presets live in `src/types/theme.ts`; material helpers live in `src/utils/themeColors.ts`.

## WHERE TO LOOK
| Task | File |
|------|------|
| Add scene object | `Scene.tsx` Canvas children |
| Change theme environments | `Scene.tsx`, `SkyDome.tsx`, `src/types/theme.ts` |
| Change camera behavior | `CameraPan.tsx`, `SmoothZoom.tsx` |
| Modify flight path rendering | `FlightPath.tsx`, `src/utils/flightPath.ts` |
| Edit ideal-line points | `FlightPathEditor.tsx`, `FlightPathPointControls.tsx`, `src/store/trackSlice.ts`, `src/utils/idealLine.ts` |
| Insert a gate from the ideal line | `src/utils/gateInsertion.ts`, `FlightPathEditor.tsx` |
| Change FPV fly-through | `FpvFlyThrough.tsx` (route sampling, look-ahead camera, completion callback) |
| Change ground/grid appearance | `Grid.tsx`, `src/types/theme.ts`, `src/utils/fieldWatermark.ts` |
| Venue obstacles (hall pillars) | `VenueObstacles.tsx`, `Scene.tsx`, `src/utils/venuePresets.ts` |
| Support viewer read-only mode | `Scene.tsx`, `src/components/viewer/ViewerApp.tsx` |

## NOTES
- CameraPan: Space+left-drag or right-drag; disables OrbitControls while active.
- No Shift or Ctrl camera gesture exists: Shift+left-drag on a gate body rotates it (`useGateMoveDrag`), Ctrl+left-drag on a gate body raises/lowers it, and Ctrl+left-drag on an ideal-line point dot raises/lowers that point (`useFlightPathPointDrag`).
- SmoothZoom: wheel and middle-drag with frame-rate independent lerp.
- Realistic theme uses sunset environment/shadows; night theme uses stars, environment, and bloom.
- Grid details: the field boundary is always drawn, 1 m cells and 5 m sections appear only while `showGrid` is on, the `#FPVOOE` watermark sits at the field center, and a click on the ground deselects the current gate.
- Touch: a two-finger drag pans the view (`CameraPan`) and a pinch zooms (`SmoothZoom`); both paths are skipped while a native touch gesture is active.
- FPV fly-through runs at 4 m/s with a 1.25 m look-ahead and restores the previous editor camera on exit; the FPV button is disabled below 2 gates, and Escape stops the flight.
- No general scene/gate component test suites exist; `FlightPathPointControls.test.tsx` covers the point-dot drag wiring while `useFlightPathPointDrag.test.tsx` covers the drag mechanics, and everything else is verified through build and targeted utility tests.
