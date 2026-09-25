# Dokumentations-Audit

**Stand:** gegen `main` (HEAD `3c85ea4`)
**Geprüft:** `README.md`, alle `AGENTS.md`, `docs/coolify-track-sharing.md`
**Zweck:** Abgleich der Dokumentation mit dem tatsächlichen Funktionsumfang des Codes.

Legende: ❌ falsch/veraltet · ⚠️ unvollständig/irreführend · ✅ korrekt

---

## 1. Zusammenfassung

| Dokument | Zustand | Kernproblem |
| --- | --- | --- |
| `README.md` | ❌ deutlich veraltet | Beschreibt einen Funktionsstand rund um Commit `283b0ec`. Es fehlen mehrere komplette Feature-Bereiche, und es werden Features genannt, die es so nicht (mehr) gibt. |
| `AGENTS.md` (Root) | ⚠️ veraltet | Selbst als „Generated 2026-04-30, Commit 283b0ec" markiert; seitdem u. a. Hurdle, Flagge klein, Snap-Grid, QR-Teilen, Lokalisierung dazu. |
| `src/components/gates/AGENTS.md` | ⚠️ veraltet + sachlich falsch | Strukturliste unvollständig (HurdleGate, FlagSmall fehlen); Falschaussage zu „legacy asymmetric replacement". |
| `src/components/ui/AGENTS.md` | ⚠️ teils falsch | Ordnet Theme-Einstellungen dem `GateConfigPanel` zu und nennt „Gate size", die es nicht gibt. |
| `src/components/scene/AGENTS.md` | ⚠️ unvollständig | `FpvFlyThrough.tsx` fehlt in der Struktur. |
| `src/components/layout/AGENTS.md` | ⚠️ teils falsch | Beschreibt Share-Dialog als „long URL ersetzt durch short URL" – tatsächlich werden beide gleichzeitig gezeigt. |
| `src/utils/AGENTS.md` | ⚠️ leicht veraltet | Hurdle-Gate wird in den Flight-Path-Constraints nicht erwähnt. |
| `src/store/AGENTS.md` | ✅ korrekt | Deckt sich mit `trackSlice`/`configSlice`. |
| `src/schemas/AGENTS.md` | ✅ korrekt | Deckt sich mit `track.schema.ts`. |
| `src/AGENTS.md` | ✅ weitgehend korrekt | Beschreibt den aktuellen Aufbau zutreffend. |
| `docs/coolify-track-sharing.md` | ✅ korrekt | Deckt sich mit `shareTrack.ts`, `nginx.conf`, `vite.config.ts`, Dockerfiles. |

**Fazit:** Die technische Projekt-/Agent-Doku ist überwiegend brauchbar, das `README.md` ist es als Nutzer-Einstieg nicht. Es fehlt eine eigentliche Nutzerdokumentation – diese liegt jetzt in [`NUTZERDOKUMENTATION.md`](./NUTZERDOKUMENTATION.md).

---

## 2. `README.md` – Befunde im Detail

### ❌ Falsche / veraltete Aussagen

1. **„8 Gate-Typen: Standard, Start/Ziel, H-Gate, Double-H, Dive, Double, Ladder und Flag"**
   Tatsächlich existieren **11 Gate-Typen** (`src/types/gate.ts`, Dispatcher `Gate.tsx`):
   `standard`, `start-finish`, `h-gate`, `double-h`, `hurdle`, `dive`, `double`, `ladder`, `flag`, `flag-small`, `octagonal-tunnel`.
   Fehlend im README: **Hurdle**, **Flaggen-Gate klein**, **Tunnel**.

2. **„Zufällige Track-Generierung anhand von Feldgröße, Gate-Anzahl und Gate-Größe"**
   Eine konfigurierbare **Gate-Größe gibt es nicht** (mehr). `Config` (`src/types/config.ts`) enthält kein `gateSize`; die Schema-Schicht verwirft das Legacy-Feld bewusst. Generiert wird anhand von **Gate-Anzahl je Gate-Typ** und **Feldgröße**.

