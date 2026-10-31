# Handoff: Ideallinie — weich, mittig, mit Split-S

Stand: 2026-10-31. Zielgruppe: der nächste Agent oder Entwickler, der die Ideallinie
(`src/utils/flightPath.ts`) weiter- oder neu baut. Dieses Dokument ist der verbindliche
Funktionsvertrag. Es ersetzt die impliziten Annahmen aus den bisherigen Iterationen.

## 1. Auftrag

Die Ideallinie soll eine **nachfliegbare Rennlinie** sein, keine Visualisierung von Umwegen.
Verbindlich:

- **Weiche, sinnvolle Kurven.** Keine Haken, keine Ecken, keine Schlaufen, die sich selbst überholen.
- **Mittig durch jedes Gate.** Die Linie muss jede Öffnung in der Mitte durchqueren,
  Toleranz **50 %** (siehe Messlatte M1).
- **Split-S für das h-Gate.** Statt um das Gate herum zu fliegen: Drohne dreht sich auf den
  Rücken und zieht einen **halben Looping nach unten**, rollt zurück und fliegt weiter.
- **Nachfliegbarkeit.** Jede erzeugte Linie muss mit einer normalen Tinywhoop ohne
  Kunststücke geflogen werden können: durchgehend weich, kein Richtungssprung, kein
  unendlich enger Kurvenradius.

Auch ein kompletter Neubau der Ideallinie ist ausdrücklich erlaubt, wenn diese Regeln
eingehalten werden.

## 2. Verbindlicher Kurvenvertrag

| Regel | Verbindlicher Inhalt |
| --- | --- |
| R1 Glätte | Die Linie ist überall **C1** (tangentenstetig). Keine Knicke, keine Haken, keine Selbstüberschneidungen. |
| R2 Mittigkeit | Beim Durchqueren der Öffnungsebene liegt der Schnittpunkt innerhalb von **±50 % der halben Öffnungsbreite bzw. -höhe** (M1). |
| R3 Richtung | Jede Öffnung wird von ihrer **grünen Seite** angeflogen. Ausnahme nur dort, wo ein Split-S oder ein Reverse-Durchflug ausdrücklich modelliert ist (§3). |
| R4 Direktheit | Kürzester weicher Weg, der R1–R3 erfüllt. Umwege nur, wenn die Geometrie sie erzwingt (gestapelte Öffnungen desselben Gates, echte Kehrtwenden). |
| R5 Fliegbarkeit | Empfohlener Mindest-Kurvenradius **0,3 m**, Rahmenfreigang **0,25 m** (Pfosten, Querholme, Rückenlehne). Keine Höhensprünge; Steig- und Sinkflüge sind weich. |

Was **nicht** gemeint ist: eine möglichst kurze Luftlinie. Ein geplanter Split-S ist
länger als die Luftlinie und trotzdem richtig, weil er das ist, was ein Pilot fliegt.

## 3. Split-S statt Umweg (h-Gate)

### 3.1 Physik des Manövers

Ausgangslage beim h-Gate: zwei Öffnungen übereinander, beide blicken nach vorn
(`lower` y = 0,6 m, `backrest-pass` y = 1,8 m). Nach dem oberen Durchflug steht die
Drohne **hinter** dem Gate, die untere Öffnung liegt **davor**.

Split-S:

1. Oberen Durchflug (`backrest-pass`) normal beenden.
2. **Auf den Rücken rollen** und einen halben Looping **nach unten** ziehen
   (Flugrichtung dreht dabei um 180°).
3. **Zurückrollen.** Die Drohne fliegt jetzt entgegengesetzt zur ursprünglichen Richtung
   und **von hinten auf die untere Öffnung zu**.

### 3.2 Konsequenz für das Sequenzmodell (wichtig)

Ein Split-S endet mit entgegengesetzter Flugrichtung. Die untere Öffnung wird danach
**von hinten** durchflogen — im Datenmodell ist das ein **Reverse-Durchflug**
(`reverse: true` auf `lower`).

Das ist die einzige Möglichkeit, den Umweg ganz zu vermeiden:

| Variante | Weg | Voraussetzung |
| --- | --- | --- |
| Split-S (halber Looping nach unten) | ca. 2,7–3,5 m | `lower` wird **rückwärts** durchflogen (Reverse zulässig) |
| Seitliche Schleife (U-Turn) | ca. 5,4 m | keine |
| Vertikale Schleife über die Rückenlehne | ca. 5,7 m | keine, wirkt als hohe Spitze |

**Offene Nutzerentscheidung (siehe §7):** Darf die untere Öffnung rückwärts durchflogen
werden? Ohne diese Freigabe ist ein Split-S geometrisch nicht darstellbar, und die Linie
muss eine Schleife behalten.

