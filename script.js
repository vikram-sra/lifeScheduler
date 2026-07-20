// Schedule configuration
let WAKEUP_HOUR = 7.5; // 7:30 AM
let SLEEP_HOUR = 23;   // 11:00 PM

// Edit mode state
let isEditMode = false;

// Edit scope: 'template' = every week (the core structure), 'week' = just this week (an override)
let editScope = 'template';

// Sleep shutters: cover cells during sleep hours (tap & hold to peek). User-toggleable in Settings.
let sleepShuttersEnabled = true;

// The activity registry and schedule model live in data.js.

// ---- Cell ↔ model helpers ----
const CELL_DAY = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

function cellDay(cell) {
    if (cell.classList.contains('rituals-col')) return 'ritual';
    for (const [name, num] of Object.entries(CELL_DAY)) {
        if (cell.classList.contains(name)) return num;
    }
    return null;
}

function cellRowTime(cell) {
    const row = cell.closest('tr');
    return row ? parseFloat(row.dataset.time) : null;
}

function cellSlot(cell) {
    const id = cell.dataset.slotId;
    return id ? findResolvedSlot(id) : null;
}

// Re-project the model into the DOM and restore all live UI state
function refreshUI() {
    renderWeek();
    if (isEditMode) enableCellEditing();
    highlightToday();
    highlightCurrentTime();
    updateFlapsVisibility();
    applyWorkScheduleLines();
}

// Highlight today's column
function highlightToday() {
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentDate = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate current hour as decimal
    const currentHourDecimal = now.getHours() + now.getMinutes() / 60;

    // Calculate day progress from wakeup time to sleep time dynamically
    const { wakeupHour, sleepHour } = getSleepHoursFor(today);
    const awakeHours = sleepHour - wakeupHour;
    let dayProgress = 0;

    let isSleepTime = false;
    if (sleepHour >= wakeupHour) {
        isSleepTime = currentHourDecimal >= sleepHour || currentHourDecimal < wakeupHour;
    } else {
        isSleepTime = currentHourDecimal >= sleepHour && currentHourDecimal < wakeupHour;
    }

    if (wakeupHour === sleepHour) {
        console.warn("Wake up and Sleep time are identical.");
    }

    if (isSleepTime) {
        dayProgress = 100;
    } else {
        // During awake hours - calculate percentage
        let hoursAwake = currentHourDecimal - wakeupHour;
        if (hoursAwake < 0) hoursAwake += 24;
        dayProgress = Math.round((hoursAwake / awakeHours) * 100);
    }

    // Calculate month progress
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthProgress = Math.round((currentDate / daysInMonth) * 100);

    // Format date
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = monthNames[currentMonth] + ' ' + currentDate;

    // Check if currently in sleep hours (for zzz animation)
    let isSleepTimeLocal = isSleepTime;

    // Use static cache for headers and cells to reduce DOM lookups
    if (!window.headerElements) window.headerElements = document.querySelectorAll('th[data-day]');

    window.headerElements.forEach(header => {
        if (parseInt(header.dataset.day) === today) {
            header.classList.add('today-header');

            // Build structure only if it doesn't exist
            if (!header.querySelector('.date-display')) {
                const dayName = header.textContent;
                header.innerHTML =
                    '<div class="day-progress-fill" style="width: ' + dayProgress + '%"></div>' +
                    '<span class="header-content">' + dayName + '</span>' +
                    '<span class="date-display">' + dateStr + '</span>' +
                    '<div class="header-info-line">' +
                    '<span class="month-progress">' + dayProgress + '%</span>' +
                    '<span class="header-time-display"></span>' +
                    '</div>';

                // Scroll into view on first creation
                if (window.innerWidth < 1000) setTimeout(scrollToToday, 100);

                const pf = header.querySelector('.day-progress-fill');
                if (pf) updateProgressColor(pf, dayProgress);
            } else {
                // Update text values without full innerHTML replacement
                const monthProgressText = header.querySelector('.month-progress');
                if (monthProgressText) monthProgressText.textContent = dayProgress + '%';

                const progressFill = header.querySelector('.day-progress-fill');
                if (progressFill) {
                    progressFill.style.width = dayProgress + '%';
                    updateProgressColor(progressFill, dayProgress);
                }

                // Handle zzz visibility toggles separately
                const contentEl = header.querySelector('.header-content');
                const existingZzz = header.querySelector('.zzz-header');
                if (isSleepTimeLocal && !existingZzz && contentEl) {
                    const zzzSpan = document.createElement('span');
                    zzzSpan.className = 'zzz-header';
                    zzzSpan.textContent = 'zzz';
                    contentEl.appendChild(zzzSpan);
                } else if (!isSleepTimeLocal && existingZzz) {
                    existingZzz.remove();
                }
            }
        } else {
            header.classList.remove('today-header');
        }
    });

    // NOTE: deliberately no unconditional scrollToToday() here — highlightToday()
    // runs on every refreshUI() (every edit/toggle), and re-snapping the horizontal
    // scroll on each one yanked the viewport away from wherever the user was
    // interacting (e.g. tapping a ritual cell on the far-left rail). The header
    // block above already scrolls once on first render (line ~116); explicit
    // re-centering elsewhere (edit-mode exit, window resize) covers the rest.

    // Cache today class to avoid re-querying all cells every time
    const dayClasses = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayClass = dayClasses[today];

    document.querySelectorAll(`.today`).forEach(cell => cell.classList.remove('today'));
    document.querySelectorAll(`td.${todayClass}`).forEach(cell => cell.classList.add('today'));
    window.lastTodayClass = todayClass;
}

// Separate clock update for better CPU efficiency
function updateHeaderClocks() {
    const timeStr = formatTime(new Date());
    document.querySelectorAll('.header-time-display').forEach(el => {
        if (el.textContent !== timeStr) el.textContent = timeStr;
    });
}

// Update flaps visibility based on current time (sleep = closed, awake = open)
function updateFlapsVisibility() {
    const flaps = document.querySelectorAll('.cell-flap');

    const now = new Date();
    const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
    const today = now.getDay();

    // Check if currently in sleep hours
    const { wakeupHour, sleepHour } = getSleepHoursFor(today);
    let isSleepTime = false;
    if (sleepHour >= wakeupHour) {
        isSleepTime = currentHourDecimal >= sleepHour || currentHourDecimal < wakeupHour;
    } else {
        isSleepTime = currentHourDecimal >= sleepHour && currentHourDecimal < wakeupHour;
    }

    // Shutters forced open (disabled in settings, or actively editing)
    const flapsForcedOpen = !sleepShuttersEnabled || isEditMode;

    // During sleep hours with the grid still visible, today's cells carry a
    // vertical "SLEEP" ribbon (see CSS) — the current-time highlight has no row
    // to anchor to before the first slot of the day, so this is the "it's rest
    // time" signal instead.
    document.body.classList.toggle('sleep-open', isSleepTime && flapsForcedOpen);

    flaps.forEach(flap => {
        if (isSleepTime && !flapsForcedOpen) {
            // During sleep hours - close all flaps
            flap.classList.remove('open');
        } else {
            // During awake hours (or forced open) - open all flaps
            flap.classList.add('open');
        }
    });
}

