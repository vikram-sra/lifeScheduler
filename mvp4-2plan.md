# MVP4-2 — Feature Roadmap & Expansion Plan

Based on the potential features outlined in `PROJECT_STATUS.md` and the new data-model-first foundation established in MVP4, this plan outlines the next phase of enhancements (**MVP4-2**). 

We will implement these features while maintaining the core tenets: **zero dependencies, vanilla JavaScript, no build steps, high performance, and PWA offline capability.**

---

## 1. Cohesive Feature Breakdown

### 1a. Robust Wake/Sleep Configuration (Per-Day/Weekend-Weekday Settings)
*   **The Problem:** Current settings fields (`wakeupTime`, `sleepTime`) do not initialize their inputs with values from `localStorage` on boot. Furthermore, biological sleep schedules differ between weekdays and weekends, but the app enforces a single global wake/sleep window.
*   **The Fix:** 
    *   Bind settings inputs to reflect the values from the data model upon opening settings.
    *   Introduce **Day-Type Sleep Settings** (Weekday vs. Weekend). The settings panel will offer separate configurations for Weekdays (Mon–Fri) and Weekends (Sat–Sun).
    *   Update the sleep shutters (flaps) and sleep ribbon logic to use the day-specific hours dynamically:
        *   `getSleepHoursFor(day)`: returns the wake/sleep decimal hours depending on whether the day is weekday or weekend.

### 1b. Rhythm Templates (Multiple Schedules)
*   **The Feature:** Users can save, load, rename, and manage multiple core schedule templates (e.g., "Normal Week", "Exam Week", "Vacation / Travel").
*   **Data Model Extension:**
    *   `model.templates`: A map of template names to slot arrays (e.g., `{ 'Normal Week': Slot[], 'Exam Week': Slot[] }`).
    *   `model.activeTemplateName`: Stored string identifying the currently active template.
    *   `saveAsTemplate(name)`: Clones the current template slots into `model.templates[name]`.
    *   `loadTemplate(name)`: Overwrites the active `model.template` slots with the selected template and triggers a full redraw.
*   **UI Integration:**
    *   Add a **Rhythm Templates** section in the settings panel with:
        *   A dropdown selector to switch the active template.
        *   A text input and "Save Current as Template" button.
        *   "Delete Template" button for custom templates.

### 1c. Advanced Analytics (Week-over-Week Comparison)
*   **The Feature:** Enhance the current basic analytics overlay to show how the user's schedule changes compared to the prior week.
*   **Math & Model:**
    *   Since `weekRollup(date)` evaluates any week from overrides + template, we can run:
        *   `const currentWeek = weekRollup(today);`
        *   `const priorWeek = weekRollup(oneWeekAgo);`
    *   Calculate difference: `const diff = currentWeek.byCategory[catId] - priorWeek.byCategory[catId];`
*   **UI Integration:**
    *   Show a trend badge next to each category in the analytics modal (e.g., `+2.5h` in green-cyan or `-1.0h` in muted gray/orange).
    *   Show a summary card comparing total scheduled hours week-over-week.

### 1d. Smart Notifications & Buffers
*   **The Feature:** Let the user configure *when* they are notified before a slot change occurs (e.g., "On time", "5 minutes before", "10 minutes before").
*   **UI Integration:**
    *   In the settings panel, under Notifications, replace the toggle with a select dropdown: "Notification Timing: Disabled | On Time | 5m Before | 10m Before".
*   **Logic:**
    *   Adjust notification checking to compare current decimal hours + buffer against the upcoming slot times.

### 1e. Custom CSS Theme Switcher (Tokens Engine)
*   **The Feature:** A theme selector allowing users to personalize their schedule appearance (e.g., "Refined Midnight" (default dark), "Slate Light" (light mode), "Forest Green" (emerald accents), "Warm Sepia" (low-contrast paper)).
*   **Implementation:**
    *   Define classes in `style.css` that override color tokens on the `body` tag (e.g., `.theme-slate-light`, `.theme-forest`).
    *   Add a theme selector dropdown in the settings panel. Persist the chosen theme in `localStorage` and apply it to the `body` tag during the boot process.

---

## 2. Proposed Changes

### `data.js`
*   Initialize `model.templates` library and `model.activeTemplateName` (with "Default" template seeded).
*   Add functions `saveAsTemplate(name)`, `loadTemplate(name)`, `deleteTemplate(name)`.
*   Update `getSleepHoursFor(day)` to read day-specific wake/sleep configurations.

### `script.js`
*   **Settings Panel UI:** Update `createSettingsPanel()` to include the Rhythm Templates controls, Weekend/Weekday sleep hours, notification buffer selection, and theme switcher dropdown.
*   **Settings Initialization:** Populate settings inputs dynamically with the model's active settings on boot.
*   **Notifications:** Update the notification timing check to incorporate the chosen buffer.
*   **Theme Loading:** Apply the saved theme class to the `body` on boot.

### `render.js`
*   Update `renderWeek()` to handle custom table redraws cleanly when switching templates.
*   Apply day-specific wake/sleep hours to header styling (like the zZz headers).

### `style.css`
*   Refactor the CSS custom property definitions under theme overrides (e.g., `body.theme-slate-light { ... }`, `body.theme-forest { ... }`).
*   Include styling for the new settings controls (Rhythm Templates, theme switcher, week-over-week analytics trend badges).

---

## 3. Verification Plan

### Automated Tests
*   Run local model tests to verify template saving, switching, and deletion logic.
*   Verify day-specific sleep hour mathematical evaluation.

### Manual Verification
*   Test theme switches and ensure all styling updates instantaneously.
*   Configure a weekend wake time and verify that the sleep flaps/ribbons render appropriately for that specific day.
*   Create a custom template "Deep Work Week", modify a few cells, and switch back to "Default" to check that data persists and restores cleanly.