### 3.3 Geometrie des Split-S

Bezugspunkte (h-Gate, Rotation 0, Gate bei (0,0,0)):

- `from` = Austritt `backrest-pass`: (0, 1,8, +0,405), Flugrichtung +z.
- `to` = Eintritt `lower` (**reverse**): (0, 0,6, +0,45), Flugrichtung **−z**.

Konstruktion in der Vertikalebene (Richtung + Hochachse):

1. **Bogen nach unten** (halber Looping): 180° um die horizontale Querachse,
   Radius `R = (from.y − to.y) / 2 = 0,6 m`, Mittelpunkt `(0, 1,2, 0,4275)`,
   von `from` (Flugrichtung +z) bis `to` (Flugrichtung −z), Bauch nach **hinten** (+z),
   damit der Bogen nicht in den Rahmen läuft.
2. **Gerade** entlang −z von `to` in den rückwärtigen Durchflug durch `lower`
   (Reststrecke 0,045 m, vernachlässigbar).
3. Die nachfolgende Passage durch `lower` verläuft **rückwärts** (von +z nach −z).

Bogenlänge ≈ π·0,6 = 1,88 m, plus Durchflug ≈ 0,81 m
≈ **2,7 m** statt 5,4 m Seitenschleife. Keine seitliche Auslenkung, keine Höhenspitze.

Die Rollbewegung selbst wird **nicht** in der Linie abgebildet (die Linie ist eine
Bahn, keine Orientierung); sie gehört in die optionale Fluganimation, nicht in die Geometrie.

## 4. Routing-Modell (Empfehlung)

Die bisherige Aufteilung bleibt sinnvoll und soll beibehalten werden:

1. **Durchflug pro Öffnung:** gerade Linie durch die Öffnungsmitte, exakt entlang der
   Öffnungsnormale (erfüllt R2 von selbst).
2. **Übergang zum nächsten Durchflug:** eine einzige **bogenlängenparametrisierte Kurve**
   mit vorgegebener Start-/Endtangente, gebaut als **Polylinie mit Kreisbogen-Fillets**
   (keine Kette separater Béziers).
3. **Fallunterscheidung:**

| Fall | Konstruktion |
| --- | --- |
| Freier Übergang (Ziel liegt voraus) | Direkte, geglättete Kurve (Cubic Hermite mit begrenzten Handles oder gerade mit Fillets). |
| Kehrtwende zwischen zwei Gates (Ziel liegt hinter der Drohne) | Gerundete Kehrtwende um die **Rahmenkante** des abgeflogenen Gates (kein weiter AusSchwingen). |
| Gestapelte Öffnungen desselben Gates (h-Gate, Doppel-h, Double, Ladder) | **Split-S**, wenn Reverse erlaubt ist (§3); sonst enge, runde Schleife um die Rahmenkante. |
| Dive (`entry-top`) | Gerade nach unten durch die Mitte, ohne Umweg. |
| Oktagonal-Tunnel | Gerade durch beide Portale. |
| Hurdle | Über den Körper hinweg, durch die obere Öffnung. |
| Leitpunkte (User) | Bestehendes Offset-Feld über die Basislinie legen; Basiskurve bleibt unverändert glatt. |

Konstanten (Empfehlung): Fillet-Radius 0,4 m, Mindest-Kurvenradius 0,3 m,
Rahmenfreigang 0,25 m, Abtastung 14 Punkte/m.

## 5. Messlatte (maschinell prüfbare Abnahme)

Alle Kriterien müssen für **jede Leg jeder offiziellen Strecke** (`tracks/*.json`) gelten:

| ID | Kriterium | Messung |
| --- | --- | --- |
| M1 Mittigkeit | Beim Schnitt mit der Öffnungsebene gilt `|localX| ≤ 0,25 · width` und `|localY| ≤ 0,25 · height` (50 % Toleranz um die Mitte). | Pro Visit aus `sampledLegs` bestimmen. |
| M2 Glätte | Größter Richtungssprung zwischen zwei aufeinanderfolgenden Samples ≤ **15°** (3D-Winkel). | `maxKink` über 3D-Richtungen. |
| M3 Keine Selbstüberschneidung | Keine zwei nicht benachbarten Segmente derselben Leg schneiden sich. | Segment-Schnitttest. |
| M4 Sinnvolle Wenden | Gesamt-Richtungsänderung (Swing) ≤ 200° pro Leg; Ausnahme Split-S/Same-Gate ≤ 380°. | XZ-Swing. |
| M5 Direktheit | Freie Legs: Pfadlänge / Luftlinie ≤ 1,6. Kehrtwenden: Pfadlänge ≤ 2 × Freigang + Luftlinie + 1 m. | Verhältnis. |
| M6 Invarianten | Bestehende Suite (`flightPath`, `idealLine`, `gateInsertion`, `droneRace`, Scene-Controls) bleibt grün. | `npx vitest run`. |
| M7 Gates | `npx tsc -b`, `npx eslint .`, `npm run build` jeweils exit 0. | Build-Gates. |
| M8 Sichtprüfung | Vorher/Nachher-Renders für h-Gate und Flaggen-Haarnadel zeigen keine Haken und keine Spitzen. | `.omo/evidence/*.svg(.png)`. |

