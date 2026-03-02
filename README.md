# DAY - Life Scheduler 📅

A high-performance, beautiful weekly schedule web application with real-time progress tracking, **premium animated SVG backgrounds**, a smart yellow glow system, and intelligent focus modes. Designed for maximum productivity with 60fps fluid mobile animations and local persistence.

## 🌐 Live Demo

Open `index.html` in any browser or add to your phone's homescreen for a native app-like experience.

**Current Status:** ✅ Fully functional with interactive editing, localStorage persistence, and export/import features.

## ✨ Features

### Core Functionality
- **Weekly Schedule Table** - Displays time slots from 7:30 AM to 11:00 PM across all 7 days
- **Frozen Columns** - Time and Rituals columns stay fixed while scrolling horizontally (hardware accelerated)
- **Unified Yellow Glow** - Premium golden-yellow pulsing glow for the current time, active activity, and day title
- **Current Day Highlighting** - Today's column is visually distinct with date and dynamic month progress
- **Interactive Editing** - ✏️ Click the edit button to modify any cell in your schedule
- **Persistent Storage** - All changes automatically saved to browser localStorage
- **Data Management** - Export to CSV/JSON, import backups, and reset functionality

### Interactive Editing System 🎨
- **Edit Mode Toggle** - Click the ✏️ button to enter edit mode
- **Activity Picker** - Click any cell to choose from predefined activities
- **Custom Activities** - Add your own custom activities with custom names
- **Clear Cells** - Remove activities from any time slot
- **Auto-Save** - Changes are automatically saved to localStorage
- **Settings Panel** - ⚙️ Access advanced settings and data management

### Visual Indicators & Animations 🚀
- **Animated SVG Backgrounds** - Rich, GPU-accelerated backgrounds for Gym, Work, and Arrow items
- **Continuity Arrows (↑)** - Automatically detected upward-drifting animations for continued tasks
- **Adaptive Progress Bars** - Colors shift dynamically: Cyan → **Yellow (>50%)** → **Orange (>75%)** → **Red (>90%)**
- **Past Time Fading** - Past slots are faded by 75% (opacity 0.25) to prioritize the "Now"
- **Expanded Animation Window** - Highlighting and animations active for a ±2 hour window around current time
- **Workday Boundaries** - 3x thicker horizontal dividers for the 9 AM - 5 PM work window
- **Live Time Display** - Shows real-time precision clock in the currently active time cell

### Sleep/Wake Flap System
- **Cell Flaps** - All cells are covered by dark "flaps" during sleep hours (11 PM - 7:30 AM)
- **Tap & Hold to Peek** - During sleep hours, tap and hold anywhere to reveal the schedule
- **Auto Wake/Sleep** - Flaps automatically open at wake time and close at sleep time
- **zZz Animation** - Subtle sleep animation in headers during sleep hours

### Settings Panel ⚙️
- **Add Time Slots** - Dynamically add new time slots to your schedule
- **Export to CSV** - Download your schedule as a spreadsheet-compatible CSV file
- **Backup/Import** - Save and restore your schedule as JSON files
- **Reset All** - Clear all data and return to default schedule
- **Wake/Sleep Configuration** - Customize your wake and sleep times (coming soon)

### Mobile Support
- **PWA Ready** - Add to homescreen on iOS/Android for app-like experience
- **Custom Icon** - PNG icon displays when bookmarked to homescreen
- **Zoom Disabled** - Prevents accidental zoom gestures
- **Safe Area Support** - Respects notches on modern phones
- **Touch Optimized** - Disabled hover effects on touch devices

## 🎨 Design System

### Color Palette
| Background | Dark Navy | `#1a1a2e` |
| Table Background | Deep Blue | `#16213e` |
| **Active Highlight** | **Golden Yellow** | `#ffcc00` |
| Paint Activity | Yellow | `#ffe66d` |
| GYM Activity | Red | `#ff4757` |
| Work | Teal | `#4ecdc4` |
| Meal | Mint | `#95e1d3` |
| Sleep | Purple | `#a29bfe` |
| Meditate | Pink | `#fd79a8` |
| Water | Blue | `#74b9ff` |

