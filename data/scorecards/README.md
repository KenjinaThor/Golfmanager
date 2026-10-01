# Scorekarten-Rohdaten

`waldkirch-loops.csv`: Migros Golf Waldkirch, Scorekarte «Alle Plätze» 2026 (offizielle PDF des Golfparks).
Vier 9-Loch-Plätze (blau, gelb, rot, grün); Distanz in m bis Mitte Grün.
- `index_front` / `index_back`: Stroke Index, wenn der Platz als Loch 1–9 bzw. 10–18 gespielt wird (Kartenspalte «1/10» usw.).
- `tee_row`: Zahl in der Kartenzeile links (28/27/25/24 …); Bedeutung und Abschlagfarbe sind auf der Karte nicht erklärt.
- Geprüft: Par-Summen und Distanz-Totale stimmen mit der Karte überein, Stroke Index je Platz = 1…18 genau einmal.
- Kombinationen: jeder Platz kann als Loch 1–9 mit jedem anderen als Loch 10–18 gespielt werden (12 geordnete Paare). Loch 1–9 nutzen `index_front`, Loch 10–18 `index_back`.
- Abschläge: Zeilenreihenfolge = Weiss, Gelb, Blau, Rot (Annahme: längste → kürzeste Zeile; deckt sich mit Totalen auf Golfpass, aber nicht auf der Karte beschriftet).
- Course Rating/Slope fehlen auf der Karte → `null`. `npm run import-courses` erzeugt die 12 Kombinationen.

## waldkirch-ratings.csv
Quelle: «Blau 9-Loch Waldkirch 2026 – Course Handicaps» (Stand 25.03.26), offizielle PDF. Nur Platz Blau; Gelb, Rot, Grün fehlen noch.
- Abschläge heissen laut PDF nach Markern: B28 Back Tees, B27 Back Standard, B25 Standard, B24 Front Standard – **keine Farben**
  (die frühere Annahme Weiss/Gelb/Blau/Rot ist damit nicht belegt). Herren und Damen haben getrennte CR/Slope.
- Werte sind 9-Loch-Ratings (Par 35). Kontrolle der Tabelle: Platzvorgabe(9) = HI/2 × Slope/113 + (CR − Par).
