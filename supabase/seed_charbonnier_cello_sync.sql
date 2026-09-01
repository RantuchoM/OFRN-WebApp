-- Charbonnier — Concierto para Violoncello y orquesta Nro. 1 → obra 3401
-- Generado: 2026-08-31
-- Drive: https://drive.google.com/drive/folders/1vFvK6DAgrMKYjd90F7sPlGoz3uR621_m

DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Concierto para Violoncello y orquesta Nro. 1</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Adagietto</div><div>&nbsp; III. Prestissimo</div>',
    link_drive = 'https://drive.google.com/drive/folders/1vFvK6DAgrMKYjd90F7sPlGoz3uR621_m',
    observaciones = 'Para acomodar — Charbonnier, M. - Concierto para cello y orquesta estreno',
    instrumentacion = 'Vc - 2.2.2.2 - 2.2.2.1 - Timp.+1 - Str'
  WHERE id = 3401;

  DELETE FROM obras_particellas WHERE id_obra = 3401;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1uh9s9645caWi10hcr6UvxjmrMdqzTeUN/view?usp=drivesdk","description":"Clarinete Bb 1 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1Wp4Fnx_OgrtFyoeMNlGoQBsBE_xK_Yt7/view?usp=drivesdk","description":"Clarinete Bb 2 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1fkeAkjb-NjoQNXX_DSvCJnsHuC68uBj-/view?usp=drivesdk","description":"Contrabajo - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1LpiB2NHPPPU9n6Lh2AjZNx1DjlzyNnW-/view?usp=drivesdk","description":"Corno F 1 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1KWJJgl7AjMmytO5brbOFHmxiidTjSV8D/view?usp=drivesdk","description":"Corno F 2 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1hEXEZ5bXD5D6FhcaS9XJ19SPoDiFleEX/view?usp=drivesdk","description":"Fagot 1 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/19e6LL0yXZW9C9UmuGS_5jCfj0BPHxfIk/view?usp=drivesdk","description":"Fagot 2 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1i0UrqLUnRk7Vb6iMNC9GoETfcOKIozpA/view?usp=drivesdk","description":"Flauta 1 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1WD2xWyCrFbdT1xLNnehyvN6Q8Y7pVvnp/view?usp=drivesdk","description":"Flauta 2 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1YmwJVHECwFUapsGuRUVR2wFr8cZ9yngc/view?usp=drivesdk","description":"Oboe 1 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1pXLricDdUChggTq02Kv3t7IynrRTEwzH/view?usp=drivesdk","description":"Oboe 2 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1wclk9aKxmRj1N5a2hyAkYu8VslpGbSjk/view?usp=drivesdk","description":"Perc Platillo - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1kxDkpfqyMWKesnCcxmi_bQ_w-Tze39DY/view?usp=drivesdk","description":"Perc Timbal - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1FLW6CyZvIe14Ql09_iRLmGxjEC0P0kVi/view?usp=drivesdk","description":"SCORE - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1cHj7wO1fvqRNLlMqI97Pn8xTIt6r3sok/view?usp=drivesdk","description":"Trombón 1 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1z7kf5kL2I_w2WFRU6JWe0Mz0SRGlLCo-/view?usp=drivesdk","description":"Trombón 2 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1EPxMbuHPeiQvtGNxUtF6JBNCBuG3x1h7/view?usp=drivesdk","description":"Trompeta 1 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1SYMjhjUHKOCFnkxNnuJYAdyOF9GjErsE/view?usp=drivesdk","description":"Trompeta 2 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1Jy6IYqQOu_TmBzF40cU07hdRrdTO8dYL/view?usp=drivesdk","description":"Tuba - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1WTVu9kQygeVk6_NuVylFSdmBDVi5XKUS/view?usp=drivesdk","description":"Viola - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1TtE9BsWeeoJYShxrwsCvm8rxB4HhmbOE/view?usp=drivesdk","description":"Violín 1 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1LhcaOfz9foCinxmYASZJ7LEXGYAZMS9I/view?usp=drivesdk","description":"Violín 2 - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Mb1wPRYQWlsc8wmN_aJGZ-QSnIMayShm/view?usp=drivesdk","description":"Violoncello - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3401, '03', 'Violoncello Solo', '[{"url":"https://drive.google.com/file/d/1T5VhfSeYxKvYiOEgHqpZPyKUXL76MhN4/view?usp=drivesdk","description":"Violoncello Solo - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf"}]', true);

END $$;
