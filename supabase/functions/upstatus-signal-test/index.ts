import { createClient } from "npm:@supabase/supabase-js@2";
import { createHash, randomBytes } from "node:crypto";
import { readJsonObject } from "./body.mjs";
import { isAllowedLegacyEnvelope } from "./legacy-envelope.mjs";

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || "";
const db = createClient(PROJECT_URL, KEY, { auth: { persistSession: false } });
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-upstatus-token, authorization, apikey",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Cache-Control": "no-store"
};
const TYPES = new Set([
  "offer","answer","ice","presence","join_request","join_approved","join_declined","invite","reject","hangup","leave","ended",
  "screen_offer","screen_answer","screen_ice","screen_presence","voice_join","voice_leave","voice_mute",
  // Transport envelope types used by the existing userscript channels during migration.
  "call_signal","voice_room_signal","screen_signal"
]);
const TTL_MS = 2 * 60 * 1000;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_BODY = 20 * 1024;
const MAX_EVENTS_PER_MINUTE = 90;
const MAX_READS_PER_MINUTE = 240;
const CLEANUP_INTERVAL_MS = 60_000;
const MAX_EXPIRED_EVENTS_PER_CLEANUP = 500;
const MAX_EXPIRED_ROOMS_PER_CLEANUP = 100;
const rate = new Map<string,{start:number,count:number}>();
let lastCleanupAt = 0;

