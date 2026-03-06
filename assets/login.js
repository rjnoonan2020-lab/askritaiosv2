(function() {
  const SUPABASE_URL = "https://wjubibjkasoattmbqurf.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdWJpYmprYXNvYXR0bWJxdXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODAyMDEsImV4cCI6MjA4ODA1NjIwMX0.djzKshGnvgxqmD6PiKP5tnW0gjgKdqHyQcA_MHTCqqs";
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
    const result = await sb.auth.signInWithPassword({ email, password });
    if (result.error) { setStatus(result.error.message); return; }
    window.location.href = "/coach.html";
  });

  document.getElementById("signUpBtn").addEventListener("click", async function() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!email || !password) { setStatus("Please enter email and password."); return; }
    if (password.length < 6) { setStatus("Password must be at least 6 characters."); return; }
    setStatus("Creating account…");
    const result = await sb.auth.signUp({ email, password });
    if (result.error) { setStatus(result.error.message); return; }
    const signIn = await sb.auth.signInWithPassword({ email, password });
    if (signIn.error) { setStatus("Account created! Please sign in."); return; }
    window.location.href = "/coach.html";
  });

  document.getElementById("appleBtn").addEventListener("click", async function() {
    setStatus("Redirecting to Apple…");
    const result = await sb.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: "https://darling-dragon-f1fb92.netlify.app/coach.html" }
    });
    if (result.error) { setStatus(result.error.message); }
  });
})();
