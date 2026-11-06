// ==UserScript==
// @name         UpStatus Team Lite - Sale Smartly
// @namespace    upseller-team-lite
// @version      3.4.31
// @match        *://*.salesmartly.com/*
// @match        *://salesmartly.com/*
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @updateURL    https://raw.githubusercontent.com/Reekyi/UpStatus/team-lite-official/team-lite/upstatus-team-lite.user.js
// @downloadURL  https://raw.githubusercontent.com/Reekyi/UpStatus/team-lite-official/team-lite/upstatus-team-lite.user.js
// @connect      *
// ==/UserScript==
(function () {
  'use strict';
/**
 * Authenticated signaling transport adapter.
 *
 * This module is bundled into the userscript and connected to an opt-in caller.
 * The caller supplies a same-origin HTTPS GM_xmlhttpRequest bridge that sends
 * the UpStatus session token in x-upstatus-token. The feature flag remains
 * disabled by default; do not enable for users until authenticated browser/WebRTC
 * E2E tests prove explicit call invitation/acceptance and open voice-room membership.
 */
function createSignalingTransport({
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

  async function openVoiceRoom(logicalId) {
    if (!["upstatus-team-room-v1", "upstatus-team-lite-room-v1"].includes(logicalId)) {
      throw new TypeError("Invalid voice room logical ID");
    }
    const result = await post("/room/open", { logicalId });
    if (!result || typeof result.roomId !== "string" || !result.roomId) {
      throw new Error("Open voice room returned no room ID");
    }
    return result;
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

  async function requestInvite(logicalId) {
    validId(logicalId, "logical call ID");
    return post("/room/request-invite", { bindingType: "call", logicalId });
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

  async function sendToRoom({ roomId, eventType, payload, senderName }) {
    if (typeof senderName !== "string" || !senderName || senderName.length > 80)
      throw new TypeError("Invalid sender name");
    const result = await post("/broadcast", { roomId, eventType, payload });
    const attempted = Number(result.attempted) || 0;
    const delivered = Number(result.delivered) || 0;
    return { attempted, delivered, failed: Math.max(0, attempted - delivered) };
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
    const state = { cancelled: false, timer: null, controller: null, backoff: intervalMs, externalAbortHandler: null };
    activePolls.set(roomId, state);
    if (!seenByRoom.has(roomId)) seenByRoom.set(roomId, new Set());
    const seen = seenByRoom.get(roomId);

    const finish = () => {
      state.cancelled = true;
      if (state.timer) clearTimeout(state.timer);
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
        state.timer = setTimeout(run, Math.max(0, delay));
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
    createRoom, openVoiceRoom, bindRoom, resolveRoom, invite, requestInvite, invitations, roomStatus, roomMembers, waitForAcceptance, accept, decline,
    sendSignal, sendToRoom, poll, ack, leave, close, prepareCallRoom, cancelCallRoom, startPolling, stopPolling, stopAll,
    get enabled() { return enabled; },
    get activePollCount() { return activePolls.size; },
    get now() { return now(); },
  });
}


(function(){function install(){if(document.getElementById('upstatus-3-1-5-voice-visual-fixes'))return;var style=document.createElement('style');style.id='upstatus-3-1-5-voice-visual-fixes';style.textContent="#upstatus-team-lite-root .up-voice-person{position:relative!important;display:inline-flex!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;width:auto!important;height:auto!important;min-width:0!important;min-height:34px!important;max-width:100%!important;box-sizing:border-box!important;padding:4px 10px 4px 5px!important;border:1px solid #34445a!important;border-radius:999px!important;background:#1b2738!important;color:#e4edf8!important;overflow:visible!important;white-space:nowrap!important;flex:0 1 auto!important;font-size:10px!important;line-height:1.2!important;cursor:default!important;transition:border-color .18s,box-shadow .18s,background .18s!important}#upstatus-team-lite-root .up-voice-avatar{display:block!important;flex:0 0 30px!important;width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;border-radius:50%!important;object-fit:cover!important;border:1px solid #526783!important;box-sizing:border-box!important}#upstatus-team-lite-root .up-voice-person b{display:block!important;max-width:180px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:11px!important;font-weight:750!important;line-height:1.2!important}#upstatus-team-lite-root .up-voice-person.is-speaking{background:#183a65!important;border-color:#4f9bff!important;box-shadow:0 0 0 2px rgba(79,155,255,.16)!important;animation:upStatusVoiceChipSpeaking .8s ease-in-out infinite!important}#upstatus-team-lite-root .up-voice-person.is-muted{border-color:#ff596d!important;background:rgba(120,20,40,.12)!important;box-shadow:0 0 0 2px rgba(255,89,109,.2)!important}#upstatus-team-lite-root .up-voice-person .up-voice-status-muted{position:absolute!important;left:24px!important;top:-5px!important;transform:none!important;display:flex!important;align-items:center!important;justify-content:center!important;width:19px!important;height:19px!important;min-width:19px!important;min-height:19px!important;border:1px solid #ff9aa7!important;border-radius:50%!important;background:rgba(170,28,52,.98)!important;color:#fff!important;z-index:7!important;box-shadow:0 2px 8px #0008!important;pointer-events:none!important}#upstatus-team-lite-root .up-voice-person .up-voice-status-muted svg{width:12px!important;height:12px!important}@keyframes upStatusVoiceChipSpeaking{0%,100%{box-shadow:0 0 0 2px rgba(79,155,255,.13)}50%{box-shadow:0 0 0 3px rgba(79,155,255,.28),0 0 9px rgba(79,155,255,.24)}}#upstatus-team-lite-root.up-theme-light .up-voice-room{background:linear-gradient(135deg,#f7faff,#eaf2fc)!important;border-color:#c5d6ed!important;box-shadow:0 5px 15px rgba(38,68,112,.10)!important;color:#172033!important}#upstatus-team-lite-root.up-theme-light .up-voice-title{color:#172033!important}#upstatus-team-lite-root.up-theme-light .up-voice-title .up-icon{color:#334155!important}#upstatus-team-lite-root.up-theme-light .up-voice-state,#upstatus-team-lite-root.up-theme-light .up-voice-connection,#upstatus-team-lite-root.up-theme-light .up-voice-duration,#upstatus-team-lite-root.up-theme-light .up-voice-message,#upstatus-team-lite-root.up-theme-light .up-voice-empty{color:#52647c!important}#upstatus-team-lite-root.up-theme-light .up-voice-connection.is-connected{color:#07875a!important}#upstatus-team-lite-root.up-theme-light .up-voice-connection.is-connecting{color:#ad6700!important}#upstatus-team-lite-root.up-theme-light .up-voice-participants{color:#233047!important}#upstatus-team-lite-root.up-theme-light .up-voice-person{background:#fff!important;border-color:#c5d4e6!important;color:#233047!important;box-shadow:0 1px 2px rgba(20,40,70,.06)!important}#upstatus-team-lite-root.up-theme-light .up-voice-person.is-speaking{background:#e4f1ff!important;border-color:#3b82f6!important;box-shadow:0 0 0 2px rgba(59,130,246,.14)!important}#upstatus-team-lite-root.up-theme-light .up-voice-person.is-muted{background:#fff0f2!important;border-color:#e34b62!important}#upstatus-team-lite-root.up-theme-light .up-voice-avatar{border-color:#b8cce4!important}#upstatus-team-lite-root.up-theme-light .up-voice-actions button{background:#dbe6f4!important;border:1px solid #c5d4e6!important;color:#233047!important}#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-join{background:#18794e!important;border-color:#18794e!important;color:#fff!important}#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-mute.is-muted,#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-leave,#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-screen-share-toggle.is-sharing{background:#b4233d!important;border-color:#e34b62!important;color:#fff!important}#upstatus-team-lite-root.up-theme-light .up-voice-actions button:hover{filter:brightness(.97)}#upstatus-team-lite-root.up-theme-light .up-screen-share-panel{background:rgba(255,255,255,.72)!important;border-color:#c5d6ed!important;border-radius:12px!important}#upstatus-team-lite-root.up-theme-light .up-screen-share-heading{color:#172033!important}#upstatus-team-lite-root.up-theme-light .up-screen-share-status,#upstatus-team-lite-root.up-theme-light .up-screen-share-message{color:#52647c!important}#upstatus-team-lite-root.up-theme-light .up-screen-share-grid{color:#233047!important}#upstatus-team-lite-root.up-theme-light .up-screen-share-tile{background:#fff!important;border-color:#c5d6ed!important;color:#233047!important;box-shadow:0 2px 8px rgba(20,40,70,.06)!important}#upstatus-team-lite-root.up-theme-light .up-screen-share-tile *{color:inherit}#upstatus-team-lite-root.up-theme-light .up-screen-share-tile video{background:#e2e8f0!important}#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble{background:rgba(246,249,253,.97)!important;border-color:#c7d5e5!important;box-shadow:0 7px 20px rgba(25,40,60,.18)!important}#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble>button:not(.up-voice-control-leave):not(.is-muted){background:#dbe6f4!important;color:#233047!important;border:1px solid #c5d4e6!important}#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble>button.is-muted,#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble>.up-voice-control-leave{background:#b4233d!important;border-color:#e34b62!important;color:#fff!important}";(document.head||document.documentElement).appendChild(style)}if(document.documentElement)install();else document.addEventListener('DOMContentLoaded',install,{once:true})})();
(function(){function install(){if(document.getElementById('upstatus-beta9-3-visual-fixes'))return;var style=document.createElement('style');style.id='upstatus-beta9-3-visual-fixes';style.textContent='#upstatus-team-lite-root .up-voice-person{position:relative!important;border:2px solid #526783!important;border-radius:50%!important;box-shadow:0 0 0 2px rgba(82,103,131,.16)!important;overflow:visible!important;transition:border-color .18s,box-shadow .18s!important}#upstatus-team-lite-root .up-voice-person.is-speaking{border-color:#4ade80!important;box-shadow:0 0 0 3px rgba(74,222,128,.24),0 0 14px rgba(74,222,128,.55)!important;animation:upBeta92Speaking .85s ease-in-out infinite!important}#upstatus-root .up-voice-mic-muted{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;display:flex!important;align-items:center!important;justify-content:center!important;width:20px!important;height:20px!important;border:1px solid #ff9aa7!important;border-radius:50%!important;background:rgba(120,20,40,.96)!important;color:#fff!important;z-index:5!important;box-shadow:0 2px 8px #0008!important}#upstatus-root .up-voice-mic-muted svg{width:13px!important;height:13px!important}@keyframes upBeta92Speaking{0%,100%{box-shadow:0 0 0 2px rgba(74,222,128,.18),0 0 7px rgba(74,222,128,.25)}50%{box-shadow:0 0 0 4px rgba(74,222,128,.34),0 0 17px rgba(74,222,128,.6)}}';style.textContent+='#upstatus-team-lite-root .up-voice-person.is-muted{border-color:#ff596d!important;background:rgba(120,20,40,.12)!important;box-shadow:0 0 0 2px rgba(255,89,109,.2)!important}#upstatus-team-lite-root .up-voice-person .up-voice-status-muted{position:absolute!important;left:24px!important;top:-5px!important;transform:none!important;display:flex!important;align-items:center!important;justify-content:center!important;width:19px!important;height:19px!important;border:1px solid #ff9aa7!important;border-radius:50%!important;background:rgba(170,28,52,.98)!important;color:#fff!important;z-index:7!important;box-shadow:0 2px 8px #0008!important;pointer-events:none!important}#upstatus-team-lite-root .up-voice-person .up-voice-status-muted svg{width:12px!important;height:12px!important}#upstatus-team-lite-root .up-voice-actions .up-voice-speakers.is-muted{background:#a9243b!important;border-color:#e34b62!important;color:#fff!important}';style.textContent+='.up-voice-control-bubble{position:fixed!important;right:24px!important;bottom:24px!important;left:auto!important;top:auto!important;padding:5px 7px!important;display:flex!important;align-items:center!important;gap:6px!important}.up-voice-control-bubble>button:not(.up-voice-control-restore){position:relative;display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;flex:0 0 38px;border:1px solid #405673;border-radius:11px;background:#2b3d54;color:#e5edf8;cursor:pointer;transition:background .18s,border-color .18s}.up-voice-control-bubble>button.is-muted{background:#a9243b!important;border:1px solid #e34b62!important;color:#fff!important}.up-voice-control-bubble .up-voice-control-leave{background:#a9243b!important;border-color:#e34b62!important;color:#fff!important}.up-voice-control-bubble .up-voice-control-restore{position:absolute!important;left:-8px!important;top:-10px!important;width:25px!important;height:25px!important;min-width:25px!important;flex:0 0 25px!important;border-radius:50%!important;background:#17865b!important;border:2px solid #83e6ba!important;color:#fff!important;z-index:12!important;box-shadow:0 2px 8px #0009!important}.up-voice-control-bubble .up-voice-control-restore.hidden{display:none!important}.up-voice-control-bubble .up-voice-control-restore svg{width:13px!important;height:13px!important}#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble>button:not(.up-voice-control-leave):not(.up-voice-control-restore):not(.is-muted){background:#dbe6f4;color:#233047}#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble>button.is-muted{background:#a9243b!important;border-color:#e34b62!important;color:#fff!important}#upstatus-team-lite-root .up-quick-chat-bubble{z-index:2147483647!important}#upstatus-team-lite-root .up-voice-control-bubble{z-index:8!important}';(document.head||document.documentElement).appendChild(style)}if(document.documentElement)install();else document.addEventListener('DOMContentLoaded',install,{once:true})})();

  // Team Lite não usa o launcher de recuperação herdado do UpStatus oficial.


  var key='upstatus_team_lite_';
  var faviconState={link:null,originalHref:'',originalData:'',blinkTimer:null,on:false};
  var CLOUD_SERVER='https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-team-lite';
  var server=CLOUD_SERVER;
  var UP_REALTIME_URL='https://dlfvkawaiqduhlazsszm.supabase.co';
  var UP_REALTIME_KEY='sb_publishable_qoML52WUyBQRMB6DLP1yjw_J0Pbaae_';
  var UP_REALTIME_TOPIC='upstatus-screen-share-live-3-1-1-beta10';
  var realtimeClient=null,realtimeChannel=null,realtimeActive=false,realtimeRetryTimer=null;
  // Novo motor de chamadas: WebRTC para áudio + Supabase Realtime somente para sinalização.
  // Mantido isolado do chat, status e demais recursos do UpStatus.
  var upCall={pc:null,localStream:null,remoteStream:null,audio:null,audioCtx:null,audioSource:null,audioGain:null,overlay:null,callId:'',peer:'',role:'',initiator:'',participants:[],pendingInvites:{},pendingOffers:{},pendingInvite:null,peers:{},active:false,starting:false,startAttempt:0,connected:false,muted:false,timer:null,counterTimer:null,startedAt:0,waitingForConnection:false,notice:'',ringtoneTimer:null,ringtoneCtx:null,ringtoneAllowed:false,ringtoneLoadId:0,ringtoneSource:null,ringtoneGain:null,presenceTimer:null};
  
var upCallDirectory={};
var voiceControlBubble=null,voiceControlAvatar=null,voiceControlWave=null,voiceControlSpeakerName=''; var voiceRoom={id:'upstatus-team-room-v1',seenSignals:{},sessionId:'vr-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),active:false,muted:false,speakersMuted:false,stream:null,peers:{},participants:{},timer:null,joining:false,audioContext:null,levelTimer:null,sessionStartedAt:0,sessionTimer:null,pingTimer:null,pingMs:null,lastSpeaker:'',currentSpeaker:'',recoveryAttempts:{},recoveryTimers:{}};
var VOICE_ROOM_EVENT='voice_room_signal';
  // Dedicated video mesh for screen sharing. Do not reuse voiceRoom.stream or audio peers.
  var SCREEN_ROOM_EVENT='upstatus_screen_signal_3_1_1_beta8';
  var screenShare={stream:null,peers:{},active:false,starting:false,sessionId:'ss-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),remoteVideos:{}};
  function screenShareSend(type,to,data){var payload=Object.assign({roomId:voiceRoom.id,type:type,from:member,to:to||'',active:screenShare.active,sessionId:screenShare.sessionId,at:Date.now()},data||{});if(signalTransportFlag){if(!signalTransport||!signalVoiceRoomRoomId){screenShareMessage('Sinalização autenticada indisponível.');return false;}return (to?signalTransport.sendSignal({roomId:signalVoiceRoomRoomId,recipient:to,eventType:'screen_signal',payload:payload}):signalTransport.sendToRoom({roomId:signalVoiceRoomRoomId,eventType:'screen_signal',payload:payload,senderName:member})).catch(function(e){screenShareMessage(e.message||'Falha na sinalização autenticada.');return false;});}if(!realtimeActive||!realtimeChannel||!member)return false;try{realtimeChannel.send({type:'broadcast',event:SCREEN_ROOM_EVENT,payload:payload});return true;}catch(e){return false;}}
  function screenShareMessage(message){var el=card&&card.querySelector('.up-screen-share-message');if(el)el.textContent=message||'';}
  function screenShareExpand(expanded){var room=card&&card.querySelector('.up-voice-room'),panel=room&&room.querySelector('.up-screen-share-panel');if(!panel)return;panel.setAttribute('aria-hidden',expanded?'false':'true');panel.style.maxHeight=expanded?'520px':'0px';panel.style.opacity=expanded?'1':'0';panel.style.marginTop=expanded?'10px':'0';panel.style.paddingTop=expanded?'10px':'0';panel.style.paddingBottom=expanded?'10px':'0';panel.style.borderTopWidth=expanded?'1px':'0';}
  function screenShareOpenViewer(tile,video){if(!tile||!video||document.querySelector('.up-screen-viewer-overlay'))return;var overlay=document.createElement('div');overlay.className='up-screen-viewer-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Visualização ampliada do compartilhamento');var stage=document.createElement('div');stage.className='up-screen-viewer-stage';var close=document.createElement('button');close.type='button';close.className='up-screen-viewer-close';close.setAttribute('aria-label','Fechar visualização');close.title='Fechar (Esc)';close.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m18 6-12 12M6 6l12 12"/></svg>';var previousFocus=document.activeElement;var parent=video.parentNode,next=video.nextSibling;stage.appendChild(video);stage.appendChild(close);overlay.appendChild(stage);function cleanup(){document.removeEventListener('keydown',onKey,true);if(overlay.parentNode)overlay.parentNode.removeChild(overlay);if(parent){if(next&&next.parentNode===parent)parent.insertBefore(video,next);else parent.appendChild(video);}try{if(previousFocus&&previousFocus.isConnected&&previousFocus.focus)previousFocus.focus({preventScroll:true});}catch(e){}}function onKey(e){if(e.key==='Escape'){e.preventDefault();cleanup();}}close.onclick=function(e){e.preventDefault();e.stopPropagation();cleanup();};overlay.addEventListener('click',function(e){if(e.target===overlay)cleanup();});document.addEventListener('keydown',onKey,true);document.body.appendChild(overlay);try{close.focus({preventScroll:true});}catch(e){}}
function screenShareRender(){var room=card&&card.querySelector('.up-voice-room');var remote=Object.keys(screenShare.remoteVideos);if(!room)return;var btn=room.querySelector('.up-screen-share-toggle'),status=room.querySelector('.up-screen-share-status'),grid=room.querySelector('.up-screen-share-grid');if(btn){btn.classList.toggle('hidden',!voiceRoom.active);btn.classList.toggle('is-sharing',screenShare.active);btn.disabled=screenShare.starting;btn.title=screenShare.starting?'Preparando compartilhamento':screenShare.active?'Parar compartilhamento de tela':'Compartilhar tela';btn.setAttribute('aria-label',btn.title);btn.setAttribute('aria-pressed',screenShare.active?'true':'false');}if(status)status.textContent=screenShare.active?'Sua tela está sendo compartilhada':remote.length?'Tela compartilhada por '+remote.join(', '):'Compartilhamento de tela e janela';if(grid){grid.querySelectorAll('[data-screen-remote]').forEach(function(el){if(!screenShare.remoteVideos[el.getAttribute('data-screen-remote')])el.remove();});remote.forEach(function(name){var tile=Array.from(grid.querySelectorAll('[data-screen-remote]')).find(function(el){return el.getAttribute('data-screen-remote')===name;}),video=tile&&tile.querySelector('video');if(!tile){tile=document.createElement('div');tile.className='up-screen-share-tile';tile.setAttribute('data-screen-remote',name);var label=document.createElement('div');label.className='up-screen-share-label';label.textContent=name;video=document.createElement('video');video.autoplay=true;video.playsInline=true;video.muted=true;video.setAttribute('playsinline','');tile.append(label,video);grid.appendChild(tile);}if(video.srcObject!==screenShare.remoteVideos[name])video.srcObject=screenShare.remoteVideos[name];});if(screenShare.active&&screenShare.stream){var local=grid.querySelector('[data-screen-local]');if(!local){local=document.createElement('div');local.className='up-screen-share-tile';local.setAttribute('data-screen-local','1');var label=document.createElement('div');label.className='up-screen-share-label';label.textContent='Sua tela';var video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.setAttribute('playsinline','');local.append(label,video);grid.prepend(local);}var lv=local.querySelector('video');if(lv.srcObject!==screenShare.stream)lv.srcObject=screenShare.stream;}else{var local=grid.querySelector('[data-screen-local]');if(local)local.remove();}}grid.querySelectorAll('.up-screen-share-tile').forEach(function(tile){var video=tile.querySelector('video'),expand=tile.querySelector('.up-screen-share-fullscreen');if(video&&!expand){expand=document.createElement('button');expand.type='button';expand.className='up-screen-share-fullscreen';expand.title='Ampliar compartilhamento';expand.setAttribute('aria-label','Ampliar compartilhamento');expand.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/></svg>';expand.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();screenShareOpenViewer(tile,video)});tile.appendChild(expand)}});screenShareExpand(screenShare.active||screenShare.starting||remote.length>0);}
  function screenShareDrop(name){var p=screenShare.peers[name];if(!p)return;delete screenShare.peers[name];try{if(p.pc){p.pc.ontrack=null;p.pc.onicecandidate=null;p.pc.onconnectionstatechange=null;p.pc.close();}}catch(e){}}
  async function screenShareMakePeer(name){var p=screenShare.peers[name];if(p&&p.pc&&p.pc.signalingState!=='closed')return p;p=p||{pc:null,pending:[],stream:new MediaStream()};p.pending=p.pending||[];p.stream=p.stream||new MediaStream();p.pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});screenShare.peers[name]=p;p.pc.onicecandidate=function(e){if(e.candidate)screenShareSend('ice',name,{candidate:e.candidate});};p.pc.ontrack=function(e){var track=e.track;if(!track)return;if(!p.stream.getTracks().some(function(t){return t.id===track.id;})){p.stream.addTrack(track);track.addEventListener('ended',function(){var peer=screenShare.peers[name];if(!peer||peer.stream!==p.stream)return;delete screenShare.remoteVideos[name];screenShareDrop(name);screenShareRender();});}screenShare.remoteVideos[name]=p.stream;screenShareRender();};p.pc.onconnectionstatechange=function(){if(!p.pc||screenShare.peers[name]!==p)return;if(['failed','closed'].indexOf(p.pc.connectionState)>=0){delete screenShare.remoteVideos[name];screenShareDrop(name);screenShareRender();}};if(screenShare.active&&screenShare.stream)screenShare.stream.getVideoTracks().forEach(function(t){if(t.readyState==='live')p.pc.addTrack(t,screenShare.stream);});return p;}
  async function screenShareOffer(name){if(!screenShare.active)return;var p=await screenShareMakePeer(name);if(p.pc.signalingState!=='stable'||p.pc.localDescription)return;var offer=await p.pc.createOffer();await p.pc.setLocalDescription(offer);screenShareSend('offer',name,{sdp:p.pc.localDescription});}
  async function screenShareReceive(p){if(!p||p.roomId!==voiceRoom.id||typeof p.from!=='string'||!p.from||p.from.length>80||p.from===member||p.to&&p.to!==member)return;if((p.type==='offer'||p.type==='answer'||p.type==='ice')&&p.to!==member)return;if((p.type==='offer'||p.type==='answer')&&(!p.sdp||typeof p.sdp.sdp!=='string'||p.sdp.sdp.length>100000))return;if(p.type==='ice'&&(!p.candidate||JSON.stringify(p.candidate).length>4096))return;if(p.type==='presence'){if(p.active){screenShareSend('presence',p.from,{});if(screenShare.active)screenShareOffer(p.from).catch(function(){});}else{delete screenShare.remoteVideos[p.from];screenShareDrop(p.from);screenShareRender();}return;}if(p.type==='leave'){delete screenShare.remoteVideos[p.from];screenShareDrop(p.from);screenShareRender();return;}if(p.type==='offer'&&p.sdp){try{var existing=screenShare.peers[p.from];if(existing&&existing.pc&&['failed','closed'].indexOf(existing.pc.connectionState)>=0)screenShareDrop(p.from);var peer=await screenShareMakePeer(p.from);if(peer.pc.remoteDescription&&peer.pc.remoteDescription.sdp===p.sdp.sdp)return;await peer.pc.setRemoteDescription(new RTCSessionDescription(p.sdp));while(peer.pending.length)await peer.pc.addIceCandidate(peer.pending.shift());var answer=await peer.pc.createAnswer();await peer.pc.setLocalDescription(answer);screenShareSend('answer',p.from,{sdp:peer.pc.localDescription});}catch(e){screenShareMessage('Falha ao negociar a tela com '+p.from+': '+(e.message||e));}return;}if(p.type==='answer'&&p.sdp){var a=screenShare.peers[p.from];if(a&&a.pc&&!a.pc.remoteDescription){try{await a.pc.setRemoteDescription(new RTCSessionDescription(p.sdp));while(a.pending.length)await a.pc.addIceCandidate(a.pending.shift());}catch(e){screenShareMessage('Falha ao aceitar a tela de '+p.from+'.');}}return;}if(p.type==='ice'&&p.candidate){var ip=screenShare.peers[p.from];if(!ip){ip={pc:null,pending:[],stream:new MediaStream()};screenShare.peers[p.from]=ip;}var candidate=p.candidate instanceof RTCIceCandidate?p.candidate:new RTCIceCandidate(p.candidate);if(ip.pc&&ip.pc.remoteDescription){try{await ip.pc.addIceCandidate(candidate);}catch(e){}}else if(ip.pending.length<128)ip.pending.push(candidate);}}
  async function screenShareStart(){if(screenShare.active||screenShare.starting)return;screenShare.starting=true;screenShareRender();screenShareMessage('Selecione a tela ou janela que deseja compartilhar.');try{if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia)throw new Error('Este navegador não permite compartilhar a tela.');screenShare.stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:15,max:24}},audio:false});screenShare.active=true;screenShare.stream.getVideoTracks().forEach(function(track){track.onended=function(){screenShareStop(true);};});screenShareMessage('Compartilhamento ativo. Áudio do sistema desativado para evitar eco.');screenShareSend('presence','',{});Object.keys(voiceRoom.participants).forEach(function(n){if(n!==member)screenShareOffer(n).catch(function(){});});}catch(e){screenShare.active=false;try{if(screenShare.stream)screenShare.stream.getTracks().forEach(function(t){t.stop();});}catch(_){}screenShare.stream=null;screenShareMessage(e&&e.name==='NotAllowedError'?'Compartilhamento cancelado.':'Não foi possível iniciar: '+(e.message||e));}finally{screenShare.starting=false;screenShareRender();}}
  function screenShareStop(sendSignal){var wasActive=screenShare.active||screenShare.starting;screenShare.active=false;screenShare.starting=false;if(sendSignal!==false&&wasActive)screenShareSend('leave','',{active:false});try{if(screenShare.stream)screenShare.stream.getTracks().forEach(function(t){t.onended=null;t.stop();});}catch(e){}screenShare.stream=null;Object.keys(screenShare.peers).forEach(screenShareDrop);Object.keys(screenShare.remoteVideos).forEach(function(n){delete screenShare.remoteVideos[n];});var room=card&&card.querySelector('.up-voice-room');if(room){var grid=room.querySelector('.up-screen-share-grid');if(grid)grid.replaceChildren();}screenShareMessage('');screenShareRender();}
function voiceRoomSend(type,to,data){var payload=Object.assign({roomId:voiceRoom.id,type:type,from:member,to:to||'',active:voiceRoom.active,muted:voiceRoom.muted,speakersMuted:!!voiceRoom.speakersMuted,version:CURRENT_VERSION,sessionId:voiceRoom.sessionId,at:Date.now(),sessionStartedAt:voiceRoom.sessionStartedAt||0},data||{});if(signalTransportFlag){if(!signalTransport||!signalVoiceRoomRoomId){voiceRoomMessage('Sinalização autenticada indisponível.');return false;}var pending=to?signalTransport.sendSignal({roomId:signalVoiceRoomRoomId,recipient:to,eventType:'voice_room_signal',payload:payload}):signalTransport.sendToRoom({roomId:signalVoiceRoomRoomId,eventType:'voice_room_signal',payload:payload,senderName:member});return Promise.resolve(pending).catch(function(e){voiceRoomMessage(e.message||'Falha na sinalização autenticada.');return false;}).then(function(result){if(type==='leave'&&signalTransport&&signalVoiceRoomRoomId){var room=signalVoiceRoomRoomId;signalStopCallPolling(room);return signalTransport.leave(room).then(function(leaveResult){if(leaveResult===false||(leaveResult&&typeof leaveResult==='object'&&(leaveResult.ok===false||leaveResult.error)))throw new Error(leaveResult&&leaveResult.error?String(leaveResult.error):'O servidor não confirmou a saída da sala.');if(signalVoiceRoomRoomId===room){signalVoiceRoomRoomId='';signalVoiceRoomPrepared=false;signalVoiceRoomCreator=false;}return leaveResult;}).catch(function(e){voiceRoomMessage(e&&e.message?e.message:'Não foi possível confirmar a saída da sala. Tente novamente.');return false;});}return result;});}if(!realtimeActive||!realtimeChannel||!member)return false;try{realtimeChannel.send({type:'broadcast',event:VOICE_ROOM_EVENT,payload:payload});if(voiceRoom.id==='upstatus-team-room-v1')realtimeChannel.send({type:'broadcast',event:VOICE_ROOM_EVENT,payload:Object.assign({},payload,{roomId:'upstatus-team-lite-room-v1'})});return true;}catch(e){return false;}}
function voiceRoomMessage(t){var e=card&&card.querySelector('.up-voice-message');if(e)e.textContent=t||'';}
function voiceRoomPlayCue(kind){try{var AC=window.AudioContext||window.webkitAudioContext;if(!voiceRoom.audioContext&&AC)voiceRoom.audioContext=new AC();var ctx=voiceRoom.audioContext;if(!ctx)return;if(ctx.state==='suspended')ctx.resume().catch(function(){});var notes=kind==='leave'?[620,500,360]:[480,760];var start=ctx.currentTime+.015;notes.forEach(function(freq,i){var osc=ctx.createOscillator(),gain=ctx.createGain(),at=start+i*(kind==='leave'?.105:.09),dur=kind==='leave'?.095:.115;osc.type='sine';osc.frequency.setValueAtTime(freq,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.065,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+dur);osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+dur+.01);});}catch(e){}}
async function voiceRoomMeasurePing(){if(!voiceRoom.active)return;var values=[];await Promise.all(Object.keys(voiceRoom.peers).map(async function(n){var p=voiceRoom.peers[n];if(!p||!p.pc||p.pc.connectionState==='closed')return;try{var stats=await p.pc.getStats();stats.forEach(function(st){if(st.type==='candidate-pair'&&(st.selected||st.nominated)&&typeof st.currentRoundTripTime==='number')values.push(st.currentRoundTripTime*1000);});}catch(e){}}));if(!voiceRoom.active)return;var next=values.length?Math.min.apply(Math,values):null;if(voiceRoom.pingMs===null&&next===null)return;if(next===null||voiceRoom.pingMs===null||Math.abs(next-voiceRoom.pingMs)>3){voiceRoom.pingMs=next;voiceRoomRender();}}

function voiceControlSyncVisibility(){if(!voiceControlBubble)return;var panelOpen=!!((card&&!card.classList.contains('hidden'))||(history&&!history.classList.contains('hidden'))||(chat&&!chat.classList.contains('hidden'))||(health&&!health.classList.contains('hidden')));var show=!!(voiceRoom&&voiceRoom.active&&!panelOpen);voiceControlBubble.classList.toggle('show',show);voiceControlBubble.setAttribute('aria-hidden',show?'false':'true');voiceControlBubble.title='Controles da chamada';}
function voiceRoomRender(){
  var p=card&&card.querySelector('.up-voice-room');
  if(!p){voiceControlSyncVisibility();return;}
  var names=Object.keys(voiceRoom.participants).filter(function(n){return n===member&&voiceRoom.active||Date.now()-voiceRoom.participants[n].at<30000;}).sort();
  if(names.length&&!voiceRoom.sessionStartedAt){var sessionCandidates=names.map(function(n){return Number((voiceRoom.participants[n]||{}).sessionStartedAt)||0;}).filter(function(t){return t>0;});voiceRoom.sessionStartedAt=sessionCandidates.length?Math.min.apply(Math,sessionCandidates):Date.now();}
  if(!names.length&&!voiceRoom.active){voiceRoom.sessionStartedAt=0;if(voiceRoom.sessionTimer){clearInterval(voiceRoom.sessionTimer);voiceRoom.sessionTimer=null;}}else if(voiceRoom.sessionStartedAt&&!voiceRoom.sessionTimer){voiceRoom.sessionTimer=setInterval(function(){voiceRoomRender();},1000);}
  p.classList.toggle('is-empty',!names.length&&!voiceRoom.active);p.classList.toggle('is-joining',!!voiceRoom.joining);p.classList.toggle('is-joined',!!voiceRoom.active);
  // Keep the join action out of the connected state even if legacy markup/CSS differs.
  p.querySelectorAll('.up-voice-join').forEach(function(joinButton){joinButton.hidden=!!voiceRoom.active;joinButton.setAttribute('aria-hidden',voiceRoom.active?'true':'false');joinButton.style.setProperty('display',voiceRoom.active?'none':'','important');});
  var st=p.querySelector('.up-voice-state');
  if(st){var stateLabel=voiceRoom.joining?'<span class="up-voice-connection is-connecting"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>Conectando...</span>':voiceRoom.active?'<span class="up-voice-connection is-connected"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9a14 14 0 0 1 18 0M6.5 12.5a8.5 8.5 0 0 1 11 0M10 16a3.2 3.2 0 0 1 4 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></svg>Conectado</span>':names.length?names.length+' na sala':'Disponivel';if(names.length&&voiceRoom.sessionStartedAt){var elapsed=Math.max(0,Math.floor((Date.now()-voiceRoom.sessionStartedAt)/1000));stateLabel+=' <span class="up-voice-duration"> • '+String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0')+'</span>';}if(voiceRoom.active&&voiceRoom.pingMs!==null&&voiceRoom.pingMs!==undefined)stateLabel+=' <span class="up-voice-ping"> • '+Math.round(voiceRoom.pingMs)+' ms</span>';if(st.innerHTML!==stateLabel)st.innerHTML=stateLabel;}
  var list=p.querySelector('.up-voice-participants');
  if(list){
    var empty=!names.length,emptyNode=list.querySelector('.up-voice-empty');
    if(empty){if(!emptyNode){list.replaceChildren();emptyNode=document.createElement('span');emptyNode.className='up-voice-empty';var emptyTitle=document.createElement('b');emptyTitle.textContent='Ninguem na chamada';var emptyDescription=document.createElement('small');emptyDescription.textContent='Entre e converse com a equipe.';emptyNode.append(emptyTitle,emptyDescription);list.appendChild(emptyNode);}}
    else{
      if(emptyNode)emptyNode.remove();
      var existing={};list.querySelectorAll('.up-voice-person[data-voice-person]').forEach(function(chip){existing[chip.getAttribute('data-voice-person')]=chip;});
      names.forEach(function(n,index){
        var x=voiceRoom.participants[n]||{},chip=existing[n];
        if(!chip){chip=document.createElement('span');chip.className='up-voice-person';chip.setAttribute('data-voice-person',n);var img=document.createElement('img');img.className='up-voice-avatar';img.setAttribute('data-voice-avatar',n);img.alt=n;var label=document.createElement('b');label.textContent=n;chip.append(img,label);}
        var img=chip.querySelector('[data-voice-avatar]');var nameLabel=chip.querySelector('b');if(!nameLabel){nameLabel=document.createElement('b');chip.appendChild(nameLabel);}if(nameLabel.textContent!==n)nameLabel.textContent=n;chip.title=n;chip.setAttribute('aria-label',n);
        if(img&&img.getAttribute('data-hydrated-name')!==n){img.setAttribute('data-hydrated-name',n);hydrateAvatar(img,n);}
        var localSpeakerMuted=(n===member&&voiceRoom.speakersMuted);var participantMuted=!!x.muted||localSpeakerMuted;chip.classList.toggle('is-speaking',!!(x.speaking&&!participantMuted));chip.classList.toggle('is-muted',participantMuted);
        var muted=chip.querySelector('.up-voice-status-muted');var muteKind=localSpeakerMuted||x.speakersMuted?'speaker':(x.muted?'mic':'');
        if(muteKind){if(!muted){muted=document.createElement('span');muted.className='up-voice-status-muted';chip.appendChild(muted);}muted.className='up-voice-status-muted '+(muteKind==='speaker'?'up-voice-speaker-muted':'up-voice-mic-muted');muted.title=muteKind==='speaker'?'udio da chamada silenciado':'Microfone mutado';muted.innerHTML=muteKind==='speaker'?'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6m0-6-5 6"/></svg>':iconSvg('mic-off');}else if(muted)muted.remove();
        var current=list.children[index];if(current!==chip)list.insertBefore(chip,current||null);
        delete existing[n];
      });
      Object.keys(existing).forEach(function(n){existing[n].remove();});
    }
  }
  var j=p.querySelector('.up-voice-join'),m=p.querySelector('.up-voice-mute'),s=p.querySelector('.up-voice-speakers'),l=p.querySelector('.up-voice-leave');
  if(j){j.classList.toggle('hidden',voiceRoom.active);j.disabled=voiceRoom.joining||!!voiceRoomLeavePromise;var joinLabel=voiceRoomLeavePromise?'Saindo...':voiceRoom.joining?'Conectando...':'Entrar';if(j.textContent!==joinLabel)j.textContent=joinLabel;}
  if(m){m.classList.toggle('hidden',!voiceRoom.active);var muteSvg=iconSvg(voiceRoom.muted?'mic-off':'mic');if(m.innerHTML!==muteSvg)m.innerHTML=muteSvg;m.title=voiceRoom.muted?'Ativar microfone':'Mutar microfone';m.classList.toggle('is-muted',voiceRoom.muted);}
  if(s){s.classList.toggle('hidden',!voiceRoom.active);s.classList.toggle('is-muted',voiceRoom.speakersMuted);s.title=voiceRoom.speakersMuted?'Ativar áudio recebido':'Silenciar áudio recebido';s.setAttribute('aria-label',s.title);var speakerSvg=voiceRoom.speakersMuted?'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6m0-6-5 6"/></svg>':'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';if(s.innerHTML!==speakerSvg)s.innerHTML=speakerSvg;}if(l){l.classList.toggle('hidden',!voiceRoom.active);var leaveSvg=iconSvg('hangup');if(l.innerHTML!==leaveSvg)l.innerHTML=leaveSvg;}
  var speakingName=names.find(function(n){return !!(voiceRoom.participants[n]&&voiceRoom.participants[n].speaking&&!voiceRoom.participants[n].muted);});
  var speakerName=speakingName||(voiceRoom.lastSpeaker&&names.indexOf(voiceRoom.lastSpeaker)>=0?voiceRoom.lastSpeaker:(voiceRoom.active?member:(names[0]||'')));voiceRoom.currentSpeaker=speakerName||'';
  if(voiceControlAvatar&&speakerName&&voiceControlSpeakerName!==speakerName){voiceControlSpeakerName=speakerName;voiceControlAvatar.alt=speakerName;hydrateAvatar(voiceControlAvatar,speakerName);}
  if(voiceControlBubble){voiceControlBubble.classList.toggle('is-speaking',!!speakingName);voiceControlBubble.classList.toggle('is-muted',!!voiceRoom.muted);var muteBtn=voiceControlBubble.querySelector('.up-voice-control-mute');if(muteBtn){var bubbleMuteSvg=iconSvg(voiceRoom.muted?'mic-off':'mic');if(muteBtn.innerHTML!==bubbleMuteSvg)muteBtn.innerHTML=bubbleMuteSvg;muteBtn.title=voiceRoom.muted?'Ativar microfone':'Silenciar microfone';muteBtn.setAttribute('aria-label',muteBtn.title);muteBtn.classList.toggle('is-muted',voiceRoom.muted);}var speakersBtn=voiceControlBubble.querySelector('.up-voice-control-speakers');if(speakersBtn){var miniSpeakerSvg=voiceRoom.speakersMuted?'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6m0-6-5 6"/></svg>':'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';if(speakersBtn.innerHTML!==miniSpeakerSvg)speakersBtn.innerHTML=miniSpeakerSvg;speakersBtn.title=voiceRoom.speakersMuted?'Ativar ᵤio da chamada':'Silenciar ᵤio da chamada';speakersBtn.setAttribute('aria-label',speakersBtn.title);speakersBtn.classList.toggle('is-muted',voiceRoom.speakersMuted);}var waveLevel=speakingName?Math.max(0,Math.min(1,Number((voiceRoom.participants[speakingName]||{}).level||0)/32)):0;if(voiceControlWave){voiceControlWave.style.opacity=String((speakingName?0.22:0.13)+waveLevel*(speakingName?0.68:0.07));voiceControlWave.style.setProperty('--voice-level',String(waveLevel));}}
  screenShareRender();
  voiceControlSyncVisibility();
}
function voiceRoomDrop(n){var p=voiceRoom.peers[n];if(!p)return;try{if(p.recoveryTimer)clearTimeout(p.recoveryTimer);}catch(e){}delete voiceRoom.peers[n];try{if(p.audio){p.audio.pause();p.audio.srcObject=null;p.audio.removeAttribute('src');p.audio.remove();}}catch(e){}try{if(p.audioSource)p.audioSource.disconnect();}catch(e){}try{if(p.analyser)p.analyser.disconnect();}catch(e){}try{if(p.remoteStream)p.remoteStream.getTracks().forEach(function(t){try{t.stop();}catch(e){}});}catch(e){}try{if(p.pc){p.pc.ontrack=null;p.pc.onicecandidate=null;p.pc.onconnectionstatechange=null;p.pc.close();}}catch(e){}}
function voiceRoomApplyParticipantSignal(p){var name=String(p.from||''),current=voiceRoom.participants[name],sid=String(p.sessionId||'legacy'),sentAt=Number(p.at)||0;if(current){if(current.sessionId&&sid==='legacy')return false;if(current.sessionId&&sid!==current.sessionId&&sentAt&&current.lastSignalAt&&sentAt<current.lastSignalAt)return false;if(current.sessionId===sid&&sentAt&&current.lastSignalAt&&sentAt<current.lastSignalAt)return false;}var rec=current&&(!current.sessionId||current.sessionId===sid)?current:{};rec.at=Date.now();rec.lastSignalAt=sentAt||Date.now();rec.sessionId=sid;rec.muted=!!p.muted;rec.speakersMuted=!!p.speakersMuted;rec.sessionStartedAt=Number(p.sessionStartedAt)||Number(rec.sessionStartedAt)||0;if(!current||current.sessionId!==sid){rec.speaking=false;rec.level=0;}voiceRoom.participants[name]=rec;return true;}
function voiceRoomRemoveParticipantSignal(p){var name=String(p.from||''),current=voiceRoom.participants[name];if(!current)return;if(current.sessionId&&(!p.sessionId||String(p.sessionId)!==String(current.sessionId)))return;var sentAt=Number(p.at)||0;if(sentAt&&current.lastSignalAt&&sentAt<current.lastSignalAt)return;delete voiceRoom.participants[name];voiceRoomDrop(name);voiceRoomRender();}
function voiceRoomCandidateMatchesRemote(candidate,pc){if(!candidate||!pc||!pc.remoteDescription||!pc.remoteDescription.sdp)return false;var raw=String(candidate.candidate||''),ufrag=candidate.usernameFragment||((raw.match(/\bufrag\s+([^\s]+)/)||[])[1]);if(!ufrag)return true;var sdp=String(pc.remoteDescription.sdp),match=sdp.match(/(?:^|\r?\n)a=ice-ufrag:([^\r\n]+)/);return !match||match[1]===ufrag;}
async function voiceRoomFlushCandidates(peer){if(!peer||!peer.pc||!peer.pc.remoteDescription)return;var queued=peer.pending.splice(0);for(var i=0;i<queued.length;i++){var candidate=queued[i];if(!voiceRoomCandidateMatchesRemote(candidate,peer.pc))continue;try{await peer.pc.addIceCandidate(candidate);}catch(e){if(!/ufrag/i.test(String(e&&e.message||e)))voiceRoomMessage('Falha ao configurar candidato de áudio: '+(e.message||e));}}}
function voiceRoomScheduleRecovery(n,peer,state){if(!voiceRoom.active||!peer||voiceRoom.peers[n]!==peer||voiceRoom.recoveryTimers[n])return;var attempt=Number(voiceRoom.recoveryAttempts[n]||0);if(attempt>=5){voiceRoomMessage('Áudio com '+n+' indisponível. Aguardando nova tentativa de conexão.');voiceRoom.recoveryAttempts[n]=0;return;}voiceRoom.recoveryAttempts[n]=attempt+1;var delay=Math.min(10000,800*Math.pow(2,attempt));voiceRoom.recoveryTimers[n]=setTimeout(function(){delete voiceRoom.recoveryTimers[n];if(!voiceRoom.active||voiceRoom.peers[n]!==peer)return;voiceRoomDrop(n);if(!voiceRoom.active)return;if(String(member).localeCompare(String(n),'pt-BR')<0){voiceRoomOffer(n).catch(function(){voiceRoomMessage('Restabelecendo áudio com '+n+'...');});}else{voiceRoomSend('presence',n,{});}},delay);}
async function voiceRoomMakePeer(n){var p=voiceRoom.peers[n];if(p&&p.pc&&p.pc.signalingState!=='closed')return p;if(!voiceRoom.stream)throw new Error('Microfone não iniciado');p=p||{pc:null,pending:[],audio:null,analyser:null,audioSource:null,remoteStream:null};p.pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});p.pending=p.pending||[];p.remoteStream=p.remoteStream||new MediaStream();voiceRoom.peers[n]=p;voiceRoom.stream.getAudioTracks().forEach(function(t){if(t.readyState==='live')p.pc.addTrack(t,voiceRoom.stream);});p.pc.onicecandidate=function(e){if(e.candidate&&voiceRoom.active)voiceRoomSend('ice',n,{candidate:e.candidate});};p.pc.onconnectionstatechange=function(){if(!p.pc||voiceRoom.peers[n]!==p)return;var state=p.pc.connectionState;if(state==='failed'||state==='disconnected')voiceRoomScheduleRecovery(n,p,state);};p.pc.oniceconnectionstatechange=function(){if(!p.pc||voiceRoom.peers[n]!==p)return;var state=p.pc.iceConnectionState;if(state==='failed'||state==='disconnected')voiceRoomScheduleRecovery(n,p,state);};p.pc.ontrack=function(e){try{var track=e.track;if(!track)return;if(!p.remoteStream.getTracks().some(function(t){return t.id===track.id;}))p.remoteStream.addTrack(track);if(!p.audio){p.audio=document.createElement('audio');p.audio.autoplay=true;p.audio.playsInline=true;p.audio.setAttribute('playsinline','');p.audio.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-100px;bottom:0';document.body.appendChild(p.audio);}if(p.audio.srcObject!==p.remoteStream)p.audio.srcObject=p.remoteStream;p.audio.muted=!!voiceRoom.speakersMuted;p.audio.volume=1;var playRemote=function(){if(!voiceRoom.active||!p.audio)return;if(voiceRoom.audioContext&&voiceRoom.audioContext.state==='suspended')voiceRoom.audioContext.resume().catch(function(){});var play=p.audio.play();if(play&&play.catch)play.catch(function(){voiceRoomMessage('O navegador bloqueou a reprodução do áudio. Clique uma vez na sala para liberar o som.');});};track.onunmute=playRemote;track.onended=function(){try{p.remoteStream.removeTrack(track);}catch(e){}};if(voiceRoom.audioContext&&!p.analyser){p.audioSource=voiceRoom.audioContext.createMediaStreamSource(p.remoteStream);p.analyser=voiceRoom.audioContext.createAnalyser();p.analyser.fftSize=512;p.audioSource.connect(p.analyser);p.levelData=new Uint8Array(p.analyser.frequencyBinCount);}playRemote();}catch(err){voiceRoomMessage('Erro ao preparar o áudio de '+n+': '+(err.message||err));}};return p;}
async function voiceRoomOffer(n){if(!voiceRoom.active||String(member).localeCompare(String(n),'pt-BR')>=0)return;var p=await voiceRoomMakePeer(n);if(p.pc.signalingState!=='stable'||p.pc.localDescription)return;var offer=await p.pc.createOffer();await p.pc.setLocalDescription(offer);voiceRoomSend('offer',n,{sdp:p.pc.localDescription});}
async function voiceRoomReceive(p){if(!p||(p.roomId!==voiceRoom.id&&p.roomId!=='upstatus-team-lite-room-v1')||typeof p.from!=='string'||!p.from||p.from.length>80||p.from===member||p.to&&p.to!==member)return;if((p.type==='offer'||p.type==='answer'||p.type==='ice')&&p.to!==member)return;if((p.type==='offer'||p.type==='answer')&&(!p.sdp||typeof p.sdp.sdp!=='string'||p.sdp.sdp.length>100000))return;if(p.type==='ice'&&(!p.candidate||JSON.stringify(p.candidate).length>4096))return;var signalKey=[p.from,p.to||'',p.type||'',p.sessionId||'',p.at||'',p.sdp&&p.sdp.type||'',p.candidate&&p.candidate.candidate||''].join('|');voiceRoom.seenSignals=voiceRoom.seenSignals||{};if(voiceRoom.seenSignals[signalKey])return;voiceRoom.seenSignals[signalKey]=Date.now();var seenSignalKeys=Object.keys(voiceRoom.seenSignals);if(seenSignalKeys.length>300)seenSignalKeys.slice(0,seenSignalKeys.length-200).forEach(function(k){delete voiceRoom.seenSignals[k];});if(p.type==='presence'){if(p.active){if(!voiceRoomApplyParticipantSignal(p))return;voiceRoomRender();if(!p.to)voiceRoomSend('presence',p.from,{});if(voiceRoom.active&&String(member).localeCompare(String(p.from),'pt-BR')<0)voiceRoomOffer(p.from).catch(function(e){voiceRoomMessage('Não foi possível iniciar áudio com '+p.from+': '+(e.message||e));});if(voiceRoom.active&&screenShare.active)screenShareOffer(p.from).catch(function(){});}else voiceRoomRemoveParticipantSignal(p);return;}if(p.type==='join'){if(p.active){if(!voiceRoomApplyParticipantSignal(p))return;if(voiceRoom.active)voiceRoomPlayCue('join');voiceRoomRender();if(voiceRoom.active&&screenShare.active)screenShareOffer(p.from).catch(function(){});}return;}if(p.type==='leave'){if(voiceRoom.active)voiceRoomPlayCue('leave');voiceRoomRemoveParticipantSignal(p);return;}if(!voiceRoom.active)return;if(p.type==='offer'&&p.sdp&&String(member).localeCompare(String(p.from),'pt-BR')>0){try{var existing=voiceRoom.peers[p.from];if(existing&&existing.pc&&(existing.pc.connectionState==='failed'||existing.pc.connectionState==='closed'||existing.pc.iceConnectionState==='failed'))voiceRoomDrop(p.from);var peer=await voiceRoomMakePeer(p.from);if(peer.pc.remoteDescription&&peer.pc.remoteDescription.sdp===p.sdp.sdp)return;await peer.pc.setRemoteDescription(new RTCSessionDescription(p.sdp));await voiceRoomFlushCandidates(peer);var answer=await peer.pc.createAnswer();await peer.pc.setLocalDescription(answer);voiceRoomSend('answer',p.from,{sdp:peer.pc.localDescription});}catch(e){voiceRoomMessage('Falha ao negociar áudio com '+p.from+': '+(e.message||e));}return;}if(p.type==='answer'&&p.sdp){var ap=voiceRoom.peers[p.from];if(ap&&ap.pc&&!ap.pc.remoteDescription){try{await ap.pc.setRemoteDescription(new RTCSessionDescription(p.sdp));await voiceRoomFlushCandidates(ap);}catch(e){voiceRoomMessage('Falha ao aceitar áudio de '+p.from+': '+(e.message||e));}}return;}if(p.type==='ice'&&p.candidate){var ip=voiceRoom.peers[p.from];if(!ip){ip={pc:null,pending:[],audio:null,analyser:null,audioSource:null,remoteStream:null};voiceRoom.peers[p.from]=ip;}var incomingCandidate=p.candidate instanceof RTCIceCandidate?p.candidate:new RTCIceCandidate(p.candidate);if(ip.pc&&ip.pc.remoteDescription){if(voiceRoomCandidateMatchesRemote(incomingCandidate,ip.pc)){try{await ip.pc.addIceCandidate(incomingCandidate);}catch(e){if(!/ufrag/i.test(String(e&&e.message||e)))voiceRoomMessage('Falha ao configurar áudio de '+p.from+': '+(e.message||e));}}}else if(ip.pending.length<128)ip.pending.push(incomingCandidate);}}
async function waitForRealtimeReady(timeoutMs){
  var deadline=Date.now()+(Number(timeoutMs)||10000);
  while(Date.now()<deadline){
    if(typeof navigator!=='undefined'&&navigator.onLine===false)return false;
    if(!isAuthenticated())return false;
    if(realtimeActive&&realtimeChannel)return true;
    if(!realtimeClient&&!realtimeRetryTimer)startRealtime();
    await new Promise(function(resolve){setTimeout(resolve,150);});
  }
  return !!(isAuthenticated()&&realtimeActive&&realtimeChannel);
}
async function voiceRoomJoin(){while(voiceRoomLeavePromise){try{await voiceRoomLeavePromise;}catch(e){}}if(typeof navigator!=='undefined'&&navigator.onLine===false){voiceRoomMessage('Sem conexão com a internet. Aguarde a reconexão e tente novamente.');return;}if(voiceRoom.active||voiceRoom.joining)return;if(signalTransportFlag&&!signalVoiceRoomPrepared){voiceRoom.joining=true;voiceRoomRender();voiceRoomMessage('');try{initSignalingTransport();await signalPrepareVoiceRoom();voiceRoom.joining=false;signalVoiceRoomPrepared=true;await voiceRoomJoin();signalVoiceRoomPrepared=false;return;}catch(e){await signalReleaseVoiceRoom();voiceRoom.joining=false;signalVoiceRoomPrepared=false;voiceRoomMessage(e.message||'Não foi possível preparar a sala autenticada.');voiceRoomRender();return;}}if(!signalTransportFlag&&(!realtimeActive||!realtimeChannel)){
  voiceRoom.joining=true;voiceRoomRender();voiceRoomMessage('Reconectando a conexão da sala...');
  var realtimeReady=await waitForRealtimeReady(10000);
  voiceRoom.joining=false;
  if(!realtimeReady){voiceRoomMessage('A conexão da sala ainda não foi restabelecida. Tente novamente.');voiceRoomRender();return;}
}
if((!realtimeActive||!realtimeChannel)&&!(signalTransport&&signalTransportFlag)){voiceRoomMessage('A conexão da sala ainda está sendo preparada. Tente novamente em alguns segundos.');return;}voiceRoom.joining=true;voiceRoom.pingMs=null;voiceRoomRender();voiceRoomMessage('');var joinGeneration=(voiceRoom.joinGeneration||0)+1;voiceRoom.joinGeneration=joinGeneration;try{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Este navegador não disponibiliza acesso ao microfone.');voiceRoom.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:false,autoGainControl:false}});if(voiceRoom.joinGeneration!==joinGeneration){try{voiceRoom.stream.getTracks().forEach(function(t){t.stop();});}catch(_){}voiceRoom.stream=null;return;}var roomHadParticipants=Object.keys(voiceRoom.participants).some(function(n){return Date.now()-voiceRoom.participants[n].at<16000;});if(!roomHadParticipants)voiceRoom.sessionStartedAt=Date.now();voiceRoom.muted=false;voiceRoom.active=true;voiceRoom.participants[member]={at:Date.now(),muted:false,speaking:false,sessionStartedAt:voiceRoom.sessionStartedAt};voiceRoomPlayCue('join');voiceRoomSend('join','',{});voiceRoomSend('presence','',{});if(!voiceRoom.audioContext){var AC=window.AudioContext||window.webkitAudioContext;if(AC)voiceRoom.audioContext=new AC();}if(voiceRoom.audioContext&&voiceRoom.audioContext.state==='suspended')await voiceRoom.audioContext.resume();if(voiceRoom.joinGeneration!==joinGeneration)return;if(voiceRoom.audioContext){voiceRoom.localAnalyser=voiceRoom.audioContext.createAnalyser();voiceRoom.localAnalyser.fftSize=512;voiceRoom.localLevelData=new Uint8Array(voiceRoom.localAnalyser.frequencyBinCount);voiceRoom.audioContext.createMediaStreamSource(voiceRoom.stream).connect(voiceRoom.localAnalyser);}voiceRoom.levelTimer=setInterval(function(){var changed=false;Object.keys(voiceRoom.participants).forEach(function(n){var x=voiceRoom.participants[n];if(!x)return;var analyser=n===member?voiceRoom.localAnalyser:(voiceRoom.peers[n]&&voiceRoom.peers[n].analyser),data=n===member?voiceRoom.localLevelData:(voiceRoom.peers[n]&&voiceRoom.peers[n].levelData);if(x.muted||!analyser||!data){if(x.speaking){x.speaking=false;changed=true;}return;}analyser.getByteFrequencyData(data);var sum=0;for(var i=0;i<data.length;i++)sum+=data[i];var level=sum/data.length;x.level=level;var speaking=level>8;if(speaking)voiceRoom.lastSpeaker=n;if(x.speaking!==speaking){x.speaking=speaking;changed=true;}});if(changed)voiceRoomRender();else if(voiceControlWave&&voiceRoom.currentSpeaker){var liveLevel=Number((voiceRoom.participants[voiceRoom.currentSpeaker]||{}).level||0),liveSpeaking=!!(voiceRoom.participants[voiceRoom.currentSpeaker]&&voiceRoom.participants[voiceRoom.currentSpeaker].speaking&&!voiceRoom.participants[voiceRoom.currentSpeaker].muted),normalized=Math.max(0,Math.min(1,liveLevel/32));voiceControlWave.style.opacity=String((liveSpeaking?0.22:0.13)+normalized*(liveSpeaking?0.68:0.07));voiceControlWave.style.setProperty('--voice-level',String(normalized));}},160);voiceRoom.timer=setInterval(function(){voiceRoomSend('presence','',{});Object.keys(voiceRoom.participants).forEach(function(n){if(n!==member&&Date.now()-voiceRoom.participants[n].at>30000){delete voiceRoom.participants[n];voiceRoomDrop(n);}});voiceRoomRender();},4000);if(voiceRoom.pingTimer)clearInterval(voiceRoom.pingTimer);voiceRoom.pingTimer=setInterval(function(){voiceRoomMeasurePing();},2500);voiceRoomMeasurePing();voiceRoomMessage('');Object.keys(voiceRoom.participants).forEach(function(n){if(n!==member)voiceRoomOffer(n).catch(function(e){voiceRoomMessage('Não foi possível conectar com '+n+': '+(e.message||e));});});}catch(e){await signalReleaseVoiceRoom();try{if(voiceRoom.stream)voiceRoom.stream.getTracks().forEach(function(t){t.stop();});}catch(_){}voiceRoom.stream=null;voiceRoom.active=false;delete voiceRoom.participants[member];voiceRoomMessage((e&&e.name==='NotAllowedError'?'Permita o acesso ao microfone nas configurações do navegador. ':e&&e.name==='NotFoundError'?'Nenhum microfone foi encontrado. ':'Falha ao entrar na sala: ')+(e.message||'erro desconhecido'));}finally{voiceRoom.joining=false;voiceRoomRender();}}
function voiceRoomToggleSpeakers(){if(!voiceRoom.active)return;voiceRoom.speakersMuted=!voiceRoom.speakersMuted;voiceRoom.muted=voiceRoom.speakersMuted;if(voiceRoom.stream)voiceRoom.stream.getAudioTracks().forEach(function(t){t.enabled=!voiceRoom.muted;});if(voiceRoom.participants[member]){voiceRoom.participants[member].muted=voiceRoom.muted;if(voiceRoom.muted)voiceRoom.participants[member].speaking=false;}Object.keys(voiceRoom.peers).forEach(function(n){var p=voiceRoom.peers[n];if(p&&p.audio)p.audio.muted=voiceRoom.speakersMuted;});voiceRoomSend('presence','',{});voiceRoomRender();}
function voiceRoomMute(){if(!voiceRoom.active||!voiceRoom.stream)return;voiceRoom.muted=!voiceRoom.muted;voiceRoom.stream.getAudioTracks().forEach(function(t){t.enabled=!voiceRoom.muted;});if(voiceRoom.participants[member]){voiceRoom.participants[member].muted=voiceRoom.muted;if(voiceRoom.muted)voiceRoom.participants[member].speaking=false;}voiceRoomSend('presence','',{});voiceRoomRender();}
var voiceRoomLeavePromise=null;
function voiceRoomLeave(options){
  if(voiceRoomLeavePromise)return voiceRoomLeavePromise;
  var skipServerLeave=!!(options&&options.skipServerLeave);
  var leavePromise=(async function(){
    voiceRoom.joinGeneration=(voiceRoom.joinGeneration||0)+1;
    screenShareStop(!skipServerLeave);
    var wasActive=voiceRoom.active;
    var signalRoomId=signalVoiceRoomRoomId;
    voiceRoom.active=false;
    voiceRoom.joining=false;
    if(signalRoomId)signalStopCallPolling(signalRoomId);
    Object.keys(voiceRoom.recoveryTimers||{}).forEach(function(n){clearTimeout(voiceRoom.recoveryTimers[n]);});
    voiceRoom.recoveryTimers={};
    voiceRoom.recoveryAttempts={};
    var leaveTask;
    if(skipServerLeave){
      leaveTask=Promise.resolve(!signalRoomId);
    }else if(wasActive){
      voiceRoomPlayCue('leave');
      leaveTask=voiceRoomSend('leave','',{active:false});
    }else{
      leaveTask=signalReleaseVoiceRoom();
    }
    if(voiceRoom.timer)clearInterval(voiceRoom.timer);
    if(voiceRoom.levelTimer)clearInterval(voiceRoom.levelTimer);
    if(voiceRoom.pingTimer)clearInterval(voiceRoom.pingTimer);
    voiceRoom.timer=null;
    voiceRoom.levelTimer=null;
    voiceRoom.pingTimer=null;
    voiceRoom.pingMs=null;
    Object.keys(voiceRoom.peers).forEach(function(n){voiceRoomDrop(n);});
    try{if(voiceRoom.stream)voiceRoom.stream.getTracks().forEach(function(t){t.stop();});}catch(e){}
    voiceRoom.stream=null;
    voiceRoom.muted=false;
    delete voiceRoom.participants[member];
    voiceRoomRender();
    voiceRoomMessage('');
    var leaveConfirmed=false;
    try{
      var leaveResult=await Promise.resolve(leaveTask);
      leaveConfirmed=leaveResult===true||(!!leaveResult&&typeof leaveResult==='object'&&leaveResult.ok!==false&&!leaveResult.error);
    }catch(e){}
    if(!skipServerLeave&&wasActive&&signalRoomId&&signalVoiceRoomRoomId===signalRoomId){
      var fallbackResult=await signalReleaseVoiceRoom();
      leaveConfirmed=fallbackResult===true||(!!fallbackResult&&typeof fallbackResult==='object'&&fallbackResult.ok!==false&&!fallbackResult.error);
    }
    if(signalRoomId&&signalVoiceRoomRoomId===signalRoomId)leaveConfirmed=false;
    return leaveConfirmed;
  })();
  voiceRoomLeavePromise=leavePromise.finally(function(){voiceRoomLeavePromise=null;voiceRoomRender();});
  voiceRoomRender();
  return voiceRoomLeavePromise;
}
window.addEventListener('pagehide',function(){try{callCleanup(false,'pagehide').catch(function(){});}catch(e){}try{voiceRoomLeave().catch(function(){});}catch(e){}});

  // Controle global do ringtone: evita áudio órfão quando há mais de uma instância do userscript na página.
  var upRingtoneGlobal=window.__upstatusRingtoneGlobal||(window.__upstatusRingtoneGlobal={generation:0,sources:[],gains:[]});
  // Coordenação do ringtone entre instâncias/contextos do UpStatus.
  // A chamada real pode ser recebida por mais de um contexto da mesma página.
  var UP_RINGTONE_CHANNEL='upstatus-screen-share-3-1-1-beta9-2-ringtone-stop-v1';
  var upCallInstanceId='up-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
  var upRingtoneChannel=null;
  var upRingtoneStorageKey='upstatus_screen_share_beta8_ringtone_stop_bus';
  function callHandleRemoteRingtoneStop(payload){
    try{
      var p=payload&&payload.detail?payload.detail:payload;
      if(!p||p.type!=='stop'||!p.callId)return;
      if(String(p.instanceId||'')===upCallInstanceId)return;
      if(!upCall.callId||String(p.callId)!==String(upCall.callId))return;
      callStopRingtone(false);
    }catch(e){}
  }
  function callInitRingtoneChannel(){
    if(upRingtoneChannel||typeof BroadcastChannel==='undefined')return;
    try{
      upRingtoneChannel=new BroadcastChannel(UP_RINGTONE_CHANNEL);
      upRingtoneChannel.onmessage=function(e){callHandleRemoteRingtoneStop(e&&e.data);};
    }catch(e){upRingtoneChannel=null;}
  }
  function callBroadcastRingtoneStop(callId,reason){
    if(!callId)return;
    var payload={type:'stop',callId:String(callId),reason:String(reason||'lifecycle'),instanceId:upCallInstanceId,at:Date.now()};
    try{
      document.dispatchEvent(new CustomEvent('UPSTATUS_RINGTONE_STOP',{detail:payload}));
    }catch(e){}
    try{
      if(!upRingtoneChannel)callInitRingtoneChannel();
      if(upRingtoneChannel)upRingtoneChannel.postMessage(payload);
    }catch(e){}
    try{
      localStorage.setItem(upRingtoneStorageKey,JSON.stringify(payload));
    }catch(e){}
  }
  document.addEventListener('UPSTATUS_RINGTONE_STOP',function(e){callHandleRemoteRingtoneStop(e);});
  window.addEventListener('storage',function(e){
    if(e.key!==upRingtoneStorageKey||!e.newValue)return;
    try{callHandleRemoteRingtoneStop(JSON.parse(e.newValue));}catch(err){}
  });
  callInitRingtoneChannel();
  var chatPresence={};
  function setupFaviconBadge(){
    try{
      var links=[].slice.call(document.querySelectorAll('link[rel~="icon"]'));var link=links[0]||null;
      if(!link&&document.head){link=document.createElement('link');link.rel='icon';document.head.appendChild(link);}
      if(link&&!faviconState.link){faviconState.link=link;faviconState.originalHref=link.href||'';
        try{fetch(faviconState.originalHref,{credentials:'same-origin'}).then(function(r){return r.blob()}).then(function(blob){return new Promise(function(resolve){var fr=new FileReader();fr.onload=function(){resolve(fr.result)};fr.readAsDataURL(blob);});}).then(function(data){faviconState.originalData=String(data||'');}).catch(function(){});}catch(e){}
      }
    }catch(e){}
  }
  function faviconBadgeHref(){var src=faviconState.originalData||faviconState.originalHref||location.origin+'/favicon.ico';var svg='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><image href="'+String(src).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" width="32" height="32" preserveAspectRatio="xMidYMid meet"/><circle cx="25" cy="7" r="6" fill="#ff334f" stroke="white" stroke-width="2"/></svg>';return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}
  function setFaviconBadge(show){try{if(faviconState.link)faviconState.link.href=show?faviconBadgeHref():faviconState.originalHref;}catch(e){}}
  function updateFaviconNotification(count){var show=Number(count)>0;if(!show){if(faviconState.blinkTimer){clearInterval(faviconState.blinkTimer);faviconState.blinkTimer=null;}faviconState.on=false;setFaviconBadge(false);return;}if(faviconState.blinkTimer)return;faviconState.on=true;setFaviconBadge(true);faviconState.blinkTimer=setInterval(function(){faviconState.on=!faviconState.on;setFaviconBadge(faviconState.on);},700);}
  function initFaviconWatcher(){setupFaviconBadge();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initFaviconWatcher,{once:true});else initFaviconWatcher();

  // Backend cloud: substitui qualquer endereço antigo salvo no Tampermonkey.
  GM_setValue(key+'server',CLOUD_SERVER);
  var token=GM_getValue(key+'token','');
  var member=GM_getValue(key+'member','');
  // Candidate-only authenticated transport for voice rooms and screen sharing.
  // Disabled unless explicitly configured in Tampermonkey; legacy calls remain unchanged.
  var signalTransportFlag=GM_getValue(key+'signaling_transport_enabled',false)===true;
  var signalTransportEndpoint=String(GM_getValue(key+'signaling_transport_endpoint','')||'').trim();
  var signalTransport=null,signalVoiceRoomRoomId='',signalVoiceRoomCreator=false,signalVoiceRoomPrepared=false;
  var signalPollStops=Object.create(null),signalRosterCache=Object.create(null);
  var signalInvitationTimer=null,signalInvitationPollBusy=false;
  var signalRoomByCallId=Object.create(null),signalCallIdByRoom=Object.create(null),signalCreatorCallIds=Object.create(null);
  var signalPendingCallLeaves=Object.create(null);
  var signalPendingCallAttempts=Object.create(null);
  function signalPendingCallLeavesStorageKey(memberName){
    return key+'signal_pending_call_leaves_v1_'+encodeURIComponent(String(memberName||''));
  }
  function signalHasControlChars(value){
    for(var i=0;i<value.length;i++){var code=value.charCodeAt(i);if(code<32||code===127)return true;}
    return false;
  }
  function signalNormalizePendingCallLeaveRecord(record,expectedMember,now){
    if(!record||typeof record!=='object'||Array.isArray(record))return null;
    var roomId=String(record.roomId||'').trim(),recordMember=String(record.member||''),callId=String(record.callId||'').trim(),createdAt=Number(record.createdAt);
    if(!expectedMember||recordMember!==expectedMember)return null;
    if(!/^[A-Za-z0-9._:-]{1,128}$/.test(roomId))return null;
    if(!callId||callId.length>160||signalHasControlChars(callId))return null;
    if(!Number.isFinite(createdAt)||createdAt<=0||createdAt>now+60000||now-createdAt>7*24*60*60*1000)return null;
    return {roomId:roomId,member:recordMember,callId:callId,createdAt:createdAt};
  }
  function signalPersistPendingCallLeaves(){
    if(!member)return false;
    var records=[],now=Date.now();
    Object.keys(signalPendingCallLeaves).forEach(function(roomId){
      if(records.length>=20)return;
      var entry=signalPendingCallLeaves[roomId];
      if(!entry||entry.member!==member)return;
      var record=signalNormalizePendingCallLeaveRecord({roomId:roomId,member:entry.member,callId:entry.callId,createdAt:entry.createdAt||now},member,now);
      if(record)records.push(record);
    });
    try{GM_setValue(signalPendingCallLeavesStorageKey(member),{version:1,entries:records});return true;}catch(e){return false;}
  }
  function signalRestorePendingCallLeaves(){
    if(!token||!member)return 0;
    var stored=null;
    try{stored=GM_getValue(signalPendingCallLeavesStorageKey(member),null);}catch(e){return 0;}
    if(!stored||stored.version!==1||!Array.isArray(stored.entries))return 0;
    var now=Date.now(),restored=0,seen=Object.create(null);
    stored.entries.slice(0,20).forEach(function(raw){
      var record=signalNormalizePendingCallLeaveRecord(raw,member,now);
      if(!record||seen[record.roomId])return;
      seen[record.roomId]=true;
      if(!signalPendingCallLeaves[record.roomId]){
        signalPendingCallLeaves[record.roomId]={roomId:record.roomId,callId:record.callId,member:record.member,transport:null,promise:null,createdAt:record.createdAt};
      }
      restored++;
    });
    signalPersistPendingCallLeaves();
    return restored;
  }
  function signalPendingCallAttemptsStorageKey(memberName){
    return key+'signal_pending_call_attempts_v1_'+encodeURIComponent(String(memberName||''));
  }
  function signalNormalizePendingCallAttemptRecord(record,expectedMember,now){
    if(!record||typeof record!=='object'||Array.isArray(record))return null;
    var callId=String(record.callId||'').trim(),recordMember=String(record.member||''),createdAt=Number(record.createdAt);
    if(!expectedMember||recordMember!==expectedMember)return null;
    if(!/^[A-Za-z0-9._:-]{1,128}$/.test(callId))return null;
    var prefix=String(expectedMember).replace(/[^A-Za-z0-9._:-]/g,'_').slice(0,80)+'-';
    if(callId.indexOf(prefix)!==0)return null;
    if(!Number.isFinite(createdAt)||createdAt<=0||createdAt>now+60000||now-createdAt>7*24*60*60*1000)return null;
    return {callId:callId,member:recordMember,createdAt:createdAt};
  }
  function signalPersistPendingCallAttempts(){
    if(!member)return false;
    var records=[],now=Date.now();
    Object.keys(signalPendingCallAttempts).forEach(function(callId){
      if(records.length>=20)return;
      var entry=signalPendingCallAttempts[callId];
      if(!entry||entry.member!==member)return;
      var record=signalNormalizePendingCallAttemptRecord({callId:callId,member:entry.member,createdAt:entry.createdAt||now},member,now);
      if(record)records.push(record);
    });
    try{GM_setValue(signalPendingCallAttemptsStorageKey(member),{version:1,entries:records});return true;}catch(e){return false;}
  }
  function signalTrackPendingCallAttempt(callId){
    var now=Date.now();
    var record=signalNormalizePendingCallAttemptRecord({callId:callId,member:member,createdAt:now},member,now);
    if(!record)return false;
    if(signalPendingCallAttempts[callId])return true;
    var count=Object.keys(signalPendingCallAttempts).filter(function(id){
      var entry=signalPendingCallAttempts[id];return !!entry&&entry.member===member;
    }).length;
    if(count>=20)return false;
    signalPendingCallAttempts[callId]={callId:callId,member:member,transport:null,promise:null,createdAt:now,roomId:''};
    if(!signalPersistPendingCallAttempts()){
      delete signalPendingCallAttempts[callId];
      return false;
    }
    return true;
  }
  function signalRestorePendingCallAttempts(){
    if(!token||!member)return 0;
    var stored=null;
    try{stored=GM_getValue(signalPendingCallAttemptsStorageKey(member),null);}catch(e){return 0;}
    if(!stored||stored.version!==1||!Array.isArray(stored.entries))return 0;
    var now=Date.now(),restored=0,seen=Object.create(null);
    stored.entries.slice(0,20).forEach(function(raw){
      var record=signalNormalizePendingCallAttemptRecord(raw,member,now);
      if(!record||seen[record.callId])return;
      seen[record.callId]=true;
      if(!signalPendingCallAttempts[record.callId]){
        signalPendingCallAttempts[record.callId]={callId:record.callId,member:record.member,transport:null,promise:null,createdAt:record.createdAt,roomId:''};
      }
      restored++;
    });
    signalPersistPendingCallAttempts();
    return restored;
  }
  function signalAttemptPendingCallAttempt(callId,expectedTransport,requireExpectedTransport){
    var entry=signalPendingCallAttempts[callId];
    if(!entry)return Promise.resolve(true);
    if(typeof upCall!=='undefined'&&upCall&&upCall.active&&upCall.callId===callId)return Promise.resolve(true);
    if(entry.member!==member)return Promise.resolve(false);
    var currentTransport=signalTransport;
    if(entry.promise){
      if(requireExpectedTransport&&entry.transport!==expectedTransport)return entry.promise;
      if(!requireExpectedTransport&&currentTransport&&entry.transport!==currentTransport){
        return entry.promise.then(function(){return signalAttemptPendingCallAttempt(callId,null,false);});
      }
      return entry.promise;
    }
    var transportForAttempt=requireExpectedTransport?expectedTransport:currentTransport;
    if(!transportForAttempt||currentTransport!==transportForAttempt||typeof transportForAttempt.cancelCallRoom!=='function')return Promise.resolve(false);
    entry.transport=transportForAttempt;
    var attempt=Promise.resolve().then(function(){return transportForAttempt.cancelCallRoom(callId);}).then(function(result){
      if(result===false||(result&&typeof result==='object'&&(result.ok===false||result.error)))
        throw new Error(result&&result.error?String(result.error):'O servidor não confirmou o cancelamento da chamada.');
      if(signalPendingCallAttempts[callId]===entry)delete signalPendingCallAttempts[callId];
      var roomId=entry.roomId||signalRoomByCallId[callId];
      if(roomId){
        if(signalPendingCallLeaves[roomId])delete signalPendingCallLeaves[roomId];
        if(signalRoomByCallId[callId]===roomId)delete signalRoomByCallId[callId];
        if(signalCallIdByRoom[roomId]===callId)delete signalCallIdByRoom[roomId];
        delete signalRosterCache[roomId];
        signalStopCallPolling(roomId);
        signalPersistPendingCallLeaves();
      }
      delete signalCreatorCallIds[callId];
      signalPersistPendingCallAttempts();
      return true;
    }).catch(function(error){
      var code=error&&(error.code||error.message);
      if(['CALL_CANCELLED','CALL_EXPIRED','CALL_MEMBERSHIP_ENDED','ROOM_UNAVAILABLE','ROOM_MEMBERSHIP_ENDED'].indexOf(String(code))>=0){
        if(signalPendingCallAttempts[callId]===entry)delete signalPendingCallAttempts[callId];
        signalPersistPendingCallAttempts();
        return true;
      }
      return false;
    });
    entry.promise=attempt.then(function(ok){
      entry.promise=null;
      if(!ok&&!requireExpectedTransport&&signalTransport&&signalTransport!==transportForAttempt)
        return signalAttemptPendingCallAttempt(callId,null,false);
      return ok;
    });
    return entry.promise;
  }
  function signalRetryPendingCallAttempts(){
    var calls=Object.keys(signalPendingCallAttempts).filter(function(callId){
      var entry=signalPendingCallAttempts[callId];return !!entry&&entry.member===member;
    });
    if(!calls.length)return Promise.resolve(true);
    return Promise.all(calls.map(function(callId){return signalAttemptPendingCallAttempt(callId,null,false);})).then(function(results){
      return results.every(function(ok){return ok===true;});
    });
  }
  function signalTransportRequest(route,payload,options){
    return new Promise(function(resolve,reject){
      var signal=options&&options.signal,handle=null,settled=false,abortHandler=null;
      function finish(fn,value){if(settled)return;settled=true;if(signal&&abortHandler)signal.removeEventListener('abort',abortHandler);fn(value);}
      if(signal&&signal.aborted){var e=new Error('Signaling request aborted');e.name='AbortError';reject(e);return;}
      try{
        handle=GM_xmlhttpRequest({method:'POST',url:signalTransportEndpoint.replace(/\/$/, '')+route,
          headers:{'Content-Type':'application/json','X-UpStatus-Token':token,'Cache-Control':'no-store'},
          data:JSON.stringify(payload||{}),timeout:12000,
          onload:function(r){var body={};try{body=JSON.parse(r.responseText||'{}')}catch(e){body={error:'Invalid signaling response'}}finish(resolve,{status:Number(r.status)||0,body:body});},
          onerror:function(){finish(reject,new Error('Signaling network request failed'));},
          ontimeout:function(){finish(reject,new Error('Signaling request timed out'));},
          onabort:function(){var e=new Error('Signaling request aborted');e.name='AbortError';finish(reject,e);}});
        if(signal){abortHandler=function(){try{if(handle&&handle.abort)handle.abort();else{var e=new Error('Signaling request aborted');e.name='AbortError';finish(reject,e);}}catch(e){finish(reject,e);}};signal.addEventListener('abort',abortHandler,{once:true});if(signal.aborted)abortHandler();}
      }catch(e){finish(reject,e);}
    });
  }
  function signalAttemptPendingCallLeave(roomId,expectedTransport,requireExpectedTransport){
    var entry=signalPendingCallLeaves[roomId];
    if(!entry)return Promise.resolve(true);
    if(entry.member!==member)return Promise.resolve(true);
    var currentTransport=signalTransport;
    if(entry.promise){
      if(requireExpectedTransport&&entry.transport!==expectedTransport)return entry.promise;
      if(!requireExpectedTransport&&currentTransport&&entry.transport!==currentTransport){
        return entry.promise.then(function(){return signalAttemptPendingCallLeave(roomId,null,false);});
      }
      return entry.promise;
    }
    var transportForAttempt=requireExpectedTransport?expectedTransport:currentTransport;
    if(!transportForAttempt||currentTransport!==transportForAttempt)return Promise.resolve(false);
    entry.transport=transportForAttempt;
    var attempt=Promise.resolve().then(function(){return transportForAttempt.leave(roomId);}).then(function(result){
      if(result===false||(result&&typeof result==='object'&&(result.ok===false||result.error)))throw new Error(result&&result.error?String(result.error):'O servidor não confirmou a saída da chamada.');
      if(signalPendingCallLeaves[roomId]===entry)delete signalPendingCallLeaves[roomId];
      if(entry.callId){
        if(signalRoomByCallId[entry.callId]===roomId)delete signalRoomByCallId[entry.callId];
        delete signalCreatorCallIds[entry.callId];
      }
      if(signalCallIdByRoom[roomId]===entry.callId)delete signalCallIdByRoom[roomId];
      delete signalRosterCache[roomId];
      signalPersistPendingCallLeaves();
      return true;
    }).catch(function(){return false;});
    entry.promise=attempt.then(function(ok){
      entry.promise=null;
      if(!ok&&!requireExpectedTransport&&signalTransport&&signalTransport!==transportForAttempt)return signalAttemptPendingCallLeave(roomId,null,false);
      return ok;
    });
    return entry.promise;
  }
  function signalRetryPendingCallLeaves(){
    var rooms=Object.keys(signalPendingCallLeaves).filter(function(roomId){
      var entry=signalPendingCallLeaves[roomId];
      return !!entry&&entry.member===member;
    });
    if(!rooms.length)return Promise.resolve(true);
    return Promise.all(rooms.map(function(roomId){return signalAttemptPendingCallLeave(roomId,null,false);})).then(function(results){
      return results.every(function(ok){return ok===true;});
    });
  }
  function initSignalingTransport(){
    if(!signalTransportFlag||signalTransport||!token||!signalTransportEndpoint)return;
    try{var endpoint=new URL(signalTransportEndpoint),sessionServer=new URL(server);
      if(endpoint.protocol!=='https:'||endpoint.origin!==sessionServer.origin||endpoint.search||endpoint.hash||!(endpoint.pathname.endsWith('/functions/v1/upstatus-signal')||endpoint.pathname.endsWith('/functions/v1/upstatus-signal-test')))return;
      signalTransport=createSignalingTransport({request:signalTransportRequest,enabled:true});signalRestorePendingCallLeaves();signalRestorePendingCallAttempts();signalStartInvitationPolling();signalRetryPendingCallAttempts();signalRetryPendingCallLeaves();
    }catch(e){signalTransport=null;}
  }
  function signalSafeCallId(id){return String(id||'call').replace(/[^A-Za-z0-9._:-]/g,'_').slice(0,128)||('call-'+Date.now().toString(36));}
  async function signalGetRoomMembers(roomId){
    var cached=signalRosterCache[roomId];
    if(cached&&Date.now()-cached.at<3000)return cached.members.slice();
    var members=await signalTransport.roomMembers(roomId);
    signalRosterCache[roomId]={at:Date.now(),members:members.slice()};
    return members;
  }
  function signalStartCallPolling(roomId,callId){
    if(!signalTransport||!roomId||signalPollStops[roomId])return;
    signalPollStops[roomId]=signalTransport.startPolling(roomId,async function(event){
      if(!event||!event.payload)return;
      if(event.event_type==='call_signal'){
        var p=Object.assign({},event.payload,{from:event.sender,to:member,callId:event.payload.callId||callId,_authenticatedTransport:true});
        try{p.participants=await signalGetRoomMembers(roomId);}catch(e){p.participants=[member,event.sender];}
        if(!p.initiator)p.initiator=signalCreatorCallIds[p.callId]?member:event.sender;
        await receiveCallSignal(p);
        return;
      }
      if(event.event_type==='voice_room_signal'){
        var voicePayload=Object.assign({},event.payload,{from:event.sender,to:member,roomId:voiceRoom.id});
        await voiceRoomReceive(voicePayload);
        return;
      }
      if(event.event_type==='screen_signal'){
        var screenPayload=Object.assign({},event.payload,{from:event.sender,to:member,roomId:voiceRoom.id});
        await screenShareReceive(screenPayload);
      }
    });
  }
  function signalStopCallPolling(roomId){
    if(!roomId)return;
    var stop=signalPollStops[roomId];if(stop){try{stop();}catch(e){}delete signalPollStops[roomId];}
  }
  async function signalPollInvitations(){
    if(!token||!member||!signalTransport||!signalTransportFlag||signalInvitationPollBusy)return;
    var expectedToken=token,expectedMember=member;
    signalInvitationPollBusy=true;
    try{
      var invitations=await signalTransport.invitations();
      if(token!==expectedToken||member!==expectedMember)return;
      for(var i=0;i<invitations.length;i++){
        if(token!==expectedToken||member!==expectedMember)return;
        var invitation=invitations[i],binding=(invitation.bindings||[]).find(function(b){return b&&b.bindingType==='call'&&typeof b.logicalId==='string';});
        if(!binding||!invitation.roomId||signalRoomByCallId[binding.logicalId])continue;
        let callId=binding.logicalId,roomId=invitation.roomId;
        signalRoomByCallId[callId]=roomId;signalCallIdByRoom[roomId]=callId;signalCreatorCallIds[callId]=false;
        if(upCall.active){
          signalTransport.decline(roomId).catch(function(){}).finally(function(){delete signalRoomByCallId[callId];delete signalCallIdByRoom[roomId];delete signalCreatorCallIds[callId];});
          continue;
        }
        await receiveCallSignal({type:'invite',callId:callId,from:invitation.invitedBy,initiator:invitation.invitedBy,participants:[invitation.invitedBy,member],to:member,_authenticatedTransport:true});
      }
    }catch(e){}finally{signalInvitationPollBusy=false;}
  }
  function signalStartInvitationPolling(){
    if(!signalTransport||signalInvitationTimer)return;
    signalPollInvitations();
    signalInvitationTimer=setInterval(signalPollInvitations,1500);
  }
  async function startOutgoingCallWithTransport(target){
    if(!target||target===member)return;
    if(upCall.active){message('Você já está em uma chamada.',true);return;}
    var transportCallId=signalSafeCallId(callNewId());if(!signalTrackPendingCallAttempt(transportCallId)){message('Não foi possível salvar a recuperação segura da chamada. Verifique o armazenamento do userscript e tente novamente.',true);return;}upCall.callId=transportCallId;upCall.peer=target;upCall.role='caller';upCall.initiator=member;upCall.participants=[member,target];
    upCall.pendingInvites={};upCall.pendingOffers={};upCall.active=true;upCall.connected=false;upCall.startedAt=0;upCall.waitingForConnection=true;
    upCall.signalAbortController=new AbortController();signalCreatorCallIds[upCall.callId]=true;
    callPrimeAudio();callStartRingtone();callRender(target,'Chamando…',[{label:'Cancelar',danger:true,onClick:function(){callCleanup(true,'hangup');}}]);
    upCall.timer=setTimeout(function(){if(upCall.active&&!upCall.connected){try{if(upCall.signalAbortController)upCall.signalAbortController.abort();}catch(e){}callCleanup(false,'timeout').then(function(){callFail('Sem resposta.');});}},30000);
    try{
      var room=await signalTransport.prepareCallRoom(upCall.callId,target,{timeoutMs:28000,intervalMs:900,signal:upCall.signalAbortController.signal});
      if(!upCall.active){signalAttemptPendingCallAttempt(transportCallId,signalTransport,true);delete signalCreatorCallIds[transportCallId];return;}
      signalRoomByCallId[transportCallId]=room.roomId;signalCallIdByRoom[room.roomId]=transportCallId;
      signalStartCallPolling(room.roomId,transportCallId);
      await callGetMicrophone();
      if(!upCall.active||upCall.signalAbortController.signal.aborted){callCleanup(false);return;}
      var p=await callCreatePeer(target),offer=await p.pc.createOffer();
      await p.pc.setLocalDescription(offer);
      if(!upCall.active||upCall.signalAbortController.signal.aborted){callCleanup(false);return;}
      p.offerSent=true;callStartPresence();callSendTo(target,'offer',{sdp:p.pc.localDescription,phase:'initial'});
    }catch(e){
      if(upCall.active){var failureMessage=e.message||'Não foi possível iniciar a chamada.';callCleanup(false,'prepare-failed').then(function(){callFail(failureMessage);});}
    }
  }
  function callNewId(){return String(member||'user')+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}
  function callConnectionId(remote){
    return String(upCall.callId)+'::'+[String(member||''),String(remote||'')].sort().join('::');
  }
  function callPublishPresence(){
    if(!upCall.active||!upCall.callId)return;
    var roomId=signalRoomByCallId[upCall.callId];
    if(signalTransportFlag){
      if(signalTransport&&roomId)callSendAll('presence',{initiator:upCall.initiator||member,updatedAt:Date.now(),sharing:false});
      // Public Realtime is retained only as a discovery hint; all call control and media signals use the authenticated room.
      sendRealtimeEvent('call_signal',{type:'presence',callId:upCall.callId,from:member,participants:upCall.participants.slice(),initiator:upCall.initiator||member,updatedAt:Date.now(),sharing:false,discoveryOnly:true});
      return;
    }
    sendRealtimeEvent('call_signal',{type:'presence',callId:upCall.callId,from:member,participants:upCall.participants.slice(),initiator:upCall.initiator||member,updatedAt:Date.now(),sharing:false});
  }
  function callStartPresence(){
    if(upCall.presenceTimer)clearInterval(upCall.presenceTimer);
    callPublishPresence();upCall.presenceTimer=setInterval(callPublishPresence,5000);
  }
  function callReceivePresence(p){
    if(!p||typeof p.callId!=='string'||!p.callId||p.callId.length>160||typeof p.from!=='string'||!p.from||p.from.length>80||!Array.isArray(p.participants)||p.participants.length>32)return;
    if(p.participants.some(function(n){return typeof n!=='string'||!n||n.length>80;}))return;
    var participants=[];p.participants.forEach(function(n){if(participants.indexOf(n)<0&&participants.length<32)participants.push(n);});
    if(participants.indexOf(p.from)<0){if(participants.length>=32)return;participants.push(p.from);}
    var old=upCallDirectory[p.callId]||{callId:p.callId,participants:[]};
    old.callId=p.callId;old.participants=participants;
    old.initiator=typeof p.initiator==='string'&&p.initiator.length<=80?p.initiator:(old.initiator||p.from);old.updatedAt=Date.now();old.sharing=!!p.sharing;old.screenSharer=typeof p.screenSharer==='string'&&p.screenSharer.length<=80?p.screenSharer:'';upCallDirectory[p.callId]=old;
  }
  function callSendTo(to,type,extra){
    if(!to||!upCall.callId)return false;
    var p=Object.assign({type:type,callId:upCall.callId,from:member,to:to,connectionId:callConnectionId(to),participants:upCall.participants.slice()},extra||{});
    var signalRoomId=signalRoomByCallId[upCall.callId];
    if(signalTransportFlag){
      if(!signalTransport||!signalRoomId)return false;
      if(type==='invite'){
        signalTransport.invite(signalRoomId,to).then(function(){
          return signalTransport.waitForAcceptance(signalRoomId,to,{timeoutMs:30000,intervalMs:900});
        }).then(function(){
          if(upCall.participants.indexOf(to)<0)upCall.participants.push(to);
          signalStartCallPolling(signalRoomId,upCall.callId);
          return callStartOffer(to);
        }).catch(function(e){upCall.notice='Não foi possível adicionar '+to+': '+(e.message||e);callRenderConnected();});
        return true;
      }
      return signalTransport.sendSignal({roomId:signalRoomId,recipient:to,eventType:'call_signal',payload:p}).catch(function(e){
        if(upCall.active){upCall.notice='Falha no sinal para '+to+': '+(e.message||e);callRenderConnected();}
      });
    }
    return sendRealtimeEvent('call_signal',p);
  }
  function callSend(type,extra){return callSendTo(upCall.peer,type,extra);}
  function callSendAll(type,extra){
    var signalRoomId=signalRoomByCallId[upCall.callId];
    if(signalTransportFlag){
      if(!signalTransport||!signalRoomId)return false;
      return signalTransport.sendToRoom({
        roomId:signalRoomId,eventType:'call_signal',senderName:member,
        payload:Object.assign({type:type,callId:upCall.callId,from:member,participants:upCall.participants.slice(),initiator:upCall.initiator||member,updatedAt:Date.now()},extra||{})
      }).catch(function(e){if(upCall.active){upCall.notice='Falha ao enviar sinal para a sala: '+(e.message||e);callRenderConnected();}});
    }
    var sent=false;
    upCall.participants.forEach(function(name){if(name&&name!==member)sent=callSendTo(name,type,extra)||sent;});
    return sent;
  }
  function callStopStream(){
    if(upCall.localStream){try{upCall.localStream.getTracks().forEach(function(t){t.stop();});}catch(e){}upCall.localStream=null;}
  }
  function callRemovePeer(name,forgetParticipant){
    var p=upCall.peers[name];if(!p)return;
    if(p.disconnectTimer){clearTimeout(p.disconnectTimer);p.disconnectTimer=null;}
    if(p.pc){try{p.pc.onicecandidate=null;p.pc.ontrack=null;p.pc.onconnectionstatechange=null;p.pc.close();}catch(e){}p.pc=null;}
    if(p.audioSource){try{p.audioSource.disconnect();}catch(e){}p.audioSource=null;}
    if(p.audioGain){try{p.audioGain.disconnect();}catch(e){}p.audioGain=null;}
    if(p.audio){try{p.audio.pause();}catch(e){}try{p.audio.srcObject=null;}catch(e){}try{p.audio.remove();}catch(e){}p.audio=null;}
    delete upCall.peers[name];
    if(forgetParticipant){
      upCall.participants=upCall.participants.filter(function(n){return n!==name;});
      if(upCall.pendingInvites)delete upCall.pendingInvites[name];
    }
    upCall.connected=Object.keys(upCall.peers).some(function(n){return !!(upCall.peers[n]&&upCall.peers[n].connected);});
    if(!upCall.connected&&upCall.startedAt){upCall.startedAt=0;if(upCall.counterTimer){clearInterval(upCall.counterTimer);upCall.counterTimer=null;}}
  }
  function callCleanup(sendSignal,signalType){
    var cleanupPromise=Promise.resolve(true);
    upCall.startAttempt=(upCall.startAttempt||0)+1;upCall.starting=false;
    var callId=upCall.callId,signalRoomId=signalRoomByCallId[callId],signalRoomCreator=signalCreatorCallIds[callId]===true,callAttemptCreator=!!(callId&&signalPendingCallAttempts[callId]&&signalPendingCallAttempts[callId].member===member),pendingSignals=[],leavingTransport=signalTransport,leavingMember=member;
    if(callId&&upCall.active&&!(signalTransportFlag&&signalType==='pagehide')){
      if(signalTransportFlag){
        if(signalTransport&&signalRoomId&&!upCall.pendingInvite)pendingSignals.push(callSendAll('ended',{updatedAt:Date.now()}));
        if(signalRoomCreator)sendRealtimeEvent('call_signal',{type:'ended',callId:callId,from:member,participants:upCall.participants.slice(),updatedAt:Date.now(),discoveryOnly:true});
      }else sendRealtimeEvent('call_signal',{type:'ended',callId:callId,from:member,participants:upCall.participants.slice(),updatedAt:Date.now()});
    }
    if(upCall.presenceTimer){clearInterval(upCall.presenceTimer);upCall.presenceTimer=null;}
    if(sendSignal&&callId){
      try{
        if(signalType==='hangup'&&upCall.peer)pendingSignals.push(callSend('hangup'));
        else if(signalType)pendingSignals.push(callSendAll(signalType));
        else if(upCall.connected||upCall.participants.length>2)pendingSignals.push(callSendAll('leave'));
        else if(upCall.peer)pendingSignals.push(callSend('hangup'));
      }catch(e){}
    }
    if(upCall.timer){clearTimeout(upCall.timer);upCall.timer=null;}
    if(upCall.counterTimer){clearInterval(upCall.counterTimer);upCall.counterTimer=null;}
    callStopRingtone();
    Object.keys(upCall.peers).slice().forEach(function(name){callRemovePeer(name,false);});
    callStopStream();
    try{if(upCall.signalAbortController)upCall.signalAbortController.abort();}catch(e){}
    upCall.signalAbortController=null;
    if(signalRoomId){
      signalStopCallPolling(signalRoomId);
      if(!signalPendingCallLeaves[signalRoomId]){
        signalPendingCallLeaves[signalRoomId]={roomId:signalRoomId,callId:callId,member:leavingMember,transport:leavingTransport,promise:null,createdAt:Date.now()};
      }
      signalPersistPendingCallLeaves();
      if(callAttemptCreator){var attemptEntry=signalPendingCallAttempts[callId];if(attemptEntry)attemptEntry.roomId=signalRoomId;signalPersistPendingCallAttempts();}
      delete signalRoomByCallId[callId];delete signalCallIdByRoom[signalRoomId];delete signalRosterCache[signalRoomId];
    }
    delete signalCreatorCallIds[callId];
    upCall.callId='';upCall.peer='';upCall.role='';upCall.initiator='';upCall.participants=[];upCall.pendingInvites={};upCall.pendingOffers={};upCall.pendingInvite=null;upCall.peers={};upCall.localStream=null;upCall.remoteStream=null;upCall.audio=null;upCall.active=false;upCall.connected=false;upCall.muted=false;upCall.startedAt=0;upCall.waitingForConnection=false;upCall.notice='';
    callHideOverlay();
    cleanupPromise=Promise.allSettled(pendingSignals.map(function(p){return Promise.resolve(p);})).then(function(){
      if(callAttemptCreator){
        return signalAttemptPendingCallAttempt(callId,leavingTransport,true).then(function(ok){
          if(!ok&&signalRoomId){
            return signalAttemptPendingCallLeave(signalRoomId,leavingTransport,true).then(function(leaveOk){
              if(!leaveOk)return false;
              delete signalPendingCallAttempts[callId];signalPersistPendingCallAttempts();
              return signalRetryPendingCallAttempts().then(function(attemptsOk){
                return signalRetryPendingCallLeaves().then(function(leavesOk){return attemptsOk&&leavesOk;});
              });
            });
          }
          if(!ok)return false;
          return signalRetryPendingCallAttempts().then(function(attemptsOk){
            return signalRetryPendingCallLeaves().then(function(leavesOk){return attemptsOk&&leavesOk;});
          });
        });
      }
      if(!signalRoomId){
        return signalRetryPendingCallAttempts().then(function(attemptsOk){
          return signalRetryPendingCallLeaves().then(function(leavesOk){return attemptsOk&&leavesOk;});
        });
      }
      return signalAttemptPendingCallLeave(signalRoomId,leavingTransport,true).then(function(ok){
        if(ok||!signalPendingCallLeaves[signalRoomId]){
          return signalRetryPendingCallAttempts().then(function(attemptsOk){
            return signalRetryPendingCallLeaves().then(function(leavesOk){return attemptsOk&&leavesOk;});
          });
        }
        return false;
      });
    });
    return cleanupPromise;
  }
  function callFail(msg){
    if(upCall.timer){clearTimeout(upCall.timer);upCall.timer=null;}
    if(upCall.counterTimer){clearInterval(upCall.counterTimer);upCall.counterTimer=null;}
    callStopRingtone();
    callRender('Chamada',msg,[{label:'Fechar',onClick:function(){callCleanup(false);}}]);
  }
  async function callGetMicrophone(){
    if(upCall.localStream)return upCall.localStream;
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('O navegador n\u00e3o liberou acesso ao microfone.');
    upCall.localStream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    return upCall.localStream;
  }
  function callGetPeer(name){
    if(!name||name===member)return null;
    var p=upCall.peers[name];
    if(!p){p={name:name,pc:null,remoteStream:null,audio:null,audioSource:null,audioGain:null,pendingCandidates:[],connected:false,offerSent:false,disconnectTimer:null};upCall.peers[name]=p;}
    return p;
  }
  async function callCreatePeer(name){
    var p=callGetPeer(name);if(!p)return null;
    if(p.pc&&p.pc.signalingState!=='closed')return p;
    if(typeof RTCPeerConnection==='undefined')throw new Error('WebRTC n\u00e3o est\u00e1 dispon\u00edvel neste navegador.');
    await callGetMicrophone();
    var pc=new RTCPeerConnection();p.pc=pc;p.connected=false;p.offerSent=false;
    if(upCall.localStream)upCall.localStream.getTracks().forEach(function(t){pc.addTrack(t,upCall.localStream);});
    pc.onicecandidate=function(e){if(e.candidate&&upCall.active)callSendTo(name,'ice',{candidate:e.candidate,connectionId:callConnectionId(name)});};
    pc.ontrack=function(e){p.remoteStream=e.streams&&e.streams[0]?e.streams[0]:null;if(p.remoteStream)callAttachRemoteAudio(name,p.remoteStream);callPrimeAudio();};
    pc.onconnectionstatechange=function(){
      var st=pc.connectionState;
      if(st==='connected'){
        p.connected=true;upCall.connected=true;upCall.waitingForConnection=false;callStopRingtone();callPrimeAudio();
        if(!upCall.startedAt)callStartCounter();callRenderConnected();
      }else if(st==='failed'||st==='disconnected'){
        if(p.disconnectTimer)clearTimeout(p.disconnectTimer);
        p.disconnectTimer=setTimeout(function(){
          if(!upCall.active||p.pc!==pc)return;
          if(pc.connectionState==='failed'||pc.connectionState==='disconnected'||pc.connectionState==='closed'){
            callRemovePeer(name,true);
            if(upCall.participants.length<=1)callCleanup(false);
            else if(upCall.active)callRenderConnected();
          }
        },1200);
      }else if(st==='closed'){
        callRemovePeer(name,true);
        if(upCall.participants.length<=1&&upCall.active)callCleanup(false);
      }
    };
    return p;
  }
  async function callStartOffer(name){
    if(!upCall.active||!name||name===member)return;
    var p=await callCreatePeer(name);if(!p||!p.pc||p.offerSent)return;
    var offer=await p.pc.createOffer();await p.pc.setLocalDescription(offer);p.offerSent=true;
    callSendTo(name,'offer',{sdp:p.pc.localDescription,phase:'mesh'});
  }
  async function callAddQueuedCandidates(p){
    if(!p||!p.pc||!p.pc.remoteDescription)return;
    var q=p.pendingCandidates.splice(0);
    for(var i=0;i<q.length;i++){try{await p.pc.addIceCandidate(q[i]);}catch(e){}}
  }
  function callMergeParticipants(list){
    var out=[];
    if(typeof member==='string'&&member&&member.length<=80)out.push(member);
    (Array.isArray(list)?list.slice(0,32):[]).forEach(function(n){if(typeof n==='string'&&n&&n.length<=80&&out.indexOf(n)<0&&out.length<32)out.push(n);});
    upCall.participants=out;
  }
  function callRenderConnected(){
    if(!upCall.active)return;
    callRender(callNames(' + ')||'Chamada',callConnectedLabel(),[
      {label:upCall.muted?'Ativar mic':'Mutar',icon:upCall.muted?'micOff':'mic',muted:upCall.muted,onClick:toggleCallMute},
      {label:'Desligar',icon:'hangup',danger:true,onClick:function(){callCleanup(true);}}
    ]);
  }
  async function callJoinActiveCall(callId){
    var entry=upCallDirectory[callId];
    if(upCall.active){message('Você já está em uma chamada.',true);return;}
    if(!entry||!entry.participants||entry.participants.length<2){message('Esta chamada não está mais disponível. Atualize a lista e tente novamente.',true);return;}
    upCall.callId=callId;upCall.peer=entry.participants.find(function(n){return n!==member;})||'';upCall.role='member';upCall.initiator=entry.initiator||upCall.peer;upCall.participants=entry.participants.slice();if(upCall.participants.indexOf(member)<0)upCall.participants.push(member);
    upCall.pendingInvites={};upCall.pendingOffers={};upCall.pendingInvite=null;upCall.peers={};upCall.active=true;upCall.connected=false;upCall.startedAt=0;upCall.waitingForConnection=true;
    try{
      await callGetMicrophone();
      callRender(callNames(' + '),'Entrando na chamada…',[{label:'Desligar',icon:'hangup',danger:true,onClick:function(){callCleanup(true,'leave');}}]);
      var others=upCall.participants.filter(function(n){return n&&n!==member;});
      others.forEach(function(n){callSendTo(n,'join',{phase:'mesh',joinExisting:true});});
      callStartPresence();
    }catch(e){callCleanup(false);message(e.message||'Não foi possível entrar na chamada.',true);}
  }
  async function startOutgoingCall(target){
    if(!target||target===member)return;
    if(signalTransportFlag){if(!signalTransport){message('A sinalização autenticada não está configurada. A chamada não foi enviada.',true);return;}startOutgoingCallWithTransport(target);return;}
    
    if(upCall.active){message('Voc\u00ea j\u00e1 est\u00e1 em uma chamada.',true);return;}
    if(upCall.starting){message('Uma chamada já está sendo preparada.',false);return;}
    var callStartAttempt=(upCall.startAttempt||0)+1;
    upCall.startAttempt=callStartAttempt;upCall.starting=true;
    if(!realtimeActive||!realtimeChannel){
      message('Reconectando a conexão das chamadas...',false);
      var realtimeReady=false;
      try{realtimeReady=await waitForRealtimeReady(10000);}catch(e){}
      if(!realtimeReady||upCall.startAttempt!==callStartAttempt){
        if(upCall.startAttempt===callStartAttempt)upCall.starting=false;
        if(!realtimeReady)message('A conexão ainda não foi restabelecida. Tente novamente.',true);
        return;
      }
    }
    if(upCall.startAttempt!==callStartAttempt){return;}
    if(upCall.active){upCall.starting=false;message('Você já está em uma chamada.',true);return;}
    upCall.starting=false;
    
    
    upCall.callId=callNewId();upCall.peer=target;upCall.role='caller';upCall.initiator=member;upCall.participants=[member,target];
    upCall.pendingInvites={};upCall.pendingOffers={};upCall.active=true;upCall.connected=false;upCall.startedAt=0;upCall.waitingForConnection=true;
    callStartPresence();callPrimeAudio();callStartRingtone();callRender(target,'Chamando\u2026',[{label:'Cancelar',danger:true,onClick:function(){callCleanup(true,'hangup');}}]);
    upCall.timer=setTimeout(function(){if(upCall.active&&!upCall.connected){callFail('Sem resposta.');try{callSend('hangup');}catch(e){}}},30000);
    try{
      await callGetMicrophone();var p=await callCreatePeer(target);var offer=await p.pc.createOffer();await p.pc.setLocalDescription(offer);p.offerSent=true;
      callSendTo(target,'offer',{sdp:p.pc.localDescription,phase:'initial'});
    }catch(e){callFail(e.message||'N\u00e3o foi poss\u00edvel iniciar a chamada.');}
  }
  async function callAcceptIncomingOffer(remoteName){
    var p=callGetPeer(remoteName),sdp=upCall.pendingOffers[remoteName];if(!p||!sdp)return;
    if(!signalTransportFlag&&(!realtimeActive||!realtimeChannel)){
      var realtimeReady=await waitForRealtimeReady(10000);
      if(!realtimeReady){message('A conexão ainda não foi restabelecida. Tente novamente.',true);return;}
    }
    callStartPresence();
    try{
      upCall.waitingForConnection=true;await callGetMicrophone();await callCreatePeer(remoteName);
      await p.pc.setRemoteDescription(new RTCSessionDescription(sdp));await callAddQueuedCandidates(p);
      var answer=await p.pc.createAnswer();await p.pc.setLocalDescription(answer);delete upCall.pendingOffers[remoteName];
      callSendTo(remoteName,'answer',{sdp:p.pc.localDescription,phase:'initial'});
      callRender(remoteName,'Conectando\u2026',[{label:upCall.muted?'Ativar mic':'Mutar',icon:upCall.muted?'micOff':'mic',muted:upCall.muted,onClick:toggleCallMute},{label:'Desligar',icon:'hangup',danger:true,onClick:function(){callCleanup(true);}}]);
    }catch(e){
      try{callSendTo(remoteName,'reject',{reason:'\u00c1udio n\u00e3o autorizado'});}catch(_){}
      callFail(e.message||'N\u00e3o foi poss\u00edvel atender a chamada.');
    }
  }
  async function callAcceptGroupInvite(){
    var invite=upCall.pendingInvite;if(!invite||!upCall.active)return;
    var signalRoomId=signalRoomByCallId[upCall.callId];
    if(!signalTransportFlag&&(!realtimeActive||!realtimeChannel)){
      var realtimeReady=await waitForRealtimeReady(10000);
      if(!realtimeReady){message('A conexão ainda não foi restabelecida. Tente novamente.',true);return;}
    }
    if(signalTransportFlag){
      if(!signalTransport||!signalRoomId){callCleanup(false);message('A sala autenticada não está disponível. Tente novamente.',true);return;}
      try{
        await signalTransport.accept(signalRoomId);
        upCall.pendingInvite=null;upCall.role='member';callMergeParticipants(invite.participants||[invite.from]);
        upCall.waitingForConnection=true;signalStartCallPolling(signalRoomId,upCall.callId);callStartPresence();
        callRender(callNames(' + '),'Aguardando conexão…',[{label:upCall.muted?'Ativar mic':'Mutar',icon:upCall.muted?'micOff':'mic',muted:upCall.muted,onClick:toggleCallMute},{label:'Desligar',icon:'hangup',danger:true,onClick:function(){callCleanup(true);}}]);
      }catch(e){callCleanup(false);message(e.message||'Não foi possível aceitar o convite.',true);}
      return;
    }
    upCall.pendingInvite=null;upCall.role='member';callMergeParticipants(invite.participants||[invite.from]);callStartPresence();
    try{
      await callGetMicrophone();upCall.waitingForConnection=true;
      upCall.participants.filter(function(n){return n!==member;}).forEach(function(n){callSendTo(n,'join',{phase:'mesh'});});
      callRender(callNames(' + '),'Conectando\u2026',[{label:upCall.muted?'Ativar mic':'Mutar',icon:upCall.muted?'micOff':'mic',muted:upCall.muted,onClick:toggleCallMute},{label:'Desligar',icon:'hangup',danger:true,onClick:function(){callCleanup(true);}}]);
    }catch(e){
      try{callSendTo(invite.from,'reject',{reason:'\u00c1udio n\u00e3o autorizado'});}catch(_){}
      callCleanup(false);message(e.message||'N\u00e3o foi poss\u00edvel entrar na chamada.',true);
    }
  }
  async function callAcceptIncomingCall(){
    if(upCall.pendingInvite)return callAcceptGroupInvite();
    var names=Object.keys(upCall.pendingOffers||{});if(names.length)return callAcceptIncomingOffer(names[0]);
  }
  async function callRequestToJoin(callId,target){
    var entry=upCallDirectory[callId];
    if(upCall.active){message('Você já está em uma chamada.',true);return;}
    if(!entry||!entry.participants||entry.participants.indexOf(target)<0){message('A chamada não está mais disponível. Atualize a equipe.',true);return;}
    if(signalTransportFlag){
      if(!signalTransport){message('A sinalização autenticada não está configurada. A chamada não foi enviada.',true);return;}
      signalTransport.requestInvite(callId).then(function(){
        message('Pedido para entrar enviado ao responsável pela chamada. Aguarde a confirmação.',false);
      }).catch(function(e){
        message(e.status===409?'Já existe um convite ou pedido pendente para esta chamada.':e.status===404?'A chamada não está mais disponível.':'Não foi possível enviar o pedido de entrada.',true);
      });
      return;
    }
    if(!realtimeActive||!realtimeChannel){
      var realtimeReady=await waitForRealtimeReady(10000);
      if(!realtimeReady){message('A conexão ainda não foi restabelecida. Tente novamente.',true);return;}
    }

    if(upCall.active){message('Você já está em uma chamada.',true);return;}
        var sent=sendRealtimeEvent('call_signal',{type:'join_request',callId:callId,from:member,to:target,target:target,participants:entry.participants.slice(),updatedAt:Date.now()});
    if(sent)message('Pedido para entrar enviado a '+target+'. Aguarde a confirmação.',false);
    else message('Não foi possível enviar o pedido de entrada.',true);
  }
  async function receiveCallSignal(p){
    if(!p||typeof p.type!=='string'||typeof p.callId!=='string'||!p.callId||p.callId.length>160||typeof p.from!=='string'||!p.from||p.from.length>80||p.from===member)return;
    if(signalTransportFlag&&!p._authenticatedTransport&&!((p.type==='presence'||p.type==='ended'||p.type==='join_declined')&&p.discoveryOnly===true))return;
    if(p.type!=='presence'&&p.type!=='ended'&&p.to!==member)return;
    if((p.type==='offer'||p.type==='answer')&&(!p.sdp||typeof p.sdp.sdp!=='string'||p.sdp.sdp.length>100000))return;
    if(p.type==='ice'&&(!p.candidate||JSON.stringify(p.candidate).length>4096))return;
    if(p.type==='presence'){callReceivePresence(p);return;}
    if(p.type==='ended'){delete upCallDirectory[p.callId];return;}
    if(p.type==='join_request'){
      if(!upCall.active||p.callId!==upCall.callId||upCall.participants.indexOf(member)<0)return;
      var requester=String(p.from);
      var accepted=false;
      try{accepted=window.confirm(requester+' quer entrar na sua chamada em grupo.\n\nPermitir a entrada?');}catch(e){}
      if(signalTransportFlag){
        if(signalTransport&&signalRoomByCallId[p.callId]){
          if(accepted)callSendTo(requester,'invite',{participants:upCall.participants.slice(),initiator:upCall.initiator||member});
          else callSendTo(requester,'join_declined',{updatedAt:Date.now()});
        }else{
          message('A sinalização autenticada da chamada não está disponível. O pedido não foi processado.',true);
        }
      }else sendRealtimeEvent('call_signal',{type:accepted?'join_approved':'join_declined',callId:p.callId,from:member,to:requester,participants:upCall.participants.slice(),updatedAt:Date.now()});
      if(accepted)message('Você aceitou o pedido de '+requester+'. Enviando convite para entrar…',false);
      return;
    }
    if(p.type==='join_approved'){callJoinActiveCall(p.callId);return;}
    if(p.type==='join_declined'){message(p.from+' recusou seu pedido para entrar na chamada.',true);return;}
    if(p.type==='offer'){
      if(!upCall.active){
        upCall.callId=p.callId;upCall.peer=p.from;upCall.role='callee';upCall.initiator=p.from;
        upCall.participants=(Array.isArray(p.participants)&&p.participants.length?p.participants:[member,p.from]).slice();
        if(upCall.participants.indexOf(member)<0)upCall.participants.push(member);
        upCall.pendingOffers={};upCall.pendingOffers[p.from]=p.sdp;upCall.pendingInvite=null;upCall.peers={};
        upCall.active=true;upCall.connected=false;upCall.startedAt=0;upCall.waitingForConnection=false;
        callStartRingtone();
        callRender(p.from,'Chamada recebida',[{label:'Atender',icon:'phone',onClick:function(){callAcceptIncomingCall();}},{label:'Recusar',icon:'hangup',danger:true,onClick:function(){var roomId=signalRoomByCallId[p.callId];if(signalTransport&&roomId){signalTransport.decline(roomId).catch(function(){}).finally(function(){callCleanup(false);});}else{callSendTo(p.from,'reject',{reason:'Recusado'});callCleanup(false);}}}]);
        return;
      }
      if(p.callId!==upCall.callId){
        callSendTo(p.from,'busy',{connectionId:String(p.callId)+'::busy'});return;
      }
      callMergeParticipants(p.participants||[]);
      if(!upCall.peers[p.from]||!upCall.peers[p.from].pc){
        upCall.pendingOffers[p.from]=p.sdp;
        if(p.phase==='mesh'||(signalTransport&&signalRoomByCallId[p.callId]&&upCall.role==='member'&&!upCall.pendingInvite)){try{await callAcceptIncomingOffer(p.from);}catch(e){}}
      }
      return;
    }
    if(p.type==='invite'){
      if(upCall.active){
        if(p.callId===upCall.callId)return;
        callSendTo(p.from,'busy',{connectionId:String(p.callId)+'::busy'});return;
      }
      upCall.callId=p.callId;upCall.peer=p.from;upCall.role='callee';upCall.initiator=p.initiator||p.from;
      callMergeParticipants(p.participants||[p.from]);
      upCall.pendingInvite={callId:p.callId,from:p.from,participants:upCall.participants.slice()};
      upCall.pendingOffers={};upCall.peers={};upCall.active=true;upCall.connected=false;upCall.startedAt=0;
      callStartRingtone();
      var inviteNames=Array.isArray(p.participants)?p.participants.filter(function(n){return n&&n!==member;}).join(', '):p.from;
      callRender(Array.isArray(p.participants)&&p.participants.length>2?'Convite para chamada em grupo':'Chamada recebida','Participantes: '+inviteNames,[
        {label:'Atender',icon:'phone',onClick:function(){callAcceptIncomingCall();}},
        {label:'Recusar',icon:'hangup',danger:true,onClick:function(){var roomId=signalRoomByCallId[p.callId];if(signalTransport&&roomId){signalTransport.decline(roomId).catch(function(){}).finally(function(){callCleanup(false);});}else{callSendTo(p.from,'reject',{reason:'Recusado'});callCleanup(false);}}}
      ]);
      return;
    }
    if(!upCall.active||p.callId!==upCall.callId)return;
    if(p.from===member)return;
    if(p.type==='join'){
      callMergeParticipants(p.participants||[]);
      if(upCall.participants.indexOf(p.from)<0)upCall.participants.push(p.from);
      try{await callStartOffer(p.from);callRenderConnected();}
      catch(e){upCall.notice='Falha ao conectar '+p.from+'.';callRenderConnected();}
      return;
    }
    if(p.type==='answer'){
      var answerPeer=callGetPeer(p.from);
      if(answerPeer&&answerPeer.pc&&p.sdp){
        try{await answerPeer.pc.setRemoteDescription(new RTCSessionDescription(p.sdp));await callAddQueuedCandidates(answerPeer);}
        catch(e){callRemovePeer(p.from,false);upCall.notice='Resposta de '+p.from+' inv\u00e1lida.';callRenderConnected();}
      }
      return;
    }
    if(p.type==='ice'&&p.candidate){
      var icePeer=callGetPeer(p.from);if(!icePeer)return;
      if(icePeer.pc&&icePeer.pc.remoteDescription){try{await icePeer.pc.addIceCandidate(p.candidate);}catch(e){}}
      else icePeer.pendingCandidates.push(p.candidate);
      return;
    }
    if(p.type==='ringtone_stop'){callStopRingtone(false);return;}
    if(p.type==='reject'||p.type==='busy'){
      if(upCall.pendingInvites[p.from]){
        delete upCall.pendingInvites[p.from];upCall.notice=p.from+(p.type==='busy'?' est\u00e1 em outra chamada.':' recusou o convite.');callRenderConnected();return;
      }
      if(upCall.peer===p.from&&!upCall.connected){callFail(p.type==='busy'?'O usu\u00e1rio est\u00e1 em outra chamada.':'Chamada recusada.');return;}
      return;
    }
    if(p.type==='hangup'){
      if(upCall.peer===p.from&&!upCall.connected&&upCall.participants.length<=2){callCleanup(false);return;}
      callRemovePeer(p.from,true);
      if(upCall.active){if(upCall.participants.length<=1)callCleanup(false);else callRenderConnected();}
      return;
    }
    if(p.type==='leave'){
      callRemovePeer(p.from,true);
      if(upCall.active){if(upCall.participants.length<=1)callCleanup(false);else callRenderConnected();}
      return;
    }
  }
  function toggleCallMute(){
    if(!upCall.localStream)return;
    upCall.muted=!upCall.muted;upCall.localStream.getAudioTracks().forEach(function(t){t.enabled=!upCall.muted;});callRenderConnected();
  }

  function handleRealtimeChatRead(payload){
    var p=payload||{},reader=String(p.reader||''),ids=Array.isArray(p.messageIds)?p.messageIds.map(String):[];
    if(!reader||reader===member||!ids.length)return;
    var changed=false;
    ids.forEach(function(id){var m=chatCache.find(function(x){return String(x.id)===id;});if(!m||m.user!==member)return;m.readBy=Array.isArray(m.readBy)?m.readBy.slice():[];if(m.readBy.indexOf(reader)<0){m.readBy.push(reader);changed=true;}});
    if(changed&&!chat.classList.contains('hidden'))renderChat();
  }

  var realtimeChatRefreshTimer=null,realtimeChatRefreshLastAt=0;
  function scheduleRealtimeChatRefresh(){
    if(!isAuthenticated()||chat.classList.contains('hidden')||realtimeChatRefreshTimer)return;
    var generation=authGeneration,requestedMember=member;
    var wait=Math.max(0,1000-(Date.now()-realtimeChatRefreshLastAt));
    realtimeChatRefreshTimer=setTimeout(function(){
      realtimeChatRefreshTimer=null;
      if(!isAuthenticated()||generation!==authGeneration||requestedMember!==member)return;
      realtimeChatRefreshLastAt=Date.now();
      loadChat(true);
    },wait);
  }
  // The shared Realtime topic is public. Treat broadcast payloads as untrusted hints,
  // and reconcile chat state only from the authenticated API.
  function handleRealtimeChatFast(){scheduleRealtimeChatRefresh();}
  var remotePollHintTimer=null;
  function scheduleRemoteStatusPoll(){
    if(remotePollHintTimer||!isAuthenticated())return;
    var expectedGeneration=authGeneration,expectedMember=member;
    remotePollHintTimer=setTimeout(function(){
      remotePollHintTimer=null;
      if(isAuthenticated()&&expectedGeneration===authGeneration&&expectedMember===member)pollRemoteStatus();
    },1100);
  }
  var realtimeStatusRefreshTimer=null,realtimeStatusRefreshLastAt=0;
  function scheduleRealtimeStatusRefresh(){
    if(realtimeStatusRefreshTimer)return;
    var expectedGeneration=authGeneration,expectedMember=member;
    var wait=Math.max(0,1000-(Date.now()-realtimeStatusRefreshLastAt));
    realtimeStatusRefreshTimer=setTimeout(function(){
      realtimeStatusRefreshTimer=null;
      if(!isAuthenticated()||expectedGeneration!==authGeneration||expectedMember!==member)return;
      realtimeStatusRefreshLastAt=Date.now();
      refresh();
    },wait);
  }
  function startRealtime(){
    initSignalingTransport();
    if(!isAuthenticated()||realtimeClient||typeof supabase==='undefined'||!supabase.createClient)return;
    var realtimeGeneration=authGeneration,realtimeMember=member;
    try{
      realtimeClient=supabase.createClient(UP_REALTIME_URL,UP_REALTIME_KEY,{auth:{persistSession:false}});
      realtimeChannel=realtimeClient.channel(UP_REALTIME_TOPIC);
      realtimeChannel
        .on('broadcast',{event:'db_change'},function(){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)scheduleRealtimeChatRefresh();})
        .on('broadcast',{event:'chat_fast'},function(){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)handleRealtimeChatFast();})
        .on('broadcast',{event:'chat_read'},function(){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)scheduleRealtimeChatRefresh();})
        .on('broadcast',{event:'user_status'},function(){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)scheduleRealtimeStatusRefresh();})
        .on('broadcast',{event:'chat_presence'},function(payload){if(!isAuthenticated()||realtimeGeneration!==authGeneration||realtimeMember!==member)return;var p=payload&&payload.payload||{};if(!p.name)return;chatPresence[p.name]=p.open?Date.now()+25000:0;updateChatHeaderPresence();})
        .on('broadcast',{event:'health_ping'},function(payload){if(isAuthenticated()&&realtimeGeneration===authGeneration)handleHealthPing(payload&&payload.payload||{});})
        .on('broadcast',{event:'health_pong'},function(payload){if(isAuthenticated()&&realtimeGeneration===authGeneration)handleHealthPong(payload&&payload.payload||{});})
        .on('broadcast',{event:'remote_command'},function(){
          if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)scheduleRemoteStatusPoll();
        })
        .on('broadcast',{event:'call_signal'},function(payload){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)receiveCallSignal(payload&&payload.payload||{});})
        .on('broadcast',{event:VOICE_ROOM_EVENT},function(payload){if(!signalTransportFlag&&isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)voiceRoomReceive(payload&&payload.payload||{});})
        .on('broadcast',{event:SCREEN_ROOM_EVENT},function(payload){if(!signalTransportFlag&&isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)screenShareReceive(payload&&payload.payload||{});})
        .on('broadcast',{event:'remote_result'},function(){ if(!isAuthenticated()||realtimeGeneration!==authGeneration||realtimeMember!==member)return; /* Public Realtime is an untrusted hint; waitRemoteResult polls the authenticated result endpoint. */ })
        .subscribe(function(status){
          if(!isAuthenticated()||realtimeGeneration!==authGeneration||realtimeMember!==member){stopRealtime();return;}
          if(status==='SUBSCRIBED'){realtimeActive=true;if(realtimeRetryTimer){clearTimeout(realtimeRetryTimer);realtimeRetryTimer=null;}broadcastChatPresence(!chat.classList.contains('hidden'));return;}
          if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
            realtimeActive=false;
            try{if(realtimeChannel)realtimeChannel.unsubscribe();}catch(e){}
            realtimeChannel=null;realtimeClient=null;
            if(!realtimeRetryTimer)realtimeRetryTimer=setTimeout(function(){realtimeRetryTimer=null;if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)startRealtime();},3000);
          }
        });
    }catch(e){
      realtimeActive=false;realtimeChannel=null;realtimeClient=null;
      if(!realtimeRetryTimer)realtimeRetryTimer=setTimeout(function(){realtimeRetryTimer=null;if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)startRealtime();},5000);
    }
  }
  function broadcastChatPresence(open){
    if(!member||(!isAuthenticated()&&open))return;
    chatPresence[member]=open?Date.now()+25000:0;
    if(!realtimeActive||!realtimeChannel)return;
    try{realtimeChannel.send({type:'broadcast',event:'chat_presence',payload:{name:member,open:!!open}});}catch(e){}
  }
  function stopRealtime(options){
    var preserveVoiceRoomContext=!!(options&&options.preserveVoiceRoomContext);
    if(signalInvitationTimer){clearInterval(signalInvitationTimer);signalInvitationTimer=null;}if(signalTransport){signalTransport.stopAll();signalTransport=null;}Object.keys(signalPollStops).forEach(signalStopCallPolling);signalRoomByCallId=Object.create(null);signalCallIdByRoom=Object.create(null);signalCreatorCallIds=Object.create(null);if(!preserveVoiceRoomContext)signalVoiceRoomRoomId='';signalVoiceRoomPrepared=false;signalVoiceRoomCreator=false;
    realtimeActive=false;
    if(remotePollHintTimer){clearTimeout(remotePollHintTimer);remotePollHintTimer=null;}
    if(realtimeStatusRefreshTimer){clearTimeout(realtimeStatusRefreshTimer);realtimeStatusRefreshTimer=null;}
    if(realtimeRetryTimer){clearTimeout(realtimeRetryTimer);realtimeRetryTimer=null;}
    try{if(realtimeChannel)realtimeChannel.unsubscribe();}catch(e){}
    try{if(realtimeClient)realtimeClient.removeAllChannels();}catch(e){}
    realtimeChannel=null;realtimeClient=null;
  }
  // Recover local media state when the browser reports a real network outage.
  // Voice rooms remain opt-in: after the channel reconnects, the user can re-enter.
  var teamLiteNetworkOffline=false;
  window.addEventListener('offline',function(){
    teamLiteNetworkOffline=true;
    try{if(voiceRoom.active||voiceRoom.joining||signalVoiceRoomRoomId)voiceRoomLeave({skipServerLeave:true}).catch(function(){});}catch(e){}
    try{if(upCall&&upCall.active)callCleanup(false);}catch(e){}
    stopRealtime({preserveVoiceRoomContext:true});
  });
  window.addEventListener('online',function(){
    if(!teamLiteNetworkOffline)return;
    teamLiteNetworkOffline=false;
    stopRealtime({preserveVoiceRoomContext:true});
    if(!isAuthenticated())return;
    startRealtime();
    refresh();
  });
  function updateLuccaPresence(active){
    luccaOnline=!!active;
    if(quickChatBubble)quickChatBubble.classList.toggle('lucca-active',luccaOnline);
    var mainChatBtn=card.querySelector('.up-chat-btn');
    if(mainChatBtn)mainChatBtn.classList.toggle('lucca-active',luccaOnline);
    var alert=chat.querySelector('.up-chat-lucca-alert');
    if(alert)alert.classList.toggle('hidden',!luccaOnline);
    var names=Array.isArray(window.__upstatusMembers)?window.__upstatusMembers.slice():['Ricardo','Lohan','Guilherme'];
    names=names.filter(function(n){return n!=='Lucca';});
    if(luccaOnline)names.push('Lucca');
    window.__upstatusMembers=names;
  }
  function playLuccaEntrySound(){try{var a=new Audio(server+'/lucca-devil-laugh.wav?'+Date.now());a.volume=.7;var p=a.play();if(p&&p.catch)p.catch(function(){});}catch(e){}}
  function loadChat(forceFull){
    if(!isAuthenticated()||chat.classList.contains('hidden'))return;
    if(chatLoading){if(forceFull)chatForceFullQueued=true;return;}
    chatLoading=true;
    var requestGeneration=authGeneration,requestMember=member;
    var useFast=!forceFull&&chatInitialized&&chatCache.length>0&&chatFastSince;
    var route='/api/chat';
    if(useFast)route='/api/chat?fast=1&since='+encodeURIComponent(new Date(new Date(chatFastSince).getTime()-2000).toISOString());
    api('GET',route).then(function(d){
      if(!isAuthenticated()||requestGeneration!==authGeneration||requestMember!==member)return;
      if(chatReconnectTimer){clearTimeout(chatReconnectTimer);chatReconnectTimer=null;}
      var previousLoadError=chat.querySelector('.up-chat-load-error');if(previousLoadError)previousLoadError.remove();
      var incoming=d.messages||[],nextMessages;
      if(useFast){
        var byId={};
        chatCache.forEach(function(m){byId[m.id]=m;});
        incoming.forEach(function(m){
          var id=String(m.id);
          byId[id]=mergeChatMessage(byId[id],m);
        });
        nextMessages=Object.keys(byId).map(function(k){return byId[k];}).sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});
      }else{
        nextMessages=incoming.map(function(m){
          var existing=chatCache.find(function(x){return String(x.id)===String(m.id);});
          return mergeChatMessage(existing,m);
        });
      }
      if(isTeamLiteEphemeralMember()&&!teamLiteChatSessionActive)beginTeamLiteEphemeralChatSession();
      // O backend filtra mensagens pela sessão autenticada (joinedAt do servidor). Não reaplicar um timestamp local: isso ocultaria mensagens válidas após reload.
      updateLuccaPresence(!!d.luccaOnline);
      var latestLuccaJoin=null;
      for(var li=nextMessages.length-1;li>=0;li--){if(nextMessages[li].type==='system'&&nextMessages[li].systemType==='lucca_join'){latestLuccaJoin=nextMessages[li];break;}}
      if(latestLuccaJoin){if(lastLuccaJoinEventId&&latestLuccaJoin.id!==lastLuccaJoinEventId)playLuccaEntrySound();lastLuccaJoinEventId=latestLuccaJoin.id;}
      var pendingUploads=chatCache.filter(function(m){return m&&m.pendingUpload;});
      if(pendingUploads.length){var nextIds={};nextMessages.forEach(function(m){nextIds[String(m.id)]=true;});pendingUploads.forEach(function(m){if(!nextIds[String(m.id)])nextMessages.push(m);});nextMessages.sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});}
      var listBeforeLoad=chat.querySelector('.up-chat-list');
      var wasNearBottomBeforeLoad=!!listBeforeLoad&&(listBeforeLoad.scrollHeight-listBeforeLoad.scrollTop-listBeforeLoad.clientHeight)<90;
      var previousMessageIds={};chatCache.forEach(function(m){previousMessageIds[String(m.id)]=true;});
      var hasNewExternalMessage=nextMessages.some(function(raw){var m=normalizeChatMessage(raw);return m&&m.id!=null&&!previousMessageIds[String(m.id)]&&m.user!==member&&m.type!=='system';});
      var beforeKey=chatDataKey(chatCache);
      chatCache=nextMessages;
      chatDomInitialized=true;chatDomMember=member;
      if(d.profiles)profileCache=d.profiles;
      processChatNotifications(incoming,!useFast);
      var newest=chatCache[chatCache.length-1];
      if(newest&&newest.createdAt)chatFastSince=newest.createdAt;
      var chatVisible=!chat.classList.contains('hidden')&&!document.hidden;
      if(chatVisible)setUnread(0);
      else if(typeof d.unreadCount==='number')setUnread(d.unreadCount);
      if(!chat.classList.contains('hidden')){
        var nextKey=chatDataKey(chatCache);
        var list=chat.querySelector('.up-chat-list');
        if(chatPendingInitialScroll)chatForceScrollBottom=true;
        if(nextKey!==beforeKey||!list||list.getAttribute('data-render-key')!==nextKey)renderChat();
        if(hasNewExternalMessage){if(wasNearBottomBeforeLoad){setChatNewMessageIndicator(false);scrollChatToBottom(true);}else showChatNewBelow();}
        if(chatPendingInitialScroll){scrollChatToBottom(true);chatPendingInitialScroll=false;}
        if(Date.now()<chatOpenScrollUntil)scrollChatToBottom(true);
        var completedOpeningLoader=chat.querySelector('.up-chat-opening-loader');
        if(completedOpeningLoader){requestAnimationFrame(function(){scrollChatToBottom(true);requestAnimationFrame(function(){var loaderNow=chat.querySelector('.up-chat-opening-loader');if(loaderNow)loaderNow.remove();});});}
        markVisibleChatRead();
        updateTypingIndicator(d.typing||[]);
      }
    }).catch(function(error){
      if(!isAuthenticated()||requestGeneration!==authGeneration||requestMember!==member)return;
      var list=chat.querySelector('.up-chat-list');
      var failedOpeningLoader=chat.querySelector('.up-chat-opening-loader');if(failedOpeningLoader)failedOpeningLoader.remove();
      if(list){
        var retryBox=list.querySelector('.up-chat-load-error');
        if(!retryBox){retryBox=document.createElement('div');retryBox.className='up-history-empty up-chat-load-error';retryBox.innerHTML='<span style="display:inline-flex;align-items:center;gap:8px"><i style="display:inline-block;width:12px;height:12px;border:2px solid #52627b;border-top-color:#8db4ff;border-radius:50%;animation:upChatUploadSpin .7s linear infinite"></i>Reconectando…</span>';list.appendChild(retryBox);}
        else retryBox.innerHTML='<span style="display:inline-flex;align-items:center;gap:8px"><i style="display:inline-block;width:12px;height:12px;border:2px solid #52627b;border-top-color:#8db4ff;border-radius:50%;animation:upChatUploadSpin .7s linear infinite"></i>Reconectando…</span>';
        if(!chatReconnectTimer)chatReconnectTimer=setTimeout(function(){chatReconnectTimer=null;loadChat(true);},3000);
      }
      try{console.warn('[UpStatus Chat] Falha ao carregar mensagens:',error&&error.message||error);}catch(e){}
    }).finally(function(){
      if(requestGeneration===authGeneration)chatLoading=false;
      if(isAuthenticated()&&requestGeneration===authGeneration&&chatForceFullQueued){chatForceFullQueued=false;if(chatReconnectTimer){clearTimeout(chatReconnectTimer);chatReconnectTimer=null;}loadChat(true);}
    });
  }
  function updateTypingIndicator(names){
    var box=chat.querySelector('.up-chat-typing');if(!box)return;
    var active=(Array.isArray(names)?names:[]).filter(function(n){return n&&n!==member;});
    if(!active.length){box.classList.add('hidden');box.innerHTML='';return;}
    var shown=active.slice(0,2),label=shown.join(' e ')+(active.length>2?' e mais alguém':'');
    var first=shown[0];
    box.innerHTML='<img class="up-chat-typing-avatar" data-typing-avatar="'+esc(first)+'" alt="'+esc(first)+'"><div class="up-chat-typing-dots"><i></i><i></i><i></i></div><span>'+esc(label)+' digitando</span>';
    box.classList.remove('hidden');
    var img=box.querySelector('[data-typing-avatar]');if(img)hydrateAvatar(img,first);
  }
  function sendTypingState(active){if(!isAuthenticated()||!member)return Promise.resolve();return api('POST','/api/chat/typing',{typing:!!active}).catch(function(){});}
  function pollChatTyping(){
    if(!isAuthenticated()||chat.classList.contains('hidden')||typingPolling)return;
    typingPolling=true;var requestGeneration=authGeneration,requestMember=member;
    api('GET','/api/chat/typing').then(function(d){if(isAuthenticated()&&requestGeneration===authGeneration&&requestMember===member&&!chat.classList.contains('hidden'))updateTypingIndicator(d.typing||[]);}).catch(function(){}).finally(function(){if(requestGeneration===authGeneration)typingPolling=false;});
  }
  function stopTypingHeartbeat(){if(typingHeartbeat){clearInterval(typingHeartbeat);typingHeartbeat=null;}if(typingStopTimer){clearTimeout(typingStopTimer);typingStopTimer=null;}sendTypingState(false);}
  function startTypingHeartbeat(){if(!isAuthenticated()||chat.classList.contains('hidden')||typingHeartbeat)return;var heartbeatGeneration=authGeneration;sendTypingState(true);typingHeartbeat=setInterval(function(){var input=chat.querySelector('.up-chat-input');if(!isAuthenticated()||heartbeatGeneration!==authGeneration||!input||chat.classList.contains('hidden')||!String(input.value||'').trim()){stopTypingHeartbeat();return;}sendTypingState(true);},1500);}
  function chatDraftKey(){return key+'chat_draft_'+String(member||'').toLowerCase();}
  function saveChatDraft(input){input=input||chat.querySelector('.up-chat-input');if(!input||!member)return;try{GM_setValue(chatDraftKey(),String(input.value||''));}catch(e){}}
  function restoreChatDraft(input){if(!input||!member)return;try{var draft=String(GM_getValue(chatDraftKey(),'')||'');if(draft&&!String(input.value||'')){input.value=draft;input.setSelectionRange(input.value.length,input.value.length);}}catch(e){}}
  function clearChatDraft(){if(!member)return;try{GM_setValue(chatDraftKey(),'');}catch(e){}}
  function handleTypingInput(){var input=chat.querySelector('.up-chat-input');if(!input)return;saveChatDraft(input);if(String(input.value||'').trim()){startTypingHeartbeat();if(typingStopTimer)clearTimeout(typingStopTimer);typingStopTimer=setTimeout(function(){stopTypingHeartbeat();},4500);}else stopTypingHeartbeat();}
  function markVisibleChatRead(){if(!token||chat.classList.contains('hidden'))return;var ids=chatCache.filter(function(m){return m.user!==member;}).map(function(m){return m.id;});setUnread(0);if(!ids.length)return;var k=ids.join(',');if(k===readSentKey)return;api('POST','/api/chat/read',{messageIds:ids}).then(function(){readSentKey=k;setUnread(0);if(realtimeActive&&realtimeChannel){try{realtimeChannel.send({type:'broadcast',event:'chat_read',payload:{reader:member,messageIds:ids}});}catch(e){}}}).catch(function(){});}


  function positionReadTooltip(e){if(!readTooltip)return;var x=e&&Number.isFinite(e.clientX)?e.clientX:0,y=e&&Number.isFinite(e.clientY)?e.clientY:0;readTooltip.style.left=Math.max(8,Math.min(window.innerWidth-220,x+12))+'px';readTooltip.style.top=Math.max(8,Math.min(window.innerHeight-70,y+14))+'px';}
  function replyPreview(m){
    if(!m||!m.replyTo)return '';
    var r=m.replyTo;
    var text=r.message||((r.type==='image'||r.type==='video'||r.type==='audio')?'Anexo':'');
    return '<div class="up-chat-quoted"><b>'+esc(r.user||'')+'</b><span>'+esc(text.slice(0,120))+'</span></div>';
  }
  function renderReactions(m){
    var reactions=m&&m.reactions&&typeof m.reactions==='object'?m.reactions:{};
    return Object.keys(reactions).map(function(em){var users=Array.isArray(reactions[em])?reactions[em]:[];if(!users.length)return '';var mine=users.indexOf(member)>=0;return '<button type="button" class="up-chat-reaction '+(mine?'mine':'')+'" data-reaction="'+esc(em)+'" title="'+esc(users.join(', '))+'">'+em+' '+users.length+'</button>';}).join('');
  }
  function showChatProfileHover(img,name,e){
    var route=profileCache[name]||'';
    var src=route?mediaBlobCache['profile:'+name]:'';
     var person=profilePresencePerson(name);
     var presence=profilePresenceState(name,person);
     var presenceLabel=presence==='chat'?'No bate-papo':presence==='active'?'UpStatus Ativo':'Offline';
     var offlineSince=presence==='offline'&&person&&person.seenAt?fmtTime(person.seenAt):'';
     chatProfileHover.innerHTML='<img alt=""><div class="up-chat-profile-hover-name">'+esc(name)+'</div><div class="up-chat-profile-hover-role">'+presenceLabel+'</div>'+(offlineSince?'<div class="up-chat-profile-hover-since">desde '+esc(offlineSince)+'</div>':'');
    var previewImg=chatProfileHover.querySelector('img');
    previewImg.className=chatAvatarPresence(name);
    previewImg.src=src||profileFallback();
    chatProfileHover.classList.add('show');
    positionChatProfileHover(e);
    if(route&&!src){loadBlobUrl(route,'profile:'+name).then(function(url){if(chatProfileHover.classList.contains('show'))previewImg.src=url;}).catch(function(){});}
  }
  function positionChatProfileHover(e){
    if(!chatProfileHover.classList.contains('show'))return;
    var pad=12,w=chatProfileHover.offsetWidth||148,h=chatProfileHover.offsetHeight||130;
    var x=(e.clientX||0)+14,y=(e.clientY||0)+14;
    if(x+w>window.innerWidth-pad)x=(e.clientX||0)-w-14;
    if(y+h>window.innerHeight-pad)y=(e.clientY||0)-h-14;
    x=Math.max(pad,Math.min(window.innerWidth-w-pad,x));
    y=Math.max(pad,Math.min(window.innerHeight-h-pad,y));
    chatProfileHover.style.left=x+'px';chatProfileHover.style.top=y+'px';
  }
  function hideChatProfileHover(){chatProfileHover.classList.remove('show');chatProfileHover.innerHTML='';}

   function profilePresenceState(name,person){
     var team=window.__upstatusTeam||{};
     person=person||team[name]||Object.keys(team).map(function(k){return team[k];}).find(function(x){return x&&x.name===name;});
     if(chatPresence[name]&&chatPresence[name]>Date.now())return 'chat';
     if(person&&person.connected!==false)return 'active';
     return 'offline';
   }
   function profilePresencePerson(name){
     var team=window.__upstatusTeam||{};
     return team[name]||Object.keys(team).map(function(k){return team[k];}).find(function(x){return x&&x.name===name;})||null;
   }
   var chatSenderPalette=[
  {dark:'#9bdcf0',light:'#28677a'},{dark:'#a8e6cf',light:'#2d7858'},{dark:'#d8b4f8',light:'#7450a0'},{dark:'#f7b7d2',light:'#9a4265'},
  {dark:'#f5d08a',light:'#91651c'},{dark:'#b9d2ff',light:'#3b5fa1'},{dark:'#a8e6e0',light:'#287a76'},{dark:'#f4bfa8',light:'#99543b'},
  {dark:'#d3e6a0',light:'#5e762a'},{dark:'#c4c7ff',light:'#5056a2'},{dark:'#f0b6a9',light:'#a14e3e'},{dark:'#a5e0c8',light:'#27795d'},
  {dark:'#f3c1a6',light:'#96502e'},{dark:'#b9e0f6',light:'#2e6e98'},{dark:'#d9c3a8',light:'#735a37'},{dark:'#f0c4ee',light:'#8b4186'}
];
for(var cp=chatSenderPalette.length-1;cp>0;cp--){var cj=Math.floor(Math.random()*(cp+1)),ct=chatSenderPalette[cp];chatSenderPalette[cp]=chatSenderPalette[cj];chatSenderPalette[cj]=ct;}
var chatSenderColorMap=Object.create(null),chatSenderColorCount=0;
function chatSenderColors(name){
  name=String(name||'');
  if(Object.prototype.hasOwnProperty.call(chatSenderColorMap,name))return chatSenderColorMap[name];
  var idx=chatSenderColorCount++,pair;
  if(idx<chatSenderPalette.length)pair=chatSenderPalette[idx];
  else {var hue=Math.round((idx*137.508)%360);pair={dark:'hsl('+hue+' 65% 78%)',light:'hsl('+hue+' 55% 34%)'};}
  chatSenderColorMap[name]=pair;return pair;
}
function chatAvatarPresence(name){
     var state=profilePresenceState(name);
     return state==='chat'?'up-chat-presence-active':state==='active'?'up-chat-presence-idle':'up-chat-presence-offline';
   }
  function chatDateKey(iso){var d=new Date(iso);return isNaN(d.getTime())?'':d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();}
  function chatDateLabel(iso){var d=new Date(iso);if(isNaN(d.getTime()))return '';var now=new Date();var yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);if(d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate())return 'Hoje, '+d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'});if(d.getFullYear()===yesterday.getFullYear()&&d.getMonth()===yesterday.getMonth()&&d.getDate()===yesterday.getDate())return 'Ontem, '+d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'});return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});}
  function updateChatHeaderPresence(){var el=chat.querySelector('.up-chat-header-info');if(!el)return;var team=window.__upstatusTeam||{};var names=Object.keys(team);var online=names.filter(function(n){return team[n]&&team[n].connected!==false;}).length;var inChat=names.filter(function(n){return chatPresence[n]&&chatPresence[n]>Date.now();}).length;el.innerHTML='<span class="chat-online-dot">●</span> '+online+' online · '+inChat+' no bate-papo';}
  function setupChatAudioPlayer(el,url){if(!el||!url)return;var audio=new Audio(url);audio.preload='metadata';audio.volume=.85;var play=el.querySelector('.up-chat-audio-play'),time=el.querySelector('.up-chat-audio-time'),wave=el.querySelector('.up-chat-audio-wave'),duration=0,waveformPromise=null,waveformRequested=false;function fmt(s){s=Number(s);if(!isFinite(s)||s<0)return'--:--';s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}function setDuration(v){v=Number(v);if(isFinite(v)&&v>0){duration=v;time.textContent=fmt(audio.currentTime)+' / '+fmt(duration);return true}return false}function drawFallback(){if(!wave)return;wave.innerHTML='';var count=52,seed=2166136261;for(var c=0;c<String(url).length;c++){seed^=String(url).charCodeAt(c);seed=Math.imul(seed,16777619)}function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}var anchors=[];for(var a=0;a<Math.ceil(count/4)+2;a++)anchors.push(.12+rnd()*.88);for(var i=0;i<count;i++){var t=i/4,idx=Math.floor(t),mix=t-idx,smoothed=anchors[idx]+(anchors[idx+1]-anchors[idx])*mix;var envelope=Math.max(.12,Math.min(1,smoothed*.72+rnd()*.42));var bar=document.createElement('span');bar.style.height=Math.round(3+envelope*24)+'px';bar.style.fontWeight='normal';bar.style.opacity='.46';wave.appendChild(bar)}}function drawFromAudio(channel){if(!wave||!channel||!channel.length)return;var count=52,length=channel.length,levels=[],max=0;for(var i=0;i<count;i++){var from=Math.floor(i*length/count),to=Math.max(from+1,Math.floor((i+1)*length/count)),sum=0;to=Math.min(to,length);for(var j=from;j<to;j++){var sample=channel[j];sum+=sample*sample}var rms=Math.sqrt(sum/Math.max(1,to-from));levels.push(rms);if(rms>max)max=rms}if(max<=0)return;wave.innerHTML='';for(var k=0;k<count;k++){var normalized=Math.max(0,Math.min(1,levels[k]/max));var height=Math.round(3+Math.pow(normalized,.68)*24);var bar=document.createElement('span');bar.style.height=height+'px';bar.style.fontWeight='normal';bar.style.opacity='.46';wave.appendChild(bar)}}function loadWaveformAudio(){if(waveformPromise)return waveformPromise;var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return Promise.resolve(null);waveformPromise=fetch(url).then(function(r){if(!r.ok)throw new Error('Audio waveform request failed');return r.arrayBuffer()}).then(function(buf){var ctx=new AC();return ctx.decodeAudioData(buf).then(function(decoded){setDuration(decoded.duration);drawFromAudio(decoded.getChannelData(0));try{ctx.close()}catch(e){}return decoded.duration},function(err){try{ctx.close()}catch(e){}throw err})}).catch(function(){return null});return waveformPromise}function requestWaveform(){if(waveformRequested)return;waveformRequested=true;if(typeof IntersectionObserver==='function'){var observer=new IntersectionObserver(function(entries){for(var i=0;i<entries.length;i++){if(entries[i].isIntersecting){observer.disconnect();loadWaveformAudio();break}}},{rootMargin:'100px'});observer.observe(el)}else loadWaveformAudio()}function resolveDuration(){setDuration(audio.duration);requestWaveform()}drawFallback();play.onclick=function(e){e.preventDefault();if(audio.paused){audio.play().then(function(){play.textContent='❚❚';}).catch(function(){})}else{audio.pause();play.textContent='▶'}};audio.addEventListener('loadedmetadata',resolveDuration);audio.addEventListener('durationchange',resolveDuration);audio.addEventListener('timeupdate',function(){var d=duration||audio.duration;time.textContent=fmt(audio.currentTime)+(isFinite(d)&&d>0?' / '+fmt(d):'');var spans=wave?wave.querySelectorAll('span'):[];var pct=isFinite(d)&&d>0?Math.min(1,audio.currentTime/d):0;spans.forEach(function(s,i){s.style.opacity=i/spans.length<=pct?'.95':'.32';s.style.fontWeight='normal';s.style.transform='none';});});audio.addEventListener('ended',function(){play.textContent='▶';time.textContent=fmt(duration||audio.duration);});el._upAudio=audio;resolveDuration();}
  function dedupeChatCache(){
    var byId={};
    (chatCache||[]).forEach(function(m){if(!m||m.id==null)return;var id=String(m.id);byId[id]=mergeChatMessage(byId[id],m);});
    chatCache=Object.keys(byId).map(function(id){return byId[id];}).sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});
  }
  function ensureChatNewBelowButton(){
    var list=chat.querySelector('.up-chat-list');if(!list)return null;
    var button=chat.querySelector('.up-chat-new-below');
    if(!button){
      button=document.createElement('button');button.type='button';button.className='up-chat-new-below';
      button.textContent='↓ Novas mensagens';button.style.cssText='position:absolute;z-index:30;left:50%;bottom:76px;transform:translateX(-50%);display:none;border:1px solid #5676c8;border-radius:999px;background:#3159bd;color:#fff;padding:8px 13px;font:700 11px Segoe UI,Arial,sans-serif;box-shadow:0 5px 18px #0007;cursor:pointer;white-space:nowrap';
      button.onclick=function(){button.style.display='none';scrollChatToBottom(true);};
      chat.appendChild(button);
      list.addEventListener('scroll',function(){if(list.scrollHeight-list.scrollTop-list.clientHeight<70)button.style.display='none';},{passive:true});
    }
    return button;
  }
  function setChatNewMessageIndicator(show){
    chatHasUnreadBelow=!!show;
    var btn=chat.querySelector('.up-chat-scroll-latest');if(!btn)return;
    var dot=btn.querySelector('.up-chat-new-dot');
    if(chatHasUnreadBelow&&!dot){dot=document.createElement('span');dot.className='up-chat-new-dot';dot.setAttribute('aria-label','Novas mensagens');dot.style.cssText='position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;background:#ff405c;border:2px solid #19212e;box-sizing:content-box;z-index:20;pointer-events:none;animation:upChatNewDotPulse 1s infinite';btn.appendChild(dot);}
    if(!chatHasUnreadBelow&&dot)dot.remove();
    btn.classList.toggle('has-new-message',chatHasUnreadBelow);
    btn.setAttribute('data-has-new-message',chatHasUnreadBelow?'true':'false');
  }
  function showChatNewBelow(){
    if(chat.classList.contains('hidden'))return;
    var list=chat.querySelector('.up-chat-list');if(!list||list.scrollHeight-list.scrollTop-list.clientHeight<70)return;
    setChatNewMessageIndicator(true);
  }
  function renderChat(){
    var list=chat.querySelector('.up-chat-list');if(!list)return;
    dedupeChatCache();
    var forceScrollBottom=chatForceScrollBottom||(Date.now()<chatOpenScrollUntil&&Date.now()>=chatUserScrollInterruptedUntil);
    chatForceScrollBottom=false;
    var renderKey=chatDataKey(chatCache);
    if(renderKey===chatLastRenderKey&&list.getAttribute('data-render-key')===renderKey){
      if(forceScrollBottom)scrollChatToBottom(true);
      return;
    }
    // Keep the bottom sticky through layout changes caused by media and ticket updates.
    var wasAtBottom=(list.scrollHeight-list.scrollTop-list.clientHeight)<80;var previousScrollTop=list.scrollTop;
    ensureChatNewBelowButton();
    updateChatHeaderPresence();
    if(!chatCache.length){list.innerHTML='<div class="up-history-empty">Nenhuma mensagem nas últimas 48 horas.</div>';list.setAttribute('data-render-key',renderKey);chatLastRenderKey=renderKey;return;}
    var html='',lastDate='';
    chatCache.forEach(function(m,idx){
      var day=chatDateKey(m.createdAt);if(day&&day!==lastDate){html+='<div class="up-chat-date-divider"><span>'+esc(chatDateLabel(m.createdAt))+'</span></div>';lastDate=day;}
      if(m.type==='system'){var eventMessage=m.message||'';var eventTypes={lucca_join:'Lucca entrou no chat',lucca_leave:'Lucca saiu do chat',ycaro_join:'Ycaro entrou no chat',ycaro_leave:'Ycaro saiu do chat'};if(eventTypes[m.systemType])eventMessage=eventTypes[m.systemType];html+='<div class="up-chat-system-event '+(m.systemType==='lucca_join'||m.systemType==='ycaro_join'?'join':(m.systemType==='chat_clear'?'clear':'leave'))+'"><span>'+esc(eventMessage)+'</span></div>';return;}
      var own=m.user===member,prev=idx>0?chatCache[idx-1]:null,next=idx<chatCache.length-1?chatCache[idx+1]:null;
      var samePrev=!!prev&&prev.type!=='system'&&prev.user===m.user&&chatDateKey(prev.createdAt)===day,sameNext=!!next&&next.type!=='system'&&next.user===m.user&&chatDateKey(next.createdAt)===day;
      var groupStart=!samePrev,groupEnd=!sameNext;
      var avatar=own?'':'<img class="up-chat-avatar '+chatAvatarPresence(m.user)+(groupStart?'':' avatar-hidden')+'" data-avatar-name="'+esc(m.user)+'" alt="'+esc(m.user)+'">',body='';
      if(m.pendingUpload)body='<div class="up-chat-uploading"><span class="up-chat-upload-spinner"></span><span>'+esc(m.uploadLabel||'Enviando anexo…')+'</span></div>';
      else if(m.imageUrl){if(m.type==='document'){var docName=String(m.message||'Documento'),docExt=(docName.split('.').pop()||'').toLowerCase(),docKind=/^(doc|docx|txt|rtf|odt)$/.test(docExt)?'blue':/^(xls|xlsx|csv|ods)$/.test(docExt)?'green':/^(pdf|html?|ppt|pptx|odp)$/.test(docExt)?'red':'blue',docIcon=/^(pdf)$/.test(docExt)?'PDF':/^(doc|docx|odt)$/.test(docExt)?'W':/^(xls|xlsx|ods)$/.test(docExt)?'XLS':/^csv$/.test(docExt)?'CSV':/^(ppt|pptx|odp)$/.test(docExt)?'PPT':/^(html?)$/.test(docExt)?'WEB':/^(txt|rtf)$/.test(docExt)?'TXT':'FILE';body='<a class="up-chat-document up-chat-document-'+docKind+'" data-document-route="'+esc(m.imageUrl)+'" data-file-name="'+esc(docName)+'" href="#"><span class="up-chat-document-icon">'+docIcon+'</span><span class="up-chat-document-name">'+esc(docName)+'</span><span class="up-chat-document-download">Baixar</span></a>';}else if(m.type==='video')body='<video class="up-chat-media up-chat-media-video" data-media-route="'+esc(m.imageUrl)+'" controls preload="metadata"></video>';else if(m.type==='audio')body='<div class="up-chat-audio-player" data-media-route="'+esc(m.imageUrl)+'"><button type="button" class="up-chat-audio-play" aria-label="Reproduzir áudio">▶</button><div class="up-chat-audio-wave"></div><span class="up-chat-audio-time">0:00</span></div>';else body='<img class="up-chat-photo loading" data-media-route="'+esc(m.imageUrl)+'" alt="" loading="lazy">';}
      else if(m.message)body='<div class="up-chat-text">'+renderChatText(m.message)+'</div>';
      var readers=Array.isArray(m.readBy)?m.readBy.filter(function(n){return n!==member;}):[],title=readers.length?'Lido por: '+readers.join(', '):'N㯠lido ainda';
      var tick=own?'<span class="up-chat-read '+(readers.length?'read':'')+(readers.length>=2?' read-all':'')+'" data-readers="'+esc(title)+'" aria-label="'+esc(readers.length?'Mensagem visualizada':'Mensagem ainda não visualizada')+'">'+(readers.length>=2?'&#10003;&#10003;':'&#10003;')+'</span>':'';
      var meta=!own&&groupStart?'<div class="up-chat-meta"><b>'+esc(m.user)+'</b></div>':'';
      var ownMeta=own?'<div class="up-chat-own-meta"><span class="up-chat-own-time">'+fmtTime(m.createdAt)+'</span>'+tick+'</div>':'';
      var incomingTime=!own?'<span class="up-chat-incoming-time">'+fmtTime(m.createdAt)+'</span>':'';
      var bubbleKind=m.imageUrl?'has-media':(m.message?'has-text':'has-link');var bubble='<div class="up-chat-bubble '+bubbleKind+'">'+replyPreview(m)+meta+body+ownMeta+incomingTime+'<div class="up-chat-reactions">'+renderReactions(m)+'</div></div>';
      var senderColors=own?null:chatSenderColors(m.user);html+='<div class="up-chat-item '+(own?'own ':'')+(/^(lucca|lucca maluco)$/i.test(String(m.user||'').trim())?'lucca ':(/^ycaro(?: maluco)?$/i.test(String(m.user||'').trim())?'ycaro ':''))+(groupStart?'group-start ':'')+(groupEnd?'group-end ':'')+(!groupStart&&!groupEnd?'group-middle ':'')+'"'+(!own?' data-sender-color="'+esc(m.user)+'" style="--up-chat-sender-color:'+senderColors.dark+';--up-chat-sender-color-light:'+senderColors.light+'"':'')+' data-message-id="'+esc(m.id)+'">'+avatar+bubble+(own?'<button type="button" class="up-delete-action hidden">'+iconSvg('trash')+'</button>':'')+'</div>';
    });
    list.innerHTML=html;
    hydrateChatLinkTitles(list);
    list.setAttribute('data-render-key',renderKey);
    list.querySelectorAll('[data-avatar-name]').forEach(function(img){hydrateAvatar(img,img.getAttribute('data-avatar-name'));});
    list.querySelectorAll('[data-avatar-name]').forEach(function(img){var name=img.getAttribute('data-avatar-name')||'';img.addEventListener('mouseenter',function(e){showChatProfileHover(img,name,e);});img.addEventListener('mousemove',positionChatProfileHover);img.addEventListener('mouseleave',hideChatProfileHover);});
    list.querySelectorAll('[data-media-route]').forEach(function(el){var route=el.getAttribute('data-media-route')||'',key='chat:'+route;loadBlobUrl(route,key).then(function(url){if(el.classList.contains('up-chat-audio-player'))setupChatAudioPlayer(el,url);else el.src=url;}).catch(function(){});if(!el.classList.contains('up-chat-audio-player'))el.addEventListener('load',function(){el.classList.remove('loading');if(wasAtBottom)requestAnimationFrame(function(){list.scrollTop=list.scrollHeight;});});});
    list.querySelectorAll('[data-document-route]').forEach(function(el){el.addEventListener('click',function(e){e.preventDefault();var route=el.getAttribute('data-document-route')||'',name=el.getAttribute('data-file-name')||'documento';loadBlobUrl(route,'chat-document:'+route).then(function(url){var a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();}).catch(function(){showToast('Não foi possível baixar o documento.','error');});});});list.querySelectorAll('.up-chat-photo').forEach(function(img){img.addEventListener('click',function(){openChatLightbox(img.src);});});
    list.querySelectorAll('.up-chat-read').forEach(function(tick){tick.addEventListener('mouseenter',function(e){readTooltip.textContent=tick.getAttribute('data-readers')||'Não lido ainda';readTooltip.classList.add('show');positionReadTooltip(e);});tick.addEventListener('mousemove',positionReadTooltip);tick.addEventListener('mouseleave',function(){readTooltip.classList.remove('show');});});
    
    
    
    list.querySelectorAll('.up-chat-reaction').forEach(function(btn){btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var item=btn.closest('.up-chat-item'),id=item&&item.getAttribute('data-message-id'),em=btn.getAttribute('data-reaction');if(id&&em)toggleChatReaction(id,em);});});
    list.querySelectorAll('.up-chat-item.own').forEach(function(item){var del=item.querySelector('.up-delete-action');if(del)del.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var id=item.getAttribute('data-message-id');if(!id)return;del.disabled=true;api('DELETE','/api/chat/'+encodeURIComponent(id)).then(function(){chatCache=chatCache.filter(function(m){return String(m.id)!==String(id);});renderChat();}).catch(function(err){del.disabled=false;message(err.message,true);});});});
    list.onclick=function(e){if(e.target.closest&&e.target.closest('.up-delete-action'))return;list.querySelectorAll('.up-delete-action').forEach(function(b){b.classList.add('hidden')});};
    chatLastRenderKey=renderKey;
    requestAnimationFrame(function(){
      if(forceScrollBottom)scrollChatToBottom(true);
      else if(!list._upstatusUserScrolling)list.scrollTop=wasAtBottom?list.scrollHeight:previousScrollTop;
    });
  }
  var lightboxPreviousFocus=null,lightboxPreviousOverflow='',lightboxRootFilter='',lightboxRootPointerEvents='',lightboxPreviousRootZIndex='',lightboxPreviousRootZIndexPriority='';
  function restoreChatLightboxRoot(){root.style.filter=lightboxRootFilter;root.style.pointerEvents=lightboxRootPointerEvents;if(lightboxPreviousRootZIndex)root.style.setProperty('z-index',lightboxPreviousRootZIndex,lightboxPreviousRootZIndexPriority);else root.style.removeProperty('z-index');}
  function openChatLightbox(src){
    var box=chatLightbox||chat.querySelector('.up-chat-lightbox'),img=box&&box.querySelector('img');
    if(!box||!img)return;
    chatLightbox=box;
    if(box.parentNode!==document.body)document.body.appendChild(box);
    lightboxPreviousFocus=document.activeElement;
    lightboxPreviousOverflow=document.documentElement.style.overflow;
    lightboxRootFilter=root.style.filter;lightboxRootPointerEvents=root.style.pointerEvents;
    lightboxPreviousRootZIndex=root.style.getPropertyValue('z-index');lightboxPreviousRootZIndexPriority=root.style.getPropertyPriority('z-index');
    root.style.filter='blur(12px)';
    // Keep the lightbox above the widget root, whose own stacking context also uses the maximum z-index.
    root.style.setProperty('z-index','1','important');
    document.documentElement.style.overflow='hidden';
    img.src=src;
    box.classList.remove('hidden');
    box.style.setProperty('position','fixed','important');
    box.style.setProperty('inset','0','important');
    box.style.setProperty('width','100vw','important');
    box.style.setProperty('height','100vh','important');
    box.style.setProperty('z-index','2147483647','important');
    box.style.setProperty('display','flex','important');
    box.style.setProperty('align-items','center','important');
    box.style.setProperty('justify-content','center','important');
    box.style.setProperty('box-sizing','border-box','important');
    box.style.setProperty('padding','28px','important');
    box.style.setProperty('background','rgba(5,8,13,.42)','important');
    box.style.setProperty('backdrop-filter','blur(14px)','important');
    box.style.setProperty('-webkit-backdrop-filter','blur(14px)','important');
    box.style.setProperty('pointer-events','auto','important');
    box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('tabindex','-1');
    try{box.focus({preventScroll:true});}catch(_){box.focus();}
  }
  function closeChatLightbox(){
    var box=chatLightbox||document.querySelector('.up-chat-lightbox');
    if(!box||box.classList.contains('hidden'))return;
    box.classList.add('hidden');
    var libraryModal=document.querySelector('.up-chat-library-modal');if(libraryModal)libraryModal.classList.remove('up-chat-library-viewing-image');
    box.classList.remove('up-popup-closing');
    ['position','inset','width','height','z-index','display','align-items','justify-content','box-sizing','padding','background','backdrop-filter','-webkit-backdrop-filter','pointer-events'].forEach(function(p){box.style.removeProperty(p);});
    document.documentElement.style.overflow=lightboxPreviousOverflow;
    restoreChatLightboxRoot();
    var focus=lightboxPreviousFocus;lightboxPreviousFocus=null;
    if(box.parentNode===document.body&&chat.isConnected)chat.appendChild(box);
    // Re-assert restoration after the page's own event handlers have finished.
    requestAnimationFrame(function(){
      if(!box||box.classList.contains('hidden')){
        restoreChatLightboxRoot();
        document.documentElement.style.overflow=lightboxPreviousOverflow;
      }
    });
    if(focus&&focus.isConnected&&typeof focus.focus==='function'){try{focus.focus({preventScroll:true});}catch(_){focus.focus();}}
  }
  // Captura apenas eventos da camada do lightbox. Clique no fundo fecha só a foto.
  window.addEventListener('pointerdown',function(e){
    var box=chatLightbox;
    if(!box||box.classList.contains('hidden')||!box.isConnected||!box.contains(e.target))return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if(e.target===box)closeChatLightbox();
  },true);
  function openChatContextMenu(e,m){
    var menu=chat.querySelector('.up-chat-context-menu')||document.querySelector('.up-chat-context-menu');if(!menu)return;
    if(menu.parentNode!==root)root.appendChild(menu);
    menu.classList.toggle('up-theme-light-menu',!!document.getElementById('upstatus-root')&&document.getElementById('upstatus-root').classList.contains('up-theme-light'));
    chatContextMessageId=m.id;
    var canReply=m.user!==member;
    var quick=['😂','❤️','👍','😡','😮','👏'];
    var canDelete=m.user===member||member==='Ricardo'||role==='implementation_admin';
    menu.innerHTML=(canReply?'<button type="button" class="up-chat-context-action" data-action="reply">↩ Responder</button>':'')+(canDelete?'<button type="button" class="up-chat-context-action up-chat-context-delete" data-action="delete">🗑 Excluir mensagem</button>':'')+'<div class="up-chat-context-reaction-row">'+quick.map(function(em){return '<button type="button" class="up-chat-reaction" data-context-reaction="'+esc(em)+'">'+em+'</button>';}).join('')+'</div>';
    menu.classList.add('show');
    var x=Math.min(window.innerWidth-menu.offsetWidth-8,Math.max(8,e.clientX||8)),y=Math.min(window.innerHeight-menu.offsetHeight-8,Math.max(8,e.clientY||8));menu.style.left=x+'px';menu.style.top=y+'px';
    var reply=menu.querySelector('[data-action="reply"]');if(reply)reply.onclick=function(){setChatReply(m);hideChatContextMenu();};
    var del=menu.querySelector('[data-action="delete"]');if(del)del.onclick=function(){hideChatContextMenu();if(!confirm('Excluir esta mensagem?'))return;del.disabled=true;api('DELETE','/api/chat/'+encodeURIComponent(m.id)).then(function(){chatCache=chatCache.filter(function(x){return String(x.id)!==String(m.id);});renderChat();}).catch(function(err){showChatError(err.message||'Não foi possível excluir a mensagem.',true);});};
    menu.querySelectorAll('[data-context-reaction]').forEach(function(btn){btn.onclick=function(){toggleChatReaction(m.id,btn.getAttribute('data-context-reaction'));hideChatContextMenu();};});
  }
  function hideChatContextMenu(){var menu=document.querySelector('.up-chat-context-menu');if(menu){menu.classList.remove('show','up-theme-light-menu');if(menu.parentNode===root)chat.appendChild(menu);}chatContextMessageId=null;}
  function toggleChatReaction(id,emoji){api('POST','/api/chat/reaction',{messageId:id,emoji:emoji}).then(function(){return api('GET','/api/chat')}).then(function(d){chatCache=d.messages||[];renderChat();}).catch(function(e){showChatError(e.message,true);});}
  function setChatReply(m){chatReplyTo=m?{id:m.id,user:m.user,message:m.message||((m.type==='image'||m.type==='video'||m.type==='audio')?'Anexo':'')} : null;var bar=chat.querySelector('.up-chat-reply-bar'),copy=bar&&bar.querySelector('.up-chat-reply-copy');if(bar&&copy){if(chatReplyTo){copy.innerHTML='<b>Respondendo a '+esc(chatReplyTo.user)+'</b>'+esc(chatReplyTo.message.slice(0,120));bar.classList.remove('hidden');}else{bar.classList.add('hidden');copy.textContent='';}}var input=chat.querySelector('.up-chat-input');if(input)input.focus();}
  function mentionState(input){
    if(!input)return null;
    var value=input.value||'', caret=input.selectionStart==null?value.length:input.selectionStart;
    var before=value.slice(0,caret);
    var match=before.match(/(?:^|\s)@([\p{L}\p{N}_-]*)$/u);
    if(!match)return null;
    var query=(match[1]||'').toLowerCase();
    var names=Array.isArray(window.__upstatusMembers)&&window.__upstatusMembers.length?window.__upstatusMembers.slice():['Ricardo','Lohan','Guilherme'];
    var filtered=names.filter(function(name){return String(name).toLowerCase()!==String(member||'').toLowerCase()&&String(name).toLowerCase().indexOf(query)===0;});
    if('todos'.indexOf(query)===0)filtered.unshift('__ALL__');
    return {query:query,names:filtered};
  }
  function applyMention(name){
    var input=chat.querySelector('.up-chat-input');
    if(!input)return;
    var value=input.value||'';
    var caret=input.selectionStart==null?value.length:input.selectionStart;
    var before=value.slice(0,caret),after=value.slice(caret);
    var match=before.match(/(?:^|\s)@([\p{L}\p{N}_-]*)$/u);
    if(!match)return;
    var mention=name==='__ALL__'?'todos':name;
    var prefix=before.slice(0,before.length-(match[1]||'').length-1);
    input.value=prefix+'@'+mention+' '+after;
    var pos=(prefix+'@'+mention+' ').length;
    input.focus();input.setSelectionRange(pos,pos);
    var menu=chat.querySelector('.up-mention-menu');if(menu)menu.classList.add('hidden');
  }
  function renderMentionMenu(){
    var input=chat.querySelector('.up-chat-input'),menu=chat.querySelector('.up-mention-menu');
    if(!input||!menu)return;
    var state=mentionState(input);
    if(!state){menu.classList.add('hidden');menu.innerHTML='';return;}
    menu.innerHTML=state.names.map(function(name){
      if(name==='__ALL__'){
        return '<button type="button" class="up-mention-option up-mention-all" data-name="__ALL__">'+iconSvg('chat')+'<span>@todos</span></button>';
      }
      return '<button type="button" class="up-mention-option" data-name="'+esc(name)+'">'+iconSvg('chat')+'<span>@'+esc(name)+'</span></button>';
    }).join('');
    menu.classList.remove('hidden');
    menu.querySelectorAll('.up-mention-option').forEach(function(btn){
      btn.onclick=function(e){e.preventDefault();e.stopPropagation();applyMention(btn.getAttribute('data-name'));};
    });
  }
  function closeChat(showDashboard){
    if(!chat.classList.contains('hidden')){
      saveChatDraft();
      hideChatContextMenu();
      stopTypingHeartbeat();
      broadcastChatPresence(false);
    }
    var emojiOverlay=document.querySelector('.up-chat-emoji-menu');if(emojiOverlay){emojiOverlay.classList.add('hidden');var emojiOwner=emojiOverlay.__upstatusEmojiOwner;if(emojiOverlay.parentNode===root&&emojiOwner&&emojiOwner.isConnected)emojiOwner.appendChild(emojiOverlay);}
    closeChatLightbox();
    chat.classList.add('hidden');
    if(!card.classList.contains('team-lite-chat-mode'))card.classList.add('hidden');
    if(showDashboard)card.classList.remove('hidden');
    history.classList.add('hidden');
    health.classList.add('hidden');
    remoteOverlay.classList.add('hidden');
    stopHealthMonitor();
  }

  function openChat(){
    if(!isAuthenticated()){chat.classList.add('hidden');return;}
    if(isTeamLiteEphemeralMember()&&chat.classList.contains('hidden'))beginTeamLiteEphemeralChatSession();
    startTeamLiteEphemeralChatIfNeeded();
    chatUserScrollInterruptedUntil=0;
    if(quickChatBubble)quickChatBubble.classList.remove('has-unread');
    // Keep the chat DOM and its listeners alive between openings. Only the first open after F5 builds it.
    if(chat.querySelector('.up-chat-list')&&(chatDomMember===member||chat.getAttribute('data-upstatus-chat-member')===member)){
      chatDomInitialized=true;chatReplyTo=null;chatContextMessageId=null;chatPendingInitialScroll=true;chatOpenScrollUntil=Date.now()+2400;chatForceScrollBottom=true;
      var staleOpeningLoader=chat.querySelector('.up-chat-opening-loader');if(staleOpeningLoader)staleOpeningLoader.remove();
      if(chat.parentNode!==card)card.appendChild(chat);chat.classList.remove('hidden');card.classList.remove('hidden');history.classList.add('hidden');
      renderChat();setUnread(0);broadcastChatPresence(true);refresh();scrollChatToBottom(true);
      loadChat(true);pollChatTyping();markVisibleChatRead();return;
    }
    chatDomInitialized=false;chatDomMember=member;
    chatForceScrollBottom=true;chatPendingInitialScroll=true;chatOpenScrollUntil=Date.now()+2400;
    chatReplyTo=null;chatContextMessageId=null;
    setUnread(0);
    if(chat.parentNode!==card)card.appendChild(chat);chat.classList.remove('hidden');card.classList.remove('hidden');history.classList.add('hidden');broadcastChatPresence(true);refresh();
    chat.setAttribute('data-upstatus-chat-member',member);
    chat.innerHTML='<div class="up-history-head"><div class="up-chat-title-wrap"><div><div class="up-history-title">Chat da equipe</div><div class="up-chat-header-info"><span class="chat-online-dot">●</span> 0 online · 0 no bate-papo</div></div></div><div style="display:flex;gap:6px;align-items:center">'+(member==='Ricardo'?'<button class="up-chat-clear" type="button" title="Limpar chat">'+iconSvg('trash')+'</button>':'')+'</div></div><div class="up-chat-lucca-alert hidden">🔴 ALERTA DE LUCCA MALUCO</div><div class="up-chat-list">Carregando…</div><div class="up-chat-typing hidden"></div><div class="up-chat-context-menu"></div><div class="up-chat-compose"><div class="up-chat-reply-bar hidden"><div class="up-chat-reply-copy"></div><button type="button" class="up-chat-reply-close">×</button></div><div class="up-mention-menu hidden"></div><div class="up-chat-emoji-menu hidden"></div><div class="up-chat-input-wrap"><div class="up-chat-recording-label" aria-live="polite">Gravando áudio <span class="up-chat-recording-time">0:00</span></div><button type="button" class="up-chat-emoji-btn" title="Emojis" aria-label="Emojis">'+iconSvg('emoji')+'</button><button type="button" class="up-chat-attach" title="Enviar foto, GIF ou vídeo" aria-label="Enviar foto, GIF ou vídeo">'+iconSvg('clip')+'</button><textarea class="up-chat-input" maxlength="1000" placeholder="Digite uma mensagem"></textarea><button type="button" class="up-chat-record" title="Gravar áudio (até 30 segundos)" aria-label="Gravar áudio">'+iconSvg('mic')+'</button><button type="button" class="up-chat-send" title="Enviar mensagem" aria-label="Enviar mensagem">'+iconSvg('send')+'</button></div><div class="up-chat-tools"><button type="button" class="up-chat-scroll-latest" aria-label="Ir para a última mensagem" title="Ir para a última mensagem"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14m-6-6 6 6 6-6"/></svg></button><input class="up-chat-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf" hidden></div></div><div class="up-chat-lightbox hidden"><img alt="Imagem ampliada"></div>';
    var chatOpeningLoader=document.createElement('div');chatOpeningLoader.className='up-chat-opening-loader';chatOpeningLoader.innerHTML='<span class="up-chat-opening-spinner"></span>';chatOpeningLoader.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,16,28,.98);z-index:999;pointer-events:none';if(getComputedStyle(chat).position==='static')chat.style.position='relative';var openingLoaderStyle=document.getElementById('up-chat-opening-loader-style');if(!openingLoaderStyle){openingLoaderStyle=document.createElement('style');openingLoaderStyle.id='up-chat-opening-loader-style';openingLoaderStyle.textContent='.up-chat-opening-spinner{width:26px;height:26px;border:3px solid rgba(160,180,210,.25);border-top-color:#8baeff;border-radius:50%;animation:upChatOpenSpin .65s linear infinite}@keyframes upChatOpenSpin{to{transform:rotate(360deg)}}';document.head.appendChild(openingLoaderStyle);}chat.appendChild(chatOpeningLoader);
    var profileBtn=chat.querySelector('.up-chat-profile-btn');if(profileBtn){hydrateAvatar(profileBtn.querySelector('img'),member);profileBtn.onclick=function(e){e.stopPropagation();openProfileModal();};profileBtn.addEventListener('mouseenter',function(e){showChatProfileHover(profileBtn.querySelector('img'),member,e);});profileBtn.addEventListener('mousemove',positionChatProfileHover);profileBtn.addEventListener('mouseleave',hideChatProfileHover);}
    var input=chat.querySelector('.up-chat-input'),photoBtn=chat.querySelector('.up-chat-attach'),photoFile=chat.querySelector('.up-chat-file'),emojiBtn=chat.querySelector('.up-chat-emoji-btn'),emojiMenu=chat.querySelector('.up-chat-emoji-menu'),recordBtn=chat.querySelector('.up-chat-record');
    var libraryBtn=chat.querySelector('.up-chat-library');if(libraryBtn)libraryBtn.onclick=function(e){e.preventDefault();e.stopPropagation();openChatLibrary();};
    var scrollLatestBtn=chat.querySelector('.up-chat-scroll-latest'),chatListForScroll=chat.querySelector('.up-chat-list');
    function updateScrollLatestButton(){if(!scrollLatestBtn||!chatListForScroll)return;var distance=chatListForScroll.scrollHeight-chatListForScroll.clientHeight-chatListForScroll.scrollTop;scrollLatestBtn.classList.toggle('show',distance>70);if(distance<=70)setChatNewMessageIndicator(false);else if(chatHasUnreadBelow)setChatNewMessageIndicator(true);}
    if(chatListForScroll){chatListForScroll.addEventListener('scroll',updateScrollLatestButton,{passive:true});updateScrollLatestButton();}
    if(scrollLatestBtn)scrollLatestBtn.onclick=function(e){e.preventDefault();e.stopPropagation();if(!chatListForScroll)return;setChatNewMessageIndicator(false);chatListForScroll.scrollTo({top:chatListForScroll.scrollHeight,behavior:'smooth'});};
    restoreChatDraft(input);
    if(!chatContextMenuDocumentBound){
      chatContextMenuDocumentBound=true;
      document.addEventListener('contextmenu',function(e){
        var target=e.target&&e.target.closest?e.target.closest('#upstatus-chat .up-chat-item'):null;
        if(!target||!root.contains(target))return;
        var owner=target.closest('#upstatus-chat');
        if(!owner)return;
        var id=target.getAttribute('data-message-id');
        if(id==null)return;
        var msg=chatCache.find(function(item){return String(item.id)===String(id);});
        if(!msg)return;
        e.preventDefault();
        e.stopPropagation();
        openChatContextMenu(e,msg);
      },true);
    }
    photoBtn.onclick=function(e){e.stopPropagation();photoFile.click()};
    photoFile.addEventListener('change',function(){if(photoFile.files&&photoFile.files[0])sendChatMedia(photoFile.files[0])});
    setupEmojiPicker(emojiBtn,emojiMenu,input);
    if(recordBtn)recordBtn.onclick=function(e){e.stopPropagation();toggleAudioRecording(recordBtn);};
    var cancelRecordBtn=chat.querySelector('.up-chat-record-cancel');if(cancelRecordBtn)cancelRecordBtn.onclick=function(e){e.preventDefault();e.stopPropagation();stopAudioRecording(false);};
    input.addEventListener('paste',function(e){var items=e.clipboardData&&e.clipboardData.items?Array.from(e.clipboardData.items):[];var item=items.find(function(x){return x.kind==='file'&&/^image\//i.test(x.type)});if(item){var file=item.getAsFile();if(file){e.preventDefault();sendChatMedia(file);}}});
    chat.querySelector('.up-chat-reply-close').onclick=function(e){e.stopPropagation();setChatReply(null);};
    if(!chatDocumentClickBound){
      chatDocumentClickBound=true;
      document.addEventListener('click',function(e){
        var menu=document.querySelector('.up-chat-context-menu');
        if(menu&&menu.classList.contains('show')&&!menu.contains(e.target))hideChatContextMenu();
      });
    }
    var chatBack=chat.querySelector('.up-chat-back');if(chatBack)chatBack.onclick=function(e){e.stopPropagation();closeChat(true);};
    var clearBtn=chat.querySelector('.up-chat-clear');if(clearBtn)clearBtn.onclick=clearChatRicardo;
    var lightbox=chat.querySelector('.up-chat-lightbox');if(lightbox)chatLightbox=lightbox;
    chat.querySelector('.up-chat-send').onclick=function(e){e.stopPropagation();sendChat()};
    input.addEventListener('input',function(){renderMentionMenu();handleTypingInput();});input.addEventListener('click',renderMentionMenu);input.addEventListener('keyup',renderMentionMenu);input.addEventListener('keydown',function(e){if(e.key.length===1||e.key==='Backspace'||e.key==='Delete')startTypingHeartbeat();});input.addEventListener('focus',function(){if(String(input.value||'').trim())startTypingHeartbeat();});input.addEventListener('blur',function(){if(typingStopTimer)clearTimeout(typingStopTimer);typingStopTimer=setTimeout(function(){stopTypingHeartbeat();},1200);});
    input.addEventListener('keydown',function(e){if(e.key==='Escape'){var menu=chat.querySelector('.up-mention-menu');if(menu)menu.classList.add('hidden');return;}if(e.key==='Enter'&&!e.shiftKey){if(e.repeat){e.preventDefault();return;}var menu=chat.querySelector('.up-mention-menu');if(menu&&!menu.classList.contains('hidden')){var first=menu.querySelector('.up-mention-option');if(first){e.preventDefault();applyMention(first.getAttribute('data-name'));return;}}e.preventDefault();sendChat();}});
    if(chatCache.length)renderChat();
    updateLuccaPresence(luccaOnline);
    loadChat();
    pollChatTyping();
    markVisibleChatRead();
  }
  function refreshChatAfterSend(input,btn){if(input)input.value='';if(btn)btn.disabled=false;loadChat();return Promise.resolve();}

  function reconcileSentChatMessage(tempId,created){
    var idx=chatCache.findIndex(function(m){return String(m.id)===String(tempId);});
    if(idx<0){chatCache.push(created);chatCache.sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});renderChat();return;}
    var previous=idx>0?chatCache[idx-1]:null;
    var sameDay=!!previous&&chatDateKey(previous.createdAt)===chatDateKey(created.createdAt);
    var structuralSafe=idx===chatCache.length-1&&sameDay;
    chatCache[idx]=mergeChatMessage(chatCache[idx],created);
    chatCache[idx].id=created.id;
    if(!structuralSafe){
      chatCache.sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});
      renderChat();
      return;
    }
    var item=chat.querySelector('.up-chat-item[data-message-id="'+CSS.escape(String(tempId))+'"]');
    if(item)item.setAttribute('data-message-id',String(created.id));
    chatLastRenderKey=chatDataKey(chatCache);
  }
  function setupEmojiPicker(btn,menu,input){
    if(!btn||!menu||!input)return;
    var groups=[{name:'Rostos',items:'😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😍 🥰 😘 😋 😛 😜 🤪 🤗 🤔 😐 😏 🙄 😬 😔 😴 😷 🤒 🤢 🤮 🥵 🥶 🤯 🥳 😎 🤓 😕 😟 😮 😲 🥺 😨 😰 😢 😭 😱 😤 😡 😠 🤬 😈 💀 💩 👻 🤖'.split(' ')},{name:'Gestos',items:'👋 🤚 ✋ 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 👈 👉 👆 👇 👍 👎 ✊ 👊 👏 🙌 🫶 🤲 🤝 🙏 💪 👀 👅 👄'.split(' ')},{name:'Animais e natureza',items:'🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦉 🐺 🦄 🐝 🦋 🐢 🐍 🦎 🐙 🐬 🐳 🦈 🐘 🦒 🐕 🐈 🌵 🌲 🌳 🌴 🌱 🌿 🍀 🍃 🍂 🍁 🍄 🌷 🌹 🌺 🌸 🌼 🌻'.split(' ')},{name:'Comida',items:'🍇 🍉 🍊 🍋 🍌 🍍 🥭 🍎 🍐 🍑 🍒 🍓 🫐 🥝 🍅 🥑 🍆 🥔 🥕 🌽 🌶️ 🥒 🥦 🧄 🍞 🥐 🥨 🧀 🍖 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥚 🍳 🍲 🥗 🍿 🍱 🍜 🍝 🍣 🍤 🍦 🍨 🍩 🍪 🎂 🍰 🍫 🍬 ☕ 🍵 🍷 🍹 🍺 🥂 🥤'.split(' ')},{name:'Viagens',items:'🚗 🚕 🚌 🏎️ 🚑 🚒 🚲 🛴 🛹 🚦 ⛽ ⛵ 🚤 🚢 ✈️ 🚁 🚀 🛸 🌍 🗺️ 🧭 🏔️ 🌋 🏕️ 🏖️ 🏝️ 🏠 🏡 🏢 🏥 🏨 🏫 🏰 🗼 🗽 ⛪ ⛺ 🌃 🌅 🌆 🌉'.split(' ')},{name:'Atividades e objetos',items:'⚽ 🏀 🏈 ⚾ 🎾 🏐 🎱 🏓 🏆 🥇 🥈 🥉 🎨 🎬 🎤 🎧 🎹 🥁 🎸 🎲 🎯 🎮 🧩 🧸 📱 💻 🖥️ 📷 📸 📹 📺 ⏰ 🔋 💡 💸 💵 💳 💎 🔧 🔨 ⚙️ 💊 🩺 🛒 🪑 🛏️ 🚽 🚿 🛁 🎁 🎈 🎀'.split(' ')},{name:'Símbolos e bandeiras',items:'❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 🩷 🩵 💔 💕 💞 💓 💗 💖 💘 💝 💯 💥 💫 💬 💭 💤 ✨ ⭐ 🌟 🔥 🎉 🎊 🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🇧🇷 🇺🇸 🇨🇳 🇵🇹 🇯🇵 🇰🇷 🇬🇧 🇫🇷 🇩🇪 🇪🇸 🇮🇹 🇦🇷 🇨🇦 🇲🇽'.split(' ')}];
    var categoryIcons=[
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8.5 14c1.8 2 5.2 2 7 0"/></svg>',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v7c0 4-2.5 6-6 6h-2c-2 0-3-1-4-2l-3-4a1.7 1.7 0 0 1 2.5-2.2L9 14"/></svg>',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c-4.8 0-8 3.8-8 8.3 0 4.9 3.6 9.1 8 9.1s8-4.2 8-9.1C20 6.8 16.8 3 12 3Z"/><path d="M8.5 10.5h.01M15.5 10.5h.01M9 14.5c1.8 1.8 4.2 1.8 6 0"/></svg>',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11Z"/><path d="M9 15a3 3 0 0 0 3 3"/></svg>',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 13 22 5l-7 17-3-7-10-2Z"/><path d="m12 15 4-5M2 13l6-1"/></svg>',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m5 6 14 12M19 6 5 18M12 3v18M3 12h18"/></svg>',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>'
    ];
    var menuBuilt=menu.dataset.upEmojiBuilt==='1';
    function setActiveEmojiCategory(index){menu.querySelectorAll('[data-category]').forEach(function(b){b.classList.toggle('is-active',Number(b.dataset.category)===index);});}
    function positionMenu(){
      if(menu.classList.contains('hidden'))return;
      var br=btn.getBoundingClientRect(),vw=window.innerWidth||document.documentElement.clientWidth,vh=window.innerHeight||document.documentElement.clientHeight;
      var width=Math.min(270,Math.max(246,vw-16));
      menu.style.setProperty('width',width+'px','important');menu.style.setProperty('max-width','calc(100vw - 16px)','important');
      menu.style.setProperty('position','fixed','important');menu.style.setProperty('left','8px','important');menu.style.setProperty('top','8px','important');
      menu.style.setProperty('bottom','auto','important');menu.style.setProperty('right','auto','important');
      var mr=menu.getBoundingClientRect(),top=br.top-mr.height-8;
      if(top<8)top=Math.min(vh-mr.height-8,br.bottom+8);
      top=Math.max(8,Math.min(top,vh-mr.height-8));
      menu.style.setProperty('left',Math.max(8,Math.min(br.left,vw-mr.width-8))+'px','important');menu.style.setProperty('top',top+'px','important');
    }
    if(!menuBuilt){
      menu.innerHTML='<nav class="up-chat-emoji-categories" aria-label="Categorias de emojis">'+groups.map(function(g,i){return '<button type="button" data-category="'+i+'" title="'+esc(g.name)+'" aria-label="'+esc(g.name)+'">'+categoryIcons[i]+'</button>';}).join('')+'</nav><div class="up-chat-emoji-grid">'+groups.map(function(g){return '<section class="up-chat-emoji-group"><div class="up-chat-emoji-heading">'+esc(g.name)+'</div>'+g.items.map(function(e){return '<button type="button" class="up-chat-emoji" data-emoji="'+esc(e)+'" aria-label="'+esc(e)+'">'+e+'</button>';}).join('')+'</section>';}).join('')+'</div>';
      menu.dataset.upEmojiBuilt='1';
      var search=null,emojiGrid=menu.querySelector('.up-chat-emoji-grid');
      if(search)search.addEventListener('input',function(){
        var q=search.value.trim().toLocaleLowerCase();
        menu.querySelectorAll('.up-chat-emoji-group').forEach(function(section){
          var title=(section.querySelector('.up-chat-emoji-heading')||{}).textContent||'',titleMatch=!q||title.toLocaleLowerCase().includes(q);
          section.querySelectorAll('.up-chat-emoji').forEach(function(b){var emojiMatch=!q||b.textContent.toLocaleLowerCase().includes(q);b.style.display=(!q||titleMatch||emojiMatch)?'':'none';});
          section.style.display=(!q||titleMatch||section.querySelector('.up-chat-emoji:not([style*="display: none"])'))?'':'none';
        });
      });
      menu.querySelectorAll('[data-category]').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var i=Number(b.dataset.category),sect=menu.querySelectorAll('.up-chat-emoji-group')[i];setActiveEmojiCategory(i);if(sect)sect.scrollIntoView({block:'start',inline:'nearest',behavior:'auto'});});});
      if(emojiGrid&&typeof IntersectionObserver!=='undefined'){
        menu.__upEmojiObserver=new IntersectionObserver(function(entries){var visible=entries.filter(function(e){return e.isIntersecting;}).sort(function(a,b){return a.boundingClientRect.top-b.boundingClientRect.top;});if(visible.length){var all=Array.from(menu.querySelectorAll('.up-chat-emoji-group'));setActiveEmojiCategory(all.indexOf(visible[0].target));}},{root:emojiGrid,threshold:0.2});
        menu.querySelectorAll('.up-chat-emoji-group').forEach(function(sect){menu.__upEmojiObserver.observe(sect);});
      }
      if(!document.getElementById('upstatus-335-emoji-svg-style')){var iconStyle=document.createElement('style');iconStyle.id='upstatus-335-emoji-svg-style';iconStyle.textContent='.up-chat-emoji-categories button svg{width:18px;height:18px;display:block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.up-chat-emoji-categories button{display:inline-flex;align-items:center;justify-content:center;flex:0 0 28px;width:28px;height:28px;padding:5px;box-sizing:border-box}';(document.head||document.documentElement).appendChild(iconStyle);}
    }
    menu.__upstatusEmojiOwner=chat;menu.__upstatusEmojiButton=btn;
    if(!menu.__upstatusEmojiBound){menu.__upstatusEmojiBound=true;menu.addEventListener('click',function(ev){var b=ev.target&&ev.target.closest?ev.target.closest('.up-chat-emoji'):null;if(!b)return;ev.preventDefault();ev.stopPropagation();var val=input.value||'',p=input.selectionStart==null?val.length:input.selectionStart,em=b.getAttribute('data-emoji')||'';input.value=val.slice(0,p)+em+val.slice(p);p+=em.length;input.focus();input.setSelectionRange(p,p);});}
    if(!menu.__upstatusEmojiPositionBound){menu.__upstatusEmojiPositionBound=true;window.addEventListener('resize',positionMenu);window.addEventListener('scroll',positionMenu,true);}
    if(btn.__upstatusEmojiClickHandler)btn.removeEventListener('click',btn.__upstatusEmojiClickHandler);
    btn.__upstatusEmojiClickHandler=function(ev){
      ev.preventDefault();ev.stopPropagation();var opening=menu.classList.contains('hidden');
      if(opening){
        document.querySelectorAll('.up-chat-emoji-menu').forEach(function(o){if(o!==menu){o.classList.add('hidden');o.style.setProperty('display','none','important');var ow=o.__upstatusEmojiOwner;if(o.parentNode===root&&ow&&ow.isConnected)ow.appendChild(o);}});
        if(menu.parentNode!==root)root.appendChild(menu);menu.style.removeProperty('display');menu.classList.remove('hidden');requestAnimationFrame(positionMenu);
      }else{menu.classList.add('hidden');menu.style.setProperty('display','none','important');if(menu.parentNode===root)chat.appendChild(menu);}
    };
    btn.addEventListener('click',btn.__upstatusEmojiClickHandler);
    if(!chatEmojiDocumentClickBound){chatEmojiDocumentClickBound=true;document.addEventListener('click',function(ev){document.querySelectorAll('.up-chat-emoji-menu').forEach(function(m){var b=m.__upstatusEmojiButton;if(!m.contains(ev.target)&&(!b||!b.contains(ev.target))){m.classList.add('hidden');m.style.setProperty('display','none','important');var ow=m.__upstatusEmojiOwner;if(m.parentNode===root&&ow&&ow.isConnected)ow.appendChild(m);}});});}
  }
  function updateRecordingUi(btn,active){var label=chat.querySelector('.up-chat-recording-label');var time=chat.querySelector('.up-chat-recording-time');if(btn){btn.classList.toggle('recording',active);btn.innerHTML=active?'×':iconSvg('mic');btn.title=active?'Cancelar gravação':'Gravar áudio (até 30 segundos)';btn.setAttribute('aria-label',btn.title);}if(label)label.classList.toggle('show',active);var input=chat.querySelector('.up-chat-input');if(input){input.placeholder=active?'':'Digite uma mensagem';input.disabled=!!active;}var send=chat.querySelector('.up-chat-send');if(send){send.title=active?'Enviar áudio':'Enviar mensagem';send.setAttribute('aria-label',send.title);send.innerHTML=active?'<svg class="up-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>':iconSvg('send');}if(!active&&time)time.textContent='0:00';}
  function stopAudioRecording(send){var rec=mediaRecorder;if(!rec)return;rec.__sendOnStop=!!send;if(!send)recordingChunks=[];try{if(rec.state==='recording'){if(send){try{rec.requestData();}catch(e){}}rec.stop();}else{if(!send)recordingChunks=[];finishAudioRecording(rec);}}catch(e){if(!send)recordingChunks=[];finishAudioRecording(rec);}}
  function finishAudioRecording(rec){try{if(rec&&rec.stream)rec.stream.getTracks().forEach(function(t){t.stop();});}catch(e){}clearInterval(recordingTimer);recordingTimer=null;updateRecordingUi(chat.querySelector('.up-chat-record'),false);mediaRecorder=null;}
  function toggleAudioRecording(btn){
    if(mediaRecorder&&mediaRecorder.state==='recording'){stopAudioRecording(false);return;}
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined'){showChatError('Seu navegador não suporta gravação de áudio.',true);return;}
    navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(function(stream){
      recordingChunks=[];recordingStartedAt=Date.now();var mime='';
      ['audio/ogg;codecs=opus','audio/webm;codecs=opus','audio/webm','audio/mp4','audio/mpeg'].some(function(x){if(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(x)){mime=x;return true;}return false;});
      var options=mime?{mimeType:mime,audioBitsPerSecond:128000}:{};
      var rec=new MediaRecorder(stream,options);mediaRecorder=rec;rec.__sendOnStop=true;rec.__mime=mime;
      rec.ondataavailable=function(e){if(e.data&&e.data.size)recordingChunks.push(e.data);};
      rec.onerror=function(){finishAudioRecording(rec);recordingChunks=[];showChatError('Não foi possível gravar o áudio.',true);};
      rec.onstop=function(){var shouldSend=!!rec.__sendOnStop;var mimeType=rec.mimeType||mime||'audio/webm';var chunks=recordingChunks.slice();recordingChunks=[];finishAudioRecording(rec);if(!shouldSend||!chunks.length)return;var blob=new Blob(chunks,{type:mimeType});if(blob.size>20*1024*1024){showChatError('O áudio ficou maior que 20 MB.',true);return;}var reader=new FileReader();reader.onload=function(){sendChatAudioData(String(reader.result));};reader.onerror=function(){showChatError('Não foi possível preparar o áudio.',true);};reader.readAsDataURL(blob);};
      rec.start(250);updateRecordingUi(btn,true);recordingTimer=setInterval(function(){var elapsed=Math.floor((Date.now()-recordingStartedAt)/1000),time=chat.querySelector('.up-chat-recording-time');if(time)time.textContent='0:'+String(Math.min(elapsed,30)).padStart(2,'0');if(elapsed>=30)stopAudioRecording(true);},250);
    }).catch(function(e){showChatError(e.name==='NotAllowedError'?'Permita o uso do microfone para gravar áudio.':'Não foi possível acessar o microfone.',true);});
  }
  function sendChatAudioData(dataUrl){var send=chat.querySelector('.up-chat-send'),record=chat.querySelector('.up-chat-record');if(send)send.disabled=true;if(record)record.disabled=true;var raw=String(dataUrl||'');var match=raw.match(/^data:(audio\/[^;,]+)(?:;[^,]*)?;base64,/i);if(!match){if(send)send.disabled=false;if(record)record.disabled=false;showChatError('Áudio inválido.',true);return;}api('POST','/api/chat/audio',{dataUrl:raw}).then(function(r){return api('POST','/api/chat',{message:'',imageUrl:r.imageUrl,type:'audio',replyTo:chatReplyTo});}).then(function(){chatReplyTo=null;setChatReply(null);stopTypingHeartbeat();return refreshChatAfterSend(null,send);}).catch(function(e){if(send)send.disabled=false;showChatError(e.message,true);}).finally(function(){if(record)record.disabled=false;});
  }
  function clearChatRicardo(){if(member!=='Ricardo')return;if(!confirm('Limpar todo o chat para a equipe?'))return;api('POST','/api/chat/clear',{}).then(function(){chatCache=[];chatLastRenderKey='';return api('GET','/api/chat');}).then(function(d){chatCache=d.messages||[];if(d.profiles)profileCache=d.profiles;renderChat();}).catch(function(e){message(e.message,true);});}
  function scrollChatToBottom(force){
    if(force===false)return;
    if(Date.now()<chatUserScrollInterruptedUntil&&!chatForceScrollBottom){chatPendingInitialScroll=false;return;}
    var list=chat.querySelector('.up-chat-list');
    if(!list)return;
    function apply(){
      try{
        if(list._upstatusUserScrolling&&Date.now()<chatUserScrollInterruptedUntil){chatPendingInitialScroll=false;return;}
        list.style.scrollBehavior='auto';
        var target=Math.max(0,list.scrollHeight-list.clientHeight);
        list.scrollTop=target;
        if(Math.abs(list.scrollTop-target)>1&&typeof list.scrollTo==='function')list.scrollTo({top:target,left:0,behavior:'auto'});
        // Firefox can report the old scrollHeight for a frame after replacing the chat DOM.
        // Use the last rendered child as a fallback, then re-align the list itself.
        var last=list.lastElementChild;
        if(last&&typeof ResizeObserver!=='undefined'&&chatScrollObserver&&list._upstatusObservedLast!==last){
          try{chatScrollObserver.observe(last);list._upstatusObservedLast=last;}catch(e){}
        }
        if(last&&last.getBoundingClientRect){
          var listRect=list.getBoundingClientRect();
          var lastRect=last.getBoundingClientRect();
          var visibleBottom=listRect.top+list.clientTop+list.clientHeight;
          var gap=lastRect.bottom-visibleBottom;
          if(gap>1)list.scrollTop=Math.min(Math.max(0,list.scrollHeight-list.clientHeight),list.scrollTop+gap);
          // If layout metrics settle after the first assignment, force the final
          // scroll position again on the next animation frame/retry.
        }
      }catch(e){}
    }
    if(!list._upstatusUserScrollBound){
      list._upstatusUserScrollBound=true;
      list._upstatusUserScrolling=false;
      var userScrollClearTimer=null;
      function markUserScrollIntent(){
        list._upstatusUserScrolling=true;
        chatUserScrollInterruptedUntil=Date.now()+1800;
        chatPendingInitialScroll=false;
        chatForceScrollBottom=false;
        if(userScrollClearTimer)clearTimeout(userScrollClearTimer);
        userScrollClearTimer=setTimeout(function(){list._upstatusUserScrolling=false;userScrollClearTimer=null;},1800);
      }
      list.addEventListener('wheel',function(e){if(e.deltaY<0)markUserScrollIntent();},{passive:true});
      list.addEventListener('pointerdown',function(e){if(e.target===list||e.target===list.firstElementChild)list._upstatusPointerStartY=e.clientY;},{passive:true});
      list.addEventListener('pointermove',function(e){if(e.buttons&&list._upstatusPointerStartY!=null&&e.clientY>list._upstatusPointerStartY)markUserScrollIntent();},{passive:true});
      list.addEventListener('pointerup',function(){list._upstatusPointerStartY=null;},{passive:true});
      list.addEventListener('touchstart',function(e){list._upstatusTouchStartY=e.touches&&e.touches.length?e.touches[0].clientY:null;},{passive:true});
      list.addEventListener('touchmove',function(e){var y=e.touches&&e.touches.length?e.touches[0].clientY:null;if(y!=null&&list._upstatusTouchStartY!=null&&y>list._upstatusTouchStartY)markUserScrollIntent();list._upstatusTouchStartY=y;},{passive:true});
      list.addEventListener('keydown',function(e){if(e.key==='ArrowUp'||e.key==='PageUp'||e.key==='Home')markUserScrollIntent();});
      list.addEventListener('scroll',function(){list._upstatusLastScrollTop=list.scrollTop;},{passive:true});
    }
    if(!list._upstatusContentObserverBound&&typeof MutationObserver!=='undefined'){
      try{
        var contentObserver=new MutationObserver(function(){
          if(!chat.classList.contains('hidden')&&!list._upstatusUserScrolling&&(chatPendingInitialScroll||(Date.now()<chatOpenScrollUntil&&Date.now()>=chatUserScrollInterruptedUntil)))requestAnimationFrame(apply);
        });
        contentObserver.observe(list,{childList:true,subtree:true,characterData:true});
        list._upstatusContentObserverBound=true;
      }catch(e){}
    }
    if(!list._upstatusBottomScrollBound){
      list._upstatusBottomScrollBound=true;
      list.addEventListener('load',function(){
        if(!chat.classList.contains('hidden')&&!list._upstatusUserScrolling&&(chatPendingInitialScroll||(Date.now()<chatOpenScrollUntil&&Date.now()>=chatUserScrollInterruptedUntil)))apply();
      },true);
    }
    if(typeof ResizeObserver!=='undefined'&&chatScrollObservedList!==list){
      try{
        if(chatScrollObserver)chatScrollObserver.disconnect();
        chatScrollObserver=new ResizeObserver(function(){
          if(chat.classList.contains('hidden'))return;
          if(!list._upstatusUserScrolling&&(chatPendingInitialScroll||(Date.now()<chatOpenScrollUntil&&Date.now()>=chatUserScrollInterruptedUntil)))apply();
        });
        chatScrollObserver.observe(list);
        chatScrollObservedList=list;
      }catch(e){chatScrollObserver=null;chatScrollObservedList=null;}
    }
    apply();
    requestAnimationFrame(apply);
    requestAnimationFrame(function(){requestAnimationFrame(apply);});
    // Recheck after DOM/media layout settles; retries are limited to chat opening.
    if(!list._upstatusBottomRetryScheduled&&(chatPendingInitialScroll||(Date.now()<chatOpenScrollUntil&&Date.now()>=chatUserScrollInterruptedUntil))){
      list._upstatusBottomRetryScheduled=true;
      [50,150,300,600,1000].forEach(function(delay){
        setTimeout(function(){
          if(!chat.classList.contains('hidden')&&!list._upstatusUserScrolling&&(chatPendingInitialScroll||(Date.now()<chatOpenScrollUntil&&Date.now()>=chatUserScrollInterruptedUntil)))apply();
          if(delay===1000)list._upstatusBottomRetryScheduled=false;
        },delay);
      });
    }
  }
  function sendChat(){
    if(mediaRecorder&&mediaRecorder.state==='recording'){stopAudioRecording(true);return;}
    var input=chat.querySelector('.up-chat-input'),text=input?(input.value||'').trim():'';
    if(!input||!text)return;
    var btn=chat.querySelector('.up-chat-send');
    var tempId='local-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
    var tempReply=chatReplyTo;
    var optimistic={id:tempId,user:member,message:text,type:'text',systemType:'',createdAt:new Date().toISOString(),imageUrl:'',mentions:[],replyTo:tempReply,reactions:{},readBy:[],optimistic:true};
    chatCache.push(optimistic);
    input.value='';
    chatForceScrollBottom=true;
    chatOpenScrollUntil=Date.now()+1500;
    clearChatDraft();
    chatReplyTo=null;
    setChatReply(null);
    try{renderChat();scrollChatToBottom(true);var newBelow=chat.querySelector('.up-chat-new-below');if(newBelow)newBelow.style.display='none';}catch(renderError){try{console.error('[UpStatus Chat] Falha ao renderizar envio otimista:',renderError);}catch(_){}}
    api('POST','/api/chat',{message:text,replyTo:tempReply}).then(function(r){
      var created=normalizeChatMessage(r&&r.message);
      if(created){
        clearChatDraft();
        try{
          reconcileSentChatMessage(tempId,created);
        }catch(reconcileError){
          try{console.error('[UpStatus Chat] Mensagem enviada, mas falhou a reconciliação visual:',reconcileError);}catch(_){}
          chatCache=chatCache.filter(function(m){return String(m.id)!==String(tempId);});
          loadChat(true);
        }
        try{sendRealtimeEvent('chat_fast');}catch(_){}
      }else{
        chatCache=chatCache.filter(function(m){return m.id!==tempId;});
        loadChat(true);
      }
    }).catch(function(e){
      chatCache=chatCache.filter(function(m){return m.id!==tempId;});
      try{renderChat();}catch(renderError){try{console.error('[UpStatus Chat] Falha ao renderizar erro de envio:',renderError);}catch(_){}}
      if(input)input.value=text;
      saveChatDraft(input);
      showChatError(e&&e.message||'Não foi possível enviar a mensagem.');
    }).finally(function(){
      if(btn)btn.disabled=false;
    });
  }
  function fileMimeFromExt(ext){return ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',csv:'text/csv',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',txt:'text/plain',rtf:'application/rtf'})[ext]||'';}
  function resolveFileMime(file,allowVideo){
    var type=String(file&&file.type||'').toLowerCase(),ext=String(file&&file.name||'').split('.').pop().toLowerCase();
    var extMime=fileMimeFromExt(ext);
    var typeOk=allowVideo?/^(image\/(png|jpe?g|webp|gif)|video\/(mp4|webm))$/i.test(type):/^image\/(png|jpe?g|webp|gif)$/i.test(type);
    var mime=typeOk?type:extMime;
    var isDoc=/^(application\/(pdf|msword|vnd\.(ms-excel|ms-powerpoint|openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)))|text\/(plain|csv|rtf))$/i.test(mime);var ok=allowVideo?(/^(image\/(png|jpe?g|webp|gif)|video\/(mp4|webm))$/i.test(mime)||isDoc):/^image\/(png|jpe?g|webp|gif)$/i.test(mime);
    return {mime:mime,ext:ext,ok:ok};
  }
  function fileToDataUrl(file){return new Promise(function(resolve,reject){if(!file){reject(new Error('Nenhum arquivo selecionado.'));return;}var info=resolveFileMime(file,true);if(!info.ok){reject(new Error('Use imagens, vídeos ou documentos PDF, DOC/DOCX, XLS/XLSX, CSV, PPT/PPTX, TXT e RTF.'));return;}var max=20*1024*1024;if(file.size>max){reject(new Error('O arquivo deve ter no máximo 20 MB.'));return;}var reader=new FileReader();reader.onload=function(){var data=reader.result;if(!(data instanceof ArrayBuffer)){resolve(String(data));return;}var bytes=new Uint8Array(data),bin='';for(var i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));resolve('data:'+info.mime+';base64,'+btoa(bin));};reader.onerror=function(){reject(new Error('Não foi possível ler o arquivo.'));};reader.readAsArrayBuffer(file);});}
  function fileToDataUrlForProfile(file,type,ext){var info=resolveFileMime(file,false),mime=info.ok?info.mime:fileMimeFromExt(ext);if(!/^image\//i.test(mime)){return Promise.reject(new Error('Use PNG, JPG, WEBP ou GIF.'));}return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){try{var bytes=new Uint8Array(reader.result),bin='';for(var i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));resolve('data:'+mime+';base64,'+btoa(bin));}catch(e){reject(new Error('Não foi possível preparar a foto.'));}};reader.onerror=function(){reject(new Error('Não foi possível ler a foto.'));};reader.readAsArrayBuffer(file);});}
  function uploadFileDirect(file,route){return new Promise(function(resolve,reject){if(!file){reject(new Error('Nenhum arquivo selecionado.'));return;}var info=resolveFileMime(file,true);if(!info.ok){reject(new Error('Tipo de arquivo não suportado.'));return;}if(file.size>20*1024*1024){reject(new Error('O arquivo deve ter no máximo 20 MB.'));return;}api('POST',route,{mime:info.mime,size:file.size,name:String(file.name||'arquivo')}).then(function(ticket){if(!ticket||(!ticket.uploadUrl&&!ticket.signedUrl)||!ticket.token||!ticket.publicUrl||!ticket.path)throw new Error('Resposta de autorização incompleta: '+Object.keys(ticket||{}).join(', '));var url;try{url=new URL(ticket.uploadUrl||ticket.signedUrl);}catch(e){url=new URL('https://dlfvkawaiqduhlazsszm.supabase.co/storage/v1/object/upload/sign/'+ticket.bucket+'/'+ticket.path);}if(ticket.token&&!url.searchParams.has('token'))url.searchParams.set('token',ticket.token);if(!url.searchParams.has('token'))throw new Error('A URL assinada veio sem token.');return fetch(url.toString(),{method:'PUT',headers:{'Content-Type':info.mime,'x-upsert':'true','cache-control':'max-age=3600'},body:file}).then(function(resp){if(!resp.ok)return resp.text().then(function(t){throw new Error('Falha no Storage ('+resp.status+'): '+String(t||'').slice(0,180));});return ticket;});}).then(resolve).catch(reject);});}
  function sendChatMedia(file){
    if(!file)return;
    var tempId='local-upload-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),reply=chatReplyTo,info=resolveFileMime(file,true),isVideo=String(info.mime||'').indexOf('video/')===0,isDocument=/^(application\/|text\/)/i.test(info.mime||''),label=isDocument?'Enviando documento…':isVideo?'Enviando vídeo…':'Enviando imagem…';
    var optimistic={id:tempId,user:member,message:'',type:isDocument?'document':isVideo?'video':'image',systemType:'',createdAt:new Date().toISOString(),imageUrl:'',mentions:[],replyTo:reply,reactions:{},readBy:[],optimistic:true,pendingUpload:true,uploadLabel:label};
    chatCache.push(optimistic);chatForceScrollBottom=true;chatOpenScrollUntil=Date.now()+1200;
    try{renderChat();scrollChatToBottom(true);}catch(e){}
    uploadFileDirect(file,'/api/chat/upload-url').then(function(upload){
      return api('POST','/api/chat',{message:isDocument?String(file.name||'Documento'):'',imageUrl:upload.publicUrl,type:isDocument?'document':isVideo?'video':'image',replyTo:reply});
    }).then(function(r){
      var created=normalizeChatMessage(r&&r.message);
      if(!created)throw new Error('O anexo foi enviado, mas não recebemos a confirmação da mensagem.');
      created.pendingUpload=false;created.optimistic=false;created.uploadLabel='';
      var idx=chatCache.findIndex(function(m){return String(m.id)===String(tempId);});
      if(idx>=0)chatCache[idx]=created;else if(!chatCache.some(function(m){return String(m.id)===String(created.id);}))chatCache.push(created);
      chatCache.sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});renderChat();
      try{sendRealtimeEvent('chat_fast');}catch(e){}
    }).catch(function(e){chatCache=chatCache.filter(function(m){return String(m.id)!==String(tempId);});try{renderChat();}catch(_){}showChatError(e&&e.message||'Não foi possível enviar o anexo.');});
  }

  function closeChatLibrary(){var modal=document.querySelector('.up-chat-library-modal');if(modal)modal.remove();}
  function formatLibraryBytes(bytes){
    bytes=Number(bytes);if(!isFinite(bytes)||bytes<0)return 'Tamanho indisponível';if(bytes===0)return '0 B';
    var units=['B','KB','MB','GB'],i=0,n=bytes;while(n>=1024&&i<units.length-1){n/=1024;i++;}
    return (i===0?Math.round(n):n.toFixed(n>=10?0:1))+' '+units[i];
  }
  function openChatLibrary(){
    closeChatLibrary();
    var allItems=chatCache.filter(function(m){return m&&m.imageUrl;});
    var items=allItems.filter(function(m){return m.type==='image'||m.type==='video'||m.type==='gif'||/\.gif(?:[?#]|$)/i.test(String(m.imageUrl));}).slice().reverse();
    var documents=allItems.filter(function(m){return m.type==='document';}).slice().reverse();
    var modal=node('div',{className:'up-chat-library-modal'}),panel=node('div',{className:'up-chat-library-panel'}),head=node('div',{className:'up-chat-library-head'});
    var heading=node('div',{className:'up-chat-library-heading'}),eyebrow=node('div',{className:'up-chat-library-eyebrow',textContent:'ARQUIVOS COMPARTILHADOS'}),title=node('div',{className:'up-chat-library-title',textContent:'Biblioteca'});
    var close=node('button',{className:'up-chat-library-close',type:'button',textContent:'×',title:'Fechar biblioteca'});
    close.setAttribute('aria-label','Fechar biblioteca');heading.appendChild(eyebrow);heading.appendChild(title);head.appendChild(heading);head.appendChild(close);
    if(root.classList.contains('up-theme-light'))modal.classList.add('up-theme-light');
    var toolbar=node('div',{className:'up-chat-library-toolbar'}),tabs=node('div',{className:'up-chat-library-tabs'}),mediaTab=node('button',{className:'up-chat-library-tab active',type:'button',textContent:'Mídias ('+items.length+')'}),docsTab=node('button',{className:'up-chat-library-tab',type:'button',textContent:'Documentos ('+documents.length+')'});
    tabs.appendChild(mediaTab);tabs.appendChild(docsTab);toolbar.appendChild(tabs);
    var mediaContent=node('div',{className:'up-chat-library-content'}),filters=node('div',{className:'up-chat-library-filters'}),search=node('input',{className:'up-chat-library-search',type:'search',placeholder:'Buscar arquivo…','aria-label':'Buscar na biblioteca'}),filterSelect=node('select',{className:'up-chat-library-filter','aria-label':'Filtrar mídias'});
    ['Todos','Fotos','Vídeos','GIFs'].forEach(function(label){var opt=node('option',{textContent:label});opt.value=label;filterSelect.appendChild(opt);});
    filters.appendChild(search);filters.appendChild(filterSelect);mediaContent.appendChild(filters);
    var grid=node('div',{className:'up-chat-library-grid'});mediaContent.appendChild(grid);
    var docsContent=node('div',{className:'up-chat-library-content up-chat-library-docs-content'});docsContent.style.display='none';
    var docsSearch=node('input',{className:'up-chat-library-search',type:'search',placeholder:'Buscar documentos…','aria-label':'Buscar documentos'}),docsFilters=node('div',{className:'up-chat-library-filters'});docsFilters.appendChild(docsSearch);docsContent.appendChild(docsFilters);
    var docsList=node('div',{className:'up-chat-library-documents'});docsContent.appendChild(docsList);
    function docMeta(item){return (item.user||'Usuário')+' • '+fmtDay(item.createdAt);}
    function renderDocs(){
      docsList.innerHTML='';
      var filtered=documents.filter(function(item){var name=String(item.message||'Documento'),q=String(docsSearch.value||'').toLowerCase();return name.toLowerCase().indexOf(q)>=0||String(item.user||'').toLowerCase().indexOf(q)>=0;});
      if(!filtered.length){docsList.appendChild(node('div',{className:'up-chat-library-empty',textContent:documents.length?'Nenhum documento corresponde à busca.':'Os documentos enviados no chat aparecerão aqui.'}));return;}
      filtered.forEach(function(item){
        var name=String(item.message||'Documento'),ext=(name.split('.').pop()||'').toLowerCase(),kind=/^(doc|docx|txt|rtf|odt)$/.test(ext)?'blue':/^(xls|xlsx|csv|ods)$/.test(ext)?'green':/^(pdf|html?|ppt|pptx|odp)$/.test(ext)?'red':'blue';
        var iconName=/^pdf$/.test(ext)?'PDF':/^(doc|docx|odt)$/.test(ext)?'W':/^(xls|xlsx|ods)$/.test(ext)?'XLS':/^csv$/.test(ext)?'CSV':/^(ppt|pptx|odp)$/.test(ext)?'PPT':/^(txt|rtf)$/.test(ext)?'TXT':/^(html?)$/.test(ext)?'WEB':'FILE';
        var card=node('div',{className:'up-chat-library-document-card '+ 'up-chat-library-doc-'+kind}),iconBox=node('div',{className:'up-chat-library-doc-icon'}),iconLabel=node('span',{textContent:iconName}),info=node('div',{className:'up-chat-library-doc-info'}),fileName=node('div',{className:'up-chat-library-doc-name',textContent:name}),meta=node('div',{className:'up-chat-library-doc-meta',textContent:docMeta(item)}),download=node('button',{className:'up-chat-library-download',type:'button',textContent:'Baixar'});
        iconBox.appendChild(iconLabel);info.appendChild(fileName);info.appendChild(meta);download.onclick=function(){loadBlobUrl(item.imageUrl,'chat:'+item.imageUrl).then(function(url){var a=document.createElement('a');a.href=url;a.download=name.replace(/^.*[\\/]/,'');document.body.appendChild(a);a.click();a.remove();}).catch(function(){showToast('Não foi possível baixar o documento.','error');});};
        card.appendChild(iconBox);card.appendChild(info);card.appendChild(download);docsList.appendChild(card);
      });
    }
    function renderMedia(){
      grid.innerHTML='';
      var q=String(search.value||'').toLowerCase(),kind=filterSelect.value;
      var filtered=items.filter(function(item){var url=String(item.imageUrl||''),isVideo=item.type==='video'||/^video\//i.test(String(item.mime||'')),isGif=item.type==='gif'||/\.gif(?:[?#]|$)/i.test(url)||/^image\/gif$/i.test(String(item.mime||'')),label=isVideo?'Vídeo':isGif?'GIF':'Imagem';return (kind==='Todos'||kind==='Fotos'&&!isVideo&&!isGif||kind==='Vídeos'&&isVideo||kind==='GIFs'&&isGif)&&((label+' '+(item.user||'')+' '+fmtDay(item.createdAt)).toLowerCase().indexOf(q)>=0);});
      if(!filtered.length){grid.style.display='block';grid.appendChild(node('div',{className:'up-chat-library-empty',textContent:items.length?'Nenhuma mídia corresponde ao filtro.':'As fotos, vídeos e GIFs enviados no chat aparecerão aqui.'}));return;}
      grid.style.display='grid';
      filtered.forEach(function(item){
        var url=String(item.imageUrl||''),isVideo=item.type==='video'||/^video\//i.test(String(item.mime||'')),isGif=item.type==='gif'||/\.gif(?:[?#]|$)/i.test(url)||/^image\/gif$/i.test(String(item.mime||'')),sender=node('div',{className:'up-chat-library-sender',textContent:item.user||'Usuário'}),date=node('div',{className:'up-chat-library-date',textContent:fmtDay(item.createdAt)}),meta=node('div',{className:'up-chat-library-meta'}),card=node('button',{className:'up-chat-library-item',type:'button',title:'Abrir mídia para visualizar'}),media;
        if(isVideo)media=node('video',{className:'up-chat-library-thumb',muted:true,preload:'metadata',playsInline:true});else media=node('img',{className:'up-chat-library-thumb',alt:isGif?'GIF enviado':'Imagem enviada',loading:'lazy'});
        var bytes=item.size!=null?item.size:item.fileSize!=null?item.fileSize:item.bytes!=null?item.bytes:null,label=node('span',{className:'up-chat-library-name',textContent:(isVideo?'Vídeo':isGif?'GIF':'Imagem')+' • '+fmtTime(item.createdAt)+' • '+formatLibraryBytes(bytes)});
        meta.appendChild(sender);meta.appendChild(date);card.appendChild(meta);card.appendChild(media);card.appendChild(label);grid.appendChild(card);
        loadBlobUrl(item.imageUrl,'chat:'+item.imageUrl).then(function(blobUrl){if(!media.isConnected)return;media.src=blobUrl;if(bytes==null&&mediaBlobSizeCache['chat:'+item.imageUrl]!=null)label.textContent=(isVideo?'Vídeo':isGif?'GIF':'Imagem')+' • '+fmtTime(item.createdAt)+' • '+formatLibraryBytes(mediaBlobSizeCache['chat:'+item.imageUrl]);}).catch(function(){});
        card.onclick=function(){if(isVideo){openChatLibraryVideoLightbox(item,modal);return;}var openImage=function(src){var box=chatLightbox||chat.querySelector('.up-chat-lightbox');if(box&&box.parentNode===document.body)document.body.appendChild(box);modal.classList.add('up-chat-library-viewing-image');openChatLightbox(src);};if(media.src&&media.complete!==false&&media.naturalWidth>0)openImage(media.src);else loadBlobUrl(item.imageUrl,'chat:'+item.imageUrl).then(function(src){if(card.isConnected)openImage(src);}).catch(function(){});};
      });
    }
    function switchTab(which){var docs=which==='documents';mediaTab.classList.toggle('active',!docs);docsTab.classList.toggle('active',docs);mediaContent.style.display=docs?'none':'flex';docsContent.style.display=docs?'flex':'none';}
    mediaTab.onclick=function(){switchTab('media');};docsTab.onclick=function(){switchTab('documents');};
    search.addEventListener('input',renderMedia);filterSelect.addEventListener('change',renderMedia);docsSearch.addEventListener('input',renderDocs);
    renderMedia();renderDocs();
    panel.appendChild(head);panel.appendChild(toolbar);panel.appendChild(mediaContent);panel.appendChild(docsContent);modal.appendChild(panel);document.body.appendChild(modal);
    close.onclick=closeChatLibrary;modal.addEventListener('click',function(e){if(e.target===modal)closeChatLibrary();});
    var onKey=function(e){var box=chatLightbox||document.querySelector('.up-chat-lightbox'),videoBox=document.querySelector('.up-chat-library-video-lightbox');if(e.key==='Escape'&&((box&&!box.classList.contains('hidden'))||(videoBox&&videoBox.isConnected)))return;if(e.key==='Escape'&&modal.isConnected){closeChatLibrary();document.removeEventListener('keydown',onKey,true);}};
    document.addEventListener('keydown',onKey,true);
  }
  function openChatLibraryVideoLightbox(item,libraryModal){
    if(!item||!item.imageUrl)return;
    var previous=document.querySelector('.up-chat-library-video-lightbox');if(previous)previous.remove();
    var overlay=node('div',{className:'up-chat-library-video-lightbox'}),video=node('video',{controls:true,autoplay:true,playsInline:true,ariaLabel:'Vídeo ampliado'});
    overlay.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:rgba(5,8,13,.42);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box;';
    video.style.cssText='display:block;max-width:92vw;max-height:90vh;width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 20px 70px #000b;border:1px solid #52627b;background:#05080d;';
    overlay.appendChild(video);document.body.appendChild(overlay);if(libraryModal)libraryModal.classList.add('up-chat-library-viewing-image');
    loadBlobUrl(item.imageUrl,'chat:'+item.imageUrl).then(function(url){if(video.isConnected){video.src=url;var p=video.play();if(p&&p.catch)p.catch(function(){});}}).catch(function(){});
    function dismiss(){video.pause();video.removeAttribute('src');video.load();overlay.remove();document.removeEventListener('keydown',onKey,true);if(libraryModal)libraryModal.classList.remove('up-chat-library-viewing-image');}
    function onKey(e){if(e.key==='Escape'&&overlay.isConnected){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();dismiss();}}
    overlay.addEventListener('click',function(e){if(e.target===overlay)dismiss();});document.addEventListener('keydown',onKey,true);
  }
  function openChatMediaViewer(item){
    if(!item||!item.imageUrl)return;
    var existing=chat.querySelector('.up-chat-media-viewer');if(existing)existing.remove();
    var overlay=node('div',{className:'up-chat-media-viewer'}),frame=node('div',{className:'up-chat-media-viewer-frame'}),close=node('button',{className:'up-chat-media-viewer-close',type:'button',textContent:'×',title:'Fechar visualização'}),media;
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(3,7,13,.92);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    frame.style.cssText='position:relative;display:flex;align-items:center;justify-content:center;max-width:96vw;max-height:92vh;width:100%;height:100%;';
    close.style.cssText='position:absolute;right:0;top:0;z-index:2;width:36px;height:36px;border:0;border-radius:8px;background:#273247;color:#fff;font-size:22px;cursor:pointer;';
    if(item.type==='video'||/^video\//i.test(String(item.mime||''))){media=node('video',{controls:true,autoplay:true,playsInline:true,style:'max-width:100%;max-height:90vh;border-radius:8px'});}
    else media=node('img',{alt:'Mídia do chat',style:'max-width:100%;max-height:90vh;object-fit:contain;border-radius:8px'});
    frame.appendChild(media);frame.appendChild(close);overlay.appendChild(frame);document.body.appendChild(overlay);
    loadBlobUrl(item.imageUrl,'chat:'+item.imageUrl).then(function(u){if(media.isConnected)media.src=u;}).catch(function(){});
    function dismiss(){overlay.remove();document.removeEventListener('keydown',onKey,true);}
    function onKey(e){if(e.key==='Escape')dismiss();}
    close.onclick=dismiss;overlay.addEventListener('click',function(e){if(e.target===overlay)dismiss();});document.addEventListener('keydown',onKey,true);
  }
  function openProfileModal(){var file=profileModal.querySelector('.up-chat-profile-file'),preview=profileModal.querySelector('.up-chat-profile-preview'),msg=profileModal.querySelector('.up-chat-profile-message');msg.textContent='';file.value='';hydrateAvatar(preview,member);profileModal.classList.remove('hidden');}
  function closeProfileModal(){closePopupAnimated(profileModal,function(){profileModal.classList.add('hidden');profileModal.classList.remove('up-popup-closing');});}
  profileModal.querySelector('.up-chat-profile-cancel').onclick=function(){closeProfileModal();};profileModal.onclick=function(e){if(e.target===profileModal)closeProfileModal();};
  profileModal.querySelector('.up-chat-profile-file').onchange=function(){var f=this.files&&this.files[0],msg=profileModal.querySelector('.up-chat-profile-message');if(!f)return;var type=String(f.type||'').toLowerCase(),ext=String(f.name||'').split('.').pop().toLowerCase();var okType=/^image\/(png|jpe?g|webp|gif)$/i.test(type)||['png','jpg','jpeg','webp','gif'].indexOf(ext)>=0;if(!okType){msg.textContent='Use PNG, JPG, WEBP ou GIF.';return;}if(f.size>20*1024*1024){msg.textContent='A foto deve ter no máximo 20 MB.';return;}fileToDataUrlForProfile(f,type,ext).then(function(data){profileModal.querySelector('.up-chat-profile-preview').src=data;msg.textContent='';}).catch(function(e){msg.textContent=e.message;});};
  profileModal.querySelector('.up-chat-profile-save').onclick=function(){var file=profileModal.querySelector('.up-chat-profile-file').files&&profileModal.querySelector('.up-chat-profile-file').files[0],msg=profileModal.querySelector('.up-chat-profile-message'),btn=this;if(!file){msg.textContent='Escolha uma foto.';return;}btn.disabled=true;msg.textContent='Salvando…';uploadFileDirect(file,'/api/profile/avatar-upload-url').then(function(upload){return api('POST','/api/profile/avatar',{avatarUrl:upload.publicUrl});}).then(function(r){var ck='profile:'+member;if(mediaBlobCache[ck]){try{URL.revokeObjectURL(mediaBlobCache[ck]);}catch(e){}delete mediaBlobCache[ck];}GM_setValue(key+ck,r.avatarUrl);profileCache[member]=r.avatarUrl;hydrateAvatar(profileModal.querySelector('.up-chat-profile-preview'),member);updateBubbleAvatar(false);closeProfileModal();loadChat();}).catch(function(e){msg.textContent=e.message;}).finally(function(){btn.disabled=false;});};

  var healthPingPending={},healthPingResults={},healthRefreshTimer=null,healthLoading=false;
  function canViewHealth(){return ['Ricardo','Lohan','Guilherme'].indexOf(member)>=0;}
  function healthLed(ok,kind){return '<span class="up-health-led '+(ok?'ok':kind||'bad')+'"></span>';}
  function healthPingLabel(name){
    if(name===member)return '<span class="up-health-ping good">local</span>';
    var p=healthPingResults[name];
    if(p==null)return '<span class="up-health-ping pending">testando…</span>';
    if(p<120)return '<span class="up-health-ping good">'+Math.round(p)+' ms</span>';
    if(p<250)return '<span class="up-health-ping warn">'+Math.round(p)+' ms</span>';
    return '<span class="up-health-ping bad">'+Math.round(p)+' ms</span>';
  }
  function requestHealthPings(users){
    if(!realtimeActive||!realtimeChannel)return;
    (users||[]).filter(function(m){return m&&m.connected!==false;}).forEach(function(m){
      if(m.name===member){healthPingResults[m.name]=0;return;}
      var id=member+'|'+m.name+'|'+Date.now()+'|'+Math.random().toString(36).slice(2);
      healthPingPending[id]={name:m.name,startedAt:performance.now()};
      try{realtimeChannel.send({type:'broadcast',event:'health_ping',payload:{id:id,target:m.name,sender:member,createdAt:Date.now()}});}catch(e){delete healthPingPending[id];}
      setTimeout(function(){
        var p=healthPingPending[id];if(!p)return;delete healthPingPending[id];
        if(health.classList.contains('hidden'))return;
        healthPingResults[p.name]=null;
        var el=health.querySelector('[data-health-ping="'+CSS.escape(p.name)+'"]');if(el)el.innerHTML=healthPingLabel(p.name);
      },2500);
    });
  }
  function handleHealthPing(payload){
    if(!payload||payload.target!==member||typeof payload.sender!=='string'||!payload.sender||payload.sender.length>80||typeof payload.id!=='string'||!payload.id||payload.id.length>160||!realtimeActive||!realtimeChannel)return;
    try{realtimeChannel.send({type:'broadcast',event:'health_pong',payload:{id:payload.id,target:payload.sender,sender:member,createdAt:Date.now()}});}catch(e){}
  }
  function handleHealthPong(payload){
    if(!payload||payload.target!==member||typeof payload.sender!=='string'||!payload.sender||payload.sender.length>80||typeof payload.id!=='string'||!payload.id||payload.id.length>160)return;
    var p=healthPingPending[payload.id];if(!p||payload.sender!==p.name)return;delete healthPingPending[payload.id];
    healthPingResults[p.name]=Math.max(0,performance.now()-p.startedAt);
    if(health.classList.contains('hidden'))return;
    var el=health.querySelector('[data-health-ping="'+CSS.escape(p.name)+'"]');if(el)el.innerHTML=healthPingLabel(p.name);
  }
  function openHealth(){
    if(!canViewHealth())return;
    card.classList.add('hidden');
    history.classList.add('hidden');
    chat.classList.add('hidden');
    health.innerHTML='<div class="up-health-head"><div><div class="up-health-title">Saúde do sistema</div><div class="up-health-sub">Equipe de Implementação • '+esc(member)+'</div></div><button type="button" class="up-health-close">Fechar</button></div><div class="up-health-list"><div class="up-health-row"><div class="up-health-left">'+healthLed(true)+'<span class="up-health-name">Verificando o sistema</span></div><span class="up-health-detail">Aguarde…</span></div></div><div class="up-health-footer">Verde: funcionando. Amarelo: reconectando. Vermelho: precisa de atenção.</div><button type="button" class="up-health-refresh">Atualizar agora</button>';
    health.classList.remove('hidden');
    health.querySelector('.up-health-close').onclick=function(){stopHealthMonitor();health.classList.add('hidden');card.classList.remove('hidden');};
    health.querySelector('.up-health-refresh').onclick=function(){loadHealth(true);};
    startHealthMonitor();
    loadHealth(true);
  }
  function startHealthMonitor(){
    if(healthRefreshTimer)return;
    healthRefreshTimer=setInterval(function(){if(!health.classList.contains('hidden'))loadHealth(false);},3000);
  }
  function stopHealthMonitor(){
    if(healthRefreshTimer){clearInterval(healthRefreshTimer);healthRefreshTimer=null;}
    healthLoading=false;
  }
  function loadHealth(initial){
    if(!canViewHealth()||health.classList.contains('hidden')||healthLoading)return;
    healthLoading=true;
    var list=health.querySelector('.up-health-list');if(!list){healthLoading=false;return;}
    if(initial||!list.querySelector('.up-health-row'))list.innerHTML='<div class="up-health-row"><div class="up-health-left">'+healthLed(true)+'<span class="up-health-name">Consultando diagnóstico</span></div><span class="up-health-detail">Aguarde…</span></div>';
    var started=Date.now();
    api('GET','/api/health').then(function(d){
      var apiMs=Date.now()-started,db=d&&d.db||{},chatCheck=d&&d.chat||{},state=d&&d.state||{},users=d&&d.members||[],rt=realtimeActive;
      var rows=[
        {name:'Sistema UpStatus',ok:!!(d&&d.ok),detail:(d&&d.version?'Funcionando • '+apiMs+' ms':'Indisponível')},
        {name:'Banco de dados',ok:!!db.ok,detail:db.ok?('Respondendo • '+db.ms+' ms'):'Sem resposta'},
        {name:'Chat da equipe',ok:!!chatCheck.ok,detail:chatCheck.ok?('Pronto • '+chatCheck.ms+' ms'):'Com erro'},
        {name:'Alertas e comandos',ok:!!state.ok,detail:state.ok?'Funcionando':'Com erro'},
        {name:'Atualização em tempo real',ok:rt,kind:rt?'':'warn',detail:rt?'Ativa':'Reconectando'},
        {name:'Sua versão',ok:true,detail:'v'+CURRENT_VERSION}
      ];
      healthPingResults={};
      list.innerHTML=rows.map(function(r){return '<div class="up-health-row" data-health-key="'+esc(r.name)+'"><div class="up-health-left">'+healthLed(r.ok,r.kind)+'<span class="up-health-name">'+r.name+'</span></div><span class="up-health-detail">'+r.detail+'</span></div>';}).join('')+
        '<div class="up-health-members"><div class="up-health-sub">Equipe conectada</div>'+users.map(function(m){
          var connected=m.connected!==false,ver=m.version?'v'+esc(m.version):'v?',seen=m.seenAt?' • visto '+fmtTime(m.seenAt):'';
          return '<div class="up-health-member"><b>'+esc(m.name)+'</b><span>'+ver+' • '+(connected?'conectado':'desconectado')+seen+' <span data-health-ping="'+esc(m.name)+'">'+healthPingLabel(m.name)+'</span></span></div>';
        }).join('')+'</div>';
      requestHealthPings(users);
    }).catch(function(e){
      list.innerHTML='<div class="up-health-row"><div class="up-health-left">'+healthLed(false)+'<span class="up-health-name">Diagnóstico indisponível</span></div><span class="up-health-detail">'+esc(e.message||'Erro')+'</span></div>';
    }).finally(function(){healthLoading=false;});
  }

  function login(){
    authenticated=false;authGeneration++;teamLiteSessionEnded=false;
    teamLiteClearIdleTimer();
    if(chatReconnectTimer){clearTimeout(chatReconnectTimer);chatReconnectTimer=null;}
    try{stopRealtime();}catch(e){}
    chat.classList.add('hidden');history.classList.add('hidden');health.classList.add('hidden');remoteOverlay.classList.add('hidden');
    card.classList.remove('team-lite-chat-mode');
    if(quickChatBubble)quickChatBubble.disabled=true;
    chatLoading=false;chatForceFullQueued=false;typingPolling=false;refreshing=false;remotePolling=false;
    img.src=profileFallback();
    var loginMember=GM_getValue(key+'last_member','Lucca')||'Lucca';lastMember=loginMember;card.innerHTML='<div class="up-title">UpStatus</div><div class="up-you">Entre para controlar o seu status.</div><div class="up-login"><label>Seu nome</label><select class="up-select" id="up-name"></select><label>Senha</label><input class="up-input" id="up-password" type="password" placeholder="Sua senha"><button id="up-enter">Entrar</button></div><div class="up-update up-login-update"><div><span>Versão v'+CURRENT_VERSION+'</span><a href="#" class="up-patch-link">O que há de novo?</a></div><div><button type="button" class="up-update-check">Verificar atualização</button><button type="button" class="up-update-now">Atualizar</button></div><span class="up-update-status"></span></div><div class="up-message"></div>';
    var nameSelect=card.querySelector('#up-name');
    function setLoginMembers(names){
      var list=(names||[]).filter(function(n){return n==='Lucca'||n==='Ycaro';});
      if(!list.length)list=['Lucca','Ycaro'];
      nameSelect.innerHTML=list.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>';}).join('');
      if(list.indexOf(loginMember)<0)loginMember=list[0];
      nameSelect.value=loginMember;
    }
    function passwordKey(name){return key+'password_'+String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_');}
    function loadSavedPassword(){var saved='';try{saved=sessionStorage.getItem(passwordKey(loginMember))||'';}catch(e){}var input=card.querySelector('#up-password');if(input)input.value=saved;}
    setLoginMembers(['Lucca','Ycaro']);
    nameSelect.onchange=function(){loginMember=nameSelect.value;lastMember=loginMember;GM_setValue(key+'last_member',loginMember);loadSavedPassword();};
    loadSavedPassword();
    api('GET','/api/members').then(function(r){setLoginMembers((r.members||[]).map(function(x){return x.name;}));}).catch(function(){});
    card.querySelector('#up-enter').onclick=async function(){
      var button=card.querySelector('#up-enter');
      if(button&&button.disabled)return;
      var attempt=++authGeneration;
      authenticated=false;
      if(quickChatBubble)quickChatBubble.disabled=true;
      var passwordInput=card.querySelector('#up-password');
      var nameInput=card.querySelector('#up-name');
      var originalLabel=button?button.textContent:'Entrar';
      if(button){button.disabled=true;button.setAttribute('aria-busy','true');button.innerHTML='<span class="up-login-spinner" aria-hidden="true"></span> Entrando…';button.style.opacity='.85';button.style.cursor='wait';}
      if(passwordInput)passwordInput.disabled=true;
      if(nameInput)nameInput.disabled=true;
      var loginStarted=Date.now();
      try{
        server=CLOUD_SERVER;
        var name=loginMember;
        var password=passwordInput?passwordInput.value:'';
        if(!password)throw new Error('Digite sua senha para entrar.');
        var account=await api('GET','/api/account?name='+encodeURIComponent(name));
        if(attempt!==authGeneration)return;
        var r=await api('POST',account.needsSetup?'/api/setup':'/api/login',{name:name,password:password});
        if(attempt!==authGeneration)return;
        if(!r||!r.token||!r.name||String(r.name)!==String(name))throw new Error('Resposta de autenticação inválida. Verifique o usuário e tente novamente.');
        token=r.token;member=r.name;role=r.role||'implementation_user';lastMember=member;
        authenticated=true;authGeneration++;
        GM_setValue(key+'server',CLOUD_SERVER);GM_setValue(key+'token',token);GM_setValue(key+'member',member);GM_setValue(key+'last_member',member);GM_setValue(key+'role',role);try{sessionStorage.setItem(passwordKey(name),password);}catch(e){}
        if(quickChatBubble)quickChatBubble.disabled=false;
        img.src=profileFallback();app();refresh();startRealtime();updateBubbleAvatar(true);openUpStatusPanel();
      }catch(e){
        if(attempt!==authGeneration)return;
        authenticated=false;chat.classList.add('hidden');card.classList.remove('team-lite-chat-mode');
        message(e.message,true);
      }finally{
        if(attempt===authGeneration||!authenticated){
          if(button&&button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');button.textContent=originalLabel;button.style.opacity='';button.style.cursor='pointer';}
          if(passwordInput&&passwordInput.isConnected)passwordInput.disabled=false;
          if(nameInput&&nameInput.isConnected)nameInput.disabled=false;
        }
      }
    };
    card.querySelector('#up-password').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();card.querySelector('#up-enter').click();}});
    card.querySelector('.up-update-check').onclick=checkUpdate;
    card.querySelector('.up-patch-link').onclick=function(e){e.preventDefault();openPatchNotes();};
    checkUpdate();
  }

  var theme=GM_getValue(key+'theme','dark')==='light'?'light':'dark';
  function applyTheme(){
    root.classList.toggle('up-theme-light',theme==='light');
    var btn=card.querySelector('.up-settings-theme');
    if(btn){var nextTheme=theme==='dark'?'claro':'escuro';btn.innerHTML=iconSvg(theme==='dark'?'sun':'moon')+'<span>Modo '+nextTheme+'</span>';btn.title='Mudar para modo '+nextTheme;btn.setAttribute('aria-label',btn.title);}
  }
  function toggleTheme(){
    theme=theme==='dark'?'light':'dark';
    GM_setValue(key+'theme',theme);
    applyTheme();
  }

  var audioDiag={stream:null,micContext:null,toneContext:null,analyser:null,raf:0,tone:null,toneGain:null,toneActive:false,devices:[],level:0};
  function closeTestPanel(){audioDiagStopMic();audioDiagStopTone();try{if(audioDiag.toneContext&&audioDiag.toneContext.state!=='closed')audioDiag.toneContext.close();}catch(e){}audioDiag.toneContext=null;var el=document.querySelector('.up-test-overlay');if(el)el.remove();}
  function audioDiagSetStatus(message){var el=document.querySelector('.up-test-status');if(el)el.textContent=message;}
  function audioDiagStopMic(){if(audioDiag.raf){cancelAnimationFrame(audioDiag.raf);audioDiag.raf=0;}try{if(audioDiag.analyser)audioDiag.analyser.disconnect();}catch(e){}audioDiag.analyser=null;try{if(audioDiag.stream)audioDiag.stream.getTracks().forEach(function(t){t.stop();});}catch(e){}audioDiag.stream=null;try{if(audioDiag.micContext&&audioDiag.micContext.state!=='closed')audioDiag.micContext.close();}catch(e){}audioDiag.micContext=null;var b=document.querySelector('.up-test-mic-start'),stop=document.querySelector('.up-test-mic-stop'),meter=document.querySelector('.up-test-meter-fill'),label=document.querySelector('.up-test-meter-label');if(b)b.disabled=false;if(stop)stop.disabled=true;if(meter)meter.style.width='0%';if(label)label.textContent='Aguardando teste';}
  function audioDiagStopTone(){try{if(audioDiag.tone){audioDiag.tone.stop();audioDiag.tone.disconnect();}}catch(e){}try{if(audioDiag.toneGain)audioDiag.toneGain.disconnect();}catch(e){}audioDiag.tone=null;audioDiag.toneGain=null;audioDiag.toneActive=false;var b=document.querySelector('.up-test-tone-start'),stop=document.querySelector('.up-test-tone-stop');if(b)b.disabled=false;if(stop)stop.disabled=true;}
  async function audioDiagLoadDevices(){var select=document.querySelector('.up-test-device');if(!select)return;try{if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices)throw new Error('Este navegador não permite listar dispositivos.');audioDiag.devices=(await navigator.mediaDevices.enumerateDevices()).filter(function(d){return d.kind==='audioinput';});var prior=select.value;select.innerHTML='<option value="">Microfone padrão</option>'+audioDiag.devices.map(function(d,i){return '<option value="'+esc(d.deviceId)+'">'+esc(d.label||('Microfone '+(i+1)))+'</option>';}).join('');if(prior&&audioDiag.devices.some(function(d){return d.deviceId===prior;}))select.value=prior;}catch(e){audioDiagSetStatus('Não foi possível listar microfones: '+(e.message||e));}}
  async function audioDiagStartMic(){audioDiagStopMic();var start=document.querySelector('.up-test-mic-start'),stop=document.querySelector('.up-test-mic-stop');try{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('O navegador não disponibiliza acesso ao microfone. Use uma página segura (HTTPS).');if(start)start.disabled=true;audioDiagSetStatus('Solicitando permissão para acessar o microfone…');var device=document.querySelector('.up-test-device'),deviceId=device&&device.value;var constraints={audio:deviceId?{deviceId:{exact:deviceId},echoCancellation:true,noiseSuppression:false,autoGainControl:false}:{echoCancellation:true,noiseSuppression:false,autoGainControl:false}};audioDiag.stream=await navigator.mediaDevices.getUserMedia(constraints);var AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AudioContext não está disponível neste navegador.');audioDiag.micContext=new AC();if(audioDiag.micContext.state==='suspended')await audioDiag.micContext.resume();audioDiag.analyser=audioDiag.micContext.createAnalyser();audioDiag.analyser.fftSize=1024;audioDiag.micContext.createMediaStreamSource(audioDiag.stream).connect(audioDiag.analyser);var data=new Uint8Array(audioDiag.analyser.fftSize);if(stop)stop.disabled=false;audioDiagSetStatus('Microfone ativo. Fale normalmente para verificar o nível de entrada.');var tick=function(){if(!audioDiag.analyser)return;audioDiag.analyser.getByteTimeDomainData(data);var sum=0;for(var i=0;i<data.length;i++){var v=(data[i]-128)/128;sum+=v*v;}var rms=Math.sqrt(sum/data.length),pct=Math.max(0,Math.min(100,Math.round(rms*280)));audioDiag.level=pct;var fill=document.querySelector('.up-test-meter-fill'),label=document.querySelector('.up-test-meter-label');if(fill)fill.style.width=pct+'%';if(label)label.textContent=pct<2?'Sem sinal detectável':pct<12?'Sinal baixo':pct<65?'Sinal normal':'Sinal forte';audioDiag.raf=requestAnimationFrame(tick);};tick();}catch(e){audioDiagStopMic();audioDiagSetStatus('Falha no microfone: '+(e.message||e));if(start)start.disabled=false;}}
  async function audioDiagStartTone(){audioDiagStopTone();try{var AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Reprodução de áudio não suportada.');audioDiag.toneContext=audioDiag.toneContext&&audioDiag.toneContext.state!=='closed'?audioDiag.toneContext:new AC();if(audioDiag.toneContext.state==='suspended')await audioDiag.toneContext.resume();audioDiag.tone=audioDiag.toneContext.createOscillator();audioDiag.toneGain=audioDiag.toneContext.createGain();var volume=document.querySelector('.up-test-tone-volume');audioDiag.tone.type='sine';audioDiag.tone.frequency.value=880;audioDiag.toneGain.gain.value=Number(volume?volume.value:0.12);audioDiag.tone.connect(audioDiag.toneGain);audioDiag.toneGain.connect(audioDiag.toneContext.destination);audioDiag.tone.start();audioDiag.toneActive=true;var start=document.querySelector('.up-test-tone-start'),stop=document.querySelector('.up-test-tone-stop');if(start)start.disabled=true;if(stop)stop.disabled=false;audioDiagSetStatus('Som de teste ativo. Se não ouvir nada, confira a saída de áudio do sistema.');}catch(e){audioDiagSetStatus('Falha ao reproduzir o som: '+(e.message||e));audioDiagStopTone();}}
  function audioDiagReport(){var peers=voiceRoom&&voiceRoom.peers?Object.keys(voiceRoom.peers).map(function(n){var p=voiceRoom.peers[n],pc=p&&p.pc;return {participante:n,connectionState:pc?pc.connectionState:'sem peer',iceConnectionState:pc?pc.iceConnectionState:'sem peer',signalingState:pc?pc.signalingState:'sem peer',localAudioTracks:pc?pc.getSenders().filter(function(x){return x.track&&x.track.kind==='audio';}).length:0,remoteAudioTracks:pc?pc.getReceivers().filter(function(x){return x.track&&x.track.kind==='audio'&&x.track.readyState==='live';}).length:0};}):[];return {versao:CURRENT_VERSION,usuario:member||'desconhecido',timestamp:new Date().toISOString(),secureContext:!!window.isSecureContext,mediaDevices:!!(navigator.mediaDevices),microfoneTeste:{ativo:!!audioDiag.stream,nivelEntradaPercentual:audioDiag.level,tracks:audioDiag.stream?audioDiag.stream.getAudioTracks().map(function(t){return {enabled:t.enabled,muted:t.muted,readyState:t.readyState,label:t.label};}):[]},realtime:{ativo:!!realtimeActive},salaVoz:{ativa:!!(voiceRoom&&voiceRoom.active),participantes:voiceRoom?Object.keys(voiceRoom.participants||{}):[],pingMs:voiceRoom?voiceRoom.pingMs:null,peers:peers},userAgent:navigator.userAgent};}
  async function audioDiagCopyReport(){var report=JSON.stringify(audioDiagReport(),null,2);try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(report);audioDiagSetStatus('Relatório copiado. Ele contém diagnóstico técnico, sem gravação de áudio.');return;}}catch(e){}try{var ta=document.createElement('textarea');ta.value=report;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();var ok=document.execCommand('copy');ta.remove();audioDiagSetStatus(ok?'Relatório copiado. Ele não contém gravação de áudio.':'Não foi possível copiar automaticamente. Selecione e copie o relatório manualmente.');}catch(e){audioDiagSetStatus('Não foi possível copiar o relatório: '+(e.message||e));}}
  async function audioDiagRun(){audioDiagSetStatus('Verificando dispositivos, permissões e estado da conexão…');await audioDiagLoadDevices();var r=audioDiagReport(),lines=[];lines.push('Contexto seguro: '+(r.secureContext?'sim':'não'));lines.push('API de mídia: '+(r.mediaDevices?'disponível':'indisponível'));lines.push('Permissão/captura de microfone: '+(r.microfoneTeste.ativo?'ativa':'ainda não testada'));lines.push('Realtime: '+(r.realtime.ativo?'conectado':'não conectado'));lines.push('Sala de voz: '+(r.salaVoz.ativa?'ativa':'não está em chamada'));if(r.salaVoz.ativa){if(!r.salaVoz.peers.length)lines.push('Áudio remoto: nenhum peer de áudio registrado.');r.salaVoz.peers.forEach(function(p){lines.push(p.participante+': conexão '+p.connectionState+', ICE '+p.iceConnectionState+', faixas enviadas '+p.localAudioTracks+', faixas remotas ativas '+p.remoteAudioTracks);});}audioDiagSetStatus(lines.join(' • '));}
  function openTestPanel(){closeTestPanel();var o=document.createElement('div');o.className='up-test-overlay';o.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(4,8,14,.72);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;color:#edf2fb;font-family:Segoe UI,Arial,sans-serif';o.innerHTML='<div style="width:min(520px,calc(100vw - 28px));max-height:calc(100vh - 36px);overflow:auto;background:linear-gradient(145deg,#182334,#101722);border:1px solid #3d5272;border-radius:16px;box-shadow:0 22px 70px #000b;padding:18px;box-sizing:border-box"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div style="font-size:18px;font-weight:800">Diagnóstico de Áudio</div><div style="font-size:11px;color:#91a2ba;margin-top:3px">Ferramentas de microfone, reprodução e conexão • build '+esc(CURRENT_VERSION)+'</div></div><button class="up-test-close" aria-label="Fechar" style="border:0;background:#273247;color:#dbe5f5;border-radius:8px;width:32px;height:32px;cursor:pointer">×</button></div><section style="margin-top:15px;padding:12px;border:1px solid #34445c;border-radius:12px;background:#121c2a"><div style="font-size:13px;font-weight:750;margin-bottom:8px">1. Teste de microfone</div><label style="display:block;font-size:11px;color:#aab6c9;margin-bottom:5px" for="up-test-device">Dispositivo de entrada</label><select class="up-test-device" id="up-test-device" style="width:100%;padding:8px;background:#202d40;color:#edf2fb;border:1px solid #3d5272;border-radius:7px;margin-bottom:9px"><option value="">Microfone padrão</option></select><div style="height:8px;background:#273247;border-radius:8px;overflow:hidden"><div class="up-test-meter-fill" style="width:0;height:100%;background:linear-gradient(90deg,#16a36b,#74e7a6);transition:width .08s linear"></div></div><div class="up-test-meter-label" style="font-size:11px;color:#aab6c9;margin:6px 0 9px">Aguardando teste</div><div style="display:flex;gap:7px"><button class="up-test-mic-start" style="flex:1;padding:8px;background:#087f5b;color:white;border:0;border-radius:7px;cursor:pointer">Testar microfone</button><button class="up-test-mic-stop" disabled style="padding:8px 12px;background:#273247;color:#dbe5f5;border:1px solid #3d5272;border-radius:7px;cursor:pointer">Parar</button></div></section><section style="margin-top:10px;padding:12px;border:1px solid #34445c;border-radius:12px;background:#121c2a"><div style="font-size:13px;font-weight:750;margin-bottom:8px">2. Teste de saída</div><div style="display:flex;align-items:center;gap:9px"><label for="up-test-tone-volume" style="font-size:11px;color:#aab6c9">Volume do som</label><input class="up-test-tone-volume" id="up-test-tone-volume" type="range" min="0.02" max="0.3" step="0.01" value="0.12" style="flex:1;accent-color:#12b981"><span class="up-test-tone-label" style="font-size:11px">40%</span></div><div style="display:flex;gap:7px;margin-top:9px"><button class="up-test-tone-start" style="flex:1;padding:8px;background:#087f5b;color:white;border:0;border-radius:7px;cursor:pointer">Reproduzir som de teste</button><button class="up-test-tone-stop" disabled style="padding:8px 12px;background:#273247;color:#dbe5f5;border:1px solid #3d5272;border-radius:7px;cursor:pointer">Parar som</button></div><div style="font-size:10px;color:#91a2ba;margin-top:6px">O navegador pode não permitir selecionar a saída de áudio diretamente.</div></section><section style="margin-top:10px;padding:12px;border:1px solid #34445c;border-radius:12px;background:#121c2a"><div style="font-size:13px;font-weight:750;margin-bottom:8px">3. Diagnóstico da conexão</div><div style="font-size:11px;color:#aab6c9;margin-bottom:9px">Verifica Realtime, estado WebRTC/ICE e faixas de áudio sem gravar nem transmitir sua voz para o relatório.</div><div style="display:flex;gap:7px"><button class="up-test-diagnose" style="flex:1;padding:8px;background:#273247;color:#edf2fb;border:1px solid #3d5272;border-radius:7px;cursor:pointer">Executar diagnóstico</button><button class="up-test-copy" style="padding:8px 12px;background:#273247;color:#edf2fb;border:1px solid #3d5272;border-radius:7px;cursor:pointer">Copiar relatório</button></div></section><div class="up-test-status" role="status" aria-live="polite" style="margin-top:10px;padding:10px;border:1px solid #2f4058;border-radius:9px;background:#111a27;color:#a9bad0;font-size:11px">Pronto para testar. Os testes de microfone e som são locais.</div><div style="font-size:10px;color:#74869f;margin-top:10px">O teste usa recursos independentes e pode ser encerrado a qualquer momento. Ao fechar o painel, a captura e os sons de teste são encerrados.</div></div>';document.body.appendChild(o);o.querySelector('.up-test-close').onclick=closeTestPanel;o.querySelector('.up-test-mic-start').onclick=audioDiagStartMic;o.querySelector('.up-test-mic-stop').onclick=function(){audioDiagStopMic();audioDiagSetStatus('Teste de microfone encerrado.');};o.querySelector('.up-test-device').onchange=function(){if(audioDiag.stream)audioDiagStartMic();};o.querySelector('.up-test-tone-start').onclick=audioDiagStartTone;o.querySelector('.up-test-tone-stop').onclick=function(){audioDiagStopTone();audioDiagSetStatus('Som de teste encerrado.');};o.querySelector('.up-test-tone-volume').oninput=function(){var label=o.querySelector('.up-test-tone-label');if(label)label.textContent=Math.round(Number(this.value)/.3*100)+'%';if(audioDiag.toneGain)audioDiag.toneGain.gain.value=Number(this.value);};o.querySelector('.up-test-diagnose').onclick=audioDiagRun;o.querySelector('.up-test-copy').onclick=audioDiagCopyReport;o.addEventListener('click',function(e){if(e.target===o)closeTestPanel();});audioDiagLoadDevices();}
  function app(){
    if(!isAuthenticated())return;
    api('GET','/api/members').then(function(r){if(isAuthenticated())window.__upstatusMembers=(r.members||[]).map(function(x){return x.name});}).catch(function(){});
    card.innerHTML='<div class="up-head"><div class="up-head-identity"><button type="button" class="up-head-avatar up-head-avatar-btn" title="Alterar foto de perfil" aria-label="Alterar foto de perfil"><img class="up-head-avatar-img" alt=""></button><div><div class="up-title">UpStatus</div><div class="up-you">Conectado como '+esc(member)+'</div></div></div><div class="up-actions"><button class="up-chat-btn" title="Chat da equipe" aria-label="Chat da equipe"><svg class="up-quick-chat-icon" viewBox="0 0 24 24" aria-hidden="true"><path class="up-chat-icon-bubble" d="M12 2.5C6.35 2.5 1.8 6.45 1.8 11.35c0 2.28.98 4.35 2.63 5.92-.4 1.72-1.38 3.15-2.55 4.3 3.1.14 5.68-.63 7.63-1.77.8.2 1.65.3 2.49.3 5.65 0 10.2-3.95 10.2-8.75S17.65 2.5 12 2.5Z" fill="currentColor"/><circle cx="7.7" cy="11.4" r="1.45" fill="var(--up-chat-icon-cutout,#273247)"/><circle cx="12" cy="11.4" r="1.45" fill="var(--up-chat-icon-cutout,#273247)"/><circle cx="16.3" cy="11.4" r="1.45" fill="var(--up-chat-icon-cutout,#273247)"/></svg></button><button class="up-history-btn hidden" title="Ver histórico" aria-label="Ver histórico">'+iconSvg('clock')+'</button><button class="up-settings-btn" title="Configurações" aria-label="Configurações">'+iconSvg('gear')+'</button><div class="up-settings-menu hidden"><button type="button" class="up-settings-theme"></button>'+'<button type="button" class="up-settings-health">'+iconSvg('pulse')+'<span>Saúde do sistema</span></button>'+'<button type="button" class="up-settings-test">'+iconSvg('audio-lines')+'<span>Diagnóstico de Áudio</span></button>'+'</div><button class="up-logout">Sair</button></div></div><div class="up-statuses"><button class="up-status online">'+iconSvg('online')+' Online</button><button class="up-status busy">'+iconSvg('busy')+' Ocupado</button><button class="up-status away">'+iconSvg('away')+' Ausente</button></div><div class="up-reasons hidden"><label class="up-label">Motivo de ocupado</label><div class="up-reason-picker"><button type="button" class="up-reason-trigger"><span class="up-reason-trigger-icon">'+iconSvg('edit')+'</span><span class="up-reason-trigger-text">Selecione um motivo</span></button><div class="up-reason-menu hidden">'+reasons.map(function(x){return '<button type="button" class="up-reason-option" data-value="'+esc(x.value)+'">'+iconSvg(x.icon)+'<span class="up-reason-text">'+esc(x.label)+'</span></button>'}).join('')+'</div></div><select class="up-select hidden"></select><input class="up-input hidden" placeholder="Escreva o motivo"><button class="up-confirm hidden">Confirmar ocupado</button></div><div class="up-notice">'+iconSvg('pulse')+'<span>Sincronização com o Sale Smartly ativa.</span><span class="up-notice-ok">✓</span></div><div class="up-message"></div><section class="up-voice-room is-empty" aria-label="Chat de Voz"><div class="up-voice-head"><div class="up-voice-title">'+iconSvg('sound')+' Chat de Voz</div><div class="up-voice-state">Disponivel</div></div><div class="up-voice-participants"><span class="up-voice-empty"><b>Ninguem na chamada agora</b><small>Entre e chame a equipe para conversar.</small></span></div><div class="up-voice-actions"><button type="button" class="up-voice-join">Entrar no Chat</button><button type="button" class="up-voice-mute hidden" aria-label="Mutar microfone"></button><button type="button" class="up-voice-speakers hidden" aria-label="Silenciar áudio recebido" title="Silenciar áudio recebido"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg></button><button type="button" class="up-screen-share-toggle hidden" aria-label="Compartilhar tela" title="Compartilhar tela"><svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8M12 17v4M9 9h6M12 7v4"></path></svg></button><button type="button" class="up-voice-leave hidden" aria-label="Sair da sala">'+iconSvg('phone-off')+'</button></div><div class="up-voice-message" role="status" aria-live="polite"></div><div class="up-screen-share-panel" aria-hidden="true"><div class="up-screen-share-toolbar"><div class="up-screen-share-heading">Compartilhamento de tela</div></div><div class="up-screen-share-status">Compartilhamento de tela e janela</div><div class="up-screen-share-message" role="status" aria-live="polite"></div><div class="up-screen-share-grid"></div></div></section><div class="up-team-title-row"><div class="up-team-title">Equipe</div><span class="up-team-count"></span></div><div class="up-team">Carregando…</div>';
    history.innerHTML='<div class="up-history-head"><div class="up-history-title">Histórico</div><div class="up-actions"><button class="up-export" title="Exportar histórico">'+iconSvg('download')+' TXT</button><button class="up-close">Fechar</button></div></div><div class="up-history-list">Carregando…</div>';

    var box=card.querySelector('.up-reasons'),select=box.querySelector('select'),custom=box.querySelector('input'),confirm=box.querySelector('button.up-confirm'),trigger=box.querySelector('.up-reason-trigger'),menu=box.querySelector('.up-reason-menu');
    var historyBtn=card.querySelector('.up-history-btn');
    var settingsBtn=card.querySelector('.up-settings-btn'),settingsMenu=card.querySelector('.up-settings-menu');
    var headAvatar=card.querySelector('.up-head-avatar-img');var headAvatarBtn=card.querySelector('.up-head-avatar-btn');if(headAvatar)hydrateAvatar(headAvatar,member);if(headAvatarBtn){headAvatarBtn.onclick=function(e){e.stopPropagation();openProfileModal();};}
    if(role==='implementation_admin'){
      historyBtn.classList.remove('hidden');
      historyBtn.onclick=function(e){e.stopPropagation();openHistory()};
    }

    card.querySelector('.online').onclick=function(){save('online','')};
    card.querySelector('.away').onclick=function(){save('away','Ausente')};
    card.querySelector('.busy').onclick=function(){box.classList.remove('hidden');menu.classList.remove('hidden');message('Escolha o motivo de ocupado.',true)};
    trigger.onclick=function(){menu.classList.toggle('hidden')};
    box.querySelectorAll('.up-reason-option').forEach(function(opt){opt.onclick=function(){var value=opt.getAttribute('data-value');var r=reasons.find(function(x){return x.value===value});trigger.innerHTML=iconSvg(r?r.icon:'edit')+'<span class="up-reason-trigger-text">'+esc(r?r.label:value)+'</span>';menu.classList.add('hidden');custom.classList.toggle('hidden',value!=='Outro');confirm.classList.toggle('hidden',value!=='Outro');if(value&&value!=='Outro')save('busy',value);else if(value==='Outro')custom.focus();}});
    confirm.onclick=function(){save('busy',custom.value)};
    card.querySelector('.up-voice-room').onclick=function(e){if(!voiceRoom.active&&!voiceRoom.joining&&!e.target.closest('.up-voice-actions'))voiceRoomJoin();};card.querySelector('.up-voice-room').onkeydown=function(e){if((e.key==='Enter'||e.key===' ')&&!voiceRoom.active){e.preventDefault();voiceRoomJoin();}};card.querySelector('.up-voice-join').onclick=voiceRoomJoin;
    card.querySelector('.up-voice-mute').onclick=voiceRoomMute;
    card.querySelector('.up-voice-speakers').onclick=voiceRoomToggleSpeakers;
    card.querySelector('.up-voice-leave').onclick=async function(e){e.preventDefault();e.stopPropagation();var button=this;button.disabled=true;try{await voiceRoomLeave();}finally{button.disabled=false;}};
    card.querySelector('.up-screen-share-toggle').onclick=function(e){e.preventDefault();e.stopPropagation();if(screenShare.active)screenShareStop(true);else screenShareStart();};
    voiceRoomRender();
    document.addEventListener('click',function(e){if(box&&!box.contains(e.target))menu.classList.add('hidden')});
    card.querySelector('.up-logout').onclick=function(){broadcastChatPresence(false);teamLiteEndSession();};
    history.querySelector('.up-close').onclick=function(){history.classList.add('hidden')};
    history.querySelector('.up-export').onclick=function(){exportHistoryTxt()};
    if(settingsBtn)settingsBtn.onclick=function(e){e.stopPropagation();settingsMenu.classList.toggle('hidden');};
    if(settingsMenu){settingsMenu.onclick=function(e){e.stopPropagation();};var settingsHealth=settingsMenu.querySelector('.up-settings-health');if(settingsHealth)settingsHealth.onclick=function(){settingsMenu.classList.add('hidden');openHealth();};var settingsTest=settingsMenu.querySelector('.up-settings-test');if(settingsTest)settingsTest.onclick=function(){settingsMenu.classList.add('hidden');openTestPanel();};settingsMenu.querySelector('.up-settings-theme').onclick=function(){toggleTheme();};document.addEventListener('click',function(e){if(!settingsMenu.contains(e.target)&&e.target!==settingsBtn)settingsMenu.classList.add('hidden');});}
    var liteChatButton=card.querySelector('.up-chat-btn');if(liteChatButton)liteChatButton.remove();
    var liteHistoryButton=card.querySelector('.up-history-btn');if(liteHistoryButton)liteHistoryButton.remove();
    var liteSettingsButton=card.querySelector('.up-settings-btn');if(liteSettingsButton)liteSettingsButton.remove();
    var liteLogoutButton=card.querySelector('.up-logout');if(liteLogoutButton)liteLogoutButton.remove();
    card.querySelectorAll('.up-statuses,.up-reasons,.up-notice,.up-update,.up-team-title-row,.up-team').forEach(function(el){el.remove();});
    quickChatBubble.onclick=function(e){e.preventDefault();e.stopPropagation();toggleTeamLitePanel();};
    updateNotificationPermissionUI();
    applyTheme();
    // Team Lite intentionally omits the official dashboard update strip.
  }


  var remotePending={};
  function closeRemoteControl(){closePopupAnimated(remoteOverlay,function(){remoteOverlay.classList.add('hidden');remoteOverlay.classList.remove('up-popup-closing');remoteOverlay.onclick=null;remoteOverlay.innerHTML='';});}
  function openRemoteControl(target){
    if(role!=='implementation_admin'||!target||target===member)return;
    var dStatus=card.querySelector('.up-member-power[data-target="'+CSS.escape(target)+'"]');
    if(dStatus)dStatus.disabled=true;
    var current=(window.__upstatusTeam||{})[target]||{};
    var selected=current.status==='busy'?'busy':current.status==='away'?'away':'online';
    var selectedReason=current.reason||'';
    remoteOverlay.innerHTML='<div class="up-remote-dialog"><div class="up-remote-title">Controlar fila de '+esc(target)+'</div><div class="up-remote-sub">A alteração será executada pela sessão do próprio usuário.</div><div class="up-remote-statuses"><button type="button" class="up-remote-status '+(selected==='online'?'active':'')+'" data-status="online">Online</button><button type="button" class="up-remote-status '+(selected==='busy'?'active':'')+'" data-status="busy">Ocupado</button><button type="button" class="up-remote-status '+(selected==='away'?'active':'')+'" data-status="away">Ausente</button></div><div class="up-remote-reason '+(selected==='busy'?'':'hidden')+'"><div class="up-label">Motivo de ocupado</div><div class="up-remote-reason-menu">'+reasons.map(function(r){return '<button type="button" class="up-remote-reason-option '+(selectedReason===r.value?'active':'')+'" data-reason="'+esc(r.value)+'">'+iconSvg(r.icon)+'<span class="up-reason-text">'+esc(r.label)+'</span></button>';}).join('')+'</div></div><div class="up-remote-message"></div><div class="up-remote-actions"><button type="button" class="up-remote-cancel">Cancelar</button><button type="button" class="up-remote-confirm">Aplicar</button></div></div>';
    remoteOverlay.classList.remove('hidden');
    remoteOverlay.onclick=function(e){if(e.target===remoteOverlay)closeRemoteControl();};
    var dialog=remoteOverlay.querySelector('.up-remote-dialog'), reasonBox=remoteOverlay.querySelector('.up-remote-reason'), msg=remoteOverlay.querySelector('.up-remote-message');
    dialog.querySelectorAll('.up-remote-status').forEach(function(btn){btn.onclick=function(){selected=btn.getAttribute('data-status');dialog.querySelectorAll('.up-remote-status').forEach(function(x){x.classList.toggle('active',x===btn)});reasonBox.classList.toggle('hidden',selected!=='busy');if(selected!=='busy')selectedReason='';};});
    dialog.querySelectorAll('.up-remote-reason-option').forEach(function(btn){btn.onclick=function(){selectedReason=btn.getAttribute('data-reason')||'';dialog.querySelectorAll('.up-remote-reason-option').forEach(function(x){x.classList.toggle('active',x===btn)});};});
    dialog.querySelector('.up-remote-cancel').onclick=closeRemoteControl;
    dialog.querySelector('.up-remote-confirm').onclick=function(){
      if(selected==='busy'&&!selectedReason){msg.textContent='Escolha o motivo de ocupado.';return;}
      var confirm=dialog.querySelector('.up-remote-confirm');confirm.disabled=true;msg.textContent='Enviando comando…';
      api('POST','/api/remote-status',{target:target,status:selected,reason:selected==='busy'?selectedReason:selected==='away'?'Ausente':''}).then(function(r){
        if(!r.commandId)throw new Error('O servidor não confirmou o comando.');
        msg.textContent='Aguardando '+target+' executar…';
        if(r.command)sendRealtimeEvent('remote_command',{op:'hint'});
        waitRemoteResult(r.commandId,target,msg,confirm);
      }).catch(function(e){msg.textContent=e.message||'Não foi possível enviar o comando.';confirm.disabled=false;});
    };
    if(dStatus)dStatus.disabled=false;
  }
  function applyRemoteResult(commandId,target,msg,confirm,result){
    if(result&&result.ok){
      msg.style.color='#9ce5b8';msg.textContent='Fila de '+target+' atualizada com sucesso.';
      delete remoteResultCache[commandId];
      setTimeout(function(){closeRemoteControl();refresh();},700);
    }else{
      msg.style.color='#ff9aaa';msg.textContent='Falha: '+((result&&result.error)||'não foi possível alterar a fila.');
      if(confirm)confirm.disabled=false;
      delete remoteResultCache[commandId];
    }
  }
  function waitRemoteResult(commandId,target,msg,confirm,started){
    var t=started||Date.now(),id=String(commandId);
    var cached=remoteResultCache[id];
    if(cached){applyRemoteResult(id,target,msg,confirm,cached);return;}
    var settled=false;
    function finish(result){
      if(settled)return;
      settled=true;
      if(remoteResultWaiters[id]===finish)delete remoteResultWaiters[id];
      applyRemoteResult(id,target,msg,confirm,result);
    }
    remoteResultWaiters[id]=finish;
    function poll(){
      if(settled)return;
      api('GET','/api/remote-status/result?id='+encodeURIComponent(id)).then(function(d){
        if(d&&d.ready&&d.result){finish(d.result);return;}
        if(Date.now()-t>=25000){
          if(remoteResultWaiters[id]===finish)delete remoteResultWaiters[id];
          settled=true;
          msg.style.color='#ff9aaa';msg.textContent='Tempo esgotado. '+target+' não confirmou a alteração.';if(confirm)confirm.disabled=false;
          return;
        }
        setTimeout(poll,1500);
      }).catch(function(){
        if(Date.now()-t>=25000){
          if(remoteResultWaiters[id]===finish)delete remoteResultWaiters[id];
          settled=true;
          msg.style.color='#ff9aaa';msg.textContent='Tempo esgotado. Não foi possível confirmar a alteração.';if(confirm)confirm.disabled=false;
          return;
        }
        setTimeout(poll,1500);
      });
    }
    poll();
  }
  function executeRemoteCommand(c){
    if(!c||!c.id||c.target!==member||remotePending[c.id])return;
    remotePending[c.id]=true;
    (async function(){
      var ok=false,error='';
      try{
        await syncSaleSmartly(c.status);
        await api('POST','/api/status',{status:c.status,reason:c.reason||'',actor:c.sender||'',target:member});
        ok=true;
        if(location.hostname==='app.salesmartly.com')setTimeout(function(){location.reload()},250);
      }catch(e){error=e.message||'Falha ao sincronizar o Sale Smartly.';}
      try{await api('POST','/api/remote-status/result',{commandId:c.id,ok:ok,error:error});}catch(_){ }
      delete remotePending[c.id];
      if(!ok)message('Comando remoto de '+c.sender+' falhou: '+error,true);else refresh();
    })();
  }

  function pollRemoteStatus(){
    var now=Date.now();if(!token||remotePolling||now-remoteLastPollAt<1000)return;
    remoteLastPollAt=now;remotePolling=true;
    api('GET','/api/remote-status').then(function(d){
      if(!d.pending||!d.command)return;
      executeRemoteCommand(d.command);
    }).catch(function(){}).finally(function(){remotePolling=false});
  }
  function refresh(){
    if(!isAuthenticated()||!member||refreshing)return;
    refreshing=true;
    var requestGeneration=authGeneration,requestMember=member;
    api('GET','/api/status').then(function(d){
      if(!isAuthenticated()||requestGeneration!==authGeneration||requestMember!==member)return;
      var team=card.querySelector('.up-team');if(!team)return;
      window.__upstatusTeam=d.members||{};
      updateChatHeaderPresence();
      var memberNames=Object.keys(d.members);memberNames.sort(function(a,b){if(a===member)return 1;if(b===member)return -1;return a.localeCompare(b,'pt-BR');});
      var teamCount=card.querySelector('.up-team-count');if(teamCount)teamCount.textContent=memberNames.length+' '+(memberNames.length===1?'membro':'membros');
      team.innerHTML=memberNames.map(function(k){
        var m=d.members[k],presence=profilePresenceState(m.name,m);
        if(m.name===member)currentStatus=m.status;
        var controls='';
        var callSummary='';
        var version=m.version?'<span class="up-member-version">v'+esc(m.version)+'</span>':'<span class="up-member-version">v?</span>';
        var sub=[];
        if(m.reason)sub.push(reasonIcon(m.reason)+' '+esc(reasonLabel(m.reason)));
        if(m.updatedAt)sub.push('Desde '+fmtTime(m.updatedAt));
        var presenceTitle=presence==='chat'?'No bate-papo':presence==='active'?'UpStatus Ativo':'Offline';
        return '<div class="up-member"><div class="up-member-main"><span class="up-member-avatar-wrap"><img class="up-member-avatar presence-'+presence+'" data-member-avatar="'+esc(m.name)+'" data-presence-name="'+esc(m.name)+'" title="'+presenceTitle+'" alt=""></span><div class="up-member-info"><div class="up-member-top"><b>'+esc(m.name)+'</b>'+version+'</div><div class="up-member-sub">'+(sub.length?sub.join(' <span class="up-member-separator">•</span> '):'Sem atualização registrada')+'</div></div></div><div class="up-member-actions">'+(role==='implementation_admin'&&m.name!==member?'<button type="button" class="up-badge b-'+m.status+' up-member-status-button" data-target="'+esc(m.name)+'" title="Alterar status de '+esc(m.name)+'">'+labels[m.status]+'</button>':'<span class="up-badge b-'+m.status+'" title="Status da fila do Sale Smartly">'+labels[m.status]+'</span>')+'</div></div>';
      }).join('');
      team.querySelectorAll('.up-member-avatar').forEach(function(a){
        hydrateAvatar(a,a.getAttribute('data-member-avatar')||'');
        var name=a.getAttribute('data-presence-name')||'';
        a.addEventListener('mouseenter',function(e){showChatProfileHover(a,name,e);});
        a.addEventListener('mousemove',positionChatProfileHover);
        a.addEventListener('mouseleave',hideChatProfileHover);
      });
      team.querySelectorAll('.up-member-status-button').forEach(function(btn){btn.onclick=function(e){e.preventDefault();e.stopPropagation();var target=btn.getAttribute('data-target'),wrap=btn.parentNode,old=wrap.querySelector('.up-team-status-menu');if(old){old.remove();return;}team.querySelectorAll('.up-team-status-menu').forEach(function(x){x.remove();});var current=(window.__upstatusTeam||{})[target]||{},menu=document.createElement('div');menu.className='up-team-status-menu';menu.innerHTML='<button type="button" data-status="online">Online</button><button type="button" data-status="busy">Ocupado</button><button type="button" data-status="away">Ausente</button>';wrap.style.position='relative';wrap.appendChild(menu);var outsideClose=function(ev){if(!menu.isConnected){document.removeEventListener('click',outsideClose,true);return;}if(menu.contains(ev.target)||(ev.target&&ev.target.closest&&ev.target.closest('.up-member-status-button')))return;menu.remove();document.removeEventListener('click',outsideClose,true);};document.addEventListener('click',outsideClose,true);menu.querySelectorAll('[data-status]').forEach(function(opt){opt.classList.toggle('active',opt.getAttribute('data-status')===current.status);opt.onclick=function(ev){ev.preventDefault();ev.stopPropagation();var status=opt.getAttribute('data-status');if(status==='busy'){menu.innerHTML='<div class="up-team-reason"><div class="up-team-reason-title">Motivo de ocupado</div>'+reasons.map(function(r){return '<button type="button" data-reason="'+esc(r.value)+'">'+iconSvg(r.icon)+'<span>'+esc(r.label)+'</span></button>';}).join('')+'</div>';menu.querySelectorAll('[data-reason]').forEach(function(rb){rb.onclick=function(re){re.preventDefault();re.stopPropagation();sendRemoteStatus(target,'busy',rb.getAttribute('data-reason'),menu);};});return;}sendRemoteStatus(target,status,status==='away'?'Ausente':'',menu);};});};});
      function sendRemoteStatus(target,status,reason,menu){if(role!=='implementation_admin'||!target||target===member)return;if(status==='busy'&&!reason){return;}menu.innerHTML='<span class="up-team-status-wait">Enviando…</span>';api('POST','/api/remote-status',{target:target,status:status,reason:status==='busy'?reason:status==='away'?'Ausente':''}).then(function(r){if(!r.commandId)throw new Error('O servidor não confirmou o comando.');menu.innerHTML='<span class="up-team-status-wait">Aguardando confirmação…</span>';if(r.command)sendRealtimeEvent('remote_command',{command:r.command});waitRemoteResult(r.commandId,target,menu,menu.querySelector('button'));}).catch(function(err){menu.innerHTML='<span class="up-team-status-wait">'+esc(err.message||'Falha ao alterar status')+'</span>';});}
      setBubbleStatus(currentStatus);
    }).catch(function(e){message(e.message,true)}).finally(function(){refreshing=false});
    loadChat();
  }

  function openHistory(){
    if(role!=='implementation_admin')return;
    health.classList.add('hidden');
    history.classList.remove('hidden');
    history.querySelector('.up-history-list').textContent='Carregando…';
    api('GET','/api/history?limit=200').then(function(d){
      historyCache=d.history||[];
      if(!historyCache.length){
        history.querySelector('.up-history-list').innerHTML='<div class="up-history-empty">Nenhuma movimentação registrada ainda.</div>';
        return;
      }
      var lastDay='';
      history.querySelector('.up-history-list').innerHTML=historyCache.map(function(item){
        var day=fmtDay(item.createdAt),header='';
        if(day!==lastDay){header='<div class="up-history-day">'+day+'</div>';lastDay=day}
        var who=(item.actor&&item.target&&item.actor!==item.target)?'<b>'+esc(item.actor)+'</b><span>→</span><b>'+esc(item.target)+'</b>':'<b>'+esc(item.user||item.target||item.actor||'')+'</b>';return header+'<div class="up-history-item"><div class="up-history-meta"><span>'+fmtTime(item.createdAt)+'</span>'+who+'<span class="up-history-status '+(item.status==='online'?'online':item.status==='busy'?'busy':'away')+'"><i class="up-history-status-dot"></i>'+labels[item.status]+'</span></div>'+
          (item.reason?'<div class="up-history-reason">'+reasonIcon(item.reason)+' '+esc(reasonLabel(item.reason))+'</div>':'')+'</div>';
      }).join('');
    }).catch(function(e){historyCache=[];history.querySelector('.up-history-list').textContent=e.message});
  }

  function exportHistoryTxt(){
    if(role!=='implementation_admin'||!historyCache.length){
      message('Abra o histórico e carregue as movimentações antes de exportar.',true);
      return;
    }
    var lines=['UPSTATUS - HISTÓRICO DE MOVIMENTAÇÕES','Exportado em: '+new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium'}).format(new Date()),''];
    var lastDay='';
    historyCache.forEach(function(item){
      var day=fmtDay(item.createdAt);
      if(day!==lastDay){lines.push('=== '+day+' ===');lastDay=day}
      var actor=item.actor||item.user||'';var target=item.target||item.user||'';var line=fmtTime(item.createdAt)+' | '+(actor!==target?actor+' -> '+target:target)+' | '+labels[item.status];
      if(item.reason)line+=' | Motivo: '+reasonLabel(item.reason);
      lines.push(line);
    });
    var blob=new Blob([lines.join('\r\n')+'\r\n'],{type:'text/plain;charset=utf-8'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;
    a.download='UpStatus-Historico-'+new Date().toISOString().slice(0,10)+'.txt';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},1000);
  }

  function isTransientSaleStatusError(err){
    var t=String(err&&err.message||err||'').toLowerCase();
    return t.indexOf('switching status')>=0 || t.indexOf('please try later')>=0 || t.indexOf('è¯·ç¨ååè¯')>=0 || t.indexOf('æ­£å¨åæ¢ç¶æ')>=0 || t.indexOf('ç¨æ·æ­£å¨åæ¢ç¶æ')>=0;
  }

  function syncSaleSmartlyOnce(status,timeoutMs){
    var map={online:'1',busy:'2',away:'0'};
    return new Promise(function(resolve,reject){
      var settled=false;
      function done(e){
        if(settled)return;
        settled=true;
        document.removeEventListener('UPSTATUS_RESULT',done);
        clearTimeout(timer);
        var d=e.detail||{};
        if(d.ok)resolve();else reject(new Error(d.error||'Não foi possível sincronizar o Sale Smartly.'));
      }
      document.addEventListener('UPSTATUS_RESULT',done);
      document.dispatchEvent(new CustomEvent('UPSTATUS_SET',{detail:{status:map[status]}}));
      var timer=setTimeout(function(){
        if(settled)return;
        settled=true;
        document.removeEventListener('UPSTATUS_RESULT',done);
        reject(new Error('Tempo esgotado ao sincronizar com o Sale Smartly.'));
      },timeoutMs||3500);
    });
  }

  async function syncSaleSmartly(status){
    var lastError=null;
    var delays=[0,700,1400,2200];
    for(var attempt=0;attempt<delays.length;attempt++){
      if(delays[attempt])await new Promise(function(resolve){setTimeout(resolve,delays[attempt])});
      try{
        await syncSaleSmartlyOnce(status,3500);
        return;
      }catch(e){
        lastError=e;
        if(!isTransientSaleStatusError(e) || attempt===delays.length-1)throw e;
      }
    }
    throw lastError||new Error('Não foi possível sincronizar o Sale Smartly.');
  }

  async function save(status,why){
    try{
      if(status==='busy'&&!why.trim())throw new Error('Escreva o motivo.');
      message('Sincronizando com Sale Smartly…');
      await syncSaleSmartly(status);
      await api('POST','/api/status',{status:status,reason:why});
      message('Status atualizado.');
      card.querySelector('.up-reasons').classList.add('hidden');
      refresh();
      if(location.hostname==='app.salesmartly.com')setTimeout(function(){location.reload()},250);
    }catch(e){message(e.message,true);refresh();}
  }

  var drag=null;
  function closeUpStatusPanel(){
    if(!chat.classList.contains('hidden')){saveChatDraft();stopTypingHeartbeat();}
    stopHealthMonitor();
    card.classList.add('hidden');
    history.classList.add('hidden');
    chat.classList.add('hidden');
    health.classList.add('hidden');
    remoteOverlay.classList.add('hidden');
    broadcastChatPresence(false);
  }
  function ensureTeamLiteChatIntegrated(){
    if(!isAuthenticated()){chat.classList.add('hidden');return;}
    if(chat.parentNode!==card)card.appendChild(chat);
    card.querySelectorAll('.up-chat-btn,.up-history-btn,.up-settings-btn,.up-settings-menu,.up-logout,.up-statuses,.up-reasons,.up-notice,.up-update,.up-team-title-row,.up-team').forEach(function(el){el.remove();});
    var title=card.querySelector('.up-head .up-title');if(title)title.textContent='UpStatus Team';
    var actions=card.querySelector('.up-head .up-actions');
    // Remove a barra redundante da versão anterior. Tema e sair ficam apenas no cabeçalho.
    card.querySelectorAll('.team-lite-utility-controls').forEach(function(el){el.remove();});
    // Tema e sair ficam agrupados no menu de opções do cabeçalho.
    if(actions){
      var oldTheme=actions.querySelector('.team-lite-theme');
      var oldLogout=actions.querySelector('.team-lite-logout');
      if(oldTheme)oldTheme.remove();if(oldLogout)oldLogout.remove();
      var menu=actions.querySelector('.team-lite-options');
      if(!menu){
        menu=document.createElement('div');menu.className='team-lite-options';
        var menuToggle=document.createElement('button');menuToggle.type='button';menuToggle.className='team-lite-options-toggle';menuToggle.title='Mais opções';menuToggle.setAttribute('aria-label','Mais opções');menuToggle.setAttribute('aria-expanded','false');menuToggle.innerHTML='⌄';
        var menuPanel=document.createElement('div');menuPanel.className='team-lite-options-menu hidden';menuPanel.setAttribute('role','menu');
        var themeButton=document.createElement('button');themeButton.type='button';themeButton.className='team-lite-theme';themeButton.setAttribute('role','menuitem');themeButton.textContent=(theme==='dark'?'☼ Modo claro':'☾ Modo escuro');
        themeButton.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggleTheme();themeButton.textContent=(theme==='dark'?'☼ Modo claro':'☾ Modo escuro');menuPanel.classList.add('hidden');menuToggle.setAttribute('aria-expanded','false');});
        var logout=document.createElement('button');logout.type='button';logout.className='team-lite-logout';logout.setAttribute('role','menuitem');logout.textContent='Sair';
        logout.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();menuPanel.classList.add('hidden');menuToggle.setAttribute('aria-expanded','false');broadcastChatPresence(false);teamLiteEndSession();});
        menuPanel.append(themeButton,logout);menu.append(menuToggle,menuPanel);actions.appendChild(menu);
        menuToggle.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var open=menuPanel.classList.contains('hidden');menuPanel.classList.toggle('hidden',!open);menuToggle.setAttribute('aria-expanded',open?'true':'false');});
        document.addEventListener('pointerdown',function(e){if(!menu.contains(e.target)){menuPanel.classList.add('hidden');menuToggle.setAttribute('aria-expanded','false');}},true);
      }
    }
    if(actions&&!actions.querySelector('.team-lite-close')){
      var minimize=document.createElement('button');minimize.type='button';minimize.className='team-lite-minimize';minimize.title='Minimizar';minimize.setAttribute('aria-label','Minimizar');minimize.textContent='−';minimize.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggleTeamLitePanel();});actions.appendChild(minimize);
      var close=document.createElement('button');close.type='button';close.className='team-lite-close';close.title='Fechar painel';close.setAttribute('aria-label','Fechar painel');close.textContent='×';close.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();teamLiteClosePanel();});actions.appendChild(close);
    }

    // Cores por remetente: somente borda, mantendo o fundo padrão do balão.
    if(!document.getElementById('team-lite-sender-border-colors')){
      var senderStyle=document.createElement('style');senderStyle.id='team-lite-sender-border-colors';
      senderStyle.textContent='#upstatus-team-lite-root .up-chat-item.lucca .up-chat-bubble{background:var(--up-chat-neutral-fill)!important;border:1px solid #a855f7!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important}#upstatus-team-lite-root .up-chat-item.ycaro .up-chat-bubble{background:var(--up-chat-neutral-fill)!important;border:1px solid #f97316!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important}';
      document.head.appendChild(senderStyle);
    }
    // Correções visuais Team Lite 3.4.6: tema claro completo, rodapé equilibrado e eventos discretos.
    if(!document.getElementById('team-lite-polish-346')){
      var polish=document.createElement('style');polish.id='team-lite-polish-346';
      polish.textContent=
      '#upstatus-team-lite-root #upstatus-chat{padding:14px!important;box-sizing:border-box!important}'+
      '#upstatus-team-lite-root #upstatus-chat .up-chat-compose{left:0!important;right:0!important;width:100%!important;max-width:100%!important;margin-left:0!important;margin-right:0!important;padding:0!important;box-sizing:border-box!important}'+
      '#upstatus-team-lite-root #upstatus-chat .up-chat-list{margin-left:0!important;margin-right:0!important;padding-left:0!important;padding-right:4px!important;box-sizing:border-box!important}'+
      '#upstatus-team-lite-root .up-chat-system-event{justify-content:center!important;padding:4px 0!important;margin:0!important}'+
      '#upstatus-team-lite-root .up-chat-system-event span{display:inline!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#8f9db2!important;font-size:10px!important;font-weight:500!important;letter-spacing:0!important;box-shadow:none!important;text-align:center!important}'+
      '#upstatus-team-lite-root .up-chat-system-event.join span,#upstatus-team-lite-root .up-chat-system-event.leave span{background:transparent!important;border:0!important;color:#8f9db2!important}'+
      '#upstatus-team-lite-root.up-theme-light .up-chat-system-event span{color:#64748b!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat{background:#f7f9fc!important;border-color:#d7dee9!important;color:#1b2430!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-history-head,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-history-head *{color:#1e293b!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-list{background:transparent!important;color:#1e293b!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-date-divider{color:#64748b!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-date-divider:before,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-date-divider:after{background:#cbd5e1!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-date-divider span{background:#fff!important;border-color:#d7dee9!important;color:#64748b!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-item:not(.own) .up-chat-bubble{background:#fff!important;border-color:#d7dee9!important;color:#1e293b!important;box-shadow:0 2px 7px rgba(15,23,42,.08)!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-item.own .up-chat-bubble{background:#dbeafe!important;border-color:#b8d1fa!important;color:#1e293b!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-text,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-meta,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-meta b,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-incoming-time,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-own-time{color:#334155!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-read{color:#64748b!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-read.read{color:#1677ff!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-quoted{background:#eef2f7!important;color:#475569!important;border-color:#93b4ef!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-reaction{background:#eef2f7!important;color:#334155!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-reply-bar{background:#eef2f7!important;color:#334155!important;border-color:#93b4ef!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-input{background:#fff!important;border-color:#cbd5e1!important;color:#1e293b!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-input::placeholder{color:#94a3b8!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-emoji-btn,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-attach,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-record{background:#fff!important;border-color:#cbd5e1!important;color:#334155!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-send{background:#4f7dff!important;color:#fff!important}'+
      '#upstatus-team-lite-root.up-theme-light .up-voice-person{background:#fff!important;border-color:#cbd5e1!important;color:#1e293b!important;box-shadow:0 1px 3px rgba(15,23,42,.08)!important}'+
      '#upstatus-team-lite-root.up-theme-light .up-voice-person b,#upstatus-team-lite-root.up-theme-light .up-voice-person span{color:#1e293b!important}'+
      '#upstatus-team-lite-root.up-theme-light .up-voice-person.is-speaking{border-color:#60a5fa!important;box-shadow:0 0 0 1px rgba(96,165,250,.2)!important}'+
      '#upstatus-team-lite-root.up-theme-light .team-lite-theme,#upstatus-team-lite-root.up-theme-light .team-lite-minimize,#upstatus-team-lite-root.up-theme-light .team-lite-close{background:#e8edf4!important;color:#334155!important;border-color:#cbd5e1!important}'+
      '#upstatus-team-lite-root.up-theme-light .team-lite-logout{background:#fce7eb!important;color:#9f1239!important}';
      document.head.appendChild(polish);
    }
    // Team Lite 3.4.8: room .is-joined means someone is in the room, not that the viewer joined.
    // Apply preview styling to every populated room, including rooms already active for another person.
    if(!document.getElementById('team-lite-voice-chip-fix-348')){
      var voiceFix=document.createElement('style');voiceFix.id='team-lite-voice-chip-fix-348';
      voiceFix.textContent=
      '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty) .up-voice-participants{position:relative!important;display:flex!important;align-items:center!important;flex-wrap:wrap!important;min-width:0!important;padding-right:88px!important;box-sizing:border-box!important;overflow:visible!important}'+
      '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty) .up-voice-person{position:relative!important;display:inline-flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;width:auto!important;height:auto!important;min-width:0!important;min-height:38px!important;max-width:calc(100% - 2px)!important;flex:0 1 auto!important;padding:4px 12px 4px 5px!important;border:1px solid #344b60!important;border-radius:999px!important;background:#202c3d!important;color:#e5edf8!important;box-shadow:none!important;animation:none!important;overflow:visible!important;box-sizing:border-box!important}'+
      '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty) .up-voice-avatar{display:block!important;width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;flex:0 0 28px!important;aspect-ratio:1/1!important;border:2px solid #526783!important;border-radius:50%!important;object-fit:cover!important;box-sizing:border-box!important}'+
      '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty) .up-voice-person b{display:block!important;max-width:160px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#e5edf8!important;font-size:11px!important;font-weight:700!important;line-height:16px!important}'+
      '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty) .up-voice-person.is-speaking{border:1px solid #344b60!important;border-radius:999px!important;box-shadow:none!important;animation:none!important}'+
      '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty) .up-voice-person.is-speaking .up-voice-avatar{border-color:#4ade80!important;box-shadow:0 0 0 2px rgba(74,222,128,.2)!important}'+
      '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty) .up-voice-actions{position:absolute!important;right:9px!important;top:50%!important;bottom:auto!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;margin:0!important;padding:0!important;transform:translateY(-50%)!important;z-index:4!important}'+
      '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty) .up-voice-actions .up-voice-join{position:static!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;align-self:center!important;transform:none!important;margin:0!important;white-space:nowrap!important;flex:0 0 auto!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-room:not(.is-empty) .up-voice-person{background:#fff!important;border:1px solid #c9d8ea!important;border-radius:999px!important;color:#233047!important;box-shadow:none!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-room:not(.is-empty) .up-voice-person b{color:#233047!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-room:not(.is-empty) .up-voice-person.is-speaking{background:#fff!important;border:1px solid #c9d8ea!important;box-shadow:none!important}'+
      '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-room:not(.is-empty) .up-voice-person.is-speaking .up-voice-avatar{border-color:#526783!important;box-shadow:0 0 0 2px rgba(74,222,128,.18)!important}';
      (document.head||document.documentElement).appendChild(voiceFix);
    }
    var chatItems=chat.querySelectorAll('.up-chat-item');
    chatItems.forEach(function(item){var name=item.querySelector('.up-chat-meta b');if(!name)return;var n=(name.textContent||'').trim().toLowerCase();item.classList.toggle('lucca',n==='lucca');item.classList.toggle('icaro',n==='ícaro'||n==='icaro');});
    card.classList.add('team-lite-chat-mode');
    // O arraste do painel é controlado exclusivamente por enableTeamLiteDrag().
  // Dois listeners concorrentes (left/top contra right/bottom) causavam conflito
  // com o redimensionamento após mover a janela.
    if(isAuthenticated())chat.classList.remove('hidden');else chat.classList.add('hidden');
  }
  function teamLiteClosePanel(){
    if(!chat.classList.contains('hidden')){try{stopTypingHeartbeat();broadcastChatPresence(false);}catch(e){}}
    if(isTeamLiteEphemeralMember())clearTeamLiteEphemeralChat();
    card.classList.add('hidden');voiceControlSyncVisibility();teamLiteClearIdleTimer();teamLiteMinimizedAt=0;teamLiteStartIdleTimer();
  }
  function toggleTeamLitePanel(){
    if(!isAuthenticated()){
      chat.classList.add('hidden');card.classList.remove('team-lite-chat-mode');card.classList.remove('hidden');login();return;
    }
    if(!card.classList.contains('hidden')){
      if(!chat.classList.contains('hidden')){saveChatDraft();stopTypingHeartbeat();broadcastChatPresence(false);}
      card.classList.add('hidden');voiceControlSyncVisibility();teamLiteStartIdleTimer();return;
    }
    teamLiteClearIdleTimer();teamLiteMinimizedAt=0;teamLiteSessionEnded=false;card.classList.remove('hidden');ensureTeamLiteChatIntegrated();startTeamLiteEphemeralChatIfNeeded();updatePromptShown=false;try{checkUpdate();}catch(_){}
    if(!chat.querySelector('.up-chat-list'))openChat();
    else{chat.classList.remove('hidden');renderChat();setUnread(0);broadcastChatPresence(true);refresh();loadChat(true);pollChatTyping();markVisibleChatRead();}
    voiceControlSyncVisibility();
  }
  function openUpStatusPanel(){
    if(!isAuthenticated()){
      chat.classList.add('hidden');card.classList.remove('team-lite-chat-mode');card.classList.remove('hidden');login();return;
    }
    history.classList.add('hidden');health.classList.add('hidden');remoteOverlay.classList.add('hidden');card.classList.remove('hidden');
    teamLiteClearIdleTimer();teamLiteMinimizedAt=0;teamLiteSessionEnded=false;ensureTeamLiteChatIntegrated();startTeamLiteEphemeralChatIfNeeded();updatePromptShown=false;try{checkUpdate();}catch(_){};
    if(!chat.querySelector('.up-chat-list'))openChat();
    else{chat.classList.remove('hidden');renderChat();setUnread(0);broadcastChatPresence(true);refresh();loadChat(true);pollChatTyping();markVisibleChatRead();}
    voiceControlSyncVisibility();
  }
  document.addEventListener('pointerdown',function(e){
    callUnlockAudio();
    if(!root.contains(e.target)&&!card.classList.contains('hidden')){
      if(!chat.classList.contains('hidden'))saveChatDraft();
      if(!chat.classList.contains('hidden')){stopTypingHeartbeat();broadcastChatPresence(false);}
      card.classList.add('hidden');history.classList.add('hidden');
      if(!card.classList.contains('team-lite-chat-mode'))chat.classList.add('hidden');
      stopHealthMonitor();health.classList.add('hidden');voiceControlSyncVisibility();teamLiteStartIdleTimer();
    }
  },true);
  bubble.addEventListener('pointerdown',function(e){
    if(e.button!==undefined&&e.button!==0)return;
    var r=root.getBoundingClientRect();
    drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,startRight:window.innerWidth-r.right,startBottom:window.innerHeight-r.bottom,moved:false};
    bubble.setPointerCapture(e.pointerId);e.preventDefault();
  });
  bubble.addEventListener('pointermove',function(e){
    if(!drag||e.pointerId!==drag.id)return;
    var dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    if(Math.abs(dx)>4||Math.abs(dy)>4)drag.moved=true;
    root.style.right=Math.max(0,Math.min(window.innerWidth-42,drag.startRight-dx))+'px';
    root.style.bottom=Math.max(0,Math.min(window.innerHeight-42,drag.startBottom-dy))+'px';
    e.preventDefault();
  });
  bubble.addEventListener('pointerup',function(e){
    if(!drag||e.pointerId!==drag.id)return;
    var moved=drag.moved;try{bubble.releasePointerCapture(e.pointerId)}catch(_){}
    drag=null;GM_setValue(key+'right',root.style.right);GM_setValue(key+'bottom',root.style.bottom);
    if(!moved){stopHealthMonitor();health.classList.add('hidden');if(!history.classList.contains('hidden'))history.classList.add('hidden');if(!chat.classList.contains('hidden')){chat.classList.add('hidden');broadcastChatPresence(false);}card.classList.toggle('hidden')}
  });
  bubble.addEventListener('pointercancel',function(){drag=null});

  if(token&&member){
    var restoredToken=token,restoredMember=member,restoreGeneration=++authGeneration;
    api('GET','/api/me').then(function(r){
      if(restoreGeneration!==authGeneration||token!==restoredToken||member!==restoredMember)return;
      if(r&&r.authenticated&&r.name===restoredMember){
        authenticated=true;authGeneration++;role=r.role||role;GM_setValue(key+'role',role);
        if(quickChatBubble)quickChatBubble.disabled=false;
        app();refresh();startRealtime();updateBubbleAvatar(true);
      }else{
        authenticated=false;token='';member='';role='implementation_user';
        GM_setValue(key+'token','');GM_setValue(key+'member','');GM_setValue(key+'role','');
        login();
      }
    }).catch(function(){
      if(restoreGeneration!==authGeneration||token!==restoredToken||member!==restoredMember)return;
      authenticated=false;token='';member='';role='implementation_user';
      GM_setValue(key+'token','');GM_setValue(key+'member','');GM_setValue(key+'role','');
      login();
    });
  }else login();

  setInterval(refresh,5000);
  setInterval(function(){if(isAuthenticated()){broadcastChatPresence(!card.classList.contains('hidden')&&!chat.classList.contains('hidden'));Object.keys(chatPresence).forEach(function(name){if(chatPresence[name]&&chatPresence[name]<Date.now())delete chatPresence[name];});if(!chat.classList.contains('hidden'))updateChatHeaderPresence();}},10000);
  document.addEventListener('pointerdown',teamLiteTouchActivity,true);
  document.addEventListener('keydown',teamLiteTouchActivity,true);
  document.addEventListener('input',teamLiteTouchActivity,true);
  document.addEventListener('focusin',teamLiteTouchActivity,true);
  document.addEventListener('keydown',function(e){
    var activeLightbox=chatLightbox||document.querySelector('.up-chat-lightbox');if(e.key==='Escape'&&activeLightbox&&!activeLightbox.classList.contains('hidden')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();closeChatLightbox();return;}
    if(e.key==='Escape'){
      if(!chat.classList.contains('hidden')){e.preventDefault();closeChat(false);if(!card.classList.contains('team-lite-chat-mode'))openUpStatusPanel();}
      return;
    }
    if(e.shiftKey&&(e.key==='c'||e.key==='C')){
      var t=e.target,tag=t&&t.tagName?String(t.tagName).toLowerCase():'';
      var editable=!!(t&&(t.isContentEditable||tag==='input'||tag==='textarea'||tag==='select'));
      if(!editable){e.preventDefault();if(isAuthenticated())toggleTeamLitePanel();else{chat.classList.add('hidden');card.classList.remove('team-lite-chat-mode');card.classList.remove('hidden');login();}}
    }
  });
  // Sale Smartly: close only the conversation view; do not touch session status or list events.
  var upStatusSaleChatClose={observer:null,button:null,closed:false,deselected:false,raf:0};
  function upStatusSaleChatPanel(){return document.querySelector('.chat-session-panel');}
  function upStatusSaleChatVisible(panel){return !!(panel&&panel.isConnected&&getComputedStyle(panel).display!=='none'&&panel.getAttribute('data-upstatus-visual-closed')!=='1');}
  function upStatusSaleRestoreVisual(){
    upStatusSaleChatClose.closed=false;
    document.querySelectorAll('.chat-session-panel[data-upstatus-visual-closed="1"]').forEach(function(panel){
      var previous=panel.__upStatusClosePreviousDisplay;
      panel.style.removeProperty('display');
      if(previous&&previous.value)panel.style.setProperty('display',previous.value,previous.priority||'');
      panel.removeAttribute('data-upstatus-visual-closed');
      try{delete panel.__upStatusClosePreviousDisplay;}catch(e){panel.__upStatusClosePreviousDisplay=null;}
    });
    upStatusSaleInstallButton();
  }
  function upStatusSaleHideVisual(panel){
    if(!panel)return;
    if(!panel.hasAttribute('data-upstatus-visual-closed')){
      panel.__upStatusClosePreviousDisplay={value:panel.style.getPropertyValue('display'),priority:panel.style.getPropertyPriority('display')};
      panel.setAttribute('data-upstatus-visual-closed','1');
    }
    panel.style.setProperty('display','none','important');
    upStatusSaleChatClose.closed=true;
    if(upStatusSaleChatClose.button){upStatusSaleChatClose.button.remove();upStatusSaleChatClose.button=null;}
  }
  function upStatusSaleEditableOrModal(target){
    var el=target&&target.nodeType===1?target:null;
    if(el&&el.closest('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="dialog"],.arco-modal-wrapper,.arco-modal,.arco-drawer,.arco-trigger-popup,.up-chat-input'))return true;
    var overlays=document.querySelectorAll('[role="dialog"],.arco-modal-wrapper,.arco-modal,.arco-drawer');
    for(var i=0;i<overlays.length;i++){
      var overlay=overlays[i],style=getComputedStyle(overlay),rect=overlay.getBoundingClientRect();
      if(style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>0&&rect.width>0&&rect.height>0)return true;
    }
    return false;
  }
  function upStatusSaleComposerRect(panel,headerRect){
    var nodes=panel.querySelectorAll('textarea,[contenteditable="true"],[role="textbox"]'),best=null,bestWidth=0;
    nodes.forEach(function(el){
      if(el.closest('#upstatus-root'))return;
      var r=el.getBoundingClientRect(),style=getComputedStyle(el);
      if(r.width<160||r.height<8||r.bottom<=headerRect.bottom||style.display==='none'||style.visibility==='hidden')return;
      if(r.width>bestWidth){best=el;bestWidth=r.width;}
    });
    return best?best.getBoundingClientRect():null;
  }
  function upStatusSaleFindEndButton(header){
    if(!header)return null;
    var buttons=Array.from(header.querySelectorAll('button,[role="button"]')).filter(function(el){
      if(el===upStatusSaleChatClose.button||el.closest('.upstatus-sale-chat-close'))return false;
      var r=el.getBoundingClientRect(),style=getComputedStyle(el);
      if(r.width<20||r.height<20||style.display==='none'||style.visibility==='hidden'||Number(style.opacity||1)===0)return false;
      return true;
    });
    buttons.sort(function(a,b){return b.getBoundingClientRect().right-a.getBoundingClientRect().right;});
    var headerRect=header.getBoundingClientRect();
    for(var i=0;i<buttons.length;i++){
      var el=buttons[i],r=el.getBoundingClientRect(),style=getComputedStyle(el);
      var bg=style.backgroundColor||'';
      var rgb=bg.match(/(\d+), *(\d+), *(\d+)/);
      var red=!!(rgb&&Number(rgb[1])>180&&Number(rgb[2])<80&&Number(rgb[3])<80);
      var label=((el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||'')+' '+(el.innerText||'')).toLowerCase();
      if((red||/end|close|encerrar|fechar|terminar|finalizar|结束|关闭/.test(label))&&r.right>=headerRect.right-70)return el;
    }
    return null;
  }
  function upStatusSalePositionButton(){
    var panel=upStatusSaleChatPanel(),button=upStatusSaleChatClose.button;
    if(!button||!upStatusSaleChatVisible(panel))return;
    var header=panel.querySelector('.chat-session-panel__header');
    if(!header)return;
    var endButton=upStatusSaleFindEndButton(header);
    if(endButton&&endButton.parentElement){
      var nativeStyle=getComputedStyle(endButton);
      if(button.parentElement!==endButton.parentElement||button.nextElementSibling!==endButton){
        endButton.parentElement.insertBefore(button,endButton);
      }
      // Match the native end-session control's geometry and button styling.
      button.style.position='relative';
      button.style.left='auto';
      button.style.top='auto';
      button.style.width=(endButton.offsetWidth||34)+'px';
      button.style.height=(endButton.offsetHeight||34)+'px';
      button.style.minWidth=(endButton.offsetWidth||34)+'px';
      button.style.padding=nativeStyle.padding;
      button.style.border=nativeStyle.border;
      button.style.borderRadius=nativeStyle.borderRadius;
      button.style.background='#2563eb';
      button.style.color='#ffffff';
      button.style.boxShadow=nativeStyle.boxShadow;
      button.style.fontSize=nativeStyle.fontSize;
      button.style.lineHeight=nativeStyle.lineHeight;
      button.style.margin='0 8px 0 0';
      button.style.display=nativeStyle.display==='inline'?'inline-flex':nativeStyle.display;
      button.style.alignItems='center';
      button.style.justifyContent='center';
      button.style.verticalAlign='middle';
      button.style.flex=nativeStyle.flex==='0 1 auto'?'0 0 auto':nativeStyle.flex;
      button.style.alignSelf='center';
      button.style.zIndex='1';
      button.style.cursor='pointer';
      button.style.boxSizing=nativeStyle.boxSizing;
      button.style.outline='none';
      return;
    }
    // Fallback while the native end-session control is not identifiable.
    var hr=header.getBoundingClientRect(),composer=upStatusSaleComposerRect(panel,hr);
    if(button.parentElement!==root)root.appendChild(button);
    button.style.position='fixed';
    button.style.margin='0';
    button.style.flex='none';
    var left=composer?composer.right-24:hr.right-Math.max(240,hr.width*.30)-24;
    var top=hr.bottom+8;
    left=Math.max(8,Math.min(window.innerWidth-42,left));
    top=Math.max(8,Math.min(window.innerHeight-42,top));
    button.style.left=Math.round(left)+'px';button.style.top=Math.round(top)+'px';
  }
  function upStatusSaleInstallButton(){
    var panel=upStatusSaleChatPanel();
    if(upStatusSaleChatClose.deselected){if(upStatusSaleChatClose.button){upStatusSaleChatClose.button.remove();upStatusSaleChatClose.button=null;}return;}
    if(!panel||!panel.isConnected)return;
    var header=panel.querySelector('.chat-session-panel__header');
    if(!header)return;
    if(upStatusSaleChatClose.closed){upStatusSaleHideVisual(panel);return;}
    if(!upStatusSaleChatClose.button){
      var button=document.createElement('button');
      button.type='button';
      button.className='upstatus-sale-chat-close';
      button.setAttribute('aria-label','Voltar à lista de conversas');
      button.title='Voltar à lista de conversas (Esc), sem encerrar o atendimento';
      button.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      button.style.cssText='position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;min-width:34px;padding:0;border:0;border-radius:4px;background:#2563eb;color:#fff;box-shadow:0 2px 7px rgba(0,0,0,.28);cursor:pointer;z-index:1;line-height:1;box-sizing:border-box;flex:0 0 34px;margin:0 6px 0 0;';
      button.addEventListener('click',function(e){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        upStatusSaleDeselectActiveChat();
      });
      upStatusSaleChatClose.button=button;
    }
    upStatusSalePositionButton();
  }
  function upStatusSaleRowClick(target){
    var row=target&&target.closest?target.closest('[class*="session-list"] [class*="item"],[class*="session-list"] [data-session-id],[class*="session-list"] [data-chat-user-id]'):null;
    if(!row)return false;
    var classes=String(row.className||'');
    if(/filter|tabs|search|header/i.test(classes))return false;
    return true;
  }
  function upStatusSaleCloseInit(){
    if(!document.documentElement)return;
    if(!upStatusSaleChatClose.observer){
      upStatusSaleChatClose.observer=new MutationObserver(function(){
        if(upStatusSaleChatClose.raf)return;
        upStatusSaleChatClose.raf=requestAnimationFrame(function(){
          upStatusSaleChatClose.raf=0;
          var panel=upStatusSaleChatPanel();
          if(!panel)return;
          if(upStatusSaleChatClose.closed)upStatusSaleHideVisual(panel);
          else upStatusSaleInstallButton();
        });
      });
      upStatusSaleChatClose.observer.observe(document.documentElement,{childList:true,subtree:true});
    }
    upStatusSaleInstallButton();
  }
  document.addEventListener('click',function(e){
    if(!upStatusSaleRowClick(e.target))return;
    if(upStatusSaleChatClose.closed)requestAnimationFrame(upStatusSaleRestoreVisual);
    if(upStatusSaleChatClose.deselected){
      upStatusSaleChatClose.deselected=false;
      requestAnimationFrame(upStatusSaleInstallButton);
    }
  },true);
  function upStatusSaleDeselectActiveChat(){
    if(upStatusSaleChatClose.deselected)return;
    var panel=upStatusSaleChatPanel();
    if(!upStatusSaleChatVisible(panel))return;
    if(upStatusSaleChatClose.button)upStatusSaleChatClose.button.disabled=true;
    var settled=false,timer=0;
    function finish(ev){
      if(settled)return;
      settled=true;
      document.removeEventListener('UPSTATUS_SALE_DESELECT_CHAT_RESULT',finish);
      clearTimeout(timer);
      var result=ev&&ev.detail||{};
      if(result.ok){
        upStatusSaleChatClose.deselected=true;
        upStatusSaleChatClose.closed=false;
        if(upStatusSaleChatClose.button){upStatusSaleChatClose.button.remove();upStatusSaleChatClose.button=null;}
      }else{
        if(upStatusSaleChatClose.button)upStatusSaleChatClose.button.disabled=false;
        console.warn('[UpStatus] Não foi possível deselecionar a conversa:',result.error||'erro desconhecido');
      }
    }
    document.addEventListener('UPSTATUS_SALE_DESELECT_CHAT_RESULT',finish);
    timer=setTimeout(function(){
      finish({detail:{ok:false,error:'Tempo esgotado aguardando a resposta do Sale Smartly.'}});
    },1500);
    document.dispatchEvent(new CustomEvent('UPSTATUS_SALE_DESELECT_CHAT'));
  }
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape'||e.defaultPrevented)return;
    var panel=upStatusSaleChatPanel();
    if(!upStatusSaleChatVisible(panel)||upStatusSaleEditableOrModal(e.target))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    upStatusSaleDeselectActiveChat();
  },true);
  window.addEventListener('resize',upStatusSalePositionButton);
  window.addEventListener('scroll',upStatusSalePositionButton,true);
  if(document.documentElement)upStatusSaleCloseInit();
  else document.addEventListener('DOMContentLoaded',upStatusSaleCloseInit,{once:true});

// Clickable overlay for Sale Smartly's native empty-chat illustration.
  var upStatusSaleEmptyImageKey='upstatus_sale_empty_screen_image_v1';
  var upStatusSaleEmptyImageInput=null;
  var upStatusSaleEmptyImageOverlay=null;
  function upStatusSaleFindEmptyCaption(){
    var nodes=Array.from(document.querySelectorAll('body *')).filter(function(el){
      if(!el||el.children.length>4)return false;
      var t=String(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
      if(!(t.length>0&&t.length<100&&(/tome um ch[aá]/i.test(t)||/faça uma pausa/i.test(t))))return false;
      var r=el.getBoundingClientRect(),cs=getComputedStyle(el);
      return r.width>=40&&r.height>=8&&r.bottom>0&&r.top<window.innerHeight&&r.right>0&&r.left<window.innerWidth&&cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>0;
    });
    nodes.sort(function(a,b){
      var at=String(a.innerText||a.textContent||'').length,bt=String(b.innerText||b.textContent||'').length;
      if(at!==bt)return at-bt;
      return a.getBoundingClientRect().width-b.getBoundingClientRect().width;
    });
    return nodes[0]||null;
  }
  function upStatusSaleEnsureImagePicker(){
    if(upStatusSaleEmptyImageInput)return upStatusSaleEmptyImageInput;
    var input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/gif,.jpg,.jpeg,.gif';input.tabIndex=-1;
    input.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10000px;top:-10000px;';
    input.addEventListener('change',function(){
      var file=input.files&&input.files[0];if(!file)return;
      var type=String(file.type||'').toLowerCase(),name=String(file.name||'').toLowerCase();
      if(!(type==='image/jpeg'||type==='image/gif'||/\.(jpe?g|gif)$/.test(name))){alert('Escolha um arquivo JPEG ou GIF.');input.value='';return;}
      if(file.size>5*1024*1024){alert('A imagem deve ter no máximo 5 MB.');input.value='';return;}
      var reader=new FileReader();reader.onload=function(){
        var data=String(reader.result||'');
        if(!/^data:image\/(?:jpeg|gif);base64,/i.test(data)){alert('Não foi possível ler essa imagem.');input.value='';return;}
        try{GM_setValue(upStatusSaleEmptyImageKey,data);upStatusSaleApplyEmptyImage();}catch(err){alert('Não foi possível salvar a imagem neste navegador.');}
        input.value='';
      };reader.onerror=function(){alert('Não foi possível ler essa imagem.');input.value='';};reader.readAsDataURL(file);
    });
    document.body.appendChild(input);upStatusSaleEmptyImageInput=input;return input;
  }
  function upStatusSaleEnsureEmptyOverlay(){
    if(upStatusSaleEmptyImageOverlay&&upStatusSaleEmptyImageOverlay.isConnected)return upStatusSaleEmptyImageOverlay;
    var overlay=document.createElement('button');overlay.type='button';overlay.id='upstatus-sale-empty-image-overlay';
    overlay.setAttribute('aria-label','Trocar imagem da tela vazia do Sale Smartly');
    overlay.title='Clique para escolher um JPEG/GIF. Clique com o botão direito para restaurar o original.';
    overlay.style.cssText='position:fixed;display:block;border:0;padding:0;margin:0;background:transparent;cursor:pointer;z-index:2147483000;box-sizing:border-box;outline:none;';
    var img=document.createElement('img');img.alt='';img.draggable=false;
    img.style.cssText='display:none;width:100%;height:100%;object-fit:contain;pointer-events:none;background:transparent;';
    overlay.appendChild(img);
    overlay.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();upStatusSaleEnsureImagePicker().click();},true);
    overlay.addEventListener('contextmenu',function(e){e.preventDefault();e.stopPropagation();if(!confirm('Remover a imagem personalizada e restaurar o emoji original?'))return;try{GM_setValue(upStatusSaleEmptyImageKey,'');}catch(err){alert('Não foi possível restaurar a imagem original.');return;}upStatusSaleApplyEmptyImage();},true);
    document.body.appendChild(overlay);upStatusSaleEmptyImageOverlay=overlay;return overlay;
  }
  var upStatusSaleHiddenOriginals=[];
  function upStatusSaleSetOriginalIllustrationHidden(caption,hidden){
    if(!hidden){
      upStatusSaleHiddenOriginals.forEach(function(item){
        if(item.el&&item.el.isConnected){
          item.el.style.visibility=item.visibility;
          item.el.style.opacity=item.opacity;
          item.el.style.pointerEvents=item.pointerEvents;
        }
      });
      upStatusSaleHiddenOriginals=[];
      return;
    }
    if(upStatusSaleHiddenOriginals.length)return;
    if(!caption)return;
    var cr=caption.getBoundingClientRect(),candidates=[];
    var parent=caption;
    for(var depth=0;depth<7&&parent;depth++,parent=parent.parentElement){
      Array.from(parent.children||[]).forEach(function(el){
        if(el===caption||el.contains(caption)||el.id==='upstatus-sale-empty-image-overlay'||el.closest('#upstatus-sale-empty-image-overlay'))return;
        var r=el.getBoundingClientRect(),cs=getComputedStyle(el);
        if(r.width<36||r.height<36||r.width>360||r.height>260)return;
        if(r.bottom>cr.top+8||r.top<cr.top-280)return;
        if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity||1)===0)return;
        // Prefer the visible graphic immediately above the caption, not the whole layout container.
        candidates.push({el:el,area:r.width*r.height,distance:Math.abs(cr.top-r.bottom),depth:depth});
      });
      if(candidates.length)break;
    }
    candidates.sort(function(a,b){return a.distance-b.distance||a.area-b.area;});
    if(candidates.length){
      var target=candidates[0].el;
      upStatusSaleHiddenOriginals.push({el:target,visibility:target.style.visibility,opacity:target.style.opacity,pointerEvents:target.style.pointerEvents});
      target.style.visibility='hidden';
      target.style.opacity='0';
      target.style.pointerEvents='none';
    }
  }
  function upStatusSaleFindEmptyRegion(caption){
    var node=caption,best=null,viewportWidth=window.innerWidth,viewportHeight=window.innerHeight;
    for(var depth=0;depth<8&&node;depth++,node=node.parentElement){
      var r=node.getBoundingClientRect();
      if(r.bottom<=0||r.top>=viewportHeight||r.right<=0||r.left>=viewportWidth)continue;
      // Ignore the whole viewport/app shell: it can include the left conversation list and shift the illustration off-center.
      var minWidth=Math.max(300,viewportWidth*0.55),maxWidth=viewportWidth*0.98,minHeight=Math.max(300,viewportHeight*0.55);
      if(r.width>=minWidth&&r.width<=maxWidth&&r.height>=minHeight){best={el:node,rect:r};break;}
    }
    return best;
  }
  function upStatusSaleApplyEmptyImage(){
    var caption=upStatusSaleFindEmptyCaption(),overlay=upStatusSaleEnsureEmptyOverlay();
    if(!caption){overlay.style.display='none';upStatusSaleSetOriginalIllustrationHidden(null,false);return;}
    var cr=caption.getBoundingClientRect(),region=upStatusSaleFindEmptyRegion(caption);
    if(cr.width<40||cr.height<8){overlay.style.display='none';return;}
    var r=region?region.rect:cr;
    var width=Math.max(150,Math.min(240,region?Math.min(240,r.width*0.25):cr.width+48)),height=160;
    var left=(region?r.left+r.width/2:window.innerWidth/2)-width/2;
    var top=region?r.top+Math.max(24,Math.min(r.height*0.38,r.height-height-16)):cr.top-height-8;
    left=Math.max(0,Math.min(window.innerWidth-width,left));
    top=Math.max(0,Math.min(window.innerHeight-height,top));
    overlay.style.left=Math.round(left)+'px';overlay.style.top=Math.round(top)+'px';
    overlay.style.width=Math.round(width)+'px';overlay.style.height=Math.round(height)+'px';
    var custom='';try{custom=GM_getValue(upStatusSaleEmptyImageKey,'')||'';}catch(e){}
    var img=overlay.firstElementChild;
    if(custom&&/^data:image\/(?:jpeg|gif);base64,/i.test(custom)){
      upStatusSaleSetOriginalIllustrationHidden(caption,true);
      if(img.src!==custom)img.src=custom;
      img.style.display='block';overlay.style.display='block';overlay.style.pointerEvents='auto';
    }else{
      upStatusSaleSetOriginalIllustrationHidden(caption,false);
      img.removeAttribute('src');img.style.display='none';overlay.style.display='block';overlay.style.pointerEvents='auto';
    }
  }

 (function upStatusGuestMessageStyles347(){if(document.getElementById('upstatus-guest-message-styles-347'))return;var style=document.createElement('style');style.id='upstatus-guest-message-styles-347';style.textContent=[
 '#upstatus-team-lite-root .up-chat-item.lucca .up-chat-bubble{background:var(--up-chat-neutral-fill)!important;border:1px solid #a855f7!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important}',
 '#upstatus-team-lite-root .up-chat-item.ycaro .up-chat-bubble{background:var(--up-chat-neutral-fill)!important;border:1px solid #f97316!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important}',
 '#upstatus-team-lite-root .up-chat-item.lucca .up-chat-bubble:before,#upstatus-team-lite-root .up-chat-item.lucca .up-chat-bubble:after,#upstatus-team-lite-root .up-chat-item.ycaro .up-chat-bubble:before,#upstatus-team-lite-root .up-chat-item.ycaro .up-chat-bubble:after{background:var(--up-chat-neutral-fill)!important;border-color:var(--up-chat-neutral-fill)!important;box-shadow:none!important}',
 '#upstatus-team-lite-root .up-chat-item.lucca .up-chat-meta b{color:#c4b5fd!important}',
 '#upstatus-team-lite-root .up-chat-item.lucca .up-chat-text{color:inherit!important}',
 '#upstatus-team-lite-root .up-chat-item.ycaro .up-chat-meta b{color:#fdba74!important}',
 '#upstatus-team-lite-root .up-chat-item.ycaro .up-chat-text{color:inherit!important}',
 '#upstatus-team-lite-root.up-theme-light{--up-chat-neutral-fill:#e7edf5;--up-chat-system-text:#64748b}',
 '#upstatus-team-lite-root:not(.up-theme-light){--up-chat-neutral-fill:#202a39;--up-chat-system-text:#8391a5}',
 '#upstatus-team-lite-root .up-chat-system-event{display:flex!important;justify-content:center!important;padding:4px 0!important;margin:0!important;background:transparent!important;border:0!important;box-shadow:none!important;line-height:1.25!important}',
 '#upstatus-team-lite-root .up-chat-system-event span{display:inline!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:var(--up-chat-system-text)!important;font-size:10px!important;font-weight:500!important;letter-spacing:0!important;text-align:center!important}',
 '#upstatus-team-lite-root .up-chat-system-event.join span,#upstatus-team-lite-root .up-chat-system-event.leave span{background:transparent!important;border-color:transparent!important;color:var(--up-chat-system-text)!important}',
 '#upstatus-team-lite-root .up-chat-lucca-alert{display:none!important}'
 ].join('');(document.head||document.documentElement).appendChild(style);})();
 
  var upStatusSaleEmptyImageTick=0;
  function upStatusSaleScheduleEmptyImageApply(){if(upStatusSaleEmptyImageTick)return;upStatusSaleEmptyImageTick=requestAnimationFrame(function(){upStatusSaleEmptyImageTick=0;upStatusSaleApplyEmptyImage();});}
  var upStatusSaleEmptyImageObserver=new MutationObserver(upStatusSaleScheduleEmptyImageApply);
  if(document.documentElement)upStatusSaleEmptyImageObserver.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('resize',upStatusSaleScheduleEmptyImageApply);window.addEventListener('scroll',upStatusSaleScheduleEmptyImageApply,true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',upStatusSaleApplyEmptyImage,{once:true});else upStatusSaleApplyEmptyImage();


  setInterval(function(){loadChat();},3000);
  setInterval(pollChatTyping,1000);  setInterval(pollRemoteStatus,5000);
  setInterval(checkUpdate,60000);
})();

(function(){
  function install(){
    if(document.getElementById('upstatus-3-1-6-call-theme-fixes')) return;
    var style=document.createElement('style');
    style.id='upstatus-3-1-6-call-theme-fixes';
    style.textContent=`
      /* Participant chips: compact capsules in both themes; supersedes legacy circular override. */
      #upstatus-team-lite-root .up-voice-person{
        position:relative!important;display:inline-flex!important;flex:0 1 auto!important;
        align-items:center!important;justify-content:flex-start!important;gap:7px!important;
        width:max-content!important;height:auto!important;min-width:0!important;min-height:40px!important;
        max-width:100%!important;aspect-ratio:auto!important;box-sizing:border-box!important;
        padding:4px 10px 4px 5px!important;border:1px solid #344b66!important;border-radius:999px!important;
        background:#1b293b!important;color:#edf4ff!important;overflow:visible!important;
        white-space:nowrap!important;line-height:1.2!important;vertical-align:middle!important;
      }
      #upstatus-team-lite-root .up-voice-person .up-voice-avatar{
        display:block!important;flex:0 0 30px!important;width:30px!important;height:30px!important;
        min-width:30px!important;min-height:30px!important;max-width:30px!important;max-height:30px!important;
        border-radius:50%!important;object-fit:cover!important;box-sizing:border-box!important;
      }
      #upstatus-team-lite-root .up-voice-person b{display:block!important;flex:0 1 auto!important;min-width:0!important;max-width:150px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:11px!important;line-height:1.2!important}
      #upstatus-team-lite-root .up-voice-person.is-speaking{border-radius:999px!important}
      #upstatus-team-lite-root .up-voice-person.is-muted{border-radius:999px!important}
      /* Light mode call surface, including nested controls, preview and empty/error states. */
      #upstatus-team-lite-root.up-theme-light .up-voice-room{
        color:#172033!important;background:linear-gradient(145deg,#f8fbff 0%,#edf4ff 100%)!important;
        border:1px solid #c6d8f0!important;box-shadow:0 6px 18px rgba(39,69,111,.12)!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-voice-room,
      #upstatus-team-lite-root.up-theme-light .up-voice-room *{text-shadow:none!important}
      #upstatus-team-lite-root.up-theme-light .up-voice-title,
      #upstatus-team-lite-root.up-theme-light .up-voice-title *,
      #upstatus-team-lite-root.up-theme-light .up-voice-head,
      #upstatus-team-lite-root.up-theme-light .up-voice-head *,
      #upstatus-team-lite-root.up-theme-light .up-voice-participants,
      #upstatus-team-lite-root.up-theme-light .up-voice-participants *,
      #upstatus-team-lite-root.up-theme-light .up-voice-state,
      #upstatus-team-lite-root.up-theme-light .up-voice-duration,
      #upstatus-team-lite-root.up-theme-light .up-voice-message,
      #upstatus-team-lite-root.up-theme-light .up-voice-empty,
      #upstatus-team-lite-root.up-theme-light .up-voice-ping{color:#334155!important}
      #upstatus-team-lite-root.up-theme-light .up-voice-connection{color:#087f5b!important}
      #upstatus-team-lite-root.up-theme-light .up-voice-connection.is-connecting{color:#9a6700!important}
      #upstatus-team-lite-root.up-theme-light .up-voice-person{
        color:#233047!important;background:#fff!important;border:1px solid #c7d7eb!important;
        border-radius:999px!important;box-shadow:0 1px 3px rgba(24,49,80,.08)!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-voice-person.is-speaking{
        background:#e8f3ff!important;border-color:#3b82f6!important;
        box-shadow:0 0 0 2px rgba(59,130,246,.14)!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-voice-person.is-muted{
        background:#fff1f2!important;border-color:#e34b62!important;
        box-shadow:0 0 0 1px rgba(227,75,98,.10)!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-voice-avatar{border:1px solid #b8cce4!important}
      #upstatus-team-lite-root.up-theme-light .up-voice-actions button,
      #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble button,
      #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble>button{
        background:#dfeaf8!important;border:1px solid #c4d4e8!important;color:#24344b!important;
        box-shadow:none!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-voice-actions button:hover,
      #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble button:hover{background:#cfdef2!important}
      #upstatus-team-lite-root.up-theme-light .up-voice-actions button svg,
      #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble button svg{color:currentColor!important;stroke:currentColor!important}
      #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-join,
      #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-join{
        color:#fff!important;background:#18794e!important;border-color:#18794e!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-leave,
      #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-leave,
      #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-control-leave{
        color:#fff!important;background:#c62845!important;border-color:#c62845!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-voice-actions .is-muted,
      #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .is-muted,
      #upstatus-team-lite-root.up-theme-light .up-voice-mute.is-muted,
      #upstatus-team-lite-root.up-theme-light .up-voice-speakers.is-muted{
        color:#fff!important;background:#b4233d!important;border-color:#e34b62!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-voice-status-muted,
      #upstatus-team-lite-root.up-theme-light .up-voice-mic-muted{color:#fff!important}
      #upstatus-team-lite-root.up-theme-light .up-screen-share-panel{
        color:#233047!important;background:rgba(255,255,255,.98)!important;
        border:1px solid #c5d6ed!important;box-shadow:0 8px 24px rgba(25,45,75,.14)!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-screen-share-heading,
      #upstatus-team-lite-root.up-theme-light .up-screen-share-heading *,
      #upstatus-team-lite-root.up-theme-light .up-screen-share-grid,
      #upstatus-team-lite-root.up-theme-light .up-screen-share-grid *{color:#233047!important}
      #upstatus-team-lite-root.up-theme-light .up-screen-share-status,
      #upstatus-team-lite-root.up-theme-light .up-screen-share-message,
      #upstatus-team-lite-root.up-theme-light .up-screen-share-label{color:#52647c!important}
      #upstatus-team-lite-root.up-theme-light .up-screen-share-tile{
        color:#233047!important;background:#fff!important;border:1px solid #c5d6ed!important;
        box-shadow:0 2px 8px rgba(20,40,70,.07)!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-screen-share-tile *{color:inherit}
      #upstatus-team-lite-root.up-theme-light .up-screen-share-tile video,
      #upstatus-team-lite-root.up-theme-light .up-screen-share-fullscreen{background:#e7edf5!important}
      #upstatus-team-lite-root.up-theme-light .up-screen-share-toolbar,
      #upstatus-team-lite-root.up-theme-light .up-screen-share-controls{color:#233047!important}
      #upstatus-team-lite-root.up-theme-light .up-screen-share-toggle,
      #upstatus-team-lite-root.up-theme-light .up-screen-share-toolbar button,
      #upstatus-team-lite-root.up-theme-light .up-screen-share-controls button{
        color:#233047!important;background:#dfeaf8!important;border:1px solid #c5d6ed!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-screen-share-toggle.is-sharing,
      #upstatus-team-lite-root.up-theme-light .up-screen-share-controls .is-sharing{
        color:#fff!important;background:#b4233d!important;border-color:#e34b62!important;
      }
      #upstatus-team-lite-root.up-theme-light .up-voice-control-wave,
      #upstatus-team-lite-root.up-theme-light .up-voice-wave-bars{color:#18794e!important}
      #upstatus-team-lite-root.up-theme-light .up-voice-control-wave span,
      #upstatus-team-lite-root.up-theme-light .up-voice-wave-bars span{background-color:currentColor!important}
      @media(prefers-reduced-motion:reduce){
        #upstatus-team-lite-root .up-voice-person.is-speaking{animation:none!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }
  if(document.documentElement) install();
  else document.addEventListener('DOMContentLoaded',install,{once:true});
})();


(function(){
 function install(){
  if(document.getElementById('upstatus-3-1-7-call-light-layout'))return;
  var s=document.createElement('style');s.id='upstatus-3-1-7-call-light-layout';
  s.textContent=`
   /* Light theme: joined room and floating call controls must not inherit dark palette. */
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined{
     color:#1f2937!important;background:linear-gradient(145deg,#f8fbff 0%,#edf4ff 100%)!important;
     border-color:#c6d8f0!important;box-shadow:0 6px 18px rgba(39,69,111,.12)!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-title,
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-title *,
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-head,
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-head *{color:#1f2937!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-state,
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-message,
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-duration,
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-ping{color:#52647c!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-connection{color:#087f5b!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-connection.is-connecting{color:#9a6700!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-person{
     color:#233047!important;background:#fff!important;border-color:#c7d7eb!important;
     border-radius:999px!important;box-shadow:0 1px 3px rgba(24,49,80,.08)!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-person b{color:#233047!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-person.is-speaking{background:#e8f3ff!important;border-color:#3b82f6!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-actions button:not(.up-voice-join):not(.up-voice-leave){
     color:#24344b!important;background:#dfeaf8!important;border:1px solid #c4d4e8!important;box-shadow:none!important
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-actions button svg{color:currentColor!important;stroke:currentColor!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble{
     color:#24344b!important;background:rgba(248,251,255,.98)!important;border:1px solid #c5d6ed!important;
     box-shadow:0 7px 20px rgba(25,45,75,.16)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble:after{border-left-color:#f8fbff!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble:before{border-left-color:#c5d6ed!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-avatar{background:#fff!important;border-color:#b8cce4!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-wave{stroke:#16885f!important;filter:drop-shadow(0 0 2px rgba(22,136,95,.2))!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble.is-muted .up-voice-control-wave{stroke:#dc3545!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble>button,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble button:not(.up-voice-control-leave):not(.is-muted){
     color:#24344b!important;background:#dfeaf8!important;border:1px solid #c4d4e8!important;box-shadow:none!important
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble>button svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble button svg{color:currentColor!important;stroke:currentColor!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble>button.is-muted{color:#fff!important;background:#b4233d!important;border-color:#e34b62!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-leave{
     color:#c82333!important;background:#fff!important;border:1px solid #dc3545!important
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-leave:hover{background:#fee2e2!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore.is-sharing{color:#fff!important;background:#b4233d!important;border-color:#e34b62!important}
   /* Populated preview room: keep Join button aligned with the room header. Empty room layout remains untouched. */
   #upstatus-team-lite-root .up-voice-room:not(.is-empty):not(.is-joined) .up-voice-head{
     padding-right:100px!important;box-sizing:border-box!important
   }
   #upstatus-team-lite-root .up-voice-room:not(.is-empty):not(.is-joined) .up-voice-actions{
     position:absolute!important;top:10px!important;right:10px!important;bottom:auto!important;
     display:flex!important;align-items:flex-start!important;justify-content:flex-end!important;
     margin:0!important;padding:0!important;align-self:flex-start!important
   }
   #upstatus-team-lite-root .up-voice-room:not(.is-empty):not(.is-joined) .up-voice-actions .up-voice-join{
     align-self:flex-start!important;margin:0!important;transform:none!important
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-room:not(.is-empty):not(.is-joined) .up-voice-title,
   #upstatus-team-lite-root.up-theme-light .up-voice-room:not(.is-empty):not(.is-joined) .up-voice-title *{color:#1f2937!important}
   @media(prefers-reduced-motion:reduce){#upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-wave{animation:none!important}}
  `;
  (document.head||document.documentElement).appendChild(s);
 }
 if(document.documentElement)install();else document.addEventListener('DOMContentLoaded',install,{once:true});
})();


(function(){
 function install(){
  if(document.getElementById('upstatus-3-1-8-call-state-theme'))return;
  var s=document.createElement('style');s.id='upstatus-3-1-8-call-state-theme';
  s.textContent=`
   #upstatus-team-lite-root.up-theme-light .up-voice-connection,
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-connection{color:#087443!important}
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-actions button.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-speakers.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore.is-sharing{
     color:#fff!important;background:#c62845!important;border-color:#e34b62!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-actions button.is-muted svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute.is-muted svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-speakers.is-muted svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore.is-sharing svg{
     color:#fff!important;stroke:#fff!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-status-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-status-muted svg{color:#fff!important;stroke:#fff!important}
   /* UpStatus 3.1.9: consistent active mute/share controls in light and dark themes */
   #upstatus-team-lite-root .up-voice-actions .up-voice-mute.is-muted,
   #upstatus-team-lite-root .up-voice-actions .up-voice-speakers.is-muted,
   #upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-mute.is-muted,
   #upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-speakers.is-muted,
   #upstatus-team-lite-root .up-voice-actions .up-screen-share-toggle.is-sharing,
   #upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-restore.is-sharing {
     color:#fff!important;background:#c62845!important;border-color:#e34b62!important;
   }
   #upstatus-team-lite-root .up-voice-actions .up-voice-mute.is-muted svg,
   #upstatus-team-lite-root .up-voice-actions .up-voice-speakers.is-muted svg,
   #upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-mute.is-muted svg,
   #upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-speakers.is-muted svg,
   #upstatus-team-lite-root .up-voice-actions .up-screen-share-toggle.is-sharing svg,
   #upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-restore.is-sharing svg {
     color:#fff!important;stroke:#fff!important;
   }
   #upstatus-team-lite-root .up-voice-person .up-voice-status-muted,
   #upstatus-team-lite-root .up-voice-person .up-voice-mic-muted,
   #upstatus-team-lite-root .up-voice-person .up-voice-speaker-muted {
     color:#fff!important;background:#c62845!important;border-color:#e34b62!important;
   }
   #upstatus-team-lite-root .up-voice-person .up-voice-status-muted svg,
   #upstatus-team-lite-root .up-voice-person .up-voice-mic-muted svg,
   #upstatus-team-lite-root .up-voice-person .up-voice-speaker-muted svg {
     color:#fff!important;stroke:#fff!important;
   }
   /* UpStatus 3.2.0: light theme state-specific call controls */
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-actions .up-voice-mute.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-actions .up-voice-speakers.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-mute.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-speakers.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-speakers.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-actions .up-screen-share-toggle.is-sharing,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore.is-sharing {
     color:#fff!important;background:#c62845!important;border-color:#e34b62!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-actions .up-voice-mute.is-muted svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-actions .up-voice-speakers.is-muted svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute.is-muted svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-speakers.is-muted svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-room.is-joined .up-voice-actions .up-screen-share-toggle.is-sharing svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore.is-sharing svg {
     color:#fff!important;fill:#fff!important;stroke:#fff!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-leave,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-leave,
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-control-leave {
     color:#fff!important;background:#c62845!important;border-color:#e34b62!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-leave svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-leave svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-control-leave svg {
     color:#fff!important;fill:#fff!important;stroke:#fff!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-status-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-status-muted svg,
   #upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-status-muted svg path {
     color:#fff!important;fill:#fff!important;stroke:#fff!important;
   }
  `;
  (document.head||document.documentElement).appendChild(s);
 }
 if(document.documentElement)install();else document.addEventListener('DOMContentLoaded',install,{once:true});
})();






(function upStatusLightControls323(){
 if(document.getElementById('upstatus-light-controls-323'))return;
 var css=[
 '#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-mute.is-muted,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-speakers.is-muted,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-screen-share-toggle.is-sharing,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute.is-muted,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-speakers.is-muted,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore.is-sharing{background:#b4233d!important;border:1px solid #e34b62!important;color:#fff!important}',
 '#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-mute.is-muted svg,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-speakers.is-muted svg,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-screen-share-toggle.is-sharing svg,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute.is-muted svg,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-speakers.is-muted svg,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore.is-sharing svg{color:#fff!important}',
 '#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-leave,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-leave{background:#b4233d!important;border:1px solid #e34b62!important;color:#fff!important}',
 '#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-leave svg,',
 '#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-leave svg{color:#fff!important}',
 '#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore svg{display:block!important;visibility:visible!important;opacity:1!important;color:inherit!important}',
 '#upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-status-muted{background:#b4233d!important;border-color:#e34b62!important;color:#fff!important}',
 '#upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-status-muted svg{color:#fff!important;visibility:visible!important;opacity:1!important}'
 ].join('');
 var st=document.createElement('style');st.id='upstatus-light-controls-323';st.textContent=css;(document.head||document.documentElement).appendChild(st);
})();


/* UpStatus 3.2.4: light-mode call controls */
(function upStatusLightControls324(){try{
var css=[
'#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-mute.is-muted,#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-speakers.is-muted,#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-screen-share-toggle.is-sharing,#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute.is-muted,#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-speakers.is-muted,#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore.is-sharing{background:#c62845!important;border:1px solid #e34b62!important;color:#fff!important;opacity:1!important}',
'#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-leave,#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-leave{background:#c62845!important;border:1px solid #e34b62!important;color:#fff!important}',
'#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-mute.is-muted svg,#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-speakers.is-muted svg,#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-screen-share-toggle.is-sharing svg,#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute.is-muted svg,#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-speakers.is-muted svg,#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore.is-sharing svg,#upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-leave svg,#upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-leave svg{color:#fff!important;visibility:visible!important;opacity:1!important;display:block!important}',
'#upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-status-muted,#upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-mic-muted,#upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-speaker-muted{background:#c62845!important;border-color:#e34b62!important;color:#fff!important}',
'#upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-status-muted svg,#upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-mic-muted svg,#upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-speaker-muted svg{color:#fff!important;visibility:visible!important;opacity:1!important;display:block!important}'
].join('');
var old=document.getElementById('upstatus-light-controls-324');if(old)old.remove();
var st=document.createElement('style');st.id='upstatus-light-controls-324';st.textContent=css;(document.head||document.documentElement).appendChild(st);
}catch(e){console.warn('[UpStatus 3.2.4]',e)}})();


(function(){
 function install(){
  if(document.getElementById('upstatus-3-2-5-light-status-menu'))return;
  var s=document.createElement('style');s.id='upstatus-3-2-5-light-status-menu';
  s.textContent=`
   /* Light theme for team status dropdown and the busy-reason picker. */
   #upstatus-team-lite-root.up-theme-light .up-team-status-menu{
     background:#fff!important;color:#1e293b!important;border-color:#cbd5e1!important;
     box-shadow:0 12px 28px rgba(15,23,42,.18)!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-team-status-menu>button,
   #upstatus-team-lite-root.up-theme-light .up-team-reason button{
     background:#f1f5f9!important;color:#334155!important;border-color:transparent!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-team-status-menu>button:hover,
   #upstatus-team-lite-root.up-theme-light .up-team-reason button:hover{
     background:#e2e8f0!important;color:#0f172a!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-team-status-menu>button.active{
     background:#dbeafe!important;color:#1d4ed8!important;border-color:#93c5fd!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-team-reason{border-top-color:#e2e8f0!important}
   #upstatus-team-lite-root.up-theme-light .up-team-reason-title{color:#475569!important}
   #upstatus-team-lite-root.up-theme-light .up-team-status-wait{color:#475569!important}
   /* Fix mute/share SVGs including icons drawn with fill or inherited currentColor. */
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-mute.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-speakers.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-speakers.is-muted,
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-screen-share-toggle.is-sharing,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore.is-sharing{
     color:#fff!important;background:#c62845!important;border-color:#e34b62!important;
   }
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-mute.is-muted svg *,
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-voice-speakers.is-muted svg *,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute.is-muted svg *,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-speakers.is-muted svg *,
   #upstatus-team-lite-root.up-theme-light .up-voice-actions .up-screen-share-toggle.is-sharing svg *,
   #upstatus-team-lite-root.up-theme-light .up-voice-control-bubble .up-voice-control-restore.is-sharing svg *,
   #upstatus-team-lite-root.up-theme-light .up-voice-person .up-voice-status-muted svg *{
     color:#fff!important;fill:#fff!important;stroke:#fff!important;
   }
  `;
  (document.head||document.documentElement).appendChild(s);
 }
 if(document.documentElement)install();else document.addEventListener('DOMContentLoaded',install,{once:true});
})();

(function(){
 var K='upstatus.emptyStateMessage.v1',DEFAULT='Tome um chá! Faça uma pausa.';
 function bind(){
  var e=document.querySelector('.session-detail__empty-text');if(!e)return;
  var label=e.querySelector(':scope > .upstatus-empty-label');
  if(label&&label.dataset.upClickEditBound==='1')return;
  var original=e.querySelector(':scope > .upstatus-empty-original');
  if(!original){
   original=document.createElement('span');original.className='upstatus-empty-original';original.textContent=DEFAULT;
   var oldLabel=label,txt=null;
   for(var n=e.firstChild;n;n=n.nextSibling){if(n.nodeType===Node.TEXT_NODE&&n.nodeValue.trim()){txt=n;break;}}
   if(txt)e.replaceChild(original,txt);else if(oldLabel)oldLabel.remove();else e.insertBefore(original,e.firstChild);
   original.style.cssText='position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;overflow:hidden!important;white-space:nowrap!important;';
  }
  if(!label){label=document.createElement('span');label.className='upstatus-empty-label';e.appendChild(label);}
  var saved='';try{saved=localStorage.getItem(K)||''}catch(_){}
  if(!label.dataset.upInitialized){label.textContent=saved||DEFAULT;label.dataset.upInitialized='1';}
  label.dataset.upClickEditBound='1';
  label.style.cssText='display:inline-block!important;position:relative!important;cursor:text!important;white-space:nowrap!important;max-width:calc(100% - 12px)!important;box-sizing:border-box!important;border-bottom:1px solid transparent!important;padding-bottom:3px!important;line-height:1.35!important;';
  label.title='Clique para editar';
  function begin(){if(label.isContentEditable)return;label.dataset.originalText=label.textContent;label.contentEditable='true';label.style.setProperty('border-bottom','1px solid #4f8cff','important');label.style.setProperty('outline','none','important');label.title='Pressione Enter para salvar';try{var range=document.createRange();range.selectNodeContents(label);var sel=window.getSelection();sel.removeAllRanges();sel.addRange(range)}catch(_){}}
  function finish(){if(!label.isContentEditable)return;var value=(label.textContent||'').replace(/[\r\n]+/g,' ').trim();label.contentEditable='false';if(!value){value=DEFAULT;try{localStorage.removeItem(K)}catch(_){}}else{try{localStorage.setItem(K,value)}catch(_){}}label.textContent=value;label.style.setProperty('border-bottom','1px solid transparent','important');label.title='Clique para editar';label.blur();}
  label.addEventListener('click',function(ev){if(!label.isContentEditable){ev.preventDefault();ev.stopPropagation();begin();}});
  label.addEventListener('keydown',function(ev){if(!label.isContentEditable)return;if(ev.key==='Enter'){ev.preventDefault();finish()}else if(ev.key==='Escape'){ev.preventDefault();label.textContent=label.dataset.originalText||DEFAULT;label.contentEditable='false';label.style.setProperty('border-bottom','1px solid transparent','important');label.title='Clique para editar';label.blur()}});
  label.addEventListener('blur',function(){if(label.isContentEditable)finish()});
 }
 setInterval(bind,500);bind();
})();

/* 3.3.4 focused regression corrections */
;(function(){
 var style=document.createElement('style');
 style.textContent=
 '.up-chat-bubble{display:flex!important;flex-direction:column!important;align-items:stretch!important;min-width:0!important}'+
 '.up-chat-bubble>.up-chat-text{display:block!important;flex:0 0 auto!important;width:100%!important;min-width:0!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;box-sizing:border-box!important}'+
 '.up-chat-bubble>.up-chat-own-meta,.up-chat-bubble>.up-chat-incoming-time{position:static!important;display:flex!important;flex:0 0 auto!important;align-self:stretch!important;width:100%!important;max-width:100%!important;min-width:0!important;justify-content:flex-end!important;align-items:center!important;float:none!important;clear:both!important;text-align:right!important;white-space:nowrap!important;box-sizing:border-box!important;margin:5px 0 0!important;padding:0!important;order:90!important}'+
 '.up-chat-own-meta .up-chat-own-time,.up-chat-own-meta .up-chat-read{display:inline-block!important;flex:0 0 auto!important;white-space:nowrap!important}'+
 '.up-chat-bubble>.up-chat-reactions{order:100!important}'+
 '.up-chat-recording-label{position:static!important;inset:auto!important;transform:none!important;display:none!important;flex:1 1 auto!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;color:#a9c7ef!important;padding:0 4px!important;margin:0!important;font-size:12px!important;line-height:1.2!important;pointer-events:none!important}'+
 '.up-chat-recording-label.show{display:block!important}'+
 '.up-chat-input-wrap:has(.up-chat-recording-label.show) .up-chat-input{color:transparent!important;text-shadow:none!important;caret-color:transparent!important}'+
 '.up-chat-input-wrap>.up-chat-record{display:inline-flex!important;align-items:center!important;justify-content:center!important;line-height:1!important;padding:0!important;vertical-align:middle!important;transition:transform .18s ease,background-color .18s ease,color .18s ease!important}'+
 '.up-chat-input-wrap>.up-chat-send{transition:transform .18s ease,background-color .18s ease!important}'+
 '.up-chat-emoji-categories button{font-size:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;color:#98a5b9!important;filter:none!important;opacity:.9!important}'+
 '.up-chat-emoji-categories button svg{width:18px!important;height:18px!important;display:block!important;stroke:currentColor!important;fill:none!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}'+
 '.up-chat-emoji-categories button:hover,.up-chat-emoji-categories button.active{color:#d1dbea!important;background:#273247!important;opacity:1!important}'+
 '.session-detail__empty-text{display:inline-block!important;width:auto!important;cursor:default!important;transition:color .15s ease!important}'+
 '.session-detail__empty-text:hover{color:#4f8cff!important}';
 (document.head||document.documentElement).appendChild(style);
 var icons=[
 '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8.5 14c1.8 2 5.2 2 7 0"/></svg>',
 '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v7c0 4-2.5 6-6 6h-2c-2 0-3-1-4-2l-3-4a1.7 1.7 0 0 1 2.5-2.2L9 14"/></svg>',
 '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12C10 8 6 4 3.5 5.5 1 7 3 11 8.5 12 3 13 1 17 3.5 18.5 6 20 10 16 12 12Zm0 0c2-4 6-8 8.5-6.5 2.5 1.5.5 5.5-5 6.5 5.5 1 7.5 5 5 6.5C18 20 14 16 12 12Z"/><path d="M12 7v10M9 5 7 3M15 5l2-2"/></svg>',
 '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 5.5 9.2 7.8 20h8.4l2.3-10.8L12 3.5Z"/><path d="M12 3.5v5M12 8.5l-4-2M12 8.5l4-2"/></svg>',
 '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 13 22 5l-7 17-3-7-10-2Z"/><path d="m12 15 4-5M2 13l6-1"/></svg>',
 '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2M12 3v2M21 12h-2M5 12H3M12 21v-2"/></svg>',
 '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>'
 ];
 function fixCategories(){
  var c=document.querySelector('.up-chat-emoji-categories');if(!c)return;
  Array.prototype.forEach.call(c.querySelectorAll('button'),function(btn,i){
   var label=(btn.getAttribute('aria-label')||btn.title||btn.textContent||'Categoria '+(i+1)).trim();btn.setAttribute('aria-label',label);if(!btn.title)btn.title=label;
   if(btn.dataset.svgCategory==='3.3.15')return;btn.dataset.svgCategory='3.3.15';btn.innerHTML=icons[i]||icons[0];
  });
 }
  function fixEmpty(){
  var e=document.querySelector('.session-detail__empty-text');if(!e)return;
  var p=e.parentElement;if(!p)return;
  var b=p.querySelector('button[title="Editar mensagem"],button[title="Confirmar"]');if(!b)return;
  e.style.setProperty('display','inline-block','important');e.style.setProperty('width','auto','important');e.style.removeProperty('color');
  b.style.cssText='position:static!important;display:none;width:auto!important;height:auto!important;transform:none!important;padding:0!important;margin:0 0 0 7px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#9aa8bd!important;font-size:13px!important;line-height:1!important;cursor:pointer!important;vertical-align:middle!important;box-shadow:none!important';
  if(!e.dataset.upHoverBound334){
   e.dataset.upHoverBound334='1';
   e.addEventListener('mouseenter',function(){if(e.isContentEditable)return;e.style.setProperty('color','#4f8cff','important');b.style.setProperty('display','inline-flex','important')});
   e.addEventListener('mouseleave',function(){if(e.isContentEditable)return;e.style.removeProperty('color');b.style.setProperty('display','none','important')});
  }
  if(e.isContentEditable){b.style.setProperty('display','inline-flex','important');b.textContent='✓';b.title='Confirmar';}
 }
 function fixRecording(){
  var wrap=document.querySelector('.up-chat-input-wrap'),label=wrap&&wrap.querySelector('.up-chat-recording-label'),record=wrap&&wrap.querySelector('.up-chat-record');
  if(!wrap||!label)return;
  if(label.parentElement!==wrap){wrap.insertBefore(label,record||null);}
  var active=label.classList.contains('show')||(record&&record.classList.contains('recording'));
  label.style.setProperty('display',active?'block':'none','important');
  if(record){record.style.setProperty('align-items','center','important');record.style.setProperty('justify-content','center','important');record.style.setProperty('line-height','1','important');}
 }
 function run(){fixEmpty();fixRecording();}
 run();
 fixCategories();
 var categoryRoot=document.querySelector('#upstatus-root')||document.documentElement;
 if(categoryRoot&&typeof MutationObserver!=='undefined'){
   var categoryObserver=new MutationObserver(function(records){
     if(records.some(function(r){return Array.from(r.addedNodes||[]).some(function(n){return n.nodeType===1&&((n.matches&&n.matches('.up-chat-emoji-categories'))||(n.querySelector&&n.querySelector('.up-chat-emoji-categories')));});}))fixCategories();
   });
   categoryObserver.observe(categoryRoot,{childList:true,subtree:true});
 }
})();

;(function(){
 if(document.getElementById('upstatus-336-final-fixes'))return;
 var st=document.createElement('style');st.id='upstatus-336-final-fixes';
 st.textContent=
 '#upstatus-root .up-chat-input-wrap{position:relative!important}'+
 '#upstatus-root .up-chat-recording-label{left:50%!important;right:auto!important;top:50%!important;bottom:auto!important;transform:translate(-50%,-50%)!important;z-index:12!important;pointer-events:none!important;max-width:calc(100% - 150px)!important;text-align:center!important;display:none!important;opacity:0;transition:opacity .18s ease}'+
 '#upstatus-root .up-chat-recording-label.show{display:block!important;opacity:1}'+
 '#upstatus-root .up-chat-record-cancel{display:none!important}'+
 '#upstatus-root .up-chat-send,#upstatus-root .up-chat-record{transition:transform .2s ease,background-color .22s ease,color .22s ease,box-shadow .22s ease,opacity .18s ease!important}'+
 '#upstatus-root .up-chat-send svg,#upstatus-root .up-chat-record svg{animation:up336IconIn .18s ease both}'+
 '@keyframes up336IconIn{from{opacity:0;transform:scale(.72)}to{opacity:1;transform:scale(1)}}'+
 '#upstatus-root .up-chat-bubble.has-text{display:flex!important;flex-direction:column!important;align-items:stretch!important;position:relative!important;padding-bottom:18px!important;min-width:52px!important}'+
 '#upstatus-root .up-chat-bubble.has-text>.up-chat-text{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;padding-bottom:0!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important}'+
 '#upstatus-root .up-chat-bubble.has-text>.up-chat-own-meta,#upstatus-root .up-chat-bubble.has-text>.up-chat-incoming-time,#upstatus-root .up-chat-bubble.has-link>.up-chat-own-meta,#upstatus-root .up-chat-bubble.has-link>.up-chat-incoming-time{position:absolute!important;right:8px!important;bottom:5px!important;left:auto!important;top:auto!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;align-self:auto!important;width:max-content!important;max-width:calc(100% - 16px)!important;min-height:10px!important;float:none!important;clear:none!important;margin:0!important;line-height:1!important;box-sizing:border-box!important;text-align:right!important}'+
 '#upstatus-root .up-chat-bubble.has-text>.up-chat-own-meta{gap:3px!important}'+
 '.up-chat-emoji-menu{display:flex!important;flex-direction:column!important;height:300px!important;max-height:calc(100vh - 32px)!important;overflow:hidden!important;gap:6px!important;padding:8px!important;box-sizing:border-box!important}.up-chat-emoji-menu.hidden{display:none!important}'+
 '.up-chat-emoji-search{flex:0 0 auto!important;min-width:0!important}'+
 '.up-chat-emoji-categories{display:flex!important;flex-direction:row!important;justify-content:space-between!important;align-items:center!important;gap:3px!important;overflow-x:auto!important;overflow-y:hidden!important;border-bottom:1px solid #334158!important;border-right:0!important;padding:0 0 5px!important;min-height:0!important}'+
 '.up-chat-emoji-categories button{width:28px!important;height:28px!important;min-width:28px!important;padding:5px!important;flex:0 0 28px!important;border-radius:7px!important}'+
 '.up-chat-emoji-categories button.is-active{color:#cfe0ff!important;background:#273d5c!important;border-color:#5579a9!important;opacity:1!important;filter:none!important}'+
 '.up-chat-emoji-grid{min-width:0!important;min-height:0!important;flex:1 1 auto!important;overflow:auto!important;scroll-behavior:smooth!important}';
 (document.head||document.documentElement).appendChild(st);
})();

;(function(){if(document.getElementById('upstatus-3310-layout-fixes'))return;var st=document.createElement('style');st.id='upstatus-3310-layout-fixes';st.textContent=
'#upstatus-root .up-chat-bubble.has-text,#upstatus-root .up-chat-bubble.has-link{position:relative!important;display:block!important;box-sizing:border-box!important;padding-bottom:19px!important;min-width:52px!important}'+
'#upstatus-root .up-chat-bubble.has-text>.up-chat-text{display:block!important;width:100%!important;box-sizing:border-box!important;padding-bottom:0!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important}'+
'#upstatus-root .up-chat-bubble.has-text>.up-chat-own-meta,#upstatus-root .up-chat-bubble.has-text>.up-chat-incoming-time,#upstatus-root .up-chat-bubble.has-link>.up-chat-own-meta,#upstatus-root .up-chat-bubble.has-link>.up-chat-incoming-time{position:absolute!important;right:8px!important;bottom:5px!important;left:auto!important;top:auto!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;width:max-content!important;max-width:calc(100% - 16px)!important;margin:0!important;float:none!important;clear:none!important;line-height:1!important;text-align:right!important;z-index:2!important}'+
'#upstatus-root .up-chat-link-card{max-width:100%!important}'+
'#upstatus-root .up-chat-input-wrap{position:relative!important;min-height:42px!important;box-sizing:border-box!important;overflow:visible!important}'+
'#upstatus-root .up-chat-recording-label{position:absolute!important;left:50%!important;right:auto!important;top:50%!important;bottom:auto!important;transform:translate(-50%,-50%)!important;max-width:calc(100% - 150px)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;pointer-events:none!important;z-index:5!important;margin:0!important;box-sizing:border-box!important}'+
'#upstatus-root .up-chat-input-wrap:has(.up-chat-recording-label.show) .up-chat-input{display:none!important}'+
'#upstatus-root .up-chat-input-wrap:has(.up-chat-recording-label.show) .up-chat-emoji-btn,#upstatus-root .up-chat-input-wrap:has(.up-chat-recording-label.show) .up-chat-attach{opacity:0!important;pointer-events:none!important;width:0!important;flex-basis:0!important;margin:0!important;padding:0!important}'+
'#upstatus-root .up-chat-emoji-menu{position:absolute!important;bottom:calc(100% + 8px)!important;top:auto!important;left:0!important;right:auto!important;z-index:2147483000!important;display:flex!important;flex-direction:column!important;width:min(320px,calc(100vw - 32px))!important;height:300px!important;max-height:calc(100vh - 100px)!important;overflow:hidden!important}'+
'#upstatus-root .up-chat-emoji-menu.hidden{display:none!important}'+
'#upstatus-root .up-chat-emoji-categories{display:flex!important;flex-direction:row!important;justify-content:space-between!important;align-items:center!important;gap:3px!important;overflow-x:auto!important;overflow-y:hidden!important;flex:0 0 auto!important}'+
'#upstatus-root .up-chat-emoji-categories button{flex:0 0 28px!important;width:28px!important;height:28px!important;min-width:28px!important}'+
'#upstatus-root .up-chat-emoji-grid{flex:1 1 auto!important;min-height:0!important;overflow:auto!important}'+
'.upstatus-empty-label{white-space:nowrap!important;overflow-wrap:normal!important;word-break:normal!important}';
(document.head||document.documentElement).appendChild(st);})();

;(function(){if(document.getElementById('upstatus-3312-fix'))return;var st=document.createElement('style');st.id='upstatus-3312-fix';st.textContent=
'#upstatus-root .up-chat-emoji-menu{position:fixed!important;left:auto;right:auto;top:auto;bottom:auto;width:270px!important;max-width:calc(100vw - 16px)!important;height:300px!important;max-height:calc(100vh - 100px)!important;z-index:2147483647!important;display:flex;flex-direction:column;overflow:hidden!important;transform:none!important}'+
'#upstatus-root .up-chat-emoji-menu.hidden{display:none!important}'+
'#upstatus-root .up-chat-emoji-categories{display:flex!important;flex-direction:row!important;flex:0 0 auto!important;overflow-x:auto!important;overflow-y:hidden!important;gap:5px!important;justify-content:flex-start!important}'+
'#upstatus-root .up-chat-emoji-categories button{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 30px!important;width:30px!important;height:30px!important;padding:5px!important}'+
'#upstatus-root .up-chat-emoji-categories button svg{width:20px!important;height:20px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}'+
'#upstatus-root .up-chat-bubble.has-text,#upstatus-root .up-chat-bubble.has-link{position:relative!important;display:block!important;padding-bottom:22px!important;box-sizing:border-box!important}'+
'#upstatus-root .up-chat-bubble.has-text .up-chat-own-meta,#upstatus-root .up-chat-bubble.has-text .up-chat-incoming-time,#upstatus-root .up-chat-bubble.has-link .up-chat-own-meta,#upstatus-root .up-chat-bubble.has-link .up-chat-incoming-time{position:absolute!important;right:8px!important;bottom:5px!important;left:auto!important;top:auto!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;width:max-content!important;max-width:calc(100% - 16px)!important;margin:0!important;float:none!important;clear:none!important;text-align:right!important;white-space:nowrap!important}'+
'#upstatus-root .up-chat-bubble.has-text .up-chat-text{display:block!important;width:100%!important;box-sizing:border-box!important;padding-bottom:0!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important}';document.head.appendChild(st);
function place(){var root=document.querySelector('#upstatus-root');if(!root)return;root.querySelectorAll('.up-chat-emoji-menu:not(.hidden)').forEach(function(menu){var btn=menu.__upstatusEmojiButton||root.querySelector('.up-chat-emoji-btn');if(!btn)return;var r=btn.getBoundingClientRect(),w=Math.min(270,window.innerWidth-16),h=Math.min(300,window.innerHeight-32);menu.style.setProperty('left',Math.max(8,Math.min(window.innerWidth-w,r.left))+'px','important');menu.style.setProperty('top','auto','important');menu.style.setProperty('bottom',Math.max(8,window.innerHeight-r.top+8)+'px','important');menu.style.setProperty('width',w+'px','important');menu.style.setProperty('height',h+'px','important');});}
document.addEventListener('click',function(ev){if(ev.target&&ev.target.closest&&ev.target.closest('.up-chat-emoji-btn'))requestAnimationFrame(place)},true);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);})();
(function(){if(document.getElementById('upstatus-emoji-category-fit-3316'))return;var s=document.createElement('style');s.id='upstatus-emoji-category-fit-3316';s.textContent='.up-chat-emoji-menu .up-chat-emoji-categories{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:3px!important;justify-content:stretch!important;align-items:center!important;overflow:hidden!important;width:100%!important;box-sizing:border-box!important}.up-chat-emoji-menu .up-chat-emoji-categories button{width:100%!important;min-width:0!important;max-width:100%!important;flex:1 1 0!important;padding:4px 0!important;box-sizing:border-box!important}.up-chat-emoji-menu .up-chat-emoji-categories button svg{width:18px!important;height:18px!important;max-width:100%!important}';(document.head||document.documentElement).appendChild(s);})();

/* 3.3.22: resolve legacy inline timestamp CSS conflicts */
;(function(){
  if(document.getElementById('upstatus-3322-message-footer'))return;
  var st=document.createElement('style');
  st.id='upstatus-3322-message-footer';
  st.textContent=
    '#upstatus-root .up-chat-item:not(.own) .up-chat-bubble.has-text:has(>.up-chat-text){display:flex!important;flex-direction:column!important;align-items:stretch!important;position:relative!important;box-sizing:border-box!important;min-width:76px!important;padding:6px 9px 7px!important;width:fit-content!important;max-width:min(86%,520px)!important;white-space:normal!important}'+
    '#upstatus-root .up-chat-item.own .up-chat-bubble.has-text:has(>.up-chat-text){display:flex!important;flex-direction:column!important;align-items:stretch!important;position:relative!important;box-sizing:border-box!important;min-width:76px!important;padding:6px 9px 7px!important;padding-bottom:7px!important;width:fit-content!important;max-width:min(86%,520px)!important;white-space:normal!important}'+
    '#upstatus-root .up-chat-item:not(.own) .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-text,#upstatus-root .up-chat-item.own .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-text{display:block!important;flex:0 1 auto!important;width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important;padding:0!important;box-sizing:border-box!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.25!important}'+
    '#upstatus-root .up-chat-item:not(.own) .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-incoming-time,#upstatus-root .up-chat-item.own .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-own-meta{position:static!important;inset:auto!important;display:flex!important;flex:0 0 auto!important;align-self:stretch!important;justify-content:flex-end!important;align-items:center!important;width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important;margin:5px 0 0!important;padding:0!important;float:none!important;clear:none!important;white-space:nowrap!important;text-align:right!important;line-height:1!important;vertical-align:baseline!important;order:90!important}'+
    '#upstatus-root .up-chat-item.own .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-own-meta{gap:3px!important}'+
    '#upstatus-root .up-chat-item:not(.own) .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-meta{display:flex!important;flex:0 0 auto!important;width:100%!important;margin:0 0 2px!important}'+
    '#upstatus-root .up-chat-item:not(.own) .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-reactions,#upstatus-root .up-chat-item.own .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-reactions{flex:0 0 auto!important;width:100%!important;order:100!important}';
  (document.head||document.documentElement).appendChild(st);
})();

/* 3.4.0.15: compacto por padrão; dimensões persistentes e redimensionamento pela borda do cartão Team Lite. */

/* 3.4.0.16: remove overrides that blocked normal panel resizing; restore UpStatus panel styling and retain integrated Team Lite chat. */


/* 3.4.0.21: regras finais e únicas para o layout integrado e o rodapé das mensagens Team Lite. */
;(function applyTeamLiteLayoutAndMessageFooter(){
  if(document.getElementById('upstatus-team-lite-layout-final-v3421'))return;
  var st=document.createElement('style');
  st.id='upstatus-team-lite-layout-final-v3421';
  st.textContent=
    /* O cartão é o único dono da altura; cabeçalho e voz usam altura natural. */
    '#upstatus-team-lite-root #upstatus-card.team-lite-chat-mode{display:flex!important;flex-direction:column!important;box-sizing:border-box!important;min-height:0!important;overflow:hidden!important}'+
    '#upstatus-team-lite-root #upstatus-card.team-lite-chat-mode>.up-head{flex:0 0 auto!important;min-width:0!important}'+
    '#upstatus-team-lite-root #upstatus-card.team-lite-chat-mode>.up-voice-room{flex:0 0 auto!important;min-width:0!important}'+
    /* Chat recebe só o espaço que sobrou, sem altura mínima que empurre o compositor. */
    '#upstatus-team-lite-root #upstatus-card.team-lite-chat-mode>#upstatus-chat{position:relative!important;display:flex!important;flex:1 1 0!important;flex-direction:column!important;width:100%!important;min-width:0!important;min-height:0!important;height:0!important;max-height:none!important;overflow:hidden!important;box-sizing:border-box!important}'+
    '#upstatus-team-lite-root #upstatus-card.team-lite-chat-mode>#upstatus-chat:not(.hidden){display:flex!important}'+
    '#upstatus-team-lite-root #upstatus-card.team-lite-chat-mode>#upstatus-chat>.up-history-head{flex:0 0 auto!important;min-width:0!important}'+
    '#upstatus-team-lite-root #upstatus-card.team-lite-chat-mode>#upstatus-chat>.up-chat-list{display:block!important;flex:1 1 0!important;min-width:0!important;min-height:0!important;height:0!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain!important;box-sizing:border-box!important;margin-top:4px!important;padding-bottom:8px!important}'+
    '#upstatus-team-lite-root #upstatus-card.team-lite-chat-mode>#upstatus-chat>.up-chat-typing{flex:0 0 auto!important;min-width:0!important}'+
    '#upstatus-team-lite-root #upstatus-card.team-lite-chat-mode>#upstatus-chat>.up-chat-compose{position:relative!important;display:flex!important;flex:0 0 auto!important;min-width:0!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin-top:6px!important;z-index:5!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-input-wrap{flex:1 1 auto!important;min-width:0!important;width:auto!important;max-width:100%!important;box-sizing:border-box!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-input{flex:1 1 auto!important;min-width:0!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-system-event{display:flex!important;justify-content:center!important;box-sizing:border-box!important;margin:0!important;padding:3px 0!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-system-event span{padding:4px 8px!important;font-size:10px!important;line-height:1.2!important}'+
    /* Reutiliza o rodapé de mensagens do UpStatus: texto acima, hora/ticks abaixo à direita. */
    '#upstatus-team-lite-root #upstatus-chat .up-chat-item:not(.own) .up-chat-bubble.has-text:has(>.up-chat-text),#upstatus-team-lite-root #upstatus-chat .up-chat-item.own .up-chat-bubble.has-text:has(>.up-chat-text){display:flex!important;flex-direction:column!important;align-items:stretch!important;position:relative!important;box-sizing:border-box!important;min-width:76px!important;padding:6px 9px 7px!important;width:fit-content!important;max-width:min(86%,520px)!important;white-space:normal!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-item:not(.own) .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-text,#upstatus-team-lite-root #upstatus-chat .up-chat-item.own .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-text{display:block!important;flex:0 1 auto!important;width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important;padding:0!important;box-sizing:border-box!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.25!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-item:not(.own) .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-incoming-time,#upstatus-team-lite-root #upstatus-chat .up-chat-item.own .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-own-meta{position:static!important;inset:auto!important;display:flex!important;flex:0 0 auto!important;align-self:stretch!important;justify-content:flex-end!important;align-items:center!important;width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important;margin:5px 0 0!important;padding:0!important;float:none!important;clear:none!important;white-space:nowrap!important;text-align:right!important;line-height:1!important;vertical-align:baseline!important;order:90!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-item.own .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-own-meta{gap:3px!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-item:not(.own) .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-meta{display:flex!important;flex:0 0 auto!important;width:100%!important;margin:0 0 2px!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-item:not(.own) .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-reactions,#upstatus-team-lite-root #upstatus-chat .up-chat-item.own .up-chat-bubble.has-text:has(>.up-chat-text)>.up-chat-reactions{flex:0 0 auto!important;width:100%!important;order:100!important}';
  (document.head||document.documentElement).appendChild(st);
})();

/* 3.4.0.22: requested Team Lite guest behavior and compact controls. */
;(function applyTeamLiteGuestPolish(){
  if(document.getElementById('upstatus-team-lite-guest-polish-v3422'))return;
  var st=document.createElement('style');st.id='upstatus-team-lite-guest-polish-v3422';
  st.textContent=
    '#upstatus-team-lite-root .team-lite-head-status{display:none!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-profile-btn{display:none!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-title-wrap{margin-left:0!important;gap:0!important;justify-content:flex-start!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-library,#upstatus-team-lite-root #upstatus-chat .up-chat-back{display:none!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-recording-label{position:static!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;display:none!important;flex:0 1 auto!important;align-self:center!important;max-width:100%!important;min-width:0!important;margin:0 6px 0 0!important;padding:4px 6px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;box-sizing:border-box!important;z-index:2!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-recording-label.show{display:inline-flex!important}'+
    '#upstatus-team-lite-root .up-chat-emoji-menu:not(.hidden){display:flex!important;flex-direction:column!important;min-height:0!important;overflow:hidden!important}'+
    '#upstatus-team-lite-root .up-chat-emoji-categories{position:relative!important;z-index:5!important;display:flex!important;flex:0 0 32px!important;min-height:32px!important;height:32px!important;align-items:center!important;overflow:visible!important;background:#182130!important;padding:0 0 5px!important;box-sizing:border-box!important}'+
    '#upstatus-team-lite-root .up-chat-emoji-categories button{position:relative!important;z-index:6!important;flex:0 0 28px!important;min-width:28px!important;height:28px!important}'+
    '#upstatus-team-lite-root .up-chat-emoji-grid{position:relative!important;z-index:1!important;display:block!important;flex:1 1 0!important;min-height:0!important;height:0!important;overflow-y:auto!important;overflow-x:hidden!important;padding-top:2px!important;box-sizing:border-box!important}'+
    '#upstatus-team-lite-root .up-chat-emoji-group{position:relative!important;display:flex!important;flex-wrap:wrap!important;align-content:flex-start!important;scroll-margin-top:4px!important}'+
    '#upstatus-team-lite-root .up-chat-emoji-heading{position:relative!important;z-index:2!important;display:block!important;flex:0 0 100%!important;width:100%!important;background:#182130!important;padding-top:7px!important}';
  (document.head||document.documentElement).appendChild(st);
})();


/* 3.4.9: consolidated Team Lite light-theme contrast pass. This stylesheet is deliberately last to win over legacy overrides. */
;(function installTeamLiteThemeAudit349(){
  if(document.getElementById('upstatus-team-lite-theme-audit-349'))return;
  var st=document.createElement('style');st.id='upstatus-team-lite-theme-audit-349';
  st.textContent=
  '#upstatus-team-lite-root.up-theme-light,#upstatus-team-lite-root.up-theme-light #upstatus-card.team-lite-chat-mode{color:#1e293b!important;background:#f7f9fc!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card.team-lite-chat-mode{background:linear-gradient(145deg,#fff 0%,#f3f6fb 100%)!important;border-color:#cbd5e1!important;box-shadow:0 18px 42px rgba(15,23,42,.16)!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-title,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-head .up-title,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-head .up-title *{color:#172033!important;text-shadow:none!important;opacity:1!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-you,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-head .up-you{color:#526176!important;text-shadow:none!important;opacity:1!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-head,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-head *{text-shadow:none!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .team-lite-theme,#upstatus-team-lite-root.up-theme-light #upstatus-card .team-lite-minimize,#upstatus-team-lite-root.up-theme-light #upstatus-card .team-lite-close{background:#e8edf4!important;border:1px solid #cbd5e1!important;color:#334155!important;box-shadow:none!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .team-lite-logout{background:#fce7eb!important;border:1px solid #f3bdc8!important;color:#9f1239!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-room{background:#f8fbff!important;border:1px solid #c5d5e8!important;color:#1e293b!important;box-shadow:0 2px 8px rgba(15,23,42,.06)!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-room *{text-shadow:none!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-title,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-title *{color:#1e293b!important;opacity:1!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-state,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-message,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-empty,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-empty *{color:#64748b!important;opacity:1!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-connection{color:#087443!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-person,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-room.is-joined .up-voice-person{background:#fff!important;border:1px solid #9fb4ce!important;border-radius:999px!important;color:#1e293b!important;box-shadow:0 1px 3px rgba(15,23,42,.08)!important;opacity:1!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-person b,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-person span{color:#1e293b!important;opacity:1!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-person.is-speaking,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-room.is-joined .up-voice-person.is-speaking{background:#eff6ff!important;border:1px solid #3b82f6!important;border-radius:999px!important;color:#1e293b!important;box-shadow:0 0 0 2px rgba(59,130,246,.14)!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-person.is-speaking .up-voice-avatar{border:2px solid #3b82f6!important;box-shadow:0 0 0 2px rgba(59,130,246,.16)!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-person .up-voice-avatar{border-radius:50%!important;object-fit:cover!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-actions button:not(.up-voice-join):not(.up-voice-leave),#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-control-bubble button:not(.up-voice-control-leave){background:#e7eef8!important;border:1px solid #c5d3e5!important;color:#334155!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-actions button svg,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-control-bubble button svg{color:currentColor!important;stroke:currentColor!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-actions .up-voice-join{background:#168153!important;border:1px solid #168153!important;color:#fff!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-actions .up-voice-leave,#upstatus-team-lite-root.up-theme-light #upstatus-card .up-voice-control-bubble .up-voice-control-leave{background:#c62845!important;border:1px solid #c62845!important;color:#fff!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat,#upstatus-team-lite-root.up-theme-light #upstatus-chat *{text-shadow:none!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat{background:transparent!important;color:#1e293b!important;border-color:#d7dee9!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-history-head,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-history-head *{color:#1e293b!important;opacity:1!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-history-title{color:#172033!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-header-info,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-date-divider{color:#64748b!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-list{background:transparent!important;color:#1e293b!important;scrollbar-color:#cbd5e1 transparent!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-text,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-text *{color:#1e293b!important;opacity:1!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-meta,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-meta b,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-incoming-time,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-own-time{color:#526176!important;opacity:1!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-item:not(.own) .up-chat-bubble{background:#fff!important;border-color:#d3dce8!important;color:#1e293b!important;box-shadow:0 1px 4px rgba(15,23,42,.06)!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-item.own .up-chat-bubble{background:#dbeafe!important;border-color:#a9c7f3!important;color:#1e293b!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-bubble:before{background:#fff!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-item.own .up-chat-bubble:before{background:#dbeafe!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-read{color:#64748b!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-read.read{color:#1677ff!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-system-event,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-system-event span{background:transparent!important;border:0!important;box-shadow:none!important;color:#64748b!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-input-wrap{background:#fff!important;border:1px solid #cbd5e1!important;box-shadow:0 1px 4px rgba(15,23,42,.05)!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-input{background:transparent!important;color:#1e293b!important;caret-color:#1e293b!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-input::placeholder{color:#94a3b8!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-emoji-btn,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-attach,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-record{background:transparent!important;border-color:transparent!important;color:#475569!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-send{background:#4f7dff!important;border:0!important;color:#fff!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-quoted,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-reply-bar,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-reaction{background:#eef2f7!important;border-color:#cbd5e1!important;color:#334155!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-context-menu,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-emoji-menu{background:#fff!important;border-color:#cbd5e1!important;color:#1e293b!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-context-action{color:#1e293b!important}'+
  '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-context-action:hover{background:#eef2f7!important}'+
  '#upstatus-team-lite-root.up-theme-light .up-update-prompt-box,#upstatus-team-lite-root.up-theme-light .up-patch-dialog{background:#fff!important;border-color:#cbd5e1!important;color:#1e293b!important}'+
  '#upstatus-team-lite-root.up-theme-light .up-update-prompt-title,#upstatus-team-lite-root.up-theme-light .up-update-prompt-text,#upstatus-team-lite-root.up-theme-light .up-patch-title,#upstatus-team-lite-root.up-theme-light .up-patch-version-title,#upstatus-team-lite-root.up-theme-light .up-patch-list{color:#1e293b!important}'+
  '#upstatus-team-lite-root.up-theme-light .up-update-prompt-actions button,#upstatus-team-lite-root.up-theme-light .up-patch-close{background:#e8edf4!important;border-color:#cbd5e1!important;color:#334155!important}';
  (document.head||document.documentElement).appendChild(st);
})();




/* 3.4.11: deterministic composer and voice-room layout. */
;(function installTeamLiteComposerVoiceFix3411(){
 if(document.getElementById('upstatus-team-lite-composer-voice-fix-3411'))return;
 var st=document.createElement('style');st.id='upstatus-team-lite-composer-voice-fix-3411';
 st.textContent=
 '#upstatus-team-lite-root #upstatus-chat .up-chat-compose{display:block!important;width:100%!important;min-width:0!important;box-sizing:border-box!important}'+
 '#upstatus-team-lite-root #upstatus-chat .up-chat-input-wrap{position:relative!important;display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;gap:5px!important;width:100%!important;min-width:0!important;max-width:100%!important;min-height:44px!important;overflow:hidden!important;box-sizing:border-box!important}'+
 '#upstatus-team-lite-root #upstatus-chat .up-chat-input-wrap>.up-chat-recording-label{display:none!important;position:static!important;inset:auto!important;transform:none!important;flex:1 1 auto!important;order:2!important;align-items:center!important;justify-content:flex-start!important;min-width:0!important;max-width:none!important;margin:0!important;padding:0 5px!important;overflow:hidden!important;white-space:nowrap!important;text-overflow:ellipsis!important;line-height:1.25!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;pointer-events:none!important}'+
 '#upstatus-team-lite-root #upstatus-chat .up-chat-input-wrap>.up-chat-recording-label.show{display:flex!important}'+
 '#upstatus-team-lite-root #upstatus-chat .up-chat-input-wrap:has(>.up-chat-recording-label.show)>.up-chat-input{display:none!important}'+
 '#upstatus-team-lite-root #upstatus-chat .up-chat-input-wrap:has(>.up-chat-recording-label.show)>.up-chat-emoji-btn,#upstatus-team-lite-root #upstatus-chat .up-chat-input-wrap:has(>.up-chat-recording-label.show)>.up-chat-attach{display:none!important}'+
 '#upstatus-team-lite-root #upstatus-chat .up-chat-input-wrap>.up-chat-record{order:3!important;flex:0 0 34px!important;width:34px!important;min-width:34px!important;height:34px!important;margin:0!important}'+
 '#upstatus-team-lite-root #upstatus-chat .up-chat-input-wrap>.up-chat-send{order:4!important;flex:0 0 34px!important;width:34px!important;min-width:34px!important;height:34px!important;margin:0!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty):not(.is-joined){display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto!important;column-gap:10px!important;row-gap:8px!important;align-items:start!important;position:relative!important;min-width:0!important;padding:10px!important;overflow:hidden!important;box-sizing:border-box!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty):not(.is-joined)>.up-voice-head{grid-column:1!important;grid-row:1!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:3px!important;position:static!important;width:auto!important;min-width:0!important;min-height:34px!important;margin:0!important;padding:0!important;box-sizing:border-box!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty):not(.is-joined)>.up-voice-actions{grid-column:2!important;grid-row:1!important;position:static!important;inset:auto!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:4px!important;width:auto!important;max-width:none!important;margin:0!important;padding:0!important;transform:none!important;z-index:2!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty):not(.is-joined)>.up-voice-actions>.up-voice-join{position:static!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:none!important;height:30px!important;min-height:30px!important;margin:0!important;padding:5px 10px!important;transform:none!important;white-space:nowrap!important;line-height:1!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty):not(.is-joined)>.up-voice-participants{grid-column:1/-1!important;grid-row:2!important;position:static!important;display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:6px!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important;overflow:visible!important;box-sizing:border-box!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty):not(.is-joined)>.up-voice-message{grid-column:1/-1!important;grid-row:3!important;min-width:0!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room:not(.is-empty):not(.is-joined)>.up-screen-share-panel{grid-column:1/-1!important;min-width:0!important}';
 (document.head||document.documentElement).appendChild(st);
})();


/* 3.4.13: fix room controls without shifting participants; persist one drag coordinate system. */
;(function installTeamLiteJoinedVoiceAndDragFix3413(){
 if(document.getElementById('upstatus-team-lite-joined-voice-drag-fix-3413'))return;
 var st=document.createElement('style');st.id='upstatus-team-lite-joined-voice-drag-fix-3413';
 st.textContent=
 '#upstatus-team-lite-root #upstatus-card .up-voice-room.is-joined .up-voice-actions .up-voice-join,#upstatus-team-lite-root #upstatus-card .up-voice-room.is-joined .up-voice-join{display:none!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room.is-joined{position:relative!important;box-sizing:border-box!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room.is-joined .up-voice-head{position:relative!important;display:block!important;min-height:30px!important;padding-right:150px!important;margin:0 0 8px!important;box-sizing:border-box!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room.is-joined .up-voice-actions{position:absolute!important;top:7px!important;right:8px!important;left:auto!important;bottom:auto!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:4px!important;width:auto!important;max-width:100%!important;margin:0!important;padding:0!important;transform:none!important;z-index:5!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room.is-joined .up-voice-actions button:not(.up-voice-join){position:static!important;flex:0 0 auto!important;margin:0!important;transform:none!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-voice-room.is-joined .up-voice-persons,#upstatus-team-lite-root #upstatus-card .up-voice-room.is-joined .up-voice-participants{position:relative!important;margin-top:6px!important;padding-right:0!important}';
 (document.head||document.documentElement).appendChild(st);
})();

;(function installTeamLiteReleasePolish3414(){
 if(document.getElementById('team-lite-release-polish-3414'))return;
 var st=document.createElement('style');st.id='team-lite-release-polish-3414';
 st.textContent='#upstatus-team-lite-root .up-voice-control-bubble{position:fixed!important;right:24px;bottom:24px;left:auto!important;top:auto!important;cursor:grab;touch-action:none;z-index:2147483647!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble:active{cursor:grabbing}'+
 '#upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-restore{position:absolute!important;left:-8px!important;top:-10px!important;width:25px!important;height:25px!important;min-width:25px!important;flex:0 0 25px!important;border-radius:50%!important;background:#17865b!important;border:2px solid #83e6ba!important;color:#fff!important;z-index:12!important;box-shadow:0 2px 8px #0009!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-restore.hidden{display:inline-flex!important}'+
 '#upstatus-team-lite-root .up-update-prompt{position:fixed!important;inset:0!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:20px!important;background:rgba(4,9,18,.58)!important;backdrop-filter:blur(7px)!important;-webkit-backdrop-filter:blur(7px)!important}'+
 '#upstatus-team-lite-root .up-update-prompt-box{max-width:360px!important;width:100%!important;border:1px solid #40536c!important;border-radius:16px!important;background:#172233!important;color:#eef4ff!important;box-shadow:0 24px 80px #0009!important;padding:22px!important}'+
 '#upstatus-team-lite-root .up-update-prompt-title{font-size:18px!important;font-weight:800!important;margin-bottom:10px!important}'+
 '#upstatus-team-lite-root .up-update-prompt-text{font-size:13px!important;line-height:1.55!important;color:#bdcbe0!important}'+
 '#upstatus-team-lite-root .up-update-prompt-actions{display:flex!important;justify-content:flex-end!important;gap:8px!important;margin-top:20px!important}'+
 '#upstatus-team-lite-root .up-update-prompt-actions button{border-radius:9px!important;padding:9px 13px!important;cursor:pointer!important}';
 (document.head||document.documentElement).appendChild(st);
})();


/* 3.4.16: final UI alignment, robust call mini-launcher, and top-right voice controls. */
;(function installTeamLiteFinalPolish3416(){
 if(document.getElementById('upstatus-team-lite-final-polish-3416'))return;
 var st=document.createElement('style');st.id='upstatus-team-lite-final-polish-3416';
 st.textContent=
 '#upstatus-team-lite-root{position:fixed!important;right:24px!important;bottom:24px!important;left:auto!important;top:auto!important;transform:none!important;box-sizing:border-box!important}'+
 '#upstatus-team-lite-root #upstatus-card{margin:0!important;transform:none!important}'+
 '#upstatus-team-lite-root #upstatus-card .up-login,#upstatus-team-lite-root #upstatus-card .up-login-wrap,#upstatus-team-lite-root #upstatus-card .up-login-panel{box-sizing:border-box!important;width:100%!important;max-width:100%!important;margin:0!important}'+
 '#upstatus-team-lite-root .up-voice-room.is-joined .up-voice-head{padding-right:0!important;margin:0 0 8px!important;min-height:0!important}'+
 '#upstatus-team-lite-root .up-voice-room.is-joined .up-voice-title{padding-right:0!important;box-sizing:border-box!important;max-width:calc(100% - 150px)!important;overflow-wrap:normal!important}'+
 '#upstatus-team-lite-root .up-voice-room.is-joined .up-voice-actions{position:absolute!important;top:8px!important;right:8px!important;bottom:auto!important;left:auto!important;align-self:flex-start!important;transform:none!important;margin:0!important;z-index:5!important}'+
 '#upstatus-team-lite-root .up-voice-room.is-joined .up-voice-actions button{width:30px!important;height:30px!important;min-height:30px!important;padding:5px!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble{position:fixed!important;right:24px!important;bottom:24px!important;left:auto!important;top:auto!important;display:none!important;align-items:center!important;justify-content:center!important;gap:6px!important;min-width:0!important;min-height:0!important;padding:7px 9px 7px 36px!important;border:1px solid #405673!important;border-radius:15px!important;background:#172233!important;box-shadow:0 12px 34px #0008!important;z-index:2147483647!important;cursor:grab!important;touch-action:none!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble.show{display:flex!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-restore{position:absolute!important;left:5px!important;top:50%!important;transform:translateY(-50%)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:25px!important;height:25px!important;min-width:25px!important;min-height:25px!important;padding:0!important;border-radius:8px!important;background:#17865b!important;border:1px solid #83e6ba!important;color:#fff!important;box-shadow:none!important;z-index:12!important;cursor:pointer!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-restore.hidden{display:none!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-restore svg{width:15px!important;height:15px!important;display:block!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-speaker{display:none!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble>button:not(.up-voice-control-restore){position:static!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;flex:0 0 34px!important;margin:0!important;border-radius:10px!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble .up-voice-control-leave{background:#b4233d!important;border-color:#e34b62!important;color:#fff!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble:not(.show){display:none!important}';
 (document.head||document.documentElement).appendChild(st);
})();

/* 3.4.21: correct call action geometry and make the minimized-call bar independent of panel visibility. */
;(function(){
 if(document.getElementById('team-lite-voice-header-fix-3421'))return;
 var st=document.createElement('style');st.id='team-lite-voice-header-fix-3421';
 st.textContent=
 '#upstatus-team-lite-root .up-voice-room.is-joined{position:relative!important;padding-top:10px!important}'+
 '#upstatus-team-lite-root .up-voice-room.is-joined .up-voice-head{display:block!important;position:relative!important;min-height:38px!important;padding:0 150px 0 0!important;margin:0 0 8px!important;box-sizing:border-box!important}'+
 '#upstatus-team-lite-root .up-voice-room.is-joined .up-voice-title{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;padding:0!important;margin:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:17px!important}'+
 '#upstatus-team-lite-root .up-voice-room.is-joined .up-voice-state{display:block!important;position:absolute!important;left:0!important;top:18px!important;right:150px!important;max-width:none!important;margin:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:14px!important}'+
 '#upstatus-team-lite-root .up-voice-room.is-joined .up-voice-actions{position:absolute!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:5px!important;top:10px!important;right:10px!important;bottom:auto!important;left:auto!important;width:max-content!important;margin:0!important;padding:0!important;transform:none!important;z-index:10!important}'+
 '#upstatus-team-lite-root .up-voice-room.is-joined .up-voice-actions button{width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;flex:0 0 30px!important;padding:0!important}'+
 '#upstatus-team-lite-root .up-voice-room.is-joined .up-voice-participants{display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:7px!important;padding-right:0!important;margin-top:0!important;min-height:34px!important}'+
 'body>.up-voice-control-bubble{position:fixed!important;z-index:2147483647!important;pointer-events:auto!important}'+
 'body>.up-voice-control-bubble.show{display:flex!important}';
 (document.head||document.documentElement).appendChild(st);
 var sync=voiceControlSyncVisibility;
 voiceControlSyncVisibility=function(){
   if(voiceControlBubble&&document.body&&voiceControlBubble.parentElement!==document.body)document.body.appendChild(voiceControlBubble);
   if(typeof sync==='function')sync();
   if(voiceControlBubble){
     var panelOpen=!!((card&&!card.classList.contains('hidden'))||(history&&!history.classList.contains('hidden'))||(chat&&!chat.classList.contains('hidden'))||(health&&!health.classList.contains('hidden')));
     var show=!!(voiceRoom&&voiceRoom.active&&!panelOpen);
     voiceControlBubble.classList.toggle('show',show);
     voiceControlBubble.style.setProperty('display',show?'flex':'none','important');
     voiceControlBubble.setAttribute('aria-hidden',show?'false':'true');
   }
 };
 var originalToggle=toggleTeamLitePanel;
 toggleTeamLitePanel=function(){
   if(typeof originalToggle==='function')originalToggle();
   if(voiceControlBubble&&document.body&&voiceControlBubble.parentElement!==document.body)document.body.appendChild(voiceControlBubble);
   voiceControlSyncVisibility();
 };
 if(voiceControlBubble&&document.body&&voiceControlBubble.parentElement!==document.body)document.body.appendChild(voiceControlBubble);
 voiceControlSyncVisibility();
})();

/* 3.4.22: hide the floating call controls outside an active, minimized call and remove decorative tail. */
;(function(){
 if(document.getElementById('team-lite-minimized-call-guard-3422'))return;
 var st=document.createElement('style');st.id='team-lite-minimized-call-guard-3422';
 st.textContent=
 '#upstatus-team-lite-root .up-voice-control-bubble:before,#upstatus-team-lite-root .up-voice-control-bubble:after,body>.up-voice-control-bubble:before,body>.up-voice-control-bubble:after{content:none!important;display:none!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble{border-radius:14px!important;padding-left:36px!important}'+
 '#upstatus-team-lite-root .up-voice-control-bubble:not(.show){display:none!important}'+
 'body>.up-voice-control-bubble:not(.show){display:none!important}';
 (document.head||document.documentElement).appendChild(st);
 var priorSync=voiceControlSyncVisibility;
 voiceControlSyncVisibility=function(){
   if(voiceControlBubble&&document.body&&voiceControlBubble.parentElement!==document.body)document.body.appendChild(voiceControlBubble);
   if(typeof priorSync==='function')priorSync();
   if(!voiceControlBubble)return;
   var panelOpen=!!((card&&!card.classList.contains('hidden'))||(history&&!history.classList.contains('hidden'))||(chat&&!chat.classList.contains('hidden'))||(health&&!health.classList.contains('hidden')));
   var callActive=!!(voiceRoom&&voiceRoom.active);
   var show=callActive&&!panelOpen;
   voiceControlBubble.classList.toggle('show',show);
   voiceControlBubble.style.setProperty('display',show?'flex':'none','important');
   voiceControlBubble.setAttribute('aria-hidden',show?'false':'true');
 };
 // The screen-share icon is an action button, not a "currently sharing" indicator.
 // Its active visual state must only reflect an actual local stream.
 var priorScreenRender=screenShareRender;
 screenShareRender=function(){
   if(typeof priorScreenRender==='function')priorScreenRender();
   var btn=card&&card.querySelector('.up-screen-share-toggle');
   if(btn){
     btn.classList.toggle('is-sharing',!!(screenShare&&screenShare.active&&screenShare.stream));
     btn.setAttribute('aria-pressed',screenShare&&screenShare.active&&screenShare.stream?'true':'false');
     btn.title=screenShare&&screenShare.active&&screenShare.stream?'Parar compartilhamento de tela':'Compartilhar tela';
   }
 };
 voiceControlSyncVisibility();

/* 3.4.27: final sender borders, neutral tails, and compact system events. */
;(function installTeamLiteChatPolish3427(){
  if(document.getElementById('upstatus-team-lite-chat-polish-3427'))return;
  var st=document.createElement('style');
  st.id='upstatus-team-lite-chat-polish-3427';
  st.textContent=
    '#upstatus-team-lite-root #upstatus-chat .up-chat-item.lucca:not(.own) .up-chat-bubble{background:linear-gradient(145deg,#2a3549,#252f41)!important;color:#e7edf7!important;border:1px solid #a855f7!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:0 4px 14px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.035)!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-item.ycaro:not(.own) .up-chat-bubble{border:1px solid #f97316!important;box-shadow:0 0 0 1px rgba(249,115,22,.14),0 4px 14px rgba(0,0,0,.16)!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-item.group-start.lucca:not(.own) .up-chat-bubble:before,#upstatus-team-lite-root #upstatus-chat .up-chat-item.group-start.ycaro:not(.own) .up-chat-bubble:before{background:#2a3549!important;border:0!important;box-shadow:none!important;filter:none!important}'+
    '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-item.group-start.lucca:not(.own) .up-chat-bubble:before,#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-item.group-start.ycaro:not(.own) .up-chat-bubble:before{background:#e7edf5!important;border:0!important;box-shadow:none!important;filter:none!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-system-event{display:flex!important;justify-content:center!important;align-items:center!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin:2px 0!important;padding:1px 0!important;min-height:0!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-system-event span{display:inline-block!important;width:auto!important;max-width:88%!important;box-sizing:border-box!important;padding:2px 7px!important;margin:0!important;border:1px solid rgba(148,163,184,.22)!important;border-radius:999px!important;background:rgba(100,116,139,.08)!important;color:#8f9db2!important;font-size:10px!important;font-weight:500!important;line-height:1.25!important;letter-spacing:0!important;text-align:center!important;white-space:normal!important;box-shadow:none!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-system-event.join span{background:rgba(34,197,94,.06)!important;border-color:rgba(34,197,94,.18)!important;color:#8fae9e!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-system-event.leave span{background:rgba(148,163,184,.07)!important;border-color:rgba(148,163,184,.2)!important;color:#9aa4b4!important}'+
    '#upstatus-team-lite-root #upstatus-chat .up-chat-system-event.clear span{background:rgba(79,125,255,.07)!important;border-color:rgba(79,125,255,.2)!important;color:#a9c2ff!important}'+
    '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-system-event span{background:rgba(100,116,139,.04)!important;border-color:rgba(100,116,139,.2)!important;color:#64748b!important}'+
    '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-system-event.join span{background:rgba(22,163,74,.045)!important;border-color:rgba(22,163,74,.18)!important;color:#527b62!important}'+
    '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-system-event.leave span{background:rgba(100,116,139,.04)!important;border-color:rgba(100,116,139,.2)!important;color:#64748b!important}'+
    '#upstatus-team-lite-root.up-theme-light #upstatus-chat .up-chat-system-event.clear span{background:rgba(79,125,255,.05)!important;border-color:rgba(79,125,255,.2)!important;color:#5875ac!important}';
  (document.head||document.documentElement).appendChild(st);
})();


})();
