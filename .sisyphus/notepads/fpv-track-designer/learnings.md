# FPV Track Designer - Learnings

## Task 01: Initialize Vite + React + TypeScript Project

### What worked:
- Created Vite project in temp directory and copied to current directory (since directory wasn't empty)
- Installed all required dependencies: react, react-dom, @react-three/fiber, @react-three/drei, zustand, tailwindcss, vitest, @testing-library/react, @testing-library/jest-dom
- Configured vite.config.ts with vitest plugin
- Created folder structure: src/components, src/store, src/types, src/utils, src/hooks, src/schemas
- Added test script to package.json
- Verified dev server starts at localhost:5173 and responds to curl

### Issues encountered:
- `npm create vite` cancelled when run in non-empty directory - solved by creating in temp directory
- package.json had duplicate content after edit - solved by deleting and rewriting with bash
- vite.config.ts had duplicate content after edit - solved by deleting and rewriting with bash

### Evidence:
- Dev server output saved to .sisyphus/evidence/task-01-dev-server.txt

### Final fix:
- vitest import in vite.config.ts needed to use 'vitest/config' instead of 'vite' - build was failing with TS errors
- Fixed by using: `import { defineConfig } from 'vitest/config'`

## Task 06: Zustand Store Setup

### What worked:
- Created src/store/index.ts with base Zustand store configuration
- Used devtools middleware from zustand/middleware
- Imported types from ../types (Track, Config)
- Set up initial state with config, currentTrack, selectedGateId, past, future
- Exported useAppStore typed hook

### Issues encountered:
- GateType was imported but not used - removed from imports
- set parameter in devtools middleware was unused - prefixed with underscore (_set)

### Evidence:
- TypeScript compilation passes (npx tsc --noEmit)
- Store diagnostics: 0 errors
- Evidence saved to .sisyphus/evidence/task-06-store.txt

## Task 10: Gate Position/Rotation Logic

### What worked:
- Created src/utils/gateOperations.ts with moveGate and rotateGate pure utility functions
- moveGate supports N/S/E/W directions with configurable distance (default 1m)
- rotateGate rotates in 30deg steps clockwise or counter-clockwise
- Boundary clamping: y (height) clamped to 0.5-10m, x/z clamped to field half-width/half-height
- Created 17 tests covering rotation steps, movement, boundary clamping, and immutability
- All 17 tests pass

### Key decisions:
- Functions return new Gate objects (immutable) - no mutation of original
- Rotation wraps correctly at 360 boundary using ((rotation + delta) % 360 + 360) % 360
- These are pure utility functions - store already has inline moveGate/rotateGate actions

### Evidence:
- Test output saved to .sisyphus/evidence/task-10-rotation.txt
- 17 tests: 6 rotation tests, 11 movement tests


## Task 12: Local Storage Persistence

### What worked:
- Created src/utils/storage.ts with all required functions
- Used serializeTrack/deserializeTrack from schemas for JSON handling
- Implemented track list management for listing saved tracks
- Added QuotaExceededError handling for storage errors
- Created comprehensive vitest tests with localStorage mock
- All 11 tests pass

### Issues encountered:
- None - implementation matched specification exactly

### Evidence:
- Tests: 11 passed (saveTrack 3, loadTrack 2, listTracks 2, deleteTrack 2, autoSave 2)
- LSP diagnostics: 0 errors
- Evidence saved to .sisyphus/evidence/task-12-storage.txt

### Key patterns:
- localStorage mock using vi.fn() for vitest
- Track list stored separately from track data for efficient listing
- autoSave swallows errors to prevent disrupting user workflow
- UpdatedAt timestamp auto-updated on autoSave

## Task 09: Track Generator Algorithm

### What worked:
- Created src/utils/generator.ts with track generation logic
- Implemented collision detection with MIN_DISTANCE=3m constant
- Used crypto.randomUUID() for gate and track IDs
- Nearest-neighbor ordering for closed-loop flight path
- All 13 tests pass (distance, performance, ordering, bounds)

### Key decisions:
- Start-finish gate always placed first at origin (0, 2, 0)
- Height range: 1-6m for gate positions
- Rotation: 30-degree steps (0-330)
- MAX_ATTEMPTS=100 per gate for collision avoidance
- If gate can't be placed after MAX_ATTEMPTS, skip with console.warn

### Evidence:
- Distance constraint verified: all gate pairs >= 3m apart
- Performance: ~6ms generation time (well under 2000ms limit)
- Evidence saved to .sisyphus/evidence/task-09-distance.txt and task-09-perf.txt

### Test coverage:
- 13 tests covering: gate count, start-finish placement, distance constraint,
  field bounds, rotation steps, unique IDs, gate size, field size, proximity ordering,
  performance, no start-finish case, metadata validation


## Task 13: 3D Scene Setup (R3F + Canvas)

### What worked:
- Created src/components/scene/Scene.tsx with R3F Canvas
- Imports from @react-three/fiber (Canvas) and @react-three/drei (OrbitControls)
- Camera defaults: position [0,30,30], fov 50, near 0.1, far 1000
- Lighting: ambientLight (intensity 0.5) + directionalLight (position [10,20,10], intensity 1, castShadow)
- Floor plane mesh as placeholder for Task 17
- OrbitControls with damping, maxPolarAngle PI/2.1, minDistance 5, maxDistance 100
- Integrated into App.tsx with 500px height container

### Build verification:
- `npm run build` succeeds (573 modules transformed)
- LSP diagnostics: 0 errors
- Warning about chunk size > 500kB (expected with Three.js bundling) - will address with code splitting later

### Key patterns:
- R3F Canvas uses inline style for full width/height - parent container must constrain dimensions
- Three.js adds ~900kB to bundle - consider dynamic import for code splitting
- OrbitControls from drei works out of the box with no additional configuration

### Evidence:
- LSP diagnostics: clean
- Build output: successful
- Evidence saved to .sisyphus/evidence/task-13-scene.txt
## Task 18: Gate Interaction (Selection)

### What worked:
- Created src/hooks/useGateSelection.ts custom hook
- Hook returns { isSelected, handleClick } for easy integration
- handleClick calls e.stopPropagation() then selectGate(gateId)
- Updated all 7 gate components with onClick and emissive highlighting
- Gate.tsx wrapper delegates to specific gate type components with selection props

### Key decisions:
- Each gate type has its own emissive color matching its base color (not a universal yellow)
- emissiveIntensity = 0.4 when selected, 0 when not
- onClick handler attached to every mesh in each gate for reliable click detection
- useGateSelection hook centralizes store access - components just spread the returned props

### Issues encountered:
- Existing gate components (from Task 15) had unused `Gate` type imports - removed
- StartFinishGate had unused `color` variable after refactoring - removed
- Edit tool lost interface closing brace when replacing multi-line interface props - had to fix manually

### Evidence:
- Build passes: npm run build succeeds (573 modules)
- LSP diagnostics: 0 errors across all gate files and hook
- Evidence saved to .sisyphus/evidence/task-18-selection.txt

## Task 15: Gate 3D Components (All 7 Types)

### What worked:
- All 7 gate components already existed with full implementations
- Each component accepts position, rotation, size, isSelected, onClick props
- Uses boxGeometry with meshStandardMaterial for all parts
- Gate.tsx dispatcher maps GateType to correct component via switch statement
- index.ts exports all components for easy importing

### Component specifications:
- StandardGate: Blue (#3b82f6), 4 posts + top/bottom crossbars, 1.2x1.2m base
- HGate: Red (#ef4444), standard gate + flag pole + flag panel on top
- HuerdelGate: Yellow (#f59e0b), wider (1.8m) and shorter (0.8m) for over-flight
- Doppelgate: Green (#22c55e), two gates stacked 2m apart vertically
- LadderGate: Orange (#f97316), three gates stacked 1.5m apart each
- StartFinishGate: Dark (#111827) with checkered panel on top
- Flag: Gray pole (#6b7280) + red flag (#ef4444), 2m base height

### Key decisions:
- All sizes scale proportionally via single scale multiplier
- rotation prop is in degrees, converted to radians for R3F (rotation * Math.PI / 180)
- LadderGate uses GateFrame sub-component to avoid repetition
- Doppelgate uses two inline groups (could refactor like LadderGate)

### Evidence:
- Build passes: npm run build succeeds (573 modules)
- LSP diagnostics: 0 errors
- Evidence saved to .sisyphus/evidence/task-15-gates.txt

## Task 19: Main Layout (Sidebar + Canvas)

### What worked:
- Replaced default Vite template App.tsx with flex layout (sidebar + canvas)
- Sidebar: w-80 min-w-80 bg-gray-800 border-r border-gray-700, scrollable
- Canvas: flex-1 relative, contains <Scene /> component
- Root: flex h-screen w-screen overflow-hidden bg-gray-900
- Simplified index.css to just @import "tailwindcss" + full-screen reset rules
- Removed unused App.css import
- Build succeeds (569 modules, 225ms)

### Key decisions:
- Used Tailwind utility classes directly (no custom CSS needed for layout)
- Sidebar has placeholder sections for Tasks 20-25 (Gate Configuration, Track Controls, etc.)
- Scene.tsx left untouched as required
- index.css stripped of all Vite template styles (fonts, colors, responsive rules)
