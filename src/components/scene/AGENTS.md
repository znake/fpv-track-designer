# Scene — R3F Canvas & Camera

**Domain:** 3D scene orchestration, camera controls, flight path visualization

## STRUCTURE
```
scene/
├── Scene.tsx           # R3F Canvas owner: orchestrates all scene children
├── Grid.tsx            # Ground plane + field boundary + drei Grid
├── FlightPath.tsx      # Raw THREE.Line path + direction arrows
├── CameraPan.tsx       # Space+click or right-click drag pan (imperative)
├── CameraVerticalPan.tsx  # Shift+click vertical pan (imperative)
└── SmoothZoom.tsx      # Wheel + middle-click smooth zoom (imperative)
```

## CONVENTIONS
- Scene.tsx owns the single `<Canvas>` with camera config
- Camera controllers return `null` — pure imperative via `useThree()` + `useFrame()`
- FlightPath creates raw `THREE.BufferGeometry` + `THREE.Line` injected via `<primitive>`
- Grid uses drei's `<Grid>` helper for cell visualization

## WHERE TO LOOK
| Task | File |
|------|------|
| Change camera behavior | `CameraPan.tsx`, `CameraVerticalPan.tsx`, `SmoothZoom.tsx` |
| Modify flight path rendering | `FlightPath.tsx` |
| Change ground/grid appearance | `Grid.tsx` |
| Add scene object | `Scene.tsx` (add to Canvas children) |

## NOTES
- CameraPan: Space+click or right-click drag
- CameraVerticalPan: Shift+click drag
- SmoothZoom: Wheel zoom + middle-click drag, frame-rate independent lerp
- All camera controllers disable OrbitControls while active