// Highlight current time row
function highlightCurrentTime() {
    // Check if we need to update at all (only on minute change)
    // Note: The main loop now handles the minute-check, so we can just run the logic.

    const now = new Date();
    // Optimization: Calculate currentHour once
    const currentHour = now.getHours() + now.getMinutes() / 60;

    // Cache row elements
    if (!window.rowElements) {
        window.rowElements = Array.from(document.querySelectorAll('tr[data-time]'));
    }
    const rows = window.rowElements;

    let closestRow = null;
    let closestDiff = Infinity;
    let nextRowTime = null;

    // Cache sorted row times
    if (!window.rowTimesCache) {
        window.rowTimesCache = rows.map(row => parseFloat(row.dataset.time)).sort((a, b) => a - b);
    }
    const rowTimes = window.rowTimesCache;

    // Optimized search for closest row
    // Since we have N rows, a linear scan is fine, but we can avoid some parsing
    // We need the actual row element, so we still iterate rows or map times back to rows.
    // Iterating the cached rows array is fast enough.

    rows.forEach(row => {
        const rowTime = parseFloat(row.dataset.time); // getting from dataset is fast enough access
        const diff = Math.abs(currentHour - rowTime);

        // We want the row that is <= currentHour and closest to it
        if (currentHour >= rowTime && diff < closestDiff) {
            closestDiff = diff;
            closestRow = row;
        }
    });

    // Find the next row time for progress calculation
    if (closestRow) {
        const currentRowTime = parseFloat(closestRow.dataset.time);
        const currentIndex = rowTimes.indexOf(currentRowTime);
        if (currentIndex < rowTimes.length - 1) {
            nextRowTime = rowTimes[currentIndex + 1];
        } else {
            nextRowTime = currentRowTime + 1; // Assume 1 hour slot
        }
    }

    // Optimized cleanup: only remove from the specific previous row if it changed
    if (window.lastActiveRow && window.lastActiveRow !== closestRow) {
        window.lastActiveRow.classList.remove('current-time-row');
        const timeCell = window.lastActiveRow.querySelector('.time-col');
        if (timeCell && timeCell.dataset.originalTime) {
            timeCell.innerHTML = timeCell.dataset.originalTime;
            delete timeCell.dataset.originalTime;
        }
    }

    // Add new highlight
    if (closestRow && closestDiff < 2) {
        closestRow.classList.add('current-time-row');
        window.lastActiveRow = closestRow;

        const currentRowTime = parseFloat(closestRow.dataset.time);
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayName = dayNames[now.getDay()];

        // Targeted update: the active/past class sweep only changes when the active row,
        // the day, or the ±2h window (half-hour grid) shifts — skip it otherwise.
        // The per-minute work below is then just the progress bar + live clock.
        const highlightKey = currentRowTime + '|' + currentDayName + '|' + Math.floor(currentHour * 2);
        if (window.lastHighlightKey !== highlightKey) {
            window.lastHighlightKey = highlightKey;

            document.querySelectorAll('.active-slot').forEach(el => el.classList.remove('active-slot'));
            document.querySelectorAll('.current-active-cell').forEach(el => el.classList.remove('current-active-cell'));
            document.querySelectorAll('.past-slot').forEach(el => el.classList.remove('past-slot'));

            // Add active-slot to cells within a 4-hour window of the current time, and ALWAYS the closest row
            rows.forEach(row => {
                const rowTime = parseFloat(row.dataset.time);

                // Fade logic: rows that are in the past
                if (rowTime < currentRowTime) {
                    row.classList.add('past-slot');
                }

                // Check if row is within ±2 hours of current time (4-hour window) OR is the active row
                if (row === closestRow || (rowTime >= currentHour - 2 && rowTime <= currentHour + 2)) {
                    const targetCells = row.querySelectorAll('.time-col, .rituals-col, .' + currentDayName);
                    targetCells.forEach(td => td.classList.add('active-slot'));

                    // Specifically mark the single cell that is active NOW
                    if (row === closestRow) {
                        const currentCell = row.querySelector('.' + currentDayName);
                        if (currentCell) currentCell.classList.add('current-active-cell');
                    }
                }
            });
        }

        const timeCell = closestRow.querySelector('.time-col');
        if (timeCell) {
            if (!timeCell.dataset.originalTime) {
                timeCell.dataset.originalTime = timeCell.textContent.trim();
            }

            const originalTime = timeCell.dataset.originalTime;
            const currentRowTime = parseFloat(closestRow.dataset.time);
            const slotDuration = nextRowTime - currentRowTime;
            const elapsed = currentHour - currentRowTime;
            // Progress only updates every minute currently
            const progress = Math.min(Math.max((elapsed / slotDuration) * 100, 0), 100);

            let progressFill = timeCell.querySelector('.time-progress-fill');
            let liveTimeSpan = timeCell.querySelector('.live-time');

            if (!progressFill || !liveTimeSpan) {
                timeCell.style.position = 'relative'; // Ensure relative
                timeCell.innerHTML = `<div class="time-progress-fill"></div><span class="time-text">${originalTime}</span><span class="live-time"></span>`;
                progressFill = timeCell.querySelector('.time-progress-fill');
                liveTimeSpan = timeCell.querySelector('.live-time');
            }

            progressFill.style.width = progress + '%';
            updateProgressColor(progressFill, progress);
            liveTimeSpan.textContent = formatTime(now);
        }
    }
}

// Format time as HH:MM AM/PM
function formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutesStr + ' ' + ampm;
}

// Utility to update progress colors
function updateProgressColor(element, progress) {
    element.classList.remove('progress-yellow', 'progress-orange', 'progress-red');
    if (progress >= 90) element.classList.add('progress-red');
    else if (progress >= 75) element.classList.add('progress-orange');
    else if (progress >= 50) element.classList.add('progress-yellow');
}

// Flap DOM is rendered inline by renderWeek(); this attaches the global
// tap-and-hold-to-peek listeners (once) and sets the initial open/closed state.
function initializeFlaps() {
    const tableContainer = document.querySelector('.table-wrapper');

    // Initial state based on current time
    updateFlapsVisibility();

    if (window.flapListenersAttached) return;
    window.flapListenersAttached = true;

    // Mass opening logic - ONLY for sleep hours (tap and hold to peek)
    const openAll = (e) => {
        document.querySelectorAll('.cell-flap').forEach(f => f.classList.add('open'));
    };

    const closeAll = () => {
        // Never re-close while editing or with shutters disabled — this listener
        // fires on every pointerup on the table (including clicks that open the
        // activity picker without triggering a refreshUI()), so without this
        // guard, tapping around in edit mode during sleep hours would flicker
        // the shutters back shut out from under the user.
        if (!sleepShuttersEnabled || isEditMode) return;

        // Only close flaps if we're in sleep hours
        // During awake hours, flaps should stay open
        const now = new Date();
        const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
        const today = now.getDay();
        const { wakeupHour, sleepHour } = getSleepHoursFor(today);
        let isSleepTime = false;
        if (sleepHour >= wakeupHour) {
            isSleepTime = currentHourDecimal >= sleepHour || currentHourDecimal < wakeupHour;
        } else {
            isSleepTime = currentHourDecimal >= sleepHour && currentHourDecimal < wakeupHour;
        }

        if (isSleepTime) {
            // Only close during sleep hours
            document.querySelectorAll('.cell-flap').forEach(f => f.classList.remove('open'));
        }
        // During awake hours, do nothing - flaps stay open
    };

    // Attach to the table wrapper for global hold (useful during sleep hours)
    tableContainer.addEventListener('pointerdown', openAll);
    tableContainer.addEventListener('pointerup', closeAll);
    tableContainer.addEventListener('pointerleave', closeAll);
    tableContainer.addEventListener('pointercancel', closeAll);

    // Prevent context menu
    tableContainer.addEventListener('contextmenu', e => e.preventDefault());
}

