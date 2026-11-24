-- Sibelius, J. - Pelleas et Melisande Op.46 → obra 3899
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Pelléas et Mélisande, suite, Op. 46</p><div>&nbsp; I. At the Castle Gate</div><div>&nbsp; II. Melisande</div><div>&nbsp; III. At the Seashore</div><div>&nbsp; IV. Spring in the Park</div><div>&nbsp; V. The three blind Sisters</div><div>&nbsp; VI. Pastorale</div><div>&nbsp; VII. Melisande at the Spinning-Wheel</div><div>&nbsp; VIII. Entr''acte</div><div>&nbsp; IX. The Death of Melisande</div>',
    link_drive = 'https://drive.google.com/open?id=1ZG0K4TWdLi72nGqVbNFJie2850TCUEXk',
    observaciones = 'Para acomodar — Sibelius, J. - Pelleas et Melisande Op.46.',
    instrumentacion = '1.1.2.2 - 2.0.0.0 - Perc - Str',
    anio_composicion = 1905,
    duracion_segundos = 1620,
    estado = 'Oficial'
  WHERE id = 3899;

  DELETE FROM obras_particellas WHERE id_obra = 3899;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1IEYf4O5dx2O8De1CVosHiOSY5NOx_h9X/view?usp=drivesdk","description":"Clarinete Bb 1 - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1kuLYPe6NzcxgxRMf_VYiKo_svFlwsC1R/view?usp=drivesdk","description":"Clarinete Bb 2 - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1xNe4bg_q_TMZgZyPIspCxIj4YyhSF8v8/view?usp=drivesdk","description":"Contrabajo - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/11aXBCCr7TgTHFRJeKinjI3imZyOlwCir/view?usp=drivesdk","description":"Corno F 1 - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1aVCH8xgs6MryWteUfo6BKausB7GniWpU/view?usp=drivesdk","description":"Corno F 2 - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1BTG6YW4IiVQqTjdxjRRwm7qEPYpXqNfT/view?usp=drivesdk","description":"Fagot 1 - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/12A_cjsUejyrYqE6GbYNLk6fZ2LrwqvD0/view?usp=drivesdk","description":"Fagot 2 - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1Hj43NuzJiwi2tVgg6xhMznVKzaK-AAY1/view?usp=drivesdk","description":"Flauta - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1DoBOM3T5AoGycfqAISc8vjaXx2_ivxn4/view?usp=drivesdk","description":"Oboe - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '13', 'Percusión', '[{"url":"https://drive.google.com/file/d/1oslh5kcnufSUcMl0KBaKpYPnEvfvsesk/view?usp=drivesdk","description":"Percusión - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1VYSmvFbAkHNU8xXFHkLYOC036Komefsj/view?usp=drivesdk","description":"SCORE - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Z1-XsjsOarEKnZwa1slUceIhINsdDo-m/view?usp=drivesdk","description":"Viola - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/106aiY7OXnYU0DzTZQq3Di-dOgGQIdtpZ/view?usp=drivesdk","description":"Violín 1 - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1azCpjj44e_Qiv7bn9fs8Q8Eniad0Gj8T/view?usp=drivesdk","description":"Violín 2 - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3899, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1x3mLXeDzomYjGT-r5fhubC-NzmUfPdbD/view?usp=drivesdk","description":"Violoncello - op.46. Pelleas et Melisande - Sibelius, J.pdf"}]', false);
END $$;
