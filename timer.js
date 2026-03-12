// LoveSpark Focus — timer.js (Full-page timer tab)
'use strict';

// ── Theme dropdown ──────────────────────────────────────────────────────────

const THEMES = ['retro', 'dark', 'beige', 'slate'];
const THEME_NAMES = { retro: 'Retro Pink', dark: 'Dark', beige: 'Beige', slate: 'Slate' };

function applyTheme(t) {
  THEMES.forEach(n => document.body.classList.remove('theme-' + n));
  document.body.classList.add('theme-' + t);
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = THEME_NAMES[t] || t;
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.theme === t);
  });
}

(function initThemeDropdown() {
  const toggle = document.getElementById('themeToggle');
  const menu = document.getElementById('themeMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('open'); });
    menu.addEventListener('click', (e) => {
      const opt = e.target.closest('.theme-option');
      if (!opt) return;
      const theme = opt.dataset.theme;
      applyTheme(theme);
      chrome.storage.local.set({ theme });
      menu.classList.remove('open');
    });
    document.addEventListener('click', () => menu.classList.remove('open'));
  }
  chrome.storage.local.get(['theme', 'darkMode'], ({ theme, darkMode }) => {
    if (!theme && darkMode) theme = 'dark';
    applyTheme(theme || 'retro');
  });
})();

// ── Constants ────────────────────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 52; // 326.73

const SESSION_LABELS = {
  focus: 'F O C U S',
  shortBreak: 'S H O R T  B R E A K',
  longBreak: 'L O N G  B R E A K',
};

const RING_GRADIENTS = {
  focus: 'url(#pinkGradient)',
  shortBreak: 'url(#purpleGradient)',
  longBreak: 'url(#tealGradient)',
};

// ── DOM refs ─────────────────────────────────────────────────────────────────

const countdown       = document.getElementById('countdown');
const ringCircle      = document.getElementById('progress-ring-circle');
const sessionLabel    = document.getElementById('session-label');
const activeTaskDisp  = document.getElementById('active-task-display');
const btnStart        = document.getElementById('btn-start');
const btnReset        = document.getElementById('btn-reset');
const dotsRow         = document.getElementById('dots-row');
const blockingInd     = document.getElementById('blocking-indicator');
const sparklesEl      = document.getElementById('sparkles');
const settingsBtn     = document.getElementById('settings-btn');
const sparkyEl        = document.getElementById('sparky');
const tabs            = document.querySelectorAll('.tab');
const statSessions    = document.getElementById('stat-sessions');
const statMinutes     = document.getElementById('stat-minutes');
const statStreak      = document.getElementById('stat-streak');
const taskListEl      = document.getElementById('task-list');
const btnAddTask      = document.getElementById('btn-add-task');
const addTaskForm     = document.getElementById('add-task-form');
const newTaskText     = document.getElementById('new-task-text');
const pomoEst         = document.getElementById('pomo-est');
const pomoDec         = document.getElementById('pomo-dec');
const pomoInc         = document.getElementById('pomo-inc');
const btnSaveTask     = document.getElementById('btn-save-task');
const btnCancelTask   = document.getElementById('btn-cancel-task');
const btnClearDone    = document.getElementById('btn-clear-done');

// ── State ────────────────────────────────────────────────────────────────────

let timerData = {};
let tickInterval = null;
let lastSessionType = null;
let lastTimerState = null;
let pomoEstValue = 1;
let openMenuTaskId = null;
let editingTaskId = null;

// Drag state
let draggedIndex = null;
let dragOverIndex = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function getDurationSeconds(data) {
  const key = { focus: 'focusDuration', shortBreak: 'shortBreakDuration', longBreak: 'longBreakDuration' }[data.sessionType] || 'focusDuration';
  return (data[key] || 25) * 60;
}

function getRemainingSeconds(data) {
  if (data.timerState === 'running' && data.endTime) return Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000));
  if (data.timerState === 'paused' && data.remainingSeconds != null) return data.remainingSeconds;
  return getDurationSeconds(data);
}

