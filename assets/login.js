function initSupabase() {
  const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
  const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const statusEl = document.getElementById("authStatus");
  function setStatus(msg) { statusEl.textContent = msg; }

  sb.auth.getSession().then(function(result) {
    if (result.data.session) window.location.href = "/coach.html";
  });

  document.getElementById("signInBtn").addEventListener("click", async function() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!email || !password) { setStatus("Please enter email and password."); return; }
    setStatus("Signing in…");
    const result = await sb.auth.signInWithPassword({ email: email, password: password });
    if (result.error) { setStatus(result.error.message); return; }
    window.location.href = "/coach.html";
  });

  document.getElementById("signUpBtn").addEventListener("click", async function() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!email || !password) { setStatus("Please enter email and password."); return; }
    setStatus("Creating account…");
    const result = await sb.auth.signUp({ email: email, password: password });
    if (result.error) { setStatus(result.error.message); return; }
    setStatus("Account created! You can now sign in.");
  });

  document.getElementById("appleBtn").addEventListener("click", async function() {
    setStatus("Redirecting to Apple…");
    const result = await sb.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: "https://darling-dragon-f1fb92.netlify.app/coach.html" }
    });
    if (result.error) { setStatus(result.error.message); }
  });
}
