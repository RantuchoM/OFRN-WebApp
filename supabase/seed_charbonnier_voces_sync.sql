-- Charbonnier — Voces latinoamericanas → obra 3201
-- Generado: 2026-08-10

DO $$
BEGIN
  UPDATE obras SET
    link_drive = 'https://drive.google.com/open?id=1O1SbcEF6V0g9F4hxdwC-Lsns9IcFJjL3',
    observaciones = 'Para acomodar — Charbonnier, M. - Voces latinoamericanas',
    instrumentacion = 'S. - 2.2.2.2 - 2.0.0.0 - Str'
  WHERE id = 3201;

  DELETE FROM obras_particellas WHERE id_obra = 3201;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1M7O30DvKpnR6z6x3RXJdhyks3UoiruuU/view?usp=drivesdk","description":"Clarinete Bb 1 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1H_LPsDqQdNBvzS8vGZlLdov_ttjnnQUa/view?usp=drivesdk","description":"Clarinete Bb 2 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1dh2g0OcCxJ7L9D89qX0eb-Ker6pKkrRJ/view?usp=drivesdk","description":"Contrabajo - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1P_q_VmOeE9pcz1jn1-4WwJEHBHfiD06-/view?usp=drivesdk","description":"Corno F 1 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1GV0ZCJRzarCFzFSHRk_Bznm3woeNswxE/view?usp=drivesdk","description":"Corno F 2 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1NXkcqt9KWIaJpcK0qbzVfhnpRtU56n3R/view?usp=drivesdk","description":"Fagot 1 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1K2VUSREVi1LOL3Z-5MWi6aqmPvhsOs39/view?usp=drivesdk","description":"Fagot 2 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1gi-nNiTxbdEnJYoTSZUViy0b9Zf6EHQz/view?usp=drivesdk","description":"Flauta 1 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1Yv1ECz4YdTdXlCiR61fgo8ijj2Hr96sj/view?usp=drivesdk","description":"Flauta 2 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/15EA0oMHmKvX4SnRKFRRL84wTYXxQYbLo/view?usp=drivesdk","description":"Oboe 1 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/18m7CqU5iFPRPvhzu_kuTYDf_Z2X47tW8/view?usp=drivesdk","description":"Oboe 2 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/19wcIf-Q7ZHFwR2DY6RSlRRbVbqwgFgw3/view?usp=drivesdk","description":"SCORE - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '20', 'Soprano', '[{"url":"https://drive.google.com/file/d/1LC3ZrUOi0WiysTE9yAC6-g5_hVMRzdLT/view?usp=drivesdk","description":"Soprano - Voces latinoamericanas - Charbonnier, M.pdf"}]', true);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/11g2-Iyg75fnImnm-IXwZMY_9BrNvcfGj/view?usp=drivesdk","description":"Viola - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Q1gAMvQpgw1j9vAqT8KzpQP4aERCBG2x/view?usp=drivesdk","description":"Violín 1 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1CuS16V0CJxGCRnDGiMlZL7PRhjK2X4mz/view?usp=drivesdk","description":"Violín 2 - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3201, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1iGDgpLv7vpe1bLS_kd2yrvXgZpV4txZs/view?usp=drivesdk","description":"Violoncello - Voces latinoamericanas - Charbonnier, M.pdf"}]', false);

END $$;
