const SUPABASE_URL = "https://wjubibjkasoattmbqurf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdWJpYmprYXNvYXR0bWJxdXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODAyMDEsImV4cCI6MjA4ODA1NjIwMX0.djzKshGnvgxqmD6PiKP5tnW0gjgKdqHyQcA_MHTCqqs";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const chatEl      = document.getElementById("chat");
const msgEl       = document.getElementById("msg");
const sendBtn     = document.getElementById("send");
const resetBtn    = document.getElementById("reset");
const statusEl    = document.getElementById("status");
const commitsEl   = document.getElementById("commitmentsList");
const checkinBtn  = document.getElementById("checkin");
const newWeekBtn  = document.getElementById("newWeek");
const focusPicker = document.getElementById("focusPicker");
const coachUI     = document.getElementById("coachInterface");
const focusBadge  = document.getElementById("focusBadge");

const FOCUS_OPENERS = {
  "Reflection":     "Taking time to reflect is one of the most valuable things you can do in retirement. How would you say your retirement has gone so far — what's felt right, and what's surprised you?",
  "Activity":       "Let's talk about staying active. How would you describe your current level of physical activity, and how does it make you feel?",
  "Emotions":       "It takes courage to check in with how you're really feeling. What emotions have been most present for you lately in retirement?",
  "Connections":    "Relationships are so important in retirement. How connected do you feel to the people who matter most to you right now?",
  "Meaning":        "Finding meaning is one of the most important parts of a fulfilling retirement. What activities or moments have felt most meaningful to you lately?",
  "Leisure":        "Retirement is a wonderful time to explore how you spend your time. What do your days look like right now, and what would you love more of?",
  "Learning":       "Keeping your mind engaged is a gift you give yourself. What are you curious about learning or exploring right now?",
  "Contribution":   "Giving back can bring deep fulfillment. What causes, people, or communities do you feel called to contribute to right now?",
  "Time":           "Time is your most valuable asset in retirement. How are you feeling about the way you're spending your days — is it intentional, or does it feel unstructured?",
  "Finance & Home": "Your relationship with money and your living situation shapes so much of retirement. What feels settled, and what feels uncertain in this area?"
};

var FOCUS_AREAS = [
  { area: "Reflection",     emoji: "🪞" },
  { area: "Activity",       emoji: "🏃" },
  { area: "Emotions",       emoji: "💛" },
  { area: "Connections",    emoji: "👥" },
  { area: "Meaning",        emoji: "🎯" },
  { area: "Leisure",        emoji: "🎨" },
  { area: "Learning",       emoji: "📚" },
  { area: "Contribution",   emoji: "🤝" },
  { area: "Time",           emoji: "⏰" },
  { area: "Finance & Home", emoji: "🏠" }
];

