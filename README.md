# Golfmanager

Golf-App für Android & iOS (Expo / React Native, TypeScript) mit optionaler Vernetzung über Supabase.

## Funktionen
- **Platzauswahl**: Schweizer Plätze mit Par, Stroke Index und Distanz pro Loch und Abschlag, CR/Slope.
- **Profil**: Handicap-Index, Grösse, Spielhand, Heimclub, Schläger-/Ball-Marke, Ballvorrat, Driver-Distanz, Bio.
- **Runde spielen**: Schläge pro Loch erfassen; Platzvorgabe (WHS), Vorgabeschläge, Netto und Stableford werden automatisch berechnet.
- **Lost Balls**: pro Loch erfassbar, zieht direkt vom Ballvorrat im Profil ab (−1 gibt zurück).
- **Historie & Statistik**: alle Runden lokal gespeichert; pro Loch beste/schlechteste Runde mit Datum, Ø, Total.
- **Freunde**: Login, Benutzer suchen, Anfragen, Profil und Runden bestätigter Freunde einsehen.

## Start
```bash
npm install
cp .env.example .env   # Supabase-Werte eintragen (optional)
npm start              # Expo Go auf dem Handy, oder: npm run android / npm run ios
npm test               # Berechnungslogik
```

## Vernetzung (Supabase)
1. Gratis-Projekt auf supabase.com anlegen, `backend/schema.sql` im SQL-Editor ausführen.
2. URL und anon key in `.env` eintragen.
Die App ist offline-first: ohne Login bleibt alles lokal. Mit Login werden Profil und abgeschlossene Runden synchronisiert.
Datenschutz per Row-Level-Security: Runden und Profil-Details sind nur für bestätigte Freunde lesbar.

## Platzdaten
`src/data/courses.json` wird aus `data/courses.csv` (eine Zeile pro Loch) und `data/tees.csv` erzeugt: `npm run import-courses`.

**Echte Daten:** Golfpark Waldkirch (4 Neunlochplätze, 12 geordnete 18-Loch-Kombinationen) stammt aus der offiziellen Scorekarte 2026 (`data/scorecards/`). Course Rating/Slope fehlen dort; die App nähert die Platzvorgabe dann über den Handicap-Index an und weist darauf hin.

**Wichtig:** Die übrigen 10 Plätze haben echte Namen, aber **Platzhalter-Werte** (Par/Distanzen/Rating/Slope, `verified=false`, in der App als ⚠ markiert).
Die offiziellen Scorekarten aller ~100 Schweizer Plätze liegen bei den Clubs bzw. Swiss Golf; sie müssen in die CSVs übernommen werden (`verified=true`).

## Bekannte Lücken / nächste Schritte
- Lost Ball erhöht die Schlagzahl nicht automatisch (Strafschlag manuell eingeben).
- Handicap-Index wird nicht automatisch aus Runden fortgeschrieben.
- Rundensync ist einseitig (Gerät → Cloud); Wiederherstellung auf neuem Gerät fehlt noch.
