// LoveSpark Focus — background.js (Service Worker)
// Single source of truth for timer state. Uses chrome.alarms for reliable timing.
'use strict';

// ── Default storage values ──────────────────────────────────────────────────

const DEFAULTS = {
  // Timer state
  timerState: 'idle',
  sessionType: 'focus',
  endTime: null,
  remainingSeconds: null,
  currentCyclePosition: 0,

  // Stats
  sessionsCompletedToday: 0,
  totalSessionsCompleted: 0,
  focusMinutesToday: 0,
  focusMinutesTotal: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastSessionDate: null,
  lastResetDate: todayStr(),

  // Settings
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: true,
  autoStartFocus: false,

  // Site blocking
  blockedSites: [
    'reddit.com', 'twitter.com', 'x.com', 'youtube.com',
    'instagram.com', 'tiktok.com', 'facebook.com',
    'twitch.tv', 'discord.com', '9gag.com'
  ],
  siteBlockingEnabled: true,

  // Tasks
  currentTask: '',
  completedTasks: [],

  // Overlay
  overlayVisible: true,
  overlayMinimized: false,
  overlayPosition: { x: null, y: null },

  // Sound
  soundEnabled: false,
  soundVolume: 0.5,
  lastChimeTime: null,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Storage helpers ─────────────────────────────────────────────────────────

async function getAll() {
  return chrome.storage.local.get(null);
}

async function get(...keys) {
  return chrome.storage.local.get(keys.length === 1 ? keys[0] : keys);
}

async function set(obj) {
  return chrome.storage.local.set(obj);
}

// ── Storage initialization ──────────────────────────────────────────────────

async function initStorage() {
  const existing = await getAll();
  const today = todayStr();
  const updates = {};

  // Set any missing keys to defaults
  for (const [key, val] of Object.entries(DEFAULTS)) {
    if (!(key in existing)) updates[key] = val;
  }

  // Daily reset
  const resetDate = existing.lastResetDate || today;
  if (resetDate !== today) {
    updates.sessionsCompletedToday = 0;
    updates.focusMinutesToday = 0;
    updates.lastResetDate = today;
  }

  if (Object.keys(updates).length > 0) await set(updates);

  // Recover timer if it was running when service worker was killed
  await recoverTimer(existing);

  await updateBadge();
}

// If the service worker was killed mid-session, recover gracefully
async function recoverTimer(data) {
  if (!data.timerState) return;

  if (data.timerState === 'running' && data.endTime) {
    const now = Date.now();
    if (data.endTime <= now) {
      // Session ended while we were asleep — handle it now
      await handleSessionComplete();
    } else {
      // Still running — recreate alarms in case they were lost (system sleep)
      const remainingMs = data.endTime - now;
      await chrome.alarms.clear('sessionEnd');
      await chrome.alarms.create('sessionEnd', { delayInMinutes: remainingMs / 60000 });
      await chrome.alarms.create('stateSave', { periodInMinutes: 5 / 60 });
      await scheduleBadgeAlarm();
    }
  }
}

// ── Badge update ────────────────────────────────────────────────────────────

async function updateBadge() {
  const data = await get('timerState', 'sessionType', 'endTime', 'remainingSeconds');

  if (data.timerState === 'running' && data.endTime) {
    const remaining = Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000));
    const mm = Math.floor(remaining / 60);
    chrome.action.setBadgeText({ text: `${mm}m` });
    const isBreak = data.sessionType === 'shortBreak' || data.sessionType === 'longBreak';
    chrome.action.setBadgeBackgroundColor({ color: isBreak ? '#C084FC' : '#FF69B4' });
    chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
  } else if (data.timerState === 'paused') {
    chrome.action.setBadgeText({ text: '⏸' });
    chrome.action.setBadgeBackgroundColor({ color: '#c04880' });
    chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Update badge every 60s while running (alarm-based)
async function scheduleBadgeAlarm() {
  await chrome.alarms.create('badgeTick', { periodInMinutes: 1 });
}

// ── Timer state machine ─────────────────────────────────────────────────────

async function startTimer(overrideRemaining) {
  const data = await getAll();
  const seconds = overrideRemaining != null
    ? overrideRemaining
    : getDurationSeconds(data.sessionType, data);

  if (seconds <= 0) return;

  const endTime = Date.now() + seconds * 1000;

  // Cancel any existing alarm
  await chrome.alarms.clear('sessionEnd');

  // Set alarm for session end (fractional minutes supported)
  const delayMinutes = seconds / 60;
  await chrome.alarms.create('sessionEnd', { delayInMinutes: delayMinutes });

  await set({
    timerState: 'running',
    endTime,
    remainingSeconds: null,
  });

  // Periodic state save for resilience
  await chrome.alarms.create('stateSave', { periodInMinutes: 5 / 60 });

  // Enable site blocking if this is a focus session
  if (data.sessionType === 'focus') {
    await enableSiteBlocking(data.blockedSites, data.siteBlockingEnabled);
  }

  await updateBadge();
  await scheduleBadgeAlarm();
}

async function pauseTimer() {
  const data = await get('timerState', 'endTime');
  if (data.timerState !== 'running' || !data.endTime) return;

  const remaining = Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000));

  await chrome.alarms.clear('sessionEnd');
  await chrome.alarms.clear('badgeTick');
  await chrome.alarms.clear('stateSave');

  await set({
    timerState: 'paused',
    endTime: null,
    remainingSeconds: remaining,
  });

  await updateBadge();
}

