// ============================================
// DAY v4 — RENDERER
// Projects the model (data.js) into the schedule table.
// The <tbody> in index.html is empty; renderWeek() owns it entirely.
// ============================================

const DAY_CLASS = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
const RENDER_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sat, Sun — matches the header

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 13.5 → "1:30 PM"
function formatDecimalTime(t) {
    const hours = Math.floor(t);
    const minutes = Math.round((t - hours) * 60);
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function renderCellHtml(day, time, slot, ctx) {
    const isRitual = day === 'ritual';
    const classes = [isRitual ? 'rituals-col' : DAY_CLASS[day]];
    let attrs = '';
    let content = '';

    if (slot) {
        const act = getActivity(slot.activityId);
        if (act && act.style) classes.push(act.style);

        const category = act ? act.category : 'other';
        attrs += ` data-slot-id="${slot.id}" data-activity-id="${escapeHtml(slot.activityId)}"`;
        attrs += ` data-category="${category}" data-fixed="${slot.fixed ? '1' : '0'}"`;
        if (slot.url) attrs += ` data-url="${escapeHtml(slot.url)}"`;

        const icon = act ? act.icon : '';
        const label = slot.label || (act ? act.label : '');
        content = (icon ? `<span class="icon">${icon}</span>` : '') + escapeHtml(label);

        // NOTE: no per-cell streak/done decorations. The 🔥 badge + ✓ overlay
        // fought with the SVG cell art (and .slot-done's position:relative broke
        // the rituals column's sticky positioning). Completion data still lives
        // in the model (model.done) if a cleaner surface for it comes later.
    }

    // Sleep flaps live on day cells only (never time/rituals)
    let flapHtml = '';
    if (!isRitual) {
        flapHtml = `<div class="cell-flap${ctx.isLastRow ? ' zzz-flap' : ''}"><span class="flap-time">${ctx.displayTime}</span></div>`;
    }

    return `<td class="${classes.join(' ')}"${attrs}>${content}${flapHtml}</td>`;
}

function renderWeek() {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;

    const now = new Date();
    window.slotIndex = buildSlotIndex(now);
    const times = sortedRowTimes();

    const workStart = timeToDecimal(getSetting('workStart', '09:00'));
    const workEnd = timeToDecimal(getSetting('workEnd', '17:00'));

    const ctx = { todayDow: now.getDay(), displayTime: '', isLastRow: false };

    let html = '';
    times.forEach((t, i) => {
        ctx.displayTime = formatDecimalTime(t);
        ctx.isLastRow = i === times.length - 1;
        const workHour = t >= workStart && t < workEnd ? ' work-hour' : '';

        html += `<tr data-time="${t}">`;
        html += `<td class="time-col${workHour}">${ctx.displayTime}</td>`;
        html += renderCellHtml('ritual', t, window.slotIndex['ritual|' + t], ctx);
        for (const d of RENDER_DAY_ORDER) {
            html += renderCellHtml(d, t, window.slotIndex[d + '|' + t], ctx);
        }
        html += '</tr>';
    });

    tbody.innerHTML = html;
    invalidateDomCaches();
}

// The highlight/flap logic caches DOM nodes; a re-render invalidates them all.
function invalidateDomCaches() {
    window.rowElements = null;
    window.rowTimesCache = null;
    window.lastActiveRow = null;
    window.lastHighlightKey = null;
}
