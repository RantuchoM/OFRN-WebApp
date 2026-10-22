-- Giras Sinfónico / Camerata Filarmónica 2027
-- Generado por scripts/apply-giras-2027.mjs — 2026-10-20T22:03:26.159Z
-- Tag: [seed:giras2027-sinf-cf]
DO $$
DECLARE
  v_existing int;
  v_gid bigint;
BEGIN
  SELECT count(*) INTO v_existing
  FROM public.programas
  WHERE coalesce(subtitulo, '') LIKE '%[seed:giras2027-sinf-cf]%';
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'Ya existen % programas con tag % — aborto (idempotencia)', v_existing, '[seed:giras2027-sinf-cf]';
  END IF;

  -- Programa #1: Apertura de temporada: Mahler y Wagner
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Apertura de temporada: Mahler y Wagner',
    '2027-02-17'::date,
    '2027-02-20'::date,
    'Sinfónico'::tipo_programa,
    'Andina',
    'Borrador'::estado_gira,
    'Doc: Bariloche - Frutillar (Chile). Por ahora solo Bariloche; Frutillar pendiente. [seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 5);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Cuerdas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Maderas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Bronces');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Percusión');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Prod.');

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-02-19'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'Fecha tentativa (vie). Nota: también Frutillar (Chile) en el doc — pendiente.',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-02-20'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'Fecha tentativa (sáb)',
    false,
    true,
    false
  );

  -- Programa #2: Beethoven 200 años
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Beethoven 200 años',
    '2027-03-04'::date,
    '2027-03-07'::date,
    'Sinfónico'::tipo_programa,
    'Valle',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 60);
  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 57);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Cuerdas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Maderas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Bronces');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Percusión');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Prod.');

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-03-05'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'Círculo Italiano (nota doc)',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-03-07'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'Jardines de Economía (nota doc)',
    false,
    true,
    false
  );

  -- Programa #3: Directora mujer: Andrea Vela / Cinthia Aliretti
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Directora mujer: Andrea Vela / Cinthia Aliretti',
    '2027-03-30'::date,
    '2027-04-02'::date,
    'Sinfónico'::tipo_programa,
    'Valle',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 16);
  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 30);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Cuerdas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Maderas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Bronces');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Percusión');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Prod.');

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-04-01'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'Fecha tentativa',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-04-02'::date,
    '12:00'::time,
    '13:30'::time,
    'Concierto Principal',
    'Sábado 12:00 (doc)',
    false,
    true,
    false
  );

  -- Programa #4: Rusia
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Rusia',
    '2027-04-21'::date,
    '2027-04-24'::date,
    'Camerata Filarmónica'::tipo_programa,
    'Andina',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 5);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 583032, NULL);
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 4, NULL);
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 34640, NULL);
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 7, NULL);

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-04-23'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'x2 Bariloche',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-04-24'::date,
    '12:00'::time,
    '13:30'::time,
    'Concierto Principal',
    'Sábado 12:00',
    false,
    true,
    false
  );

  -- Programa #5: B y W.
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'B y W.',
    '2027-05-05'::date,
    '2027-05-08'::date,
    'Camerata Filarmónica'::tipo_programa,
    'Atlántica',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 57);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Maderas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Bronces');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Percusión');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Prod.');

  INSERT INTO public.giras_integrantes (id_gira, id_integrante, estado, rol)
  VALUES (v_gid, 8456903, 'confirmado', 'musico');

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-05-07'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'x2 Viedma',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-05-08'::date,
    '12:00'::time,
    '13:30'::time,
    'Concierto Principal',
    'Sábado 12:00',
    false,
    true,
    false
  );

  -- Programa #6: Cuerdas CFMon
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Cuerdas CFMon',
    '2027-05-19'::date,
    '2027-05-22'::date,
    'Camerata Filarmónica'::tipo_programa,
    'Andina',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 23);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 583032, NULL);

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-05-21'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'x2 El Bolsón',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-05-22'::date,
    '12:00'::time,
    '13:30'::time,
    'Concierto Principal',
    'Sábado 12:00',
    false,
    true,
    false
  );

  -- Programa #7: Gala lírica italiana / Strauss
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Gala lírica italiana / Strauss',
    '2027-06-02'::date,
    '2027-06-05'::date,
    'Sinfónico'::tipo_programa,
    'Valle',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 16);
  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 60);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Cuerdas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Maderas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Bronces');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Percusión');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Prod.');

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-06-04'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    NULL,
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-06-05'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    NULL,
    false,
    true,
    false
  );

  -- Programa #8: Mannheim — Choele Choel y SAO
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Mannheim — Choele Choel y SAO',
    '2027-07-07'::date,
    '2027-07-10'::date,
    'Camerata Filarmónica'::tipo_programa,
    'Valle',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 14);
  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 51);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 226257, NULL);
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 195467, NULL);

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-07-09'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    NULL,
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-07-10'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    NULL,
    false,
    true,
    false
  );

  -- Programa #9: Mannheim — Viedma (agosto)
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Mannheim — Viedma (agosto)',
    '2027-08-04'::date,
    '2027-08-07'::date,
    'Camerata Filarmónica'::tipo_programa,
    'Atlántica',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 57);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 226257, NULL);
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 195467, NULL);

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-08-06'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'x2 Viedma',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-08-07'::date,
    '11:00'::time,
    '12:30'::time,
    'Concierto Principal',
    'Sábado 11:00',
    false,
    true,
    false
  );

  -- Programa #10: Beethoven 200 años x 3
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Beethoven 200 años x 3',
    '2027-08-18'::date,
    '2027-08-21'::date,
    'Sinfónico'::tipo_programa,
    'Valle',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 16);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Cuerdas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Maderas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Bronces');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Percusión');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Prod.');

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-08-20'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'x2 Cipolletti',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-08-21'::date,
    '11:00'::time,
    '12:30'::time,
    'Concierto Principal',
    'Sábado 11:00',
    false,
    true,
    false
  );

  -- Programa #11: FIMBA 2027
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'FIMBA 2027',
    '2027-09-15'::date,
    '2027-09-19'::date,
    'Sinfónico'::tipo_programa,
    'Andina',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 5);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Cuerdas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Maderas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Bronces');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Percusión');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Prod.');

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-09-16'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'Jueves — The Fidelio Trío (nota doc)',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-09-18'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'Sábado — Yamandú Costa (nota doc)',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-09-19'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'Domingo — Concierto Pop',
    false,
    true,
    false
  );

  -- Programa #12: Mannheim — Viedma (octubre)
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Mannheim — Viedma (octubre)',
    '2027-10-21'::date,
    '2027-10-23'::date,
    'Camerata Filarmónica'::tipo_programa,
    'Atlántica',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 57);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 226257, NULL);
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 195467, NULL);

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-10-22'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'x2 Viedma',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-10-23'::date,
    '11:00'::time,
    '12:30'::time,
    'Concierto Principal',
    'Sábado 11:00',
    false,
    true,
    false
  );

  -- Programa #13: Director invitado — Cipolletti y Regina
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Director invitado — Cipolletti y Regina',
    '2027-11-03'::date,
    '2027-11-06'::date,
    'Sinfónico'::tipo_programa,
    'Valle',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 16);
  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 60);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Cuerdas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Maderas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Bronces');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Percusión');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Prod.');

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-11-05'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    NULL,
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-11-06'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    NULL,
    false,
    true,
    false
  );

  -- Programa #14: Obras Juan Falú
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Obras Juan Falú',
    '2027-11-12'::date,
    '2027-11-15'::date,
    'Camerata Filarmónica'::tipo_programa,
    'Andina',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 23);
  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 46);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 583032, NULL);
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Percusión');

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-11-13'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    NULL,
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-11-15'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    NULL,
    false,
    true,
    false
  );

  -- Programa #15: Linues Lerner
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Linues Lerner',
    '2027-12-01'::date,
    '2027-12-04'::date,
    'Sinfónico'::tipo_programa,
    'Andina',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 5);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Cuerdas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Maderas');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Bronces');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Percusión');
  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, 'Prod.');

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-12-03'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'x2 Bariloche',
    false,
    true,
    false
  );
  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-12-04'::date,
    '12:00'::time,
    '13:30'::time,
    'Concierto Principal',
    'Sábado 12:00',
    false,
    true,
    false
  );

  -- Programa #16: Sinfónico-Coral
  INSERT INTO public.programas (
    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo
  ) VALUES (
    'Sinfónico-Coral',
    '2027-12-06'::date,
    '2027-12-08'::date,
    'Camerata Filarmónica'::tipo_programa,
    'Andina',
    'Borrador'::estado_gira,
    '[seed:giras2027-sinf-cf]'
  ) RETURNING id INTO v_gid;

  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, 5);

  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', 583032, NULL);

  INSERT INTO public.eventos (
    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,
    observaciones_internas, is_deleted, visible_agenda, tecnica
  ) VALUES (
    v_gid,
    1,
    '2027-12-08'::date,
    '20:00'::time,
    '21:30'::time,
    'Concierto Principal',
    'Miércoles 8 — Centro Cívico',
    false,
    true,
    false
  );

END $$;