-- Vacantes: no inventar mail placeholder.
-- integrantes.mail es nullable y no tiene UNIQUE; el patrón
-- vacante-*@placeholder.system solo ensuciaba copiar/enviar mails.
-- El DNI sintético SIM-<token> sí se conserva (dni es UNIQUE).

CREATE OR REPLACE FUNCTION public.crear_vacante_core(
  p_id_gira bigint,
  p_etiqueta text,
  p_id_localidad bigint,
  p_id_instr text DEFAULT NULL,
  p_genero text DEFAULT NULL,
  p_nomenclador text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_etiqueta text := btrim(COALESCE(p_etiqueta, ''));
  v_nom text := btrim(COALESCE(p_nomenclador, ''));
  v_apellido text;
  v_genero public.genero;
  v_token text;
  v_id bigint;
BEGIN
  IF p_id_gira IS NULL THEN
    RAISE EXCEPTION 'Falta id de gira';
  END IF;
  IF v_etiqueta = '' THEN
    RAISE EXCEPTION 'La etiqueta / rol de la vacante es obligatorio';
  END IF;
  IF p_id_localidad IS NULL THEN
    RAISE EXCEPTION 'La localidad de origen es obligatoria';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.programas WHERE id = p_id_gira) THEN
    RAISE EXCEPTION 'La gira no existe';
  END IF;

  IF v_nom <> '' THEN
    v_apellido := v_etiqueta || ' (' || v_nom || ')';
  ELSE
    v_apellido := v_etiqueta;
  END IF;

  IF nullif(btrim(COALESCE(p_genero, '')), '') IS NULL THEN
    v_genero := NULL;
  ELSIF btrim(p_genero) IN ('F', 'M', '-') THEN
    v_genero := btrim(p_genero)::public.genero;
  ELSE
    RAISE EXCEPTION 'Género inválido';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.integrantes (
    nombre, apellido, es_simulacion, genero,
    id_localidad, id_instr, dni, mail, condicion
  ) VALUES (
    'Vacante',
    v_apellido,
    true,
    v_genero,
    p_id_localidad,
    NULLIF(p_id_instr, ''),
    'SIM-' || substr(v_token, 1, 12),
    NULL,
    'Refuerzo'
  )
  RETURNING id INTO v_id;

  INSERT INTO public.giras_integrantes (id_gira, id_integrante, rol, estado)
  VALUES (p_id_gira, v_id, 'musico', 'confirmado');

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

UPDATE public.integrantes
SET mail = NULL
WHERE es_simulacion IS TRUE
  AND (
    mail ILIKE 'vacante-%@placeholder.system'
    OR mail ILIKE 'vacante-%@sistema.local'
  );