// ============================================
// INTERACTIVE EDITING SYSTEM
// ============================================

// Create and inject edit toggle button
function createEditToggle() {
    const toggle = document.createElement('button');
    toggle.id = 'editToggle';
    toggle.className = 'edit-toggle';
    // Clean Pencil/Edit Icon SVG
    toggle.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg><span class="edit-text">EDIT MODE ON</span>`;

    toggle.title = 'Toggle Edit Mode';
    toggle.addEventListener('click', toggleEditMode);

    // Append to controls container if it exists, otherwise delay or body?
    // Since createEditToggle is called BEFORE createSettingsPanel where container is made,
    // we should create container globally or here first.
    // Let's create container here if missing.
    let container = document.querySelector('.floating-controls');
    if (!container) {
        container = document.createElement('div');
        container.className = 'floating-controls';
        document.body.appendChild(container);
    }
    container.appendChild(toggle);
}

// Create settings panel
function createSettingsPanel() {
    const panel = document.createElement('div');
    panel.id = 'settingsPanel';
    panel.className = 'settings-panel';
    panel.innerHTML = `
        <div class="settings-header">
            <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #00d9ff;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <h3 style="margin: 0; font-size: 18px; color: #fff;">Settings</h3>
            </div>
            <button class="settings-close" id="settingsClose" aria-label="Close settings">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div class="settings-content">
            <div class="settings-section">
                <h4>App Experience</h4>
                 <div class="settings-toggle-row">
                    <span>Target Mode (Focus)</span>
                    <label class="switch">
                        <input type="checkbox" id="focusModeToggle">
                        <span class="slider"></span>
                    </label>
                </div>
                 <div class="settings-toggle-row">
                    <span>Notifications</span>
                    <label class="switch">
                        <input type="checkbox" id="notificationToggle">
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="settings-toggle-row" id="notifBufferRow" style="margin-top: 10px;">
                    <span>Notification Timing</span>
                    <select id="notificationBuffer" style="background: rgba(0,0,0,0.3); color: #fff; border: 1px solid var(--accent-border); padding: 4px 8px; border-radius: 4px; font-size: 12px; max-width: 120px;">
                        <option value="0">On time</option>
                        <option value="5">5m before</option>
                        <option value="10">10m before</option>
                    </select>
                </div>
                <div class="settings-toggle-row" style="margin-top: 10px;">
                    <span>Theme</span>
                    <select id="themeSelector" style="background: rgba(0,0,0,0.3); color: #fff; border: 1px solid var(--accent-border); padding: 4px 8px; border-radius: 4px; font-size: 12px; max-width: 140px;">
                        <option value="refined-midnight">Refined Midnight</option>
                        <option value="slate-light">Slate Light</option>
                        <option value="forest-green">Forest Green</option>
                        <option value="warm-sepia">Warm Sepia</option>
                    </select>
                </div>
            </div>
            
            <div class="settings-section">
                <h4>Schedule Hours</h4>
                <div class="settings-input-row" style="margin-bottom: 8px;">
                    <label>Weekday Wake: <input type="time" id="wakeupTime" value="07:30"></label>
                    <label>Weekday Sleep: <input type="time" id="sleepTime" value="23:00"></label>
                </div>
                <div class="settings-input-row" style="margin-bottom: 8px;">
                    <label>Weekend Wake: <input type="time" id="wakeupTimeWeekend" value="08:30"></label>
                    <label>Weekend Sleep: <input type="time" id="sleepTimeWeekend" value="23:30"></label>
                </div>
                <div class="settings-toggle-row">
                    <span>🌙 Sleep Shutters</span>
                    <label class="switch">
                        <input type="checkbox" id="sleepShuttersToggle" checked>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings-section">
                <h4>💼 Work Schedule</h4>
                <div class="settings-input-row">
                    <label>Start: <input type="time" id="workStart" value="09:00"></label>
                    <label>End: <input type="time" id="workEnd" value="17:00"></label>
                </div>
                <div class="day-picker">
                    <label><input type="checkbox" class="work-day" data-day="1" checked>M</label>
                    <label><input type="checkbox" class="work-day" data-day="2" checked>T</label>
                    <label><input type="checkbox" class="work-day" data-day="3" checked>W</label>
                    <label><input type="checkbox" class="work-day" data-day="4" checked>T</label>
                    <label><input type="checkbox" class="work-day" data-day="5" checked>F</label>
                    <label><input type="checkbox" class="work-day" data-day="6">S</label>
                    <label><input type="checkbox" class="work-day" data-day="0">S</label>
                </div>
            </div>

            <div class="settings-section">
                <h4>Rhythm Templates</h4>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <select id="templateSelector" style="flex: 1; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid var(--accent-border); padding: 5px; border-radius: 4px; min-width: 0; font-size: 13px;">
                        <option value="Default">Default</option>
                    </select>
                    <button class="settings-btn" id="deleteTemplateBtn" style="padding: 5px 10px; margin: 0;" title="Delete selected template">🗑️</button>
                </div>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="newTemplateName" placeholder="New template name" style="flex: 1; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid var(--border-subtle); padding: 5px; border-radius: 4px; font-size: 13px; min-width: 0;">
                    <button class="settings-btn" id="saveTemplateBtn" style="padding: 5px 10px; margin: 0; white-space: nowrap;">💾 Save</button>
                </div>
            </div>

            <div class="settings-section">
                <h4>Time Slots</h4>
                <button class="settings-btn" id="addTimeSlot">+ Add Time Slot</button>
            </div>
            <div class="settings-section">
                <h4>Data & Stats</h4>
                <button class="settings-btn" id="showAnalyticsBtn">📈 View Analytics</button>
                <button class="settings-btn" id="exportCSV">📊 Export CSV</button>
                <div class="btn-group">
                    <button class="settings-btn" id="exportData" title="Save backup file (JSON)">📤 Backup</button>
                    <button class="settings-btn" id="importData" title="Load backup file (JSON)">📥 Import</button>
                </div>
                <button class="settings-btn danger" id="resetData">🗑️ Reset All</button>
            </div>
            <button class="settings-btn" id="applyAllSettings" style="width: 100%; margin-top: 20px; padding: 15px; border-color: #00d9ff; color: #00d9ff; font-weight: bold; background: rgba(0, 217, 255, 0.1);">⚡ APPLY ALL CHANGES</button>
        </div>
    `;
    document.body.appendChild(panel);

    // Get or create container
    let container = document.querySelector('.floating-controls');
    if (!container) {
        container = document.createElement('div');
        container.className = 'floating-controls';
        document.body.appendChild(container);
    }

    // Focus Mode Toggle Button
    const focusBtn = document.createElement('button');
    focusBtn.id = 'focusToggleBtn';
    focusBtn.className = 'focus-toggle active';
    focusBtn.title = 'Toggle Focus';
    focusBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`;
    focusBtn.addEventListener('click', () => {
        const isFocused = document.body.classList.contains('focus-mode');
        toggleFocusMode(!isFocused);
    });
    if (container.firstChild) {
        container.insertBefore(focusBtn, container.firstChild);
    } else {
        container.appendChild(focusBtn);
    }

    // Settings button
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'settingsToggle';
    settingsBtn.className = 'settings-toggle';
    settingsBtn.title = 'Settings';
    settingsBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
    settingsBtn.addEventListener('click', () => {
        panel.classList.toggle('open');
        if (panel.classList.contains('open')) {
            // Load and bind initial values dynamically from the model
            document.getElementById('wakeupTime').value = getSetting('wakeupTime', '07:30');
            document.getElementById('sleepTime').value = getSetting('sleepTime', '23:00');
            document.getElementById('wakeupTimeWeekend').value = getSetting('wakeupTimeWeekend', '08:30');
            document.getElementById('sleepTimeWeekend').value = getSetting('sleepTimeWeekend', '23:30');
            
            document.getElementById('notificationBuffer').value = getSetting('notificationBuffer', '0');
            document.getElementById('themeSelector').value = getSetting('activeTheme', 'refined-midnight');
            
            document.getElementById('workStart').value = getSetting('workStart', '09:00');
            document.getElementById('workEnd').value = getSetting('workEnd', '17:00');
            populateTemplatesDropdown();
        }
    });

    if (container.children.length > 1) {
        container.insertBefore(settingsBtn, container.children[1]);
    } else {
        container.appendChild(settingsBtn);
    }

    // Close button
    document.getElementById('settingsClose').addEventListener('click', () => panel.classList.remove('open'));

    // Focus Mode Toggle
    document.getElementById('focusModeToggle').addEventListener('change', (e) => toggleFocusMode(e.target.checked));

    // Sleep shutters toggle
    const shuttersToggle = document.getElementById('sleepShuttersToggle');
    shuttersToggle.checked = sleepShuttersEnabled;
    shuttersToggle.addEventListener('change', (e) => {
        sleepShuttersEnabled = e.target.checked;
        updateSetting('sleepShuttersEnabled', sleepShuttersEnabled);
        updateFlapsVisibility();
    });

    // Check notification status
    const notifToggle = document.getElementById('notificationToggle');
    if (Notification.permission === 'granted') {
        notifToggle.checked = true;
    }
    notifToggle.addEventListener('change', (e) => toggleNotifications(e.target.checked));

    // Notification buffer select timing
    document.getElementById('notificationBuffer').addEventListener('change', (e) => {
        updateSetting('notificationBuffer', e.target.value);
    });

    // Theme selector
    document.getElementById('themeSelector').addEventListener('change', (e) => {
        const theme = e.target.value;
        updateSetting('activeTheme', theme);
        applyTheme(theme);
    });

    // Work Schedule Settings
    ['workStart', 'workEnd'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                updateSetting(id, e.target.value);
                applyWorkScheduleLines();
            });
        }
    });

    document.querySelectorAll('.work-day').forEach(cb => {
        const saved = localStorage.getItem(`workDay_${cb.dataset.day}`);
        if (saved !== null) cb.checked = saved === 'true';
        cb.addEventListener('change', (e) => {
            localStorage.setItem(`workDay_${cb.dataset.day}`, e.target.checked);
            applyWorkScheduleLines();
        });
    });

    // Rhythm Templates bindings
    const populateTemplatesDropdown = () => {
        const selector = document.getElementById('templateSelector');
        if (!selector) return;
        selector.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = 'Default';
        defaultOpt.textContent = 'Default';
        selector.appendChild(defaultOpt);
        if (model.templates) {
            Object.keys(model.templates).forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                selector.appendChild(opt);
            });
        }
        selector.value = getSetting('activeTemplateName', 'Default');
    };

    document.getElementById('templateSelector').addEventListener('change', (e) => {
        const name = e.target.value;
        loadTemplate(name);
        renderWeek();
        highlightToday();
        highlightCurrentTime();
        updateFlapsVisibility();
        applyWorkScheduleLines();
    });

    document.getElementById('saveTemplateBtn').addEventListener('click', () => {
        const input = document.getElementById('newTemplateName');
        const name = input.value.trim();
        if (!name) return alert('Please enter a template name.');
        if (name === 'Default') return alert('Cannot overwrite "Default" template.');
        saveAsTemplate(name);
        populateTemplatesDropdown();
        input.value = '';
        alert(`Template "${name}" saved!`);
    });

    document.getElementById('deleteTemplateBtn').addEventListener('click', () => {
        const selector = document.getElementById('templateSelector');
        const name = selector.value;
        if (name === 'Default') return alert('Cannot delete the Default template.');
        if (confirm(`Are you sure you want to delete template "${name}"?`)) {
            deleteTemplate(name);
            populateTemplatesDropdown();
            renderWeek();
            highlightToday();
            highlightCurrentTime();
            updateFlapsVisibility();
            applyWorkScheduleLines();
        }
    });

    // Initial apply
    setTimeout(applyWorkScheduleLines, 500);

    const applyBtn = document.getElementById('applyAllSettings');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            // Save Wakeup/Sleep to model settings
            updateSetting('wakeupTime', document.getElementById('wakeupTime').value);
            updateSetting('sleepTime', document.getElementById('sleepTime').value);
            updateSetting('wakeupTimeWeekend', document.getElementById('wakeupTimeWeekend').value);
            updateSetting('sleepTimeWeekend', document.getElementById('sleepTimeWeekend').value);
            updateSetting('workStart', document.getElementById('workStart').value);
            updateSetting('workEnd', document.getElementById('workEnd').value);

            // Keep global variables in sync with today's values
            const todayDow = (new Date()).getDay();
            const hoursToday = getSleepHoursFor(todayDow);
            WAKEUP_HOUR = hoursToday.wakeupHour;
            SLEEP_HOUR = hoursToday.sleepHour;

            highlightToday();
            highlightCurrentTime();
            updateFlapsVisibility();
            applyWorkScheduleLines();

            applyBtn.innerText = '✨ SETTINGS APPLIED!';
            setTimeout(() => applyBtn.innerText = '⚡ APPLY ALL CHANGES', 2000);
        });
    }

    // Stats
    document.getElementById('showAnalyticsBtn').addEventListener('click', showAnalytics);

    // Add time slot button
    document.getElementById('addTimeSlot').addEventListener('click', addNewTimeSlot);

    // Export CSV / JSON / Reset
    document.getElementById('exportCSV').addEventListener('click', exportCSV);
    document.getElementById('exportData').addEventListener('click', exportSchedule);
    document.getElementById('importData').addEventListener('click', importSchedule);
    document.getElementById('resetData').addEventListener('click', resetSchedule);
}

