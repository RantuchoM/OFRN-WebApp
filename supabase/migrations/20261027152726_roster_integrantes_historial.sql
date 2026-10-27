-- Alta visible en roster (created_at ya existía) y autor de altas/bajas.
-- Historial append-only: alta, baja, ausente, presente.
-- La app no usa auth.uid(): el actor viaja en creado_por / movido_por
-- o en app.gira_actor_id (RPC de baja y vacantes).

ALTER TABLE public.giras_integrantes
  ADD COLUMN IF NOT EXISTS creado_por bigint,
  ADD COLUMN IF NOT EXISTS movido_por bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'giras_integrantes_creado_por_fkey'
  ) THEN
    ALTER TABLE public.giras_integrantes
      ADD CONSTRAINT giras_integrantes_creado_por_fkey
      FOREIGN KEY (creado_por) REFERENCES public.integrantes(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'giras_integrantes_movido_por_fkey'
  ) THEN
    ALTER TABLE public.giras_integrantes
      ADD CONSTRAINT giras_integrantes_movido_por_fkey
      FOREIGN KEY (movido_por) REFERENCES public.integrantes(id) ON DELETE SET NULL;
  END IF;
END
$$;

COMMENT ON COLUMN public.giras_integrantes.created_at IS
  'Momento del alta de esta fila en la gira. No se pisa en ediciones. Si se asigna titular sobre una vacante, pasa a ser el alta del titular.';
COMMENT ON COLUMN public.giras_integrantes.creado_por IS
  'Integrante que dio el alta. NULL en filas anteriores a este registro.';
COMMENT ON COLUMN public.giras_integrantes.movido_por IS
  'Último integrante que cambió estado o tocó la fila. No es el autor del alta.';