### Activity Classes
| Class | Primary Activity | Notes |
|-------|------------------|-------|
| `.activity-paint` | Paint | Golden pulsing glow |
| `.activity-gym` | Gym, Workout | Red pulsing glow + SVG animation |
| `.activity-work` | Work, Office | Hardware-themed SVG animation |
| `.activity-meal` | Meal, Food Prep, Dinner | Mint theme |
| `.activity-sleep` | Sleep | Purple theme |
| `.activity-meditate` | Meditate | Pink theme |
| `.activity-water` | Water | Blue theme |
| `.activity-commute` | Commute, Bus, Car | Yellow theme |
| `.activity-hike` | Hike | Green theme + SVG animation |
| `.activity-clean` | Clean | Cyan theme |
| `.activity-duar` | Duar | Premium custom animation |
| `.activity-arrow` | ↑ (Continuity) | Upward drifting SVG animation |

## 🏗️ File Structure

```
lifeScheduler/
├── index.html           # Main HTML structure and schedule table
├── style.css            # All styles, animations, and responsive design
├── script.js            # Dynamic highlighting, flaps, and live updates
├── apple-touch-icon.png # PWA icon for homescreen
├── Weekly Schedule.xlsx # Source schedule data (reference)
├── Mockup1.png          # Design mockup (reference)
└── README.md            # This file
```

## 🔧 Technical Details

### Multi-File Architecture
The application is organized into three main files:
- **HTML** (`index.html`) - Schedule table structure and content
- **CSS** (`style.css`) - All styling, animations, and responsive design
- **JavaScript** (`script.js`) - Dynamic behavior, highlighting, and flap system

### Key CSS Selectors
```css
.current-time-row     /* Highlighted current time row */
.today-header         /* Today's column header */
.today                /* Today's column cells */
.time-col             /* First column (Time) */
.rituals-col          /* Second column (Rituals) */
.time-progress-fill   /* Progress bar in time cell */
.day-progress-fill    /* Progress bar in day header */
.live-time            /* Live clock display */
.cell-flap            /* Sleep mode flap overlay */
.cell-flap.open       /* Opened flap state */
```

### JavaScript Functions
```javascript
highlightToday()        // Highlights current day column, adds date/month progress
highlightCurrentTime()  // Highlights current time row, adds live clock & progress
formatTime(date)        // Formats Date object to "H:MM AM/PM" string
initializeFlaps()       // Creates flap overlays for all cells
updateFlapsVisibility() // Controls flap open/close based on current time
updateHeaderClocks()    // Updates time display in headers (optimized for CPU)
toggleEditMode()        // Toggles interactive editing mode
saveSchedule()          // Saves schedule to localStorage
loadSchedule()          // Loads schedule from localStorage
exportSchedule()        // Exports schedule as JSON backup
exportCSV()             // Exports schedule as CSV file
importSchedule()        // Imports schedule from JSON backup
addNewTimeSlot()        // Adds a new time slot to the schedule
```

### Activity Definitions
The app includes 20+ predefined activities with icons and color classes:
```javascript
ACTIVITIES = {
    paint, gym, work, meal, meditate, water, sleep, commute, 
    hike, clean, wakeup, home, destim, plan, finances, 
    foodprep, office, workout, dinner, duar, custom
}
```
*Note: Some activities (Gym, Work, Hike, Duar, and Arrow) trigger premium animated SVG backgrounds.*

### localStorage Persistence
- **Auto-Save** - Schedule changes are automatically saved to browser localStorage
- **Data Structure** - Stores cell content, icons, and activity classes
- **Timestamp** - Each save includes ISO timestamp for tracking
- **Storage Key** - `'lifeScheduler'` (can be cleared via Settings → Reset)
- **Data Cleaning** - Automatically removes UI artifacts (progress bars, flaps, etc.) before saving

### Configuration Constants
```javascript
const WAKEUP_HOUR = 7.5;  // 7:30 AM - flaps open
const SLEEP_HOUR = 23;    // 11:00 PM - flaps close
```

### Update Intervals
- Live time & progress: Every **1 second**
- Day progress: Every **60 seconds**
- Flap visibility: Every **60 seconds**

## 📱 Adding to Homescreen

### iOS (Safari)
1. Open in Safari
2. Tap Share button (box with arrow)
3. Scroll and tap "Add to Home Screen"
4. Name it and tap "Add"

