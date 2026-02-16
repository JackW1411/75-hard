/* 75 HARD Tracker (phone-first)
   - localStorage persistence
   - daily encouragement message (seeded by day number)
   - water slider (goal adjustable)
   - complete-day button unlocks when all enabled tasks + water goal met
   - button hue shifts green -> red as progress increases
*/

const STORAGE_KEY = "seventyfivehard_v1";

const DEFAULT_TASKS = [
  { id: "runwalk",  name: "Outdoor run/walk", desc: "Get outside for a session 🌤️", enabled: true, done: false },
  { id: "gym",      name: "Gym / workout",    desc: "Lift / class / training 🏋️", enabled: true, done: false },
  { id: "nutrition",name: "Nutrition on plan",desc: "No ‘meh’ snacks today 🍽️", enabled: true, done: false },
  { id: "no_alc",   name: "No alcohol",       desc: "Keep it clean 🥤", enabled: true, done: false },
  { id: "photo",    name: "Progress photo",   desc: "1 quick pic 📸", enabled: true, done: false },
  // optional (off by default):
  { id: "mobility", name: "Mobility / stretch", desc: "10–15 min loosening up 🧘", enabled: false, done: false },
  // reading exists but default disabled (since she’s skipping)
  { id: "reading",  name: "Read 10 pages",    desc: "Optional 📚", enabled: false, done: false }
];

