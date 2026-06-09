-- Valor diario oficial con vigencia por fechas (compartido: giras + viáticos manual).

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.viaticos_valor_diario_vigencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monto numeric NOT NULL CHECK (monto > 0),
  vigencia_desde date NOT NULL,
  vigencia_hasta date,
  nota text,
  creado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT viaticos_valor_diario_vigencia_rango_chk
    CHECK (vigencia_hasta IS NULL OR vigencia_hasta >= vigencia_desde)
);

CREATE UNIQUE INDEX IF NOT EXISTS viaticos_valor_diario_vigencia_desde_uidx
  ON public.viaticos_valor_diario_vigencia (vigencia_desde);

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
  );

CREATE INDEX IF NOT EXISTS viaticos_valor_diario_vigencia_desde_idx
  ON public.viaticos_valor_diario_vigencia (vigencia_desde DESC);

DROP TRIGGER IF EXISTS viaticos_valor_diario_vigencia_touch_updated_at
  ON public.viaticos_valor_diario_vigencia;
CREATE TRIGGER viaticos_valor_diario_vigencia_touch_updated_at
  BEFORE UPDATE ON public.viaticos_valor_diario_vigencia
  FOR EACH ROW EXECUTE FUNCTION public.entrada_touch_updated_at();

COMMENT ON TABLE public.viaticos_valor_diario_vigencia IS
  'Montos oficiales de valor diario base con vigencia por fecha. La franja abierta (hasta NULL) es la vigente actual.';

CREATE OR REPLACE FUNCTION public.viaticos_valor_diario_vigente(p_fecha date)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.monto
  FROM public.viaticos_valor_diario_vigencia v
  WHERE p_fecha IS NOT NULL
    AND p_fecha >= v.vigencia_desde
    AND (v.vigencia_hasta IS NULL OR p_fecha <= v.vigencia_hasta)
  ORDER BY v.vigencia_desde DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.viaticos_valor_diario_vigente(date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_viaticos_valor_diario_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    ELSE lower(coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), ''))
         = 'ofrn.archivo@gmail.com'
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_viaticos_valor_diario_admin() TO authenticated;

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
    WHERE v.vigencia_desde >= p_vigencia_desde
  ) THEN
    RAISE EXCEPTION 'Ya existe una vigencia desde esa fecha o posterior';
  END IF;

  UPDATE public.viaticos_valor_diario_vigencia v
  SET
    vigencia_hasta = p_vigencia_desde - 1,
    updated_at = now()
  WHERE v.vigencia_hasta IS NULL
    AND v.vigencia_desde < p_vigencia_desde;

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

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.viaticos_valor_diario_insert_vigencia(date, numeric, text)
  TO anon, authenticated;