3. **Bedienung → Gates bearbeiten** nennt nur „verschieben, drehen, einfügen, löschen".
   Es fehlen: **Höhe verstellen (Elevate)**, **Einflug-/Ausflugseite wechseln**, **Durchflugreihenfolge ändern**, **Grid-Snap / Snap-Genauigkeit**.

4. **Shortcuts-Tabelle** ist unvollständig bzw. veraltet:
   - Fehlt: `Enter` = Löschen bestätigen (im Bestätigungsdialog).
   - `Escape` stoppt zusätzlich einen laufenden **FPV-Flug** – nicht erwähnt.
   - Die App startet beim ersten Besuch automatisch den Hilfe-Dialog (`KeyboardShortcutsDialog`) – nicht erwähnt.

5. **„Daten und Speicherung: Die App benötigt kein Backend."**
   Nur teilweise korrekt: Tracks liegen lokal in `localStorage`, **aber** das Teilen nutzt optional einen n8n-Shortlink-Proxy (`/api/shorten-track` → n8n). Siehe `docs/coolify-track-sharing.md`.

6. **„Nützliche Skripte"** fehlen `build:viewer` und `build:all` (siehe `package.json`).

### ⚠️ Komplett fehlende Feature-Bereiche

- **Track Teilen** inkl. Share-Dialog (langer + kurzer Link), **QR-Code (PNG/SVG)** und **Read-only-Viewer** (`sharedtrack.fpvooe.com`).
- **FPV-Flug / Durchfliegen** (TopBar-Button, Ideallinie, Auto-Stopp, min. 2 Gates).
- **Design/Themes**: Minimal Standard, Realistisch, Nacht.
- **Import/Export als JSON** (nur in der Tech-Liste angedeutet, nicht als Feature).
- **Stangenzähler** (`PoleCounter`) inkl. „nicht aus Stangen baubar".
- **Sprachumschaltung DE/EN** (`i18n.ts`).
- **Galerie-Funktionen**: Duplizieren, Umbenennen beim Duplizieren.
- **Unsaved-Changes-/Bestätigungs-Flow** für destruktive Aktionen (Shuffle, Import, Laden, Duplizieren, Konfiguration anwenden).
- **Snap-Genauigkeit** (0,3 m / 0,5 m / 1,0 m).

### ✅ Korrekt im README

- Tech-Stack, Installation, `npm`-Skripte (bis auf die zwei fehlenden), Maussteuerung (Drehen/Pan/Zoom/Kamerahöhe), Projektstruktur, Lizenz.

---

## 3. `AGENTS.md`-Dateien – Befunde

### Root `AGENTS.md`
- ⚠️ Selbstauskunft „Generated 2026-04-30 / Commit `283b0ec`" – HEAD ist `3c85ea4`.
- ⚠️ „UNIQUE STYLES → Gate rotation: 0-330 in 30 degree steps" ist irreführend: Die **UI rastet in 15°-Schritten** (`GateHandles.tsx`, `ROTATION_SNAP_STEP_DEGREES = 15`); 30° ist nur die interne Generator-Rundung.
- ⚠️ Feature-Neuzugänge nach `283b0ec` fehlen (Hurdle, Flagge klein, Snap-Grid-Größe, QR-Teilen, Lokalisierung von Viewer/Galerie/Shortcuts, Theme-Anpassungen).
- ⚠️ `docs/` wird in der Struktur nicht erwähnt.

### `src/components/gates/AGENTS.md`
- ❌ Strukturliste unvollständig: **`HurdleGate.tsx`** und **`FlagSmall.tsx`** fehlen.
- ❌ Falschaussage: `OctagonalTunnelGate.tsx` sei „legacy asymmetric replacement". Die Schema-Legacy-Map bildet `asymmetric` → **`double-h`** ab, nicht auf den Tunnel.
- ⚠️ „Barrel export (incomplete — missing LadderGate)": Aktuell fehlen im Barrel **`LadderGate` UND `FlagSmall`** (`src/components/gates/index.ts`). Funktional unkritisch, da `Gate.tsx`/`Scene.tsx` direkt importieren.

