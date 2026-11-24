-- Temporada 2027 — Para acomodar sync (pipeline completo)
-- Generado: 2026-11-24


-- Borodin, A. - Sinfonia Nro 2 en si menor → obra 3891
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Sinfonía Nro. 2 en si menor</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Scherzo. Prestissimo - Allegretto</div><div>&nbsp; III. Andante</div><div>&nbsp; IV. Finale. Allegro</div>',
    link_drive = 'https://drive.google.com/open?id=1OX5rBCNDV-jsB8cAWXg0jhmRvx7PBdey',
    observaciones = 'Para acomodar — Borodin, A. - Sinfonia Nro 2 en si menor.',
    instrumentacion = '3.2.2.2 - 4.2.3.1 - Timp.+3 - Hp - Str',
    anio_composicion = 1876,
    duracion_segundos = 1800,
    estado = 'Oficial'
  WHERE id = 3891;

  DELETE FROM obras_particellas WHERE id_obra = 3891;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1MztUDdYCojanSGiMmmnNIJUk-m9JhmOD/view?usp=drivesdk","description":"Arpa - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/1lVVoojlEqoMce0OzUhGVYHT7XyifOTVS/view?usp=drivesdk","description":"Clarinete A 1 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/1-kmbnv-2X4cRGR_LJqjPFYJ5H9BbFpHf/view?usp=drivesdk","description":"Clarinete A 2 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1kQOoDwLUYgrnVEgAPiMJFggSgGnev03d/view?usp=drivesdk","description":"Contrabajo - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1cR9RVfDFc0x7th3mZstOts0Adg_CLg78/view?usp=drivesdk","description":"Corno F 1 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1TX825Wgjh8h3ZLYJvapEPO52gwIx4VmD/view?usp=drivesdk","description":"Corno F 2 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/14V2mphFUb43Yj5thu05TItwg4FFUrZX0/view?usp=drivesdk","description":"Corno F 3 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1nlfo-EZKz4faMQVRIbv9EHyjZXh6kJka/view?usp=drivesdk","description":"Corno F 4 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1Mdz30ABMDPf0-4WNkB-siiRQ6xDmDNjf/view?usp=drivesdk","description":"Fagot 1 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/13iPFEqJLAIfeaDIY7xQmHRZX9yWS1Pjj/view?usp=drivesdk","description":"Fagot 2 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1vHnJkJUp04YD7YgzTclQMxpDPXpp7anm/view?usp=drivesdk","description":"Fl Piccolo - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1HtPLSXSVM4ZB77hX6uyg0H1mbDF1CTxb/view?usp=drivesdk","description":"Flauta 1 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1_Qu3Hw2bcE_cuNp1hcl4LxiEKiyLLPeh/view?usp=drivesdk","description":"Flauta 2 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1slvJtjD-lZIJMut65t7xdZegAh_BPkec/view?usp=drivesdk","description":"Oboe 1 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/10rvbGHeaUMea_Wp0zF8VWOr93T6LshQE/view?usp=drivesdk","description":"Oboe 2 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '13', 'Perc Bombo y Platillos', '[{"url":"https://drive.google.com/file/d/1S912sCVur9Xa2p3TlwX5-yFQFnnb8rPX/view?usp=drivesdk","description":"Perc Bombo y Platillos - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '13', 'Perc Tambourine', '[{"url":"https://drive.google.com/file/d/14m-E79ILFxclSC68xyairXrdPm6s7P00/view?usp=drivesdk","description":"Perc Tambourine - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1DWyo_-hBHHuqZae2e7we0y3BE9DsRjqm/view?usp=drivesdk","description":"Perc Triángulo - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1PwG5NPmO_KuZi74jLsv6XaLe0Y0MMmSI/view?usp=drivesdk","description":"SCORE - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '13a', 'Timpani', '[{"url":"https://drive.google.com/file/d/1STf6diLnLwsmyjGdWqvytuTm9jwP6wy4/view?usp=drivesdk","description":"Timpani - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1e2sFYUIDhNzia2-2eekQyY3bBQ0lnDun/view?usp=drivesdk","description":"Trombón 1 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1L7bq-C0ELyff529MxMrZYRwroO4BS3wN/view?usp=drivesdk","description":"Trombón 2 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1yozdmEv8Q7VUVBV5-yW1zlGJYQa9_7D4/view?usp=drivesdk","description":"Trombón 3 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1ny0Bc4gyIoO03RdM8nI5p-TELwLMNq6A/view?usp=drivesdk","description":"Trompeta Bb 1 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1my38Vtv0pTe7Zr_RebC51hU6kcoeIM_B/view?usp=drivesdk","description":"Trompeta Bb 2 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1W6_SNapNOOSicNcDE5McWKtStNwiwR-N/view?usp=drivesdk","description":"Tuba - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1RkWitL6_3AAtMdUWCy9xTCgLR2LU1XGb/view?usp=drivesdk","description":"Viola - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/16PSTvygfVb6KLhKgiwJ6FdZDqBYZQ92o/view?usp=drivesdk","description":"Violín 1 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1VC8pMVuMu6-DPOFD3zAZRQCZuT2-YnPU/view?usp=drivesdk","description":"Violín 2 - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3891, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1hJ-K3OYVNwPJeQl6UiW9dPPulbjpKXOM/view?usp=drivesdk","description":"Violoncello - Sinfonia Nro 2 en si menor - Borodin, A.pdf"}]', false);
END $$;

-- Kalinnikov, V. - Serenata para Cuerdas en sol menor → obra 3893
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Serenata para Cuerdas en sol menor</p>',
    link_drive = 'https://drive.google.com/open?id=17d5fG6TlXZ4LlK6UqJ8aaI4G0brXmj17',
    observaciones = 'Para acomodar — Kalinnikov, V. - Serenata para Cuerdas en sol menor.',
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

-- Kalinnikov, V. - Sinfonia Nro. 2 en La mayor → obra 3895
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Sinfonía Nro. 2 en La mayor</p><div>&nbsp; I. Moderato - Allegro non troppo</div><div>&nbsp; II. Andante cantabile</div><div>&nbsp; III. Allegro scherzando</div><div>&nbsp; IV. Andante cantabile - Allegro vivo</div>',
    link_drive = 'https://drive.google.com/open?id=1cAWx5gzsaZPExf1ANDdyRxpO2mN2MZxV',
    observaciones = 'Para acomodar — Kalinnikov, V. - Sinfonia Nro. 2 en La mayor.',
    instrumentacion = '3.2.2.2 - 4.2.3.1 - Timp - Hp - Str',
    anio_composicion = 1897,
    duracion_segundos = 2400,
    estado = 'Oficial'
  WHERE id = 3895;

  DELETE FROM obras_particellas WHERE id_obra = 3895;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/13rmmJw2MX4V1j_KHSlxw24yI0GhrlU0y/view?usp=drivesdk","description":"Arpa - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/10ppGXCGD3qmIOjT_c7yFgaDRUqX-f8As/view?usp=drivesdk","description":"Clarinete A 1 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/1lursI-iWoORpESTGjE5HfhDZlvLy1Bno/view?usp=drivesdk","description":"Clarinete A 2 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1bNPALOFtm1SYdobAe5aw6JssDJU5Daj7/view?usp=drivesdk","description":"Contrabajo - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1SSqZ6U91B4bDNjnVP0K_kW4LB1ytSioB/view?usp=drivesdk","description":"Corno F 1 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/13pxT-_r1DICyBTnKfAEbf_XjPWRjJ8jC/view?usp=drivesdk","description":"Corno F 2 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1ZUdTJWd8D_dBozBLaD0GtRXW4iVqRR4J/view?usp=drivesdk","description":"Corno F 3 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1rMqUrjlBJePMYt9OR2g8zSDWph1sP7WG/view?usp=drivesdk","description":"Corno F 4 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/15zJyDLAv8VMPmRxIpnbtDL7zIjJmRSd5/view?usp=drivesdk","description":"Fagot 1 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1z_nuEayiQP5tgdX8l7MQB0lMZ1NuJLv-/view?usp=drivesdk","description":"Fagot 2 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/17rg-q_rqq42ieiyW47UR8IDjhGAqrFjd/view?usp=drivesdk","description":"Fl Piccolo - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1IqAPw7ZijYe9TWybdw6NeEQgmoeEcY0M/view?usp=drivesdk","description":"Flauta 1 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1JGB2G0DgCVkfV2CGkB817YME5U064zuv/view?usp=drivesdk","description":"Flauta 2 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/11m6VQg-FuUHHlRMhNQq6yC4yQpaJXlN6/view?usp=drivesdk","description":"Oboe 1 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1ju7Yj9iG0G-8TqBSnbQHlER-n0Dgj5Fl/view?usp=drivesdk","description":"Oboe 2 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/14_BVlKHR-CXs1Y6uHbE3zpzEXHo0Tezh/view?usp=drivesdk","description":"Perc Timbal - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1wAYVEl3ayFDz7NPnzb_dazo6mKwCy6l2/view?usp=drivesdk","description":"SCORE - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1g0Bu_7UaPkPcQm199f8bsp_wuR3XGSGN/view?usp=drivesdk","description":"Trombón 1 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1sRT9WpZfnA2hzgBJcY9bDjs0ilGaQMrt/view?usp=drivesdk","description":"Trombón 2 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1V6NaJiIwT41fk35xMPWGxKxp-JsiftCf/view?usp=drivesdk","description":"Trombón 3 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1lQ6IrqsEo7trRcVXc5O3f-DkKJV0Knxv/view?usp=drivesdk","description":"Trompeta 1 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1r5ZjjktqexWI9QL1tVd81gE9aClemq_6/view?usp=drivesdk","description":"Trompeta 2 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1ohyzNGQI30njt46OFNJTwzPOPkV8eLn1/view?usp=drivesdk","description":"Tuba - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1mOcsn6Wp_lzEi3UNKWTVjtnl7rUxBOdc/view?usp=drivesdk","description":"Viola - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/172Pd9pfxYupreZRTa5YNnui9B04GLiY5/view?usp=drivesdk","description":"Violín 1 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Ewwt46croLd0-ADhdBYH4tkM0YedttSi/view?usp=drivesdk","description":"Violín 2 - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3895, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1IA9YJ2AIq0kO2UHqoXiFB5D2XTPVJ044/view?usp=drivesdk","description":"Violoncello - Sinfonia Nro. 2 en La mayor - Kalinnikov, V.pdf"}]', false);
END $$;

-- Mozart, W.A. - Sinfonia Nro 40 K.550 → obra 3896
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Sinfonía Nro. 40 en sol menor, K. 550</p><div>&nbsp; I. Allegro molto</div><div>&nbsp; II. Andante</div><div>&nbsp; III. Menuetto. Allegretto</div><div>&nbsp; IV. Allegro assai</div>',
    link_drive = 'https://drive.google.com/open?id=1JHHif9rzEnDm6ogJEtfUtoucJC7rDFQN',
    observaciones = 'Para acomodar — Mozart, W.A. - Sinfonia Nro 40 K.550.',
    instrumentacion = '1.2.2.2 - 2.0.0.0 - Str',
    anio_composicion = 1788,
    duracion_segundos = 1560,
    estado = 'Oficial'
  WHERE id = 3896;

  DELETE FROM obras_particellas WHERE id_obra = 3896;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1yHfnxOSVdMeLSvoGVC6Yr1-34A-hG9cP/view?usp=drivesdk","description":"Clarinete Bb 1 - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1PDqbNlpXTksgU2VpIlTAZSub31OKtP9K/view?usp=drivesdk","description":"Clarinete Bb 2 - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/12WYTEumQTGzxhfvhqBjmcLrcE9fly2et/view?usp=drivesdk","description":"Contrabajo - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1Hc-OH3Cm_pave6SUM7rW7unZkNfkV6-b/view?usp=drivesdk","description":"Corno F 1 - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/14acNMbBj-_HAwsUpoBFVRnMzvFFCt1Pz/view?usp=drivesdk","description":"Corno F 2 - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1QB8_Q1SF9ylPSpqYq-9VSwK4pTOKv6g_/view?usp=drivesdk","description":"Fagot 1 - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1veeMxmFAwWTzUKrM_OPs2VNAk1TEUcj7/view?usp=drivesdk","description":"Fagot 2 - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1nmRy0RV1zgRoNxNOcB8fiuer_MK6uyGO/view?usp=drivesdk","description":"Flauta - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1WWvVPVNdD3mPEVr-cACvv5ERTteC0128/view?usp=drivesdk","description":"Oboe 1 - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1MIFj2cGoyNC95Gw3JqozVjPiEQpVp2bi/view?usp=drivesdk","description":"Oboe 2 - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1_Q9wZtnXAs-rdznEIRgKO8AFWOwIgEIs/view?usp=drivesdk","description":"Viola - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1mKeYxkuULycOnIcrkc7ZfUrDYdB6pg5k/view?usp=drivesdk","description":"Violín 1 - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1gI_w7z8r3jouLPND31g0vSRAFgoQXZSg/view?usp=drivesdk","description":"Violín 2 - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3896, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1J2_PD1aGQEiviNpAYiXhqYd8soqFlc_x/view?usp=drivesdk","description":"Violoncello - K.550. Sinfonia Nro 40 - Mozart, W.A.pdf"}]', false);
END $$;

-- Debussy, C. - Preludio a la siesta de un fauno → obra 3897
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Preludio a la siesta de un fauno</p>',
    link_drive = 'https://drive.google.com/open?id=15XBxTp8j0Iun8kXEom5iNJgvkRwSJynJ',
    observaciones = 'Para acomodar — Debussy, C. - Preludio a la siesta de un fauno.',
    instrumentacion = '3.3.2.2 - 4.0.0.0 - Perc - 2Hp - Str',
    anio_composicion = 1894,
    duracion_segundos = 600,
    estado = 'Oficial'
  WHERE id = 3897;

  DELETE FROM obras_particellas WHERE id_obra = 3897;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '14', 'Arpa 1', '[{"url":"https://drive.google.com/file/d/1syjjdgzbq2r7nMMR6YX9u7qklzbT68FX/view?usp=drivesdk","description":"Arpa 1 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '14', 'Arpa 2', '[{"url":"https://drive.google.com/file/d/1jtpuOoXvOKzbT6q-JHZEE_4ELjPp-ZOI/view?usp=drivesdk","description":"Arpa 2 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1EAREcFW__NQqxMnQqrQkZC0r6g3lKkOj/view?usp=drivesdk","description":"Clarinete Bb 1 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1ni4gXRu6GGss8I2ESQtA7CsJZGie5mN6/view?usp=drivesdk","description":"Clarinete Bb 2 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1NtrQkergRktqXSBO7qn4pyJrqLUtcrbf/view?usp=drivesdk","description":"Contrabajo - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1ueWkhyR8ycSZSw-zanqZ_JI9n6D9Vo-a/view?usp=drivesdk","description":"Corno F 1 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1bhn6f1EVvYdeW8ngkpw4yw90K0r3SFcL/view?usp=drivesdk","description":"Corno F 2 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1Q2ekzAmL13JId1VHyk-2vcTBPlYx4yuR/view?usp=drivesdk","description":"Corno F 3 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/14zC04z7QkeFFxS_T9nMx3mbLVNzCrcL2/view?usp=drivesdk","description":"Corno F 4 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '06b', 'Corno Inglés', '[{"url":"https://drive.google.com/file/d/1p5wqAgTmOjreqDWUM-glbNnQ1qMjV-XW/view?usp=drivesdk","description":"Corno Inglés - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1vqgrIieDsImiCeCN26yFRRlqHUx-Zx7m/view?usp=drivesdk","description":"Fagot 1 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1rXCoIeqmFKuHuO9zf0BmrELhPSc_WvbM/view?usp=drivesdk","description":"Fagot 2 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1rL28K9ht9qsIUefX2DghnsX8p4DKafBv/view?usp=drivesdk","description":"Flauta 1 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1dVBij-R1X3wgZbvKaz_GkfCe5c1VY_Ww/view?usp=drivesdk","description":"Flauta 2 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '05', 'Flauta 3', '[{"url":"https://drive.google.com/file/d/1s2ee9nk_4CVwh9M7L5q7o79vok88Gxuo/view?usp=drivesdk","description":"Flauta 3 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1zNtRXKMF4iQ5QVQ5Lj7YentumNcBPIq3/view?usp=drivesdk","description":"Oboe 1 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1xLJOjDZndzRSYwufCNjfTArGNWH8RGsS/view?usp=drivesdk","description":"Oboe 2 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1tpWTxyeaMe4ZidgHPiEGnuR0S_afuzLI/view?usp=drivesdk","description":"Perc Platillo - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1kTBeN44fWs6t_KSgDc6sjh-XhRnSXYT2/view?usp=drivesdk","description":"SCORE - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1war24WLf5xpjGEJgroT18O1mDp0ZAPtB/view?usp=drivesdk","description":"Viola - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/14HCMlrQx6BD1pCnyLekwuGHZvsHY0uSt/view?usp=drivesdk","description":"Violín 1 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1zknuExI-QwixkvGqltcUWIprI5s_05A6/view?usp=drivesdk","description":"Violín 2 - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3897, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1jdodTf3mb_QfGGGEP2P2XaTFUsk0oDHz/view?usp=drivesdk","description":"Violoncello - Preludio a la siesta de un fauno - Debussy, C.pdf"}]', false);
END $$;

-- Paganini, N. - Concierto Violin Nro 1 Op.6 → obra 3900
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Concierto para Violín Nro. 1 en Re mayor, Op. 6</p><div>&nbsp; I. Allegro maestoso</div><div>&nbsp; II. Adagio</div><div>&nbsp; III. Rondo. Allegro spirituoso</div>',
    link_drive = 'https://drive.google.com/open?id=1fIUA4amHHPmxJpEUeHthZGHK3aEvEdh4',
    observaciones = 'Para acomodar — Paganini, N. - Concierto Violin Nro 1 Op.6. Set Generoso D major: faltan cuerdas orquestales (solo vientos/metales + Violín Solo + SCORE).',
    instrumentacion = 'Vn - 2.2.2.0 - 2.2.2.0',
    anio_composicion = 1818,
    duracion_segundos = 2100,
    estado = 'Solicitud'
  WHERE id = 3900;

  DELETE FROM obras_particellas WHERE id_obra = 3900;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/19WRk__iQsFGUAo2tnGcIs_8vgXa_RIYV/view?usp=drivesdk","description":"Clarinete A 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/1oafrpQRFwk9nn38gEDJ19Y9dvFC5Wv0l/view?usp=drivesdk","description":"Clarinete A 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1yBNrx2HCWGAr1X3KKgKRGVCS7bfy2slc/view?usp=drivesdk","description":"Corno F 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1WNTYZnRIc-0d3VsEmBfWbd7WiMBWB_Li/view?usp=drivesdk","description":"Corno F 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1JLCyocG-4eKTZW4qX30MK_WhljsBao4c/view?usp=drivesdk","description":"Flauta 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1VEdzCtaP-kwUvwOOdl8KM6cjPnlUXEXv/view?usp=drivesdk","description":"Flauta 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1JevCSmpIyV5NX0pxQo7wYTvYsELXqH6H/view?usp=drivesdk","description":"Oboe 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1DkPbbzfZzJNbNWCVU1xcqSfowll1yhy1/view?usp=drivesdk","description":"Oboe 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/19x8jGXl-qMWK3wEqQDbBJMw7TbuA_IM7/view?usp=drivesdk","description":"SCORE - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1gVJhKgnAWrs51T_s-XimhOCyS700aAdd/view?usp=drivesdk","description":"Trombón 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1tVzA0NAWtUtEMm8VBUvHyi5PE7neU44-/view?usp=drivesdk","description":"Trombón 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1Mv8JERX8xU5ZfHpqc-kjai21Q7xaV76z/view?usp=drivesdk","description":"Trompeta Bb 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1XIb1BxIJng17AzsC9HW4QSijGEsDxg7I/view?usp=drivesdk","description":"Trompeta Bb 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3900, '01', 'Violín Solo', '[{"url":"https://drive.google.com/file/d/1UIejy5W2WPjmXrlGE_xRl66X_xdobGuu/view?usp=drivesdk","description":"Violín Solo - op.6. Concierto Violin Nro 1 - Paganini, N.pdf"}]', true);
END $$;

-- Schubert, F. - Rosamunda D.797 Entreacto Nro 3 → obra 3902
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Rosamunda, D. 797 — Entreacto Nro. 3</p>',
    link_drive = 'https://drive.google.com/open?id=14VEZ9Mi1Mn9-F10UAK-6JDb-azj6XYA3',
    observaciones = 'Para acomodar — Schubert, F. - Rosamunda D.797 Entreacto Nro 3.',
    instrumentacion = '2.2.2.2 - 2.0.0.0 - Str',
    anio_composicion = 1823,
    duracion_segundos = 420,
    estado = 'Oficial'
  WHERE id = 3902;

  DELETE FROM obras_particellas WHERE id_obra = 3902;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1h3Oz3FpsR4OHu7-QTFlilKfDDer-NLEH/view?usp=drivesdk","description":"Clarinete Bb 1y2 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1h3Oz3FpsR4OHu7-QTFlilKfDDer-NLEH/view?usp=drivesdk","description":"Clarinete Bb 1y2 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1WMXyq_Xcmkz406Z7CQss-eHbkgI6_uLg/view?usp=drivesdk","description":"Corno Bb 1y2 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1WMXyq_Xcmkz406Z7CQss-eHbkgI6_uLg/view?usp=drivesdk","description":"Corno Bb 1y2 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1FeTxFmJ9FB62mng5O_Weh9yNR-P5Vuie/view?usp=drivesdk","description":"Fagot 1y2 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1FeTxFmJ9FB62mng5O_Weh9yNR-P5Vuie/view?usp=drivesdk","description":"Fagot 1y2 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/11tM_LOBoOGQaZ72aXz94c6GTkfunjlfX/view?usp=drivesdk","description":"Flauta 1y2 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/11tM_LOBoOGQaZ72aXz94c6GTkfunjlfX/view?usp=drivesdk","description":"Flauta 1y2 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1CJINufSwudp52xXIgVjtpUHP7ZUc77QG/view?usp=drivesdk","description":"Oboe 1y2 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1CJINufSwudp52xXIgVjtpUHP7ZUc77QG/view?usp=drivesdk","description":"Oboe 1y2 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/10pRUbPwR2ygqcxs7AAjuhtLxtTSRe1Rq/view?usp=drivesdk","description":"Viola - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/16NmLiOKZDnKVpKNTJbspuvx_9acL1Ks3/view?usp=drivesdk","description":"Violín 1 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1PfbCXw-klh17elwhwHjble4-i3MCLBnB/view?usp=drivesdk","description":"Violín 2 - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3902, '03', 'Violoncello y Contrabajo', '[{"url":"https://drive.google.com/file/d/1ASAW9QwG-lOcQqUmUuq3-GQfEisk2IuD/view?usp=drivesdk","description":"Violoncello y Contrabajo - D.797. Rosamunda Entreacto Nro 3 - Schubert, F.pdf"}]', false);
END $$;

-- Beethoven, L. - Elegischer Gesang, Op. 118 → obra 3907
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Elegischer Gesang en Mi mayor, Op. 118</p>',
    link_drive = 'https://drive.google.com/open?id=1OoF0zwFgA8Z6INziq5O-fT59h8c3-DBk',
    observaciones = 'Para acomodar — Beethoven, L. - Elegischer Gesang, Op. 118.',
    instrumentacion = '0.0.0.0 - 0.0.0.1 - Str + Cantante Soprano x3',
    anio_composicion = 1814,
    duracion_segundos = 240,
    estado = 'Oficial'
  WHERE id = 3907;

  DELETE FROM obras_particellas WHERE id_obra = 3907;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3907, '12', 'Cantante Baritono', '[{"url":"https://drive.google.com/file/d/1KXN5Eme-h3Rj7O5RFkB_V-HnUD598OIw/view?usp=drivesdk","description":"Cantante Baritono - op.118. Elegischer Gesang - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3907, '20', 'Cantante Mezzo', '[{"url":"https://drive.google.com/file/d/19r8WQflXB07oUv1l9e5YK5FFF43-xeEf/view?usp=drivesdk","description":"Cantante Mezzo - op.118. Elegischer Gesang - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3907, '20', 'Cantante Soprano', '[{"url":"https://drive.google.com/file/d/1dTycp79d1blJZUNMJLAJAnl3acGk4gba/view?usp=drivesdk","description":"Cantante Soprano - op.118. Elegischer Gesang - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3907, '20', 'Cantante Tenor', '[{"url":"https://drive.google.com/file/d/1a9UC9-fPJL4mz3tj-OzUJv8_erAyn0_D/view?usp=drivesdk","description":"Cantante Tenor - op.118. Elegischer Gesang - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3907, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1AG0211T6oX4TZWx_vvTP9W16POU4RysD/view?usp=drivesdk","description":"SCORE - op.118. Elegischer Gesang - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3907, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/15bgvDRUAsS49JIeyV71pEXcqGHm7JTFX/view?usp=drivesdk","description":"Viola - op.118. Elegischer Gesang - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3907, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1XKin_G2fipkpmEaKqjwplLIvGwMf1usJ/view?usp=drivesdk","description":"Violín 1 - op.118. Elegischer Gesang - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3907, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1X__iGwQk8bxt4FCwPvMzecbWbGuL-3e9/view?usp=drivesdk","description":"Violín 2 - op.118. Elegischer Gesang - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3907, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/11ND03JLiS99D1OYUJlVpU0hRjJ9l8JuY/view?usp=drivesdk","description":"Violoncello - op.118. Elegischer Gesang - Beethoven, L.pdf"}]', false);
END $$;

-- Beethoven, L. - Sinfonia Nro 9 Op.125 → obra 3901
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Sinfonía Nro. 9 en re menor, Op. 125</p><div>&nbsp; I. Allegro ma non troppo, un poco maestoso</div><div>&nbsp; II. Molto vivace</div><div>&nbsp; III. Adagio molto e cantabile</div><div>&nbsp; IV. Presto - Allegro assai</div>',
    link_drive = 'https://drive.google.com/open?id=1tEW3ilWi9T07uLfBW5ckwG88hXKQcL9e',
    observaciones = 'Para acomodar — Beethoven, L. - Sinfonia Nro 9 Op.125.',
    instrumentacion = '3.2.2.3 - 4.2.3.0 - Timp.+1 - Str + Coro',
    anio_composicion = 1824,
    duracion_segundos = 4200,
    estado = 'Oficial'
  WHERE id = 3901;

  DELETE FROM obras_particellas WHERE id_obra = 3901;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1NJoxRKiw6XB74UUD0pxY_RwmwlmhjCiH/view?usp=drivesdk","description":"Clarinete 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1oNZlxppIIWPWxn1U52tTlcv2Y2XgI48o/view?usp=drivesdk","description":"Clarinete 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/14bPFpKUF9B-53o_52KajQwKY1xpCNg9y/view?usp=drivesdk","description":"Contrabajo - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1b_6s5zpdr7IJU2eiPV252Zbeq8uq16Lv/view?usp=drivesdk","description":"Contrafagot - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1-3djt2Sw3q7IeOWeqkmysH0xXg8-PnPI/view?usp=drivesdk","description":"Corno 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1XqAY8Prn2FTYEYMydZjiXluPCwdeAgUS/view?usp=drivesdk","description":"Corno 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1pp0Bs1kjEDtKvYMZibYZ70pWkanSWWo8/view?usp=drivesdk","description":"Corno 3 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1oWInFAxjpSgflzAuZkWNWTLqV3Lov3kK/view?usp=drivesdk","description":"Corno 4 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '23', 'Coro', '[{"url":"https://drive.google.com/file/d/1l96R0npTlAlMxQjUnU8ObEsQbUVhWUY0/view?usp=drivesdk","description":"Coro - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/12e0oSXyBlzWR80Jwt1wuBbimgk4dYo63/view?usp=drivesdk","description":"Fagot 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1_njsAyuYcRmyjP5GRo3IU9BC1Eqd7o8d/view?usp=drivesdk","description":"Fagot 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1Fd3HRTTWYNhP8SP7PnTTEs5YT3ryycUA/view?usp=drivesdk","description":"Fl Piccolo - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/19gZjfDG2JmtEsZ-WNuZZJzzgMhh69Fns/view?usp=drivesdk","description":"Flauta 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1xB8avdmIbWxfCpl_AJcReMX5rjEve_FM/view?usp=drivesdk","description":"Flauta 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1oHnnkLdccw7xaW81aRBaIAR8utJ7lCze/view?usp=drivesdk","description":"Oboe 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1zteNJ6WkGU8Dip2TRvm2kjaLTJB5BjHz/view?usp=drivesdk","description":"Oboe 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '13', 'Percusión', '[{"url":"https://drive.google.com/file/d/1KMYSuqz1aWaBnv7etHxSBQgXyGY2df-P/view?usp=drivesdk","description":"Percusión - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/18ej3P_LNV08p04BwUn-MPGbhkelXLMwQ/view?usp=drivesdk","description":"SCORE - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '13a', 'Timbales', '[{"url":"https://drive.google.com/file/d/1oqAPMhI3OTjkoyzkVlYKnWdXEmQqZvcc/view?usp=drivesdk","description":"Timbales - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1PzVzSzHlTnxWtCv28ZT2TYsY6iwuOnvW/view?usp=drivesdk","description":"Trombón 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1rmdAh5jG_sU5cAM6MKDdiNyX5rAwFcfu/view?usp=drivesdk","description":"Trombón 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/12fXOhpXEFfqgEYWdCiHXntXrfIAtEtNu/view?usp=drivesdk","description":"Trombón 3 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1nJgyrHHHvgUxf2081-vq7RsYQBr_Q9d-/view?usp=drivesdk","description":"Trompeta 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1xRdXDB1UQjAU8LqpV0NEKLHSt1ssslUY/view?usp=drivesdk","description":"Trompeta 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/16nCcgXaNUrAyV1RantlMrTBTXmr4CrPA/view?usp=drivesdk","description":"Viola - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ODXjF_fLgxfq0FV-5nsJ40zf8o1mbqqR/view?usp=drivesdk","description":"Violín 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/16tGFbOcJZFpixQt07I-4uHrfDOrY9gVv/view?usp=drivesdk","description":"Violín 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1K_X8KYgI806MweJt3aMyVdxe7uMXwJAa/view?usp=drivesdk","description":"Violoncello - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);
END $$;

-- Bach, J.S. - Nun danket alle Gott BWV 192 → obra 3909
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Nun danket alle Gott, BWV 192</p><div>&nbsp; I. Chor</div><div>&nbsp; II. Aria (Duett)</div><div>&nbsp; III. Chor</div>',
    link_drive = 'https://drive.google.com/open?id=1xWNUPPDgvJZKM67hRCB-cvdRnXMVbyMZ',
    observaciones = 'Para acomodar — Bach, J.S. - Nun danket alle Gott BWV 192.',
    instrumentacion = '2.2.0.0 - 0.0.0.0 - Str',
    anio_composicion = 1730,
    duracion_segundos = 900,
    estado = 'Oficial'
  WHERE id = 3909;

  DELETE FROM obras_particellas WHERE id_obra = 3909;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3909, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1-wM7F0nKZcnNAmj4x5oF1Xkttake3vMq/view?usp=drivesdk","description":"Flauta 1 - BWV 192. Nun danket alle Gott - Bach, J.S.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3909, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/18llKeuQXJj_MT0MEZy3xsNri-gkX2Kq4/view?usp=drivesdk","description":"Flauta 2 - BWV 192. Nun danket alle Gott - Bach, J.S.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3909, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1HT4vgtxdreXNa4ocDS4l81sHoW2krIqx/view?usp=drivesdk","description":"Oboe 1 - BWV 192. Nun danket alle Gott - Bach, J.S.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3909, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1cv3IepXw24cP1QMq7iRl2jChjCjjqRJR/view?usp=drivesdk","description":"Oboe 2 - BWV 192. Nun danket alle Gott - Bach, J.S.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3909, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1IsV4JaJPERQgjAN4Wss0gmzOdIuI6o7s/view?usp=drivesdk","description":"SCORE - BWV 192. Nun danket alle Gott - Bach, J.S.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3909, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1vNs_8MTfV5_a-OzHLHMA9Z0ze1Jdtx9e/view?usp=drivesdk","description":"Viola - BWV 192. Nun danket alle Gott - Bach, J.S.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3909, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1n_EfD7vMlwQ_ftk-Ahbjfq7qcss6SwY6/view?usp=drivesdk","description":"Violín 1 - BWV 192. Nun danket alle Gott - Bach, J.S.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3909, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1qFNzD-hkdmFi-00vsI88hWl-rpTNC7qR/view?usp=drivesdk","description":"Violín 2 - BWV 192. Nun danket alle Gott - Bach, J.S.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3909, '03', 'Violoncello y Contrabajo', '[{"url":"https://drive.google.com/file/d/1Im8uGzYKLAqTYpej5rxanpD_ZdgFTizp/view?usp=drivesdk","description":"Violoncello y Contrabajo - BWV 192. Nun danket alle Gott - Bach, J.S.pdf"}]', false);
END $$;

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

-- Wagner, R. - Idilio de Sigfrido, WWV 103 → obra 3913
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Idilio de Sigfrido, WWV 103</p>',
    link_drive = 'https://drive.google.com/open?id=1HXnLQ4ij6jihGMDUa0RdnJZkSAnMOije',
    observaciones = 'Para acomodar — Wagner, R. - Idilio de Sigfrido, WWV 103.',
    instrumentacion = '1.1.2.1 - 2.1.0.0 - Str',
    anio_composicion = 1870,
    duracion_segundos = 1080,
    estado = 'Oficial'
  WHERE id = 3913;

  DELETE FROM obras_particellas WHERE id_obra = 3913;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/12NKteX2UteunldKq5gVhpJzz1duxdaBa/view?usp=drivesdk","description":"Clarinete Bb 1 - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1qEvlfKgmil_9a7_Tvy6koxQowhiVRgsL/view?usp=drivesdk","description":"Clarinete Bb 2 - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1c_jBb-UMcN-kN8qBkWH2i1UZp_p_UIOu/view?usp=drivesdk","description":"Contrabajo - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1Pj0lh4jnGre3-J4DywjTEFOe3INcW-BH/view?usp=drivesdk","description":"Corno F 1 - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1nTZGXvvCm1ErdKPWd_9s7KZnPHXhkuC5/view?usp=drivesdk","description":"Corno F 2 - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/19YWHjBUzmTXErXM8yYHlW1s-aX1bcM-d/view?usp=drivesdk","description":"Fagot - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1DM5jd_7vT9QxT_ejPfTw0CJw33e_o2Rz/view?usp=drivesdk","description":"Flauta - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1h-HK5Z7VKtlrCB-LYEmWTGFtGDnfevbp/view?usp=drivesdk","description":"Oboe - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1NbKBKvTdcCZPQVriaJ4gUevbH2pZVwP4/view?usp=drivesdk","description":"SCORE - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '10', 'Trompeta C', '[{"url":"https://drive.google.com/file/d/1JKX9mcTI9e482Mpz4dqyhyFjkQT0mxXf/view?usp=drivesdk","description":"Trompeta C - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1fUU6Ua67wN0N1rr-fL0V4QQh88QeSROE/view?usp=drivesdk","description":"Viola - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1neit-0JthOnwZzTO-qbGwZ4qOaOlgaQu/view?usp=drivesdk","description":"Violín 1 - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1D9uYljL-q9HbniopSrss3c1UqI3Z5AmQ/view?usp=drivesdk","description":"Violín 2 - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3913, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1m_Ac08jH2rLGM3xWEeEvOaDXfA-J-UfO/view?usp=drivesdk","description":"Violoncello - WWV 103. Idilio de Sigfrido - Wagner, R.pdf"}]', false);
END $$;
