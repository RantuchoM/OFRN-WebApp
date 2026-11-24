-- Beethoven Concierto triple Op.56 → obra 2458 (fusiona 3898)
-- Generado: 2026-11-24

DO $$
BEGIN
  -- Repertorio temporada: 3898 → 2458
  UPDATE repertorio_obras
  SET id_obra = 2458
  WHERE id_obra = 3898
    AND NOT EXISTS (
      SELECT 1 FROM repertorio_obras x
      WHERE x.id_repertorio = repertorio_obras.id_repertorio
        AND x.id_obra = 2458
    );

  DELETE FROM repertorio_obras WHERE id_obra = 3898;

  UPDATE obras SET
    titulo = '<p>Concierto triple en do mayor, Op. 56</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Largo</div><div>&nbsp; III. Rondo alla polacca</div>',
    link_drive = 'https://drive.google.com/open?id=1AX2rl3Bmdnx0fLwIc0vtbO8ck0Cx7U-Z',
    observaciones = 'Archivo — Beethoven, L. - Concierto triple Op.56. Archivo canónico. Faltan particellas de solistas (Violín Solo, Violoncello Solo, Piano); SCORE sí está. Raw Ivdruiz #51158 en Para acomodar pendiente de split.',
    instrumentacion = '1.2.2.2 - 2.2.0.0 - Timp - Str',
    anio_composicion = 1804,
    duracion_segundos = 2100,
    estado = 'Oficial'
  WHERE id = 2458;

  DELETE FROM obras_particellas WHERE id_obra = 2458;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1BSdyrjgzjRGan52BpJZc-iyY3d1hbmKF/view?usp=drivesdk","description":"Clarinete 1 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1BQMQG_D2d-a5AwH8MsS-H58jIia9X8Uh/view?usp=drivesdk","description":"Clarinete 2 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1BMM4814il1Vce_qkhZhdDv-fkMtETS67/view?usp=drivesdk","description":"Contrabajo - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1BIocX80cOt4DxHSpnjLUmeUXMSs_TMz3/view?usp=drivesdk","description":"Corno 1 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1BG3QySqdiLUYQXTz1M-SCMtoRnVst_Tk/view?usp=drivesdk","description":"Corno 2 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1BE3AAGf68qQ_RXUY1vk2P6bjeWoM6RKi/view?usp=drivesdk","description":"Fagot 1 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1B053h_jcwLFHwBq-1VREf2upvBq6BzdR/view?usp=drivesdk","description":"Fagot 2 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1AyS09vHSC-JwDO7rbEoEQcJQ1SKFIOnf/view?usp=drivesdk","description":"Flauta - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1Au-7mCcgy7b2oK6PX_VLJlfcUAUNoFm9/view?usp=drivesdk","description":"Oboe 1 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1AtXuquCRN1Kk7F7jcWGnbCren3rwSscr/view?usp=drivesdk","description":"Oboe 2 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1D2tcxIabaTWfkZ1x07-kC46FriRSSAeE/view?usp=drivesdk","description":"SCORE - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '13a', 'Timbales', '[{"url":"https://drive.google.com/file/d/1AlWca3leHEssTTDykXoU7tmNTEUpGK3J/view?usp=drivesdk","description":"Timbales - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1Al8eYBTxvlGq7i4pjmE53mrf6NRnbxCb/view?usp=drivesdk","description":"Trompeta 1 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1AjWNyGMzriCn1qM2jjnzW0Grii1eH49v/view?usp=drivesdk","description":"Trompeta 2 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Aj9CFfxFwgAB0k0wFyZchFHtWdupj00d/view?usp=drivesdk","description":"Viola - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1AbUqx5bc4FUR4xaPd_wZAlnpaqScokVi/view?usp=drivesdk","description":"Violín 1 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1AalNh30aofh2ZDkWfL-DHyI3D00Cx5IX/view?usp=drivesdk","description":"Violín 2 - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (2458, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1AYwbRMWPpJ3IDEwTaVOs14pJwIfY_DoD/view?usp=drivesdk","description":"Violoncello - op.56. Concierto triple - Beethoven, L.pdf"}]', false);

  UPDATE obras SET
    estado = 'Informativo',
    observaciones = 'Fusionada en obra archivo 2458 (Concierto triple Op. 56). Solicitud temporada 2027 retirada.',
    link_drive = NULL,
    instrumentacion = NULL
  WHERE id = 3898;

  DELETE FROM obras_particellas WHERE id_obra = 3898;
END $$;
