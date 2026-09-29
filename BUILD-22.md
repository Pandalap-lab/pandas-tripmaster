# Build 22 — 29.09.2026

## Änderungen

- ETAPPENROUTE zeigt online OpenStreetMap-Kacheln unter der orangefarbenen GPS-Strecke. Karte und Strecke verwenden dieselbe Mercator-Projektion. Nur der sichtbare Ausschnitt wird geladen; Quellenangabe ist eingeblendet.
- Offline, bei Kachelfehlern oder nach acht Sekunden ohne Antwort bleibt die bisherige dunkle SVG-Streckenzeichnung erhalten. Verbindungswechsel aktualisieren die geöffnete Ansicht. Verspätete Antworten können eine geschlossene oder gewechselte Route nicht überschreiben.
- Statistik und Auswahl der aufgezeichneten Punkte bleiben unverändert; Start grün, Ende rot. Die Kartenkomponente schreibt keine Mess- oder Protokolldaten.
- Route-/Einstellungen-Laschen orientieren sich an der tatsächlichen Position der GESAMT-Anzeige, auch nach Größenwechsel.
- AUTOMATISCH bleibt innerhalb der Einstellungskarte; bei Platzmangel bricht die Zeile um.
- ALLE AUF NULL? verwendet einen Dialog im App-Stil mit großen Tasten: OK rot, Abbrechen grün. Abbrechen und Escape lassen Werte unverändert. OK ruft die bestehende Rücksetzfunktion auf.
- Abstand zwischen Uhr und ETAPPE-AUF-NULL-Taste verkleinert. Ziffernwalze auf tatsächliche Zeichenhöhe abgestimmt; reduzierte Bewegung berücksichtigt.
- Service Worker, Start-URL und Cache auf Version 22 vereinheitlicht. Kartenkacheln verwenden ausschließlich den normalen HTTP-Cache des Browsers und werden nicht im Offline-App-Cache gespeichert.

## Prüfung

- JavaScript-Syntax und Git-Diff geprüft.
- Quelltextvergleich mit Vorgängerversion: Distanz-Engine, GPS-Verarbeitung, Unterbrechungsbehandlung, Protokoll/Export und Rücksetzfunktion unverändert.
- Automatisierte Browserprüfung in Microsoft Edge bei 320×568, 390×844, 430×932 und 844×390: Laschenposition und AUTOMATISCH passen.
- OK, Abbrechen und Escape geprüft; Gesamt-Korrektur bleibt beim Abbrechen erhalten, OK setzt zurück und zeigt START.
- Teststrecke in lokaler Testdatenbank: Kartenanzeige mit simulierten und echten OSM-Kacheln geprüft. Statistik und Markierungen erhalten; Offline-Rückfall mit identischem SVG-Inhalt; blockierter Kartenserver bleibt bei der dunklen Streckenansicht.
- Offline-Neuladen mit echtem Service Worker einschließlich neuer Kartenkomponente erfolgreich. Keine JavaScript-Laufzeitfehler in den Funktionsprüfungen.
- Hauptansicht, Rücksetzdialog und echte Kartenansicht anhand von Screenshots visuell geprüft.

Reproduzierbar mit Node.js, installiertem `playwright` und Microsoft Edge: `node tests/browser.cjs`. Für den zusätzlichen Test mit echten Kartenkacheln Umgebungsvariable `REAL_MAP=1` setzen. Standardmäßig verwendet der Test simulierte Kacheln und benötigt keinen Kartendienst. Screenshots liegen im temporären Ordner `tripmaster-tests-*`.

Die App wird direkt als statische PWA ausgeliefert; ein Compiler-/Bundler-Schritt ist nicht erforderlich. Keine reale GPS-Testfahrt und kein Test auf iOS-Hardware durchgeführt.

Kartenbetrieb berücksichtigt die [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/).
