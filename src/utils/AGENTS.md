# Utils — Core Logic

**Domain:** Track generation, flight path, gate operations/openings/sequence, storage, share links, QR codes, config drift, pole counts, theme helpers
**Code state:** b738218 (2026-10-28, worktree)

## STRUCTURE
```
utils/
├── generator.ts          # Random track generation with collision detection
├── flightPath.ts         # Base route plus per-leg custom-point displacement, samples, arrows
├── routeCurves.ts        # Circle-straight-circle transition planner (minimum turn radius, no corners)
├── idealLine.ts          # Leg refs, visible-basis interpolation, smooth offset field, hover/closest helpers
├── gateInsertion.ts      # Ideal-line hover -> gate-insertion payload (position, rotation, sequence index)
├── gateOperations.ts     # Unused move/rotate helpers (imported only by its test)
├── gateOpenings.ts       # Opening geometry, normalizeGates, H-gate backrest side
├── gateSequence.ts       # Sequence ordering, legacy expansion, normalization
├── storage.ts            # localStorage CRUD for saved tracks
├── shareTrack.ts         # Compressed share-link payload encode/decode
├── qrCode.ts             # Share QR PNG/SVG generation via `qrcode`
├── fieldWatermark.ts     # Font size for the field-relative #FPVOOE watermark
├── venuePresets.ts       # Venue presets (field size + hall pillars) and VenueId guard
├── droneRace.ts          # Drone race route, integrated flight (thrust/brake/gravity), 3D pose frame and split-S
├── generationConfig.ts   # Detect settings that require regeneration
├── poleCount.ts          # Gate/pole totals for buildability reporting
├── poleLimit.ts          # localStorage-backed max pole limit (default 60) + `useMaxPoles()` hook
├── officialTracks.ts     # Bundles tracks/*.json, validates via `deserializeTrack`, newest-first list
├── venuePreference.ts    # localStorage-backed last picked venue, seeds the next visit
├── gateTypeOptions.ts    # Canonical gate type order/labels for UI + metrics
└── themeColors.ts        # Theme lookup and gate material color helpers
```

## CONVENTIONS
- Pure functions by default: no store imports, no hidden UI side effects. `poleLimit.ts` is the documented exception (it owns the `useMaxPoles()` hook over `useSyncExternalStore`).
- Tests are co-located; add behavior-heavy edge cases near changed utilities.
- Constants stay near the top (`MIN_DISTANCE`, `MAX_ATTEMPTS`, clearance/sample values, payload prefixes).
- Use `import type` for type-only imports.
- Normalize gates/sequences before persistence, path calculation, or share-link serialization.
- Treat `gateTypeOptions.ts` ordering as canonical for UI lists and pole-count reporting.

## WHERE TO LOOK
| Task | File | Key Functions |
|------|------|---------------|
| Change generation algorithm | `generator.ts` | `generateTrack(config)` |
| Modify flight path | `flightPath.ts`, `idealLine.ts`, `routeCurves.ts` | `calculateFlightPath()`, `calculateFlightPathWithControlPoints()`, `planSmoothTransition()`, `groupIdealLinePointsByLeg()`, `basisPointAtU()`, `createIdealLineOffsetField()`, `resolveIdealLineHover()`, `getClosestPathPoint()` |
| Change gate movement | `src/store/trackSlice.ts` (inline `moveGate`/`rotateGate`); `gateOperations.ts` is dead code | `moveGate()`, `rotateGate()` |
| Modify gate openings | `gateOpenings.ts` | `createDefaultGateOpenings()`, `normalizeGates()` |
| Modify gate sequence | `gateSequence.ts` | `buildDefaultGateSequenceEntries()`, `normalizeGateSequence()` |
| Insert a gate at an ideal-line hover | `gateInsertion.ts` | `resolveIdealLineGateInsertion()` |
| Modify persistence | `storage.ts` | `saveTrack()`, `loadTrack()`, `listTracks()`, `deleteTrack()` |
| Modify share links | `shareTrack.ts` | `encodeTrackSharePayload()`, `decodeTrackSharePayload()`, `createTrackShareUrl()`, `shortenTrackShareUrl()`, `getTrackShortenerEndpoint()` |
| Share QR codes | `qrCode.ts`, `components/ui/ShareTrackDialog.tsx` | `downloadTrackQrCodePng()`, `createTrackQrCodeSvg()`, `downloadTrackQrCodeSvg()` |
| Change regen prompts | `generationConfig.ts` | generation-relevant config diff helpers |
| Change pole totals | `poleCount.ts`, `gateTypeOptions.ts` | pole count/grouping logic and display order |
| Change theme material colors | `themeColors.ts`, `src/types/theme.ts` | `getThemeConfig()`, `getGateColors()` |
| Change the remembered venue | `venuePreference.ts`, `src/store/configSlice.ts` | `readStoredVenueId()`, `writeStoredVenueId()`, `createInitialConfig()` |
| Official track list and load | `officialTracks.ts` | `parseOfficialTrackFiles()`, `dateTimeOf()` (newest-first order), `listOfficialTracks()`, `loadOfficialTrack()` |
| Change venue presets | `venuePresets.ts`, `src/types/venue.ts` | `VENUE_PRESETS`, `getVenuePreset()`, `isVenueId()` |
| Change the ground watermark size | `fieldWatermark.ts`, `src/components/scene/Grid.tsx` | `calculateFieldWatermarkMetrics()`, `FIELD_WATERMARK_TEXT` |
| Change the drone race | `droneRace.ts`, `src/components/scene/DroneRace.tsx` | `buildDroneRoute()`, `advanceDroneFlight()` (frame integration), `createDroneFlightState()`, `sampleDroneFlightPose()`, `sampleDronePose()` (stateless), `targetSpeedAt()`, `bankRadians()`, `sampleDroneTrailRibbon()` |

