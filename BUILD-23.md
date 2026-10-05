# PANDAs Tripmaster — Build 23

## Sicherung und Rückkehr

Der unveränderte Build 22 ist vor der Bearbeitung dauerhaft im GitHub-Zweig
`backup/v22-before-regularity-2026-10-05` gesichert.
Ausgangscommit: `f004eef5c1496d2dacf9c2a35a43a5481783b2c3`.
Entwicklungszweig: `feature/stages-regularity-v23`.

Das ist eine Sicherung des Programmcodes. Persönliche Zähler und GPS-Aufzeichnungen
liegen weiterhin auf dem jeweiligen Gerät in localStorage und IndexedDB. Build 23
ändert weder deren Speicherformat noch die bisherigen Schlüssel. Die neue Messung
nutzt ausschließlich den zusätzlichen Schlüssel `tripmasterRegularityV1`.

Für eine Rückkehr die vier Anwendungsdateien aus der Sicherung als neuen Commit
auf main übernehmen: index.html, route-map.js, manifest.webmanifest, sw.js.
In diesen Dateien sämtliche App-/Cache-Kennungen auf eine **neue, höhere Version**
als die zuletzt veröffentlichte Version setzen (nach 23 beispielsweise 24).
Damit lädt die PWA wieder den alten Programmstand mit einer frischen Cache-Kennung.
Kein Force-Push und kein Zurücksetzen der Git-Historie nötig. regularity.js wird vom
alten Programmstand nicht geladen und kann im selben Commit entfernt werden.
Keine Browserdaten löschen oder App neu installieren: Das würde die lokal
aufgezeichneten Fahrten gefährden. Ein Code-Rollback setzt Fahrdaten nicht zurück.

## Bedienung

- Route: Eine einzelne Etappe über das Auswahlfeld, mehrere über die Häkchen,
  die gesamte Rallye über ALLE; KEINE leert die Auswahl.
- Jede Etappe besitzt eine eigene Linie. S + Nummer markiert den Start,
  E + Nummer das Ende. Der Ausschnitt umfasst alle gewählten Punkte.
- Online mit OpenStreetMap, offline dieselben getrennten Linien auf dunklem Grund.
- ROADBOOK: GLEICHMÄSSIGKEIT öffnet die Eingabe im bestehenden Fenster.
  Kilometer mit Komma/Punkt und Sollzeit als mm:ss. Der Soll-Schnitt wird berechnet.
- Ein eigener Start benötigt einen aktuellen GPS-Fix mit maximal ±25 m Genauigkeit.
  Die normale Messung läuft in ihrem bisherigen Zustand unabhängig weiter.
- Reststrecke, Restzeit, Soll-Ø, Ø seit eigenem Start und Zeitabweichung werden angezeigt.
  Positive Abweichung = zu spät, negative = zu früh. Die Zeit läuft auch im Stand weiter.
- Bei Erreichen der Strecke endet nur diese Messung automatisch. Die Zielzeit wird
  zwischen den bestätigten GPS-Punkten interpoliert. Zeitablauf allein beendet sie nicht.
- ROADBOOK blendet die laufende Messung aus, ohne sie zu stoppen; ihr Knopf zeigt GLP LÄUFT.
- ETAPPE AUF NULL, Korrekturen, Haupt-PAUSE und ALLE AUF NULL ändern die separate
  Gleichmäßigkeitsmessung nicht. MESSUNG STOPPEN stoppt nur diese Messung.
- GPS-Unterbrechungen werden angezeigt. Zeit läuft weiter; fehlende Strecke wird
  nicht erfunden. Nach Neuladen bleibt der gespeicherte Zwischenstand erhalten.

## Prüfung

Bestanden mit Node und jsdom:
- Vollständiger App-Start und DOM-Bedienung mit simuliertem GPS/IndexedDB.
- Ein-/Mehrfach-/Leerauswahl und Summen über ausgewählte Etappen.
- Unabhängige Messungen: Etappen-Reset, Gesamtkorrektur, Hauptpause und Gesamtreset.
- GPS-Startprüfung, Zielinterpolation, eingefrorenes Ergebnis, Zeitüberschreitung,
  GPS-Lücken und Wiederaufnahme aus gespeichertem Zustand.
- Getrennte Linien, nummerierte Endpunkte, erfolgreiche/fehlgeschlagene Kartenkacheln
  und exakter Offline-Rückfall.
- JavaScript-Syntax und Service-Worker-Shell einschließlich regularity.js.

Ausführen: `node tests/regularity.cjs` und `node tests/integration.cjs` (jsdom erforderlich).
`node tests/browser.cjs` ist der Playwright-Test für mobile Größen und Offline-Neuladen.
Er wurde auf Build 23 **nicht ausgeführt**: Hier fehlt ein ausführbarer Browser und
der Chromium-Download lieferte kein gültiges Archiv. Visuelle Prüfung auf einem
realen iPhone und ein Fahrtest stehen deshalb aus. Keine Behauptung einer
zertifizierten Rallye-Zeitmessung oder lückenlosen iOS-Hintergrundaufzeichnung.