async function resumeTimer() {
  const data = await get('timerState', 'remainingSeconds');
  if (data.timerState !== 'paused') return;
  await startTimer(data.remainingSeconds);
}

async function resetTimer() {
  await chrome.alarms.clear('sessionEnd');
  await chrome.alarms.clear('badgeTick');
  await chrome.alarms.clear('stateSave');

  const data = await get('sessionType');
  // Keep sessionType but go idle
  await set({
    timerState: 'idle',
    endTime: null,
    remainingSeconds: null,
  });

  // Disable site blocking on reset
  await disableSiteBlocking();
  await updateBadge();
}

// ── Session completion ──────────────────────────────────────────────────────

async function handleSessionComplete() {
  const data = await getAll();
  const today = todayStr();

  const wasFocus = data.sessionType === 'focus';
  let cyclePos = data.currentCyclePosition || 0;
  let sessionsToday = data.sessionsCompletedToday || 0;
  let sessionsTotal = data.totalSessionsCompleted || 0;
  const updates = {};

  if (wasFocus) {
    cyclePos = (cyclePos + 1) % (data.longBreakInterval || 4);
    sessionsToday += 1;
    sessionsTotal += 1;
    updates.currentCyclePosition = cyclePos;
    updates.sessionsCompletedToday = sessionsToday;
    updates.totalSessionsCompleted = sessionsTotal;
    if (today !== data.lastResetDate) {
      updates.sessionsCompletedToday = 1;
      updates.focusMinutesToday = 0;
      updates.lastResetDate = today;
    }

    // Focus minutes tracking
    const focusMins = data.focusDuration || 25;
    updates.focusMinutesToday = (data.focusMinutesToday || 0) + focusMins;
    updates.focusMinutesTotal = (data.focusMinutesTotal || 0) + focusMins;

    // Streak tracking
    const lastSessionDate = data.lastSessionDate;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (lastSessionDate === yesterday) {
      updates.currentStreak = (data.currentStreak || 0) + 1;
    } else if (lastSessionDate === today) {
      // Same day — streak stays the same
    } else if (!lastSessionDate) {
      updates.currentStreak = 1;
    } else {
      updates.currentStreak = 1;
    }
    updates.lastSessionDate = today;
    const newStreak = updates.currentStreak ?? data.currentStreak ?? 0;
    if (newStreak > (data.longestStreak || 0)) {
      updates.longestStreak = newStreak;
    }

    // Save completed task
    const taskText = (data.currentTask || '').trim();
    if (taskText) {
      const completedTasks = data.completedTasks || [];
      completedTasks.push({
        text: taskText,
        completedAt: new Date().toISOString(),
        duration: focusMins,
      });
      updates.completedTasks = completedTasks;
    }
    updates.currentTask = '';
  }

  // Determine next session type
  let nextType;
  if (wasFocus) {
    const longBreakInterval = data.longBreakInterval || 4;
    nextType = cyclePos === 0 ? 'longBreak' : 'shortBreak';
  } else {
    nextType = 'focus';
  }

  // Play chime via storage (content scripts watch for this)
  updates.lastChimeTime = Date.now();
  updates.lastChimeType = wasFocus ? 'focus-end' : (nextType === 'focus' ? 'break-end' : 'longbreak-end');

  // Transition to idle with next session type ready
  updates.timerState = 'idle';
  updates.sessionType = nextType;
  updates.endTime = null;
  updates.remainingSeconds = null;

  await set(updates);

  // Disable site blocking (break time or reset)
  await disableSiteBlocking();

  // Fire notification
  fireNotification(wasFocus, nextType);

  // Auto-start logic
  const autoStartBreaks = data.autoStartBreaks !== false;
  const autoStartFocus = !!data.autoStartFocus;

  if ((nextType !== 'focus' && autoStartBreaks) ||
      (nextType === 'focus' && autoStartFocus)) {
    // Small delay so the notification clears first (alarm-safe for MV3 SW)
    chrome.alarms.create('autoStart', { delayInMinutes: 1.5 / 60 });
  }

  await updateBadge();
}

// ── Notifications ───────────────────────────────────────────────────────────

function fireNotification(wasFocus, nextType) {
  const msgs = {
    focus: {
      title: 'Focus session complete! 🌸',
      message: nextType === 'longBreak'
        ? 'Time for a long break — you earned it! 💕'
        : 'Time for a 5-minute break! 💕',
    },
    shortBreak: {
      title: 'Break\'s over! 💪',
      message: 'Ready for another focus session? You got this! 🌸',
    },
    longBreak: {
      title: 'Long break complete! ✨',
      message: 'Feeling refreshed? Let\'s focus! 💕',
    },
  };

  const key = wasFocus ? 'focus' : (nextType === 'focus' ? 'shortBreak' : 'longBreak');
  const { title, message } = msgs[key];

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title,
    message,
  });
}