function applyTheme(theme) {
    // Remove other theme classes
    document.body.className = document.body.className.replace(/\btheme-[a-z-]+\b/g, '').trim();
    if (theme && theme !== 'refined-midnight') {
        document.body.classList.add('theme-' + theme);
    }
}

// Create activity picker popup
function createActivityPicker() {
    const picker = document.createElement('div');
    picker.id = 'activityPicker';
    picker.className = 'activity-picker';

    // We need to rebuild this dynamically whenever it opens to show custom activities
    // So we'll just set the minimal structure here
    // The render function will handle the content
    document.body.appendChild(picker);

    // Handle activity selection (Event delegation)
    picker.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('.picker-close');
        if (closeBtn) {
            hideActivityPicker();
            return;
        }

        const saveBtn = e.target.closest('.picker-save');
        if (saveBtn) {
            const targetCell = picker.targetCell;
            const linkInput = picker.querySelector('#pickerLink');
            const customNameInput = picker.querySelector('#pickerCustomName');
            const fixedToggle = picker.querySelector('#pickerFixed');
            const categorySelect = picker.querySelector('#pickerCategory');
            const selectedBtn = picker.querySelector('.picker-item.selected, .picker-clear.selected');
            const customName = customNameInput?.value.trim() || '';

            if (!targetCell) return;

            if (selectedBtn && selectedBtn.dataset.activity === 'clear') {
                applySlotEdit(targetCell, null);
            } else {
                // Resolve which activity identity this cell should carry
                let activity = null;
                if (selectedBtn) activity = getActivity(selectedBtn.dataset.activity);
                if (!activity && customName) {
                    // Typed name with no selection: reuse a matching activity or mint a new one
                    activity = ensureCustomActivity(customName, '⭐', categorySelect?.value || 'other');
                }

                if (activity) {
                    applySlotEdit(targetCell, {
                        activityId: activity.id,
                        // A typed name differing from the activity's label is a slot-level label (e.g. "Meal 1")
                        label: (customName && customName !== activity.label) ? customName : '',
                        url: linkInput?.value.trim() || '',
                        fixed: fixedToggle ? fixedToggle.checked : undefined
                    });
                }
            }

            hideActivityPicker();
            return;
        }

        // Scope segmented control (Every week ↔ Just this week)
        const scopeBtn = e.target.closest('.picker-scope-btn');
        if (scopeBtn) {
            setEditScope(scopeBtn.dataset.scope);
            picker.querySelectorAll('.picker-scope-btn').forEach(b => b.classList.toggle('selected', b === scopeBtn));
            return;
        }

        const btn = e.target.closest('.picker-item, .picker-clear');
        if (!btn) return;

        // Update custom name input with selected activity name
        const customNameInput = picker.querySelector('#pickerCustomName');
        const activityName = btn.querySelector('.picker-name')?.textContent || '';
        if (customNameInput && activityName && btn.dataset.activity !== 'clear') {
            customNameInput.value = activityName;
        } else if (btn.dataset.activity === 'clear' && customNameInput) {
            customNameInput.value = '';
        }

        // Handle normal selection toggle
        picker.querySelectorAll('.picker-item, .picker-clear').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // Sync the Fixed toggle to the activity's default unless the user set it manually
        const fixedToggle = picker.querySelector('#pickerFixed');
        if (fixedToggle && !fixedToggle.dataset.touched && btn.dataset.activity !== 'clear') {
            fixedToggle.checked = defaultFixed(btn.dataset.activity);
        }
    });

    // Remember when the user manually flips the Fixed toggle
    picker.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'pickerFixed') e.target.dataset.touched = '1';
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target) && !e.target.closest('td')) {
            hideActivityPicker();
        }
    });
}

