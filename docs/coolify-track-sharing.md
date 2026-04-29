# Coolify Deployment: Track Teilen Viewer

The Track Teilen feature uses two static deployments from the same GitHub repository.

## Editor service

- Domain: `trackdesigner.fpvooe.com`
- Build command: `npm run build`
- Publish directory: `dist/`
- Required environment variable:
  - `VITE_VIEWER_DOMAIN=https://sharedtrack.fpvooe.com`

This is the full FPV Track Designer editor. The **Track Teilen** button serializes the current track and creates a share URL that points to the viewer domain.

## Viewer service

- Domain: `sharedtrack.fpvooe.com`
- Build command: `npm run build:viewer`
- Publish directory: `dist-viewer/`

If Nixpacks selects an unsupported Node patch version, deploy the viewer with `Dockerfile.viewer` instead. The viewer Dockerfile builds with the official `node:24-alpine` image, installs optional native dependencies on Linux, and serves `dist-viewer/` with nginx on port `80`.

This service serves the view-only build from `dist-viewer/index.html` at the domain root. It reads the encoded track data from the URL fragment:

```text
https://sharedtrack.fpvooe.com/#<base64url-track-data>
```

The fragment is decoded in the browser, so track data is not sent to the server as part of the HTTP request.

## Repository setup

Both Coolify services can point to the same GitHub repository and branch. Configure each service with its own build command and publish directory:

| Service | Domain | Build command | Publish directory |
| --- | --- | --- | --- |
| Editor | `trackdesigner.fpvooe.com` | `npm run build` | `dist/` |
| Viewer | `sharedtrack.fpvooe.com` | `npm run build:viewer` | `dist-viewer/` |

For the Docker-based viewer deployment, set Coolify to use `Dockerfile.viewer` and expose port `80` instead of configuring Nixpacks build/start commands.

## Verification

After deployment:

1. Open `https://trackdesigner.fpvooe.com/`.
2. Generate or load a track.
3. Click **Track Teilen**.
4. Copy the generated URL.
5. Open the URL and verify it uses `https://sharedtrack.fpvooe.com/#...` without a `/viewer.html` path.
6. Confirm the viewer renders the track without editor controls such as **Speichern**, **Galerie**, **Einstellungen**, gate handles, or delete actions.
