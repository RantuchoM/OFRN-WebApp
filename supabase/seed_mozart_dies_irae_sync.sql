-- Mozart — Dies Irae. Requiem, K. 626 → obra 3563
-- Generado: 2026-08-12
-- Fragmento III. Sequenz / 1. Dies irae (hasta Tuba mirum). Requiem sin tilde.

DO $$
BEGIN
  UPDATE obras SET
    titulo = '<i>Dies Irae.</i> Requiem, K. 626',
    link_drive = 'https://drive.google.com/drive/folders/1tRERQ7Sb-QFYGmBcmu51T04ZSBOkpJLG',
    observaciones = 'Para acomodar — Mozart, W. - Dies Irae. Requiem, K. 626',
    instrumentacion = '0.0.2.2 - 0.2.3.0 - Timp - Key - Str + Coro',
    anio_composicion = 1791,
    duracion_segundos = 120
  WHERE id = 3563;

  DELETE FROM obras_particellas WHERE id_obra = 3563;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1aEXDpqg4Pj9FQvmUzCRLZ8gkTSJToc97/view?usp=drivesdk","description":"Clarinete 1y2 - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1aEXDpqg4Pj9FQvmUzCRLZ8gkTSJToc97/view?usp=drivesdk","description":"Clarinete 1y2 - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/11YQH4LUAn2uCK5nT2uFeI9NuhcNLi6rv/view?usp=drivesdk","description":"Contrabajo - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '23', 'Coro', '[{"url":"https://drive.google.com/file/d/1C5a_UT3h8qjxk7ikbZvjP3ECPAO47Pk4/view?usp=drivesdk","description":"Coro - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1ZbCRgHC0Eg1xnKKucFhizNUeSGzXJYAn/view?usp=drivesdk","description":"Fagot 1 - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1uJtFPx0pnps2yfrXLqljAjfkHyffMG4R/view?usp=drivesdk","description":"Fagot 2 - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '15', 'Órgano', '[{"url":"https://drive.google.com/file/d/1qRCsTx7unjseOHpsl8Xq09T56t8W97cK/view?usp=drivesdk","description":"Órgano - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1tpo7QILK3RIgMZIVzcjfZMb6RJzC4k_P/view?usp=drivesdk","description":"Perc Timbal - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1NAY-di8Qcd2o-MSnDyAk-8h0mJC4s8Yw/view?usp=drivesdk","description":"SCORE - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/18bDpwN_fHQVV9-F32PClGwssA1SfNR9O/view?usp=drivesdk","description":"Trombón 1 - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1dixibQv5QdGYFZsSsSuubUwmFiJheOS2/view?usp=drivesdk","description":"Trombón 2 - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1VvOkXbzlBn3M7D7vifCRynvRp-tTcV6Y/view?usp=drivesdk","description":"Trombón 3 - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1N0-H_yh3Xji6ss3_tGkyeldG4f3SPny8/view?usp=drivesdk","description":"Trompeta 1 - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1mE42UITP8UTtk2LE-AWTzXuc7OYgmLdL/view?usp=drivesdk","description":"Trompeta 2 - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1hHhBv-iLDuvz2WaRoOSTypw0SYeWtg_j/view?usp=drivesdk","description":"Viola - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1QGNLoe56iEO3V-HMlZhJUIxO_8zJHgng/view?usp=drivesdk","description":"Violín 1 - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1TmaWUHQ4ghaQo9aa4DWJvhdCesU31qgY/view?usp=drivesdk","description":"Violín 2 - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3563, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1iP5ABhTodGtCxFo-sXIy0H30t0DgEcXd/view?usp=drivesdk","description":"Violoncello - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf"}]', false);

END $$;
