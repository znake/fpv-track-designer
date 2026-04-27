# Schemas - Persistence Boundary

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
| Version behavior | `SCHEMA_VERSION` |
| Legacy gate aliases | `LEGACY_GATE_TYPE_MAP` |
| Gate quantity normalization | `normalizeGateQuantities()` |

## CONVENTIONS
- Treat this directory as the only trusted boundary for persisted track shape.
- Validate unknown data first, normalize legacy fields second, return domain types last.
- Keep validation errors shaped as `{ field, message }`; UI/import callers depend on readable feedback.
- Normalize legacy gate types before final gate/opening/sequence validation.
- Validate track, gates, openings, gate sequence, config flags, field size, and gate quantities together.
- Schema version changes require matching migration/rejection behavior and `track.schema.test.ts` coverage.
- Storage/import code should call schema helpers, not parse and trust raw JSON directly.

## ANTI-PATTERNS
- Do not accept unknown legacy gate types silently.
- Do not duplicate schema checks in `utils/storage.ts` or UI import handlers.
- Do not change validation error shape without checking callers.
- Do not bypass `deserializeTrack()` for imported JSON.
- Do not add unrelated type helpers here; this directory is persistence schema only.
