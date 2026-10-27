# Schemas - Persistence Boundary
**Code state:** 56756ed (2026-10-27, worktree)

## OVERVIEW
`track.schema.ts` owns import/export validation for saved track data. It converts unknown JSON-like input into domain-safe `Track` + config data or structured validation errors.

## STRUCTURE
```
schemas/
├── track.schema.ts       # schema version, validation, legacy normalization, serialize/deserialize
└── track.schema.test.ts  # import/export, invalid shape, legacy compatibility tests
```

## WHERE TO LOOK
| Task | File / Symbol |
|------|---------------|
| Export current app state | `serializeTrack()` |
| Import external/local JSON | `deserializeTrack()` |
| Boolean guard | `isValidTrack()` |
| Detailed validation | `validateTrack()` |
| Version behavior | `SCHEMA_VERSION` (currently `'1.5.0'`) |
| Ideal-line control points | `track.idealLinePoints` (optional; stable ID, leg ref, base `u`, world position) |
| Venue preset id | `config.venueId` (optional; absent/`null` means no preset, anything else must be a `VENUE_IDS` member) |
| Legacy gate aliases | `LEGACY_GATE_TYPE_MAP` (maps `asymmetric` → `double-h`) |
| Gate quantity normalization | `normalizeGateQuantities()` |

## CONVENTIONS
- Treat this directory as the only trusted boundary for persisted track shape.
- Validate unknown data first, normalize legacy fields second, return domain types last.
- Keep validation errors shaped as `{ field, message }`; UI/import callers depend on readable feedback.
- Normalize legacy gate types before final gate/opening/sequence validation.
- Validate track, gates, openings, gate sequence, config flags, field size, gate quantities, and the venue id together.
- `config.venueId` is optional: `undefined` and `null` both pass, any other value must satisfy `isVenueId()` (`src/utils/venuePresets.ts`) or validation reports `{ field: 'config.venueId', message: 'Venue must be one of: last-og3' }`. An unknown id therefore fails validation; only a missing/`null` value is normalized to `null` in `deserializeTrack`. Serialization always writes the field, so 1.2.0 payloads load unchanged.
- `SCHEMA_VERSION` went `1.4.0` to `1.5.0` when free ideal-line points replaced the unversioned height-station model; older payloads load unchanged and keep the field absent. Older venue and height-profile payloads deserialize through the same shape-driven legacy path.
- `idealLinePoints` is optional and omitted when absent or empty. Each entry needs a unique non-empty `id`, `leg.from`/`leg.to` with string `gateId` and `openingId`, finite `0 < u < 1`, and finite world `position.x/y/z`. Validation reports indexed paths and checks shape only. Deserialization rebuilds only those fields and drops extras; the replaced `flightPathHeightOffsets` field is discarded rather than migrated.
- Schema version changes require matching migration/rejection behavior and `track.schema.test.ts` coverage.
- There is no supported-version gate: `version` is only checked to be a string, so any value validates and is re-serialized as the current `SCHEMA_VERSION`.
- Sequence rules: two consecutive entries for the same gate are rejected, and a looped track may not start and end on the same gate.
- Exported contract types are `TrackExportSchema` and `ValidationError` (`{ field, message }`).
- Storage/import code should call schema helpers, not parse and trust raw JSON directly.

## ANTI-PATTERNS
- Do not accept unknown legacy gate types silently.
- Do not duplicate schema checks in `utils/storage.ts` or UI import handlers.
- Do not change validation error shape without checking callers.
- Do not bypass `deserializeTrack()` for imported JSON.
- Do not tie ideal-line point validation to current route geometry or clearance; the schema checks shape only.
- Do not materialize an empty point array or retain a compatibility layer for height stations.
- Do not add unrelated type helpers here; this directory is persistence schema only.
