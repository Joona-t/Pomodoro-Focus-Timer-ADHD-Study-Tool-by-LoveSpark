// LoveSpark Focus — settings.js
'use strict';

// Theme dropdown
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

// ── State ─────────────────────────────────────────────────────────────────────
let blockedSites = [];
let cachedData = {};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const durInputs = {
  focusDuration:      document.getElementById('focusDuration'),
  shortBreakDuration: document.getElementById('shortBreakDuration'),
  longBreakDuration:  document.getElementById('longBreakDuration'),
  longBreakInterval:  document.getElementById('longBreakInterval'),
};

const autoStartBreaks   = document.getElementById('autoStartBreaks');
const autoStartFocus    = document.getElementById('autoStartFocus');
const siteBlockEnabled  = document.getElementById('siteBlockingEnabled');
const siteInput         = document.getElementById('site-input');
const siteAddBtn        = document.getElementById('site-add');
const siteListEl        = document.getElementById('site-list');
const soundEnabled      = document.getElementById('soundEnabled');
const soundVolume       = document.getElementById('soundVolume');
const volumeDisplay     = document.getElementById('volume-display');
const testSoundBtn      = document.getElementById('test-sound');
const overlayVisible    = document.getElementById('overlayVisible');
const resetPositionBtn  = document.getElementById('reset-position');
const resetStatsBtn     = document.getElementById('reset-stats');
const statToday         = document.getElementById('stat-today');
const statTotal         = document.getElementById('stat-total');
const statTime          = document.getElementById('stat-time');
const statTotalTime     = document.getElementById('stat-total-time');
const statStreakEl       = document.getElementById('stat-streak');
const statLongestEl     = document.getElementById('stat-longest');

// ── Helpers ────────────────────────────────────────────────────────────────────

function msg(action, extra = {}) {
  return chrome.runtime.sendMessage({ action, ...extra });
}

function saveSettings(patch) {
  msg('UPDATE_SETTINGS', { settings: patch });
}

function escHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── Load & render ──────────────────────────────────────────────────────────────

async function init() {
  cachedData = await msg('GET_STATE');
  const data = cachedData;

  // Duration inputs
  for (const [key, el] of Object.entries(durInputs)) {
    el.value = data[key] ?? { focusDuration:25, shortBreakDuration:5, longBreakDuration:15, longBreakInterval:4 }[key];
  }

  // Auto-start toggles
  autoStartBreaks.checked  = data.autoStartBreaks !== false;
  autoStartFocus.checked   = !!data.autoStartFocus;

  // Site blocking
  siteBlockEnabled.checked = data.siteBlockingEnabled !== false;
  blockedSites = [...(data.blockedSites || [])];
  renderSiteList();

  // Sound
  soundEnabled.checked = !!data.soundEnabled;
  const vol = Math.round((data.soundVolume ?? 0.5) * 100);
  soundVolume.value = vol;
  volumeDisplay.textContent = `${vol}%`;
  updateVolumeGradient(vol);

  // Overlay
  overlayVisible.checked = data.overlayVisible !== false;

  // Stats
  renderStats(data);
}

function renderStats(data) {
  statToday.textContent = data.sessionsCompletedToday || 0;
  statTotal.textContent = data.totalSessionsCompleted || 0;

  const focusMinsToday = data.focusMinutesToday || 0;
  statTime.textContent = focusMinsToday >= 60
    ? `${(focusMinsToday / 60).toFixed(1)}h`
    : `${focusMinsToday} min`;

  const focusMinsTotal = data.focusMinutesTotal || 0;
  if (statTotalTime) {
    statTotalTime.textContent = focusMinsTotal >= 60
      ? `${(focusMinsTotal / 60).toFixed(1)}h`
      : `${focusMinsTotal} min`;
  }

  if (statStreakEl) statStreakEl.textContent = data.currentStreak || 0;
  if (statLongestEl) statLongestEl.textContent = data.longestStreak || 0;
}

