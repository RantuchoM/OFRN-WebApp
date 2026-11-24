-- Kalinnikov — Serenata para Cuerdas en sol menor → obra 3893
-- Generado: 2026-11-23

DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Serenata para Cuerdas en sol menor</p>',
    link_drive = 'https://drive.google.com/open?id=17d5fG6TlXZ4LlK6UqJ8aaI4G0brXmj17',
    observaciones = 'Para acomodar — Kalinnikov, V. - Serenata para Cuerdas en sol menor. Edición H. Sawano (IMSLP).',
    instrumentacion = 'Str',
    anio_composicion = 1891,
    duracion_segundos = 540,
    estado = 'Oficial'
  WHERE id = 3893;

  DELETE FROM obras_particellas WHERE id_obra = 3893;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3893, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1lISFAqk0ON-Mu1ujGCgrBbotRi5k3hAL/view?usp=drivesdk","description":"Contrabajo - Serenata para Cuerdas en sol menor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3893, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Zee8yDwiAOJfbZ4y1a6JQusRUNKwvE4H/view?usp=drivesdk","description":"SCORE - Serenata para Cuerdas en sol menor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3893, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1I5jt1CQl5YYaEhxFT6cQ8HbV3G1ceNxY/view?usp=drivesdk","description":"Viola - Serenata para Cuerdas en sol menor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3893, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1EuikA59Eifbb2rS-WYqOMQ4JTyOySL6N/view?usp=drivesdk","description":"Violín 1 - Serenata para Cuerdas en sol menor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3893, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1vWs__guKMg4sJ95Ck_HrTosQi6P66brN/view?usp=drivesdk","description":"Violín 2 - Serenata para Cuerdas en sol menor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3893, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Pm8ThLpn8KwriC5mU8xe2T_4Axo7ccKL/view?usp=drivesdk","description":"Violoncello - Serenata para Cuerdas en sol menor - Kalinnikov, V.pdf"}]', false);

END $$;
