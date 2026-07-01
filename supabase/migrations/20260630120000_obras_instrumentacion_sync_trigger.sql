-- Sincroniza obras.instrumentacion desde obras_particellas (réplica de calculateInstrumentation en JS).
-- Fuente de verdad en app: src/utils/instrumentation.js — mantener paridad al cambiar criterios.

CREATE OR REPLACE FUNCTION public._instr_str_contains(haystack text, needle text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(position(lower(needle) IN lower(COALESCE(haystack, ''))), 0) > 0;
$$;

CREATE OR REPLACE FUNCTION public._instr_str_starts_with(haystack text, prefix text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(COALESCE(haystack, '')) LIKE lower(prefix) || '%';
$$;

CREATE OR REPLACE FUNCTION public._instr_capitalize_first(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN COALESCE(raw, '') = '' THEN ''
    ELSE upper(left(raw, 1)) || substring(raw FROM 2)
  END;
$$;

CREATE OR REPLACE FUNCTION public._instr_format_percussion_label(total integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN total IS NULL OR total <= 0 THEN ''
    WHEN total = 1 THEN 'Perc'
    ELSE 'Perc.x' || total::text
  END;
$$;

CREATE OR REPLACE FUNCTION public._instr_fmt_family(cnt integer, notes text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN cnt = 0 THEN '0'
    WHEN notes IS NOT NULL AND cardinality(notes) > 0 THEN
      cnt::text || '(' || array_to_string(notes, ', ') || ')'
    ELSE cnt::text
  END;
$$;

CREATE OR REPLACE FUNCTION public._instr_get_solista_label(
  p_base_name text,
  p_raw_base_name text,
  p_abreviatura text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
BEGIN
  IF p_abreviatura IS NOT NULL AND btrim(p_abreviatura) <> '' THEN
    RETURN btrim(p_abreviatura);
  END IF;

  IF public._instr_str_contains(p_base_name, 'flaut')
     OR public._instr_str_contains(p_base_name, 'picc') THEN
    RETURN 'Fl';
  END IF;
  IF public._instr_str_contains(p_base_name, 'oboe')
     OR public._instr_str_contains(p_base_name, 'corno ing') THEN
    RETURN 'Ob';
  END IF;
  IF public._instr_str_contains(p_base_name, 'clarin')
     OR public._instr_str_contains(p_base_name, 'requinto')
     OR public._instr_str_contains(p_base_name, 'basset') THEN
    RETURN 'Cl';
  END IF;
  IF public._instr_str_contains(p_base_name, 'fagot')
     OR public._instr_str_contains(p_base_name, 'contraf') THEN
    RETURN 'Fg';
  END IF;
  IF public._instr_str_contains(p_base_name, 'corno')
     OR public._instr_str_contains(p_base_name, 'trompa') THEN
    RETURN 'Cor';
  END IF;
  IF public._instr_str_contains(p_base_name, 'trompet')
     OR public._instr_str_contains(p_base_name, 'fliscorno') THEN
    RETURN 'Tpt';
  END IF;
  IF public._instr_str_contains(p_base_name, 'trombon')
     OR public._instr_str_contains(p_base_name, 'trombón') THEN
    RETURN 'Tbn';
  END IF;
  IF public._instr_str_contains(p_base_name, 'tuba')
     OR public._instr_str_contains(p_base_name, 'bombard') THEN
    RETURN 'Tba';
  END IF;
  IF public._instr_str_contains(p_base_name, 'timbal')
     OR public._instr_str_contains(p_base_name, 'perc timb')
     OR public._instr_str_contains(p_base_name, 'perc timp') THEN
    RETURN 'Timp';
  END IF;
  IF public._instr_str_contains(p_base_name, 'perc')
     OR public._instr_str_contains(p_base_name, 'bombo')
     OR public._instr_str_contains(p_base_name, 'platillo')
     OR public._instr_str_contains(p_base_name, 'caja') THEN
    RETURN 'Perc';
  END IF;
  IF public._instr_str_contains(p_base_name, 'arpa') THEN
    RETURN 'Hp';
  END IF;
  IF public._instr_str_contains(p_base_name, 'piano')
     OR public._instr_str_contains(p_base_name, 'celesta')
     OR public._instr_str_contains(p_base_name, 'clavec')
     OR public._instr_str_contains(p_base_name, 'órgano') THEN
    RETURN 'Key';
  END IF;
  IF public._instr_str_contains(p_base_name, 'violonc')
     OR public._instr_str_contains(p_base_name, 'vc') THEN
    RETURN 'Vc';
  END IF;
  IF public._instr_str_contains(p_base_name, 'viol')
     OR public._instr_str_contains(p_base_name, 'contrab') THEN
    RETURN 'Vn';
  END IF;

  RETURN public._instr_capitalize_first(p_raw_base_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_obra_instrumentacion(p_id_obra bigint)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  rec record;
  v_name text;
  v_raw_base text;
  v_base text;
  v_note text;
  v_abrev text;
  sol_label text;

  fl_count integer := 0;
  ob_count integer := 0;
  cl_count integer := 0;
  bn_count integer := 0;
  hn_count integer := 0;
  tpt_count integer := 0;
  tbn_count integer := 0;
  tba_count integer := 0;
  perc_count integer := 0;
  key_count integer := 0;
  harp_count integer := 0;
  fl_notes text[] := '{}';
  ob_notes text[] := '{}';
  cl_notes text[] := '{}';
  bn_notes text[] := '{}';
  hn_notes text[] := '{}';
  tpt_notes text[] := '{}';
  tbn_notes text[] := '{}';
  tba_notes text[] := '{}';
  perc_notes text[] := '{}';
  key_notes text[] := '{}';
  harp_notes text[] := '{}';

  v_timp boolean := false;
  v_str boolean := false;

  others_keys text[] := '{}';
  others_vals integer[] := '{}';
  solista_labels text[] := '{}';

  idx integer;
  clean_name text;
  i integer;

  standard_str text;
  perc_total integer;
  perc_str text;
  is_standard_empty boolean;
  others_str text;
  final_str text;

  solista_unique text[] := '{}';
  solista_counts integer[] := '{}';
  solistas_str text;
  rest text;
BEGIN
  FOR rec IN
    SELECT
      p.nombre_archivo,
      NULLIF(btrim(p.nota_organico), '') AS nota_organico,
      COALESCE(p.es_solista, false) AS es_solista,
      COALESCE(i.instrumento, 'Desconocido') AS instrumento,
      NULLIF(btrim(i.abreviatura), '') AS abreviatura
    FROM public.obras_particellas p
    LEFT JOIN public.instrumentos i ON i.id = p.id_instrumento
    WHERE p.id_obra = p_id_obra
    ORDER BY p.id
  LOOP
    v_name := lower(COALESCE(rec.nombre_archivo, ''));
    v_raw_base := rec.instrumento;
    v_base := lower(v_raw_base);
    v_abrev := rec.abreviatura;
    v_note := rec.nota_organico;

    IF public._instr_str_contains(v_base, 'director')
       OR public._instr_str_contains(v_base, 'conductor')
       OR public._instr_str_contains(v_base, 'score')
       OR public._instr_str_contains(v_base, 'partitura') THEN
      CONTINUE;
    END IF;

    IF rec.es_solista THEN
      sol_label := public._instr_get_solista_label(v_base, v_raw_base, v_abrev);
      solista_labels := array_append(solista_labels, sol_label);
      CONTINUE;
    END IF;

    IF public._instr_str_contains(v_name, 'perc timb')
       OR public._instr_str_contains(v_name, 'perc timp')
       OR public._instr_str_contains(v_name, 'perc. timb')
       OR public._instr_str_contains(v_base, 'timbal') THEN
      v_timp := true;
    ELSIF public._instr_str_starts_with(v_name, 'perc')
       OR public._instr_str_contains(v_base, 'perc')
       OR public._instr_str_contains(v_base, 'bombo')
       OR public._instr_str_contains(v_base, 'platillo')
       OR public._instr_str_contains(v_base, 'caja') THEN
      perc_count := perc_count + 1;
      IF v_note IS NOT NULL THEN perc_notes := array_append(perc_notes, v_note); END IF;
    ELSIF public._instr_str_contains(v_base, 'flaut')
       OR public._instr_str_contains(v_base, 'picc') THEN
      fl_count := fl_count + 1;
      IF v_note IS NOT NULL THEN fl_notes := array_append(fl_notes, v_note); END IF;
    ELSIF public._instr_str_contains(v_base, 'oboe')
       OR public._instr_str_contains(v_base, 'corno ing') THEN
      ob_count := ob_count + 1;
      IF v_note IS NOT NULL THEN ob_notes := array_append(ob_notes, v_note); END IF;
    ELSIF public._instr_str_contains(v_base, 'clarin')
       OR public._instr_str_contains(v_base, 'requinto')
       OR public._instr_str_contains(v_base, 'basset') THEN
      cl_count := cl_count + 1;
      IF v_note IS NOT NULL THEN cl_notes := array_append(cl_notes, v_note); END IF;
    ELSIF public._instr_str_contains(v_base, 'fagot')
       OR public._instr_str_contains(v_base, 'contraf') THEN
      bn_count := bn_count + 1;
      IF v_note IS NOT NULL THEN bn_notes := array_append(bn_notes, v_note); END IF;
    ELSIF public._instr_str_contains(v_base, 'corno')
       OR public._instr_str_contains(v_base, 'trompa') THEN
      hn_count := hn_count + 1;
      IF v_note IS NOT NULL THEN hn_notes := array_append(hn_notes, v_note); END IF;
    ELSIF public._instr_str_contains(v_base, 'trompet')
       OR public._instr_str_contains(v_base, 'fliscorno') THEN
      tpt_count := tpt_count + 1;
      IF v_note IS NOT NULL THEN tpt_notes := array_append(tpt_notes, v_note); END IF;
    ELSIF public._instr_str_contains(v_base, 'trombon')
       OR public._instr_str_contains(v_base, 'trombón') THEN
      tbn_count := tbn_count + 1;
      IF v_note IS NOT NULL THEN tbn_notes := array_append(tbn_notes, v_note); END IF;
    ELSIF public._instr_str_contains(v_base, 'tuba')
       OR public._instr_str_contains(v_base, 'bombard') THEN
      tba_count := tba_count + 1;
      IF v_note IS NOT NULL THEN tba_notes := array_append(tba_notes, v_note); END IF;
    ELSIF public._instr_str_contains(v_base, 'arpa') THEN
      harp_count := harp_count + 1;
      IF v_note IS NOT NULL THEN harp_notes := array_append(harp_notes, v_note); END IF;
    ELSIF public._instr_str_contains(v_base, 'piano')
       OR public._instr_str_contains(v_base, 'celesta')
       OR public._instr_str_contains(v_base, 'clavec')
       OR public._instr_str_contains(v_base, 'órgano') THEN
      key_count := key_count + 1;
      IF v_note IS NOT NULL THEN key_notes := array_append(key_notes, v_note); END IF;
    ELSIF public._instr_str_contains(v_base, 'viol')
       OR public._instr_str_contains(v_base, 'contrab') THEN
      v_str := true;
    ELSE
      clean_name := public._instr_capitalize_first(v_raw_base);
      idx := array_position(others_keys, clean_name);
      IF idx IS NULL THEN
        others_keys := array_append(others_keys, clean_name);
        others_vals := array_append(others_vals, 1);
      ELSE
        others_vals[idx] := others_vals[idx] + 1;
      END IF;
    END IF;
  END LOOP;

  standard_str :=
    public._instr_fmt_family(fl_count, fl_notes) || '.' ||
    public._instr_fmt_family(ob_count, ob_notes) || '.' ||
    public._instr_fmt_family(cl_count, cl_notes) || '.' ||
    public._instr_fmt_family(bn_count, bn_notes) || ' - ' ||
    public._instr_fmt_family(hn_count, hn_notes) || '.' ||
    public._instr_fmt_family(tpt_count, tpt_notes) || '.' ||
    public._instr_fmt_family(tbn_count, tbn_notes) || '.' ||
    public._instr_fmt_family(tba_count, tba_notes);

  perc_total := (CASE WHEN v_timp THEN 1 ELSE 0 END) + perc_count;
  perc_str := public._instr_format_percussion_label(perc_total);
  IF cardinality(perc_notes) > 0 AND perc_str <> '' THEN
    perc_str := perc_str || '(' || array_to_string(perc_notes, ', ') || ')';
  END IF;
  IF perc_str <> '' THEN
    standard_str := standard_str || ' - ' || perc_str;
  END IF;

  IF harp_count > 0 THEN
    standard_str := standard_str || ' - ' ||
      CASE WHEN harp_count > 1 THEN harp_count::text ELSE '' END || 'Hp';
  END IF;
  IF key_count > 0 THEN
    standard_str := standard_str || ' - Key';
  END IF;
  IF v_str THEN
    standard_str := standard_str || ' - Str';
  END IF;

  is_standard_empty :=
    standard_str LIKE '0.0.0.0 - 0.0.0.0%'
    AND perc_total = 0
    AND NOT v_str
    AND harp_count = 0
    AND key_count = 0;

  others_str := '';
  IF cardinality(others_keys) > 0 THEN
    FOR i IN 1..cardinality(others_keys) LOOP
      IF i > 1 THEN
        others_str := others_str || ', ';
      END IF;
      IF others_vals[i] > 1 THEN
        others_str := others_str || others_keys[i] || ' x' || others_vals[i]::text;
      ELSE
        others_str := others_str || others_keys[i];
      END IF;
    END LOOP;
  END IF;

  IF is_standard_empty THEN
    final_str := others_str;
  ELSE
    final_str := replace(replace(standard_str, '0.0.0.0 - 0.0.0.0 - ', ''), '0.0.0.0 - 0.0.0.0', '');
    IF others_str <> '' THEN
      final_str := final_str || ' + ' || others_str;
    END IF;
  END IF;

  solistas_str := '';
  IF cardinality(solista_labels) > 0 THEN
    FOREACH sol_label IN ARRAY solista_labels LOOP
      idx := array_position(solista_unique, sol_label);
      IF idx IS NULL THEN
        solista_unique := array_append(solista_unique, sol_label);
        solista_counts := array_append(solista_counts, 1);
      ELSE
        solista_counts[idx] := solista_counts[idx] + 1;
      END IF;
    END LOOP;

    FOR i IN 1..cardinality(solista_unique) LOOP
      IF i > 1 THEN
        solistas_str := solistas_str || ', ';
      END IF;
      IF solista_counts[i] > 1 THEN
        solistas_str := solistas_str || solista_counts[i]::text || 'x' || solista_unique[i];
      ELSE
        solistas_str := solistas_str || solista_unique[i];
      END IF;
    END LOOP;
  END IF;

  IF solistas_str <> '' THEN
    rest := btrim(regexp_replace(COALESCE(final_str, ''), '(^\s*-\s*|\s*-\s*$)', '', 'g'));
    IF rest <> '' THEN
      RETURN solistas_str || ' - ' || rest;
    END IF;
    RETURN solistas_str;
  END IF;

  RETURN COALESCE(final_str, '');
END;
$$;

COMMENT ON FUNCTION public.calculate_obra_instrumentacion(bigint) IS
  'Réplica de calculateInstrumentation (src/utils/instrumentation.js). Mantener paridad con JS.';

CREATE OR REPLACE FUNCTION public.sync_obra_instrumentacion_from_particellas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_id_obra bigint;
BEGIN
  v_id_obra := COALESCE(NEW.id_obra, OLD.id_obra);
  UPDATE public.obras o
  SET instrumentacion = NULLIF(public.calculate_obra_instrumentacion(v_id_obra), '')
  WHERE o.id = v_id_obra;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS obras_particellas_sync_instrumentacion ON public.obras_particellas;

CREATE TRIGGER obras_particellas_sync_instrumentacion
  AFTER INSERT OR UPDATE OR DELETE ON public.obras_particellas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_obra_instrumentacion_from_particellas();

-- Backfill: obras con particellas (no toca obras sin particellas — aproximación manual).
UPDATE public.obras o
SET instrumentacion = NULLIF(public.calculate_obra_instrumentacion(o.id), '')
WHERE EXISTS (
  SELECT 1
  FROM public.obras_particellas p
  WHERE p.id_obra = o.id
);
