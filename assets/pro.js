const TABS = [
  {
    id: "daily_routine",
    label: "Daily Routine Builder",
    desc: "Create a simple weekly structure that balances purpose, health, relationships, and enjoyment."
  },
  {
    id: "purpose_projects",
    label: "Purpose and Projects",
    desc: "Turn interests and values into 2 to 4 concrete projects for your next chapter."
  },
  {
    id: "encore_work",
    label: "Encore Work Explorer",
    desc: "Explore part-time work, consulting, volunteering, or a second act career in a structured way."
  },
  {
    id: "relationship_plan",
    label: "Relationships Plan",
    desc: "Strengthen key relationships and build new community connections with a practical plan."
  },
  {
    id: "transition_plan_90",
    label: "30-60-90 Transition Plan",
    desc: "Generate a 30/60/90 day action plan for the non-financial side of retirement."
  }
];

const tabsEl = document.getElementById("tabs");
const toolDescEl = document.getElementById("toolDesc");
const contextEl = document.getElementById("context");
const consentEl = document.getElementById("consent");

const runBtn = document.getElementById("runBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");

const outputEl = document.getElementById("output");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

const upBtn = document.getElementById("upBtn");
const downBtn = document.getElementById("downBtn");
const fbText = document.getElementById("fbText");
const fbSend = document.getElementById("fbSend");

const saveStateEl = document.getElementById("saveState");

const STORAGE_KEY = "rita_pro_state_v1";
let state = {
  tool: TABS[0].id,
  context: "",
  output: "",
  consent: false,
  saveOn: true
};

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function setOutput(text, muted = false) {
  outputEl.textContent = text;
  outputEl.classList.toggle("muted", muted);
}

function save() {
  if (!state.saveOn) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") state = { ...state, ...parsed };
  } catch {}
}

function renderTabs() {
  tabsEl.innerHTML = "";
  for (const t of TABS) {
    const btn = document.createElement("button");
    btn.className = "tabbtn" + (t.id === state.tool ? " active" : "");
    btn.type = "button";
    btn.textContent = t.label;
    btn.addEventListener("click", () => {
      state.tool = t.id;
      const tab = TABS.find(x => x.id === state.tool);
      toolDescEl.textContent = tab ? tab.desc : "";
      renderTabs();
      save();
      setStatus("");
    });
    tabsEl.appendChild(btn);
  }
  const tab = TABS.find(x => x.id === state.tool);
  toolDescEl.textContent = tab ? tab.desc : "";
}

function updateButtons() {
  const ok = !!consentEl.checked;
  runBtn.disabled = !ok;
  if (!ok) setStatus("Please confirm the consent checkbox to continue.");
  if (ok) setStatus("");
}

function hydrateUI() {
  renderTabs();
  contextEl.value = state.context || "";
  consentEl.checked = !!state.consent;
  if (state.output) setOutput(state.output, false);
  else setOutput("Your output will appear here.", true);

  saveStateEl.textContent = state.saveOn ? "On" : "Off";
  updateButtons();
}

consentEl.addEventListener("change", () => {
  state.consent = consentEl.checked;
  save();
  updateButtons();
});

contextEl.addEventListener("input", () => {
  state.context = contextEl.value;
  save();
});

clearBtn.addEventListener("click", () => {
  contextEl.value = "";
  state.context = "";
  state.output = "";
  setOutput("Your output will appear here.", true);
  setStatus("");
  save();
});

runBtn.addEventListener("click", async () => {
  const context = (contextEl.value || "").trim();
  if (!consentEl.checked) {
    setStatus("Please confirm the consent checkbox to continue.");
    return;
  }
  if (!context) {
    setStatus("Add a short situation description first.");
    contextEl.focus();
    return;
  }

  runBtn.disabled = true;
  clearBtn.disabled = true;
  setStatus("Working…");
  setOutput("", false);

  try {
    const resp = await fetch("/.netlify/functions/rita-pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: state.tool, context })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setOutput(data?.error || `Request failed (${resp.status})`, false);
      setStatus("Error");
      return;
    }

    const out = (data.output || "").trim();
    state.output = out;
    setOutput(out || "No output returned.", false);
    setStatus("Done");
    save();
  } catch (e) {
    setOutput("Network error. Please try again.", false);
    setStatus("Error");
  } finally {
    runBtn.disabled = false;
    clearBtn.disabled = false;
    updateButtons();
  }
});

copyBtn.addEventListener("click", async () => {
  const text = (outputEl.textContent || "").trim();
  if (!text || text === "Your output will appear here.") {
    setStatus("Nothing to copy yet.");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied.");
  } catch {
    setStatus("Copy failed.");
  }
});

downloadBtn.addEventListener("click", () => {
  const text = (outputEl.textContent || "").trim();
  if (!text || text === "Your output will appear here.") {
    setStatus("Nothing to download yet.");
    return;
  }
  const filename = `rita-pro-${state.tool}.txt`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus("Downloaded.");
});

let lastVote = null;
upBtn.addEventListener("click", () => { lastVote = "up"; setStatus("Feedback: 👍 selected"); });
downBtn.addEventListener("click", () => { lastVote = "down"; setStatus("Feedback: 👎 selected"); });

fbSend.addEventListener("click", async () => {
  const note = (fbText.value || "").trim();
  if (!lastVote && !note) { setStatus("Add a note or select 👍/👎."); return; }

  try {
    const resp = await fetch("/.netlify/functions/rita-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: state.tool,
        vote: lastVote,
        note,
        context: (contextEl.value || "").slice(0, 2000),
        output: (outputEl.textContent || "").slice(0, 4000)
      })
    });
    if (!resp.ok) throw new Error("fail");
    fbText.value = "";
    lastVote = null;
    setStatus("Feedback sent. Thank you.");
  } catch {
    setStatus("Feedback could not be sent yet.");
  }
});

load();
hydrateUI();
