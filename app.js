/* 75 HARD Tracker - Pink Glassmorphism Edition */

const STORAGE_KEY = "seventyfivehard_v2"; // Version bump

const DEFAULT_TASKS = [
  { id: "runwalk", name: "Outdoor run/walk", desc: "Get outside 🌤️", enabled: true, done: false },
  { id: "gym", name: "Gym / workout", desc: "Train hard 🏋️", enabled: true, done: false },
  { id: "nutrition", name: "Nutrition on plan", desc: "Clean eating 🍽️", enabled: true, done: false },
  { id: "no_alc", name: "No alcohol", desc: "Zero tolerance 🥤", enabled: true, done: false },
  { id: "photo", name: "Progress photo", desc: "Daily snap 📸", enabled: true, done: false }
];

const MESSAGES = [
  "NO EXCUSES.",
  "DO THE WORK.",
  "STAY HARD.",
  "DISCIPLINE EQUALS FREEDOM.",
  "EMBRACE THE SUCK.",
  "ONE MORE DAY.",
  "YOU VS YOU.",
  "DON'T QUIT.",
  "BE UNCOMMON.",
  "LEVEL UP."
];

let state = {
  version: 2,
  completedDays: 0,
  currentStreak: 0,
  bestStreak: 0,
  waterGoalL: 2.0,
  waterL: 0.0,
  tasks: structuredClone(DEFAULT_TASKS),
  history: Array.from({ length: 75 }, () => false),
  lastCompletedDate: null
};

