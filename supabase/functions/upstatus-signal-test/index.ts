import { createClient } from "npm:@supabase/supabase-js@2";
import { createHash, randomBytes } from "node:crypto";

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
  "screen_offer","screen_answer","screen_ice","screen_presence","voice_join","voice_leave","voice_mute"
]);
const TTL_MS = 2 * 60 * 1000;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_BODY = 20 * 1024;
const MAX_EVENTS_PER_MINUTE = 90;
const rate = new Map<string,{start:number,count:number}>();

function response(body: unknown, status=200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type":"application/json; charset=utf-8", ...CORS } });
}
function hash(t: string) { return createHash("sha256").update(t).digest("hex"); }
async function body(req: Request) {
  const declaredLength = Number(req.headers.get("content-length") || "0");
  if (declaredLength > MAX_BODY) throw new Error("PAYLOAD_TOO_LARGE");
  const raw = await req.text();
  if (raw.length > MAX_BODY) throw new Error("PAYLOAD_TOO_LARGE");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new Error("INVALID_JSON"); }
}
function rateLimit(name: string) {
  const now = Date.now();
  const old = rate.get(name);
  if (!old || now - old.start >= 60_000) { rate.set(name, { start: now, count: 1 }); return true; }
  old.count++;
  // Bound memory growth across many distinct user names on warm isolates.
  if (rate.size > 2000) {
    for (const [key, value] of rate) {
      if (now - value.start >= 60_000) rate.delete(key);
    }
  }
  return old.count <= MAX_EVENTS_PER_MINUTE;
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
    .eq("room_id", roomId).eq("user_name", name).maybeSingle();
  return !error && !!data;
}
function cleanPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = { ...(value as Record<string, unknown>) };
  for (const k of ["from","sender","user","user_name","to","target","roomId","room_id","participants","member","identity","created_by","recipient","sender_id","userId","user_id"]) delete p[k];
  if (JSON.stringify(p).length > 12 * 1024) return null;
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
    if (!rateLimit(sender)) return response({ error: "Rate limit exceeded" }, 429);
    const p = await body(req) as Record<string, unknown>;

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
        participants.map(user_name => ({ room_id: roomId, user_name }))
      );
      if (membersError) {
        await db.from("upstatus_signal_rooms").delete().eq("room_id", roomId);
        throw membersError;
      }
      return response({ ok: true, roomId, participants, expiresAt }, 201);
    }

    if (path.endsWith("/room/close")) {
      const roomId = String(p.roomId || "");
      const activeRoom = roomId ? await room(roomId) : null;
      if (!activeRoom) return response({ error: "Room unavailable" }, 404);
      if (activeRoom.created_by !== sender) return response({ error: "Only the room creator can close it" }, 403);
      const { error } = await db.from("upstatus_signal_rooms").update({ status: "closed" }).eq("room_id", roomId);
      if (error) throw error;
      return response({ ok: true });
    }

    if (path.endsWith("/signal")) {
      const roomId = String(p.roomId || "");
      const recipient = String(p.recipient || "");
      const eventType = String(p.eventType || "");
      const payload = cleanPayload(p.payload);
      if (!roomId || roomId.length > 128 || !recipient || recipient.length > 80 || !TYPES.has(eventType) || !payload)
        return response({ error: "Invalid signaling event" }, 400);
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
        .select("room_id").eq("room_id", String(p.roomId || "")).eq("user_name", sender).maybeSingle();
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
    if (message === "INVALID_JSON") return response({ error: "Invalid JSON" }, 400);
    return response({ error: "Internal server error" }, 500);
  }
});
