// Schedule configuration
const WAKEUP_HOUR = 7.5; // 7:30 AM
const SLEEP_HOUR = 23;   // 11:00 PM

// Storage key for localStorage
const STORAGE_KEY = 'lifeScheduler';

// Edit mode state
let isEditMode = false;

// Activity definitions with icons and colors
const ACTIVITIES = {
    paint: { name: 'Paint', icon: '▣', class: 'activity-paint' },
    gym: { name: 'GYM', icon: '▲', class: 'activity-gym' },
    work: { name: 'Work', icon: '■', class: 'activity-work' },
    meal: { name: 'Meal', icon: '◇', class: 'activity-meal' },
    meditate: { name: 'Meditate', icon: '◉', class: 'activity-meditate' },
    water: { name: 'Water', icon: '◈', class: 'activity-water' },
    sleep: { name: 'Sleep', icon: '☆', class: 'activity-sleep' },
    commute: { name: 'Commute', icon: '→', class: 'activity-commute' },
    hike: { name: 'Hike', icon: '◆', class: 'activity-hike' },
    clean: { name: 'Clean', icon: '○', class: 'activity-clean' },
    wakeup: { name: 'Wake up', icon: '●', class: '' },
    home: { name: 'Home Things', icon: '⌂', class: '' },
    destim: { name: 'De-Stimulate', icon: '☾', class: '' },
    plan: { name: 'The Plan', icon: '☐', class: '' },
    finances: { name: 'Finances', icon: '$', class: '' },
    foodprep: { name: 'Food Prep', icon: '◇', class: 'activity-meal' },
    office: { name: 'Office', icon: '■', class: 'activity-work' },
    workout: { name: 'Home Workout', icon: '▲', class: 'activity-gym' },
    dinner: { name: 'Dinner', icon: '◇', class: 'activity-meal' },
    custom: { name: 'Custom', icon: '●', class: '' }
};

// Highlight today's column
function highlightToday() {
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentDate = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate current hour as decimal
    const currentHourDecimal = now.getHours() + now.getMinutes() / 60;

    // Calculate day progress from wakeup time (7:30 AM) to sleep time (11:00 PM)
    const awakeHours = SLEEP_HOUR - WAKEUP_HOUR; // Total awake hours in a day
    let dayProgress = 0;

    if (currentHourDecimal < WAKEUP_HOUR) {
        // Before wakeup - 0%
        dayProgress = 0;
    } else if (currentHourDecimal >= SLEEP_HOUR) {
        // After sleep time - 100%
        dayProgress = 100;
    } else {
        // During awake hours - calculate percentage
        const hoursAwake = currentHourDecimal - WAKEUP_HOUR;
        dayProgress = Math.round((hoursAwake / awakeHours) * 100);
    }

    // Calculate month progress
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthProgress = Math.round((currentDate / daysInMonth) * 100);

    // Format date
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = monthNames[currentMonth] + ' ' + currentDate;

    // Check if currently in sleep hours (for zzz animation)
    const isSleepTime = currentHourDecimal >= SLEEP_HOUR || currentHourDecimal < WAKEUP_HOUR;

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
            } else {
                // Update text values without full innerHTML replacement
                const monthProgressText = header.querySelector('.month-progress');
                if (monthProgressText) monthProgressText.textContent = dayProgress + '%';

                const progressFill = header.querySelector('.day-progress-fill');
                if (progressFill) progressFill.style.width = dayProgress + '%';

                // Handle zzz visibility toggles separately
                const contentEl = header.querySelector('.header-content');
                const existingZzz = header.querySelector('.zzz-header');
                if (isSleepTime && !existingZzz && contentEl) {
                    const zzzSpan = document.createElement('span');
                    zzzSpan.className = 'zzz-header';
                    zzzSpan.textContent = 'zzz';
                    contentEl.appendChild(zzzSpan);
                } else if (!isSleepTime && existingZzz) {
                    existingZzz.remove();
                }
            }
        } else {
            header.classList.remove('today-header');
        }
    });

    // Cache today class to avoid re-querying all cells every time
    const dayClasses = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayClass = dayClasses[today];

    if (window.lastTodayClass !== todayClass) {
        document.querySelectorAll(`.today`).forEach(cell => cell.classList.remove('today'));
        document.querySelectorAll(`td.${todayClass}`).forEach(cell => cell.classList.add('today'));
        window.lastTodayClass = todayClass;
    }
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
    const now = new Date();
    const currentHourDecimal = now.getHours() + now.getMinutes() / 60;

    // Check if currently in sleep hours
    const isSleepTime = currentHourDecimal >= SLEEP_HOUR || currentHourDecimal < WAKEUP_HOUR;

    const flaps = document.querySelectorAll('.cell-flap');
    flaps.forEach(flap => {
        if (isSleepTime) {
            // During sleep hours - close all flaps
            flap.classList.remove('open');
        } else {
            // During awake hours - open all flaps (make everything visible)
            flap.classList.add('open');
        }
    });
}

