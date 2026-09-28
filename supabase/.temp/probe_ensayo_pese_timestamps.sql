BEGIN;

CREATE TEMP TABLE probe_ensayo_pese_ts (
  id bigint,
  before_u timestamptz,
  mid_u timestamptz,
  after_u timestamptz,
  stable boolean
);

DO $$
DECLARE
  v_id bigint;
  v_before_u timestamptz;
  v_before_lm timestamptz;
  v_mid_u timestamptz;
  v_mid_lm timestamptz;
  v_after_u timestamptz;
  v_after_lm timestamptz;
BEGIN
  SELECT e.id, e.updated_at, e.last_modified_at
    INTO v_id, v_before_u, v_before_lm
  FROM public.eventos e
  WHERE COALESCE(e.ensayo_pese_conflicto, false) = false
  ORDER BY e.id
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'No sample event';
  END IF;

  UPDATE public.eventos
  SET ensayo_pese_conflicto = true
  WHERE id = v_id;

  SELECT updated_at, last_modified_at
    INTO v_mid_u, v_mid_lm
  FROM public.eventos
  WHERE id = v_id;

  UPDATE public.eventos
  SET ensayo_pese_conflicto = false
  WHERE id = v_id;

  SELECT updated_at, last_modified_at
    INTO v_after_u, v_after_lm
  FROM public.eventos
  WHERE id = v_id;

  INSERT INTO probe_ensayo_pese_ts (id, before_u, mid_u, after_u, stable)
  VALUES (
    v_id,
    v_before_u,
    v_mid_u,
    v_after_u,
    v_mid_u IS NOT DISTINCT FROM v_before_u
      AND v_after_u IS NOT DISTINCT FROM v_before_u
      AND v_mid_lm IS NOT DISTINCT FROM v_before_lm
      AND v_after_lm IS NOT DISTINCT FROM v_before_lm
  );
END
$$;

SELECT * FROM probe_ensayo_pese_ts;

ROLLBACK;
