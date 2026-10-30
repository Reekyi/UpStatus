/**
 * Authenticated signaling transport adapter.
 *
 * This module is intentionally not wired into the production userscript yet.
 * The caller must supply a request function that sends the UpStatus session
 * token in x-upstatus-token. Keep enabled=false until authenticated E2E tests
 * prove the invite/accept/offer state machine against isolated test identities.
 */
export function createSignalingTransport({
  request,
  enabled = false,
  pollIntervalMs = 900,
  maxBackoffMs = 8000,
  now = () => Date.now(),
} = {}) {
  if (typeof request !== "function") throw new TypeError("request must be a function");

  let stopped = false;
  const activePolls = new Map();
  const seenByRoom = new Map();

  function assertEnabled() {
    if (!enabled) {
      const error = new Error("Authenticated signaling transport is disabled");
      error.code = "SIGNALING_TRANSPORT_DISABLED";
      throw error;
    }
    if (stopped) {
      const error = new Error("Authenticated signaling transport has been stopped");
      error.code = "SIGNALING_TRANSPORT_STOPPED";
      throw error;
    }
  }

  async function post(path, payload = {}, options = {}) {
    assertEnabled();
    const result = await request(path, payload, options);
    if (!result || typeof result !== "object") throw new Error("Invalid signaling response");
    const status = Number(result.status ?? 200);
    const body = result.body ?? result.data ?? {};
    if (status < 200 || status >= 300) {
      const error = new Error(typeof body.error === "string" ? body.error : `Signaling request failed (${status})`);
      error.status = status;
      error.code = body.error || "SIGNALING_REQUEST_FAILED";
      throw error;
    }
    return body;
  }

  function validId(value, label) {
    if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(value)) {
      throw new TypeError(`Invalid ${label}`);
    }
    return value;
  }

  async function createRoom(participants = []) {
    if (!Array.isArray(participants) || participants.length > 31 ||
        participants.some(name => typeof name !== "string" || !name || name.length > 80)) {
      throw new TypeError("Invalid room participants");
    }
    return post("/room/create", { participants: [...new Set(participants)] });
  }

  async function bindRoom({ roomId, bindingType, logicalId }) {
    validId(logicalId, "logical room ID");
    if (!["call", "voice", "screen"].includes(bindingType)) throw new TypeError("Invalid binding type");
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) throw new TypeError("Invalid room ID");
    return post("/room/bind", { roomId, bindingType, logicalId });
  }

  async function resolveRoom({ bindingType, logicalId }) {
    validId(logicalId, "logical room ID");
    if (!["call", "voice", "screen"].includes(bindingType)) throw new TypeError("Invalid binding type");
    return post("/room/resolve", { bindingType, logicalId });
  }

  async function invite(roomId, recipient) {
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) throw new TypeError("Invalid room ID");
    if (typeof recipient !== "string" || !recipient || recipient.length > 80) throw new TypeError("Invalid recipient");
    return post("/room/invite", { roomId, recipient });
  }

  async function roomStatus(roomId) {
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) throw new TypeError("Invalid room ID");
    const result = await post("/room/status", { roomId });
    return Array.isArray(result.participants) ? result.participants : [];
  }

  async function invitations() {
    const result = await post("/room/invitations");
    return Array.isArray(result.invitations) ? result.invitations : [];
  }

  async function accept(roomId) {
    if (typeof roomId !== "string" || !roomId) throw new TypeError("Invalid room ID");
    return post("/room/accept", { roomId });
  }

  async function decline(roomId) {
    if (typeof roomId !== "string" || !roomId) throw new TypeError("Invalid room ID");
    return post("/room/decline", { roomId });
  }

  async function sendSignal({ roomId, recipient, eventType, payload }) {
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) throw new TypeError("Invalid room ID");
    if (typeof recipient !== "string" || !recipient || recipient.length > 80) throw new TypeError("Invalid recipient");
    if (typeof eventType !== "string" || !eventType || eventType.length > 40) throw new TypeError("Invalid event type");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("Invalid signaling payload");
    return post("/signal", { roomId, recipient, eventType, payload });
  }

  async function poll(roomId, options = {}) {
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) throw new TypeError("Invalid room ID");
    const result = await post("/poll", { roomId }, options);
    return Array.isArray(result.events) ? result.events : [];
  }

  async function ack(roomId, eventIds) {
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) throw new TypeError("Invalid room ID");
    if (!Array.isArray(eventIds) || !eventIds.length || eventIds.length > 100 ||
        eventIds.some(id => !Number.isSafeInteger(Number(id)) || Number(id) <= 0)) {
      throw new TypeError("Invalid event IDs");
    }
    return post("/ack", { roomId, eventIds: [...new Set(eventIds.map(Number))] });
  }

  async function close(roomId) {
    if (typeof roomId !== "string" || !roomId) throw new TypeError("Invalid room ID");
    return post("/room/close", { roomId });
  }

  function stopPolling(roomId) {
    const poller = activePolls.get(roomId);
    if (!poller) return;
    poller.cancelled = true;
    if (poller.timer) clearTimeout(poller.timer);
    if (poller.controller) poller.controller.abort();
    activePolls.delete(roomId);
  }

  function stopAll() {
    stopped = true;
    for (const roomId of [...activePolls.keys()]) stopPolling(roomId);
  }

  function startPolling(roomId, onEvent, { signal, intervalMs = pollIntervalMs } = {}) {
    assertEnabled();
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) throw new TypeError("Invalid room ID");
    if (typeof onEvent !== "function") throw new TypeError("onEvent must be a function");
    stopPolling(roomId);
    const state = { cancelled: false, timer: null, controller: null, backoff: intervalMs };
    activePolls.set(roomId, state);
    if (!seenByRoom.has(roomId)) seenByRoom.set(roomId, new Set());
    const seen = seenByRoom.get(roomId);

    const finish = () => {
      state.cancelled = true;
      if (state.timer) clearTimeout(state.timer);
      if (state.controller) state.controller.abort();
      if (activePolls.get(roomId) === state) activePolls.delete(roomId);
    };
    if (signal) {
      if (signal.aborted) { finish(); return finish; }
      signal.addEventListener("abort", finish, { once: true });
    }

    const schedule = delay => {
      if (!state.cancelled && activePolls.get(roomId) === state) {
        state.timer = setTimeout(run, Math.max(0, delay));
      }
    };

    const run = async () => {
      if (state.cancelled || activePolls.get(roomId) !== state) return;
      state.controller = new AbortController();
      try {
        const events = await poll(roomId, { signal: state.controller.signal });
        const ackIds = [];
        for (const event of events) {
          const id = Number(event && event.event_id);
          if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) {
            if (Number.isSafeInteger(id) && id > 0) ackIds.push(id);
            continue;
          }
          // Mark only after successful handling; failed handlers must be retried.
          await onEvent(event);
          seen.add(id);
          ackIds.push(id);
        }
        if (seen.size > 2000) {
          const keep = [...seen].slice(-1000);
          seen.clear();
          keep.forEach(id => seen.add(id));
        }
        if (ackIds.length) {
          for (let i = 0; i < ackIds.length; i += 100) {
            await ack(roomId, ackIds.slice(i, i + 100));
          }
        }
        state.backoff = intervalMs;
        schedule(intervalMs);
      } catch (error) {
        if (error && (error.name === "AbortError" || error.code === "SIGNALING_TRANSPORT_STOPPED")) {
          finish();
          return;
        }
        state.backoff = Math.min(maxBackoffMs, Math.max(intervalMs, state.backoff * 2));
        schedule(state.backoff);
      } finally {
        state.controller = null;
      }
    };
    run();
    return finish;
  }

  return Object.freeze({
    createRoom, bindRoom, resolveRoom, invite, invitations, roomStatus, accept, decline,
    sendSignal, poll, ack, close, startPolling, stopPolling, stopAll,
    get enabled() { return enabled; },
    get activePollCount() { return activePolls.size; },
    get now() { return now(); },
  });
}
