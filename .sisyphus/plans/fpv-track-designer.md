# FPV Track Designer Web App

## TL;DR

> **Quick Summary**: Build a 3D FPV drone racing track designer web app with random track generation, gate fine-tuning, and JSON persistence.
>
> **Deliverables**:
> - React + Vite web application with 3D visualization
> - Track generator with safety constraints (3m min distance)
> - 7 gate types with rotation and position adjustment
> - Undo/redo, local storage, JSON import/export
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Types → Store → Generator → 3D Scene → UI Integration

---

## Context

### Original Request
User wants an FPV drone racing track designer web application where users can:
- Input gate types and quantities
- Generate random 3D tracks with shuffle button
- Fine-tune gates (rotation, position)
- Save/load tracks via local storage and JSON

### Interview Summary
**Key Discussions**:
- **Tech Stack**: React + Vite + react-three-fiber + Zustand + Tailwind + Vitest
- **Gate Types**: 7 types (H-Gate, Standard Gate, Hürdel, Doppelgate, Ladder, Start-/Zielgate, Flag)
- **Track Generation**: Random placement + constraints (3m min distance, self-crossing allowed)
- **Features**: Undo/redo, track naming, track gallery, JSON import/export

**Research Findings**:
- No external research needed - user provided detailed gate specifications
- Metis consultation identified: algorithm choice, minimum distance, undo/redo as critical decisions

### Metis Review
**Identified Gaps** (addressed):
- **Track generation algorithm**: Resolved - Random Placement + Constraints
- **Minimum gate distance**: Resolved - 3m (Whoop-optimized)
- **Undo/redo**: Resolved - MVP-critical, included
- **Self-crossing tracks**: Resolved - Allowed

---

## Work Objectives

### Core Objective
Build a fully functional FPV track designer web app with 3D visualization, random track generation, and persistence features.

### Concrete Deliverables
- React application running at localhost:5173
- 3D scene with orbit camera showing track
- Working track generator with shuffle button
- Gate adjustment UI (rotation, position)
- Local storage persistence
- JSON import/export functionality
- Track gallery showing saved tracks
- Undo/redo functionality

### Definition of Done
- [ ] `npm run dev` starts app successfully
- [ ] `npm run test` passes all unit tests
- [ ] Track generates with all configured gates
- [ ] Gates rotate and move correctly
- [ ] Track persists across page reload
- [ ] JSON export/import works correctly

### Must Have
- 7 gate types with correct 3D representations
- 3m minimum distance between gates
- 30° rotation steps
- 4-direction position adjustment (N/S/E/W)
- Flight path with direction arrows
- Undo/redo for all operations
- Track naming
- Default preset configuration

### Must NOT Have (Guardrails)
- ❌ User authentication or accounts
- ❌ Backend server or database
- ❌ Realistic textures or photorealistic rendering
- ❌ Mobile touch gestures (desktop mouse/keyboard only)
- ❌ AR/VR support
- ❌ Video export or recording
- ❌ Drone physics simulation
- ❌ Custom gate type creation
- ❌ Per-gate size adjustment (global setting only)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (will set up)
- **Automated tests**: YES (TDD)
- **Framework**: Vitest
- **Approach**: RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) - Navigate, interact, assert DOM, screenshot
- **3D Scene**: Use Playwright to capture screenshots, verify canvas renders
- **State/Logic**: Use Vitest for unit tests

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - scaffolding + types + config):
├── Task 1: Project scaffolding (Vite + React + TS)
├── Task 2: Tailwind CSS setup
├── Task 3: Vitest configuration
├── Task 4: Type definitions (Gate, Track, Config)
├── Task 5: JSON schema definition
└── Task 6: Zustand store setup

Wave 2 (Core Logic - state + generation):
├── Task 7: Gate configuration store
├── Task 8: Track state store (with undo/redo)
├── Task 9: Track generator algorithm
├── Task 10: Gate position/rotation logic
├── Task 11: Flight path calculation
└── Task 12: Local storage persistence

Wave 3 (3D Visualization):
├── Task 13: 3D scene setup (R3F + Canvas)
├── Task 14: Orbit camera controls
├── Task 15: Gate 3D components (all 7 types)
├── Task 16: Flight path renderer (arrows)
├── Task 17: Grid/floor plane
└── Task 18: Gate interaction (selection)

Wave 4 (UI Components):
├── Task 19: Main layout (sidebar + canvas)
├── Task 20: Gate configuration panel
├── Task 21: Gate adjustment controls
├── Task 22: Track controls (shuffle, save, load)
├── Task 23: Track gallery/list
├── Task 24: JSON import/export UI
└── Task 25: Undo/redo controls

