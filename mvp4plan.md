# MVP4 — Model-First Refactor Plan

**Goal:** Turn DAY from a DOM-as-database schedule viewer into a data-model-driven
week planner where every slot has a stable **identity** and **category**, the week
has a reusable **core structure**, and **flex** work can be moved around freely.

Constraints kept from today: **vanilla JS, no build step, no dependencies, PWA, offline.**

---

## 0. Why refactor (the root problem)

Today the **DOM is the source of truth**. `index.html` hardcodes the table;
`saveSchedule()` scrapes `textContent` into localStorage; `loadSchedule()` pushes
it back in. Because identity is thrown away, `loadSchedule()` (script.js:1184–1253)
is ~70 lines of `if (text.includes('dinner'))` guesswork re-deriving meaning every
load. Nothing downstream can tell "work" from "habit" from "side project."

Everything you asked for — slot identity, core-week + flex, habits/analytics — is
blocked until identity is **data, not scraped text**. That's Phase 1.

---

## Phase 1 — Data model (the unlock)

New file: **`data.js`** (loaded before `script.js`). Pure model + persistence, no DOM.

### 1a. Activity registry (identity taxonomy)
Replaces the `ACTIVITIES` object (script.js:12–34) and the CSS-class-as-identity pattern.

```js
// Each activity has a STABLE id, a CATEGORY (the identity you reuse later),
// and a visual style class (decoupled from meaning).
const CATEGORIES = ['work','project','habit','health','meal','rest','admin','commute'];

const ACTIVITIES = {
  work:     { id:'work',     label:'Work',     icon:'',   category:'work',    style:'activity-work' },
  paint:    { id:'paint',    label:'Paint',    icon:'🎨', category:'project', style:'activity-paint' },
  duar:     { id:'duar',     label:'Duar',     icon:'',   category:'project', style:'activity-duar' },
  gym:      { id:'gym',      label:'GYM',      icon:'',   category:'health',  style:'activity-gym' },
  meditate: { id:'meditate', label:'Meditate', icon:'',   category:'habit',   style:'activity-meditate' },
  water:    { id:'water',    label:'Water',    icon:'',   category:'habit',   style:'activity-water' },
  meal:     { id:'meal',     label:'Meal',     icon:'',   category:'meal',    style:'activity-meal' },
  sleep:    { id:'sleep',    label:'Sleep',    icon:'🌙', category:'rest',    style:'activity-sleep' },
  // …one entry per current activity; user-defined activities append here at runtime.
};
```
Category is what streaks, analytics, and flex logic key off of — never text.

### 1b. Slot = the unit with identity
```js
// A slot is one activity placement. `id` is stable across edits/moves,
// so links, streak history, and analytics can reference it forever.
// { id, activityId, day, start, end, fixed, note, url }
//   day:   0–6 (Sun=0) or 'ritual' for the rituals column
//   start/end: decimal hours (7.5 = 7:30). Supports the irregular row heights we already have.
//   fixed: true = anchored (meals, sleep, meetings); false = FLEX (movable work/project/workout)
```

### 1c. Week = core template + overrides
```js
const week = {
  version: 4,
  template: Slot[],          // the CORE WEEK STRUCTURE (your recurring rhythm)
  overrides: { [weekKey]: { [slotId]: Partial<Slot> | null } }, // this-week changes; null = deleted
  done:      { [dateKey]: { [slotId]: true } },  // per-day completion for streaks
};
```
`resolveWeek(date)` = template with that week's overrides applied → the render input.
This is what makes "core structure you can flex against" real: the template is your
rhythm; moving a flex block this week writes an override, not a mutation of the core.

### 1d. Persistence + migration
- `loadModel()` / `saveModel()` on a new key `day_v4`.
- **One-time migration** `migrateFromV3()`: read the existing `lifeScheduler` key AND
  the seed HTML → build `week.template`. Run once, set `migratedV4=true`, keep a backup
  copy of the old key. This is where the 70-line guesswork in `loadSchedule()` gets
  executed **once** and then deleted from the hot path forever.

**Deliverable:** model fully populated, unit-checkable in console. No visual change yet.

---

## Phase 2 — Render from data

Make the DOM a pure projection of the model. `index.html` `<tbody>` becomes empty.

