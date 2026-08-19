-- Bahiano: 16 arreglos sinfónicos de Bob Marley → Archivo + bloque gira 12
-- Generado: 2026-08-19

DO $$
DECLARE
  _id_programa bigint := 12;
  _block_id bigint;
  _orden_block int;
  _id_obra bigint;
  _id_marley bigint;
  _id_tag bigint;
BEGIN
  SELECT id INTO _id_marley FROM compositores
  WHERE apellido = 'Marley' AND (nombre = 'Bob' OR nombre IS NULL)
  LIMIT 1;
  IF _id_marley IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Marley', 'Bob') RETURNING id INTO _id_marley;
  END IF;

  SELECT id INTO _id_tag FROM palabras_clave WHERE tag = 'Bahiano' LIMIT 1;
  IF _id_tag IS NULL THEN
    INSERT INTO palabras_clave (tag) VALUES ('Bahiano') RETURNING id INTO _id_tag;
  END IF;

  SELECT id INTO _block_id
  FROM programas_repertorios
  WHERE id_programa = _id_programa AND nombre = 'Bahiano'
  LIMIT 1;

  IF _block_id IS NULL THEN
    SELECT COALESCE(MAX(orden), 0) + 1 INTO _orden_block
    FROM programas_repertorios WHERE id_programa = _id_programa;
    INSERT INTO programas_repertorios (id_programa, nombre, orden)
    VALUES (_id_programa, 'Bahiano', _orden_block)
    RETURNING id INTO _block_id;
  END IF;

  -- 1. One Drop
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'One Drop'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - One Drop. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'One Drop',
      1979,
      243,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - One Drop. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1UyZGKLYiTUPV92J_xaHeDONYOks2s0tX',
      '[{"drive_file_id":"1jW79LNGw_ANXWpboiWrvnC8URc9jsa6f","name":"AUDIO - One Drop (Orq REFE).mp3","url":"https://drive.google.com/file/d/1jW79LNGw_ANXWpboiWrvnC8URc9jsa6f/view?usp=drivesdk","label":"One Drop (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1CIbIeRsZ5lyRrphqPFkAzRVVomaKOwgz/view?usp=drivesdk","description":"Clarinete Bb 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1H_cvjp-mgqCNvlI-Keka91wghXfKGBo6/view?usp=drivesdk","description":"Corno F 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1A2iF7MKZpK343NUR1SiD7bBUDBnP4Cor/view?usp=drivesdk","description":"Flauta 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1PzPDXSoMNo7BRv3xvrpye4-N_oJSZ2HX/view?usp=drivesdk","description":"Oboe 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1Dcb9uvOty76gSacAqGMaS4bQd6XEh-ei/view?usp=drivesdk","description":"Perc Marimba - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1iVmD8wqpxj1m-7tl-vmwbHiOAWdmdGxb/view?usp=drivesdk","description":"Saxo Tenor - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1-9hWf2psTla0q2h7FfnBnQzoMw6NQ5WU/view?usp=drivesdk","description":"SCORE - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1-oI0EiCbs5NCLBMd9izW8Do1K7AIBZHa/view?usp=drivesdk","description":"Trombón 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1Idg0-IPMaArMKS6PQS8oG8PdDdf1pP-O/view?usp=drivesdk","description":"Trompeta 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1vk_mjY9MygHSfxzB_q07RsophLeaE9Jh/view?usp=drivesdk","description":"Viola - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Br0WEwZwJmT9K4iTkyXThHXqOr6TNAmm/view?usp=drivesdk","description":"Violín 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1pS1eShKOYd0ePm6LOXsBEBvodU5N6IUw/view?usp=drivesdk","description":"Violín 2 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1NUjVZqlc2Mij0HSynsUM59FVW-7cIfWJ/view?usp=drivesdk","description":"Violoncello - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/199oKSOLmm9XrFl5vo8awORzG46ymr0ME/view?usp=drivesdk","description":"Voz - One Drop - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1979, anio_composicion),
      duracion_segundos = COALESCE(243, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1UyZGKLYiTUPV92J_xaHeDONYOks2s0tX',
      audios = '[{"drive_file_id":"1jW79LNGw_ANXWpboiWrvnC8URc9jsa6f","name":"AUDIO - One Drop (Orq REFE).mp3","url":"https://drive.google.com/file/d/1jW79LNGw_ANXWpboiWrvnC8URc9jsa6f/view?usp=drivesdk","label":"One Drop (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1CIbIeRsZ5lyRrphqPFkAzRVVomaKOwgz/view?usp=drivesdk","description":"Clarinete Bb 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1H_cvjp-mgqCNvlI-Keka91wghXfKGBo6/view?usp=drivesdk","description":"Corno F 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1A2iF7MKZpK343NUR1SiD7bBUDBnP4Cor/view?usp=drivesdk","description":"Flauta 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1PzPDXSoMNo7BRv3xvrpye4-N_oJSZ2HX/view?usp=drivesdk","description":"Oboe 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1Dcb9uvOty76gSacAqGMaS4bQd6XEh-ei/view?usp=drivesdk","description":"Perc Marimba - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1iVmD8wqpxj1m-7tl-vmwbHiOAWdmdGxb/view?usp=drivesdk","description":"Saxo Tenor - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1-9hWf2psTla0q2h7FfnBnQzoMw6NQ5WU/view?usp=drivesdk","description":"SCORE - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1-oI0EiCbs5NCLBMd9izW8Do1K7AIBZHa/view?usp=drivesdk","description":"Trombón 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1Idg0-IPMaArMKS6PQS8oG8PdDdf1pP-O/view?usp=drivesdk","description":"Trompeta 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1vk_mjY9MygHSfxzB_q07RsophLeaE9Jh/view?usp=drivesdk","description":"Viola - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Br0WEwZwJmT9K4iTkyXThHXqOr6TNAmm/view?usp=drivesdk","description":"Violín 1 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1pS1eShKOYd0ePm6LOXsBEBvodU5N6IUw/view?usp=drivesdk","description":"Violín 2 - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1NUjVZqlc2Mij0HSynsUM59FVW-7cIfWJ/view?usp=drivesdk","description":"Violoncello - One Drop - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/199oKSOLmm9XrFl5vo8awORzG46ymr0ME/view?usp=drivesdk","description":"Voz - One Drop - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 1);
  ELSE
    UPDATE repertorio_obras SET orden = 1
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 2. So Much Trouble in the World
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'So Much Trouble in the World'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - So Much Trouble in the World. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'So Much Trouble in the World',
      1979,
      249,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - So Much Trouble in the World. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1nDrY9eUtO6oo2IMXddPKE5Gk7LYyB_Vi',
      '[{"drive_file_id":"1bDmRNgzAN63nhlWv6hM6aJbXEwI9Usgw","name":"AUDIO - So Much Trouble in the World (Orq REFE).mp3","url":"https://drive.google.com/file/d/1bDmRNgzAN63nhlWv6hM6aJbXEwI9Usgw/view?usp=drivesdk","label":"So Much Trouble in the World (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1vpM9bCZa5RlIW_92NUOPx0hmSxBGUs1e/view?usp=drivesdk","description":"Clarinete Bb 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1AqUMv-9GE1JCqVCS_swDaOt_GLKYtr1N/view?usp=drivesdk","description":"Corno F 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1cUXsOb-Ju5W-KcpggDBsB4bRu780uAtM/view?usp=drivesdk","description":"Flauta 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1gpTtb8CGOkr4XTfnUTYs7y0O7CrssDX6/view?usp=drivesdk","description":"Oboe 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/180R_hLIoU_rYMPMIQhnddc1c7RaotXjj/view?usp=drivesdk","description":"Perc Marimba - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/10pSWfDIClqeWenov0RKSRmXvq5rzg-qy/view?usp=drivesdk","description":"Saxo Tenor - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1KISXW_ApxUBlIjraehQuJSBBj7DoM1NC/view?usp=drivesdk","description":"SCORE - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1_Xf3BAbVNQ8xy_2eadjWddO4PGgMGWTV/view?usp=drivesdk","description":"Trombón 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1gusw9jTPmyCg2KDm68QXxVHeAp55_aB7/view?usp=drivesdk","description":"Trompeta 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ewGjlW40TCM70UFq957YsWBbYbtXYeCi/view?usp=drivesdk","description":"Viola - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1RZ-OpLPwpF4uYxqL-0su4fCffS_PBBrD/view?usp=drivesdk","description":"Violín 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1H6b8mseJnzsxQTGemn_GyGc5oBz03EyV/view?usp=drivesdk","description":"Violín 2 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1i9smxVN7wOCkn-atB00uouhbRdW8s3QO/view?usp=drivesdk","description":"Violoncello - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1RexUKeu9jEwr-ch1VeAAWMebOzikwwLp/view?usp=drivesdk","description":"Voz - So Much Trouble in the World - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1979, anio_composicion),
      duracion_segundos = COALESCE(249, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1nDrY9eUtO6oo2IMXddPKE5Gk7LYyB_Vi',
      audios = '[{"drive_file_id":"1bDmRNgzAN63nhlWv6hM6aJbXEwI9Usgw","name":"AUDIO - So Much Trouble in the World (Orq REFE).mp3","url":"https://drive.google.com/file/d/1bDmRNgzAN63nhlWv6hM6aJbXEwI9Usgw/view?usp=drivesdk","label":"So Much Trouble in the World (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1vpM9bCZa5RlIW_92NUOPx0hmSxBGUs1e/view?usp=drivesdk","description":"Clarinete Bb 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1AqUMv-9GE1JCqVCS_swDaOt_GLKYtr1N/view?usp=drivesdk","description":"Corno F 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1cUXsOb-Ju5W-KcpggDBsB4bRu780uAtM/view?usp=drivesdk","description":"Flauta 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1gpTtb8CGOkr4XTfnUTYs7y0O7CrssDX6/view?usp=drivesdk","description":"Oboe 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/180R_hLIoU_rYMPMIQhnddc1c7RaotXjj/view?usp=drivesdk","description":"Perc Marimba - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/10pSWfDIClqeWenov0RKSRmXvq5rzg-qy/view?usp=drivesdk","description":"Saxo Tenor - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1KISXW_ApxUBlIjraehQuJSBBj7DoM1NC/view?usp=drivesdk","description":"SCORE - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1_Xf3BAbVNQ8xy_2eadjWddO4PGgMGWTV/view?usp=drivesdk","description":"Trombón 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1gusw9jTPmyCg2KDm68QXxVHeAp55_aB7/view?usp=drivesdk","description":"Trompeta 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ewGjlW40TCM70UFq957YsWBbYbtXYeCi/view?usp=drivesdk","description":"Viola - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1RZ-OpLPwpF4uYxqL-0su4fCffS_PBBrD/view?usp=drivesdk","description":"Violín 1 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1H6b8mseJnzsxQTGemn_GyGc5oBz03EyV/view?usp=drivesdk","description":"Violín 2 - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1i9smxVN7wOCkn-atB00uouhbRdW8s3QO/view?usp=drivesdk","description":"Violoncello - So Much Trouble in the World - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1RexUKeu9jEwr-ch1VeAAWMebOzikwwLp/view?usp=drivesdk","description":"Voz - So Much Trouble in the World - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 2);
  ELSE
    UPDATE repertorio_obras SET orden = 2
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 3. Small Axe
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Small Axe'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Small Axe. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Small Axe',
      1973,
      237,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Small Axe. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1ed-FLzF2HqwkObJ5FRKTEIg6cUE6TAB5',
      '[{"drive_file_id":"1ycmWjGZXXD7rDG8f3kslbH1ks7wuLZ7e","name":"AUDIO - Small Axe (Orq REFE).mp3","url":"https://drive.google.com/file/d/1ycmWjGZXXD7rDG8f3kslbH1ks7wuLZ7e/view?usp=drivesdk","label":"Small Axe (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1IOlovC65oC1sIqkps7tRtp42aI3Un-pe/view?usp=drivesdk","description":"Clarinete Bb 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/17Lrks_gNTIkw7KgG6_nYIJ5_iX9CJ8cw/view?usp=drivesdk","description":"Corno F 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1jUsB6uKk5hn0mrGCD4IfpPp-KpXkMsAQ/view?usp=drivesdk","description":"Flauta 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1GUBAvOeSWkBfp8nprz4IEMgtXE7CUXex/view?usp=drivesdk","description":"Oboe 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1XDtb3sJepOdJZtSZvrKrvy0pLcZeFXSE/view?usp=drivesdk","description":"Perc Marimba - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1a6LIS_FHtM13KnvQrebee3K6IdGKZm-U/view?usp=drivesdk","description":"Saxo Tenor - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1UqWzroDojbtnIyaYsqWtC25DFB_rgA3M/view?usp=drivesdk","description":"SCORE - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1t9FdkgwXOKcs4Whs224vlzxlkEVW-zKa/view?usp=drivesdk","description":"Trombón 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/17MYs-LZIN7SLwfj2hJ3abOnl3SwBZiCu/view?usp=drivesdk","description":"Trompeta 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1XlEnGGq-XCYua13VM68IHa5-y8Mrsw01/view?usp=drivesdk","description":"Viola - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1eH72tPePu1UxGJcgMN_Nwt6kt1uwFrpy/view?usp=drivesdk","description":"Violín 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1TmH5bkgnbubISEWpJSo8SdGpVuqjDdDT/view?usp=drivesdk","description":"Violín 2 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/19YtL33d6rU2KJsvCzpg8-r_jsy7PhhDr/view?usp=drivesdk","description":"Violoncello - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1LKMvT07nTRasUP6R_3taHdkc0xnwm_ln/view?usp=drivesdk","description":"Voz - Small Axe - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1973, anio_composicion),
      duracion_segundos = COALESCE(237, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1ed-FLzF2HqwkObJ5FRKTEIg6cUE6TAB5',
      audios = '[{"drive_file_id":"1ycmWjGZXXD7rDG8f3kslbH1ks7wuLZ7e","name":"AUDIO - Small Axe (Orq REFE).mp3","url":"https://drive.google.com/file/d/1ycmWjGZXXD7rDG8f3kslbH1ks7wuLZ7e/view?usp=drivesdk","label":"Small Axe (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1IOlovC65oC1sIqkps7tRtp42aI3Un-pe/view?usp=drivesdk","description":"Clarinete Bb 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/17Lrks_gNTIkw7KgG6_nYIJ5_iX9CJ8cw/view?usp=drivesdk","description":"Corno F 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1jUsB6uKk5hn0mrGCD4IfpPp-KpXkMsAQ/view?usp=drivesdk","description":"Flauta 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1GUBAvOeSWkBfp8nprz4IEMgtXE7CUXex/view?usp=drivesdk","description":"Oboe 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1XDtb3sJepOdJZtSZvrKrvy0pLcZeFXSE/view?usp=drivesdk","description":"Perc Marimba - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1a6LIS_FHtM13KnvQrebee3K6IdGKZm-U/view?usp=drivesdk","description":"Saxo Tenor - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1UqWzroDojbtnIyaYsqWtC25DFB_rgA3M/view?usp=drivesdk","description":"SCORE - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1t9FdkgwXOKcs4Whs224vlzxlkEVW-zKa/view?usp=drivesdk","description":"Trombón 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/17MYs-LZIN7SLwfj2hJ3abOnl3SwBZiCu/view?usp=drivesdk","description":"Trompeta 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1XlEnGGq-XCYua13VM68IHa5-y8Mrsw01/view?usp=drivesdk","description":"Viola - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1eH72tPePu1UxGJcgMN_Nwt6kt1uwFrpy/view?usp=drivesdk","description":"Violín 1 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1TmH5bkgnbubISEWpJSo8SdGpVuqjDdDT/view?usp=drivesdk","description":"Violín 2 - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/19YtL33d6rU2KJsvCzpg8-r_jsy7PhhDr/view?usp=drivesdk","description":"Violoncello - Small Axe - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1LKMvT07nTRasUP6R_3taHdkc0xnwm_ln/view?usp=drivesdk","description":"Voz - Small Axe - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 3);
  ELSE
    UPDATE repertorio_obras SET orden = 3
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 4. Positive Vibration
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Positive Vibration'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Positive Vibration. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Positive Vibration',
      1976,
      303,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Positive Vibration. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1bZ_3LGHNhANd8cfzbypFamZ_1xFvNrvD',
      '[{"drive_file_id":"1dOX_A9jMLmB9_x3F1lxauoSIf4zrChW4","name":"AUDIO - Positive Vibration (Orq REFE).mp3","url":"https://drive.google.com/file/d/1dOX_A9jMLmB9_x3F1lxauoSIf4zrChW4/view?usp=drivesdk","label":"Positive Vibration (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1FdFm11p3Kk9vnH4CXCNSL0admWlLWvKb/view?usp=drivesdk","description":"Clarinete Bb 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1EY6QFpZA0BLv3STsWoLJvKjF_U2-LWPb/view?usp=drivesdk","description":"Corno F 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1JVIcF01tpWJV9y7Q4alK0hwLjQ5Zj64X/view?usp=drivesdk","description":"Flauta 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1mnFYf70DK4680qJolKMXDFidtlEtp7fG/view?usp=drivesdk","description":"Oboe 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1MHlxU7S9-aW_BZiobc8l-IO2cCebYuWt/view?usp=drivesdk","description":"Perc Marimba - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1gwk_8NkdDjcTBLaTeNZDwHFU6SGmRJTc/view?usp=drivesdk","description":"Saxo Tenor - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1iXSF_ofLBbLpUxNOfZ1utxYtGB60-mVf/view?usp=drivesdk","description":"SCORE - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1mgFVFw40aDS9-YIZWreWPk4K1R-khj67/view?usp=drivesdk","description":"Trombón 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/18Q-z1d4QQTTRYGX_QkOrhhCyFVacCCDL/view?usp=drivesdk","description":"Trompeta 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1pu_V8Jf_Fy6_jItLD-y8mWXdkWY1omXg/view?usp=drivesdk","description":"Viola - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1jJGY0CvHjvymO-vSC6sgvpqWdJRW_Ou9/view?usp=drivesdk","description":"Violín 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1f6wArr7GEoLV6uziQu-fCKaFWMN2mM4f/view?usp=drivesdk","description":"Violín 2 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1G46sQq02CkgZGnsZ869eaWctizHppBmE/view?usp=drivesdk","description":"Violoncello - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1Yf7UNH4aYeiHJnTapZzR_kellsTo9CPE/view?usp=drivesdk","description":"Voz - Positive Vibration - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1976, anio_composicion),
      duracion_segundos = COALESCE(303, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1bZ_3LGHNhANd8cfzbypFamZ_1xFvNrvD',
      audios = '[{"drive_file_id":"1dOX_A9jMLmB9_x3F1lxauoSIf4zrChW4","name":"AUDIO - Positive Vibration (Orq REFE).mp3","url":"https://drive.google.com/file/d/1dOX_A9jMLmB9_x3F1lxauoSIf4zrChW4/view?usp=drivesdk","label":"Positive Vibration (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1FdFm11p3Kk9vnH4CXCNSL0admWlLWvKb/view?usp=drivesdk","description":"Clarinete Bb 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1EY6QFpZA0BLv3STsWoLJvKjF_U2-LWPb/view?usp=drivesdk","description":"Corno F 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1JVIcF01tpWJV9y7Q4alK0hwLjQ5Zj64X/view?usp=drivesdk","description":"Flauta 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1mnFYf70DK4680qJolKMXDFidtlEtp7fG/view?usp=drivesdk","description":"Oboe 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1MHlxU7S9-aW_BZiobc8l-IO2cCebYuWt/view?usp=drivesdk","description":"Perc Marimba - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1gwk_8NkdDjcTBLaTeNZDwHFU6SGmRJTc/view?usp=drivesdk","description":"Saxo Tenor - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1iXSF_ofLBbLpUxNOfZ1utxYtGB60-mVf/view?usp=drivesdk","description":"SCORE - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1mgFVFw40aDS9-YIZWreWPk4K1R-khj67/view?usp=drivesdk","description":"Trombón 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/18Q-z1d4QQTTRYGX_QkOrhhCyFVacCCDL/view?usp=drivesdk","description":"Trompeta 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1pu_V8Jf_Fy6_jItLD-y8mWXdkWY1omXg/view?usp=drivesdk","description":"Viola - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1jJGY0CvHjvymO-vSC6sgvpqWdJRW_Ou9/view?usp=drivesdk","description":"Violín 1 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1f6wArr7GEoLV6uziQu-fCKaFWMN2mM4f/view?usp=drivesdk","description":"Violín 2 - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1G46sQq02CkgZGnsZ869eaWctizHppBmE/view?usp=drivesdk","description":"Violoncello - Positive Vibration - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1Yf7UNH4aYeiHJnTapZzR_kellsTo9CPE/view?usp=drivesdk","description":"Voz - Positive Vibration - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 4);
  ELSE
    UPDATE repertorio_obras SET orden = 4
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 5. Stir It Up
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Stir It Up'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Stir It Up. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Stir It Up',
      1973,
      262,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Stir It Up. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1Pw62LBYBRaL7RQapKQxVsY47-k_Q5Olr',
      '[{"drive_file_id":"1ECmFN7exFejNETfxxUfeZ4wfZKU7G16h","name":"AUDIO - Stir It Up (Orq REFE).mp3","url":"https://drive.google.com/file/d/1ECmFN7exFejNETfxxUfeZ4wfZKU7G16h/view?usp=drivesdk","label":"Stir It Up (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1CP6j2c-Wg5C-LelEshudcSYPxrWs7ElF/view?usp=drivesdk","description":"Clarinete Bb 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1_hCm20-1eVfZolJa8E7fAE19S_n7S2U5/view?usp=drivesdk","description":"Corno F 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/19Rk_4JpeNXuvFOQ-xVMQRsHvIUi-xjRK/view?usp=drivesdk","description":"Flauta 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1xo0XDhgZIUxCGavLVAjzl8yMnKGinXDN/view?usp=drivesdk","description":"Oboe 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/12ibmT9rf8biVuOcfI5cpbRQb-aooMyCm/view?usp=drivesdk","description":"Perc Marimba - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/12uDdSlJUuao9xPbYuWCbRg397q3xxa8I/view?usp=drivesdk","description":"Saxo Tenor - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Xjw0FavOWFz7DRJA48HyqhhThHW7i3TU/view?usp=drivesdk","description":"SCORE - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1Smv1a5S2MlTroXxN0XZIConQSKBkbKbU/view?usp=drivesdk","description":"Trombón 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1TjH3tzPFh35qdejvXiIAV9qVPNbtCLsD/view?usp=drivesdk","description":"Trompeta 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1zMYt4UEDD0G4mmijNDme53hYflaxqlmc/view?usp=drivesdk","description":"Viola - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1tpxzjx_DFYHuM1fbHLYoEE6QxuWzalQ8/view?usp=drivesdk","description":"Violín 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1BadU-LPHRix723nIW1L4wOMyyxJi4HFb/view?usp=drivesdk","description":"Violín 2 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1wqUd0kwoNN4Ua5v2nrDWgmQ9q-aO69AI/view?usp=drivesdk","description":"Violoncello - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1p4Ecu-Hdl4LYiH7RMoGM3aUOUB0KOif6/view?usp=drivesdk","description":"Voz - Stir It Up - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1973, anio_composicion),
      duracion_segundos = COALESCE(262, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1Pw62LBYBRaL7RQapKQxVsY47-k_Q5Olr',
      audios = '[{"drive_file_id":"1ECmFN7exFejNETfxxUfeZ4wfZKU7G16h","name":"AUDIO - Stir It Up (Orq REFE).mp3","url":"https://drive.google.com/file/d/1ECmFN7exFejNETfxxUfeZ4wfZKU7G16h/view?usp=drivesdk","label":"Stir It Up (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1CP6j2c-Wg5C-LelEshudcSYPxrWs7ElF/view?usp=drivesdk","description":"Clarinete Bb 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1_hCm20-1eVfZolJa8E7fAE19S_n7S2U5/view?usp=drivesdk","description":"Corno F 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/19Rk_4JpeNXuvFOQ-xVMQRsHvIUi-xjRK/view?usp=drivesdk","description":"Flauta 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1xo0XDhgZIUxCGavLVAjzl8yMnKGinXDN/view?usp=drivesdk","description":"Oboe 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/12ibmT9rf8biVuOcfI5cpbRQb-aooMyCm/view?usp=drivesdk","description":"Perc Marimba - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/12uDdSlJUuao9xPbYuWCbRg397q3xxa8I/view?usp=drivesdk","description":"Saxo Tenor - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Xjw0FavOWFz7DRJA48HyqhhThHW7i3TU/view?usp=drivesdk","description":"SCORE - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1Smv1a5S2MlTroXxN0XZIConQSKBkbKbU/view?usp=drivesdk","description":"Trombón 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1TjH3tzPFh35qdejvXiIAV9qVPNbtCLsD/view?usp=drivesdk","description":"Trompeta 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1zMYt4UEDD0G4mmijNDme53hYflaxqlmc/view?usp=drivesdk","description":"Viola - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1tpxzjx_DFYHuM1fbHLYoEE6QxuWzalQ8/view?usp=drivesdk","description":"Violín 1 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1BadU-LPHRix723nIW1L4wOMyyxJi4HFb/view?usp=drivesdk","description":"Violín 2 - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1wqUd0kwoNN4Ua5v2nrDWgmQ9q-aO69AI/view?usp=drivesdk","description":"Violoncello - Stir It Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1p4Ecu-Hdl4LYiH7RMoGM3aUOUB0KOif6/view?usp=drivesdk","description":"Voz - Stir It Up - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 5);
  ELSE
    UPDATE repertorio_obras SET orden = 5
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 6. No More Trouble
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'No More Trouble'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - No More Trouble. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'No More Trouble',
      1973,
      234,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - No More Trouble. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1w5okdghTGoJjh_Ai7udJjWrTLAJ8bTyr',
      '[{"drive_file_id":"1C9wrlSUzuIrCKk5gG-6GsGawKk38Dsrm","name":"AUDIO - No More Trouble (Orq REFE).mp3","url":"https://drive.google.com/file/d/1C9wrlSUzuIrCKk5gG-6GsGawKk38Dsrm/view?usp=drivesdk","label":"No More Trouble (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/11JaqeNreAZIGpIuWgVCweHkt7OcQvaLj/view?usp=drivesdk","description":"Clarinete Bb 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1foehA0aGoGYvXi79Klww5q-3-XEGo9rK/view?usp=drivesdk","description":"Corno F 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/156IVyj4gi9HWm1qW8u1MinrAWn53au0u/view?usp=drivesdk","description":"Flauta 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1gD5vi07d3yrIphSTS0IALAqaYhBV6kIb/view?usp=drivesdk","description":"Oboe 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1tkmDKPRmdCQmgwpXtjETckt04sHOc3VS/view?usp=drivesdk","description":"Perc Marimba - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/17hWTPSxA4A5NnqbaaY5vhldtI05JMjy0/view?usp=drivesdk","description":"Saxo Tenor - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1vwX8OTx5yIzKwmy3SGBKxwyh0m1Z8PuS/view?usp=drivesdk","description":"SCORE - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1kJxch561gtmLW-A7HDfXDKYeGQnVm22R/view?usp=drivesdk","description":"Trombón 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1Bmlf3WN6BP75txoWeTHDgjeVheZmjuBS/view?usp=drivesdk","description":"Trompeta 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/13lxzmImrKZMVxa4TSpuT96H78w4hFMSt/view?usp=drivesdk","description":"Viola - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1uw6t9TVkT4Fe8CN1h6nRgcA93ckXHQqk/view?usp=drivesdk","description":"Violín 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1G1hAf5HA079JN-DlKE77RKQTpFZdX8Mf/view?usp=drivesdk","description":"Violín 2 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ZFsd29UpQ6mnKtdg3xl3HZ_4_9o56ZlZ/view?usp=drivesdk","description":"Violoncello - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1RFeXqzZgC-yjvbnmlccOXaMYZnZatU2e/view?usp=drivesdk","description":"Voz - No More Trouble - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1973, anio_composicion),
      duracion_segundos = COALESCE(234, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1w5okdghTGoJjh_Ai7udJjWrTLAJ8bTyr',
      audios = '[{"drive_file_id":"1C9wrlSUzuIrCKk5gG-6GsGawKk38Dsrm","name":"AUDIO - No More Trouble (Orq REFE).mp3","url":"https://drive.google.com/file/d/1C9wrlSUzuIrCKk5gG-6GsGawKk38Dsrm/view?usp=drivesdk","label":"No More Trouble (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/11JaqeNreAZIGpIuWgVCweHkt7OcQvaLj/view?usp=drivesdk","description":"Clarinete Bb 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1foehA0aGoGYvXi79Klww5q-3-XEGo9rK/view?usp=drivesdk","description":"Corno F 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/156IVyj4gi9HWm1qW8u1MinrAWn53au0u/view?usp=drivesdk","description":"Flauta 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1gD5vi07d3yrIphSTS0IALAqaYhBV6kIb/view?usp=drivesdk","description":"Oboe 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1tkmDKPRmdCQmgwpXtjETckt04sHOc3VS/view?usp=drivesdk","description":"Perc Marimba - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/17hWTPSxA4A5NnqbaaY5vhldtI05JMjy0/view?usp=drivesdk","description":"Saxo Tenor - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1vwX8OTx5yIzKwmy3SGBKxwyh0m1Z8PuS/view?usp=drivesdk","description":"SCORE - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1kJxch561gtmLW-A7HDfXDKYeGQnVm22R/view?usp=drivesdk","description":"Trombón 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1Bmlf3WN6BP75txoWeTHDgjeVheZmjuBS/view?usp=drivesdk","description":"Trompeta 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/13lxzmImrKZMVxa4TSpuT96H78w4hFMSt/view?usp=drivesdk","description":"Viola - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1uw6t9TVkT4Fe8CN1h6nRgcA93ckXHQqk/view?usp=drivesdk","description":"Violín 1 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1G1hAf5HA079JN-DlKE77RKQTpFZdX8Mf/view?usp=drivesdk","description":"Violín 2 - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ZFsd29UpQ6mnKtdg3xl3HZ_4_9o56ZlZ/view?usp=drivesdk","description":"Violoncello - No More Trouble - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1RFeXqzZgC-yjvbnmlccOXaMYZnZatU2e/view?usp=drivesdk","description":"Voz - No More Trouble - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 6);
  ELSE
    UPDATE repertorio_obras SET orden = 6
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 7. Waiting in Vain
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Waiting in Vain'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Waiting in Vain. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Waiting in Vain',
      1977,
      265,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Waiting in Vain. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1v2ref_5uY5BgRETnxK_ch7gDNAz26JYq',
      '[{"drive_file_id":"1YYpDbqUAQQEMfa6M3u-WB8DVTjld-aq4","name":"AUDIO - Waiting in Vain (Orq REFE).mp3","url":"https://drive.google.com/file/d/1YYpDbqUAQQEMfa6M3u-WB8DVTjld-aq4/view?usp=drivesdk","label":"Waiting in Vain (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1IWQ_y1HQUCvsBs0qE6K_jDum8ESFNsU9/view?usp=drivesdk","description":"Clarinete Bb 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/110-TS1-SKwt20C_RYmBr2gCdpov4ZXSh/view?usp=drivesdk","description":"Corno F 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1Pa93iOiDxOy7vHCcGqxYWGXiIGUQLc6d/view?usp=drivesdk","description":"Flauta 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/18OZ_iNS6w1PLpVul2a6TwBoHnlyCp7Qr/view?usp=drivesdk","description":"Oboe 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/11xVxEnjkrKj8qzrEdc3D_cc9_flFpYuZ/view?usp=drivesdk","description":"Perc Marimba - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1RQp5sVSSuYa3ZHRTKaY0khjS8tdkGOn0/view?usp=drivesdk","description":"Saxo Tenor - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Ql-Qix9mlH1N2jx96JjZtSv6lDElKOBT/view?usp=drivesdk","description":"SCORE - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1ZMJSZTJ1DbZwDlCsP-71-YXt4EyHS6Gv/view?usp=drivesdk","description":"Trombón 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1-vok6Ye6W_xS8iihXWEgybTg-TGDvtbB/view?usp=drivesdk","description":"Trompeta 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1hjts6m1V0LT183ZLx6-GSVeSnoVeGrzu/view?usp=drivesdk","description":"Viola - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1w9Mfc-r2zKScA1k-9YAoxVvapWRUwNVX/view?usp=drivesdk","description":"Violín 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1nWHrvIt_iDYHTPFjrrgiUBC-IpAlomgk/view?usp=drivesdk","description":"Violín 2 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1_fyMMvoIdUPqCRb3gXIg-tBIeE5XDDyh/view?usp=drivesdk","description":"Violoncello - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/100NgtYXmSDZMfllM1hHPO6O_vjD8Nnz3/view?usp=drivesdk","description":"Voz - Waiting in Vain - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1977, anio_composicion),
      duracion_segundos = COALESCE(265, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1v2ref_5uY5BgRETnxK_ch7gDNAz26JYq',
      audios = '[{"drive_file_id":"1YYpDbqUAQQEMfa6M3u-WB8DVTjld-aq4","name":"AUDIO - Waiting in Vain (Orq REFE).mp3","url":"https://drive.google.com/file/d/1YYpDbqUAQQEMfa6M3u-WB8DVTjld-aq4/view?usp=drivesdk","label":"Waiting in Vain (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1IWQ_y1HQUCvsBs0qE6K_jDum8ESFNsU9/view?usp=drivesdk","description":"Clarinete Bb 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/110-TS1-SKwt20C_RYmBr2gCdpov4ZXSh/view?usp=drivesdk","description":"Corno F 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1Pa93iOiDxOy7vHCcGqxYWGXiIGUQLc6d/view?usp=drivesdk","description":"Flauta 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/18OZ_iNS6w1PLpVul2a6TwBoHnlyCp7Qr/view?usp=drivesdk","description":"Oboe 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/11xVxEnjkrKj8qzrEdc3D_cc9_flFpYuZ/view?usp=drivesdk","description":"Perc Marimba - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1RQp5sVSSuYa3ZHRTKaY0khjS8tdkGOn0/view?usp=drivesdk","description":"Saxo Tenor - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Ql-Qix9mlH1N2jx96JjZtSv6lDElKOBT/view?usp=drivesdk","description":"SCORE - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1ZMJSZTJ1DbZwDlCsP-71-YXt4EyHS6Gv/view?usp=drivesdk","description":"Trombón 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1-vok6Ye6W_xS8iihXWEgybTg-TGDvtbB/view?usp=drivesdk","description":"Trompeta 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1hjts6m1V0LT183ZLx6-GSVeSnoVeGrzu/view?usp=drivesdk","description":"Viola - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1w9Mfc-r2zKScA1k-9YAoxVvapWRUwNVX/view?usp=drivesdk","description":"Violín 1 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1nWHrvIt_iDYHTPFjrrgiUBC-IpAlomgk/view?usp=drivesdk","description":"Violín 2 - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1_fyMMvoIdUPqCRb3gXIg-tBIeE5XDDyh/view?usp=drivesdk","description":"Violoncello - Waiting in Vain - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/100NgtYXmSDZMfllM1hHPO6O_vjD8Nnz3/view?usp=drivesdk","description":"Voz - Waiting in Vain - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 7);
  ELSE
    UPDATE repertorio_obras SET orden = 7
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 8. Is This Love
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Is This Love'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Is This Love. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Is This Love',
      1978,
      282,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Is This Love. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón',
      'https://drive.google.com/drive/folders/113f1DBZmE-09I9f-7LiGmL3IOeqYRDdh',
      '[{"drive_file_id":"1AqBp90rF_IoHeJSuvXud7YzkuGs2ULAP","name":"AUDIO - Is This Love (Orq REFE).mp3","url":"https://drive.google.com/file/d/1AqBp90rF_IoHeJSuvXud7YzkuGs2ULAP/view?usp=drivesdk","label":"Is This Love (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1fiMqK44fYYw1GNgObUbG_Ig11dAiB_Ol/view?usp=drivesdk","description":"Clarinete Bb 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/14eiVzcC8eBTU-yKyW0cxx1_56wMAuTmG/view?usp=drivesdk","description":"Corno F 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1PgvNMP0QGcYagVWhaXqJEch-_0KZffWM/view?usp=drivesdk","description":"Flauta 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1HdPo0x76Z3YVWCLunxbEF6WP0c36V3oE/view?usp=drivesdk","description":"Oboe 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1bOR2PxAlFZKhD1DkVawHLfR-bSEm3tLY/view?usp=drivesdk","description":"Perc Marimba - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1kw1NxNOGw4Cp6NnQH7zr3Ba2d5jKZ1kA/view?usp=drivesdk","description":"Saxo Tenor - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1y5_taoaDxLb4xEMWMN-RjScVirk6DC7J/view?usp=drivesdk","description":"SCORE - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1NZWt3EmDJ5wrgo2_bHZC2Jq-bPyqVRza/view?usp=drivesdk","description":"Trombón 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1jsD-9vKo9asawR0GQnlqi3ZKicbQT5aI/view?usp=drivesdk","description":"Trompeta 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1i5kCcgUj7kACyATlYQtXDYVDocUnjUkN/view?usp=drivesdk","description":"Viola - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1GwlbIkzveOMmWN1ZgBo4anjWvmlEs1Ny/view?usp=drivesdk","description":"Violín 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1il1YailQwdSlEkTJTvxrzN0MlcA2pU6f/view?usp=drivesdk","description":"Violín 2 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1pYgImWpJvIhWHS2wHBOzAtGQdPhpsSpi/view?usp=drivesdk","description":"Violoncello - Is This Love - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1978, anio_composicion),
      duracion_segundos = COALESCE(282, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón',
      link_drive = 'https://drive.google.com/drive/folders/113f1DBZmE-09I9f-7LiGmL3IOeqYRDdh',
      audios = '[{"drive_file_id":"1AqBp90rF_IoHeJSuvXud7YzkuGs2ULAP","name":"AUDIO - Is This Love (Orq REFE).mp3","url":"https://drive.google.com/file/d/1AqBp90rF_IoHeJSuvXud7YzkuGs2ULAP/view?usp=drivesdk","label":"Is This Love (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1fiMqK44fYYw1GNgObUbG_Ig11dAiB_Ol/view?usp=drivesdk","description":"Clarinete Bb 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/14eiVzcC8eBTU-yKyW0cxx1_56wMAuTmG/view?usp=drivesdk","description":"Corno F 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1PgvNMP0QGcYagVWhaXqJEch-_0KZffWM/view?usp=drivesdk","description":"Flauta 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1HdPo0x76Z3YVWCLunxbEF6WP0c36V3oE/view?usp=drivesdk","description":"Oboe 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1bOR2PxAlFZKhD1DkVawHLfR-bSEm3tLY/view?usp=drivesdk","description":"Perc Marimba - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1kw1NxNOGw4Cp6NnQH7zr3Ba2d5jKZ1kA/view?usp=drivesdk","description":"Saxo Tenor - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1y5_taoaDxLb4xEMWMN-RjScVirk6DC7J/view?usp=drivesdk","description":"SCORE - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1NZWt3EmDJ5wrgo2_bHZC2Jq-bPyqVRza/view?usp=drivesdk","description":"Trombón 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1jsD-9vKo9asawR0GQnlqi3ZKicbQT5aI/view?usp=drivesdk","description":"Trompeta 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1i5kCcgUj7kACyATlYQtXDYVDocUnjUkN/view?usp=drivesdk","description":"Viola - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1GwlbIkzveOMmWN1ZgBo4anjWvmlEs1Ny/view?usp=drivesdk","description":"Violín 1 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1il1YailQwdSlEkTJTvxrzN0MlcA2pU6f/view?usp=drivesdk","description":"Violín 2 - Is This Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1pYgImWpJvIhWHS2wHBOzAtGQdPhpsSpi/view?usp=drivesdk","description":"Violoncello - Is This Love - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 8);
  ELSE
    UPDATE repertorio_obras SET orden = 8
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 9. One Love
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'One Love'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - One Love. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'One Love',
      1977,
      211,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - One Love. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1L2xW8doK6RZ3z2DGHTkTSI2Kbjibhvw-',
      '[{"drive_file_id":"1vEFUj3WvIAPCsx8jzgIv2LQtPoGZuhW1","name":"AUDIO - One Love (Orq REFE).mp3","url":"https://drive.google.com/file/d/1vEFUj3WvIAPCsx8jzgIv2LQtPoGZuhW1/view?usp=drivesdk","label":"One Love (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1U2PhDLc_eX5D69Ikprc2NYLMpwZjjGUB/view?usp=drivesdk","description":"Clarinete Bb 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1F60NPNGyAR4SyBNirSS_w16sMN9VH1f3/view?usp=drivesdk","description":"Corno F 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1WAjT4iZpqFMAzug5aHDjzoeizdEa0tLQ/view?usp=drivesdk","description":"Flauta 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1IVTm8zE2QXSgDU7bYqEHn6YXAcTmOxG9/view?usp=drivesdk","description":"Oboe 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1f-aQJyssohVn9ehh8xKVEY-l-9uQRKec/view?usp=drivesdk","description":"Perc Marimba - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1FCxwsUl3GxYqYhRetf_s-NtYNzqZhOZg/view?usp=drivesdk","description":"Saxo Tenor - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1lLKxPtowuuyjhcVnq5Np154LS4Jhp5do/view?usp=drivesdk","description":"SCORE - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1wp2ZkLSBIwG5JS9zp7fibhnjGmWk5WTT/view?usp=drivesdk","description":"Trombón 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1ircogqGytvfats60dXSrdtpOIdrHwGGA/view?usp=drivesdk","description":"Trompeta 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Q2Y-EAfNmAkLcWxEWj4HGqZmW-vvkTFx/view?usp=drivesdk","description":"Viola - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1zPmqO48fyye1zdRK1H9Dc0atUix9KSPU/view?usp=drivesdk","description":"Violín 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1gxJgPUsKiQwSB6l33yVAc0ZawRW8oSvC/view?usp=drivesdk","description":"Violín 2 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/19-cnNsex0I7cB6bC5vrBNl1aFCdHEo5v/view?usp=drivesdk","description":"Violoncello - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1uSablk9tcS6sXbphjp69vRkfw4Usxx4h/view?usp=drivesdk","description":"Voz - One Love - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1977, anio_composicion),
      duracion_segundos = COALESCE(211, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1L2xW8doK6RZ3z2DGHTkTSI2Kbjibhvw-',
      audios = '[{"drive_file_id":"1vEFUj3WvIAPCsx8jzgIv2LQtPoGZuhW1","name":"AUDIO - One Love (Orq REFE).mp3","url":"https://drive.google.com/file/d/1vEFUj3WvIAPCsx8jzgIv2LQtPoGZuhW1/view?usp=drivesdk","label":"One Love (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1U2PhDLc_eX5D69Ikprc2NYLMpwZjjGUB/view?usp=drivesdk","description":"Clarinete Bb 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1F60NPNGyAR4SyBNirSS_w16sMN9VH1f3/view?usp=drivesdk","description":"Corno F 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1WAjT4iZpqFMAzug5aHDjzoeizdEa0tLQ/view?usp=drivesdk","description":"Flauta 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1IVTm8zE2QXSgDU7bYqEHn6YXAcTmOxG9/view?usp=drivesdk","description":"Oboe 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1f-aQJyssohVn9ehh8xKVEY-l-9uQRKec/view?usp=drivesdk","description":"Perc Marimba - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1FCxwsUl3GxYqYhRetf_s-NtYNzqZhOZg/view?usp=drivesdk","description":"Saxo Tenor - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1lLKxPtowuuyjhcVnq5Np154LS4Jhp5do/view?usp=drivesdk","description":"SCORE - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1wp2ZkLSBIwG5JS9zp7fibhnjGmWk5WTT/view?usp=drivesdk","description":"Trombón 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1ircogqGytvfats60dXSrdtpOIdrHwGGA/view?usp=drivesdk","description":"Trompeta 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Q2Y-EAfNmAkLcWxEWj4HGqZmW-vvkTFx/view?usp=drivesdk","description":"Viola - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1zPmqO48fyye1zdRK1H9Dc0atUix9KSPU/view?usp=drivesdk","description":"Violín 1 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1gxJgPUsKiQwSB6l33yVAc0ZawRW8oSvC/view?usp=drivesdk","description":"Violín 2 - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/19-cnNsex0I7cB6bC5vrBNl1aFCdHEo5v/view?usp=drivesdk","description":"Violoncello - One Love - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1uSablk9tcS6sXbphjp69vRkfw4Usxx4h/view?usp=drivesdk","description":"Voz - One Love - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 9);
  ELSE
    UPDATE repertorio_obras SET orden = 9
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 10. Concrete Jungle
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Concrete Jungle'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Concrete Jungle. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Concrete Jungle',
      1973,
      342,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Concrete Jungle. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1pBnvDd2CNOe0_NatVs0h7R8KCydTLXQL',
      '[{"drive_file_id":"1qUbFURSw7XByuW0rEt9ob20KWxXwzMzD","name":"AUDIO - Concrete Jungle (Orq REFE).mp3","url":"https://drive.google.com/file/d/1qUbFURSw7XByuW0rEt9ob20KWxXwzMzD/view?usp=drivesdk","label":"Concrete Jungle (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1qT8fxuTLDhkIS5IG15BwTvcXCqv8sl_9/view?usp=drivesdk","description":"Clarinete Bb 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1AHGO_cP24MJJmihaeJE-UuLnzTyn-eeD/view?usp=drivesdk","description":"Corno F 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/169cu0-sa1BPQPWABLCKYRKuptdS5X5uT/view?usp=drivesdk","description":"Flauta 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1XI754qrlhIB4ZfOx8GeEboY2BWmnapfm/view?usp=drivesdk","description":"Oboe 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/19hqbVI3KBj8tqDxa41-slo7Hednb5qBd/view?usp=drivesdk","description":"Perc Marimba - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1sqCIFIKtNox0zbWENOwUj_8X9xkwjveE/view?usp=drivesdk","description":"Saxo Tenor - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1EvVTegNLmp8DlXRnBhvWLFUkq0Bz_YEX/view?usp=drivesdk","description":"SCORE - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1TAFL1tTN1RyEvyrecA_AN0IOzwRSpcGp/view?usp=drivesdk","description":"Trombón 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1dzJsuzMpA1_Bq-8OTL-mgJ5frT_mu9B1/view?usp=drivesdk","description":"Trompeta 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/13nDPZCJcwOqvB3wE_COb2jfvP_ELJ-QC/view?usp=drivesdk","description":"Viola - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/14eDNR6a9sLLtkg68xQmIpg_43xAOUyHs/view?usp=drivesdk","description":"Violín 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1ZPv5SlR-KABsk8_b6nAXVh0IDi_fnFRJ/view?usp=drivesdk","description":"Violín 2 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1EH1TUxjKd2uWQt3OF7xCZf7iEhHH7gAZ/view?usp=drivesdk","description":"Violoncello - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1b_2enuucmsGjufS6g3-lBaDF_c049uSY/view?usp=drivesdk","description":"Voz - Concrete Jungle - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1973, anio_composicion),
      duracion_segundos = COALESCE(342, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1pBnvDd2CNOe0_NatVs0h7R8KCydTLXQL',
      audios = '[{"drive_file_id":"1qUbFURSw7XByuW0rEt9ob20KWxXwzMzD","name":"AUDIO - Concrete Jungle (Orq REFE).mp3","url":"https://drive.google.com/file/d/1qUbFURSw7XByuW0rEt9ob20KWxXwzMzD/view?usp=drivesdk","label":"Concrete Jungle (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1qT8fxuTLDhkIS5IG15BwTvcXCqv8sl_9/view?usp=drivesdk","description":"Clarinete Bb 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1AHGO_cP24MJJmihaeJE-UuLnzTyn-eeD/view?usp=drivesdk","description":"Corno F 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/169cu0-sa1BPQPWABLCKYRKuptdS5X5uT/view?usp=drivesdk","description":"Flauta 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1XI754qrlhIB4ZfOx8GeEboY2BWmnapfm/view?usp=drivesdk","description":"Oboe 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/19hqbVI3KBj8tqDxa41-slo7Hednb5qBd/view?usp=drivesdk","description":"Perc Marimba - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1sqCIFIKtNox0zbWENOwUj_8X9xkwjveE/view?usp=drivesdk","description":"Saxo Tenor - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1EvVTegNLmp8DlXRnBhvWLFUkq0Bz_YEX/view?usp=drivesdk","description":"SCORE - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1TAFL1tTN1RyEvyrecA_AN0IOzwRSpcGp/view?usp=drivesdk","description":"Trombón 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1dzJsuzMpA1_Bq-8OTL-mgJ5frT_mu9B1/view?usp=drivesdk","description":"Trompeta 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/13nDPZCJcwOqvB3wE_COb2jfvP_ELJ-QC/view?usp=drivesdk","description":"Viola - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/14eDNR6a9sLLtkg68xQmIpg_43xAOUyHs/view?usp=drivesdk","description":"Violín 1 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1ZPv5SlR-KABsk8_b6nAXVh0IDi_fnFRJ/view?usp=drivesdk","description":"Violín 2 - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1EH1TUxjKd2uWQt3OF7xCZf7iEhHH7gAZ/view?usp=drivesdk","description":"Violoncello - Concrete Jungle - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1b_2enuucmsGjufS6g3-lBaDF_c049uSY/view?usp=drivesdk","description":"Voz - Concrete Jungle - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 10);
  ELSE
    UPDATE repertorio_obras SET orden = 10
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 11. Jah Live
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Jah Live'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Jah Live. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Jah Live',
      1975,
      289,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Jah Live. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1tJ1mtWjX2rl6dfoo4YORiS6Sp2zEVrk5',
      '[{"drive_file_id":"1Djixk61Jr6NRxevEL06YKY-Vdv5vDGwB","name":"AUDIO - Jah Live (Orq REFE).mp3","url":"https://drive.google.com/file/d/1Djixk61Jr6NRxevEL06YKY-Vdv5vDGwB/view?usp=drivesdk","label":"Jah Live (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1u_hh43k74_aZYWrxY6XQdiQwSzebfM-W/view?usp=drivesdk","description":"Clarinete Bb 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1JSoT837Nat90GfZzUxLxrWHi3v_QKwaA/view?usp=drivesdk","description":"Corno F 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/13gR5Ro7y9UbCtqzI-6A8YewLvUCAzuPG/view?usp=drivesdk","description":"Flauta 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1XToatIYfhvLBqApMQGcUsPfQ1RiSxVDJ/view?usp=drivesdk","description":"Oboe 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1uIHFfhyrw4QR03m-2BN-0wSegLJuDUfx/view?usp=drivesdk","description":"Perc Marimba - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1dhAWcWHs9yQ0tap7CZ1yDMIoG2GYsv1w/view?usp=drivesdk","description":"Saxo Tenor - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1RqhmzYomFgM0i488iWQuLyn1Dd5GyNZR/view?usp=drivesdk","description":"SCORE - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1BLmLJ1k6Kxgg5ySxcME7lFh8c7rFo-A6/view?usp=drivesdk","description":"Trombón 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1N9KjAu-clclfrGQU5tmkfH4JQ0CJpDh0/view?usp=drivesdk","description":"Trompeta 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1lQoa-CKDn79WKmK82-cjdaE16j-i5qLZ/view?usp=drivesdk","description":"Viola - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1frh52qBvpaxMb60H7OjzDNGKSscJxJkL/view?usp=drivesdk","description":"Violín 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1JI_Va-7Z5N8EKS0X1-mA1IxsNBiaeR4j/view?usp=drivesdk","description":"Violín 2 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1mQClk2RWunpxDF6Do1w6fVwV8pSXrAJD/view?usp=drivesdk","description":"Violoncello - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1NqOwF7tWmaSU5LtJTOme2ELpvklcYcWW/view?usp=drivesdk","description":"Voz - Jah Live - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1975, anio_composicion),
      duracion_segundos = COALESCE(289, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1tJ1mtWjX2rl6dfoo4YORiS6Sp2zEVrk5',
      audios = '[{"drive_file_id":"1Djixk61Jr6NRxevEL06YKY-Vdv5vDGwB","name":"AUDIO - Jah Live (Orq REFE).mp3","url":"https://drive.google.com/file/d/1Djixk61Jr6NRxevEL06YKY-Vdv5vDGwB/view?usp=drivesdk","label":"Jah Live (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1u_hh43k74_aZYWrxY6XQdiQwSzebfM-W/view?usp=drivesdk","description":"Clarinete Bb 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1JSoT837Nat90GfZzUxLxrWHi3v_QKwaA/view?usp=drivesdk","description":"Corno F 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/13gR5Ro7y9UbCtqzI-6A8YewLvUCAzuPG/view?usp=drivesdk","description":"Flauta 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1XToatIYfhvLBqApMQGcUsPfQ1RiSxVDJ/view?usp=drivesdk","description":"Oboe 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1uIHFfhyrw4QR03m-2BN-0wSegLJuDUfx/view?usp=drivesdk","description":"Perc Marimba - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1dhAWcWHs9yQ0tap7CZ1yDMIoG2GYsv1w/view?usp=drivesdk","description":"Saxo Tenor - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1RqhmzYomFgM0i488iWQuLyn1Dd5GyNZR/view?usp=drivesdk","description":"SCORE - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1BLmLJ1k6Kxgg5ySxcME7lFh8c7rFo-A6/view?usp=drivesdk","description":"Trombón 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1N9KjAu-clclfrGQU5tmkfH4JQ0CJpDh0/view?usp=drivesdk","description":"Trompeta 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1lQoa-CKDn79WKmK82-cjdaE16j-i5qLZ/view?usp=drivesdk","description":"Viola - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1frh52qBvpaxMb60H7OjzDNGKSscJxJkL/view?usp=drivesdk","description":"Violín 1 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1JI_Va-7Z5N8EKS0X1-mA1IxsNBiaeR4j/view?usp=drivesdk","description":"Violín 2 - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1mQClk2RWunpxDF6Do1w6fVwV8pSXrAJD/view?usp=drivesdk","description":"Violoncello - Jah Live - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1NqOwF7tWmaSU5LtJTOme2ELpvklcYcWW/view?usp=drivesdk","description":"Voz - Jah Live - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 11);
  ELSE
    UPDATE repertorio_obras SET orden = 11
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 12. Get Up Stand Up
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Get Up Stand Up'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Get Up Stand Up. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Get Up Stand Up',
      1973,
      208,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Get Up Stand Up. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1CoxHMAr0cwHruG6aITXkPtC9GVAeXUsk',
      '[{"drive_file_id":"1OnoJnA7yIQJUxKCdr1r-KrnwPSdmtXg1","name":"AUDIO - Get Up Stand Up (Orq REFE).mp3","url":"https://drive.google.com/file/d/1OnoJnA7yIQJUxKCdr1r-KrnwPSdmtXg1/view?usp=drivesdk","label":"Get Up Stand Up (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1X9tOz8QE1uhBM-rLHU-E0gsTl6Hx3Xm1/view?usp=drivesdk","description":"Clarinete Bb 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1E0CYZ22Rf1StfxYwUbFLvB1j2U0g_zN0/view?usp=drivesdk","description":"Corno F 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1N2ESFmDJliB8RVzJbAIVWFsRRj5wFcxE/view?usp=drivesdk","description":"Flauta 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1929_1XISCt06LU977u3nd33B4dDKi46m/view?usp=drivesdk","description":"Oboe 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1-X6bVBMSbh-XHpAXtZWLpXVeKNZztXxV/view?usp=drivesdk","description":"Perc Marimba - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1W-of_cFVkmcQsfHUCJzbCKH2IgNTIC5g/view?usp=drivesdk","description":"Saxo Tenor - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1g15xN6sq3guPwT7H1mmBfaejlTfDQE3Y/view?usp=drivesdk","description":"SCORE - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1WFsS5Je3uyP-DfwpF1GRapzxP0Fm_7Ci/view?usp=drivesdk","description":"Trombón 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1540Avfw5n7blomnjAgZ2hkywTCQzKynP/view?usp=drivesdk","description":"Trompeta 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/14kBDppXOMIhj5K5_-hwLbX06ykUZ19zb/view?usp=drivesdk","description":"Viola - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1eF7dvCqjJLsi8zB8x-DCjuztV7dEPWhB/view?usp=drivesdk","description":"Violín 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/16-wgy-AyGTr2pyHdsJwVBHhuA1aS42tl/view?usp=drivesdk","description":"Violín 2 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1cFh8EZNmEUG77HaFyr-KvTeC-az8ofRM/view?usp=drivesdk","description":"Violoncello - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1Oqr5J3AEAAuzVhOS7BuCKxSvCfKL91xC/view?usp=drivesdk","description":"Voz - Get Up Stand Up - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1973, anio_composicion),
      duracion_segundos = COALESCE(208, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1CoxHMAr0cwHruG6aITXkPtC9GVAeXUsk',
      audios = '[{"drive_file_id":"1OnoJnA7yIQJUxKCdr1r-KrnwPSdmtXg1","name":"AUDIO - Get Up Stand Up (Orq REFE).mp3","url":"https://drive.google.com/file/d/1OnoJnA7yIQJUxKCdr1r-KrnwPSdmtXg1/view?usp=drivesdk","label":"Get Up Stand Up (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1X9tOz8QE1uhBM-rLHU-E0gsTl6Hx3Xm1/view?usp=drivesdk","description":"Clarinete Bb 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1E0CYZ22Rf1StfxYwUbFLvB1j2U0g_zN0/view?usp=drivesdk","description":"Corno F 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1N2ESFmDJliB8RVzJbAIVWFsRRj5wFcxE/view?usp=drivesdk","description":"Flauta 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1929_1XISCt06LU977u3nd33B4dDKi46m/view?usp=drivesdk","description":"Oboe 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1-X6bVBMSbh-XHpAXtZWLpXVeKNZztXxV/view?usp=drivesdk","description":"Perc Marimba - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1W-of_cFVkmcQsfHUCJzbCKH2IgNTIC5g/view?usp=drivesdk","description":"Saxo Tenor - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1g15xN6sq3guPwT7H1mmBfaejlTfDQE3Y/view?usp=drivesdk","description":"SCORE - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1WFsS5Je3uyP-DfwpF1GRapzxP0Fm_7Ci/view?usp=drivesdk","description":"Trombón 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1540Avfw5n7blomnjAgZ2hkywTCQzKynP/view?usp=drivesdk","description":"Trompeta 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/14kBDppXOMIhj5K5_-hwLbX06ykUZ19zb/view?usp=drivesdk","description":"Viola - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1eF7dvCqjJLsi8zB8x-DCjuztV7dEPWhB/view?usp=drivesdk","description":"Violín 1 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/16-wgy-AyGTr2pyHdsJwVBHhuA1aS42tl/view?usp=drivesdk","description":"Violín 2 - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1cFh8EZNmEUG77HaFyr-KvTeC-az8ofRM/view?usp=drivesdk","description":"Violoncello - Get Up Stand Up - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1Oqr5J3AEAAuzVhOS7BuCKxSvCfKL91xC/view?usp=drivesdk","description":"Voz - Get Up Stand Up - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 12);
  ELSE
    UPDATE repertorio_obras SET orden = 12
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 13. Three Little Birds
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Three Little Birds'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Three Little Birds. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Three Little Birds',
      1977,
      212,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Three Little Birds. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/18tsd6oRsi9L2Zfd05pxWx3_8GPjccGAV',
      '[{"drive_file_id":"1mOALhByG3C6LF8n5PgdnlxWyrOw01rUi","name":"AUDIO - Three Little Birds (Orq REFE).mp3","url":"https://drive.google.com/file/d/1mOALhByG3C6LF8n5PgdnlxWyrOw01rUi/view?usp=drivesdk","label":"Three Little Birds (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1kOKkoIACp3VLSm4bpgXeoe9B8fHMVYQa/view?usp=drivesdk","description":"Clarinete Bb 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1UCXhZkU7AlJVV3aadnXxtMny8XpbuO-7/view?usp=drivesdk","description":"Corno F 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1C-0s5edA8y_XXODBkSKSIMCwIUIswq02/view?usp=drivesdk","description":"Flauta 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1yzuLqdPOxTscYFOXsuqj6TTRSsa1Thqu/view?usp=drivesdk","description":"Oboe 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1aIgT-99s8sppnZRWBB_ZyQcqTmnQQAgZ/view?usp=drivesdk","description":"Perc Marimba - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1_tzsvNMHzT9MW0VHpCRdMgMlonWshXAf/view?usp=drivesdk","description":"Saxo Tenor - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1JnX47JKZT-kri96vfPphOa4mnXtEMpjk/view?usp=drivesdk","description":"SCORE - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1Gq7qErRVRyh4_GH4tm9Gv8aQQLFYTTvB/view?usp=drivesdk","description":"Trombón 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1weMHVCLluKHUFTWkxCKa_iCG03BLDxyZ/view?usp=drivesdk","description":"Trompeta 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/13mgPEsv4Lh09UYVojc4E3cUFwtKUoL-a/view?usp=drivesdk","description":"Viola - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/18uKb7CqgZbF7imjSwhKpHQUXZQN30EhK/view?usp=drivesdk","description":"Violín 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1u2Dg5268mpwpfL7jnOMtr5iuuWwNfoUR/view?usp=drivesdk","description":"Violín 2 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1GsZ7wOwUBACIOnexQnqKCumyk5UeOC1l/view?usp=drivesdk","description":"Violoncello - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1s6NGv19tJjHXD80gv8WVEWHC_GhokdVV/view?usp=drivesdk","description":"Voz - Three Little Birds - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1977, anio_composicion),
      duracion_segundos = COALESCE(212, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/18tsd6oRsi9L2Zfd05pxWx3_8GPjccGAV',
      audios = '[{"drive_file_id":"1mOALhByG3C6LF8n5PgdnlxWyrOw01rUi","name":"AUDIO - Three Little Birds (Orq REFE).mp3","url":"https://drive.google.com/file/d/1mOALhByG3C6LF8n5PgdnlxWyrOw01rUi/view?usp=drivesdk","label":"Three Little Birds (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1kOKkoIACp3VLSm4bpgXeoe9B8fHMVYQa/view?usp=drivesdk","description":"Clarinete Bb 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1UCXhZkU7AlJVV3aadnXxtMny8XpbuO-7/view?usp=drivesdk","description":"Corno F 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1C-0s5edA8y_XXODBkSKSIMCwIUIswq02/view?usp=drivesdk","description":"Flauta 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1yzuLqdPOxTscYFOXsuqj6TTRSsa1Thqu/view?usp=drivesdk","description":"Oboe 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1aIgT-99s8sppnZRWBB_ZyQcqTmnQQAgZ/view?usp=drivesdk","description":"Perc Marimba - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1_tzsvNMHzT9MW0VHpCRdMgMlonWshXAf/view?usp=drivesdk","description":"Saxo Tenor - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1JnX47JKZT-kri96vfPphOa4mnXtEMpjk/view?usp=drivesdk","description":"SCORE - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1Gq7qErRVRyh4_GH4tm9Gv8aQQLFYTTvB/view?usp=drivesdk","description":"Trombón 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1weMHVCLluKHUFTWkxCKa_iCG03BLDxyZ/view?usp=drivesdk","description":"Trompeta 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/13mgPEsv4Lh09UYVojc4E3cUFwtKUoL-a/view?usp=drivesdk","description":"Viola - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/18uKb7CqgZbF7imjSwhKpHQUXZQN30EhK/view?usp=drivesdk","description":"Violín 1 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1u2Dg5268mpwpfL7jnOMtr5iuuWwNfoUR/view?usp=drivesdk","description":"Violín 2 - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1GsZ7wOwUBACIOnexQnqKCumyk5UeOC1l/view?usp=drivesdk","description":"Violoncello - Three Little Birds - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1s6NGv19tJjHXD80gv8WVEWHC_GhokdVV/view?usp=drivesdk","description":"Voz - Three Little Birds - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 13);
  ELSE
    UPDATE repertorio_obras SET orden = 13
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 14. Coming in from the Cold
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Coming in from the Cold'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Coming in from the Cold. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Coming in from the Cold',
      1980,
      248,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Coming in from the Cold. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1EBhBDUnlYEGKOimSbBM_5hkWWUXDk2MS',
      '[{"drive_file_id":"1GN5za-kQlPyG3qHNDlD9bldHeySwOHls","name":"AUDIO - Coming in from the Cold (Orq REFE).mp3","url":"https://drive.google.com/file/d/1GN5za-kQlPyG3qHNDlD9bldHeySwOHls/view?usp=drivesdk","label":"Coming in from the Cold (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1BP6jSfY2dtR_N5Frl9U-I0JNfPj5RKby/view?usp=drivesdk","description":"Clarinete Bb 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1L0t6XoJNvbYl3A3WA5pJjy6xW_im3096/view?usp=drivesdk","description":"Corno F 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1h1chmJqK4dksrvzYFUWiGcycktT_En7R/view?usp=drivesdk","description":"Flauta 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1ho4lXkEYrafyixYEh2I_fcGAge9iU6OR/view?usp=drivesdk","description":"Oboe 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/14ynbTkZ0IrmFlUE92OvRJn_HYFS6ZSXD/view?usp=drivesdk","description":"Perc Marimba - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1EuBhi_X3m6aucltrYXk3wO_cRHFTaxvG/view?usp=drivesdk","description":"Saxo Tenor - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1y_2dWeS1lotGy8YQ_NEVltttH3zO6nHs/view?usp=drivesdk","description":"SCORE - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1UviUQkUvsK7t9ZmFCdtP2g9SThVr9Qj3/view?usp=drivesdk","description":"Trombón 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/15oh-NQmemF-p6P-y-R8tz3ogHv-aM23M/view?usp=drivesdk","description":"Trompeta 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1UTEvEQG9bL6i1VNExoCK_HLBNcatolFR/view?usp=drivesdk","description":"Viola - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/14QtZsRvozMN2WCgeBLQwJY6GaEjvA9FG/view?usp=drivesdk","description":"Violín 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1TIYQ5grC_01BlTjRZxo3CwSU7Q-quBrG/view?usp=drivesdk","description":"Violín 2 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1d--wlOOqBNq68WaixSF_8ggHFt0156GD/view?usp=drivesdk","description":"Violoncello - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1ex9KeW4Qqv-z5DU1y_Fn7gqNbayUEWBS/view?usp=drivesdk","description":"Voz - Coming in from the Cold - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1980, anio_composicion),
      duracion_segundos = COALESCE(248, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1EBhBDUnlYEGKOimSbBM_5hkWWUXDk2MS',
      audios = '[{"drive_file_id":"1GN5za-kQlPyG3qHNDlD9bldHeySwOHls","name":"AUDIO - Coming in from the Cold (Orq REFE).mp3","url":"https://drive.google.com/file/d/1GN5za-kQlPyG3qHNDlD9bldHeySwOHls/view?usp=drivesdk","label":"Coming in from the Cold (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1BP6jSfY2dtR_N5Frl9U-I0JNfPj5RKby/view?usp=drivesdk","description":"Clarinete Bb 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1L0t6XoJNvbYl3A3WA5pJjy6xW_im3096/view?usp=drivesdk","description":"Corno F 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1h1chmJqK4dksrvzYFUWiGcycktT_En7R/view?usp=drivesdk","description":"Flauta 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1ho4lXkEYrafyixYEh2I_fcGAge9iU6OR/view?usp=drivesdk","description":"Oboe 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/14ynbTkZ0IrmFlUE92OvRJn_HYFS6ZSXD/view?usp=drivesdk","description":"Perc Marimba - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1EuBhi_X3m6aucltrYXk3wO_cRHFTaxvG/view?usp=drivesdk","description":"Saxo Tenor - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1y_2dWeS1lotGy8YQ_NEVltttH3zO6nHs/view?usp=drivesdk","description":"SCORE - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1UviUQkUvsK7t9ZmFCdtP2g9SThVr9Qj3/view?usp=drivesdk","description":"Trombón 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/15oh-NQmemF-p6P-y-R8tz3ogHv-aM23M/view?usp=drivesdk","description":"Trompeta 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1UTEvEQG9bL6i1VNExoCK_HLBNcatolFR/view?usp=drivesdk","description":"Viola - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/14QtZsRvozMN2WCgeBLQwJY6GaEjvA9FG/view?usp=drivesdk","description":"Violín 1 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1TIYQ5grC_01BlTjRZxo3CwSU7Q-quBrG/view?usp=drivesdk","description":"Violín 2 - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1d--wlOOqBNq68WaixSF_8ggHFt0156GD/view?usp=drivesdk","description":"Violoncello - Coming in from the Cold - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1ex9KeW4Qqv-z5DU1y_Fn7gqNbayUEWBS/view?usp=drivesdk","description":"Voz - Coming in from the Cold - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 14);
  ELSE
    UPDATE repertorio_obras SET orden = 14
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 15. Exodus
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Exodus'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Exodus. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Exodus',
      1977,
      316,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Exodus. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1Vk_YI_7gJA4PLpKINU8VRVRZ9-Z7odmO',
      '[{"drive_file_id":"14rTtrsWsZkLA-2meJu3TOEPHu6qWFF0z","name":"AUDIO - Exodus (Orq REFE).mp3","url":"https://drive.google.com/file/d/14rTtrsWsZkLA-2meJu3TOEPHu6qWFF0z/view?usp=drivesdk","label":"Exodus (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1_HhiBySkp1CsjP5oU11dy22dPNU2Hk9M/view?usp=drivesdk","description":"Clarinete Bb 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1HLjfbrz8W5hiZBgQujqpjEGw4oSQh8Dm/view?usp=drivesdk","description":"Corno F 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1ly4XeR7dvpKpG40DAAu6oMTsBnmNOTbK/view?usp=drivesdk","description":"Flauta 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1WiFKa3bN0CFHfQHLqHsHGUzOd8zcluzz/view?usp=drivesdk","description":"Oboe 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1pw-z0PvPFC86KIkvCTeSQD9HYv--Y5Jw/view?usp=drivesdk","description":"Perc Marimba - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/171dmAR5SxsbDoWzepWaifdkP9DKKv_TA/view?usp=drivesdk","description":"Saxo Tenor - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1VndqA9RDicI3wZrvygDw2bsguxuVP146/view?usp=drivesdk","description":"SCORE - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1cgx-Dr5GP9WZj5YrcQl4d1N_XFPfplix/view?usp=drivesdk","description":"Trombón 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1v0210kfcAa9iRVAzzhXXFu6zu7UZTGhY/view?usp=drivesdk","description":"Trompeta 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1cacEjHgSfd02HYTNuL7gaBbr6smv2e_6/view?usp=drivesdk","description":"Viola - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1hmXjmKc-Wo7te5bIENDzQ934h_RSwiXl/view?usp=drivesdk","description":"Violín 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1KyKrHp3EdVvH200EZdHOUse16jBoVv-R/view?usp=drivesdk","description":"Violín 2 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1VEZOMSmtqNyp8SKBhKTtwKBh6IA1Sqem/view?usp=drivesdk","description":"Violoncello - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1dMPZqNT4Wi-uHut93lkQUCO6ElJrwPYF/view?usp=drivesdk","description":"Voz - Exodus - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1977, anio_composicion),
      duracion_segundos = COALESCE(316, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1Vk_YI_7gJA4PLpKINU8VRVRZ9-Z7odmO',
      audios = '[{"drive_file_id":"14rTtrsWsZkLA-2meJu3TOEPHu6qWFF0z","name":"AUDIO - Exodus (Orq REFE).mp3","url":"https://drive.google.com/file/d/14rTtrsWsZkLA-2meJu3TOEPHu6qWFF0z/view?usp=drivesdk","label":"Exodus (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1_HhiBySkp1CsjP5oU11dy22dPNU2Hk9M/view?usp=drivesdk","description":"Clarinete Bb 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1HLjfbrz8W5hiZBgQujqpjEGw4oSQh8Dm/view?usp=drivesdk","description":"Corno F 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1ly4XeR7dvpKpG40DAAu6oMTsBnmNOTbK/view?usp=drivesdk","description":"Flauta 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1WiFKa3bN0CFHfQHLqHsHGUzOd8zcluzz/view?usp=drivesdk","description":"Oboe 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1pw-z0PvPFC86KIkvCTeSQD9HYv--Y5Jw/view?usp=drivesdk","description":"Perc Marimba - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/171dmAR5SxsbDoWzepWaifdkP9DKKv_TA/view?usp=drivesdk","description":"Saxo Tenor - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1VndqA9RDicI3wZrvygDw2bsguxuVP146/view?usp=drivesdk","description":"SCORE - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1cgx-Dr5GP9WZj5YrcQl4d1N_XFPfplix/view?usp=drivesdk","description":"Trombón 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1v0210kfcAa9iRVAzzhXXFu6zu7UZTGhY/view?usp=drivesdk","description":"Trompeta 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1cacEjHgSfd02HYTNuL7gaBbr6smv2e_6/view?usp=drivesdk","description":"Viola - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1hmXjmKc-Wo7te5bIENDzQ934h_RSwiXl/view?usp=drivesdk","description":"Violín 1 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1KyKrHp3EdVvH200EZdHOUse16jBoVv-R/view?usp=drivesdk","description":"Violín 2 - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1VEZOMSmtqNyp8SKBhKTtwKBh6IA1Sqem/view?usp=drivesdk","description":"Violoncello - Exodus - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1dMPZqNT4Wi-uHut93lkQUCO6ElJrwPYF/view?usp=drivesdk","description":"Voz - Exodus - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 15);
  ELSE
    UPDATE repertorio_obras SET orden = 15
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- 16. Jamming
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = 'Jamming'
    AND COALESCE(o.observaciones, '') = 'Para acomodar — Bahiano — Marley, B. - Jamming. Arreglo sinfónico (audio ref. Orq. REFE).'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      'Jamming',
      1977,
      193,
      'Oficial',
      'Para acomodar — Bahiano — Marley, B. - Jamming. Arreglo sinfónico (audio ref. Orq. REFE).',
      '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      'https://drive.google.com/drive/folders/1L_1QLmuaYSfajmdf_LT9NqsGbyUFchrg',
      '[{"drive_file_id":"1BjWkhGpdWyjCLY0Z-JS5jQcAZ17tNjkH","name":"AUDIO - Jamming (Orq REFE).mp3","url":"https://drive.google.com/file/d/1BjWkhGpdWyjCLY0Z-JS5jQcAZ17tNjkH/view?usp=drivesdk","label":"Jamming (Orq REFE)"}]'::jsonb
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/11SOpYh9hO0sQd6luFM6jwVkC3nr7BPfd/view?usp=drivesdk","description":"Clarinete Bb 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1OtkKaCGgYbluZO4Rs3TGlKrbBjCciJzZ/view?usp=drivesdk","description":"Corno F 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1FUCifx_hbsls14vIqpbOtHwPGaiRihI6/view?usp=drivesdk","description":"Flauta 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1J3Z-Bmhtq61d9oIzktuua3sZxtx5jbpP/view?usp=drivesdk","description":"Oboe 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1ou4156aHrYpbChx-TL5CbZc6O4rZu6av/view?usp=drivesdk","description":"Perc Marimba - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/16qCuVYZKhXgFAjtYtt7801gAiztCvjVJ/view?usp=drivesdk","description":"Saxo Tenor - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1AYz0WXXPmRd8ecWHWHxCeYNuIfw_sJQ9/view?usp=drivesdk","description":"SCORE - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1dBYTv-_yOPuf5tyoBnyXMJY8AlZUqcXv/view?usp=drivesdk","description":"Trombón 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1cyx8NO19bQdwKZHsTZIe7L0EL2d1dvtR/view?usp=drivesdk","description":"Trompeta 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1-BOoN84ZkzICauTeWb3ldikthcUF2IkG/view?usp=drivesdk","description":"Viola - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1hwZJxPTOaDNiWpbPWR7uMtwClEa_ooiX/view?usp=drivesdk","description":"Violín 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1wrsaFVMRZfVn6oMtRNanNFd_kLUIIN22/view?usp=drivesdk","description":"Violín 2 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1H6eCB5rj7jbj8-X4ca0JxunG3iSKroHy/view?usp=drivesdk","description":"Violoncello - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1rfhoV665Wgh4c9uKy3NBSCS-VwL49ZXG/view?usp=drivesdk","description":"Voz - Jamming - Marley, B.pdf"}]', false);
  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(1977, anio_composicion),
      duracion_segundos = COALESCE(193, duracion_segundos),
      instrumentacion = '1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz',
      link_drive = 'https://drive.google.com/drive/folders/1L_1QLmuaYSfajmdf_LT9NqsGbyUFchrg',
      audios = '[{"drive_file_id":"1BjWkhGpdWyjCLY0Z-JS5jQcAZ17tNjkH","name":"AUDIO - Jamming (Orq REFE).mp3","url":"https://drive.google.com/file/d/1BjWkhGpdWyjCLY0Z-JS5jQcAZ17tNjkH/view?usp=drivesdk","label":"Jamming (Orq REFE)"}]'::jsonb
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/11SOpYh9hO0sQd6luFM6jwVkC3nr7BPfd/view?usp=drivesdk","description":"Clarinete Bb 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1OtkKaCGgYbluZO4Rs3TGlKrbBjCciJzZ/view?usp=drivesdk","description":"Corno F 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1FUCifx_hbsls14vIqpbOtHwPGaiRihI6/view?usp=drivesdk","description":"Flauta 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1J3Z-Bmhtq61d9oIzktuua3sZxtx5jbpP/view?usp=drivesdk","description":"Oboe 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/1ou4156aHrYpbChx-TL5CbZc6O4rZu6av/view?usp=drivesdk","description":"Perc Marimba - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/16qCuVYZKhXgFAjtYtt7801gAiztCvjVJ/view?usp=drivesdk","description":"Saxo Tenor - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1AYz0WXXPmRd8ecWHWHxCeYNuIfw_sJQ9/view?usp=drivesdk","description":"SCORE - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1dBYTv-_yOPuf5tyoBnyXMJY8AlZUqcXv/view?usp=drivesdk","description":"Trombón 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1cyx8NO19bQdwKZHsTZIe7L0EL2d1dvtR/view?usp=drivesdk","description":"Trompeta 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1-BOoN84ZkzICauTeWb3ldikthcUF2IkG/view?usp=drivesdk","description":"Viola - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1hwZJxPTOaDNiWpbPWR7uMtwClEa_ooiX/view?usp=drivesdk","description":"Violín 1 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1wrsaFVMRZfVn6oMtRNanNFd_kLUIIN22/view?usp=drivesdk","description":"Violín 2 - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1H6eCB5rj7jbj8-X4ca0JxunG3iSKroHy/view?usp=drivesdk","description":"Violoncello - Jamming - Marley, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1rfhoV665Wgh4c9uKy3NBSCS-VwL49ZXG/view?usp=drivesdk","description":"Voz - Jamming - Marley, B.pdf"}]', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, 16);
  ELSE
    UPDATE repertorio_obras SET orden = 16
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

END $$;
