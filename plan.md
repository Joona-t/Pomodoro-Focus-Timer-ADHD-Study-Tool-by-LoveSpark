# LoveSpark Focus — UX fixes plan

Four reported issues + Sparky/Reads gradient-theme import. Plan-first per CLAUDE.md workflow. **APPROVED — implementing.**

---

## Issue 1 — Settings page: visible back arrow → timer page

**Current state.** `settings.html:13` already has `<button id="back-btn">← Back</button>` and `settings.css:56` styles it. `settings.js:38` wires `window.close()`. But the screenshot shows no back button → either deployed version is stale (no rebuild since back-btn was added) OR `window.close()` silently fails (settings open in a new tab via `chrome.tabs.create`, so `window.close()` can be a no-op depending on tab history).

**Fix.**
- **Tighten the button to a pure arrow icon** (`←`) — cleaner, more prominent in top-left. Drop "Back" text, keep `title="Back to timer"` for screen-reader tooltip.
- **Replace `window.close()` with `location.href = 'timer.html'`** — navigates in-place, doesn't depend on tab origin. More reliable across both "settings opened in new tab" and "settings as full-page tab" flows.
- **Bigger, glass-bordered styling** — increase font-size to 18px, padding to 8px 14px, round corners, keep theme-accent color. Already correctly positioned first in header → visible in top-left.
- **A11y:** add `aria-label="Back to timer"` so the icon-only button still announces correctly.

**Files touched:** `settings.html`, `settings.css`, `settings.js`.

---

## Issue 2 — Progress ring color matches active theme

**Current state.** Ring uses hardcoded SVG gradients (`pinkGradient`, `purpleGradient`, `tealGradient`) defined in `timer.html:53-65` and `popup.html` (same defs). JS swaps between them based on session type via `RING_GRADIENTS` (`timer.js:50-54`). None of these reference theme tokens, so the ring stays pink/purple/teal even when theme is Slate (orange), Beige (brown), or Dark (hot pink).

**Fix — solid theme-accent ring.**
- Drop the three `<defs>` gradients and the `RING_GRADIENTS` lookup.
- Set ring stroke via CSS: `#progress-ring-circle { stroke: var(--ls-pink-accent); }` — this is already the per-theme accent token (`#E8457C` retro, `#ff6eb4` dark, `#c4806a` beige, `#d4714e` slate), so the ring auto-updates on theme switch.
- In `updateRing()`, remove the `style.stroke = RING_GRADIENTS[...]` line. Only `strokeDashoffset` stays.
- Keep `transition: stroke 0.4s ease` so theme switches animate.

**Session-type differentiation:** the session label below the ring ("F O C U S" / "S H O R T  B R E A K" / "L O N G  B R E A K") and the tab pill already convey type. Ring stays as theme color — matches user's stated request "ring should be the same colour as the theme". Trade-off: loses the visual hue cue for break vs focus. Acceptable — user explicitly asked for this.

