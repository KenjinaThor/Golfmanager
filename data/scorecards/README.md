# Scorekarten-Rohdaten

`waldkirch-loops.csv`: Migros Golf Waldkirch, Scorekarte «Alle Plätze» 2026 (offizielle PDF des Golfparks).
Vier 9-Loch-Plätze (blau, gelb, rot, grün); Distanz in m bis Mitte Grün.
- `index_front` / `index_back`: Stroke Index, wenn der Platz als Loch 1–9 bzw. 10–18 gespielt wird (Kartenspalte «1/10» usw.).
- `tee_row`: Zahl in der Kartenzeile links (28/27/25/24 …); Bedeutung und Abschlagfarbe sind auf der Karte nicht erklärt.
- Geprüft: Par-Summen und Distanz-Totale stimmen mit der Karte überein, Stroke Index je Platz = 1…18 genau einmal.
- Kombinationen: jeder Platz kann als Loch 1–9 mit jedem anderen als Loch 10–18 gespielt werden (12 geordnete Paare). Loch 1–9 nutzen `index_front`, Loch 10–18 `index_back`.
- Abschläge: Zeilenreihenfolge = Back, Back Standard, Standard, Front Standard (laut Rating-Blättern; Zeilenzahlen = Markernummern).

## waldkirch-ratings.csv
Quelle: offizielle Blätter «Waldkirch … 2026 – Course Handicaps» (12 Routen: Blau, Gelb, Grün, Rot, Blau-Gelb, Blau-Grün, Blau-Rot, Grün-Gelb, Rot-Gelb, Rot-Grün, Orange, Schwarz; je Herren und Damen).
- Abschläge heissen nach Marker: Back Tees, Back Standard Tees, Standard Tees, Front Standard Tees – **keine Farben**.
- Kombinationen: Markerpaare wie `R27-Gr28` wählen je Platz die Distanzzeile (Loch 1–9 erster, 10–18 zweiter Platz).
- 9-Loch-Plätze: Stroke Index = Rang 1–9 der «vorne»-Werte (entspricht dem Heft). Platzvorgabe = HI/2 × Slope/113 + (CR − Par).
- Kontrolle: `npm run import-courses` prüft Par je Route gegen das Rating-Blatt; die Formel stimmt bei 10.817 von 10.828 Tabellenwerten exakt (Rest: ±1 an Tabellenkanten).

## waldkirch-kurzplatz.csv
Quelle: «26_SK_Waldkirch_03_Loch» (Kurzplatz). 3 Löcher A–C (Par 3, Par 9 gesamt); zwei Abschlagzeilen (Marker 04: 379 m, Marker 03: 349 m). Die Karte bietet Platz für zwei Runden (A–C steht zweimal), der Platz selbst hat nur 3 Löcher. Kein Rating/Slope → in der App ohne Platzvorgabe, nur Brutto. Stroke Index 3/2/1.

## Lochbilder (`assets/holes/*.webp`)
Ausschnitte aus dem Platzführer «Waldkirch» (Strokesaver / Migros Golf Waldkirch), pro Loch eine Seite mit Layout, Distanzen und Index beider Nummerierungen.
- Dateiname = Schlüssel: `blau-1` … `gruen-9`; dazu `uebersicht` (Platzplan) und `legende` (Zeichenerklärung).
- `npm run import-courses` verknüpft jedes Loch aller Routen mit seinem Bild und erzeugt `src/data/holeImages.ts` (nicht von Hand ändern).
- Lücke: **Rot 9** hat noch kein Bild (Datei `assets/holes/rot-9.webp` ablegen und `npm run import-courses` ausführen).
- Die Bilder gehören dem Golfpark bzw. Strokesaver. Vor einer öffentlichen Veröffentlichung der App die Nutzungserlaubnis klären.
