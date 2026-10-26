-- Ciclos de Cámara 2027: un programa tipo Ensamble por ensamble local × 4 ciclos.
-- Idempotencia: borra «Ciclo de Cámara %» con fecha_desde en 2027.
-- I (abr), II Música Argentina (jun), III Música para crecer (oct didácticos),
-- IV tango/folklore/jazz/coros (15–18 dic; conciertos 17 y 18).

DO $$
DECLARE
  r record;
  v_gid bigint;
  v_desde date;
  v_hasta date;
  v_sub text;
  v_d date;
  v_h time;
  v_horas time[] := ARRAY['09:00'::time, '10:00'::time, '14:00'::time, '15:00'::time];
BEGIN
  -- Idempotente: borrar ciclos de cámara 2027 previos
  DELETE FROM public.eventos e
  USING public.programas p
  WHERE e.id_gira = p.id
    AND p.nombre_gira LIKE 'Ciclo de Cámara %'
    AND p.fecha_desde >= DATE '2027-01-01'
    AND p.fecha_desde <= DATE '2027-12-31';

  DELETE FROM public.giras_fuentes gf
  USING public.programas p
  WHERE gf.id_gira = p.id
    AND p.nombre_gira LIKE 'Ciclo de Cámara %'
    AND p.fecha_desde >= DATE '2027-01-01'
    AND p.fecha_desde <= DATE '2027-12-31';

  DELETE FROM public.giras_localidades gl
  USING public.programas p
  WHERE gl.id_gira = p.id
    AND p.nombre_gira LIKE 'Ciclo de Cámara %'
    AND p.fecha_desde >= DATE '2027-01-01'
    AND p.fecha_desde <= DATE '2027-12-31';

  DELETE FROM public.giras_tramo_cortes c
  USING public.programas p
  WHERE c.id_gira = p.id
    AND p.nombre_gira LIKE 'Ciclo de Cámara %'
    AND p.fecha_desde >= DATE '2027-01-01'
    AND p.fecha_desde <= DATE '2027-12-31';

  DELETE FROM public.giras_tramo_segmentos s
  USING public.programas p
  WHERE s.id_gira = p.id
    AND p.nombre_gira LIKE 'Ciclo de Cámara %'
    AND p.fecha_desde >= DATE '2027-01-01'
    AND p.fecha_desde <= DATE '2027-12-31';

  DELETE FROM public.programas
  WHERE nombre_gira LIKE 'Ciclo de Cámara %'
    AND fecha_desde >= DATE '2027-01-01'
    AND fecha_desde <= DATE '2027-12-31';

  FOR r IN
    SELECT e.id, e.ensamble, e.id_localidad
    FROM public.ensambles e
    WHERE coalesce(e.es_ensamble_local, false) = true
      AND e.id_localidad IS NOT NULL
    ORDER BY e.ensamble
  LOOP
    ------------------------------------------------------------------
    -- 1) Ciclo de Cámara I
    ------------------------------------------------------------------
    IF r.ensamble IN ('ES', 'VN', 'CEB', 'CPAT', 'CAV') THEN
      v_desde := '2027-04-29'::date;
      v_hasta := '2027-04-30'::date;
    ELSE
      v_desde := '2027-04-23'::date;
      v_hasta := '2027-04-24'::date;
    END IF;
    v_sub := 'Ciclo I';

    INSERT INTO public.programas (
      nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
    ) VALUES (
      'Ciclo de Cámara I — ' || r.ensamble,
      v_desde, v_hasta,
      'Ensamble'::tipo_programa,
      NULL,
      'Borrador'::estado_gira,
      v_sub
    ) RETURNING id INTO v_gid;

    INSERT INTO public.giras_localidades (id_gira, id_localidad)
    VALUES (v_gid, r.id_localidad);

    INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto)
    VALUES (v_gid, 'ENSAMBLE', r.id, NULL);

    INSERT INTO public.eventos (
      id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
      es_didactico, is_deleted, visible_agenda, tecnica
    ) VALUES
      (v_gid, 1, v_desde, '20:00'::time, '21:30'::time, 'Concierto Principal',
       false, false, true, false),
      (v_gid, 1, v_hasta, '20:00'::time, '21:30'::time, 'Concierto Principal',
       false, false, true, false);

    ------------------------------------------------------------------
    -- 2) Ciclo de Cámara II — Música Argentina
    ------------------------------------------------------------------
    v_desde := '2027-06-25'::date;
    v_hasta := '2027-06-26'::date;
    v_sub := 'Música Argentina';

    INSERT INTO public.programas (
      nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
    ) VALUES (
      'Ciclo de Cámara II — ' || r.ensamble,
      v_desde, v_hasta,
      'Ensamble'::tipo_programa,
      NULL,
      'Borrador'::estado_gira,
      v_sub
    ) RETURNING id INTO v_gid;

    INSERT INTO public.giras_localidades (id_gira, id_localidad)
    VALUES (v_gid, r.id_localidad);

    INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto)
    VALUES (v_gid, 'ENSAMBLE', r.id, NULL);

    INSERT INTO public.eventos (
      id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
      es_didactico, is_deleted, visible_agenda, tecnica
    ) VALUES
      (v_gid, 1, v_desde, '20:00'::time, '21:30'::time, 'Concierto Principal',
       false, false, true, false),
      (v_gid, 1, v_hasta, '20:00'::time, '21:30'::time, 'Concierto Principal',
       false, false, true, false);

    ------------------------------------------------------------------
    -- 3) Ciclo de Cámara III — Música para crecer (8 didácticos)
    ------------------------------------------------------------------
    v_desde := '2027-10-07'::date;
    v_hasta := '2027-10-08'::date;
    v_sub := 'Música para crecer';

    INSERT INTO public.programas (
      nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
    ) VALUES (
      'Ciclo de Cámara III — ' || r.ensamble,
      v_desde, v_hasta,
      'Ensamble'::tipo_programa,
      NULL,
      'Borrador'::estado_gira,
      v_sub
    ) RETURNING id INTO v_gid;

    INSERT INTO public.giras_localidades (id_gira, id_localidad)
    VALUES (v_gid, r.id_localidad);

    INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto)
    VALUES (v_gid, 'ENSAMBLE', r.id, NULL);

    FOREACH v_d IN ARRAY ARRAY[v_desde, v_hasta]
    LOOP
      FOREACH v_h IN ARRAY v_horas
      LOOP
        INSERT INTO public.eventos (
          id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
          es_didactico, is_deleted, visible_agenda, tecnica
        ) VALUES (
          v_gid, 1, v_d, v_h, (v_h + interval '45 minutes')::time,
          'Concierto didáctico',
          true, false, true, false
        );
      END LOOP;
    END LOOP;

    ------------------------------------------------------------------
    -- 4) Ciclo de Cámara IV — tango / folklore / jazz / coros
    --    Programa 15–18 dic; 1 concierto el 17 y 1 el 18.
    ------------------------------------------------------------------
    v_desde := '2027-12-15'::date;
    v_hasta := '2027-12-18'::date;
    v_sub := 'Tango, folklore o jazz o participación en conciertos con coros';

    INSERT INTO public.programas (
      nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
    ) VALUES (
      'Ciclo de Cámara IV — ' || r.ensamble,
      v_desde, v_hasta,
      'Ensamble'::tipo_programa,
      NULL,
      'Borrador'::estado_gira,
      v_sub
    ) RETURNING id INTO v_gid;

    INSERT INTO public.giras_localidades (id_gira, id_localidad)
    VALUES (v_gid, r.id_localidad);

    INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto)
    VALUES (v_gid, 'ENSAMBLE', r.id, NULL);

    INSERT INTO public.eventos (
      id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
      es_didactico, is_deleted, visible_agenda, tecnica
    ) VALUES
      (v_gid, 1, '2027-12-17'::date, '20:00'::time, '21:30'::time,
       'Concierto Principal', false, false, true, false),
      (v_gid, 1, '2027-12-18'::date, '20:00'::time, '21:30'::time,
       'Concierto Principal', false, false, true, false);
  END LOOP;
END $$;

SELECT count(*) AS programas,
  (SELECT count(*) FROM eventos e
   JOIN programas p ON p.id = e.id_gira
   WHERE p.nombre_gira LIKE 'Ciclo de Cámara %'
     AND p.fecha_desde >= DATE '2027-01-01'
     AND p.fecha_desde <= DATE '2027-12-31') AS eventos
FROM programas
WHERE nombre_gira LIKE 'Ciclo de Cámara %'
  AND fecha_desde >= DATE '2027-01-01'
  AND fecha_desde <= DATE '2027-12-31';