const MESSAGES = [
  "Tiny steps. Brutal consistency. ✅",
  "Do it even if it’s boring. That’s the point. 🧠",
  "Win the next 30 minutes. ⏱️",
  "No negotiating today. Just execute. 🎯",
  "You don’t need motivation — you need a system. 🔁",
  "Future-you is watching. Make it easy to be proud. ✨",
  "One clean day compounds. 📈",
  "Be the person who finishes. 🏁",
  "Discipline is a flex. 💪",
  "Keep it simple: do the list. ✅",
  "You’re building trust with yourself. 🤝",
  "Hard is fine. Quitting is expensive. 💸"
];

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      version: 1,
      completedDays: 0,
      currentStreak: 0,
      bestStreak: 0,
      waterGoalL: 2.0,
      waterL: 0.0,
      tasks: structuredClone(DEFAULT_TASKS),
      history: Array.from({ length: 75 }, () => false),
      lastCompletedDate: null // YYYY-MM-DD
    };
  }
  try {
    const state = JSON.parse(raw);

    // migrate / repair
    if (!Array.isArray(state.tasks)) state.tasks = structuredClone(DEFAULT_TASKS);
    if (!Array.isArray(state.history) || state.history.length !== 75) {
      state.history = Array.from({ length: 75 }, (_, i) => !!(state.history && state.history[i]));
    }
    if (typeof state.waterGoalL !== "number") state.waterGoalL = 2.0;
    if (typeof state.waterL !== "number") state.waterL = 0.0;
    if (typeof state.completedDays !== "number") state.completedDays = 0;
    if (typeof state.currentStreak !== "number") state.currentStreak = 0;
    if (typeof state.bestStreak !== "number") state.bestStreak = 0;

    // ensure all default tasks exist (in case you add more later)
    const byId = new Map(state.tasks.map(t => [t.id, t]));
    for (const def of DEFAULT_TASKS) {
      if (!byId.has(def.id)) state.tasks.push({ ...def });
    }

    return state;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return loadState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// seeded message by day number (stable)
function seededMessage(dayNumber) {
  const idx = (dayNumber * 9301 + 49297) % 233280; // simple LCG
  const pick = idx % MESSAGES.length;
  return MESSAGES[pick];
}

function progressHue(completedDays) {
  // 0 -> green (120), 75 -> red (0)
  const t = clamp(completedDays / 75, 0, 1);
  return Math.round(120 * (1 - t));
}

function enabledTasks() {
  return state.tasks.filter(t => t.enabled);
}

function isDayCompleteReady() {
  const allTasksDone = enabledTasks().every(t => t.done);
  const waterOk = state.waterL >= state.waterGoalL - 1e-9;
  return allTasksDone && waterOk && state.completedDays < 75;
}

function renderChecklist() {
  const list = document.getElementById("checklist");
  list.innerHTML = "";

  for (const task of state.tasks) {
    if (!task.enabled) continue;

    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    left.className = "itemLeft";

    const chk = document.createElement("div");
    chk.className = "chk" + (task.done ? " on" : "");
    chk.setAttribute("aria-hidden", "true");

    const text = document.createElement("div");
    text.style.minWidth = "0";

    const title = document.createElement("div");
    title.className = "itemTitle";
    title.textContent = task.name;

    const sub = document.createElement("div");
    sub.className = "itemSub";
    sub.textContent = task.desc;

    text.appendChild(title);
    text.appendChild(sub);

    left.appendChild(chk);
    left.appendChild(text);

    const btn = document.createElement("button");
    btn.className = "toggleBtn" + (task.done ? " on" : "");
    btn.type = "button";
    btn.textContent = task.done ? "Done" : "Mark";
    btn.addEventListener("click", () => {
      task.done = !task.done;
      saveState();
      render();
    });

    row.appendChild(left);
    row.appendChild(btn);
    list.appendChild(row);
  }
}

function renderHistory() {
  document.getElementById("bestStreak").textContent = String(state.bestStreak);
  document.getElementById("currentStreak").textContent = String(state.currentStreak);

  const grid = document.getElementById("historyGrid");
  grid.innerHTML = "";
  for (let i = 0; i < 75; i++) {
    const dot = document.createElement("div");
    dot.className = "dayDot" + (state.history[i] ? " done" : "");
    dot.title = `Day ${i + 1}`;
    grid.appendChild(dot);
  }
}

function renderWater() {
  const slider = document.getElementById("waterSlider");
  slider.max = String(state.waterGoalL);
  slider.step = "0.1";
  slider.value = String(clamp(state.waterL, 0, state.waterGoalL));

  document.getElementById("waterGoalLabel").textContent = state.waterGoalL.toFixed(1);
  document.getElementById("waterGoalTick").textContent = state.waterGoalL.toFixed(1);
  document.getElementById("waterValueLabel").textContent = Number(slider.value).toFixed(1);
}

function renderHeader() {
  const dayNum = clamp(state.completedDays + 1, 1, 75);
  document.getElementById("dayNumber").textContent = String(dayNum);
  document.getElementById("completeDayNumber").textContent = String(dayNum);

  document.getElementById("completedDays").textContent = String(state.completedDays);

  const fill = document.getElementById("progressFill");
  const pct = clamp((state.completedDays / 75) * 100, 0, 100);
  fill.style.width = `${pct}%`;

  const pb = document.querySelector(".progressBar");
  pb.setAttribute("aria-valuenow", String(state.completedDays));

  const hue = progressHue(state.completedDays);
  document.documentElement.style.setProperty("--accentHue", String(hue));

  setRingProgress(state.completedDays);
  paintWaterSlider();
}

function renderMessage() {
  const dayNum = clamp(state.completedDays + 1, 1, 75);
  document.getElementById("dailyMessage").textContent = seededMessage(dayNum);
}

function renderCompleteButton() {
  const btn = document.getElementById("completeDayBtn");
  const hint = document.getElementById("completeHint");

  const ready = isDayCompleteReady();
  btn.disabled = !ready;

  if (state.completedDays >= 75) {
    btn.disabled = true;
    btn.textContent = "Finished — 75/75 🏁";
    hint.textContent = "You actually did it. Respect.";
    return;
  }

  btn.innerHTML = `Complete Day <span id="completeDayNumber">${clamp(state.completedDays + 1, 1, 75)}</span>`;

  if (ready) {
    hint.textContent = "Unlocked — send it ✅";
  } else {
    // show what's missing
    const missing = [];
    if (!enabledTasks().every(t => t.done)) missing.push("checklist");
    if (state.waterL < state.waterGoalL - 1e-9) missing.push("water");
    hint.textContent = `Finish ${missing.join(" + ")} to unlock 👇`;
  }
}

function renderSettingsToggles() {
  const wrap = document.getElementById("taskToggles");
  wrap.innerHTML = "";

  for (const task of state.tasks) {
    const row = document.createElement("div");
    row.className = "toggleRow";

    const left = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = task.name;

    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = task.desc;

    left.appendChild(name);
    left.appendChild(desc);

    const right = document.createElement("div");
    right.className = "right";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toggleBtn" + (task.enabled ? " on" : "");
    btn.textContent = task.enabled ? "On" : "Off";
    btn.addEventListener("click", () => {
      task.enabled = !task.enabled;

      // If disabling a task, also clear its done flag for cleanliness
      if (!task.enabled) task.done = false;

      saveState();
      render();
      renderSettingsToggles();
    });

    right.appendChild(btn);

    row.appendChild(left);
    row.appendChild(right);
    wrap.appendChild(row);
  }

  document.getElementById("waterGoalInput").value = state.waterGoalL.toFixed(1);
}

function maybeNewDayReset() {
  // Optional behavior: if the date has advanced since last completion, keep current day in-progress.
  // We only auto-reset tasks when a day is completed (button pressed).
  // This function exists to expand later if you want stricter daily boundaries.
}

function completeDay() {
  if (!isDayCompleteReady()) return;

  const dayIndex = state.completedDays; // 0-based
  state.history[dayIndex] = true;

  // streak logic based on dates
  const today = todayISO();
  if (state.lastCompletedDate) {
    const last = new Date(state.lastCompletedDate + "T00:00:00");
    const now = new Date(today + "T00:00:00");
    const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) state.currentStreak += 1;
    else if (diffDays === 0) {
      // same day completion shouldn't happen (but just in case)
      state.currentStreak = Math.max(state.currentStreak, 1);
    } else state.currentStreak = 1;
  } else {
    state.currentStreak = 1;
  }

  state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
  state.lastCompletedDate = today;

  state.completedDays += 1;

  // reset day items for next day
  for (const t of state.tasks) t.done = false;
  state.waterL = 0;

  saveState();
  render();
}

