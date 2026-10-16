# Dokumentations-Audit

**Stand:** `main`, Code-Stand `db57870` (Dokumentations-Commits: `89202e9`, `39e81c4` und dieser Commit)
**Geprüft:** `README.md`, `docs/NUTZERDOKUMENTATION.md`, `docs/coolify-track-sharing.md`, `docs/dokumentations-audit.md`, `AGENTS.md`, `src/AGENTS.md` und alle 10 verschachtelten `AGENTS.md` unter `src/`
**Methode:** Feature-Inventar aus dem Code (153 user-sichtbare Fähigkeiten mit file:line-Evidenz), anschließend Lückenanalyse je Dokumentationsfläche, Überarbeitung, danach mehrere unabhängige, adversariale Verifikationsläufe, in denen jede prüfbare Behauptung einzeln mit einem Kommando gegen den Code geprüft wurde.
**Ergebnis:** 0 geprüfte Behauptungen mit Status MISMATCH; Coverage-Matrix: 131 von 153 Inventar-Zeilen mit Anker in README *und* Nutzerdokumentation, 0 Lücken.

---

## 1. Vorgehen

| Schritt | Ergebnis |
| --- | --- |
| Feature-Inventar (6 Lanes: Gates, Szene, Daten, UI, Viewer, Build) | 153 Fähigkeiten mit Beleg je Zeile |
| Lückenanalyse (7 Läufe je Doku-Fläche) | 41 falsche/veraltete Aussagen, 68 fehlende Inhalte |
| Überarbeitung (7 Lanes, disjunkte Dateien) | 15 Dokumentationsdateien + `src/i18n.ts` |
| Adversariale Verifikation (mehrere Runden) | letzte Runde: README 30/30, Nutzerdoku 40/40, AGENTS 150/150, coolify 40/40, In-App-Hilfe 40/40, Struktur 50/50 — 0 MISMATCH |
| Coverage-Matrix | 131 abgedeckt, 0 Lücken, 5 Renderer-Interna ausgenommen, 1 Produktlücke markiert |

Die Verifikationsläufe haben die Überarbeitung mehrfach korrigiert; die Korrekturen sind in den Abschnitten 3 und 4 aufgeführt.

## 2. Zustand vor dieser Runde

Das README beschrieb einen Stand um Commit `283b0ec`: 8 statt 11 Gate-Typen, eine „Gate-Größe", die es nicht gibt, 5 von 7 npm-Scripts, keine Abschnitte für Teilen/Viewer/QR, FPV-Flug, Themes, Import/Export, Stangenzähler und Sprache. Die Nutzerdokumentation war über weite Strecken korrekt, enthielt aber sieben sachliche Fehler. Die `AGENTS.md`-Dateien waren im Commit `db57870` synchronisiert worden, enthielten aber weiterhin mehrere falsche Aussagen. Das alte Audit (dieses Dokument) war selbst teilweise falsch.

## 3. Behobene Fehler (Auswahl mit Beleg)

| # | Vorher | Nachher (Beleg) |
| --- | --- | --- |
| 1 | README: „8 Gate-Typen" | 11 Typen inkl. Hurdle, Flagge klein, Tunnel (`src/types/gate.ts:1-12`) |
| 2 | README + Nutzerdoku: „Gate-Größe" einstellbar | keine Gate-Größe (`src/components/ui/GateConfigPanel.tsx`: nur Anzahlen und Feldmaße) |
| 3 | README: „Zod-Validierung" | handgeschriebene Schema-Validierung, kein zod im Projekt |
| 4 | README: 5 von 7 npm-Scripts | alle 7 inkl. `build:viewer`/`build:all` (`package.json:7-13`) |
| 5 | README: „kein Backend" ohne Hinweis | Kurzlink-Erzeugung überträgt die Lang-URL inkl. Track-Daten an den Shortener (`src/utils/shareTrack.ts:88-93`) |
| 6 | Nutzerdoku: Drehung raste immer in 15° | 15°-Raster nur bei aktivem Grid-Snap (`src/components/gates/GateHandles.tsx:232-233`) |
| 7 | Nutzerdoku: Verschieben in N/S/E/W-1-m-Schritten | freies Ziehen, optional am Raster eingerastet (Handles, nicht die ungenutzte Store-Aktion) |
| 8 | Nutzerdoku: Realistisch rendert „Wolken" | `useClouds` hat keinen Verbraucher, es werden keine Wolken gerendert |
| 9 | Nutzerdoku: Import liefert Fehlermeldung | fehlerhafte Dateien werden verworfen, die Meldung landet nur in der Konsole (`src/components/layout/TopBar.tsx:96,102`) |
| 10 | Nutzerdoku: Ein-/Ausflug-Markierungen „immer sichtbar" | an den Schalter „Durchflüge" gekoppelt (`src/components/gates/Gate.tsx:70`) |
| 11 | Nutzerdoku: Einfüge-Dialog biete vorher/nachher | Wahl über Insert-Handles (`GateHandles.tsx:350-351`), Dialog fragt nur den Typ (`App.tsx:301-333`) |
| 12 | Nutzerdoku: Flagge „dreieckig" | rechteckige Platte (`src/components/gates/Flag.tsx:43-45`) |
| 13 | Nutzerdoku: TopBar-Gruppierung und -Reihenfolge | Import/Export liegen rechts neben Streckennamen-Badge (`TopBar.tsx:326-400`) |
| 14 | README + Nutzerdoku: Viewer-Zustand „Kein Track geladen." | über den Hash-Bootstrap unerreichbar (`viewer-main.tsx:14-23`) |
| 15 | In-App-Hilfe: „Anzahl/Größe der Gates", 15° unabhängig vom Snap, Pan ohne Rechtsklick | korrigiert, DE + EN (`src/i18n.ts`, Commit `89202e9`) |
| 16 | `AGENTS.md`: Rotation 0-330 in 30°-Schritten | Handle 1°/px, 15°-Snap nur bei `snapGatesToGrid`, Generator 30° (`GateHandles.tsx:232-233`, `generator.ts:141`) |
| 17 | `AGENTS.md`: Barrel fehlen zwei Module | vier Module fehlen (`LadderGate`, `FlagSmall`, `GateHandles`, `GateOpeningIndicators`) |
| 18 | `AGENTS.md`: `.env.*` bäckt Viewer-Domain | nur `.env.example` kennt `VITE_VIEWER_DOMAIN`; dev/prod setzen nur den Shortener-Endpoint |
| 19 | `gates/AGENTS.md`: FlagSmall „1 m"-Mast | 1,2 m (`FlagSmall.tsx:22`, `gateDimensions.ts:2`) |
| 20 | `layout/AGENTS.md`: Share-Dialog ersetze den Langlink | beide Links werden gleichzeitig gezeigt (`ShareTrackDialog.tsx:21-22,44-45`) |
| 21 | coolify: `VITE_VIEWER_DOMAIN` sei Pflicht | optional mit Default (`shareTrack.ts:5,70`); Payload ist `#z.<lz-string>`, base64url nur Legacy-Fallback |
| 22 | Altes Audit: Flight-Path-Constraints missen „hurdle" | falsch — `flightPath.ts` enthält keine Hurdle-Referenz, die Dokumentation war korrekt |

