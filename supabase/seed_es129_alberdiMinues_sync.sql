-- ES / archivo — alberdiMinues desde Para acomodar (sin repertorio gira)
-- Generado: 2026-10-26

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Alberdi_Juan_Bautista bigint;
  _id_arr_Garberi_Eliel bigint;
BEGIN
  SELECT id INTO _id_comp_Alberdi_Juan_Bautista FROM compositores WHERE apellido = 'Alberdi' AND (nombre = 'Juan Bautista' OR (nombre IS NULL AND 'Juan Bautista' IS NULL)) LIMIT 1;
  IF _id_comp_Alberdi_Juan_Bautista IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Alberdi', 'Juan Bautista') RETURNING id INTO _id_comp_Alberdi_Juan_Bautista;
  END IF;

  SELECT id INTO _id_arr_Garberi_Eliel FROM compositores WHERE apellido = 'Garberi' AND (nombre = 'Eliel' OR (nombre IS NULL AND 'Eliel' IS NULL)) LIMIT 1;
  IF _id_arr_Garberi_Eliel IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Garberi', 'Eliel') RETURNING id INTO _id_arr_Garberi_Eliel;
  END IF;

  -- <p>Tres Minués</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>Tres Minués</p>' AND oc.id_compositor = _id_arr_Garberi_Eliel
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Tres Minués</p>',
      _id_arr_Garberi_Eliel,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Alberdi, J.B. - Tres Minués [cuarteto]. Arreglo para cuarteto de cuerdas por Eliel N. Garberi © 2010. Portada (p.1) excluida.',
      'Str',
      'https://drive.google.com/open?id=1mTPYO_ksrJeJ6pGz-HmeWBuHoAeCsWe_'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Alberdi_Juan_Bautista, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Garberi_Eliel, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Garberi_Eliel
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/12gCQ7HmdKJL8eNhCIWNjUimw1OpUzIhe/view?usp=drivesdk","description":"SCORE - Tres Minués - Alberdi, J.B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1R0YZkpB1SZXARQbN0wNo1d5QXfYC7Jx7/view?usp=drivesdk","description":"Viola - Tres Minués - Alberdi, J.B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1cLNrX3pSPAFsTQ9gKY6iAVpahnNK_rRH/view?usp=drivesdk","description":"Violín 1 - Tres Minués - Alberdi, J.B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1VHypsiGFAKaE0Wozu0-c0a_lDAt0VU1W/view?usp=drivesdk","description":"Violín 2 - Tres Minués - Alberdi, J.B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1sZyyNGTcqmcNG89JbD6Wg7lLa1aiwUMT/view?usp=drivesdk","description":"Violoncello - Tres Minués - Alberdi, J.B.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Tres Minués</p>';
  END IF;

END $$;

