-- Fix: giras_logistica_admision.target_ids y giras_logistica_rutas.target_ids
-- son text[] (persona, categoría o grupo). bigint = ANY(text[]) abortaba
-- toda fusión con "operator does not exist: bigint = text".
-- giras_logistica_reglas.target_ids sigue siendo bigint[] y no se toca.

DO $patch$
DECLARE
  src text;
  patched text;
BEGIN
  src := pg_get_functiondef('public.merge_integrantes(bigint, bigint)'::regprocedure);
  patched := regexp_replace(
    src,
    'SET target_ids = public\.merge_integrantes_remap_bigint_array\(target_ids, p_source_id, p_target_id\)[[:space:]]+WHERE target_ids IS NOT NULL AND p_source_id = ANY\(target_ids\);',
    $n$SET target_ids = public.merge_integrantes_remap_text_id_array(target_ids, p_source_id, p_target_id)
  WHERE target_ids IS NOT NULL AND p_source_id::text = ANY(target_ids);$n$,
    'g'
  );
  IF patched IS NOT DISTINCT FROM src THEN
    RAISE EXCEPTION 'merge_integrantes: no se encontró el remap bigint de target_ids en admisión/rutas';
  END IF;
  EXECUTE patched;
END;
$patch$;

DO $patch$
DECLARE
  src text;
  patched text;
BEGIN
  src := pg_get_functiondef('public.get_integrante_delete_blockers(bigint)'::regprocedure);
  patched := regexp_replace(
    src,
    'SELECT id FROM public\.giras_logistica_admision WHERE id_integrante = p_id[[:space:]]+UNION ALL[[:space:]]+SELECT id FROM public\.giras_logistica_rutas WHERE id_integrante = p_id[[:space:]]+UNION ALL[[:space:]]+SELECT id FROM public\.giras_logistica_reglas_transportes WHERE id_integrante = p_id',
    $n$SELECT id FROM public.giras_logistica_admision
    WHERE id_integrante = p_id
       OR p_id::text = ANY(COALESCE(target_ids, '{}'::text[]))
    UNION ALL
    SELECT id FROM public.giras_logistica_rutas
    WHERE id_integrante = p_id
       OR p_id::text = ANY(COALESCE(target_ids, '{}'::text[]))
    UNION ALL
    SELECT id FROM public.giras_logistica_reglas_transportes
    WHERE id_integrante = p_id
       OR p_id::text = ANY(COALESCE(target_ids, '{}'::text[]))$n$,
    'g'
  );
  IF patched IS NOT DISTINCT FROM src THEN
    RAISE EXCEPTION 'get_integrante_delete_blockers: no se encontró el bloque de logística a parchear';
  END IF;
  EXECUTE patched;
END;
$patch$;