function renderActivityPickerContent() {
    const picker = document.getElementById('activityPicker');
    if (!picker) return;

    // Current state comes from the model, not from scraping the cell
    const currentCell = picker.targetCell;
    const slot = currentCell ? cellSlot(currentCell) : null;
    const slotActivity = slot ? getActivity(slot.activityId) : null;
    const currentName = slot ? (slot.label || (slotActivity ? slotActivity.label : '')) : '';

    // Capture unsaved URL input so it's not lost on re-render
    const currentUrl = picker.querySelector('#pickerLink')?.value || (slot ? slot.url : '') || '';

    let displayTitle = 'Select Activity';
    if (currentCell) {
        const row = currentCell.closest('tr');
        const table = row?.closest('table');
        if (row && table) {
            const timeText = row.querySelector('.time-col')?.innerText?.trim() || '';
            const cellIndex = currentCell.cellIndex;
            const headerCell = table.querySelector(`thead th:nth-child(${cellIndex + 1})`);
            const header = headerCell?.innerText?.trim() || '';
            if (header && timeText) {
                const icon = slotActivity ? slotActivity.icon : '';
                const activityDisplayName = currentName ? `${icon} ${currentName}` : 'New Task';
                displayTitle = `${activityDisplayName} • ${header} @ ${timeText}`;
            }
        }
    }

    const isFixed = slot ? slot.fixed : true;

    let html = `
        <div class="picker-header">
            <h4>${displayTitle}</h4>
            <button class="picker-close" aria-label="Close picker">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div class="picker-scope">
            <button class="picker-scope-btn ${editScope === 'template' ? 'selected' : ''}" data-scope="template">🔁 Every week</button>
            <button class="picker-scope-btn ${editScope === 'week' ? 'selected' : ''}" data-scope="week">📅 Just this week</button>
        </div>
        <div class="picker-scroll-area">
            <div class="picker-section">
                <h5>Quick Tasks</h5>
                <div class="picker-grid">`;

    const currentActivityId = slot ? slot.activityId : null;
    for (const [key, activity] of Object.entries(BUILTIN_ACTIVITIES)) {
        const isSelected = currentActivityId === key ? 'selected' : '';
        html += `<button class="picker-item ${activity.style} ${isSelected}" data-activity="${key}">
            <span class="picker-icon">${activity.icon}</span>
            <span class="picker-name">${activity.label}</span>
        </button>`;
    }
    html += '</div></div>';

    // User-defined palette (lives in the model's activity registry)
    const customActivities = Object.values(model.activities);
    if (customActivities.length > 0) {
        html += '<div class="picker-section">';
        html += '<h5>My Palette</h5>';
        html += '<div class="palette-grid">';
        customActivities.forEach(act => {
            const isSelected = currentActivityId === act.id ? 'selected' : '';
            html += `<button class="picker-item ${isSelected}" data-activity="${act.id}">
                <span class="picker-icon">${act.icon}</span>
                <span class="picker-name">${act.label}</span>
            </button>`;
        });
        html += '</div></div>';
    }

    // Category options for newly-typed custom activities
    let categoryOptions = '';
    for (const [id, cat] of Object.entries(CATEGORIES)) {
        if (cat.hidden) continue;
        categoryOptions += `<option value="${id}">${cat.label}</option>`;
    }

    html += `
            <div class="picker-section">
                <h5>Slot Options</h5>
                <div class="picker-link-container">
                    <label class="picker-toggle-row">
                        <input type="checkbox" id="pickerFixed" ${isFixed ? 'checked' : ''}>
                        <span>📌 Fixed (anchored — drag-proof)</span>
                    </label>

                    <label for="pickerCustomName">🔧 Custom Activity Name</label>
                    <input type="text" id="pickerCustomName" placeholder="Override or new name..." class="picker-input" value="${currentName || ''}" style="margin-bottom: 12px;">

                    <label for="pickerCategory">🏷️ Category (for new activities)</label>
                    <select id="pickerCategory" class="picker-input" style="margin-bottom: 12px;">${categoryOptions}</select>

                    <label for="pickerLink">🔗 Destination URL</label>
                    <input type="text" id="pickerLink" placeholder="https://..." class="picker-input" value="${currentUrl}">
                </div>
            </div>
        </div>
        <div class="picker-footer">
            <button class="picker-clear" data-activity="clear">🗑️ Clear Cell</button>
            <button class="picker-save">💾 Save</button>
        </div>
    `;

    picker.innerHTML = html;
}

// Toggle edit mode
function toggleEditMode() {
    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode', isEditMode);
    document.getElementById('editToggle').classList.toggle('active', isEditMode);

    if (isEditMode) {
        enableCellEditing();
    } else {
        disableCellEditing();
        hideActivityPicker();
        toggleFocusMode(true);
        scrollToToday();
    }
    updateFlapsVisibility();
}

// Enable cell editing
function enableCellEditing() {
    const cells = document.querySelectorAll('tbody td:not(.time-col):not(.rituals-col)');
    cells.forEach(cell => {
        cell.classList.add('editable', 'draggable');
        cell.setAttribute('draggable', 'true'); // Enable drag API

        // Click for picker
        cell.addEventListener('click', handleCellClick);

        // Drag events
        cell.addEventListener('dragstart', handleDragStart);
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('drop', handleDrop);
        cell.addEventListener('dragenter', handleDragEnter);
        cell.addEventListener('dragleave', handleDragLeave);
    });
}

