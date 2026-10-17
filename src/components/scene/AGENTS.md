# Scene — R3F Canvas, Camera & Themes

**Domain:** 3D scene orchestration, theme-specific environment, camera controls, flight path visualization

## STRUCTURE
```
scene/
├── Scene.tsx              # Single Canvas owner and theme-specific scene composition
├── Grid.tsx               # Ground plane, field boundary, and hand-built line grid
├── VenueObstacles.tsx     # Fixed obstacles of the active venue preset (hall pillars)
├── FlightPath.tsx         # Native THREE.Line segments + direction arrows
├── FpvFlyThrough.tsx      # Automated first-person flight along the path
├── SkyDome.tsx            # Shader sky dome anchored to camera
├── CameraPan.tsx          # Space+click or right-click drag pan
├── CameraVerticalPan.tsx  # Shift+click vertical pan
└── SmoothZoom.tsx         # Wheel + middle-click smooth zoom
```

## CONVENTIONS
- `Scene.tsx` owns the only `<Canvas>`; R3F hooks stay below it.
- `Scene` accepts optional `track`, `configOverride`, and `readOnly` for the standalone viewer.
- Camera controllers return `null` and are imperative via `useThree()`, refs, DOM listeners, and/or `useFrame()`.
- `FlightPath` creates one native `THREE.Line` per sampled segment to avoid implicit connections between disjoint curves.
- `Grid` draws cell (1 m) and section (5 m) lines as its own `<lineSegments>` from computed positions, takes theme colors through the `colors` prop from `Scene`, and only imports drei's `<Text>` for the `#FPVOOE` watermark.
- `VenueObstacles` is props-only (`obstacles` + `color`) and store-free so the read-only viewer renders it too; every mesh is raycast-inert, so clicks pass through to the ground and gates. `Scene` resolves the obstacles from `getVenuePreset(config.venueId)` and renders the component in all three theme branches, with `theme.colors.obstacle` as the color.
- Theme presets live in `src/types/theme.ts`; material helpers live in `src/utils/themeColors.ts`.

## WHERE TO LOOK
| Task | File |
|------|------|
| Add scene object | `Scene.tsx` Canvas children |
| Change theme environments | `Scene.tsx`, `SkyDome.tsx`, `src/types/theme.ts` |
| Change camera behavior | `CameraPan.tsx`, `CameraVerticalPan.tsx`, `SmoothZoom.tsx` |
| Modify flight path rendering | `FlightPath.tsx`, `src/utils/flightPath.ts` |
| Change FPV fly-through | `FpvFlyThrough.tsx` (route sampling, look-ahead camera, completion callback) |
| Change ground/grid appearance | `Grid.tsx`, `src/types/theme.ts` |
| Venue obstacles (hall pillars) | `VenueObstacles.tsx`, `Scene.tsx`, `src/utils/venuePresets.ts` |
| Support viewer read-only mode | `Scene.tsx`, `src/components/viewer/ViewerApp.tsx` |

## NOTES
- CameraPan: Space+left-drag or right-drag; disables OrbitControls while active.
- CameraVerticalPan: Shift+left-drag; keeps camera/target Y in sync.
- SmoothZoom: wheel and middle-drag with frame-rate independent lerp.
- Realistic theme uses sunset environment/shadows; night theme uses stars, environment, and bloom.
- Grid details: the field boundary is always drawn, 1 m cells and 5 m sections appear only while `showGrid` is on, the `#FPVOOE` watermark sits at the field center, and a click on the ground deselects the current gate.
- Touch: a two-finger drag pans the view (`CameraPan`) and a pinch zooms (`SmoothZoom`); both paths are skipped while a native touch gesture is active.
- FPV fly-through runs at 4 m/s with a 1.25 m look-ahead and restores the previous editor camera on exit; the FPV button is disabled below 2 gates, and Escape stops the flight.
- No direct scene/gate component test suites currently exist; verify through build and targeted utility tests.