### Android (Chrome)
1. Open in Chrome
2. Tap menu (⋮)
3. Tap "Add to Home screen"
4. Confirm

## 🎯 How to Use

### Viewing Your Schedule
- **Current Time** - The current time slot is highlighted with a cyan glow and shows live time
- **Current Day** - Today's column has a cyan background with date and day progress percentage
- **Progress Bars** - Visual indicators show how much of the current time slot and day has elapsed
- **Sleep Mode** - During sleep hours (11 PM - 7:30 AM), cells are covered with dark flaps
- **Peek Mode** - Tap and hold anywhere during sleep hours to temporarily reveal the schedule

### Editing Your Schedule
1. **Enter Edit Mode** - Click the ✏️ (pencil) button in the bottom-right corner
2. **Select a Cell** - Click any cell in the schedule table (except Time column)
3. **Choose Activity** - A popup appears with predefined activities
4. **Apply Changes** - Click an activity to apply it, or "Clear" to empty the cell
5. **Custom Activity** - Click "Custom..." to enter your own activity name
6. **Exit Edit Mode** - Click the ✏️ button again to exit and lock the schedule

### Managing Your Data
1. **Access Settings** - Click the ⚙️ (gear) button in the bottom-right corner
2. **Add Time Slots** - Click "+ Add Time Slot" and enter a time (e.g., "3:30 PM")
3. **Export to CSV** - Download your schedule as a spreadsheet file
4. **Backup** - Save your schedule as a JSON file for safekeeping
5. **Import** - Restore a previously saved JSON backup
6. **Reset** - Clear all data and return to the default schedule

## 🛠️ Customization Guide

### Editing Schedule Cells

**Location:** `index.html` → `<tbody>` section

Each cell follows this format:
```html
<td class="[day] [activity-class]"><span class="icon">[icon]</span>[Activity Name]</td>
```

**Example:** Change Monday 9:00 AM from Paint to Reading:
```html
<!-- Before -->
<td class="monday activity-paint"><span class="icon">▣</span>Paint</td>

<!-- After -->
<td class="monday activity-work"><span class="icon">📖</span>Reading</td>
```

### Adding/Removing Time Slots

**Location:** `index.html` → `<tbody>` section

Each row represents a time slot with `data-time` attribute in 24-hour decimal format:
- `7.5` = 7:30 AM
- `12` = 12:00 PM  
- `13.5` = 1:30 PM
- `22` = 10:00 PM

**Add a new time slot:**
```html
<tr data-time="15.5">
    <td class="time-col">3:30 PM</td>
    <td class="rituals-col"></td>
    <td class="monday"><!-- activity --></td>
    <td class="tuesday"><!-- activity --></td>
    <!-- ... all 7 days ... -->
</tr>
```

**Remove a time slot:** Delete the entire `<tr>...</tr>` block.

### Editing Core Tasks (Rituals Column)

**Location:** `index.html` → `<td class="rituals-col">` cells

Rituals appear in the second column and repeat daily:
```html
<td class="rituals-col activity-water"><span class="icon">◈</span>Water</td>
<td class="rituals-col activity-meditate"><span class="icon">◉</span>Meditate</td>
<td class="rituals-col activity-gym"><span class="icon">▲</span>GYM</td>
```

### Adding New Activity Types

**Step 1:** Add CSS class in `style.css`:
```css
.activity-reading {
    color: #e84393;
    /* Optional: Add glow for priority activities */
    font-weight: 700;
    box-shadow: inset 0 0 15px rgba(232, 67, 147, 0.3);
}
```

**Step 2:** Use the class in `index.html`:
```html
<td class="monday activity-reading"><span class="icon">📚</span>Reading</td>
```

### Changing Wake/Sleep Hours

**Location:** `script.js` → Top of file

```javascript
const WAKEUP_HOUR = 7.5;  // Change to desired wake time (e.g., 6 for 6:00 AM)
const SLEEP_HOUR = 23;    // Change to desired sleep time (e.g., 22 for 10:00 PM)
```

