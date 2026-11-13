-- Cover the created_by foreign key so user deletion/cascade checks do not scan the bindings table.
CREATE INDEX IF NOT EXISTS upstatus_signal_room_bindings_created_by_idx
  ON public.upstatus_signal_room_bindings (created_by);
