export const refreshFrequency = 3000

export const command = `
  DIR="$HOME/.f1"; mkdir -p "$DIR"
  python3 "$DIR/engine.py" 2>/dev/null
  echo "FEED:$(cat "$DIR/feed.json" 2>/dev/null || echo '[]')"
  echo "AUDIO:$([ -f "$DIR/audio_on" ] && echo on || echo off)"
  grep -q '"shifted": true' "$DIR/desktop_shift_state.json" 2>/dev/null && echo "SHIFT:on" || echo "SHIFT:off"
`

export const className = `
  position: fixed;
  top: 0; left: 0;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  user-select: none;
  z-index: 1;

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .widget {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #1a0000 0%, #0d0d0d 14%, #0d0d0d 100%);
    border-right: 1px solid #2a0000;
    box-shadow: 2px 0 24px rgba(0,0,0,0.55);
    transition: transform .35s cubic-bezier(.4,0,.2,1);
  }

  .f1-root.hidden .widget { transform: translateX(calc(-100% - 12px)); pointer-events: none; }
  .f1-root.hidden .side-panel { transform: translateX(-9999px); pointer-events: none; }

  .hide-btn {
    pointer-events: auto; cursor: pointer;
    font-size: 9px; color: #4b5563;
    padding: 3px 7px; margin-top: 5px; margin-left: 6px;
    background: #0f1724; border-radius: 5px; border: 1px solid #21262d;
    display: inline-block; transition: color .15s, background .15s;
  }
  .hide-btn:hover { color: #f87171; background: #1a1014; border-color: #5b2330; }

  .notch {
    position: fixed; left: 0; top: 70%;
    transform: translateY(-50%) translateX(-110%);
    transition: transform .35s cubic-bezier(.4,0,.2,1), filter .15s ease;
    z-index: 6; pointer-events: none;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 16px 9px 14px;
    background: linear-gradient(135deg, #3a0000, #1a0a0a 75%);
    border: 1px solid #2a0000; border-left: none;
    border-radius: 0 14px 14px 0;
    box-shadow: 3px 0 22px rgba(0,0,0,0.6);
  }
  .f1-root.hidden .notch { transform: translateY(-50%) translateX(0); pointer-events: auto; cursor: pointer; }
  .notch:hover { filter: brightness(1.18); }
  .notch:active { filter: brightness(0.95); }
  .notch-badge { font-size: 22px; display: inline-block; animation: spin 9s linear infinite; }
  .notch-label { font-size: 9px; font-weight: 800; color: #e10600; letter-spacing: 1px; writing-mode: vertical-rl; text-orientation: mixed; }
  .notch-live { width: 8px; height: 8px; border-radius: 50%; background: #e10600; animation: pulse 1.2s infinite; }
  .notch-chev { font-size: 11px; color: #5b6b7d; }

  .hdr {
    position: relative; overflow: hidden;
    padding: 16px 20px;
    background: linear-gradient(120deg, #3a0000, #1a0a0a 70%);
    border-bottom: 1px solid #2a0000;
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .hdr::after {
    content: ''; position: absolute; top: 0; bottom: 0; width: 40%;
    background: linear-gradient(100deg, transparent, rgba(255,255,255,0.07), transparent);
    transform: translateX(-150%);
    animation: shine 6s ease-in-out infinite;
  }
  .hdr-l { display: flex; align-items: center; gap: 12px; z-index: 1; min-width: 0; flex-shrink: 1; }
  .f1-badge { font-size: 26px; display: inline-block; animation: spin 9s linear infinite; transform-origin: 50% 50%; }
  .h-title { font-size: 16px; font-weight: 800; color: #fff; letter-spacing: 0.3px; }
  .h-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .h-sub b { color: #e10600; }
  .h-r { text-align: right; z-index: 1; }
  .h-live { display: inline-block; background: #e10600; color: #fff; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 6px; letter-spacing: 1.5px; animation: pulse 1.6s ease-in-out infinite; }
  .h-time { font-size: 9px; color: #4b5563; margin-top: 5px; }
  .h-r-btns { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 3px; margin-top: 4px; }
  .h-r-btns .hide-btn { margin-top: 0; margin-left: 0; }

  .sbar { display: flex; background: #0d0d0d; border-bottom: 1px solid #1a0000; flex-shrink: 0; }
  .sb { flex: 1; text-align: center; padding: 8px 4px; border-right: 1px solid #1a0000; }
  .sb:last-child { border-right: none; }
  .sb-v { font-size: 15px; font-weight: 800; color: #e5e7eb; }
  .sb-l { font-size: 8px; color: #4b5563; text-transform: uppercase; letter-spacing: 1px; margin-top: 1px; }

  .rc-banner {
    flex-shrink: 0;
    padding: 8px 16px;
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 700;
    animation: rc-flash 2s ease-in-out infinite;
  }
  .rc-banner-sc { background: rgba(255,204,0,0.12); color: #ffcc00; border-bottom: 1px solid rgba(255,204,0,0.25); }
  .rc-banner-red { background: rgba(239,68,68,0.12); color: #ef4444; border-bottom: 1px solid rgba(239,68,68,0.25); }
  .rc-banner-vsc { background: rgba(249,115,22,0.12); color: #f97316; border-bottom: 1px solid rgba(249,115,22,0.25); }

  .scroll { flex: 1; overflow-y: auto; pointer-events: auto; }
  .scroll::-webkit-scrollbar { width: 8px; }
  .scroll::-webkit-scrollbar-thumb { background: #1a0000; border-radius: 4px; }
  .scroll::-webkit-scrollbar-thumb:hover { background: #2a0000; }

  .sec { padding: 9px 20px 5px; font-size: 9px; font-weight: 700; color: #4b5563; letter-spacing: 2px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; }
  .sec::after { content: ''; flex: 1; height: 1px; background: #1a0000; }

  .st-wrap { flex-shrink: 0; }
  .st-row {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 16px; border-bottom: 1px solid #111111;
    background: #0d0d0d; transition: background .15s;
  }
  .st-row:hover { background: #141414; }
  .st-pit { opacity: 0.6; }
  .st-pos { font-size: 14px; font-weight: 800; min-width: 22px; text-align: center; }
  .st-code { font-size: 13px; font-weight: 700; min-width: 36px; }
  .st-gap { font-size: 11px; color: #9ca3af; flex: 1; text-align: right; font-variant-numeric: tabular-nums; }
  .st-lap { font-size: 11px; color: #c8ff00; min-width: 56px; text-align: right; font-variant-numeric: tabular-nums; }
  .st-compound { min-width: 16px; text-align: center; }
  .st-pits { min-width: 20px; text-align: center; }

  .cdown { display: flex; margin: 6px 20px 16px; background: #0d0d0d; border-radius: 12px; border: 1px solid #1a0000; }
  .cd { flex: 1; text-align: center; padding: 14px 6px; border-right: 1px solid #1a0000; }
  .cd:last-child { border-right: none; }
  .cd-v { font-size: 26px; font-weight: 200; color: #fff; line-height: 1; }
  .cd-l { font-size: 8px; color: #4b5563; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

  .last-res { padding: 12px 20px; border-bottom: 1px solid #111111; }
  .lr-label { font-size: 10px; color: #4b5563; margin-bottom: 6px; }
  .lr-winner { display: flex; align-items: center; gap: 10px; }
  .lr-pos { font-size: 24px; font-weight: 800; color: #ffd700; min-width: 30px; }
  .lr-info { flex: 1; }
  .lr-name { font-size: 14px; font-weight: 700; color: #fff; }
  .lr-team { font-size: 11px; color: #9ca3af; }

  .streams-wrap { flex-shrink: 0; background: #0d0d0d; border-bottom: 1px solid #1a0000; }
  .streams-toggle { pointer-events: auto; cursor: pointer; display: flex; align-items: center; justify-content: space-between; padding: 11px 16px; }
  .streams-toggle:hover { background: #111111; }
  .streams-panel { max-height: 0; overflow: hidden; transition: max-height .3s ease; }
  .streams-wrap.expanded .streams-panel { max-height: 480px; }
  .chev { color: #4b5563; font-size: 11px; transition: transform .25s ease; }
  .streams-wrap.expanded .chev { transform: rotate(180deg); }
  .lt-l { font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.4px; display: flex; align-items: center; gap: 8px; }
  .lt-badge { background: #3a0000; color: #fff; font-size: 9px; font-weight: 800; padding: 1px 7px; border-radius: 8px; }
  .lt-live { background: #e10600; color: #fff; font-size: 9px; font-weight: 800; padding: 1px 7px; border-radius: 8px; animation: pulse 1.6s infinite; }
  .live-actions { display: flex; flex-direction: column; gap: 7px; padding: 2px 16px 11px; }
  .la-row { display: flex; gap: 7px; }
  .la-btn { pointer-events: auto; cursor: pointer; text-align: center; font-size: 11px; font-weight: 700; padding: 9px 10px; border-radius: 9px; transition: transform .08s ease; }
  .la-btn:active { transform: scale(0.97); }
  .la-flex { flex: 1; }
  .la-on { background: #1a0000; color: #e10600; border: 1px solid #5b0000; }
  .la-off { background: #1a1a1a; color: #6b7280; border: 1px solid #2a0000; }
  .la-test { background: #2a1a00; color: #ffd700; border: 1px solid #4a3a00; flex: 0 0 auto; }
  .la-radio { background: linear-gradient(135deg, #e10600, #9a0400); color: #fff; }
  .streams-scroll { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 2px; }
  .streams-scroll::-webkit-scrollbar { width: 5px; }
  .streams-scroll::-webkit-scrollbar-thumb { background: #1a0000; border-radius: 3px; }
  .lf-empty { font-size: 11px; color: #5a647e; padding: 13px 16px; line-height: 1.65; }

  .mstr-wrap { flex-shrink: 0; background: #0d0d0d; border-bottom: 1px solid #1a0000; }
  .mstr-toggle { pointer-events: auto; cursor: pointer; display: flex; align-items: center; justify-content: space-between; padding: 11px 16px; }
  .mstr-toggle:hover { background: #111111; }
  .mstr-panel { max-height: 0; overflow: hidden; transition: max-height .3s ease; }
  .mstr-wrap.expanded .mstr-panel { max-height: 480px; }
  .mstr-wrap.expanded .chev { transform: rotate(180deg); }
  .mstr-row {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 16px; border-bottom: 1px solid #111111;
  }
  .mstr-pos { font-size: 13px; font-weight: 800; color: #ffd700; min-width: 22px; text-align: center; }
  .mstr-code { font-size: 12px; font-weight: 700; min-width: 36px; }
  .mstr-name { font-size: 12px; color: #d1d5db; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mstr-team { font-size: 10px; color: #9ca3af; min-width: 60px; text-align: right; }
  .mstr-pts { font-size: 13px; font-weight: 800; color: #fff; min-width: 36px; text-align: right; font-variant-numeric: tabular-nums; }
  .mstr-bar { flex: 1; height: 4px; background: #1a0000; border-radius: 2px; overflow: hidden; max-width: 80px; }
  .mstr-bar-fill { height: 100%; border-radius: 2px; }

  .cal-wrap { flex-shrink: 0; background: #0d0d0d; border-bottom: 1px solid #1a0000; }
  .cal-toggle { pointer-events: auto; cursor: pointer; display: flex; align-items: center; justify-content: space-between; padding: 11px 16px; }
  .cal-toggle:hover { background: #111111; }
  .cal-panel { max-height: 0; overflow: hidden; transition: max-height .3s ease; }
  .cal-wrap.expanded .cal-panel { max-height: 600px; }
  .cal-wrap.expanded .chev { transform: rotate(180deg); }
  .race-item { padding: 7px 16px; border-bottom: 1px solid #111111; display: flex; align-items: center; gap: 10px; }
  .race-item-next { border-left: 3px solid #e10600; padding-left: 13px; background: rgba(225,6,0,0.04); }
  .race-item-past { opacity: 0.45; }
  .race-round { font-size: 10px; font-weight: 800; color: #4b5563; min-width: 24px; }
  .race-name { font-size: 12px; color: #d1d5db; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .race-date { font-size: 10px; color: #6b7280; min-width: 60px; text-align: right; }

  .foot { padding: 8px 20px; background: #0d0d0d; border-top: 1px solid #1a0000; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
  .ft { font-size: 9px; color: #2d3748; } .ft b { color: #4b5563; }

  .side-panel {
    position: fixed; top: 0;
    width: 0; overflow: hidden;
    transition: width .3s ease, transform .35s ease;
    background: #080808;
    border-right: 1px solid #1a0000;
    height: 100vh;
    z-index: 2;
  }
  .side-panel.open { width: 290px; }
  .sp-inner { width: 290px; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  .sp-hdr { padding: 14px 14px 13px; background: #0f0f0f; border-bottom: 1px solid #1a0000; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .sp-title { font-size: 12px; font-weight: 700; color: #d1d5db; display: flex; align-items: center; gap: 7px; }
  .sp-close { pointer-events: auto; cursor: pointer; font-size: 13px; color: #4b5563; padding: 3px 8px; border-radius: 6px; border: 1px solid #1a0000; }
  .sp-close:hover { color: #9ca3af; background: #141414; }
  .sp-scroll { flex: 1; overflow-y: auto; pointer-events: auto; }
  .sp-scroll::-webkit-scrollbar { width: 5px; }
  .sp-scroll::-webkit-scrollbar-thumb { background: #1a0000; border-radius: 3px; }
  .sp-empty { padding: 24px 16px; font-size: 11px; color: #4b5563; text-align: center; line-height: 1.9; }
  .sp-sec { padding: 6px 14px; font-size: 9px; font-weight: 700; color: #4b5563; letter-spacing: 2px; text-transform: uppercase; background: #0a0a0a; border-bottom: 1px solid #111111; position: sticky; top: 0; }
  .sp-rc-item { padding: 8px 14px; border-bottom: 1px solid #111111; animation: slidein .3s ease; border-left: 3px solid transparent; }
  .sp-rc-sc { border-left-color: #ffcc00; background: rgba(255,204,0,0.04); }
  .sp-rc-red { border-left-color: #ef4444; background: rgba(239,68,68,0.04); }
  .sp-rc-vsc { border-left-color: #f97316; background: rgba(249,115,22,0.04); }
  .sp-rc-time { font-size: 9px; color: #4b5563; margin-bottom: 2px; }
  .sp-rc-msg { font-size: 11px; color: #d1d5db; line-height: 1.55; }
  .sp-radio-item { padding: 8px 14px; border-bottom: 1px solid #111111; display: flex; align-items: center; gap: 10px; animation: slidein .3s ease; }
  .sp-radio-driver { font-size: 11px; font-weight: 700; min-width: 36px; }
  .sp-radio-time { font-size: 9px; color: #4b5563; min-width: 40px; text-align: right; }
  .sp-radio-btn { pointer-events: auto; cursor: pointer; font-size: 11px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #e10600, #9a0400); padding: 5px 10px; border-radius: 7px; }
  .sp-weather { padding: 10px 14px; border-bottom: 1px solid #111111; }
  .sp-w-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  .sp-w-row:last-child { margin-bottom: 0; }
  .sp-w-label { font-size: 10px; color: #4b5563; }
  .sp-w-val { font-size: 11px; font-weight: 700; color: #d1d5db; }

  .f1-sm .h-title { font-size: 14px; }
  .f1-sm .h-sub { font-size: 10px; }
  .f1-sm .side-panel.open { width: 240px; }
  .f1-sm .sp-inner { width: 240px; }
  .f1-sm .st-code { min-width: 30px; font-size: 12px; }
  .f1-sm .st-gap { font-size: 10px; }
  .f1-sm .st-lap { min-width: 48px; font-size: 10px; }
  .f1-sm .mstr-name { font-size: 11px; }
  .f1-sm .mstr-team { display: none; }
  .f1-sm .mstr-bar { display: none; }
  .f1-sm .race-name { font-size: 11px; }
  .f1-sm .race-date { font-size: 9px; }

  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes shine { 0%{transform:translateX(-150%)} 55%,100%{transform:translateX(320%)} }
  @keyframes slidein { from{opacity:0; transform:translateY(-5px)} to{opacity:1; transform:translateY(0)} }
  @keyframes rc-flash { 0%,100%{opacity:1} 50%{opacity:0.6} }
`

