const chatEl = document.getElementById("chat");
const msgEl = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const resetBtn = document.getElementById("reset");
const statusEl = document.getElementById("status");
const consentEl = document.getElementById("consent");

const commitmentsEl = document.getElementById("commitments");
const checkinBtn = document.getElementById("checkin");
const newWeekBtn = document.getElementById("newWeek");

const STORAGE_KEY = "rita_coach_state_v2";

let state = {
  consent: false,

  // Conversational memory (human-style memory, not intake form)
  memory: {
    timeline_note: "",
    themes: [],
    interests: [],
    constraints: [],
    people: []
  },

  history: [],

  weekly_momentum: {
    commitments: [],
    last_checkin: null
  }
};

/* ===============================
   Utilities
================================= */

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state = { ...state, ...parsed };
    }
  } catch {}
}

function addBubble(text, who = "rita") {
  const div = document.createElement("div");
  div.className = "bubble " + (who === "rita" ? "rita" : "you");
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function renderChat() {
  chatEl.innerHTML = "";
  for (const m of state.history) {
    addBubble(m.text, m.role === "assistant" ? "rita" : "you");
  }
}

/* ===============================
   Commitments Rendering
================================= */

function renderCommitments() {
  commitmentsEl.innerHTML = "";

  const commitments = state.weekly_momentum.commitments;

  if (!commitments.length) {
    const empty = document.createElement("div");
    empty.className = "mini";
    empty.style.marginTop = "10px";
    empty.textContent = "No active commitments yet. RITA will suggest them.";
    commitmentsEl.appendChild(empty);
    return;
  }

  commitments.forEach((c, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "commit";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "input";
    input.value = c.text || "";
    input.addEventListener("input", () => {
      state.weekly_momentum.commitments[idx].text = input.value;
      save();
    });

    const sel = document.createElement("select");
    ["not_started", "in_progress", "done"].forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v.replace("_", " ");
      if ((c.status || "not_started") === v) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.addEventListener("change", () => {
      state.weekly_momentum.commitments[idx].status = sel.value;
      save();
    });

    const del = document.createElement("button");
    del.className = "btn secondary";
    del.textContent = "Remove";
    del.type = "button";
    del.addEventListener("click", () => {
      state.weekly_momentum.commitments.splice(idx, 1);
      save();
      renderCommitments();
    });

    wrap.appendChild(input);
    wrap.appendChild(sel);
    wrap.appendChild(del);

    commitmentsEl.appendChild(wrap);
  });
}

/* ===============================
   Send / Conversation
================================= */

function updateSendEnabled() {
  sendBtn.disabled = !consentEl.checked;
  if (!consentEl.checked) {
    setStatus("Please confirm the consent checkbox to continue.");
  } else {
    setStatus("");
  }
}

consentEl.addEventListener("change", () => {
  state.consent = consentEl.checked;
  save();
  updateSendEnabled();
});

async function callCoach(userText = "", mode = "coach") {
  const payload = {
    mode,
    userText,
    memory: state.memory,
    commitments: state.weekly_momentum.commitments,
    history: state.history.slice(-12)
  };

  const resp = await fetch("/.netlify/functions/rita-coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || `Request failed (${resp.status})`);
  }

  return data;
}

sendBtn.addEventListener("click", async () => {
  const text = (msgEl.value || "").trim();
  if (!text) return;
  if (!consentEl.checked) return;

  msgEl.value = "";
  addBubble(text, "you");
  state.history.push({ role: "user", text });
  save();

  sendBtn.disabled = true;
  setStatus("RITA is thinking…");

  try {
    const data = await callCoach(text, "coach");

    if (data.memory_update && typeof data.memory_update === "object") {
      state.memory = { ...state.memory, ...data.memory_update };
    }

    if (Array.isArray(data.commitment_suggestions) && data.commitment_suggestions.length) {
      if (!state.weekly_momentum.commitments.length) {
        state.weekly_momentum.commitments = data.commitment_suggestions.slice(0, 3).map(t => ({
          id: crypto.randomUUID(),
          text: t,
          status: "not_started"
        }));
      }
    }

    const reply = data.coach_message || "Tell me a bit more.";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });

    save();
    renderCommitments();
    setStatus("Done");

  } catch {
    addBubble("Something went wrong. Please try again.", "rita");
    setStatus("Error");
  } finally {
    sendBtn.disabled = false;
  }
});

/* ===============================
   Check-In
================================= */

checkinBtn.addEventListener("click", async () => {
  if (!state.weekly_momentum.commitments.length) {
    setStatus("No commitments yet.");
    return;
  }

  sendBtn.disabled = true;
  setStatus("Running check-in…");

  try {
    const data = await callCoach("", "checkin");

    const reply = data.coach_message || "How did this week feel?";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });

    state.weekly_momentum.last_checkin = Date.now();
    save();
    setStatus("Done");

  } catch {
    setStatus("Error");
  } finally {
    sendBtn.disabled = false;
  }
});

/* ===============================
   Keep / Reset
================================= */

newWeekBtn.addEventListener("click", async () => {
  sendBtn.disabled = true;
  setStatus("Thinking…");

  try {
    const data = await callCoach("", "keep_or_reset");

    const reply = data.coach_message || "Would you like to keep or reset?";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });

    if (data.action === "reset_commitments") {
      state.weekly_momentum.commitments = [];
    }

    if (Array.isArray(data.commitment_suggestions) && data.commitment_suggestions.length) {
      state.weekly_momentum.commitments = data.commitment_suggestions.slice(0, 3).map(t => ({
        id: crypto.randomUUID(),
        text: t,
        status: "not_started"
      }));
    }

    save();
    renderCommitments();
    setStatus("Done");

  } catch {
    setStatus("Error");
  } finally {
    sendBtn.disabled = false;
  }
});

/* ===============================
   Reset Entire Session
================================= */

resetBtn.addEventListener("click", () => {
  if (!confirm("Reset your RITA Coach session?")) return;

  state.history = [];
  state.memory = {
    timeline_note: "",
    themes: [],
    interests: [],
    constraints: [],
    people: []
  };
  state.weekly_momentum = {
    commitments: [],
    last_checkin: null
  };

  save();
  renderChat();
  renderCommitments();
});

/* ===============================
   Init
================================= */

load();
renderChat();
renderCommitments();
updateSendEnabled();

if (!state.history.length) {
  const intro = "Hi, I’m RITA. I can be your coaching partner as you prepare for your next chapter.\n\nWhen do you expect to retire, and what feels most uncertain right now?";
  addBubble(intro, "rita");
  state.history.push({ role: "assistant", text: intro });
  save();
}
