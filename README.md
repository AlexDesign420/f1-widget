# 🏎️ F1 Live 2026 — macOS Desktop Widget

[![macOS](https://img.shields.io/badge/platform-macOS-000000?logo=apple)](https://www.apple.com/macos/)
[![Übersicht](https://img.shields.io/badge/widget-Übersicht-ff69b4)](http://tracesof.net/uebersicht/)
[![Python](https://img.shields.io/badge/python-3.9+-3776ab?logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Ein macOS Desktop-Widget für Übersicht, das während einer Formel-1-Session Live-Daten anzeigt: Live-Standings, Rundenzeiten, Pit-Stops, Team-Radio, Fahrerwertung, Rennkalender und Audio-Streams. Außerhalb von Sessions zeigt es den Countdown zum nächsten Rennen und die aktuellen Meisterschaftsstände.

---

## ✨ Features

| Feature | Beschreibung |
|---------|-------------|
| 🏁 **Live-Standings** | Positionen, Gaps, Rundenzeiten, Reifen, Pit-Stops in Echtzeit |
| 📡 **Race Control** | Safety Car, Red Flag, VSC — mit Banner und TTS-Ansage |
| 📻 **Team Radio** | Letzte Funksprüche mit Fahrer-Zuordnung |
| 🎙️ **Audio-Streams** | Live-Kommentare über integrierte Stream-Quellen |
| 🔊 **Text-to-Speech** | Deutsche Ansagen bei wichtigen Ereignissen (Positionen, Pit, SC, etc.) |
| 🏆 **Meisterschaft** | Fahrer- und Konstrukteurswertung (Jolpica API) |
| 📅 **Rennkalender** | Komplette Saison-Übersicht mit Countdown zum nächsten Rennen |
| 🌤️ **Wetter** | Luft- & Streckentemperatur, Wind, Regen |

---

## 🏗️ Architektur

```
f1.jsx  (Übersicht Widget, refreshFrequency: 3000ms)
  │
  ├── shell command (alle 3s):
  │     └── python3 ~/.f1/engine.py  →  ~/.f1/feed.json, ~/.f1/state.json
  │
  └── fetch() (alle 3s)  →  http://127.0.0.1:9877
        ├── GET  /api/status         Server + mpv Zustand
        ├── GET  /api/streams        Verfügbare Streams mit Online-Status
        ├── POST /api/play           Audio-Stream starten
        ├── POST /api/stop           Audio stoppen
        ├── POST /api/volume         Lautstärke setzen
        ├── GET  /api/session        Live-Standings + Race Control (OpenF1)
        ├── GET  /api/standings      Meisterschaftswertungen (Jolpica)
        ├── GET  /api/schedule       Rennkalender (Jolpica)
        ├── GET  /api/radio          Team-Radio (OpenF1)
        └── POST /api/shift          Desktop-Icons verschieben
```

**Datenquellen:**
- [OpenF1 API](https://openf1.org/) — Live-Daten (kostenlos, kein API-Key)
- [Jolpica API](https://jolpi.ca/) — Kalender & Wertungen (Ergast-Nachfolger, kostenlos)

---

## 🚀 Quick Start

### 1. Voraussetzungen

- macOS mit [Übersicht](http://tracesof.net/uebersicht/) installiert
- Python 3.9+ und pip3
- [mpv](https://mpv.io/) (`brew install mpv`)

### 2. Installation

```bash
cd /Pfad/zum/F1\ widget
./install.sh
```

Das Script:
- Erstellt `~/.f1/` und kopiert Backend-Dateien hin
- Installiert Python-Dependencies
- Kopiert `f1.jsx` in den Übersicht-Widgets-Ordner
- Startet den Flask-Server im Hintergrund

### 3. Übersicht neu starten

In Übersicht auf **"Refresh All Widgets"** klicken oder die App neu starten.

---

## 🎮 Bedienung

| Aktion | Beschreibung |
|--------|-------------|
| **F1 Badge klicken** | Widget ein-/ausblenden |
| **Radio ▶** | Side-Panel mit Race Control, Team Radio & Wetter öffnen |
| **📻 Audio & Streams** | Stream-Panel aufklappen, Stream wählen und abspielen |
| **🏆 Fahrerwertung** | Aktuelle WM-Stand aufklappen |
| **📅 Rennkalender** | Komplette Saison-Übersicht |
| **🔊 Tor-Sound** | Text-to-Speech ein-/ausschalten |

---

## 🛠️ API-Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/status` | GET | Server-Status & Audio-Zustand |
| `/api/streams` | GET | Verfügbare Streams mit Online-Status |
| `/api/play` | POST | `{"url": "...", "volume": 80}` |
| `/api/stop` | POST | Audio-Wiedergabe stoppen |
| `/api/volume` | POST | `{"level": 70}` |
| `/api/session` | GET | Live-Session mit Standings, Race Control, Wetter |
| `/api/standings` | GET | Fahrer- & Konstrukteurswertung |
| `/api/schedule` | GET | Rennkalender + nächstes Rennen |
| `/api/radio` | GET | Team-Radio-Nachrichten |
| `/api/shift` | POST | `{"dir": "right"\|"left"}` Desktop-Icons verschieben |

---

## 🐞 Troubleshooting

**Widget zeigt keine Daten**
→ Prüfe ob der Server läuft: `curl http://127.0.0.1:9877/api/status`
→ Logs prüfen: `tail -f ~/.f1/server.log`

**Keine Audio-Wiedergabe**
→ Ist mpv installiert? `which mpv`
→ Stream-URL testen: `mpv --no-video <URL>`

**Streams werden nicht angezeigt**
→ Der Server prüft alle 120 Sekunden die Erreichbarkeit — kurz warten
→ `curl -I --max-time 5 <STREAM_URL>` testen

**Keine Live-Daten**
→ OpenF1 liefert Daten nur während aktiver Sessions
→ Außerhalb Sessions zeigt das Widget Countdown & Meisterschaft

---

## 📁 Dateistruktur

```
F1 widget/
├── f1.jsx                    ← Übersicht Widget
├── f1_server.py              ← Flask Backend
├── engine.py                 ← Event-Detection + TTS
├── sources.json              ← Radio/Stream-Quellen
├── shift_config.example.json ← Desktop-Shift Template
├── install.sh                ← Installer
├── requirements.txt          ← Python Dependencies
├── README.md                 ← Diese Datei
└── LICENSE                   ← MIT
```

---

## 📄 Lizenz

MIT License — siehe [LICENSE](LICENSE)

---

> **Hinweis:** Dieses Projekt nutzt die öffentlichen APIs von [OpenF1](https://openf1.org/) und [Jolpica](https://jolpi.ca/). Es steht in keiner Verbindung zu Formula 1, FIA oder verwandten Unternehmen.
