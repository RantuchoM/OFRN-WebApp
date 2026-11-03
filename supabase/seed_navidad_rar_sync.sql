-- Navidad: Oh, Dulce Navidad (White Christmas) + El Burrito Sabanero
-- Generado: 2026-11-03

DO $$
DECLARE
  _id_obra bigint;
  _id_tag bigint;
  _id_comp_Berlin_Irving bigint;
  _id_comp_Blanco_Hugo bigint;
  _id_arr_Torres_Mora_Celso bigint;
  _id_arr_Giraldo_Yimi bigint;
BEGIN
  SELECT id INTO _id_tag FROM palabras_clave WHERE tag = 'Navidad' LIMIT 1;
  IF _id_tag IS NULL THEN
    INSERT INTO palabras_clave (tag) VALUES ('Navidad') RETURNING id INTO _id_tag;
  END IF;

  SELECT id INTO _id_comp_Berlin_Irving FROM compositores WHERE apellido = 'Berlin' AND (nombre = 'Irving' OR (nombre IS NULL AND 'Irving' IS NULL)) LIMIT 1;
  IF _id_comp_Berlin_Irving IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Berlin', 'Irving') RETURNING id INTO _id_comp_Berlin_Irving;
  END IF;

  SELECT id INTO _id_comp_Blanco_Hugo FROM compositores WHERE apellido = 'Blanco' AND (nombre = 'Hugo' OR (nombre IS NULL AND 'Hugo' IS NULL)) LIMIT 1;
  IF _id_comp_Blanco_Hugo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Blanco', 'Hugo') RETURNING id INTO _id_comp_Blanco_Hugo;
  END IF;

  SELECT id INTO _id_arr_Torres_Mora_Celso FROM compositores WHERE apellido = 'Torres Mora' AND (nombre = 'Celso' OR (nombre IS NULL AND 'Celso' IS NULL)) LIMIT 1;
  IF _id_arr_Torres_Mora_Celso IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Torres Mora', 'Celso') RETURNING id INTO _id_arr_Torres_Mora_Celso;
  END IF;

  SELECT id INTO _id_arr_Giraldo_Yimi FROM compositores WHERE apellido = 'Giraldo' AND (nombre = 'Yimi' OR (nombre IS NULL AND 'Yimi' IS NULL)) LIMIT 1;
  IF _id_arr_Giraldo_Yimi IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Giraldo', 'Yimi') RETURNING id INTO _id_arr_Giraldo_Yimi;
  END IF;

  -- Oh, Dulce Navidad (White Christmas), para Orquesta y Coro
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Oh, Dulce Navidad (White Christmas), para Orquesta y Coro' AND oc.id_compositor = _id_arr_Torres_Mora_Celso
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Oh, Dulce Navidad (White Christmas), para Orquesta y Coro',
      _id_arr_Torres_Mora_Celso,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar - Berlin, I. - Oh, Dulce Navidad (White Christmas). Arr. Celso Torres Mora (2015). Partes de Fl. 1, Ob. 1-2 y Fg. 1-2 rotuladas ''Navidad Blanca'' (versión previa del mismo arreglo). Sin Flauta 2, Clarinetes ni voces separadas (SATB solo en el score).',
      '1.2.0.2 - 4.2.3.1 - Timp.+1 - Hp - Str',
      'https://drive.google.com/open?id=1EWlOTbIjUSpek6Awd1AJAK9plj6rDidj'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Berlin_Irving, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Torres_Mora_Celso, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Torres_Mora_Celso
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1RkXIk8AQi2ooNgseAzZouL0ej72o7NRe/view?usp=drivesdk","description":"Arpa - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1FiQDv-fk6mJxSDucwQpHnhMdpDrmKODP/view?usp=drivesdk","description":"Contrabajo - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1JLNtQK4oDUUN2iK_EZueYQGwmtba3Aqt/view?usp=drivesdk","description":"Corno 1 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1kL8SREr-dEjI02MsdMRIgEGy9Qs0afgC/view?usp=drivesdk","description":"Corno 2 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1Eh41ELfRwFc6HpimI6b2wHTRmoEJDE5P/view?usp=drivesdk","description":"Corno 3 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1GuqlX_yVhRZ0fFbTXJHC7_KnFBoda-ws/view?usp=drivesdk","description":"Corno 4 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1lgNqQRJOeK8VvJI28JZhsPQS6FCfq08_/view?usp=drivesdk","description":"Fagot 1 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1b0N6Eg_f_TkGfFVBTEUvMGyxloNVBRa8/view?usp=drivesdk","description":"Fagot 2 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1LoLVbIvPV0dzD_XHKVhl6CyHPMekf2Gz/view?usp=drivesdk","description":"Flauta 1 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1-yF1LS_rSDqpXCphmqbW1si2gceUVY4I/view?usp=drivesdk","description":"Oboe 1 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1LT6scA5RobNWEsabYRzyTp4jZHPGPE8p/view?usp=drivesdk","description":"Oboe 2 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1Tiw4ynNQm0XY3hbzaGYBSXPjCG-9WPSG/view?usp=drivesdk","description":"Perc Triángulo - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1vQZdQfP90QK7paM_CqCvS5e-NXAQYLcH/view?usp=drivesdk","description":"SCORE - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Timbales', '[{"url":"https://drive.google.com/file/d/1J4KVeM01iIvyLw3UlRT3NYeIOcD9DU01/view?usp=drivesdk","description":"Timbales - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1cev5vwOa6P_OJNH6mYj8BvHqeMeVomNz/view?usp=drivesdk","description":"Trombón 1 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1D6HLqkhh_r5Xu9DwBuwQX_OgIOfFCvq0/view?usp=drivesdk","description":"Trombón 2 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1-vrQLNgrn86MifV1w91wE90COvXdF8nx/view?usp=drivesdk","description":"Trombón 3 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1zB940iWRCUcJfPqrpcngnL0_VmGR6jgH/view?usp=drivesdk","description":"Trompeta 1 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/14feNrQ-mdJ-9GC4QDBa9miCY6IoWujyR/view?usp=drivesdk","description":"Trompeta 2 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1b50KAY8b4hF3osXE0aUeiMPjB-eubh9O/view?usp=drivesdk","description":"Tuba - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1xFS4KvHBupQAsVhBf_yDKhxjlr3qcxpy/view?usp=drivesdk","description":"Viola - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1fSpc3hK1-Xj2sPgDoPyocvD16t-3seOx/view?usp=drivesdk","description":"Violín 1 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1lHSx-GNLieScnltvGB7iN2zpJsvE3e55/view?usp=drivesdk","description":"Violín 2 - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1oRL2sRrHWBKtxfr1hDvzc9m6lh8NeZ9N/view?usp=drivesdk","description":"Violoncello - Oh, Dulce Navidad (White Christmas) - Berlin, I.pdf"}]', false);
    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT _id_obra, _id_tag
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_palabras_clave opc
      WHERE opc.id_obra = _id_obra AND opc.id_palabra_clave = _id_tag
    );

  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Oh, Dulce Navidad (White Christmas), para Orquesta y Coro';
  END IF;

  -- El Burrito Sabanero, para Orquesta y Coro
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'El Burrito Sabanero, para Orquesta y Coro' AND oc.id_compositor = _id_arr_Giraldo_Yimi
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'El Burrito Sabanero, para Orquesta y Coro',
      _id_arr_Giraldo_Yimi,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar - Blanco, H. - El Burrito Sabanero. Arr. Yimi Giraldo (Orquesta EAFIT). Partes recortadas de ''Partes.pdf''; Coro = ''Full vocal'' (SATB).',
      '2.2.2.2 - 4.2.3.1 - Timp.+1 - Str + Coro',
      'https://drive.google.com/open?id=1d6g34ST_DZPjyR-9VobDxkRM6om-JMy3'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Blanco_Hugo, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Giraldo_Yimi, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Giraldo_Yimi
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/19gMxNb1pw_IyJnrNAg15J4eatyRNofbo/view?usp=drivesdk","description":"Clarinete 1 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1MXk2IzMUJwc9eh7p2J6QzyPM3A2M7B2m/view?usp=drivesdk","description":"Clarinete 2 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1EMLUEprXmG4-QuSA1o8zELkCgPhHGlmJ/view?usp=drivesdk","description":"Contrabajo - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1drpp5jaQdUKworhL3rxUXsbIAIAzB735/view?usp=drivesdk","description":"Corno 1 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1NMOqAA5i6ylOzzesLCYeHupn-B18Ey65/view?usp=drivesdk","description":"Corno 2 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1jvcK9SKhT6qBZkPvDxWkQxiqCyLJYuPm/view?usp=drivesdk","description":"Corno 3 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1elDRWXwsSpMt7tFLgiHJTA4LyXOgsox_/view?usp=drivesdk","description":"Corno 4 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '23', 'Coro', '[{"url":"https://drive.google.com/file/d/1t1-JmVluPfbfz4E7fcyGrebtKmvB5KBY/view?usp=drivesdk","description":"Coro - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1C5y9hSMcMmAuBo64C4hJZoFapU89Czeq/view?usp=drivesdk","description":"Fagot 1 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1au7oMYikn2V58ykgAS0P5GLIm8OXyExh/view?usp=drivesdk","description":"Fagot 2 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1EIa9_ZAVWcIdXXhYh8TZnry_-oQk-Exk/view?usp=drivesdk","description":"Flauta 1 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1F2rDi7G1fYJcUyHdF5BXnq9YkQu_eN6K/view?usp=drivesdk","description":"Flauta 2 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1OlSiie8eYT3236X8gABePSvxR035GLey/view?usp=drivesdk","description":"Oboe 1 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1VyKg9lB5kufA7hxZ03mGXTleYm47G5Y4/view?usp=drivesdk","description":"Oboe 2 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1wWmVYGXMvmxOAeZ2kBWrwtFDLYgfUYT2/view?usp=drivesdk","description":"Perc Batería - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1FFY9SgYdxkZd8P-5inj04N9ZTe95C_H0/view?usp=drivesdk","description":"SCORE - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Timbales', '[{"url":"https://drive.google.com/file/d/1TXAi032KPYbuTsvUSrUtoX2LxH2CeQUL/view?usp=drivesdk","description":"Timbales - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1y-g_ayY9g-SBYHVw3dEyjpzgZh-0JZlT/view?usp=drivesdk","description":"Trombón 1 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1SW-S4eiGCQG8XEFrdVRA-w951i-PFVHm/view?usp=drivesdk","description":"Trombón 2 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1ugpQoFTdCLQeb3CIyx2cqOz7zx7xreFo/view?usp=drivesdk","description":"Trombón 3 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1FwDPG1LMx7DkFccH9HSdT1y1UqNbVWBK/view?usp=drivesdk","description":"Trompeta 1 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1Szi-4bSdIjRzbR0tRR4wpoKL_x0ZnvKP/view?usp=drivesdk","description":"Trompeta 2 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/150swr5wDbbijQC7dwd904kTrUOGuhKTP/view?usp=drivesdk","description":"Tuba - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1a_USqsaV8rnRhoiCtuJxQoHoBSUjUMFe/view?usp=drivesdk","description":"Viola - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1iKbaPHBem612TpV98diG5ZrO_-MFI2Aw/view?usp=drivesdk","description":"Violín 1 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1agtygTbtAosN8p1CviOklsDgbEAEKpBv/view?usp=drivesdk","description":"Violín 2 - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/15lbV9trLsmL7pvnQDgP73gZuoQ81CWAE/view?usp=drivesdk","description":"Violoncello - El Burrito Sabanero - Blanco, H.pdf"}]', false);
    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT _id_obra, _id_tag
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_palabras_clave opc
      WHERE opc.id_obra = _id_obra AND opc.id_palabra_clave = _id_tag
    );

  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): El Burrito Sabanero, para Orquesta y Coro';
  END IF;

END $$;
