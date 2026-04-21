# Utils — Core Logic

**Domain:** Track generation, flight path, gate operations, storage

## STRUCTURE
```
utils/
├── generator.ts         # Random track generation with collision detection
├── flightPath.ts        # Path segments + arrow positions between gates
├── gateOperations.ts    # Pure functions: moveGate, rotateGate
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
| Modify persistence | `storage.ts` | `saveTrack()`, `loadTrack()`, `listTracks()`, `deleteTrack()` |

## KEY CONSTRAINTS
- Min gate distance: 3m (`MIN_DISTANCE`)
- Max placement attempts: 100 per gate
- Arrow spacing: 5m along flight path
- Storage key prefix: `fpv-track-`
