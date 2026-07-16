// ============================================
// DAY v4 — DATA MODEL (single source of truth)
// The DOM is a projection of this model. Nothing in this file touches the DOM.
// Loaded BEFORE render.js and script.js.
// ============================================

const MODEL_KEY = 'day_v4';
const LEGACY_KEY = 'lifeScheduler'; // v3 DOM-scrape format — kept untouched as a rollback backup

// --------------------------------------------
// Identity taxonomy
// --------------------------------------------

// Categories are the reusable identity of a slot: analytics, streaks and
// flex logic key off `category`, never off display text.
// Colors mirror the --cat-* tokens in style.css so analytics dots and
// scheduled-cell accents read as one palette instead of two.
const CATEGORIES = {
    work:    { label: 'Work',     color: '#38bdf8' },
    project: { label: 'Projects', color: '#f5c451' },
    habit:   { label: 'Habits',   color: '#f472b6' },
    health:  { label: 'Health',   color: '#fb7185' },
    meal:    { label: 'Meals',    color: '#6ee7b7' },
    rest:    { label: 'Rest',     color: '#a78bfa' },
    commute: { label: 'Commute',  color: '#fb923c' },
    admin:   { label: 'Admin',    color: '#94a3b8' },
    other:   { label: 'Other',    color: '#cbd5e1' },
    flow:    { label: 'Flow',     color: '#475569', hidden: true } // continuity arrows, resolved to their source
};

// Categories whose slots default to FLEX (movable); everything else defaults to FIXED (anchored).
const FLEX_CATEGORIES = ['work', 'project', 'health'];

// Built-in activity registry. `id` is stable forever. `style` is ONLY the
// visual class (all existing CSS/SVG backgrounds key off it) — it carries no meaning.
const BUILTIN_ACTIVITIES = {
    work:     { id: 'work',     label: 'Work',          icon: '',   category: 'work',    style: 'activity-work' },
    paint:    { id: 'paint',    label: 'Paint',         icon: '🎨', category: 'project', style: 'activity-paint' },
    duar:     { id: 'duar',     label: 'Duar',          icon: '',   category: 'project', style: 'activity-duar' },
    gym:      { id: 'gym',      label: 'GYM',           icon: '',   category: 'health',  style: 'activity-gym' },
    hike:     { id: 'hike',     label: 'Hike',          icon: '',   category: 'health',  style: 'activity-hike' },
    meditate: { id: 'meditate', label: 'Meditate',      icon: '',   category: 'habit',   style: 'activity-meditate' },
    water:    { id: 'water',    label: 'Water',         icon: '',   category: 'habit',   style: 'activity-water' },
    wakeup:   { id: 'wakeup',   label: 'Wake up',       icon: '',   category: 'habit',   style: 'activity-wakeup' },
    meal:     { id: 'meal',     label: 'Meal',          icon: '',   category: 'meal',    style: 'activity-meal' },
    foodprep: { id: 'foodprep', label: 'Food Prep',     icon: '',   category: 'meal',    style: 'activity-meal' },
    sleep:    { id: 'sleep',    label: 'Sleep',         icon: '🌙', category: 'rest',    style: 'activity-sleep' },
    destim:   { id: 'destim',   label: 'De-Stimulate',  icon: '🎧', category: 'rest',    style: '' },
    bus:      { id: 'bus',      label: 'Office',        icon: '',   category: 'commute', style: 'activity-bus' },
    car:      { id: 'car',      label: 'Office',        icon: '',   category: 'commute', style: 'activity-car' },
    commute:  { id: 'commute',  label: 'Commute',       icon: '',   category: 'commute', style: 'activity-commute' },
    clean:    { id: 'clean',    label: 'Clean',         icon: '🧹', category: 'admin',   style: 'activity-clean' },
    finances: { id: 'finances', label: 'Finances',      icon: '',   category: 'admin',   style: 'activity-finances' },
    plan:     { id: 'plan',     label: 'The Plan',      icon: '📝', category: 'admin',   style: '' },
    home:     { id: 'home',     label: 'Home Things',   icon: '🏠', category: 'admin',   style: '' },
    arrow:    { id: 'arrow',    label: '↑',             icon: '',   category: 'flow',    style: 'activity-arrow' }
};