### 2a. `renderWeek(date)` builds the table
- Compute the row set from the distinct `start` times in `resolveWeek(date)` (preserves
  today's irregular rows: 7.5, 8, 9, 9.5, 11…). Build `<tr data-time>` + `<td>` per day.
- Each cell stamps identity into the DOM as attributes, not text:
  `data-slot-id`, `data-activity-id`, `data-category`, `data-fixed`.
- Visual class comes from `ACTIVITIES[activityId].style`. All existing CSS + SVG
  backgrounds keep working unchanged (they key off `activity-*`).

### 2b. Save becomes trivial
- `saveSchedule()` (script.js:1094) → deleted. Edits mutate the model then call
  `saveModel()`. No scraping, no `textContent` parsing.
- `loadSchedule()` (script.js:1136–1272) → deleted. Boot = `loadModel()` +
  `renderWeek()`. **~180 lines removed**, including all icon/text migration hacks.

### 2c. Rewire the existing UI to the model
- **Activity picker** (`renderActivityPickerContent`, script.js:752): iterate the
  registry (already does) but write selection via `setSlotActivity(slotId, activityId)`.
  Custom activities append to the registry with a generated `id` + chosen `category`.
- **Edit-mode drag** (`handleDrop`, script.js:928): swap becomes
  `moveSlot(slotId, day, start)` on the model, then re-render the two affected cells.
- **Add time slot** (`addNewTimeSlot`, script.js): inserts a template row in the model.
- **Cell click → URL** (script.js:1814): read `data-url` from the resolved slot.

**Deliverable:** identical UX, but DOM is now disposable. Everything after this is additive.

---

## Phase 3 — Flex work

- Picker/edit gains a **Fixed ↔ Flex** toggle writing `slot.fixed`. Visual: flex slots
  get a subtle dashed/handle affon hover; fixed slots are anchored.
- **Move flex** by drag to any empty (day,time) → writes an override (this week) or edits
  the template (recurring), prompted by a small "This week / Every week" choice.
- Optional **Auto-arrange**: given fixed anchors + a pool of flex slots with target
  durations, fill open gaps around them. Pure model function, easy to unit-check.

---

## Phase 4 — Identity payoff: habits & analytics

Now that every slot carries `category` + stable `id`, these are small:

- **Streaks:** tap a `habit`/`health` slot to mark `week.done[dateKey][slotId]=true`.
  Streak = consecutive dates satisfied. Show a flame/count on the cell.
- **Weekly rollup:** sum `end-start` grouped by `category` for the resolved week →
  "12h project · 5h health · 4h habit". A single reduce over `resolveWeek`. Satisfies the
  analytics wishlist already noted in mvp3plan.md / PROJECT_STATUS.md.
- Because it's category-based, adding a new side-project activity auto-appears in analytics
  with zero extra wiring.

---

## Phase 5 — UI speed

Note: `runUpdates()` is already minute-gated (script.js:1704), so the 1s interval is cheap.
Real costs are elsewhere:

- **Per-minute full sweeps:** `highlightCurrentTime()` / `highlightToday()` re-run
  `querySelectorAll` across the whole table each minute. With the model we know exactly
  which `(day,time)` is active → toggle a class on the 1–2 relevant cells only.
- **Boot cost:** the old `loadSchedule()` innerHTML rewrite of every cell is gone (Phase 2);
  boot becomes one `renderWeek()` pass.
- **Targeted re-render:** edits/moves re-render only affected cells, not the table.
- Keep the existing `rowTimesCache`; add a `slotIndex` map `(day,time)->slotId` for O(1) lookups.

---

## File-by-file summary

| File | Change |
|---|---|
| **`data.js`** (new) | Model: `CATEGORIES`, `ACTIVITIES`, `Slot`, `week`, `resolveWeek`, `loadModel/saveModel`, `migrateFromV3` |
| **`render.js`** (new, or top of script.js) | `renderWeek`, `renderCell`, `slotIndex` |
| `index.html` | Empty `<tbody>`; add `<script src="data.js">` before others; add category/analytics containers |
| `script.js` | Delete `saveSchedule`/`loadSchedule` (~180 lines); rewire picker, drag, add-slot, click-URL to model; targeted highlight |
| `style.css` | Add `[data-fixed="false"]` flex affordance, streak badge, analytics bar. Existing `activity-*` untouched |

## Sequencing
Phase **1 → 2 first** (foundation; net *removes* code). Then 3/4/5 independent, any order.
Ship each phase behind the existing localStorage so a bad migration can roll back to `lifeScheduler`.

## Risks
- **Migration data loss** → keep the v3 key as backup; gate on `migratedV4`; test with a
  real exported profile before deleting anything.
- **SVG/glow coupling** → mitigated: styles still key off `activity-*`, model only adds
  identity attributes alongside.
