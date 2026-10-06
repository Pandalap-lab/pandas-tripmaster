# Build 24 – mobile Bedienung und Etappenkarte

Ausgangsstand: Build 23, Commit `bfa8a01b5afafa4ccc6500f620f264d7377e4e2a`.
Rückkehrpunkt in GitHub: `backup/v23-before-layout-map-2026-10-06`.

## Änderungen

- Responsive Hauptansicht: sichtbare Start-/Reset-Tasten in den geprüften Größen 320×568, 390×844, 430×932 und 844×390. Sichere Displayränder werden berücksichtigt; bei noch kleineren verfügbaren Flächen bleibt vertikales Scrollen möglich.
- Einheitliches Dezimalkomma und eindeutige Beschriftungen für Tripmaster und GLP.
- GLP-Sollzeit mit getrennten Minuten-/Sekundenfeldern. Validierung verhindert Sekunden >59; der Entwurf bleibt beim Wechsel zum Roadbook im Arbeitsspeicher erhalten.
- Einklappbare Etappenauswahl mit Auswahlanzahl, Einzel-/Mehrfachauswahl, alle/keine.
- Kräftige GPS-Linien mit weißer Außenkante und dunkler Umrandung, gedämpfter Online-Kartenhintergrund, Etappenlegende mit Hervorhebung.
- Verschieben, Mausrad-, Tasten- und Zwei-Finger-Zoom sowie Einpassen. Die Karte löst keine seitlichen Schließgesten mehr aus. Live-Aktualisierungen derselben Auswahl erhalten den Kartenausschnitt.
- Start-/Endpunkte werden bei enger Nachbarschaft gruppiert. Beschriftungen werden nur an freien Stellen gesetzt; Antippen einer Markierung zeigt alle zugehörigen Etappen an. Kleine Verbindungslinien erhalten den Bezug zu den tatsächlichen Endpunkten.
- Exporthinweise in den Einstellungen erklären lokale Datenhaltung und die manuelle Übermittlung einer CSV-/GPX-Datei zur Auswertung.
- Neuer Offline-Cache `tripmaster-v24-github`. Die Bereinigung betrifft ausschließlich Tripmaster-Caches.

## Daten und abgegrenzter Umfang

Der GPS-Filter und die Distanzbuchhaltung sind unverändert. IndexedDB bleibt `pandas-tripmaster-gps` in Version 2; die vorhandenen Zähler- und GLP-Wiederherstellungsschlüssel bleiben erhalten. Es wird keine GLP-Historie, kein neuer GLP-Export und keine automatische Übermittlung von Messdaten eingeführt. Der vorhandene einzelne GLP-Wiederherstellungszustand bleibt nutzbar. Die freiwillig abrufbaren OpenStreetMap-Kacheln benötigen eine Online-Verbindung; die GPS-Geometrie funktioniert unabhängig davon.

GitHub sichert den Programmstand, nicht die Fahrtdaten des jeweiligen Geräts. CSV und GPX bleiben unverändert: GPX enthält auch verworfene Punkte mit Prüfkennzeichen; für die Bewertung der gezählten Strecke ist die CSV vorzuziehen.

## Prüfung

Ausgeführt mit Node, jsdom und Chromium/Playwright:

- `tests/regularity.cjs`: Validierung, unabhängige Messung, interpoliertes Ende, eingefrorene Ergebnisse, GPS-Lücken, Wiederaufnahme, Überschreitung der Sollzeit sowie Karten-Fallback.
- `tests/integration.cjs`: Auswahl/Statistik und parallele Tripmaster-/GLP-Nutzung einschließlich Reset, Pause und Korrekturen.
- `tests/browser.cjs`: vier Bildschirmgrößen, Laschen, Einstellungen, Resetdialog, Online-/Offline-/Fehlerfall und Offline-Neuladen.
- `tests/build24.cjs`: tatsächlich sichtbare Bedienelemente, GLP-Entwurf, getrennte Zeitfelder, überlappungsfreie Label-Flächen, gruppierte Markierungen, Details, Verschieben, echte Chromium-Touch-Ereignisse für Pinch, Einpassen, Legende und Auswahlzustand.
- `tests/update.cjs`: echter Service-Worker-Wechsel Build 23 → 24, anschließend Offline-Neuladen. Zähler, GPS-Aufzeichnungen und GLP-Wiederherstellung bleiben erhalten; ein fremder Cache bleibt unberührt.

Für den Update-Test `PREVIOUS_BUILD_PATH` auf einen lokalen Checkout des genannten Backup-Commits setzen. Testabhängigkeiten sind `jsdom` und `playwright` mit installiertem Chromium; sie müssen über die normale Node-Modulauflösung oder `NODE_PATH` erreichbar sein.

Die Browsertests verwenden künstliche GPS-Daten. Ein realer iPhone-/Safari-Test und eine Vergleichsfahrt zur Messgenauigkeit sind damit nicht ersetzt.

## Rückkehr zu Build 23

Der Backup-Zweig enthält den vollständigen ursprünglichen Programmstand. Zur Rückkehr diesen Stand in einem neuen Commit auf den Veröffentlichungszweig übernehmen und GitHub Pages erneut bereitstellen; keine Historie erzwingen oder lokale Fahrtdaten löschen. Der Referenzpunkt bleibt dabei erhalten.