Wave 5 (Integration + Polish):
├── Task 26: Integrate all components
├── Task 27: Default preset loading
├── Task 28: Error handling + edge cases
└── Task 29: Final UI polish

Wave FINAL (Verification - 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T4 → T7/T8 → T9 → T13 → T15 → T26 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Waves 1 & 2)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1-3 | - | All |
| 4 | 1 | 7, 8, 9, 13, 15 |
| 5 | 4 | 12, 24 |
| 6 | 1 | 7, 8, 12 |
| 7 | 4, 6 | 19, 20 |
| 8 | 4, 6 | 10, 11, 19, 22 |
| 9 | 4, 7, 8 | 11, 22 |
| 10 | 4, 8 | 21 |
| 11 | 4, 8, 9 | 16 |
| 12 | 5, 6, 8 | 22, 23 |
| 13 | 1 | 14, 15, 16, 17, 18 |
| 14 | 13 | 19 |
| 15 | 4, 13 | 18, 26 |
| 16 | 11, 13 | 26 |
| 17 | 13 | 26 |
| 18 | 13, 15 | 21, 26 |
| 19 | 14 | 26 |
| 20 | 4, 7, 19 | 26 |
| 21 | 8, 10, 18, 19 | 26 |
| 22 | 8, 9, 12, 19 | 26 |
| 23 | 12, 19 | 26 |
| 24 | 5, 12, 19 | 26 |
| 25 | 8, 19 | 26 |
| 26 | 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25 | 27, 28, 29 |
| 27-29 | 26 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 6 tasks → all `quick`
- **Wave 2**: 6 tasks → T9 `deep`, T10-T11 `unspecified-high`, rest `quick`
- **Wave 3**: 6 tasks → T13, T15 `visual-engineering`, rest `quick`
- **Wave 4**: 7 tasks → T19, T20-T25 `visual-engineering`
- **Wave 5**: 4 tasks → T26 `deep`, T28 `unspecified-high`, rest `quick`
- **FINAL**: 4 tasks → F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. **Project Scaffolding (Vite + React + TypeScript)**

  **What to do**:
  - Initialize Vite project with React + TypeScript template
  - Install dependencies: react, react-dom, @react-three/fiber, @react-three/drei, zustand, tailwindcss, vitest
  - Configure vite.config.ts for React + Vitest
  - Set up basic folder structure: src/components, src/store, src/types, src/utils, src/hooks

  **Must NOT do**:
  - Add any application code (just scaffolding)
  - Configure Tailwind (separate task)
  - Configure Vitest (separate task)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard project initialization, well-documented process
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation for everything)
  - **Parallel Group**: Wave 1
  - **Blocks**: All other tasks
  - **Blocked By**: None

  **References**:
  - Vite docs: `https://vitejs.dev/guide/#scaffolding-your-first-vite-project`
  - R3F docs: `https://docs.pmnd.rs/react-three-fiber/getting-started/installation`

  **Acceptance Criteria**:
  - [ ] `npm run dev` starts dev server at localhost:5173
  - [ ] package.json contains all required dependencies
  - [ ] tsconfig.json configured for React

  **QA Scenarios**:
  ```
  Scenario: Dev server starts successfully
    Tool: Bash
    Steps:
      1. Run `npm run dev`
      2. Curl localhost:5173
    Expected Result: HTML response with React app
    Evidence: .sisyphus/evidence/task-01-dev-server.txt
  ```

  **Commit**: YES
  - Message: `chore: initialize Vite + React + TypeScript project`

- [x] 2. **Tailwind CSS Setup**

  **What to do**:
  - Install tailwindcss, postcss, autoprefixer
  - Initialize Tailwind config: `npx tailwindcss init -p`
  - Configure tailwind.config.js with content paths
  - Add Tailwind directives to main CSS file

  **Must NOT do**:
  - Add any custom styles or components

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3)
  - **Parallel Group**: Wave 1
  - **Blocks**: UI tasks (19-25)
  - **Blocked By**: Task 1

  **References**:
  - Tailwind docs: `https://tailwindcss.com/docs/installation/using-vite`

  **Acceptance Criteria**:
  - [ ] `tailwind.config.js` exists with correct content paths
  - [ ] Tailwind classes work in components

  **QA Scenarios**:
  ```
  Scenario: Tailwind processes CSS correctly
    Tool: Bash
    Steps:
      1. Add `className="bg-red-500"` to App.tsx
      2. Run `npm run build`
      3. Check compiled CSS for bg-red-500
    Expected Result: CSS class exists in output
    Evidence: .sisyphus/evidence/task-02-tailwind.txt
  ```

  **Commit**: YES (group with Task 3)

