const SUPABASE_URL = "https://wjubibjkasoattmbqurf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdWJpYmprYXNvYXR0bWJxdXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODAyMDEsImV4cCI6MjA4ODA1NjIwMX0.djzKshGnvgxqmD6PiKP5tnW0gjgKdqHyQcA_MHTCqqs";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Elements ──────────────────────────────────────────────
const chatEl       = document.getElementById("chat");
const msgEl        = document.getElementById("msg");
const sendBtn      = document.getElementById("send");
const resetBtn     = document.getElementById("reset");
const statusEl     = document.getElementById("status");
const consentEl    = document.getElementById("consent");
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
  consent: false,
  memory: { timeline_note: "", themes: [], interests: [], constraints: [], people: [] },
  history: [],
  weekly_momentum: { commitments: [], last_checkin: null }
};

let currentUser = null;

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
  updateSendEnabled();
  if (!state.history.length) {
    const intro = "Hi, I'm RITA — your retirement coaching companion.\n\nWhat feels most uncertain or exciting about this next chapter for you?";
    addBubble(intro, "rita");
    state.history.push({ role: "assistant", text: intro });
    aw
