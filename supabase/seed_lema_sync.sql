-- LEMA sync: updates + inserts (link_drive directo, sin copias)
-- Generado: 2026-06-15

DO $$
BEGIN
  -- UPDATE Piel Canela [cuerdas] [en D] (id 1357)
  UPDATE obras SET
    link_drive = 'https://drive.google.com/drive/folders/17J2eSnHKkGv3sqWKgxXnHiKDBF_BwMJY',
    observaciones = 'LEMA — Capó-Lema - Piel Canela [cuerdas] [en D]',
    instrumentacion = 'Str + Guitarra, Voz'
  WHERE id = 1357;

  DELETE FROM obras_particellas WHERE id_obra = 1357;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1357, '04', 'Bajo', '[{"url":"https://drive.google.com/file/d/1vGODT6LyP30oaEK4MGqdTHVxSnBZGeR_/view?usp=drivesdk","description":"Bajo - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1357, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/12C3heexoWqIhqqusdVnxn0gTWqUROUCh/view?usp=drivesdk","description":"Contrabajo - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1357, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1oKEFBgJUExOoZxFVLY4fZqYVjCMLmVLb/view?usp=drivesdk","description":"Guitarra - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1357, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1rlY6pWba33YVPRfzrDQVqXLzaq9WBLxm/view?usp=drivesdk","description":"SCORE - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1357, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1cZFoQ6HqjwvmEtlQlkxVjve0QPFBQkDM/view?usp=drivesdk","description":"Viola - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1357, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1EYzezbfkVE96dwCasnv42FgDqaLZ_iug/view?usp=drivesdk","description":"Violín 1 - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1357, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1c4czaWLiTi-C5Bt7bzwuZUm-l6T-hXeC/view?usp=drivesdk","description":"Violín 2 - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1357, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1XPf3NXvCYv6IEeHODVoxtIRcsiHmHkP8/view?usp=drivesdk","description":"Violoncello - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1357, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1X3ENNrGz0WZ81XJA80AT37uGSdo8t0Zi/view?usp=drivesdk","description":"Voz - Piel Canela - Capó-Lema.pdf"}]', false);

  -- UPDATE Piel Canela [cuerdas] [en E] (id 1356)
  UPDATE obras SET
    link_drive = 'https://drive.google.com/drive/folders/1lr8DDKOMrxxIJRcO3B0WAXicumpDAzwo',
    observaciones = 'LEMA — Capó-Lema - Piel Canela [cuerdas] [en E]',
    instrumentacion = 'Str + Guitarra, Voz'
  WHERE id = 1356;

  DELETE FROM obras_particellas WHERE id_obra = 1356;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1356, '04', 'Bajo', '[{"url":"https://drive.google.com/file/d/1NhzjgStFrsHn5t031Ltc9kkSm2cuxqp3/view?usp=drivesdk","description":"Bajo - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1356, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1z1TNNQ9oXfzTwjteM65mI0esMnU2YpZ3/view?usp=drivesdk","description":"Contrabajo - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1356, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1D0xkBa94fWrBRR3yIVEU0u7S4mA6la8o/view?usp=drivesdk","description":"Guitarra - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1356, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1lpddssurLdNRCtP5j3at8S-MXZ8wxJcw/view?usp=drivesdk","description":"SCORE - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1356, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1kAFuQtNIkRWav0x1e3t9r1VPaJMmNO8g/view?usp=drivesdk","description":"Viola - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1356, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1YITnuvV3rRy-oSpMz_UllwuiBocEdgCj/view?usp=drivesdk","description":"Violín 1 - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1356, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1yLOhPjNmYekR1Qh8ijLyw05FHUGsvoG0/view?usp=drivesdk","description":"Violín 2 - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1356, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/10ddH_kvTGHALt0NN1WDbylxEltRqcpYK/view?usp=drivesdk","description":"Violoncello - Piel Canela - Capó-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1356, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/147_h82lt1t3ULpDPdJuiDFVxy2k5-3hz/view?usp=drivesdk","description":"Voz - Piel Canela - Capó-Lema.pdf"}]', false);

  -- UPDATE Como la Cigarra [cuerdas] (id 1627)
  UPDATE obras SET
    link_drive = 'https://drive.google.com/drive/folders/1jh_KBXotR4zAT4HZgk_CMYGvB8RaCrfo',
    observaciones = 'LEMA — Walsh-Lema - Como La Cigarra',
    instrumentacion = 'Str'
  WHERE id = 1627;

  DELETE FROM obras_particellas WHERE id_obra = 1627;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1627, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1PUZ5Z82ODR5h-Hi7nYPwAffve-XcRFvb/view?usp=drivesdk","description":"Contrabajo - Como La Cigarra - Walsh-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1627, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1UtLFP9woZo06k0xeybTNunmvPwD-F7ik/view?usp=drivesdk","description":"SCORE - Como La Cigarra - Walsh-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1627, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/14peIlmqMkwTHSGNkDsXxCY3Yqt9j-0b-/view?usp=drivesdk","description":"Viola - Como La Cigarra - Walsh-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1627, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1cT-pS6RUwmt8a-qZXWNpmkZFIvylR3h1/view?usp=drivesdk","description":"Violín 1 - Como La Cigarra - Walsh-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1627, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/17sv7XEgQFZY53la-0uKkSs77OTpO5BgR/view?usp=drivesdk","description":"Violín 2 - Como La Cigarra - Walsh-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1627, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1f0T9E5Sb2-qEdnHFF5rzWinwGOYPGbED/view?usp=drivesdk","description":"Violoncello - Como La Cigarra - Walsh-Lema.pdf"}]', false);

  -- UPDATE Si Llega A Ser Tucumana (id 1432)
  UPDATE obras SET
    link_drive = 'https://drive.google.com/drive/folders/1YHbkF0eajhuEZI2QaIpWtuMwDQyTlfzV',
    observaciones = 'LEMA — Leguizamón-Lema - Si Llega A Ser Tucumana',
    instrumentacion = 'Perc.x2 - Key - Str'
  WHERE id = 1432;

  DELETE FROM obras_particellas WHERE id_obra = 1432;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1432, '04', 'Bajo', '[{"url":"https://drive.google.com/file/d/1eRP36d5V4jO3o8beZxdzsO25LisKQCAM/view?usp=drivesdk","description":"Bajo - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1432, '13', 'Marimba 1', '[{"url":"https://drive.google.com/file/d/1E8bVKbNZayJEtomhAso_Ig2Y-q2fsPNl/view?usp=drivesdk","description":"Marimba 1 - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1432, '13', 'Marimba 2', '[{"url":"https://drive.google.com/file/d/1UmYD0IUT6q7ZParI7a29K-V6x4cAbBwx/view?usp=drivesdk","description":"Marimba 2 - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1432, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/169nTlXLojZFoPI9G8EE-MSEFRRH3jGMc/view?usp=drivesdk","description":"SCORE - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1432, '15', 'Vibráfono', '[{"url":"https://drive.google.com/file/d/1qlvQl0ou5FYHsFMbSC20GXlLcBK9iPj5/view?usp=drivesdk","description":"Vibráfono - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf"}]', false);

  -- UPDATE Tiempo Compartido [TR 2025] (id 1368)
  UPDATE obras SET
    link_drive = 'https://drive.google.com/drive/folders/12lMctmgKEGdXSgbdjaJgNZMzisnc7SEe',
    observaciones = 'LEMA — Cárdenas-Lema - Tiempo Compartido',
    instrumentacion = 'Str + Voz'
  WHERE id = 1368;

  DELETE FROM obras_particellas WHERE id_obra = 1368;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1368, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/16L6lHnvPFpGmzxb6OnPsk3xB_PbFwx0Z/view?usp=drivesdk","description":"Contrabajo - Tiempo Compartido quinteto - Cárdenas-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1368, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1xd1gBOFq4WBZ8fX_PQUjm56r36bUuArm/view?usp=drivesdk","description":"SCORE - Tiempo Compartido quinteto - Cárdenas-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1368, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1qLR3tsfkuskJuYVmW1VB7igLqfv89kXU/view?usp=drivesdk","description":"Viola - Tiempo Compartido quinteto - Cárdenas-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1368, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ehnKaZOuqVVUgTHztizs3996Um_KHKse/view?usp=drivesdk","description":"Violín 1 - Tiempo Compartido quinteto - Cárdenas-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1368, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1rQaftnlfV8lfjPtr48Z42GwPYc6Eo7Ek/view?usp=drivesdk","description":"Violín 2 - Tiempo Compartido quinteto - Cárdenas-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1368, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1DkM7XciBAbXYFaXpIkyb020cVwqs9i4A/view?usp=drivesdk","description":"Violoncello - Tiempo Compartido quinteto - Cárdenas-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1368, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1obdXiLWnVjqImU8qLMm1lXU3B8KmmZiT/view?usp=drivesdk","description":"Voz - Tiempo Compartido quinteto - Cárdenas-Lema.pdf"}]', false);

  -- UPDATE Medley Soda Stereo (id 1578)
  UPDATE obras SET
    link_drive = 'https://drive.google.com/drive/folders/1LZP35H0csA3hORLCvd9r8xxJR-Z1KZ78',
    observaciones = 'LEMA — Lema, G. - Medley Soda Stereo',
    instrumentacion = '1.0.0.0 - 2.2.1.0 - Perc - Key - Str + Voz'
  WHERE id = 1578;

  DELETE FROM obras_particellas WHERE id_obra = 1578;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1GJeOkYEfc9aeLdyvFA1j5Ut-4bBlP2EO/view?usp=drivesdk","description":"Contrabajo - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '09', 'Corno 1 en F', '[{"url":"https://drive.google.com/file/d/1DOHEfy-JGGDP0mHB9lYt9Sc3k01EcvAZ/view?usp=drivesdk","description":"Corno 1 en F - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '09', 'Corno 2 en F', '[{"url":"https://drive.google.com/file/d/1R41PiHbSdlWCP2s-CR3vvbxOeeyihDnn/view?usp=drivesdk","description":"Corno 2 en F - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1oURTOhFdDQJhskVX70UeHYHFKaCTUy1j/view?usp=drivesdk","description":"Flauta - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/11ziwTcA0uNfuO1PU1rsyhdxXMF2QlXqo/view?usp=drivesdk","description":"Perc Batería - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1tTb2_sd25jqLzYUGB5UAyAnePRcHmgg7/view?usp=drivesdk","description":"Piano - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1UF22nBCGRCfTpkDf_XRnbbCyrDP-w2Ry/view?usp=drivesdk","description":"SCORE - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1B70L3PVIdGkdA6tNUcDKrFfSmwugpelg/view?usp=drivesdk","description":"Trombón Bajo - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '10', 'Trompeta en Bb 1', '[{"url":"https://drive.google.com/file/d/1nwxGbFrRzBjz9hRwBE--7vaNoeVAoYNl/view?usp=drivesdk","description":"Trompeta en Bb 1 - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '10', 'Trompeta en Bb 2', '[{"url":"https://drive.google.com/file/d/1zSyNB0ECx51UMAsVCVRW1Bzdo_B-SIZ_/view?usp=drivesdk","description":"Trompeta en Bb 2 - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1lDIG5H3GIW-LIMxT4jk5_JQSz8v3rGEB/view?usp=drivesdk","description":"Viola - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/11DedhgvZDatIeHEdKJR-OmGAsE0qkLsP/view?usp=drivesdk","description":"Violín 1 - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1GyxU3q-nyk4G41igMPScZj4y3G5Xyuyh/view?usp=drivesdk","description":"Violín 2 - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1LQQVX4Nf3WTs0HpFc2NXWZALKJMUMkDg/view?usp=drivesdk","description":"Violoncello - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (1578, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1Z9N8XZoosICME-moL7h2FDm5SCseC_jx/view?usp=drivesdk","description":"Voz - Medley Soda Stereo - Cerati-Lema.pdf"}]', false);

END $$;

-- LEMA inserts: 11 obras nuevas
-- Generado: 2026-06-15

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Perales_Jos_Luis bigint;
  _id_comp_Yupanqui_Atahualpa bigint;
  _id_comp_Ayala_Ram_n bigint;
  _id_comp_Virus_ bigint;
  _id_comp_Manzanero_Armando bigint;
  _id_comp_Roussillo_ bigint;
  _id_comp_C_rdenas_Agust_n bigint;
  _id_comp_Varios_ bigint;
  _id_arr_Lema_Germ_n bigint;
BEGIN
  SELECT id INTO _id_comp_Perales_Jos_Luis FROM compositores WHERE apellido = 'Perales' AND (nombre = 'José Luis' OR (nombre IS NULL AND 'José Luis' IS NULL)) LIMIT 1;
  IF _id_comp_Perales_Jos_Luis IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Perales', 'José Luis') RETURNING id INTO _id_comp_Perales_Jos_Luis;
  END IF;

  SELECT id INTO _id_comp_Yupanqui_Atahualpa FROM compositores WHERE apellido = 'Yupanqui' AND (nombre = 'Atahualpa' OR (nombre IS NULL AND 'Atahualpa' IS NULL)) LIMIT 1;
  IF _id_comp_Yupanqui_Atahualpa IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Yupanqui', 'Atahualpa') RETURNING id INTO _id_comp_Yupanqui_Atahualpa;
  END IF;

  SELECT id INTO _id_comp_Ayala_Ram_n FROM compositores WHERE apellido = 'Ayala' AND (nombre = 'Ramón' OR (nombre IS NULL AND 'Ramón' IS NULL)) LIMIT 1;
  IF _id_comp_Ayala_Ram_n IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Ayala', 'Ramón') RETURNING id INTO _id_comp_Ayala_Ram_n;
  END IF;

  SELECT id INTO _id_comp_Virus_ FROM compositores WHERE apellido = 'Virus' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Virus_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Virus', NULL) RETURNING id INTO _id_comp_Virus_;
  END IF;

  SELECT id INTO _id_comp_Manzanero_Armando FROM compositores WHERE apellido = 'Manzanero' AND (nombre = 'Armando' OR (nombre IS NULL AND 'Armando' IS NULL)) LIMIT 1;
  IF _id_comp_Manzanero_Armando IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Manzanero', 'Armando') RETURNING id INTO _id_comp_Manzanero_Armando;
  END IF;

  SELECT id INTO _id_comp_Roussillo_ FROM compositores WHERE apellido = 'Roussillo' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Roussillo_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Roussillo', NULL) RETURNING id INTO _id_comp_Roussillo_;
  END IF;

  SELECT id INTO _id_comp_C_rdenas_Agust_n FROM compositores WHERE apellido = 'Cárdenas' AND (nombre = 'Agustín' OR (nombre IS NULL AND 'Agustín' IS NULL)) LIMIT 1;
  IF _id_comp_C_rdenas_Agust_n IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Cárdenas', 'Agustín') RETURNING id INTO _id_comp_C_rdenas_Agust_n;
  END IF;

  SELECT id INTO _id_comp_Varios_ FROM compositores WHERE apellido = 'Varios' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Varios_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Varios', NULL) RETURNING id INTO _id_comp_Varios_;
  END IF;

  SELECT id INTO _id_arr_Lema_Germ_n FROM compositores WHERE apellido = 'Lema' AND (nombre = 'Germán' OR (nombre IS NULL AND 'Germán' IS NULL)) LIMIT 1;
  IF _id_arr_Lema_Germ_n IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Lema', 'Germán') RETURNING id INTO _id_arr_Lema_Germ_n;
  END IF;

  -- Marinero de Luces
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Marinero de Luces' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Marinero de Luces',
      _id_arr_Lema_Germ_n,
      NULL,
      227,
      'Oficial',
      'LEMA — Perales-Lema - Marinero de Luces',
      'Str + Guitarra, Voz',
      'https://drive.google.com/drive/folders/1cilWDoOp9a4z7aPA5SXQts2USuazfal0'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Perales_Jos_Luis, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Bajo', '[{"url":"https://drive.google.com/file/d/1HhRwZVQf5EN45uZmtoFwl-SUgYGGjJ_W/view?usp=drivesdk","description":"Bajo - Marinero de Luces - Perales-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1PnT_SfS7p1EhB7kI1wnEvPsMFUYl0Qsh/view?usp=drivesdk","description":"Contrabajo - Marinero de Luces - Perales-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1spQ9rWlQogYrQfokvG6UzxkwwIcQf43S/view?usp=drivesdk","description":"Guitarra - Marinero de Luces - Perales-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1D2aX76W5huAhi1JhXBHVNwGFLqyEY_ve/view?usp=drivesdk","description":"SCORE - Marinero de Luces - Perales-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1AKdFZ_zfu5jsuF-bQfCrlGumRBJM2mtG/view?usp=drivesdk","description":"Viola - Marinero de Luces - Perales-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/19qbwcB4KId74ArCafTtz9N1zaAu-HdHR/view?usp=drivesdk","description":"Violín 1 - Marinero de Luces - Perales-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1WTY1o4NRWeO9FiDZgSe6M7Kp12T6W4jW/view?usp=drivesdk","description":"Violín 2 - Marinero de Luces - Perales-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1u_Akbu7XENm6oNYDfNn9KraurA0OuH2H/view?usp=drivesdk","description":"Violoncello - Marinero de Luces - Perales-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1Tx-KelKvYXLlWk4huUKZCNXXq2CGJbWc/view?usp=drivesdk","description":"Voz - Marinero de Luces - Perales-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Marinero de Luces';
  END IF;

  -- Sauce
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Sauce' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Sauce',
      _id_arr_Lema_Germ_n,
      NULL,
      210,
      'Oficial',
      'LEMA — Tux-Lema - Sauce',
      'Str',
      'https://drive.google.com/drive/folders/1eQ75gtxxfNzXX-VHZOWWTMQBDtEW97IA'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Yupanqui_Atahualpa, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1HNYA8wUgXAQOSJ-Lv7T_4mZAZZi_55ab/view?usp=drivesdk","description":"Contrabajo - Sauce - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/17FjricJbU1IbWd2BpZ88IUqxJnGXQtl6/view?usp=drivesdk","description":"SCORE - Sauce - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Uap8ldrXHkuQbcZh5na3w8pMYGSEBy5Z/view?usp=drivesdk","description":"Viola - Sauce - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Vnd5mlCziVD9Vo--KFYF-xBd7LWZrfIQ/view?usp=drivesdk","description":"Violín 1 - Sauce - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1IZY9NgnTt_oGhQ8PB5q913Wl8dGsZUEg/view?usp=drivesdk","description":"Violín 2 - Sauce - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1rk3lzEHB8uRkG5A6YUX_uqSZkZajU-Zh/view?usp=drivesdk","description":"Violoncello - Sauce - Tux-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Sauce';
  END IF;

  -- Cautiverio
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Cautiverio' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Cautiverio',
      _id_arr_Lema_Germ_n,
      NULL,
      NULL,
      'Oficial',
      'LEMA — Tux-Lema - Cautiverio',
      'Str',
      'https://drive.google.com/drive/folders/1jt42P-I3nAY8P4BEBWJHCk5QbL3R5Slh'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Yupanqui_Atahualpa, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1EbtSvaLZYaYoXQE9c3eRvErY-rEl_vY0/view?usp=drivesdk","description":"Contrabajo - Cautiverio - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1HT0FXH39v0SEP8Z5LSTBYvO61QuPorwg/view?usp=drivesdk","description":"SCORE - Cautiverio - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1gzHeWI_z0ERDZXXiCTVrw6HuVaAyxEUA/view?usp=drivesdk","description":"Viola - Cautiverio - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/15wc4YvMPU2M9XSG0-JMBf9_bKqX-oICa/view?usp=drivesdk","description":"Violín 1 - Cautiverio - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1e_CSKv-cnrbmDK_U6G2gh2_GpuDPEqLX/view?usp=drivesdk","description":"Violín 2 - Cautiverio - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1RQTf0tGHdSn3RR2lJk5mdAHzBB23ocN_/view?usp=drivesdk","description":"Violoncello - Cautiverio - Tux-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Cautiverio';
  END IF;

  -- Sujeto Atravesado
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Sujeto Atravesado' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Sujeto Atravesado',
      _id_arr_Lema_Germ_n,
      NULL,
      NULL,
      'Oficial',
      'LEMA — Tux-Lema - Sujeto Atravesado',
      'Str',
      'https://drive.google.com/drive/folders/1uEb8y-p7OSd_ZJvpskWVSUpcnwpq9cOh'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Yupanqui_Atahualpa, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1IFX6dczNJJP8vldh_2xOnFqEmrdDMDGU/view?usp=drivesdk","description":"Contrabajo - Sujeto Atravesado - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1aKMUtsQi9JEEjKlqqVyjfI3VeawUohPu/view?usp=drivesdk","description":"SCORE - Sujeto Atravesado - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1quKl-dXvwnXerBiURl_CrxU-PjfsBmcn/view?usp=drivesdk","description":"Viola - Sujeto Atravesado - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1B-Hj1MV0Q1_mKN_nG2GtMdWWALlO96R_/view?usp=drivesdk","description":"Violín 1 - Sujeto Atravesado - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1jr9Q5mhNfc2ZusqYfZEgYHGDEhDCB8gv/view?usp=drivesdk","description":"Violín 2 - Sujeto Atravesado - Tux-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/14P9-xEHjuiLZXIqxCwQMTl9_tALKdVCM/view?usp=drivesdk","description":"Violoncello - Sujeto Atravesado - Tux-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Sujeto Atravesado';
  END IF;

  -- El Cosechero [percus]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'El Cosechero [percus]' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'El Cosechero [percus]',
      _id_arr_Lema_Germ_n,
      NULL,
      232,
      'Oficial',
      'LEMA — Ayala-Lema - El Cosechero [percus]',
      'Perc.x2 - Key - Str',
      'https://drive.google.com/drive/folders/1gaasJo8YQDXeWExOWRouTTtBJUbwMvnc'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Ayala_Ram_n, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Bajo', '[{"url":"https://drive.google.com/file/d/1BY95TMQde5VMHdumsS8h15o8tyvuffPM/view?usp=drivesdk","description":"Bajo - El Cosechero - Ayala-Lema - Electric Bass.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Marimba 1', '[{"url":"https://drive.google.com/file/d/1fNQw2UW5hyWr3l2GRjQdJyzkJVVLjFCG/view?usp=drivesdk","description":"Marimba 1 - El Cosechero - Ayala-Lema - Marimba.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Marimba 2', '[{"url":"https://drive.google.com/file/d/1Ly-XfMR5pI2Ra4DFg9opylxpLiT14cmD/view?usp=drivesdk","description":"Marimba 2 - El Cosechero - Ayala-Lema - Marimba.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1wm3eRemcsbPdZ0VhOxjGDk8e-IdaocSt/view?usp=drivesdk","description":"SCORE - El Cosechero - Ayala-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Vibráfono', '[{"url":"https://drive.google.com/file/d/1kHdzKsGOcZ6UWIy3WNALT78rfZHxC5JN/view?usp=drivesdk","description":"Vibráfono - El Cosechero - Ayala-Lema - Vibraphone.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): El Cosechero [percus]';
  END IF;

  -- Rebotar
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Rebotar' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Rebotar',
      _id_arr_Lema_Germ_n,
      NULL,
      34,
      'Oficial',
      'LEMA — Vrule-Lema - Rebotar',
      'Str',
      'https://drive.google.com/drive/folders/1n3itTVIaBT9zP2bkPDrnfT4xFPhxU7ke'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Virus_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1IuXgao4brmyXQnwTAzgA-IuPyV_yNnLS/view?usp=drivesdk","description":"Contrabajo - Rebotar - Vrule-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1uQkaP8EMfcZ11O9WknNPZNWrdgEBYK8-/view?usp=drivesdk","description":"SCORE - Rebotar - Vrule-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1hWEVNGxjjank-4HiLJE-T4j7UsoJExQK/view?usp=drivesdk","description":"Viola - Rebotar - Vrule-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1qhkGeK6PMp5gS1F799-gvQngO9Qs-Kr5/view?usp=drivesdk","description":"Violín 1 - Rebotar - Vrule-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1T6rCtTdLD_jH9YexztHxtRNBdGuGURpZ/view?usp=drivesdk","description":"Violín 2 - Rebotar - Vrule-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1OMllTPzyhmhb9n1tBLkePwwxge3Vxr5W/view?usp=drivesdk","description":"Violoncello - Rebotar - Vrule-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Rebotar';
  END IF;

  -- No Sé Tú
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'No Sé Tú' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'No Sé Tú',
      _id_arr_Lema_Germ_n,
      NULL,
      256,
      'Oficial',
      'LEMA — Manzanero-Lema - No Sé Tú',
      '1.1.1.0 - 0.1.1.0 - Perc - Str + Voz',
      'https://drive.google.com/drive/folders/1P0xjj29VCTMRDCNVXn-7sGhLKrPNKPSL'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Manzanero_Armando, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete en Bb', '[{"url":"https://drive.google.com/file/d/1aJ88wuPF49vCFBLlsqZleZr0MFL8QgzX/view?usp=drivesdk","description":"Clarinete en Bb - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1SNFeMS9IohKUObbEaEQFqtoCdFXEkwfC/view?usp=drivesdk","description":"Contrabajo - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1I6jdI0dX05qiQZYKaUvJGz8RihQcrnB-/view?usp=drivesdk","description":"Flauta - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1uGBaHwFVk-KKBfE6Kl4X71hm0jJD7ln5/view?usp=drivesdk","description":"Oboe - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/14rxwSUsri0fU1DabV_O8RDaNAgQ2iv88/view?usp=drivesdk","description":"Perc Batería - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Fbq_IXqTXYvkNCytE6Wxz8Y3344-83xC/view?usp=drivesdk","description":"SCORE - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1yAL74beHXibP9JlzjQ0kLv0ZYVI_VBCr/view?usp=drivesdk","description":"Trombón - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta en Bb', '[{"url":"https://drive.google.com/file/d/1mOVxWduHw0FVGMuc2dcd2TuaxW5N97lf/view?usp=drivesdk","description":"Trompeta en Bb - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1vEmQg6cc-BgiK4WsbQlnq2FQ6_V4PXmy/view?usp=drivesdk","description":"Viola - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1mPjAKQ8dRsvpemOlJTlz6sb9vNoK67Ss/view?usp=drivesdk","description":"Violín 1 - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1mbE7c0AKoQwoNYLm9D_efR1f4pqkbsx0/view?usp=drivesdk","description":"Violín 2 - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1XrsLWWEXtrwEzPio8nNCT2mJq9unx_nv/view?usp=drivesdk","description":"Violoncello - No Sé Tú - Manzanero-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/13o4zQJjIHknwVHWy-FZXz4OP26gF9x6k/view?usp=drivesdk","description":"Voz - No Sé Tú - Manzanero-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): No Sé Tú';
  END IF;

  -- Lo Que Me Hiciste Hacer
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Lo Que Me Hiciste Hacer' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Lo Que Me Hiciste Hacer',
      _id_arr_Lema_Germ_n,
      NULL,
      227,
      'Oficial',
      'LEMA — Vrule-Lema - Lo Que Me Hiciste Hacer',
      'Str',
      'https://drive.google.com/drive/folders/1pEpTvsZ2THCFXAYgF6OPkjxlgS3ipjvs'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Virus_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1HR37eRM5iTCMNly9IdwAd4KBHRc4PQs9/view?usp=drivesdk","description":"Contrabajo - Lo Que Me Hiciste Hacer - Vrule-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1qPrhs6CDADPI8ViGK0sGyursELrPQfoU/view?usp=drivesdk","description":"SCORE - Lo Que Me Hiciste Hacer - Vrule-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1TM1pW2L9VIOC_UWrHdSc1eZamvUTnLe8/view?usp=drivesdk","description":"Viola - Lo Que Me Hiciste Hacer - Vrule-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1eZbJnLwNiDeIgi_9tGh6fyn4ybzLZNAU/view?usp=drivesdk","description":"Violín 1 - Lo Que Me Hiciste Hacer - Vrule-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1c2VjB1wmfMKnDRodDUET1qBNbxdT4VG0/view?usp=drivesdk","description":"Violín 2 - Lo Que Me Hiciste Hacer - Vrule-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/190wHKaEx9qpiDU7Ka6bvFl6G0o7hHMLa/view?usp=drivesdk","description":"Violoncello - Lo Que Me Hiciste Hacer - Vrule-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Lo Que Me Hiciste Hacer';
  END IF;

  -- Break #1
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Break #1' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Break #1',
      _id_arr_Lema_Germ_n,
      NULL,
      158,
      'Oficial',
      'LEMA — Roussillo-Lema - Break #1',
      'Str',
      'https://drive.google.com/drive/folders/1HmXpmSMzSphwNjZqGwc_OEf7ZlccF057'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Roussillo_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1dQRnAdVuVXyYzIR2Hk2-dzAsRSYqAfsq/view?usp=drivesdk","description":"Contrabajo - Break#1 - Roussillo-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/14kHwxFsE3EWgAV2CkBjZdzoYgYmJAP9s/view?usp=drivesdk","description":"SCORE - Break#1 - Roussillo-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1J14T5EQrY2hmKF8xhln9PfgrqxOLoUsv/view?usp=drivesdk","description":"Viola - Break#1 - Roussillo-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/15y_RyPeCKVp_lzwUnVfSq6jRXUHcbO2X/view?usp=drivesdk","description":"Violín 1 - Break#1 - Roussillo-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1ilTeMXYuncG9HrlZ5SBG6HDSV4ZPC3uH/view?usp=drivesdk","description":"Violín 2 - Break#1 - Roussillo-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1sLeKJl_lYaAfo-SE2NHXaWE3axtg6JIj/view?usp=drivesdk","description":"Violoncello - Break#1 - Roussillo-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Break #1';
  END IF;

  -- Mi Nave
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Mi Nave' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Mi Nave',
      _id_arr_Lema_Germ_n,
      NULL,
      186,
      'Oficial',
      'LEMA — Cárdenas-Lema - Mi Nave',
      'Str',
      'https://drive.google.com/drive/folders/16wW9BtXBDWBQ6LFRdzJVvijfM1U5sEGH'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_C_rdenas_Agust_n, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/10vjl_JFznzc8D1-jUX0izgLUOXA35c5M/view?usp=drivesdk","description":"Contrabajo - Mi Nave - Cárdenas-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1-o-jLQ20xXL_BJl559FsuQwM89MIogSI/view?usp=drivesdk","description":"SCORE - Mi Nave - Cárdenas-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1KiBYz5VaC9x-xRERWFJM9FnFiw71p0Az/view?usp=drivesdk","description":"Viola - Mi Nave - Cárdenas-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1LqIl8JezXQkfOjNFO9LRuNF50nsUEuwR/view?usp=drivesdk","description":"Violín 1 - Mi Nave - Cárdenas-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/176AKE6HFfAOIazq2MDR2rrPk_AvM_GCN/view?usp=drivesdk","description":"Violín 2 - Mi Nave - Cárdenas-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Zug7t20r3Yl96DO9U-_pil9P71kFE1WR/view?usp=drivesdk","description":"Violoncello - Mi Nave - Cárdenas-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Mi Nave';
  END IF;

  -- Medley Cuarteto
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Medley Cuarteto' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Medley Cuarteto',
      _id_arr_Lema_Germ_n,
      NULL,
      58,
      'Oficial',
      'LEMA — Varios-Lema - Medley Cuarteto',
      '1.0.0.0 - 2.2.1.0 - Perc - Str',
      'https://drive.google.com/drive/folders/1Ub97Rgzz2zCwxbNLxAwLvjRBTOIER997'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Varios_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1fGvXBCNabfa8JLL3ce-c4jyS9_M5q3xj/view?usp=drivesdk","description":"Contrabajo - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno en F 1', '[{"url":"https://drive.google.com/file/d/1Lg3-bTT3Px6isW2Y3pqGfE-fg8FX8dzh/view?usp=drivesdk","description":"Corno en F 1 - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno en F 2', '[{"url":"https://drive.google.com/file/d/14LWAELSc8G4vfTPS0yGUuNXoE6Ljmh6T/view?usp=drivesdk","description":"Corno en F 2 - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1GKrOAhLu_BPzX8_srwGrRo8GvKlVhRv6/view?usp=drivesdk","description":"Flauta - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1OvhGnQPh1L_tn50szOsXMd66cycdSQtb/view?usp=drivesdk","description":"Perc Batería - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Esdl933KsQg5x8EWCJpFWlWB7jbahXNa/view?usp=drivesdk","description":"Score - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1r9d5f4-YnRWbMXUsqDZvT9ZJcQhJqYEh/view?usp=drivesdk","description":"Trombón Bajo - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta en Bb 1', '[{"url":"https://drive.google.com/file/d/1CuL8LtaB0dfaJKitkpwxU2jvz358bZvN/view?usp=drivesdk","description":"Trompeta en Bb 1 - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta en Bb 2', '[{"url":"https://drive.google.com/file/d/1mBYmSf-Nt0Ovc7v--BLOx979KMMa2Hr8/view?usp=drivesdk","description":"Trompeta en Bb 2 - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1nE6N12BeKlyUG6L6GCynzJiGjdE0vH-1/view?usp=drivesdk","description":"Viola - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1_TqFzJLTDX8mXXhbC4uxF-hZ2V5Y8KXZ/view?usp=drivesdk","description":"Violín 1 - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1GXuyNTzci1YimDw0spK4962gARCdX-EO/view?usp=drivesdk","description":"Violín 2 - Medley Cuarteto - Varios-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1kY74V6MT73A8Mx5GlQgj6qtueWrRDIcD/view?usp=drivesdk","description":"Violoncello - Medley Cuarteto - Varios-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Medley Cuarteto';
  END IF;

END $$;
