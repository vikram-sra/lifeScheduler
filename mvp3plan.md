# MVP3 Analysis & Onboarding Plan

## 📊 MVP3 Current State Summary
**DAY - Life Scheduler (MVP3)** is a highly polished, production-ready, no-dependency scheduling application. It emphasizes aesthetic performance (60fps SVG animations, glassmorphism, sleep/wake flaps) and user autonomy through purely client-side local storage.
- **Strengths:** Premium visual feedback (unified yellow glow, progress bars), drag-and-drop/interactive editing, zero-latency caching, offline capability (PWA), lightweight architecture (~2.3k loc HTML/CSS/JS).
- **Core Loop:** Users view their day with auto-highlighting, edit cells by tapping to bring up the activity picker, and all changes automatically commit to `localStorage`.

## 💡 Suggestions for Future Development
1. **Notifications & Reminders:** Implement Web Notifications API to gently alert the user 5 minutes before shifting to a major block (e.g., "Time to wind down for Sleep").
2. **Weekly Analytics:** A simple dashboard calculating time allocated per activity class (e.g., "You spent 15 hours in Deep Work this week").
3. **Dynamic Sleep/Wake:** Separate weekend vs. weekday wake/sleep schedules since biological clocks often fluctuate across the week.
4. **Onboarding Flow (See below)**

---

## 🚀 Onboarding Flow Plan (Local Data Storage)

### 1. The Onboarding Triggers
- When the application initializes, `loadSchedule()` checks `localStorage` for a `userProfile` object.
- If missing entirely, or if `userProfile.onboardingComplete !== true`, the app displays the **Welcome Modal Overlay** (blurring the schedule behind it).

### 2. Information Collected (Step-by-Step UI)
The flow should be broken down into quick, clean, animated steps (glassmorphic cards):

*   **Step 1: Introduction & Name**
    *   *Prompt:* "Welcome to DAY. Let's set up your rhythm."
    *   *Input:* Text field for `Name`.
    *   *Action:* Saves to display on a personalized header ("Good Morning, [Name]").
*   **Step 2: Biological Rhythms (Wake & Sleep)**
    *   *Prompt:* "When do you usually wake up and go to sleep?"
    *   *Inputs:* Two time pickers (or stylized dropdowns matching the decimal time logic).
    *   *Logic:* Updates the `WAKEUP_HOUR` and `SLEEP_HOUR` variables and configures the animated sleep "flaps".
*   **Step 3: Core Work Schedule**
    *   *Prompt:* "Let's define your main work block."
    *   *Inputs:* Start time, End time, and Checklist of core working days (e.g., Mon-Fri).
    *   *Action:* Automatically fills the `.activity-work` class in the designated table cells, giving users a head-start on their schedule instead of a blank slate.
*   **Step 4: Primary Goal/Ritual**
    *   *Prompt:* "What's one daily ritual you want to prioritize?"
    *   *Inputs:* Multiple choice icon cards (🏋️ Fitness, 🎨 Creative, 📖 Study, 🧘 Mindfulness).
    *   *Action:* Injects this activity uniformly into the `rituals-col` or prominently in the evening slots.
*   **Step 5: Completion & App Initialization**
    *   *Prompt:* "Your schedule is ready."
    *   *Action:* Toggles `onboardingComplete = true` in `localStorage`. Fades out the modal. Triggers the flap-opening animation for dramatic effect, revealing the generated schedule.

### 3. Local Storage Implementation Details
Data structure to be saved alongside the existing `lifeScheduler` key:

```javascript
const userProfile = {
    name: "Vikram", // From input
    wakeTime: 7.5,
    sleepTime: 23.0,
    workDays: [1, 2, 3, 4, 5], // Mon=1
    workStart: 9.0,
    workEnd: 17.0,
    primaryRitual: "gym",
    onboardingComplete: true
};

// Saved as a separate key
localStorage.setItem('day_userProfile', JSON.stringify(userProfile));
```

### 4. Technical Integration Steps
- **Add HTML Structure:** Append an `#onboarding-modal` container to `index.html`.
- **Add CSS Styles:** Leverage existing glassmorphism and animation classes (`style.css`) to style multi-step cards.
- **Add JS Logic:** Create `onboarding.js` (or append to `script.js`) with functions `checkOnboarding()`, `nextStep()`, and `finishOnboarding()`.
- **Auto-populate Table:** Hook `finishOnboarding()` into the existing `updateCell()` functions to pre-fill the work and ritual columns before running `saveSchedule()`.