- [x] 3. **Vitest Configuration**

  **What to do**:
  - Install vitest, @testing-library/react, @testing-library/jest-dom
  - Configure vitest.config.ts
  - Add test script to package.json
  - Create example test file to verify setup

  **Must NOT do**:
  - Write actual tests (just configuration)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 1
  - **Blocks**: All test-related work
  - **Blocked By**: Task 1

  **References**:
  - Vitest docs: `https://vitest.dev/guide/`

  **Acceptance Criteria**:
  - [ ] `vitest.config.ts` exists
  - [ ] `npm run test` runs without errors

  **QA Scenarios**:
  ```
  Scenario: Vitest runs example test
    Tool: Bash
    Steps:
      1. Run `npm run test`
    Expected Result: Test passes with green output
    Evidence: .sisyphus/evidence/task-03-vitest.txt
  ```

  **Commit**: YES (group with Task 2)

- [x] 4. **Type Definitions (Gate, Track, Config)**

  **What to do**:
  - Create src/types/gate.ts with GateType and Gate interface
  - Create src/types/track.ts with Track interface
  - Create src/types/config.ts with Config interface
  - Export all from src/types/index.ts

  **Types to define**:
  ```typescript
  type GateType = 'standard' | 'h-gate' | 'huerdel' | 'doppelgate' | 'ladder' | 'start-finish' | 'flag';
  
  interface Gate {
    id: string;
    type: GateType;
    position: { x: number; y: number; z: number };
    rotation: number; // 0-330 in 30deg steps
    size: 0.75 | 1 | 1.5;
  }
  
  interface Track {
    id: string;
    name: string;
    gates: Gate[];
    fieldSize: { width: number; height: number };
    gateSize: 0.75 | 1 | 1.5;
    createdAt: string;
    updatedAt: string;
  }
  
  interface Config {
    gateQuantities: Record<GateType, number>;
    fieldSize: { width: number; height: number };
    gateSize: 0.75 | 1 | 1.5;
  }
  ```

  **Must NOT do**:
  - Implement any logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3, 5, 6)
  - **Parallel Group**: Wave 1
  - **Blocks**: T7, T8, T9, T13, T15
  - **Blocked By**: Task 1

  **Acceptance Criteria**:
  - [ ] All types exported from src/types/index.ts
  - [ ] TypeScript compiles without errors

  **QA Scenarios**:
  ```
  Scenario: Types compile correctly
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit`
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-04-types.txt
  ```

  **Commit**: YES (group with Tasks 5, 6)

- [x] 5. **JSON Schema Definition**

  **What to do**:
  - Create src/schemas/track.schema.ts with JSON schema for export/import
  - Define validation rules for track data
  - Create serialize/deserialize functions
  - Add version field for future compatibility

  **Schema structure**:
  ```json
  {
    "version": "1.0.0",
    "track": {
      "id": "string",
      "name": "string",
      "gates": [...],
      "fieldSize": { "width": 100, "height": 100 },
      "gateSize": 0.75,
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    },
    "config": {
      "gateQuantities": {...},
      "fieldSize": {...},
      "gateSize": 0.75
    }
  }
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 6)
  - **Parallel Group**: Wave 1
  - **Blocks**: T12, T24
  - **Blocked By**: Task 4

  **Acceptance Criteria**:
  - [ ] Schema validates track JSON
  - [ ] Serialize/deserialize round-trip works

  **QA Scenarios**:
  ```
  Scenario: JSON round-trip works
    Tool: Vitest
    Steps:
      1. Create sample track object
      2. Serialize to JSON
      3. Deserialize back
      4. Compare objects
    Expected Result: Objects are equal
    Evidence: .sisyphus/evidence/task-05-json.txt
  ```

  **Commit**: YES (group with Tasks 4, 6)

- [x] 6. **Zustand Store Setup**

  **What to do**:
  - Create src/store/index.ts with base store configuration
  - Set up store middleware (persistence, devtools)
  - Create empty store slices placeholder
  - Export typed hooks (useTrackStore, useConfigStore)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5)
  - **Parallel Group**: Wave 1
  - **Blocks**: T7, T8, T12
  - **Blocked By**: Task 1

  **Acceptance Criteria**:
  - [ ] Store exports typed hooks
  - [ ] DevTools middleware connected

  **QA Scenarios**:
  ```
  Scenario: Store initializes correctly
    Tool: Vitest
    Steps:
      1. Import store
      2. Call getState()
    Expected Result: Store has initial state
    Evidence: .sisyphus/evidence/task-06-store.txt
  ```

  **Commit**: YES (group with Tasks 4, 5)
  **Commit**: YES (group with Tasks 4, 5)