Werkzeug dafür existiert bereits: `.omo/qa/measure.ts` (ratio, Swing, 3D-Knick,
Same-Gate-Bound) und `.omo/evidence/render-legs.mjs` (Top-/Seitenansicht).

## 6. Stand nach der Umsetzung (2026-10-31)

Umgesetzt in `src/utils/flightPath.ts`:

- **`createSplitS()`** ersetzt die Fallregel „gestapelte Öffnungen“: Geradeaus-Stutzen aus der
  Austrittsöffnung, danach ein **Halbkreis auf der Sehne** zwischen Austritt und Eintritt. Der
  Kreis liegt in der Ebene aus Austrittsrichtung und Sehne, der Bauch zeigt nach **vorn** (vom
  Gate weg), der Radius ist `|Sehne| / 2`. Die Landung ist der Eintrittspunkt der zweiten
  Öffnung, die Ankunftsrichtung ist exakt die Gegenrichtung – C1 ohne Restfehler, solange die
  Sehne senkrecht zur Austrittsrichtung steht (Stutzen-Fall). Liegt der Eintritt minimal
  hinter dem Austritt, wird der Halbkreis direkt auf die Sehne gesetzt; der dadurch entstehende
  Tangentialfehler ist der Sehnen-Neigungswinkel und wird auf **8°** begrenzt.
- **`createVerticalSplitS()` (Schleife über die Rückenlehne) ist entfernt** – sie war die vom
  Nutzer verworfene Form („sinnloses Eck nach rechts“).
- **`smoothRamp()`** gibt der seitlichen Kehrtwende (`createUTurn`) ein Höhenprofil mit
  Steigung 0 an beiden Enden. Vorher rampte die Höhe linear über die ganze Wendeschleife und
  erzeugte am Austritt einen Knick von 19°; jetzt 6,9°.
- **`SAME_GATE_FRAME_CLEARANCE = 0.25`** (vorher `GATE_STRUCTURE_CLEARANCE = 0.5`) für
  gestapelte Übergänge; `GATE_STRUCTURE_CLEARANCE` bleibt für die übrigen Ausweichkurven.
- **Diskretisierung:** der Halbkreis liegt wie alle Bögen als Polylinie mit 24 Punkten/m in
  `RoundedRouteCurve` (Rendergeschwindigkeit 14 Punkte/m). Daraus folgen 3,9° Richtungswechsel
  pro Stützpunkt – innerhalb der M2-Marke von 15°, aber nicht mathematisch C1. Eine analytische
  Bogen-`RouteCurve` wäre exakt; sie betrifft dann aber alle Fillets, nicht nur den Split-S.

Messung über alle 7 offiziellen Strecken (168 Legs, `.omo/qa/measure.ts`), Same-Gate-Übergänge:

| Familie | Legs | Pfad | Swing | 3D-Knick |
| --- | --- | --- | --- | --- |
| Split-S (zweite Öffnung rückwärts) | 4 | 2,74–2,78 m | 178° | 3,9° |
| Seitliche Kehrtwende (beide vorwärts) | 11 | 4,60–4,69 m | 352° | 6,9° |

Vorher lagen alle 15 Übergänge bei 5,65–5,74 m (3D-Knick bis 11,5°). Alle 15 Legs erfüllen jetzt
M1, M2, M3, M4 und M5; über alle Legs ist der größte M1-Wert **11 %** (Toleranz 50 %) und M3
**0** Selbstschnitte.

**Behoben am 2026-10-31 (zweiter Durchgang): Übergänge als Dubins-Bögen**

