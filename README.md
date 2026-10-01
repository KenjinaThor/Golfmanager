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

## Web-App (PWA)
Die App läuft auch im Browser und lässt sich auf dem Handy zum Startbildschirm hinzufügen (Offline-fähig, eigenes Icon).
- Lokal testen: `npm run web`
- Veröffentlichen: `.github/workflows/deploy-web.yml` baut bei jedem Push auf `main` und veröffentlicht auf GitHub Pages
  (`https://<user>.github.io/Golfmanager/`). Einmalig: Repository → Settings → Pages → Source = **GitHub Actions**.
- Für «Freunde» im Web: Repository-Secrets `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` anlegen.
- Anderer Unterpfad/Hosting: `EXPO_BASE_URL=/pfad npx expo export --platform web`, Ordner `dist/` ausliefern (HTTPS nötig für den Service Worker).
- Installieren: iPhone Safari → Teilen → «Zum Home-Bildschirm»; Android Chrome → Menü → «App installieren».

## Vernetzung (Supabase) einrichten
Ohne Supabase läuft alles lokal; der Tab «Freunde» zeigt dann nur einen Hinweis. So schaltest du die Vernetzung frei:

1. **Projekt anlegen**: auf supabase.com ein kostenloses Projekt erstellen (Region z. B. Frankfurt).
2. **Datenbank einrichten**: SQL Editor → neue Abfrage → Inhalt von `backend/schema.sql` einfügen → Run. Das legt Tabellen und Zugriffsregeln (Row-Level-Security) an.
3. **Anmeldung**: Authentication → Providers → Email aktiv (Standard). Authentication → URL Configuration → **Site URL** auf `https://kenjinathor.github.io/Golfmanager/` setzen (Link in der Bestätigungs-Mail).
4. **Zugangsdaten holen**: Project Settings → API Keys → *Publishable key* (`sb_publishable_…`; in älteren Projekten *anon public key*, Reiter «Legacy») und die *Project URL* (auch im grünen «Connect»-Knopf). Der Key ist öffentlich vorgesehen; geschützt sind die Daten durch die Zugriffsregeln. **Nie** den *Secret key* oder `service_role`-Key verwenden.
5. **Web-App**: GitHub → Settings → Secrets and variables → Actions → Secrets `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` anlegen, dann Actions → «Web-App veröffentlichen» → Run workflow.
   **Handy-App/Expo Go**: dieselben zwei Werte in `.env` eintragen (siehe `.env.example`).
6. In der App: Profil → Benutzername setzen (a–z, 0–9, _; min. 3 Zeichen) → Tab «Freunde» → Konto erstellen, E-Mail bestätigen, anmelden.

Datenschutz: Name, Benutzername und Handicap sind für angemeldete Nutzer suchbar; Runden und Profil-Details (Grösse, Schläger, Bälle …) sehen nur bestätigte Freunde. Die Regeln werden mit `backend/test/run.sh` gegen ein lokales PostgreSQL getestet (Fremde, Selbstbestätigung, umgebogene Anfragen, nicht angemeldet).
Synchronisiert werden Profil und abgeschlossene Runden vom Gerät in die Cloud; die Wiederherstellung auf einem neuen Gerät fehlt noch.

## Platzdaten
`src/data/courses.json` wird aus `data/courses.csv` (eine Zeile pro Loch) und `data/tees.csv` erzeugt: `npm run import-courses`.

**Freigeschaltet ist nur der Golfpark Waldkirch** (13 Einträge) – vollständig aus den offiziellen Scorekarten und Rating-Blättern 2026 (`data/scorecards/`): 4× 9 Loch, 6 Kombinationen, Routen Orange und Schwarz sowie der Kurzplatz (Übungsplatz, 3 Löcher A–C, ohne Rating → nur Brutto). Par, Stroke Index, Distanz pro Abschlag und Course Rating/Slope für Herren und Damen; das Profil enthält dafür die Wertung Herren/Damen. 9-Loch-Runden nutzen den halben Handicap-Index.

Weitere Plätze: Zeilen in `data/courses.csv` + `data/tees.csv` (Format siehe oben, aktuell leer) oder wie bei Waldkirch ein eigener Import in `scripts/import-courses.ts`; nur Daten aus offiziellen Scorekarten eintragen und `verified=true` setzen.

## Bekannte Lücken / nächste Schritte
- Lost Ball erhöht die Schlagzahl nicht automatisch (Strafschlag manuell eingeben).
- Handicap-Index wird nicht automatisch aus Runden fortgeschrieben.
- Rundensync ist einseitig (Gerät → Cloud); Wiederherstellung auf neuem Gerät fehlt noch.
