/**
 * Authenticated signaling transport adapter.
 *
 * This module is bundled into the userscript and connected to an opt-in caller.
 * The caller supplies a same-origin HTTPS GM_xmlhttpRequest bridge that sends
 * the UpStatus session token in x-upstatus-token. The feature flag remains
 * disabled by default; do not enable for users until authenticated browser/WebRTC
 * E2E tests prove explicit call invitation/acceptance and open voice-room membership.
 */
/**
 * Public Realtime is only an untrusted call-directory discovery hint while
 * server-mediated signaling is enabled. No call-control event may use this path.
 */
export function isAllowedPublicCallDiscoverySignal(signal) {
  return !!signal && typeof signal === "object" && !Array.isArray(signal) &&
    Object.prototype.hasOwnProperty.call(signal, "type") &&
    Object.prototype.hasOwnProperty.call(signal, "discoveryOnly") &&
    (signal.type === "presence" || signal.type === "ended") && signal.discoveryOnly === true;
}

export function createSignalingTransport({
  request,
  enabled = false,
  pollIntervalMs = 900,
  maxBackoffMs = 8000,
  now = () => Date.now(),
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
} = {}) {
  if (typeof request !== "function") throw new TypeError("request must be a function");

  function readResponseHeader(headers, name) {
    const target = String(name).toLowerCase();
    if (typeof headers === "string") {
      const line = headers.split(/\r?\n/).find(entry => {
        const separator = entry.indexOf(":");
        return separator > 0 && entry.slice(0, separator).trim().toLowerCase() === target;
      });
      return line ? line.slice(line.indexOf(":") + 1).trim() : "";
    }
    if (headers && typeof headers === "object") {
      const key = Object.keys(headers).find(entry => entry.toLowerCase() === target);
      if (!key) return "";
      const value = headers[key];
      return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
    }
    return "";
  }

  function parseRetryAfter(headers, currentTime) {
    const value = readResponseHeader(headers, "retry-after");
    if (!value) return null;
    const maxDelayMs = 2_147_483_647;
    if (/^\d+(?:\.\d+)?$/.test(value)) {
      const delay = Number(value) * 1000;
      return Number.isFinite(delay) ? Math.min(delay, maxDelayMs) : null;
    }
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return null;
    return Math.min(Math.max(0, timestamp - currentTime), maxDelayMs);
  }

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
    const headers = result.headers ?? result.responseHeaders ?? null;
    if (status < 200 || status >= 300) {
      const message = body.error === "VOICE_ATTEMPT_ALREADY_ACTIVE"
        ? "Esta conta já possui uma tentativa de sala de voz ativa em outra aba."
        : typeof body.error === "string" ? body.error : `Signaling request failed (${status})`;
      const error = new Error(message);
      error.status = status;
      error.code = body.error || "SIGNALING_REQUEST_FAILED";
      const retryAfterMs = parseRetryAfter(headers, now());
      if (retryAfterMs !== null) {
        error.retryAfterMs = retryAfterMs;
        error.retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      }
      throw error;
    }
    return body;
  }

  function createSignalIdempotencyKey() {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function")
      throw new Error("Secure randomness is required for signaling idempotency");
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  }

  function resolveSignalIdempotencyKey(value) {
    if (value === undefined || value === null || value === "") return createSignalIdempotencyKey();
    if (typeof value !== "string" || !/^[0-9a-f]{32}$/.test(value))
      throw new TypeError("Invalid signaling idempotency key");
    return value;
  }

  async function postIdempotent(path, payload, idempotencyKey) {
    try {
      return await post(path, { ...payload, idempotencyKey });
    } catch (error) {
      if (error && typeof error === "object") {
        try { error.idempotencyKey = idempotencyKey; } catch {}
      }
      throw error;
    }
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

  async function openVoiceRoom(logicalId, attemptId) {
    if (!["upstatus-team-room-v1", "upstatus-team-lite-room-v1"].includes(logicalId)) {
      throw new TypeError("Invalid voice room logical ID");
    }
    const payload = { logicalId };
    if (attemptId !== undefined && attemptId !== null && attemptId !== "") {
      validId(attemptId, "voice room attempt ID");
      payload.attemptId = attemptId;
    }
    const result = await post("/room/open", payload);
    if (!result || typeof result.roomId !== "string" || !result.roomId) {
      throw new Error("Open voice room returned no room ID");
    }
    return result;
  }

  async function cancelVoiceRoomOpen(logicalId, attemptId, options = {}) {
    if (!["upstatus-team-room-v1", "upstatus-team-lite-room-v1"].includes(logicalId)) {
      throw new TypeError("Invalid voice room logical ID");
    }
    validId(attemptId, "voice room attempt ID");
    return post("/room/cancel-open", { logicalId, attemptId }, options);
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

  async function roomMembers(roomId) {
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) throw new TypeError("Invalid room ID");
    const result = await post("/room/members", { roomId });
    return Array.isArray(result.members) ? result.members.filter(name => typeof name === "string" && name.length <= 80) : [];
  }

  async function roomStatus(roomId, options = {}) {
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) throw new TypeError("Invalid room ID");
    const result = await post("/room/status", { roomId }, options);
    return Array.isArray(result.participants) ? result.participants : [];
  }

  async function waitForAcceptance(roomId, recipient, {
    timeoutMs = 60_000,
    intervalMs = 900,
    signal,
  } = {}) {
    if (typeof recipient !== "string" || !recipient || recipient.length > 80) throw new TypeError("Invalid recipient");
    const deadline = now() + Math.max(0, timeoutMs);
    while (now() <= deadline) {
      if (signal?.aborted) {
        const error = new Error("Invitation wait aborted");
        error.name = "AbortError";
        throw error;
      }
      const participants = await roomStatus(roomId, { signal });
      const participant = participants.find(item => item && item.name === recipient);
      if (!participant) {
        const error = new Error("Invitee is not a member of this room");
        error.code = "SIGNALING_INVITEE_NOT_FOUND";
        throw error;
      }
      if (participant.status === "accepted") return participant;
      if (participant.status === "declined") {
        const error = new Error("Invitation was declined");
        error.code = "SIGNALING_INVITATION_DECLINED";
        throw error;
      }
      if (participant.status !== "pending") {
        const error = new Error("Unexpected invitation state");
        error.code = "SIGNALING_INVITATION_STATE_INVALID";
        throw error;
      }
      await new Promise((resolve, reject) => {
        if (signal?.aborted) {
          const error = new Error("Invitation wait aborted");
          error.name = "AbortError";
          reject(error);
          return;
        }
        const onAbort = () => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          const error = new Error("Invitation wait aborted");
          error.name = "AbortError";
          reject(error);
        };
        const timer = setTimeout(() => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        }, Math.min(intervalMs, Math.max(0, deadline - now())));
        if (signal) signal.addEventListener("abort", onAbort, { once: true });
      });
    }
    const error = new Error("Timed out waiting for invitation acceptance");
    error.code = "SIGNALING_INVITATION_TIMEOUT";
    throw error;
  }

  async function requestInvite(logicalId, options = {}) {
    validId(logicalId, "logical call ID");
    const idempotencyKey = resolveSignalIdempotencyKey(options.idempotencyKey);
    return postIdempotent("/room/request-invite", { bindingType: "call", logicalId }, idempotencyKey);
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

  async function sendSignal({ roomId, recipient, eventType, payload, idempotencyKey }) {
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) throw new TypeError("Invalid room ID");
    if (typeof recipient !== "string" || !recipient || recipient.length > 80) throw new TypeError("Invalid recipient");
    if (typeof eventType !== "string" || !eventType || eventType.length > 40) throw new TypeError("Invalid event type");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("Invalid signaling payload");
    const key = resolveSignalIdempotencyKey(idempotencyKey);
    return postIdempotent("/signal", { roomId, recipient, eventType, payload }, key);
  }

  async function sendToRoom({ roomId, eventType, payload, senderName, idempotencyKey }) {
    if (typeof senderName !== "string" || !senderName || senderName.length > 80)
      throw new TypeError("Invalid sender name");
    const key = resolveSignalIdempotencyKey(idempotencyKey);
    const result = await postIdempotent("/broadcast", { roomId, eventType, payload }, key);
    const attempted = Number(result.attempted) || 0;
    const delivered = Number(result.delivered) || 0;
    return { attempted, delivered, failed: Math.max(0, attempted - delivered), duplicate: result.duplicate === true };
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

  async function prepareCallRoom(logicalId, recipient, options = {}) {
    validId(logicalId, "logical call ID");
    if (typeof recipient !== "string" || !recipient || recipient.length > 80)
      throw new TypeError("Invalid recipient");
    try {
      const created = await post("/room/prepare-call", { logicalId, recipient }, options);
      const roomId = created.roomId;
      if (typeof roomId !== "string" || !roomId) throw new Error("Call preparation returned no room ID");
      await waitForAcceptance(roomId, recipient, options);
      return { roomId, logicalId, recipient };
    } catch (error) {
      // Cancellation is keyed by the logical call ID, not the room ID. This also
      // handles a prepare response lost after the server committed the room.
      try { await cancelCallRoom(logicalId); } catch {}
      throw error;
    }
  }

  async function cancelCallRoom(logicalId, options = {}) {
    validId(logicalId, "logical call ID");
    return post("/room/cancel-call", { logicalId }, options);
  }

  async function leave(roomId) {
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) throw new TypeError("Invalid room ID");
    const terminalCodes = new Set(["ROOM_UNAVAILABLE", "ROOM_MEMBERSHIP_ENDED"]);
    const alreadyGone = value => {
      const code = value && (typeof value.code === "string" ? value.code :
        typeof value.error === "string" ? value.error : "");
      return terminalCodes.has(code) ? code : "";
    };
    try {
      const result = await post("/room/leave", { roomId });
      const code = alreadyGone(result);
      return code ? { ok: true, alreadyGone: true, code } : result;
    } catch (error) {
      const code = alreadyGone(error);
      if (code) return { ok: true, alreadyGone: true, code };
      throw error;
    }
  }

  async function close(roomId) {
    if (typeof roomId !== "string" || !roomId) throw new TypeError("Invalid room ID");
    return post("/room/close", { roomId });
  }

  function stopPolling(roomId) {
    const poller = activePolls.get(roomId);
    if (!poller) return;
    poller.cancelled = true;
    if (poller.timer) clearTimeoutFn(poller.timer);
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
    const state = { cancelled: false, timer: null, controller: null, backoff: intervalMs, externalAbortHandler: null };
    activePolls.set(roomId, state);
    if (!seenByRoom.has(roomId)) seenByRoom.set(roomId, new Set());
    const seen = seenByRoom.get(roomId);

    const finish = () => {
      state.cancelled = true;
      if (state.timer) clearTimeoutFn(state.timer);
      if (state.controller) state.controller.abort();
      if (signal && state.externalAbortHandler) signal.removeEventListener("abort", state.externalAbortHandler);
      if (activePolls.get(roomId) === state) activePolls.delete(roomId);
    };
    if (signal) {
      if (signal.aborted) { finish(); return finish; }
      state.externalAbortHandler = finish;
      signal.addEventListener("abort", state.externalAbortHandler, { once: true });
    }

    const schedule = delay => {
      if (!state.cancelled && activePolls.get(roomId) === state) {
        state.timer = setTimeoutFn(run, Math.max(0, delay));
      }
    };

    const run = async () => {
      if (state.cancelled || activePolls.get(roomId) !== state) return;
      state.controller = new AbortController();
      try {
        const events = await poll(roomId, { signal: state.controller.signal });
        if (state.cancelled || activePolls.get(roomId) !== state) return;
        const ackIds = [];
        for (const event of events) {
          if (state.cancelled || activePolls.get(roomId) !== state) return;
          const id = Number(event && event.event_id);
          if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) {
            if (Number.isSafeInteger(id) && id > 0) ackIds.push(id);
            continue;
          }
          // Mark only after successful handling; failed handlers must be retried.
          await onEvent(event);
          if (state.cancelled || activePolls.get(roomId) !== state) return;
          seen.add(id);
          ackIds.push(id);
        }
        if (seen.size > 2000) {
          const keep = [...seen].slice(-1000);
          seen.clear();
          keep.forEach(id => seen.add(id));
        }
        if (state.cancelled || activePolls.get(roomId) !== state) return;
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
        const exponentialBackoff = Math.min(maxBackoffMs, Math.max(intervalMs, state.backoff * 2));
        const retryAfterMs = Number(error && error.retryAfterMs);
        state.backoff = Number.isFinite(retryAfterMs) && retryAfterMs > 0
          ? Math.max(exponentialBackoff, retryAfterMs)
          : exponentialBackoff;
        schedule(state.backoff);
      } finally {
        state.controller = null;
      }
    };
    run();
    return finish;
  }

  return Object.freeze({
    createRoom, openVoiceRoom, cancelVoiceRoomOpen, bindRoom, resolveRoom, invite, requestInvite, invitations, roomStatus, roomMembers, waitForAcceptance, accept, decline,
    sendSignal, sendToRoom, poll, ack, leave, close, prepareCallRoom, cancelCallRoom, startPolling, stopPolling, stopAll,
    get enabled() { return enabled; },
    get activePollCount() { return activePolls.size; },
    get now() { return now(); },
  });
}