function response(body: unknown, status=200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type":"application/json; charset=utf-8", ...CORS } });
}
function hash(t: string) { return createHash("sha256").update(t).digest("hex"); }
function rateLimit(name: string, limit = MAX_EVENTS_PER_MINUTE) {
  const now = Date.now();
  const old = rate.get(name);
  if (old && now - old.start < 60_000) {
    old.count++;
    return old.count <= limit;
  }

  // Keep the per-isolate map bounded without evicting active counters, which
  // would let older entries reset their rate limit under a many-user burst.
  if (!old && rate.size >= 2000) {
    for (const [key, value] of rate) {
      if (now - value.start >= 60_000) rate.delete(key);
    }
    if (rate.size >= 2000) return false;
  }
  rate.set(name, { start: now, count: 1 });
  return true;
}
async function cleanupExpired(now = new Date()) {
  const timestamp = now.toISOString();
  if (Date.now() - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  // Advance the cooldown before querying to avoid overlapping cleanup work on warm isolates.
  lastCleanupAt = Date.now();
  try {
    const { data: expiredEvents, error: eventsError } = await db.from("upstatus_signal_events")
      .select("event_id").lte("expires_at", timestamp)
      .order("event_id", { ascending: true }).limit(MAX_EXPIRED_EVENTS_PER_CLEANUP);
    if (!eventsError && expiredEvents?.length) {
      await db.from("upstatus_signal_events").delete()
        .in("event_id", expiredEvents.map(event => event.event_id));
    }

    const { data: expiredRooms, error: roomsError } = await db.from("upstatus_signal_rooms")
      .select("room_id").lte("expires_at", timestamp)
      .order("created_at", { ascending: true }).limit(MAX_EXPIRED_ROOMS_PER_CLEANUP);
    if (!roomsError && expiredRooms?.length) {
      // Room foreign keys cascade to memberships and queued events.
      await db.from("upstatus_signal_rooms").delete()
        .in("room_id", expiredRooms.map(room => room.room_id));
    }
  } catch {
    // Cleanup is best-effort and must never block signaling requests.
  }
}

async function auth(req: Request): Promise<string|null> {
  const raw = req.headers.get("x-upstatus-token") || "";
  if (!raw || raw.length > 512) return null;
  const { data: session, error } = await db.from("upstatus_sessions")
    .select("user_name,expires_at").eq("token_hash", hash(raw)).maybeSingle();
  if (error || !session || Date.parse(session.expires_at) <= Date.now()) return null;
  const { data: user, error: userError } = await db.from("users").select("name").eq("name", session.user_name).maybeSingle();
  if (userError || !user) return null;
  return String(user.name);
}
async function room(roomId: string) {
  const { data, error } = await db.from("upstatus_signal_rooms")
    .select("room_id,created_by,status,expires_at").eq("room_id", roomId).maybeSingle();
  if (error || !data || data.status !== "active" || Date.parse(data.expires_at) <= Date.now()) return null;
  return data;
}
async function isMember(roomId: string, name: string) {
  const { data, error } = await db.from("upstatus_signal_room_members").select("user_name")
    .eq("room_id", roomId).eq("user_name", name).eq("status", "accepted").maybeSingle();
  return !error && !!data;
}
const IDENTITY_PAYLOAD_KEYS = new Set([
  "from","sender","user","user_name","to","target","roomid","room_id","participants",
  "member","identity","created_by","recipient","sender_id","userid","user_id",
]);

function cleanPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = { ...(value as Record<string, unknown>) };
  // Remove identity/recipient claims at every nesting level, including case variants.
  // Payloads are JSON-decoded, so an iterative walk avoids recursion-depth failures.
  const stack: Array<{ value: unknown; depth: number }> = [{ value: p, depth: 0 }];
  let visitedNodes = 0;
  while (stack.length) {
    const entry = stack.pop()!;
    const current = entry.value;
    if (!current || typeof current !== "object") continue;
    // Deeply nested or extremely wide JSON can make later serialization expensive
    // or overflow the runtime stack even when the raw request is within 20 KiB.
    if (entry.depth > 64) return null;
    const children = Array.isArray(current) ? current : Object.entries(current);
    visitedNodes += children.length;
    if (visitedNodes > 4096) return null;
    if (Array.isArray(current)) {
      for (const child of current) {
        if (child && typeof child === "object") stack.push({ value: child, depth: entry.depth + 1 });
      }
      continue;
    }
    for (const [key, child] of children as Array<[string, unknown]>) {
      if (IDENTITY_PAYLOAD_KEYS.has(key.toLowerCase())) delete (current as Record<string, unknown>)[key];
      else if (child && typeof child === "object") stack.push({ value: child, depth: entry.depth + 1 });
    }
  }
  try {
    if (JSON.stringify(p).length > 12 * 1024) return null;
  } catch {
    return null;
  }
  return p;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const path = new URL(req.url).pathname.replace(/\/$/, "");
  if (req.method === "GET" && path.endsWith("/health")) return response({ ok: true, service: "upstatus-signal-test" });
  try {
    if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
    const sender = await auth(req);
    if (!sender) return response({ error: "Valid UpStatus session required" }, 401);
    const readRoute = ["/poll", "/ack", "/room/status", "/room/members", "/room/invitations"].some(suffix => path.endsWith(suffix));
    const bucket = sender + (readRoute ? ":read" : ":write");
    if (!rateLimit(bucket, readRoute ? MAX_READS_PER_MINUTE : MAX_EVENTS_PER_MINUTE))
      return response({ error: "Rate limit exceeded" }, 429);
    await cleanupExpired();
    const p = await readJsonObject(req) as Record<string, unknown>;

    if (path.endsWith("/room/create")) {
      const requested = Array.isArray(p.participants) ? p.participants : [];
      const participants = [...new Set([sender, ...requested.map(String)])];
      if (participants.length > 32 || participants.some(n => !n || n.length > 80)) return response({ error: "Invalid participants" }, 400);
      const { data: known, error: knownError } = await db.from("users").select("name").in("name", participants);
      if (knownError || (known || []).length !== participants.length) return response({ error: "Unknown participant" }, 400);
      const roomId = "sig_" + randomBytes(18).toString("hex");
      const expiresAt = new Date(Date.now() + ROOM_TTL_MS).toISOString();
      const { error: roomError } = await db.from("upstatus_signal_rooms").insert({
        room_id: roomId, created_by: sender, status: "active", expires_at: expiresAt
      });
      if (roomError) throw roomError;
      const { error: membersError } = await db.from("upstatus_signal_room_members").insert(
        participants.map(user_name => ({
          room_id: roomId, user_name, status: user_name === sender ? "accepted" : "pending"
        }))
      );
      if (membersError) {
        await db.from("upstatus_signal_rooms").delete().eq("room_id", roomId);
        throw membersError;
      }
      return response({
        ok: true, roomId, participants, invited: participants.filter(name => name !== sender), expiresAt
      }, 201);
    }

    if (path.endsWith("/room/bind")) {
      const roomId = String(p.roomId || "");
      const bindingType = String(p.bindingType || "");
      const logicalId = String(p.logicalId || "");
      if (!roomId || !["call", "voice", "screen"].includes(bindingType) ||
          !/^[A-Za-z0-9._:-]{1,128}$/.test(logicalId))
        return response({ error: "Invalid room binding" }, 400);
      const activeRoom = await room(roomId);
      if (!activeRoom) return response({ error: "Room unavailable" }, 404);
      if (activeRoom.created_by !== sender || !(await isMember(roomId, sender)))
        return response({ error: "Only the accepted room creator can bind a logical room" }, 403);
      const { data: existing, error: lookupError } = await db.from("upstatus_signal_room_bindings")
        .select("room_id").eq("binding_type", bindingType).eq("logical_id", logicalId).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing?.room_id === roomId) return response({ ok: true, roomId, existing: true });
      if (existing) {
        if (await room(existing.room_id))
          return response({ error: "Logical room is already bound" }, 409);
        const { data: rebound, error } = await db.from("upstatus_signal_room_bindings")
          .update({ room_id: roomId, created_by: sender, created_at: new Date().toISOString() })
          .eq("binding_type", bindingType).eq("logical_id", logicalId).eq("room_id", existing.room_id)
          .select("room_id").maybeSingle();
        if (error) throw error;
        if (!rebound) return response({ error: "Logical room binding changed concurrently" }, 409);
        return response({ ok: true, roomId, rebound: true });
      }
      const { error } = await db.from("upstatus_signal_room_bindings").insert({
        binding_type: bindingType, logical_id: logicalId, room_id: roomId, created_by: sender
      });
      if (error?.code === "23505") return response({ error: "Logical room is already bound" }, 409);
      if (error) throw error;
      return response({ ok: true, roomId }, 201);
    }

    if (path.endsWith("/room/resolve")) {
      const bindingType = String(p.bindingType || "");
      const logicalId = String(p.logicalId || "");
      if (!["call", "voice", "screen"].includes(bindingType) ||
          !/^[A-Za-z0-9._:-]{1,128}$/.test(logicalId))
        return response({ error: "Invalid room binding" }, 400);
      const { data: binding, error } = await db.from("upstatus_signal_room_bindings")
        .select("room_id").eq("binding_type", bindingType).eq("logical_id", logicalId).maybeSingle();
      if (error) throw error;
      if (!binding) return response({ error: "Logical room unavailable" }, 404);
      const activeRoom = await room(binding.room_id);
      if (!activeRoom || !(await isMember(binding.room_id, sender)))
        return response({ error: "Logical room unavailable" }, 404);
      return response({ ok: true, roomId: binding.room_id, expiresAt: activeRoom.expires_at });
    }

    if (path.endsWith("/room/invite")) {
      const roomId = String(p.roomId || "");
      const recipient = String(p.recipient || "");
      const activeRoom = roomId ? await room(roomId) : null;
      if (!activeRoom) return response({ error: "Room unavailable" }, 404);
      if (!recipient || recipient.length > 80 || recipient === sender)
        return response({ error: "A different valid recipient is required" }, 400);
      if (!(await isMember(roomId, sender)))
        return response({ error: "Accepted room membership required" }, 403);
      const { data: known, error: knownError } = await db.from("users")
        .select("name").eq("name", recipient).maybeSingle();
      if (knownError) throw knownError;
      if (!known) return response({ error: "Unknown participant" }, 404);
      const { data: existing, error: existingError } = await db.from("upstatus_signal_room_members")
        .select("status").eq("room_id", roomId).eq("user_name", recipient).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return response({ error: "Participant already invited or a room member" }, 409);
      const { error } = await db.from("upstatus_signal_room_members").insert({
        room_id: roomId, user_name: recipient, status: "pending"
      });
      if (error?.code === "23505") return response({ error: "Participant already invited or a room member" }, 409);
      if (error) throw error;
      return response({ ok: true, status: "pending" }, 201);
    }

    if (path.endsWith("/room/members")) {
      const roomId = String(p.roomId || "");
      const activeRoom = roomId ? await room(roomId) : null;
      if (!activeRoom || !(await isMember(roomId, sender)))
        return response({ error: "Accepted room membership required" }, 404);
      const { data: members, error } = await db.from("upstatus_signal_room_members")
        .select("user_name").eq("room_id", roomId).eq("status", "accepted")
        .order("joined_at", { ascending: true }).limit(32);
      if (error) throw error;
      return response({ ok: true, roomId, members: (members || []).map(item => item.user_name) });
    }

    if (path.endsWith("/room/status")) {
      const roomId = String(p.roomId || "");
      const activeRoom = roomId ? await room(roomId) : null;
      if (!activeRoom) return response({ error: "Room unavailable" }, 404);
      if (activeRoom.created_by !== sender)
        return response({ error: "Only the room creator can inspect invitation status" }, 403);
      const { data: members, error } = await db.from("upstatus_signal_room_members")
        .select("user_name,status").eq("room_id", roomId)
        .order("joined_at", { ascending: true }).limit(32);
      if (error) throw error;
      return response({
        ok: true, roomId,
        participants: (members || []).map(item => ({ name: item.user_name, status: item.status }))
      });
    }

    if (path.endsWith("/room/invitations")) {
      const { data: invitations, error } = await db.from("upstatus_signal_room_members")
        .select("room_id,joined_at").eq("user_name", sender).eq("status", "pending")
        .order("joined_at", { ascending: false }).limit(50);
      if (error) throw error;
      const roomIds = (invitations || []).map(item => item.room_id);
      if (!roomIds.length) return response({ invitations: [] });
      const { data: rooms, error: roomsError } = await db.from("upstatus_signal_rooms")
        .select("room_id,created_by,expires_at,status").in("room_id", roomIds)
        .eq("status", "active").gt("expires_at", new Date().toISOString());
      if (roomsError) throw roomsError;
      const activeRoomIds = (rooms || []).map(item => item.room_id);
      const { data: bindings, error: bindingsError } = activeRoomIds.length
        ? await db.from("upstatus_signal_room_bindings").select("room_id,binding_type,logical_id").in("room_id", activeRoomIds)
        : { data: [], error: null };
      if (bindingsError) throw bindingsError;
      return response({ invitations: (rooms || []).map(item => ({
        roomId: item.room_id, invitedBy: item.created_by, expiresAt: item.expires_at,
        bindings: (bindings || []).filter(binding => binding.room_id === item.room_id)
          .map(binding => ({ bindingType: binding.binding_type, logicalId: binding.logical_id }))
      })) });
    }

    if (path.endsWith("/room/accept") || path.endsWith("/room/decline")) {
      const roomId = String(p.roomId || "");
      if (!roomId || !(await room(roomId))) return response({ error: "Room unavailable" }, 404);
      const { data: invitation, error: invitationError } = await db.from("upstatus_signal_room_members")
        .select("status").eq("room_id", roomId).eq("user_name", sender).maybeSingle();
      if (invitationError) throw invitationError;
      if (!invitation || invitation.status !== "pending")
        return response({ error: "Pending invitation not found" }, 404);
      const status = path.endsWith("/room/accept") ? "accepted" : "declined";
      const { data: updatedInvitation, error } = await db.from("upstatus_signal_room_members")
        .update({ status }).eq("room_id", roomId).eq("user_name", sender).eq("status", "pending")
        .select("status").maybeSingle();
      if (error) throw error;
      // The conditional update is the state transition's atomic guard. A concurrent
      // accept/decline may have won after the read above; do not report false success.
      if (!updatedInvitation) return response({ error: "Invitation already handled" }, 409);
      return response({ ok: true, status: updatedInvitation.status });
    }

    if (path.endsWith("/room/close")) {
      const roomId = String(p.roomId || "");
      const activeRoom = roomId ? await room(roomId) : null;
      if (!activeRoom) return response({ error: "Room unavailable" }, 404);
      if (activeRoom.created_by !== sender) return response({ error: "Only the room creator can close it" }, 403);
      const { error } = await db.from("upstatus_signal_rooms").update({ status: "closed" }).eq("room_id", roomId);
      if (error) throw error;
      const { error: bindingError } = await db.from("upstatus_signal_room_bindings").delete().eq("room_id", roomId);
      if (bindingError) throw bindingError;
      return response({ ok: true });
    }

    if (path.endsWith("/signal")) {
      const roomId = String(p.roomId || "");
      const recipient = String(p.recipient || "");
      const eventType = String(p.eventType || "");
      const payload = cleanPayload(p.payload);
      if (!roomId || roomId.length > 128 || !recipient || recipient.length > 80 || !TYPES.has(eventType) || !payload)
        return response({ error: "Invalid signaling event" }, 400);
      if (!isAllowedLegacyEnvelope(eventType, payload))
        return response({ error: "Invalid legacy signaling subtype" }, 400);
      if (!(await room(roomId))) return response({ error: "Room unavailable" }, 404);
      if (!(await isMember(roomId, sender)) || !(await isMember(roomId, recipient)))
        return response({ error: "Sender and recipient must be room members" }, 403);
      const activeRoom = await room(roomId);
      if (!activeRoom) return response({ error: "Room unavailable" }, 404);
      const expiresAt = new Date(Math.min(Date.now() + TTL_MS, Date.parse(activeRoom.expires_at))).toISOString();
      const { error } = await db.from("upstatus_signal_events").insert({
        room_id: roomId, sender, recipient, event_type: eventType, payload, expires_at: expiresAt
      });
      if (error) throw error;
      return response({ ok: true }, 202);
    }

    if (path.endsWith("/broadcast")) {
      const roomId = String(p.roomId || "");
      const eventType = String(p.eventType || "");
      const payload = cleanPayload(p.payload);
      if (!roomId || roomId.length > 128 || !TYPES.has(eventType) || !payload)
        return response({ error: "Invalid signaling event" }, 400);
      if (!isAllowedLegacyEnvelope(eventType, payload))
        return response({ error: "Invalid legacy signaling subtype" }, 400);
      const activeRoom = await room(roomId);
      if (!activeRoom || !(await isMember(roomId, sender)))
        return response({ error: "Accepted room membership required" }, 404);
      const { data: members, error: membersError } = await db.from("upstatus_signal_room_members")
        .select("user_name").eq("room_id", roomId).eq("status", "accepted").limit(32);
      if (membersError) throw membersError;
      const recipients = [...new Set((members || []).map(item => item.user_name).filter(name => name !== sender))];
      if (!recipients.length) return response({ ok: true, attempted: 0, delivered: 0 }, 202);
      const expiresAt = new Date(Math.min(Date.now() + TTL_MS, Date.parse(activeRoom.expires_at))).toISOString();
      const rows = recipients.map(recipient => ({
        room_id: roomId, sender, recipient, event_type: eventType, payload, expires_at: expiresAt
      }));
      const { error } = await db.from("upstatus_signal_events").insert(rows);
      if (error) throw error;
      return response({ ok: true, attempted: recipients.length, delivered: recipients.length }, 202);
    }

    if (path.endsWith("/poll")) {
      const roomId = String(p.roomId || "");
      if (!roomId || !(await isMember(roomId, sender))) return response({ error: "Room membership required" }, 403);
      if (!(await room(roomId))) return response({ error: "Room unavailable" }, 404);
      const { data: events, error } = await db.from("upstatus_signal_events")
        .select("event_id,room_id,sender,recipient,event_type,payload,created_at")
        .eq("room_id", roomId).eq("recipient", sender).gt("expires_at", new Date().toISOString())
        .order("event_id", { ascending: true }).limit(100);
      if (error) throw error;
      // Poll is non-destructive. Clients must deduplicate event_id and acknowledge
      // only after handling the event, avoiding silent loss if a response is interrupted.
      return response({ events: events || [] });
    }

    if (path.endsWith("/ack")) {
      const ids = Array.isArray(p.eventIds) ? [...new Set(p.eventIds.map(Number))] : [];
      if (!ids.length || ids.length > 100 || ids.some(id => !Number.isSafeInteger(id) || id <= 0))
        return response({ error: "Invalid event IDs" }, 400);
      const { data: membership, error: membershipError } = await db.from("upstatus_signal_room_members")
        .select("room_id").eq("room_id", String(p.roomId || "")).eq("user_name", sender).eq("status", "accepted").maybeSingle();
      if (membershipError || !membership) return response({ error: "Room membership required" }, 403);
      const { data: deleted, error } = await db.from("upstatus_signal_events")
        .delete().in("event_id", ids).eq("room_id", String(p.roomId || "")).eq("recipient", sender)
        .select("event_id");
      if (error) throw error;
      return response({ ok: true, acknowledged: (deleted || []).length });

    }

    return response({ error: "Not found" }, 404);
  } catch (e) {
    const message = String((e as Error)?.message || "");
    if (message === "PAYLOAD_TOO_LARGE") return response({ error: "Request body too large" }, 413);
    if (message === "INVALID_JSON" || message === "INVALID_BODY") return response({ error: "Invalid JSON body; expected an object" }, 400);
    return response({ error: "Internal server error" }, 500);
  }
});
