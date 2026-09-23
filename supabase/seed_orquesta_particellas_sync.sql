-- Pärt Christmas/Estonian Lullaby + Vater unser + Händel Messiah (Para acomodar)
-- Generado: 2026-09-23

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_P_rt_Arvo bigint;
  _id_comp_H_ndel_Georg_Friedrich bigint;
BEGIN
  SELECT id INTO _id_comp_P_rt_Arvo FROM compositores WHERE apellido = 'Pärt' AND (nombre = 'Arvo' OR (nombre IS NULL AND 'Arvo' IS NULL)) LIMIT 1;
  IF _id_comp_P_rt_Arvo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Pärt', 'Arvo') RETURNING id INTO _id_comp_P_rt_Arvo;
  END IF;

  SELECT id INTO _id_comp_H_ndel_Georg_Friedrich FROM compositores WHERE apellido = 'Händel' AND (nombre = 'Georg Friedrich' OR (nombre IS NULL AND 'Georg Friedrich' IS NULL)) LIMIT 1;
  IF _id_comp_H_ndel_Georg_Friedrich IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Händel', 'Georg Friedrich') RETURNING id INTO _id_comp_H_ndel_Georg_Friedrich;
  END IF;

  -- Christmas Lullaby
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Christmas Lullaby'
      AND o.observaciones = 'Para acomodar — Pärt, A. - Christmas Lullaby. Copia canónica desde Orquesta particellas (Drive 1ty9kawXplUVU5TjFrv-gLRRNJ8a0AgEF). Cuerdas; sin SCORE.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Christmas Lullaby',
      NULL,
      2002,
      117,
      'Oficial',
      'Para acomodar — Pärt, A. - Christmas Lullaby. Copia canónica desde Orquesta particellas (Drive 1ty9kawXplUVU5TjFrv-gLRRNJ8a0AgEF). Cuerdas; sin SCORE.',
      'Str',
      'https://drive.google.com/open?id=13TrnpJsujmtxEdUedg0Zf74RVSs3l8E1'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_P_rt_Arvo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/19-2yl9Bgkp4lK74QSN57Ft1luEDd1OSn/view?usp=drivesdk","description":"Contrabajo - Christmas Lullaby - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1HseT6ANS76RvkJLl55X3vWkTLb19Cnx_/view?usp=drivesdk","description":"Viola - Christmas Lullaby - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1xYigtNDsGuW2H-fN8l_YM-weM1tgfncm/view?usp=drivesdk","description":"Violín 1 - Christmas Lullaby - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/19LIAUQ08nGjHpuawXQ_lUjWJ_auLazIW/view?usp=drivesdk","description":"Violín 2 - Christmas Lullaby - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1GOCdXpsojvJHTBiAnMvnDpOzFTk9-tD1/view?usp=drivesdk","description":"Violoncello - Christmas Lullaby - Pärt, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Christmas Lullaby';
  END IF;

  -- Estonian Lullaby
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Estonian Lullaby'
      AND o.observaciones = 'Para acomodar — Pärt, A. - Estonian Lullaby (Eesti hällilaul). Copia canónica desde Orquesta particellas (Drive 1KoYSLdTjpYRlTBYl-xklOhfwoAczD2zY). Cuerdas; falta Violín 2 y SCORE.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Estonian Lullaby',
      NULL,
      2002,
      151,
      'Oficial',
      'Para acomodar — Pärt, A. - Estonian Lullaby (Eesti hällilaul). Copia canónica desde Orquesta particellas (Drive 1KoYSLdTjpYRlTBYl-xklOhfwoAczD2zY). Cuerdas; falta Violín 2 y SCORE.',
      'Str',
      'https://drive.google.com/open?id=13OrYDRW4L6-ii-X7GuJgxkCCiaai47Wi'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_P_rt_Arvo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/18FzWgciP41W_0cylPQv5FG0M7nqSXB4J/view?usp=drivesdk","description":"Contrabajo - Estonian Lullaby - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1TDHQBf2qfgsLwKfmfoQOo-rMbUONCJN1/view?usp=drivesdk","description":"Viola - Estonian Lullaby - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1zlwhLMeCRKfm8IC1biMjXkq9gGJw1O0U/view?usp=drivesdk","description":"Violín 1 - Estonian Lullaby - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ZpXAtActR5Ny4Yc9T7iHhTfPCR33CjAL/view?usp=drivesdk","description":"Violoncello - Estonian Lullaby - Pärt, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Estonian Lullaby';
  END IF;

  -- Vater unser
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Vater unser'
      AND o.observaciones = 'Para acomodar — Pärt, A. - Vater unser. Copia canónica desde Orquesta particellas (Drive 1waMy70xbGjxts1GWndboLn205N8_ggTm). SCORE + piano + cuerdas (Violín 1 = part ''Violín''; Violín 2 = part ''Violín (1)'').'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Vater unser',
      NULL,
      2005,
      223,
      'Oficial',
      'Para acomodar — Pärt, A. - Vater unser. Copia canónica desde Orquesta particellas (Drive 1waMy70xbGjxts1GWndboLn205N8_ggTm). SCORE + piano + cuerdas (Violín 1 = part ''Violín''; Violín 2 = part ''Violín (1)'').',
      'Key - Str',
      'https://drive.google.com/open?id=1xWff483Dvqt1DGC6c9zrsxvgYsfyh1-p'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_P_rt_Arvo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1GWxl6EFD5D5lo06V-zhNbw67u6ECiapQ/view?usp=drivesdk","description":"Contrabajo - Vater unser - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1NLKI3A48D_ftE18m0EUrm32Ammgwtb0R/view?usp=drivesdk","description":"Piano - Vater unser - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1WmrAGGip7hcAmA1NTML2NjyHvHD5ind4/view?usp=drivesdk","description":"SCORE - Vater unser - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1tmZnimolLBUpu69g0QtYFwGLuR6_ds3Q/view?usp=drivesdk","description":"Viola - Vater unser - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1LzcqWzUlVx64TRI0DlKJ9qNIDKrmRvbj/view?usp=drivesdk","description":"Violín 1 - Vater unser - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Z4pt6-xUjBZO_5JZckbHAGXVQaWsIEUk/view?usp=drivesdk","description":"Violín 2 - Vater unser - Pärt, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Sk6RgvOFIYjSeAMSXWWTDFlHB02snua4/view?usp=drivesdk","description":"Violoncello - Vater unser - Pärt, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Vater unser';
  END IF;

  -- Messiah [cuerdas y órgano]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Messiah [cuerdas y órgano]'
      AND o.observaciones = 'Para acomodar — Händel, G.F. - Messiah. Copia canónica desde Orquesta particellas (Drive 1rs2kfMOFheiDgqQwOCDQpRAPpKs28ql_). Cuerdas + órgano (Der Messias, edición alemana). Violoncello y Contrabajo en la misma hoja. Sin vientos ni coro.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Messiah [cuerdas y órgano]',
      NULL,
      1741,
      NULL,
      'Oficial',
      'Para acomodar — Händel, G.F. - Messiah. Copia canónica desde Orquesta particellas (Drive 1rs2kfMOFheiDgqQwOCDQpRAPpKs28ql_). Cuerdas + órgano (Der Messias, edición alemana). Violoncello y Contrabajo en la misma hoja. Sin vientos ni coro.',
      'Key - Str',
      'https://drive.google.com/open?id=1WolhjGr3Aw0NsHMLVISjYUOidMkPMIjy'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_H_ndel_Georg_Friedrich, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Órgano', '[{"url":"https://drive.google.com/file/d/12y7Gqg77ttWcafKMzp2Q0QQ9IJuVCD1t/view?usp=drivesdk","description":"Órgano - Messiah [cuerdas y órgano] - Händel, G.F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1HFSHzxdGg6mxy9AkoWH-UiXz0U6qmDSi/view?usp=drivesdk","description":"Viola - Messiah [cuerdas y órgano] - Händel, G.F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1XeARPXmi7oYXHfVhFWdFwBbW2ACKxxl2/view?usp=drivesdk","description":"Violín 1 - Messiah [cuerdas y órgano] - Händel, G.F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1S3QF2asXHwsrSsycWU5UXrpExBLYHAeB/view?usp=drivesdk","description":"Violín 2 - Messiah [cuerdas y órgano] - Händel, G.F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/16Q8ZchiJ2BKWWaqKXreV5yaELOwUwk_F/view?usp=drivesdk","description":"Violoncello y Contrabajo - Messiah [cuerdas y órgano] - Händel, G.F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/16Q8ZchiJ2BKWWaqKXreV5yaELOwUwk_F/view?usp=drivesdk","description":"Violoncello y Contrabajo - Messiah [cuerdas y órgano] - Händel, G.F.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Messiah [cuerdas y órgano]';
  END IF;

END $$;
