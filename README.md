# Golfmanager

Golf-App für Android & iOS (Expo / React Native, TypeScript) mit optionaler Vernetzung über Supabase.

## Funktionen
- **Platzauswahl**: Schweizer Plätze mit Par, Stroke Index und Distanz pro Loch und Abschlag, CR/Slope.
- **Profil**: Handicap-Index, Grösse, Spielhand, Heimclub, Schläger-/Ball-Marke, Ballvorrat, Driver-Distanz, Bio.
- **Runde spielen**: Schläge pro Loch erfassen; Platzvorgabe (WHS), Vorgabeschläge, Netto und Stableford werden automatisch berechnet.
- **Lost Balls**: pro Loch erfassbar, zieht direkt vom Ballvorrat im Profil ab (−1 gibt zurück).
- **Historie & Statistik**: alle Runden lokal gespeichert; pro Loch beste/schlechteste Runde mit Datum, Ø, Total.
- **Excel-Export**: Statistik → «Als Excel exportieren (.xlsx)». Blätter: *Runden* (eine Zeile pro Runde), *Löcher* (eine Zeile pro Loch und Runde, für Pivot-Tabellen), *Pro Loch* (Bestwerte), *Info*. Im Browser als Download, am Handy über das Teilen-Menü.
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
> **Aktualisierung:** Wer `backend/schema.sql` früher schon eingespielt hat, führt die neue Fassung einfach nochmal aus (sie ist wiederholbar und löscht nichts). Neu ist die Spalte `public_data` in `profiles`. Ohne sie meldet die App beim Übertragen «Die Datenbank ist noch nicht aktualisiert».
Ohne Supabase läuft alles lokal; der Tab «Freunde» zeigt dann nur einen Hinweis. So schaltest du die Vernetzung frei:

1. **Projekt anlegen**: auf supabase.com ein kostenloses Projekt erstellen (Region z. B. Frankfurt).
2. **Datenbank einrichten**: SQL Editor → neue Abfrage → Inhalt von `backend/schema.sql` einfügen → Run. Das legt Tabellen und Zugriffsregeln (Row-Level-Security) an.
3. **Anmeldung**: Authentication → Providers → Email aktiv (Standard). Authentication → URL Configuration → **Site URL** auf `https://kenjinathor.github.io/Golfmanager/` setzen (Link in der Bestätigungs-Mail).
4. **Zugangsdaten holen**: Project Settings → API Keys → *Publishable key* (`sb_publishable_…`; in älteren Projekten *anon public key*, Reiter «Legacy») und die *Project URL* (auch im grünen «Connect»-Knopf). Der Key ist öffentlich vorgesehen; geschützt sind die Daten durch die Zugriffsregeln. **Nie** den *Secret key* oder `service_role`-Key verwenden.
5. **Web-App**: GitHub → Settings → Secrets and variables → Actions → Secrets `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` anlegen, dann Actions → «Web-App veröffentlichen» → Run workflow.
   **Handy-App/Expo Go**: dieselben zwei Werte in `.env` eintragen (siehe `.env.example`).
6. In der App: Profil → Benutzername setzen (a–z, 0–9, _; min. 3 Zeichen) → Tab «Freunde» → Konto erstellen, E-Mail bestätigen, anmelden.

Im Profil wählst du bei **jedem Feld selbst**, wer es sieht: **Nur für mich** (liegt in deinem Cloud-Konto, kein anderer Spieler kann es lesen; so erscheint es auf allen deinen Geräten), **Für Freunde** (nur bestätigte Freunde) oder **Öffentlich** (alle angemeldeten Spieler, z. B. bei der Suche). Voreinstellung: Name und Handicap öffentlich, alles andere für Freunde. Der Benutzername ist immer öffentlich, sonst wäre man nicht auffindbar. Abgeschlossene Runden sehen nur Freunde.
**Alter:** Eingegeben wird das Geburtsdatum, angezeigt und übertragen wird nur das Alter (Zahl). Das Geburtsdatum bleibt auf dem Gerät und wird in keinem Fall übertragen (auch nicht für «Öffentlich»); ein Test stellt das sicher.
**Konto löschen:** im Tab «Freunde» unten (zweistufige Bestätigung). Löscht Login, Profil, Cloud-Runden und Freundschaften endgültig; die Daten auf dem Gerät bleiben. Dafür muss `backend/schema.sql` einmal neu ausgeführt werden (Funktion `delete_my_account`).

