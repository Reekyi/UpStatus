-- Preserve legacy behavior for membership rows created without an explicit status.
-- The signaling Edge Function explicitly marks invitees as pending.
ALTER TABLE public.upstatus_signal_room_members
  ALTER COLUMN status SET DEFAULT 'accepted';
