# Viewer — Read-Only Share App

**Domain:** Standalone viewer UI for compressed shared track links. It reuses the 3D scene but never exposes editor mutations.
**Code state:** b738218 (2026-10-28, worktree)

## STRUCTURE
```
components/viewer/
├── ViewerApp.tsx          # Read-only scene shell, drone/FPV/export/help buttons, error state
├── ViewerHelpDialog.tsx   # Viewer controls reference dialog
└── ViewerApp.test.tsx     # RTL coverage for error/read-only/export/help flows
```

Related files outside this folder:
- `src/viewer-main.tsx` decodes `window.location.hash` and mounts the viewer; `src/viewer-store.ts` holds the decoded result.
- `vite.config.viewer.ts` builds `viewer.html` into single-file `dist-viewer/index.html`.
- `src/utils/shareTrack.ts` encodes/decodes compressed `z.` payloads and legacy base64-url payloads.

## WHERE TO LOOK
| Task | File |
|------|------|
| Change viewer boot/load behavior | `src/viewer-main.tsx`, `src/utils/shareTrack.ts` |
| Change read-only viewer UI | `ViewerApp.tsx` |
| Change first-run controls help | `ViewerHelpDialog.tsx`, `ViewerApp.tsx` cookie helpers |
| Change viewer state | `src/viewer-store.ts`, `src/viewer-store.test.ts` |
| Change viewer build/deploy artifact | `vite.config.viewer.ts`, `viewer.html` |

## CONVENTIONS
- Viewer passes `readOnly` to `Scene`; do not render editor handles, labels that mutate state, or store mutation controls.
- Viewer state is intentionally separate from `src/store`; it only accepts decoded track/config, error, and reset.
- Error/help/export strings go through `useTranslation()` with DE and EN values in `src/i18n.ts`, matching the editor UI; the "FPV Track Viewer" eyebrow is hardcoded.
- `noTrackLoaded` renders only when neither error nor track/config is set: `viewer-main.tsx` always sets an error for an empty (`viewerMissingPayload`) or undecodable (`viewerInvalidPayload`) hash, and that error branch renders an eyebrow, the title, and the error text — no reload control.
- Help opens once per browser on the first valid load; the cookie helpers live in `ViewerApp.tsx`.
- Export uses `serializeTrack(track, config)` so downloaded JSON remains importable by the editor.
- The viewer's edit button is an anchor to `<editor origin>/#track=<compressed payload>`, built with `createTrackEditorUrl()` / `getEditorDomain()` in `src/utils/shareTrack.ts`; the origin comes from `VITE_EDITOR_DOMAIN` and falls back to `DEFAULT_EDITOR_DOMAIN`. It hands off, it does not mutate.

## NOTES
- `viewer-main.tsx` forces `showGrid: false` on the decoded config: the payload carries the sender's editor toggles and most exports have the grid on. Everything downstream (scene, JSON download) sees the grid off.
- A second click on the FPV button, Escape, or the scene's `onFpvComplete` stops the flight.
- The drones fly in the viewer by default; a drone button at the top right of the control row toggles them via local state passed as `Scene`'s `showDrones` prop (it never touches the editor store). The viewer help lists the button.
- The download file name comes from the track name: whitespace becomes `-`, the result is lowercased, and `.json` is appended.
- A `fpvooe.com` pill sits bottom-right and opens https://fpvooe.com in a new tab with `rel="noreferrer"`.
- `#track=` handshake: the viewer links to the editor with the same `z.` payload share links use, but behind `#track=` instead of a bare hash. The editor side lives in `src/utils/editorHandoff.ts`: `readEditorHandoff()` returns `{ track, config }` or `{ error }` for a `#track=` hash, and `clearEditorHandoffHash()` drops the hash with `history.replaceState` after the load so a reload does not re-import. Nothing is posted to a server.

## ANTI-PATTERNS
- Do not import `useAppStore` into viewer components.
- Do not add save/load/gallery actions or any viewer-side mutation to the viewer. The one allowed editor-facing control is the handoff link (anchor with `#track=`), because it only navigates and leaves the mutation to the editor.
- Do not parse hash payloads in `ViewerApp`; keep decoding in `viewer-main.tsx` / `shareTrack.ts`.
- Do not bypass `deserializeTrack()` when accepting shared payload data.

## TESTING
- `ViewerApp.test.tsx` mocks `Scene` and asserts `readOnly=true`, the error state, export, help, drones visibility toggle, and FPV start/stop/completion flows; the `noTrackLoaded` state has no test.
- `src/viewer-main.test.ts` covers missing, invalid, and valid hash bootstrapping into the viewer store.
- `viewer-store.test.ts` asserts no editor mutation actions are exposed.
- `shareTrack.test.ts` covers compressed round-trip, legacy payloads, and invalid payloads.
