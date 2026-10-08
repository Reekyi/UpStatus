const ports = new Set();

function broadcast(message, senderPort) {
  for (const port of ports) {
    if (port !== senderPort) {
      try {
        port.postMessage(message);
      } catch {
        ports.delete(port);
      }
    }
  }
}

chrome.runtime.onConnect.addListener((port) => {
  ports.add(port);

  port.onDisconnect.addListener(() => {
    ports.delete(port);
  });

  port.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") return;

    if (message.type === "PING") {
      port.postMessage({
        type: "PONG",
        requestId: message.requestId || null
      });
      return;
    }

    if (message.type === "BROADCAST") {
      broadcast(message.payload ?? null, port);
    }
  });
});
