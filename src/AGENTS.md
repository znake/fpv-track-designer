# Src — App Entrypoints, Shell & Cross-App State

**Domain:** Editor/viewer bootstraps, editor orchestration, i18n, viewer store, shared CSS import, top-level app contracts

## STRUCTURE
```
src/
├── App.tsx              # editor shell: dialogs, first-load generation, scene composition
├── main.tsx             # editor bootstrap: StrictMode + ErrorBoundary + App
├── viewer-main.tsx      # viewer bootstrap: hash decode + ViewerApp
├── viewer-store.ts      # read-only viewer Zustand state
├── i18n.ts              # DE/EN translations, localStorage language, hook helpers
├── index.css            # Tailwind v4 CSS-first theme tokens
├── components/          # gates, layout, scene, ui, viewer
├── hooks/               # shortcuts, theme, gate selection
├── schemas/             # trusted import/export validation
├── store/               # editor-only Zustand slices
├── types/               # domain contracts
└── utils/               # pure/shared logic
```

## WHERE TO LOOK
| Task | File / Directory | Notes |
|------|------------------|-------|
| Editor startup | `main.tsx`, `App.tsx` | StrictMode effects must stay idempotent |
| Viewer startup | `viewer-main.tsx`, `viewer-store.ts`, `components/viewer/` | Decode hash before mount; store has no editor actions |
| Translations | `i18n.ts` | Add matching `de` and `en` keys; `TranslationKey` is inferred from `de` |
| Global CSS/theme tokens | `index.css`, `components/ui/`, `types/theme.ts` | Tailwind v4 CSS-first; no Tailwind config file |
| Editor state | `store/`, `store/AGENTS.md` | Mutations/history/destructive flow live here |
| Import/export boundary | `schemas/`, `schemas/AGENTS.md` | Unknown JSON must pass through schema helpers |
| Core calculations | `utils/`, `utils/AGENTS.md` | Generator, flight path, storage, share links |

## CONVENTIONS
- `main.tsx` imports `App` as the only default export; new top-level modules should use named exports.
- Both bootstraps wrap UI in `StrictMode` and `ErrorBoundary`; do not add mount effects that double-create durable state.
- `viewer-main.tsx` owns hash parsing and translated error setup; keep payload parsing out of `ViewerApp`.
- `viewer-store.ts` stores only `{ track, config, error }` plus set/reset helpers; never add editor mutation actions.
- `i18n.ts` is the translation source of truth; add every key in both language objects and use placeholders as `{name}`.
- `translateOutsideReact()` exists for non-component code such as viewer bootstrap; components should use `useTranslation()`.

## ANTI-PATTERNS
- Do not import `useAppStore` into viewer boot/store/components.
- Do not parse share hashes or imported JSON without `decodeTrackSharePayload()` / `deserializeTrack()`.
- Do not add a second app-level `<Canvas>` outside `components/scene/Scene.tsx`.
- Do not split translations into ad-hoc per-component constants.
- Do not add browser-only globals to top-level module code without a `typeof window` guard if SSR/test import safety matters.

## TESTING
- `viewer-main.test.ts` covers hash payload success/error bootstrap behavior.
- `viewer-store.test.ts` asserts the viewer store stays small and read-only.
- `App.tsx` orchestration is mostly covered indirectly via component/store/utility tests; add focused tests near changed behavior when extracting logic.
- Translation changes currently rely on type coverage; add tests if formatting or storage behavior changes.
