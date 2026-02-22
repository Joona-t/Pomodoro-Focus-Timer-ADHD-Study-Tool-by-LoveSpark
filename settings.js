// LoveSpark Focus — settings.js
'use strict';

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
  soundEnabled.checked = data.soundEnabled !== false;
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
  const focusMinutes = (data.sessionsCompletedToday || 0) * (data.focusDuration || 25);
  statTime.textContent = focusMinutes >= 60
    ? `${(focusMinutes / 60).toFixed(1)}h`
    : `${focusMinutes} min`;
}

function renderSiteList() {
  siteListEl.innerHTML = '';
  if (!blockedSites.length) {
    siteListEl.innerHTML = '<li class="site-empty">No blocked sites 🌸</li>';
    return;
  }
  blockedSites.forEach(domain => {
    const li = document.createElement('li');
    li.className = 'site-item';
    li.innerHTML = `
      <span class="site-name">${escHtml(domain)}</span>
      <button class="site-remove" data-domain="${escHtml(domain)}" aria-label="Remove ${escHtml(domain)}">✕</button>
    `;
    siteListEl.appendChild(li);
  });
}

function updateVolumeGradient(pct) {
  soundVolume.style.background =
    `linear-gradient(to right, #FF69B4 ${pct}%, #8a4a65 ${pct}%)`;
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