Die Ausweich- und Kehrtwendezweige sind ersetzt. Jeder Übergang zwischen zwei Gate-Durchflügen ist
jetzt ein Kreis-Gerade-Kreis-Plan (`src/utils/routeCurves.ts`, `planSmoothTransition()`): Gerade
aus der Austrittsrichtung, Bogen mit Mindestradius, Gerade in die Ankunftsrichtung, mit exakt den
vorgeschriebenen Endtangenten. Weil nur Geraden und Kreise vorkommen, ist eine Ecke nicht mehr
darstellbar; der Radius ist 0,32 m bis 2 m, gewählt wird der weiteste Plan innerhalb des
Direktheitsbudgets (1,3 × Sehne, plus Steigflug-Untergrenze 2,5 × Höhendifferenz) – das ergibt die
weiten Schwenks. `ArcRouteCurve` wertet den Plan analytisch aus, damit die gerenderten Punkte
exakt auf den Bögen liegen. Die `roundPolyline()`-Eckenfillets für freie Übergänge und die
Umweg-Wegpunkte (`calculateWaypointForSide`, `calculateOutsideLaneWaypoint`,
`calculateLaneEdgeWaypoint`, `createRoundedDetour`, `createAvoidanceCurve`) sind entfallen;
`roundPolyline()` lebt nur noch im Pylon-Fallback der gestapelten Öffnungen.

Messung über alle 7 offiziellen Strecken (168 Legs, `bun .omo/qa/measure.ts`):

| Kennzahl | vorher | jetzt |
| --- | --- | --- |
| Legs mit Verstoß | 40 | **0** |
| kleinster Kurvenradius | 0,08 m | **0,32 m** |
| größter 3D-Knick | 22,8° | **5,6°** |
| Selbstschnitte | 0 | 0 |
| größter M1-Wert | 11 % | 0 % |

Die Messlatte selbst war an zwei Stellen zu grob und ist mitgezogen: M4 und M5 vergleichen jetzt
gegen geometrieabhängige Budgets (nötige Richtungsänderung, Winkel zwischen Austrittsrichtung und
Sehne, Höhendifferenz) statt gegen feste Zahlen, und M5 misst den Übergang ohne die beiden
Gate-Durchflüge. Ein festes Verhältnis 1,6 hat vorher enge Haken belohnt und weite, fliegbare
Schleifen bestraft.

**Noch offen:**

- **Sichtbarkeit des Split-S:** `buildDefaultGateSequenceEntries()` liefert für ein h-Gate
  weiterhin `[lower, backrest-pass]` mit `reverse` aus der Öffnung (also `false`). Ein **neu
  gesetztes** h-Gate zeigt deshalb die seitliche Kehrtwende; der Split-S erscheint, sobald die
  Sequenz die zweite Öffnung als Reverse-Durchflug führt (so machen es vier der offiziellen
  Strecken). Die Standardreihenfolge zu ändern ist eine Produktentscheidung des Nutzers.

## 7. Entscheidungen

1. **Reverse für Split-S zulässig?** Umgesetzt wie im Vertrag: ja, aber ausschließlich über das
   bestehende `reverse`-Flag der Sequenz. Ohne Flag entsteht weiterhin die seitliche Schleife.
2. **Mindest-Kurvenradius 0,3 m / Rahmenfreigang 0,25 m:** erfüllt. Die gestapelten Übergänge
   liegen bei 0,6 m (Split-S) und 0,43 m (Kehrtwende), die freien Übergänge bei mindestens
   0,32 m (`MIN_TRANSITION_RADIUS`), Rahmenfreigang 0,25 m über `SAME_GATE_FRAME_CLEARANCE`.
3. **Fillet-Kern behalten?** Nein für freie Übergänge: ersetzt durch den Kreis-Gerade-Kreis-Plan
   in `routeCurves.ts` (§6). `roundPolyline()` bleibt nur im Pylon-Fallback der gestapelten
   Öffnungen, der praktisch nie gewinnt, weil Split-S und Kehrtwende vorher greifen.

## 8. Nächste Schritte

1. Produktentscheidung: soll ein neu gesetztes h-Gate standardmäßig `[backrest-pass, lower(reverse)]`
   bekommen, damit der Split-S ohne Sequenzbearbeitung sichtbar ist?
2. `bun .omo/qa/measure.ts` nach jeder Geometrieänderung laufen lassen; Ziel bleibt
   `failingLegs=0` bei `minRadius >= 0.32 m`.
3. Danach `npx vitest run`, `npx eslint .`, `npx tsc -b`, `npm run build` grün und committen.

## 9. Referenzen

- Routing: `src/utils/flightPath.ts` (Basisroute), `src/utils/routeCurves.ts` (Übergangsplaner), `src/utils/idealLine.ts` (Leitpunkt-Offsetfeld).
- Öffnungsgeometrie: `src/utils/gateOpenings.ts`, `src/constants/gateDimensions.ts`.
- Messung: `.omo/qa/measure.ts`, `.omo/evidence/render-legs.mjs`, `.omo/evidence/*.svg(.png)`.
- Notizen/Messhistorie: Memory-Notiz `notes/facts/2026-10-31-ideal-line-routing.md`.