async function msg(action, extra = {}) {
  try {
    return await chrome.runtime.sendMessage({ action, ...extra });
  } catch (err) {
    console.warn('LoveSpark Focus: sendMessage failed, retrying...', err.message);
    await new Promise(r => setTimeout(r, 500));
    try {
      return await chrome.runtime.sendMessage({ action, ...extra });
    } catch (retryErr) {
      console.error('LoveSpark Focus: sendMessage retry failed', retryErr.message);
      return null;
    }
  }
}

// ── Ring update ──────────────────────────────────────────────────────────────

function updateRing(remaining, total) {
  const progress = total > 0 ? remaining / total : 1;
  const offset = CIRCUMFERENCE * (1 - progress);
  ringCircle.style.strokeDashoffset = offset;
  const sessionType = timerData.sessionType || 'focus';
  ringCircle.removeAttribute('stroke');
  ringCircle.style.stroke = RING_GRADIENTS[sessionType] || RING_GRADIENTS.focus;
}

// ── UI render ────────────────────────────────────────────────────────────────

function render() {
  const data = timerData;
  const sessionType = data.sessionType || 'focus';
  const state = data.timerState || 'idle';
  const total = getDurationSeconds(data);
  const remaining = getRemainingSeconds(data);

  // Countdown + ring
  countdown.textContent = formatTime(remaining);
  updateRing(remaining, total);

  // Session label
  sessionLabel.textContent = SESSION_LABELS[sessionType] || 'F O C U S';
  sessionLabel.className = 'session-label';
  if (sessionType === 'shortBreak') sessionLabel.classList.add('break');
  if (sessionType === 'longBreak') sessionLabel.classList.add('long');

  // Active task display below timer
  const tasks = data.tasks || [];
  const activeTask = data.activeTaskId ? tasks.find(t => t.id === data.activeTaskId) : null;
  if (activeTask && state !== 'idle') {
    activeTaskDisp.textContent = 'Working on: ' + activeTask.text;
    activeTaskDisp.style.display = '';
  } else if (activeTask) {
    activeTaskDisp.textContent = 'Up next: ' + activeTask.text;
    activeTaskDisp.style.display = '';
  } else {
    activeTaskDisp.style.display = 'none';
  }

  // Buttons
  if (state === 'running') {
    btnStart.textContent = '\u23F8 Pause';
    btnStart.disabled = false;
    btnReset.disabled = false;
  } else if (state === 'paused') {
    btnStart.textContent = '\u25B6 Resume';
    btnStart.disabled = false;
    btnReset.disabled = false;
  } else {
    btnStart.textContent = '\u25B6 Start';
    btnStart.disabled = false;
    btnReset.disabled = true;
  }

  // Session dots
  const cyclePos = data.currentCyclePosition || 0;
  dotsRow.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < cyclePos);
  });

  // Stats
  statSessions.textContent = data.sessionsCompletedToday || 0;
  const mins = data.focusMinutesToday || 0;
  statMinutes.textContent = mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${mins} min`;
  statStreak.textContent = `${data.currentStreak || 0} days`;

  // Sparky reactions
  if (sparkyEl) {
    sparkyEl.className = 'sparky';
    if (state === 'running' && sessionType === 'focus') sparkyEl.classList.add('sparky-focusing');
    else if (state === 'running' && sessionType === 'shortBreak') sparkyEl.classList.add('sparky-break');
    else if (state === 'running' && sessionType === 'longBreak') sparkyEl.classList.add('sparky-longbreak');
  }

  // Blocking indicator
  const isBlocking = state !== 'idle' && sessionType === 'focus' && data.siteBlockingEnabled !== false;
  blockingInd.style.display = isBlocking ? '' : 'none';

  // Active tabs
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.type === sessionType));

  // Session change sparkle
  if (lastSessionType !== null && lastSessionType !== sessionType && lastTimerState !== 'idle') {
    triggerSparkles();
  }
  lastSessionType = sessionType;
  lastTimerState = state;
}

// ── Task rendering ───────────────────────────────────────────────────────────

function renderTasks() {
  const tasks = timerData.tasks || [];
  const activeId = timerData.activeTaskId;
  taskListEl.textContent = '';

  tasks.forEach((task, index) => {
    const item = document.createElement('div');
    item.className = 'task-item';
    if (task.id === activeId) item.classList.add('active');
    if (task.completed) item.classList.add('completed');
    item.dataset.index = index;
    item.dataset.taskId = task.id;

    // Drag handle
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '\u2261';
    handle.addEventListener('mousedown', (e) => startDrag(e, index));
    handle.addEventListener('touchstart', (e) => startDrag(e, index), { passive: false });

    // Checkbox
    const checkbox = document.createElement('button');
    checkbox.className = 'task-checkbox' + (task.completed ? ' checked' : '');
    checkbox.textContent = task.completed ? '\u2713' : '';
    checkbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      await msg('COMPLETE_TASK', { taskId: task.id });
      timerData = await msg('GET_STATE');
      renderTasks();
    });

    // Text (or edit input)
    let textEl;
    if (editingTaskId === task.id) {
      textEl = document.createElement('input');
      textEl.type = 'text';
      textEl.className = 'task-text-input';
      textEl.value = task.text;
      textEl.maxLength = 200;
      textEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { saveTaskEdit(task.id, textEl.value); }
        if (e.key === 'Escape') { editingTaskId = null; renderTasks(); }
      });
      textEl.addEventListener('blur', () => { saveTaskEdit(task.id, textEl.value); });
      setTimeout(() => textEl.focus(), 0);
    } else {
      textEl = document.createElement('span');
      textEl.className = 'task-text';
      textEl.textContent = task.text;
    }

    // Pomo counter
    const pomoCount = document.createElement('span');
    pomoCount.className = 'task-pomo-count';
    pomoCount.textContent = `${task.completedPomos || 0}/${task.estimatedPomos || 1}`;

    // Menu button
    const menuBtn = document.createElement('button');
    menuBtn.className = 'task-menu-btn';
    menuBtn.textContent = '\u22EF';
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTaskMenu(task.id);
    });

    item.appendChild(handle);
    item.appendChild(checkbox);
    item.appendChild(textEl);
    item.appendChild(pomoCount);
    item.appendChild(menuBtn);

    // Click row body to set active
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.drag-handle') || e.target.closest('.task-checkbox') ||
          e.target.closest('.task-menu-btn') || e.target.closest('.task-action-menu') ||
          e.target.closest('.task-text-input')) return;
      if (!task.completed) {
        await msg('SET_ACTIVE_TASK', { taskId: task.id });
        timerData = await msg('GET_STATE');
        render();
        renderTasks();
      }
    });

    // Render open menu if this task has one
    if (openMenuTaskId === task.id) {
      const menu = createTaskMenu(task);
      item.appendChild(menu);
    }

    taskListEl.appendChild(item);
  });

  // Show/hide clear done button
  const hasDone = tasks.some(t => t.completed);
  btnClearDone.style.display = hasDone ? '' : 'none';
}

function createTaskMenu(task) {
  const menu = document.createElement('div');
  menu.className = 'task-action-menu';

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openMenuTaskId = null;
    editingTaskId = task.id;
    renderTasks();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-action';
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    openMenuTaskId = null;
    await msg('DELETE_TASK', { taskId: task.id });
    timerData = await msg('GET_STATE');
    renderTasks();
  });

  menu.appendChild(editBtn);
  menu.appendChild(deleteBtn);
  return menu;
}

function toggleTaskMenu(taskId) {
  openMenuTaskId = openMenuTaskId === taskId ? null : taskId;
  renderTasks();
}

async function saveTaskEdit(taskId, newText) {
  const trimmed = newText.trim();
  editingTaskId = null;
  if (trimmed) {
    await msg('UPDATE_TASK', { taskId, patch: { text: trimmed } });
    timerData = await msg('GET_STATE');
  }
  renderTasks();
}

// Close menus on outside click
document.addEventListener('click', (e) => {
  if (openMenuTaskId && !e.target.closest('.task-action-menu') && !e.target.closest('.task-menu-btn')) {
    openMenuTaskId = null;
    renderTasks();
  }
});

// ── Drag and drop ────────────────────────────────────────────────────────────

function startDrag(e, index) {
  e.preventDefault();
  draggedIndex = index;

  const items = taskListEl.querySelectorAll('.task-item');
  if (items[index]) items[index].classList.add('dragging');

  const onMove = (ev) => {
    const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
    let newOverIndex = null;
    items.forEach((item, i) => {
      const rect = item.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY >= rect.top && clientY <= rect.bottom) {
        newOverIndex = clientY < mid ? i : i + 1;
      }
    });

    if (newOverIndex !== null && newOverIndex !== dragOverIndex) {
      dragOverIndex = newOverIndex;
      taskListEl.querySelectorAll('.drop-indicator').forEach(el => el.remove());
      const indicator = document.createElement('div');
      indicator.className = 'drop-indicator';
      if (dragOverIndex < items.length) {
        taskListEl.insertBefore(indicator, items[dragOverIndex]);
      } else {
        taskListEl.appendChild(indicator);
      }
    }
  };

  const onEnd = async () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);

    taskListEl.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    items.forEach(item => item.classList.remove('dragging'));

    if (draggedIndex !== null && dragOverIndex !== null) {
      let toIndex = dragOverIndex > draggedIndex ? dragOverIndex - 1 : dragOverIndex;
      if (toIndex !== draggedIndex) {
        try {
          await msg('REORDER_TASKS', { fromIndex: draggedIndex, toIndex });
        } catch (e) {
          await new Promise(r => setTimeout(r, 200));
          await msg('REORDER_TASKS', { fromIndex: draggedIndex, toIndex });
        }
        timerData = await msg('GET_STATE');
        renderTasks();
      }
    }

    draggedIndex = null;
    dragOverIndex = null;
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
}

// ── Add task form ────────────────────────────────────────────────────────────

btnAddTask.addEventListener('click', () => {
  addTaskForm.classList.toggle('open');
  if (addTaskForm.classList.contains('open')) {
    newTaskText.value = '';
    pomoEstValue = 1;
    pomoEst.textContent = '1';
    newTaskText.focus();
  }
});

pomoDec.addEventListener('click', () => {
  if (pomoEstValue > 1) {
    pomoEstValue--;
    pomoEst.textContent = pomoEstValue;
  }
});

pomoInc.addEventListener('click', () => {
  if (pomoEstValue < 20) {
    pomoEstValue++;
    pomoEst.textContent = pomoEstValue;
  }
});

btnSaveTask.addEventListener('click', async () => {
  const text = newTaskText.value.trim();
  if (!text) return;
  try {
    await msg('ADD_TASK', { text, estimatedPomos: pomoEstValue });
  } catch (e) {
    await new Promise(r => setTimeout(r, 200));
    await msg('ADD_TASK', { text, estimatedPomos: pomoEstValue });
  }
  addTaskForm.classList.remove('open');
  newTaskText.value = '';
  pomoEstValue = 1;
  pomoEst.textContent = '1';
  timerData = await msg('GET_STATE');
  renderTasks();
});

btnCancelTask.addEventListener('click', () => {
  addTaskForm.classList.remove('open');
});

newTaskText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSaveTask.click();
  if (e.key === 'Escape') addTaskForm.classList.remove('open');
});

btnClearDone.addEventListener('click', async () => {
  try {
    await msg('CLEAR_COMPLETED_TASKS');
  } catch (e) {
    await new Promise(r => setTimeout(r, 200));
    await msg('CLEAR_COMPLETED_TASKS');
  }
  timerData = await msg('GET_STATE');
  renderTasks();
});

// ── Tick ─────────────────────────────────────────────────────────────────────

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
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
}

// ── Sparkle animation ────────────────────────────────────────────────────────

function triggerSparkles() {
  const chars = ['\u2726', '\u2727', '\u2728', '\uD83D\uDC95', '\uD83C\uDF38', '\u2726'];
  chars.forEach((char, i) => {
    setTimeout(() => {
      const el = document.createElement('span');
      el.className = 'sparkle-char';
      el.textContent = char;
      el.style.left = `${20 + Math.random() * 60}%`;
      el.style.top = `${30 + Math.random() * 30}%`;
      sparklesEl.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }, i * 120);
  });
}

// ── Sound ────────────────────────────────────────────────────────────────────

function playChime(volume, type) {
  try {
    const ctx = new AudioContext();
    const vol = Math.max(0, Math.min(1, volume)) * 0.28;
    const patterns = {
      'focus-end':     [523.25, 659.25, 783.99],
      'break-end':     [783.99, 659.25, 523.25],
      'longbreak-end': [523.25, 659.25, 783.99, 1046.50],
    };
    const notes = patterns[type] || patterns['focus-end'];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.3;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.8);
    });
  } catch (e) {}
}

// ── Load state ───────────────────────────────────────────────────────────────

async function loadState() {
  const result = await msg('GET_STATE');
  if (!result) return; // Service worker unavailable
  timerData = result;
  render();
  renderTasks();
  if (timerData.timerState === 'running') {
    startTick();
    sendBadgeUpdate();
  }
}

// ── Event handlers ───────────────────────────────────────────────────────────

btnStart.addEventListener('click', async () => {
  const state = timerData.timerState || 'idle';
  if (state === 'running') {
    await msg('PAUSE');
  } else {
    await msg('START');
    startTick();
  }
  timerData = await msg('GET_STATE');
  render();
});

btnReset.addEventListener('click', async () => {
  stopTick();
  await msg('RESET');
  timerData = await msg('GET_STATE');
  render();
});

tabs.forEach(tab => {
  tab.addEventListener('click', async () => {
    if (timerData.timerState !== 'idle') return;
    const type = tab.dataset.type;
    await msg('SET_SESSION_TYPE', { sessionType: type });
    timerData.sessionType = type;
    render();
  });
});

settingsBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
});

// ── Storage change listener ──────────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  let needsRefresh = false;
  let needsTaskRefresh = false;

  for (const key of Object.keys(changes)) {
    if (['timerState', 'sessionType', 'endTime', 'remainingSeconds',
         'currentCyclePosition', 'sessionsCompletedToday', 'currentTask',
         'focusMinutesToday', 'currentStreak', 'siteBlockingEnabled'].includes(key)) {
      timerData[key] = changes[key].newValue;
      needsRefresh = true;
    }
    if (key === 'tasks' || key === 'activeTaskId') {
      timerData[key] = changes[key].newValue;
      needsTaskRefresh = true;
      needsRefresh = true;
    }
  }

  // Sparky celebration
  if (changes.timerState?.newValue === 'idle' && changes.timerState?.oldValue === 'running' && sparkyEl) {
    sparkyEl.classList.add('sparky-complete');
    sparkyEl.addEventListener('animationend', () => sparkyEl.classList.remove('sparky-complete'), { once: true });
  }

  // Chime
  if (changes.lastChimeTime) {
    const vol = timerData.soundEnabled ? (timerData.soundVolume ?? 0.5) : 0;
    const type = changes.lastChimeType?.newValue || timerData.lastChimeType || 'focus-end';
    if (vol > 0) playChime(vol, type);
  }
  if (changes.lastChimeType) timerData.lastChimeType = changes.lastChimeType.newValue;

  if (needsRefresh) {
    render();
    if (timerData.timerState === 'running') startTick();
    else stopTick();
  }
  if (needsTaskRefresh) renderTasks();
});

// ── Init ─────────────────────────────────────────────────────────────────────

// Dynamic version in footer
const footerVersionEl = document.getElementById('footer-version');
if (footerVersionEl) {
  footerVersionEl.textContent = `LoveSpark Focus v${chrome.runtime.getManifest().version}`;
}

loadState();
