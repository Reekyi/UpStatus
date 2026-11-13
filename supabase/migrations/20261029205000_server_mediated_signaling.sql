-- Server-mediated signaling queue. Apply to a non-production environment first.
-- This design deliberately avoids exposing signaling tables to browser roles.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE name IS NULL) THEN
    RAISE EXCEPTION 'Cannot create signaling identity index: public.users contains NULL names';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users GROUP BY name HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot create signaling identity index: public.users contains duplicate names';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS users_name_unique ON public.users(name);

CREATE TABLE IF NOT EXISTS public.upstatus_signal_rooms (
  room_id text PRIMARY KEY,
  created_by text NOT NULL REFERENCES public.users(name) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.upstatus_signal_room_members (
  room_id text NOT NULL REFERENCES public.upstatus_signal_rooms(room_id) ON DELETE CASCADE,
  user_name text NOT NULL REFERENCES public.users(name) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_name)
);

CREATE TABLE IF NOT EXISTS public.upstatus_signal_events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.upstatus_signal_rooms(room_id) ON DELETE CASCADE,
  sender text NOT NULL REFERENCES public.users(name) ON DELETE CASCADE,
  recipient text NOT NULL REFERENCES public.users(name) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'offer','answer','ice','presence','join_request','join_approved','join_declined',
    'invite','reject','hangup','leave','ended','screen_offer','screen_answer',
    'screen_ice','screen_presence','voice_join','voice_leave','voice_mute'
  )),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS upstatus_signal_events_recipient_expiry_idx
  ON public.upstatus_signal_events(recipient, expires_at, event_id);
CREATE INDEX IF NOT EXISTS upstatus_signal_events_room_idx
  ON public.upstatus_signal_events(room_id, event_id);
CREATE INDEX IF NOT EXISTS upstatus_signal_events_sender_idx
  ON public.upstatus_signal_events(sender);
CREATE INDEX IF NOT EXISTS upstatus_signal_room_members_user_idx
  ON public.upstatus_signal_room_members(user_name);
CREATE INDEX IF NOT EXISTS upstatus_signal_rooms_created_by_idx
  ON public.upstatus_signal_rooms(created_by);

ALTER TABLE public.upstatus_signal_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upstatus_signal_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upstatus_signal_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.upstatus_signal_rooms,
  public.upstatus_signal_room_members,
  public.upstatus_signal_events
FROM PUBLIC, anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE
  public.upstatus_signal_rooms,
  public.upstatus_signal_room_members,
  public.upstatus_signal_events
TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.upstatus_signal_events_event_id_seq TO service_role;
