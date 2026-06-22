-- Mendelssohn — Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1 → obra 3536 (insert ejecutado 2026-06-22)
-- Generado: 2026-06-22

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Mendelssohn_Bartholdy_F_lix bigint;
BEGIN
  SELECT id INTO _id_comp_Mendelssohn_Bartholdy_F_lix FROM compositores WHERE apellido = 'Mendelssohn-Bartholdy' AND (nombre = 'Félix' OR (nombre IS NULL AND 'Félix' IS NULL)) LIMIT 1;
  IF _id_comp_Mendelssohn_Bartholdy_F_lix IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Mendelssohn-Bartholdy', 'Félix') RETURNING id INTO _id_comp_Mendelssohn_Bartholdy_F_lix;
  END IF;

  -- Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1'
      AND o.observaciones = 'Para acomodar — Mendelssohn-Bartholdy, F. - Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1',
      NULL,
      1821,
      823,
      'Oficial',
      'Para acomodar — Mendelssohn-Bartholdy, F. - Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1',
      'Str',
      'https://drive.google.com/open?id=1tF11J6HKBGtdFjeUZL47n7ppL_f4WBRS'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Mendelssohn_Bartholdy_F_lix, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'IMSLP101945', '[{"url":"https://drive.google.com/file/d/1e2jFb50kQFyd257YcQbpIlfEniUzKMN2/view?usp=drivesdk","description":"IMSLP101945-PMLP207269-Mendelssohn_Streichersinfonie1_Violoncello.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'IMSLP101946', '[{"url":"https://drive.google.com/file/d/1JF_8GKk5zHwfmb4B_CpC64aihTZ5nnqe/view?usp=drivesdk","description":"IMSLP101946-PMLP207269-Mendelssohn_Streichersinfonie1_Contrabass.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/11XgMc1xTReSDSKeOC_vd91iRX4SZRuOO/view?usp=drivesdk","description":"SCORE - MWV N 1. Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1KCbYdxe2DBUWV8LTpJ6Gs9Wsb_7If6bD/view?usp=drivesdk","description":"Viola - MWV N 1. Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1IY7SmEFevawFDGi5f1nYriE9qhzTpZNS/view?usp=drivesdk","description":"Violín 1 - MWV N 1. Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1XnMF-qTeDmRmMiu2Y_sA9d0HuZBL59OK/view?usp=drivesdk","description":"Violín 2 - MWV N 1. Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1 - Mendelssohn-Bartholdy, F.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1';
  END IF;

END $$;