**Files touched:** `timer.html` (remove gradient defs), `timer.css` (add stroke rule), `timer.js` (drop RING_GRADIENTS + stroke setter), `popup.html`, `popup.css`, `popup.js` — both popup and timer share the same ring pattern and both need the change (UI-wide audit per Joona's rule).

---

## Issue 3 — "Clear all" button alongside "Clear done"

**Current state.** Only `Clear done` exists (`timer.html:109`, `timer.js:494-503`, background handler `CLEAR_COMPLETED_TASKS` at `background.js:646`). Visible only when `tasks.some(t => t.completed)`.

**Fix.**
- **Add `CLEAR_ALL_TASKS` message handler in `background.js`** — clears entire `tasks` array, also nulls `activeTaskId` + `currentTask` for cleanliness.
- **Add `<button id="btn-clear-all">Clear all</button>` to `timer.html`** in the `.tasks-header` next to Clear done.
- **Show it only when `tasks.length > 0`** (not just when done tasks exist — user wants to clear not-done tasks too).
- **Confirmation guard** — `Clear all` is destructive, so wrap the handler in `confirm('Clear all tasks? This cannot be undone.')`. Cheap insurance against an accidental click that nukes a session's planning.
- **Style** — same look as Clear done (muted text, subtle hover). Place Clear all to the LEFT of Clear done with a small gap.

**Files touched:** `timer.html`, `timer.js`, `background.js`, `timer.css` (minor — gap between the two buttons).

---

## Issue 4 — Edit pomodoro count on existing tasks

**Current state.** Task action menu (⋯ button) has only `Edit` (edits text) and `Delete` (`timer.js:324-351`). Pomo count is read-only — to change it you'd delete the task and recreate with a new estimate. The pomo badge shows `completedPomos/estimatedPomos` (`timer.js:278-280`).

**Fix — inline stepper inside the task action menu.**
- When ⋯ menu opens, render three rows:
  1. `Edit text` (existing, renamed from "Edit")
  2. `Pomos: [−] N [+]` — stepper widget. Tapping − or + sends `UPDATE_TASK { taskId, patch: { estimatedPomos: newValue } }` to the background. Clamp `[1, 20]` to match the add-task stepper bounds (`timer.js:462`).
  3. `Delete` (existing)
- Stepper buttons re-use the existing `.pomo-stepper-btn` styling from the add-task form for visual consistency.
- Background handler `UPDATE_TASK` already accepts arbitrary patch (`background.js:571-585`), so **no background change needed** — JS just sends the right patch.
- Don't close the menu on +/− click — let the user step multiple times. Close on outside click (existing behavior) or via re-clicking ⋯.

**Files touched:** `timer.js` (extend `createTaskMenu` to include stepper), `timer.css` (menu width + stepper layout).

---

## Issue 5 (added) — Import Sparky/Reads gradient themes

**Source.** `/Users/darkfire/sparky/Sparky/Theme/Colors.swift` defines 3 radial-gradient themes: **Sakura Pink** (peach-gold → plum), **Persimmon Orange** (gold → cosmic violet), **Espresso / warmBrown** (amber ember → abyss). Sparky also exports an `accent` and full token set per theme.

**Fix.**
- **Add 3 new themes** to the dropdowns in `timer.html`, `popup.html`, `settings.html`: pink, orange, warmBrown.
- **Update `THEMES` array** in `timer.js`, `popup.js`, `settings.js` from `['retro','dark','beige','slate']` → 7 entries, with labels: `Sakura Pink`, `Persimmon Orange`, `Espresso`.
- **CSS theme blocks** in `timer.css`, `popup.css`, `settings.css` — port the Sparky color tokens. Background becomes `radial-gradient(ellipse at center, ...)` with the 5 gradient stops from Colors.swift. Other tokens (`--ls-pink-accent`, `--ls-text-dark`, `--ls-glass`, `--ls-text-muted`, `--ls-glass-border`) mapped from Sparky's `accent`, `primary`, `surface`, `muted`, `border`.
- **Theme swatch in dropdown** — for gradient themes, render `background: radial-gradient(...)` on the `::before` pseudo-element to preview the theme color.
- **Skip noise overlay** — Sparky's Core Image grain isn't trivially replicable in CSS, and the gradient alone reads as "dreamy Sparky". Can add SVG-data-URI noise later if Joona wants.
- **Sparky Reads' diagonal LinearGradient** is not exported as a named theme there — it's the single background. Not importing as a separate theme; the 3 Sparky gradient themes carry the "gradient theme" intent.

**Files touched:** `timer.html`, `timer.css`, `timer.js`, `popup.html`, `popup.css`, `popup.js`, `settings.html`, `settings.css`, `settings.js`.

---

## Cross-cutting

- **Version bump** — `manifest.json` 1.1.38 → 1.1.39 (per CLAUDE.md rule #9).
- **BUGS_AND_ITERATIONS.md** — log each of the four issues as an iteration entry with date, root cause, and fix (per CLAUDE.md rule #11 trail rule).
- **Rebuild zips** — run `scripts/build-zips.sh` after implementation. The Firefox zip passes through `amo-validate.py` automatically (rule #5).
- **Verify in browser** — load unpacked in Chrome, walk through: open settings via gear → click back arrow → land on timer; switch theme to each of retro/dark/beige/slate → ring color updates each time; add 3 tasks → Clear all confirms then wipes; ⋯ on a task → stepper bumps the estimate.
- **No Co-Authored-By** in commits (rule #6).

---

## Granular todo (for implementation phase)

- [x] **Back arrow**
  - [x] `settings.html:13` — replace button content with `←`, add `aria-label`.
  - [x] `settings.css:56-72` — bump font-size to 18px, padding to 8px 14px.
  - [x] `settings.js:38-40` — swap `window.close()` for `location.href = 'timer.html'`.
- [x] **Theme-colored ring**
  - [x] `timer.html` — delete `<defs>` block (gradients), change `stroke="url(#pinkGradient)"` to remove stroke attr (let CSS take over).
  - [x] `timer.css:209-211` — add `stroke: var(--ls-pink-accent);` to `#progress-ring-circle`.
  - [x] `timer.js:50-54` — delete `RING_GRADIENTS` constant.
  - [x] `timer.js:133-140` — strip the stroke-setting lines from `updateRing()`.
  - [x] `popup.html` — same gradient-defs removal as timer.html.
  - [x] `popup.css` — add same stroke rule.
  - [x] `popup.js` — same RING_GRADIENTS + stroke-setter removal.
- [x] **Clear all button**
  - [x] `background.js:646` — add `CLEAR_ALL_TASKS` case below `CLEAR_COMPLETED_TASKS`.
  - [x] `timer.html:107-110` — add `Clear all` button before Clear done.
  - [x] `timer.js` — wire click handler with `confirm()`, plus visibility toggle in `renderTasks()` based on `tasks.length`.
  - [x] `timer.css` — small gap between the two buttons in `.tasks-header`.
- [x] **Edit pomos**
  - [x] `timer.js:324-351` — extend `createTaskMenu()` to render a pomo stepper row between Edit and Delete.
  - [x] Wire stepper click → `UPDATE_TASK { patch: { estimatedPomos } }` → re-render.
  - [x] `timer.css:497-509` — widen menu (`min-width: 160px`) and add stepper row layout.
- [x] **Wrap-up**
  - [x] Bump `manifest.json` version 1.1.38 → 1.1.39.
  - [x] Add four entries to `BUGS_AND_ITERATIONS.md`.
  - [x] Run `scripts/build-zips.sh` (AMO validation runs automatically).
  - [x] Reload unpacked in Chrome + verify all four flows.

---

**Do not implement yet.** Awaiting Joona's review and "implement it all".