// --------------------------------------------
// Model state
// --------------------------------------------
// model = {
//   version: 4,
//   rowTimes: [7.5, 8, ...],                  // the time grid (part of the core week structure)
//   template: { slotId: Slot },               // the CORE WEEK — your recurring rhythm
//   overrides: { weekKey: { slotId: Partial<Slot> | FullSlot(add:true) | null } }, // this-week changes; null = removed
//   done: { dateKey: { slotId: true } },      // per-day completion (streaks)
//   activities: { id: Activity }              // user-defined activities (merged over builtins)
// }
// Slot = { id, day ('ritual' | 0-6 Sun=0), time (decimal row start), activityId,
//          label (''=activity label), url, fixed (bool) }
// A slot occupies one grid cell; its duration is derived from the row grid.

let model = null;

function newSlotId() {
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getActivity(id) {
    if (model && model.activities[id]) return model.activities[id];
    return BUILTIN_ACTIVITIES[id] || null;
}

function allActivities() {
    return Object.assign({}, BUILTIN_ACTIVITIES, model ? model.activities : {});
}

function defaultFixed(activityId) {
    const act = getActivity(activityId);
    return !FLEX_CATEGORIES.includes(act ? act.category : 'other');
}

// Create (or find) a user-defined activity by label.
function ensureCustomActivity(label, icon, category) {
    // Reuse an existing activity whose label matches (case-insensitive)
    const match = Object.values(allActivities()).find(a => a.label.toLowerCase() === label.toLowerCase());
    if (match) return match;

    let base = 'c_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    let id = base, n = 2;
    while (getActivity(id)) id = base + '_' + (n++);

    const act = { id, label, icon: icon || '⭐', category: category || 'other', style: '' };
    model.activities[id] = act;
    return act;
}

// --------------------------------------------
// Date / week keys
// --------------------------------------------

function dateKey(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Week key = local date of that week's Monday
function weekKey(d) {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    return dateKey(t);
}

// --------------------------------------------
// Week resolution (template + overrides)
// --------------------------------------------

function resolveWeek(date = new Date()) {
    const ov = model.overrides[weekKey(date)] || {};
    const slots = [];
    for (const s of Object.values(model.template)) {
        const o = ov[s.id];
        if (o === null) continue;                       // removed this week
        slots.push(o ? Object.assign({}, s, o) : s);    // patched or as-is
    }
    for (const [id, o] of Object.entries(ov)) {
        if (o && o.add && !model.template[id]) slots.push(o); // this-week-only additions
    }
    return slots;
}

// Fast (day|time) → slot index for the resolved week
function buildSlotIndex(date = new Date()) {
    const idx = {};
    for (const s of resolveWeek(date)) idx[s.day + '|' + s.time] = s;
    return idx;
}

function findResolvedSlot(slotId, date = new Date()) {
    return resolveWeek(date).find(s => s.id === slotId) || null;
}

// --------------------------------------------
// Model operations (scope: 'template' = every week, 'week' = just this week)
// --------------------------------------------

function createSlot(props, scope = 'template', date = new Date()) {
    const slot = {
        id: newSlotId(),
        day: props.day,
        time: props.time,
        activityId: props.activityId,
        label: props.label || '',
        url: props.url || '',
        fixed: props.fixed !== undefined ? props.fixed : defaultFixed(props.activityId)
    };
    if (scope === 'week') {
        const wk = weekKey(date);
        if (!model.overrides[wk]) model.overrides[wk] = {};
        model.overrides[wk][slot.id] = Object.assign({ add: true }, slot);
    } else {
        model.template[slot.id] = slot;
    }
    return slot;
}

function updateSlot(slotId, patch, scope = 'template', date = new Date()) {
    const wk = weekKey(date);
    const weekOv = model.overrides[wk] || {};
    const isWeekAdd = weekOv[slotId] && weekOv[slotId].add;

    if (isWeekAdd) {
        // A this-week-only slot lives entirely in the override map
        Object.assign(weekOv[slotId], patch);
    } else if (scope === 'week') {
        if (!model.overrides[wk]) model.overrides[wk] = {};
        model.overrides[wk][slotId] = Object.assign({}, model.overrides[wk][slotId] || {}, patch);
    } else {
        if (model.template[slotId]) Object.assign(model.template[slotId], patch);
    }
}

function deleteSlot(slotId, scope = 'template', date = new Date()) {
    const wk = weekKey(date);
    const weekOv = model.overrides[wk] || {};

    if (weekOv[slotId] && weekOv[slotId].add) {
        delete weekOv[slotId]; // this-week addition: just drop it
        return;
    }
    if (scope === 'week') {
        if (!model.overrides[wk]) model.overrides[wk] = {};
        model.overrides[wk][slotId] = null;
    } else {
        delete model.template[slotId];
        // Scrub stale references from all week overrides
        for (const ov of Object.values(model.overrides)) delete ov[slotId];
    }
}

function moveSlot(slotId, day, time, scope = 'template', date = new Date()) {
    updateSlot(slotId, { day, time }, scope, date);
}

// --------------------------------------------
// Completion + streaks
// --------------------------------------------

function isDone(slotId, date = new Date()) {
    const dk = dateKey(date);
    return !!(model.done[dk] && model.done[dk][slotId]);
}

function toggleDone(slotId, date = new Date()) {
    const dk = dateKey(date);
    if (!model.done[dk]) model.done[dk] = {};
    if (model.done[dk][slotId]) delete model.done[dk][slotId];
    else model.done[dk][slotId] = true;
}

// Current streak for an activity: walk back from today. A day where the activity
// was scheduled and completed extends the streak; scheduled-but-missed breaks it
// (today itself never breaks — it may just not be done yet); unscheduled days are skipped.
function streakFor(activityId, today = new Date()) {
    let streak = 0;
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (let i = 0; i < 90; i++) {
        const dk = dateKey(d);
        const dow = d.getDay();
        const scheduled = resolveWeek(d).filter(s => s.activityId === activityId && (s.day === dow || s.day === 'ritual'));
        if (scheduled.length) {
            const done = scheduled.some(s => model.done[dk] && model.done[dk][s.id]);
            if (done) streak++;
            else if (i > 0) break; // a past scheduled day that wasn't completed ends the streak
        }
        d.setDate(d.getDate() - 1);
    }
    return streak;
}

// --------------------------------------------
// Analytics
// --------------------------------------------

function sortedRowTimes() {
    return [...model.rowTimes].sort((a, b) => a - b);
}

function slotDuration(time) {
    const times = sortedRowTimes();
    const i = times.indexOf(time);
    if (i === -1) return 1;
    return i < times.length - 1 ? times[i + 1] - time : 1; // last row assumed 1h
}

// Hours per category and per activity for the resolved week.
// Continuity arrows extend the activity above them; the rituals rail is a
// reminder track, not scheduled time, so it is excluded from hour totals.
function weekRollup(date = new Date()) {
    const idx = buildSlotIndex(date);
    const times = sortedRowTimes();
    const byCategory = {}, byActivity = {};
    let total = 0;

    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
        for (let i = 0; i < times.length; i++) {
            let slot = idx[day + '|' + times[i]];
            if (!slot) continue;

            // Resolve arrows upward to their source activity
            let act = getActivity(slot.activityId);
            let label = slot.label || (act ? act.label : '');
            if (act && act.category === 'flow') {
                for (let j = i - 1; j >= 0; j--) {
                    const above = idx[day + '|' + times[j]];
                    if (!above) break;
                    const aAct = getActivity(above.activityId);
                    if (aAct && aAct.category !== 'flow') { act = aAct; label = above.label || aAct.label; break; }
                }
                if (act && act.category === 'flow') continue; // orphan arrow
            }
            if (!act) continue;

            const dur = slotDuration(times[i]);
            byCategory[act.category] = (byCategory[act.category] || 0) + dur;
            byActivity[label] = (byActivity[label] || 0) + dur;
            total += dur;
        }
    }
    return { byCategory, byActivity, total };
}

// --------------------------------------------
// Persistence
// --------------------------------------------

function saveModel() {
    localStorage.setItem(MODEL_KEY, JSON.stringify(model));
}

function loadModel() {
    const raw = localStorage.getItem(MODEL_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.version === 4 && parsed.template) {
                model = parsed;
                return;
            }
        } catch (e) {
            console.error('day_v4 parse failed, rebuilding:', e);
        }
    }
    model = migrateFromV3() || seedDefaultModel();
    saveModel();
}