### `src/components/ui/AGENTS.md`
- ❌ „`GateConfigPanel.tsx` — Gate quantities, field size, theme settings": Theme-Einstellungen liegen im **`ThemeConfigPanel.tsx`**; `GateConfigPanel` hat keine Theme-Controls.
- ⚠️ „34 UI files" – Anzahl nicht verifiziert und nicht kritisch.

### `src/components/scene/AGENTS.md`
- ⚠️ `FpvFlyThrough.tsx` fehlt in der Struktur und in „WHERE TO LOOK" (der FPV-Flug wird in `Scene.tsx` verdrahtet).

### `src/components/layout/AGENTS.md`
- ❌ „shows the long share URL immediately, then replaces it with the shortened URL": Der Dialog zeigt **beide** Felder gleichzeitig („Langer Link" und „Teilbarer Link"); kopiert wird der Kurzlink, falls vorhanden, sonst der lange Link.

### `src/utils/AGENTS.md`
- ⚠️ In „KEY CONSTRAINTS" der Flight-Path-Sonderfälle fehlt **Hurdle** (inzwischen im Code vorhanden).

### `src/store/AGENTS.md`, `src/schemas/AGENTS.md`, `src/AGENTS.md`
- ✅ Inhaltlich deckungsgleich mit dem Code (Stand geprüft).

---

## 4. `docs/coolify-track-sharing.md`

- ✅ Deckt sich mit `src/utils/shareTrack.ts` (Payload `z.` + lz-string, Legacy-base64url), `nginx.conf`, `vite.config.ts` (Dev-Proxy), `Dockerfile`/`Dockerfile.viewer`.
- ✅ Env-Variablen (`VITE_VIEWER_DOMAIN`, `VITE_TRACK_SHORTENER_ENDPOINT`) korrekt.

---

## 5. Inkonsistenz im Produkt selbst (Hinweis)

Kein Doku-Fehler, aber relevant: Der Hilfe-Text `settingsHelp` in `src/i18n.ts` verweist noch auf „**Anzahl/Größe der Gates**", obwohl es keine Gate-Größen-Einstellung mehr gibt. Empfehlung: Text anpassen (z. B. „Anzahl der Gates je Typ und Feldgröße").

---

## 6. Empfohlene Korrekturen (Priorität)

1. **`README.md`**
   - Gate-Liste auf 11 Typen erweitern (Hurdle, Flagge klein, Tunnel) und „Gate-Größe" entfernen.
   - Neue Feature-Abschnitte/Stichpunkte: Teilen + Viewer (+QR), FPV-Flug, Themes, Import/Export, Stangenzähler, Sprache DE/EN, Snap-Genauigkeit.
   - Shortcuts um `Enter` und „Escape stoppt FPV" ergänzen.
   - Bei „kein Backend" auf den optionalen n8n-Shortener hinweisen und auf `docs/NUTZERDOKUMENTATION.md` bzw. `docs/coolify-track-sharing.md` verlinken.
   - `build:viewer` / `build:all` ergänzen.
2. **`src/components/gates/AGENTS.md`**: Struktur + Legacy-Aussage korrigieren, Barrel-Notiz aktualisieren.
3. **`src/components/ui/AGENTS.md`**: Theme-Zuordnung korrigieren.
4. **`src/components/scene/AGENTS.md`**: `FpvFlyThrough.tsx` ergänzen.
5. **`src/components/layout/AGENTS.md`**: Share-Dialog-Beschreibung korrigieren.
6. **Root `AGENTS.md`**: Generierungs-Commit aktualisieren, 15°-Snap präzisieren, neue Features ergänzen.
