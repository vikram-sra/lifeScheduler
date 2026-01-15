// Schedule configuration
const WAKEUP_HOUR = 7.5; // 7:30 AM
const SLEEP_HOUR = 23;   // 11:00 PM

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

    // Highlight header
    const headers = document.querySelectorAll('th[data-day]');
    headers.forEach(header => {
        if (parseInt(header.dataset.day) === today) {
            header.classList.add('today-header');

            // Add zzz to name and date/wake-up display with progress bar
            if (!header.querySelector('.date-display')) {
                const dayName = header.textContent;
                const zzzHtml = isSleepTime ? ' <span class="zzz-header">zzz</span>' : '';
                header.innerHTML =
                    '<div class="day-progress-fill" style="width: ' + dayProgress + '%"></div>' +
                    '<span class="header-content">' + dayName + zzzHtml + '</span>' +
                    '<span class="date-display">' + dateStr + '</span>' +
                    '<div class="header-info-line">' +
                    '<span class="month-progress">' + dayProgress + '%</span>' +
                    '<span class="header-time-display"></span>' +
                    '</div>';

                // Update time display immediately and set interval
                const updateHeaderTime = () => {
                    const timeEl = header.querySelector('.header-time-display');
                    if (timeEl) timeEl.textContent = formatTime(new Date());
                };
                updateHeaderTime();
                setInterval(updateHeaderTime, 1000);
            } else {
                // Update existing day progress
                const monthProgressText = header.querySelector('.month-progress');
                if (monthProgressText) {
                    monthProgressText.textContent = dayProgress + '%';
                }

                // Update progress bar
                const progressFill = header.querySelector('.day-progress-fill');
                if (progressFill) {
                    progressFill.style.width = dayProgress + '%';
                }

                // Update zzz visibility
                const zzzEl = header.querySelector('.zzz-header');
                if (isSleepTime && !zzzEl) {
                    const dayNameSpan = header.firstChild;
                    if (dayNameSpan) {
                        const zzzSpan = document.createElement('span');
                        zzzSpan.className = 'zzz-header';
                        zzzSpan.textContent = 'zzz';
                        dayNameSpan.after(zzzSpan);
                    }
                } else if (!isSleepTime && zzzEl) {
                    zzzEl.remove();
                }
            }
        }
    });

    // Highlight column cells (no progress bars on cells - only header has progress bar)
    const dayClasses = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayClass = dayClasses[today];

    document.querySelectorAll(`td.${todayClass}`).forEach(cell => {
        cell.classList.add('today');

        // Remove any existing cell progress bars (we only want it in the header)
        const existingProgress = cell.querySelector('.day-cell-progress');
        if (existingProgress) {
            existingProgress.remove();
        }
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

    const rows = document.querySelectorAll('tr[data-time]');
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

    // Remove previous highlight and elements only from rows that are no longer current
    document.querySelectorAll('.current-time-row').forEach(row => {
        // If this row is still the closest row, don't clean it up
        if (row === closestRow) return;

        row.classList.remove('current-time-row');

        // Restore the original time cell content when row is no longer current
        const timeCell = row.querySelector('.time-col');
        if (timeCell && timeCell.dataset.originalTime) {
            timeCell.innerHTML = timeCell.dataset.originalTime;
            delete timeCell.dataset.originalTime;
        }
    });

    // Add new highlight
    if (closestRow && closestDiff < 2) {
        closestRow.classList.add('current-time-row');

        // Add live time display
        const timeCell = closestRow.querySelector('.time-col');
        if (timeCell) {
            // Store original time if not already stored
            if (!timeCell.dataset.originalTime) {
                timeCell.dataset.originalTime = timeCell.textContent.trim();
            }

            const originalTime = timeCell.dataset.originalTime;

            // Calculate progress percentage
            const currentRowTime = parseFloat(closestRow.dataset.time);
            const slotDuration = nextRowTime - currentRowTime;
            const elapsed = currentHour - currentRowTime;
            const progress = Math.min(Math.max((elapsed / slotDuration) * 100, 0), 100);

            // Check if structure already exists
            let progressFill = timeCell.querySelector('.time-progress-fill');
            let timeTextSpan = timeCell.querySelector('.time-text');
            let liveTimeSpan = timeCell.querySelector('.live-time');

            if (!progressFill || !timeTextSpan || !liveTimeSpan) {
                // Build structure only once
                timeCell.innerHTML = '';

                progressFill = document.createElement('div');
                progressFill.className = 'time-progress-fill';
                timeCell.appendChild(progressFill);

                timeTextSpan = document.createElement('span');
                timeTextSpan.className = 'time-text';
                timeTextSpan.textContent = originalTime;
                timeCell.appendChild(timeTextSpan);

                liveTimeSpan = document.createElement('span');
                liveTimeSpan.className = 'live-time';
                timeCell.appendChild(liveTimeSpan);

                timeCell.style.position = 'relative';
            }

            // Update values (this runs every second without flashing)
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

            const time = row.querySelector('.time-col').textContent;

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

// Initialize
highlightToday();
highlightCurrentTime();
initializeFlaps();

// Update current time highlight every second for smooth live time
setInterval(highlightCurrentTime, 1000);

// Update day progress every minute
setInterval(highlightToday, 60000);

// Update flaps visibility every minute (for sleep/wake transitions)
setInterval(updateFlapsVisibility, 60000);
