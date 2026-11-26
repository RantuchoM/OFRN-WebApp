-- Paganini Op.6 orquesta extendida → obra 3916 (junto a 3900)
-- Generado: 2026-11-24

DO $$
DECLARE
  v_obra int := 3916;
  v_rep int;
BEGIN
  INSERT INTO obras (id, titulo, duracion_segundos, estado, observaciones, instrumentacion, anio_composicion, link_drive)
  VALUES (
    v_obra,
    '<p>Concierto para Violín Nro. 1 en Re mayor, Op. 6 (orquesta extendida)</p><div>&nbsp; I. Allegro maestoso</div><div>&nbsp; II. Adagio</div><div>&nbsp; III. Rondo. Allegro spirituoso</div>',
    2100,
    'Oficial',
    'Para acomodar — Paganini, N. - Concierto Violin Nro 1 Op.6 (orquesta extendida). Orquesta extendida Kalmus/Generoso (D major). Alternativa al set 3900 (solo vientos). Director elige.',
    'Vn - 2.2.2.2 - 2.2.3.0 - Timp.+2 - Str',
    1818,
    'https://drive.google.com/open?id=1i39M9YvNhh81IWKTrvqnxXhx8aqtY1Gc'
  )
  ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    duracion_segundos = EXCLUDED.duracion_segundos,
    estado = EXCLUDED.estado,
    observaciones = EXCLUDED.observaciones,
    instrumentacion = EXCLUDED.instrumentacion,
    anio_composicion = EXCLUDED.anio_composicion,
    link_drive = EXCLUDED.link_drive;

  IF NOT EXISTS (
    SELECT 1 FROM obras_compositores
    WHERE id_obra = v_obra AND id_compositor = 890
  ) THEN
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (v_obra, 890, 'compositor');
  END IF;

  DELETE FROM obras_particellas WHERE id_obra = v_obra;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '13', 'Bombo', '[{"url":"https://drive.google.com/file/d/16f5TTOmAIxsa-gT2Fp00AksLuMmyMIbm/view?usp=drivesdk","description":"Bombo - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/1iHdQnkf2OoK9EN20_-UJ9FTLSu5M-WKb/view?usp=drivesdk","description":"Clarinete A 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/1TGCYk7oAG91tBJlxdbKv1mvRaDChKlnB/view?usp=drivesdk","description":"Clarinete A 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1VXBYQXTd0ssKEYSE6Rn7iy8eDgaQSwWD/view?usp=drivesdk","description":"Contrabajo - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
  VALUES (v_obra, '08b', 'Fg Contrafagot', '[{"url":"https://drive.google.com/file/d/1nk2PB4fn-onqArubmuIp-PuQL-YXyyXJ/view?usp=drivesdk","description":"Fg Contrafagot - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false, 'CFg');

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1gI9-dqlPQheAzXIYtYIWvlC2qEFW5XCC/view?usp=drivesdk","description":"Corno F 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1XxlglzcCN7oaSAzFbEBgAR4RTlZeg0Ow/view?usp=drivesdk","description":"Corno F 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1Vw4vqLj0fOG4vtNqbYGyXh-Fz0Vl2GTG/view?usp=drivesdk","description":"Fagot - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1qrzvZZ0gSDtKCRnxAU9qRr9jfHtc_W6K/view?usp=drivesdk","description":"Flauta 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1pbgYxHCaeF8Up-mFujmbGIvHsismfkPl/view?usp=drivesdk","description":"Flauta 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/10YLrGgF9N-oovHNbFTSqDdFGOYw2dN5f/view?usp=drivesdk","description":"Oboe 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1q2to-FoiXsJKIWLRrE9quPOKq8_8Qs52/view?usp=drivesdk","description":"Oboe 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '13', 'Platillos', '[{"url":"https://drive.google.com/file/d/1jiOnNmPD1jB56c7jm7K5kHPbSk9m9EIy/view?usp=drivesdk","description":"Platillos - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1DAWJaarnOQXzIyKyFyhK3kWfAU7bxwfy/view?usp=drivesdk","description":"SCORE - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '13a', 'Timbales', '[{"url":"https://drive.google.com/file/d/1bNKSbtuu9IFERXkzdYx_v8f61TKF_9Sy/view?usp=drivesdk","description":"Timbales - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/15EltzPlgD8c0JI4nIcsUDXPDFl6DB2-f/view?usp=drivesdk","description":"Trombón 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1b2KSvmxqbiawANpTAtU6jhdZ-j0UO10c/view?usp=drivesdk","description":"Trombón 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1cEp2skq8k2P1QPssEX8XZLAj6l2vUEoG/view?usp=drivesdk","description":"Trombón Bajo - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1B_W8_sozT3rZ61axFkQbLvtRB4aQoRvm/view?usp=drivesdk","description":"Trompeta Bb 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1bssq0nyHUtH5yPTMSWW3tggTeUVwtkw9/view?usp=drivesdk","description":"Trompeta Bb 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1dneQECOqg05PL2tzH6YPMNK14APMJrS_/view?usp=drivesdk","description":"Viola - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1lH4mtRfQHQnbm5A3GOdBv0sWaVBIV9HU/view?usp=drivesdk","description":"Violín 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/14_E8BjdohdnLaUTUflKmgtYEcw5chQvv/view?usp=drivesdk","description":"Violín 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '01', 'Violín Solo', '[{"url":"https://drive.google.com/file/d/1LKkk4lPA652dgiLnYbQyyQRFE-OK_O1d/view?usp=drivesdk","description":"Violín Solo - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', true);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1N1TlNw5TX_wU-XqLkbT6XrJ0Mxnh5GLq/view?usp=drivesdk","description":"Violoncello - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  -- Aclarar set hermano (3900) y sumar 3916 a los mismos repertorios
  UPDATE obras SET
    titulo = '<p>Concierto para Violín Nro. 1 en Re mayor, Op. 6 (set vientos Generoso)</p><div>&nbsp; I. Allegro maestoso</div><div>&nbsp; II. Adagio</div><div>&nbsp; III. Rondo. Allegro spirituoso</div>',
    observaciones = 'Para acomodar — Paganini, N. - Concierto Violin Nro 1 Op.6. Set Generoso/Music Addict: vientos/metales + Violín Solo + SCORE (sin cuerdas orquestales ni fagot/perc). Alternativa: obra 3916 orquesta extendida completa. Director elige.',
    estado = 'Solicitud'
  WHERE id = 3900;

  FOR v_rep IN
    SELECT DISTINCT id_repertorio FROM repertorio_obras WHERE id_obra = 3900
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM repertorio_obras
      WHERE id_repertorio = v_rep AND id_obra = v_obra
    ) THEN
      INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
      SELECT v_rep, v_obra, COALESCE(MAX(orden), 0) + 1
      FROM repertorio_obras WHERE id_repertorio = v_rep;
    END IF;
  END LOOP;

  PERFORM setval(
    pg_get_serial_sequence('obras', 'id'),
    GREATEST((SELECT max(id) FROM obras), v_obra)
  );
END $$;
