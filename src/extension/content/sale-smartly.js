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

  window.dispatchEvent(
    new CustomEvent("UPSTATUS_EXTENSION_READY", {
      detail: { instanceId }
    })
  );
})();