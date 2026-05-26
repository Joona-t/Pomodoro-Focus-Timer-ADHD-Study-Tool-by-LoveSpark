# Bugs & Iterations

## 2026-05-26: ITER-039 — UX fixes pack + Sparky gradient theme import (v1.1.39)

**Problem:** Five user-reported gaps:
1. Settings page back arrow not visible / unreliable navigation (window.close() fails on chrome.tabs.create-opened tabs)
2. Timer progress ring used hardcoded pink/purple/teal gradients regardless of theme — Slate showed pink ring, Beige showed pink ring, etc.
3. Only "Clear done" task button — no way to wipe in-progress tasks
4. Estimated pomos read-only on existing tasks — to change you had to delete+recreate
5. Sparky/Reads dreamy gradient themes (Sakura Pink, Persimmon Orange, Espresso) not available here despite suite-wide convergence (CLAUDE.md #suite-architecture)

**Root cause:**
- (1) `← Back` text existed but build was stale, and `window.close()` is a no-op for tabs not opened by script.
- (2) Three SVG `<linearGradient>` defs in timer.html/popup.html were swapped by JS `RING_GRADIENTS` based on session type — never referenced theme tokens.
- (3) `CLEAR_ALL_TASKS` message type didn't exist in background.js, and only one button in the tasks header.
- (4) `createTaskMenu()` only rendered Edit (text) and Delete — no pomos controls.
- (5) The 4 existing themes (retro/dark/beige/slate) were a subset of Sparky's 7-theme palette. The gradient themes (defined in `/Users/darkfire/sparky/Sparky/Theme/Colors.swift`) were never ported to web CSS.

**Fix:**
- Settings back arrow → icon-only `←`, bumped to 20px font / 38×36 min hit target, added `aria-label`, swapped `window.close()` for `location.href = 'timer.html'` for reliable in-tab navigation.
- Progress ring → deleted gradient SVG defs and `RING_GRADIENTS` lookup in both timer + popup; ring now uses `stroke: var(--ls-pink-accent)` which auto-tracks the active theme accent. Lost session-type hue distinction (focus/break/long-break) — labels + tabs still convey that.
- Clear all → new `CLEAR_ALL_TASKS` handler in background.js (nulls `activeTaskId` and `currentTask` for cleanliness); new `btn-clear-all` in tasks header wrapped in `.tasks-header-actions`; `confirm()` guard before wipe; shown when `tasks.length > 0`.
- Pomos stepper in task menu → extended `createTaskMenu()` with a `Pomos: [−] N [+]` row dispatching `UPDATE_TASK { patch: { estimatedPomos } }`; clamped [1,20] to match add-task stepper.
- Sparky gradient themes → ported `pink` (Sakura Pink), `orange` (Persimmon Orange), `warmBrown` (Espresso) from Colors.swift to all three CSS files (timer.css, popup.css, settings.css) as `body.theme-{pink,orange,warmBrown}` blocks. Background is `radial-gradient(ellipse at center, ...)` with the 5-stop Sparky palettes. Token mapping: accent → `--ls-pink-accent`, primary → `--ls-text-dark`, muted → `--ls-text-muted`, border/surface → `--ls-glass-*`. Added theme-option dropdown swatches as mini radial gradients. THEMES array extended in timer.js/popup.js/settings.js. Skipped Sparky's Core-Image noise overlay — not trivially replicable in CSS and the gradient alone carries the aesthetic.
- Title color refinement (caught during preview verification) → first pass used the theme `accent` for header titles, which produced unreadable orange-on-orange in Persimmon and washed-out pink-on-peach in Sakura. Switched the per-theme `.title` / `.header-title` rules to use Sparky's `primary` token instead: pink → `#3A1528` (dark plum), orange → `#2E1505` (dark brown), warmBrown → `#F5E6D0` (cream). Verified all three themes pass eyeball-contrast in live preview before zipping. Lesson logged: when porting a Swift palette where the source uses separate `accent`/`primary` roles, the title belongs on the `primary` track, not the `accent` track — the accent is intended for highlights, not body chrome.

**Pre-commit hook follow-ups (caught by ls-check):**
- popup.html → added `role="dialog"`, `aria-labelledby="popup-title"` on body; `aria-expanded="false"` + `aria-haspopup="menu"` on the theme dropdown trigger (A11Y-DIALOG, A11Y-EXPANDED). Same `aria-expanded`/`aria-haspopup` pair added on timer.html and settings.html dropdown triggers.
- settings.html → `aria-label="Reset all statistics"` on the 🗑️ Reset Stats button (A11Y-LABEL).
- blocked.html → `aria-label="Go back to previous page"` on the ← Go Back button (A11Y-LABEL).
- popup.html → wired `lib/lovespark-base.css` and `lib/lovespark-theme.js` to satisfy BRAND-LIB-WIRED. The 2026-03-28 regression root cause was a renamed-but-undefined `--ls-btn-bg` token, not the shared-lib injection itself; that token is gone now, so wiring is safe. popup.css still defines the gradient theme blocks (loads after base.css so it wins on those).
- lovespark-a11y-toolkit/scripts/ls-check.py → tightened the SEC-CDN regex so it only flags external `<script src=…>`/`<link href=…>`/`<img src=…>` (real code-injection vectors) and ignores `<a href=https://…>` (navigation, not CDN). Also whitelisted `lovespark.love`, `ko-fi.com`, `github.com/Joona-t`, `joona-t.github.io` for the shared footer links. Logged as the per-CLAUDE-md "improve our systems" lesson — false positives are noise that erodes the hook's authority.

**Files:** background.js, blocked.html, manifest.json, popup.css, popup.html, popup.js, settings.css, settings.html, settings.js, timer.css, timer.html, timer.js, plus lib/lovespark-{badge,base,footer,lifecycle,popup,theme}.{css,js} sync, plus the new lib/lovespark-tokens.css. Manifest version 1.1.9 → 1.1.40 (covering interim un-committed bumps through 1.1.39 shipped to CWS).
**Commit:** (pending)

## : |2026-03-05|||fix: replace broken footer with aesthetic ls-footer

**Problem:** |2026-03-05|||fix: replace broken footer with aesthetic ls-footer
**Files:** lib/lovespark-base.css,lib/lovespark-footer.css,lib/lovespark-footer.js,manifest.json,popup.html
**Commit:** 03ad421

## : |2026-03-05|||fix: production polish — dynamic version, overflow fix, Firefox polyfill

**Problem:** |2026-03-05|||fix: production polish — dynamic version, overflow fix, Firefox polyfill
**Details:** - Version strings in settings.html and timer.html now read from manifest
- Popup overflow changed to overflow-y: auto (prevents footer clipping)
- Added browser-polyfill.min.js to blocked.html, settings.html, timer.html
- Removed empty declarative_net_request.rule_resources from manifest
**Files:** blocked.html,manifest.json,popup.css,settings.html,settings.js
**Commit:** 1572b05

## : |2026-02-23|||Add task input system, fix badge timer, and overlay countdown

**Problem:** |2026-02-23|||Add task input system, fix badge timer, and overlay countdown
**Details:** - Task input: type what you're working on before starting a session
- Completed tasks: collapsible list with clear button, saved on session end
- Badge: shows minutes remaining (Xm format), purple for breaks, pink for focus
- Badge updates every second via message from popup/overlay to background
- Overlay countdown already correct, now also sends badge updates
**Files:** background.js,content-overlay.js,popup.css,popup.html,popup.js
**Commit:** 8163d1f

## : |2026-03-05|||fix: theme title text visibility on beige (#4a7c59 earthy green) and slate (#d4714e terracotta)

**Problem:** |2026-03-05|||fix: theme title text visibility on beige (#4a7c59 earthy green) and slate (#d4714e terracotta)
**Files:** blocked.css,manifest.json,popup.css,settings.css
**Commit:** 8662f93

## : |2026-03-05|||Fix theme dropdown: add missing CSS styles for styled dropdown menu

**Problem:** |2026-03-05|||Fix theme dropdown: add missing CSS styles for styled dropdown menu
**Files:** background.js,content-overlay.js,manifest.json,popup.css,research.md
**Commit:** ada8373

## : |2026-02-22|||Fix manifest: remove invalid chrome:// exclude_matches schemes

**Problem:** |2026-02-22|||Fix manifest: remove invalid chrome:// exclude_matches schemes
**Files:** manifest.json
**Commit:** e6f1d05

<!-- Format:
## YYYY-MM-DD: Short Title

**Problem:** What went wrong or needed changing
**Root cause:** Why it happened
**Fix:** What was done to resolve it
-->


## 2026-03-28: Fleet-wide automation regression — broken CSS variables + missing footers

**Problem:** A post-swarm-audit automation run injected `lovespark-tokens.css` and `lovespark-base.css` into popup.html, and replaced `--ls-pink-accent` with undefined `--ls-btn-bg` in popup.css. This broke toggle colors (rendered transparent) and changed disabled opacity from 0.4 to 0.9. Footer buttons were also missing from 26 extensions.
**Root cause:** Batch automation (`sync-shared-lib.sh` or swarm pass) overwrote extension CSS without validating variable definitions. The `--ls-btn-bg` variable was never defined in any CSS file.
**Fix:** Reverted all 76 git repos to last committed state. Fixed 3 extensions (cookie-nuke, breathe, planner) that had the bug baked into commits. Added footer buttons (LoveSpark Suite, Ko-fi, Report a Bug) to all 26 missing extensions. Updated shared lib footer to make LoveSpark Suite a proper link to lovespark.love. Deployed `guard-fleet-sync.sh` — 4-gate pre-sync validator that blocks automations introducing undefined CSS variables.
**Files:** popup.css, popup.html, lib/lovespark-footer.js, lib/lovespark-footer.css
**Commit:** fleet-wide fix, multiple commits
