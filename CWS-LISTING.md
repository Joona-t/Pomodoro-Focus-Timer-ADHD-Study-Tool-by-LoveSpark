# Pomodoro Focus Timer & ADHD Study Tool by LoveSpark — CWS Listing

## Extension name

`Pomodoro Focus Timer & ADHD Study Tool` *(38 characters — within the 45-character limit)*

## Short description

`Free Pomodoro timer & ADHD focus tool with a built-in website blocker. Block distracting sites, no ads, no data. 💕` *(114 characters)*

## Detailed description

**A free, distraction-free Pomodoro timer built for focus — and for brains that find focus hard.**

Pomodoro Focus Timer & ADHD Study Tool is a cute, calming focus timer that pairs the classic Pomodoro technique with a built-in website blocker, so you can start a work sprint, block the sites that pull you away, and actually finish what you sat down to do.

Set a focus session, hit start, and the timer counts down your work sprint followed by a short break — the simple, proven Pomodoro rhythm that keeps studying and deep work sustainable. When the session ends, you get a gentle notification so you never have to watch the clock. It's a study timer, a productivity timer, and a distraction blocker in one small, friendly popup.

**Built neurodivergent-first.** This is a focus timer for Chrome made by a neurodivergent developer for people like him. The interface uses the OpenDyslexic font for easier reading, a soft retro-pink theme that's calm instead of clinical, and a friendly mascot instead of yet another utilitarian tomato icon. Big touch targets, clear contrast, full keyboard navigation, and reduced-motion support are baked in — accessibility isn't an afterthought.

**The website blocker is included — not gated.** Add the sites that derail you (social feeds, news, video, anything), and during a focus session those distracting websites are blocked. Use it as a site blocker for studying, a distraction blocker for work, or a way to block distracting websites whenever you need a clean run at a task. Many focus timers lock blocking behind a paywall. This one doesn't.

**Free, open source, and private by design.** No ads. No accounts. No subscriptions. No data collection. Everything you set — your timer preferences, your blocklist, your session counts — is stored locally in your browser and never leaves your device. The full source is public and MIT-licensed, so you can verify every claim yourself.

**Features:**

- ⏱️ **Pomodoro timer** — focus sprints with automatic short breaks, the time-tested Pomodoro technique
- 🚫 **Built-in website blocker** — block your own list of distracting websites during focus sessions
- 🎯 **ADHD-friendly focus** — calm visuals, one clear action per screen, no overwhelming clutter
- 🔔 **End-of-session notifications** — know when to work and when to rest without watching the clock
- 📊 **Local session tracking** — see your focus sprints, stored only on your device
- 🅰️ **OpenDyslexic font + accessible UI** — readable, keyboard-navigable, reduced-motion aware
- 🆓 **Completely free** — no ads, no upsells, no premium tier, no API keys
- 🔒 **Zero data collection** — local storage only, nothing transmitted anywhere
- 💖 **Open source (MIT)** — inspect or fork the code on GitHub

Whether you're a student using a study timer to get through revision, a developer needing a focus timer to ship, or anyone with ADHD looking for a kinder productivity timer, this is a simple tool to start a session, block the noise, and focus.

Source code: https://github.com/Joona-t/lovespark-focus

## Single-purpose justification

The single purpose of this extension is to help the user run focused work sessions using the Pomodoro technique. Every feature serves that one purpose: the timer structures the focus-and-break sprints; the website blocker removes on-screen distractions *for the duration of those sessions*; the notifications tell the user when a session or break has ended so they can stay in the focus rhythm without watching the clock; and local storage simply remembers the user's timer preferences and blocklist between sessions. There are no unrelated tools, no general browsing utilities, and no features that exist outside the focus-session workflow — the timer and the blocking it controls are a single, unified feature set.

## Per-permission justification

**storage** — Used to save the user's own settings locally: timer durations, the list of websites they have chosen to block during focus sessions, and their completed-session counts. This is required so preferences and the blocklist persist between browser sessions. Data is kept in `chrome.storage.local` only and is never transmitted.

**alarms** — Used to drive the countdown for each focus and break interval and to fire reliably when an interval ends, even if the popup is closed. Without `alarms`, the timer could not accurately track a Pomodoro session in the background.

**declarativeNetRequest** — Used to block the specific websites the user has added to their blocklist while a focus session is active. The browser enforces these blocking rules natively; the extension only declares them. This is the mechanism behind the built-in website blocker feature.

**notifications** — Used to show a notification when a focus session or break ends, so the user knows when to switch between working and resting without having to keep the popup open or watch the timer.

## Host-permissions justification

**`<all_urls>`** — This host permission is required for one feature only: the user-controlled website blocker. Because the user can add *any* domain they personally find distracting to their blocklist, the extension cannot predeclare a finite list of hosts in advance — it must be able to apply the user's `declarativeNetRequest` blocking rules to whichever sites they choose. It is used **only** to block requests to those user-specified sites during focus sessions. It is **not** used to read, collect, inject into, modify, or transmit the content of any web page; the extension has no content scripts that read page data, performs no tracking of browsing history, and sends nothing to any external server.

## Privacy disclosure (CWS Section 5)

**Data collection categories — set each to "Not collected":**

- Personally identifiable information — **Not collected**
- Health information — **Not collected**
- Financial and payment information — **Not collected**
- Authentication information — **Not collected**
- Personal communications — **Not collected**
- Location — **Not collected**
- Web history — **Not collected**
- User activity — **Not collected**
- Website content — **Not collected**

**Developer certifications — tick all three:**

- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases.
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:**
`https://github.com/Joona-t/lovespark-focus/blob/main/PRIVACY.md`

*Note for the form: this extension stores the user's timer settings, blocklist, and session counts exclusively in `chrome.storage.local` on the user's own device. No data is transmitted off-device, sold, or shared with anyone.*

## Reviewer test instructions

This takes about 3 minutes and requires no account or setup.

1. **Open the popup.** Click the extension icon in the toolbar. The Pomodoro timer UI appears with the OpenDyslexic font, retro-pink theme, and mascot. *(~15s)*
2. **Start a focus session.** Press the start button to begin a focus sprint. Confirm the timer begins counting down. *(~15s)*
3. **Add a site to the blocklist.** Open the blocklist input and add a test domain, for example `example.com`. Save it. *(~30s)*
4. **Verify blocking works.** With a focus session active, open a new tab and navigate to `https://example.com`. Confirm the request is blocked (the site does not load). *(~30s)*
5. **Verify unblocking.** Stop/end the focus session, then reload `https://example.com`. Confirm it now loads normally — blocking applies only during active focus sessions. *(~30s)*
6. **Verify the notification.** Set the shortest available focus duration, start it, and wait for it to reach zero (or end it). Confirm an end-of-session notification appears. *(~30s)*
7. **Verify persistence and privacy.** Close and reopen the popup; confirm your timer settings and blocklist are still there (loaded from `chrome.storage.local`). Open DevTools → Network while running a session and confirm the extension makes no external network requests — all data stays local. *(~30s)*

All behavior is local-only; no login, server, or API key is needed to review any feature.
