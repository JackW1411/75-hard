/* 75 HARD Tracker - Pink Glassmorphism Edition */

const STORAGE_KEY = "seventyfivehard_v11"; // Version bump again

const DEFAULT_TASKS = [
  { id: "runwalk", name: "Outdoor run/walk", desc: "Get outside 🌤️", type: "boolean", enabled: true, done: false },
  { id: "gym", name: "Gym / workout", desc: "Train hard 🏋️", type: "boolean", enabled: true, done: false },
  { id: "nutrition", name: "Nutrition on plan", desc: "Clean eating 🍽️", type: "boolean", enabled: true, done: false },
  { id: "no_alc", name: "No alcohol", desc: "Zero tolerance 🥤", type: "boolean", enabled: true, done: false },
  { id: "reading", name: "Reading", desc: "10 pages 📚", type: "range", target: 10, unit: "pages", value: 0, enabled: true, done: false },
  { id: "jackykiss", name: "Kiss Jack's ass", desc: "Don't forget 😉", type: "boolean", enabled: true, done: false }
];

const MESSAGES = [
  "Happy Birthday Ash!", // First message
  "Day 1 or One Day?",
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
  version: 11,
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
  const allTasksDone = state.tasks.filter(t => t.enabled).every(t => {
    if (t.type === "range") return t.value >= t.target;
    return t.done;
  });
  const waterOk = state.waterL >= state.waterGoalL - 0.05;
  return allTasksDone && waterOk && state.completedDays < 75;
}

function updateMessage() {
  const msgEl = document.getElementById("dailyMessage");
  const currentDay = getDayNumber();

  // STRICT FORCE Logic
  if (currentDay === 1) {
    msgEl.innerText = "Happy Birthday Ash!";
  } else if (currentDay === 75) {
    msgEl.innerText = "CONGRATULATIONS!!!";
  } else {
    // Standard random logic for other days
    // Use a simple daily check to keep it consistent for the whole day
    const todayDate = new Date().toDateString();

    if (state.lastCompletedDate !== todayDate) {
      // Simple hash of date string to pick a stable random message for the day
      let seed = 0;
      for (let i = 0; i < todayDate.length; i++) seed += todayDate.charCodeAt(i);
      const idx = seed % MESSAGES.length;
      msgEl.innerText = MESSAGES[idx];
    } else {
      // Fallback or keep current if valid
      if (!msgEl.innerText || msgEl.innerText === "Loading motivation...") {
        const idx = Math.floor(Math.random() * MESSAGES.length);
        msgEl.innerText = MESSAGES[idx];
      }
    }
  }
}

// --- RENDER ---

