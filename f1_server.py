#!/usr/bin/env python3
"""F1 Live Widget — Flask Backend auf Port 9877"""

import json
import logging
import os
import re
import shutil
import socket
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

SEASON = datetime.now().year

DATA_DIR = Path.home() / ".f1"
DATA_DIR.mkdir(parents=True, exist_ok=True)

MPV_SOCKET = str(DATA_DIR / "mpv.sock")
SOURCES_PATH = str(DATA_DIR / "sources.json")
SHIFT_CONFIG_PATH = str(DATA_DIR / "shift_config.json")
SHIFT_STATE_PATH = str(DATA_DIR / "desktop_shift_state.json")
SESSION_PATH = str(DATA_DIR / "session.json")

OPENF1_BASE = "https://api.openf1.org/v1"
JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"

_cache = {}

audio_state = {"playing": False, "url": None, "volume": 50, "title": None}

# ---------------------------------------------------------------------------
# mpv helpers
# ---------------------------------------------------------------------------

def _resolve_mpv():
    """Find the mpv binary regardless of the server process's PATH.

    Übersicht launches the server with a minimal PATH that excludes
    /opt/homebrew/bin, so we search known locations explicitly.
    """
    for candidate in ("/opt/homebrew/bin/mpv", "/usr/local/bin/mpv", "/usr/bin/mpv"):
        if os.path.exists(candidate):
            return candidate
    return shutil.which("mpv") or "mpv"


MPV_BIN = _resolve_mpv()

_mpv_lock = threading.RLock()
_requested_url = None  # original URL before HLS resolution, returned to the widget