// Disable cell editing
function disableCellEditing() {
    const cells = document.querySelectorAll('tbody td.editable');
    cells.forEach(cell => {
        cell.classList.remove('editable', 'draggable');
        cell.removeAttribute('draggable');

        cell.removeEventListener('click', handleCellClick);
        cell.removeEventListener('dragstart', handleDragStart);
        cell.removeEventListener('dragover', handleDragOver);
        cell.removeEventListener('drop', handleDrop);
        cell.removeEventListener('dragenter', handleDragEnter);
        cell.removeEventListener('dragleave', handleDragLeave);
    });
}

// Drag Handlers
let draggedCell = null;

function handleDragStart(e) {
    // Fixed (anchored) slots don't move — flash them instead
    const slot = cellSlot(this);
    if (slot && slot.fixed) {
        e.preventDefault();
        this.classList.add('fixed-shake');
        setTimeout(() => this.classList.remove('fixed-shake'), 450);
        return;
    }

    draggedCell = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault(); // Necessary for drop to work
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    draggedCell.classList.remove('dragging');
    this.classList.remove('drag-over');

    if (draggedCell !== this) {
        // Moving a slot is a MODEL operation — the DOM re-renders from it.
        const srcId = draggedCell.dataset.slotId;
        if (!srcId) return false;

        const srcDay = cellDay(draggedCell), srcTime = cellRowTime(draggedCell);
        const tgtDay = cellDay(this), tgtTime = cellRowTime(this);
        if (tgtDay === null || tgtTime === null) return false;

        const tgtId = this.dataset.slotId;
        if (tgtId) moveSlot(tgtId, srcDay, srcTime, editScope); // occupied target → swap
        moveSlot(srcId, tgtDay, tgtTime, editScope);

        saveModel();
        refreshUI();
    }

    return false;
}

// Handle cell click in edit mode
function handleCellClick(e) {
    if (!isEditMode) return;
    e.stopPropagation();

    const cell = e.currentTarget;
    showActivityPicker(cell);
}

// Show activity picker near cell
function showActivityPicker(cell) {
    const picker = document.getElementById('activityPicker');
    picker.targetCell = cell;

    // Re-render to show updated custom activities and contextual header
    renderActivityPickerContent();

    // Momentarily show to measure dimensions
    picker.style.visibility = 'hidden';
    picker.style.display = 'flex';
    picker.classList.add('visible');
    const pickerWidth = picker.offsetWidth || 280;
    const pickerHeight = picker.offsetHeight || 400;
    picker.classList.remove('visible');
    picker.style.visibility = '';
    picker.style.display = '';

    const rect = cell.getBoundingClientRect();
    let left, top;

    // On mobile, center it. On desktop, position near cell.
    if (window.innerWidth < 768) {
        left = (window.innerWidth - pickerWidth) / 2;
        top = (window.innerHeight - pickerHeight) / 2;
    } else {
        left = rect.left + rect.width / 2 - pickerWidth / 2;
        top = rect.bottom + 8;
    }

    // Keep within safe viewport bounds (10px padding)
    const margin = 10;
    if (left < margin) left = margin;
    if (left + pickerWidth > window.innerWidth - margin) {
        left = window.innerWidth - pickerWidth - margin;
    }

    if (top < margin) top = margin;
    if (top + pickerHeight > window.innerHeight - margin) {
        // If not enough space below, try above the cell
        if (window.innerWidth >= 768) {
            top = rect.top - pickerHeight - 8;
        }
        // Final clamp
        if (top < margin) top = margin;
        if (top + pickerHeight > window.innerHeight - margin) {
            top = window.innerHeight - pickerHeight - margin;
        }
    }

    picker.style.left = left + 'px';
    picker.style.top = top + 'px';

    // Fill link input
    const linkInput = picker.querySelector('#pickerLink');
    if (linkInput) {
        linkInput.value = cell.dataset.url || '';
    }

    picker.classList.add('visible');
}

// Hide activity picker
function hideActivityPicker() {
    const picker = document.getElementById('activityPicker');
    if (picker) {
        picker.classList.remove('visible');
        picker.targetCell = null;
    }
}

// Apply an edit from the picker to the slot behind a cell.
// `sel` = { activityId, label, url, fixed } or null to clear the cell.
// Scope-aware: 'template' edits the core week, 'week' writes a this-week override.
function applySlotEdit(cell, sel) {
    if (!cell) return;

    const existing = cell.dataset.slotId ? cell.dataset.slotId : null;
    const day = cellDay(cell);
    const time = cellRowTime(cell);
    if (day === null || time === null) return;

    if (sel === null) {
        if (existing) deleteSlot(existing, editScope);
    } else if (existing) {
        const patch = { activityId: sel.activityId, label: sel.label || '', url: sel.url || '' };
        if (sel.fixed !== undefined) patch.fixed = sel.fixed;
        updateSlot(existing, patch, editScope);
    } else {
        createSlot({ day, time, activityId: sel.activityId, label: sel.label, url: sel.url, fixed: sel.fixed }, editScope);
    }

    saveModel();
    refreshUI();
}

// Add new time slot
function addNewTimeSlot() {
    const timeStr = prompt('Enter time (e.g., 3:30 PM or 15:30):');
    if (!timeStr) return;

    // Parse time
    let hours, minutes = 0;
    const pmMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(pm|PM)/i);
    const amMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|AM)/i);
    const militaryMatch = timeStr.match(/^(\d{1,2}):?(\d{2})?$/);

    if (pmMatch) {
        hours = parseInt(pmMatch[1]);
        minutes = parseInt(pmMatch[2] || 0);
        if (hours !== 12) hours += 12;
    } else if (amMatch) {
        hours = parseInt(amMatch[1]);
        minutes = parseInt(amMatch[2] || 0);
        if (hours === 12) hours = 0;
    } else if (militaryMatch) {
        hours = parseInt(militaryMatch[1]);
        minutes = parseInt(militaryMatch[2] || 0);
    } else {
        alert('Invalid time format');
        return;
    }

    const timeDecimal = hours + minutes / 60;

    // The time grid lives in the model
    if (model.rowTimes.includes(timeDecimal)) {
        alert('This time slot already exists');
        return;
    }

    model.rowTimes.push(timeDecimal);
    model.rowTimes.sort((a, b) => a - b);
    saveModel();
    refreshUI();
}

// Export schedule as JSON backup (full v4 model: template, overrides, streaks, palette)
function exportSchedule() {
    const data = localStorage.getItem(MODEL_KEY);
    if (!data) {
        alert('No saved data to backup');
        return;
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `day-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Export schedule as CSV for spreadsheets (resolved current week)
function exportCSV() {
    try {
        const idx = buildSlotIndex(new Date());
        const columnDays = ['ritual', 1, 2, 3, 4, 5, 6, 0];
        const headers = ['Time', 'Rituals', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        let csvContent = headers.join(',') + '\n';

        sortedRowTimes().forEach(t => {
            const cells = [formatDecimalTime(t)];
            columnDays.forEach(day => {
                const slot = idx[day + '|' + t];
                let text = '';
                if (slot) {
                    const act = getActivity(slot.activityId);
                    const icon = act ? act.icon : '';
                    const label = slot.label || (act ? act.label : '');
                    text = (icon ? icon + ' ' : '') + label;
                }
                cells.push(text);
            });
            // Escape commas and quotes for CSV safety
            csvContent += cells.map(c => `"${c.replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-schedule-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('CSV Export failed:', e);
        alert('Failed to generate CSV export');
    }
}

