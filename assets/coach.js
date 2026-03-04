const SUPABASE_URL = "https://wjubibjkasoattmbqurf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdWJpYmprYXNvYXR0bWJxdXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODAyMDEsImV4cCI6MjA4ODA1NjIwMX0.djzKshGnvgxqmD6PiKP5tnW0gjgKdqHyQcA_MHTCqqs";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Elements ──────────────────────────────────────────────
const chatEl       = document.getElementById("chat");
const msgEl        = document.getElementById("msg");
const sendBtn      = document.getElementById("send");
const resetBtn     = document.getElementById("reset");
const statusEl     = document.getElementById("status");
const commitsEl    = document.getElementById("commitmentsList");
const checkinBtn   = document.getElementById("checkin");
const newWeekBtn   = document.getElementById("newWeek");
const signOutBtn   = document.getElementById("signOutBtn");

// ── Tabs ──────────────────────────────────────────────────
document.querySelectorAll(".nav-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// ── State ─────────────────────────────────────────────────
let state = {
  memory: { timeline_note: "", themes: [], interests: [], constraints: [], people: [] },
  history: [],
  weekly_momentum: { commitments: [], last_checkin: null }
};

let currentUser = null;
let busy = false;

// ── Auth ──────────────────────────────────────────────────
async function initAuth() {
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    window.location.href = "/login.html";
    return;
  }
  currentUser = data.session.user;
  await loadState();
  renderChat();
  renderCommitments();
  sendBtn.disabled = false;
  if (!state.history.length) {
    const intro = "Hi, I'm RITA — your retirement coaching companion.\n\nWhat feels most uncertain or exciting about this next chapter for you?";
    addBubble(intro, "rita");
    state.history.push({ role: "assistant", text: intro });
    await saveHistory("assistant", intro);
  }
}

signOutBtn.addEventListener("click", async () => {
  await sb.auth.signOut();
  window.location.href = "/login.html";
});

// ── Persistence ───────────────────────────────────────────
async function loadState() {
  try {
    const { data } = await sb
      .from("conversation_history")
      .select("role, content")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: true });
    if (data && data.length) {
      state.history = data.map(r => ({ role: r.role, text: r.content }));
    }
    const { data: commits } = await sb
      .from("commitments")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: true });
    if (commits && commits.length) {
      state.weekly_momentum.commitments = commits.map(c => ({
        id: c.id,
        text: c.text,
        status: c.status
      }));
    }
  } catch(e) {
    console.error("Load error", e);
  }
}

async function saveHistory(role, content) {
  if (!currentUser) return;
  await sb.from("conversation_history").insert({
    user_id: currentUser.id,
    role,
    content
  });
}

async function saveCommitments(commitments) {
  if (!currentUser) return;
  await sb.from("commitments").delete().eq("user_id", currentUser.id);
  if (commitments.length) {
    await sb.from("commitments").insert(
      commitments.map(c => ({
        user_id: currentUser.id,
        text: c.text,
        status: c.status || "not_started"
      }))
    );
    const { data } = await sb
      .from("commitments")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: true });
    if (data) {
      state.weekly_momentum.commitments = data.map(c => ({
        id: c.id, text: c.text, status: c.status
      }));
    }
  } else {
    state.weekly_momentum.commitments = [];
  }
}

async function updateCommitmentStatus(id, status) {
  if (!currentUser) return;
  const { error } = await sb
    .from("commitments")
    .update({ status })
    .eq("id", id)
    .eq("user_id", currentUser.id);
  if (error) console.error("Status update error", error);
}

// ── UI Helpers ────────────────────────────────────────────
function setStatus(msg) { statusEl.textContent = msg || ""; }

function setBusy(val) {
  busy = val;
  sendBtn.disabled = val;
  checkinBtn.disabled = val;
  newWeekBtn.disabled = val;
}

