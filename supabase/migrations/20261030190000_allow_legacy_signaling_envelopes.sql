-- Permit the legacy client channels as top-level transport envelopes.
-- Inner payload.type values are separately validated by the isolated Edge Function.
ALTER TABLE public.upstatus_signal_events
  DROP CONSTRAINT IF EXISTS upstatus_signal_events_event_type_check;

ALTER TABLE public.upstatus_signal_events
  ADD CONSTRAINT upstatus_signal_events_event_type_check
  CHECK (event_type IN (
    'offer','answer','ice','presence','join_request','join_approved','join_declined',
    'invite','reject','hangup','leave','ended','screen_offer','screen_answer',
    'screen_ice','screen_presence','voice_join','voice_leave','voice_mute',
    'call_signal','voice_room_signal','screen_signal'
  ));
