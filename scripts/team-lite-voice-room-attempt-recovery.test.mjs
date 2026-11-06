import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const template = readFileSync("team-lite/upstatus-team-lite.user.js", "utf8");
const helperStart = template.indexOf("function signalPendingVoiceRoomAttemptsStorageKey(");
const helperEnd = template.indexOf("function signalTransportRequest(", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "voice-room durable-attempt helper boundaries must exist");
const helperSource = template.slice(helperStart, helperEnd) +
  "\nthis.__candidateStorageKey = signalPendingVoiceRoomAttemptsStorageKey;" +
  "\nthis.__candidateNormalize = signalNormalizePendingVoiceRoomAttemptRecord;" +
  "\nthis.__candidateNewId = signalNewVoiceRoomAttemptId;" +
  "\nthis.__candidateTrack = signalTrackPendingVoiceRoomAttempt;" +
  "\nthis.__candidateRestore = signalRestorePendingVoiceRoomAttempts;" +
  "\nthis.__candidateAttemptCancel = signalAttemptPendingVoiceRoomCancel;" +
  "\nthis.__candidateRetry = signalRetryPendingVoiceRoomAttempts;";

function makeContext(options = {}) {
  const storage = options.storage || new Map();
  const member = options.member || "Team Lite Tester";
  const context = {
    key: "upstatus_team_lite_",
    member,
    token: "session-token-must-not-be-persisted",
    signalPendingVoiceRoomAttempts: Object.create(null),
    signalPendingVoiceRoomStorageHealthy: true,
    signalVoiceRoomAttemptId: options.currentAttemptId || "",
    signalVoiceRoomRoomId: "",
    signalVoiceRoomCreator: false,
    signalVoiceRoomPrepared: false,
    signalTransport: options.transport || null,
    voiceRoom: { active: !!options.active, joining: !!options.joining },
    signalHasControlChars(value) {
      for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code < 32 || code === 127) return true;
      }
      return false;
    },
    GM_getValue(key, fallback) {
      if (options.readThrows) throw new Error("storage read failed");
      return storage.has(key) ? storage.get(key) : fallback;
    },
    GM_setValue(key, value) {
      if (options.writeThrows || (options.shouldThrowWrite && options.shouldThrowWrite())) {
        throw new Error("storage write failed");
      }
      storage.set(key, JSON.parse(JSON.stringify(value)));
    },
    Date, Math, Object, Array, String, Number, Promise, Error, RegExp, encodeURIComponent,
  };
  vm.runInNewContext(helperSource, context, { timeout: 1000 });
  context.storage = storage;
  return context;
}

const storage = new Map();
const initial = makeContext({ storage });
const attemptId = initial.__candidateNewId();
assert.match(attemptId, /^Team_Lite_Tester-voice-[A-Za-z0-9._:-]+$/);
assert.ok(attemptId.length <= 128);
assert.equal(initial.__candidateTrack("upstatus-team-room-v1", attemptId), true,
  "Normal must persist the member-bound voice attempt before /room/open");
const emojiMember = makeContext({ member: "Voice😀Tester" });
const emojiAttemptId = emojiMember.__candidateNewId();
assert.ok(emojiAttemptId.startsWith("Voice_Tester-voice-"),
  "JavaScript prefix normalization must match PostgreSQL code-point replacement for non-BMP names");
assert.equal(emojiMember.__candidateTrack("upstatus-team-room-v1", emojiAttemptId), true);
const storageKey = initial.__candidateStorageKey("Team Lite Tester");
const envelope = storage.get(storageKey);
assert.equal(envelope.version, 1);
assert.equal(envelope.entries.length, 1);
assert.deepEqual(Object.keys(envelope.entries[0]).sort(), ["attemptId", "createdAt", "logicalId", "member"]);
assert.equal(Object.hasOwn(envelope.entries[0], "token"), false,
  "voice-room attempt persistence must never contain a session token");

