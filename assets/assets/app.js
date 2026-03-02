
const askBtn = document.getElementById("askBtn");
const clearBtn = document.getElementById("clearBtn");
const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");
const statusEl = document.getElementById("status");

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function setAnswer(text, muted = false) {
  answerEl.textContent = text;
  answerEl.classList.toggle("muted", muted);
}

clearBtn.addEventListener("click", () => {
  questionEl.value = "";
  setAnswer("Your answer will appear here.", true);
  setStatus("");
  questionEl.focus();
});

askBtn.addEventListener("click", async () => {
  const question = (questionEl.value || "").trim();
  if (!question) {
    setStatus("Type a question first.");
    questionEl.focus();
    return;
  }

  askBtn.disabled = true;
  clearBtn.disabled = true;
  setStatus("Thinking…");
  setAnswer("", false);

  try {
    const resp = await fetch("/.netlify/functions/ask-rita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const msg = data?.error || `Request failed (${resp.status})`;
      setAnswer(msg, false);
      setStatus("Error");
      return;
    }

    setAnswer(data.answer || "No answer returned.", false);
    setStatus("Done");
  } catch (err) {
    setAnswer("Network error. Please try again.", false);
    setStatus("Error");
  } finally {
    askBtn.disabled = false;
    clearBtn.disabled = false;
  }
});
