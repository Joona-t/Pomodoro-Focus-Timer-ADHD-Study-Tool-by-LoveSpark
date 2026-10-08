# Privacy Policy — Pomodoro Focus Timer & ADHD Study Tool by LoveSpark

**Effective date:** 2026-06-09 · **Applies to extension version:** 1.1.43

Pomodoro Focus Timer & ADHD Study Tool by LoveSpark ("the extension") is a free, open-source, privacy-first browser extension. It is built on the LoveSpark principle that your data is yours alone. **We do not collect, transmit, sell, or share any of your data — ever.** Everything the extension remembers stays on your own device.

---

## What We Store

The extension saves a small amount of data **locally on your device only**, using the browser's `chrome.storage.local` API. This data never leaves your computer. It includes:

- **Timer settings** — your chosen work/focus duration, short break and long break lengths, and how many sessions occur before a long break.
- **Your block list** — the websites *you* choose to block during focus sessions. This list is created by you, stored only on your device, and used only to apply blocking rules locally.
- **Session counters and streaks** — the number of focus sessions you've completed, daily counts, and any focus streaks, so the extension can show your progress.
- **Current timer state** — whether a timer is running or paused and the time remaining, so your session survives the popup closing or the browser restarting.
- **Preferences** — your selected theme (e.g. retro, dark, beige, slate), and notification/sound preferences.

That's it. There are no accounts, no logins, and no profiles. If you uninstall the extension or clear its storage, this data is gone.

---

## What We Transmit

**Nothing. Zero data is transmitted externally.**

- No analytics.
- No telemetry or usage tracking.
- No external servers, APIs, or "phone home" connections.
- No advertising networks.
- No cloud sync.

The extension functions entirely on your device. It does not open network connections to send your information anywhere, because it never needs to.

---

## Permissions

The extension requests only the permissions required to do its one job — run a focus timer with optional site blocking. Here is exactly why each permission exists:

- **`storage`** — Saves your settings, block list, session counters, streaks, theme, and current timer state locally in `chrome.storage.local`. This is the only place your data lives. It is never uploaded.
- **`alarms`** — Schedules the timer's transitions (for example, work → break → work) reliably, even when the popup is closed or the browser's background service worker has gone to sleep. Without alarms, an MV3 timer could not keep accurate time in the background.
- **`declarativeNetRequest`** — Blocks the websites you add to your block list during focus sessions. This is done using the browser's own declarative blocking engine: you supply the list, and the **browser** enforces the rules. The extension does not see, log, or receive the URLs you visit — it only registers the blocking rules you configured.
- **`notifications`** — Shows a desktop notification when a focus session ends or a break is over, so you know when to switch without staring at the timer.

No permission is used for anything beyond the focus-timer purpose described above.

---

## Host Permissions

The extension requests `<all_urls>` (access to all sites). This is required for **one reason only**: so the site-blocking feature can block *any* website you choose to add to your block list. Because you might block any site on the web, the blocking rules must be able to apply to any address — there is no way to know your chosen sites in advance.

**What this access is used for:** applying your own site-blocking rules via the browser's `declarativeNetRequest` engine during focus sessions.

**What this access is NOT used for — explicitly:**

- It is **not** used to read, record, or collect your browsing history.
- It is **not** used to track which websites you visit. (The declarative blocking engine applies rules without exposing your visited URLs to the extension.)
- It is **not** used to inject ads, trackers, scripts, or any content into the pages you view.
- It is **not** used to read page content or form data.
- It is **not** used to transmit anything, anywhere.

The broad host permission enables blocking the sites *you* pick, and nothing more.

---

## Third-Party Services

**None.** The extension uses no third-party services, SDKs, analytics providers, advertising networks, content delivery networks, or external code of any kind. It runs no remote code. All functionality is self-contained and runs locally.

---

## Children's Privacy

The extension collects **no personal data from anyone**, including children under the age of 13. Because nothing is collected, stored remotely, or transmitted, there is no personal information to gather, expose, or misuse. The extension is safe for users of all ages.

---

## Changes to This Policy

If this policy ever changes, the updated version will be published in the extension's public source repository, and the **Effective date** and version line at the top of this document will be updated. Because the repository is public and open source, any change is visible in the project's commit history.

---

## Contact

Questions, concerns, or reports can be filed via GitHub issues:

**https://github.com/Joona-t/lovespark-focus/issues**

---

## Open Source / Verification

You do not have to take our word for any of the claims above. The extension is fully open source, and you can read every line of its code to verify that it stores data only locally and transmits nothing:

**https://github.com/Joona-t/lovespark-focus**