// Import schedule from JSON
function importSchedule() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data && data.version === 4 && data.template) {
                    // v4 backup: restore directly
                    localStorage.setItem(MODEL_KEY, JSON.stringify(data));
                } else if (data && data.schedule) {
                    // Legacy v3 backup: run it through the migrator
                    const migrated = migrateScheduleData(data);
                    if (!migrated) throw new Error('migration failed');
                    localStorage.setItem(MODEL_KEY, JSON.stringify(migrated));
                } else {
                    throw new Error('unrecognized format');
                }
                location.reload();
            } catch (err) {
                alert('Invalid backup file');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Reset schedule to the default week
function resetSchedule() {
    if (confirm('Are you sure you want to reset? This will clear all saved changes (schedule, overrides and streaks).')) {
        localStorage.removeItem(MODEL_KEY);
        localStorage.removeItem(LEGACY_KEY); // otherwise the v3 migration would just restore it
        location.reload();
    }
}

// ============================================
// NEW FEATURES IMPLEMENTATION
// ============================================

function toggleFocusMode(enabled) {
    const btn = document.getElementById('focusToggleBtn');
    const toggle = document.getElementById('focusModeToggle');

    if (enabled) {
        document.body.classList.add('focus-mode');
        if (btn) btn.classList.add('active');
        if (toggle) toggle.checked = true;
    } else {
        document.body.classList.remove('focus-mode');
        if (btn) btn.classList.remove('active');
        if (toggle) toggle.checked = false;
    }
}

function toggleNotifications(enabled) {
    if (enabled) {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
                if (permission !== 'granted') {
                    document.getElementById('notificationToggle').checked = false;
                }
            });
        }
    }
}

function showAnalytics() {
    // All stats come from the model: hours by category (identity), per-activity
    // breakdown (continuity arrows already resolved), and habit/health streaks.
    const { byCategory, byActivity, total } = weekRollup(new Date());

    // Create UI shell once
    let overlay = document.querySelector('.analytics-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'analytics-overlay';
        overlay.innerHTML = `
            <div class="analytics-container">
                <div class="analytics-header">
                    <h2>📊 Time Analytics</h2>
                    <button class="close-analytics">×</button>
                </div>
                <div class="analytics-content">
                    <!-- Cards go here -->
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('.close-analytics').addEventListener('click', () => {
            overlay.classList.remove('visible');
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('visible');
        });
    }

    const content = overlay.querySelector('.analytics-content');
    content.innerHTML = '';

    // --- Section 1: This week by category ---
    const catSection = document.createElement('div');
    catSection.className = 'analytics-section';
    catSection.innerHTML = `<h3 class="analytics-section-title">This Week by Category · ${total.toFixed(1)}h scheduled</h3>`;

    Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([catId, hours]) => {
        const cat = CATEGORIES[catId] || CATEGORIES.other;
        const pct = total > 0 ? (hours / total) * 100 : 0;
        const row = document.createElement('div');
        row.className = 'category-row';
        row.innerHTML = `
            <span class="category-dot" style="background:${cat.color}"></span>
            <span class="category-name">${cat.label}</span>
            <span class="category-hours">${hours.toFixed(1)}h</span>
            <div class="category-bar-track"><div class="category-bar-fill" style="width:${pct.toFixed(1)}%; background:${cat.color}"></div></div>
        `;
        catSection.appendChild(row);
    });
    content.appendChild(catSection);

    // --- Section 2: Top activities ---
    const actSection = document.createElement('div');
    actSection.className = 'analytics-section';
    actSection.innerHTML = '<h3 class="analytics-section-title">Top Activities</h3>';
    const cardsWrap = document.createElement('div');
    cardsWrap.className = 'stat-cards-grid';
    Object.entries(byActivity).sort((a, b) => b[1] - a[1]).slice(0, 9).forEach(([name, hours]) => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <h3>${name}</h3>
            <div class="stat-value">${hours.toFixed(1)}h</div>
            <div class="stat-detail">Weekly Hours</div>
        `;
        cardsWrap.appendChild(card);
    });
    actSection.appendChild(cardsWrap);
    content.appendChild(actSection);

    overlay.classList.add('visible');
}

function checkNotifications() {
    const toggle = document.getElementById('notificationToggle');
    if (!toggle || !toggle.checked) return;

    const bufferMinutes = parseInt(getSetting('notificationBuffer', '0'));
    const now = new Date();
    // Get the target time to notify for
    const targetTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);
    const targetHourDecimal = parseFloat((targetTime.getHours() + targetTime.getMinutes() / 60).toFixed(4));

    // Find the row that starts at exactly this hour (e.g. 9.5)
    // We allow a small tolerance since float representations can vary slightly
    const rows = Array.from(document.querySelectorAll('tr[data-time]'));
    const matchingRow = rows.find(row => {
        const time = parseFloat(row.dataset.time);
        return Math.abs(time - targetHourDecimal) < 0.008; // 0.008 hour is ~0.5 minute
    });

    if (matchingRow) {
        // Only notify once per slot
        const notifyKey = 'notified_' + matchingRow.dataset.time + '_' + targetTime.toDateString();
        if (matchingRow.dataset.lastNotifiedKey === notifyKey) return;

        const dayIdx = targetTime.getDay();
        const colIdx = dayIdx === 0 ? 8 : dayIdx + 1;
        const cell = matchingRow.children[colIdx];
        if (cell) {
            const clone = cell.cloneNode(true);
            clone.querySelectorAll('.icon, .cell-flap').forEach(el => el.remove());
            const actName = clone.textContent.trim();

            if (actName) {
                let title = 'Up Next';
                let body = `${actName} starts in ${bufferMinutes} minutes`;
                if (bufferMinutes === 0) {
                    title = 'Starting Now';
                    body = `${actName} starts now`;
                }
                new Notification(title, {
                    body: body,
                    icon: 'apple-touch-icon.png'
                });
            }
        }
        matchingRow.dataset.lastNotifiedKey = notifyKey;
    }
}

// Edit scope pill (visible in edit mode): tap to flip between
// editing the core week and editing just this week.
function createScopeToggle() {
    const pill = document.createElement('button');
    pill.id = 'scopeToggle';
    pill.className = 'scope-toggle';
    pill.title = 'Edit scope: core week vs this week only';
    pill.innerHTML = `<span class="scope-text">🔁 Every week</span>`;
    pill.addEventListener('click', () => setEditScope(editScope === 'template' ? 'week' : 'template'));

    let container = document.querySelector('.floating-controls');
    if (!container) {
        container = document.createElement('div');
        container.className = 'floating-controls';
        document.body.appendChild(container);
    }
    container.appendChild(pill);
}

