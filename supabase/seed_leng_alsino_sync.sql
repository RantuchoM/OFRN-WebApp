-- Leng — La muerte de Alsino → catálogo (Para acomodar)
-- Generado: 2026-10-27

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Leng_Alfonso bigint;
BEGIN
  SELECT id INTO _id_comp_Leng_Alfonso FROM compositores WHERE apellido = 'Leng' AND (nombre = 'Alfonso' OR (nombre IS NULL AND 'Alfonso' IS NULL)) LIMIT 1;
  IF _id_comp_Leng_Alfonso IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Leng', 'Alfonso') RETURNING id INTO _id_comp_Leng_Alfonso;
  END IF;

  -- <p>Poema sinfónico La muerte de Alsino</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Poema sinfónico La muerte de Alsino</p>'
      AND o.observaciones = 'Para acomodar — Leng, A. - La muerte de Alsino. Poema sinfónico (1920–21; estreno Santiago 1922). Partes ya separadas (sin split IMSLP). Trombón bajo o Tuba → Tuba.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Poema sinfónico La muerte de Alsino</p>',
      NULL,
      1920,
      930,
      'Oficial',
      'Para acomodar — Leng, A. - La muerte de Alsino. Poema sinfónico (1920–21; estreno Santiago 1922). Partes ya separadas (sin split IMSLP). Trombón bajo o Tuba → Tuba.',
      '4.3.3.2 - 4.3.3.1 - Timp.+3 - Hp - Str',
      'https://drive.google.com/open?id=1-egbR4saDe6Lj7eQYyGZzBcPc4Kks-rV'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Leng_Alfonso, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1CBr5gWpz3OxPmhktya11uWVbT0768FEg/view?usp=drivesdk","description":"Arpa - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1R217YGPhY5_E2AxU9K-yNWQp3IqazyO8/view?usp=drivesdk","description":"Clarinete Bajo - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/177m3I9R-JazKtuqCsnLlM9wyHLb3aMgz/view?usp=drivesdk","description":"Clarinete Bb 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/177m3I9R-JazKtuqCsnLlM9wyHLb3aMgz/view?usp=drivesdk","description":"Clarinete Bb 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1bvd0U27FwIVxNhlXCae6psabd6Co16W6/view?usp=drivesdk","description":"Contrabajo - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/11NmXrxNJoPQGYKdO1u78wSmXAeEaOV-O/view?usp=drivesdk","description":"Corno F 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/11NmXrxNJoPQGYKdO1u78wSmXAeEaOV-O/view?usp=drivesdk","description":"Corno F 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1FDM95ACHWLATs9DIe6SpIr3g7DhdKUbK/view?usp=drivesdk","description":"Corno F 3y4 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1FDM95ACHWLATs9DIe6SpIr3g7DhdKUbK/view?usp=drivesdk","description":"Corno F 3y4 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1lGO5M24PzE_slkBIG3UO8QcVffT0SJnC/view?usp=drivesdk","description":"Fagot 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1lGO5M24PzE_slkBIG3UO8QcVffT0SJnC/view?usp=drivesdk","description":"Fagot 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1pZtBHMXR14PVwrieCgJh11ifJyFNjHYz/view?usp=drivesdk","description":"Fl Piccolo - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1ZWXUZkiix4t0Xs1BU0wEf9rAfZWyz1Vy/view?usp=drivesdk","description":"Flauta 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1ZWXUZkiix4t0Xs1BU0wEf9rAfZWyz1Vy/view?usp=drivesdk","description":"Flauta 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 3', '[{"url":"https://drive.google.com/file/d/19EgtMUtsPGotJQC7WBRmLT8CpKsV39G6/view?usp=drivesdk","description":"Flauta 3 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1jTevM_xdz1uEFHdvkuVTu7GsATa5rW7c/view?usp=drivesdk","description":"Ob EH - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1CUr5kTogXnNR_pjZOmvVPfFV-grBalv3/view?usp=drivesdk","description":"Oboe 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1CUr5kTogXnNR_pjZOmvVPfFV-grBalv3/view?usp=drivesdk","description":"Oboe 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/14P83Bstk3usAXGs162Akv6a7cTNYCoLy/view?usp=drivesdk","description":"Perc Bombo - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Gong', '[{"url":"https://drive.google.com/file/d/1Zh9rmsnYkQp6BHYtkMLWClWnU3uySBvx/view?usp=drivesdk","description":"Perc Gong - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1ycSe1wadkRpqWze5WSX7Gyxfppwp6Wvs/view?usp=drivesdk","description":"Perc Platillo - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/19FH6oQQAQeScKF-kyljgqBAJlxkbYTmG/view?usp=drivesdk","description":"Perc Timbal - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1O2MhVXPJIxmNRvLo8rL_fxnebWSk8nzG/view?usp=drivesdk","description":"SCORE - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1F-qmq2_RlThEYQUbBEBQS9ERTp8hg7lD/view?usp=drivesdk","description":"Trombón 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1F-qmq2_RlThEYQUbBEBQS9ERTp8hg7lD/view?usp=drivesdk","description":"Trombón 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1H23Q87OC2bBKzGBVAxl4F73fZnyZsLIp/view?usp=drivesdk","description":"Trombón 3 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1mglkQlnMoqxfl1w-PUWYAgDgE9XgFRv_/view?usp=drivesdk","description":"Trompeta C 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1mglkQlnMoqxfl1w-PUWYAgDgE9XgFRv_/view?usp=drivesdk","description":"Trompeta C 1y2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta C 3', '[{"url":"https://drive.google.com/file/d/1uvXXQcSHOJAYMNipsgmo3Jq2KfVB3Ut7/view?usp=drivesdk","description":"Trompeta C 3 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1wmOlHhQy250v6J_j2EPBqBvpqZ-ZYsrO/view?usp=drivesdk","description":"Tuba - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1-AE-R3m-7gBXC9mTZkEf_jEaG9FgA_UF/view?usp=drivesdk","description":"Viola - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1YVUVsueiT9pfiigO28AdusBIhQibB7eV/view?usp=drivesdk","description":"Violín 1 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/19kNE5C-HzNt7fHGkQ5V4ROwPIwUpFj85/view?usp=drivesdk","description":"Violín 2 - La muerte de Alsino - Leng, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1cXNn4mtwYvq4dpnJZ9XuFm5q7DdozdpW/view?usp=drivesdk","description":"Violoncello - La muerte de Alsino - Leng, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Poema sinfónico La muerte de Alsino</p>';
  END IF;

END $$;
