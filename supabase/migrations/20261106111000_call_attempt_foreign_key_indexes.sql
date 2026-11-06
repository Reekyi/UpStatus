-- Cover child-side foreign-key lookups for user cascades and room cleanup.
-- This is a candidate migration; validate in the isolated project before any release plan.
CREATE INDEX IF NOT EXISTS upstatus_signal_call_attempts_created_by_idx
  ON public.upstatus_signal_call_attempts (created_by);

CREATE INDEX IF NOT EXISTS upstatus_signal_call_attempts_recipient_idx
  ON public.upstatus_signal_call_attempts (recipient);

CREATE INDEX IF NOT EXISTS upstatus_signal_call_attempts_room_id_idx
  ON public.upstatus_signal_call_attempts (room_id);
