-- Atomic, monotonic merge for chat read receipts.
-- The Edge Function authenticates the custom UpStatus session before invoking this RPC.
-- Keep the function SECURITY INVOKER and callable only by the backend service role.
CREATE OR REPLACE FUNCTION public.merge_chat_read_receipts(
  p_user_name text,
  p_messages jsonb,
  p_last_read_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF p_user_name IS NULL OR btrim(p_user_name) = '' THEN
    RAISE EXCEPTION 'p_user_name must not be empty';
  END IF;

  IF p_messages IS NULL OR jsonb_typeof(p_messages) <> 'object' THEN
    RAISE EXCEPTION 'p_messages must be a JSON object';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_each(p_messages) AS item(message_id, readers)
    WHERE jsonb_typeof(item.readers) <> 'array'
  ) THEN
    RAISE EXCEPTION 'each receipt entry must be an array';
  END IF;

  INSERT INTO public.chat_reads (user_name, last_read_at, messages)
  VALUES (p_user_name, p_last_read_at, p_messages)
  ON CONFLICT (user_name) DO UPDATE
  SET
    last_read_at = greatest(public.chat_reads.last_read_at, excluded.last_read_at),
    messages = (
      SELECT coalesce(jsonb_object_agg(entry.message_id, entry.readers), '{}'::jsonb)
      FROM (
        SELECT
          keys.message_id,
          (
            SELECT coalesce(jsonb_agg(to_jsonb(readers.reader) ORDER BY readers.reader), '[]'::jsonb)
            FROM (
              SELECT DISTINCT item.value #>> '{}' AS reader
              FROM jsonb_array_elements(
                CASE
                  WHEN jsonb_typeof(public.chat_reads.messages -> keys.message_id) = 'array'
                    THEN public.chat_reads.messages -> keys.message_id
                  ELSE '[]'::jsonb
                END
                ||
                CASE
                  WHEN jsonb_typeof(excluded.messages -> keys.message_id) = 'array'
                    THEN excluded.messages -> keys.message_id
                  ELSE '[]'::jsonb
                END
              ) AS item(value)
              WHERE jsonb_typeof(item.value) = 'string'
                AND item.value #>> '{}' <> ''
            ) AS readers
          ) AS readers
        FROM jsonb_object_keys(
          coalesce(public.chat_reads.messages, '{}'::jsonb)
          || coalesce(excluded.messages, '{}'::jsonb)
        ) AS keys(message_id)
      ) AS entry
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.merge_chat_read_receipts(text, jsonb, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_chat_read_receipts(text, jsonb, timestamptz)
  TO service_role;