function openSettings() {
  const modal = document.getElementById("settingsModal");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  renderSettingsToggles();
}

function closeSettings() {
  const modal = document.getElementById("settingsModal");
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function saveSettingsFromModal() {
  const input = document.getElementById("waterGoalInput");
  let goal = Number(input.value);
  if (!Number.isFinite(goal)) goal = 2.0;
  goal = clamp(goal, 0.5, 6.0);
  state.waterGoalL = Math.round(goal * 10) / 10;

  // clamp water to new goal
  state.waterL = clamp(state.waterL, 0, state.waterGoalL);

  saveState();
  render();
  closeSettings();
}

function resetAll() {
  const ok = confirm("Reset everything? This will wipe progress.");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  render();
}

function bindEvents() {
  document.getElementById("completeDayBtn").addEventListener("click", completeDay);

  const slider = document.getElementById("waterSlider");
  slider.addEventListener("input", (e) => {
    state.waterL = Number(e.target.value);
    saveState();
    renderCompleteButton();
    renderWater();
  });

  document.getElementById("settingsBtn").addEventListener("click", openSettings);
  document.getElementById("closeSettingsBtn").addEventListener("click", closeSettings);
  document.getElementById("modalBackdrop").addEventListener("click", closeSettings);
  document.getElementById("saveSettingsBtn").addEventListener("click", saveSettingsFromModal);

  document.getElementById("resetBtn").addEventListener("click", resetAll);
}

function render() {
  maybeNewDayReset();
  renderHeader();
  renderMessage();
  renderChecklist();
  renderWater();
  renderHistory();
  renderCompleteButton();
}

// boot
let state = loadState();
bindEvents();
render();

function setRingProgress(completedDays) {
    const circle = document.getElementById("ringProgress");
    if (!circle) return;
  
    const r = 52;
    const C = 2 * Math.PI * r;
  
    const t = clamp(completedDays / 75, 0, 1);
    const filled = C * t;
    const empty = C - filled;
  
    circle.style.strokeDasharray = `${filled} ${empty}`;
  
    const pct = Math.round(t * 100);
    const pctEl = document.getElementById("circlePct");
    if (pctEl) pctEl.textContent = String(pct);
  }

  function waterFillColor(ratio) {
    // ratio 0..1 : grey -> light blue
    // Start: grey-ish (210°, low sat), End: light blue (200°, higher sat)
    const h = 210 - 10 * ratio;         // 210 -> 200
    const s = 10 + 55 * ratio;          // 10% -> 65%
    const l = 55 + 5 * ratio;           // 55% -> 60%
    return `hsl(${h} ${s}% ${l}%)`;
  }
  
  function paintWaterSlider() {
    const slider = document.getElementById("waterSlider");
    if (!slider) return;
  
    const goal = Math.max(state.waterGoalL, 0.1);
    const ratio = clamp(state.waterL / goal, 0, 1);
  
    const fill = waterFillColor(ratio);
    const track = "rgba(255,255,255,0.12)";
  
    // Fill left side using linear-gradient with a hard stop
    const pct = Math.round(ratio * 1000) / 10; // 0.1% precision
    slider.style.background = `linear-gradient(90deg, ${fill} ${pct}%, ${track} ${pct}%)`;
  }