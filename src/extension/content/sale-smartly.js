(() => {
  "use strict";

  const instanceId =
    "sale-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8);

  const port = chrome.runtime.connect({ name: "upstatus-sale-smartly" });

  port.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") return;

    if (message.type === "PONG") {
      window.dispatchEvent(
        new CustomEvent("UPSTATUS_EXTENSION_PONG", {
          detail: {
            requestId: message.requestId || null,
            instanceId
          }
        })
      );
      return;
    }

    if (message.type === "SESSION_ACK") {
      window.dispatchEvent(
        new CustomEvent("UPSTATUS_EXTENSION_SESSION_ACK", {
          detail: {
            session: message.session || null,
            instanceId
          }
        })
      );
    }
  });

  window.addEventListener("UPSTATUS_EXTENSION_PING", () => {
    const requestId =
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

    port.postMessage({
      type: "PING",
      requestId
    });
  });

  document.addEventListener("UPSTATUS_EXTENSION_SESSION", (event) => {
    const session = event?.detail || null;

    if (!session || !session.hya) return;

    port.postMessage({
      type: "SESSION_UPDATE",
      session: {
        hya: String(session.hya),
        projectId: String(session.projectId || ""),
        cpl: session.cpl ? String(session.cpl) : "",
        clientType: session.clientType ? String(session.clientType) : "",
        capturedAt: Number(session.capturedAt || Date.now())
      }
    });
  });

  function installPageBridge() {
    if (document.documentElement?.dataset.upstatusExtensionBridge === "1") {
      return;
    }

    const script = document.createElement("script");
    script.textContent = `(() => {
      "use strict";

      if (window.__upstatusExtensionPageBridgeInstalled) return;
      window.__upstatusExtensionPageBridgeInstalled = true;

      let hya = "";
      let projectId = "";
      let cpl = "";
      let clientType = "";

      function emitSession() {
        if (!hya) return;

        document.dispatchEvent(
          new CustomEvent("UPSTATUS_EXTENSION_SESSION", {
            detail: {
              hya,
              projectId,
              cpl,
              clientType,
              capturedAt: Date.now()
            }
          })
        );
      }

      function capture(raw, init) {
        try {
          const rawUrl =
            typeof raw === "string"
              ? raw
              : raw && typeof raw.url === "string"
                ? raw.url
                : "";

          const url = new URL(rawUrl, location.href);

          if (url.hostname !== "api.salesmartly.com") return;

          const nextHya = url.searchParams.get("_hya_");
          const nextProjectId =
            url.searchParams.get("project_id") ||
            url.searchParams.get("_xma_");

          if (nextProjectId) projectId = nextProjectId;

          if (init && init.headers) {
            try {
              const headers = init.headers;

              if (typeof Headers !== "undefined" && headers instanceof Headers) {
                const nextCpl = headers.get("Cpl") || headers.get("cpl");
                const nextClientType =
                  headers.get("Client-Type") || headers.get("client-type");

                if (nextCpl) cpl = nextCpl;
                if (nextClientType) clientType = nextClientType;
              } else if (Array.isArray(headers)) {
                headers.forEach((pair) => {
                  if (!pair || pair.length < 2) return;

                  const name = String(pair[0]).toLowerCase();
                  const value = String(pair[1] || "");

                  if (name === "cpl" && value) cpl = value;
                  if (name === "client-type" && value) clientType = value;
                });
              } else {
                Object.keys(headers).forEach((key) => {
                  const name = key.toLowerCase();
                  const value = String(headers[key] || "");

                  if (name === "cpl" && value) cpl = value;
                  if (name === "client-type" && value) clientType = value;
                });
              }
            } catch {}
          }

          if (nextHya) {
            const changed = nextHya !== hya;
            hya = nextHya;

            if (changed || projectId || cpl || clientType) {
              emitSession();
            }
          }
        } catch {}
      }

      const originalFetch = window.fetch;

      window.fetch = function(input, init) {
        try {
          capture(input, init);
        } catch {}

        return originalFetch.apply(this, arguments);
      };

      const originalOpen = XMLHttpRequest.prototype.open;

      XMLHttpRequest.prototype.open = function(method, url) {
        try {
          capture(url);
        } catch {}

        return originalOpen.apply(this, arguments);
      };

      const originalSetRequestHeader =
        XMLHttpRequest.prototype.setRequestHeader;

      XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
        try {
          const normalizedName = String(name || "").toLowerCase();
          const normalizedValue = String(value || "");

          if (normalizedName === "cpl" && normalizedValue) {
            cpl = normalizedValue;
          }

          if (normalizedName === "client-type" && normalizedValue) {
            clientType = normalizedValue;
          }

          if (hya) emitSession();
        } catch {}

        return originalSetRequestHeader.apply(this, arguments);
      };

      function rescan() {
        try {
          performance
            .getEntriesByType("resource")
            .forEach((entry) => capture(entry.name));
        } catch {}
      }

      rescan();
      setTimeout(rescan, 500);
      setTimeout(rescan, 1500);
      setTimeout(rescan, 3000);
      setTimeout(rescan, 5000);
    })();`;

    (document.documentElement || document.head || document.body).appendChild(
      script
    );
    script.remove();

    if (document.documentElement) {
      document.documentElement.dataset.upstatusExtensionBridge = "1";
    }
  }

  installPageBridge();

  window.dispatchEvent(
    new CustomEvent("UPSTATUS_EXTENSION_READY", {
      detail: { instanceId }
    })
  );
})();