#!/usr/bin/env python3
"""F1 Live Widget — Event Detection Engine.

Läuft alle 3 Sekunden via Übersicht-Shell-Kommando,
vergleicht session.json mit gespeichertem state.json,
erkennt Ereignisse (Positionswechsel, Boxenstopps, schnellste Runde,
Safety Car, virtuelles Safety Car, Rote Flagge, Rennstart, Zielflagge)
und gibt sie per TTS und Sound aus.
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

DATA_DIR = Path.home() / ".f1"
VOICE = "Anna"

STATE_PATH = DATA_DIR / "state.json"
SESSION_PATH = DATA_DIR / "session.json"
FEED_PATH = DATA_DIR / "feed.json"
AUDIO_ON_PATH = DATA_DIR / "audio_on"


def load_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_json(path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass


def speak(text):
    try:
        subprocess.Popen(
            ["say", "-v", VOICE, text],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        pass


def play_sound(sound):
    try:
        subprocess.Popen(
            ["afplay", f"/System/Library/Sounds/{sound}.aiff"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        pass


def _now():
    return time.time()


def _should_trigger(protection, event_key, cooldown=30):
    """Duplicate protection: don't trigger same event within cooldown seconds."""
    last = protection.get(event_key, 0)
    if _now() - last < cooldown:
        return False
    protection[event_key] = _now()
    return True


