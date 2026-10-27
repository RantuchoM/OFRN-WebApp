-- Beethoven Op.130 cuarteto completo + Cavatina (mov. V) — Para acomodar
-- Generado: 2026-10-27

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Beethoven_Ludwig_van bigint;
BEGIN
  SELECT id INTO _id_comp_Beethoven_Ludwig_van FROM compositores WHERE apellido = 'Beethoven' AND (nombre = 'Ludwig van' OR (nombre IS NULL AND 'Ludwig van' IS NULL)) LIMIT 1;
  IF _id_comp_Beethoven_Ludwig_van IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Beethoven', 'Ludwig van') RETURNING id INTO _id_comp_Beethoven_Ludwig_van;
  END IF;

  -- <p>Cuarteto de cuerdas Nro. 13 en Sib mayor, Op. 130</p><div>&nbsp; I. Adagio ma non troppo - Allegro</div><div>&nbsp; II. Presto</div><div>&nbsp; III. Andante con moto ma non troppo</div><div>&nbsp; IV. Alla danza tedesca. Allegro assai</div><div>&nbsp; V. Cavatina. Adagio molto espressivo</div><div>&nbsp; VI. Finale. Allegro</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Cuarteto de cuerdas Nro. 13 en Sib mayor, Op. 130</p><div>&nbsp; I. Adagio ma non troppo - Allegro</div><div>&nbsp; II. Presto</div><div>&nbsp; III. Andante con moto ma non troppo</div><div>&nbsp; IV. Alla danza tedesca. Allegro assai</div><div>&nbsp; V. Cavatina. Adagio molto espressivo</div><div>&nbsp; VI. Finale. Allegro</div>'
      AND o.observaciones = 'Para acomodar — Beethoven, L. - Cuarteto de cuerdas Nro. 13 en Sib mayor, Op. 130'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Cuarteto de cuerdas Nro. 13 en Sib mayor, Op. 130</p><div>&nbsp; I. Adagio ma non troppo - Allegro</div><div>&nbsp; II. Presto</div><div>&nbsp; III. Andante con moto ma non troppo</div><div>&nbsp; IV. Alla danza tedesca. Allegro assai</div><div>&nbsp; V. Cavatina. Adagio molto espressivo</div><div>&nbsp; VI. Finale. Allegro</div>',
      NULL,
      1825,
      2880,
      'Oficial',
      'Para acomodar — Beethoven, L. - Cuarteto de cuerdas Nro. 13 en Sib mayor, Op. 130',
      'Str',
      'https://drive.google.com/drive/folders/19pLweX7ivfnHVcU9ybU1VrE8OS7GLzJz'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Beethoven_Ludwig_van, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1jXf8txivQ4g7NDK2rTV5gLToe9317wKA/view?usp=drivesdk","description":"SCORE - op.130. Cuarteto de cuerdas Nro. 13 - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1kbgGGsMF1EoK9lhvW0pgKpFR-9HEo4g3/view?usp=drivesdk","description":"Viola - op.130. Cuarteto de cuerdas Nro. 13 - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1OLBT5wPnrc4mCFgv1bdFGKE-TXeM8X2I/view?usp=drivesdk","description":"Violín 1 - op.130. Cuarteto de cuerdas Nro. 13 - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1nMuOAWNuvnLex2rUoO1rPKA0IQMXqh3D/view?usp=drivesdk","description":"Violín 2 - op.130. Cuarteto de cuerdas Nro. 13 - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1_BnQzoVonA5cazq21-J_sv-EZ2ASSZaA/view?usp=drivesdk","description":"Violoncello - op.130. Cuarteto de cuerdas Nro. 13 - Beethoven, L.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Cuarteto de cuerdas Nro. 13 en Sib mayor, Op. 130</p><div>&nbsp; I. Adagio ma non troppo - Allegro</div><div>&nbsp; II. Presto</div><div>&nbsp; III. Andante con moto ma non troppo</div><div>&nbsp; IV. Alla danza tedesca. Allegro assai</div><div>&nbsp; V. Cavatina. Adagio molto espressivo</div><div>&nbsp; VI. Finale. Allegro</div>';
  END IF;

  -- <p>Cavatina. Adagio molto espressivo (del Cuarteto de cuerdas Op. 130)</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Cavatina. Adagio molto espressivo (del Cuarteto de cuerdas Op. 130)</p>'
      AND o.observaciones = 'Para acomodar — Beethoven, L. - Cavatina (Cuarteto Op. 130)'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Cavatina. Adagio molto espressivo (del Cuarteto de cuerdas Op. 130)</p>',
      NULL,
      1825,
      420,
      'Oficial',
      'Para acomodar — Beethoven, L. - Cavatina (Cuarteto Op. 130)',
      'Str',
      'https://drive.google.com/drive/folders/1Ig--rj0HYJpk-D6xqGf91u8qa7pzem3l'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Beethoven_Ludwig_van, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1AGN8KTDkQubb3thPr0AfxmHoPYLKmtu6/view?usp=drivesdk","description":"SCORE - op.130. Cavatina - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1DHgS3SgpFZtUS1w9MOCFhVlbESj03Sm9/view?usp=drivesdk","description":"Viola - op.130. Cavatina - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1cJuVpmX4uq6VlY0uGJHA6rJudgRwdhhe/view?usp=drivesdk","description":"Violín 1 - op.130. Cavatina - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1a1zDIBCjWYhhneTaFZFcQLIvMXrJGrHX/view?usp=drivesdk","description":"Violín 2 - op.130. Cavatina - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1lCcLS_0KQZU8v_fKbY6JkS36cHzuTV0h/view?usp=drivesdk","description":"Violoncello - op.130. Cavatina - Beethoven, L.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Cavatina. Adagio molto espressivo (del Cuarteto de cuerdas Op. 130)</p>';
  END IF;

END $$;
