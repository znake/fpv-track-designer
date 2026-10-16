# Coolify Deployment: Track Teilen Viewer

The Track Teilen feature uses two static deployments from the same GitHub repository.

## Editor service

- Domain: `trackdesigner.fpvooe.com`
- Recommended deployment: use `Dockerfile` so nginx can serve `dist/` and proxy `/api/shorten-track` to n8n.
- The editor Docker image builds in a `node:20-alpine` stage: `npm ci` installs dependencies, then `npm run build` runs the production build. That build command is `tsc -b && vite build`, so TypeScript errors fail the image build instead of shipping a broken bundle. The runtime stage is `nginx:alpine`, which serves `dist/` with the repository's `nginx.conf`.
- If using a static publish directory instead, configure an equivalent platform reverse proxy for `/api/shorten-track` or configure n8n CORS for `https://trackdesigner.fpvooe.com`.
- Optional environment variable:
  - `VITE_VIEWER_DOMAIN=https://sharedtrack.fpvooe.com`
  - If unset or empty, share URLs fall back to the built-in default viewer domain `https://sharedtrack.fpvooe.com`. Only set the variable to force a different viewer domain.
- Optional environment variable:
  - `VITE_TRACK_SHORTENER_ENDPOINT=/api/shorten-track`

Both `VITE_*` variables are build-time only. Vite bakes them into the JavaScript bundle per mode (development/production) when the build runs, so changing a value requires a rebuild of the image or publish directory; runtime environment variables have no effect.

This is the full FPV Track Designer editor. The **Track Teilen** button serializes the current track and creates a share URL that points to the viewer domain.
In local development, the editor calls `/api/shorten-track`; Vite proxies that same-origin request to the n8n webhook so localhost is not blocked by browser CORS preflight checks. In the Docker-based production editor, nginx proxies the same `/api/shorten-track` path to n8n so the browser never performs a cross-origin request. If you bypass the nginx proxy and call n8n directly, the webhook must return CORS headers for the deployed editor origin, for example `https://trackdesigner.fpvooe.com`.
The proxy targets n8n's production webhook path `/webhook/shorten-track`. Do not use `/webhook-test/shorten-track` for deployed traffic because n8n test webhooks only work while the workflow is in test execution mode.

### Local Docker deployment

The repository ships an editor-only `docker-compose.yml` for local testing:

```bash
docker compose up --build
```

It builds the same editor image and maps container port `80` to host port `8080`, so the editor is available at `http://localhost:8080`. The compose file sets `restart: unless-stopped`. The editor container also includes the nginx SPA fallback, so direct visits to any route serve the app.

## Viewer service

- Domain: `sharedtrack.fpvooe.com`
- Build command: `npm run build:viewer`
- Publish directory: `dist-viewer/`

The viewer build produces a single self-contained HTML file. The build renames its output to `dist-viewer/index.html`, so the view-only app is served at the domain root without a `/viewer.html` path.

`npm run build:all` builds editor and viewer in one run (`npm run build && npm run build:viewer`) and is a convenient way to produce both publish directories locally.

If Nixpacks selects an unsupported Node patch version, deploy the viewer with `Dockerfile.viewer` instead. The viewer Dockerfile builds with the official `node:24-alpine` image, installs optional native dependencies on Linux, and serves `dist-viewer/` with nginx on port `80`. Unlike the editor container, the viewer container uses nginx's default configuration: it has no custom `nginx.conf` and no SPA fallback. This is fine here because the viewer is a single `index.html` at the domain root.

This service serves the view-only build from `dist-viewer/index.html` at the domain root. It reads the encoded track data from the URL fragment:

```text
https://sharedtrack.fpvooe.com/#z.<lz-string-compressed-track-data>
```

Current share links carry an lz-string compressed payload with the `z.` prefix. Older links with a plain base64url payload (no `z.` prefix) are still decoded as a legacy fallback, so previously shared URLs keep working.

The fragment is decoded in the browser, so track data is not sent to the server as part of the HTTP request.

The viewer itself offers a few controls of its own: an FPV fly-through camera flight (available from 2 gates on, the button is disabled below that), a JSON download of the shared track, and a help dialog describing the camera controls. The help dialog opens automatically on a viewer's first visit and is suppressed afterwards by a `fpv-track-viewer-help-seen` cookie. A link to `https://fpvooe.com` sits in the bottom right corner.

## Repository setup

Both Coolify services can point to the same GitHub repository and branch. Configure each service with its own build command and publish directory:

| Service | Domain | Build command | Publish directory |
| --- | --- | --- | --- |
| Editor | `trackdesigner.fpvooe.com` | `Dockerfile` | nginx on port `80` |
| Viewer | `sharedtrack.fpvooe.com` | `npm run build:viewer` | `dist-viewer/` |

For the Docker-based editor deployment, set Coolify to use `Dockerfile` and expose port `80` so `/api/shorten-track` is proxied by nginx. For the Docker-based viewer deployment, set Coolify to use `Dockerfile.viewer` and expose port `80` instead of configuring Nixpacks build/start commands.

The toolchain (Vite) requires Node.js `^20.19.0 || >=22.12.0`. The Docker build images (`node:20-alpine`, `node:24-alpine`) satisfy this; if you use Nixpacks or another build pack, make sure the selected Node version does.

## Verification

After deployment:

1. Open `https://trackdesigner.fpvooe.com/`.
2. Generate or load a track.
3. Click **Track Teilen**.
4. Copy the generated URL.
5. Open the URL and verify it uses `https://sharedtrack.fpvooe.com/#z....` without a `/viewer.html` path.
6. Confirm the viewer renders the track and offers its own controls: the FPV fly-through button (active from 2 gates on), the JSON download button, and the help dialog (auto-opened on first visit).
7. Confirm the viewer shows no editor controls such as **Speichern**, **Galerie**, **Einstellungen**, gate handles, or delete actions.
