-- Bragato Ritmos de Malambo → catálogo (Para acomodar; sin repertorio)
-- Generado: 2026-10-26

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Bragato_Jos_ bigint;
BEGIN
  SELECT id INTO _id_comp_Bragato_Jos_ FROM compositores WHERE apellido = 'Bragato' AND (nombre = 'José' OR (nombre IS NULL AND 'José' IS NULL)) LIMIT 1;
  IF _id_comp_Bragato_Jos_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Bragato', 'José') RETURNING id INTO _id_comp_Bragato_Jos_;
  END IF;

  -- <p>Ritmos de Malambo</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Ritmos de Malambo</p>'
      AND o.observaciones = 'Para acomodar — Bragato, J. - Ritmos de Malambo. Manuscrito orquesta de cuerdas (Bs. Aires, nov. 1983; 181 compases). PDF fuente Bragato.pdf (35 pp.): SCORE 1–15 + partes.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Ritmos de Malambo</p>',
      NULL,
      1983,
      NULL,
      'Oficial',
      'Para acomodar — Bragato, J. - Ritmos de Malambo. Manuscrito orquesta de cuerdas (Bs. Aires, nov. 1983; 181 compases). PDF fuente Bragato.pdf (35 pp.): SCORE 1–15 + partes.',
      'Str',
      'https://drive.google.com/open?id=1My1eOrPDC8xOyk9CMfL4vS3eXunN8nzg'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bragato_Jos_, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1uJDltA2wtFOpQfIdDK5t59SuMnUcWEAo/view?usp=drivesdk","description":"Contrabajo - Ritmos de Malambo - Bragato, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/17FFCkBo-5r9pDHxb2kvTd_CN-YYEnW7Q/view?usp=drivesdk","description":"SCORE - Ritmos de Malambo - Bragato, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1q4F2ig8gKP1tBxSpFNNKKQCxng_5FlaC/view?usp=drivesdk","description":"Viola - Ritmos de Malambo - Bragato, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1SmfUe-aRjOcbj88YM4Dudx_ihdOg0bZI/view?usp=drivesdk","description":"Violín 1 - Ritmos de Malambo - Bragato, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1lt3RqxBhUE06ieSPYDR3iNgbxskKxkNG/view?usp=drivesdk","description":"Violín 2 - Ritmos de Malambo - Bragato, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1AD-nWDKa-q_JwD4T9tNhs8dxyFx2wLT0/view?usp=drivesdk","description":"Violoncello - Ritmos de Malambo - Bragato, J.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Ritmos de Malambo</p>';
  END IF;

END $$;