CREATE INDEX IF NOT EXISTS giras_integrantes_creado_por_idx
  ON public.giras_integrantes (creado_por)
  WHERE creado_por IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.giras_integrantes_historial (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_gira bigint NOT NULL REFERENCES public.programas(id) ON DELETE CASCADE,
  id_integrante bigint,
  id_fila bigint,
  accion text NOT NULL CHECK (accion IN ('alta', 'baja', 'ausente', 'presente')),
  actor_id bigint REFERENCES public.integrantes(id) ON DELETE SET NULL,
  actor_nombre text,
  actor_apellido text,
  integrante_nombre text,
  integrante_apellido text,
  estado text,
  rol text,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.giras_integrantes_historial IS
  'Altas, bajas, ausencias y vueltas a presente de giras_integrantes. id_integrante no tiene FK: la vacante se borra y el id queda para el historial.';
COMMENT ON COLUMN public.giras_integrantes_historial.id_integrante IS
  'Integrante afectado. Sin FK para conservar el id si se elimina una vacante.';
COMMENT ON COLUMN public.giras_integrantes_historial.id_fila IS
  'giras_integrantes.id en el momento del movimiento. Sin FK.';

CREATE INDEX IF NOT EXISTS giras_integrantes_historial_gira_created_idx
  ON public.giras_integrantes_historial (id_gira, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS giras_integrantes_historial_gira_integrante_idx
  ON public.giras_integrantes_historial (id_gira, id_integrante, created_at DESC);

ALTER TABLE public.giras_integrantes_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS giras_integrantes_historial_select ON public.giras_integrantes_historial;
CREATE POLICY giras_integrantes_historial_select
  ON public.giras_integrantes_historial
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON public.giras_integrantes_historial FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.giras_integrantes_historial TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Actor y bitácora
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.gira_roster_actor_id(p_explicit bigint)
RETURNS bigint
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw text;
  v_id bigint;
BEGIN
  IF p_explicit IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.integrantes WHERE id = p_explicit
  ) THEN
    RETURN p_explicit;
  END IF;

  v_raw := NULLIF(btrim(COALESCE(current_setting('app.gira_actor_id', true), '')), '');
  IF v_raw IS NULL OR v_raw !~ '^[0-9]+$' THEN
    RETURN NULL;
  END IF;

  v_id := v_raw::bigint;
  IF EXISTS (SELECT 1 FROM public.integrantes WHERE id = v_id) THEN
    RETURN v_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.gira_roster_log(
  p_accion text,
  p_id_gira bigint,
  p_id_integrante bigint,
  p_id_fila bigint,
  p_actor bigint,
  p_estado text,
  p_rol text,
  p_motivo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor bigint;
  v_nombre text;
  v_apellido text;
  v_actor_nombre text;
  v_actor_apellido text;
BEGIN
  IF p_id_gira IS NULL OR p_id_integrante IS NULL THEN
    RETURN;
  END IF;

  v_actor := public.gira_roster_actor_id(p_actor);

  SELECT i.nombre, i.apellido
    INTO v_nombre, v_apellido
  FROM public.integrantes i
  WHERE i.id = p_id_integrante;

  IF v_actor IS NOT NULL THEN
    SELECT i.nombre, i.apellido
      INTO v_actor_nombre, v_actor_apellido
    FROM public.integrantes i
    WHERE i.id = v_actor;
  END IF;

  INSERT INTO public.giras_integrantes_historial (
    id_gira, id_integrante, id_fila, accion, actor_id,
    actor_nombre, actor_apellido, integrante_nombre, integrante_apellido,
    estado, rol, motivo
  ) VALUES (
    p_id_gira,
    p_id_integrante,
    p_id_fila,
    p_accion,
    v_actor,
    v_actor_nombre,
    v_actor_apellido,
    v_nombre,
    v_apellido,
    p_estado,
    p_rol,
    NULLIF(btrim(COALESCE(p_motivo, '')), '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_giras_integrantes_roster_before()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sim boolean;
  v_actor bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := timezone('utc'::text, now());
    v_actor := public.gira_roster_actor_id(NEW.creado_por);
    NEW.creado_por := v_actor;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.id_integrante IS DISTINCT FROM NEW.id_integrante THEN
      SELECT i.es_simulacion INTO v_sim
      FROM public.integrantes i
      WHERE i.id = OLD.id_integrante;
      IF v_sim IS TRUE THEN
        v_actor := public.gira_roster_actor_id(NEW.movido_por);
        NEW.created_at := timezone('utc'::text, now());
        NEW.creado_por := v_actor;
      ELSE
        NEW.created_at := OLD.created_at;
        NEW.creado_por := OLD.creado_por;
      END IF;
    ELSE
      NEW.created_at := OLD.created_at;
      NEW.creado_por := OLD.creado_por;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_giras_integrantes_roster_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sim boolean;
  v_motivo text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.gira_roster_log(
      'alta', NEW.id_gira, NEW.id_integrante, NEW.id,
      NEW.creado_por, NEW.estado, NEW.rol, NEW.motivo_estado
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.id_integrante IS DISTINCT FROM NEW.id_integrante THEN
      SELECT i.es_simulacion INTO v_sim
      FROM public.integrantes i
      WHERE i.id = OLD.id_integrante;
      IF v_sim IS TRUE THEN
        PERFORM public.gira_roster_log(
          'baja', OLD.id_gira, OLD.id_integrante, OLD.id,
          COALESCE(NEW.movido_por, NEW.creado_por),
          OLD.estado, OLD.rol, 'Asignación de titular'
        );
        PERFORM public.gira_roster_log(
          'alta', NEW.id_gira, NEW.id_integrante, NEW.id,
          NEW.creado_por, NEW.estado, NEW.rol, NULL
        );
      END IF;
      RETURN NEW;
    END IF;

    IF lower(COALESCE(OLD.estado, '')) IS DISTINCT FROM lower(COALESCE(NEW.estado, '')) THEN
      IF lower(COALESCE(NEW.estado, '')) = 'ausente' THEN
        PERFORM public.gira_roster_log(
          'ausente', NEW.id_gira, NEW.id_integrante, NEW.id,
          NEW.movido_por, NEW.estado, NEW.rol, NEW.motivo_estado
        );
      ELSIF lower(COALESCE(OLD.estado, '')) = 'ausente' THEN
        PERFORM public.gira_roster_log(
          'presente', NEW.id_gira, NEW.id_integrante, NEW.id,
          NEW.movido_por, NEW.estado, NEW.rol, NULL
        );
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_motivo := NULLIF(btrim(COALESCE(current_setting('app.gira_baja_motivo', true), '')), '');
    IF v_motivo IS NULL THEN
      v_motivo := NULLIF(btrim(COALESCE(OLD.motivo_estado, '')), '');
    END IF;
    PERFORM public.gira_roster_log(
      'baja', OLD.id_gira, OLD.id_integrante, OLD.id,
      NULL, OLD.estado, OLD.rol, v_motivo
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_giras_integrantes_roster_before ON public.giras_integrantes;
CREATE TRIGGER tr_giras_integrantes_roster_before
  BEFORE INSERT OR UPDATE ON public.giras_integrantes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_giras_integrantes_roster_before();

DROP TRIGGER IF EXISTS tr_giras_integrantes_roster_audit ON public.giras_integrantes;
CREATE TRIGGER tr_giras_integrantes_roster_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.giras_integrantes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_giras_integrantes_roster_audit();

COMMENT ON FUNCTION public.fn_giras_integrantes_roster_audit() IS
  'Registra alta, baja, ausente y presente. La baja lee app.gira_actor_id y app.gira_baja_motivo.';

REVOKE ALL ON FUNCTION public.gira_roster_actor_id(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gira_roster_log(text, bigint, bigint, bigint, bigint, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gira_roster_actor_id(bigint) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.gira_roster_log(text, bigint, bigint, bigint, bigint, text, text, text) TO postgres, service_role;

GRANT EXECUTE ON FUNCTION public.fn_giras_integrantes_roster_before() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_giras_integrantes_roster_audit() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Baja con autor (reemplaza el DELETE directo del cliente)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.baja_giras_integrantes(
  p_id_gira bigint,
  p_actor bigint DEFAULT NULL,
  p_id_integrantes bigint[] DEFAULT NULL,
  p_roles text[] DEFAULT NULL,
  p_motivo text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_n integer;
BEGIN
  IF p_id_gira IS NULL THEN
    RAISE EXCEPTION 'Falta id de gira';
  END IF;
  IF COALESCE(cardinality(p_id_integrantes), 0) = 0
     AND COALESCE(cardinality(p_roles), 0) = 0 THEN
    RAISE EXCEPTION 'Indicá integrantes o roles a dar de baja';
  END IF;

  PERFORM set_config('app.gira_actor_id', COALESCE(p_actor::text, ''), true);
  PERFORM set_config('app.gira_baja_motivo', COALESCE(p_motivo, ''), true);

  DELETE FROM public.giras_integrantes gi
  WHERE gi.id_gira = p_id_gira
    AND (
      COALESCE(cardinality(p_id_integrantes), 0) = 0
      OR gi.id_integrante = ANY (p_id_integrantes)
    )
    AND (
      COALESCE(cardinality(p_roles), 0) = 0
      OR gi.rol = ANY (p_roles)
    );

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

COMMENT ON FUNCTION public.baja_giras_integrantes(bigint, bigint, bigint[], text[], text) IS
  'Borra filas de giras_integrantes y deja la baja en el historial con actor y motivo. Exige integrantes o roles.';

REVOKE ALL ON FUNCTION public.baja_giras_integrantes(bigint, bigint, bigint[], text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.baja_giras_integrantes(bigint, bigint, bigint[], text[], text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Vacantes: el actor entra por un wrapper para no reescribir la RPC
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.crear_vacante(bigint, text, bigint, text, text, text)
  RENAME TO crear_vacante_core;

ALTER FUNCTION public.materializar_reemplazo(bigint, bigint, bigint)
  RENAME TO materializar_reemplazo_core;

ALTER FUNCTION public.eliminar_vacante(bigint, bigint)
  RENAME TO eliminar_vacante_core;

CREATE OR REPLACE FUNCTION public.crear_vacante(
  p_id_gira bigint,
  p_etiqueta text,
  p_id_localidad bigint,
  p_id_instr text DEFAULT NULL,
  p_genero text DEFAULT NULL,
  p_nomenclador text DEFAULT NULL,
  p_actor bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.gira_actor_id', COALESCE(p_actor::text, ''), true);
  RETURN public.crear_vacante_core(
    p_id_gira, p_etiqueta, p_id_localidad, p_id_instr, p_genero, p_nomenclador
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.materializar_reemplazo(
  p_id_gira bigint,
  p_id_placeholder bigint,
  p_id_real bigint,
  p_actor bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.gira_actor_id', COALESCE(p_actor::text, ''), true);
  RETURN public.materializar_reemplazo_core(p_id_gira, p_id_placeholder, p_id_real);
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_vacante(
  p_id_gira bigint,
  p_id_vacante bigint,
  p_actor bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.gira_actor_id', COALESCE(p_actor::text, ''), true);
  RETURN public.eliminar_vacante_core(p_id_gira, p_id_vacante);
END;
$$;

REVOKE ALL ON FUNCTION public.crear_vacante(bigint, text, bigint, text, text, text, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.materializar_reemplazo(bigint, bigint, bigint, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.eliminar_vacante(bigint, bigint, bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.crear_vacante(bigint, text, bigint, text, text, text, bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.materializar_reemplazo(bigint, bigint, bigint, bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.eliminar_vacante(bigint, bigint, bigint) TO anon, authenticated, service_role;

-- El core sigue siendo invocable por el wrapper (SECURITY INVOKER).
GRANT EXECUTE ON FUNCTION public.crear_vacante_core(bigint, text, bigint, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.materializar_reemplazo_core(bigint, bigint, bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.eliminar_vacante_core(bigint, bigint) TO anon, authenticated, service_role;

-- Altas ya existentes: una línea de historial con la fecha original y sin autor.
INSERT INTO public.giras_integrantes_historial (
  id_gira, id_integrante, id_fila, accion,
  integrante_nombre, integrante_apellido, estado, rol, created_at
)
SELECT
  gi.id_gira,
  gi.id_integrante,
  gi.id,
  'alta',
  i.nombre,
  i.apellido,
  gi.estado,
  gi.rol,
  COALESCE(gi.created_at, timezone('utc'::text, now()))
FROM public.giras_integrantes gi
LEFT JOIN public.integrantes i ON i.id = gi.id_integrante
WHERE NOT EXISTS (
  SELECT 1
  FROM public.giras_integrantes_historial h
  WHERE h.id_fila = gi.id
    AND h.accion = 'alta'
    AND h.actor_id IS NULL
    AND h.created_at = COALESCE(gi.created_at, timezone('utc'::text, now()))
);