## KEY CONSTRAINTS
- Min gate distance: 3m (`MIN_DISTANCE`).
- Max placement attempts: 100 per gate.
- Flight-path curve sampling is dense and gate-specific; preserve same-gate, dive, H-gate, double-H, and octagonal tunnel cases.
- Every gate-to-gate transition is a circle-straight-circle plan from `routeCurves.ts`: `planSmoothTransition()` returns the widest plan whose length stays inside the directness budget and whose samples clear the gate hardware (`pointsCrossForbiddenZone`, `pointsEnterOpening`), falling back to the shortest compliant plan, then to the shortest plan at all. Radius range 0.32 m to 2 m, directness budget 1.3x chord, plus a climb floor of 2.5x the height delta so steep transitions stay gentle. `ArcRouteCurve` evaluates the plan analytically, so the rendered samples sit exactly on the arcs; the old `createDirectionalCurve` / `createRoundedDetour` / `roundPolyline` corner-fillet chain for free transitions is gone (`roundPolyline` survives only inside `createPylonTurn`).
- Same-gate stacked transitions resolve in this order: `createSplitS()` when the second visit is flown backwards (`reverse: true`, `createSplitS()` builds a straight stub plus a half circle on the chord and lands exactly on the reversed entry), otherwise `createUTurn()` (two 180 degree arcs with a `smoothRamp()` height profile, zero slope at both ends) and finally `createPylonTurn()`. The vertical loop over the backrest no longer exists. `SAME_GATE_FRAME_CLEARANCE` (0.25 m) drives the turnaround width, `GATE_STRUCTURE_CLEARANCE` (0.5 m) stays for the other avoidance curves. `buildDefaultGateSequenceEntries()` still returns `[lower, backrest-pass]` for an h-gate, so a fresh h-gate shows the side turnaround until the sequence marks the second opening as reverse.
- Custom ideal-line points use stable IDs, a leg ref, an immutable base `u`, and a world position. Each edited leg gets a smooth Catmull-Rom-derived 3D displacement field with zero offsets at both anchors; other legs and all point-free routes keep exact base samples.
- `calculateFlightPathWithControlPoints()` returns `{ path, sampledLegIndexes, sampledLegUs, idealLinePoints, legRefs }`; `FlightPath` itself keeps its original shape. `Scene` uses the wrapper for rendering/FPV/editing and `GateHandles` for insertion previews. `sampledLegUs` supports basis-preserving hover mapping on already shaped curves.
- `idealLine.ts` owns leg grouping, the single visible-basis interpolation rule, smooth fields, hover resolution, and visible closest-point selection. Dormant points stay stored but have no matching leg; zero-length legs are inert.
- Share payload prefix: `z.` for compressed payloads; keep legacy base64-url decode fallback. Shortener defaults: n8n endpoint (`DEFAULT_SHORTENER_ENDPOINT`), dev proxy `/api/shorten-track`, 8 s timeout (`SHORTENER_TIMEOUT_MS`).
- `calculateFieldWatermarkMetrics()` runs the text along the longer field axis (`height > width` -> `height`), caps it at 0.85 of that axis and 0.3 of the shorter one, and assumes 0.72 em advance per character for troika's Roboto. `Grid` renders the text via drei's `<Text>`.
- `VENUE_PRESETS` currently holds one entry (`last-og3`: 10.5 x 22.7 m, four 0.3 x 0.5 x 3 m pillars on x = 0 at z = -7.05, -1.95, 3.15, 8.25). `getVenuePreset()` returns `null` for an unknown/absent id, `isVenueId()` is the schema-side guard.
- Storage key prefix: `fpv-track-`; `storage.autoSave` exists but only tests call it.
- `droneRace.ts` stays THREE-free and returns a pose frame (`position`, `forward`, `up`) instead of Euler angles. Flight is integrated, not played back: `advanceDroneFlight()` runs fixed 1/120 s substeps, pulls the speed toward `targetSpeedAt()` (`speedFactorAt()` corner braking, a 3D grip limit `v = sqrt(lateralAccel / |curvature|)` and `DRONE_MIN_SPEED_METERS_PER_SECOND`) with each racer's `thrustAccel`/`brakeAccel` limits, and adds gravity along the tangent, so climbs bleed speed, dives gain it up to `DRONE_OVERSPEED_FACTOR` and the frame rate does not change the result. `DroneRace` keeps one `DroneFlightState` per drone and pauses it while a gate is dragged. The up vector comes from a rotation-minimizing frame that `buildDroneRoute()` walks once along the route and stores per point (`ups`), so climbs, dives and vertical loops are followed through inverted flight without a twist or a flip; the corner bank is rolled on top of that frame as a coordinated turn (`bankRadians()` = `-atan(v^2 * horizontalCurvature / g)`, capped at `DRONE_MAX_BANK_RADIANS` = 62 degrees, sign matching the model roll axis) and includes the lateral acceleration of the racer's own sine weave. The body additionally pitches about its right axis by `atan(controlAccel / g)`, capped at `DRONE_MAX_PITCH_RADIANS` = 32 degrees (nose down under power, nose up under braking), rotating `forward` and `up` together so the frame stays orthonormal. `curvatures` holds the smoothed 3D `dT/ds` per point; `horizontalCurvatures` is the signed horizontal part (positive for a left turn) and a vertical loop banks zero. Height uses a soft floor instead of a hard clamp, and the weave normal is the route's 3D tangent (its horizontal part fades out on a vertical climb). `maneuverDistance` marks the sharpest real corner for the split-S, which is one full pitch loop plus a 0.45 m dip, and stays `-1` when no corner stands out.
- The remembered venue (`fpv-track-designer-venue`, `venuePreference.ts`) seeds `createInitialConfig()`, is written only by an explicit `setVenue` pick, and is cleared by `resetToDefault`; `Config.venueId` still travels in exports and share links.

