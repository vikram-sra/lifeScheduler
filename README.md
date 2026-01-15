# Life Scheduler 📅

A beautiful, mobile-friendly weekly schedule web application with real-time progress tracking and animated visual indicators.

## 🌐 Live Demo

Open `index.html` in any browser or add to your phone's homescreen for a native app-like experience.

## ✨ Features

### Core Functionality
- **Weekly Schedule Table** - Displays time slots from 7:30 AM to 11:00 PM across all 7 days
- **Frozen Columns** - Time and Rituals columns stay fixed while scrolling horizontally
- **Current Time Highlighting** - Automatically highlights the current time slot row
- **Current Day Highlighting** - Today's column is visually distinct with date and month progress

### Visual Indicators
- **Live Time Display** - Shows real-time clock (updates every second) in the current time cell
- **Time Progress Bar** - Horizontal fill showing how much of the current time slot has elapsed
- **Month Progress Bar** - Shows percentage of current month completed in the day header
- **Animated Glow Effects** - Special highlighting for priority activities:
  - 🟡 **Paint** - Yellow glow (priority creative time)
  - 🔴 **GYM** - Red glow (fitness activities)

### Mobile Support
- **PWA Ready** - Add to homescreen on iOS/Android for app-like experience
- **Custom Icon** - SVG icon displays when bookmarked to homescreen
- **Zoom Disabled** - Prevents accidental zoom gestures
- **Safe Area Support** - Respects notches on modern phones
- **Touch Optimized** - Disabled hover effects on touch devices

## 🎨 Design System

### Color Palette
| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark Navy | `#1a1a2e` |
| Table Background | Deep Blue | `#16213e` |
| Accent/Highlight | Cyan | `#00d9ff` |
| Paint Activity | Yellow | `#ffe66d` |
| GYM Activity | Red | `#ff4757` |
| Work | Teal | `#4ecdc4` |
| Meal | Mint | `#95e1d3` |
| Sleep | Purple | `#a29bfe` |
| Meditate | Pink | `#fd79a8` |
| Water | Blue | `#74b9ff` |

### Activity Classes
```css
.activity-paint    /* Yellow glow - priority */
.activity-gym      /* Red glow - priority */
.activity-work     /* Teal text */
.activity-meal     /* Mint text */
.activity-sleep    /* Purple text */
.activity-meditate /* Pink text */
.activity-water    /* Blue text - bold */
.activity-commute  /* Yellow text */
.activity-hike     /* Green text */
.activity-clean    /* Cyan text */
```

## 🏗️ File Structure

```
lifeScheduler/
├── index.html          # Main application (single-file, self-contained)
├── Weekly Schedule.xlsx # Source schedule data (reference)
├── Mockup1.png         # Design mockup (reference)
└── README.md           # This file
```

## 🔧 Technical Details

### Single-File Architecture
The entire application is contained in `index.html`:
- **CSS** - Inline styles in `<style>` tag
- **JavaScript** - Inline scripts in `<script>` tag
- **Icons** - Inline SVG as data URIs (no external files needed)

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
```

### JavaScript Functions
```javascript
highlightToday()      // Highlights current day column, adds date/month progress
highlightCurrentTime() // Highlights current time row, adds live clock & progress
formatTime(date)      // Formats Date object to "H:MM AM/PM" string
```

### Update Intervals
- Live time & progress: Every **1 second**
- Day progress: Every **60 seconds**

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

## 🛠️ Customization

### Adding New Activities
1. Add a new CSS class for the activity color:
```css
.activity-newactivity {
    color: #yourcolor;
}
```

2. Add the activity to the table with the class:
```html
<td class="monday activity-newactivity"><span class="icon">●</span>New Activity</td>
```

### Modifying Time Slots
Each row has a `data-time` attribute in 24-hour decimal format:
- `7.5` = 7:30 AM
- `12` = 12:00 PM
- `13.5` = 1:30 PM

### Changing Animation Speed
All animations use CSS `animation` property. Increase duration for slower:
```css
animation: animationName 5s ease-in-out infinite; /* Slower */
animation: animationName 2s ease-in-out infinite; /* Faster */
```

## 🤖 AI Agent Notes

### Understanding the Codebase
- This is a **single-file HTML application** with inline CSS and JavaScript
- No build process, frameworks, or external dependencies
- All icons use **inline SVG data URIs** (no image files needed)
- Table data is **static HTML** (not dynamically generated from data source)

### Common Modification Requests
1. **Change schedule data** → Edit `<tbody>` rows in HTML
2. **Adjust colors** → Modify CSS variables/classes in `<style>` section
3. **Add new activities** → Add new `.activity-*` CSS class
4. **Modify animations** → Adjust `@keyframes` and `animation` properties
5. **Change frozen columns** → Modify `position: sticky` and `left` values

### Key Implementation Notes
- Frozen columns use `position: sticky` with explicit `left` values and `z-index`
- Progress bars use `position: absolute` with dynamic `width` set via JavaScript
- Current time detection compares `data-time` attributes to current hour as decimal
- Mobile responsiveness handled via `@media (max-width: 768px)`

---

**Made with ❤️ for productivity and focus**
