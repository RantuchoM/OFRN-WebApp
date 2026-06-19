-- Falla — Danza Española Nro 1 ('La Vida Breve') → obra 3532
-- Generado: 2026-06-19

DO $$
BEGIN
  UPDATE obras SET
    link_drive = 'https://drive.google.com/open?id=16TvE6QokADJSSk9gpZXpP1D8GcrngIQS',
    observaciones = 'Para acomodar — Falla, M. - Danza Española Nro 1 (''La Vida Breve'')',
    instrumentacion = '3.3.3.1 - 2.1.1.1 - Timp.+2 - Hp - Key - Str',
    anio_composicion = 1905
  WHERE id = 3532;

  DELETE FROM obras_particellas WHERE id_obra = 3532;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/10cci7oT1_o00v7VN4JQgGRQiqZgL_Y0K/view?usp=drivesdk","description":"Arpa - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '17', 'Celesta', '[{"url":"https://drive.google.com/file/d/1e5E0XLVUBuYExVlYiPI_-o_e-kM7BXPk/view?usp=drivesdk","description":"Celesta - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/1jZiJdImgEUEADvFayk750cA_ZZcgc_ty/view?usp=drivesdk","description":"Clarinete A 1 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/1A4kSR9xpNseQphndeNlQLX-L_j08w-He/view?usp=drivesdk","description":"Clarinete A 2 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '07', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1skvgmwjrw8R6P0eVdcrzWNCs3-QfUTK_/view?usp=drivesdk","description":"Clarinete Bajo - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1-v3eA7-uLLbKmoh_le_d42SWkhD1Y8cs/view?usp=drivesdk","description":"Contrabajo - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/13t9ElM8Z1wJ4l4QnS2hFjsJ_wfGYSwFb/view?usp=drivesdk","description":"Corno F 1-2 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1s-KMDLPW2VQDK6Kh1KIDOhINYdHdco5n/view?usp=drivesdk","description":"Corno F 3-4 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1Diglx46MDKq8C7lMMUpgX0d-WXcZsdv0/view?usp=drivesdk","description":"Fagot 1-2 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1x7uYR4x3jPs7ut6Teq8XAha9kE9ExXoh/view?usp=drivesdk","description":"Fl Piccolo - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1X2Sb2Mj2icWdVUkTsqoAvF3fI_3Kg0sT/view?usp=drivesdk","description":"Flauta 1 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/18B0L4H6ce2xBPQdbbGh__nL3DH4-XFRB/view?usp=drivesdk","description":"Flauta 2 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1LwGKYdl-62gRfOdjgH_VVe7CI-IkDBWO/view?usp=drivesdk","description":"Ob EH - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1c7LvZKslVaugY1InJra3Ghrh2oMxKju4/view?usp=drivesdk","description":"Oboe 1 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1RJ6Ins4h9XKzcGJQg_s6LY0qthW0Jbnj/view?usp=drivesdk","description":"Oboe 2 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '13', 'Perc Glockenspiel', '[{"url":"https://drive.google.com/file/d/1HrehUpK4I1bvUpi1ZxPMfbNpZh2_cuCy/view?usp=drivesdk","description":"Perc Glockenspiel - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1UVtV1p-xuqN39RlNU0IZ0CrQUWPMFGbH/view?usp=drivesdk","description":"Perc Percusión - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1UP8Ftgex0JZhtBGHbGOb6rHPsppxRDYy/view?usp=drivesdk","description":"Perc Timbal - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1u5CGbezxBbsPh9LobeEXTMbPwRXaYUvF/view?usp=drivesdk","description":"SCORE - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1_uMtzrs884NKySzybylKChWk6jHJu8Vm/view?usp=drivesdk","description":"Trombón 1-3 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1Zxl0In_X69bf6v1VyN6zlzQIhfRvTEHw/view?usp=drivesdk","description":"Trompeta 1-2 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1HLvCqVenyD3ikkZfJzWwWZX0Lyn_Y5LR/view?usp=drivesdk","description":"Tuba - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1fdsRnCShk9ZD0xZDzFodkLn-FYsZPN5Z/view?usp=drivesdk","description":"Viola - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1yENJKNCUEsMRI6KycsBvA3PQaI6i18ar/view?usp=drivesdk","description":"Violín 1 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1XIt4OojVYjKGLfeL6ItX6ICuETHX6Zxn/view?usp=drivesdk","description":"Violín 2 - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3532, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/10DCTIMwBU2txt2td833ifm7OnVfMZyAz/view?usp=drivesdk","description":"Violoncello - S-N. Danza Española Nro 1 (''La Vida Breve'') - Falla, M.pdf"}]', false);

END $$;
