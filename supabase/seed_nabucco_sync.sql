-- Verdi — Coro de los Esclavos ('Nabucco') IMSLP → obra 3548
-- Generado: 2026-08-24
-- Drive: https://drive.google.com/drive/folders/1JDPuJjP9-36lQ5RTOJSVq9dzFmMUCKqV

DO $$
BEGIN
  UPDATE obras SET
    link_drive = 'https://drive.google.com/drive/folders/1JDPuJjP9-36lQ5RTOJSVq9dzFmMUCKqV',
    instrumentacion = '2.2.2.2 - 4.2.3.1 - Timp - Str',
    anio_composicion = 1842
  WHERE id = 3548;

  DELETE FROM obras_particellas WHERE id_obra = 3548;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/1ro9RY1Au9dkHgi6j_8t77pGedFHCIVZr/view?usp=drivesdk","description":"Clarinete A 1 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/1X3zbiHZMRvkyFmKMVUmHTFtBtWePCzVW/view?usp=drivesdk","description":"Clarinete A 2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Ja-qfw8t0yFN1JzdTp-3JXsygaY7qz0E/view?usp=drivesdk","description":"Contrabajo - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1iyHnwCd1eVGB8JSRbyoaamWfThCy40X7/view?usp=drivesdk","description":"Corno F 1 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1RvhmGPitp8o2zDywTjp6XSI0ZxyqPrVe/view?usp=drivesdk","description":"Corno F 2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1Sr2BUOTgU0S0Mmhr76_84G6POouBdA1K/view?usp=drivesdk","description":"Corno F 3 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1dN2BNijCPm_l4abFH563lgj_MI6ZHqyu/view?usp=drivesdk","description":"Corno F 4 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/106ZI8OoFnjMKbQdym3bV4YDhLjz7h9F5/view?usp=drivesdk","description":"Fagot 1 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1DdTMvy8p_DbLb3aNAyZV_1gLdN2mscvU/view?usp=drivesdk","description":"Fagot 2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1a5tlP7Wf3jZG2DZQPBfmTwrGAR3AroZE/view?usp=drivesdk","description":"Fl Piccolo - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/14T1yQh7qmyjCqfpRUwG3fU1NFf2KHfzK/view?usp=drivesdk","description":"Flauta - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1u-7xL2ek4gMdae46l7kEMnQG4KoMit-b/view?usp=drivesdk","description":"Oboe 1 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1gfoqM8Gdbca-kj8dQSLuR-nRlnmKgRm4/view?usp=drivesdk","description":"Oboe 2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1JMSp7EMc-TidWccEfR6wD8502idDxPdg/view?usp=drivesdk","description":"Perc Timbal - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1JqeXBs1bMQi9fFsW5wepqeqsHZZ6Gg0T/view?usp=drivesdk","description":"SCORE - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1XtDNtwLiEotzBmjFNLHo-kLFO8Yv1qnU/view?usp=drivesdk","description":"Trombón 1 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1U40Ue6vXkpKgYCoDn-Xh_1ylNT-MtZgr/view?usp=drivesdk","description":"Trombón 2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1L6ED1AwikBFPOd-uo0ZDyggKp_KNBYII/view?usp=drivesdk","description":"Trombón 3 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/15dHmTohQpuxpO4kTAqbHjJgq_dVbEyWX/view?usp=drivesdk","description":"Trompeta 1 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1RN2dHHZsPA8yiOIyQT1P7PnyT80uVpaO/view?usp=drivesdk","description":"Trompeta 2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1JUve6vCN4zzjQqtb35BREUdqUR2LI4VF/view?usp=drivesdk","description":"Tuba - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1JK33K39KibbrtrhNS6KZcIH35u0h3dUF/view?usp=drivesdk","description":"Viola - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1JE9EREgvbrHEQZOibHTNP2k3J0cDSF1M/view?usp=drivesdk","description":"Violín 1 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1JE5DT32A1BkGrh5pYKRi6y7r7l4wm393/view?usp=drivesdk","description":"Violín 2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3548, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1JFngpRkLlKKIpGHpsOY1k4Bivq57AJba/view?usp=drivesdk","description":"Violoncello - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

END $$;
