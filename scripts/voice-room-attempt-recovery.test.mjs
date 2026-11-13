import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const template = readFileSync("src/userscript/upstatus.user.template.js", "utf8");
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
  const member = options.member || "Normal Tester";
  const context = {
    key: "upstatus_",
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
assert.match(attemptId, /^Normal_Tester-voice-[A-Za-z0-9._:-]+$/);
assert.ok(attemptId.length <= 128);
assert.equal(initial.__candidateTrack("upstatus-team-room-v1", attemptId), true,
  "Normal must persist the member-bound voice attempt before /room/open");
const emojiMember = makeContext({ member: "Voice😀Tester" });
const emojiAttemptId = emojiMember.__candidateNewId();
assert.ok(emojiAttemptId.startsWith("Voice_Tester-voice-"),
  "JavaScript prefix normalization must match PostgreSQL code-point replacement for non-BMP names");
assert.equal(emojiMember.__candidateTrack("upstatus-team-room-v1", emojiAttemptId), true);
const storageKey = initial.__candidateStorageKey("Normal Tester");
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

const crossMemberStorage = new Map();
const recoveryStorageKey = "upstatus_signal_pending_voice_room_attempts_v1_Normal%20Tester";
const validStoredRecord = {
  attemptId: "Normal_Tester-voice-valid",
  logicalId: "upstatus-team-room-v1",
  member: "Normal Tester",
  createdAt: Date.now(),
};
const crossMemberRecord = {
  attemptId: "Other_Member-voice-cross",
  logicalId: "upstatus-team-room-v1",
  member: "Other Member",
  createdAt: Date.now(),
};
crossMemberStorage.set(recoveryStorageKey, { version: 1, entries: [validStoredRecord, crossMemberRecord] });
const crossMemberValidation = makeContext({ storage: crossMemberStorage });
assert.equal(crossMemberValidation.__candidateRestore(), 1,
  "restore must ignore explicit cross-member records without crossing identities");
assert.equal(crossMemberValidation.signalPendingVoiceRoomStorageHealthy, true);
assert.deepEqual(Object.keys(crossMemberValidation.signalPendingVoiceRoomAttempts), ["Normal_Tester-voice-valid"]);
assert.deepEqual(crossMemberStorage.get(recoveryStorageKey).entries, [validStoredRecord],
  "successful restore may remove explicit cross-member records from this member-scoped envelope");

const ownMemberCorruptions = [
  { label: "malformed attempt ID", record: { attemptId: "Normal_Tester-voice-bad room", logicalId: "upstatus-team-room-v1", member: "Normal Tester", createdAt: Date.now() } },
  { label: "stale timestamp", record: { attemptId: "Normal_Tester-voice-stale", logicalId: "upstatus-team-room-v1", member: "Normal Tester", createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000 } },
  { label: "future timestamp", record: { attemptId: "Normal_Tester-voice-future", logicalId: "upstatus-team-room-v1", member: "Normal Tester", createdAt: Date.now() + 8 * 24 * 60 * 60 * 1000 } },
  { label: "unsupported logical ID", record: { attemptId: "Normal_Tester-voice-wrong-logical", logicalId: "call:wrong", member: "Normal Tester", createdAt: Date.now() } },
  { label: "missing member", record: { attemptId: "Normal_Tester-voice-missing-member", logicalId: "upstatus-team-room-v1", createdAt: Date.now() } },
  { label: "member label conflicts with attempt prefix", record: { attemptId: "Normal_Tester-voice-corrupt-member", logicalId: "upstatus-team-room-v1", member: "Other Member", createdAt: Date.now() } },
  { label: "unexpected session field", record: { attemptId: "Normal_Tester-voice-unexpected-field", logicalId: "upstatus-team-room-v1", member: "Normal Tester", createdAt: Date.now(), token: "must-not-be-discarded-silently" } },
  { label: "duplicate attempt ID", record: { ...validStoredRecord } },
  { label: "non-object entry", record: null },
];
for (const corruption of ownMemberCorruptions) {
  const ownMemberStorage = new Map();
  const originalEnvelope = { version: 1, entries: [validStoredRecord, corruption.record] };
  ownMemberStorage.set(recoveryStorageKey, originalEnvelope);
  const ownMemberValidation = makeContext({ storage: ownMemberStorage });
  assert.equal(ownMemberValidation.__candidateRestore(), 0,
    "own-member " + corruption.label + " must fail closed rather than lose a possible server attempt");
  assert.equal(ownMemberValidation.signalPendingVoiceRoomStorageHealthy, false,
    "own-member " + corruption.label + " must mark recovery storage unhealthy");
  assert.deepEqual(ownMemberStorage.get(recoveryStorageKey), originalEnvelope,
    "own-member " + corruption.label + " must preserve the original envelope byte-for-byte at the data level");
  assert.equal(Object.keys(ownMemberValidation.signalPendingVoiceRoomAttempts).length, 0,
    "own-member " + corruption.label + " must not partially restore a sanitized subset");
  assert.equal(await ownMemberValidation.__candidateRetry(), false,
    "own-member " + corruption.label + " must block recovery/logout claims");
  assert.equal(ownMemberValidation.__candidateTrack("upstatus-team-room-v1", "Normal_Tester-voice-new"), false,
    "own-member " + corruption.label + " must block new voice-room attempts");
}

const restoreWriteFailureStorage = new Map();
const restoreWriteFailureEnvelope = { version: 1, entries: [validStoredRecord, crossMemberRecord] };
restoreWriteFailureStorage.set(recoveryStorageKey, restoreWriteFailureEnvelope);
const restoreWriteFailure = makeContext({ storage: restoreWriteFailureStorage, writeThrows: true });
assert.equal(restoreWriteFailure.__candidateRestore(), 0,
  "failure to persist a filtered recovery envelope must fail closed");
assert.equal(restoreWriteFailure.signalPendingVoiceRoomStorageHealthy, false);
assert.deepEqual(restoreWriteFailureStorage.get(recoveryStorageKey), restoreWriteFailureEnvelope,
  "a failed storage rewrite must leave the original envelope intact");
assert.equal(Object.keys(restoreWriteFailure.signalPendingVoiceRoomAttempts).length, 0);
assert.equal(await restoreWriteFailure.__candidateRetry(), false);


const oversizedStorage = new Map();
const oversizedKey = "upstatus_signal_pending_voice_room_attempts_v1_Normal%20Tester";
oversizedStorage.set(oversizedKey, {
  version: 1,
  entries: Array.from({ length: 21 }, (_, index) => ({
    attemptId: "Normal_Tester-voice-overflow-" + index,
    logicalId: "upstatus-team-room-v1",
    member: "Normal Tester",
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
assert.equal(readFailure.__candidateTrack("upstatus-team-room-v1", "Normal_Tester-voice-new"), false);

const writeFailure = makeContext({ writeThrows: true });
assert.equal(writeFailure.__candidateTrack("upstatus-team-room-v1", "Normal_Tester-voice-write-failure"), false);
assert.equal(Object.keys(writeFailure.signalPendingVoiceRoomAttempts).length, 0,
  "storage failure must fail closed before a voice room can be opened");

const retryStorage = new Map();
const retrySeed = makeContext({ storage: retryStorage });
assert.equal(retrySeed.__candidateTrack("upstatus-team-lite-room-v1", "Normal_Tester-voice-retry"), true);
const retryKey = retrySeed.__candidateStorageKey("Normal Tester");
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
assert.equal(activeSeed.__candidateTrack("upstatus-team-room-v1", "Normal_Tester-voice-active"), true);
let activeCancelCalls = 0;
const activeContext = makeContext({
  storage: activeStorage,
  currentAttemptId: "Normal_Tester-voice-active",
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
assert.equal(clearFailureContext.__candidateTrack("upstatus-team-room-v1", "Normal_Tester-voice-clear-failure"), true);
const clearFailureId = "Normal_Tester-voice-clear-failure";
clearFailureContext.signalVoiceRoomAttemptId = clearFailureId;
assert.equal(await clearFailureContext.__candidateAttemptCancel(clearFailureId, null, false), false,
  "failure to persist the cleared envelope must remain unconfirmed");
assert.ok(clearFailureContext.signalPendingVoiceRoomAttempts[clearFailureId],
  "a confirmed server cancellation with failed local cleanup must retain a retryable marker");

const prepareStart = template.indexOf("async function signalPrepareVoiceRoom(){");
const prepareEnd = template.indexOf("\nasync function waitForRealtimeReady", prepareStart);
assert.ok(prepareStart >= 0 && prepareEnd > prepareStart);
const prepareSource = template.slice(prepareStart, prepareEnd);
assert.ok(prepareSource.indexOf("signalTrackPendingVoiceRoomAttempt(voiceRoom.id,attemptId)") <
  prepareSource.indexOf("transportForOpen.openVoiceRoom(voiceRoom.id,attemptId)"),
  "the durable attempt must be stored before the server open request");
assert.ok(prepareSource.includes("signalAttemptPendingVoiceRoomCancel(attemptId,transportForOpen,true)"),
  "failed or interrupted open must cancel by attempt ID");

const leaveStart = template.indexOf("function voiceRoomLeave(options){");
const leaveEnd = template.indexOf("async function normalReleaseVoiceRoomBeforeLogout()", leaveStart);
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

const logoutStart = template.indexOf("async function normalReleaseVoiceRoomBeforeLogout(){");
const logoutEnd = template.indexOf("window.addEventListener('pagehide'", logoutStart);
const logoutSource = template.slice(logoutStart, logoutEnd);
assert.ok(logoutSource.includes("signalRetryPendingVoiceRoomAttempts()"),
  "logout must retry and gate on unconfirmed voice-room attempts");

assert.ok(template.includes("window.addEventListener('pagehide',function(){try{callCleanup(false,'pagehide').catch(function(){});}catch(e){}try{voiceRoomLeave();}catch(e){}})"));
assert.ok(template.includes("voiceRoomLeave({skipServerLeave:true})"),
  "offline teardown must preserve the durable attempt instead of clearing it locally");

console.log("Normal durable voice-room attempt persistence, cancel-before-open, reload retry, storage fail-closed and logout-gate tests passed.");


const voiceOfferStart = template.indexOf("async function voiceRoomOffer(n){");
const voiceReceiveStart = template.indexOf("async function voiceRoomReceive(p){", voiceOfferStart);
assert.ok(voiceOfferStart >= 0 && voiceReceiveStart > voiceOfferStart,
  "voice-room offer helper boundaries must exist");
const voiceOfferSource = template.slice(voiceOfferStart, voiceReceiveStart);

const pendingOfferPeer = {
  pc: {
    signalingState: "have-local-offer",
    connectionState: "connecting",
    iceConnectionState: "checking",
    localDescription: { type: "offer", sdp: "cached-offer-sdp" },
    remoteDescription: null,
  },
};
const pendingOfferSends = [];
let pendingOfferCreateCalls = 0;
const pendingOfferContext = {
  voiceRoom: { active: true, peers: { Zulu: pendingOfferPeer } },
  member: "Alpha",
  voiceRoomMakePeer: async () => pendingOfferPeer,
  voiceRoomDrop: () => { throw new Error("a pending healthy offer must be retransmitted, not dropped"); },
  voiceRoomSend: (type, to, data) => {
    pendingOfferSends.push({ type, to, data });
    return false;
  },
};
pendingOfferPeer.pc.createOffer = async () => {
  pendingOfferCreateCalls++;
  return { type: "offer", sdp: "unexpected-new-offer" };
};
vm.runInNewContext(
  voiceOfferSource + "\nthis.__candidateVoiceRoomOffer = voiceRoomOffer;",
  pendingOfferContext,
  { timeout: 1000 },
);
await pendingOfferContext.__candidateVoiceRoomOffer("Zulu");
await pendingOfferContext.__candidateVoiceRoomOffer("Zulu");
assert.equal(pendingOfferCreateCalls, 0,
  "a local offer without an answer must be retransmitted rather than creating a second offer");
assert.equal(pendingOfferSends.length, 2,
  "a later peer-presence signal must retry an offer whose first delivery was not confirmed");
assert.deepEqual(pendingOfferSends.map(x => x.data.sdp.sdp), ["cached-offer-sdp", "cached-offer-sdp"]);

const staleVoicePeer = {
  pc: {
    signalingState: "have-local-offer",
    connectionState: "disconnected",
    iceConnectionState: "disconnected",
    localDescription: { type: "offer", sdp: "stale-offer" },
    remoteDescription: null,
  },
};
const freshVoicePeer = {
  pc: {
    signalingState: "stable",
    connectionState: "new",
    iceConnectionState: "new",
    localDescription: null,
    remoteDescription: null,
    createOffer: async () => ({ type: "offer", sdp: "fresh-offer" }),
    setLocalDescription: async function (offer) {
      this.localDescription = offer;
      this.signalingState = "have-local-offer";
    },
  },
};
const stalePeerMap = { Zulu: staleVoicePeer };
const stalePeerDrops = [];
const freshOfferSends = [];
const stalePeerContext = {
  voiceRoom: { active: true, peers: stalePeerMap },
  member: "Alpha",
  voiceRoomDrop(name) {
    stalePeerDrops.push(name);
    delete stalePeerMap[name];
  },
  voiceRoomMakePeer: async name => {
    stalePeerMap[name] = freshVoicePeer;
    return freshVoicePeer;
  },
  voiceRoomSend: (type, to, data) => {
    freshOfferSends.push({ type, to, data });
    return true;
  },
};
vm.runInNewContext(
  voiceOfferSource + "\nthis.__candidateVoiceRoomOffer = voiceRoomOffer;",
  stalePeerContext,
  { timeout: 1000 },
);
await stalePeerContext.__candidateVoiceRoomOffer("Zulu");
assert.deepEqual(stalePeerDrops, ["Zulu"],
  "a disconnected peer must be discarded before a fresh offer is created");
assert.equal(freshOfferSends[0].data.sdp.sdp, "fresh-offer");

const receiveOfferStart = template.indexOf("async function voiceRoomReceive(p){");
const receiveOfferBranchStart = template.indexOf(
  "if(p.type==='offer'&&p.sdp&&String(member).localeCompare(String(p.from),'pt-BR')>0){",
  receiveOfferStart,
);
const receiveAnswerBranchStart = template.indexOf("if(p.type==='answer'&&p.sdp){", receiveOfferBranchStart);
assert.ok(receiveOfferStart >= 0 && receiveOfferBranchStart > receiveOfferStart &&
  receiveAnswerBranchStart > receiveOfferBranchStart,
  "voice-room incoming-offer branch boundaries must exist");
const receiveOfferBranch = template.slice(receiveOfferBranchStart, receiveAnswerBranchStart);
const cachedAnswerPeer = {
  pc: {
    connectionState: "connected",
    iceConnectionState: "connected",
    signalingState: "stable",
    remoteDescription: { type: "offer", sdp: "same-remote-offer" },
    localDescription: { type: "answer", sdp: "cached-local-answer" },
  },
};
const duplicateAnswerSends = [];
const duplicateOfferContext = {
  voiceRoom: { active: true, peers: { Alpha: cachedAnswerPeer } },
  member: "Zulu",
  voiceRoomDrop: () => { throw new Error("a healthy peer with the same remote offer must be retained"); },
  voiceRoomMakePeer: async () => cachedAnswerPeer,
  voiceRoomFlushCandidates: async () => {},
  RTCSessionDescription: value => value,
  voiceRoomSend: async (type, to, data) => {
    duplicateAnswerSends.push({ type, to, data });
    return true;
  },
  voiceRoomMessage: () => {},
};
vm.runInNewContext(
  "async function __candidateReceiveOffer(p) {" + receiveOfferBranch +
    "}\nthis.__candidateReceiveOffer = __candidateReceiveOffer;",
  duplicateOfferContext,
  { timeout: 1000 },
);
await duplicateOfferContext.__candidateReceiveOffer({
  type: "offer",
  from: "Alpha",
  to: "Zulu",
  sdp: { type: "offer", sdp: "same-remote-offer" },
});
assert.equal(duplicateAnswerSends.length, 1,
  "a duplicate offer must retransmit the cached answer when the original answer may have been lost");
assert.equal(duplicateAnswerSends[0].type, "answer");
assert.equal(duplicateAnswerSends[0].data.sdp.sdp, "cached-local-answer");

const recoveryStart = template.indexOf("function voiceRoomScheduleRecovery(n,peer,state){");
const makePeerStart = template.indexOf("async function voiceRoomMakePeer(n)", recoveryStart);
assert.ok(recoveryStart >= 0 && makePeerStart > recoveryStart,
  "voice-room recovery timer helper boundaries must exist");
const recoverySource = template.slice(recoveryStart, makePeerStart);
let recoveredTimer = null;
const recoveredPeer = {
  pc: { connectionState: "disconnected", iceConnectionState: "disconnected" },
};
const recoveredDrops = [];
const recoveredPeerMap = { Zulu: recoveredPeer };
const recoveredContext = {
  voiceRoom: {
    active: true,
    peers: recoveredPeerMap,
    recoveryTimers: {},
    recoveryAttempts: {},
  },
  member: "Alpha",
  setTimeout(callback) { recoveredTimer = callback; return 1; },
  clearTimeout() {},
  voiceRoomDrop(name) {
    recoveredDrops.push(name);
    delete recoveredPeerMap[name];
  },
  voiceRoomOffer: async () => {},
  voiceRoomSend: () => true,
  voiceRoomMessage: () => {},
};
vm.runInNewContext(
  recoverySource + "\nthis.__candidateScheduleRecovery = voiceRoomScheduleRecovery;",
  recoveredContext,
  { timeout: 1000 },
);
recoveredContext.__candidateScheduleRecovery("Zulu", recoveredPeer, "disconnected");
assert.equal(typeof recoveredTimer, "function");
recoveredPeer.pc.connectionState = "connected";
recoveredPeer.pc.iceConnectionState = "connected";
recoveredTimer();
assert.deepEqual(recoveredDrops, [],
  "a peer that recovered before the backoff expires must not be dropped");
assert.equal(recoveredContext.voiceRoom.recoveryAttempts.Zulu, 0,
  "successful recovery must reset the retry counter");

let failedTimer = null;
const failedPeer = { pc: { connectionState: "disconnected", iceConnectionState: "disconnected" } };
const failedDrops = [];
let failedRecoveryOffers = 0;
const failedPeerMap = { Zulu: failedPeer };
const failedContext = {
  voiceRoom: {
    active: true,
    peers: failedPeerMap,
    recoveryTimers: {},
    recoveryAttempts: {},
  },
  member: "Alpha",
  setTimeout(callback) { failedTimer = callback; return 1; },
  clearTimeout() {},
  voiceRoomDrop(name) {
    failedDrops.push(name);
    delete failedPeerMap[name];
  },
  voiceRoomOffer: async () => { failedRecoveryOffers++; },
  voiceRoomSend: () => true,
  voiceRoomMessage: () => {},
};
vm.runInNewContext(
  recoverySource + "\nthis.__candidateScheduleRecovery = voiceRoomScheduleRecovery;",
  failedContext,
  { timeout: 1000 },
);
failedContext.__candidateScheduleRecovery("Zulu", failedPeer, "disconnected");
failedTimer();
assert.deepEqual(failedDrops, ["Zulu"]);
assert.equal(failedRecoveryOffers, 1,
  "a peer that remains disconnected must still enter the bounded recovery path");

console.log("Normal voice signaling retransmission and recovery-timer tests passed.");
