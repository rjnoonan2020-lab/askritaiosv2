(function() {
  var BASE_URL = "https://darling-dragon-f1fb92.netlify.app";

  var style = document.createElement("style");
  style.textContent = `
    #rita-fab {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: 64px !important;
      height: 64px !important;
      border-radius: 50% !important;
      background: #c8392b !important;
      border: none !important;
      cursor: pointer !important;
      box-shadow: 0 4px 20px rgba(200,57,43,0.4) !important;
      z-index: 2147483647 !important;
      overflow: hidden !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: transform 0.2s !important;
    }
    #rita-fab:hover { transform: scale(1.08) !important; }
    #rita-fab img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      border-radius: 50% !important;
    }
    #rita-iframe-wrap {
      position: fixed !important;
      bottom: 100px !important;
      right: 24px !important;
      width: 370px !important;
      height: 540px !important;
      z-index: 2147483646 !important;
      border-radius: 20px !important;
      overflow: hidden !important;
      box-shadow: 0 8px 40px rgba(0,0,0,0.2) !important;
      display: none !important;
    }
    #rita-iframe-wrap.open { display: block !important; }
    #rita-iframe-wrap iframe {
      width: 100% !important;
      height: 100% !important;
      border: none !important;
    }
    @media (max-width: 480px) {
      #rita-iframe-wrap {
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 75vh !important;
        border-radius: 20px 20px 0 0 !important;
      }
      #rita-fab { bottom: 16px !important; right: 16px !important; }
    }
  `;
  document.head.appendChild(style);

  var fab = document.createElement("button");
  fab.id = "rita-fab";
  fab.setAttribute("aria-label", "Chat with RITA");
  fab.innerHTML = '<img src="' + BASE_URL + '/assets/rita-avatar.jpg" alt="RITA" onerror="this.outerHTML=\'<span style=\\\"color:white;font-family:Georgia,serif;font-size:24px;font-weight:bold\\\">R</span>\'" />';

  var wrap = document.createElement("div");
  wrap.id = "rita-iframe-wrap";
  var iframe = document.createElement("iframe");
  iframe.src = BASE_URL + "/rita-widget-page.html";
  iframe.title = "Ask RITA";
  wrap.appendChild(iframe);

  document.body.appendChild(fab);
  document.body.appendChild(wrap);

  var open = false;
  fab.addEventListener("click", function() {
    open = !open;
    wrap.classList.toggle("open", open);
  });

  window.addEventListener("message", function(e) {
    if (e.data === "rita-close") { open = false; wrap.classList.remove("open"); }
  });
})();
