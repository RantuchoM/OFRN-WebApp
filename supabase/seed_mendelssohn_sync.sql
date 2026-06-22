-- Mendelssohn — Sinfonía Nro 1 en Do Mayor, op.11 → obra 3535 (insert ejecutado 2026-06-22)
-- Generado: 2026-06-22

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Mendelssohn_Bartholdy_F_lix bigint;
BEGIN
  SELECT id INTO _id_comp_Mendelssohn_Bartholdy_F_lix FROM compositores WHERE apellido = 'Mendelssohn-Bartholdy' AND (nombre = 'Félix' OR (nombre IS NULL AND 'Félix' IS NULL)) LIMIT 1;
  IF _id_comp_Mendelssohn_Bartholdy_F_lix IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Mendelssohn-Bartholdy', 'Félix') RETURNING id INTO _id_comp_Mendelssohn_Bartholdy_F_lix;
  END IF;

  -- Sinfonía Nro 1 en Do Mayor, op.11
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Sinfonía Nro 1 en Do Mayor, op.11'
      AND o.observaciones = 'Para acomodar — Mendelssohn-Bartholdy, F. - Sinfonía Nro 1 en Do Mayor, op.11'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Sinfonía Nro 1 en Do Mayor, op.11',
      NULL,
      1824,
      1779,
      'Oficial',
      'Para acomodar — Mendelssohn-Bartholdy, F. - Sinfonía Nro 1 en Do Mayor, op.11',
      '2.2.2.2 - 2.2.0.0 - Timp - Str',
      'https://drive.google.com/open?id=1xDSqCR9Y7NPifvrD84ZpXMi_ns6YJFqR'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Mendelssohn_Bartholdy_F_lix, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1PCvGG8w1rmgSawKDRBA5PYGAyMle1U0s/view?usp=drivesdk","description":"Clarinete Bb 1 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1zVf9A1q6vXXSVjBrz2y0WtEtDKtM0KlV/view?usp=drivesdk","description":"Clarinete Bb 2 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1-GP5vuTYtUmLXD8W__V2iY_6LOiy7sJk/view?usp=drivesdk","description":"Contrabajo - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1tU3M5YIIUwYQ3ABOi8UxN0Ah5C4Xfuli/view?usp=drivesdk","description":"Corno F 1 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/18kdVCbf5LecBP8HgmCr4CcfSIsKOQfFU/view?usp=drivesdk","description":"Corno F 2 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1a3tapvPMprzGSD3AqVH_-eqN6jl7BveT/view?usp=drivesdk","description":"Fagot 1 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1Mq1qTO81bWtvBE7ZU6akLgtdUzZSNgOT/view?usp=drivesdk","description":"Fagot 2 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/164buC0mkNr3io8B0Lb0pGm_FN1tTIC91/view?usp=drivesdk","description":"Flauta 1 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/10qi5gf_dQJiON7b1DIl_wwFZRPo8Junq/view?usp=drivesdk","description":"Flauta 2 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1nmQ4RKlvx-wPC77RpYdbgRCNbt0qoilB/view?usp=drivesdk","description":"Oboe 1 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1nl9v7yK19XhzuWybVaYPw4cPCjsmBnqP/view?usp=drivesdk","description":"Oboe 2 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1soGZvp9pqKEn7VIW8wHJFGZpsU_uRDPZ/view?usp=drivesdk","description":"Perc Timbal - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1cUO4eK15F5cct1f8UAWPvF2-rDUBNohB/view?usp=drivesdk","description":"SCORE - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1MI2CBxhczn4KgexnMrEgBqtc0OZszIEK/view?usp=drivesdk","description":"Trompeta 1 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1vittGNSuxtqDFilhq4RoP4QXuIrQ-727/view?usp=drivesdk","description":"Trompeta 2 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1O_UMKpDRf-nfUCxTWcGm7Bhp6rsGGhh8/view?usp=drivesdk","description":"Viola - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1AM65nGDx8UNE85-U6qBU75Hb4k2iIazD/view?usp=drivesdk","description":"Violín 1 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1xA2pTNR8bPTPBY-938pGj8_nziq5uG-e/view?usp=drivesdk","description":"Violín 2 - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ehg9hbR1V4WaJ-F5BwtrIO03wPQbutk0/view?usp=drivesdk","description":"Violoncello - op.11. Sinfonía Nro 1 en Do Mayor, op.11 - Mendelssohn-Bartholdy, F.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Sinfonía Nro 1 en Do Mayor, op.11';
  END IF;

END $$;