let expanded = false
let standingsExpanded = false
let scheduleExpanded = false
let sidePanelOpen = false
let widgetHidden = false
try { sidePanelOpen = localStorage.getItem('f1SidePanelOpen') === '1' } catch(e) {}
try { widgetHidden  = localStorage.getItem('f1Hidden') === '1'        } catch(e) {}

let serverStreams        = []
let serverAudio          = { playing: false, url: null, volume: 70 }
let serverSession        = null
let serverLiveStandings  = []
let serverRaceControl    = []
let serverCurrentLap     = 0
let serverTotalLaps      = 0
let serverStandings      = null
let serverSchedule       = null
let serverRadio          = []

const SERVER_URL = "http://127.0.0.1:9877"

const COUNTRY_FLAGS = {
  DE:'🇩🇪',GB:'🇬🇧',CA:'🇨🇦',AT:'🇦🇹',CH:'🇨🇭',FR:'🇫🇷',IT:'🇮🇹',
  NL:'🇳🇱',BE:'🇧🇪',US:'🇺🇸',PT:'🇵🇹',IE:'🇮🇪',NO:'🇳🇴',SE:'🇸🇪',
  FI:'🇫🇮',DK:'🇩🇰',ES:'🇪🇸',JP:'🇯🇵',AU:'🇦🇺',AR:'🇦🇷',MX:'🇲🇽',
  BR:'🇧🇷',QA:'🇶🇦',TR:'🇹🇷',EU:'🇪🇺',CN:'🇨🇳',IN:'🇮🇳',SG:'🇸🇬',
  AE:'🇦🇪',BH:'🇧🇭',SA:'🇸🇦',KR:'🇰🇷',TH:'🇹🇭',VN:'🇻🇳',MY:'🇲🇾',
  ID:'🇮🇩',RU:'🇷🇺',PL:'🇵🇱',CZ:'🇨🇿',HU:'🇭🇺',RO:'🇷🇴',BG:'🇧🇬',
  GR:'🇬🇷',RS:'🇷🇸',HR:'🇭🇷',SI:'🇸🇮',SK:'🇸🇰',LT:'🇱🇹',LV:'🇱🇻',
  EE:'🇪🇪',UA:'🇺🇦',BY:'🇧🇾',MD:'🇲🇩',GE:'🇬🇪',AZ:'🇦🇿',AM:'🇦🇲',
  KZ:'🇰🇿',UZ:'🇺🇿',TJ:'🇹🇯',KG:'🇰🇬',TM:'🇹🇲',MN:'🇲🇳',PK:'🇵🇰',
  BD:'🇧🇩',LK:'🇱🇰',NP:'🇳🇵',MM:'🇲🇲',KH:'🇰🇭',LA:'🇱🇦',BT:'🇧🇹',
  MV:'🇲🇻',AF:'🇦🇫',IR:'🇮🇷',IQ:'🇮🇶',SY:'🇸🇾',JO:'🇯🇴',LB:'🇱🇧',
  IL:'🇮🇱',PS:'🇵🇸',CY:'🇨🇾',TR2:'🇹🇷',KW:'🇰🇼',OM:'🇴🇲',YE:'🇾🇪',
}

