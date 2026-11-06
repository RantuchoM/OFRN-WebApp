-- Candado de edición del stage plot (colaboración nivel 1).
-- Un integrante a la vez por lienzo. locked_by es integrantes.id (bigint), nunca uuid.
-- El latido y tomar/ceder NO tocan payload ni updated_at: el autosave sigue siendo
-- la única escritura que avanza updated_at, así el último flush del editor saliente
-- puede condicionarse a ese timestamp.
-- RLS existente (authenticated/anon ALL) cubre las columnas nuevas. Las funciones
-- son SECURITY INVOKER: corren con el rol del cliente y respetan esas policies.

ALTER TABLE public.stage_plots
  ADD COLUMN IF NOT EXISTS locked_by bigint
    REFERENCES public.integrantes (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lock_heartbeat_at timestamptz;

COMMENT ON COLUMN public.stage_plots.locked_by IS
  'Integrante que edita este lienzo. NULL = libre. Id numérico de integrantes.id.';

COMMENT ON COLUMN public.stage_plots.lock_heartbeat_at IS
  'Último latido del titular (~15 s). El candado está vencido si es NULL o tiene más de 30 s.';

-- Toma atómica.
-- Gana si el candado está libre, es el mismo integrante, o el latido tiene más de 30 s.
-- Robo explícito (el otro sigue editando, sin que acepte): p_force y
-- p_expected_locked_by = el titular que el cliente vio. Dos clics a la vez
-- reevalúan el WHERE después del row lock: solo uno matchea.
CREATE OR REPLACE FUNCTION public.stage_plot_take_lock(
  p_plot_id uuid,
  p_integrante_id bigint,
  p_force boolean DEFAULT false,
  p_expected_locked_by bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_prev_locked_by bigint;
  v_prev_heartbeat timestamptz;
  v_row public.stage_plots%ROWTYPE;
  v_acquired boolean := false;
  v_live boolean := false;
BEGIN
  IF p_plot_id IS NULL OR p_integrante_id IS NULL OR p_integrante_id <= 0 THEN
    RETURN jsonb_build_object('acquired', false, 'error', 'invalid_args');
  END IF;

  SELECT locked_by, lock_heartbeat_at
    INTO v_prev_locked_by, v_prev_heartbeat
  FROM public.stage_plots
  WHERE id = p_plot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('acquired', false, 'error', 'not_found');
  END IF;

  v_live :=
    v_prev_locked_by IS NOT NULL
    AND v_prev_locked_by IS DISTINCT FROM p_integrante_id
    AND v_prev_heartbeat IS NOT NULL
    AND v_prev_heartbeat >= now() - interval '30 seconds';

  UPDATE public.stage_plots
  SET
    locked_by = p_integrante_id,
    lock_heartbeat_at = now()
  WHERE id = p_plot_id
    AND (
      locked_by IS NULL
      OR locked_by = p_integrante_id
      OR lock_heartbeat_at IS NULL
      OR lock_heartbeat_at < now() - interval '30 seconds'
      OR (
        COALESCE(p_force, false)
        AND p_expected_locked_by IS NOT NULL
        AND locked_by = p_expected_locked_by
        AND locked_by IS DISTINCT FROM p_integrante_id
      )
    )
  RETURNING * INTO v_row;

  v_acquired := v_row.id IS NOT NULL;

  IF NOT v_acquired THEN
    SELECT * INTO v_row FROM public.stage_plots WHERE id = p_plot_id;
  END IF;

  RETURN jsonb_build_object(
    'acquired', v_acquired,
    'stolen_from_live', v_acquired AND v_live,
    'id', v_row.id,
    'locked_by', v_row.locked_by,
    'lock_heartbeat_at', v_row.lock_heartbeat_at,
    'payload', v_row.payload,
    'updated_at', v_row.updated_at,
    'nombre', v_row.nombre,
    'previous_locked_by', v_prev_locked_by
  );
END;
$$;

COMMENT ON FUNCTION public.stage_plot_take_lock(uuid, bigint, boolean, bigint) IS
  'Toma el candado del stage plot. Libre, mismo integrante, latido > 30 s, o robo si p_force y locked_by sigue siendo p_expected_locked_by. No modifica payload ni updated_at.';

-- Cede solo si locked_by es el integrante actual.
CREATE OR REPLACE FUNCTION public.stage_plot_release_lock(
  p_plot_id uuid,
  p_integrante_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row public.stage_plots%ROWTYPE;
  v_released boolean := false;
BEGIN
  IF p_plot_id IS NULL OR p_integrante_id IS NULL OR p_integrante_id <= 0 THEN
    RETURN jsonb_build_object('released', false, 'error', 'invalid_args');
  END IF;

  UPDATE public.stage_plots
  SET
    locked_by = NULL,
    lock_heartbeat_at = NULL
  WHERE id = p_plot_id
    AND locked_by = p_integrante_id
  RETURNING * INTO v_row;

  v_released := v_row.id IS NOT NULL;

  IF NOT v_released THEN
    SELECT * INTO v_row FROM public.stage_plots WHERE id = p_plot_id;
  END IF;

  RETURN jsonb_build_object(
    'released', v_released,
    'id', v_row.id,
    'locked_by', v_row.locked_by,
    'lock_heartbeat_at', v_row.lock_heartbeat_at
  );
END;
$$;

COMMENT ON FUNCTION public.stage_plot_release_lock(uuid, bigint) IS
  'Suelta el candado solo si locked_by es el integrante indicado. No modifica payload ni updated_at.';

-- Latido solo si locked_by es el integrante actual.
CREATE OR REPLACE FUNCTION public.stage_plot_heartbeat_lock(
  p_plot_id uuid,
  p_integrante_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row public.stage_plots%ROWTYPE;
  v_held boolean := false;
BEGIN
  IF p_plot_id IS NULL OR p_integrante_id IS NULL OR p_integrante_id <= 0 THEN
    RETURN jsonb_build_object('held', false, 'error', 'invalid_args');
  END IF;

  UPDATE public.stage_plots
  SET lock_heartbeat_at = now()
  WHERE id = p_plot_id
    AND locked_by = p_integrante_id
  RETURNING * INTO v_row;

  v_held := v_row.id IS NOT NULL;

  IF NOT v_held THEN
    SELECT * INTO v_row FROM public.stage_plots WHERE id = p_plot_id;
  END IF;

  RETURN jsonb_build_object(
    'held', v_held,
    'id', v_row.id,
    'locked_by', v_row.locked_by,
    'lock_heartbeat_at', v_row.lock_heartbeat_at
  );
END;
$$;

COMMENT ON FUNCTION public.stage_plot_heartbeat_lock(uuid, bigint) IS
  'Renueva lock_heartbeat_at solo si locked_by es el integrante indicado. No modifica payload ni updated_at.';

REVOKE ALL ON FUNCTION public.stage_plot_take_lock(uuid, bigint, boolean, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.stage_plot_release_lock(uuid, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.stage_plot_heartbeat_lock(uuid, bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.stage_plot_take_lock(uuid, bigint, boolean, bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stage_plot_release_lock(uuid, bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stage_plot_heartbeat_lock(uuid, bigint) TO anon, authenticated, service_role;

-- Realtime de la fila del lienzo (presencia de candado + payload).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'stage_plots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_plots;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END
$$;
