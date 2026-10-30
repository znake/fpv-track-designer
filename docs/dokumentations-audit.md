# Dokumentations-Audit

**Stand:** Code-Stand `be022fb` (2026-10-30, Arbeitsstand); Nachtrag 4 „Drohnen im Share-Viewer“ gegen den unversionierten Arbeitsstand (`src/components/scene/Scene.tsx` mit `showDrones`-Prop, `src/components/viewer/ViewerApp.tsx`, `ViewerHelpDialog.tsx`, `src/i18n.ts`, README, Nutzerdoku, Changelog, `AGENTS.md`-Dateien von `scene/` und `viewer/`); davor: Code-Stand `4cfe819` (2026-10-28); Doku-Pass vom 2026-10-28; Nachtrag 2 „Chronologische Track-Liste“ gegen `4cfe819` und den noch unversionierten Arbeitsstand (`src/utils/officialTracks.ts`, `src/utils/officialTracks.test.ts`, README, Nutzerdoku 10.3, Runbook); Nachtrag 3 „Drag-Modifier getauscht“ gegen `c2a162c` und den noch unversionierten Arbeitsstand (`src/hooks/useGateMoveDrag.ts`, `src/components/gates/Gate.tsx`, `src/hooks/useFlightPathPointDrag.ts`, `src/components/scene/FlightPathPointControls.tsx`, `src/i18n.ts`, README, Nutzerdoku, `AGENTS.md`-Dateien)
**Geprüfte Flächen:** `README.md`, `CHANGELOG.md`, `docs/NUTZERDOKUMENTATION.md`, `docs/coolify-track-sharing.md`, dieses Dokument, `AGENTS.md` samt verschachtelten `AGENTS.md`, In-App-Hilfe in `src/i18n.ts` (`KeyboardShortcutsDialog`, `ViewerHelpDialog`, Tooltips)
**Methode:** Jede prüfbare Aussage wurde einzeln gegen den Code gehalten (Datei lesen, `grep`); eine Behauptung galt als falsch, bis ein Kommando sie bestätigte. Danach `npx vitest run` (386 Tests grün), `npm run lint`, `npm run build`. Kein Browser-QA – laut Projektkonvention prüft der Nutzer die Oberfläche selbst.

---

## 1. Befunde dieser Runde

