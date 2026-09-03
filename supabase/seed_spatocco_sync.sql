-- Spatocco — Arreglos para OFRN → particellas (Archivo backup)

-- Generado: 2026-09-03

-- Actualiza link_drive (carpeta Archivo), instrumentacion y obras_particellas.

-- Fuente: copias en Archivo OFRN (copiar_carpeta_a_archivo), no carpetas origen Spatocco.



-- Chiquilín de Bachín → obra 3626 (Archivo 16SIQQGrWBA1romVpwwUqfAvxZfb6tAZJ)
DO $$
BEGIN
  UPDATE obras SET
    link_drive = 'https://drive.google.com/drive/folders/16SIQQGrWBA1romVpwwUqfAvxZfb6tAZJ',
    instrumentacion = 'voz - 1.0.0.0 - 0.1.0.0 - Perc.x3 - Str + Bandoneón, Guitarra'
  WHERE id = 3626;

  DELETE FROM obras_particellas WHERE id_obra = 3626;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '22b', 'Bandoneón', '[{"url":"https://drive.google.com/file/d/171yU_Cs67LineG3E0dchQ_q_YNZ1CqIc/view?usp=drivesdk","description":"Bandoneón - Chiquilín de Bachín - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1sSY8dKw52gwPDiphnt0qqgPRD9sc755V/view?usp=drivesdk","description":"Contrabajo - Chiquilín de Bachín - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1CDEYYERuO7Rqqn-feL07GCysTCucmMBV/view?usp=drivesdk","description":"Flauta - Chiquilín de Bachín - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1rRU_zIsEh7hgdthOtAHanvtGZNcm3x96/view?usp=drivesdk","description":"Guitarra - Chiquilín de Bachín - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1hs6Ux8PvcLX8BMtGLyVYBLPHXuH9V015/view?usp=drivesdk","description":"Perc Batería - Chiquilín de Bachín - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '13', 'Perc Batería 2', '[{"url":"https://drive.google.com/file/d/1knw4Y8WJU2Yi2iDCM-2dj9LmVioUp7G4/view?usp=drivesdk","description":"Perc Batería 2 - Chiquilín de Bachín - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '13', 'Perc Glockenspiel', '[{"url":"https://drive.google.com/file/d/1RSCkQnMW_6bwEwaKRhQUX5yxkhLz4czB/view?usp=drivesdk","description":"Perc Glockenspiel - Chiquilín de Bachín - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Wm-jEm7QUisTJ7qLDWAaeHMkPlc8PqhE/view?usp=drivesdk","description":"SCORE - Chiquilín de Bachín - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1ZWxfEehjacMMswgZJwyzwGeU23Rfbzn8/view?usp=drivesdk","description":"Trompeta - Chiquilín de Bachín - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1l0BtFx6pWvlV20ELT0mh9Iiiyn2e_dXz/view?usp=drivesdk","description":"Viola - Chiquilín de Bachín - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '01', 'Violín', '[{"url":"https://drive.google.com/file/d/1OvsyEGQGgibGzCnh2foP-DzBSqKYq_7c/view?usp=drivesdk","description":"Violín - Chiquilín de Bachín - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3626, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1njRwf38xyjURz5LfiMDNWmp_49G1PIdd/view?usp=drivesdk","description":"Voz - Chiquilín de Bachín - Piazzolla, A.pdf"}]', true);

END $$;

-- La Arenosa → obra 3627 (Archivo 1d62ohtPW8h9zGzKQw3w8A4nAbNXmwm4l)
DO $$
BEGIN
  UPDATE obras SET
    link_drive = 'https://drive.google.com/drive/folders/1d62ohtPW8h9zGzKQw3w8A4nAbNXmwm4l',
    instrumentacion = 'voz - 1.0.0.0 - 0.1.0.0 - Perc - Str + Bandoneón, Guitarra'
  WHERE id = 3627;

  DELETE FROM obras_particellas WHERE id_obra = 3627;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3627, '22b', 'Bandoneón', '[{"url":"https://drive.google.com/file/d/1pwaoetvjzTOwsgXO-v5sviqRu8Ik5i3Z/view?usp=drivesdk","description":"Bandoneón - La Arenosa - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3627, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1u5JXWocjv3GOCHnU1m08TVIdeouOm-lE/view?usp=drivesdk","description":"Contrabajo - La Arenosa - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3627, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1EAZ_EwLk1jsWPZxBET40wfdUZjmctMOS/view?usp=drivesdk","description":"Flauta - La Arenosa - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3627, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1s6ACmtUQDDExlHwD2IyeyJQpAEFujlUw/view?usp=drivesdk","description":"Guitarra - La Arenosa - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3627, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1_kLR9a5XQ7qn-cdJ90mNT5f39lZpuxGx/view?usp=drivesdk","description":"Perc Batería - La Arenosa - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3627, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1ghZtA44ahhPhnSIpW5sgF0VnAfugtYMZ/view?usp=drivesdk","description":"SCORE - La Arenosa - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3627, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1-CVvyEJnZ9zOy9wLcQh_k3ZWyYK5IGTd/view?usp=drivesdk","description":"Trompeta - La Arenosa - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3627, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/14Xwti8K2esAdi_wubg1dXAWtjHmdfrXd/view?usp=drivesdk","description":"Viola - La Arenosa - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3627, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1HcIKoR6_dSG-_GVPyGrFFnabpimR-8GX/view?usp=drivesdk","description":"Violín 1 - La Arenosa - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3627, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1P98TZA3RzB1ED43m8mhqs2fHv2qLccH6/view?usp=drivesdk","description":"Voz - La Arenosa - Piazzolla, A.pdf"}]', true);

END $$;

-- Sus ojos se cerraron → obra 3628 (Archivo 1foFCLsF2kHKAH2okWQ0mFt4qjE7b7dZE)
DO $$
BEGIN
  UPDATE obras SET
    link_drive = 'https://drive.google.com/drive/folders/1foFCLsF2kHKAH2okWQ0mFt4qjE7b7dZE',
    instrumentacion = '1.0.0.0 - 0.1.0.0 - Perc - Str + Bandoneón, Guitarra'
  WHERE id = 3628;

  DELETE FROM obras_particellas WHERE id_obra = 3628;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3628, '22b', 'Bandoneón', '[{"url":"https://drive.google.com/file/d/1Ine2c7An59txnoy4kabPgZHHwHMM532X/view?usp=drivesdk","description":"Bandoneón - Sus ojos se cerraron - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3628, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1MjXiYtEPXu0bG5N2dVwZb8xJuvPTbPZy/view?usp=drivesdk","description":"Contrabajo - Sus ojos se cerraron - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3628, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1jNphQbovci2R348ZSmLQEjBevS78fXLe/view?usp=drivesdk","description":"Flauta - Sus ojos se cerraron - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3628, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/19zrABYlzHQARnGxf7IwOwan7wuZzih0x/view?usp=drivesdk","description":"Guitarra - Sus ojos se cerraron - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3628, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1kGs6s4hJq1HCJBROZhOUvCxw41mz4NtW/view?usp=drivesdk","description":"Perc Batería - Sus ojos se cerraron - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3628, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1mwtxCBtBk_xL6rjmEg6LWoxXnqRgXChB/view?usp=drivesdk","description":"SCORE - Sus ojos se cerraron - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3628, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1RN73y11VBs7F8cebG3s-68zyfMdUmHFu/view?usp=drivesdk","description":"Trompeta - Sus ojos se cerraron - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3628, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1JzETG1pyCXUvdueClduA5LkWOCBn35Or/view?usp=drivesdk","description":"Viola - Sus ojos se cerraron - Piazzolla, A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3628, '01', 'Violín', '[{"url":"https://drive.google.com/file/d/1LOFOLPFqIBg9WA9etHBU_a_i4KI1FDFM/view?usp=drivesdk","description":"Violín - Sus ojos se cerraron - Piazzolla, A.pdf"}]', false);

END $$;

