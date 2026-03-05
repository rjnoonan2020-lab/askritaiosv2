
(function() {
  // RITA Widget — embed on any page with a single script tag
  // Usage: <script src="https://darling-dragon-f1fb92.netlify.app/assets/rita-widget.js"></script>

  var BASE_URL = "https://darling-dragon-f1fb92.netlify.app";

  var style = document.createElement("style");
  style.textContent = `
    #rita-widget-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #c8392b;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(200,57,43,0.4);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: hidden;
      padding: 0;
    }
    #rita-widget-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(200,57,43,0.5);
    }
    #rita-widget-btn img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    #rita-widget-btn .rita-icon {
      color: white;
      font-size: 28px;
      font-weight: bold;
      font-family: Georgia, serif;
    }
    #rita-widget-panel {
      position: fixed;
      bottom: 100px;
      right: 24px;
      width: 360px;
      height: 500px;
      border-radius: 20px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      z-index: 2147483647;
      overflow: hidden;
      display: none;
      flex-direction: column;
      background: #fff;
      border: 1px solid #e8e0d8;
      animation: ritaSlideUp 0.25s ease;
      transform: translateZ(0);
    }
    #rita-widget-panel.open {
      display: flex;
    }
    @keyframes ritaSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #rita-widget-header {
      background: #c8392b;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    #rita-widget-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #rita-widget-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.5);
      object-fit: cover;
    }
    #rita-widget-title {
      color: white;
      font-family: Georgia, serif;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.2;
    }
    #rita-widget-subtitle {
      color: rgba(255,255,255,0.8);
      font-size: 11px;
      font-family: Arial, sans-serif;
    }
    #rita-widget-close {
      background: none;
      border: none;
      color: white;
      font-size: 22px;
      cursor: pointer;
      opacity: 0.8;
      line-height: 1;
      padding: 2px 4px;
    }
    #rita-widget-close:hover { opacity: 1; }
    #rita-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #fdf8f3;
    }
    .rita-bubble {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 13px;
      line-height: 1.6;
      font-family: Arial, sans-serif;
    }
    .rita-bubble.rita {
      background: #f9ecea;
      color: #2c2c2c;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .rita-bubble.you {
      background: #c8392b;
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .rita-bubble.typing {
      background: #f9ecea;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      padding: 12px 16px;
    }
    .rita-dots {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .rita-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #c8392b;
      animation: ritaBounce 1.2s infinite;
    }
    .rita-dots span:nth-child(2) { animation-delay: 0.2s; }
    .rita-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ritaBounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-5px); }
    }
    #rita-widget-input-area {
      border-top: 1px solid #e8e0d8;
      padding: 12px;
      display: flex;
      gap: 8px;
      align-items: flex-end;
      background: white;
      flex-shrink: 0;
    }
    #rita-widget-input {
      flex: 1;
      border: 1px solid #e8e0d8;
      border-radius: 20px;
      padding: 10px 14px;
      font-size: 13px;
      font-family: Arial, sans-serif;
      resize: none;
      outline: none;
      background: #fdf8f3;
      max-height: 80px;
      min-height: 38px;
      line-height: 1.4;
    }
    #rita-widget-input:focus { border-color: #c8392b; }
    #rita-widget-send {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #c8392b;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s;
    }
    #rita-widget-send:hover { background: #a02d22; }
    #rita-widget-send:disabled { background: #ccc; cursor: not-allowed; }
    #rita-widget-send svg { width: 16px; height: 16px; fill: white; }
    #rita-widget-disclaimer {
      font-size: 10px;
      color: #aaa;
      text-align: center;
      padding: 4px 12px 8px;
      background: white;
      font-family: Arial, sans-serif;
    }
    #rita-widget-disclaimer a { color: #c8392b; }
    @media (max-width: 480px) {
      #rita-widget-panel {
        right: 0;
        bottom: 0;
        width: 100vw;
        height: 75vh;
        border-radius: 20px 20px 0 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Build widget HTML
  var btn = document.createElement("button");
  btn.id = "rita-widget-btn";
  btn.setAttribute("aria-label", "Chat with RITA");
  btn.innerHTML = '<img src="' + BASE_URL + '/assets/rita-avatar.jpg" alt="RITA" onerror="this.outerHTML=\'<span class=rita-icon>R</span>\'" />';

  var panel = document.createElement("div");
  panel.id = "rita-widget-panel";
  panel.innerHTML = `
    <div id="rita-widget-header">
      <div id="rita-widget-header-left">
        <img id="rita-widget-avatar" src="${BASE_URL}/assets/rita-avatar.jpg" alt="RITA" onerror="this.style.display='none'" />
        <div>
          <div id="rita-widget-title">Ask RITA</div>
          <div id="rita-widget-subtitle">Retirement Interest & Thought Agent™</div>
        </div>
      </div>
      <button id="rita-widget-close" aria-label="Close">×</button>
    </div>
    <div id="rita-widget-messages">
      <div class="rita-bubble rita">Hi! I'm RITA — your retirement companion. What's on your mind today?</div>
    </div>
    <div id="rita-widget-input-area">
      <textarea id="rita-widget-input" placeholder="Ask me anything…" rows="1"></textarea>
      <button id="rita-widget-send">
        <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
      </button>
    </div>
    <div id="rita-widget-disclaimer">
      General information only — not financial, medical or legal advice.
      <a href="${BASE_URL}/rita-free.html" target="_blank">Full chat →</a>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var messages = [];
  var busy = false;
  var messagesEl = document.getElementById("rita-widget-messages");
  var inputEl = document.getElementById("rita-widget-input");
  var sendEl = document.getElementById("rita-widget-send");

  btn.addEventListener("click", function() {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) inputEl.focus();
  });

  document.getElementById("rita-widget-close").addEventListener("click", function() {
    panel.classList.remove("open");
  });

  function addBubble(text, who) {
    var div = document.createElement("div");
    div.className = "rita-bubble " + who;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    var div = document.createElement("div");
    div.className = "rita-bubble typing";
    div.id = "rita-typing";
    div.innerHTML = '<div class="rita-dots"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    var t = document.getElementById("rita-typing");
    if (t) t.remove();
  }

  async function send() {
    if (busy) return;
    var text = (inputEl.value || "").trim();
    if (!text) return;
    inputEl.value = "";
    inputEl.style.height = "auto";
    addBubble(text, "you");
    messages.push({ role: "user", content: text });
    busy = true;
    sendEl.disabled = true;
    showTyping();

    try {
      var resp = await fetch(BASE_URL + "/.netlify/functions/rita-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.slice(-10) })
      });
      var data = await resp.json();
      removeTyping();
      var reply = data.reply || "I'm here to help! Tell me more.";
      addBubble(reply, "rita");
      messages.push({ role: "assistant", content: reply });
    } catch(e) {
      removeTyping();
      addBubble("Something went wrong — please try again!", "rita");
    } finally {
      busy = false;
      sendEl.disabled = false;
    }
  }

  sendEl.addEventListener("click", send);
  inputEl.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });
  inputEl.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 80) + "px";
  });

})();