function toggleHidden() {
  widgetHidden = !widgetHidden
  try { localStorage.setItem('f1Hidden', widgetHidden ? '1' : '0') } catch(e) {}
  const root = document.querySelector('.f1-root')
  if (root) root.classList.toggle('hidden', widgetHidden)
}

function toggleSidePanel() {
  const el = document.querySelector('.side-panel')
  const isOpen = el ? el.classList.contains('open') : sidePanelOpen
  sidePanelOpen = !isOpen
  try { localStorage.setItem('f1SidePanelOpen', sidePanelOpen ? '1' : '0') } catch(e) {}
  if (el) el.classList.toggle('open', sidePanelOpen)
  const dir = sidePanelOpen ? 'right' : 'left'
  fetch(`${SERVER_URL}/api/shift`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dir })
  }).catch(() => {})
}

function toggleExpand(e) {
  expanded = !expanded
  try { const w = e.target.closest('.streams-wrap'); if (w) w.classList.toggle('expanded', expanded) } catch(err) {}
}

function toggleStandingsExpand(e) {
  standingsExpanded = !standingsExpanded
  try { const w = e.target.closest('.mstr-wrap'); if (w) w.classList.toggle('expanded', standingsExpanded) } catch(err) {}
}

function toggleScheduleExpand(e) {
  scheduleExpanded = !scheduleExpanded
  try { const w = e.target.closest('.cal-wrap'); if (w) w.classList.toggle('expanded', scheduleExpanded) } catch(err) {}
}

