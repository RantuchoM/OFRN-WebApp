-- Lockhart — Montevideana Nro. 1 + Homenaje a Astor Piazzolla (Para acomodar)
-- Generado: 2026-08-31

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Lockhart_Beatriz bigint;
BEGIN
  SELECT id INTO _id_comp_Lockhart_Beatriz FROM compositores WHERE apellido = 'Lockhart' AND (nombre = 'Beatriz' OR (nombre IS NULL AND 'Beatriz' IS NULL)) LIMIT 1;
  IF _id_comp_Lockhart_Beatriz IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Lockhart', 'Beatriz') RETURNING id INTO _id_comp_Lockhart_Beatriz;
  END IF;

  -- <p>Montevideana Nro. 1</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Montevideana Nro. 1</p>'
      AND o.observaciones = 'Para acomodar — Lockhart, B. - Montevideana Nro. 1'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Montevideana Nro. 1</p>',
      NULL,
      NULL,
      430,
      'Oficial',
      'Para acomodar — Lockhart, B. - Montevideana Nro. 1',
      '1.2.2.2 - 0.0.0.0 - Perc.x2 - Key - Str + Bandoneón',
      'https://drive.google.com/drive/folders/1BUABC_jXBeDL-G7Z-IU4twxqEFY-icOi'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Lockhart_Beatriz, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '22b', 'Bandoneón', '[{"url":"https://drive.google.com/file/d/1NfakXt7bcuAzMDHZPl_FX-nmU8QXw_2h/view?usp=drivesdk","description":"Bandoneón - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1B8hrrCJ-srFoMYDxvKVyEc5H9dgEQ2FV/view?usp=drivesdk","description":"Clarinete Bb 1 - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1iRHF11coe6xJNioIWA_LAwRUSflMlljN/view?usp=drivesdk","description":"Clarinete Bb 2 - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1xwx8TfAO9ZQEEcoQErYQYDqBOvDdC_ET/view?usp=drivesdk","description":"Contrabajo - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1ga_hVsoeBbEe0ib66vRKfR6Q7WUlmV7s/view?usp=drivesdk","description":"Fagot 1 - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1lzmuVVdJ7n_5mn4ZzDL-sJ2iWCvtW3dX/view?usp=drivesdk","description":"Fagot 2 - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1YbDKpptaftd4YF_76jvf7lkrbojIS4Cm/view?usp=drivesdk","description":"Flauta - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/10_5B7pByzGstzlG4bgG_piq2ZymA6NB_/view?usp=drivesdk","description":"Oboe 1 - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1RR7Mu6XJidg4PS8Iw0eFtdXIZhaDOSJH/view?usp=drivesdk","description":"Oboe 2 - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[{"url":"https://drive.google.com/file/d/1PbFJIiKI2EHqo19zgOr0vqMw9b5JVgQ9/view?usp=drivesdk","description":"Perc Percusión 1 - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/1yObyWSXNxIBlQyqwVNiKVH7f_P42rwPU/view?usp=drivesdk","description":"Perc Percusión 2 - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1x7jaEKzA373KUAex5r2lXNVTf8CTBJfm/view?usp=drivesdk","description":"Piano - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/17YV8IxpS5r6LtmnghjsvOwFBIN371nsz/view?usp=drivesdk","description":"SCORE - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1CN63mikT6uHLn1C09NbK4z0ORFXhH8yy/view?usp=drivesdk","description":"Viola - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1GON8xgcKpx0AjWqzESVtkUScDtVyMhtc/view?usp=drivesdk","description":"Violín 1 - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1LoApnkCinFX_d0uIfvDSo8hQuC5PHdxn/view?usp=drivesdk","description":"Violín 2 - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/18kNBIn9bMYgp66UuXovpOaWrO92aA2A3/view?usp=drivesdk","description":"Violoncello - Montevideana Nro. 1 - Lockhart, B.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Montevideana Nro. 1</p>';
  END IF;

  -- <p>Homenaje a Astor Piazzolla</p><div>&nbsp; I. Sureño</div><div>&nbsp; II. El Emigrante</div><div>&nbsp; III. Adiós Maestro</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Homenaje a Astor Piazzolla</p><div>&nbsp; I. Sureño</div><div>&nbsp; II. El Emigrante</div><div>&nbsp; III. Adiós Maestro</div>'
      AND o.observaciones = 'Para acomodar — Lockhart, B. - Homenaje a Astor Piazzolla'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Homenaje a Astor Piazzolla</p><div>&nbsp; I. Sureño</div><div>&nbsp; II. El Emigrante</div><div>&nbsp; III. Adiós Maestro</div>',
      NULL,
      1994,
      320,
      'Oficial',
      'Para acomodar — Lockhart, B. - Homenaje a Astor Piazzolla',
      'Key - Str + Bandoneón',
      'https://drive.google.com/drive/folders/1swxlkCS4aYRbyshXQQrYqmldHdheL2Kj'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Lockhart_Beatriz, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '22b', 'Bandoneón', '[{"url":"https://drive.google.com/file/d/1Q0hpJucArNCoaVdfJfAXeWir4yZHDFIy/view?usp=drivesdk","description":"Bandoneón - Homenaje a Astor Piazzolla - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1EUoLq7sRAgC_8Bt22B8-Vtm2m3_DN8dP/view?usp=drivesdk","description":"Contrabajo - Homenaje a Astor Piazzolla - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1vw7tj7vmX3KJ7J0liCsACE4sIOnm3nhf/view?usp=drivesdk","description":"Piano - Homenaje a Astor Piazzolla - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1eeRq_JHa_TV63KcPDC-DPG3UeYb-A1iU/view?usp=drivesdk","description":"SCORE - Homenaje a Astor Piazzolla - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1t6bdgT2E2dy8n3BNyytGlF5Pw7mNqJkW/view?usp=drivesdk","description":"Viola - Homenaje a Astor Piazzolla - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/16r7M2sBkVjjK7aGUV5rmRyxAy7l9FWJH/view?usp=drivesdk","description":"Violín 1 - Homenaje a Astor Piazzolla - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1HwUEawD4rCGNi2uEIK_rZp2k34Vhgchq/view?usp=drivesdk","description":"Violín 2 - Homenaje a Astor Piazzolla - Lockhart, B.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1TiPDI4bsKEVTH3laedoRvQIBh6eIRz1q/view?usp=drivesdk","description":"Violoncello - Homenaje a Astor Piazzolla - Lockhart, B.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Homenaje a Astor Piazzolla</p><div>&nbsp; I. Sureño</div><div>&nbsp; II. El Emigrante</div><div>&nbsp; III. Adiós Maestro</div>';
  END IF;

END $$;
