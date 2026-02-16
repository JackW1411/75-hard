// 75 Hard Survival OS
// Stores data locally (LocalStorage) per device.

const STORAGE_KEY = "survivalOS_v1";

const TASKS = [
  { id: "workout1", name: "Workout 1", note: "Any workout" },
  { id: "workout2", name: "Workout 2", note: "Second workout (can be walk)" },
  { id: "water", name: "Water", note: "3.8L / 1 gallon" },
  { id: "reading", name: "Reading", note: "10 pages (non-fiction)" },
  { id: "diet", name: "Diet", note: "No cheat meals / alcohol" },
  { id: "photo", name: "Progress photo", note: "Daily pic" },
];

const UNLOCKS = [
  { day: 7,  title: "Week 1",  msg: "You did the hardest part: starting. Keep it boring. Keep it daily. 🧱" },
  { day: 14, title: "Week 2",  msg: "Discipline > motivation. You’re proving it with receipts. 📸🔥" },
  { day: 21, title: "Week 3",  msg: "You’re becoming the person who just… does it. That’s the cheat code. 🎮" },
  { day: 28, title: "Week 4",  msg: "A month of consistency is a flex. Most people tap out here. Not you. 💪" },
  { day: 35, title: "Week 5",  msg: "Midpoint energy: calm, steady, inevitable. 🚂" },
  { day: 42, title: "Week 6",  msg: "If today feels heavy, good. You’re getting stronger under load. 🏋️" },
  { day: 49, title: "Week 7",  msg: "You’re stacking wins on purpose. That’s rare. ✨" },
  { day: 56, title: "Week 8",  msg: "This is identity now. Strong, consistent, focused. 🧠" },
  { day: 63, title: "Week 9",  msg: "You’re in the final stretch. Keep it simple. Keep it daily. ✅" },
  { day: 70, title: "Week 10", msg: "Almost there. Don’t negotiate with your goals. 🗿" },
  { day: 75, title: "Day 75",  msg: "Hard things build strong girls. Europe unlocked. ✈️🏆" },
];

const els = {
  todayChip: document.getElementById("todayChip"),
  dateLabel: document.getElementById("dateLabel"),
  checklist: document.getElementById("checklist"),
  completeDayBtn: document.getElementById("completeDayBtn"),
  undoCompleteBtn: document.getElementById("undoCompleteBtn"),
  resetTodayBtn: document.getElementById("resetTodayBtn"),

  dayNumber: document.getElementById("dayNumber"),
  streak: document.getElementById("streak"),
  percent: document.getElementById("percent"),
  barFill: document.getElementById("barFill"),
  statusLine: document.getElementById("statusLine"),

  unlocks: document.getElementById("unlocks"),

  countdown: document.getElementById("countdown"),
  tripDateLabel: document.getElementById("tripDateLabel"),
  editTripBtn: document.getElementById("editTripBtn"),
  tripDialog: document.getElementById("tripDialog"),
  tripDateInput: document.getElementById("tripDateInput"),

  eggDialog: document.getElementById("eggDialog"),
  title: document.getElementById("title"),
};

function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prettyDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday:"long", year:"numeric", month:"short", day:"numeric" });
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      startDate: isoDate(new Date()), // when she first uses it
      completedDays: [],              // ["YYYY-MM-DD", ...]
      dailyChecks: {},                // { "YYYY-MM-DD": {taskId: true/false} }
      tripDate: null,                 // "YYYY-MM-DD"
      lastSeenDate: null,
      streak: 0,
      bestStreak: 0,
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return { ...loadStateDefaults(), ...parsed };
  } catch {
    return loadStateDefaults();
  }
}