function setEditScope(scope) {
    editScope = scope;
    const pill = document.getElementById('scopeToggle');
    if (pill) {
        pill.classList.toggle('week-scope', scope === 'week');
        pill.querySelector('.scope-text').textContent = scope === 'week' ? '📅 This week' : '🔁 Every week';
    }
    // Keep the picker's segmented control in sync if it's open
    document.querySelectorAll('.picker-scope-btn').forEach(b => {
        b.classList.toggle('selected', b.dataset.scope === scope);
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Boot: settings → project the model into the DOM → UI chrome
loadGlobalSettings();
renderWeek();
initializeFlaps();

// Create editing UI
createEditToggle();
createScopeToggle();
createActivityPicker();
createSettingsPanel();

// Default Focus Mode ON
toggleFocusMode(true);

function loadGlobalSettings() {
    const shuttersSaved = getSetting('sleepShuttersEnabled', true);
    sleepShuttersEnabled = shuttersSaved;

    const themeSaved = getSetting('activeTheme', 'refined-midnight');
    applyTheme(themeSaved);

    // Keep global variables in sync with today's values
    const todayDow = (new Date()).getDay();
    const hoursToday = getSleepHoursFor(todayDow);
    WAKEUP_HOUR = hoursToday.wakeupHour;
    SLEEP_HOUR = hoursToday.sleepHour;
}

// Initial calculation updates based on settings
applyWorkScheduleLines();
highlightToday();
highlightCurrentTime();
updateFlapsVisibility();

// Heartbeat interval: Consolidate all background updates into one loop
// Main heartbeat loop
// Optimized for CPU: Only runs updates when the minute changes or for initial load
let lastMinute = -1;

function runUpdates() {
    const now = new Date();
    const currentMinute = now.getMinutes();

    // Check if minute has changed
    if (currentMinute !== lastMinute) {
        lastMinute = currentMinute;

        // Check notifications if enabled
        checkNotifications();

        // Run all updates
        requestAnimationFrame(() => {
            highlightCurrentTime();
            updateHeaderClocks();
            highlightToday();
            updateFlapsVisibility();
            applyWorkScheduleLines();
        });
    }
}

// Scroll active day into view
function scrollToToday() {
    const tableWrapper = document.querySelector('.table-wrapper');
    const todayHeader = document.querySelector('.today-header');

    if (tableWrapper && todayHeader) {
        // Calculate position relative to the scrolling container
        // We want to center it or at least make it visible
        // The first two columns are sticky (Time + Rituals = 70 + 100 = 170px)
        const stickyOffset = 170;

        const headerRect = todayHeader.getBoundingClientRect();
        const wrapperRect = tableWrapper.getBoundingClientRect();

        // Current scroll position
        const currentScroll = tableWrapper.scrollLeft;

        // Calculate where the element is relative to the *content* start
        //offsetLeft gives distance from the parent table left edge
        const elementLeft = todayHeader.offsetLeft;

        // We want this element to be at 'stickyOffset' pixels from the left of the view
        const targetScroll = elementLeft - stickyOffset;

        tableWrapper.scrollTo({
            left: Math.max(0, targetScroll),
            behavior: 'smooth'
        });
    }
}

// Debounce resize to keep today visible
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (window.innerWidth < 1000) scrollToToday();
    }, 200);
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        applyWorkScheduleLines();
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('SW registered');

                // Keep checking for updates every 10 minutes
                setInterval(() => {
                    reg.update();
                    console.log('Checking for SW update...');
                }, 10 * 60 * 1000);

                // If a new worker is waiting, it means an update was found
                if (reg.waiting) {
                    window.location.reload();
                }

                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version detected and installed, reload to activate
                            window.location.reload();
                        }
                    });
                });
            })
            .catch(err => console.log('SW failed', err));

        // Listen for controller change (meaning new stored version activated)
        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    });
}

// Initial run
runUpdates();

// Helper to ensure URL begins with http/https
function ensureAbsoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    return 'https://' + url;
}

// Global click listener for cells outside of edit mode
document.addEventListener('click', (e) => {
    if (isEditMode) return;

    // Check if clicked element or its parent is a cell
    const cell = e.target.closest('td');
    if (!cell) return;

    // 1. Explicit data-url attribute
    if (cell.dataset.url) {
        window.location.href = ensureAbsoluteUrl(cell.dataset.url);
        return;
    }

    // 2. Fallback: Paint activity default to paint_ideas.html
    if (cell.classList.contains('activity-paint')) {
        window.location.href = 'paint_ideas.html';
    }
});

// Poll for the minute boundary. Only minute-granularity is ever shown (no
// seconds anywhere in the UI), so polling once a second was pure overhead —
// every 4s still catches the change within a few seconds, at a quarter of
// the timer wakeups (a real, measurable battery cost on mobile).
let updateTimer = null;

function startUpdateTimer() {
    if (updateTimer) return;
    updateTimer = setInterval(runUpdates, 4000);
}

function stopUpdateTimer() {
    clearInterval(updateTimer);
    updateTimer = null;
}

// Stop all polling while the tab/PWA is backgrounded — a hidden tab has no
// visible clock to keep in sync, so there's nothing to spend battery on.
// Immediately resync once it's visible again instead of waiting for the timer.
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopUpdateTimer();
    } else {
        runUpdates();
        startUpdateTimer();
    }
});

if (!document.hidden) startUpdateTimer();

/**
 * Apply work schedule boundary lines
 */
function applyWorkScheduleLines() {
    // 1. Clear existing markers
    document.querySelectorAll('.work-start-cell, .work-end-cell, .work-schedule-row').forEach(c => {
        c.classList.remove('work-start-cell', 'work-end-cell', 'work-schedule-row');
    });

    // 2. Get settings
    const startStr = localStorage.getItem('workStart') || '09:00';
    const endStr = localStorage.getItem('workEnd') || '17:00';
    const startDecimal = timeToDecimal(startStr);
    const endDecimal = timeToDecimal(endStr);

    // Get active days from storage since input might not be in DOM yet
    const activeDays = [];
    [1, 2, 3, 4, 5, 6, 0].forEach(d => {
        const saved = localStorage.getItem(`workDay_${d}`);
        // Default to Mon-Fri if nothing saved
        if (saved === 'true' || (saved === null && d >= 1 && d <= 5)) {
            activeDays.push(d);
        }
    });

    if (activeDays.length === 0) return;

    // 3. Find target rows
    const rows = Array.from(document.querySelectorAll('tbody tr[data-time]'));
    if (rows.length === 0) return;

    const startRow = rows.find(r => parseFloat(r.dataset.time) >= startDecimal);
    const endRow = rows.find(r => parseFloat(r.dataset.time) >= endDecimal);

    // 4. Helper for column index (Mon=2 in DOM, etc.)
    const getColIndex = (day) => {
        // Table: Time(0), Rituals(1), Mon(2), Tue(3), Wed(4), Thu(5), Fri(6), Sat(7), Sun(8)
        // data-day: Sun=0, Mon=1...Sat=6
        if (day === 0) return 9; // Last column
        return day + 2;
    };

    // 5. Apply
    if (startRow) {
        // ALWAYS apply to Time (1) and Rituals (2)
        [1, 2].forEach(colIdx => {
            const cell = startRow.querySelector(`td:nth-child(${colIdx})`);
            if (cell) cell.classList.add('work-start-cell');
        });

        activeDays.forEach(day => {
            const cell = startRow.querySelector(`td:nth-child(${getColIndex(day)})`);
            if (cell) cell.classList.add('work-start-cell');
        });
    }

    if (endRow) {
        // ALWAYS apply to Time (1) and Rituals (2)
        [1, 2].forEach(colIdx => {
            const cell = endRow.querySelector(`td:nth-child(${colIdx})`);
            if (cell) cell.classList.add('work-end-cell');
        });

        activeDays.forEach(day => {
            const cell = endRow.querySelector(`td:nth-child(${getColIndex(day)})`);
            if (cell) cell.classList.add('work-end-cell');
        });
    }

    // 6. Tag all rows in range for thicker horizontal lines
    rows.forEach(row => {
        const rowTime = parseFloat(row.dataset.time);
        if (rowTime >= startDecimal && rowTime < endDecimal) {
            row.classList.add('work-schedule-row');
        }
    });
}

/**
 * Convert HH:mm to decimal (e.g. "09:30" -> 9.5)
 */
function timeToDecimal(t) {
    const [h, m] = t.split(':').map(Number);
    return h + (m / 60);
}