// --- DATA ---

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    state = { ...state, ...saved };

    // Ensure tasks structure is correct
    if (!state.tasks || state.tasks.length === 0) {
      state.tasks = structuredClone(DEFAULT_TASKS);
    }
  } catch (e) {
    console.error("State load failed", e);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayISO() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

// --- LOGIC ---

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getDayNumber() {
  return clamp(state.completedDays + 1, 1, 75);
}

function isDayCompleteReady() {
  const allTasksDone = state.tasks.filter(t => t.enabled).every(t => t.done);
  const waterOk = state.waterL >= state.waterGoalL - 0.05; // tiny epsilon
  return allTasksDone && waterOk && state.completedDays < 75;
}

// --- RENDER ---

function render() {
  // Header
  const dayNum = getDayNumber();
  document.getElementById("dayNumber").textContent = String(dayNum);

  // Message (seeded by day)
  const msgIdx = (dayNum + 42) % MESSAGES.length;
  document.getElementById("dailyMessage").textContent = MESSAGES[msgIdx];

  // Checklist
  renderChecklist();

  // Water
  renderWater();

  // History & Streaks
  document.getElementById("bestStreak").textContent = String(state.bestStreak);
  document.getElementById("currentStreak").textContent = String(state.currentStreak);
  renderHistoryGrid();

  // Big Button & Ring
  renderCompleteRing();
}

function renderChecklist() {
  const list = document.getElementById("checklist");
  list.innerHTML = "";

  state.tasks.forEach(task => {
    if (!task.enabled) return;

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="itemLeft">
        <div class="chk ${task.done ? "on" : ""}"></div>
        <div>
          <div class="itemTitle">${task.name}</div>
          <div class="itemSub">${task.desc}</div>
        </div>
      </div>
      <button class="toggleBtn ${task.done ? "on" : ""}" type="button">
        ${task.done ? "DONE" : "MARK"}
      </button>
    `;

    // Click anywhere on item to toggle
    el.addEventListener("click", () => {
      task.done = !task.done;
      saveState();
      render(); // re-render everything to update button state
    });

    list.appendChild(el);
  });
}

function renderWater() {
  const goal = state.waterGoalL;
  const current = state.waterL;

  document.getElementById("waterGoalLabel").textContent = goal.toFixed(1);
  document.getElementById("waterValueLabel").textContent = current.toFixed(1);

  const slider = document.getElementById("waterSlider");
  slider.max = String(goal);
  slider.value = String(current);

  // Gradient logic for slider track
  const pct = clamp(current / goal, 0, 1) * 100;
  // Pink to Dark Grey gradient
  slider.style.background = `linear-gradient(90deg, var(--accent) ${pct}%, #333 ${pct}%)`;
}

function renderHistoryGrid() {
  const grid = document.getElementById("historyGrid");
  grid.innerHTML = "";

  for (let i = 0; i < 75; i++) {
    const dot = document.createElement("div");
    dot.className = `dayDot ${state.history[i] ? "done" : ""}`;
    grid.appendChild(dot);
  }
}

function renderCompleteRing() {
  const btn = document.getElementById("completeDayBtn");
  const hint = document.getElementById("completeHint");
  const outerRing = document.getElementById("ringProgress");
  const innerRing = document.getElementById("innerRingProgress");
  const dayNumEl = document.getElementById("completeDayNumber");
  const pctEl = document.getElementById("circlePct");

  const dayNum = getDayNumber();
  dayNumEl.textContent = String(dayNum);

  // --- Outer Ring (0-75 Days) ---
  const totalProgress = state.completedDays / 75;
  const rOuter = 54;
  const cOuter = 2 * Math.PI * rOuter;
  const outerOffset = cOuter * (1 - totalProgress);

  outerRing.style.strokeDasharray = `${cOuter} ${cOuter}`;
  outerRing.style.strokeDashoffset = String(outerOffset);

  // --- Inner Ring (Daily Tasks) ---
  // Formula: Tasks Done + (Water Ratio) / (Total Tasks + 1)
  const enabledTasks = state.tasks.filter(t => t.enabled);
  const tasksDone = enabledTasks.filter(t => t.done).length;
  const waterRatio = clamp(state.waterL / state.waterGoalL, 0, 1);

  const totalUnits = enabledTasks.length + 1; // +1 for water
  const dailyProgress = (tasksDone + waterRatio) / totalUnits;

  const rInner = 46;
  const cInner = 2 * Math.PI * rInner;
  const innerOffset = cInner * (1 - dailyProgress);

  if (innerRing) {
    innerRing.style.strokeDasharray = `${cInner} ${cInner}`;
    innerRing.style.strokeDashoffset = String(innerOffset);
  }

  pctEl.textContent = Math.round(totalProgress * 100);

  const ready = isDayCompleteReady();

  if (state.completedDays >= 75) {
    btn.disabled = true;
    hint.textContent = "CHALLENGE COMPLETE. YOU ARE A BEAST.";
    return;
  }

  btn.disabled = !ready;
  if (ready) {
    btn.classList.add("ready");
    hint.textContent = "READY TO COMPLETE";
  } else {
    btn.classList.remove("ready");
    hint.textContent = "COMPLETE TASKS TO UNLOCK";
  }
}

// --- ACTIONS ---

function completeDay() {
  if (!isDayCompleteReady()) return;

  const idx = state.completedDays;
  state.history[idx] = true;
  state.completedDays++;

  // Streak logic
  const today = todayISO();
  if (state.lastCompletedDate) {
    const last = new Date(state.lastCompletedDate);
    const now = new Date(today);
    const diff = (now - last) / (1000 * 60 * 60 * 24);

    if (Math.round(diff) === 1) {
      state.currentStreak++;
    } else if (Math.round(diff) > 1) {
      state.currentStreak = 1;
    }
    // If 0 (same day), do nothing (shouldn't happen with logic but safe)
  } else {
    state.currentStreak = 1;
  }

  state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
  state.lastCompletedDate = today;

  // Reset daily
  state.tasks.forEach(t => t.done = false);
  state.waterL = 0;

  saveState();
  render();
}

function resetAll() {
  if (confirm("Reset all matching progress?")) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

// --- EVENTS ---

function bindEvents() {
  // Water Slider
  const slider = document.getElementById("waterSlider");
  slider.addEventListener("input", (e) => {
    state.waterL = Number(e.target.value);
    saveState();
    renderWater();
    renderCompleteRing(); // Re-check unlock status
  });

  // Complete Button
  document.getElementById("completeDayBtn").addEventListener("click", completeDay);

  // Settings Modal
  const modal = document.getElementById("settingsModal");
  const openBtn = document.getElementById("settingsBtn");
  const closeBtn = document.getElementById("closeSettingsBtn");
  const saveBtn = document.getElementById("saveSettingsBtn");

  openBtn.addEventListener("click", () => {
    modal.classList.add("show");
    renderSettings();
  });

  const close = () => modal.classList.remove("show");
  closeBtn.addEventListener("click", close);
  document.getElementById("modalBackdrop").addEventListener("click", close);

  saveBtn.addEventListener("click", () => {
    // Water Goal
    const inp = document.getElementById("waterGoalInput");
    state.waterGoalL = clamp(Number(inp.value) || 2.0, 0.5, 5.0);
    state.waterL = clamp(state.waterL, 0, state.waterGoalL);
    saveState();
    render();
    close();
  });

  // Reset
  document.getElementById("resetBtn").addEventListener("click", resetAll);
}

function renderSettings() {
  document.getElementById("waterGoalInput").value = state.waterGoalL;

  const toggles = document.getElementById("taskToggles");
  toggles.innerHTML = "";

  state.tasks.forEach(task => {
    const row = document.createElement("div");
    row.className = "toggleRow";
    row.innerHTML = `
      <div>
        <div class="name">${task.name}</div>
        <div class="desc">${task.desc}</div>
      </div>
      <button class="toggleBtn ${task.enabled ? "on" : ""}" type="button">
        ${task.enabled ? "ON" : "OFF"}
      </button>
    `;

    row.querySelector("button").addEventListener("click", () => {
      task.enabled = !task.enabled;
      if (!task.enabled) task.done = false;
      saveState();
      renderSettings();
      render();
    });

    toggles.appendChild(row);
  });
}

// --- INIT ---

loadState();
bindEvents();
render();