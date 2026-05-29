#!/bin/bash
set -e

DIR="$HOME/.f1"
WIDGET_DIR="$HOME/Library/Application Support/Übersicht/widgets"

echo "🏎️  F1 Live Widget — Installation"

# Erstelle Daten-Verzeichnis
mkdir -p "$DIR"

# Kopiere Backend-Dateien
cp engine.py f1_server.py sources.json "$DIR/"

# Kopiere Widget in Übersicht
mkdir -p "$WIDGET_DIR"
cp f1.jsx "$WIDGET_DIR/"

# Python Dependencies (kein beautifulsoup4 nötig)
pip3 install flask flask-cors requests --quiet

# Stoppe alten Server falls läuft
pkill -f "f1_server.py" 2>/dev/null || true
sleep 1

# Starte Server im Hintergrund
nohup python3 "$DIR/f1_server.py" > "$DIR/server.log" 2>&1 &

echo "✅ Installation abgeschlossen!"
echo "   → Übersicht neu starten oder 'Refresh All Widgets'"
echo "   → Server läuft auf http://127.0.0.1:9877"
echo "   → Logs: $DIR/server.log"
