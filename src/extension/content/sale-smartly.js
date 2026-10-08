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

  window.dispatchEvent(
    new CustomEvent("UPSTATUS_EXTENSION_READY", {
      detail: { instanceId }
    })
  );
})();