def resolve_hls_audio(url, timeout=6):
    """Resolve an HLS master playlist to a directly playable audio URL.

    Many ARD/ZDF/MDR streams include broken '-b' backup renditions that cause
    ffmpeg (and thus mpv) to 404 on the master playlist. We resolve a pure
    audio rendition (or the lowest-bandwidth video variant) ourselves to
    hand a clean URL to mpv.  Non-HLS URLs (Icecast mp3/aac) pass through.
    """
    if ".m3u8" not in url.lower():
        return url
    try:
        resp = requests.get(url, timeout=timeout, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        text = resp.text
    except Exception:
        return url

    if "#EXT-X-STREAM-INF" not in text and "#EXT-X-MEDIA" not in text:
        return url

    def good(u):
        return "-b/" not in u and "-b." not in u

    audio_default = re.findall(r'#EXT-X-MEDIA:TYPE=AUDIO[^\n]*?DEFAULT=YES[^\n]*?URI="([^"]+)"', text)
    audio_any = re.findall(r'#EXT-X-MEDIA:TYPE=AUDIO[^\n]*?URI="([^"]+)"', text)
    for cand in audio_default + audio_any:
        full = requests.compat.urljoin(url, cand)
        if good(full):
            return full

    variants = []
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.startswith("#EXT-X-STREAM-INF"):
            m = re.search(r'BANDWIDTH=(\d+)', line)
            bw = int(m.group(1)) if m else 0
            for j in range(i + 1, len(lines)):
                cand = lines[j].strip()
                if cand and not cand.startswith("#"):
                    variants.append((bw, requests.compat.urljoin(url, cand)))
                    break
    good_variants = [(bw, u) for bw, u in variants if good(u)]
    pool = good_variants or variants
    if pool:
        pool.sort(key=lambda x: x[0])
        return pool[0][1]
    return url


def mpv_is_running():
    try:
        result = subprocess.run(["pgrep", "-x", "mpv"], capture_output=True, text=True)
        return result.returncode == 0 and result.stdout.strip() != ""
    except Exception:
        return False


def mpv_command(cmd_list):
    if not os.path.exists(MPV_SOCKET):
        return None
    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
            sock.settimeout(2)
            sock.connect(MPV_SOCKET)
            payload = json.dumps({"command": cmd_list}) + "\n"
            sock.sendall(payload.encode())
            response = sock.recv(4096).decode().strip()
            try:
                return json.loads(response)
            except Exception:
                return response
    except Exception as e:
        return {"error": str(e)}


def mpv_start(url, volume=50):
    global _requested_url
    with _mpv_lock:
        mpv_stop()
        time.sleep(0.3)
        if os.path.exists(MPV_SOCKET):
            try:
                os.remove(MPV_SOCKET)
            except Exception:
                pass
        play_url = resolve_hls_audio(url)
        cmd = [
            MPV_BIN, "--no-video", "--force-window=no",
            "--input-ipc-server=" + MPV_SOCKET,
            "--volume=" + str(volume),
            "--cache=yes", "--cache-secs=10",
            play_url,
        ]
        _requested_url = url
        try:
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            return False
        time.sleep(1.5)
        return mpv_is_running()


def mpv_stop():
    global _requested_url
    with _mpv_lock:
        _requested_url = None
        if mpv_is_running():
            mpv_command(["quit"])
            time.sleep(0.3)
        if mpv_is_running():
            try:
                subprocess.run(
                    ["pkill", "-f", f"input-ipc-server={MPV_SOCKET}"],
                    capture_output=True,
                )
                time.sleep(0.2)
            except Exception:
                pass
        if os.path.exists(MPV_SOCKET):
            try:
                os.remove(MPV_SOCKET)
            except Exception:
                pass


def mpv_set_volume(level):
    level = max(0, min(100, int(level)))
    mpv_command(["set_property", "volume", level])
    return level


def mpv_get_status():
    if not mpv_is_running():
        return {"playing": False, "url": None, "volume": 50}
    vol_resp = mpv_command(["get_property", "volume"])
    path_resp = mpv_command(["get_property", "path"])
    pause_resp = mpv_command(["get_property", "pause"])
    volume = 50
    url = None
    paused = False
    if isinstance(vol_resp, dict) and vol_resp.get("data") is not None:
        volume = int(vol_resp["data"])
    if isinstance(path_resp, dict) and path_resp.get("data") is not None:
        url = path_resp["data"]
    if isinstance(pause_resp, dict) and pause_resp.get("data") is not None:
        paused = bool(pause_resp["data"])
    if _requested_url:
        url = _requested_url
    return {"playing": not paused, "url": url, "volume": volume}


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

def cached(key: str, ttl: int, fetch_fn):
    now = time.time()
    if key in _cache and now - _cache[key]["ts"] < ttl:
        return _cache[key]["data"]
    try:
        data = fetch_fn()
        if data is not None:
            _cache[key] = {"data": data, "ts": now}
        return data
    except Exception as e:
        logging.warning(f"Cache fetch error [{key}]: {e}")
        return _cache.get(key, {}).get("data")


# ---------------------------------------------------------------------------
# JSON helpers
# ---------------------------------------------------------------------------

def load_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        logging.warning("Failed to load %s: %s", path, exc)
        return default


def save_json(path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except OSError as exc:
        logging.error("Failed to save %s: %s", path, exc)


# ---------------------------------------------------------------------------
# OpenF1 helpers
# ---------------------------------------------------------------------------

def iso_ago(seconds):
    return (datetime.now(timezone.utc) - timedelta(seconds=seconds)).isoformat()


def get_current_session():
    def fetch():
        try:
            url = f"{OPENF1_BASE}/sessions?year={SEASON}"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            sessions = resp.json()
            if not sessions:
                return None
            sessions.sort(key=lambda s: s.get("date_start", ""), reverse=True)
            now = datetime.now(timezone.utc)
            session = sessions[0]
            start = session.get("date_start")
            end = session.get("date_end")
            try:
                dt_start = datetime.fromisoformat(start.replace("Z", "+00:00")) if start else None
                dt_end = datetime.fromisoformat(end.replace("Z", "+00:00")) if end else None
            except Exception:
                dt_start = dt_end = None
            live = False
            if dt_start and dt_end:
                live = dt_start <= now <= (dt_end + timedelta(hours=2))
            session["live"] = live
            save_json(SESSION_PATH, session)
            return session
        except Exception as e:
            logging.warning("get_current_session error: %s", e)
            return None

    return cached("current_session", 30, fetch)


def get_drivers(session_key):
    def fetch():
        try:
            url = f"{OPENF1_BASE}/drivers?session_key={session_key}"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            drivers = resp.json()
            result = {}
            for d in drivers:
                num = d.get("driver_number")
                if num is None:
                    continue
                result[num] = {
                    "code": d.get("name_acronym") or d.get("last_name", "")[:3].upper(),
                    "name": f"{d.get('first_name', '')} {d.get('last_name', '')}".strip(),
                    "team": d.get("team_name", ""),
                    "team_colour": d.get("team_colour", ""),
                    "headshot_url": d.get("headshot_url", ""),
                }
            return result
        except Exception as e:
            logging.warning("get_drivers error: %s", e)
            return {}

    return cached(f"drivers_{session_key}", 300, fetch)


def get_live_standings(session_key):
    def fetch():
        try:
            since = iso_ago(30)
            # Position
            resp = requests.get(
                f"{OPENF1_BASE}/position?session_key={session_key}&date>{since}",
                timeout=10,
            )
            resp.raise_for_status()
            positions_raw = resp.json()
            positions = {}
            for p in positions_raw:
                num = p.get("driver_number")
                if num is not None:
                    positions[num] = p.get("position", 99)

            # Intervals
            resp = requests.get(
                f"{OPENF1_BASE}/intervals?session_key={session_key}&date>{since}",
                timeout=10,
            )
            resp.raise_for_status()
            intervals_raw = resp.json()
            intervals = {}
            for iv in intervals_raw:
                num = iv.get("driver_number")
                if num is not None:
                    intervals[num] = {
                        "gap_to_leader": iv.get("gap_to_leader", ""),
                        "interval": iv.get("interval", ""),
                    }

            # Laps
            resp = requests.get(
                f"{OPENF1_BASE}/laps?session_key={session_key}",
                timeout=10,
            )
            resp.raise_for_status()
            laps_raw = resp.json()
            laps = {}
            for lap in laps_raw:
                num = lap.get("driver_number")
                if num is None:
                    continue
                ln = lap.get("lap_number", 0)
                if num not in laps or ln > laps[num]["lap_number"]:
                    laps[num] = lap

            # Stints
            resp = requests.get(
                f"{OPENF1_BASE}/stints?session_key={session_key}",
                timeout=10,
            )
            resp.raise_for_status()
            stints_raw = resp.json()
            stints = {}
            for st in stints_raw:
                num = st.get("driver_number")
                if num is None:
                    continue
                sn = st.get("stint_number", 0)
                if num not in stints or sn > stints[num]["stint_number"]:
                    stints[num] = st

            # Pit
            resp = requests.get(
                f"{OPENF1_BASE}/pit?session_key={session_key}",
                timeout=10,
            )
            resp.raise_for_status()
            pit_raw = resp.json()
            pit_counts = {}
            for pit in pit_raw:
                num = pit.get("driver_number")
                if num is not None:
                    pit_counts[num] = pit_counts.get(num, 0) + 1

            drivers = get_drivers(session_key) or {}

            def fmt_lap(duration):
                if duration is None:
                    return ""
                try:
                    total = float(duration)
                    m = int(total // 60)
                    s = total % 60
                    return f"{m}:{s:05.3f}"
                except Exception:
                    return str(duration)

            standings = []
            for num, pos in positions.items():
                d = drivers.get(num, {})
                lap_data = laps.get(num, {})
                stint_data = stints.get(num, {})
                iv = intervals.get(num, {})
                standings.append({
                    "position": pos,
                    "driver_number": num,
                    "code": d.get("code", ""),
                    "name": d.get("name", ""),
                    "team": d.get("team", ""),
                    "team_colour": f"#{d.get('team_colour', '')}" if d.get("team_colour") else "",
                    "gap_to_leader": iv.get("gap_to_leader", ""),
                    "interval": iv.get("interval", ""),
                    "last_lap": fmt_lap(lap_data.get("lap_duration")),
                    "current_lap": lap_data.get("lap_number", 0),
                    "pit_stops": pit_counts.get(num, 0),
                    "compound": stint_data.get("compound", ""),
                    "tyre_age": stint_data.get("tyre_age", 0),
                    "on_pit_lap": lap_data.get("is_pit_out_lap", False) or False,
                })

            standings.sort(key=lambda x: x["position"])
            return standings
        except Exception as e:
            logging.warning("get_live_standings error: %s", e)
            return []

    return cached(f"standings_{session_key}", 5, fetch)


def get_race_control_messages(session_key, since_seconds=300):
    def fetch():
        try:
            since = iso_ago(since_seconds)
            resp = requests.get(
                f"{OPENF1_BASE}/race_control?session_key={session_key}&date>{since}",
                timeout=10,
            )
            resp.raise_for_status()
            messages = resp.json()
            result = []
            for m in messages:
                result.append({
                    "time": m.get("date", ""),
                    "message": m.get("message", ""),
                    "category": m.get("category", ""),
                    "flag": m.get("flag", ""),
                })
            return result
        except Exception as e:
            logging.warning("get_race_control_messages error: %s", e)
            return []

    return cached(f"race_control_{session_key}", 5, fetch)


def get_team_radio_messages(session_key, since_seconds=300):
    def fetch():
        try:
            since = iso_ago(since_seconds)
            resp = requests.get(
                f"{OPENF1_BASE}/team_radio?session_key={session_key}&date>{since}",
                timeout=10,
            )
            resp.raise_for_status()
            messages = resp.json()
            drivers = get_drivers(session_key) or {}
            result = []
            for m in messages:
                num = m.get("driver_number")
                d = drivers.get(num, {}) if num is not None else {}
                result.append({
                    "driver_number": num,
                    "code": d.get("code", ""),
                    "team": d.get("team", ""),
                    "team_colour": f"#{d.get('team_colour', '')}" if d.get("team_colour") else "",
                    "time": m.get("date", ""),
                    "recording_url": m.get("recording_url", ""),
                })
            return result
        except Exception as e:
            logging.warning("get_team_radio_messages error: %s", e)
            return []

    return cached(f"team_radio_{session_key}", 10, fetch)


def get_weather_current(session_key):
    def fetch():
        try:
            resp = requests.get(
                f"{OPENF1_BASE}/weather?session_key={session_key}",
                timeout=10,
            )
            resp.raise_for_status()
            items = resp.json()
            if not items:
                return {}
            latest = max(items, key=lambda x: x.get("date", ""))
            return {
                "air_temp": latest.get("air_temperature"),
                "track_temp": latest.get("track_temperature"),
                "wind_speed": latest.get("wind_speed"),
                "wind_direction": latest.get("wind_direction"),
                "humidity": latest.get("humidity"),
                "rainfall": latest.get("rainfall"),
            }
        except Exception as e:
            logging.warning("get_weather_current error: %s", e)
            return {}

    return cached(f"weather_{session_key}", 30, fetch)


# ---------------------------------------------------------------------------
# Jolpica helpers
# ---------------------------------------------------------------------------

def get_schedule():
    def fetch():
        try:
            url = f"{JOLPICA_BASE}/{SEASON}.json"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            races_raw = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
            now = datetime.now(timezone.utc)
            races = []
            next_found = False
            for r in races_raw:
                date_str = r.get("date", "")
                time_str = (r.get("time") or "").replace("Z", "")
                dt_utc = None
                try:
                    dt_utc = datetime.fromisoformat(f"{date_str}T{time_str}").replace(tzinfo=timezone.utc)
                except Exception:
                    try:
                        dt_utc = datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc)
                    except Exception:
                        pass
                is_past = dt_utc is not None and dt_utc < now
                is_next = False
                if not next_found and dt_utc is not None and dt_utc >= now:
                    is_next = True
                    next_found = True
                races.append({
                    "round": int(r.get("round", 0)),
                    "name": r.get("raceName", ""),
                    "circuit": r.get("Circuit", {}).get("circuitName", ""),
                    "country": r.get("Circuit", {}).get("Location", {}).get("country", ""),
                    "city": r.get("Circuit", {}).get("Location", {}).get("locality", ""),
                    "date": date_str,
                    "time": time_str,
                    "datetime_utc": dt_utc.isoformat() if dt_utc else None,
                    "is_next": is_next,
                    "is_past": is_past,
                })
            return races
        except Exception as e:
            logging.warning("get_schedule error: %s", e)
            return []

    return cached("schedule", 3600, fetch)


def get_driver_standings():
    def fetch():
        try:
            url = f"{JOLPICA_BASE}/{SEASON}/driverStandings.json"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            lists = data.get("MRData", {}).get("StandingsTable", {}).get("StandingsLists", [])
            if not lists:
                return []
            standings = []
            for ds in lists[0].get("DriverStandings", []):
                driver = ds.get("Driver", {})
                constructors = ds.get("Constructors", [{}])
                team = constructors[0].get("name", "") if constructors else ""
                team_colour = constructors[0].get("constructorId", "") if constructors else ""
                standings.append({
                    "position": int(ds.get("position", 0)),
                    "points": int(ds.get("points", 0)),
                    "wins": int(ds.get("wins", 0)),
                    "code": driver.get("code", ""),
                    "name": f"{driver.get('givenName', '')} {driver.get('familyName', '')}".strip(),
                    "full_name": driver.get("givenName", ""),
                    "team": team,
                    "team_colour": team_colour,
                })
            return standings
        except Exception as e:
            logging.warning("get_driver_standings error: %s", e)
            return []

    return cached("driver_standings", 1800, fetch)


def get_constructor_standings():
    def fetch():
        try:
            url = f"{JOLPICA_BASE}/{SEASON}/constructorStandings.json"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            lists = data.get("MRData", {}).get("StandingsTable", {}).get("StandingsLists", [])
            if not lists:
                return []
            standings = []
            for cs in lists[0].get("ConstructorStandings", []):
                constructor = cs.get("Constructor", {})
                standings.append({
                    "position": int(cs.get("position", 0)),
                    "points": int(cs.get("points", 0)),
                    "wins": int(cs.get("wins", 0)),
                    "name": constructor.get("name", ""),
                    "nationality": constructor.get("nationality", ""),
                })
            return standings
        except Exception as e:
            logging.warning("get_constructor_standings error: %s", e)
            return []

    return cached("constructor_standings", 1800, fetch)


def get_next_race(races):
    if not races:
        return None
    for r in races:
        if r.get("is_next"):
            return r
    return None


# ---------------------------------------------------------------------------
# Stream check background thread
# ---------------------------------------------------------------------------

def _probe_stream(stream):
    url = stream.get("url", "")
    if not url:
        return {**stream, "online": False}
    try:
        resp = requests.head(url, timeout=5, allow_redirects=True)
        online = resp.status_code < 400
        if not online:
            resp = requests.get(url, timeout=5, stream=True, allow_redirects=True)
            online = resp.status_code < 400
        return {**stream, "online": online}
    except Exception:
        return {**stream, "online": False}


def check_streams_background():
    while True:
        try:
            sources = load_json(SOURCES_PATH, {"streams": []})
            streams = sources.get("streams", [])
            if streams:
                results = []
                with ThreadPoolExecutor(max_workers=8) as executor:
                    future_map = {executor.submit(_probe_stream, s): s for s in streams}
                    for future in as_completed(future_map):
                        try:
                            results.append(future.result())
                        except Exception:
                            s = future_map[future]
                            results.append({**s, "online": False})
                _cache["streams"] = {"data": results, "ts": time.time()}
        except Exception as e:
            logging.warning("check_streams_background error: %s", e)
        time.sleep(120)


# ---------------------------------------------------------------------------
# Desktop icon shift
# ---------------------------------------------------------------------------

def run_applescript(script):
    return subprocess.run(
        ["osascript"], input=script, capture_output=True, text=True, timeout=10,
    )


def get_shift_positions(direction):
    """Load positions for the given direction from shift_config.json.

    Returns an empty dict if the config file is missing — the shift feature
    is simply disabled in that case (graceful degradation).
    """
    cfg = load_json(SHIFT_CONFIG_PATH, {"icons": {}})
    icons = cfg.get("icons", {})
    positions = {}
    for name, data in icons.items():
        key = "open" if direction == "right" else "closed"
        if key in data:
            positions[name] = data[key]
    return positions


def apply_desktop_positions(positions):
    if not positions:
        return {"moved": 0, "missing": []}

    lines = ['tell application "Finder"', 'set missingItems to {}', 'set movedCount to 0']
    for name, pos in positions.items():
        x_pos, y_pos = int(pos[0]), int(pos[1])
        escaped = name.replace("\\", "\\\\").replace('"', '\\"')
        lines.extend([
            'try',
            f'  set position of item "{escaped}" of desktop to {{{x_pos}, {y_pos}}}',
            '  set movedCount to movedCount + 1',
            'on error',
            f'  set end of missingItems to "{escaped}"',
            'end try',
        ])
    lines.extend([
        "set AppleScript's text item delimiters to \"||\"",
        'return (movedCount as text) & linefeed & (missingItems as text)',
        'end tell',
    ])

    result = run_applescript("\n".join(lines))
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "failed to update desktop positions")

    output_lines = result.stdout.splitlines()
    moved = 0
    missing = []
    if output_lines:
        try:
            moved = int(output_lines[0].strip())
        except ValueError:
            moved = 0
    if len(output_lines) > 1 and output_lines[1].strip():
        missing = [item for item in output_lines[1].split("||") if item]
    return {"moved": moved, "missing": missing}


def shift_desktop_icons(direction):
    if direction not in ("left", "right"):
        raise ValueError(f"unsupported direction: {direction}")
    positions = get_shift_positions(direction)
    result = apply_desktop_positions(positions)
    shifted = direction == "right"
    save_json(SHIFT_STATE_PATH, {"shifted": shifted})
    return {"ok": True, "shifted": shifted, **result}


# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)


@app.route("/api/status", methods=["GET"])
def api_status():
    session = get_current_session() or {}
    return jsonify({
        "ok": True,
        "audio": audio_state,
        "session_live": session.get("live", False),
        "session_type": session.get("session_name", ""),
    })


@app.route("/api/streams", methods=["GET"])
def api_streams():
    streams_data = _cache.get("streams", {})
    streams = streams_data.get("data", [])
    return jsonify({"streams": streams})


@app.route("/api/play", methods=["POST"])
def api_play():
    global audio_state
    data = request.get_json(force=True) or {}
    url = data.get("url")
    volume = data.get("volume", 80)
    if not url:
        return jsonify({"error": "url required"}), 400
    if not mpv_start(url, volume):
        return jsonify({"error": "failed to start audio"}), 503
    audio_state = mpv_get_status()
    audio_state["title"] = data.get("title")
    return jsonify({"ok": True, "audio": audio_state})


@app.route("/api/stop", methods=["POST"])
def api_stop():
    global audio_state
    mpv_stop()
    audio_state = {"playing": False, "url": None, "volume": 50, "title": None}
    return jsonify({"ok": True, "audio": audio_state})


@app.route("/api/volume", methods=["POST"])
def api_volume():
    global audio_state
    data = request.get_json(force=True) or {}
    level = data.get("level")
    if level is None:
        return jsonify({"error": "level required"}), 400
    try:
        level = int(level)
    except (ValueError, TypeError):
        return jsonify({"error": "level must be a number"}), 400
    mpv_set_volume(level)
    audio_state = mpv_get_status()
    return jsonify({"ok": True, "audio": audio_state})


@app.route("/api/session", methods=["GET"])
def api_session():
    session = get_current_session()
    if not session:
        return jsonify({"session": None, "standings": [], "race_control": [], "weather": {}, "total_laps": 0, "current_lap": 0})

    session_key = session.get("session_key")
    standings = get_live_standings(session_key) if session_key else []
    race_control = get_race_control_messages(session_key) if session_key else []
    weather = get_weather_current(session_key) if session_key else {}

    total_laps = session.get("total_laps", 0)
    current_lap = 0
    if standings:
        current_lap = max((s.get("current_lap", 0) for s in standings), default=0)

    result = {
        "session": session,
        "standings": standings,
        "race_control": race_control,
        "weather": weather,
        "total_laps": total_laps,
        "current_lap": current_lap,
    }
    save_json(SESSION_PATH, result)
    return jsonify(result)


@app.route("/api/standings", methods=["GET"])
def api_standings():
    return jsonify({
        "drivers": get_driver_standings(),
        "constructors": get_constructor_standings(),
        "season": SEASON,
    })


@app.route("/api/schedule", methods=["GET"])
def api_schedule():
    races = get_schedule()
    return jsonify({
        "races": races,
        "next_race": get_next_race(races),
        "season": SEASON,
    })


@app.route("/api/radio", methods=["GET"])
def api_radio():
    session = get_current_session() or {}
    session_key = session.get("session_key")
    messages = get_team_radio_messages(session_key) if session_key else []
    return jsonify({
        "messages": messages,
        "session_live": session.get("live", False),
    })


@app.route("/api/shift", methods=["POST"])
def api_shift():
    data = request.get_json(force=True, silent=True) or {}
    direction = data.get("dir", "right")
    try:
        result = shift_desktop_icons(direction)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    threading.Thread(target=check_streams_background, daemon=True).start()
    app.run(host="127.0.0.1", port=9877, debug=False, threaded=True)