// --------------------------------------------
// Migration from v3 (the old DOM-scrape format)
// --------------------------------------------

// This is the ONE place the old text-guessing runs — once, at migration.
function classToActivityId(cls, text) {
    const byStyle = {
        'activity-work': 'work', 'activity-paint': 'paint', 'activity-duar': 'duar',
        'activity-gym': 'gym', 'activity-hike': 'hike', 'activity-meditate': 'meditate',
        'activity-water': 'water', 'activity-wakeup': 'wakeup', 'activity-meal': 'meal',
        'activity-sleep': 'sleep', 'activity-bus': 'bus', 'activity-car': 'car',
        'activity-commute': 'commute', 'activity-clean': 'clean', 'activity-finances': 'finances',
        'activity-arrow': 'arrow'
    };
    if (byStyle[cls]) {
        // Disambiguate the shared meal style
        if (byStyle[cls] === 'meal' && /prep/i.test(text)) return 'foodprep';
        return byStyle[cls];
    }
    const t = (text || '').toLowerCase();
    if (t === '↑') return 'arrow';
    const byLabel = {
        'home things': 'home', 'de-stimulate': 'destim', 'the plan': 'plan',
        'finances': 'finances', 'food prep': 'foodprep', 'office': 'bus',
        'commute': 'commute', 'work': 'work', 'gym': 'gym', 'hike': 'hike',
        'duar': 'duar', 'paint': 'paint', 'clean': 'clean', 'sleep': 'sleep',
        'meditate': 'meditate', 'water': 'water', 'wake up': 'wakeup',
        'home workout': 'gym', 'dinner': 'meal'
    };
    for (const [k, v] of Object.entries(byLabel)) if (t.includes(k)) return v;
    return null;
}