| # | Fläche | Befund | Beleg im Code | Korrektur |
| --- | --- | --- | --- | --- |
| 1 | README | „Beim Mischen wird daraus automatisch eine neue Strecke erzeugt“ widersprach dem Folgeabsatz und dem Code: Konfig-Änderungen regenerieren erst über den Button | `ApplyConfigFooter.tsx` rendert nur bei `hasConfigDrift(config, generationConfig)`; `setGateQuantity`/`setFieldSize` erzeugen nichts neu | Satz ersetzt: Werte gelten für die nächste Generierung |
| 2 | README, Nutzerdoku, In-App-Hilfe | Feldvorlagen („Last OG3“, gesperrte Größenfelder, Säulen) fehlten im README völlig | `venuePresets.ts`, `GateConfigPanel.tsx` | README-Features + Konfigurationsabschnitt ergänzt, In-App-`settingsHelp` nennt die Feldvorlage |
| 3 | README, Nutzerdoku | Stangen-Obergrenze (Feld „Max. Stangen“, roter Badge, einmaliger Hinweisdialog) war in beiden Nutzerflächen nicht beschrieben | `utils/poleLimit.ts` (Default 60), `PoleCounter.tsx` (`overLimit`, Alert-Dialog) | eigener Absatz in beiden Dokumenten |
| 4 | README, Nutzerdoku | „Alle Bearbeitungsschritte lassen sich rückgängig machen“ war zu weit: Drehen landet nicht im Verlauf und setzt den Dirty-Flag nicht | `setGateRotation` in `trackSlice.ts` schreibt die Drehung normalisiert, ohne `pushHistory` und ohne `isTrackModified`; `GateHandles` und `useGateMoveDrag` nutzen genau diesen Setter | Ausnahme in beiden Dokumenten dokumentiert (inkl. Folge für die Speichern-Nachfrage) |
| 5 | README, TopBar-Absatz | TopBar-Reihenfolge war verdreht (Import/Export vor `#fpvooe`/Streckenname) | `TopBar.tsx`: rechts `#fpvooe`-Link → Streckenname → Import → Export → Sprache → Hilfe | Reihenfolge korrigiert |
| 6 | README, Nutzerdoku | Snap-Genauigkeit stand wie ein Dauer-Schalter in der Leiste; sie rendert nur bei aktivem Grid-Snap | `TopBar.tsx`: `{config.snapGatesToGrid && (...)}` | „erscheint nur, solange Grid-Snap aktiv ist“ in beiden Dokumenten |
| 7 | README | Label „Raster“ statt UI-Text „Grid anzeigen“ | `i18n.ts` `showGrid: 'Grid anzeigen'` | README angeglichen |
| 8 | README, Nutzerdoku | `Strg`/`Control`-Drehen fehlte in beiden Shortcut-Tabellen, obwohl die In-App-Hilfe die Zeile hat | `useGateMoveDrag.ts` (`rotate`-Option, `DEGREES_PER_PIXEL = 1`, 15°-Snap nur bei `snapGatesToGrid`) | Zeilen ergänzt (samt direktem Ziehen für Gate und Leitpunkt) |
| 9 | Nutzerdoku | Shortcut-Tabelle kannte die Leitpunkt-Höhe nicht, das README schon | `useFlightPathPointDrag.ts`, `elevateFlightPathPointKey` | Zeile ergänzt |
| 10 | README | „bebilderte Bearbeitungsschritte“ ohne Zahl; der Dialog zeigt genau fünf Schritte mit Icons | `KeyboardShortcutsDialog.tsx` `helpSteps` | Formulierung präzisiert |
| 11 | README | Projektstruktur war veraltet: `hooks/` ohne Drag-Hooks, `scene/` ohne Leitpunkt-Editor, `utils/` ohne Ideallinie/Feldvorlagen | `src/hooks/useGateMoveDrag.ts`, `useFlightPathPointDrag.ts`, `scene/FlightPathEditor.tsx`, `utils/idealLine.ts`, `utils/venuePresets.ts` | Strukturbaum aktualisiert |
| 12 | In-App-Hilfe (DE + EN) | `settingsHelp` nannte „Raster“ und keine Feldvorlage | `i18n.ts` | beide Sprachen korrigiert |
| 13 | dieses Dokument | Stand war `db57870` (2026-10-16) und verwies auf gelöschte `/tmp`-Artefakte | — | neu geschrieben, auf `78693b5` gestempelt |
| 14 | README, Nutzerdoku, Changelog, AGENTS.md | „Offizielle Strecken“ (Ordner `tracks/`, Dialog, Button in der Werkzeugleiste) war in keiner Doku-Fläche beschrieben | `utils/officialTracks.ts` (`import.meta.glob('?raw')`, `deserializeTrack()`), `components/ui/OfficialTracksDialog.tsx`, `LeftToolPanel.tsx` (Button zwischen Galerie und Einstellungen), `i18n.ts` | README-Feature und -Absatz samt Maintainer-Hinweis, Nutzerdoku-Abschnitt 10.3, Changelog-Eintrag unter „Unveröffentlicht“, WHERE-TO-LOOK-Zeile und NOTES-Stichpunkt in `AGENTS.md`, Runbook `docs/OFFIZIELLE-TRACKS-HINZUFUEGEN.md` |
| 15 | README, Nutzerdoku 10.3, Runbook, Changelog, `AGENTS.md` | Die Sortierung der offiziellen Track-Liste war nirgends beschrieben, obwohl sie über die Bedienbarkeit entscheidet | `utils/officialTracks.ts` `dateTimeOf()`/Sortierung: Datum aus dem Namen (`Last 21.08.26`, `2026.08.21`), neueste zuerst, undatierte Namen alphabetisch am Ende; Test in `officialTracks.test.ts` | Sortierregel in allen vier Flächen ergänzt, Changelog-Eintrag unter **Geändert**, Strukturzeile in `src/utils/AGENTS.md` |
| 16 | In-App-Hilfe (DE + EN), README, Nutzerdokumentation, Changelog, `AGENTS.md` samt verschachtelten Dateien | Die Drag-Modifier waren gedreht: alle Flächen beschrieben `Shift` = Höhe und `Strg` = Drehen. Neu gilt `Shift` = Drehen und `Strg`/`Control` = Höhe, für Gates und Leitpunkte gleich | `Gate.tsx` → `getGatePressDragOptions()` (`rotate: shiftKey`, `vertical: ctrlKey`), `FlightPathPointControls.tsx` (`vertical: event.ctrlKey`); Test in `useGateMoveDrag.test.tsx` (`getGatePressDragOptions`), `FlightPathPointControls.test.tsx` (Ctrl-Höhe) | Texte in `src/i18n.ts` (`elevateGateKey`, `rotateGateDirectKey`, `elevateFlightPathPointKey`), README (Gate-Schritte, Leitpunkt-Schritt, Shortcut-Tabelle), Nutzerdoku (6. Gate-Schritte, 6.3, 7.1, Tastenkürzel-Tabelle), Changelog unter **Unveröffentlicht/Geändert** und fünf `AGENTS.md`-Dateien angepasst |
| 17 | Changelog, README, Nutzerdokumentation, In-App-Hilfe, `AGENTS.md` (`scene/`, `viewer/`) | Die Drohnen waren als „im Share-Viewer ausgeblendet“ beschrieben; seit diesem Stand fliegen sie dort standardmäßig mit und lassen sich über einen Drohnen-Button oben rechts ausblenden | `Scene.tsx` (`showDrones`-Prop überschreibt den Store-Wert, `showDroneRace` nicht mehr an `!readOnly` gebunden), `ViewerApp.tsx` (lokaler State `dronesVisible`, `aria-label` aus `dronesHide`/`dronesShow`), `ViewerHelpDialog.tsx` (Zeile `drones`), `ViewerApp.test.tsx` (Toggle-Test) | Changelog-Eintrag korrigiert und um Viewer-Drohnen ergänzt, README-Feature und Viewer-Absatz, Nutzerdoku 12.1, neue Keys `dronesHide`, `dronesShow`, `viewerDronesKey` (DE + EN), `AGENTS.md` von `scene/` und `viewer/` |