- [x] 7. **Gate Configuration Store**

  **What to do**:
  - Create src/store/configSlice.ts with gate configuration state
  - Implement actions: setGateQuantity, setFieldSize, setGateSize, resetToDefault
  - Add default preset (1 start/finish, 5 standard, 2 h-gate, 1 huerdel, 1 doppelgate, 2 flag)
  - Connect to Zustand store

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: T19, T20
  - **Blocked By**: T4, T6

  **Acceptance Criteria**:
  - [ ] Default preset loads on app start
  - [ ] setGateQuantity updates state correctly
  - [ ] resetToDefault restores preset

  **QA Scenarios**:
  ```
  Scenario: Default preset loaded
    Tool: Vitest
    Steps:
      1. Get config store state
      2. Check gateQuantities
    Expected Result: Match default preset
    Evidence: .sisyphus/evidence/task-07-config.txt
  ```

  **Commit**: YES (group with T8)

- [x] 8. **Track State Store (with Undo/Redo)**

  **What to do**:
  - Create src/store/trackSlice.ts with track state
  - Implement undo/redo using Zustand's temporal middleware
  - Actions: setTrack, updateGate, moveGate, rotateGate, undo, redo
  - Track history for all gate modifications

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: T10, T11, T19, T21, T22
  - **Blocked By**: T4, T6

  **Acceptance Criteria**:
  - [ ] Undo reverts last gate change
  - [ ] Redo reapplies undone change
  - [ ] History limited to last 50 changes

  **QA Scenarios**:
  ```
  Scenario: Undo/redo works
    Tool: Vitest
    Steps:
      1. Move gate from (0,0) to (10,0)
      2. Call undo()
      3. Check gate position is (0,0)
      4. Call redo()
      5. Check gate position is (10,0)
    Expected Result: Position changes as expected
    Evidence: .sisyphus/evidence/task-08-undo.txt
  ```

  **Commit**: YES (group with T7)

- [x] 9. **Track Generator Algorithm**

  **What to do**:
  - Create src/utils/generator.ts with track generation logic
  - Implement random gate placement with collision detection
  - Ensure 3m minimum distance between gates
  - Generate closed-loop flight path
  - Place all configured gates within field bounds

  **Algorithm**:
  1. Get gate quantities from config
  2. For each gate, random position within field bounds
  3. Check collision with existing gates (3m radius)
  4. If collision, retry (max 100 attempts per gate)
  5. Order gates by proximity for flight path
  6. Ensure start/finish gate is first in sequence

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core algorithm requiring careful implementation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T7, T8)
  - **Parallel Group**: Wave 2
  - **Blocks**: T11, T22
  - **Blocked By**: T4, T7, T8

  **Acceptance Criteria**:
  - [ ] All configured gates placed
  - [ ] No gates closer than 3m
  - [ ] All gates within field bounds
  - [ ] Generation completes in <2s

  **QA Scenarios**:
  ```
  Scenario: Gate distance constraint
    Tool: Vitest
    Steps:
      1. Generate track with 10 gates
      2. Calculate all gate distances
    Expected Result: All distances >= 3m
    Evidence: .sisyphus/evidence/task-09-distance.txt

  Scenario: Generation performance
    Tool: Vitest
    Steps:
      1. Measure time to generate 12-gate track
    Expected Result: <2000ms
    Evidence: .sisyphus/evidence/task-09-perf.txt
  ```

  **Commit**: YES

- [x] 10. **Gate Position/Rotation Logic**

  **What to do**:
  - Create src/utils/gateOperations.ts
  - Implement moveGate(gate, direction, distance) - N/S/E/W movement
  - Implement rotateGate(gate, direction) - clockwise/counter-clockwise in 30deg steps
  - Validate moves don't violate constraints
  - Check field bounds after move

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T11)
  - **Parallel Group**: Wave 2
  - **Blocks**: T21
  - **Blocked By**: T4, T8

  **Acceptance Criteria**:
  - [ ] moveGate moves in 1m increments
  - [ ] rotateGate changes by 30deg
  - [ ] Moves validate against field bounds

  **QA Scenarios**:
  ```
  Scenario: Gate rotation steps
    Tool: Vitest
    Steps:
      1. Rotate gate 4 times clockwise
    Expected Result: Rotation = 120deg
    Evidence: .sisyphus/evidence/task-10-rotation.txt
  ```

  **Commit**: YES (group with T11)

