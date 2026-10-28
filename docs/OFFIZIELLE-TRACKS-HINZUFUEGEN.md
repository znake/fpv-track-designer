# Offizielle Tracks hinzufügen: Runbook für Agenten und Maintainer

Diese Anleitung beschreibt den kompletten Weg für eine neue offizielle Strecke: von der JSON-Datei, die jemand schickt, bis zur sichtbaren Strecke in der deployten App. Sie ist für einen Agenten geschrieben, der die Aufgabe allein erledigen soll (z. B. Hermine), und für Menschen, die es einmal von Hand machen wollen.

## Was das Feature ist

Der Ordner `tracks/` im Repository ist die Quelle der offiziellen Strecken. Jede `*.json` darin wird beim Build in die Editor-App gebündelt und erscheint in der linken Werkzeugleiste unter **Offizielle Tracks** (Pokal-Symbol). Ein Klick auf **Laden** setzt die Strecke in den Editor.

- **Die Datei ist die Identität und der Anzeigename.** `Last 16.10.26.json` erscheint in der Liste und im Editor als `Last 16.10.26`. Unterordner sind erlaubt (`tracks/halle/foo.json` → `foo`).
- **Der Name und die ID im JSON sind egal.** Exporte aus dieser App behalten oft den Namen und die `track.id` der Ursprungsstrecke — deshalb können mehrere Dateien denselben Namen und dieselbe ID tragen. Beim Laden wird die ID auf `official:/tracks/<datei>` gesetzt und der Name aus dem Dateinamen abgeleitet.
- **Kaputte Dateien brechen nichts.** Jede Datei läuft durch dieselbe Schema-Validierung wie der JSON-Import (`deserializeTrack` in `src/schemas/track.schema.ts`). Ungültige Dateien erscheinen nicht als Strecke, sondern als Hinweis mit Dateinamen im Dialog.

## Checkliste für einen neuen Track

### 1. Die JSON prüfen

Die Datei muss ein Export aus diesem Editor sein (TopBar → Export) oder aus dem Share-Viewer (JSON-Download). Ein Export enthält `version`, `track` und `config`. Eine andere Geometrie-Datei (z. B. aus einem fremden Tool) funktioniert nicht.

### 2. Datei in `tracks/` legen

```bash
cp /pfad/zum/track.json tracks/Last 16.10.26.json
```

Regeln für den Dateinamen, weil er der Anzeigename ist:

- Der Dateiname ohne `.json` ist der Name in der App — also so benennen, wie die Strecke heißen soll (`Last 16.10.26.json`, nicht `track1.json`).
- Leerzeichen und Punkte sind getestet und funktionieren. Umlaute und Sonderzeichen sind nicht getestet: ASCII bevorzugen.
- Vorhandene Dateien nicht umbenennen, ohne es zu wollen — das ändert den Namen in der App.
- Den Inhalt der JSON nicht bearbeiten (weder `track.name` noch `track.id`); die Datei bestimmt beides.

### 3. Validieren

```bash
npx vitest run src/utils/officialTracks.test.ts
```

Dieser Test liest den echten `tracks/`-Ordner: er schlägt fehl, wenn eine Datei nicht durch die Schema-Validierung kommt (dann steht im Fehlertext die Datei und der Feldpfad), und er prüft, dass jede Datei ladbar ist und eine eindeutige ID bekommt. Alternativ zeigt die App selbst beim Öffnen von **Offizielle Tracks** einen roten Hinweis mit den Dateinamen, die nicht gelesen werden konnten.

### 4. Changelog-Eintrag

`CHANGELOG.md` ist die nutzerseitige Release-Liste und wird vor jedem Commit geprüft (siehe `AGENTS.md`, Abschnitt **CHANGELOG**). Eine neue offizielle Strecke ist für Nutzer sichtbar, deshalb gehört sie unter `## Unveröffentlicht` in die Gruppe **Neu**, kurz und verhaltensbezogen:

```markdown
## Unveröffentlicht

**Neu**

- Offizielle Strecke „Last 16.10.26“ ergänzt.
```

### 5. Bauen und die ganze Suite laufen lassen

```bash
npx tsc -b
npx eslint .
npx vitest run
npm run build
```

Der Editor-Build muss durchlaufen; der Viewer-Build (`npm run build:viewer`) enthält keine offiziellen Strecken und ist von einer neuen Datei nicht betroffen.

### 6. Committen und deployen

Commits in diesem Repo: Englisch, Conventional Commits, thematisch getrennt, ein Commit pro Sache. Für einen neuen Track:

```bash
git add tracks/Last\ 16.10.26.json CHANGELOG.md
git commit -m 'feat(tracks): add official track "Last 16.10.26"'
git push origin main
```

Deploy: Coolify baut beide Dienste aus dem GitHub-Repo `origin` (`https://github.com/znake/fpv-track-designer.git`), Branch `main` — Details in `docs/coolify-track-sharing.md`.

| Dienst | Domain | Build |
| --- | --- | --- |
| Editor | `trackdesigner.fpvooe.com` | `Dockerfile` → `npm run build` → `dist/` |
| Share-Viewer | `sharedtrack.fpvooe.com` | `npm run build:viewer` → `dist-viewer/` |

Ein Push auf `main` stößt den Build an. Die offiziellen Strecken stecken im Editor-Bundle, ein neuer Track braucht also einen neuen Editor-Build — ein Viewer-Rebuild allein genügt nicht. Es gibt keine GitHub-Action und kein CI; gebaut wird ausschließlich bei Coolify.

### 7. Nach dem Deploy prüfen

1. `https://trackdesigner.fpvooe.com/` öffnen.
2. Links in der Werkzeugleiste auf **Offizielle Tracks** klicken.
3. Die neue Strecke muss mit ihrem Dateinamen, der Gate-Anzahl und dem Feldmaß in der Liste stehen.
4. **Laden** klicken: die Strecke erscheint im Editor, die TopBar zeigt den Dateinamen, die Gate-Anzahl stimmt.
5. Erscheint statt der Liste der rote Hinweis mit Dateinamen, ist die Datei im Deploy ungültig — dann Schritt 3 lokal wiederholen und die Validierungsfehler lesen.

## Was ein Agent nicht tun soll

- Keine fremden Dateien im `tracks/`-Ordner umbenennen, verschieben oder löschen, ohne dass es beauftragt wurde.
- Die JSON nicht „reparieren“, indem Felder entfernt werden: entweder die Datei ist ein gültiger Export, oder sie bleibt draußen und der Fehler wird gemeldet.
- Kein neues Schema, keine zweite Validierung und keine Registrierungsliste einführen: `src/utils/officialTracks.ts` liest den Ordner automatisch, eine neue Datei ist die ganze Registrierung.
- Nicht `git push --force` und keine fremden Branches anfassen; deployt wird ausschließlich über `main`.

## Wo was liegt

| Datei | Rolle |
| --- | --- |
| `tracks/**/*.json` | Quelle der offiziellen Strecken, Dateiname = Anzeigename |
| `src/utils/officialTracks.ts` | Bündelt den Ordner beim Build, validiert über `deserializeTrack`, liefert Liste und Ladefunktion |
| `src/components/ui/OfficialTracksDialog.tsx` | Liste im Sheet, Laden über den normalen Ungespeichert-Dialog |
| `src/components/layout/LeftToolPanel.tsx` | Button **Offizielle Tracks** zwischen Galerie und Einstellungen |
| `src/utils/officialTracks.test.ts` | Prüft den echten Ordner und die Fehlerfälle |
| `src/i18n.ts` | Texte des Dialogs (DE und EN) |
