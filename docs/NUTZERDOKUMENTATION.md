# FPV Track Designer – Nutzerdokumentation

Willkommen! Diese Anleitung führt dich Schritt für Schritt durch den **FPV Track Designer** – vom ersten zufällig generierten Kurs über die Feinabstimmung einzelner Gates bis zum Teilen deiner Strecke und dem Durchfliegen aus der Ich-Perspektive.

Die App läuft komplett im Browser, ist **desktop-orientiert** (Maus + Tastatur) und speichert deine Strecken lokal auf deinem Gerät. Es gibt kein Login und kein Konto.

---

## Inhaltsverzeichnis

1. [Erste Schritte](#1-erste-schritte)
2. [Die Oberfläche im Überblick](#2-die-oberfläche-im-überblick)
3. [Eine Strecke erzeugen](#3-eine-strecke-erzeugen)
4. [Einstellungen (Gate-Anzahl & Feldgröße)](#4-einstellungen-gate-anzahl--feldgröße)
5. [Die Gate-Typen](#5-die-gate-typen)
6. [Gates bearbeiten](#6-gates-bearbeiten)
7. [Die Flugbahn verstehen](#7-die-flugbahn-verstehen)
8. [FPV-Flug (Durchfliegen)](#8-fpv-flug-durchfliegen)
9. [Design & Themes](#9-design--themes)
10. [Speichern & Galerie](#10-speichern--galerie)
11. [Import & Export (JSON)](#11-import--export-json)
12. [Strecken teilen & Viewer](#12-strecken-teilen--viewer)
13. [Stangenzähler](#13-stangenzähler)
14. [Maussteuerung in der 3D-Ansicht](#14-maussteuerung-in-der-3d-ansicht)
15. [Tastenkürzel](#15-tastenkürzel)
16. [Sprache umstellen](#16-sprache-umstellen)
17. [Tipps, Grenzen & Fehlerbehebung](#17-tipps-grenzen--fehlerbehebung)

---

## 1. Erste Schritte

1. Öffne die App im Browser (im Entwicklungsbetrieb: `http://localhost:5173`).
2. Beim ersten Start wird **automatisch eine zufällige Strecke** erzeugt – du hast sofort etwas zu sehen und zu bearbeiten.
3. Beim ersten Besuch öffnet sich automatisch der **Hilfe-Dialog** mit den wichtigsten Bedienschritten. Danach nicht mehr (du kannst ihn jederzeit über das **Hilfe**-Symbol oben rechts erneut öffnen).
4. Drehe die Ansicht mit der **linken Maustaste**, bewege dich mit der **rechten Maustaste** über das Feld und zoome mit dem **Mausrad**.

Alles Weitere in dieser Anleitung baut darauf auf.

---

## 2. Die Oberfläche im Überblick

Die Oberfläche besteht aus drei Bereichen:

- **TopBar (oben):** Links stehen der App-Titel **FPV-Track-Designer** und daneben das Badge **"Beta Version".** In der Mitte folgen Rückgängig/Wiederholen, FPV-Flug, der Stangenzähler und die Anzeige-Optionen (Grid anzeigen, Grid-Snap, Snap-Genauigkeit, Flugbahn, Durchflüge); die Snap-Genauigkeit erscheint nur, solange Grid-Snap aktiv ist. Rechts findest du in der Desktop-Ansicht das Badge **"#fpvooe"** (verlinkt auf `https://fpvooe.com`, öffnet in einem neuen Tab), den Namen der geladenen Strecke als Badge (abgeschnittene Namen erscheinen vollständig als Tooltip), JSON Import/Export, Sprache und Hilfe.
- **Linke Werkzeugleiste:** Shuffle (neu generieren), Speichern, Track Teilen, Galerie, Einstellungen, Design.
- **3D-Szene (Mitte):** die Strecke selbst. Angeklickt erscheinen direkt am Gate die Bearbeitungswerkzeuge. In der Feldmitte liegt ein dezentes Wasserzeichen **„#FPVOOE"**.

---

## 3. Eine Strecke erzeugen

Es gibt zwei Wege zu einem Kurs:

### 3.1 Zufällig generieren („Shuffle")

- Klick auf **Shuffle** in der linken Werkzeugleiste oder drücke die Taste **`S`**.
- Aus deinen Einstellungen (Gate-Anzahl je Typ und Feldgröße) wird eine **neue, zufällige Strecke** erzeugt.
- Der Generator achtet auf einen **Mindestabstand von 3 Metern** zwischen den Gates und richtet die Gates in **30°-Schritten** aus.
- Ein **Start/Ziel-Gate** wird dabei bevorzugt zuerst an den Feldrand gesetzt.

> **Wichtig:** Shuffle ersetzt die aktuelle Strecke. Sind ungespeicherte Änderungen vorhanden, fragt die App vorher nach (Speichern / Verwerfen / Abbrechen).

### 3.2 Aus der Galerie laden

Gespeicherte Strecken lädst du über die **Galerie** wieder (siehe [Abschnitt 10](#10-speichern--galerie)).

---

## 4. Einstellungen (Gate-Anzahl & Feldgröße)

Öffne links die **Einstellungen** (Zahnrad). Der Bereich **Strecken-Einstellungen** enthält die Karte **Kurskonfiguration**:

- **Gate-Anzahl:** ein Zahlenfeld pro Gate-Typ. Trage ein, wie viele Gates welchen Typs generiert werden sollen (0 = nicht verwenden).
- **Feldeinstellungen → Feldvorlage:** wählt eine Halle mit festen Maßen (siehe [Abschnitt 4.1](#41-feldvorlagen-halle-mit-festen-maßen)).
- **Feldeinstellungen → Feldgröße (m):** **Breite** und **Länge** des Spielfelds.
- **Auf Standard zurücksetzen:** setzt die Konfiguration auf die Werkseinstellungen zurück.

**Anwenden:** Änderst du Werte, erscheint der Hinweis, dass die Kurskonfiguration geändert wurde. Mit **„Neue Kurskonfiguration anwenden"** wird daraus eine neue Strecke generiert. Da dabei die aktuelle Strecke ersetzt wird, greift auch hier der Nachfrage-Dialog bei ungespeicherten Änderungen. Das gilt für Strecken, die aus einer Generierung stammen: Nach **Galerie-Laden** oder **JSON-Import** gibt es keinen Generierungsstand, der Hinweis bleibt aus und die neuen Werte wirken erst beim nächsten Shuffle.

**Standardwerte** (werksseitig): Standard-Gate 3, Start/Ziel 1, h-Gate 2, Dive 1, Doppel 1, Flagge 1, Flagge klein 1, Tunnel 1; Doppel-h, Hurdle und Leiter sind standardmäßig auf 0.

> **Hinweis:** Eine separate **Gate-Größe** gibt es in der aktuellen Version nicht – die Gate-Abmessungen sind fest. Die Anzahl der Gates und die Feldgröße (oder eine Feldvorlage) sind die Stellschrauben.

### 4.1 Feldvorlagen (Halle mit festen Maßen)

Manche Hallen haben feste Maße. Über das Feld **Feldvorlage** in den **Feldeinstellungen** wählst du eine Vorlage:

- **Benutzerdefiniert** (Standard): Breite und Länge stellst du frei ein.
- **Last OG3**: eine Halle mit **22,7 m Länge und 10,5 m Breite**. In der Hallenmitte stehen **vier Säulen**. Die erste sitzt **4,3 m von der Stirnwand** entfernt, die übrigen folgen im Abstand von **5,1 m**. Jede Säule misst in der Grundfläche **0,5 m in der Längsrichtung und 0,3 m in der Breite** und ist **3 m hoch**.

Sobald du eine Vorlage wählst, legt die App die Feldgröße selbst fest. Die beiden Zahlenfelder **Breite** und **Länge** sind dann gesperrt. Erst mit **Benutzerdefiniert** werden sie wieder freigeschaltet, und die zuletzt gesetzte Größe bleibt dabei stehen. Unter dem Auswahlfeld zeigt die App zusätzlich an, wie viele Säulen im Feld stehen.

Die zuletzt gewählte Vorlage merkt sich die App in deinem Browser: Beim nächsten Besuch ist sie sofort wieder aktiv, samt ihrer Feldgröße. **Auf Standard zurücksetzen** löscht diese Erinnerung und stellt die Werkseinstellungen wieder her (Benutzerdefiniert, 30 m × 15 m). Das Laden oder Importieren einer Strecke ändert die gemerkte Vorlage nicht – eine Strecke bringt ihre eigene Feldgröße mit.

Die Säulen erscheinen in der 3D-Ansicht als Hindernisse, damit du die Gates passend drumherum aufstellst. Anklicken lassen sie sich nicht: Klicks gehen durch sie hindurch auf den Boden und auf die Gates.

### 4.2 Anzeige-Optionen (in der TopBar)

Diese Optionen ändern nur die Darstellung, nicht die Strecke:

| Option | Wirkung |
| --- | --- |
| **Grid anzeigen** | blendet das Boden-Grid (1-m-Zellen, 5-m-Markierungen) ein. Standardmäßig aus. |
| **Grid-Snap** | Gates rasten beim Verschieben und in der Höhe auf einem Positions-Grid ein. Beim Drehen rastet die Drehung dann zusätzlich auf 15°-Schritte ein. Ohne aktiven Grid-Snap dreht sie stufenlos. |
| **Snap-Genauigkeit** | wie grob eingerastet wird – für X, Z und Höhe: **Fein · 0,3 m**, **1/2 Feld · 0,5 m** oder **1 Feld · 1,0 m**. Der Schalter erscheint nur, solange Grid-Snap aktiv ist. |
| **Flugbahn** | zeigt die Ideallinie durch alle Gates inkl. Richtungspfeilen. |
| **Durchflüge** | markiert an jedem Gate die Reihenfolge der Durchflüge und die Ein-/Ausflugseite. |

Der Feldrand ist unabhängig vom Gitter immer sichtbar und dient als Orientierung.

---

## 5. Die Gate-Typen

Der Designer kennt **11 feste Gate-Typen**. Jeder Typ hat eine eigene Form und ein eigenes Durchflugverhalten. Die „Stangen"-Spalte zeigt, wie viele Stangen ein Gate im Stangenzähler benötigt (0 = nicht aus Stangen baubar).

| Gate | Beschreibung | Stangen |
| --- | --- | --- |
| **Standard-Gate** | Klassischer rechteckiger Rahmen aus zwei Pfosten und oberer Querstrebe. | 3 |
| **Start/Ziel-Gate** | Standard-Rahmen mit Panel und „Start"-Beschriftung auf beiden Seiten. Wird beim Generieren bevorzugt an den Feldrand gesetzt. | 3 |
| **h-Gate** | Untere Durchflugöffnung plus seitliche „Rückenlehne". Die Seite der Rückenlehne ist fest je Gate. | 4 |
| **Doppel-h-Gate** | Gestapeltes Standard- und h-Gate; Durchflüge unten, mittig und oben. | 7 |
| **Hurdle** | Breite, niedrige Hürde (doppelte Breite) mit einer Öffnung darüber. | 0 |
| **Dive-Gate** | Würfelartiger, unten offener Rahmen. Einflug von oben, Ausflug auf einer festen Seite. | 0 |
| **Doppel-Gate** | Zwei übereinander gestapelte Standard-Gates. | 6 |
| **Leiter-Gate** | Drei übereinander gestapelte Gates. | 9 |
| **Flaggen-Gate** | 2-m-Mast mit rechteckiger Flaggen-Platte. | 2 |
| **Flaggen-Gate klein** | 1,2-m-Mast mit kleiner rechteckiger Platte. | 1 |
| **Tunnel** | Achteckiger Tunnel (ca. 2 m lang), dessen Ausgangsseite gespiegelt markiert ist. | 0 |

> **Tipp:** Hurdle, Dive-Gate und Tunnel benötigen **keine Stangen** – sie erscheinen im Stangenzähler unter „Nicht aus Stangen baubar".

---

## 6. Gates bearbeiten

So bearbeitest du einzelne Gates direkt in der 3D-Szene:

1. **Gate anklicken.** Es wird markiert und zeigt die Werkzeuge.
2. **Mehrere Gates wählen:** Halte beim Klicken **`Shift`**, **`Cmd`** oder **`Ctrl`** gedrückt, um weitere Gates zur Auswahl hinzuzufügen oder bereits gewählte wieder abzuwählen. Ein Klick auf die **Bodenfläche** hebt die gesamte Auswahl auf.
3. **Verschieben:** Halte das Verschieben-Symbol am Gate und ziehe es frei über das Feld. Alternativ hältst du das Gate direkt gedrückt und ziehst es. Mit aktivem Grid-Snap rastet es in der gewählten Snap-Genauigkeit ein.
4. **Höhe verstellen:** Nutze das Höhen-Werkzeug am Gate, um es anzuheben oder abzusenken. Schneller geht es direkt am Gate: **`Shift` gedrückt halten und das Gate ziehen** – die Höhe ändert sich dabei um 0,03 m pro Pixel, genau wie beim Höhen-Werkzeug.
5. **Drehen:** Halte das Dreh-Symbol und ziehe seitlich. Direkt am Gate funktioniert das ebenso mit **`Strg`/`Control` gedrückt halten und dem Gate seitlich ziehen**. Die Drehung läuft stufenlos mit. Nur bei aktivem Grid-Snap rastet sie auf **15°-Schritte** ein. Drehungen landen nicht im Rückgängig-Verlauf und markieren die Strecke nicht als geändert (siehe [6.3](#63-rückgängig--wiederholen)).
6. **Einfügen:** Klicke ein Gate an und nutze am Gate das **„vorher“**- oder **„nachher“**-Symbol. Der Dialog **„Gate einfügen“** fragt dann nur noch den **Gate-Typ** ab. Das neue Gate wird passend in die Durchflugreihenfolge eingefügt.
7. **Löschen:** Wähle das Gate und drücke **`Backspace`** (öffnet den Bestätigungsdialog) oder nutze das Löschen-Symbol. Bestätigen mit **`Enter`** oder **„Gate löschen"**.

### 6.1 Einflug-/Ausflugseite wechseln

Jedes Gate zeigt **grüne Einflug-** und **rote Ausflug-Markierungen** (sichtbar, solange der Schalter **„Durchflüge“** aktiv ist). Je nach Kameraposition ist nur die zugewandte Seite beschriftet. Klicke die Markierung an und drehe die Richtung mit dem **⇄-Symbol** um. Die grüne Seite zeigt danach die neue Einflugseite.

### 6.2 Durchflugreihenfolge ändern

Mit aktivem **„Durchflüge"** zeigt jede Öffnung ihre **Durchflugnummer**. Klicke eine Nummer an und trage im Dialog **„Durchflugnummer ändern"** eine neue Position zwischen 1 und der Gesamtzahl der Durchflüge ein.

### 6.3 Rückgängig / Wiederholen

Bearbeitungsschritte lassen sich mit **`Cmd/Ctrl + Z`** rückgängig machen und mit **`Cmd/Ctrl + Y`** (oder `Cmd/Ctrl + Shift + Z`) wiederherstellen. Fährst du mit der Maus über den Rückgängig- oder Wiederholen-Knopf in der TopBar, zeigt der Tooltip in Klammern an, wie viele Schritte gerade verfügbar sind. Ohne Verlauf sind die Knöpfe deaktiviert.

**Ausnahme Drehen:** Drehbewegungen – über das Dreh-Symbol und über `Strg`/`Control` + Ziehen – legen keinen Rückgängig-Schritt an und setzen die Strecke nicht auf „geändert“. Die neue Ausrichtung bleibt in der Szene und wird beim nächsten Speichern mitgeschrieben, beim Verlassen oder Laden fragt die App aber nicht nach ungespeicherten Änderungen.

---

## 7. Die Flugbahn verstehen

Aktiviere oben **„Flugbahn"**. Die App berechnet dann die **Ideallinie** durch die Gates in der von dir festgelegten Durchflugreihenfolge:

- Kurven von Einflug zu Ausflug durch jedes Gate,
- Übergänge zwischen den Gates (inkl. Sonderfällen wie U-Turns, H-Gate-Rückenlehne, Doppel-h-Stapel und Tunnelportale),
- **Richtungspfeile** entlang der Linie zeigen, in welche Richtung und Reihenfolge geflogen wird.

### 7.1 Ideallinie mit Leitpunkten formen

Aktiviere **„Flugbahn“**. Solange kein Gate ausgewählt ist, kannst du die Ideallinie bearbeiten: Leitpunkte einfügen oder direkt ein Gate an der Linie platzieren.

1. **Menü öffnen:** Fahre mit der Maus über die Linie. Das **Plus-Zeichen** erscheint genau unter dem Mauszeiger; ein Klick auf die Linie klappt zwei Symbole darunter auf (ein zweiter Klick schließt sie wieder). Die Symbole bleiben anklickbar, auch wenn der Mauszeiger das Bildfeld verlässt; erst ein Klick außerhalb schließt das Menü.
2. **Gate einfügen:** Das Gate-Symbol öffnet den Dialog „Gate einfügen“. Das neue Gate landet auf der Linie, ist entlang der Linie gedreht und wird in der Durchflugreihenfolge zwischen den beiden Gate-Ankern des Abschnitts eingefügt.
3. **Leitpunkt setzen:** Das gelbe Punkt-Symbol setzt und selektiert einen Leitpunkt an dieser Stelle.
4. **Im Feld verschieben:** Klicke den gelben Leitpunkt an. Das Verschieben-Werkzeug bewegt ihn in X/Z-Richtung wie ein Gate. Feldgrenzen und aktives Grid-Snap gelten ebenfalls. Der kleine Papierkorb oben rechts löscht den Leitpunkt. Wie bei Gates funktioniert auch das direkte Ziehen: **Leitpunkt gedrückt halten und ziehen**. Ein kurzer Klick ohne Ziehen wählt den Leitpunkt nur aus.
5. **Höhe ändern:** Das Höhen-Werkzeug hebt oder senkt den Leitpunkt um 0,03 m pro Pixel und mindestens bis zum Boden. Genauso wie bei Gates geht das direkt mit **`Shift` + Leitpunkt gedrückt halten und ziehen**.
6. **Kurve formen:** Füge weitere Leitpunkte ein. Die Linie verläuft glatt durch sie, während die Gate-Anker unverändert bleiben.
7. **Rückgängig und abwählen:** Einfügen, Löschen und jede Ziehbewegung sind jeweils ein Rückgängig-Schritt. Boden- oder Gate-Klick beendet die Auswahl.

Leitpunkte speichern ihre Weltposition und die Zuordnung zum Gate-Abschnitt. Gate-Bearbeitungen erhalten diese Daten; wenn ein Abschnitt nicht mehr existiert, bleibt sein Leitpunkt gespeichert, aber wirkungslos. Speichern, JSON-Export/Import, Galerie und Teilen übernehmen die Leitpunkte. Der Share-Viewer zeigt die geformte Linie ohne Leitpunkte.

Die Flugbahn ist auch die Grundlage für den FPV-Flug.

---

## 8. FPV-Flug (Durchfliegen)

Das Highlight: die Strecke einmal aus der **Ich-Perspektive** durchfliegen.

- **Starten:** Klicke oben auf **„FPV-Flug"** (Play-Symbol) in der TopBar.
- Die Kamera fliegt automatisch die **Ideallinie** durch alle Gates – in deiner Durchflugreihenfolge.
- **Stoppen:** Klick erneut auf den Button (**„FPV stoppen"**) oder drücke **`Escape`**. Am Ende der Strecke stoppt der Flug automatisch und die Editor-Kamera wird wiederhergestellt.
- **Voraussetzung:** Die Strecke braucht **mindestens 2 Gates**; sonst ist der Button deaktiviert.

> **Hinweis:** Es gibt (noch) keine Fortschrittsanzeige oder Zeitanzeige während des Flugs – du siehst nur die Kamerafahrt und den Wechsel des Buttons. Die Fluggeschwindigkeit ist fest, und die Kamera blickt der Ideallinie voraus.

---

## 9. Design & Themes

Über **Design** (Paletten-Symbol) wählst du das visuelle Erscheinungsbild der 3D-Ansicht:

| Theme | Beschreibung |
| --- | --- |
| **Minimal Standard** | Für schwächere Geräte – reduzierter Detailgrad, keine Schatten. |
| **Realistisch** | Sonne, Schatten und atmosphärische Beleuchtung (Umgebungslicht) für leistungsstarke Rechner. |
| **Nacht** | Neonfarbene Gates mit Bloom-Effekt unter einem Sternenhimmel. |

Das gewählte Theme wird mit der Strecke gespeichert und **beim Teilen mitgegeben** – Empfänger sehen deine Strecke also im gleichen Look.

---

## 10. Speichern & Galerie

### 10.1 Speichern

- **Speichern** in der Werkzeugleiste oder **`Cmd/Ctrl + S`**.
- Vergib einen **Streckennamen**; die Strecke wird **lokal im Browser** (`localStorage`) abgelegt.
- Gespeicherte Strecken bleiben an **diesen Browser auf diesem Gerät** gebunden.

### 10.2 Galerie

Öffne die **Galerie** über die Werkzeugleiste oder die Taste **`G`**. Du siehst alle gespeicherten Strecken (Name + Datum) und kannst:

- **Laden** – ersetzt die aktuelle Strecke (Nachfrage bei ungespeicherten Änderungen),
- **Duplizieren** – erstellt eine Kopie unter neuem Namen,
- **Löschen** – entfernt die Strecke nach Bestätigung,
- **Aktualisieren** – lädt die Liste neu.

### 10.3 Offizielle Strecken laden

In der linken Werkzeugleiste sitzt direkt unter der **Galerie** der Button **Offizielle Tracks** (Pokal-Symbol). Er öffnet eine Liste aller Strecken, die im Repository unter `tracks/` liegen. Jede Karte zeigt den Streckennamen – das ist der Dateiname ohne `.json` –, die Gate-Anzahl und das Feldmaß. Weil exportierte Strecken intern oft denselben Namen tragen, gilt einfach der Dateiname: `Last 16.10.26.json` erscheint als „Last 16.10.26“. Die Liste ist chronologisch sortiert – das Datum im Dateinamen entscheidet, die neueste Strecke steht ganz oben und die älteren folgen darunter. Verstanden werden Dateien wie `Last 21.08.26.json` (Tag.Monat.Jahr) und `2026.08.21.json`; Dateien ohne Datum stehen alphabetisch am Ende.

Ein Klick auf **Laden** holt die Strecke samt Konfiguration in den Editor und ersetzt die aktuelle. Sind ungespeicherte Änderungen vorhanden, erscheint vorher die gewohnte Rückfrage mit Speichern, Verwerfen und Abbrechen. Dateien, die die Prüfung nicht bestehen, erscheinen nicht als Strecke; der Dialog nennt stattdessen, wie viele Dateien aus dem Ordner nicht geladen werden konnten.

---

## 11. Import & Export (JSON)

In der TopBar findest du **JSON exportieren** und **JSON importieren**:

- **Export:** speichert die aktuell geladene Strecke (Gates, Reihenfolge, Konfiguration, Theme) als JSON-Datei zum Sichern oder Weitergeben.
- **Import:** lädt eine zuvor exportierte oder von anderen Piloten erhaltene JSON-Datei. Beim Import wird die aktuelle Strecke ersetzt – bei ungespeicherten Änderungen fragt die App vorher nach.
- Jede Datei läuft beim Import durch die Schema-Validierung. Ist sie ungültig, wird sie abgewiesen und die aktuelle Strecke bleibt unverändert; die App stürzt nicht ab. Eine Fehlermeldung im Fenster gibt es derzeit noch nicht – der Fehler steht nur in der Browser-Konsole.
- Ältere/legacy Track-Dateien werden beim Import automatisch auf das aktuelle Format normalisiert.

---

## 12. Strecken teilen & Viewer

Der schnellste Weg, eine Strecke weiterzugeben – ohne Datei, ohne Konto:

1. Klicke links auf **„Track Teilen"**.
2. Es öffnet sich der Dialog **„Track teilen"**. Er zeigt sofort das Feld **Langer Link** mit dem vollständigen Link; der funktioniert bereits sofort.
3. Parallel versucht die App, einen Kurzlink zu erstellen, der im Feld **Teilbarer Link** erscheint. Solange das läuft, steht dort „Kurzlink wird erstellt. Bis dahin ist der lange Link bereits nutzbar.". Bei Erfolg erscheint „Kurzlink erstellt.".
   - Klappt das Erstellen des Kurzlinks nicht, kannst du den langen Link trotzdem teilen.
4. Sobald ein Kurzlink existiert, erscheint zusätzlich ein **QR-Code**, den du als **PNG** oder **SVG** herunterladen kannst.
5. **„Link kopieren"** kopiert den Kurzlink (falls vorhanden), sonst den langen Link. Danach zeigt der Button **„Kopiert!"**.

### 12.1 Was der Empfänger sieht (Viewer)

Der Link öffnet eine **reine Ansichtsseite** (Read-only), ohne Bearbeitungsfunktionen. Die Track-Daten stecken im **URL-Fragment** (`#…`) und werden beim reinen Betrachten nicht an den Viewer-Server gesendet. Nur wenn du einen **Kurzlink** erzeugen lässt, schickt die App die vollständige lange URL inklusive Fragment mit den Track-Daten an den Shortener-Dienst, damit dieser den Kurzlink bauen kann.

Im Viewer kann der Empfänger:

- die Strecke frei betrachten (Drehen, Bewegen, Zoom, wie im Editor),
- eine mit Leitpunkten geformte Ideallinie sehen (die Leitpunkte selbst bleiben unsichtbar),
- den **FPV-Flug** starten/stoppen (wie im Editor erst ab zwei Gates),
- den Track als **JSON herunterladen** (der Dateiname wird aus dem Streckennamen abgeleitet und wieder importierbar in den Editor),
- die **Viewer-Hilfe** öffnen (erscheint beim ersten Besuch automatisch),
- unten rechts über **fpvooe.com** auf `https://fpvooe.com` wechseln (öffnet in einem neuen Tab).

Ist ein Link leer oder beschädigt, erscheint **„Track kann nicht geladen werden“** mit einer passenden Meldung.

> **Technischer Hintergrund (Deployment):** Der Editor läuft unter `trackdesigner.fpvooe.com`, der Viewer unter `sharedtrack.fpvooe.com`. Details zur Einrichtung stehen in [`coolify-track-sharing.md`](./coolify-track-sharing.md).

---

## 13. Stangenzähler

Oben in der TopBar zeigt der **Stangenzähler** die Gesamtzahl der für den Aufbau benötigten Stangen. Solange die Strecke keine Gates enthält, wird der Stangenzähler gar nicht angezeigt. Ein Klick öffnet die detaillierte **Stangenkalkulation**:

- Tabelle mit **Gate-Typ**, **Anzahl**, **Stangen pro Gate** und **Summe**,
- separater Bereich **„Nicht aus Stangen baubar“** für Hurdle, Dive-Gate und Tunnel.

Unter der Tabelle steht dein Feld **Max. Stangen** (Standard 60). Die Obergrenze wird nur in deinem Browser gespeichert und wandert weder in Exporte noch in Share-Links. Übersteigt deine Strecke das Limit, wird das Badge rot, das Popover meldet **„Über deinem Limit von … Stangen.“** und ein einmaliger Hinweisdialog erscheint. Nach dem Wegklicken warnt die App erst wieder, wenn die Strecke zwischenzeitlich wieder unter das Limit gefallen ist.

So planst du den Materialbedarf deiner Strecke direkt mit.

---

## 14. Maussteuerung in der 3D-Ansicht

| Aktion | Bedienung |
| --- | --- |
| Ansicht drehen | Linke Maustaste gedrückt halten und ziehen |
| Über die Strecke bewegen (Pan) | Rechte Maustaste ziehen **oder** `Space` + linke Maustaste ziehen |
| Zoomen | Mausrad scrollen |
| Schnell zoomen | Mittlere Maustaste ziehen |
| Zoom-Grenzen | Der Abstand reicht von 2 m bis 200 m |
| Neigung der Ansicht | Die Kamera lässt sich nicht unter den Horizont kippen |
| Auf Mobilgeräten | Zwei Finger ziehen zum Verschieben, auf-/zuziehen zum Zoomen |

Während eines **FPV-Flugs** sind die Kamera-Bedienelemente deaktiviert, bis du den Flug stoppst.

---

## 15. Tastenkürzel

| Aktion | Kürzel |
| --- | --- |
| Strecke shuffeln (neu generieren) | `S` |
| Strecke speichern | `Cmd/Ctrl + S` |
| Galerie öffnen | `G` |
| Ansicht verschieben | `Space` + linke Maustaste ziehen |
| Gate direkt verschieben | Gate gedrückt halten und ziehen |
| Gate anheben oder absenken | `Shift` gedrückt halten und Gate ziehen |
| Gate direkt drehen | `Strg`/`Control` gedrückt halten und Gate seitlich ziehen |
| Leitpunkt direkt verschieben | Leitpunkt gedrückt halten und ziehen |
| Leitpunkt anheben oder absenken | `Shift` gedrückt halten und Leitpunkt ziehen |
| Rückgängig | `Cmd/Ctrl + Z` |
| Wiederholen | `Cmd/Ctrl + Y` oder `Cmd/Ctrl + Shift + Z` |
| Ausgewähltes Gate löschen (Dialog) | `Backspace` |
| Löschen bestätigen | `Enter` |
| Gate abwählen / Dialoge schließen / **FPV stoppen** | `Escape` |

---

## 16. Sprache umstellen

Über das Sprach-Symbol in der TopBar wechselst du zwischen **Deutsch** und **Englisch**. Deine Wahl wird gespeichert und beim nächsten Besuch beibehalten.

---

## 17. Tipps, Grenzen & Fehlerbehebung

**Tipps**

- Nutze **Grid-Snap** zusammen mit einer passenden **Snap-Genauigkeit**, um schnurgerade Linien zu bauen.
- Aktiviere **„Durchflüge"**, um Reihenfolge und Ein-/Ausflugseiten auf einen Blick zu prüfen, bevor du den FPV-Flug startest.
- Prüfe den **Stangenzähler**, bevor du eine Strecke für den realen Aufbau freigibst.

**Grenzen / gut zu wissen**

- Es gibt **keine einstellbare Gate-Größe** und **keinen Zufalls-Seed** – nur Gate-Anzahl und Feldgröße (oder eine Feldvorlage).
- Der **FPV-Flug** zeigt keine Fortschrittsanzeige und hat eine feste Geschwindigkeit.
- Der **Viewer ist strikt read-only** – Änderungen sind dort nicht möglich.
- Tracks liegen in `localStorage` deines Browsers. Löschst du Browserdaten, sind auch die lokal gespeicherten Strecken weg – exportiere wichtige Strecken zusätzlich als **JSON**.
- Sind ungespeicherte Änderungen vorhanden, fragt die App bei destruktiven Aktionen (Shuffle, Import, Laden, Duplizieren, Konfiguration anwenden) nach: **Abbrechen**, **Zuerst speichern** oder **Verwerfen**. Nach **„Zuerst speichern“** wird die vorgemerkte Aktion ausgeführt, sobald das Speichern geklappt hat.

**Häufige Fragen**

- *Der FPV-Button ist ausgegraut.* → Deine Strecke hat weniger als 2 Gates.
- *Der Kurzlink kam nicht.* → Kein Problem, teile einfach den **langen Link**; er funktioniert immer.
- *Beim Öffnen eines Links erscheint eine Fehlermeldung.* → Der Link ist unvollständig oder beschädigt. Bitte den Absender, ihn erneut zu teilen.
- *Die App zeigt „Etwas ist schiefgelaufen".* → Es ist ein unerwarteter Fehler aufgetreten. Klicke auf **„Erneut versuchen"**; hilft das nicht, lade die Seite neu.

---

*Diese Dokumentation beschreibt den Stand von `main`. Die interne Projekt-/Entwicklerdokumentation findest du in den `AGENTS.md`-Dateien sowie in [`dokumentations-audit.md`](./dokumentations-audit.md).*