let cancelCalls = 0;
const restored = makeContext({
  storage,
  transport: {
    cancelVoiceRoomOpen: async (logicalId, id) => {
      cancelCalls++;
      assert.equal(logicalId, "upstatus-team-room-v1");
      assert.equal(id, attemptId);
      return { ok: true, cancelled: true, notFound: true };
    },
  },
});
assert.equal(restored.__candidateRestore(), 1, "same-member reload must restore the pending voice attempt");
assert.equal(await restored.__candidateRetry(), true,
  "same-member authenticated reload must cancel an attempt even when the room ID was never received");
assert.equal(cancelCalls, 1);
assert.equal(storage.get(storageKey).entries.length, 0);

const malformedStorage = new Map();
malformedStorage.set("upstatus_team_lite_signal_pending_voice_room_attempts_v1_Normal%20Tester", {
  version: 1,
  entries: [
    { attemptId: "Team_Lite_Tester-voice-valid", logicalId: "upstatus-team-room-v1", member: "Team Lite Tester", createdAt: Date.now() },
    { attemptId: "Other_Member-voice-cross", logicalId: "upstatus-team-room-v1", member: "Other Member", createdAt: Date.now() },
    { attemptId: "Team_Lite_Tester-voice-bad room", logicalId: "upstatus-team-room-v1", member: "Team Lite Tester", createdAt: Date.now() },
    { attemptId: "Team_Lite_Tester-voice-stale", logicalId: "upstatus-team-room-v1", member: "Team Lite Tester", createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000 },
    { attemptId: "Team_Lite_Tester-voice-future", logicalId: "upstatus-team-room-v1", member: "Team Lite Tester", createdAt: Date.now() + 8 * 24 * 60 * 60 * 1000 },
    { attemptId: "Team_Lite_Tester-voice-wrong-logical", logicalId: "call:wrong", member: "Team Lite Tester", createdAt: Date.now() },
  ],
});
const validation = makeContext({ storage: malformedStorage });
assert.equal(validation.__candidateRestore(), 1,
  "restore must reject cross-member, malformed, stale, future and unsupported logical IDs");
assert.deepEqual(Object.keys(validation.signalPendingVoiceRoomAttempts), ["Team_Lite_Tester-voice-valid"]);

const oversizedStorage = new Map();
const oversizedKey = "upstatus_team_lite_signal_pending_voice_room_attempts_v1_Normal%20Tester";
oversizedStorage.set(oversizedKey, {
  version: 1,
  entries: Array.from({ length: 21 }, (_, index) => ({
    attemptId: "Team_Lite_Tester-voice-overflow-" + index,
    logicalId: "upstatus-team-room-v1",
    member: "Team Lite Tester",
    createdAt: Date.now(),
  })),
});
const oversized = makeContext({ storage: oversizedStorage });
assert.equal(oversized.__candidateRestore(), 0,
  "oversized local recovery state must fail closed rather than truncate potentially live attempts");
assert.equal(oversized.signalPendingVoiceRoomStorageHealthy, false);
assert.equal(oversizedStorage.get(oversizedKey).entries.length, 21,
  "an oversized recovery envelope must not be overwritten or partially discarded");

const otherMember = makeContext({ storage, member: "Other Member" });
assert.equal(otherMember.__candidateRestore(), 0, "voice attempts must never cross member identities");
assert.equal(Object.keys(otherMember.signalPendingVoiceRoomAttempts).length, 0);

const readFailure = makeContext({ readThrows: true });
assert.equal(readFailure.__candidateRestore(), 0);
assert.equal(readFailure.signalPendingVoiceRoomStorageHealthy, false,
  "a storage read failure must prevent overwriting unknown pending attempts");
assert.equal(await readFailure.__candidateRetry(), false,
  "a storage read failure must also block logout/recovery claims until the stored state can be read");
assert.equal(readFailure.__candidateTrack("upstatus-team-room-v1", "Team_Lite_Tester-voice-new"), false);

const writeFailure = makeContext({ writeThrows: true });
assert.equal(writeFailure.__candidateTrack("upstatus-team-room-v1", "Team_Lite_Tester-voice-write-failure"), false);
assert.equal(Object.keys(writeFailure.signalPendingVoiceRoomAttempts).length, 0,
  "storage failure must fail closed before a voice room can be opened");