## 4. Produktbefunde (keine Dokumentationsfehler, aus dem Audit gefallen)

Diese Punkte sind keine Dokumentationsprobleme, sondern Produktbeobachtungen, die beim Abgleich aufgefallen sind:

1. **Fehlende Import-Fehlermeldung:** Eine ungültige JSON-Datei wird still verworfen, es gibt keine sichtbare Rückmeldung im UI (`TopBar.tsx:96,102` schreibt nur in die Konsole). Die Dokumentation beschreibt das Verhalten korrekt; eine Nutzerfreundlichkeit wäre eine Erweiterung.
2. **Unerreichbarer Viewer-Zustand:** `ViewerApp.tsx:73-79` rendert „Kein Track geladen.", aber der Bootstrap in `viewer-main.tsx:14-23` erreicht diesen Zweig nie. Wird als interner Zustand in den `AGENTS.md` dokumentiert.
3. **Toter Code:** `src/utils/gateOperations.ts` (nur vom eigenen Test importiert), die Store-Aktionen `moveGate`/`rotateGate` ohne UI-Aufrufer, `DirectionalPad` ohne Import, `storage.autoSave` ohne Produktionsnutzer.
4. **Stale Kommentar:** `src/types/gate.ts:28` kommentiert `rotation` als kontinuierlich, die Store-Aktion rechnet in 30°-Schritten.
5. **Theme-Flag ohne Verbraucher:** `theme.realistic.useClouds` ist `true`, aber es wird nichts gerendert.

## 5. Bewusste Abgrenzungen der Coverage-Matrix

- **AUSGENOMMEN (5):** ACES-Tonemapping, Kamera-Startkoordinaten, Zoom-Interpolation, Grasfläche, Himmelskuppel — reine Renderer-Interna ohne Nutzerhandlung.
- **N/A_INTERNE:** der oben genannte unerreichbare Viewer-Zustand (in `AGENTS.md` dokumentiert).
- **PRODUKTLÜCKE, DOKU KORREKT (1):** die inventarisierte „Fehlermeldung samt Feldliste" für Import/Share-Daten existiert im Produkt nicht; die Dokumentation beschreibt das Verhalten korrekt.
- Die 15 Build-/Entwickler-Zeilen sind als Entwickler-Doku in `AGENTS.md` bzw. README abgedeckt; die Nutzerdokumentation lässt sie bewusst aus.

## 6. Verifikations-Artefakte

Reports der Läufe (Inventar, Lückenanalyse, Verifikation, Coverage-Matrizen) liegen unter `/tmp/ulw-docs-8iXEY4/waves/docs-audit/` — `inv-*.md` (Inventar), `gap-*.md` (Lückenanalyse), `verify-*.md` (adversariale Prüfung), `coverage-matrix-last.md` (finale Matrix). Jede MISMATCH-Prüfung ist dort mit dem ausgeführten Kommando und der Code-Zeile belegt.

---

*Dieses Dokument beschreibt den Abgleich der Dokumentation mit dem Code. Es wird beim nächsten Funktionswechsel aktuell gehalten, indem die geänderten Dokumentationsflächen erneut gegen den Code geprüft werden.*
