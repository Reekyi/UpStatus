CREATE TABLE IF NOT EXISTS public.upstatus_signal_room_bindings (
  binding_type text NOT NULL CHECK (binding_type IN ('call','voice','screen')),
  logical_id text NOT NULL CHECK (length(logical_id) BETWEEN 1 AND 128),
  room_id text NOT NULL REFERENCES public.upstatus_signal_rooms(room_id) ON DELETE CASCADE,
  created_by text NOT NULL REFERENCES public.users(name) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (binding_type, logical_id)
);

CREATE INDEX IF NOT EXISTS upstatus_signal_room_bindings_room_idx
  ON public.upstatus_signal_room_bindings (room_id);

ALTER TABLE public.upstatus_signal_room_bindings ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.upstatus_signal_room_bindings FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.upstatus_signal_room_bindings TO service_role;