function fetchServerData() {
  fetch(`${SERVER_URL}/api/streams`)
    .then(r => r.json())
    .then(data => { serverStreams = data.streams || [] })
    .catch(() => {})
  fetch(`${SERVER_URL}/api/status`)
    .then(r => r.json())
    .then(data => { if (data.audio) serverAudio = data.audio })
    .catch(() => {})
  fetch(`${SERVER_URL}/api/session`)
    .then(r => r.json())
    .then(data => {
      serverSession       = data.session       || null
      serverLiveStandings = data.standings      || []
      serverRaceControl   = data.race_control   || []
      serverCurrentLap    = data.current_lap    || 0
      serverTotalLaps     = data.total_laps     || 0
    })
    .catch(() => {})
  fetch(`${SERVER_URL}/api/standings`)
    .then(r => r.json())
    .then(data => { serverStandings = data || null })
    .catch(() => {})
  fetch(`${SERVER_URL}/api/schedule`)
    .then(r => r.json())
    .then(data => { serverSchedule = data || null })
    .catch(() => {})
  fetch(`${SERVER_URL}/api/radio`)
    .then(r => r.json())
    .then(data => { serverRadio = data.messages || [] })
    .catch(() => {})
}

function playStream(url) {
  serverAudio = { playing: true, url: url, volume: serverAudio.volume }
  fetch(`${SERVER_URL}/api/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, volume: serverAudio.volume })
  }).then(r => r.json()).then(d => { if (d.audio) serverAudio = d.audio }).catch(() => {})
}

function stopAudio() {
  serverAudio = { playing: false, url: null, volume: serverAudio.volume }
  fetch(`${SERVER_URL}/api/stop`, { method: 'POST' })
    .then(r => r.json()).then(d => { if (d.audio) serverAudio = d.audio }).catch(() => {})
}

function setVolume(level) {
  serverAudio = { ...serverAudio, volume: level }
  const el = document.getElementById('f1-vol-display')
  if (el) el.textContent = level + '%'
  fetch(`${SERVER_URL}/api/volume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level })
  }).then(r => r.json()).then(d => { if (d.audio) serverAudio = d.audio }).catch(() => {})
}

