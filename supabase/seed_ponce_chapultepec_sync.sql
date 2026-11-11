-- Ponce — Chapultepec (catálogo; Para acomodar; 3ª obra gira 201)
-- Generado: 2026-11-11

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Ponce_Manuel_Mar_a bigint;
BEGIN
  SELECT id INTO _id_comp_Ponce_Manuel_Mar_a FROM compositores WHERE apellido = 'Ponce' AND (nombre = 'Manuel María' OR (nombre IS NULL AND 'Manuel María' IS NULL)) LIMIT 1;
  IF _id_comp_Ponce_Manuel_Mar_a IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Ponce', 'Manuel María') RETURNING id INTO _id_comp_Ponce_Manuel_Mar_a;
  END IF;

  -- <p>Chapultepec</p><div>&nbsp; I. Primavera</div><div>&nbsp; II. Nocturno</div><div>&nbsp; III. Canto y Danza</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Chapultepec</p><div>&nbsp; I. Primavera</div><div>&nbsp; II. Nocturno</div><div>&nbsp; III. Canto y Danza</div>'
      AND o.observaciones = 'Para acomodar — Ponce, M. - Chapultepec'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Chapultepec</p><div>&nbsp; I. Primavera</div><div>&nbsp; II. Nocturno</div><div>&nbsp; III. Canto y Danza</div>',
      NULL,
      1934,
      1020,
      'Oficial',
      'Para acomodar — Ponce, M. - Chapultepec',
      '3.2.3.2 - 4.3.3.1 - Timp.+1 - Key - Str',
      'https://drive.google.com/open?id=1nAXirz9B8gcIe49xJ0xAzSBJKfxpEPd7'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Ponce_Manuel_Mar_a, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '17', 'Celesta', '[{"url":"https://drive.google.com/file/d/1-Np8WAs4wyUdiMKLatyHzocz-2N5_nXe/view?usp=drivesdk","description":"Celesta - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/17WnKmdyea3EZv5Y25G7e7bV0m2pilK2U/view?usp=drivesdk","description":"Clarinete Bajo - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/14Q1DL92nlEjPU-EPe25eKLxI6Qt9kdTb/view?usp=drivesdk","description":"Clarinete Bb 1 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1nfGqp-UoPnsoLvz_SX1XVaGzgjWNDGKK/view?usp=drivesdk","description":"Clarinete Bb 2 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1hQ2htHZb8nHtdLxSFWddhlreSuRqaD8t/view?usp=drivesdk","description":"Contrabajo - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1wh9A_46xCPPQkFxu834aTK2wvRJMCNlC/view?usp=drivesdk","description":"Corno F 1 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1MEmGz9GSkwK8tb2OI2yKDHdTI4cGg-M8/view?usp=drivesdk","description":"Corno F 2 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1Ec9kEWork5QkqkLYFgmBvyPLCddm10up/view?usp=drivesdk","description":"Corno F 3 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1u4McGflroRfQTGQBPZfUZmMsK_dpNq74/view?usp=drivesdk","description":"Corno F 4 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1C4biOY2Z09Aqbc0lPx0AvqzbxdrsreEz/view?usp=drivesdk","description":"Fagot 1 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1uRD05MXCOUU-xMkzoqp2s2kpy1ncKLVK/view?usp=drivesdk","description":"Fagot 2 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1h34SRv4nH3wU8KYv4zExFewKaM1k6a7K/view?usp=drivesdk","description":"Fl Piccolo - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1xHk2MQaeLouy1pkTUeUzhaAZZob-qarh/view?usp=drivesdk","description":"Flauta 1 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1Q7GhYgvHr3gcFGUvLwWD69vqYoRH8Z-g/view?usp=drivesdk","description":"Flauta 2 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1qwlIUB_aTAenTCjo3TmHLRgYeUZq8VOq/view?usp=drivesdk","description":"Oboe 1 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1-z8pTlZIHAgmGGvLs1XolQuN7_54SBqM/view?usp=drivesdk","description":"Oboe 2 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1d2ew6pXAJbz68CByKDxrk2jufjrCPoAS/view?usp=drivesdk","description":"Perc Percusión - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1-mk8nHB3dqf0oghL1GCbzHSQy4obA2ax/view?usp=drivesdk","description":"Perc Timbal - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Uvq4EtLlYHcvFlUUI8eDPkhjpL0wfzKx/view?usp=drivesdk","description":"SCORE - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/19yqo_nZ0OQC5TLkxvIA3DqkTBQFyT7RP/view?usp=drivesdk","description":"Trombón 1 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1K6fb_-NZ-YUhWa60bEaoSszsAoGsPqj7/view?usp=drivesdk","description":"Trombón 2 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1y1P6s7uPCreDebb9GJ_i0wrnkjjM4aFF/view?usp=drivesdk","description":"Trombón 3 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta C 1', '[{"url":"https://drive.google.com/file/d/1EB_QwFV2pigc_JK2RdeqbtRxXotxoYnE/view?usp=drivesdk","description":"Trompeta C 1 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta C 2', '[{"url":"https://drive.google.com/file/d/1akyBEVK964lW74VPOJrCDmQgtQYf4vrS/view?usp=drivesdk","description":"Trompeta C 2 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta C 3', '[{"url":"https://drive.google.com/file/d/1geQSxrJNFARhnVOVw0HJaTKBVOSVNWKp/view?usp=drivesdk","description":"Trompeta C 3 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1hDkCmFmveBsVmii5RGrvEBzCn8jrDTia/view?usp=drivesdk","description":"Tuba - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1a6nYyQyxVaYmkEcRIG-DgzRpm6GojL-M/view?usp=drivesdk","description":"Viola - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/19EDxpzEn0rw_kXB8WnFG5DSSLSKUdI4E/view?usp=drivesdk","description":"Violín 1 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1JiovMrJChLO8D_jO3aAdyQ_hi2tdTsPr/view?usp=drivesdk","description":"Violín 2 - Chapultepec - Ponce, M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1-ZPXf4C4M0fyZfENXtJ-QJCmznM-aWvF/view?usp=drivesdk","description":"Violoncello - Chapultepec - Ponce, M.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Chapultepec</p><div>&nbsp; I. Primavera</div><div>&nbsp; II. Nocturno</div><div>&nbsp; III. Canto y Danza</div>';
  END IF;

END $$;

-- Gira 201: 3ª obra del bloque Repertorio (id 170)
DO $$
DECLARE
  _id_obra bigint;
  _block_id bigint := 170;
BEGIN
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = '<p>Chapultepec</p><div>&nbsp; I. Primavera</div><div>&nbsp; II. Nocturno</div><div>&nbsp; III. Canto y Danza</div>'
    AND o.observaciones = 'Para acomodar — Ponce, M. - Chapultepec'
  ORDER BY o.id DESC
  LIMIT 1;
  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró Chapultepec recién cargada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, 3, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = 3, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;
END $$;
