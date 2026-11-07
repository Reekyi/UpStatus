-- Apply only to the explicitly allowlisted isolated UpStatus TEST project.
DO $$
DECLARE
  v_table oid := pg_catalog.to_regclass('public.upstatus_signal_call_attempts');
  v_column text;
  v_attnum smallint;
BEGIN
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'call attempt table is missing';
  END IF;

  FOREACH v_column IN ARRAY ARRAY['created_by', 'recipient', 'room_id'] LOOP
    SELECT a.attnum
      INTO v_attnum
    FROM pg_catalog.pg_attribute AS a
    WHERE a.attrelid = v_table
      AND a.attname = v_column
      AND NOT a.attisdropped;

    IF v_attnum IS NULL OR NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_index AS i
      WHERE i.indrelid = v_table
        AND i.indisvalid
        AND i.indisready
        AND i.indnkeyatts >= 1
        AND i.indkey[0] = v_attnum
    ) THEN
      RAISE EXCEPTION 'call attempt foreign key column % has no valid leading index', v_column;
    END IF;
  END LOOP;
END;
$$;