function ensureServer() {
  fetch(`${SERVER_URL}/api/status`, { method: 'GET' })
    .catch(() => {
      try {
        fetch('/run/', { method: 'POST', body: 'nohup python3 "$HOME/.f1/server.py" > "$HOME/.f1/server.log" 2>&1 &' })
      } catch(e) {}
    })
}

function parseOutput(raw) {
  let f = '[]', audio = 'off', shift = 'off'
  for (const line of (raw || '').split('\n')) {
    if (line.startsWith('FEED:')) f = line.slice(5)
    else if (line.startsWith('AUDIO:')) audio = line.slice(6).trim()
    else if (line.startsWith('SHIFT:')) shift = line.slice(6).trim()
  }
  const pj = x => { try { return JSON.parse(x) } catch(e) { return {} } }
  return { feed: pj(f), audio, shift }
}

function countdown(t) {
  const d = t - new Date(); if (d <= 0) return null
  return { d: Math.floor(d / 86400000), h: Math.floor((d % 86400000) / 3600000), m: Math.floor((d % 3600000) / 60000) }
}

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
  } catch(e) { return '' }
}

function daysUntil(dt) {
  const d = new Date(dt) - new Date()
  if (d <= 0) return 'heute'
  const days = Math.floor(d / 86400000)
  if (days === 1) return 'morgen'
  return 'in ' + days + ' Tagen'
}

