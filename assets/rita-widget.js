(function() {
  // RITA Widget — per-client configurable
  // Usage:
  //   Default:  <script src="...rita-widget.js"></script>
  //   Client:   <script src="...rita-widget.js?client=lakeside"></script>

  var BASE_URL = "https://darling-dragon-f1fb92.netlify.app";

  // Read ?client= from this script tag's src
  var scriptTag = document.currentScript || (function() {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();
  var scriptSrc = scriptTag ? scriptTag.src : "";
  var clientMatch = scriptSrc.match(/[?&]client=([^&]+)/);
  var clientId = clientMatch ? clientMatch[1] : "default";

  var defaults = {
    firmName: "Ask RITA",
    subtitle: "Retirement Interest & Thought Agent\u2122",
    fabColor: "#c8392b",
    fabColorHover: "#a02d22",
    headerBg: "#c8392b",
    headerText: "#ffffff",
    bubbleBg: "#f9ecea",
    bubbleText: "#2c2c2c",
    userBubbleBg: "#c8392b",
    userBubbleText: "#ffffff",
    chatBg: "#fdf8f3",
    inputBg: "#fdf8f3",
    inputBorder: "#e8e0d8",
    inputFocus: "#c8392b",
    dotColor: "#c8392b",
    sendBtnColor: "#c8392b",
    sendBtnHover: "#a02d22",
    logoUrl: BASE_URL + "/assets/rita-avatar.jpg",
    greeting: "<strong>Hi, I'm RITA!</strong><br>Think of me as your friendly guide for ideas about life after work. Got questions about what to do next? Hobbies? Routines? Purpose? Just ask \u2014 I've got ideas!",
    hint: "\u2728 Retirement Lifestyle Assistant",
    fullChatUrl: BASE_URL + "/rita-free.html",
    disclaimer: "General info only \u2014 not financial, medical or legal advice."
  };

  fetch(BASE_URL + "/assets/rita-clients.json?v=" + Date.now())
    .then(function(r) { return r.json(); })
    .then(function(configs) {
      var clientCfg = configs[clientId] || configs["default"] || {};
      var cfg = Object.assign({}, defaults, clientCfg);
      cfg.sendBtnColor = cfg.sendBtnColor || cfg.fabColor;
      cfg.sendBtnHover = cfg.sendBtnHover || cfg.fabColorHover;
      if (cfg.logoUrl && cfg.logoUrl.startsWith("/")) {
        cfg.logoUrl = BASE_URL + cfg.logoUrl;
      }
      initWidget(cfg);
    })
    .catch(function() { initWidget(defaults); });

  function initWidget(cfg) {
    var style = document.createElement("style");
    style.textContent = [
      "#rita-fab{position:fixed!important;bottom:24px!important;right:24px!important;width:64px!important;height:64px!important;border-radius:50%!important;background:" + cfg.fabColor + "!important;border:none!important;cursor:pointer!important;box-shadow:0 4px 20px " + cfg.fabColor + "55!important;z-index:2147483647!important;overflow:hidden!important;padding:0!important;transition:transform 0.2s!important;}",
      "#rita-fab:hover{transform:scale(1.08)!important;background:" + cfg.fabColorHover + "!important;}",
      "#rita-fab img{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:50%!important;display:block!important;}",
      "#rita-hint{position:fixed!important;bottom:100px!important;right:96px!important;background:#1a1a2e!important;color:white!important;font-size:12px!important;padding:7px 13px!important;border-radius:8px!important;font-family:Arial,sans-serif!important;box-shadow:0 4px 12px rgba(0,0,0,0.2)!important;z-index:2147483646!important;white-space:nowrap!important;pointer-events:none!important;transition:opacity 0.3s!important;}",
      "#rita-hint::after{content:''!important;position:absolute!important;right:-7px!important;top:50%!important;transform:translateY(-50%)!important;border:7px solid transparent!important;border-left-color:#1a1a2e!important;border-right:none!important;}",
      "#rita-panel{position:fixed!important;bottom:100px!important;right:24px!important;width:360px!important;height:520px!important;background:white!important;border-radius:20px!important;box-shadow:0 8px 40px rgba(0,0,0,0.18)!important;z-index:2147483646!important;display:none!important;flex-direction:column!important;overflow:hidden!important;border:1px solid #e0e0e0!important;}",
      "#rita-panel.open{display:flex!important;}",
      "#rita-header{background:" + cfg.headerBg + "!important;padding:12px 16px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;flex-shrink:0!important;}",
      "#rita-header-left{display:flex!important;align-items:center!important;gap:10px!important;}",
      "#rita-hdr-avatar{width:36px!important;height:36px!important;border-radius:50%!important;border:2px solid rgba(255,255,255,0.4)!important;object-fit:cover!important;}",
      "#rita-firm-name{color:" + cfg.headerText + "!important;font-size:15px!important;font-weight:700!important;font-family:Georgia,serif!important;line-height:1.2!important;}",
      "#rita-firm-sub{color:" + cfg.headerText + "cc!important;font-size:10px!important;font-family:Arial,sans-serif!important;}",
      "#rita-fullchat{color:" + cfg.headerText + "dd!important;font-size:11px!important;text-decoration:none!important;border:1px solid " + cfg.headerText + "44!important;padding:3px 8px!important;border-radius:10px!important;font-family:Arial,sans-serif!important;}",
      "#rita-close{background:none!important;border:none!important;color:" + cfg.headerText + "!important;font-size:22px!important;cursor:pointer!important;opacity:0.8!important;line-height:1!important;padding:0 4px!important;}",
      "#rita-messages{flex:1!important;overflow-y:auto!important;padding:14px!important;display:flex!important;flex-direction:column!important;gap:10px!important;background:" + cfg.chatBg + "!important;}",
      ".rb{max-width:85%!important;padding:10px 14px!important;border-radius:16px!important;font-size:13px!important;line-height:1.6!important;font-family:Arial,sans-serif!important;}",
      ".rb.rita{background:" + cfg.bubbleBg + "!important;color:" + cfg.bubbleText + "!important;align-self:flex-start!important;border-bottom-left-radius:4px!important;}",
      ".rb.you{background:" + cfg.userBubbleBg + "!important;color:" + cfg.userBubbleText + "!important;align-self:flex-end!important;border-bottom-right-radius:4px!important;}",
      ".rb.typing{background:" + cfg.bubbleBg + "!important;align-self:flex-start!important;border-bottom-left-radius:4px!important;}",
      ".rdots{display:flex!important;gap:4px!important;align-items:center!important;}",
      ".rdots span{width:6px!important;height:6px!important;border-radius:50%!important;background:" + cfg.dotColor + "!important;animation:rbounce 1.2s infinite!important;}",
      ".rdots span:nth-child(2){animation-delay:0.2s!important;}",
      ".rdots span:nth-child(3){animation-delay:0.4s!important;}",
      "@keyframes rbounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}",
      "#rita-input-area{border-top:1px solid " + cfg.inputBorder + "!important;padding:10px 12px!important;display:flex!important;gap:8px!important;align-items:flex-end!important;background:white!important;flex-shrink:0!important;}",
      "#rita-msg{flex:1!important;border:1px solid " + cfg.inputBorder + "!important;border-radius:20px!important;padding:9px 14px!important;font-size:13px!important;font-family:Arial,sans-serif!important;resize:none!important;outline:none!important;background:" + cfg.inputBg + "!important;max-height:80px!important;min-height:36px!important;line-height:1.4!important;color:#333!important;}",
      "#rita-msg:focus{border-color:" + cfg.inputFocus + "!important;}",
      "#rita-send{width:36px!important;height:36px!important;border-radius:50%!important;background:" + cfg.sendBtnColor + "!important;border:none!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important;transition:background 0.2s!important;}",
      "#rita-send:hover{background:" + cfg.sendBtnHover + "!important;}",
      "#rita-send:disabled{background:#ccc!important;cursor:not-allowed!important;}",
      "#rita-send svg{width:15px!important;height:15px!important;fill:white!important;}",
      "#rita-disc{font-size:10px!important;color:#aaa!important;text-align:center!important;padding:4px 12px 8px!important;background:white!important;font-family:Arial,sans-serif!important;}",
      "@media(max-width:480px){#rita-panel{right:0!important;bottom:0!important;width:100vw!important;height:75vh!important;border-radius:20px 20px 0 0!important;}#rita-fab{bottom:16px!important;right:16px!important;}#rita-hint{display:none!important;}}"
    ].join("");
    document.head.appendChild(style);

    var fab = document.createElement("button");
    fab.id = "rita-fab";
    fab.setAttribute("aria-label", "Chat with RITA");
    var img = document.createElement("img");
    img.src = cfg.logoUrl;
    img.alt = cfg.firmName;
    fab.appendChild(img);

    var hint = document.createElement("div");
    hint.id = "rita-hint";
    hint.textContent = cfg.hint;

    var panel = document.createElement("div");
    panel.id = "rita-panel";
    panel.innerHTML =
      '<div id="rita-header">' +
        '<div id="rita-header-left">' +
          '<img id="rita-hdr-avatar" src="' + cfg.logoUrl + '" alt="' + cfg.firmName + '" onerror="this.style.display=\'none\'" />' +
          '<div><div id="rita-firm-name">' + cfg.firmName + '</div><div id="rita-firm-sub">' + cfg.subtitle + '</div></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
          '<a id="rita-fullchat" href="' + cfg.fullChatUrl + '" target="_blank">Full chat</a>' +
          '<button id="rita-close" aria-label="Close">\xd7</button>' +
        '</div>' +
      '</div>' +
      '<div id="rita-messages"><div class="rb rita">' + cfg.greeting + '</div></div>' +
      '<div id="rita-input-area">' +
        '<textarea id="rita-msg" placeholder="Ask me anything\u2026" rows="1"></textarea>' +
        '<button id="rita-send" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg></button>' +
      '</div>' +
      '<div id="rita-disc">' + cfg.disclaimer + '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(hint);
    document.body.appendChild(panel);

    var ritaOpen = false;
    var ritaMsgs = [];
    var ritaBusy = false;
    var hintDismissed = false;

    function togglePanel() {
      ritaOpen = !ritaOpen;
      panel.classList.toggle("open", ritaOpen);
      if (ritaOpen) {
        if (!hintDismissed) {
          hintDismissed = true;
          hint.style.opacity = "0";
          setTimeout(function() { hint.style.display = "none"; }, 300);
        }
        document.getElementById("rita-msg").focus();
      }
    }

    fab.addEventListener("click", togglePanel);
    document.getElementById("rita-close").addEventListener("click", togglePanel);

    fab.addEventListener("mouseenter", function() {
      if (hintDismissed) { hint.style.display = "block"; setTimeout(function() { hint.style.opacity = "1"; }, 10); }
    });
    fab.addEventListener("mouseleave", function() {
      if (hintDismissed) { hint.style.opacity = "0"; setTimeout(function() { hint.style.display = "none"; }, 300); }
    });

    function addBubble(text, who) {
      var el = document.getElementById("rita-messages");
      var div = document.createElement("div");
      div.className = "rb " + who;
      if (who === "rita") div.innerHTML = text; else div.textContent = text;
      el.appendChild(div);
      el.scrollTop = el.scrollHeight;
    }

    function showTyping() {
      var el = document.getElementById("rita-messages");
      var div = document.createElement("div");
      div.className = "rb typing"; div.id = "rita-typing";
      div.innerHTML = '<div class="rdots"><span></span><span></span><span></span></div>';
      el.appendChild(div); el.scrollTop = el.scrollHeight;
    }

    function removeTyping() { var t = document.getElementById("rita-typing"); if (t) t.remove(); }

    async function send() {
      if (ritaBusy) return;
      var msgEl = document.getElementById("rita-msg");
      var text = (msgEl.value || "").trim();
      if (!text) return;
      msgEl.value = ""; msgEl.style.height = "auto";
      addBubble(text, "you");
      ritaMsgs.push({ role: "user", content: text });
      ritaBusy = true;
      document.getElementById("rita-send").disabled = true;
      showTyping();
      try {
        var resp = await fetch(BASE_URL + "/.netlify/functions/rita-free", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: ritaMsgs.slice(-10) })
        });
        var data = await resp.json();
        removeTyping();
        addBubble(data.reply || "I'm here to help! Tell me more.", "rita");
        ritaMsgs.push({ role: "assistant", content: data.reply || "" });
      } catch(e) {
        removeTyping();
        addBubble("Something went wrong \u2014 please try again!", "rita");
      } finally {
        ritaBusy = false;
        document.getElementById("rita-send").disabled = false;
      }
    }

    document.getElementById("rita-send").addEventListener("click", send);
    document.getElementById("rita-msg").addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    document.getElementById("rita-msg").addEventListener("input", function() {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 80) + "px";
    });
  }
})();
