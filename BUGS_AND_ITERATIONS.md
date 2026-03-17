# Bugs & Iterations

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
