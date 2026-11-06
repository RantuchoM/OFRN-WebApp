-- CUERDAS — Abuelita Lorenza, Pastorcita de Antinaco, La Nochera, Tucumana [cuerdas]
-- Generado: 2026-11-06

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Gonz_lez_Edmundo_Nicol_s_Pimpe_ bigint;
  _id_comp_Tradicional_ bigint;
  _id_comp_Cabezas_Ernesto bigint;
  _id_comp_Leguizamon_Gustavo_Cuchi_ bigint;
  _id_arr_Chazarreta_L_ bigint;
  _id_arr_D_Antona_Esteban bigint;
  _id_arr_Lema_Germ_n bigint;
BEGIN
  SELECT id INTO _id_comp_Gonz_lez_Edmundo_Nicol_s_Pimpe_ FROM compositores WHERE apellido = 'González' AND (nombre = 'Edmundo Nicolás "Pimpe"' OR (nombre IS NULL AND 'Edmundo Nicolás "Pimpe"' IS NULL)) LIMIT 1;
  IF _id_comp_Gonz_lez_Edmundo_Nicol_s_Pimpe_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('González', 'Edmundo Nicolás "Pimpe"') RETURNING id INTO _id_comp_Gonz_lez_Edmundo_Nicol_s_Pimpe_;
  END IF;

  SELECT id INTO _id_comp_Tradicional_ FROM compositores WHERE apellido = 'Tradicional' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Tradicional_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Tradicional', NULL) RETURNING id INTO _id_comp_Tradicional_;
  END IF;

  SELECT id INTO _id_comp_Cabezas_Ernesto FROM compositores WHERE apellido = 'Cabezas' AND (nombre = 'Ernesto' OR (nombre IS NULL AND 'Ernesto' IS NULL)) LIMIT 1;
  IF _id_comp_Cabezas_Ernesto IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Cabezas', 'Ernesto') RETURNING id INTO _id_comp_Cabezas_Ernesto;
  END IF;

  SELECT id INTO _id_comp_Leguizamon_Gustavo_Cuchi_ FROM compositores WHERE apellido = 'Leguizamon' AND (nombre = 'Gustavo "Cuchi"' OR (nombre IS NULL AND 'Gustavo "Cuchi"' IS NULL)) LIMIT 1;
  IF _id_comp_Leguizamon_Gustavo_Cuchi_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Leguizamon', 'Gustavo "Cuchi"') RETURNING id INTO _id_comp_Leguizamon_Gustavo_Cuchi_;
  END IF;

  SELECT id INTO _id_arr_Chazarreta_L_ FROM compositores WHERE apellido = 'Chazarreta' AND (nombre = 'L.' OR (nombre IS NULL AND 'L.' IS NULL)) LIMIT 1;
  IF _id_arr_Chazarreta_L_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Chazarreta', 'L.') RETURNING id INTO _id_arr_Chazarreta_L_;
  END IF;

  SELECT id INTO _id_arr_D_Antona_Esteban FROM compositores WHERE apellido = 'D´Antona' AND (nombre = 'Esteban' OR (nombre IS NULL AND 'Esteban' IS NULL)) LIMIT 1;
  IF _id_arr_D_Antona_Esteban IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('D´Antona', 'Esteban') RETURNING id INTO _id_arr_D_Antona_Esteban;
  END IF;

  SELECT id INTO _id_arr_Lema_Germ_n FROM compositores WHERE apellido = 'Lema' AND (nombre = 'Germán' OR (nombre IS NULL AND 'Germán' IS NULL)) LIMIT 1;
  IF _id_arr_Lema_Germ_n IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Lema', 'Germán') RETURNING id INTO _id_arr_Lema_Germ_n;
  END IF;

  -- <p>Abuelita Lorenza (Chacarera doble)</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>Abuelita Lorenza (Chacarera doble)</p>' AND oc.id_compositor = _id_arr_Chazarreta_L_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Abuelita Lorenza (Chacarera doble)</p>',
      _id_arr_Chazarreta_L_,
      NULL,
      NULL,
      'Oficial',
      'CUERDAS — González, E. - Abuelita Lorenza. Chacarera doble de Edmundo Nicolás "Pimpe" González (Catamarca). Arreglo para cuarteto (Vln 1, Vln 2, Vla, Vc) de Luis Chazarreta.',
      'Str',
      'https://drive.google.com/drive/folders/1iM1VQ12BYF7jDL0UOCEEjgmhbYA_PdMw'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Gonz_lez_Edmundo_Nicol_s_Pimpe_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Chazarreta_L_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Chazarreta_L_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1QCiiW-IGVwG1HAdK3U6v6rEz-NhJZqw1/view?usp=drivesdk","description":"Viola - Abuelita Lorenza - González, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1r56T8-RwbsXw-7954phgG15Nf0xsNY5i/view?usp=drivesdk","description":"Violín 1 - Abuelita Lorenza - González, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1yMwir4hY2JpVX5UkuoA8LwM1NY1kdTzF/view?usp=drivesdk","description":"Violín 2 - Abuelita Lorenza - González, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ACS_gGelKBXIIIO32CLcYuSpZ12Cc8Hq/view?usp=drivesdk","description":"Violoncello - Abuelita Lorenza - González, E.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Abuelita Lorenza (Chacarera doble)</p>';
  END IF;

  -- <p>Pastorcita de Antinaco (Carnavalito)</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>Pastorcita de Antinaco (Carnavalito)</p>' AND oc.id_compositor = _id_arr_Chazarreta_L_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Pastorcita de Antinaco (Carnavalito)</p>',
      _id_arr_Chazarreta_L_,
      NULL,
      NULL,
      'Oficial',
      'CUERDAS — Chazarreta, L. - Pastorcita de Antinaco. Cuarteto (Vln 1, Vln 2, Vla, Vc). Carnavalito tradicional; el zip acredita Arr. Luis Chazarreta.',
      'Str',
      'https://drive.google.com/drive/folders/1DcHNjLY4mXj0KK5POzudyjHq3GfYn4DB'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Tradicional_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Chazarreta_L_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Chazarreta_L_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1WSiMkACJXHjWdbipf-QI4uFStS5r5Ooi/view?usp=drivesdk","description":"Viola - Pastorcita de Antinaco - Chazarreta, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/10pdxG4A5HHMPooXP8EZ0fGhJ2VEt0Zqa/view?usp=drivesdk","description":"Violín 1 - Pastorcita de Antinaco - Chazarreta, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1pnPF2O-fpx4s4c1yGZpFiUD9M5uW_YuL/view?usp=drivesdk","description":"Violín 2 - Pastorcita de Antinaco - Chazarreta, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ZDIU2H0vNvs90nuKL54Q3k5QMiNh0XJo/view?usp=drivesdk","description":"Violoncello - Pastorcita de Antinaco - Chazarreta, L.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Pastorcita de Antinaco (Carnavalito)</p>';
  END IF;

  -- <p>La Nochera (Zamba)</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>La Nochera (Zamba)</p>' AND oc.id_compositor = _id_arr_D_Antona_Esteban
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>La Nochera (Zamba)</p>',
      _id_arr_D_Antona_Esteban,
      NULL,
      NULL,
      'Oficial',
      'CUERDAS — Cabezas, E. - La Nochera. Zamba. Música: Ernesto Cabezas. Poesía: Jaime Dávalos. Arr. Esteban D´Antona. Cuarteto (Vln 1, Vln 2, Vla, Vc).',
      'Str',
      'https://drive.google.com/drive/folders/1o0nHzCxnkZY8N2gPdh2bh75KOkPQV7nJ'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Cabezas_Ernesto, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_D_Antona_Esteban, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_D_Antona_Esteban
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/18Pvo7ti_NiFDqo_n6U4-lvrzSWCe0oq2/view?usp=drivesdk","description":"Viola - La Nochera - Cabezas, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1pWJIG7FSfbvuidvilFpZ6lo-9uQF2B-D/view?usp=drivesdk","description":"Violín 1 - La Nochera - Cabezas, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1W4AzKTiW_lgXNnFN-jSFtubdKvOby-0N/view?usp=drivesdk","description":"Violín 2 - La Nochera - Cabezas, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1jEIQB1WMUrBsNXFSTfDLxwWmeIXqGpu_/view?usp=drivesdk","description":"Violoncello - La Nochera - Cabezas, E.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>La Nochera (Zamba)</p>';
  END IF;

  -- Si Llega A Ser Tucumana [cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Si Llega A Ser Tucumana [cuerdas]' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Si Llega A Ser Tucumana [cuerdas]',
      _id_arr_Lema_Germ_n,
      NULL,
      NULL,
      'Oficial',
      'CUERDAS — Leguizamón-Lema - Si Llega A Ser Tucumana [cuerdas]. Arreglo de cuerdas de Germán Lema (Vln 1, Vln 2, Vla, Vc, Cb). Distinto del arreglo con vibráfono, marimba y bajo eléctrico (obra 1432).',
      'Str',
      'https://drive.google.com/drive/folders/1u6R_pl_ptssE1fQkXlZl-DGSCjsZ8-of'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Leguizamon_Gustavo_Cuchi_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1hsd8fLTnZFyJd_iAH05oOh-JAdXIqEmi/view?usp=drivesdk","description":"Contrabajo - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1slAUObJNji4bueKAJWrMTQvHTvrRxT3v/view?usp=drivesdk","description":"SCORE - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1fdox_rzsPgDVH6IMVt8UiXBPoTcnj_Cc/view?usp=drivesdk","description":"Viola - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1MTShkJ-I3F0fzRmS9oNtcmaArco1sTjP/view?usp=drivesdk","description":"Violín 1 - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1WfRdeN1I7K8PAB5ZNdY3m0gY8ab5UCz9/view?usp=drivesdk","description":"Violín 2 - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ts9i29CeVYkgbmnsA6TOvV1xBBery56R/view?usp=drivesdk","description":"Violoncello - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Si Llega A Ser Tucumana [cuerdas]';
  END IF;

END $$;

-- Si Llega A Ser Tucumana (obra 1432): vibráfono, marimba y bajo.
-- El arreglo de cuerdas es otra obra. Estas partes no vuelven a 1432.
DELETE FROM obras_particellas
WHERE id_obra = 1432
  AND nombre_archivo IN ('Violín 1', 'Violín 2', 'Viola', 'Violoncello', 'Contrabajo', 'SCORE Cuerdas');

UPDATE obras
SET link_drive = 'https://drive.google.com/drive/folders/1jccTRWVayHLcq2-mQ4kUij3dlcpyiJfg'
WHERE id = 1432;

UPDATE obras_particellas
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eRP36d5V4jO3o8beZxdzsO25LisKQCAM/view?usp=drivesdk","description":"Bajo - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]'
WHERE id_obra = 1432
  AND nombre_archivo = 'Bajo';

UPDATE obras_particellas
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1E8bVKbNZayJEtomhAso_Ig2Y-q2fsPNl/view?usp=drivesdk","description":"Marimba 1 - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]'
WHERE id_obra = 1432
  AND nombre_archivo = 'Marimba 1';

UPDATE obras_particellas
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1UmYD0IUT6q7ZParI7a29K-V6x4cAbBwx/view?usp=drivesdk","description":"Marimba 2 - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]'
WHERE id_obra = 1432
  AND nombre_archivo = 'Marimba 2';

UPDATE obras_particellas
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1lPWNYvlz7HOemiB1tg5uXE1kktk-vR_E/view?usp=drivesdk","description":"SCORE - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]'
WHERE id_obra = 1432
  AND nombre_archivo = 'SCORE';

UPDATE obras_particellas
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qlvQl0ou5FYHsFMbSC20GXlLcBK9iPj5/view?usp=drivesdk","description":"Vibráfono - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]'
WHERE id_obra = 1432
  AND nombre_archivo = 'Vibráfono';
