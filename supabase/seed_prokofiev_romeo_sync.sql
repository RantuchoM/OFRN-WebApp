-- Prokofiev, S — Romeo y Julieta Suite n°1
-- Generado: 2026-09-21

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Prokofiev_Sergei bigint;
BEGIN
  SELECT id INTO _id_comp_Prokofiev_Sergei FROM compositores WHERE apellido = 'Prokofiev' AND (nombre = 'Sergei' OR (nombre IS NULL AND 'Sergei' IS NULL)) LIMIT 1;
  IF _id_comp_Prokofiev_Sergei IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Prokofiev', 'Sergei') RETURNING id INTO _id_comp_Prokofiev_Sergei;
  END IF;

  -- Romeo y Julieta Suite n°1
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Romeo y Julieta Suite n°1'
      AND o.observaciones = 'Para acomodar — Prokofiev, S. - Romeo y Julieta Suite n°1'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Romeo y Julieta Suite n°1',
      NULL,
      1936,
      NULL,
      'Oficial',
      'Para acomodar — Prokofiev, S. - Romeo y Julieta Suite n°1',
      '3.3.3.3 - 4.3.3.1 - Timp.+5 - Hp - Key - Str + Saxofón',
      'https://drive.google.com/open?id=1Jnq3qC2d88V_A4xirKwBc5o74biC-UwL'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Prokofiev_Sergei, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1dvMA-hzRwwzmVdf1VD5mT0QpsSfbr_jL/view?usp=drivesdk","description":"Arpa - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1gJE5ScAGXRRTh90ohlcUdli2dXpCPJYH/view?usp=drivesdk","description":"Clarinete Bajo - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1SfAv7pa_IAvL1J8nTMAG59EuH4et6gRL/view?usp=drivesdk","description":"Clarinete Bb 1 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1M9TrTPtKXoxc70IK8Z5OEy_-rr6zccg5/view?usp=drivesdk","description":"Clarinete Bb 2 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/15OiFV42W9ygSLFCTiKBTXD1ze7I9N6OM/view?usp=drivesdk","description":"Contrabajo - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"},{"url":"https://drive.google.com/file/d/1R5WDhMmmFb1YirGN6O2AAPkuqNYd5Za_/view?usp=drivesdk","description":"Contrabajo - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S (sin arcos).pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1yX-HLnAdjkKo59GQAFAb3g0eUXufWFnp/view?usp=drivesdk","description":"Contrafagot - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1RzpBCqaGYQiCTU-VAcMrK1xJnVTRKHs2/view?usp=drivesdk","description":"Corno F 1 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1-0Kx5x2OzJMsTWnB69ed1AkQWDg6ppcf/view?usp=drivesdk","description":"Corno F 2 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1XwJRM2hz37jsxw4rV1NlxaMdj0_x2eQO/view?usp=drivesdk","description":"Corno F 3 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1dU_NUbsz4fJ9pU3HhgOVJMu3lPbT35Hb/view?usp=drivesdk","description":"Corno F 4 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1UbqJtdKs1M_O8VSHqnwvsZz36ZscUOF0/view?usp=drivesdk","description":"Fagot 1 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1SNzhHZST1C7scZ39wVG4nke3HPDHV-wz/view?usp=drivesdk","description":"Fagot 2 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1endS7_Te11V6AZSQEV9-DpaTg52_l8hW/view?usp=drivesdk","description":"Fl Piccolo - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1UGF1pI8wzj8NYR_ZDDLmUl1AfzE4ZsGp/view?usp=drivesdk","description":"Flauta 1 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1Emxt1ykkweqF7cMhpk9ApYE1-iLWwohR/view?usp=drivesdk","description":"Flauta 2 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1fcYhm-B_BTs55zp_RDkdqDFk_3mMNikd/view?usp=drivesdk","description":"Ob EH - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1Whkcxn5Hj1iYhcjv6zTRnPGI4iQ4oeHw/view?usp=drivesdk","description":"Oboe 1 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/15Gy2mbX1-6HANSO-hYNmyMyTK6tkqwTk/view?usp=drivesdk","description":"Oboe 2 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1tnsLGrE_HGRzpequRpGIiglLGiwySZ4Q/view?usp=drivesdk","description":"Perc Bombo - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1FZPZ1K_QP2LwZAYXOr-c8bO4sBYnjdN2/view?usp=drivesdk","description":"Perc Platillo - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/1lC3PDTmOPsna3n5YX67iEnrwnPfyCcGv/view?usp=drivesdk","description":"Perc Tambor - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1V-ssnPgWsO5i9_w2hpUtbYvmxFtEi7CY/view?usp=drivesdk","description":"Perc Timbal - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1woHvR-RW4hBHcGlloECyR_Sxbl0C8N3Z/view?usp=drivesdk","description":"Perc Triángulo - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Xilófono', '[{"url":"https://drive.google.com/file/d/1cbj9VC3zzpNvsr5f0ooCupcGhmT05BFT/view?usp=drivesdk","description":"Perc Xilófono - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1HLp0wOr-s8LHMTZaKn_GPpTwvtTIOrAw/view?usp=drivesdk","description":"Piano - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1G2fZZphdeFgIrb_AIamO9YphgoN5pvcC/view?usp=drivesdk","description":"Saxo Tenor - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1j0ws6SunHTKLML6w5V1p7-TmzRxlh1oG/view?usp=drivesdk","description":"SCORE - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1_b8ZD3NR5fy1e6HZ1iKQzFO1h18Lk7On/view?usp=drivesdk","description":"Trombón 1 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/17N3SKAyYCw070RyY7fnC8vuN9btpTbTR/view?usp=drivesdk","description":"Trombón 2 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/12d1VrdaunTnOIKPSMWFyRGXVC3tUG7C1/view?usp=drivesdk","description":"Trombón 3 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1EFFiDp18lNQzxoFnglUKdgCG-z4h6vYy/view?usp=drivesdk","description":"Trompeta 1 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1DwavGxwShmAY6_3a1ULhYDGTsH6_7l4u/view?usp=drivesdk","description":"Trompeta 2 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Corneta', '[{"url":"https://drive.google.com/file/d/1k_W_GxPgP94L6Y9lO2ZcFHleXYHdizB8/view?usp=drivesdk","description":"Trompeta Corneta - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1LnQWiQN2p3eo_IwBbYS1WvjY6ic6cZmq/view?usp=drivesdk","description":"Tuba - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/11a-6PMAJKAufVcKjoenmRLTu-x9vqwME/view?usp=drivesdk","description":"Viola - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"},{"url":"https://drive.google.com/file/d/1M69bR9pSH7V__JqRHZp70CCatCuZMJeq/view?usp=drivesdk","description":"Viola - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S (sin arcos).pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Rn-pBkde7hp5D3v9sdly1py45M3Pnaro/view?usp=drivesdk","description":"Violín 1 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"},{"url":"https://drive.google.com/file/d/1xPPGQOnM71caG2LxbtlGNg1a4m7N8PCz/view?usp=drivesdk","description":"Violín 1 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S (sin arcos).pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1gUtAQDzPqY0LO3yyAEtL8W5YnPpjKRg7/view?usp=drivesdk","description":"Violín 2 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"},{"url":"https://drive.google.com/file/d/1ngb7adXGNsGLyIjZT2auLYAswHnhadQS/view?usp=drivesdk","description":"Violín 2 - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S (sin arcos).pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1uahcLzRLgT_mrEVDtV9v4RHTR0IJaSrC/view?usp=drivesdk","description":"Violoncello - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S.pdf"},{"url":"https://drive.google.com/file/d/1W-p1dsXq0WUyVFNt8bSKOfXcl-o5SQ0Q/view?usp=drivesdk","description":"Violoncello - op.64a. Romeo y Julieta Suite n°1 - Prokofiev, S (sin arcos).pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Romeo y Julieta Suite n°1';
  END IF;