document.querySelectorAll(".nav-tab").forEach(function(tab) {
  tab.addEventListener("click", function() {
    document.querySelectorAll(".nav-tab").forEach(function(t) { t.classList.remove("active"); });
    document.querySelectorAll(".tab-panel").forEach(function(p) { p.classList.remove("active"); });
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

var state = {
  memory: { timeline_note: "", themes: [], interests: [], constraints: [], people: [] },
  history: [],
  weekly_momentum: { commitments: [], last_checkin: null },
  focusArea: null
};

var currentUser = null;
var busy = false;

function getWeekOf() {
  var now = new Date();
  var day = now.getDay();
  var diff = now.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

async function initAuth() {
  var result = await sb.auth.getSession();
  if (!result.data.session) { window.location.href = "/login.html"; return; }
  currentUser = result.data.session.user;

  document.getElementById("signOutBtn").addEventListener("click", async function() {
    await sb.auth.signOut();
    window.location.href = "/login.html";
  });

  await loadState();
  renderCommitments();
  showFocusPicker();
}

function showFocusPicker() {
  focusPicker.style.display = "block";
  coachUI.style.display = "none";
}

function renderFocusSwitch(currentArea) {
  var strip = document.getElementById("focusSwitch");
  if (!strip) return;
  strip.innerHTML = "";
  FOCUS_AREAS.forEach(function(f) {
    var btn = document.createElement("button");
    btn.className = "focus-switch-btn" + (f.area === currentArea ? " current" : "");
    btn.innerHTML = f.emoji + " " + f.area;
    btn.addEventListener("click", function() {
      if (f.area === state.focusArea) return;
      startFocusArea(f.area);
    });
    strip.appendChild(btn);
  });
}

async function startFocusArea(area) {
  state.focusArea = area;
  state.history = [];
  focusBadge.textContent = area;
  focusBadge.style.display = "inline-block";
  renderFocusSwitch(area);
  chatEl.innerHTML = "";
  sendBtn.disabled = false;
  focusPicker.style.display = "none";
  coachUI.style.display = "block";

  var priorHistory = await loadAreaHistory(area);

  if (priorHistory && priorHistory.length >= 2) {
    setBusy(true);
    setStatus("RITA is preparing…");
    try {
      var resp = await fetch("/.netlify/functions/rita-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "returning",
          userText: "",
          focusArea: area,
          memory: state.memory,
          commitments: state.weekly_momentum.commitments,
          history: priorHistory.slice(-8)
        })
      });
      var data = await resp.json();
      var opener = data.coach_message || FOCUS_OPENERS[area];
      addBubble(opener, "rita");
      state.history.push({ role: "assistant", text: opener });
      await saveHistory("assistant", opener);
    } catch(e) {
      var fallback = FOCUS_OPENERS[area];
      addBubble(fallback, "rita");
      state.history.push({ role: "assistant", text: fallback });
      await saveHistory("assistant", fallback);
    } finally {
      setBusy(false);
      setStatus("");
    }
  } else {
    var intro = FOCUS_OPENERS[area] || "What would you like to explore today?";
    addBubble(intro, "rita");
    state.history.push({ role: "assistant", text: intro });
    await saveHistory("assistant", intro);
  }
}

async function loadAreaHistory(area) {
  try {
    var r = await sb.from("conversation_history")
      .select("role, content")
      .eq("user_id", currentUser.id)
      .eq("focus_area", area)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!r.data || !r.data.length) return [];
    return r.data.reverse().map(function(row) { return { role: row.role, text: row.content }; });
  } catch(e) { return []; }
}

document.querySelectorAll(".focus-card").forEach(function(card) {
  card.addEventListener("click", function() {
    startFocusArea(card.dataset.area);
  });
});

async function loadState() {
  try {
    var r = await sb.from("commitments")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("week_of", getWeekOf())
      .order("created_at", { ascending: true });
    if (r.data && r.data.length) {
      state.weekly_momentum.commitments = r.data.map(function(c) {
        return { id: c.id, text: c.text, status: c.status, area: c.area, week_of: c.week_of };
      });
    }
  } catch(e) { console.error("Load error", e); }
}

async function saveHistory(role, content) {
  if (!currentUser) return;
  await sb.from("conversation_history").insert({
    user_id: currentUser.id,
    role: role,
    content: content,
    focus_area: state.focusArea
  });
}

async function appendCommitments(newCommitments) {
  if (!currentUser || !newCommitments.length) return;
  var weekOf = getWeekOf();
  await sb.from("commitments").insert(newCommitments.map(function(c) {
    return {
      user_id: currentUser.id,
      text: c.text,
      status: c.status || "not_started",
      area: c.area || state.focusArea,
      week_of: weekOf
    };
  }));
  var r = await sb.from("commitments")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("week_of", weekOf)
    .order("created_at", { ascending: true });
  if (r.data) {
    state.weekly_momentum.commitments = r.data.map(function(c) {
      return { id: c.id, text: c.text, status: c.status, area: c.area, week_of: c.week_of };
    });
  }
}

async function clearCommitments() {
  if (!currentUser) return;
  await sb.from("commitments").delete().eq("user_id", currentUser.id);
  state.weekly_momentum.commitments = [];
}

async function updateCommitmentStatus(id, status) {
  if (!currentUser) return;
  var result = await sb.from("commitments").update({ status: status }).eq("id", id).eq("user_id", currentUser.id);
  if (result.error) console.error("Status update error", result.error);
}

function setStatus(msg) { statusEl.textContent = msg || ""; }

function setBusy(val) {
  busy = val;
  sendBtn.disabled = val;
  checkinBtn.disabled = val;
  newWeekBtn.disabled = val;
}

function addBubble(text, who) {
  var div = document.createElement("div");
  div.className = "bubble " + (who === "rita" ? "rita" : "you");
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function renderCommitments() {
  commitsEl.innerHTML = "";
  var commits = state.weekly_momentum.commitments;
  if (!commits.length) {
    commitsEl.innerHTML = '<div class="empty-state">No commitments this week yet.<br>RITA will suggest some during your coaching conversation.</div>';
    return;
  }

  var areas = [];
  var grouped = {};
  commits.forEach(function(c) {
    var a = c.area || "General";
    if (!grouped[a]) { grouped[a] = []; areas.push(a); }
    grouped[a].push(c);
  });

  areas.forEach(function(area) {
    var section = document.createElement("div");
    section.className = "commit-section";
    section.innerHTML = '<div class="commit-section-title">' + area + '</div>';
    grouped[area].forEach(function(c) {
      var card = document.createElement("div");
      card.className = "commitment-card";
      if (c.status === "done") {
        card.innerHTML = '<div class="commitment-text">' + c.text + '</div><div class="status-pills"><button class="pill active-done" disabled>Done ✓</button></div>';
      } else {
        card.innerHTML = '<div class="commitment-text">' + c.text + '</div><div class="status-pills"><button class="pill ' + (c.status === "not_started" ? "active-not_started" : "") + '" data-status="not_started" data-id="' + c.id + '">Not started</button><button class="pill ' + (c.status === "in_progress" ? "active-in_progress" : "") + '" data-status="in_progress" data-id="' + c.id + '">In progress</button><button class="pill" data-status="done" data-id="' + c.id + '">Done</button></div>';
      }
      section.appendChild(card);
    });
    commitsEl.appendChild(section);
  });

  commitsEl.querySelectorAll(".pill:not([disabled])").forEach(function(pill) {
    pill.addEventListener("click", async function() {
      var id = pill.dataset.id;
      var status = pill.dataset.status;
      var commit = state.weekly_momentum.commitments.find(function(c) { return c.id === id; });
      if (!commit) return;
      commit.status = status;
      await updateCommitmentStatus(id, status);
      renderCommitments();
    });
  });
}

async function callCoach(userText, mode) {
  var resp = await fetch("/.netlify/functions/rita-coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: mode,
      userText: userText,
      focusArea: state.focusArea,
      memory: state.memory,
      commitments: state.weekly_momentum.commitments,
      history: state.history.slice(-12)
    })
  });
  var data = await resp.json().catch(function() { return {}; });
  if (!resp.ok) throw new Error(data.error || "Request failed");
  return data;
}