Technik: Öffentliches liegt in `profiles` (Name, Handicap, `public_data`), Freundes-Angaben in `profile_details`; Felder auf «Nur für mich» fehlen dort ganz und liegen in `profile_private`, das nur der Besitzer lesen darf. Das Geburtsdatum wird nirgends gespeichert ausser auf dem Gerät. Unter «Wer sieht was?» steht der Stand der letzten Übertragung samt Fehlermeldung und ein Knopf «Jetzt übertragen».
Freundschaften: Anfragen annehmen oder ablehnen (abgelehnte verschwinden), gesendete zurückziehen, Freunde entfernen (die Verbindung wird für beide gelöscht). Neue Anfragen zeigt ein Zeichen am Reiter «Freunde» (Abfrage alle 45 Sekunden und beim Öffnen).
Datenschutz: Name, Benutzername und Handicap sind für angemeldete Nutzer suchbar; Runden und Profil-Details (Grösse, Schläger, Bälle …) sehen nur bestätigte Freunde. Die Regeln werden mit `backend/test/run.sh` gegen ein lokales PostgreSQL getestet (Fremde, Selbstbestätigung, umgebogene Anfragen, nicht angemeldet).
**Auf allen Geräten dieselben Daten:** Mit demselben Konto anmelden. Beim Anmelden, beim App-Start und über «Jetzt übertragen» im Profil gleicht die App in beide Richtungen ab: Profil und abgeschlossene Runden werden geladen bzw. hochgeladen, der neuere Profilstand gewinnt, eine auf einem Gerät gelöschte Runde verschwindet auch auf den anderen. Eine laufende (nicht beendete) Runde bleibt nur auf dem Gerät. Wer das Gerät wechselt, sollte vorher die Runde beenden.
**Kleiner Kreis (z. B. 4 Kollegen):** Sobald alle ein Konto haben, in Supabase unter Authentication → Sign In / Providers «Allow new users to sign up» ausschalten, dann kann sich niemand Fremdes registrieren. Die Web-App selbst ist unter ihrer Adresse für jeden erreichbar (nur ohne Anmeldung ist nichts Persönliches zu sehen).

## Platzdaten
`src/data/courses.json` wird aus `data/courses.csv` (eine Zeile pro Loch) und `data/tees.csv` erzeugt: `npm run import-courses`.

**Freigeschaltet ist nur der Golfpark Waldkirch** (13 Einträge) – vollständig aus den offiziellen Scorekarten und Rating-Blättern 2026 (`data/scorecards/`): 4× 9 Loch, 6 Kombinationen, Routen Orange und Schwarz sowie der Kurzplatz (Übungsplatz, 3 Löcher A–C, ohne Rating → nur Brutto). Par, Stroke Index, Distanz pro Abschlag und Course Rating/Slope für Herren und Damen; das Profil enthält dafür die Wertung Herren/Damen. 9-Loch-Runden nutzen den halben Handicap-Index.

Weitere Plätze: Zeilen in `data/courses.csv` + `data/tees.csv` (Format siehe oben, aktuell leer) oder wie bei Waldkirch ein eigener Import in `scripts/import-courses.ts`; nur Daten aus offiziellen Scorekarten eintragen und `verified=true` setzen.

## Bekannte Lücken / nächste Schritte
- Lost Ball erhöht die Schlagzahl nicht automatisch (Strafschlag manuell eingeben).
- Handicap-Index wird nicht automatisch aus Runden fortgeschrieben.
