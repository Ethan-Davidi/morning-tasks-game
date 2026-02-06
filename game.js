const $ = (id) => document.getElementById(id);

const TASKS = [
  { id: "wash",   name: "לשטוף ידיים",       seconds: 2 * 60,  img: "img/wash_hands.png" },
  { id: "teeth",  name: "לצחצח שיניים",      seconds: 3 * 60,  img: "img/brush_teeth.png" },
  { id: "dress",  name: "להתלבש",           seconds: 4 * 60,  img: "img/get_dressed.png" },
  { id: "eat",    name: "לאכול ארוחת בוקר",  seconds: 10 * 60, img: "img/breakfast.png" },
  { id: "shoes",  name: "לנעול נעליים",      seconds: 3 * 60,  img: "img/shoes.png" },
  { id: "bag",    name: "לסדר את התיק",      seconds: 5 * 60,  img: "img/bag.png" },
];

// Round state
let roundStartTs = null;     // when the first task was started
let roundEndTs = null;       // when the last task was completed
let roundTicker = null;      // updates total timer
let countdownTicker = null;  // updates per-task countdowns

// stateById: { status, startedAt, doneAt }
const stateById = {};

function pad2(n) { return String(n).padStart(2, "0"); }

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function nowMs() { return Date.now(); }

function setMessage(text) {
  $("message").textContent = text;
}

function clearFx() {
  $("fx").innerHTML = "";
}

function fireworks() {
  clearFx();
  const fx = $("fx");
  const count = 26;

  for (let i = 0; i < count; i++) {
    const dot = document.createElement("div");
    dot.className = "dot";

    const x = 40 + Math.random() * 20;
    const y = 35 + Math.random() * 20;

    const dx = (Math.random() * 260 - 130) + "px";
    const dy = (Math.random() * 260 - 130) + "px";
    dot.style.left = x + "%";
    dot.style.top = y + "%";
    dot.style.setProperty("--dx", dx);
    dot.style.setProperty("--dy", dy);

    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];
    dot.style.background = colors[Math.floor(Math.random() * colors.length)];

    fx.appendChild(dot);
  }

  setTimeout(clearFx, 950);
}

function startRoundTimerIfNeeded() {
  if (roundTicker) return;
  roundTicker = setInterval(() => {
    if (!roundStartTs) {
      $("roundTimer").textContent = `זמן כולל: 00:00`;
      return;
    }
    const elapsedSec = Math.floor((nowMs() - roundStartTs) / 1000);
    $("roundTimer").textContent = `זמן כולל: ${formatMMSS(elapsedSec)}`;
  }, 250);
}

function startCountdownTickerIfNeeded() {
  if (countdownTicker) return;
  countdownTicker = setInterval(() => {
    // Re-render to update countdown displays (only 6 cards, cheap)
    renderGrid();
  }, 250);
}

function stopTickers() {
  if (roundTicker) clearInterval(roundTicker);
  if (countdownTicker) clearInterval(countdownTicker);
  roundTicker = null;
  countdownTicker = null;
}

function remainingSeconds(task, st) {
  if (st.status !== "running" || !st.startedAt) return task.seconds;
  const elapsed = Math.floor((nowMs() - st.startedAt) / 1000);
  const remaining = task.seconds - elapsed;
  return remaining;
}

function renderGrid() {
  const grid = $("grid");
  grid.innerHTML = "";

  for (const t of TASKS) {
    const st = stateById[t.id];

    const card = document.createElement("div");
    card.className = `task ${st.status}`;

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent =
      st.status === "ready" ? "מוכן" :
      st.status === "running" ? "סופרים לאחור..." :
      st.status === "doneGood" ? "הצלחת!" :
      "לא בזמן";

    const img = document.createElement("img");
    img.src = t.img;
    img.alt = t.name;

    const name = document.createElement("div");
    name.className = "taskName";
    name.textContent = t.name;

    // Countdown line: shows remaining time once started
    const timerLine = document.createElement("div");
    timerLine.className = "taskTimer";

    if (st.status === "running") {
      const rem = remainingSeconds(t, st);
      timerLine.textContent = rem >= 0 ? formatMMSS(rem) : "00:00";
    } else {
      // before start, show full allocated time
      timerLine.textContent = formatMMSS(t.seconds);
    }

    const sub = document.createElement("div");
    sub.className = "taskSub";
    sub.textContent = "לחיצה: התחלה / סיום";

    card.appendChild(badge);
    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(timerLine);
    card.appendChild(sub);

    card.addEventListener("click", () => onTaskClick(t));
    grid.appendChild(card);
  }
}

function onTaskClick(task) {
  const st = stateById[task.id];

  if (st.status === "doneGood" || st.status === "doneLate") return;

  // First click: start countdown
  if (st.status === "ready") {
    const ts = nowMs();
    st.status = "running";
    st.startedAt = ts;

    if (!roundStartTs) {
      roundStartTs = ts;
      startRoundTimerIfNeeded();
    }

    startCountdownTickerIfNeeded();

    setMessage(`התחלנו: ${task.name}`);
    renderGrid();
    return;
  }

  // Second click: complete task
  if (st.status === "running") {
    const ts = nowMs();
    st.doneAt = ts;

    const elapsedSec = Math.floor((ts - st.startedAt) / 1000);
    const ok = elapsedSec <= task.seconds;

    if (ok) {
      st.status = "doneGood";
      setMessage("כל הכבוד!");
      fireworks();
    } else {
      st.status = "doneLate";
      setMessage("בפעם הבאה תצליחי יותר");
    }

    renderGrid();
    checkAllDone();
  }
}

function checkAllDone() {
  const allDone = TASKS.every(t => {
    const s = stateById[t.id].status;
    return s === "doneGood" || s === "doneLate";
  });

  if (!allDone) return;

  roundEndTs = nowMs();
  stopTickers();

  const totalSec = Math.floor((roundEndTs - roundStartTs) / 1000);
  $("finalTime").textContent = `זמן כולל לסיום כל המשימות: ${formatMMSS(totalSec)}`;

  $("tasksSection").classList.add("hidden");
  $("finalSection").classList.remove("hidden");
}

function resetRound() {
  roundStartTs = null;
  roundEndTs = null;
  stopTickers();
  clearFx();
  setMessage("");
  $("roundTimer").textContent = `זמן כולל: 00:00`;

  for (const t of TASKS) {
    stateById[t.id] = {
      status: "ready",
      startedAt: null,
      doneAt: null
    };
  }

  $("finalSection").classList.add("hidden");
  $("tasksSection").classList.remove("hidden");

  renderGrid();
}

// Buttons
$("resetBtn").addEventListener("click", resetRound);
$("playAgainBtn").addEventListener("click", resetRound);

// Init
resetRound();