- [x] 11. **Flight Path Calculation**

  **What to do**:
  - Create src/utils/flightPath.ts
  - Calculate path points between ordered gates
  - Generate arrow positions along path
  - Handle vertical elements (ladder, doppelgate) correctly
  - Export path as array of 3D points

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T10)
  - **Parallel Group**: Wave 2
  - **Blocks**: T16
  - **Blocked By**: T4, T8, T9

  **Acceptance Criteria**:
  - [ ] Path connects all gates in order
  - [ ] Arrows show correct direction
  - [ ] Path closes (last gate to first)

  **QA Scenarios**:
  ```
  Scenario: Flight path connects all gates
    Tool: Vitest
    Steps:
      1. Generate track with 5 gates
      2. Calculate flight path
    Expected Result: Path has 5 segments
    Evidence: .sisyphus/evidence/task-11-path.txt
  ```

  **Commit**: YES (group with T10)

- [x] 12. **Local Storage Persistence**

  **What to do**:
  - Create src/utils/storage.ts
  - Implement saveTrack(track), loadTrack(id), listTracks(), deleteTrack(id)
  - Use localStorage with JSON serialization
  - Handle storage quota errors gracefully
  - Implement auto-save on track changes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T10, T11)
  - **Parallel Group**: Wave 2
  - **Blocks**: T22, T23
  - **Blocked By**: T5, T6, T8

  **Acceptance Criteria**:
  - [ ] Tracks persist across page reload
  - [ ] listTracks returns all saved tracks
  - [ ] deleteTrack removes track from storage

  **QA Scenarios**:
  ```
  Scenario: Track persists after reload
    Tool: Playwright
    Steps:
      1. Save track "Test Track"
      2. Reload page
      3. Load track list
    Expected Result: "Test Track" in list
    Evidence: .sisyphus/evidence/task-12-storage.png
  ```

  **Commit**: YES
  **Commit**: YES

- [x] 13. **3D Scene Setup (R3F + Canvas)**

  **What to do**:
  - Create src/components/scene/Scene.tsx with R3F Canvas
  - Set up lighting (ambient + directional)
  - Configure camera defaults (position, fov)
  - Add resize handling

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 3D scene setup requires visual understanding
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation for 3D)
  - **Parallel Group**: Wave 3
  - **Blocks**: T14, T15, T16, T17, T18
  - **Blocked By**: T1

  **Acceptance Criteria**:
  - [ ] Canvas renders without errors
  - [ ] Scene visible with default lighting

  **QA Scenarios**:
  ```
  Scenario: 3D scene renders
    Tool: Playwright
    Steps:
      1. Navigate to app
      2. Check canvas element exists
      3. Take screenshot
    Expected Result: Canvas visible with scene
    Evidence: .sisyphus/evidence/task-13-scene.png
  ```

  **Commit**: YES (group with T14, T17)

- [x] 14. **Orbit Camera Controls**

  **What to do**:
  - Add OrbitControls from drei
  - Configure rotation, zoom, pan limits
  - Set default camera position (top-down angle)
  - Smooth camera movement

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T15, T16, T17, T18)
  - **Parallel Group**: Wave 3
  - **Blocks**: T19
  - **Blocked By**: T13

  **Acceptance Criteria**:
  - [ ] Mouse drag rotates camera
  - [ ] Scroll zooms in/out
  - [ ] Camera stays within limits

  **QA Scenarios**:
  ```
  Scenario: Camera orbit works
    Tool: Playwright
    Steps:
      1. Click and drag on canvas
      2. Check camera position changed
    Expected Result: Camera moved
    Evidence: .sisyphus/evidence/task-14-camera.png
  ```

  **Commit**: YES (group with T13, T17)

- [x] 15. **Gate 3D Components (All 7 Types)**

  **What to do**:
  - Create src/components/gates/ with component for each gate type:
    - StandardGate.tsx - simple square frame
    - HGate.tsx - gate with flag on top
    - HuerdelGate.tsx - gate oriented for over-flight
    - Doppelgate.tsx - two stacked gates
    - LadderGate.tsx - three stacked gates
    - StartFinishGate.tsx - with distinct color/label
    - Flag.tsx - vertical pole with flag
  - Each component accepts position, rotation, size props
  - Use simple box geometries (wireframe style)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Requires understanding of 3D geometry and gate shapes
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T14, T16, T17, T18)
  - **Parallel Group**: Wave 3
  - **Blocks**: T18, T26
  - **Blocked By**: T4, T13

  **Acceptance Criteria**:
  - [ ] All 7 gate types render
  - [ ] Gates scale with size prop
  - [ ] Gates rotate correctly

  **QA Scenarios**:
  ```
  Scenario: All gate types visible
    Tool: Playwright
    Steps:
      1. Add one of each gate type to scene
      2. Take screenshot
    Expected Result: All 7 gates visible
    Evidence: .sisyphus/evidence/task-15-gates.png
  ```

  **Commit**: YES (group with T16, T18)