const retryStorage = new Map();
const retrySeed = makeContext({ storage: retryStorage });
assert.equal(retrySeed.__candidateTrack("upstatus-team-lite-room-v1", "Team_Lite_Tester-voice-retry"), true);
const retryKey = retrySeed.__candidateStorageKey("Team Lite Tester");
const retryContext = makeContext({
  storage: retryStorage,
  transport: { cancelVoiceRoomOpen: async () => { throw new Error("network unavailable"); } },
});
assert.equal(retryContext.__candidateRestore(), 1);
assert.equal(await retryContext.__candidateRetry(), false,
  "an unconfirmed cancellation must keep the durable attempt");
assert.equal(retryStorage.get(retryKey).entries.length, 1);
retryContext.signalTransport = {
  cancelVoiceRoomOpen: async () => ({ ok: true, cancelled: true }),
};
assert.equal(await retryContext.__candidateRetry(), true,
  "a new authenticated transport must retry the retained cancellation");
assert.equal(retryStorage.get(retryKey).entries.length, 0);

const activeStorage = new Map();
const activeSeed = makeContext({ storage: activeStorage });
assert.equal(activeSeed.__candidateTrack("upstatus-team-room-v1", "Team_Lite_Tester-voice-active"), true);
let activeCancelCalls = 0;
const activeContext = makeContext({
  storage: activeStorage,
  currentAttemptId: "Team_Lite_Tester-voice-active",
  active: true,
  transport: { cancelVoiceRoomOpen: async () => { activeCancelCalls++; return { ok: true, cancelled: true }; } },
});
assert.equal(activeContext.__candidateRestore(), 1);
assert.equal(await activeContext.__candidateRetry(), true,
  "reconnect retry must not cancel the current active voice room");
assert.equal(activeCancelCalls, 0);

let writes = 0;
const clearFailureStorage = new Map();
const clearFailureContext = makeContext({
  storage: clearFailureStorage,
  shouldThrowWrite: () => ++writes > 1,
  transport: { cancelVoiceRoomOpen: async () => ({ ok: true, cancelled: true }) },
});
assert.equal(clearFailureContext.__candidateTrack("upstatus-team-room-v1", "Team_Lite_Tester-voice-clear-failure"), true);
const clearFailureId = "Team_Lite_Tester-voice-clear-failure";
clearFailureContext.signalVoiceRoomAttemptId = clearFailureId;
assert.equal(await clearFailureContext.__candidateAttemptCancel(clearFailureId, null, false), false,
  "failure to persist the cleared envelope must remain unconfirmed");
assert.ok(clearFailureContext.signalPendingVoiceRoomAttempts[clearFailureId],
  "a confirmed server cancellation with failed local cleanup must retain a retryable marker");

const prepareStart = template.indexOf("async function signalPrepareVoiceRoom(){");
const prepareEnd = template.indexOf("function signalReleaseVoiceRoom()", prepareStart);
assert.ok(prepareStart >= 0 && prepareEnd > prepareStart);
const prepareSource = template.slice(prepareStart, prepareEnd);
assert.ok(prepareSource.indexOf("signalTrackPendingVoiceRoomAttempt(voiceRoom.id,attemptId)") <
  prepareSource.indexOf("transportForOpen.openVoiceRoom(voiceRoom.id,attemptId)"),
  "the durable attempt must be stored before the server open request");
assert.ok(prepareSource.includes("signalAttemptPendingVoiceRoomCancel(attemptId,transportForOpen,true)"),
  "failed or interrupted open must cancel by attempt ID");

const leaveStart = template.indexOf("function voiceRoomLeave(options){");
const leaveEnd = template.indexOf("window.addEventListener('pagehide'", leaveStart);
const leaveSource = template.slice(leaveStart, leaveEnd);
assert.ok(leaveSource.includes("leavingAttemptId=signalVoiceRoomAttemptId"));
assert.ok(leaveSource.includes("signalAttemptPendingVoiceRoomCancel(leavingAttemptId,leavingTransport,true)"),
  "pagehide leave must cancel a voice attempt even when no room ID arrived");