// Highlight current time row
function highlightCurrentTime() {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;

    if (!window.rowElements) window.rowElements = document.querySelectorAll('tr[data-time]');
    const rows = window.rowElements;
    let closestRow = null;
    let closestDiff = Infinity;
    let nextRowTime = null;

    // Find all row times sorted
    const rowTimes = [];
    rows.forEach(row => {
        rowTimes.push(parseFloat(row.dataset.time));
    });
    rowTimes.sort((a, b) => a - b);

    rows.forEach(row => {
        const rowTime = parseFloat(row.dataset.time);
        const diff = Math.abs(currentHour - rowTime);

        if (diff < closestDiff && currentHour >= rowTime) {
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

        const timeCell = closestRow.querySelector('.time-col');
        if (timeCell) {
            if (!timeCell.dataset.originalTime) {
                timeCell.dataset.originalTime = timeCell.textContent.trim();
            }

            const originalTime = timeCell.dataset.originalTime;
            const currentRowTime = parseFloat(closestRow.dataset.time);
            const slotDuration = nextRowTime - currentRowTime;
            const elapsed = currentHour - currentRowTime;
            const progress = Math.min(Math.max((elapsed / slotDuration) * 100, 0), 100);

            let progressFill = timeCell.querySelector('.time-progress-fill');
            let liveTimeSpan = timeCell.querySelector('.live-time');

            if (!progressFill || !liveTimeSpan) {
                timeCell.innerHTML = `<div class="time-progress-fill"></div><span class="time-text">${originalTime}</span><span class="live-time"></span>`;
                progressFill = timeCell.querySelector('.time-progress-fill');
                liveTimeSpan = timeCell.querySelector('.live-time');
                timeCell.style.position = 'relative';
            }

            progressFill.style.width = progress + '%';
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

// Initialize flaps for ALL cells - visibility controlled by current time
function initializeFlaps() {
    const tableContainer = document.querySelector('.table-wrapper');
    const rows = document.querySelectorAll('tbody tr');

    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td');
        const isLastRow = row === rows[rows.length - 1];

        cells.forEach((cell) => {
            // Skip time and rituals columns - they should always be visible
            if (cell.classList.contains('time-col') || cell.classList.contains('rituals-col')) return;

            // Skip if already has a flap
            if (cell.querySelector('.cell-flap')) return;

            const timeCell = row.querySelector('.time-col');
            const time = timeCell.dataset.originalTime || timeCell.textContent.trim();

            const flap = document.createElement('div');
            flap.className = 'cell-flap';

            // Add zzz animation to last row flaps
            if (isLastRow) {
                flap.classList.add('zzz-flap');
            }

            const timeSpan = document.createElement('span');
            timeSpan.className = 'flap-time';
            timeSpan.textContent = time;

            flap.appendChild(timeSpan);
            cell.appendChild(flap);
        });
    });

    // Initial state based on current time
    updateFlapsVisibility();

    // Mass opening logic - ONLY for sleep hours (tap and hold to peek)
    const openAll = (e) => {
        document.querySelectorAll('.cell-flap').forEach(f => f.classList.add('open'));
    };

    const closeAll = () => {
        // Only close flaps if we're in sleep hours
        // During awake hours, flaps should stay open
        const now = new Date();
        const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
        const isSleepTime = currentHourDecimal >= SLEEP_HOUR || currentHourDecimal < WAKEUP_HOUR;

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
    toggle.innerHTML = '✏️';
    toggle.title = 'Toggle Edit Mode';
    toggle.addEventListener('click', toggleEditMode);
    document.body.appendChild(toggle);
}

// Create settings panel
function createSettingsPanel() {
    const panel = document.createElement('div');
    panel.id = 'settingsPanel';
    panel.className = 'settings-panel';
    panel.innerHTML = `
        <div class="settings-header">
            <h3>⚙️ Settings</h3>
            <button class="settings-close" id="settingsClose">×</button>
        </div>
        <div class="settings-content">
            <div class="settings-section">
                <h4>Schedule Hours</h4>
                <label>Wake up: <input type="time" id="wakeupTime" value="07:30"></label>
                <label>Sleep: <input type="time" id="sleepTime" value="23:00"></label>
            </div>
            <div class="settings-section">
                <h4>Time Slots</h4>
                <button class="settings-btn" id="addTimeSlot">+ Add Time Slot</button>
            </div>
            <div class="settings-section">
                <h4>Data</h4>
                <button class="settings-btn" id="exportCSV">📊 Export CSV</button>
                <div class="btn-group">
                    <button class="settings-btn" id="exportData" title="Save backup file (JSON)">📤 Backup</button>
                    <button class="settings-btn" id="importData" title="Load backup file (JSON)">📥 Import</button>
                </div>
                <button class="settings-btn danger" id="resetData">🗑️ Reset All</button>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // Settings button (gear icon)
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'settingsToggle';
    settingsBtn.className = 'settings-toggle';
    settingsBtn.innerHTML = '⚙️';
    settingsBtn.title = 'Settings';
    settingsBtn.addEventListener('click', () => panel.classList.toggle('open'));
    document.body.appendChild(settingsBtn);

    // Close button
    document.getElementById('settingsClose').addEventListener('click', () => panel.classList.remove('open'));

    // Add time slot button
    document.getElementById('addTimeSlot').addEventListener('click', addNewTimeSlot);

    // Export CSV / JSON / Reset
    document.getElementById('exportCSV').addEventListener('click', exportCSV);
    document.getElementById('exportData').addEventListener('click', exportSchedule);
    document.getElementById('importData').addEventListener('click', importSchedule);
    document.getElementById('resetData').addEventListener('click', resetSchedule);
}

// Create activity picker popup
function createActivityPicker() {
    const picker = document.createElement('div');
    picker.id = 'activityPicker';
    picker.className = 'activity-picker';

    let html = '<div class="picker-grid">';
    for (const [key, activity] of Object.entries(ACTIVITIES)) {
        if (key === 'custom') continue; // Skip custom for now
        html += `<button class="picker-item ${activity.class}" data-activity="${key}">
            <span class="picker-icon">${activity.icon}</span>
            <span class="picker-name">${activity.name}</span>
        </button>`;
    }
    html += '</div>';
    html += '<div class="picker-actions">';
    html += '<button class="picker-clear" data-activity="clear">✕ Clear</button>';
    html += '<button class="picker-custom" data-activity="custom">✎ Custom...</button>';
    html += '</div>';

    picker.innerHTML = html;
    document.body.appendChild(picker);

    // Handle activity selection
    picker.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-activity]');
        if (!btn) return;

        const activityKey = btn.dataset.activity;
        const targetCell = picker.targetCell;

        if (activityKey === 'clear') {
            updateCell(targetCell, null);
        } else if (activityKey === 'custom') {
            const customName = prompt('Enter custom activity name:');
            if (customName) {
                updateCell(targetCell, { name: customName, icon: '●', class: '' });
            }
        } else {
            updateCell(targetCell, ACTIVITIES[activityKey]);
        }

        hideActivityPicker();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target) && !e.target.closest('td')) {
            hideActivityPicker();
        }
    });
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
    }
}

// Enable cell editing
function enableCellEditing() {
    const cells = document.querySelectorAll('tbody td:not(.time-col)');
    cells.forEach(cell => {
        cell.classList.add('editable');
        cell.addEventListener('click', handleCellClick);
    });
}

// Disable cell editing
function disableCellEditing() {
    const cells = document.querySelectorAll('tbody td.editable');
    cells.forEach(cell => {
        cell.classList.remove('editable');
        cell.removeEventListener('click', handleCellClick);
    });
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

    const rect = cell.getBoundingClientRect();
    const pickerWidth = 280;
    const pickerHeight = 320;

    // Position picker
    let left = rect.left + rect.width / 2 - pickerWidth / 2;
    let top = rect.bottom + 8;

    // Keep within viewport
    if (left < 10) left = 10;
    if (left + pickerWidth > window.innerWidth - 10) left = window.innerWidth - pickerWidth - 10;
    if (top + pickerHeight > window.innerHeight - 10) {
        top = rect.top - pickerHeight - 8;
    }

    picker.style.left = left + 'px';
    picker.style.top = top + 'px';
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

// Update cell with activity
function updateCell(cell, activity) {
    if (!cell) return;

    // Remove existing activity classes
    const classes = Array.from(cell.classList);
    classes.forEach(cls => {
        if (cls.startsWith('activity-')) cell.classList.remove(cls);
    });

    // Remove flap if exists (will be recreated)
    const flap = cell.querySelector('.cell-flap');

    if (activity === null) {
        // Clear cell
        cell.innerHTML = flap ? flap.outerHTML : '';
    } else {
        // Set new activity
        if (activity.class) cell.classList.add(activity.class);
        const flapHtml = flap ? flap.outerHTML : '';
        cell.innerHTML = `<span class="icon">${activity.icon}</span>${activity.name}${flapHtml}`;
    }

    // Save to localStorage
    saveSchedule();
}

// Save schedule to localStorage
function saveSchedule() {
    const data = {
        schedule: {},
        savedAt: new Date().toISOString()
    };

    const rows = document.querySelectorAll('tbody tr[data-time]');
    rows.forEach(row => {
        const time = row.dataset.time;
        data.schedule[time] = {};

        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
            if (index === 0) return; // Skip time column

            const dayClasses = ['time', 'rituals', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const day = dayClasses[index] || `col${index}`;

            // Get activity info from cell
            const icon = cell.querySelector('.icon')?.textContent || '';

            // Clone cell to extract clean text without hidden flap times, progress bars, or live time displays
            const clone = cell.cloneNode(true);
            const uiElements = clone.querySelectorAll('.icon, .cell-flap, .time-progress-fill, .live-time, .time-text, .day-cell-progress');
            uiElements.forEach(el => el.remove());
            const text = clone.textContent.trim();

            const activityClass = Array.from(cell.classList).find(c => c.startsWith('activity-')) || '';

            data.schedule[time][day] = {
                icon,
                text,
                class: activityClass
            };
        });
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Load schedule from localStorage
function loadSchedule() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
        const data = JSON.parse(saved);
        if (!data.schedule) return;

        for (const [time, days] of Object.entries(data.schedule)) {
            const row = document.querySelector(`tr[data-time="${time}"]`);
            if (!row) continue;

            const cells = row.querySelectorAll('td');
            const dayOrder = ['time', 'rituals', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

            cells.forEach((cell, index) => {
                if (index === 0) return; // Skip time column

                const day = dayOrder[index];
                const cellData = days[day];
                if (!cellData || (!cellData.icon && !cellData.text)) return;

                // Clear existing classes
                Array.from(cell.classList).forEach(cls => {
                    if (cls.startsWith('activity-')) cell.classList.remove(cls);
                });

                // Apply saved data
                if (cellData.class) cell.classList.add(cellData.class);

                // Preserve flap if exists
                const flap = cell.querySelector('.cell-flap');
                const flapHtml = flap ? flap.outerHTML : '';

                if (cellData.icon || cellData.text) {
                    // Clean up text from accidentally saved repetitive times (e.g. "Wake up 7:30 AM 7:30 AM")
                    let cleanText = cellData.text || '';

                    // Strip ALL trailing occurrences of time strings
                    cleanText = cleanText.replace(/(?:\s*\d{1,2}:\d{2}\s*(?:AM|PM))+$/gi, '').trim();

                    cell.innerHTML = (cellData.icon ? `<span class="icon">${cellData.icon}</span>` : '') +
                        cleanText + flapHtml;
                }
            });
        }
    } catch (e) {
        console.error('Failed to load schedule:', e);
    }
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

    // Check if time already exists
    if (document.querySelector(`tr[data-time="${timeDecimal}"]`)) {
        alert('This time slot already exists');
        return;
    }

    // Format display time
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const displayMinutes = minutes.toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayTime = `${displayHours}:${displayMinutes} ${ampm}`;

    // Create new row
    const newRow = document.createElement('tr');
    newRow.dataset.time = timeDecimal;
    newRow.innerHTML = `
        <td class="time-col">${displayTime}</td>
        <td class="rituals-col"></td>
        <td class="monday"></td>
        <td class="tuesday"></td>
        <td class="wednesday"></td>
        <td class="thursday"></td>
        <td class="friday"></td>
        <td class="saturday"></td>
        <td class="sunday"></td>
    `;

    // Find correct position
    const tbody = document.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr[data-time]'));
    let inserted = false;

    for (const row of rows) {
        if (parseFloat(row.dataset.time) > timeDecimal) {
            tbody.insertBefore(newRow, row);
            inserted = true;
            break;
        }
    }

    if (!inserted) {
        tbody.appendChild(newRow);
    }

    // Reinitialize flaps for new row
    initializeFlapsForRow(newRow);

    // If in edit mode, make cells editable
    if (isEditMode) {
        newRow.querySelectorAll('td:not(.time-col)').forEach(cell => {
            cell.classList.add('editable');
            cell.addEventListener('click', handleCellClick);
        });
    }

    // Save
    saveSchedule();
}

// Initialize flaps for a specific row
function initializeFlapsForRow(row) {
    const cells = row.querySelectorAll('td');
    cells.forEach(cell => {
        if (cell.classList.contains('time-col') || cell.classList.contains('rituals-col')) return;
        const timeCell = row.querySelector('.time-col');
        const time = timeCell.dataset.originalTime || timeCell.textContent.trim();

        const flap = document.createElement('div');
        flap.className = 'cell-flap';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'flap-time';
        timeSpan.textContent = time;

        flap.appendChild(timeSpan);
        cell.appendChild(flap);
    });
    updateFlapsVisibility();
}

// Export schedule as JSON backup
function exportSchedule() {
    const data = localStorage.getItem(STORAGE_KEY);
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

// Export schedule as CSV for spreadsheets
function exportCSV() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
        alert('No saved data to export');
        return;
    }

    try {
        const data = JSON.parse(saved);
        const schedule = data.schedule;
        const columns = ['time', 'rituals', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        // CSV Header
        let csvContent = columns.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(',') + '\n';

        // Sort times chronologically
        const times = Object.keys(schedule).sort((a, b) => parseFloat(a) - parseFloat(b));

        times.forEach(t => {
            const rowData = schedule[t];
            const line = columns.map(col => {
                const cell = rowData[col] || { icon: '', text: '' };
                const text = (cell.icon ? cell.icon + ' ' : '') + (cell.text || '');
                // Escape commas and quotes for CSV safety
                return `"${text.replace(/"/g, '""')}"`;
            }).join(',');
            csvContent += line + '\n';
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
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                location.reload();
            } catch (err) {
                alert('Invalid backup file');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Reset schedule
function resetSchedule() {
    if (confirm('Are you sure you want to reset? This will clear all saved changes.')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize
highlightToday();
highlightCurrentTime();
initializeFlaps();

// Create editing UI
createEditToggle();
createActivityPicker();
createSettingsPanel();

// Load saved schedule
loadSchedule();

// Heartbeat interval: Consolidate all background updates into one loop
setInterval(() => {
    const now = new Date();
    const seconds = now.getSeconds();

    // Every second
    highlightCurrentTime();
    updateHeaderClocks();

    // Every minute (on the 0 second mark or first run)
    if (seconds === 0 || !window.lastTickMinute) {
        highlightToday();
        updateFlapsVisibility();
        window.lastTickMinute = now.getMinutes();
    }
}, 1000);