## TESTING
- `.omo/qa/measure.ts` is the machine acceptance harness for the ideal line (criteria M1-M5 and the minimum curve radius from `docs/IDEALLINIE-HANDOFF.md`); run `bun .omo/qa/measure.ts [--verbose]` after touching routing geometry. It exits non-zero while any leg fails. Current state: 168 legs, `failingLegs=0`, `minRadius=0.32m`, `maxKink=5.6deg`, `intersections=0`. M4 and M5 compare against geometry-derived budgets (required heading change, chord angle, height delta) instead of fixed numbers, and M5 measures the transition without the two through-gate straights.
- `flightPath.test.ts` preserves gate-specific cases and covers default identity, leg-local shaping, exact authored samples, smoothness, dormant/inert points, and metadata synchronization. `routeCurves.test.ts` covers the transition planner (pose reach per variant on a seeded sweep, minimum radius, length budget, rejection filter, in-place reversal loop). `idealLine.test.ts` covers the field, basis, grouping, hover, and closest-point helpers. `gateInsertion.test.ts` covers the ideal-line hover to gate-insertion resolver (position, tangent rotation, sequence index incl. same-gate loops, unknown legs).
- `generator.test.ts`, `gateOpenings.test.ts`, `gateSequence.test.ts`, `gateOperations.test.ts`, and `storage.test.ts` cover core invariants.
- `shareTrack.test.ts`, `generationConfig.test.ts`, `poleCount.test.ts`, `poleLimit.test.ts`, `venuePreference.test.ts`, `venuePresets.test.ts`, and `fieldWatermark.test.ts` cover the newer helpers.
- `qrCode.test.ts` covers PNG/SVG download helpers; mock `URL.createObjectURL`/`revokeObjectURL` locally.
- `droneRace.test.ts` covers the route (distances, wrapping, smoothing, lap seam), the integrated pace (spool-up inertia, frame-rate independence, climb/dive gravity, braking into tight ends, speed bounds), pace and grip targets (`targetSpeedAt()`, `curvatureMagnitudeAt()`), banking tilt and its cap, the acceleration-driven pitch and its cap, the inverted apex of a vertical loop, the split-S window (corner detection, mid-maneuver inversion and dip, continuity at the edges) and attitude smoothness across a whole lap.
- Browser API mocks, such as `localStorage`, `Blob`, URL, or hash payloads, stay local to each test file.
- No co-located tests currently cover `themeColors.ts` or `gateTypeOptions.ts`; add tests if behavior grows beyond lookup/order constants.
