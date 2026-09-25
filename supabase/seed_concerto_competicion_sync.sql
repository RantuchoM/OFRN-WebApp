-- Concerto Competition: solo catálogo (obras + particellas). Sin programas.
-- Generado: 2026-09-24

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Mendelssohn_Bartholdy_F_lix bigint;
  _id_comp_Wieniawski_Henryk bigint;
  _id_comp_Mozart_Wolfgang_Amadeus bigint;
  _id_comp_Casadesus_Henri bigint;
  _id_comp_Bach_Johann_Christian bigint;
BEGIN
  SELECT id INTO _id_comp_Mendelssohn_Bartholdy_F_lix FROM compositores WHERE apellido = 'Mendelssohn-Bartholdy' AND (nombre = 'Félix' OR (nombre IS NULL AND 'Félix' IS NULL)) LIMIT 1;
  IF _id_comp_Mendelssohn_Bartholdy_F_lix IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Mendelssohn-Bartholdy', 'Félix') RETURNING id INTO _id_comp_Mendelssohn_Bartholdy_F_lix;
  END IF;

  SELECT id INTO _id_comp_Wieniawski_Henryk FROM compositores WHERE apellido = 'Wieniawski' AND (nombre = 'Henryk' OR (nombre IS NULL AND 'Henryk' IS NULL)) LIMIT 1;
  IF _id_comp_Wieniawski_Henryk IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Wieniawski', 'Henryk') RETURNING id INTO _id_comp_Wieniawski_Henryk;
  END IF;

  SELECT id INTO _id_comp_Mozart_Wolfgang_Amadeus FROM compositores WHERE apellido = 'Mozart' AND (nombre = 'Wolfgang Amadeus' OR (nombre IS NULL AND 'Wolfgang Amadeus' IS NULL)) LIMIT 1;
  IF _id_comp_Mozart_Wolfgang_Amadeus IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Mozart', 'Wolfgang Amadeus') RETURNING id INTO _id_comp_Mozart_Wolfgang_Amadeus;
  END IF;

  SELECT id INTO _id_comp_Casadesus_Henri FROM compositores WHERE apellido = 'Casadesus' AND (nombre = 'Henri' OR (nombre IS NULL AND 'Henri' IS NULL)) LIMIT 1;
  IF _id_comp_Casadesus_Henri IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Casadesus', 'Henri') RETURNING id INTO _id_comp_Casadesus_Henri;
  END IF;

  SELECT id INTO _id_comp_Bach_Johann_Christian FROM compositores WHERE apellido = 'Bach' AND nombre = 'Johann Christian' LIMIT 1;
  IF _id_comp_Bach_Johann_Christian IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Bach', 'Johann Christian') RETURNING id INTO _id_comp_Bach_Johann_Christian;
  END IF;

  -- Concierto para Violín en Mi menor
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Concierto para Violín en Mi menor'
      AND o.observaciones = 'Para acomodar. Orquesta: Breitkopf/Kalmus A1706 (Rietz). Violín solo: Carl Fischer 1917, Leopold Auer, IMSLP #49678 (otra edición; el set Kalmus no trae solo).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Concierto para Violín en Mi menor',
      NULL,
      1844,
      NULL,
      'Oficial',
      'Para acomodar. Orquesta: Breitkopf/Kalmus A1706 (Rietz). Violín solo: Carl Fischer 1917, Leopold Auer, IMSLP #49678 (otra edición; el set Kalmus no trae solo).',
      'Vn - 2.2.2.2 - 2.2.0.0 - Timp - Str',
      'https://drive.google.com/open?id=1UfwbHPaVmfK7YjttNj4YvPRrfEZ9mmqw'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Mendelssohn_Bartholdy_F_lix, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/1s5OZ926m37VcV0vk-tx9Ps5_i_L6aywi/view?usp=drivesdk","description":"Clarinete A 1 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/10TLihvOTN-jG6zexwBsnRXeIER5gIscP/view?usp=drivesdk","description":"Clarinete A 2 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno E 1', '[{"url":"https://drive.google.com/file/d/1FR-OVh5ZlrdiWxz2eGl-e9PqvZx8PvQf/view?usp=drivesdk","description":"Corno E 1 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno E 2', '[{"url":"https://drive.google.com/file/d/1nHFEBwEE5BuMgB7H_5xsJwEik_8udnsO/view?usp=drivesdk","description":"Corno E 2 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1QErxNHxLVrHNC560LrPtGeHMX5PCvBiv/view?usp=drivesdk","description":"Fagot 1 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1PXoJH-IfPD4hEvJWtsj-4cK2T_g5U3FT/view?usp=drivesdk","description":"Fagot 2 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1MaJqUMUiFKwOMfXUYN1BfvBAUHqfQkqw/view?usp=drivesdk","description":"Flauta 1 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1uXrGfmePr3Dku_H4SrYVkAPU7CdCwKlY/view?usp=drivesdk","description":"Flauta 2 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1Q-1KkwjxJw2bLTtdqGclw0SaoQY3mmSY/view?usp=drivesdk","description":"Oboe 1 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/15J3gJ8t9cetX-QMvyEIiN3ICPw0IozqY/view?usp=drivesdk","description":"Oboe 2 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1IukhX2SD_ZHw4q0wcv094W8AD6Jg0tJN/view?usp=drivesdk","description":"Perc Timbal - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1EoXUi76p4iY4MEQj2471iTEK08L5ISBx/view?usp=drivesdk","description":"SCORE - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta E 1', '[{"url":"https://drive.google.com/file/d/1ygJtbfDktNzcGSo9x3iTxhnkJ_OgfxPV/view?usp=drivesdk","description":"Trompeta E 1 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta E 2', '[{"url":"https://drive.google.com/file/d/1N5fyBFuQO5ytdn43L83HWWuQZ39aX0TI/view?usp=drivesdk","description":"Trompeta E 2 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/14hEk-2RMCQhiFE0zOLgSe6d8V534NHDa/view?usp=drivesdk","description":"Viola - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1rIA9tvhvXjwCCYepS66PgW-fKpeS9vmA/view?usp=drivesdk","description":"Violín 1 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1i_SEZr-qzkfj3buIH0roHmifFsPb5xf_/view?usp=drivesdk","description":"Violín 2 - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín Solo', '[{"url":"https://drive.google.com/file/d/1T-Jocv0Zh2PklohZO7O-JZGk5iFKW0Ep/view?usp=drivesdk","description":"Violín Solo - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/12Rn5k4tBpdOl32TDsPIiHrmtUVKCxado/view?usp=drivesdk","description":"Violoncello y Contrabajo - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/12Rn5k4tBpdOl32TDsPIiHrmtUVKCxado/view?usp=drivesdk","description":"Violoncello y Contrabajo - op.64. Concierto para Violín en Mi menor - Mendelssohn, F.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Concierto para Violín en Mi menor';
  END IF;

  -- Concierto para Violín Nro 2 en Re menor
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Concierto para Violín Nro 2 en Re menor'
      AND o.observaciones = 'Para acomodar. Karol Jaworski 2021, CC BY-SA 4.0. Incluye violín solo de la misma edición.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Concierto para Violín Nro 2 en Re menor',
      NULL,
      1862,
      NULL,
      'Oficial',
      'Para acomodar. Karol Jaworski 2021, CC BY-SA 4.0. Incluye violín solo de la misma edición.',
      'Vn - 2.2.2.2 - 2.2.3.0 - Timp - Str',
      'https://drive.google.com/open?id=1H7PoDvDbnFNzun9YNo6XszmzsdqZlMsf'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Wieniawski_Henryk, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/138b7Kg3ZZ95icmqI9sqoWwtyvnRgdjg7/view?usp=drivesdk","description":"Clarinete Bb 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/138b7Kg3ZZ95icmqI9sqoWwtyvnRgdjg7/view?usp=drivesdk","description":"Clarinete Bb 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1ljRgxNH1tVVYBHGy7XvDIghJ_Jy3O8v3/view?usp=drivesdk","description":"Corno F 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1ljRgxNH1tVVYBHGy7XvDIghJ_Jy3O8v3/view?usp=drivesdk","description":"Corno F 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1OJ47bWuiWe9EPQvt9P6AjeGTBXan-J7Q/view?usp=drivesdk","description":"Fagot 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1OJ47bWuiWe9EPQvt9P6AjeGTBXan-J7Q/view?usp=drivesdk","description":"Fagot 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1wJN_cMmAjWXUkfkrxqc7vU05_Sup44jY/view?usp=drivesdk","description":"Flauta 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1wJN_cMmAjWXUkfkrxqc7vU05_Sup44jY/view?usp=drivesdk","description":"Flauta 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1Ub5T59ZgPV1hJvedu_oV2SACcm-f17Z1/view?usp=drivesdk","description":"Oboe 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1Ub5T59ZgPV1hJvedu_oV2SACcm-f17Z1/view?usp=drivesdk","description":"Oboe 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1WH1iqaEnGWvGIkxrhCYpELThSdF8DYN_/view?usp=drivesdk","description":"Perc Timbal - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1FfQb4Hh5wxOZZ9xrfMibTT5IuXJ6-x5P/view?usp=drivesdk","description":"SCORE - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1nczxphfwZVR6EnjExmzmZSQNpfOejiJQ/view?usp=drivesdk","description":"Trombón 1y2y3 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1nczxphfwZVR6EnjExmzmZSQNpfOejiJQ/view?usp=drivesdk","description":"Trombón 1y2y3 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1nczxphfwZVR6EnjExmzmZSQNpfOejiJQ/view?usp=drivesdk","description":"Trombón 1y2y3 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1DsvWouRW9_WdksVs6B58kWeUS2Tob_Kw/view?usp=drivesdk","description":"Trompeta D 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"},{"url":"https://drive.google.com/file/d/17EQh7y4d1l9W2B1jlErIbkhXYkMZMYlQ/view?usp=drivesdk","description":"Trompeta Bb 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1DsvWouRW9_WdksVs6B58kWeUS2Tob_Kw/view?usp=drivesdk","description":"Trompeta D 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"},{"url":"https://drive.google.com/file/d/17EQh7y4d1l9W2B1jlErIbkhXYkMZMYlQ/view?usp=drivesdk","description":"Trompeta Bb 1y2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1agMfLWlpq4uU3IYwbHHqzmzlzitFRhMl/view?usp=drivesdk","description":"Viola - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1AHoqYF7OePB6HYwpNzrNzbY711SGP60H/view?usp=drivesdk","description":"Violín 1 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/121cCBVNuEBHWQe9HT_9lZjpUzg8vf95m/view?usp=drivesdk","description":"Violín 2 - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín Solo', '[{"url":"https://drive.google.com/file/d/1pvt0RArCWnJGsfr1dAoA6KLiVve9NmO6/view?usp=drivesdk","description":"Violín Solo - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Y3FX6yJMlYn_mCn5yPU3gsv4M6EaKfdV/view?usp=drivesdk","description":"Violoncello y Contrabajo - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Y3FX6yJMlYn_mCn5yPU3gsv4M6EaKfdV/view?usp=drivesdk","description":"Violoncello y Contrabajo - op.22. Concierto para Violín Nro 2 en Re menor - Wieniawski, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Concierto para Violín Nro 2 en Re menor';
  END IF;

  -- Concierto para Oboe en Do Mayor
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Concierto para Oboe en Do Mayor'
      AND o.observaciones = 'Para acomodar. Alexander Gagarinov, CC BY-NC 3.0. Incluye oboe solo de la misma edición.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Concierto para Oboe en Do Mayor',
      NULL,
      1777,
      NULL,
      'Oficial',
      'Para acomodar. Alexander Gagarinov, CC BY-NC 3.0. Incluye oboe solo de la misma edición.',
      'Ob - 0.2.0.0 - 2.0.0.0 - Str',
      'https://drive.google.com/open?id=1ufCQSQMST2n1gL0IA37aozIsBLg_l0To'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Mozart_Wolfgang_Amadeus, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/12Fgde_fNUqsHM2HWWjyYV9de8eH9SHB2/view?usp=drivesdk","description":"Corno 1y2 - K. 314. Concierto para Oboe en Do Mayor - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/12Fgde_fNUqsHM2HWWjyYV9de8eH9SHB2/view?usp=drivesdk","description":"Corno 1y2 - K. 314. Concierto para Oboe en Do Mayor - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1w8HVqDZIBTZ0lxWUDA70-5WTNwAm56cf/view?usp=drivesdk","description":"Oboe 1 - K. 314. Concierto para Oboe en Do Mayor - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1tp0I4nlcZ3GwUvqPjMTCvBxasdY0_Gjl/view?usp=drivesdk","description":"Oboe 2 - K. 314. Concierto para Oboe en Do Mayor - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe Solo', '[{"url":"https://drive.google.com/file/d/1RuTSVqvAj13Ts-LdDqf-XDUkJ1SrS3bK/view?usp=drivesdk","description":"Oboe Solo - K. 314. Concierto para Oboe en Do Mayor - Mozart, W.A.pdf"}]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1tRinBG7p_lSvQ9w7G07LegYmxJKAI2EO/view?usp=drivesdk","description":"SCORE - K. 314. Concierto para Oboe en Do Mayor - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1N4yZ9JNp4xXJ947DIn9VnnPDaB8TAL3R/view?usp=drivesdk","description":"Viola - K. 314. Concierto para Oboe en Do Mayor - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/10KWZ8TLnxtR3WUgMx_EX7hHobW0ysr5p/view?usp=drivesdk","description":"Violín 1 - K. 314. Concierto para Oboe en Do Mayor - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1NX45-_xr6i4Y5ebkvl0DDYw4YXq4q9QU/view?usp=drivesdk","description":"Violín 2 - K. 314. Concierto para Oboe en Do Mayor - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1NIXzF_47yp2JZw8cc0j_Cn_NBsw6j_oB/view?usp=drivesdk","description":"Violoncello y Contrabajo - K. 314. Concierto para Oboe en Do Mayor - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1NIXzF_47yp2JZw8cc0j_Cn_NBsw6j_oB/view?usp=drivesdk","description":"Violoncello y Contrabajo - K. 314. Concierto para Oboe en Do Mayor - Mozart, W.A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Concierto para Oboe en Do Mayor';
  END IF;

  -- Concierto para Viola en Do menor
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Concierto para Viola en Do menor'
      AND o.observaciones = 'Para acomodar. Orquesta: Salabert 1947 (IMSLP-EU, Non-PD US). Viola solo: Senart/Peters IMSLP #29902, otra edición.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Concierto para Viola en Do menor',
      _id_comp_Casadesus_Henri,
      1947,
      NULL,
      'Oficial',
      'Para acomodar. Orquesta: Salabert 1947 (IMSLP-EU, Non-PD US). Viola solo: Senart/Peters IMSLP #29902, otra edición.',
      'Va - 2.1.0.2 - 2.2.0.0 - Timp - Str',
      'https://drive.google.com/open?id=1UWlL42e2HqA6G0Ko4Q8Z7Mjlh-_rk3Tl'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bach_Johann_Christian, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_comp_Casadesus_Henri, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_comp_Casadesus_Henri
    );
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1kn7qD0QMGb8iwLqsXlE_2ovy3pqHQjZE/view?usp=drivesdk","description":"Contrabajo - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1qzfMiR2mGl1ffBqPHYayKTYzy1haO4cH/view?usp=drivesdk","description":"Corno F 1y2 - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1qzfMiR2mGl1ffBqPHYayKTYzy1haO4cH/view?usp=drivesdk","description":"Corno F 1y2 - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1wWtxAcXUm2e5wd5auSN0ntZ5m6zFUC5Z/view?usp=drivesdk","description":"Fagot 1y2 - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1wWtxAcXUm2e5wd5auSN0ntZ5m6zFUC5Z/view?usp=drivesdk","description":"Fagot 1y2 - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1oiRAS0xYOVazMPBUY-0-Qn1PUIH6xZsS/view?usp=drivesdk","description":"Flauta 1y2 - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1oiRAS0xYOVazMPBUY-0-Qn1PUIH6xZsS/view?usp=drivesdk","description":"Flauta 1y2 - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1Y02fgU1N6FzKDohxy5RTl4-GVkPJBfR5/view?usp=drivesdk","description":"Oboe - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1JlNlP6DBQdo7gidogIJ8uyKUkjPLu3SD/view?usp=drivesdk","description":"Perc Timbal - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1SqFv7bD-hWOcDQZMPkHsXyyrj-JWyauR/view?usp=drivesdk","description":"SCORE - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1IVzlvcOQQt9huSZW6bdKc1ArIYLa9J8M/view?usp=drivesdk","description":"Trompeta 1y2 - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1IVzlvcOQQt9huSZW6bdKc1ArIYLa9J8M/view?usp=drivesdk","description":"Trompeta 1y2 - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1dJsYx2Z3UW6MeazgsPpu97QEXUSZgAQV/view?usp=drivesdk","description":"Viola - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola Solo', '[{"url":"https://drive.google.com/file/d/15nxib7m1p563qE0_RUDfdSdOv0nI7C0D/view?usp=drivesdk","description":"Viola Solo - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/15k1DRlkTI5lgsr9Sde_WSRnvq8HJklbJ/view?usp=drivesdk","description":"Violín 1 - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1BLX08cLptlk1EqMD0sqzkG_7uQiSIUvw/view?usp=drivesdk","description":"Violín 2 - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1RJIxdSx6ouUCjhWmbINNBpu8Y46aTQYS/view?usp=drivesdk","description":"Violoncello - Concierto para Viola en Do menor - Casadesus, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Concierto para Viola en Do menor';
  END IF;

END $$;