def detect_events(old_state, new_state):
    """Compare old and new session state and return list of event dicts."""
    events = []
    protection = old_state.get("_protection", {})

    old_session = old_state.get("session") or {}
    new_session = new_state.get("session") or {}
    old_standings = old_state.get("standings", [])
    new_standings = new_state.get("standings", [])
    old_race_control = old_state.get("race_control", [])
    new_race_control = new_state.get("race_control", [])

    old_rc_ids = {rc.get("time", "") + rc.get("message", "") for rc in old_race_control}
    new_rc_entries = [rc for rc in new_race_control if (rc.get("time", "") + rc.get("message", "")) not in old_rc_ids]

    # 1. POSITION_CHANGE — position changed in top-5
    old_pos = {s.get("driver_number"): s.get("position") for s in old_standings}
    for s in new_standings:
        num = s.get("driver_number")
        pos = s.get("position")
        if num is None or pos is None:
            continue
        if pos > 5:
            continue
        old_p = old_pos.get(num)
        if old_p is not None and old_p != pos:
            key = f"pos_change_{num}"
            if _should_trigger(protection, key, 30):
                events.append({
                    "type": "POSITION_CHANGE",
                    "text": f"{s.get('code', '')} ist jetzt {pos}.",
                    "sound": None,
                    "driver_number": num,
                    "position": pos,
                })

    # 2. PIT_STOP — on_pit_lap became True
    old_pit = {s.get("driver_number"): bool(s.get("on_pit_lap")) for s in old_standings}
    for s in new_standings:
        num = s.get("driver_number")
        if num is None:
            continue
        if s.get("on_pit_lap") and not old_pit.get(num, False):
            key = f"pit_{num}"
            if _should_trigger(protection, key, 30):
                events.append({
                    "type": "PIT_STOP",
                    "text": f"{s.get('code', '')} in der Box.",
                    "sound": None,
                    "driver_number": num,
                })

    # 3. FASTEST_LAP — fastest lap changed
    def _fastest_lap_driver(standings):
        best = None
        best_driver = None
        for s in standings:
            lap = s.get("last_lap", "")
            if not lap:
                continue
            try:
                parts = lap.split(":")
                if len(parts) == 2:
                    total = int(parts[0]) * 60 + float(parts[1])
                else:
                    total = float(lap)
                if best is None or total < best:
                    best = total
                    best_driver = s
            except Exception:
                continue
        return best_driver

    old_fastest = _fastest_lap_driver(old_standings)
    new_fastest = _fastest_lap_driver(new_standings)
    if new_fastest and old_fastest:
        if new_fastest.get("driver_number") != old_fastest.get("driver_number"):
            key = f"fastest_{new_fastest.get('driver_number')}"
            if _should_trigger(protection, key, 30):
                events.append({
                    "type": "FASTEST_LAP",
                    "text": f"Schnellste Runde — {new_fastest.get('code', '')}!",
                    "sound": "Purr",
                    "driver_number": new_fastest.get("driver_number"),
                })

    # 4. SAFETY_CAR — race_control new entry with category="SafetyCar" and "DEPLOYED"
    for rc in new_rc_entries:
        cat = (rc.get("category") or "").upper()
        msg = (rc.get("message") or "").upper()
        if cat == "SAFETYCAR" and "DEPLOYED" in msg:
            key = "safety_car"
            if _should_trigger(protection, key, 30):
                events.append({
                    "type": "SAFETY_CAR",
                    "text": "Safety Car! Das Sicherheitsfahrzeug ist auf der Strecke.",
                    "sound": "Sosumi",
                })

    # 5. VIRTUAL_SAFETY_CAR — race_control contains "VIRTUAL SAFETY CAR DEPLOYED"
    for rc in new_rc_entries:
        msg = (rc.get("message") or "").upper()
        if "VIRTUAL SAFETY CAR DEPLOYED" in msg:
            key = "vsc"
            if _should_trigger(protection, key, 30):
                events.append({
                    "type": "VIRTUAL_SAFETY_CAR",
                    "text": "Virtuelles Safety Car aktiviert.",
                    "sound": None,
                })

    # 6. RED_FLAG — race_control new entry with flag="RED"
    for rc in new_rc_entries:
        if rc.get("flag") == "RED":
            key = "red_flag"
            if _should_trigger(protection, key, 30):
                events.append({
                    "type": "RED_FLAG",
                    "text": "Rote Flagge! Das Rennen ist unterbrochen.",
                    "sound": "Basso",
                })

    # 7. RACE_START — old session.live was false, new is true and name == "Race"
    old_live = bool(old_session.get("live", False))
    new_live = bool(new_session.get("live", False))
    new_name = new_session.get("session_name", "")
    if not old_live and new_live and new_name == "Race":
        key = "race_start"
        if _should_trigger(protection, key, 30):
            events.append({
                "type": "RACE_START",
                "text": "Das Rennen hat begonnen!",
                "sound": "Hero",
            })

    # 8. CHEQUERED_FLAG — race_control new entry with flag="CHEQUERED"
    for rc in new_rc_entries:
        if rc.get("flag") == "CHEQUERED":
            key = "chequered_flag"
            if _should_trigger(protection, key, 30):
                p1 = None
                for s in new_standings:
                    if s.get("position") == 1:
                        p1 = s
                        break
                winner_code = p1.get("code", "") if p1 else ""
                events.append({
                    "type": "CHEQUERED_FLAG",
                    "text": f"{winner_code} gewinnt das Rennen!" if winner_code else "Zielflagge! Das Rennen ist beendet.",
                    "sound": "Hero",
                })

    return events, protection


def main():
    audio_on = AUDIO_ON_PATH.exists()
    old_state = load_json(STATE_PATH)
    new_state = load_json(SESSION_PATH)

    # Ensure basic structure
    if "_protection" not in old_state:
        old_state["_protection"] = {}

    new_session = new_state.get("session") or {}
    session_live = bool(new_session.get("live", False))

    events = []
    protection = old_state.get("_protection", {})

    if session_live:
        events, protection = detect_events(old_state, new_state)

    # Update feed
    feed = load_json(FEED_PATH)
    if not isinstance(feed, list):
        feed = []

    for ev in events:
        feed.insert(0, {
            "time": datetime.now().strftime("%H:%M:%S"),
            "type": ev["type"],
            "text": ev["text"],
        })
    feed = feed[:20]

    # Save state
    new_state["_protection"] = protection
    save_json(STATE_PATH, new_state)
    save_json(FEED_PATH, feed)

    if audio_on and events:
        for ev in events:
            sound = ev.get("sound")
            if sound:
                play_sound(sound)
            speak(ev["text"])


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        sys.stderr.write(str(e))