sendBtn.addEventListener("click", async function() {
  if (busy) return;
  var text = (msgEl.value || "").trim();
  if (!text) return;
  msgEl.value = "";
  addBubble(text, "you");
  state.history.push({ role: "user", text: text });
  await saveHistory("user", text);
  setBusy(true);
  setStatus("RITA is thinking…");
  try {
    var data = await callCoach(text, "coach");
    if (data.memory_update) state.memory = Object.assign({}, state.memory, data.memory_update);
    if (Array.isArray(data.commitment_suggestions) && data.commitment_suggestions.length) {
      var newCommits = data.commitment_suggestions.slice(0, 3).map(function(t) {
        var txt = typeof t === "object" ? t.text : t;
        var area = typeof t === "object" && t.area ? t.area : state.focusArea;
        return { text: txt, status: "not_started", area: area };
      });
      await appendCommitments(newCommits);
      var notify = document.createElement("div");
      notify.className = "commit-notify";
      notify.textContent = "✓ " + newCommits.length + " commitment" + (newCommits.length > 1 ? "s" : "") + " added to your Weekly Momentum tab";
      chatEl.appendChild(notify);
      chatEl.scrollTop = chatEl.scrollHeight;
    }
    var reply = data.coach_message || "Tell me more.";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });
    await saveHistory("assistant", reply);
    renderCommitments();
    setStatus("");
  } catch(e) {
    addBubble("Something went wrong. Please try again.", "rita");
    setStatus("Error");
  } finally {
    setBusy(false);
  }
});

msgEl.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!busy) sendBtn.click(); }
});

checkinBtn.addEventListener("click", async function() {
  if (busy) return;
  if (!state.weekly_momentum.commitments.length) { setStatus("No commitments yet."); return; }
  setBusy(true);
  setStatus("RITA is reviewing your week…");
  try {
    var data = await callCoach("", "checkin");
    var reply = data.coach_message || "How did this week feel?";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });
    await saveHistory("assistant", reply);
    document.querySelector("[data-tab='chat']").click();
    setStatus("");
  } catch(e) {
    setStatus("Error");
  } finally {
    setBusy(false);
  }
});

newWeekBtn.addEventListener("click", async function() {
  if (busy) return;
  setBusy(true);
  setStatus("Preparing your new week…");
  try {
    var data = await callCoach("", "keep_or_reset");
    var reply = data.coach_message || "Would you like to keep or reset?";
    addBubble(reply, "rita");
    state.history.push({ role: "assistant", text: reply });
    await saveHistory("assistant", reply);
    if (data.action === "reset_commitments") await clearCommitments();
    if (Array.isArray(data.commitment_suggestions) && data.commitment_suggestions.length) {
      await appendCommitments(data.commitment_suggestions.slice(0, 3).map(function(t) {
        var txt = typeof t === "object" ? t.text : t;
        var area = typeof t === "object" && t.area ? t.area : state.focusArea;
        return { text: txt, status: "not_started", area: area };
      }));
    }
    renderCommitments();
    document.querySelector("[data-tab='chat']").click();
    setStatus("");
  } catch(e) {
    setStatus("Error");
  } finally {
    setBusy(false);
  }
});

resetBtn.addEventListener("click", async function() {
  if (!confirm("This will clear your entire coaching history and all commitments. Are you sure?")) return;
  await sb.from("conversation_history").delete().eq("user_id", currentUser.id);
  await clearCommitments();
  state.history = [];
  state.focusArea = null;
  state.memory = { timeline_note: "", themes: [], interests: [], constraints: [], people: [] };
  chatEl.innerHTML = "";
  renderCommitments();
  showFocusPicker();
});

initAuth();