function renderSiteList() {
  // NOTE: escHtml sanitizes all domain strings before insertion
  siteListEl.textContent = '';
  if (!blockedSites.length) {
    const empty = document.createElement('li');
    empty.className = 'site-empty';
    empty.textContent = 'No blocked sites 🌸';
    siteListEl.appendChild(empty);
    return;
  }
  blockedSites.forEach(domain => {
    const li = document.createElement('li');
    li.className = 'site-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'site-name';
    nameSpan.textContent = domain;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'site-remove';
    removeBtn.dataset.domain = domain;
    removeBtn.setAttribute('aria-label', `Remove ${domain}`);
    removeBtn.textContent = '✕';

    li.appendChild(nameSpan);
    li.appendChild(removeBtn);
    siteListEl.appendChild(li);
  });
}

function updateVolumeGradient(pct) {
  soundVolume.style.background =
    `linear-gradient(to right, var(--ls-pink-accent) ${pct}%, var(--ls-text-muted) ${pct}%)`;
}

// ── Duration controls ──────────────────────────────────────────────────────────

document.querySelectorAll('.dur-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    const delta = parseInt(btn.dataset.delta);
    const input = document.getElementById(key);
    const min = parseInt(input.min);
    const max = parseInt(input.max);
    const newVal = Math.min(max, Math.max(min, parseInt(input.value) + delta));
    input.value = newVal;
    saveSettings({ [key]: newVal });
  });
});

for (const [key, el] of Object.entries(durInputs)) {
  el.addEventListener('change', () => {
    const min = parseInt(el.min);
    const max = parseInt(el.max);
    const val = Math.min(max, Math.max(min, parseInt(el.value) || min));
    el.value = val;
    saveSettings({ [key]: val });
  });
}

// ── Auto-start toggles ────────────────────────────────────────────────────────

autoStartBreaks.addEventListener('change', () =>
  saveSettings({ autoStartBreaks: autoStartBreaks.checked }));

autoStartFocus.addEventListener('change', () =>
  saveSettings({ autoStartFocus: autoStartFocus.checked }));

// ── Site blocking ──────────────────────────────────────────────────────────────

siteBlockEnabled.addEventListener('change', () =>
  saveSettings({ siteBlockingEnabled: siteBlockEnabled.checked }));

function addSite() {
  const raw = siteInput.value.trim().toLowerCase();
  if (!raw) return;
  const domain = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!domain) return;
  if (!blockedSites.includes(domain)) {
    blockedSites.push(domain);
    saveSettings({ blockedSites: [...blockedSites] });
    renderSiteList();
  }
  siteInput.value = '';
}

siteAddBtn.addEventListener('click', addSite);
siteInput.addEventListener('keydown', e => { if (e.key === 'Enter') addSite(); });

siteListEl.addEventListener('click', e => {
  const btn = e.target.closest('.site-remove');
  if (!btn) return;
  const domain = btn.dataset.domain;
  blockedSites = blockedSites.filter(d => d !== domain);
  saveSettings({ blockedSites: [...blockedSites] });
  renderSiteList();
});

// ── Sound ──────────────────────────────────────────────────────────────────────

soundEnabled.addEventListener('change', () =>
  saveSettings({ soundEnabled: soundEnabled.checked }));

soundVolume.addEventListener('input', () => {
  const pct = parseInt(soundVolume.value);
  volumeDisplay.textContent = `${pct}%`;
  updateVolumeGradient(pct);
  saveSettings({ soundVolume: pct / 100 });
});

testSoundBtn.addEventListener('click', () => {
  msg('TEST_CHIME');
});

// ── Overlay ────────────────────────────────────────────────────────────────────

overlayVisible.addEventListener('change', () =>
  saveSettings({ overlayVisible: overlayVisible.checked }));

resetPositionBtn.addEventListener('click', () => {
  chrome.storage.local.set({ overlayPosition: { x: null, y: null } });
});

// ── Stats ──────────────────────────────────────────────────────────────────────

resetStatsBtn.addEventListener('click', async () => {
  if (!confirm('Reset all session stats? This cannot be undone.')) return;
  await msg('RESET_STATS');
  cachedData.sessionsCompletedToday = 0;
  cachedData.totalSessionsCompleted = 0;
  cachedData.focusMinutesToday = 0;
  cachedData.focusMinutesTotal = 0;
  cachedData.currentStreak = 0;
  cachedData.longestStreak = 0;
  renderStats(cachedData);
});

// Auto-refresh stats every 5 seconds
setInterval(async () => {
  const data = await msg('GET_STATE');
  renderStats(data);
  cachedData = data;
}, 5000);

// ── Init ──────────────────────────────────────────────────────────────────────

init();