- [x] 16. **Flight Path Renderer (Arrows)**

  **What to do**:
  - Create src/components/scene/FlightPath.tsx
  - Render line between gates using flight path data
  - Add arrow cones along path showing direction
  - Use distinct color for visibility

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T14, T15, T17, T18)
  - **Parallel Group**: Wave 3
  - **Blocks**: T26
  - **Blocked By**: T11, T13

  **Acceptance Criteria**:
  - [ ] Path connects all gates
  - [ ] Arrows point in flight direction

  **QA Scenarios**:
  ```
  Scenario: Flight path visible with arrows
    Tool: Playwright
    Steps:
      1. Generate track
      2. Check for line and arrow objects
    Expected Result: Path with arrows visible
    Evidence: .sisyphus/evidence/task-16-path.png
  ```

  **Commit**: YES (group with T15, T18)

- [x] 17. **Grid/Floor Plane**

  **What to do**:
  - Create src/components/scene/Grid.tsx
  - Add ground plane with grid pattern
  - Scale grid to match field size
  - Add axis indicator (X, Z directions)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T14, T15, T16, T18)
  - **Parallel Group**: Wave 3
  - **Blocks**: T26
  - **Blocked By**: T13

  **Acceptance Criteria**:
  - [ ] Grid renders at y=0
  - [ ] Grid scales with field size

  **QA Scenarios**:
  ```
  Scenario: Grid visible on ground
    Tool: Playwright
    Steps:
      1. Navigate to app
      2. Check for grid lines
    Expected Result: Grid visible
    Evidence: .sisyphus/evidence/task-17-grid.png
  ```

  **Commit**: YES (group with T13, T14)

- [x] 18. **Gate Interaction (Selection)**

  **What to do**:
  - Create src/hooks/useGateSelection.ts
  - Implement click-to-select gate in 3D scene
  - Highlight selected gate (change color/outline)
  - Store selected gate ID in track store

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T14, T15, T16, T17)
  - **Parallel Group**: Wave 3
  - **Blocks**: T21, T26
  - **Blocked By**: T13, T15

  **Acceptance Criteria**:
  - [ ] Clicking gate selects it
  - [ ] Selected gate highlighted
  - [ ] Store updated with selection

  **QA Scenarios**:
  ```
  Scenario: Gate selection works
    Tool: Playwright
    Steps:
      1. Click on a gate
      2. Check gate has highlight effect
    Expected Result: Gate highlighted
    Evidence: .sisyphus/evidence/task-18-selection.png
  ```

  **Commit**: YES (group with T15, T16)

  **Commit**: YES (group with T15, T16)

- [x] 19. **Main Layout (Sidebar + Canvas)**

  **What to do**:
  - Create src/App.tsx with main layout structure
  - Add sidebar for controls (left or right side)
  - Position 3D canvas in main content area
  - Make layout responsive (but desktop-focused)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI layout design
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T20-T25)
  - **Parallel Group**: Wave 4
  - **Blocks**: T26
  - **Blocked By**: T14

  **Acceptance Criteria**:
  - [ ] Sidebar visible on left/right
  - [ ] Canvas fills remaining space

  **QA Scenarios**:
  ```
  Scenario: Layout renders correctly
    Tool: Playwright
    Steps:
      1. Navigate to app
      2. Check sidebar exists
      3. Check canvas exists
    Expected Result: Both visible
    Evidence: .sisyphus/evidence/task-19-layout.png
  ```

  **Commit**: YES (group with T20-T25)

- [x] 20. **Gate Configuration Panel**

  **What to do**:
  - Create src/components/ui/GateConfigPanel.tsx
  - List all 7 gate types with quantity inputs
  - Add field size inputs (width, height)
  - Add gate size selector (75cm, 1m, 1.5m)
  - Connect to config store

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Form UI component
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T19, T21-T25)
  - **Parallel Group**: Wave 4
  - **Blocks**: T26
  - **Blocked By**: T4, T7, T19

  **Acceptance Criteria**:
  - [ ] All gate types listed with inputs
  - [ ] Changes update store

  **QA Scenarios**:
  ```
  Scenario: Gate quantity changes
    Tool: Playwright
    Steps:
      1. Set standard gate count to 10
      2. Check store updated
    Expected Result: Store has 10 standard gates
    Evidence: .sisyphus/evidence/task-20-config.png
  ```

  **Commit**: YES (group with T19, T21-T25)

