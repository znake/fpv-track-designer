# Utils — Core Logic

**Domain:** Track generation, flight path, gate operations/openings/sequence, storage, share links, QR codes, config drift, pole counts, theme helpers
**Code state:** 56756ed (2026-10-27, worktree)

## STRUCTURE
```
utils/
├── generator.ts          # Random track generation with collision detection
├── flightPath.ts         # Base route plus per-leg custom-point displacement, samples, arrows
├── idealLine.ts          # Leg refs, visible-basis interpolation, smooth offset field, hover/closest helpers
├── gateOperations.ts     # Pure move/rotate helpers (dead: only its own test imports it)
├── gateOpenings.ts       # Opening geometry, normalizeGates, H-gate backrest side
├── gateSequence.ts       # Sequence ordering, legacy expansion, normalization
├── storage.ts            # localStorage CRUD for saved tracks
├── shareTrack.ts         # Compressed share-link payload encode/decode
├── qrCode.ts             # Share QR PNG/SVG generation via `qrcode`
├── fieldWatermark.ts     # Font size for the field-relative #FPVOOE watermark
├── venuePresets.ts       # Venue presets (field size + hall pillars) and VenueId guard
├── generationConfig.ts   # Detect settings that require regeneration
├── poleCount.ts          # Gate/pole totals for buildability reporting
├── poleLimit.ts          # localStorage-backed max pole limit (default 60) + `useMaxPoles()` hook
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
| Modify flight path | `flightPath.ts`, `idealLine.ts` | `calculateFlightPath()`, `calculateFlightPathWithControlPoints()`, `resolveIdealLineHover()` |
| Change gate movement | `src/store/trackSlice.ts` (inline `moveGate`/`rotateGate`); `gateOperations.ts` is dead code | `moveGate()`, `rotateGate()` |
| Modify gate openings | `gateOpenings.ts` | `createDefaultGateOpenings()`, `normalizeGates()` |
| Modify gate sequence | `gateSequence.ts` | `buildDefaultGateSequenceEntries()`, `normalizeGateSequence()` |
| Modify persistence | `storage.ts` | `saveTrack()`, `loadTrack()`, `listTracks()`, `deleteTrack()` |
| Modify share links | `shareTrack.ts` | `encodeTrackSharePayload()`, `decodeTrackSharePayload()`, `createTrackShareUrl()`, `shortenTrackShareUrl()`, `getTrackShortenerEndpoint()` |
| Share QR codes | `qrCode.ts`, `components/ui/ShareTrackDialog.tsx` | `downloadTrackQrCodePng()`, `createTrackQrCodeSvg()`, `downloadTrackQrCodeSvg()` |
| Change regen prompts | `generationConfig.ts` | generation-relevant config diff helpers |
| Change pole totals | `poleCount.ts`, `gateTypeOptions.ts` | pole count/grouping logic and display order |
| Change theme material colors | `themeColors.ts`, `src/types/theme.ts` | `getThemeConfig()`, `getGateColors()` |
| Change the remembered venue | `venuePreference.ts`, `src/store/configSlice.ts` | `readStoredVenueId()`, `writeStoredVenueId()`, `createInitialConfig()` |
| Change venue presets | `venuePresets.ts`, `src/types/venue.ts` | `VENUE_PRESETS`, `getVenuePreset()`, `isVenueId()` |
| Change the ground watermark size | `fieldWatermark.ts`, `src/components/scene/Grid.tsx` | `calculateFieldWatermarkMetrics()`, `FIELD_WATERMARK_TEXT` |

## KEY CONSTRAINTS
- Min gate distance: 3m (`MIN_DISTANCE`).
- Max placement attempts: 100 per gate.
- Flight-path curve sampling is dense and gate-specific; preserve same-gate, dive, H-gate, double-H, and octagonal tunnel cases.
- Custom ideal-line points use stable IDs, a leg ref, an immutable base `u`, and a world position. Each edited leg gets a smooth Catmull-Rom-derived 3D displacement field with zero offsets at both anchors; other legs and all point-free routes keep exact base samples.
- `calculateFlightPathWithControlPoints()` returns `{ path, sampledLegIndexes, sampledLegUs, idealLinePoints, legRefs }`; `FlightPath` itself keeps its original shape. `Scene` uses the wrapper for rendering/FPV/editing and `GateHandles` for insertion previews. `sampledLegUs` supports basis-preserving hover mapping on already shaped curves.
- `idealLine.ts` owns leg grouping, the single visible-basis interpolation rule, smooth fields, hover resolution, and visible closest-point selection. Dormant points stay stored but have no matching leg; zero-length legs are inert.
- Share payload prefix: `z.` for compressed payloads; keep legacy base64-url decode fallback. Shortener defaults: n8n endpoint (`DEFAULT_SHORTENER_ENDPOINT`), dev proxy `/api/shorten-track`, 8 s timeout (`SHORTENER_TIMEOUT_MS`).
- Gate rotation in the store's `rotateGate` action is ±30° steps (0-330), but that action is currently unused by the UI. Real rotation runs through the `GateHandles` rotate handle: 1°/pixel, written continuously (the `types/gate.ts` comment is accurate) and rounded to 15° only while `config.snapGatesToGrid` is active. The generator aligns rotations in 30° steps.
- `calculateFieldWatermarkMetrics()` runs the text along the longer field axis (`height > width` -> `height`), caps it at 0.85 of that axis and 0.3 of the shorter one, and assumes 0.72 em advance per character for troika's Roboto. `Grid` renders the text via drei's `<Text>`.
- `VENUE_PRESETS` currently holds one entry (`last-og3`: 10.5 x 22.7 m, four 0.3 x 0.5 x 3 m pillars on x = 0 at z = -7.05, -1.95, 3.15, 8.25). `getVenuePreset()` returns `null` for an unknown/absent id, `isVenueId()` is the schema-side guard.
- Gate types with `polesPerGate === 0` cannot be built from poles and are reported `notBuildable`: hurdle, dive, octagonal-tunnel (`poleCount.ts`).
- Storage key prefix: `fpv-track-`. `storage.autoSave` exists but is only called by tests; no production caller.
- The max pole limit is a browser-only preference (`fpv-track-designer-max-poles`, default 60) and deliberately stays out of `Config`, track exports, and share links (`poleLimit.ts`).
- The last picked venue is the same kind of preference (`fpv-track-designer-venue`, `venuePreference.ts`): it seeds `createInitialConfig()`, is written only by an explicit `setVenue` pick, and is cleared by `resetToDefault`. `Config.venueId` itself keeps travelling through exports and share links.
- Storage/import/share code must call schema helpers, not trust raw JSON.

## TESTING
- `flightPath.test.ts` preserves gate-specific cases and covers default identity, leg-local shaping, exact authored samples, smoothness, dormant/inert points, and metadata synchronization. `idealLine.test.ts` covers the field, basis, grouping, hover, and closest-point helpers.
- `generator.test.ts`, `gateOpenings.test.ts`, `gateSequence.test.ts`, `gateOperations.test.ts`, and `storage.test.ts` cover core invariants.
- `shareTrack.test.ts`, `generationConfig.test.ts`, `poleCount.test.ts`, `poleLimit.test.ts`, `venuePreference.test.ts`, `venuePresets.test.ts`, and `fieldWatermark.test.ts` cover the newer helpers.
- `qrCode.test.ts` covers PNG/SVG download helpers; mock `URL.createObjectURL`/`revokeObjectURL` locally.
- Browser API mocks, such as `localStorage`, `Blob`, URL, or hash payloads, stay local to each test file.
- No co-located tests currently cover `themeColors.ts` or `gateTypeOptions.ts`; add tests if behavior grows beyond lookup/order constants.