function addBubble(text, who) {
  const div = document.createElement("div");
  div.className = "bubble " + (who === "rita" ? "rita" : "you");
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function renderChat() {
  chatEl.innerHTML = "";
  state.history.forEach(m => addBubble(m.text, m.role === "assistant" ? "rita" : "you"));
}

function renderCommitments() {
  commitsEl.innerHTML = "";
  const commits = state.weekly_momentum.commitments;
  if (!commits.length) {
    commitsEl.innerHTML = `<div class="empty-state">No active commitments yet.<br>RITA will suggest some during your coaching conversation.</div>`;
    return;
  }
  commits.forEach((c) => {
    const card = document.createElement("div");
    card.className = "commitment-card";
    card.innerHTML = `
      <div class="commitment-text">${c.text}</div>
      <div class="status-pills">
        <button class="pill ${c.status === 'not_started' ? 'active-not_started' : ''}" data-status="not_started" data-id="${c.id}">Not started</button>
        <button class="pill ${c.status === 'in_progress' ? 'active-in_progress' : ''}" data-status="in_progress" data-id="${c.id}">In progress</button>
        <button class="pill ${c.status === 'done' ? 'active-done' : ''}" data-status="done" data-id="${c.id}">Done</button>
      </div>`;
    commitsEl.appendChild(card);
  });

  commitsEl.querySelectorAll(".pill").forEach(pill => {
    pill.addEventListener("click", async () => {
      const id = pill.dataset.id;
      const status = pill.dataset.status;
      const commit = state.weekly_momentum.commitments.find(c => c.id === id);
      if (!commit) return;
      commit.status = status;
      await updateCommitmentStatus(id, status);
      renderCommitments();
    });
  });
}

// ── API Call ──────────────────────────────────────────────
async function callCoach(userText, mode) {
  const resp = await fetch("/.netlify/functions/rita-coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      userText,
      memory: state.memory,
      commitments: state.weekly_momentum.commitments,
      history: state.history.slice(-12)
    })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || "Request failed");
  return data;
}

// ── Send Message ──────────────────────────────────────────
sendBtn.addEventListener("click", async () => {
  if (busy) return;
  const text = (msgEl.value || "").trim();
  if (!text) return;
  msgEl.value = "";
  addBubble(text, "you");
  state.history.push({ role: "user", text });
  await saveHistory("user", text);
  setBusy(true);
  setStatus("RITA is thinking…");
  try {
    const data = await callCoach(text, "coach");
    if (data.memory_update) state.memory = { ...state.memory, ...data.memory_update };
    if (Array.isArray(data.commitment_suggestions) && data.commitment_suggestions.length) {
      await saveCommitments(data.commitment_suggestions.slice(0, 3).map(t => ({ text: t, status: "not_started" })));
    }
    const reply = data.coach_message || "Tell me more.";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });
    await saveHistory("assistant", reply);
    renderCommitments();
    setStatus("");
  } catch {
    addBubble("Something went wrong. Please try again.", "rita");
    setStatus("Error");
  } finally {
    setBusy(false);
  }
});

// ── Enter to send ─────────────────────────────────────────
msgEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!busy) sendBtn.click();
  }
});

// ── Check-In ──────────────────────────────────────────────
checkinBtn.addEventListener("click", async () => {
  if (busy) return;
  if (!state.weekly_momentum.commitments.length) { setStatus("No commitments yet."); return; }
  setBusy(true);
  setStatus("Running check-in…");
  try {
    const data = await callCoach("", "checkin");
    const reply = data.coach_message || "How did this week feel?";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });
    await saveHistory("assistant", reply);
    document.querySelector('[data-tab="chat"]').click();
    setStatus("");
  } catch { setStatus("Error"); }
  finally { setBusy(false); }
});

// ── Keep / Reset ──────────────────────────────────────────
newWeekBtn.addEventListener("click", async () => {
  if (busy) return;
  setBusy(true);
  setStatus("Thinking…");
  try {
    const data = await callCoach("", "keep_or_reset");
    const reply = data.coach_message || "Would you like to keep or reset?";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });
    await saveHistory("assistant", reply);
    if (data.action === "reset_commitments") {
      await saveCommitments([]);
    }
    if (Array.isArray(data.commitment_suggestions) && data.commitment_suggestions.length) {
      await saveCommitments(data.commitment_suggestions.slice(0, 3).map(t => ({ text: t, status: "not_started" })));
    }
    renderCommitments();
    document.querySelector('[data-tab="chat"]').click();
    setStatus("");
  } catch { setStatus("Error"); }
  finally { setBusy(false); }
});

// ── Reset Session ─────────────────────────────────────────
resetBtn.addEventListener("click", async () => {
  if (!confirm("Reset your entire RITA Coach session? This cannot be undone.")) return;
  await sb.from("conversation_history").delete().eq("user_id", currentUser.id);
  await saveCommitments([]);
  state.history = [];
  state.memory = { timeline_note: "", themes: [], interests: [], constraints: [], people: [] };
  renderChat();
  renderCommitments();
  const intro = "Hi, I'm RITA — your retirement coaching companion.\n\nWhat feels most uncertain or exciting about this next chapter for you?";
  addBubble(intro, "rita");
  state.history.push({ role: "assistant", text: intro });
  await saveHistory("assistant", intro);
});

// ── Init ──────────────────────────────────────────────────
initAuth();
