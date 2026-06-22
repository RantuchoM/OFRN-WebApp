-- Silva — Marcha de San Lorenzo [cuerdas] → obra 3537 (insert ejecutado 2026-06-22)
-- Generado: 2026-06-22

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Silva_Cayetano_Alberto bigint;
BEGIN
  SELECT id INTO _id_comp_Silva_Cayetano_Alberto FROM compositores WHERE apellido = 'Silva' AND (nombre = 'Cayetano Alberto' OR (nombre IS NULL AND 'Cayetano Alberto' IS NULL)) LIMIT 1;
  IF _id_comp_Silva_Cayetano_Alberto IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Silva', 'Cayetano Alberto') RETURNING id INTO _id_comp_Silva_Cayetano_Alberto;
  END IF;

  -- Marcha de San Lorenzo [cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Marcha de San Lorenzo [cuerdas]'
      AND o.observaciones = 'Para acomodar — Silva, C.A. - Marcha de San Lorenzo [cuerdas]'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Marcha de San Lorenzo [cuerdas]',
      NULL,
      1863,
      225,
      'Oficial',
      'Para acomodar — Silva, C.A. - Marcha de San Lorenzo [cuerdas]',
      'Str',
      'https://drive.google.com/drive/folders/1jBCHMNcerv3K9aoq17q9V_ekoCxhFAry'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Silva_Cayetano_Alberto, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1QR6zEyYQRYeH06IiZgeQ0Zz79LQwD1bW/view?usp=drivesdk","description":"SCORE - S-N. Marcha de San Lorenzo [cuerdas] - Silva, C.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/17DgWhfUYMeIeL2o461AbnfERAyDTj6AP/view?usp=drivesdk","description":"Viola - S-N. Marcha de San Lorenzo [cuerdas] - Silva, C.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1mW6Yy3UPHlbHXjKio9W6pu-oz4exoJ4L/view?usp=drivesdk","description":"Violín 1 - S-N. Marcha de San Lorenzo [cuerdas] - Silva, C.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1YAE9nV4xq_KCxucjb7Avk0LF99M2Vsnn/view?usp=drivesdk","description":"Violín 2 - S-N. Marcha de San Lorenzo [cuerdas] - Silva, C.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1MyDIRTm70w1PdUpsf1IYXLUi43EG3JBh/view?usp=drivesdk","description":"Violoncello - S-N. Marcha de San Lorenzo [cuerdas] - Silva, C.A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Marcha de San Lorenzo [cuerdas]';
  END IF;

END $$;