END $$;

-- Prokofiev, S — Romeo y Julieta Suite n°2
-- Generado: 2026-09-21

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Prokofiev_Sergei bigint;
BEGIN
  SELECT id INTO _id_comp_Prokofiev_Sergei FROM compositores WHERE apellido = 'Prokofiev' AND (nombre = 'Sergei' OR (nombre IS NULL AND 'Sergei' IS NULL)) LIMIT 1;
  IF _id_comp_Prokofiev_Sergei IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Prokofiev', 'Sergei') RETURNING id INTO _id_comp_Prokofiev_Sergei;
  END IF;

  -- Romeo y Julieta Suite n°2
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Romeo y Julieta Suite n°2'
      AND o.observaciones = 'Para acomodar — Prokofiev, S. - Romeo y Julieta Suite n°2'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Romeo y Julieta Suite n°2',
      NULL,
      1936,
      NULL,
      'Oficial',
      'Para acomodar — Prokofiev, S. - Romeo y Julieta Suite n°2',
      '3.3.3.3 - 4.3.3.1 - Timp.+3 - Hp - Key - Str + Saxofón',
      'https://drive.google.com/open?id=1RkiXvhzCtAEwDYFCXSL8r_HkLrNCiGQ_'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Prokofiev_Sergei, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1ckKR1fOb5cr7XieRNOoQfobDh3aNUr8_/view?usp=drivesdk","description":"Arpa - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1huWKQx94-KEr8F9y4YingD6q2uR8Xcvj/view?usp=drivesdk","description":"Clarinete Bajo - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1CVYT-HRwYxXX9exebyvD4Eg_cUeDNfay/view?usp=drivesdk","description":"Clarinete Bb 1 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1B1RJm-7fbObwvA6NkRmn6mq-95Yogubo/view?usp=drivesdk","description":"Clarinete Bb 2 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/11h7TRkR8LArQ-F55IdjZJtsHlcGsUQr5/view?usp=drivesdk","description":"Contrabajo - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"},{"url":"https://drive.google.com/file/d/1KYAbNF9kvIKW-0krSGoAEj-cvxMF9Uu2/view?usp=drivesdk","description":"Contrabajo - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S (sin arcos).pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1a9THLgTslS3qdKAinZwZzwvYjKf3Hi9a/view?usp=drivesdk","description":"Contrafagot - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1_j4vWBKrnc3wxX79tuiY7GPv4HWByVjr/view?usp=drivesdk","description":"Corno F 1 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/14mEBHrW4PyCF5h5q2DLksMLbpS7WoJou/view?usp=drivesdk","description":"Corno F 2 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1_5jcKRPZYyXes_p8mP1nuGw8MDGUI5oZ/view?usp=drivesdk","description":"Corno F 3 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1-_JEbmWOY15y6krHt2CzdE6jE_0wsjrr/view?usp=drivesdk","description":"Corno F 4 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1KUSbFkLHADn3b5rf_wiQFzPa1aiqgT31/view?usp=drivesdk","description":"Fagot 1 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/13GINBO0Z4o1HkUTe5mA1NT7L8Kft-SY4/view?usp=drivesdk","description":"Fagot 2 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/17fKSdL9qw9PmufTM6YZQrhUQt6PLzz8p/view?usp=drivesdk","description":"Fl Piccolo - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1vkxl92_ZCO9eZIoaPSzyDQPGbNxmv_d9/view?usp=drivesdk","description":"Flauta 1 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1ABfMokxbt9oPCqHTAdrzg5ECY8eMDpf6/view?usp=drivesdk","description":"Flauta 2 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1b7fTB_unZ7dizFhUaCdl4YRhXcGT7vVw/view?usp=drivesdk","description":"Ob EH - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1s2InEtsuBbf608DJ3BZXIvV_OAT_9oei/view?usp=drivesdk","description":"Oboe 1 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1qtiZ_CppF7pVAMrGfbxwD_QMqvnfDht3/view?usp=drivesdk","description":"Oboe 2 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[{"url":"https://drive.google.com/file/d/18yrG82mBQu4Kt5WB0QknoIvrK9uXpe5Y/view?usp=drivesdk","description":"Perc Percusión 1 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/1e8DCuEIf-lusBkFU15UPPCm24r3lfmLt/view?usp=drivesdk","description":"Perc Percusión 2 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/1QYlzIjkmAQPv9VW5R4LLB6rTL1hBwWam/view?usp=drivesdk","description":"Perc Tambor - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1KeNiB11ZpAU8ABnlCSD0HMN00IR7e00F/view?usp=drivesdk","description":"Perc Timbal - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1nUYY-jNfQvz7yk6BogtI2EIMvxp54fhL/view?usp=drivesdk","description":"Piano - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1l1kw5UyCubDTxaNdD5RrtWBeKnTH3aOF/view?usp=drivesdk","description":"Saxo Tenor - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1ojrA56jem-DpE8_01MKtbiq9UlahF8t5/view?usp=drivesdk","description":"SCORE - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1KTwPodGCXC2MK3xyfz_K1wcMqhd3t-CU/view?usp=drivesdk","description":"Trombón 1 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1x6y2Jq7fl1_Yaqs_h5qRZ4MF7TrQ2cC3/view?usp=drivesdk","description":"Trombón 2 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1O6Dsc6iJfYDRvtLQL-KmqwxIZgH2dwGR/view?usp=drivesdk","description":"Trombón 3 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1dvWHorpmaEJyftyC1ieMOGyHzqoQChTI/view?usp=drivesdk","description":"Trompeta 1 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/19yoe-SgEFbzNeVWg7rdFedCigpiIfGWm/view?usp=drivesdk","description":"Trompeta 2 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Corneta', '[{"url":"https://drive.google.com/file/d/1YLdPRpJegtTQqXa0fyhBTAaYVqFKvxIF/view?usp=drivesdk","description":"Trompeta Corneta - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1A3DmSaNONIM-XelUSHsDepTykeg5agKq/view?usp=drivesdk","description":"Tuba - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Fvxd6VEHzvEfsXaLuNQ_C3ea2yVbWDfu/view?usp=drivesdk","description":"Viola - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"},{"url":"https://drive.google.com/file/d/1Tw-ru45QOeQR3MIk96XaT7XW4eJI4amF/view?usp=drivesdk","description":"Viola - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S (sin arcos).pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1J57K5Izh09joPRq_JfHUrrS5E1l9pHTc/view?usp=drivesdk","description":"Violín 1 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"},{"url":"https://drive.google.com/file/d/12Rd40y3232QS1JXfOga6I3VhCvdy1Cwj/view?usp=drivesdk","description":"Violín 1 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S (sin arcos).pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1DPJo1ur84tBhWEDrOmmb5XVEuU6P-5bu/view?usp=drivesdk","description":"Violín 2 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"},{"url":"https://drive.google.com/file/d/10UKRB3ncmVFmcmu7Dzv95H8gPwW87YDP/view?usp=drivesdk","description":"Violín 2 - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S (sin arcos).pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Gz2D8nwW8irMprbffaVlvDu3VF-PlNXJ/view?usp=drivesdk","description":"Violoncello - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"},{"url":"https://drive.google.com/file/d/1HmvaGPhWyS3Ii2cCLvExJUtEwZUeHVye/view?usp=drivesdk","description":"Violoncello - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S (sin arcos).pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '17', 'Celesta', '[{"url":"https://drive.google.com/file/d/1nUYY-jNfQvz7yk6BogtI2EIMvxp54fhL/view?usp=drivesdk","description":"Celesta - op.64b. Romeo y Julieta Suite n°2 - Prokofiev, S.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Romeo y Julieta Suite n°2';
  END IF;

END $$;
