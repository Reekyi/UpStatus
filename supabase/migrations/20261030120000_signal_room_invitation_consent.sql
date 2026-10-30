-- Invitation consent for server-mediated signaling rooms.
-- New room creators are accepted immediately; invitees must explicitly accept.
ALTER TABLE public.upstatus_signal_room_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'upstatus_signal_room_members_status_check'
      AND conrelid = 'public.upstatus_signal_room_members'::regclass
  ) THEN
    ALTER TABLE public.upstatus_signal_room_members
      ADD CONSTRAINT upstatus_signal_room_members_status_check
      CHECK (status IN ('pending', 'accepted', 'declined'));
  END IF;
END $$;

UPDATE public.upstatus_signal_room_members m
SET status = 'accepted'
FROM public.upstatus_signal_rooms r
WHERE r.room_id = m.room_id
  AND r.created_by = m.user_name
  AND m.status = 'pending';

CREATE INDEX IF NOT EXISTS idx_upstatus_signal_room_members_status
  ON public.upstatus_signal_room_members (room_id, user_name, status);
