// LoveSpark Focus — popup.js
'use strict';

// ── Theme system ─────────────────────────────────────────────────────────────

const THEMES = ['dark', 'retro', 'beige', 'slate'];
function applyTheme(t) {
  THEMES.forEach(n => document.body.classList.remove('theme-' + n));
  document.body.classList.add('theme-' + t);
  const btn = document.getElementById('themeTab');
  if (btn) btn.textContent = t;
}
function cycleTheme() {
  const cur = THEMES.find(t => document.body.classList.contains('theme-' + t)) || 'retro';
  const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
  applyTheme(next);
  chrome.storage.local.set({ theme: next });
}
chrome.storage.local.get(['theme', 'darkMode'], ({ theme, darkMode }) => {
  if (!theme && darkMode) theme = 'dark';
  applyTheme(theme || 'retro');
});
document.getElementById('themeTab').addEventListener('click', cycleTheme);

// ── Constants ────────────────────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 52; // 326.73

const SESSION_LABELS = {
  focus: 'F O C U S',
  shortBreak: 'S H O R T  B R E A K',
  longBreak: 'L O N G  B R E A K',
};

const SESSION_COLORS = {
  focus:      '#FF69B4',
  shortBreak: '#C084FC',
  longBreak:  '#5EEAD4',
};

// ── DOM refs ─────────────────────────────────────────────────────────────────

const countdown      = document.getElementById('countdown');
const ringCircle     = document.getElementById('progress-ring-circle');
const sessionLabel   = document.getElementById('session-label');
const currentTaskEl  = document.getElementById('current-task');
const taskInput      = document.getElementById('task-input');
const btnStart       = document.getElementById('btn-start');
const btnReset       = document.getElementById('btn-reset');
const dotsRow        = document.getElementById('dots-row');
const statToday      = document.getElementById('stat-today');
const blockingInd    = document.getElementById('blocking-indicator');
const sparklesEl     = document.getElementById('sparkles');
const settingsBtn    = document.getElementById('settings-btn');
const tabs           = document.querySelectorAll('.tab');
const completedSection = document.getElementById('completed-section');
const completedToggle  = document.getElementById('completed-toggle');
const completedArrow   = document.getElementById('completed-arrow');
const completedCount   = document.getElementById('completed-count');
const completedList    = document.getElementById('completed-list');
const btnClearTasks    = document.getElementById('btn-clear-tasks');

// ── State ─────────────────────────────────────────────────────────────────────

let timerData = {};
let tickInterval = null;
let lastSessionType = null;
let lastTimerState = null;
let completedTasksOpen = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function getDurationSeconds(data) {
  const key = {
    focus: 'focusDuration',
    shortBreak: 'shortBreakDuration',
    longBreak: 'longBreakDuration',
  }[data.sessionType] || 'focusDuration';
  return (data[key] || 25) * 60;
}

function getRemainingSeconds(data) {
  if (data.timerState === 'running' && data.endTime) {
    return Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000));
  }
  if (data.timerState === 'paused' && data.remainingSeconds != null) {
    return data.remainingSeconds;
  }
  return getDurationSeconds(data);
}

// ── Ring update ────────────────────────────────────────────────────────────────

function updateRing(remaining, total) {
  const progress = total > 0 ? remaining / total : 1;
  const offset = CIRCUMFERENCE * (1 - progress);
  ringCircle.style.strokeDashoffset = offset;

  // Color by session type
  const sessionType = timerData.sessionType || 'focus';
  const color = SESSION_COLORS[sessionType];
  ringCircle.style.stroke = `url(#pinkGradient)`;

  // For break sessions, swap gradient colors dynamically
  if (sessionType === 'shortBreak') {
    ringCircle.setAttribute('stroke', '#C084FC');
    ringCircle.style.stroke = '';
  } else if (sessionType === 'longBreak') {
    ringCircle.setAttribute('stroke', '#5EEAD4');
    ringCircle.style.stroke = '';
  } else {
    ringCircle.removeAttribute('stroke');
    ringCircle.style.stroke = 'url(#pinkGradient)';
  }
}

// ── UI render ──────────────────────────────────────────────────────────────────

function render() {
  const data = timerData;
  const sessionType = data.sessionType || 'focus';
  const state = data.timerState || 'idle';

  const total = getDurationSeconds(data);
  const remaining = getRemainingSeconds(data);

  // Countdown
  countdown.textContent = formatTime(remaining);

  // Ring
  updateRing(remaining, total);

  // Session label
  sessionLabel.textContent = SESSION_LABELS[sessionType] || 'F O C U S';
  sessionLabel.className = 'session-label';
  if (sessionType === 'shortBreak') sessionLabel.classList.add('break');
  if (sessionType === 'longBreak')  sessionLabel.classList.add('long');

  // Current task display
  const task = data.currentTask || '';
  if (task && state !== 'idle') {
    currentTaskEl.textContent = task;
    currentTaskEl.style.display = '';
  } else {
    currentTaskEl.style.display = 'none';
  }

  // Task input: disabled while running/paused, show current task text
  taskInput.disabled = state !== 'idle';
  if (state === 'idle' && !taskInput.matches(':focus')) {
    taskInput.value = task;
  }

  // Buttons
  if (state === 'running') {
    btnStart.textContent = '⏸ Pause';
    btnStart.disabled = false;
    btnReset.disabled = false;
  } else if (state === 'paused') {
    btnStart.textContent = '▶ Resume';
    btnStart.disabled = false;
    btnReset.disabled = false;
  } else {
    btnStart.textContent = '▶ Start';
    btnStart.disabled = false;
    btnReset.disabled = true;
  }

  // Session dots (filled = completed in current cycle)
  const cyclePos = data.currentCyclePosition || 0;
  const dots = dotsRow.querySelectorAll('.dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < cyclePos);
  });

  // Stats
  statToday.textContent = `Today: ${data.sessionsCompletedToday || 0} sessions ✨`;

  // Blocking indicator
  const isBlocking = state !== 'idle' && sessionType === 'focus'
    && data.siteBlockingEnabled !== false;
  blockingInd.style.display = isBlocking ? 'inline' : 'none';

  // Active tab
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.type === sessionType);
  });

  // Detect session type change → sparkle
  if (lastSessionType !== null && lastSessionType !== sessionType &&
      lastTimerState !== 'idle') {
    triggerSparkles();
  }
  lastSessionType = sessionType;
  lastTimerState = state;
}