### Activity Icons Reference
| Icon | Meaning | Example Usage |
|------|---------|---------------|
| `🎨` | Creative | Paint |
| `🌙` | Rest | Sleep |
| `🧹` | Maintenance | Clean |
| `🏠` | Personal | Home Things |
| `🎧` | Focus | De-Stimulate |
| `📝` | Planning | The Plan |
| `⭐` | Priority | Custom |
| `↑` | Continuity | (Auto-detected) |
| `▲` | Fitness | Gym (Legacy Ref) |

### Changing Animation Speed
All animations use CSS `animation` property in `style.css`:
```css
animation: animationName 5s ease-in-out infinite; /* Slower */
animation: animationName 2s ease-in-out infinite; /* Faster */
```

## 🤖 AI Agent Notes

### Understanding the Codebase
- This is a **multi-file** web application (HTML + CSS + JS)
- No build process, frameworks, or external dependencies
- Table data is **static HTML** (not dynamically generated from data source)
- PWA icon is `apple-touch-icon.png` (external file)
- **localStorage** is used for persistence (key: `'lifeScheduler'`)
- Interactive editing system with activity picker UI
- Comprehensive data export/import system (CSV + JSON)

### Architecture Overview
```
┌─────────────────────────────────────────┐
│         index.html (Structure)          │
│  - Schedule table with data-time attrs  │
│  - Day headers with data-day attrs      │
│  - Static HTML cells (modified by JS)   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         style.css (Presentation)        │
│  - Activity color classes               │
│  - Flap animations (rotateX)            │
│  - Progress bar styles                  │
│  - Edit mode UI styles                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         script.js (Behavior)            │
│  - Time/day highlighting                │
│  - Flap system logic                    │
│  - Edit mode & activity picker          │
│  - localStorage persistence             │
│  - Export/import functionality          │
└─────────────────────────────────────────┘
```

### Common Modification Requests
1. **Change schedule data** → Edit `<tbody>` rows in `index.html` OR use Edit Mode in UI
2. **Adjust colors** → Modify `.activity-*` classes in `style.css`
3. **Add new activities** → Add to `ACTIVITIES` object in `script.js` + CSS class
4. **Modify animations** → Adjust `@keyframes` and `animation` properties in `style.css`
5. **Change frozen columns** → Modify `position: sticky` and `left` values in `style.css`
6. **Adjust wake/sleep hours** → Modify `WAKEUP_HOUR` and `SLEEP_HOUR` in `script.js`
7. **Add new features** → Extend `script.js` and update UI in `createSettingsPanel()`

### Key Implementation Notes
- Frozen columns use `position: sticky` with explicit `left` values and optimized `z-index`
- Progress bars use `position: absolute` with dynamic `width` and `transition` properties
- **Performance**: Deep mobile optimization via `will-change: box-shadow`, `transform: translateZ(0)`, and simplified composite layers
- **Continuous Motion**: Animated SVGs use `animateTransform` for seamless loops without triggering JS layout thrashing
- Current time detection compares `data-time` attributes to current hour as decimal
- Mobile responsiveness handled via `@media (max-width: 768px)`
- Flap system uses CSS 3D transforms (`rotateX`) for flip animation
- **Edit mode** adds `.editable` class to cells and attaches click handlers
- **Activity picker** is positioned absolutely and shown/hidden via `.visible` class
- **localStorage** saves complete schedule state including icons, text, and classes
- **Data cleaning** removes UI elements (`.cell-flap`, `.time-progress-fill`, etc.) before saving
- **Performance optimization** uses cached DOM queries, hardware acceleration, and selective updates

### Data Flow
```
User Edit → updateCell() → saveSchedule() → localStorage
                                                ↓
Page Load → loadSchedule() ← localStorage ← JSON.parse()
                ↓
         Apply to DOM
```

### Testing Checklist
- [ ] Current time highlighting works correctly
- [ ] Day progress percentage updates
- [ ] Flaps open/close at wake/sleep times
- [ ] Edit mode toggles properly
- [ ] Activity picker appears and functions
- [ ] Changes persist after page reload
- [ ] CSV export generates valid file
- [ ] JSON backup/import works
- [ ] Mobile responsiveness (frozen columns, touch)
- [ ] Performance (no excessive CPU usage)

---

**Made with ❤️ for productivity and focus**

**Version:** 3.0 (Performance & Aero Edition)  
**Last Updated:** March 2026
