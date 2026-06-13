-- TEMPORAL CINE: 7 obras con tag Películas
-- Generado: 2026-06-12

DO $$
DECLARE
  _id_obra bigint;
  _id_tag bigint;
  _id_comp_Badelt_Klaus bigint;
  _id_comp_Horner_James bigint;
  _id_comp_Williams_John bigint;
  _id_comp_Zimmer_Hans bigint;
  _id_arr_Ricketts_Theodore bigint;
  _id_arr_Moss_ bigint;
  _id_arr_Williams_John bigint;
  _id_arr_Sayre_Jerry bigint;
BEGIN
  SELECT id INTO _id_tag FROM palabras_clave WHERE tag = 'Películas' LIMIT 1;
  IF _id_tag IS NULL THEN
    INSERT INTO palabras_clave (tag) VALUES ('Películas') RETURNING id INTO _id_tag;
  END IF;

  SELECT id INTO _id_comp_Badelt_Klaus FROM compositores WHERE apellido = 'Badelt' AND (nombre = 'Klaus' OR (nombre IS NULL AND 'Klaus' IS NULL)) LIMIT 1;
  IF _id_comp_Badelt_Klaus IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Badelt', 'Klaus') RETURNING id INTO _id_comp_Badelt_Klaus;
  END IF;

  SELECT id INTO _id_comp_Horner_James FROM compositores WHERE apellido = 'Horner' AND (nombre = 'James' OR (nombre IS NULL AND 'James' IS NULL)) LIMIT 1;
  IF _id_comp_Horner_James IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Horner', 'James') RETURNING id INTO _id_comp_Horner_James;
  END IF;

  SELECT id INTO _id_comp_Williams_John FROM compositores WHERE apellido = 'Williams' AND (nombre = 'John' OR (nombre IS NULL AND 'John' IS NULL)) LIMIT 1;
  IF _id_comp_Williams_John IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Williams', 'John') RETURNING id INTO _id_comp_Williams_John;
  END IF;

  SELECT id INTO _id_comp_Zimmer_Hans FROM compositores WHERE apellido = 'Zimmer' AND (nombre = 'Hans' OR (nombre IS NULL AND 'Hans' IS NULL)) LIMIT 1;
  IF _id_comp_Zimmer_Hans IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Zimmer', 'Hans') RETURNING id INTO _id_comp_Zimmer_Hans;
  END IF;

  SELECT id INTO _id_arr_Ricketts_Theodore FROM compositores WHERE apellido = 'Ricketts' AND (nombre = 'Theodore' OR (nombre IS NULL AND 'Theodore' IS NULL)) LIMIT 1;
  IF _id_arr_Ricketts_Theodore IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Ricketts', 'Theodore') RETURNING id INTO _id_arr_Ricketts_Theodore;
  END IF;

  SELECT id INTO _id_arr_Moss_ FROM compositores WHERE apellido = 'Moss' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_arr_Moss_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Moss', NULL) RETURNING id INTO _id_arr_Moss_;
  END IF;

  SELECT id INTO _id_arr_Williams_John FROM compositores WHERE apellido = 'Williams' AND (nombre = 'John' OR (nombre IS NULL AND 'John' IS NULL)) LIMIT 1;
  IF _id_arr_Williams_John IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Williams', 'John') RETURNING id INTO _id_arr_Williams_John;
  END IF;

  SELECT id INTO _id_arr_Sayre_Jerry FROM compositores WHERE apellido = 'Sayre' AND (nombre = 'Jerry' OR (nombre IS NULL AND 'Jerry' IS NULL)) LIMIT 1;
  IF _id_arr_Sayre_Jerry IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Sayre', 'Jerry') RETURNING id INTO _id_arr_Sayre_Jerry;
  END IF;

  -- Piratas del Caribe [Películas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Piratas del Caribe [Películas]' AND oc.id_compositor = _id_arr_Ricketts_Theodore
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Piratas del Caribe [Películas]',
      _id_arr_Ricketts_Theodore,
      2003,
      379,
      'Oficial',
      'Películas — arr. Theodore Ricketts (Badelt)',
      '2.2.3.2 - 3.3.3.1 - Timp.+3 - Key - Str',
      'https://drive.google.com/drive/folders/1C8XnNrytxKqbNLuTluhn5EzjrsntE66R'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Badelt_Klaus, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Ricketts_Theodore, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Ricketts_Theodore
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1ClSGVQFY4hnWevfnC8UuFcNIwjhGx5p9/view?usp=drivesdk","description":"Clarinete Bb 1 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1CnLLafpZeUOKJTSR77aYcdJQZgRyfvXM/view?usp=drivesdk","description":"Clarinete Bb 2 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 3', '[{"url":"https://drive.google.com/file/d/1CxZZ61MwhMOG5l7vY5PqbCXdW2kggYcB/view?usp=drivesdk","description":"Clarinete Bb 3 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1CKChIyE4yRvfqcg7eo50tN6M11IFOE0s/view?usp=drivesdk","description":"Contrabajo - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1CeBmk1qjd_NQJUQDKUL1HcuPglyCiNd8/view?usp=drivesdk","description":"Corno F 1 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1CqFajPo0QqqR4y6yH3_Z6YA1A9V4NvLL/view?usp=drivesdk","description":"Corno F 2 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1CI2NX8x688dNWptgFvGpLyYlUMHLc7rx/view?usp=drivesdk","description":"Corno F 3 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1Cm-_acsv4LdtoHQMRtGASDMZUjUACGep/view?usp=drivesdk","description":"Fagot 1 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1Cq8iAnDGTxUgNugwKStTyJVRGo-zl8Br/view?usp=drivesdk","description":"Fagot 2 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1Cs99auzDnRNs1rEMMebmbWDgNzW-gw7_/view?usp=drivesdk","description":"Flauta 1 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1CsqCJG8l50cB5iyj2eARlp4YRvOc3qNU/view?usp=drivesdk","description":"Flauta 2 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1CorNeNSjLuy12ck0iVCgQpLQQYZ1XDEi/view?usp=drivesdk","description":"Oboe 1 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1CMPfKOwk5iopjJJBCQxZxpeWLUVbqaV3/view?usp=drivesdk","description":"Oboe 2 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc 1', '[{"url":"https://drive.google.com/file/d/1C_FwyiGkmdlk2SMxQKho6VqYAqeYnICs/view?usp=drivesdk","description":"Perc 1 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc 2', '[{"url":"https://drive.google.com/file/d/1CPjUQPMi_eNDviKxgaP6k9YqoE6InvVq/view?usp=drivesdk","description":"Perc 2 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc 3', '[{"url":"https://drive.google.com/file/d/1Cw-Wi-F1pg8Dma52S-cB_5XBF1GNAyaF/view?usp=drivesdk","description":"Perc 3 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1CNcxaeFh0JeOutFdSf8ycH-ft6ELO-fY/view?usp=drivesdk","description":"Perc Timbales - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1CHL97CUHBl-RTHvrxpFvtXv4Un_lk5Y0/view?usp=drivesdk","description":"Piano - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1D6FGEbxdoNAkauMy1cWVY2_kutCwkoGe/view?usp=drivesdk","description":"SCORE - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1CXKLy1eSQ1jBawnKKXOn8UQb8HNGx_QH/view?usp=drivesdk","description":"Trombón 1 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1Cay9r38UHFNLSWe6clyXk0Y7DDNSAA2J/view?usp=drivesdk","description":"Trombón 2 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1Ce91O_36aK8t6lai3x8-peNezt6Vuyjq/view?usp=drivesdk","description":"Trombón 3 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1C_7qvmEcGskOyzdP02Wi42o75qhOTvEy/view?usp=drivesdk","description":"Trompeta Bb 1 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1CPPu1ueaDcPIKPIyx1t2NiQir1_NOOEx/view?usp=drivesdk","description":"Trompeta Bb 2 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[{"url":"https://drive.google.com/file/d/1CVkaVIVuvjc8aUqlbGqjLsquDdZ6MAVM/view?usp=drivesdk","description":"Trompeta Bb 3 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1CcGyF6HrZ4nMUWXFnoa31WaRCRBL0SBm/view?usp=drivesdk","description":"Tuba - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1CtshlcfVpcqCo8kRxeqtH6o0rqlgSs_m/view?usp=drivesdk","description":"Viola - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1CXsIEEa_rzOyzOAvklX4kxo8ACmgsBR9/view?usp=drivesdk","description":"Violín 1 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Cs2BBa8UijTaFjE7UFm57AEMIjz4roy_/view?usp=drivesdk","description":"Violín 2 - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1CfS6pw1-nz7Q7dnF8YT8j3TdXgIxwXZ-/view?usp=drivesdk","description":"Violoncello - Piratas del Caribe - Badelt-Ricketts.pdf"}]', false);
    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT _id_obra, _id_tag
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_palabras_clave opc
      WHERE opc.id_obra = _id_obra AND opc.id_palabra_clave = _id_tag
    );

  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Piratas del Caribe [Películas]';
  END IF;

  -- Apollo 13 [Películas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Apollo 13 [Películas]' AND oc.id_compositor = _id_arr_Moss_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Apollo 13 [Películas]',
      _id_arr_Moss_,
      1995,
      338,
      'Oficial',
      'Películas — arr. Moss (Horner)',
      '1.1.3.1 - 2.3.3.1 - Timp.+2 - Key - Str',
      'https://drive.google.com/drive/folders/1I9vZQADhnlbBFT3fAsCh5cCrKpNuz5kL'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Horner_James, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Moss_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Moss_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinee Bajo', '[{"url":"https://drive.google.com/file/d/1InXeFYGuevJKaItvBPxiUln2jxjRgK88/view?usp=drivesdk","description":"Clarinee Bajo - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1IthZd3zZCAJpCjTHMUDn19bICo323b34/view?usp=drivesdk","description":"Clarinete Bb 1 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1IJrmPWp6KKMAwPJxqDFauIOhobGsFGfy/view?usp=drivesdk","description":"Clarinete Bb 2 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1IKWfJfFvmn0VROdTzXirwnWdkt0B3ec5/view?usp=drivesdk","description":"Contrabajo - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1y2', '[{"url":"https://drive.google.com/file/d/1Imm1LYEOUriwQR7Yi1MpLlkdMyds7iLz/view?usp=drivesdk","description":"Corno F 1y2 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3y4', '[{"url":"https://drive.google.com/file/d/1IOkv71m-DGh5-AKE-9NW7J4MUGAoMYwa/view?usp=drivesdk","description":"Corno F 3y4 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1IMFSBJ7-uwvRkSup2a1IuHNgGvgKTWK2/view?usp=drivesdk","description":"Fagot - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1IiI_lAB7DAQ_SYAlwc4Q4yHHdGbP1EWN/view?usp=drivesdk","description":"Flauta 1 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1IUSQAY4YbW_8PPPQERtn40oclNs6enDC/view?usp=drivesdk","description":"Oboe - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1IVgdOCMHeoya5ZU6wMVIee6G6kRGPXKo/view?usp=drivesdk","description":"Perc Timbales - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Percusión 1', '[{"url":"https://drive.google.com/file/d/1IDCC-XAF-Svi6Onnzk-uTUJJRrzFjl-9/view?usp=drivesdk","description":"Percusión 1 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Percusión 2', '[{"url":"https://drive.google.com/file/d/1J0lN97EgKkrBRHspXuNh2aLa227gf6eI/view?usp=drivesdk","description":"Percusión 2 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1J-uBilcCMroAXr3OSBRDCrLuEK71_yRt/view?usp=drivesdk","description":"Piano - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1IkUJNZozpwixpFwUx-fwMwWsNO6fXNlN/view?usp=drivesdk","description":"SCORE - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1IQq-IujBvNtO2CfUk0vKWbQMXqoukBzb/view?usp=drivesdk","description":"Trombón 1 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1IQcW5tefL8HQiPY0phQZKmcXTiK991iI/view?usp=drivesdk","description":"Trombón 2 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1IZGaG6bkP9klVHVlIUKAumq0yf-dJqfp/view?usp=drivesdk","description":"Trombón 3 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1IGWIXdSsWF969FWNufO9KZuOVn3d_Oa-/view?usp=drivesdk","description":"Trompeta Bb 1 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1IOb6dCeUd1uNobbw5uBIkP_TainCuxdp/view?usp=drivesdk","description":"Trompeta Bb 2 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[{"url":"https://drive.google.com/file/d/1IDoeXFgOf0nbp-1nbEgTqhoVtrS3plZq/view?usp=drivesdk","description":"Trompeta Bb 3 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1IiUS8MCkKin4YD01Nje0dKECp1NdMgPG/view?usp=drivesdk","description":"Tuba - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1IJVSAsVK4OZc5Crx_Po-Sf-sp_Mk-mxl/view?usp=drivesdk","description":"Viola - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1IjTr9dxS6vhwnnbmTjQ8rGRyM-WW0u7F/view?usp=drivesdk","description":"Violín 1 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1InegHyMNVLmE0mqUVUomoU0wrfR5hjCJ/view?usp=drivesdk","description":"Violín 2 - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1IVHudPNpZ9JKKvQW0Vc0NNsGJpvpBAZk/view?usp=drivesdk","description":"Violoncello - Apollo 13 - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT _id_obra, _id_tag
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_palabras_clave opc
      WHERE opc.id_obra = _id_obra AND opc.id_palabra_clave = _id_tag
    );

  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Apollo 13 [Películas]';
  END IF;

  -- Titanic [Películas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Titanic [Películas]' AND oc.id_compositor = _id_arr_Moss_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Titanic [Películas]',
      _id_arr_Moss_,
      1997,
      240,
      'Oficial',
      'Películas — arr. Moss (Horner)',
      '2.2.3.1 - 4.3.3.1 - Timp.+2 - Key - Str',
      'https://drive.google.com/drive/folders/1GP_ou--mlFnU3jXfgA6gMpM3MpFI96Ea'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Horner_James, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Moss_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Moss_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1HB_MOiVIdyPksPWTk7feWtgarWYudhxP/view?usp=drivesdk","description":"Clarinete Bajo - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1GrYX5_AQGszvmpJ7Hcyu7oXAVb1pFUMJ/view?usp=drivesdk","description":"Clarinete Bb 1 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1GrO7kb0RFjYMzT2Wwfij82qccAvEqbXh/view?usp=drivesdk","description":"Clarinete Bb 2 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Gmr23ycXXcju8nSL4sFAW5YJ-xiYc0Uo/view?usp=drivesdk","description":"Contrabajo - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1H-wArLo2T1QcgEU8bSw4puwhlfAnVZWX/view?usp=drivesdk","description":"Corno F 1 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1GhTqsFCH-ooMEwgBo-aAtqa57myZqSkr/view?usp=drivesdk","description":"Corno F 2 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1GX5uUTTrqPMsomyDfRqj8RoESWAgLMNu/view?usp=drivesdk","description":"Corno F 3 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1GhSyrM8_O92f1Q_1-7rFkTXGd-ftSc1Q/view?usp=drivesdk","description":"Corno F 4 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1GeBraGbLvNKdQb66ip-VezkSaCqf1jrH/view?usp=drivesdk","description":"Fagot - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1GbWQg7QshyMtVfGIbDo8_JtodAPTk1Wk/view?usp=drivesdk","description":"Flauta 1 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1Gn7ltPfO18VpeeTC12hedtkNBi63plkM/view?usp=drivesdk","description":"Flauta 2 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1H007TvwXgLtgRwDb4twB7uzsI4Z6j03N/view?usp=drivesdk","description":"Oboe 1 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1GfVlZZ0i91Aaw91spDcYlW-R3GhZRgcq/view?usp=drivesdk","description":"Oboe 2 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1HFp9fHBArVbSXUY2HXng5R2NnRtl0wF2/view?usp=drivesdk","description":"Perc Timbales - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Percusión 1', '[{"url":"https://drive.google.com/file/d/1Gyuxy_rq7syMrwE9AmeiCStvh-iVLDf_/view?usp=drivesdk","description":"Percusión 1 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Percusión 2', '[{"url":"https://drive.google.com/file/d/1Gjp7ON0u36pxUkglmf9gxEvx3JsBadVe/view?usp=drivesdk","description":"Percusión 2 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1GkaSt5o2VNM3As9dSp-xtANFNRKaIABU/view?usp=drivesdk","description":"Piano - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1GZjCE8mweIuWeBtcVZP-z70Zz3tIMpVT/view?usp=drivesdk","description":"SCORE - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1GZqp2ed5GVI5whYWEkYnAeuQiuyPKDUr/view?usp=drivesdk","description":"Trombón 1 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1Gz7cIKHEBUupCGjgmmYBMeMHFFZYGWgm/view?usp=drivesdk","description":"Trombón 2 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1Gq2YEnAcrRKifFpE2Ltzfz8ZyaJozCCl/view?usp=drivesdk","description":"Trombón 3 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1GxzD-EOwWFHTFgJSp5e8ZQ7heu_-vjpn/view?usp=drivesdk","description":"Trompeta Bb 1 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1H4cAUMFXH8z5LYC1oYaSnViujwQkRd5k/view?usp=drivesdk","description":"Trompeta Bb 2 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[{"url":"https://drive.google.com/file/d/1H0KGPSqHTUhDg-lBPUodU_EQyhmeCZ0c/view?usp=drivesdk","description":"Trompeta Bb 3 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1GlePFG0tWSlJnZzDP0fGvbinOKcbhG8Q/view?usp=drivesdk","description":"Tuba - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Gfyc-4Ft3B3SLm0L4b_b7RbIYlHbx84_/view?usp=drivesdk","description":"Viola - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1GWG88QdO2Dgdbwmo5ldulC7iyGkWKDuR/view?usp=drivesdk","description":"Violín 1 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1GnxFox3K8HgMsXsmPdZfKUw4hTjIos_7/view?usp=drivesdk","description":"Violín 2 - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1GvKpDf3alD3Zo0IVaBTN0ssiJJQ6Gj2B/view?usp=drivesdk","description":"Violoncello - Titanic - Horner-Moss.pdf"}]', false);
    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT _id_obra, _id_tag
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_palabras_clave opc
      WHERE opc.id_obra = _id_obra AND opc.id_palabra_clave = _id_tag
    );

  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Titanic [Películas]';
  END IF;

  -- The Imperial March [Películas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'The Imperial March [Películas]' AND oc.id_compositor = _id_arr_Williams_John
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'The Imperial March [Películas]',
      _id_arr_Williams_John,
      1980,
      230,
      'Oficial',
      'Películas — John Williams (Star Wars)',
      '',
      'https://drive.google.com/file/d/1C3CktBN35a-H9hRsSzyrrHyRZH4linh_/view?usp=drivesdk'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Williams_John, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Williams_John, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Williams_John
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1C3CktBN35a-H9hRsSzyrrHyRZH4linh_/view?usp=drivesdk","description":"Imperial March Score.pdf"}]', false);
    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT _id_obra, _id_tag
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_palabras_clave opc
      WHERE opc.id_obra = _id_obra AND opc.id_palabra_clave = _id_tag
    );

  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): The Imperial March [Películas]';
  END IF;

  -- The Lion King [Películas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'The Lion King [Películas]'
      AND o.observaciones = 'Películas — The Lion King (PDF score + parts)'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'The Lion King [Películas]',
      NULL,
      1994,
      194,
      'Oficial',
      'Películas — The Lion King (PDF score + parts)',
      '',
      'https://drive.google.com/file/d/1CGh8gGcqI6_6L2hgQIQlaPdUpdyCQ-aq/view?usp=drivesdk'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Zimmer_Hans, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1CGh8gGcqI6_6L2hgQIQlaPdUpdyCQ-aq/view?usp=drivesdk","description":"The Lion King Score and parts.pdf"}]', false);
    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT _id_obra, _id_tag
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_palabras_clave opc
      WHERE opc.id_obra = _id_obra AND opc.id_palabra_clave = _id_tag
    );

  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): The Lion King [Películas]';
  END IF;

  -- Amistad, Dry your Tears, Afrika [Películas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Amistad, Dry your Tears, Afrika [Películas]' AND oc.id_compositor = _id_arr_Williams_John
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Amistad, Dry your Tears, Afrika [Películas]',
      _id_arr_Williams_John,
      1997,
      251,
      'Oficial',
      'Películas — John Williams',
      '3.3.3.3 - 4.3.3.1 - Timp.+3 - Hp - Str',
      'https://drive.google.com/drive/folders/1K8_UsjixDvLNrLzr0kGoX4Zz4nbrIg1D'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Williams_John, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Williams_John, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Williams_John
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1L4-mjV4bwtuA13Ayp_3-DNEa-uUWg7Ft/view?usp=drivesdk","description":"Arpa - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1L0UsloLrWYWGBb6rMFibh-d3xaLRsdUC/view?usp=drivesdk","description":"Clarinete Bajo - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1LHGbYsrkt_C-ddArhOXikmPjEPz9tlfu/view?usp=drivesdk","description":"Clarinete Bb 1 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1KoI0DaJX34OLIAO8_ocnRH7rnMdeYb2u/view?usp=drivesdk","description":"Clarinete Bb 2 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1KAPcBUMZyVTNrZHje_eMRd3fnfe1DLpP/view?usp=drivesdk","description":"Contrabajo - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1L2lydf8jnU90hJxV8BzIIufiQf6I10Cz/view?usp=drivesdk","description":"Corno F 1 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1Kb_uV8QmuyfPey_bAwdGpOrU_nuS4Nqq/view?usp=drivesdk","description":"Corno F 2 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1KwGZiu1151gDeNKEYrh9Xa1EYZgNH7-z/view?usp=drivesdk","description":"Corno F 3 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1KxuBeY6_gEjG4QuzvflO05ZvguE2jEEa/view?usp=drivesdk","description":"Corno F 4 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1KRmAYGwph1_Y0RN9e_zbF1rf75lNy_AA/view?usp=drivesdk","description":"Fagot 1 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1KMDtU-sPeJ_723KNUKnavYkhXmLxPsrD/view?usp=drivesdk","description":"Fagot 2 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fg Contrafagot', '[{"url":"https://drive.google.com/file/d/1LB0giOu6g0pf8cXJujgudwotXWQdSlod/view?usp=drivesdk","description":"Fg Contrafagot - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1L11v59hkcB_71C2Hkv6hEyVPBYZUgA5U/view?usp=drivesdk","description":"Fl Piccolo - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1KsWt6EtvGD8FzT5AfDjoSg5q4Doc_XNb/view?usp=drivesdk","description":"Flauta 1 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1LKjJkdypgmg1QgIX7yhvX0QZUNkqkkCf/view?usp=drivesdk","description":"Flauta 2-Picc - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1LRZ-WEs12ZJ6KLHuJe-80l0naqsgT9Bq/view?usp=drivesdk","description":"Oboe 1 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1KZ4GPaxaKSgRTR0dx3pxjeM3rCtNWqyq/view?usp=drivesdk","description":"Oboe 2 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 3 EH', '[{"url":"https://drive.google.com/file/d/1L1V00EG_kM4iLL7Gn1dR-2wKM8x9YFOp/view?usp=drivesdk","description":"Oboe 3 EH - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1L-YyNbXfeH9CkuSJRZiwCUplyf8C5PN0/view?usp=drivesdk","description":"Perc Timbales - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Percusión 1 Pulli Sticks', '[{"url":"https://drive.google.com/file/d/1L-dxCjpIPgj5j76-5c66mVnkoFB_EjWO/view?usp=drivesdk","description":"Percusión 1 Pulli Sticks - Bass Drum - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Percusión 2 Tablas', '[{"url":"https://drive.google.com/file/d/1LGCwa1R_qKFq3xshKi-nNmoPQ3JZZg7J/view?usp=drivesdk","description":"Percusión 2 Tablas - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Percusión 3 Marimba', '[{"url":"https://drive.google.com/file/d/1KHUzCJe_8LT6Gw4EF233HFEgjY4n3FPS/view?usp=drivesdk","description":"Percusión 3 Marimba - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1KcAgDGmUjWNcPDu2lMGCwkff6NZ_2VCY/view?usp=drivesdk","description":"SCORE - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1KaVWV3lpPCRJMUTrwLdzKjcPal6vUcf-/view?usp=drivesdk","description":"Trombón 1 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1KpaDgLVEX87R4UiaYeKIv3X_PTJKsMXz/view?usp=drivesdk","description":"Trombón 2 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1L06G4sLyXV7r5cnXnHKEZqspLjgBkNSS/view?usp=drivesdk","description":"Trombón 3 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1KFtClCdqivCI0JrDozab7LCKWO1Lco80/view?usp=drivesdk","description":"Trompeta Bb 1 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1LHA3pUCAnmSVh7nHSJYuYnsa6iKXTnxP/view?usp=drivesdk","description":"Trompeta Bb 2 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[{"url":"https://drive.google.com/file/d/1KePncv8LbgOmvFJQCYZGfq27YuErYGvO/view?usp=drivesdk","description":"Trompeta Bb 3 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1Kk9an_ZnYFTQHSIDTIKgxidLfSOYK05t/view?usp=drivesdk","description":"Tuba - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1L3hDPbqexHqdVTCSMzuMW-fjeWNWvLLy/view?usp=drivesdk","description":"Viola - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1KILXmjnXyzU2Sb2E4Lqrftar8LWFBK2C/view?usp=drivesdk","description":"Violín 1 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1KRzGR7cUFa60XHRThoxotC_7-25YPdmc/view?usp=drivesdk","description":"Violín 2 - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1KUsoEOUUIwZRny21UM1SShJwy30qLtsG/view?usp=drivesdk","description":"Violoncello - Amistad, Dry your Tears, Afrika - Williams, J.pdf"}]', false);
    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT _id_obra, _id_tag
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_palabras_clave opc
      WHERE opc.id_obra = _id_obra AND opc.id_palabra_clave = _id_tag
    );

  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Amistad, Dry your Tears, Afrika [Películas]';
  END IF;

  -- Star Wars, Main Theme [Películas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Star Wars, Main Theme [Películas]' AND oc.id_compositor = _id_arr_Sayre_Jerry
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Star Wars, Main Theme [Películas]',
      _id_arr_Sayre_Jerry,
      1977,
      402,
      'Oficial',
      'Películas — arr. Jerry Sayre (Williams)',
      '3.2.2.1 - 2.3.3.1 - Timp.+3 - Str',
      'https://drive.google.com/drive/folders/1LLslPjHjsEPRfH7K5Ni1t0_LXXR_GBo0'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Williams_John, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Sayre_Jerry, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Sayre_Jerry
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1LXsX4I0DOuOg46-lY85qCWzhz9bxhole/view?usp=drivesdk","description":"Clarinete Bb 1 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1Lof289ji9MolZBzllHOGOYEhZk1CHBaY/view?usp=drivesdk","description":"Clarinete Bb 2 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1LjQYV6uKTxRYkevYnQLsP_IZ3DEpDqum/view?usp=drivesdk","description":"Contrabajo - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1y2', '[{"url":"https://drive.google.com/file/d/1LxyL1OnGhxZ9xpR9pnRbTK2vkxvExvsd/view?usp=drivesdk","description":"Corno F 1y2 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3y4', '[{"url":"https://drive.google.com/file/d/1LrBvoEzuUUFKbrAyzrXT_noFtMT-s2ii/view?usp=drivesdk","description":"Corno F 3y4 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1LfzKsSq9rAStW1MnK9Mo1_MsC_GkJIyc/view?usp=drivesdk","description":"Fagot - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1Lg6R5FQWx5Sc6wRORDzKZqA3M07ZhRvS/view?usp=drivesdk","description":"Fl Piccolo - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1M2rAMi4YRva6deDIK2UFmG-aynxUJ2VU/view?usp=drivesdk","description":"Flauta 1 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1LTe99EsZmP8nO11CyQyRa2tBaENGSZrF/view?usp=drivesdk","description":"Flauta 2 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1M7MXdtsxvJKrgjZgBg5MoPS9q5RLfS4v/view?usp=drivesdk","description":"Oboe 1 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1LZkfKL6Ko9LJ3MUtlli3xe90S7GQOq8Y/view?usp=drivesdk","description":"Oboe 2 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc 1', '[{"url":"https://drive.google.com/file/d/1LRZk-OTWz8p2D1mAz0j3MbQ0nQqEwINc/view?usp=drivesdk","description":"Perc 1 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc 2', '[{"url":"https://drive.google.com/file/d/1MJlInV2FGDIY1ZIKpIuUgNhQ3XB3ldsG/view?usp=drivesdk","description":"Perc 2 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Mallet', '[{"url":"https://drive.google.com/file/d/1ML1xRSApjXujvPcf8JgKoZJuIbxDQJUK/view?usp=drivesdk","description":"Perc Mallet - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1LaHd3XHPXoZSDsNFSEPdxCCn-pZoHWU0/view?usp=drivesdk","description":"Perc Timbales - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1M-Ho-TupRoGQ_sEbC5OtD3Ff2RX8P_bc/view?usp=drivesdk","description":"SCORE - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1MdU8dcZqAcAV7C9hKSCOtPfFVzjOotUw/view?usp=drivesdk","description":"Trombón 1 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1Ls1zemJzeuwC32Qm9bszUpm6mDJhvvr7/view?usp=drivesdk","description":"Trombón 2 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1LrAINiP-YjYDWEAxGRFxrvZoAOMNMkKE/view?usp=drivesdk","description":"Trombón 3 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1MRdqlijgF3lJaYy1YaXY2SpA-WwNFg6G/view?usp=drivesdk","description":"Trompeta Bb 1 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1MIaC_KF-TCG5YI06tOwbZ-mik2tMJuCw/view?usp=drivesdk","description":"Trompeta Bb 2 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[{"url":"https://drive.google.com/file/d/1M0gzCI9SV8g_h76o5zpjnOM6y6CsX2Bd/view?usp=drivesdk","description":"Trompeta Bb 3 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1MGFk9oHCjWvsCC-5jBWeJipMzCp-CVLZ/view?usp=drivesdk","description":"Tuba - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1M6hxGX-x1IOW5AzKdLwGHpAI_FEKgonL/view?usp=drivesdk","description":"Viola - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1LiXJN1Nc9Rfw8IEiaAhSFgdDdruvZdTk/view?usp=drivesdk","description":"Violín 1 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1MEGp_1WXWXhJWYwR9ameRh_6F764Ag7C/view?usp=drivesdk","description":"Violín 2 - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1LVe9WTp4LHIXp8RqTO4AoTkf9OGWFLI4/view?usp=drivesdk","description":"Violoncello - Star Wars, Main Theme - Williams-Sayre.pdf"}]', false);
    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT _id_obra, _id_tag
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_palabras_clave opc
      WHERE opc.id_obra = _id_obra AND opc.id_palabra_clave = _id_tag
    );

  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Star Wars, Main Theme [Películas]';
  END IF;

END $$;
