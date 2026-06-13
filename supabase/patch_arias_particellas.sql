-- Patch particellas ARIAS (instrumentos corregidos)
-- 2026-06-13

DO $$
BEGIN
  UPDATE obras SET instrumentacion = '2.2.2.1 - 2.2.2.1 - Timp.+2 - Str' WHERE id = 3491;
  DELETE FROM obras_particellas WHERE id_obra = 3491;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1PlWhLaib60k0lg2rsoApThtFp4_7ilKH/view?usp=drivesdk","description":"Clarinete Bb - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1gegf5K9Z1sncV5i7aerccPkmXVQWFSjT/view?usp=drivesdk","description":"Clarinete Bb 1 - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1jRCyvn5fzLqDYC53cajYmXqWEs5lCqDb/view?usp=drivesdk","description":"Contrabajo - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1xqXbIkIZGscFwbboo0KsQ0skGVcRfN_c/view?usp=drivesdk","description":"Corno F - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1geldaWvrXD10U0jJibKnrPgLP65ehHDT/view?usp=drivesdk","description":"Corno F 2 - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1KgajhXv0MN3pwSnkUXXUyZCmPfY8AzEt/view?usp=drivesdk","description":"Fagot - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1Fm-ztWWOUuyiL8RiCnEAaC-v3e90mp6U/view?usp=drivesdk","description":"Flauta - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1TD-RCeaFvKPTo4AKHN6HCjYKb5fjeWpG/view?usp=drivesdk","description":"Flauta 2 - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1p0q9fnsdWUKEgSSJQzITPiuTs8gAqKGH/view?usp=drivesdk","description":"Oboe 1 - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1FMdr1dfjeIVfJuEQ_oPb_0nOVTB9Zt4E/view?usp=drivesdk","description":"Oboe 2 - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1lhz7vo68pX2zpDzu8mZmr2qahrjRCDAZ/view?usp=drivesdk","description":"Perc Percusión - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/1BD3Q_RGYO-2gLab0C8hhLlukXWG-FlQQ/view?usp=drivesdk","description":"Perc Percusión 2 - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1hxe422ZI1ZSar49PYU_v0fgPraR9OUby/view?usp=drivesdk","description":"Perc Timbal - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1-BhdJEyIB5DQMumeMRF_mioHnbxJt74O/view?usp=drivesdk","description":"SCORE - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1rKzJzFdV78xwChcSvnhWESRJdHjGdhyY/view?usp=drivesdk","description":"Trombón - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1hK756hXXR0bCk49ygK-B81Va7E7AcLY4/view?usp=drivesdk","description":"Trombón 2 - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1ophnqnW2mE-3ylcW_y-pDDnOYzXEhTwU/view?usp=drivesdk","description":"Trompeta - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1Ji-II1qjmY0jRDQHWbvvVgHK-Ikp1dMv/view?usp=drivesdk","description":"Trompeta 2 - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1wedSkcWgxMjOcgtKWXNiCFBV605ZtTI_/view?usp=drivesdk","description":"Tuba - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ZHXKpsh_bfhbM6acwYSIOS94ExqDB5r_/view?usp=drivesdk","description":"Viola - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1UHQ2r5y3dl5wZeg0JB3TSYredNraf52Q/view?usp=drivesdk","description":"Violín 1 - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1p2B9SpweZ898oQekelcijKDmBIgWBFqU/view?usp=drivesdk","description":"Violín 2 - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3491, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1iOKx6Oo09U0OqXVnnx4ZnSy3U9-eqp8v/view?usp=drivesdk","description":"Violoncello - Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);

  UPDATE obras SET instrumentacion = '2.2.2.2 - 4.2.3.1 - Timp.+2 - Str' WHERE id = 3492;
  DELETE FROM obras_particellas WHERE id_obra = 3492;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1QF3BBiumI5dSfTEw51OSMxEyqOFjCZU2/view?usp=drivesdk","description":"Clarinete Bb - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1QCvnIKWr8jZdLiND-1cp8XPA9R4QHEFL/view?usp=drivesdk","description":"Clarinete Bb 2 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Qaz1bp7eP87jCg2i3vBzxngTogEIZute/view?usp=drivesdk","description":"Contrabajo - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1QXDG2EG76tb_Eysk3FSegIovSbdiMGHH/view?usp=drivesdk","description":"Corno F - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1QpRSj1GsVaPqHYGfIQZlhVSDxKuVxPQV/view?usp=drivesdk","description":"Corno F 2 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1QUqcYxu6DconI1W7hdW4i0Bj3l2U-ZkK/view?usp=drivesdk","description":"Corno F 3 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1R-FlBEo0oGgR6j8Wd2N8yTFbDOZLP2zW/view?usp=drivesdk","description":"Corno F 4 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1Qdurjl_9zoumdV6SzcwTYXGoRyTmDkiq/view?usp=drivesdk","description":"Fagot - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1Qlkvbhq0IfM2sx4kqfhC1embPWqcWN5_/view?usp=drivesdk","description":"Fagot 2 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1R9zqDLBrHqvn7ooZiqmYddfmYW8yrkHd/view?usp=drivesdk","description":"Fl Piccolo - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1R2mjMJhm_tNMDwGQRT756DupU5JtJk_O/view?usp=drivesdk","description":"Flauta - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1R8OHhUFLpQMXt8L1haDYN3Ke1TPbLGNk/view?usp=drivesdk","description":"Oboe 1 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1R3eOmM5iYq3Lc6gwkXtGoogSfSkPWtuJ/view?usp=drivesdk","description":"Oboe 2 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1QOSziZ18Iri__M2pF_sj-uIuBIzxphg0/view?usp=drivesdk","description":"Perc Bombo - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1RANlo_4oCE5-FLjWDfi9PZiMBErMb8xu/view?usp=drivesdk","description":"Perc Timbal - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1RCidmCWOJRE23yrKKi0FXcEgHO_KlieO/view?usp=drivesdk","description":"Perc Triángulo - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1RDSMz0gJw41eBnsa61hlrHn-bocfGdHa/view?usp=drivesdk","description":"Trombón - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1RSED8bGH_NaahwWaXSj1_rQjE3JXAZjg/view?usp=drivesdk","description":"Trombón 2 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1RFoS4LPAa3fmwLdXSsZrw_rMhZZsxiHz/view?usp=drivesdk","description":"Trombón 3 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1RtpNx6ZQ4IQ7HQvPLa1ilgX83nEVpc1S/view?usp=drivesdk","description":"Trompeta - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1RYbvr-Tu4wb7mGqAFfhd8yOpW6wMYhwj/view?usp=drivesdk","description":"Trompeta 2 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1SZm424h-TFXaNEbq0W2PZMM7_P2DdSRW/view?usp=drivesdk","description":"Tuba - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Rxi7qTBxnn0RhPi--XUvrNAuni645cck/view?usp=drivesdk","description":"Viola - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1SIJptWpEiuigSG9rff2fVhvOS6bLw8HR/view?usp=drivesdk","description":"Violín 1 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Sb7mFSdIHUya7MALy7ewdNAJTiVUQBT7/view?usp=drivesdk","description":"Violín 2 - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3492, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Sg5ZG9jU8J0bdvDQJQDWRRflno90Slc9/view?usp=drivesdk","description":"Violoncello - Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);

  UPDATE obras SET instrumentacion = '3.2.2.2 - 4.2.3.0 - Timp.+1 - Hp - Str' WHERE id = 3493;
  DELETE FROM obras_particellas WHERE id_obra = 3493;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1aaVieVgecKBjzJgFFg86qzFhiGDLmBw8/view?usp=drivesdk","description":"Arpa - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1bid4pJK3jRB0ZZ8Az8dX6K688NSnfSPR/view?usp=drivesdk","description":"Clarinete Bb 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1bdqvCMFJc8vVnsLOIeK9lNpQLrKG2euD/view?usp=drivesdk","description":"Clarinete Bb 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1bb9LxqzcOcbfwrGhgdSlzPtEU6TFS1bj/view?usp=drivesdk","description":"Contrabajo - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '09', 'Corno C 1', '[{"url":"https://drive.google.com/file/d/1bZaZXb2mXiC1m2razh83TEeaZ6QyqBXt/view?usp=drivesdk","description":"Corno C 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '09', 'Corno C 2', '[{"url":"https://drive.google.com/file/d/1bPzZjjsCDS_iXLVMT4cU7piwlEG5REHL/view?usp=drivesdk","description":"Corno C 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '09', 'Corno D 1', '[{"url":"https://drive.google.com/file/d/1bMRR6y05w6HpZD5NBRUOac7rupvHtpmx/view?usp=drivesdk","description":"Corno D 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '09', 'Corno D 2', '[{"url":"https://drive.google.com/file/d/1bFeRabfaWjA82EqNM2l_rNINr3jtyZIN/view?usp=drivesdk","description":"Corno D 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1b7gPCijo3PLzffH9XzCBL_zUK4XcEZ1S/view?usp=drivesdk","description":"Fagot 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1b3EtV6-Gmx2lFVRnET42gkhWVBYn4rk3/view?usp=drivesdk","description":"Fagot 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1azEVpjBRZ8Pdmq0m8fwcbH6E9Q20lZpc/view?usp=drivesdk","description":"Fl Piccolo - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1av8DHaP_4IJOaQs-MYNTAFwkw4HkROll/view?usp=drivesdk","description":"Flauta 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1au_I7kqolZIL80uqeH26hTTOmbWZqvvU/view?usp=drivesdk","description":"Flauta 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1arYj4qovYLhOKOiU5oseLMdvcL1P9io2/view?usp=drivesdk","description":"Oboe 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1arDbA_ny0YKmqAjKU2MlCh-uKLEbY0rh/view?usp=drivesdk","description":"Oboe 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '13', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1afocwsB34n3fuEnrwIUf9BXovp9v9JDr/view?usp=drivesdk","description":"Perc Timbales - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1cW6ULyPJenjnHsBT_pWK6JMSJjeGmeGL/view?usp=drivesdk","description":"Perc Triángulo - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1cPCW5mtwiVfQAqlGumylP2_AJxAD-U9T/view?usp=drivesdk","description":"SCORE - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1cMD7eOh3jwrEELP7FUfQLNbSPpSfkapJ/view?usp=drivesdk","description":"Trombón 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1cJ7Q3CYZnwmqTUMSyJR3pMGAvSag0a0O/view?usp=drivesdk","description":"Trombón 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1cGLUFjd10wKvuys19zBjMGvgUaEnGF5s/view?usp=drivesdk","description":"Trombón 3 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '10', 'Trompeta D 1', '[{"url":"https://drive.google.com/file/d/1cDX1ikJEiDWxneWyqiUjdGIRwRIF2-T3/view?usp=drivesdk","description":"Trompeta D 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '10', 'Trompeta D 2', '[{"url":"https://drive.google.com/file/d/1cDM_bKRK3LkXDEO7wjdieuN37oyD0_aR/view?usp=drivesdk","description":"Trompeta D 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1c8KSUb7aReVLNIKbvVZQsR4irekKcu2y/view?usp=drivesdk","description":"Viola - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1bsZgf7xf9ZVbU82yJNE2iV_WqPNbDOE6/view?usp=drivesdk","description":"Violín 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1brhIh7Xh4bt5iZViAM9yz8Z5PlLDD-Z_/view?usp=drivesdk","description":"Violín 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3493, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1c4FBtwM_NC9R-bFr6eQ-oJV0-jIcQnzh/view?usp=drivesdk","description":"Violoncello - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);

  UPDATE obras SET instrumentacion = '2.3.3.2 - 4.0.0.0 - Timp - Hp - Str' WHERE id = 3495;
  DELETE FROM obras_particellas WHERE id_obra = 3495;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1qVc8XHsH9I3cpeSWzh-MB76ETfNlRVAf/view?usp=drivesdk","description":"Arpa - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '07', 'Clarinete A', '[{"url":"https://drive.google.com/file/d/1qVP-iJKBzykCzvMI3xDqIuYlRBJoR1hA/view?usp=drivesdk","description":"Clarinete A - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/1qTv6XTdJU3QCphDN-BaAO_PnCVOI1-bw/view?usp=drivesdk","description":"Clarinete A 2 - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '07', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1qS9QInVcbjBc8Y6YMohUmC0UfZW0G6Py/view?usp=drivesdk","description":"Clarinete Bajo - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1qPVzJQNs-dNa9EyhYuxhzniLCz9cGnf4/view?usp=drivesdk","description":"Contrabajo - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1qPIjrCYs3c6amE3qScncSzQx4LezFIGF/view?usp=drivesdk","description":"Corno F - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1qP61VYd3plv5ZM4l7MJIhcnLYYNEbR0g/view?usp=drivesdk","description":"Corno F 2 - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1qNG1W0gHqFZrrnTFIgsX6NbK7RfZidv_/view?usp=drivesdk","description":"Corno F 3 - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1qMWLHSiyPwvJHjs6vPiYqk-ufCyv3MTu/view?usp=drivesdk","description":"Corno F 4 - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1qK1tUvs3yGVwxcb5uqE4TPYHWtmHbkeW/view?usp=drivesdk","description":"Fagot - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1qJJDv7k7LlA_0LYMPe4ABg3DnMVupWwm/view?usp=drivesdk","description":"Fagot 2 - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1qH4FXNh193_HZQNUHegTPEbNFEF-5VI_/view?usp=drivesdk","description":"Flauta - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1q5t97T_5Y_ItwxbaSK_K570LC1LKOhw1/view?usp=drivesdk","description":"Flauta 2 - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1q3eBOJWx6MW5zYR2MLxCkYy9c4tc3dtt/view?usp=drivesdk","description":"Oboe - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1q1aMpiPMrEOj9h9xRLOhGDsTJy21Yj30/view?usp=drivesdk","description":"Oboe 1 - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1q-I-B4mN3Rl7qD-6UyBYZZrRpxOMcW4D/view?usp=drivesdk","description":"Oboe 2 - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1pr9pLOHIJ0T1hj52WqA77tDFvjHG0bEh/view?usp=drivesdk","description":"Perc Timbal - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1pp1nAG4EanmJZwR2b-EFDClsMmom2KWn/view?usp=drivesdk","description":"Viola - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1pkJSu7uEw47Qyn28F846eHjq1fpDGTWl/view?usp=drivesdk","description":"Violín 1 - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1piN52LjTpqSFlUlKzMmXBHGzQAuWg7dk/view?usp=drivesdk","description":"Violín 2 - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3495, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1poj3JazxWDuT7P8Z-H1M18RM0i9rUprb/view?usp=drivesdk","description":"Violoncello - Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);

  UPDATE obras SET instrumentacion = '1.1.1.1 - 4.1.0.0 - Str' WHERE id = 3496;
  DELETE FROM obras_particellas WHERE id_obra = 3496;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1WKFDE31K2tbEAG02zL97ka5hYezHxYyn/view?usp=drivesdk","description":"Clarinete Bb 1 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1WB9Bzo5brulR87e_38bOwAIX2X_nQ2QB/view?usp=drivesdk","description":"Contrabajo - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1W7AKNwGhRzb6RZJsThYIOAL1KjmvIVZm/view?usp=drivesdk","description":"Corno F - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1W0ApcmFeCacpSkJZzb0ZGIlU-3Ghbawe/view?usp=drivesdk","description":"Corno F 2 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1VwNTio65n7P1rNsvTdSGSuAfXUJKwvQV/view?usp=drivesdk","description":"Corno F 3 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1Vv3MFH928c1viRJUxqWuZ3EAZIbO1-oU/view?usp=drivesdk","description":"Corno F 4 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1VuuNJKA3UI-YmyrgQOD1teQy6zPnHSd1/view?usp=drivesdk","description":"Fagot - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1Vs_qhUEQ35aab5dK80KLSZlsjqLKml88/view?usp=drivesdk","description":"Flauta - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1VoKadA2sS9dXSg_rVSzr11QV4jceDAo0/view?usp=drivesdk","description":"Oboe 1 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Vh909OflNsvZpXgkrCY0SX0-f3s_Ak9R/view?usp=drivesdk","description":"SCORE - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1V_Stjs6OwYpjKToSXmp067QO44AAdgyB/view?usp=drivesdk","description":"Trompeta - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1VZ91ec-lJpPpEI9CIyppukCs3kAevgHV/view?usp=drivesdk","description":"Viola - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1VW0yPGrLQvyaNnqYSGvXN00mZ1IeZw9e/view?usp=drivesdk","description":"Violín 1 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1VVUz_MuMDsxhztXTpl7dZ3XExXAs1Vzo/view?usp=drivesdk","description":"Violín 2 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3496, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1VXbKFxnsfMF236iKBkvpAckvFkRTK7OQ/view?usp=drivesdk","description":"Violoncello - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);

  UPDATE obras SET instrumentacion = '1.2.0.2 - 2.0.0.0 - Str' WHERE id = 3506;
  DELETE FROM obras_particellas WHERE id_obra = 3506;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1EN6QvBsJQO5Jrel_7E1WpkD_vMNoKNyr/view?usp=drivesdk","description":"Contrabajo - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1EMrNHsHdnY0EylGl9fuuKR70FCxujAhK/view?usp=drivesdk","description":"Corno F - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1EIIQxfOD8e_0ycs091bSZK2X1caJX4FE/view?usp=drivesdk","description":"Corno F 2 - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1EFrRdj7SVKQZOWhW0Mrxcqu_Dvkmh37J/view?usp=drivesdk","description":"Fagot - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1EEjNbbcSq2BqEhMPHzeHcz49WNhTp1sB/view?usp=drivesdk","description":"Fagot 2 - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1E9QMftG_kas3EpyZ1xbyyYBGojCWe_Rj/view?usp=drivesdk","description":"Flauta - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1E2PGon7uz8miftC4tHiF0hxprSQ61t9O/view?usp=drivesdk","description":"Oboe 1 - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1DWNzy_mEuPLdagGupsA7Fb-tC7IAUs5f/view?usp=drivesdk","description":"Oboe 2 - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1aRKkNAoyouFJEsdVFgAGkCq1sikQZZpe/view?usp=drivesdk","description":"SCORE - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1DW9AXls_3SjDZzFcKm-G2zS5V3Rxn0E_/view?usp=drivesdk","description":"Viola - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1DJr1zfJ53HZkt1BAn481CU8l3x5MZ48o/view?usp=drivesdk","description":"Violín 1 - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1DIxkKXn95cEJNx6ZrljEpOzD0Whw1VuA/view?usp=drivesdk","description":"Violín 2 - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3506, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1DN8n2emcyWG3l7Rj7P_jGjPLfoWPPZie/view?usp=drivesdk","description":"Violoncello - 02. La ci darem la mano - Mozart, W.A.pdf"}]', false);

  UPDATE obras SET instrumentacion = '3.3.3.2 - 3.0.2.0 - Timp.+1 - Hp - Str' WHERE id = 3507;
  DELETE FROM obras_particellas WHERE id_obra = 3507;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1TK3CUL37FyaX34JfA_te6KFN4MZM-ytL/view?usp=drivesdk","description":"Arpa - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/1Sig1obj9EkwSufZo8zFU0cGJiA0Wv1ym/view?usp=drivesdk","description":"Clarinete A 1 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/1SeuQixlagBVnlysKvJBA2i_rXizTQlMM/view?usp=drivesdk","description":"Clarinete A 2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '07', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1S_Qx2kdjl83xE_PMiML6Nk5AZXmbBw8G/view?usp=drivesdk","description":"Clarinete Bajo - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1SZQOTF4ndBl-bxaA-ab_p7qck75oP39n/view?usp=drivesdk","description":"Contrafagot - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1SV1UX19vAU9n2Fi68OI8dHY2WnPa-Yjl/view?usp=drivesdk","description":"Corno F 1 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1ST8I0p3ZO9CxcchK1FEJv55Vr6EZ0Mj8/view?usp=drivesdk","description":"Corno F 2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1SQySf_EnyuDNjAYKF_tDOIVRUwGLmyYH/view?usp=drivesdk","description":"Corno F 3 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '08', 'Fagot 1-2', '[{"url":"https://drive.google.com/file/d/1SZYsORnXvevp4vHkMlvx-CH2szsn6X9R/view?usp=drivesdk","description":"Fagot 1-2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1T3ZteP7T7s7fqpEdB8tvixb9sxF4nsGw/view?usp=drivesdk","description":"Flauta 1 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1SvJrNREWATOur9sly-B9yXskFpBKAtwz/view?usp=drivesdk","description":"Flauta 2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '05', 'Flauta 3', '[{"url":"https://drive.google.com/file/d/1SsqR3u5Tx2ZcYLn_-i_JvPwnW2VOoyid/view?usp=drivesdk","description":"Flauta 3 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1SjTvMWeThAWkEkmcaTXUVfsjS7nP_8My/view?usp=drivesdk","description":"Ob EH - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1SmlvikkV5rq-PtwDB8gKYFpvmQySRk-K/view?usp=drivesdk","description":"Oboe - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1SkVVPnirwq-6yTktd0CNfweyShKshDzc/view?usp=drivesdk","description":"Oboe 2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1TNyx8MkgtbmlDUVATR_KbvTiYpvpB1rK/view?usp=drivesdk","description":"Perc Bombo - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1TQKgB-Kf4rIa65vC2QVOi7Kg4MwFmTaq/view?usp=drivesdk","description":"Perc Timbal - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1T3cSGAo-JuwQ0RV8xeoBhY97gzjad0Si/view?usp=drivesdk","description":"SCORE - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '11', 'Trombón 1-2', '[{"url":"https://drive.google.com/file/d/1TZM45lFVb99mVYbvNWC-ETC2DbavW0x4/view?usp=drivesdk","description":"Trombón 1-2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1TXghPX_T4ZFfhy5rWdOyQ4C0cv1wzQmu/view?usp=drivesdk","description":"Trombón 3 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1TA1g1IN3NPBkezDMIJCd8taiZfuA_JJA/view?usp=drivesdk","description":"Viola - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1TDVvFiFQEC_RFaXQcSc23GBjvC4MNG76/view?usp=drivesdk","description":"Violín 1 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1TD8urhGy1rIyXhHHvKWfuqg8hOfyJl_i/view?usp=drivesdk","description":"Violín 2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1T6MKi9ocG1DnmWoCmU6OP9q2FH3oH11C/view?usp=drivesdk","description":"Violoncello - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  UPDATE obras SET instrumentacion = '2.2.0.2 - 2.2.0.0 - Timp - Str' WHERE id = 3508;
  DELETE FROM obras_particellas WHERE id_obra = 3508;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '03', 'Continuo', '[{"url":"https://drive.google.com/file/d/1kCes2jI89QVMRvp3OHet7C-kj57mknTx/view?usp=drivesdk","description":"Continuo - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1k84JYvbDib3AMihvbPVriE0CAQUSOyfs/view?usp=drivesdk","description":"Contrabajo - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1k6AhnyLwZ6oKcF_QtnqHOnCDZif1D841/view?usp=drivesdk","description":"Corno F - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1k-3KswOScpqd8wAT8EMQAPKz1IOmoi-I/view?usp=drivesdk","description":"Corno F 2 - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1jvxb3pha3uEdr36gD0i0pobOjkRMgeRr/view?usp=drivesdk","description":"Fagot - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1jvICHaFufx86xE4vPwkHbTiFvYaCh4KY/view?usp=drivesdk","description":"Fagot 2 - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1jr5xQhDQ2DVJ8r2fSD35HhnAsQjIyOlf/view?usp=drivesdk","description":"Flauta - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1jpy5avGok_6BsG0YKy0MIeU3Kw-xZMJT/view?usp=drivesdk","description":"Flauta 2 - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '50', 'IMSLP683990', '[{"url":"https://drive.google.com/file/d/1jpGEBOMa80wjms2ugNS_xJy4Xys24Kkp/view?usp=drivesdk","description":"IMSLP683990 - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1lkLpq2DFqs_GPF8tmpYVsi0IL1kONkXM/view?usp=drivesdk","description":"Oboe 1 - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '06', 'Oboe 1 2', '[{"url":"https://drive.google.com/file/d/1lh6Anx4_TdxqF-3nCfhj05318EfxzibJ/view?usp=drivesdk","description":"Oboe 1 2 - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1l_yadbnYkenstRMugi92RnaNsVcmF35c/view?usp=drivesdk","description":"Perc Timbal - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1lUtgqyPrZ7poZF2jTDnAxYOBdPMv7BV-/view?usp=drivesdk","description":"SCORE - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1lGqfxZ4sHmXJfqkuPMIjlkVcXugrowXw/view?usp=drivesdk","description":"Trompeta - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1lGL4qhcPhjQt9U1tMjYB74T3MjUrBFhS/view?usp=drivesdk","description":"Trompeta 2 - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1lCpX9t1j322nXVfoGmN4-1uJlkyyVBmh/view?usp=drivesdk","description":"Viola - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1kRPBG6pyLzklmrP5bMnf7-hvFUXTxglI/view?usp=drivesdk","description":"Violín 1 - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1kMy2dnR7iM-7zv6hqGNob1GNFDSfmx2R/view?usp=drivesdk","description":"Violín 2 - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3508, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1k_b5gaZW_Id3cgp1HrybSheEz_6gUcBp/view?usp=drivesdk","description":"Violoncello - 04. La vendetta (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  UPDATE obras SET instrumentacion = '0.0.2.2 - 2.0.0.0 - Str' WHERE id = 3509;
  DELETE FROM obras_particellas WHERE id_obra = 3509;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '03', 'Bajo Continuo', '[{"url":"https://drive.google.com/file/d/1UWXvcTJFONOJRtMFJSGZp0Hf482Z1UTC/view?usp=drivesdk","description":"Bajo Continuo - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1UD513x5rH5WWu9RK-qN09iSjCO7LGNNn/view?usp=drivesdk","description":"Clarinete Bb - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1UH5_9OqtLNQbiLL0HVRDzdSfdAkqWBRx/view?usp=drivesdk","description":"Clarinete Bb 1 - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1U9ps5gDP9WP2DHPdPhUuysD98T4LyY4G/view?usp=drivesdk","description":"Contrabajo - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1U6uo_uTf9Clz7aZ0U5rtlfvycQSNkJbn/view?usp=drivesdk","description":"Corno F - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1U4z-ezQWDcRd2yQ_POGr4nloBzGXggn1/view?usp=drivesdk","description":"Corno F 2 - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1U3ShvXKsXjFB6oVq3UkTQIdinC4cMGzv/view?usp=drivesdk","description":"Fagot - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1U1UfDGuwwR6TU1ozvXGO4RSUnvUEpvdF/view?usp=drivesdk","description":"Fagot 2 - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1WLcBY0VvOTfvUaw2OhEtLpZgxbVY6Za9/view?usp=drivesdk","description":"SCORE - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1TyyUjlGo-NrB9-rL5GNhCxxkgoivcmIt/view?usp=drivesdk","description":"Viola - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1TrKlmQZpma5nBWgGrTNqmAAfBqIeIsEL/view?usp=drivesdk","description":"Violín 1 - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1TkxfQRvTKzn3JfhMtrUy3CZ31aUDaHhu/view?usp=drivesdk","description":"Violín 2 - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3509, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Tu0AhoZUkeq77RMw4f4t1eM__tyiDFR0/view?usp=drivesdk","description":"Violoncello - 06. Porgi amor (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  UPDATE obras SET instrumentacion = '3.2.3.2 - 4.3.4.0 - Perc - Hp - Str' WHERE id = 3510;
  DELETE FROM obras_particellas WHERE id_obra = 3510;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1_Ry5foI7UXCHXFuK_PVHlfRPW2i_1Sxx/view?usp=drivesdk","description":"Arpa - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '07', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1aHfjN8nf8O24-YwYcjGRen6ffLq6GCWN/view?usp=drivesdk","description":"Clarinete Bajo - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1ZUgvPrKpkK0tHVEwcsazfcZ2Wy8pT34A/view?usp=drivesdk","description":"Clarinete Bb - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1aNmL0MjfEIwygPRael8YHHLQKBn1Yop4/view?usp=drivesdk","description":"Clarinete Bb 1 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1_HpUPHfly0rchLyPxNkIzJ2-arNz_F0N/view?usp=drivesdk","description":"Contrabajo - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1Z_X6ZifEQMrLOYrQ_O1-rwIwMK2Wc5at/view?usp=drivesdk","description":"Corno F - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1ZbV8Ti0ge36bMLDRKmasCRLm1Zq8U_7W/view?usp=drivesdk","description":"Corno F 2 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1ZfZdQJuJN_LpQZR4JDvfgNEeU8hy3THU/view?usp=drivesdk","description":"Corno F 3 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1ZkDbk8RlDBpLqEglSqz-UzpAjtC6fe60/view?usp=drivesdk","description":"Corno F 4 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1ZXBCs7-frhCa0r-4R4n7VMXXpddeydNF/view?usp=drivesdk","description":"Fagot - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1ZYQqGX2u9b17AM2ENIUyTfP-2SBlwfs-/view?usp=drivesdk","description":"Fagot 2 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1_CWbxzav5Yv1qYZ4igYrBfJmR8Rn0IEb/view?usp=drivesdk","description":"Fl Piccolo - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1_upQ9QBHf76KpzVHxEvs2VSaRbdCVADZ/view?usp=drivesdk","description":"Flauta - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1a5LVmx9mBv1enYdWNEaogj_NakowriBS/view?usp=drivesdk","description":"Flauta 2 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1aBgS65xFm_joNx56JpdHPhZDi17pyUjs/view?usp=drivesdk","description":"Oboe 1 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1a9477ZLvrh9iyGLV52000-S6eVt5a0w1/view?usp=drivesdk","description":"Oboe 2 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1_AdTmZXd8porEMWICN1bz6igI808whfe/view?usp=drivesdk","description":"Perc Percusión - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1_CI8QlxawPx73SvywGKohpyUU9oti6a7/view?usp=drivesdk","description":"SCORE - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1ZxF0H5TCT7MIFusHqeJEDgY1fUwsTLf0/view?usp=drivesdk","description":"Trombón - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1_1XDpxbrFQaEd4Tc2ZG1fovFxTKtPgVC/view?usp=drivesdk","description":"Trombón 2 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1_6YUKbUMOstp5Aq_5SB-pScIN7W97q01/view?usp=drivesdk","description":"Trombón 3 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1_9jaFyXaAR-PURYgHekWjcmZNIdwobZ7/view?usp=drivesdk","description":"Trombón Bajo - O soave fanciulla ''La Boheme'' - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1ZpaQtwSVdVNJII12DHzMi-zyervNcdPs/view?usp=drivesdk","description":"Trompeta - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1ZpnILzupunP54ELSbGz5sWU4SLs9lNmX/view?usp=drivesdk","description":"Trompeta 2 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '10', 'Trompeta 3', '[{"url":"https://drive.google.com/file/d/1Zsnybaw0Ijo2Lh-wr_F7MBySWgti7NrX/view?usp=drivesdk","description":"Trompeta 3 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1_ZB_ShtkWIt5k-VJPYuNNXQyFMzB7bVH/view?usp=drivesdk","description":"Viola - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1_uD0Sv9Gp8ZkRM7BgZt4S2Am5cfSqfPg/view?usp=drivesdk","description":"Violín 1 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1_kRfPAHoMsYLhNPl985wWzwextlvnwcG/view?usp=drivesdk","description":"Violín 2 - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3510, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1_FPoO78cnfIeXSADPudVraCo_9jQHmeM/view?usp=drivesdk","description":"Violoncello - 07. O soave fanciulla (''La Bohème'') - Puccini, G.pdf"}]', false);

  UPDATE obras SET instrumentacion = '2.0.0.2 - 2.0.0.0 - Perc - Str' WHERE id = 3511;
  DELETE FROM obras_particellas WHERE id_obra = 3511;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '03', 'Bajo continuo', '[{"url":"https://drive.google.com/file/d/1VGyIcoZEYe4eWgzAT0FMY1e-foF7CsdL/view?usp=drivesdk","description":"Bajo continuo - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1VEPmiFYLghvqxSOy_r_oLUduJvGwgcyd/view?usp=drivesdk","description":"Contrabajo - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1VAFyAakpwjt0DgjDZoTHNOoau5QdkMsu/view?usp=drivesdk","description":"Corno F - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1V0HubbvojVRjsw57o6a_06dR3gcTAypP/view?usp=drivesdk","description":"Corno F 2 - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '13', 'Crudel perche finora', '[{"url":"https://drive.google.com/file/d/1WLLHjkueLn2N66T6-wjc0mD4AFpZbSLR/view?usp=drivesdk","description":"Crudel perche finora - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1UxGOmXjN4jz_lC0FR2eeM7KExcP1nzIW/view?usp=drivesdk","description":"Fagot - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1UwKeWglWJsqwlvHyWbYL2Vd9CzKLYYpn/view?usp=drivesdk","description":"Fagot 2 - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1UsfWceIm4PMh96Qk-9sKug-DGtBNaj5u/view?usp=drivesdk","description":"Flauta - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1UpHT3y08N2CjAT7f_69mrV2Ac9xhOntR/view?usp=drivesdk","description":"Flauta 2 - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Uku3bdjIqdXNrGsSfdl5ZpHZI_RKUakL/view?usp=drivesdk","description":"Viola - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Uiyg9BTUNO6cdxZB4iIFnJFNwztIIqyb/view?usp=drivesdk","description":"Violín 1 - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Ua1bw-nIpINglB3J_TPv9CWNzJqyKnbj/view?usp=drivesdk","description":"Violín 2 - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3511, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1UjGLQiBhVaOr9tLl1ejV1NhrGvOzItWf/view?usp=drivesdk","description":"Violoncello - 09. Crudel! perchè finora (''Le nozze di Figaro'') - Mozart, W.A.pdf"}]', false);

  UPDATE obras SET instrumentacion = '3.3.3.2 - 4.3.4.0 - Perc.x2 - 2Hp - Key - Str' WHERE id = 3512;
  DELETE FROM obras_particellas WHERE id_obra = 3512;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1QTnzzmpbqarYIvlIZpwqXEXpJ7DPQJkj/view?usp=drivesdk","description":"Arpa - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '14', 'Arpa 2', '[{"url":"https://drive.google.com/file/d/1QTH_ynmPtAgLZtyakltFd4LBM7qeW4IL/view?usp=drivesdk","description":"Arpa 2 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '17', 'Celesta', '[{"url":"https://drive.google.com/file/d/1QZ8bxzEhtiHmWGSyM0f25lTOmEBXaAiE/view?usp=drivesdk","description":"Celesta - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '07', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1PZQY8Yn5lPH8KJKzm7Vft6NrZkqYUJa_/view?usp=drivesdk","description":"Clarinete Bajo - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1PfVDyryPaPmqqgi32Be0Cvu_kIzRUkuV/view?usp=drivesdk","description":"Clarinete Bb - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1PacQLYMKRT2P0Na6r23z6FS1hYkKLeWe/view?usp=drivesdk","description":"Clarinete Bb 2 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Q5ZVxZ_iLADgweexRN3ewCntzatr9AM8/view?usp=drivesdk","description":"Contrabajo - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1PHSinCTcaTJ1b8ciPGkQdjv9Gjt6qydT/view?usp=drivesdk","description":"Corno F - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1PHBUhvQq4TkP5PMMVQdk0xValI3VcUwm/view?usp=drivesdk","description":"Corno F 2 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1PG5pgUNKaCnjqbherWtZYBeylr2EkwOM/view?usp=drivesdk","description":"Corno F 3 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1R6R7JdiQwJM9ZygIQNJ6ziqRvjeRZiA7/view?usp=drivesdk","description":"Corno F 4 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1PJduYxqJDOsryn8Oe6Nsx3JnleUgOOwc/view?usp=drivesdk","description":"Fagot - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1PZ4sPRLEH6-Bwx5Icp-SWUy6cJmEQJPo/view?usp=drivesdk","description":"Fagot 2 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"},{"url":"https://drive.google.com/file/d/1PPhZhPTyeKp1rVwSvXpkfilYMoP2dxTI/view?usp=drivesdk","description":"Fagot 2 - Nessun Dorma, ''Turandot'' - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1PzrIg9ysMFz9exqaguuCQa16Zbu3xgbK/view?usp=drivesdk","description":"Fl Piccolo - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1PzNTlixmVG4cCtF5QNVvM1btJ1CW7djb/view?usp=drivesdk","description":"Flauta - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1Pyn84YNxuWeazdnSrM5ogk2TJd84ySc_/view?usp=drivesdk","description":"Flauta 2 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '50', 'IMSLP869126', '[{"url":"https://drive.google.com/file/d/1JDzfd-cZJkSg1bsnLdZEKEnJ6pVt0D8a/view?usp=drivesdk","description":"IMSLP869126 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1PlmmhAfSvVFtyg5XJ9jpLRWyTP8Qo2XU/view?usp=drivesdk","description":"Oboe - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1PujjBsOWZD5umm3nJyZgIyExcG0pa-XR/view?usp=drivesdk","description":"Oboe 1 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1PrRm0fSHBPcHFddRaOVPVcDEPAabEKTi/view?usp=drivesdk","description":"Oboe 2 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1Q047rWJDcOpJy22t8AlHnvsyH_3lXczM/view?usp=drivesdk","description":"Perc Percusión - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/1Qb0q4Exqu0K03OWt6-NkFbxVKmyrFZqh/view?usp=drivesdk","description":"Perc Percusión 2 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1RDsXax7GIIWgkjW2EsKJCdDjZzYw9eiz/view?usp=drivesdk","description":"SCORE - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1Qvqo0Rde6eDoC4W4v7BFq5oHsXqybrq8/view?usp=drivesdk","description":"Trombón - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1Qta-dW7aMdpl-K6MrGuRk2FghlYm_llo/view?usp=drivesdk","description":"Trombón 2 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1Qr_BLjYhh2u3ZUEiDJnpRGN-hj1N5psl/view?usp=drivesdk","description":"Trombón 3 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1Qe9yUUjbLIjOk7PwVGCJTl_iBdNg4vEN/view?usp=drivesdk","description":"Trombón Bajo - Nessun Dorma, ''Turandot'' - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '10', 'Tromp3ta 1', '[{"url":"https://drive.google.com/file/d/1R6OrFemE1douDJnUyvJxc-gqsUqtiRtn/view?usp=drivesdk","description":"Tromp3ta 1 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1QwBsxOpv_f6qjQbIobyoNOsUBva2_Y9A/view?usp=drivesdk","description":"Trompeta - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1QweYonntThiGQ8jaZDKm65CzM_9Lp92a/view?usp=drivesdk","description":"Trompeta 2 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1QFOejACUs90AEaq5NjyY-F07m6iMtSnb/view?usp=drivesdk","description":"Viola - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1QS4SxglK87L4NgBDh1SRJDdj108a7Akq/view?usp=drivesdk","description":"Violín 1 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1QN1BGcdhK80YfB5Wplh-s7Q1qU1u3Kgv/view?usp=drivesdk","description":"Violín 2 - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3512, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Q5foEJiain4qF64DWg7MYL3LbEONxHkM/view?usp=drivesdk","description":"Violoncello - 10. Nessun dorma (''Turandot'') - Puccini, G.pdf"}]', false);

  UPDATE obras SET instrumentacion = '2.0.1.1 - 1.2.0.0 - Str' WHERE id = 3513;
  DELETE FROM obras_particellas WHERE id_obra = 3513;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '07', 'Clarinetes', '[{"url":"https://drive.google.com/file/d/1S-itQyrmOr1BtyGR5othi_40DR3apNDt/view?usp=drivesdk","description":"Clarinetes - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1RQlniN_bgKJbkRuyh69mA8n_3XWpuZ1D/view?usp=drivesdk","description":"Contrabajo - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '09', 'Cornos F', '[{"url":"https://drive.google.com/file/d/1RsGTFn-7LvRcXznznlHS_eWD5Ll1Olpw/view?usp=drivesdk","description":"Cornos F - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '08', 'FAgotes', '[{"url":"https://drive.google.com/file/d/1RuELlsoHd3xWJtfFJ2QsWgV0GhPl2-pH/view?usp=drivesdk","description":"FAgotes - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1S3WRGK6SB-W5rczbqqJcc1XWlxz_FJHl/view?usp=drivesdk","description":"Fl Piccolo - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1S0pGgjI-PhvUkOIGmjP7A6wa6uboD2xN/view?usp=drivesdk","description":"Flauta - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Tc3mggH16PbwDv4LSExX6xF5ifEorpf_/view?usp=drivesdk","description":"SCORE - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '10', 'Trompetas Bb', '[{"url":"https://drive.google.com/file/d/1Rm10KXiW6TTQa37dHIncaWJmMzAZ-gT5/view?usp=drivesdk","description":"Trompetas Bb - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '10', 'Trompetas C', '[{"url":"https://drive.google.com/file/d/1Rn7vPMfvLumE0Kale-_4P09Hlm4L0U0U/view?usp=drivesdk","description":"Trompetas C - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1RgftlUcEv5OTf1udCz31oV5e5eZaG1pM/view?usp=drivesdk","description":"Viola - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1RkeesUHuD0qQpkTHqxgMTp1m73Sh8Z_o/view?usp=drivesdk","description":"Violín 1 - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Ri8j3haFvRjVb37Gi0sXdqS89Pho1L99/view?usp=drivesdk","description":"Violín 2 - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3513, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1RRRw5b5vd1oZWbMxYVpiwMKMSv3Dc1i_/view?usp=drivesdk","description":"Violoncello - 12. Largo al factotum (''Il barbiere di Siviglia'') - Rossini, G.pdf"}]', false);

  UPDATE obras SET instrumentacion = '0.1.1.1 - 2.1.1.1 - Timp - Str' WHERE id = 3514;
  DELETE FROM obras_particellas WHERE id_obra = 3514;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '07', 'Clarinete A 1-2', '[{"url":"https://drive.google.com/file/d/1JVeTjqbjlQNjLA87_gpA7AJhpKYj6beI/view?usp=drivesdk","description":"Clarinete A 1-2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Ja-qfw8t0yFN1JzdTp-3JXsygaY7qz0E/view?usp=drivesdk","description":"Contrabajo - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '09', 'Corno F 1-2', '[{"url":"https://drive.google.com/file/d/1JnX0x7SQAVfKkpEmCpECrOClqnisdOOa/view?usp=drivesdk","description":"Corno F 1-2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '09', 'Corno F 3-4', '[{"url":"https://drive.google.com/file/d/1JW1ILDQNxqxIvSeScHTPpBO1RqOF6JQ_/view?usp=drivesdk","description":"Corno F 3-4 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '08', 'Fagot 1-2', '[{"url":"https://drive.google.com/file/d/1Jilv-mrGqssy4ykjReeCZTUIiQap8FJJ/view?usp=drivesdk","description":"Fagot 1-2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '06', 'Oboe 1-2', '[{"url":"https://drive.google.com/file/d/1JZqXWSRyVqgjpk3liYi8fjn0EVYs6adA/view?usp=drivesdk","description":"Oboe 1-2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1JMSp7EMc-TidWccEfR6wD8502idDxPdg/view?usp=drivesdk","description":"Perc Timbal - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1JqeXBs1bMQi9fFsW5wepqeqsHZZ6Gg0T/view?usp=drivesdk","description":"SCORE - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '11', 'Trombón 1-3', '[{"url":"https://drive.google.com/file/d/1JTLzqM1oQNx8zTfmBWV89vIVNGJi3C10/view?usp=drivesdk","description":"Trombón 1-3 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '10', 'Trompeta 1-2', '[{"url":"https://drive.google.com/file/d/1JL7FpyuiWxttQyCJqfRkSZaqDMUUyj-h/view?usp=drivesdk","description":"Trompeta 1-2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1JUve6vCN4zzjQqtb35BREUdqUR2LI4VF/view?usp=drivesdk","description":"Tuba - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1JK33K39KibbrtrhNS6KZcIH35u0h3dUF/view?usp=drivesdk","description":"Viola - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1JE9EREgvbrHEQZOibHTNP2k3J0cDSF1M/view?usp=drivesdk","description":"Violín 1 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1JE5DT32A1BkGrh5pYKRi6y7r7l4wm393/view?usp=drivesdk","description":"Violín 2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1JFngpRkLlKKIpGHpsOY1k4Bivq57AJba/view?usp=drivesdk","description":"Violoncello - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

END $$;
