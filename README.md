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

**Freigeschaltet ist nur der Golfpark Waldkirch** (13 Einträge) – vollständig aus den offiziellen Scorekarten und Rating-Blättern 2026 (`data/scorecards/`): 4× 9 Loch, 6 Kombinationen, Routen Orange und Schwarz sowie der Kurzplatz (Übungsplatz, 3 Löcher A–C zweimal gespielt, ohne Rating → nur Brutto). Par, Stroke Index, Distanz pro Abschlag und Course Rating/Slope für Herren und Damen; das Profil enthält dafür die Wertung Herren/Damen. 9-Loch-Runden nutzen den halben Handicap-Index.

Weitere Plätze: Zeilen in `data/courses.csv` + `data/tees.csv` (Format siehe oben, aktuell leer) oder wie bei Waldkirch ein eigener Import in `scripts/import-courses.ts`; nur Daten aus offiziellen Scorekarten eintragen und `verified=true` setzen.

## Bekannte Lücken / nächste Schritte
- Lost Ball erhöht die Schlagzahl nicht automatisch (Strafschlag manuell eingeben).
- Handicap-Index wird nicht automatisch aus Runden fortgeschrieben.
- Rundensync ist einseitig (Gerät → Cloud); Wiederherstellung auf neuem Gerät fehlt noch.
