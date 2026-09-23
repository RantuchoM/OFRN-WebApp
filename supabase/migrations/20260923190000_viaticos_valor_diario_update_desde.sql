-- Recrea edición/borrado de vigencias (la 20260609130000 quedó applied sin las funciones
-- en remoto) y alinea PostgREST con p_vigencia_desde. Cierra huecos entre franjas.

ALTER TABLE public.viaticos_valor_diario_vigencia
  DROP CONSTRAINT IF EXISTS viaticos_valor_diario_vigencia_no_overlap;

ALTER TABLE public.viaticos_valor_diario_vigencia
  ADD CONSTRAINT viaticos_valor_diario_vigencia_no_overlap
  EXCLUDE USING gist (
    daterange(
      vigencia_desde,
      CASE WHEN vigencia_hasta IS NULL THEN 'infinity'::date ELSE vigencia_hasta + 1 END,
      '[)'
    ) WITH &&
  ) DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION public.viaticos_valor_diario_rebuild_chain()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH ordered AS (
    SELECT
      id,
      lead(vigencia_desde) OVER (ORDER BY vigencia_desde ASC) AS next_desde
    FROM public.viaticos_valor_diario_vigencia
  )
  UPDATE public.viaticos_valor_diario_vigencia v
  SET
    vigencia_hasta = CASE
      WHEN o.next_desde IS NOT NULL THEN o.next_desde - 1
      ELSE NULL
    END,
    updated_at = now()
  FROM ordered o
  WHERE v.id = o.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.viaticos_valor_diario_update_vigencia(
  p_id uuid,
  p_vigencia_desde date,
  p_monto numeric,
  p_nota text DEFAULT NULL
)
RETURNS public.viaticos_valor_diario_vigencia
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.viaticos_valor_diario_vigencia;
BEGIN
  IF NOT public.is_viaticos_valor_diario_admin() THEN
    RAISE EXCEPTION 'No autorizado para editar vigencias del valor diario';
  END IF;

  IF p_id IS NULL THEN
    RAISE EXCEPTION 'La vigencia a editar es obligatoria';
  END IF;

  IF p_vigencia_desde IS NULL THEN
    RAISE EXCEPTION 'La fecha de inicio de vigencia es obligatoria';
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.viaticos_valor_diario_vigencia WHERE id = p_id
  ) THEN
    RAISE EXCEPTION 'La vigencia indicada no existe';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.viaticos_valor_diario_vigencia v
    WHERE v.vigencia_desde = p_vigencia_desde
      AND v.id <> p_id
  ) THEN
    RAISE EXCEPTION 'Ya existe otra vigencia con esa fecha de inicio';
  END IF;

  UPDATE public.viaticos_valor_diario_vigencia
  SET
    vigencia_desde = p_vigencia_desde,
    monto = p_monto,
    nota = nullif(trim(coalesce(p_nota, '')), ''),
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_row;

  PERFORM public.viaticos_valor_diario_rebuild_chain();

  SELECT * INTO v_row
  FROM public.viaticos_valor_diario_vigencia
  WHERE id = p_id;

  RETURN v_row;
END;
$$;

-- Firma que PostgREST busca desde el modal (p_vigencia_id + p_vigencia_desde).
CREATE OR REPLACE FUNCTION public.viaticos_valor_diario_update(
  p_vigencia_id uuid,
  p_monto numeric,
  p_nota text DEFAULT NULL,
  p_vigencia_desde date DEFAULT NULL
)
RETURNS public.viaticos_valor_diario_vigencia
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_desde date;
BEGIN
  IF p_vigencia_id IS NULL THEN
    RAISE EXCEPTION 'La vigencia a editar es obligatoria';
  END IF;

  SELECT vigencia_desde INTO v_desde
  FROM public.viaticos_valor_diario_vigencia
  WHERE id = p_vigencia_id;

  IF v_desde IS NULL THEN
    RAISE EXCEPTION 'La vigencia indicada no existe';
  END IF;

  RETURN public.viaticos_valor_diario_update_vigencia(
    p_vigencia_id,
    coalesce(p_vigencia_desde, v_desde),
    p_monto,
    p_nota
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.viaticos_valor_diario_delete_vigencia(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_viaticos_valor_diario_admin() THEN
    RAISE EXCEPTION 'No autorizado para eliminar vigencias del valor diario';
  END IF;

  IF p_id IS NULL THEN
    RAISE EXCEPTION 'La vigencia a eliminar es obligatoria';
  END IF;

  DELETE FROM public.viaticos_valor_diario_vigencia
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La vigencia indicada no existe';
  END IF;

  PERFORM public.viaticos_valor_diario_rebuild_chain();
END;
$$;

-- Tras un alta, rearmar cadena para no dejar huecos si la franja previa ya estaba cerrada.
CREATE OR REPLACE FUNCTION public.viaticos_valor_diario_insert_vigencia(
  p_vigencia_desde date,
  p_monto numeric,
  p_nota text DEFAULT NULL
)
RETURNS public.viaticos_valor_diario_vigencia
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.viaticos_valor_diario_vigencia;
  v_uid uuid := auth.uid();
BEGIN
  IF p_vigencia_desde IS NULL THEN
    RAISE EXCEPTION 'La fecha de inicio de vigencia es obligatoria';
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.viaticos_valor_diario_vigencia v
    WHERE v.vigencia_desde = p_vigencia_desde
  ) THEN
    RAISE EXCEPTION 'Ya existe una vigencia con esa fecha de inicio';
  END IF;

  INSERT INTO public.viaticos_valor_diario_vigencia (
    monto,
    vigencia_desde,
    vigencia_hasta,
    nota,
    creado_por
  )
  VALUES (
    p_monto,
    p_vigencia_desde,
    NULL,
    nullif(trim(coalesce(p_nota, '')), ''),
    v_uid
  )
  RETURNING * INTO v_row;

  PERFORM public.viaticos_valor_diario_rebuild_chain();

  SELECT * INTO v_row
  FROM public.viaticos_valor_diario_vigencia
  WHERE id = v_row.id;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.viaticos_valor_diario_rebuild_chain() TO authenticated;
GRANT EXECUTE ON FUNCTION public.viaticos_valor_diario_update_vigencia(uuid, date, numeric, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.viaticos_valor_diario_update(uuid, numeric, text, date)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.viaticos_valor_diario_delete_vigencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.viaticos_valor_diario_insert_vigencia(date, numeric, text)
  TO anon, authenticated;

-- Cierra el hueco 16/09–30/09 (86000 quedaba hasta 15/09 con 92000 desde 01/10).
SELECT public.viaticos_valor_diario_rebuild_chain();

NOTIFY pgrst, 'reload schema';
