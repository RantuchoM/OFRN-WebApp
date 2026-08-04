-- Massenet — Méditation de Thaïs
-- Generado: 2026-08-03

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Massenet_Jules bigint;
BEGIN
  SELECT id INTO _id_comp_Massenet_Jules FROM compositores WHERE apellido = 'Massenet' AND (nombre = 'Jules' OR (nombre IS NULL AND 'Jules' IS NULL)) LIMIT 1;
  IF _id_comp_Massenet_Jules IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Massenet', 'Jules') RETURNING id INTO _id_comp_Massenet_Jules;
  END IF;

  -- Méditation de Thaïs
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Méditation de Thaïs'
      AND o.observaciones = 'Para acomodar — Massenet, J. - Méditation de Thaïs'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Méditation de Thaïs',
      NULL,
      1894,
      323,
      'Oficial',
      'Para acomodar — Massenet, J. - Méditation de Thaïs',
      'Vn - 2.2.2.2 - 4.0.0.0 - Hp - Str + Coro',
      'https://drive.google.com/open?id=11dToRcA16WjUXoyGZBOOXRsIkhdh6kSC'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Massenet_Jules, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1aDGlbZg7varQZg-S0-sgUYWZHYs_7PSu/view?usp=drivesdk","description":"Arpa - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1qV8tnJty2S1tUBeov_xIMTBzdrDKpXCI/view?usp=drivesdk","description":"Clarinete Bb 1 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1KOnzKJ239iJ0eVemITU-SZ33leAFmAd3/view?usp=drivesdk","description":"Clarinete Bb 2 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1XeAMVY3jPchM98H_skD3ITRmt7W0wmDz/view?usp=drivesdk","description":"Contrabajo - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1_UeTHmdLVl6QBxbLgcEbL-CHNUTy7pVG/view?usp=drivesdk","description":"Corno F 1y2 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1_UeTHmdLVl6QBxbLgcEbL-CHNUTy7pVG/view?usp=drivesdk","description":"Corno F 1y2 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1VPhxDugZ2cdgjozl453_y3Mc3JDex5NI/view?usp=drivesdk","description":"Corno F 3y4 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1VPhxDugZ2cdgjozl453_y3Mc3JDex5NI/view?usp=drivesdk","description":"Corno F 3y4 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '23', 'Coro SATB', '[{"url":"https://drive.google.com/file/d/1W31dVN7_1l4ouekSu0hjauOZ3k5Yk8sS/view?usp=drivesdk","description":"Coro SATB - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1K74LfUnNAHMolRO_M7r2Com8PpCsubsS/view?usp=drivesdk","description":"Fagot 1 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1zXkYsynSg2n-Q6z9xMEEXS5A6xLOKfh_/view?usp=drivesdk","description":"Fagot 2 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1ZNpsrmYuT4Dpekpu5pG5NKPpokc9nnyN/view?usp=drivesdk","description":"Flauta 1 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1SZwQwrx7gbjBzKAKPkjOhBXc4-jLf5Wf/view?usp=drivesdk","description":"Flauta 2 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1iPDa6LnizhjStB2dJZbW5LDwcWBikuGK/view?usp=drivesdk","description":"Oboe 1 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1SjIIhJkFPFzHWUPd9bXh3zAfkYsg7Xqk/view?usp=drivesdk","description":"Oboe 2 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1C1B5rYfeQHGtEVal6JM5Z2zwXwhP7NHx/view?usp=drivesdk","description":"SCORE - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Vxll6zlny-7csJAEZFyVjX4IFdXAqx2v/view?usp=drivesdk","description":"Viola - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1jO0BzrpByW2eBiOV2o7PDBnDWu5CFY3t/view?usp=drivesdk","description":"Violín 1 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1SDVWZjo8B8VHX47TVfvMKFfooBOPXG8M/view?usp=drivesdk","description":"Violín 2 - Méditation de Thaïs - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín SOLO', '[{"url":"https://drive.google.com/file/d/1J7PUpDfH4CbGqZ5NeVpVo0gWuW_A4RLr/view?usp=drivesdk","description":"Violín SOLO - Méditation de Thaïs - Massenet, J.pdf"}]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1hya60iVEAWQuc8w27ZIKYlYLfDq2HMl5/view?usp=drivesdk","description":"Violoncello - Méditation de Thaïs - Massenet, J.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Méditation de Thaïs';
  END IF;

END $$;