**Prüfstand Nachtrag 4 (2026-10-30, Arbeitsstand auf `be022fb`):** `npx vitest run` → 431 von 431 Tests grün (inkl. neuem Viewer-Drohnen-Test), `npm run lint` fehlerfrei, `npm run build` und `npm run build:viewer` erfolgreich. Kein Browser-QA – laut Projektkonvention prüft der Nutzer die Oberfläche selbst.

**Prüfstand Nachtrag 3 (2026-10-30, Arbeitsstand auf `c2a162c`):** `npx vitest run` → 399 von 400 Tests grün. Der eine Fehler (`OfficialTracksDialog.test.tsx` sucht `[data-slot="card"]`) stammt aus `c2a162c`, das die Karten durch schlichte Zeilen ersetzt und den Test nicht mitgezogen hat; er hat mit der Gesten-Änderung nichts zu tun. `npm run lint` und `npm run build` laufen fehlerfrei durch.

### 1.1 Nachprüfung der neu geschriebenen Texte

Eine unabhängige, read-only Gegenprüfung der überarbeiteten Flächen fand vier Fehler in genau diesen neuen Sätzen; alle vier wurden gegen den Code bestätigt und korrigiert:

1. Der Changelog-Eintrag unter „Unveröffentlicht“ schrieb dem Hilfe-Dialog Snap-Genauigkeit und Stangen-Obergrenze zu. Beides steht nur in README/Nutzerdokumentation bzw. im Stangen-Popover; die Hilfe hat nur die korrigierte Einstellungszeile (`settingsHelp`) erhalten. Eintrag aufgeteilt.
2. README und Nutzerdokumentation versprachen den Anwenden-Hinweis bei jeder Konfigurationsänderung. Nach Galerie-Laden oder JSON-Import ist `generationConfig` `null` (`replaceTrack` in `trackSlice.ts`), `hasConfigDrift()` liefert `false` (`generationConfig.ts`) und `ApplyConfigFooter` rendert nichts. Beide Stellen sind jetzt auf Strecken aus einer Generierung eingegrenzt.
3. Das README versprach eine QR-Vorschau ohne Bedingung. Der QR-Block rendert nur bei `!isShortening && hasShortLink` (`ShareTrackDialog.tsx`); bei fehlgeschlagenem Kurzlink gibt es keinen QR-Code. Satz ergänzt.
4. Die AGENTS-Konvention nannte vier Gruppen, der Changelog nutzt fünf. Gruppe **Dokumentation** ist jetzt überall geführt.

## 2. Produktbefunde (die Doku beschreibt jetzt das Ist-Verhalten, der Code wurde nicht angefasst)

