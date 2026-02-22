// LoveSpark Focus — blocked.js
'use strict';

const MESSAGES = [
  'You got this, bestie! 💕',
  'Deep work mode: activated! ✨',
  'Your future self thanks you! 🌸',
  'Distraction: defeated! 💪',
  'Stay sparkly, stay focused! ✦',
  'You\'re doing amazing! 💖',
  'Focus is a superpower! 🌸',
  'Almost there, keep going! 💕',
];

const messageEl = document.getElementById('message');
const timerEl   = document.getElementById('timer-display');

// Pick a random motivational message
messageEl.textContent = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function updateTimer() {
  chrome.storage.local.get(['timerState', 'endTime', 'remainingSeconds', 'sessionType'], (data) => {
    if (chrome.runtime.lastError) return;

    const state = data.timerState || 'idle';

    if (state === 'running' && data.endTime) {
      const remaining = Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000));
      timerEl.textContent = formatTime(remaining);

      // If session ended while we're on this page — session is done
      if (remaining === 0) {
        timerEl.textContent = '00:00';
      }
    } else if (state === 'paused' && data.remainingSeconds != null) {
      timerEl.textContent = formatTime(data.remainingSeconds);
    } else if (state === 'idle') {
      // Session ended — show that it's done
      timerEl.textContent = '✨ Done!';
    } else {
      timerEl.textContent = '--:--';
    }
  });
}

updateTimer();
setInterval(updateTimer, 1000);