function emptyModel() {
    return { version: 4, rowTimes: [], template: {}, overrides: {}, done: {}, activities: {} };
}

function migrateScheduleData(data) {
    if (!data || !data.schedule) return null;
    const m = emptyModel();
    model = m; // ensureCustomActivity needs the model reference

    const dayMap = { rituals: 'ritual', monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };

    // Bring legacy custom palette across first
    try {
        const legacyCustoms = JSON.parse(localStorage.getItem('customActivities') || '[]');
        legacyCustoms.forEach(c => { if (c && c.name) ensureCustomActivity(c.name, c.icon, 'other'); });
    } catch (e) { /* ignore malformed palette */ }

    for (const [timeStr, days] of Object.entries(data.schedule)) {
        const time = parseFloat(timeStr);
        if (isNaN(time)) continue;
        m.rowTimes.push(time);

        for (const [dayName, cell] of Object.entries(days)) {
            const day = dayMap[dayName];
            if (day === undefined || !cell) continue;
            const text = (cell.text || '').trim();
            const icon = (cell.icon || '').trim();
            if (!text && !icon) continue;

            let activityId = classToActivityId(cell.class || '', text);
            let act = activityId ? getActivity(activityId) : null;
            if (!act) {
                act = ensureCustomActivity(text || icon, icon, 'other');
                activityId = act.id;
            }

            const slot = createSlot({
                day, time, activityId,
                label: (text && text !== act.label) ? text : '',
                url: cell.url || ''
            }, 'template');
            void slot;
        }
    }
    m.rowTimes.sort((a, b) => a - b);
    return m;
}