// ── Site blocking (declarativeNetRequest dynamic rules) ─────────────────────

async function enableSiteBlocking(blockedSites, siteBlockingEnabled) {
  if (!siteBlockingEnabled || !blockedSites || blockedSites.length === 0) return;

  const rules = blockedSites.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { extensionPath: '/blocked.html' },
    },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: ['main_frame'],
    },
  }));

  // Remove existing rules first, then add new ones
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(r => r.id),
    addRules: rules,
  });
}

async function disableSiteBlocking() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  if (existing.length === 0) return;
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(r => r.id),
    addRules: [],
  });
}

// ── Duration helpers ────────────────────────────────────────────────────────

function getDurationSeconds(sessionType, data) {
  const mins = {
    focus: data.focusDuration || 25,
    shortBreak: data.shortBreakDuration || 5,
    longBreak: data.longBreakDuration || 15,
  }[sessionType] || 25;
  return mins * 60;
}

// ── Alarm handler ───────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sessionEnd') {
    const data = await get('timerState');
    if (data.timerState === 'running') {
      await handleSessionComplete();
    }
  } else if (alarm.name === 'badgeTick') {
    await updateBadge();
  } else if (alarm.name === 'stateSave') {
    const sdata = await get('timerState', 'endTime');
    if (sdata.timerState === 'running' && sdata.endTime) {
      const remaining = Math.max(0, Math.ceil((sdata.endTime - Date.now()) / 1000));
      await set({ remainingSeconds: remaining });
    }
  } else if (alarm.name === 'autoStart') {
    await startTimer();
  } else if (alarm.name === 'dailyReset') {
    const today = todayStr();
    const data = await get('lastResetDate');
    if (data.lastResetDate !== today) {
      await set({ sessionsCompletedToday: 0, focusMinutesToday: 0, lastResetDate: today });
    }
  }
});

// ── Message handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {

      case 'START': {
        const data = await get('timerState');
        if (data.timerState === 'paused') {
          await resumeTimer();
        } else {
          // If idle or running, start fresh for current session type
          const fullData = await getAll();
          // If running, reset to start of current session
          if (data.timerState === 'running') await chrome.alarms.clear('sessionEnd');
          await startTimer();
        }
        sendResponse({ ok: true });
        break;
      }

      case 'PAUSE': {
        await pauseTimer();
        sendResponse({ ok: true });
        break;
      }

      case 'RESET': {
        await resetTimer();
        sendResponse({ ok: true });
        break;
      }

      case 'SET_SESSION_TYPE': {
        // Allow switching session type while idle
        const data = await get('timerState');
        if (data.timerState === 'idle') {
          await set({ sessionType: message.sessionType });
        }
        sendResponse({ ok: true });
        break;
      }

      case 'GET_STATE': {
        const state = await getAll();
        sendResponse(state);
        break;
      }

      case 'UPDATE_SETTINGS': {
        const { settings } = message;
        await set(settings);

        // If site blocking settings changed, re-apply
        if ('blockedSites' in settings || 'siteBlockingEnabled' in settings) {
          const data = await get('timerState', 'sessionType', 'blockedSites', 'siteBlockingEnabled');
          if (data.timerState !== 'idle' && data.sessionType === 'focus') {
            await enableSiteBlocking(
              settings.blockedSites || data.blockedSites,
              settings.siteBlockingEnabled ?? data.siteBlockingEnabled
            );
          }
        }

        sendResponse({ ok: true });
        break;
      }

      case 'RESET_STATS': {
        const today = todayStr();
        await set({
          sessionsCompletedToday: 0,
          totalSessionsCompleted: 0,
          focusMinutesToday: 0,
          focusMinutesTotal: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastSessionDate: null,
          lastResetDate: today,
        });
        sendResponse({ ok: true });
        break;
      }

      case 'UPDATE_BADGE': {
        // Popup sends real-time badge updates every second
        const badgeText = message.text || '';
        chrome.action.setBadgeText({ text: badgeText });
        const isBreak = message.sessionType === 'shortBreak' || message.sessionType === 'longBreak';
        chrome.action.setBadgeBackgroundColor({ color: isBreak ? '#C084FC' : '#FF69B4' });
        chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
        sendResponse({ ok: true });
        break;
      }

      case 'TEST_CHIME': {
        // Trigger chime in content scripts for settings "test sound" button
        await set({ lastChimeTime: Date.now() });
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ ok: false, error: 'Unknown action' });
    }
  })();
  return true;
});

// ── Startup ─────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(initStorage);
chrome.runtime.onStartup.addListener(async () => {
  await initStorage();
  // Schedule daily reset alarm
  chrome.alarms.create('dailyReset', { periodInMinutes: 60 });
});

// Run on service worker boot
initStorage();