- [x] 21. **Gate Adjustment Controls**

  **What to do**:
  - Create src/components/ui/GateAdjustment.tsx
  - Show controls when gate is selected
  - Add rotation buttons (clockwise/counter-clockwise)
  - Add position buttons (N/S/E/W)
  - Show current gate info (type, position, rotation)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Interactive UI controls
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T19, T20, T22-T25)
  - **Parallel Group**: Wave 4
  - **Blocks**: T26
  - **Blocked By**: T8, T10, T18, T19

  **Acceptance Criteria**:
  - [ ] Controls appear when gate selected
  - [ ] Rotation changes gate angle
  - [ ] Position buttons move gate

  **QA Scenarios**:
  ```
  Scenario: Gate rotation in UI
    Tool: Playwright
    Steps:
      1. Select a gate
      2. Click rotate clockwise 3 times
      3. Check rotation is 90deg
    Expected Result: Gate rotated correctly
    Evidence: .sisyphus/evidence/task-21-adjust.png
  ```

  **Commit**: YES (group with T19-T20, T22-T25)

- [x] 22. **Track Controls (Shuffle, Save, Load)**

  **What to do**:
  - Create src/components/ui/TrackControls.tsx
  - Add shuffle button to regenerate track
  - Add save button (prompts for track name)
  - Add load dropdown to select saved track
  - Add new track button

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Button UI components
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T19-T21, T23-T25)
  - **Parallel Group**: Wave 4
  - **Blocks**: T26
  - **Blocked By**: T8, T9, T12, T19

  **Acceptance Criteria**:
  - [ ] Shuffle generates new track
  - [ ] Save stores track
  - [ ] Load restores track

  **QA Scenarios**:
  ```
  Scenario: Shuffle generates new track
    Tool: Playwright
    Steps:
      1. Click shuffle button
      2. Check gates changed positions
    Expected Result: Different gate layout
    Evidence: .sisyphus/evidence/task-22-shuffle.png
  ```

  **Commit**: YES (group with T19-T21, T23-T25)

- [x] 23. **Track Gallery/List**

  **What to do**:
  - Create src/components/ui/TrackGallery.tsx
  - List all saved tracks with names and dates
  - Click to load track
  - Add delete button per track
  - Show current track indicator

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: List UI component
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T19-T22, T24-T25)
  - **Parallel Group**: Wave 4
  - **Blocks**: T26
  - **Blocked By**: T12, T19

  **Acceptance Criteria**:
  - [ ] All saved tracks listed
  - [ ] Click loads track
  - [ ] Delete removes track

  **QA Scenarios**:
  ```
  Scenario: Track list shows saved tracks
    Tool: Playwright
    Steps:
      1. Save track "Test A"
      2. Save track "Test B"
      3. Check gallery shows both
    Expected Result: Both tracks in list
    Evidence: .sisyphus/evidence/task-23-gallery.png
  ```

  **Commit**: YES (group with T19-T22, T24-T25)

- [x] 24. **JSON Import/Export UI**

  **What to do**:
  - Create src/components/ui/JsonImportExport.tsx
  - Add export button (downloads JSON file)
  - Add import button (file picker, validates JSON)
  - Show success/error messages
  - Use File API for download/upload

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: File handling UI
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T19-T23, T25)
  - **Parallel Group**: Wave 4
  - **Blocks**: T26
  - **Blocked By**: T5, T12, T19

  **Acceptance Criteria**:
  - [ ] Export downloads JSON file
  - [ ] Import loads valid JSON
  - [ ] Invalid JSON shows error

  **QA Scenarios**:
  ```
  Scenario: JSON export works
    Tool: Playwright
    Steps:
      1. Click export button
      2. Check file downloaded
      3. Parse JSON content
    Expected Result: Valid JSON with track data
    Evidence: .sisyphus/evidence/task-24-json.png
  ```

  **Commit**: YES (group with T19-T23, T25)

