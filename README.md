# PulseRun – Cloud-Fix

Diese Version behebt JavaScript-Syntaxfehler durch echte Zeilenumbrüche innerhalb von Textzeichenketten. Die App sollte dadurch wieder starten und beim Registrieren aussagekräftigere Fehlermeldungen anzeigen.

## Veröffentlichen
1. ZIP entpacken.
2. Alle enthaltenen Dateien ins Stammverzeichnis des GitHub-Repositories `A-L2611/PulseRun` hochladen und vorhandene Dateien ersetzen.
3. In Supabase unter Authentication → URL Configuration als Site URL `https://a-l2611.github.io/PulseRun/` und als Redirect URL `https://a-l2611.github.io/PulseRun/**` eintragen.
4. `supabase-setup.sql` im Supabase SQL Editor ausführen, falls noch nicht geschehen.
5. Warten, bis GitHub Pages aktualisiert wurde. Auf dem iPhone gegebenenfalls Safari-Website-Daten/Service-Worker-Cache aktualisieren, falls noch alte Dateien erscheinen.

Die Datei `config.js` enthält die Projekt-URL und den vom Nutzer bereitgestellten öffentlichen Publishable Key. Niemals einen Secret- oder service_role-Key in eine Website eintragen.


## Zusätzlicher Fix für den iPhone-API-Key-Fehler
Diese Ausgabe erhöht die Cache-Version auf v4, lädt `config.js` und `app.js` netzwerkpriorisiert und versieht die Skripte mit einem Versionsparameter. Damit wird verhindert, dass ein alter Service-Worker eine veraltete Supabase-Konfiguration weiter ausliefert. Wenn `Invalid API key` danach weiterhin erscheint, muss im Supabase-Dashboard ein neuer Publishable Key erstellt und in `config.js` eingetragen werden; dieser Fehler lässt sich nicht allein durch Cache-Leeren beheben.