1. **Drehen ohne Verlauf und ohne Dirty-Flag:** `setGateRotation` schreibt die Drehung, legt aber keinen Undo-Schritt an und lässt `isTrackModified` auf `false`. Eine nur gedrehte Strecke gilt als unverändert; beim Verlassen, Laden oder Import fragt die App nicht nach. Jetzt in README und Nutzerdokumentation als Ausnahme benannt.
2. **Import-Fehler nur in der Konsole:** `TopBar.tsx` schreibt bei ungültigem JSON `console.error` und zeigt keine Meldung im UI. Die Dokumentation beschreibt genau das.
3. **Unerreichbarer Viewer-Zustand:** `ViewerApp` rendert „Kein Track geladen.“ (`noTrackLoaded`), aber `viewer-main.tsx` setzt für leeren und für undecodierbaren Hash immer einen Fehler. Nur intern relevant, in `src/components/viewer/AGENTS.md` dokumentiert.
4. **Toter Code:** `utils/gateOperations.ts` (nur vom eigenen Test importiert), die Store-Aktionen `moveGate`/`rotateGate`, `components/ui/directional-pad.tsx` und `storage.autoSave` haben keinen Produktionsaufrufer.
5. **Theme-Flag ohne Verbraucher:** `theme.realistic.useClouds` ist `true`, wird aber nirgends gelesen.
6. **Kein Anwenden-Hinweis nach Laden/Import:** `replaceTrack` setzt `generationConfig` auf `null`, `hasConfigDrift()` meldet dann `false`. Wer eine Strecke lädt oder importiert und danach Gate-Anzahlen oder Feldmaße ändert, bekommt keinen „Neue Kurskonfiguration anwenden“-Button; die Werte greifen erst beim nächsten Shuffle. Jetzt in README und Nutzerdokumentation so beschrieben.

## 3. Geprüft und unverändert korrekt (Auswahl)

- 11 Gate-Typen, `POLES_PER_GATE` (Standard 3, Start/Ziel 3, h 4, Doppel-h 7, Hurdle 0, Dive 0, Doppel 6, Leiter 9, Flagge 2, Flagge klein 1, Tunnel 0) und die Werksanzahlen (Standard 3, Start/Ziel 1, h 2, Dive 1, Doppel 1, Flagge 1, Flagge klein 1, Tunnel 1, Rest 0).
- Feldvorlage „Last OG3“: 10,5 × 22,7 m, vier Säulen 0,3 × 0,5 × 3 m auf der Mittellinie, erste 4,3 m von der Stirnwand, danach 5,1 m Abstand; Säulen sind raycast-inert.
- Snap: 0,3 / 0,5 / 1,0 m wirkt auf X, Z und Höhe (`snapGatePosition`), Einschalten und Größenwechsel rasten alle Gates neu ein.
- FPV-Flug: 4 m/s, erst ab zwei Gates, `Escape` beendet, keine Fortschrittsanzeige.
- Teilen: Langlink mit `z.`-lz-string-Payload, Legacy-base64-Fallback, Shortener über `/api/shorten-track` (Vite-Proxy und `nginx.conf` → n8n `/webhook/shorten-track`), QR als PNG/SVG, Kopieren bevorzugt den Kurzlink.
- Viewer: read-only, JSON-Download, Drohnen-Rennen standardmäßig an (Drohnen-Button oben rechts), Ideallinie ohne Leitpunkt-Marker, Hilfe-Cookie `fpv-track-viewer-help-seen`, `fpvooe.com`-Link unten rechts.
- Deployment-Doku: Editor `node:20-alpine` + `nginx.conf` mit SPA-Fallback, Viewer `node:24-alpine` ohne Custom-nginx, Compose `8080:80`, `npm run build:all`, Node-Range `^20.19.0 || >=22.12.0`.

## 4. Bewusst außerhalb dieses Audits

- Renderer-Interna ohne Nutzerhandlung (Tonemapping, Kamera-Startwerte, Zoom-Interpolation, Grasfläche, Himmelskuppel).
- Visuelle Prüfung im Browser; das übernimmt der Nutzer.
- End-to-End-Test des Shorteners gegen n8n; die Dokumentation beschreibt Proxy-Pfad und Fallback, nicht die Verfügbarkeit des Dienstes.

## 5. Pflege

Dieses Dokument ist eine Momentaufnahme zum genannten Stand. Bei jedem Feature- oder Gesten-Wechsel werden die betroffenen Flächen (In-App-Hilfe, README, Nutzerdokumentation, Changelog) erneut gegen den Code geprüft und dieses Audit neu gestempelt. Die Changelog-Pflicht vor jedem Commit steht in `AGENTS.md`, Abschnitt **CHANGELOG**.