function render() {
  // Header
  const dayNum = getDayNumber();
  document.getElementById("dayNumber").textContent = String(dayNum);

  // Message (seeded by day)
  updateMessage();

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

    if (task.type === "range") {
      // --- SLIDER TASK ---
      const progress = clamp(task.value / task.target, 0, 1);
      const isDone = task.value >= task.target;
      task.done = isDone; // sync done state

      el.className = "item rangeItem";
      el.innerHTML = `
        <div class="rangeHeader">
          <div class="rangeInfo">
            <div class="itemTitle">${task.name}</div>
            <div class="itemSub">${task.desc}</div>
          </div>
          <div class="rangeValue">${task.value} / ${task.target} ${task.unit}</div>
        </div>
        <input type="range" class="slider compact" min="0" max="${task.target}" step="1" value="${task.value}">
      `;

      const slider = el.querySelector("input");
      const rangeValue = el.querySelector(".rangeValue"); // Get reference to text

      // Local paint logic for this specific slider
      const updateSliderVisuals = (val) => {
        const ratio = clamp(val / task.target, 0, 1);
        const pct = ratio * 100;
        slider.style.background = `linear-gradient(90deg, var(--accent) ${pct}%, #333 ${pct}%)`;
        rangeValue.textContent = `${val} / ${task.target} ${task.unit}`; // Update text locally
      };

      // INIT visual
      updateSliderVisuals(task.value);

      // INPUT: Update visuals only (fast)
      slider.addEventListener("input", (e) => {
        const val = Number(e.target.value);
        updateSliderVisuals(val);
      });

      // CHANGE: Commit state and re-render app (when drag stops)
      slider.addEventListener("change", (e) => {
        task.value = Number(e.target.value);
        task.done = task.value >= task.target;
        saveState();
        render(); // Full re-render to update rings/button
      });

    } else {
      // --- BOOLEAN TASK (Standard) ---
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

      el.addEventListener("click", (e) => {
        // Prevent triggering when clicking inner elements if needed, but here click bubbles fine
        if (e.target.tagName === "INPUT") return;
        task.done = !task.done;
        saveState();
        render();
      });
    }

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
  // Formula: Sum of ratios (boolean=0/1, range=val/target, water=val/goal) / Total Items
  const enabledTasks = state.tasks.filter(t => t.enabled);

  let totalRatio = 0;

  // Tasks
  enabledTasks.forEach(t => {
    if (t.type === "range") {
      totalRatio += clamp(t.value / t.target, 0, 1);
    } else {
      totalRatio += (t.done ? 1 : 0);
    }
  });

  // Water
  totalRatio += clamp(state.waterL / state.waterGoalL, 0, 1);

  const totalUnits = enabledTasks.length + 1; // +1 for water
  const dailyProgress = totalRatio / totalUnits;

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
  state.tasks.forEach(t => {
    t.done = false;
    if (t.type === "range") t.value = 0;
  });
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

  // Add Task Logic
  document.getElementById("addTaskBtn").addEventListener("click", addNewTask);

  // Toggle slider inputs visibility
  const typeSelect = document.getElementById("newTaskType");
  const rangeInputs = document.getElementById("rangeInputs");
  if (typeSelect) {
    typeSelect.addEventListener("change", (e) => {
      rangeInputs.style.display = e.target.value === "range" ? "flex" : "none";
    });
  }

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

function addNewTask() {
  const name = document.getElementById("newTaskName").value.trim();
  const desc = document.getElementById("newTaskDesc").value.trim();
  const type = document.getElementById("newTaskType").value;
  const target = Number(document.getElementById("newTaskTarget").value);
  const unit = document.getElementById("newTaskUnit").value.trim();

  if (!name) return alert("Task name required");

  const newTask = {
    id: "custom_" + Date.now(),
    name,
    desc,
    type,
    enabled: true,
    done: false
  };

  if (type === "range") {
    newTask.target = target || 10;
    newTask.unit = unit || "units";
    newTask.value = 0;
  }

  state.tasks.push(newTask);
  saveState();

  // Reset form
  document.getElementById("newTaskName").value = "";
  document.getElementById("newTaskDesc").value = "";
  renderSettings();
  render();
}

function renderSettings() {
  document.getElementById("waterGoalInput").value = state.waterGoalL;

  const toggles = document.getElementById("taskToggles");
  toggles.innerHTML = "";

  state.tasks.forEach((task, idx) => {
    const row = document.createElement("div");
    row.className = "toggleRow";

    // Check if custom task (starts with custom_)
    const isCustom = task.id.startsWith("custom_");
    const deleteBtn = isCustom
      ? `<button class="ghost deleteBtn" style="color:#ff5555; font-size:18px;">🗑</button>`
      : "";

    row.innerHTML = `
      <div style="flex:1">
        <div class="name">${task.name} <span style="font-size:10px; opacity:0.5">(${task.type})</span></div>
        <div class="desc">${task.desc}</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        ${deleteBtn}
        <button class="toggleBtn ${task.enabled ? "on" : ""}" type="button">
          ${task.enabled ? "ON" : "OFF"}
        </button>
      </div>
    `;

    row.querySelector(".toggleBtn").addEventListener("click", () => {
      task.enabled = !task.enabled;
      if (!task.enabled) task.done = false;
      saveState();
      renderSettings();
      render();
    });

    if (isCustom) {
      row.querySelector(".deleteBtn").addEventListener("click", () => {
        if (confirm("Delete this task?")) {
          state.tasks.splice(idx, 1);
          saveState();
          renderSettings();
          render();
        }
      });
    }

    toggles.appendChild(row);
  });
}

// --- INIT ---

loadState();
bindEvents();
render();