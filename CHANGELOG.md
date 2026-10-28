# Changelog

Was Nutzer und Viewer-Besucher merken. Neueste Einträge zuerst, ein Abschnitt je Commit-Tag.

Regel für neue Einträge: Vor jedem Commit prüfen, ob die Änderung hierher gehört – siehe `AGENTS.md`, Abschnitt **CHANGELOG**. Gruppen sind **Neu**, **Geändert**, **Behoben**, **Entfernt** und **Dokumentation**. Rein interne Arbeiten (Refactorings, Tests, Kommentare, `AGENTS.md`-Pflege) stehen nur dann drin, wenn sich das Verhalten oder die Bedienung ändert.

Der Changelog beginnt mit den Commits der letzten Woche (ab 2026-10-23). Frühere Stände beschreiben `README.md` und `docs/NUTZERDOKUMENTATION.md`. Reine Interna aus diesem Zeitraum – `8ae7727` und `78693b5` (AGENTS.md-Wissensbasis) – stehen bewusst nicht darin.

## Unveröffentlicht

**Neu**

- Offizielle FPVOOE-Strecken liegen jetzt als JSON im Ordner `tracks/` und werden beim Build mit ausgeliefert. Der neue Button „Offizielle Tracks“ in der linken Werkzeugleiste öffnet eine Liste mit Gate-Anzahl und Feldmaß; der angezeigte Streckenname ist der Dateiname ohne `.json`. Ein Klick auf „Laden“ holt die Strecke unter diesem Namen in den Editor. Jede Datei ist ein eigener Eintrag – auch wenn mehrere Exporte dieselbe interne Track-ID und denselben Namen tragen. Dateien, die nicht gelesen werden können, werden mit ihrem Dateinamen genannt.

## 2026-10-28

**Neu**

- Gates lassen sich direkt am Körper drehen: `Strg`/`Control` gedrückt halten und seitlich ziehen, 1° pro Pixel, 15°-Raster nur bei aktivem Grid-Snap. (`b1b6889`)

**Dokumentation**

- Der Hilfe-Dialog führt die direkten Gesten als eigene Zeilen; die Nutzerdokumentation beschreibt Ziehen und Strg-Drehen in den Gate-Schritten. (`b738218`)
- README und Nutzerdokumentation beschreiben jetzt den vollständigen aktuellen Stand: direkte Gesten am Gate (Ziehen, Shift-Höhe, Strg-Drehen), Leitpunkte auf der Ideallinie, Feldvorlagen, Snap-Genauigkeit nur bei aktivem Grid-Snap und die Stangen-Obergrenze samt Warnung.
- Die Einstellungs-Hilfe im Hilfe-Dialog nennt die Feldvorlage und das Label „Grid anzeigen“.
- Drehbewegungen (Dreh-Werkzeug und Strg-Ziehen) legen keinen Rückgängig-Schritt an und markieren die Strecke nicht als geändert. Das war bisher nirgends beschrieben.
- Erstmaliger Changelog: Die Commits ab 2026-10-23 sind nachgetragen, und `AGENTS.md` verlangt vor jedem Commit einen Changelog-Check.

## 2026-10-27

**Neu**

- Ideallinie mit Leitpunkten formen: Plus-Zeichen auf der Flugbahn anklicken, dann Gate einfügen oder einen gelben Leitpunkt setzen; Leitpunkte lassen sich in der Feldebene und in der Höhe ziehen, löschen und bleiben in Speicherung, Export und Share-Link erhalten. (`b10e67b`)
- `Shift` + Ziehen am Gate-Körper hebt und senkt das Gate mit 0,03 m pro Pixel – dieselbe Schrittweite wie das Höhen-Werkzeug. (`0171753`)
- Gates lassen sich durch Gedrückthalten und Ziehen am Körper verschieben, ohne vorher das Verschieben-Werkzeug zu greifen. (`b04d6ec`)

**Behoben**

- Beim Ziehen am Gate-Körper drehte sich die Kamera mit; die Orbit-Steuerung der Szene ist jetzt die Standardsteuerung. (`4b316b8`)

**Entfernt**

- Die Kamerahöhe lässt sich nicht mehr per `Shift` + linke Maustaste verschieben. `Shift` am Gate hebt jetzt das Gate, nicht die Kamera. (`0171753`)

**Dokumentation**

- README und Nutzerdokumentation beschreiben Shift-Höhe, Gate-Ziehen und Leitpunkte. (`1bcee96`)

## 2026-10-23

**Behoben**

- Das Wasserzeichen „#FPVOOE" passt sich der Feldgröße an: Es läuft jetzt entlang der längeren Feldachse und bleibt innerhalb des Spielfelds – auch in der Halle „Last OG3" (10,5 × 22,7 m), wo es vorher weit über den Rand hinausragte. (`56756ed`)
