-- Holst — Beni Mora, Op. 29 Nro. 1 (catálogo; Para acomodar)
-- Generado: 2026-10-27

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Holst_Gustav bigint;
BEGIN
  SELECT id INTO _id_comp_Holst_Gustav FROM compositores WHERE apellido = 'Holst' AND (nombre = 'Gustav' OR (nombre IS NULL AND 'Gustav' IS NULL)) LIMIT 1;
  IF _id_comp_Holst_Gustav IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Holst', 'Gustav') RETURNING id INTO _id_comp_Holst_Gustav;
  END IF;

  -- <p>Beni Mora (Suite oriental en mi menor), Op. 29 Nro. 1</p><div>&nbsp; I. First Dance</div><div>&nbsp; II. Second Dance</div><div>&nbsp; III. Finale. In the Street of the Ouled Naïls</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Beni Mora (Suite oriental en mi menor), Op. 29 Nro. 1</p><div>&nbsp; I. First Dance</div><div>&nbsp; II. Second Dance</div><div>&nbsp; III. Finale. In the Street of the Ouled Naïls</div>'
      AND o.observaciones = 'Para acomodar — Holst, G. - Beni Mora, Op. 29 Nro. 1'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Beni Mora (Suite oriental en mi menor), Op. 29 Nro. 1</p><div>&nbsp; I. First Dance</div><div>&nbsp; II. Second Dance</div><div>&nbsp; III. Finale. In the Street of the Ouled Naïls</div>',
      NULL,
      1910,
      NULL,
      'Oficial',
      'Para acomodar — Holst, G. - Beni Mora, Op. 29 Nro. 1',
      '3.3.2.2 - 4.3.3.1 - Timp.+1 - Hp - Str',
      'https://drive.google.com/open?id=175I0QA_nwzGtHCgghTQjVpz9Vglpi7HP'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Holst_Gustav, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/11bKZz94qoOk71FM2hhWVGLMngHQS4NTH/view?usp=drivesdk","description":"Arpa - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/1T9SS23ibxaOEXXNl8leruev49TZT6BD7/view?usp=drivesdk","description":"Clarinete A 1 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/1iSw1Q0wgr3cNkoxon7lJSmQKQoz4yu6y/view?usp=drivesdk","description":"Clarinete A 2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1dze6fGLCHpjJQO9uhKtVJ99d3tSEE_Eg/view?usp=drivesdk","description":"Contrabajo - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1x-0OksN_uWPBbaeLgxopGoy1djNaWnN3/view?usp=drivesdk","description":"Corno F 1y2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1x-0OksN_uWPBbaeLgxopGoy1djNaWnN3/view?usp=drivesdk","description":"Corno F 1y2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1lTHepSDsBWtBNa1c0WhHCpKJJf56OY-l/view?usp=drivesdk","description":"Corno F 3y4 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1lTHepSDsBWtBNa1c0WhHCpKJJf56OY-l/view?usp=drivesdk","description":"Corno F 3y4 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1IcVyuqCzo02meTQ9fJH9FBBhpt9ERlKG/view?usp=drivesdk","description":"Fagot 1y2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1IcVyuqCzo02meTQ9fJH9FBBhpt9ERlKG/view?usp=drivesdk","description":"Fagot 1y2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1Wb1r7gjb_uCdQUyAng41A3Zs78WRWTf0/view?usp=drivesdk","description":"Fl Piccolo - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1G84wOlO-M3EBl2Jer8Zsz8by_puy-8da/view?usp=drivesdk","description":"Flauta 1 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1y9nJCIk9o9tcXe5zrfP63qCusgTPijTs/view?usp=drivesdk","description":"Flauta 2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1gwx4zKrbRXg4W_17SRu8ByOrSWanR3Wv/view?usp=drivesdk","description":"Ob EH - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1eSj6jkIKApvggsGdWZv5Xyd5MglhIeuP/view?usp=drivesdk","description":"Oboe 1 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/18oEXjAM0T5L1kUZSB4xUAkqIz0oU36t4/view?usp=drivesdk","description":"Oboe 2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1oJf_a06LryVOJ4tRBcwYn6lDQg55u-rg/view?usp=drivesdk","description":"Perc Percusión - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1IQGkbDWKvJKtJjdT3_4ZORftvMJ_GPGj/view?usp=drivesdk","description":"Perc Timbal - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1p2pvj4DMyqlEpSVpgrM63m7Ullc31wh2/view?usp=drivesdk","description":"SCORE - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1Exs7gYjueVxhkOgy5LcM6da2JweAvqgj/view?usp=drivesdk","description":"Trombón 1y2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1Exs7gYjueVxhkOgy5LcM6da2JweAvqgj/view?usp=drivesdk","description":"Trombón 1y2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1HT2ilVWvQXaCGRb0uHprHmQZGEAM2g9F/view?usp=drivesdk","description":"Trombón 3 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1MWs8G7DHuIpJausF2yKfzbgw2lhpp3we/view?usp=drivesdk","description":"Trompeta A 1y2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1MWs8G7DHuIpJausF2yKfzbgw2lhpp3we/view?usp=drivesdk","description":"Trompeta A 1y2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta A 3', '[{"url":"https://drive.google.com/file/d/1HWW9W345kW0KlIKK4Tjjc6CqtZZWXyL9/view?usp=drivesdk","description":"Trompeta A 3 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1iX3LOnfeN3R1gfoV5OviKKY3pVYgvR-b/view?usp=drivesdk","description":"Tuba - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1VI2Swe3tAcfnH3l280Q6bMpSfr-QvUji/view?usp=drivesdk","description":"Viola - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1xQetmNguu7PcNg2tc6i3rZ2DNMhd83ZX/view?usp=drivesdk","description":"Violín 1 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1W5lUxAYT8AJ8K_zYIfWq0UpSKiXrCrYC/view?usp=drivesdk","description":"Violín 2 - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1FamzT1ygMzdFHSia95NF2J63ZVB9GN38/view?usp=drivesdk","description":"Violoncello - op.29 nro.1. Beni Mora - Holst, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Beni Mora (Suite oriental en mi menor), Op. 29 Nro. 1</p><div>&nbsp; I. First Dance</div><div>&nbsp; II. Second Dance</div><div>&nbsp; III. Finale. In the Street of the Ouled Naïls</div>';
  END IF;

END $$;
