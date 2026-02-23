// LoveSpark Focus — content-overlay.js
// Floating timer overlay injected on all pages via Shadow DOM.
// Syncs with timer state via chrome.storage.onChanged.
'use strict';

// ── Guard: skip extension pages ─────────────────────────────────────────────
if (location.protocol === 'chrome-extension:' || location.protocol === 'moz-extension:') {
  // Don't inject on our own pages
  throw new Error('LoveSpark Focus: skipping extension page');
}

// ── Shadow DOM setup ─────────────────────────────────────────────────────────

let host = null;
let shadow = null;
let overlayEl = null;
let dotEl = null;
let tickInterval = null;
let currentState = {};
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

const OVERLAY_STYLES = `
  :host {
    all: initial;
    display: block;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'DM Mono', 'Courier New', monospace;
  }

  /* ── Expanded pill ── */
  .overlay-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(26, 10, 18, 0.92);
    border: 1px solid rgba(255, 105, 180, 0.3);
    border-radius: 24px;
    padding: 8px 12px;
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 12px rgba(255,105,180,0.15);
    cursor: grab;
    user-select: none;
    white-space: nowrap;
    min-width: 160px;
    transition: box-shadow 0.2s;
  }

  .overlay-pill:hover {
    box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 18px rgba(255,105,180,0.25);
  }

  .overlay-pill:active {
    cursor: grabbing;
  }

  .session-badge {
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #FF69B4;
    flex-shrink: 0;
  }

  .session-badge.break  { color: #C084FC; }
  .session-badge.long   { color: #5EEAD4; }

  .overlay-time {
    font-size: 15px;
    font-weight: 500;
    color: #FFB6C1;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
    flex: 1;
    text-align: center;
  }

  .overlay-controls {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .ctrl-btn {
    background: none;
    border: none;
    color: rgba(255,182,193,0.6);
    font-size: 13px;
    cursor: pointer;
    padding: 0 3px;
    line-height: 1;
    transition: color 0.15s;
    font-family: inherit;
  }

  .ctrl-btn:hover {
    color: #FFB6C1;
  }

  /* ── Minimized dot ── */
  .overlay-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #FF69B4;
    box-shadow: 0 0 8px rgba(255,105,180,0.7);
    cursor: pointer;
    animation: dot-pulse 2s ease-in-out infinite;
    transition: transform 0.2s;
  }

  .overlay-dot:hover {
    transform: scale(1.4);
  }

  @keyframes dot-pulse {
    0%, 100% { opacity: 0.65; box-shadow: 0 0 6px rgba(255,105,180,0.5); }
    50%       { opacity: 1;    box-shadow: 0 0 14px rgba(255,105,180,0.9); }
  }

  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;

function createShadowDOM() {
  if (host) return; // already exists

  host = document.createElement('div');
  host.id = 'lovespark-focus-overlay';
  document.body.appendChild(host);

  shadow = host.attachShadow({ mode: 'closed' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = OVERLAY_STYLES;
  shadow.appendChild(style);

  // Expanded pill
  overlayEl = document.createElement('div');
  overlayEl.className = 'overlay-pill';
  overlayEl.innerHTML = `
    <span class="session-badge" id="ov-badge">FOCUS</span>
    <span class="overlay-time" id="ov-time">25:00</span>
    <div class="overlay-controls">
      <button class="ctrl-btn" id="ov-minimize" title="Minimize">─</button>
      <button class="ctrl-btn" id="ov-hide"     title="Hide">✕</button>
    </div>
  `;
  shadow.appendChild(overlayEl);

  // Minimized dot (hidden by default)
  dotEl = document.createElement('div');
  dotEl.className = 'overlay-dot';
  dotEl.title = 'LoveSpark Focus — click to expand';
  dotEl.style.display = 'none';
  shadow.appendChild(dotEl);

  // Wire up controls
  shadow.getElementById('ov-minimize').addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.storage.local.set({ overlayMinimized: true });
  });

  shadow.getElementById('ov-hide').addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.storage.local.set({ overlayVisible: false });
  });

  dotEl.addEventListener('click', () => {
    chrome.storage.local.set({ overlayMinimized: false });
  });

  // Dragging
  overlayEl.addEventListener('mousedown', onDragStart);
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);

  // Restore saved position
  chrome.storage.local.get(['overlayPosition', 'overlayMinimized', 'overlayVisible'],
    (data) => {
      if (data.overlayPosition?.x != null) {
        host.style.right = 'auto';
        host.style.bottom = 'auto';
        host.style.left = data.overlayPosition.x + 'px';
        host.style.top = data.overlayPosition.y + 'px';
      }
      setMinimized(!!data.overlayMinimized);
      if (data.overlayVisible === false) setVisible(false);
    }
  );
}

function destroyShadowDOM() {
  if (host) {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    host.remove();
    host = null;
    shadow = null;
    overlayEl = null;
    dotEl = null;
  }
}

// ── Display state management ────────────────────────────────────────────────

function setVisible(visible) {
  if (!visible) {
    if (host) host.style.display = 'none';
  } else {
    if (!host) createShadowDOM();
    if (host) host.style.display = '';
  }
}

function setMinimized(minimized) {
  if (!overlayEl || !dotEl) return;
  overlayEl.style.display = minimized ? 'none' : '';
  dotEl.style.display = minimized ? 'block' : 'none';
}

// ── Countdown display ────────────────────────────────────────────────────────

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function getDurationSeconds(data) {
  const key = {
    focus: 'focusDuration',
    shortBreak: 'shortBreakDuration',
    longBreak: 'longBreakDuration',
  }[data.sessionType] || 'focusDuration';
  return (data[key] || 25) * 60;
}

function updateDisplay() {
  if (!shadow) return;
  const data = currentState;
  const sessionType = data.sessionType || 'focus';
  const state = data.timerState || 'idle';

  let remaining;
  if (state === 'running' && data.endTime) {
    remaining = Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000));
  } else if (state === 'paused' && data.remainingSeconds != null) {
    remaining = data.remainingSeconds;
  } else {
    remaining = getDurationSeconds(data);
  }

  const timeEl = shadow.getElementById('ov-time');
  const badgeEl = shadow.getElementById('ov-badge');
  if (timeEl) timeEl.textContent = formatTime(remaining);

  if (badgeEl) {
    const labels = { focus: 'FOCUS', shortBreak: 'BREAK', longBreak: 'LONG' };
    badgeEl.textContent = labels[sessionType] || 'FOCUS';
    badgeEl.className = 'session-badge';
    if (sessionType === 'shortBreak') badgeEl.classList.add('break');
    if (sessionType === 'longBreak')  badgeEl.classList.add('long');
  }
}

function sendBadgeUpdate() {
  const data = currentState;
  if (data.timerState !== 'running' || !data.endTime) return;
  const remaining = Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000));
  const mm = Math.floor(remaining / 60);
  const isBreak = data.sessionType === 'shortBreak' || data.sessionType === 'longBreak';
  chrome.runtime.sendMessage({
    action: 'UPDATE_BADGE',
    text: remaining > 0 ? `${mm}m` : '',
    sessionType: data.sessionType,
  }).catch(() => {});
}

function startTick() {
  stopTick();
  updateDisplay();
  sendBadgeUpdate();
  tickInterval = setInterval(() => {
    updateDisplay();
    sendBadgeUpdate();
  }, 1000);
}

function stopTick() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
}

// ── Web Audio chime ──────────────────────────────────────────────────────────

function playChime(volume) {
  try {
    const ctx = new AudioContext();
    const vol = typeof volume === 'number' ? Math.max(0, Math.min(1, volume)) : 0.5;

    [523.25, 659.25].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.35;

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol * 0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  } catch (e) {
    // AudioContext may be blocked if no user interaction — fail silently
  }
}

// ── Dragging ─────────────────────────────────────────────────────────────────

function onDragStart(e) {
  if (e.target.closest('.ctrl-btn')) return;
  isDragging = true;
  const rect = host.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  e.preventDefault();
}

function onDragMove(e) {
  if (!isDragging || !host) return;

  let x = e.clientX - dragOffsetX;
  let y = e.clientY - dragOffsetY;

  // Constrain to viewport
  const rect = host.getBoundingClientRect();
  x = Math.max(0, Math.min(x, window.innerWidth  - rect.width));
  y = Math.max(0, Math.min(y, window.innerHeight - rect.height));

  host.style.right  = 'auto';
  host.style.bottom = 'auto';
  host.style.left   = x + 'px';
  host.style.top    = y + 'px';
}

function onDragEnd(e) {
  if (!isDragging || !host) return;
  isDragging = false;

  const rect = host.getBoundingClientRect();
  chrome.storage.local.set({
    overlayPosition: { x: rect.left, y: rect.top }
  });
}

// ── Storage change listener ───────────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  // Apply changes to local state
  for (const [key, { newValue }] of Object.entries(changes)) {
    currentState[key] = newValue;
  }

  // Handle chime trigger
  if (changes.lastChimeTime) {
    const vol = currentState.soundEnabled !== false
      ? (currentState.soundVolume ?? 0.5)
      : 0;
    if (vol > 0) playChime(vol);
  }

  // Timer state changes
  if (changes.timerState || changes.endTime || changes.sessionType || changes.remainingSeconds) {
    const state = currentState.timerState || 'idle';
    if (state === 'running') {
      if (!host) createShadowDOM();
      setVisible(true);
      startTick();
    } else {
      stopTick();
      updateDisplay();
    }
  }

  // Overlay visibility
  if (changes.overlayVisible) {
    setVisible(changes.overlayVisible.newValue !== false);
  }

  if (changes.overlayMinimized) {
    setMinimized(!!changes.overlayMinimized.newValue);
  }
});

// ── Initialize ────────────────────────────────────────────────────────────────

chrome.storage.local.get(null, (data) => {
  currentState = data || {};

  // Only show overlay if timer is running or was paused
  const state = data.timerState || 'idle';
  const overlayVisible = data.overlayVisible !== false;

  if (!overlayVisible) return;

  if (state === 'running' || state === 'paused') {
    createShadowDOM();
    setMinimized(!!data.overlayMinimized);

    if (state === 'running') startTick();
    else updateDisplay();
  }
  // If idle, don't show overlay until timer starts
});