const StandingRow = ({ entry }) => {
  const isLeader = entry.position === 1
  const teamColor = "#" + (entry.team_colour || "666666").replace("#", "")
  const compoundStyle = {
    SOFT: { label: "S", color: "#ff1801" },
    MEDIUM: { label: "M", color: "#ffd700" },
    HARD: { label: "H", color: "#f0f0f0" },
    INTERMEDIATE: { label: "I", color: "#39b54a" },
    WET: { label: "W", color: "#0067ff" },
  }
  const compound = compoundStyle[entry.compound] || { label: "?", color: "#666" }
  return (
    <div className={`st-row ${entry.on_pit_lap ? "st-pit" : ""}`}
         style={{ borderLeft: `3px solid ${teamColor}` }}>
      <div className="st-pos" style={{ color: isLeader ? "#ffd700" : "#fff" }}>{entry.position}</div>
      <div className="st-code" style={{ color: teamColor }}>{entry.code}</div>
      <div className="st-gap">
        {isLeader ? "Leader" : (()=>{ const g = parseFloat(entry.gap_to_leader); return g > 0 ? `+${g.toFixed(3)}` : entry.gap_to_leader || "–" })()}
      </div>
      <div className="st-lap">{entry.last_lap}</div>
      <div className="st-compound" style={{ color: compound.color, fontSize: "10px", fontWeight: "800" }}>
        {entry.on_pit_lap ? "🔧" : compound.label}
      </div>
      <div className="st-pits" style={{ fontSize: "9px", color: "#4b5563" }}>{entry.pit_stops}×</div>
    </div>
  )
}