- [x] 25. **Undo/Redo Controls**

  **What to do**:
  - Create src/components/ui/UndoRedo.tsx
  - Add undo button (disabled when no history)
  - Add redo button (disabled when no future)
  - Add keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  - Show tooltip with last action

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Button UI with shortcuts
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T19-T24)
  - **Parallel Group**: Wave 4
  - **Blocks**: T26
  - **Blocked By**: T8, T19

  **Acceptance Criteria**:
  - [ ] Undo reverts last change
  - [ ] Redo reapplies change
  - [ ] Keyboard shortcuts work

  **QA Scenarios**:
  ```
  Scenario: Undo button works
    Tool: Playwright
    Steps:
      1. Move a gate
      2. Click undo
      3. Check gate back at original position
    Expected Result: Gate moved back
    Evidence: .sisyphus/evidence/task-25-undo.png
  ```

  **Commit**: YES (group with T19-T24)

- [x] 26. **Integrate All Components**

  **What to do**:
  - Wire all components together in App.tsx
  - Ensure data flows correctly between store and UI
  - Test complete user flow: config → generate → adjust → save
  - Add loading states where needed

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration requires understanding full system
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5
  - **Blocks**: T27, T28, T29
  - **Blocked By**: T15, T16, T17, T18, T19, T20, T21, T22, T23, T24, T25

  **Acceptance Criteria**:
  - [ ] Complete user flow works
  - [ ] No console errors
  - [ ] All features accessible

  **QA Scenarios**:
  ```
  Scenario: Complete user flow
    Tool: Playwright
    Steps:
      1. Load app
      2. Configure gates
      3. Click shuffle
      4. Adjust a gate
      5. Save track
      6. Reload page
      7. Load saved track
    Expected Result: Track restored correctly
    Evidence: .sisyphus/evidence/task-26-integration.png
  ```

  **Commit**: YES

- [x] 27. **Default Preset Loading**

  **What to do**:
  - Load default preset on app start
  - Auto-generate initial track
  - Ensure first-time user experience is smooth

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T28, T29)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T26

  **Acceptance Criteria**:
  - [ ] Track auto-generated on first load
  - [ ] Default gate counts applied

  **QA Scenarios**:
  ```
  Scenario: Default preset on load
    Tool: Playwright
    Steps:
      1. Clear localStorage
      2. Load app
      3. Check gate counts
    Expected Result: Default preset applied
    Evidence: .sisyphus/evidence/task-27-preset.png
  ```

  **Commit**: YES (group with T28, T29)

- [x] 28. **Error Handling + Edge Cases**

  **What to do**:
  - Handle localStorage quota exceeded
  - Handle invalid JSON import
  - Handle generation failures (too many gates for field)
  - Add error boundary for React errors
  - Show user-friendly error messages

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires careful error handling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T27, T29)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T26

  **Acceptance Criteria**:
  - [ ] Invalid JSON shows error, not crash
  - [ ] Storage full shows warning
  - [ ] Generation failure handled

  **QA Scenarios**:
  ```
  Scenario: Invalid JSON import handled
    Tool: Playwright
    Steps:
      1. Create invalid JSON file
      2. Import via UI
    Expected Result: Error message shown, no crash
    Evidence: .sisyphus/evidence/task-28-error.png
  ```

  **Commit**: YES (group with T27, T29)

- [x] 29. **Final UI Polish**

  **What to do**:
  - Add hover states to buttons
  - Ensure consistent spacing and typography
  - Add loading indicators where needed
  - Test keyboard navigation
  - Add focus states for accessibility

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI polish requires visual attention
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T27, T28)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T26

  **Acceptance Criteria**:
  - [ ] Buttons have hover states
  - [ ] Loading indicators visible
  - [ ] Keyboard navigation works

  **QA Scenarios**:
  ```
  Scenario: UI polish check
    Tool: Playwright
    Steps:
      1. Hover over buttons
      2. Tab through controls
    Expected Result: Visual feedback present
    Evidence: .sisyphus/evidence/task-29-polish.png
  ```

  **Commit**: YES (group with T27, T28)





## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist in .sisyphus/evidence/.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `npm run lint` + `npm run test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, unused imports.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [x] F3. **Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Capture evidence to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was added. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Granularity**: Atomic commits per task or logical group
- **Messages**: `type(scope): description` format
- **Pre-commit**: Run `npm run test` and `npm run lint`

---

## Success Criteria

### Verification Commands
```bash
npm run dev      # Starts dev server at localhost:5173
npm run test     # Runs all Vitest tests
npm run build    # Production build succeeds
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Track generates with correct gate count
- [ ] Gates rotate in 30° steps
- [ ] Gates move in 4 directions
- [ ] Undo/redo works
- [ ] JSON export/import works
- [ ] Track persists in local storage