// ── Tick ──────────────────────────────────────────────────────────────────────

function sendBadgeUpdate() {
  if (timerData.timerState !== 'running' || !timerData.endTime) return;
  const remaining = Math.max(0, Math.ceil((timerData.endTime - Date.now()) / 1000));
  const mm = Math.floor(remaining / 60);
  chrome.runtime.sendMessage({
    action: 'UPDATE_BADGE',
    text: remaining > 0 ? `${mm}m` : '',
    sessionType: timerData.sessionType,
  }).catch(() => {});
}

function startTick() {
  stopTick();
  tickInterval = setInterval(() => {
    render();
    sendBadgeUpdate();
  }, 1000);
}

function stopTick() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

// ── Sparkle animation ──────────────────────────────────────────────────────────

function triggerSparkles() {
  const chars = ['✦', '✧', '✨', '💕', '🌸', '✦'];
  chars.forEach((char, i) => {
    setTimeout(() => {
      const el = document.createElement('span');
      el.className = 'sparkle-char';
      el.textContent = char;
      el.style.left = `${20 + Math.random() * 60}%`;
      el.style.bottom = `${20 + Math.random() * 40}%`;
      sparklesEl.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }, i * 120);
  });
}

// ── Load state ────────────────────────────────────────────────────────────────

async function loadState() {
  timerData = await chrome.runtime.sendMessage({ action: 'GET_STATE' });
  render();
  renderCompletedTasks(timerData.completedTasks || []);
  if (timerData.timerState === 'running') {
    startTick();
    sendBadgeUpdate();
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────

btnStart.addEventListener('click', async () => {
  const state = timerData.timerState || 'idle';
  if (state === 'running') {
    await chrome.runtime.sendMessage({ action: 'PAUSE' });
  } else {
    await chrome.runtime.sendMessage({ action: 'START' });
    startTick();
  }
  timerData = await chrome.runtime.sendMessage({ action: 'GET_STATE' });
  render();
});

btnReset.addEventListener('click', async () => {
  stopTick();
  await chrome.runtime.sendMessage({ action: 'RESET' });
  timerData = await chrome.runtime.sendMessage({ action: 'GET_STATE' });
  render();
});

// Session type tabs (only works when idle)
tabs.forEach(tab => {
  tab.addEventListener('click', async () => {
    if (timerData.timerState !== 'idle') return;
    const type = tab.dataset.type;
    await chrome.runtime.sendMessage({ action: 'SET_SESSION_TYPE', sessionType: type });
    timerData.sessionType = type;
    render();
  });
});

settingsBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  window.close();
});

// Task input — save on blur/enter
taskInput.addEventListener('input', () => {
  chrome.storage.local.set({ currentTask: taskInput.value.trim() });
});

taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') taskInput.blur();
});

// Completed tasks toggle
completedToggle.addEventListener('click', () => {
  completedTasksOpen = !completedTasksOpen;
  completedList.style.display = completedTasksOpen ? '' : 'none';
  btnClearTasks.style.display = completedTasksOpen ? '' : 'none';
  completedArrow.classList.toggle('open', completedTasksOpen);
});

// Clear completed tasks
btnClearTasks.addEventListener('click', () => {
  if (confirm('Clear all completed tasks?')) {
    chrome.storage.local.set({ completedTasks: [] });
    renderCompletedTasks([]);
  }
});

function renderCompletedTasks(tasks) {
  if (!tasks || tasks.length === 0) {
    completedSection.style.display = 'none';
    return;
  }
  completedSection.style.display = '';
  completedCount.textContent = `(${tasks.length})`;
  completedList.innerHTML = '';
  // Show most recent first
  const sorted = [...tasks].reverse();
  for (const task of sorted) {
    const item = document.createElement('div');
    item.className = 'completed-item';
    item.innerHTML = `<span class="check">✓</span><span class="task-text"></span>`;
    item.querySelector('.task-text').textContent = task.text;
    completedList.appendChild(item);
  }
}

// Storage changes (e.g., session auto-transitions while popup is open)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  let needsRefresh = false;
  for (const key of Object.keys(changes)) {
    if (['timerState', 'sessionType', 'endTime', 'remainingSeconds',
         'currentCyclePosition', 'sessionsCompletedToday', 'currentTask'].includes(key)) {
      timerData[key] = changes[key].newValue;
      needsRefresh = true;
    }
  }
  if (changes.completedTasks) {
    renderCompletedTasks(changes.completedTasks.newValue || []);
  }
  if (needsRefresh) {
    render();
    if (timerData.timerState === 'running') startTick();
    else stopTick();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadState();