export const render = ({ output }) => {
  ensureServer()
  fetchServerData()
  const { feed, audio, shift } = parseOutput(output)
  sidePanelOpen = shift === 'on'

  const session    = (feed && feed.session) || serverSession || {}
  const standings  = serverStandings || null
  const schedule   = serverSchedule  || { races: [], next_race: null }
  const raceControl = serverRaceControl || []
  const weather    = (feed && feed.weather) || {}
  const radioList  = serverRadio || []
  const liveStandings = serverLiveStandings || []

  const isLive = session && session.live
  const now = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  const sw = typeof window !== 'undefined' ? window.screen.width : 2560
  const W = sw < 1280 ? 340 : sw < 1440 ? 380 : sw < 1920 ? 420 : sw < 2560 ? 470 : sw < 3840 ? 520 : 580

  const nextRace = schedule.next_race
  const nextRaceCountdown = nextRace && nextRace.date ? countdown(new Date(nextRace.date)) : null
  const races = schedule.races || []

  const driverStandings = (standings && standings.drivers) || []
  const maxPoints = (driverStandings[0] && driverStandings[0].points) || 1
  const lastWinner = null

  const onlineStreams = serverStreams.filter(s => s.online)

  const leader = liveStandings.length > 0 ? liveStandings[0].code : null
  const safetyCarActive = raceControl.some(m => {
    const msg = (m.message || '').toUpperCase()
    return msg.includes('SAFETY CAR DEPLOYED') || msg.includes('VIRTUAL SAFETY CAR DEPLOYED')
  })

  const rcBanner = raceControl.find(m => {
    const cat = (m.category || '').toLowerCase()
    return cat.includes('safety') || cat.includes('red') || cat.includes('vsc')
  })

  const SidePanelView = () => (
    <div className={`side-panel ${sidePanelOpen ? 'open' : ''}`} style={{left: W + 'px'}}>
      <div className="sp-inner">
        <div className="sp-hdr">
          <span className="sp-title">
            {isLive ? <span style={{color:'#e10600',animation:'pulse 1.6s infinite',display:'inline-block'}}>●</span> : '📡'}
            &nbsp;F1 Live Panel
          </span>
          <span className="sp-close" onClick={toggleSidePanel}>✕</span>
        </div>
        <div className="sp-scroll">
          {raceControl.length === 0 && radioList.length === 0 && !weather.air_temp ? (
            <div className="sp-empty">
              Keine Live-Daten aktiv.<br />
              Das Panel füllt sich sobald<br />
              eine Session läuft.
            </div>
          ) : null}

          {raceControl.length > 0 && (
            <div>
              <div className="sp-sec">🏁 Race Control</div>
              {raceControl.slice().reverse().map((m, i) => {
                const cat = (m.category || '').toLowerCase()
                let cls = 'sp-rc-item'
                if (cat.includes('safety') && !cat.includes('virtual')) cls += ' sp-rc-sc'
                else if (cat.includes('red')) cls += ' sp-rc-red'
                else if (cat.includes('vsc') || cat.includes('virtual')) cls += ' sp-rc-vsc'
                return (
                  <div key={i} className={cls}>
                    <div className="sp-rc-time">{m.time || ''}</div>
                    <div className="sp-rc-msg">⚠️ {m.message}</div>
                  </div>
                )
              })}
            </div>
          )}

          {radioList.length > 0 && (
            <div>
              <div className="sp-sec">📻 Team Radio</div>
              {radioList.slice().reverse().map((r, i) => {
                const tc = "#" + (r.team_colour || "666666").replace("#", "")
                return (
                  <div key={i} className="sp-radio-item">
                    <div className="sp-radio-driver" style={{color: tc}}>{r.code}</div>
                    <div style={{flex:1, fontSize:'11px', color:'#9ca3af'}}>{r.time || ''}</div>
                    {r.recording_url && (
                      <div className="sp-radio-btn" onClick={() => playStream(r.recording_url)}>▶</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {weather.air_temp !== undefined && (
            <div>
              <div className="sp-sec">🌤 Wetter</div>
              <div className="sp-weather">
                <div className="sp-w-row">
                  <span className="sp-w-label">Luft</span>
                  <span className="sp-w-val">{weather.air_temp} °C</span>
                </div>
                <div className="sp-w-row">
                  <span className="sp-w-label">Strecke</span>
                  <span className="sp-w-val">{weather.track_temp !== undefined ? weather.track_temp + ' °C' : '–'}</span>
                </div>
                <div className="sp-w-row">
                  <span className="sp-w-label">Regen</span>
                  <span className="sp-w-val">{weather.rainfall ? '🌧 Ja' : '☀️ Nein'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className={`f1-root ${widgetHidden ? 'hidden' : ''} ${W <= 340 ? 'f1-sm' : ''}`}>

      <div className="notch" onClick={toggleHidden}>
        {isLive && <span className="notch-live" />}
        <span className="notch-badge">🏎</span>
        <span className="notch-label">F1 2026</span>
        <span className="notch-chev">▶</span>
      </div>

      <div className="widget" style={{ width: W + 'px' }}>

        <div className="hdr">
          <div className="hdr-l">
            <div className="f1-badge">🏎</div>
            <div>
              <div className="h-title">F1 Live 2026</div>
              <div className="h-sub">
                {nextRace ? `Nächstes: ${nextRace.name || ''} · ${daysUntil(nextRace.date)}` : 'Formel 1 Saison 2026'}
              </div>
            </div>
          </div>
          <div className="h-r">
            {isLive && <div className="h-live">● LIVE</div>}
            <div className="h-time">⟳ {now}</div>
            <div className="h-r-btns">
              <span className="sp-toggle" style={{pointerEvents:'auto',cursor:'pointer',fontSize:'9px',color:'#4b5563',padding:'3px 7px',background:'#0f1724',borderRadius:'5px',border:'1px solid #1a0000',display:'inline-block',transition:'color .15s'}} onClick={toggleSidePanel}>{sidePanelOpen ? '◀ Radio' : 'Radio ▶'}</span>
              <span className="hide-btn" onClick={toggleHidden}>✕</span>
            </div>
          </div>
        </div>

        <div className="sbar">
          <div className="sb">
            <div className="sb-v" style={{color: isLive ? '#ffd700' : '#e5e7eb'}}>
              {leader || '–'}
            </div>
            <div className="sb-l">P1</div>
          </div>
          <div className="sb">
            <div className="sb-v">
              {serverCurrentLap ? `${serverCurrentLap}${serverTotalLaps ? '/' + serverTotalLaps : ''}` : '–'}
            </div>
            <div className="sb-l">Rd</div>
          </div>
          <div className="sb">
            <div className="sb-v" style={{color: safetyCarActive ? '#ffcc00' : '#e5e7eb'}}>
              {safetyCarActive ? 'SC' : '–'}
            </div>
            <div className="sb-l">SC</div>
          </div>
          <div className="sb">
            <div className="sb-v">
              {weather && weather.air_temp !== undefined ? `${weather.air_temp}°` : '–'}
            </div>
            <div className="sb-l">°C</div>
          </div>
        </div>

        {rcBanner && (
          <div className={`rc-banner rc-banner-${
            (rcBanner.category || '').toLowerCase().includes('red') ? 'red' :
            (rcBanner.category || '').toLowerCase().includes('vsc') ? 'vsc' : 'sc'
          }`}>
            <span>⚠️</span>
            <span>{rcBanner.message}</span>
          </div>
        )}

        {isLive ? (
          <div className="st-wrap scroll">
            <div className="sec">🏁 Live-Standings</div>
            {liveStandings.map((entry, i) => (
              <StandingRow key={i} entry={entry} />
            ))}
            {liveStandings.length === 0 && (
              <div className="lf-empty">Standings werden geladen…</div>
            )}
          </div>
        ) : (
          <div className="scroll">
            {nextRaceCountdown && (
              <div>
                <div className="sec">⏱ Countdown</div>
                <div className="cdown">
                  <div className="cd"><div className="cd-v">{nextRaceCountdown.d}</div><div className="cd-l">Tage</div></div>
                  <div className="cd"><div className="cd-v">{nextRaceCountdown.h}</div><div className="cd-l">Std</div></div>
                  <div className="cd"><div className="cd-v">{nextRaceCountdown.m}</div><div className="cd-l">Min</div></div>
                </div>
              </div>
            )}
            {lastWinner && (
              <div className="last-res">
                <div className="lr-label">🏆 Letztes Rennen — Sieger</div>
                <div className="lr-winner">
                  <div className="lr-pos">1</div>
                  <div className="lr-info">
                    <div className="lr-name">{lastWinner.name || lastWinner.code || '–'}</div>
                    <div className="lr-team" style={{color: "#" + (lastWinner.team_colour || "666666").replace("#","")}}>
                      {lastWinner.team || ''}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={`streams-wrap ${expanded ? 'expanded' : ''}`}>
          <div className="streams-toggle" onClick={toggleExpand}>
            <span className="lt-l">
              📻 Audio &amp; Streams
              {serverAudio.playing && <span className="lt-live">● WIEDERGABE</span>}
              {onlineStreams.length > 0 && <span className="lt-badge">{onlineStreams.length}</span>}
            </span>
            <span className="chev">▾</span>
          </div>
          <div className="streams-panel">
            <div className="live-actions">
              <div className="la-row">
                {serverAudio.playing ? (
                  <div className="la-btn la-on la-flex" onClick={stopAudio}>⏹ Stop</div>
                ) : (
                  <div className="la-btn la-off la-flex">🔇 Gestoppt</div>
                )}
                <div className="la-btn la-test" onClick={() => setVolume(Math.max(0, serverAudio.volume - 10))}>−</div>
                <div id="f1-vol-display" className="la-btn" style={{fontSize:'11px',color:'#9ca3af',flex:'0 0 auto',padding:'9px 8px'}}>{serverAudio.volume}%</div>
                <div className="la-btn la-test" onClick={() => setVolume(Math.min(100, serverAudio.volume + 10))}>+</div>
              </div>

              <div className="sec" style={{margin:'9px 0 6px',padding:'0'}}>
                Streams ({onlineStreams.length}/{serverStreams.length})
              </div>
              {onlineStreams.length === 0 ? (
                <div className="lf-empty">Streams werden geprüft…</div>
              ) : (
                <div className="streams-scroll">
                  {onlineStreams.map((s, i) => {
                    const playing = serverAudio.playing && serverAudio.url === s.url
                    return (
                      <div key={i} className="la-row">
                        <div className="la-btn la-flex" style={{textAlign:'left',fontSize:'11px',color: playing ? '#e10600' : '#d1d5db',background: playing ? '#1a0000' : '#0d0d0d',border:`1px solid ${playing ? '#5b0000' : '#1a0000'}`}}>
                          {COUNTRY_FLAGS[s.country] || '🌍'} {s.name}
                          <span style={{color:'#4b5563',marginLeft:'5px'}}>{(s.language || '').toUpperCase()}</span>
                        </div>
                        <div className="la-btn la-radio" style={{flex:'0 0 auto'}} onClick={() => playing ? stopAudio() : playStream(s.url)}>
                          {playing ? '⏹' : '▶'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`mstr-wrap ${standingsExpanded ? 'expanded' : ''}`}>
          <div className="mstr-toggle" onClick={toggleStandingsExpand}>
            <span className="lt-l">
              🏆 Fahrerwertung
              {driverStandings.length > 0 && <span className="lt-badge">{driverStandings.length}</span>}
            </span>
            <span className="chev">▾</span>
          </div>
          <div className="mstr-panel">
            <div className="live-actions" style={{padding:'2px 16px 11px'}}>
              {driverStandings.length === 0 ? (
                <div className="lf-empty">Wertung wird geladen…</div>
              ) : (
                <div className="streams-scroll" style={{maxHeight:'300px'}}>
                  {driverStandings.map((d, i) => {
                    const tc = "#" + (d.team_colour || "666666").replace("#", "")
                    const pct = maxPoints > 0 ? (d.points / maxPoints) * 100 : 0
                    return (
                      <div key={i} className="mstr-row">
                        <div className="mstr-pos">{d.position}</div>
                        <div className="mstr-code" style={{color: tc}}>{d.code}</div>
                        <div className="mstr-name">{d.name}</div>
                        <div className="mstr-team" style={{color: tc}}>{d.team}</div>
                        <div className="mstr-bar">
                          <div className="mstr-bar-fill" style={{width: pct + '%', background: tc}} />
                        </div>
                        <div className="mstr-pts">{d.points}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`cal-wrap ${scheduleExpanded ? 'expanded' : ''}`}>
          <div className="cal-toggle" onClick={toggleScheduleExpand}>
            <span className="lt-l">
              📅 Rennkalender 2026
              {races.length > 0 && <span className="lt-badge">{races.length}</span>}
            </span>
            <span className="chev">▾</span>
          </div>
          <div className="cal-panel">
            <div className="live-actions" style={{padding:'2px 16px 11px'}}>
              {races.length === 0 ? (
                <div className="lf-empty">Kalender wird geladen…</div>
              ) : (
                <div className="streams-scroll" style={{maxHeight:'340px'}}>
                  {races.map((r, i) => {
                    const isNext = nextRace && r.round === nextRace.round
                    const isPast = r.is_past
                    return (
                      <div key={i} className={`race-item ${isNext ? 'race-item-next' : ''} ${isPast ? 'race-item-past' : ''}`}>
                        <div className="race-round">R{r.round}</div>
                        <div className="race-name">{r.name}</div>
                        <div className="race-date">{formatDate(r.date)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="foot">
          <div className="ft">Quelle: <b>OpenF1</b> · <b>Jolpica</b></div>
          <div className="ft"><b>Server</b> · {SERVER_URL}</div>
        </div>
      </div>
      <SidePanelView />
    </div>
  )
}
