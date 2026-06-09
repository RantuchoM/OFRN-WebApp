-- Editar y eliminar franjas del historial de valor diario (solo admin).

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

GRANT EXECUTE ON FUNCTION public.viaticos_valor_diario_rebuild_chain() TO authenticated;
GRANT EXECUTE ON FUNCTION public.viaticos_valor_diario_update_vigencia(uuid, date, numeric, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.viaticos_valor_diario_delete_vigencia(uuid) TO authenticated;
