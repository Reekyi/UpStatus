const ports = new Set();
const sessions = new Map();

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

    if (message.type === "SESSION_UPDATE") {
      const session = message.session || null;

      if (!session || !session.hya) return;

      sessions.set(port, session);

      port.postMessage({
        type: "SESSION_ACK",
        session
      });

      return;
    }

    if (message.type === "SESSION_GET") {
      port.postMessage({
        type: "SESSION_ACK",
        session: sessions.get(port) || null
      });
      return;
    }

    if (message.type === "BROADCAST") {
      broadcast(message.payload ?? null, port);
    }
  });
});