const initStart = template.indexOf("function initSignalingTransport(){");
const initEnd = template.indexOf("var lastMember=", initStart);
const initSource = template.slice(initStart, initEnd);
assert.ok(initSource.indexOf("signalRestorePendingVoiceRoomAttempts()") <
  initSource.indexOf("signalRetryPendingVoiceRoomAttempts()"),
  "authenticated transport initialization must restore before retrying voice attempts");

const logoutStart = template.indexOf("async function teamLiteReleaseVoiceRoomBeforeLogout(){");
const logoutEnd = template.indexOf("async function teamLiteEndSession()", logoutStart);
const logoutSource = template.slice(logoutStart, logoutEnd);
assert.ok(logoutSource.includes("signalRetryPendingVoiceRoomAttempts()") && logoutSource.includes("signalPendingVoiceRoomStorageHealthy") && logoutSource.includes("teamLiteNetworkOffline"),
  "Team Lite logout must retry and gate on unconfirmed voice-room attempts and unhealthy storage");

assert.ok(template.includes("try{voiceRoomLeave().catch(function(){})"), "Team Lite pagehide must invoke retryable voice leave");
assert.ok(template.includes("voiceRoomLeave({skipServerLeave:true})"),
  "offline teardown must preserve the durable attempt instead of clearing it locally");

console.log("Team Lite durable voice-room attempt persistence, cancel-before-open, reload retry, storage fail-closed and logout-gate tests passed.");


const prepareStorageFailureEvents=[];
const prepareStorageFailureSource=template.slice(prepareStart,prepareEnd)+"\\nthis.__candidatePrepareVoiceRoom=signalPrepareVoiceRoom;";
const prepareStorageFailureContext={
  signalTransport:{openVoiceRoom:async()=>{prepareStorageFailureEvents.push("open");return {roomId:"sig_should_not_open"};}},
  signalTransportFlag:true,
  signalRetryPendingVoiceRoomAttempts:async()=>true,
  signalNewVoiceRoomAttemptId:()=>"Team_Lite_Tester-voice-storage-failure",
  signalTrackPendingVoiceRoomAttempt:()=>false,
  signalVoiceRoomAttemptId:"",
  signalPendingVoiceRoomAttempts:Object.create(null),
  signalAttemptPendingVoiceRoomCancel:async()=>true,
  signalVoiceRoomCreator:false,
  signalVoiceRoomRoomId:"",
  signalVoiceRoomPrepared:false,
  signalStartCallPolling:()=>prepareStorageFailureEvents.push("poll"),
  voiceRoom:{id:"upstatus-team-lite-room-v1",joinGeneration:1,joining:true},
  voiceRoomMessage:message=>prepareStorageFailureEvents.push("message:"+message),
  Promise,Error,Number,Object
};
vm.runInNewContext(prepareStorageFailureSource,prepareStorageFailureContext,{timeout:1000});
await assert.rejects(()=>prepareStorageFailureContext.__candidatePrepareVoiceRoom(),/armazenamento do userscript/);
assert.equal(prepareStorageFailureEvents.includes("open"),false,"Team Lite must not call /room/open when attempt storage fails");
console.log("Team Lite voice-room open fails closed when durable attempt storage is unavailable.");

const endSessionStart=template.indexOf("async function teamLiteEndSession()");
const idleTimerStart=template.indexOf("function teamLiteStartIdleTimer()",endSessionStart);
assert.ok(endSessionStart>=0&&idleTimerStart>endSessionStart,"Team Lite end-session source boundaries must exist");
const endSessionSource=template.slice(endSessionStart,idleTimerStart);
assert.ok(endSessionSource.indexOf("await teamLiteReleaseVoiceRoomBeforeLogout()")<endSessionSource.indexOf("authenticated=false;authGeneration++"),
  "Team Lite must confirm durable voice membership cleanup before invalidating authentication");
console.log("Team Lite voice attempt recovery is ordered before session invalidation.");
