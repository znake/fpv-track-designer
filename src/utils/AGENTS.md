# Utils — Core Logic

**Domain:** Track generation, flight path, gate operations, gate openings/sequence, storage

## STRUCTURE
```
utils/
├── generator.ts         # Random track generation with collision detection
├── flightPath.ts        # Path segments + arrow positions between gates
├── gateOperations.ts    # Pure functions: moveGate, rotateGate (unused by store)
├── gateOpenings.ts      # Gate opening geometry, normalizeGates, getHGateBackrestSide
├── gateSequence.ts      # Gate sequence ordering, normalizeGateSequence
└── storage.ts           # localStorage CRUD for tracks
```

## CONVENTIONS
- **Pure functions** — no side effects, no store imports
- **Tests co-located** — `*.test.ts` next to source
- **Constants at top** — `MIN_DISTANCE`, `MAX_ATTEMPTS`, `ARROW_SPACING`
- **`import type` required** — `verbatimModuleSyntax: true`

## WHERE TO LOOK
| Task | File | Key Functions |
|------|------|---------------|
| Change generation algorithm | `generator.ts` | `generateTrack(config)` |
| Modify flight path | `flightPath.ts` | `calculateFlightPath(gates)` |
| Change gate movement | `gateOperations.ts` | `moveGate()`, `rotateGate()` |
| Modify gate openings | `gateOpenings.ts` | `createDefaultGateOpenings()`, `normalizeGates()` |
| Modify gate sequence | `gateSequence.ts` | `buildDefaultGateSequenceEntries()`, `normalizeGateSequence()` |
| Modify persistence | `storage.ts` | `saveTrack()`, `loadTrack()`, `listTracks()`, `deleteTrack()` |

## KEY CONSTRAINTS
- Min gate distance: 3m (`MIN_DISTANCE`)
- Max placement attempts: 100 per gate
- Arrow spacing: 5m along flight path
- Storage key prefix: `fpv-track-`

## TESTING
- Algorithm tests are co-located and behavior-heavy; add edge cases near the changed utility.
- `flightPath.test.ts` is the path-geometry regression suite; preserve gate-specific cases.
- Browser API mocks, such as `localStorage`, stay local to each test file.
- Prefer fixture helpers like `createTestGate`, `createTestTrack`, and `createTestConfig` over inline bulky objects.