function loadStateDefaults() {
  return {
    startDate: isoDate(new Date()),
    completedDays: [],
    dailyChecks: {},
    tripDate: null,
    lastSeenDate: null,
    streak: 0,
    bestStreak: 0,
  };
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getOrInitTodayChecks(state, dateStr) {
  if (!state.dailyChecks[dateStr]) {
    state.dailyChecks[dateStr] = {};
    for (const t of TASKS) state.dailyChecks[dateStr][t.id] = false;
  } else {
    // ensure new tasks get added if list changes
    for (const t of TASKS) {
      if (typeof state.dailyChecks[dateStr][t.id] !== "boolean") {
        state.dailyChecks[dateStr][t.id] = false;
      }
    }
  }
  return state.dailyChecks[dateStr];
}

function allChecked(checks) {
  return TASKS.every(t => checks[t.id] === true);
}

function computeDayNumber(state, todayStr) {
  // Day number based on startDate, clamped 1..75
  const start = new Date(state.startDate + "T00:00:00");
  const today = new Date(todayStr + "T00:00:00");
  const diffDays = Math.floor((today - start) / (1000*60*60*24));
  return Math.min(75, Math.max(1, diffDays + 1));
}

function computePercent(state, todayStr) {
  // percent based on completedDays count (unique), clamped
  const unique = new Set(state.completedDays);
  const done = Math.min(75, unique.size);
  const pct = Math.round((done / 75) * 100);
  return { done, pct };
}

function renderChecklist(state, todayStr) {
  const checks = getOrInitTodayChecks(state, todayStr);
  els.checklist.innerHTML = "";

  TASKS.forEach(task => {
    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    left.className = "itemLeft";

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "itemName";
    name.textContent = task.name;

    const note = document.createElement("div");
    note.className = "itemNote";
    note.textContent = task.note;

    info.appendChild(name);
    info.appendChild(note);
    left.appendChild(info);

    const toggle = document.createElement("div");
    toggle.className = "toggle";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!checks[task.id];
    cb.addEventListener("change", () => {
      checks[task.id] = cb.checked;
      state.dailyChecks[todayStr] = checks;
      saveState(state);
      renderTop(state, todayStr);
      renderUnlocks(state);
    });

    toggle.appendChild(cb);

    row.appendChild(left);
    row.appendChild(toggle);

    els.checklist.appendChild(row);
  });
}

function renderTop(state, todayStr) {
  els.dateLabel.textContent = prettyDate(new Date(todayStr + "T00:00:00"));
  els.todayChip.textContent = `Today: ${todayStr}`;

  const dayNum = computeDayNumber(state, todayStr);
  els.dayNumber.textContent = String(dayNum);

  const { done, pct } = computePercent(state, todayStr);
  els.percent.textContent = String(pct);
  els.barFill.style.width = `${pct}%`;

  els.streak.textContent = String(state.streak);

  const checks = getOrInitTodayChecks(state, todayStr);
  const doneToday = state.completedDays.includes(todayStr);
  const ready = allChecked(checks);

  if (doneToday) {
    els.statusLine.textContent = "Today is completed ✅ Streak protected 🔥";
  } else if (ready) {
    els.statusLine.textContent = "All tasks checked. Hit “Complete Day” ✅";
  } else {
    els.statusLine.textContent = `Complete today’s tasks to keep the streak alive. (${done}/75 done)`;
  }

  // Enable/disable buttons
  els.completeDayBtn.disabled = doneToday || !ready;
  els.undoCompleteBtn.disabled = !doneToday;
}

function updateStreakOnCompletion(state, todayStr) {
  // streak increments only if yesterday was completed or this is first completion day
  const today = new Date(todayStr + "T00:00:00");
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yStr = isoDate(yesterday);

  const hadYesterday = state.completedDays.includes(yStr);

  if (state.completedDays.length === 0) {
    state.streak = 1;
  } else if (hadYesterday) {
    state.streak += 1;
  } else {
    state.streak = 1;
  }
  state.bestStreak = Math.max(state.bestStreak || 0, state.streak);
}

function renderUnlocks(state) {
  els.unlocks.innerHTML = "";
  const streak = state.streak || 0;

  UNLOCKS.forEach(u => {
    const box = document.createElement("div");
    const unlocked = streak >= u.day;
    box.className = "unlock" + (unlocked ? "" : " locked");

    const titleRow = document.createElement("div");
    titleRow.className = "unlockTitle";

    const t = document.createElement("div");
    t.textContent = `${u.title} ${unlocked ? "✅" : "🔒"}`;

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = `Streak ${u.day}`;

    titleRow.appendChild(t);
    titleRow.appendChild(badge);

    const msg = document.createElement("div");
    msg.className = "sub";
    msg.textContent = unlocked ? u.msg : "Keep going. This unlocks automatically.";

    box.appendChild(titleRow);
    box.appendChild(msg);

    els.unlocks.appendChild(box);
  });
}

function renderCountdown(state) {
  if (!state.tripDate) {
    els.countdown.textContent = "Set your date →";
    els.tripDateLabel.textContent = "Trip date: —";
    return;
  }
  const now = new Date();
  const target = new Date(state.tripDate + "T00:00:00");
  const diffMs = target - now;

  const sign = diffMs >= 0 ? 1 : -1;
  const ms = Math.abs(diffMs);

  const days = Math.floor(ms / (1000*60*60*24));
  const hours = Math.floor((ms / (1000*60*60)) % 24);
  const mins = Math.floor((ms / (1000*60)) % 60);

  const label = sign >= 0
    ? `${days}d ${hours}h ${mins}m`
    : `Departed ${days}d ${hours}h ${mins}m ago`;

  els.countdown.textContent = label;
  els.tripDateLabel.textContent = `Trip date: ${state.tripDate}`;
}

function openTripDialog(state) {
  els.tripDateInput.value = state.tripDate || "";
  els.tripDialog.showModal();
}

function setupTripDialog(state) {
  els.editTripBtn.addEventListener("click", () => openTripDialog(state));
  els.tripDialog.addEventListener("close", () => {
    // If user clicked save, dialog returns normally; read input and store if valid.
    const val = els.tripDateInput.value;
    if (val) {
      state.tripDate = val;
      saveState(state);
      renderCountdown(state);
    }
  });
}

function resetToday(state, todayStr) {
  state.dailyChecks[todayStr] = {};
  for (const t of TASKS) state.dailyChecks[todayStr][t.id] = false;

  // Note: does not touch completedDays/streak
  saveState(state);
}

function completeToday(state, todayStr) {
  const checks = getOrInitTodayChecks(state, todayStr);
  if (!allChecked(checks)) return;
  if (state.completedDays.includes(todayStr)) return;

  state.completedDays.push(todayStr);
  updateStreakOnCompletion(state, todayStr);
  saveState(state);
}

function undoComplete(state, todayStr) {
  state.completedDays = state.completedDays.filter(d => d !== todayStr);

  // Recompute streak by walking backwards from today until a gap
  // (simple + reliable)
  const set = new Set(state.completedDays);
  let streak = 0;
  let cursor = new Date(todayStr + "T00:00:00");

  while (set.has(isoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  state.streak = streak;
  saveState(state);
}

// 🎂 Easter egg
// 1) Konami code: ↑↑↓↓←→←→BA
// 2) Click the title 7 times quickly
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
let konamiPos = 0;

function showEgg() {
  els.eggDialog.showModal();
}

function setupEasterEgg() {
  window.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const expected = KONAMI[konamiPos];

    if (key === expected || e.key === expected) {
      konamiPos += 1;
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        showEgg();
      }
    } else {
      konamiPos = 0;
    }
  });

  let clicks = [];
  els.title.addEventListener("click", () => {
    const now = Date.now();
    clicks = clicks.filter(t => now - t < 1200);
    clicks.push(now);
    if (clicks.length >= 7) {
      clicks = [];
      showEgg();
    }
  });
}

function init() {
  const state = loadState();
  const todayStr = isoDate(new Date());

  // Ensure we store lastSeenDate (optional — could be used later for reminders)
  state.lastSeenDate = todayStr;
  saveState(state);

  setupTripDialog(state);
  setupEasterEgg();

  // Buttons
  els.resetTodayBtn.addEventListener("click", () => {
    resetToday(state, todayStr);
    renderChecklist(state, todayStr);
    renderTop(state, todayStr);
    renderUnlocks(state);
  });

  els.completeDayBtn.addEventListener("click", () => {
    completeToday(state, todayStr);
    renderTop(state, todayStr);
    renderUnlocks(state);
  });

  els.undoCompleteBtn.addEventListener("click", () => {
    undoComplete(state, todayStr);
    renderTop(state, todayStr);
    renderUnlocks(state);
  });

  // Initial renders
  renderChecklist(state, todayStr);
  renderTop(state, todayStr);
  renderUnlocks(state);
  renderCountdown(state);

  // Update countdown every 30 seconds
  setInterval(() => renderCountdown(state), 30_000);
}

init();