function migrateFromV3() {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    try {
        const migrated = migrateScheduleData(JSON.parse(raw));
        if (migrated) console.log('DAY: migrated v3 schedule → v4 model (v3 backup kept in localStorage)');
        return migrated;
    } catch (e) {
        console.error('v3 migration failed, seeding default:', e);
        return null;
    }
}

// --------------------------------------------
// Default week seed (mirrors the original hardcoded schedule)
// --------------------------------------------

function seedDefaultModel() {
    const m = emptyModel();
    model = m;

    // Per row: [ritual, Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    // Entry: null | 'activityId' | ['activityId', 'Label override']
    const M1 = ['meal', 'Meal 1'], M2 = ['meal', 'Meal 2'];
    const WEEK = {
        7.5:  ['water', 'wakeup', 'wakeup', 'wakeup', 'wakeup', 'wakeup', 'wakeup', 'wakeup'],
        8:    ['meditate', 'meditate', 'meditate', 'meditate', 'meditate', 'meditate', 'meditate', 'meditate'],
        9:    [null, 'paint', 'bus', 'paint', ['car', 'Office'], ['gym', 'Home Workout'], 'paint', 'paint'],
        9.5:  [null, 'work', 'work', 'work', 'work', 'work', 'gym', null],
        11:   ['arrow', 'arrow', 'work', 'arrow', 'work', 'work', 'arrow', 'arrow'],
        12:   ['gym', 'gym', 'work', 'gym', 'work', 'gym', 'paint', 'hike'],
        13:   ['water', null, 'work', 'work', null, 'paint', 'clean', 'hike'],
        14:   [M1, M1, M1, M1, M1, M1, M1, 'hike'],
        15:   ['water', 'work', 'work', 'work', 'work', 'paint', 'duar', null],
        16:   ['water', 'paint', 'work', 'work', 'work', null, null, null],
        17:   [M2, M2, M2, M2, M2, M2, M2, M2],
        17.5: [null, null, ['bus', 'Commute'], 'paint', ['car', 'Commute'], null, 'duar', 'plan'],
        18:   [null, 'paint', 'duar', 'paint', 'duar', null, null, 'finances'],
        20:   ['water', 'paint', null, 'paint', null, null, null, 'foodprep'],
        21:   [['meal', 'Meal 3'], ['meal', 'Dinner'], ['meal', 'Dinner'], ['meal', 'Dinner'], ['meal', 'Dinner'], ['meal', 'Dinner'], ['meal', 'Dinner'], ['meal', 'Dinner']],
        22:   ['water', 'home', 'gym', 'paint', null, 'destim', null, null],
        23:   ['sleep', 'sleep', 'sleep', 'sleep', 'sleep', 'sleep', 'sleep', 'sleep']
    };
    const DAY_ORDER = ['ritual', 1, 2, 3, 4, 5, 6, 0];

    for (const [timeStr, entries] of Object.entries(WEEK)) {
        const time = parseFloat(timeStr);
        m.rowTimes.push(time);
        entries.forEach((entry, i) => {
            if (!entry) return;
            const [activityId, label] = Array.isArray(entry) ? entry : [entry, ''];
            createSlot({ day: DAY_ORDER[i], time, activityId, label }, 'template');
        });
    }
    m.rowTimes.sort((a, b) => a - b);
    return m;
}

// Load immediately so render.js/script.js see a ready model
loadModel();
