const chatEl = document.getElementById("chat");
const msgEl = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const resetBtn = document.getElementById("reset");
const statusEl = document.getElementById("status");
const consentEl = document.getElementById("consent");

const commitmentsEl = document.getElementById("commitments");
const checkinBtn = document.getElementById("checkin");
const newWeekBtn = document.getElementById("newWeek");

const STORAGE_KEY = "rita_coach_state_v1";

let state = {
  consent: false,
  // conversation history (short)
  history: [],
  // lightweight profile extracted over time
  profile: {},
  // weekly commitments, max 3
  commitments: [],
  lastWeekPrompt: null
};

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") state = { ...state, ...parsed };
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
  for (const m of state.history) addBubble(m.text, m.role === "assistant" ? "rita" : "you");
}

function renderCommitments() {
  commitmentsEl.innerHTML = "";
  if (!state.commitments.length) {
    const empty = document.createElement("div");
    empty.className = "mini";
    empty.style.marginTop = "10px";
    empty.textContent = "No active commitments yet. RITA will suggest them as part of coaching.";
    commitmentsEl.appendChild(empty);
    return;
  }

  state.commitments.forEach((c, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "commit";

    const left = document.createElement("div");
    left.style.flex = "1";

    const input = document.createElement("input");
    input.type = "text";
    input.value = c.text || "";
    input.className = "input";
    input.addEventListener("input", () => {
      state.commitments[idx].text = input.value;
      save();
    });

    const small = document.createElement("div");
    small.className = "mini";
    small.style.marginTop = "6px";
    small.textContent = "Edit wording as needed.";

    left.appendChild(input);
    left.appendChild(small);

    const sel = document.createElement("select");
    ["not_started", "in_progress", "done"].forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v.replace("_", " ");
      if ((c.status || "not_started") === v) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      state.commitments[idx].status = sel.value;
      save();
    });

    const del = document.createElement("button");
    del.className = "btn secondary";
    del.type = "button";
    del.textContent = "Remove";
    del.addEventListener("click", () => {
      state.commitments.splice(idx, 1);
      save();
      renderCommitments();
    });

    wrap.appendChild(left);
    wrap.appendChild(sel);
    wrap.appendChild(del);

    commitmentsEl.appendChild(wrap);
  });
}

function updateSendEnabled() {
  sendBtn.disabled = !consentEl.checked;
  if (!consentEl.checked) setStatus("Please confirm the consent checkbox to continue.");
  if (consentEl.checked) setStatus("");
}

consentEl.addEventListener("change", () => {
  state.consent = consentEl.checked;
  save();
  updateSendEnabled();
});

async function callCoach(userText, mode = "coach") {
  const payload = {
    mode, // "coach" | "checkin" | "keep_or_reset"
    userText: userText || "",
    profile: state.profile || {},
    commitments: state.commitments || [],
    history: state.history.slice(-12) // keep short
  };

  const resp = await fetch("/.netlify/functions/rita-coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || `Request failed (${resp.status})`);
  return data;
}

async function initIfEmpty() {
  if (state.history.length) return;
  addBubble("Hi, I’m RITA. I can be your gentle coach and accountability partner as you prepare for your next chapter.\n\nTo start, when do you expect to retire, and what feels most uncertain right now?", "rita");
  state.history.push({ role: "assistant", text: chatEl.lastChild.textContent });
  save();
}

sendBtn.addEventListener("click", async () => {
  const text = (msgEl.value || "").trim();
  if (!text) return;
  if (!consentEl.checked) { updateSendEnabled(); return; }

  msgEl.value = "";
  addBubble(text, "you");
  state.history.push({ role: "user", text });
  save();

  sendBtn.disabled = true;
  setStatus("RITA is thinking…");

  try {
    const data = await callCoach(text, "coach");

    if (data.profile_update && typeof data.profile_update === "object") {
      state.profile = { ...state.profile, ...data.profile_update };
    }

    if (Array.isArray(data.commitment_suggestions) && data.commitment_suggestions.length) {
      // replace suggestions only if user currently has none, or fewer than 3
      if (!state.commitments.length) {
        state.commitments = data.commitment_suggestions.slice(0, 3).map((t) => ({
          id: crypto.randomUUID(),
          text: t,
          status: "not_started"
        }));
      }
    }

    const reply = (data.coach_message || "").trim() || "I’m here with you. Tell me a bit more.";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });
    save();

    renderCommitments();
    setStatus("Done");
  } catch (e) {
    addBubble("Something went wrong on my side. Please try again.", "rita");
    setStatus("Error");
  } finally {
    sendBtn.disabled = false;
    updateSendEnabled();
  }
});

resetBtn.addEventListener("click", () => {
  if (!confirm("Reset your RITA Coach session?")) return;
  state.history = [];
  state.profile = {};
  state.commitments = [];
  save();
  renderChat();
  renderCommitments();
  initIfEmpty();
});

checkinBtn.addEventListener("click", async () => {
  if (!consentEl.checked) { updateSendEnabled(); return; }
  if (!state.commitments.length) { setStatus("No commitments yet."); return; }

  sendBtn.disabled = true;
  setStatus("Running check-in…");

  try {
    const data = await callCoach("", "checkin");
    const reply = (data.coach_message || "").trim() || "How did this week feel for you?";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });
    save();
    setStatus("Done");
  } catch {
    setStatus("Error");
  } finally {
    sendBtn.disabled = false;
    updateSendEnabled();
  }
});

newWeekBtn.addEventListener("click", async () => {
  if (!consentEl.checked) { updateSendEnabled(); return; }

  sendBtn.disabled = true;
  setStatus("Thinking…");

  try {
    const data = await callCoach("", "keep_or_reset");
    const reply = (data.coach_message || "").trim() || "Would you like to keep, adjust, or reset your commitments?";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });

    if (data.action === "reset_commitments") state.commitments = [];
    if (Array.isArray(data.commitment_suggestions) && data.commitment_suggestions.length) {
      state.commitments = data.commitment_suggestions.slice(0, 3).map((t) => ({
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
    updateSendEnabled();
  }
});

load();
consentEl.checked = !!state.consent;
renderChat();
renderCommitments();
updateSendEnabled();
initIfEmpty();
