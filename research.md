# LoveSpark Focus — Research

## Architecture Overview

3-layer Manifest V3 extension:
- **Service Worker** (`background.js`) — single source of truth for timer state, uses `chrome.alarms` for all timing
- **Popup** (`popup.html/css/js`) — 300px SVG progress ring UI, task management, theme cycling
- **Content Overlay** (`content-overlay.js/css`) — Shadow DOM floating timer widget, draggable, Web Audio chime

Supporting pages:
- **Settings** (`settings.html/js/css`) — durations, auto-start, site blocking, sound, overlay, stats
- **Blocked** (`blocked.html/js/css`) — shown when visiting blocked sites during focus

## File Inventory

| File | Lines | Role |
|------|-------|------|
| manifest.json | 68 | MV3, perms: storage, alarms, declarativeNetRequest, notifications |
| background.js | ~520 | Timer engine, alarms, site blocking, badge, stats |
| popup.html | ~130 | SVG ring, session tabs, task input, stats footer |
| popup.css | ~480 | 4 themes (dark/retro/beige/slate), animations |
| popup.js | ~380 | Timer display, task CRUD, theme cycling |
| content-overlay.js | ~280 | Shadow DOM widget, drag, chime, state sync |
| content-overlay.css | ~200 | Overlay pill/dot modes, theme vars |
| settings.html | ~120 | Full settings page |
| settings.js | ~150 | Settings load/save, stats display |
| settings.css | ~180 | Settings styling |
| blocked.html | ~50 | Block page |
| blocked.js | ~80 | Countdown, messages |
| blocked.css | ~100 | Animated flower |

## What Works Well (8/10 foundation)

1. **Alarms-based timer** — `sessionEnd`, `badgeTick`, `dailyReset` all use `chrome.alarms` correctly for MV3
2. **4 themes** — dark, retro, beige, slate all implemented in popup with proper CSS variables
3. **Site blocking** — `declarativeNetRequest` dynamic rules, properly add/remove on session start/end
4. **Task tracking** — add tasks, mark complete, persisted in storage
5. **Web Audio chime** — sine wave notification on session complete (content overlay)
6. **Shadow DOM overlay** — proper isolation, draggable, two modes (pill/dot)
7. **Badge updates** — MM:SS countdown on extension icon
8. **Auto-start** — configurable auto-start for breaks and focus sessions (uses chrome.alarms after audit fix)
9. **Stats** — sessionsCompletedToday, totalSessionsCompleted, lastResetDate tracked
10. **Daily reset** — alarm-based reset at midnight

## Bugs Found

### BUG-1: Missing Sparky mascot (CRITICAL — brand compliance)
- **popup.html** — no Sparky image anywhere
- **settings.html** — no Sparky image anywhere
- Required by CLAUDE.md: "Every new extension popup, settings page must include Sparky"

### BUG-2: SVG ring color doesn't change on breaks
- `popup.js` `updateDisplay()` sets `--progress-color` CSS variable but the SVG `<circle>` uses inline `stroke` attribute which overrides CSS
- Ring stays same color regardless of session type (focus/short break/long break)

### BUG-3: Settings page doesn't inherit theme
- `settings.js` loads settings but never reads/applies the `theme` key
- Settings page always shows default appearance regardless of user's theme choice

### BUG-4: Overlay tickInterval potential memory leak
- `content-overlay.js` creates `setInterval(1000)` for display updates
- Never cleared when overlay is hidden/minimized — keeps ticking forever
- Should clear interval when not visible, restart when shown

### BUG-5: Popup display tick not synced
- `popup.js` uses `setInterval(1000)` to poll storage for timer state
- Can drift from actual alarm-based timer, showing ±1 second jitter
- Not a functional bug but feels janky

## What's Missing (vs user's upgrade requirements)

### MISSING-1: Full LoveSpark UI aesthetic
- No `--ls-bg-gradient` background (uses dark theme by default)
- No frosted glass surfaces (`--ls-glass`, `backdrop-filter: blur`)
- No `Press Start 2P` display font for headers
- No `DM Mono` as body font
- No consistent use of LoveSpark CSS variable tokens
- Popup is 300px (should be 320-360px per CLAUDE.md)

### MISSING-2: Sparky reactions to session state
- No Sparky anywhere, let alone reactive Sparky
- Need: focusing face, break face, session complete celebration, long break relaxed

### MISSING-3: Sound notifications
- Chime exists in overlay only (Web Audio sine wave)
- No chime in popup
- No sound settings UI beyond basic toggle
- No distinct sounds for different events (session end, break end)
- Should be off by default per user's request

### MISSING-4: Stats tracking improvements
- Basic stats exist (sessionsToday, totalSessions)
- Missing: focus minutes today, focus minutes total, streak tracking
- Missing: visual stats display in popup (currently just small text footer)
- Missing: streak calculation logic

### MISSING-5: Settings page improvements
- Settings page exists and is functional
- Missing: theme inheritance from popup
- Missing: better visual design matching LoveSpark brand
- Missing: Sparky

### MISSING-6: Timer resilience
- Timer state IS persisted (endTime + remainingSeconds in storage)
- `recoverTimer()` in background.js handles service worker restart
- Missing: persistence every second (currently only saves on start/pause/complete)
- Missing: survives system sleep (endTime-based recovery should work but untested)
- Missing: popup reconnection after extension reload

## Storage Schema (current)

```javascript
{
  timerState: 'idle' | 'running' | 'paused',
  sessionType: 'focus' | 'shortBreak' | 'longBreak',
  endTime: number,              // Date.now() + remaining ms
  remainingSeconds: number,     // saved on pause
  currentCyclePosition: number, // 0-7 (4 focus + 3 short breaks + 1 long)

  // Stats
  sessionsCompletedToday: number,
  totalSessionsCompleted: number,
  lastResetDate: 'YYYY-MM-DD',

  // Settings
  focusDuration: number,        // minutes (default 25)
  shortBreakDuration: number,   // minutes (default 5)
  longBreakDuration: number,    // minutes (default 15)
  autoStartBreaks: boolean,
  autoStartFocus: boolean,
  blockedSites: string[],
  soundEnabled: boolean,
  soundVolume: number,          // 0-1

  // Tasks
  currentTask: string,
  completedTasks: string[],

  // UI
  overlayPosition: { x, y },
  theme: 'dark' | 'retro' | 'beige' | 'slate'
}
```

## Dependencies

- No external libraries (pure vanilla JS)
- `browser-polyfill.min.js` in `lib/` (not currently referenced in popup.html — potential issue)
- Icons at `icons/icon-16.png`, `icon-48.png`, `icon-128.png`
- No mascot.png (added during audit but not referenced in HTML)
- Google Fonts not loaded (missing DM Mono + Press Start 2P)

## Summary

Solid 8/10 foundation — the timer engine, alarms architecture, and site blocking are production-quality. The main gaps are all UI/brand: no LoveSpark aesthetic, no Sparky, no frosted glass, no brand fonts. The 4 bugs are all fixable without architectural changes. The upgrade is primarily a UI overhaul + stats enhancement + Sparky integration, not a rewrite.
