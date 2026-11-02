-- Seed Archivo-para-organizar → Para acomodar (sin duplicar Homenajes/cine ya en archivo)
-- Generado: 2026-10-31

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Queen_ bigint;
  _id_comp_Williams_John bigint;
  _id_comp_Schifrin_Lalo bigint;
  _id_comp_Tradicional_ bigint;
  _id_comp_Leon_ bigint;
  _id_comp_Rozo_Contreras_Jos_ bigint;
  _id_comp_Fortaleza_ bigint;
  _id_comp_Vieuxtemps_Henri bigint;
  _id_comp_Saint_Sa_ns_Camille bigint;
  _id_comp_Macdonald_Hector bigint;
  _id_comp_Strauss_Richard bigint;
  _id_comp_Orff_Carl bigint;
  _id_comp_Espel_Guillo bigint;
  _id_comp_Retamosa_Jorge bigint;
  _id_comp_Nicoletti_Juan_Pablo bigint;
  _id_comp_El_Secreto_ bigint;
  _id_comp_Vientos_de_Agua_ bigint;
  _id_arr_Ribero_G_ bigint;
  _id_arr_Custer_ bigint;
  _id_arr_Gerez_ bigint;
  _id_arr_Ferreira_M_ bigint;
BEGIN
  SELECT id INTO _id_comp_Queen_ FROM compositores WHERE apellido = 'Queen' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Queen_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Queen', NULL) RETURNING id INTO _id_comp_Queen_;
  END IF;

  SELECT id INTO _id_comp_Williams_John FROM compositores WHERE apellido = 'Williams' AND (nombre = 'John' OR (nombre IS NULL AND 'John' IS NULL)) LIMIT 1;
  IF _id_comp_Williams_John IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Williams', 'John') RETURNING id INTO _id_comp_Williams_John;
  END IF;

  SELECT id INTO _id_comp_Schifrin_Lalo FROM compositores WHERE apellido = 'Schifrin' AND (nombre = 'Lalo' OR (nombre IS NULL AND 'Lalo' IS NULL)) LIMIT 1;
  IF _id_comp_Schifrin_Lalo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Schifrin', 'Lalo') RETURNING id INTO _id_comp_Schifrin_Lalo;
  END IF;

  SELECT id INTO _id_comp_Tradicional_ FROM compositores WHERE apellido = 'Tradicional' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Tradicional_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Tradicional', NULL) RETURNING id INTO _id_comp_Tradicional_;
  END IF;

  SELECT id INTO _id_comp_Leon_ FROM compositores WHERE apellido = 'Leon' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Leon_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Leon', NULL) RETURNING id INTO _id_comp_Leon_;
  END IF;

  SELECT id INTO _id_comp_Rozo_Contreras_Jos_ FROM compositores WHERE apellido = 'Rozo Contreras' AND (nombre = 'José' OR (nombre IS NULL AND 'José' IS NULL)) LIMIT 1;
  IF _id_comp_Rozo_Contreras_Jos_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Rozo Contreras', 'José') RETURNING id INTO _id_comp_Rozo_Contreras_Jos_;
  END IF;

  SELECT id INTO _id_comp_Fortaleza_ FROM compositores WHERE apellido = 'Fortaleza' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Fortaleza_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Fortaleza', NULL) RETURNING id INTO _id_comp_Fortaleza_;
  END IF;

  SELECT id INTO _id_comp_Vieuxtemps_Henri FROM compositores WHERE apellido = 'Vieuxtemps' AND (nombre = 'Henri' OR (nombre IS NULL AND 'Henri' IS NULL)) LIMIT 1;
  IF _id_comp_Vieuxtemps_Henri IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Vieuxtemps', 'Henri') RETURNING id INTO _id_comp_Vieuxtemps_Henri;
  END IF;

  SELECT id INTO _id_comp_Saint_Sa_ns_Camille FROM compositores WHERE apellido = 'Saint-Saëns' AND (nombre = 'Camille' OR (nombre IS NULL AND 'Camille' IS NULL)) LIMIT 1;
  IF _id_comp_Saint_Sa_ns_Camille IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Saint-Saëns', 'Camille') RETURNING id INTO _id_comp_Saint_Sa_ns_Camille;
  END IF;

  SELECT id INTO _id_comp_Macdonald_Hector FROM compositores WHERE apellido = 'Macdonald' AND (nombre = 'Hector' OR (nombre IS NULL AND 'Hector' IS NULL)) LIMIT 1;
  IF _id_comp_Macdonald_Hector IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Macdonald', 'Hector') RETURNING id INTO _id_comp_Macdonald_Hector;
  END IF;

  SELECT id INTO _id_comp_Strauss_Richard FROM compositores WHERE apellido = 'Strauss' AND (nombre = 'Richard' OR (nombre IS NULL AND 'Richard' IS NULL)) LIMIT 1;
  IF _id_comp_Strauss_Richard IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Strauss', 'Richard') RETURNING id INTO _id_comp_Strauss_Richard;
  END IF;

  SELECT id INTO _id_comp_Orff_Carl FROM compositores WHERE apellido = 'Orff' AND (nombre = 'Carl' OR (nombre IS NULL AND 'Carl' IS NULL)) LIMIT 1;
  IF _id_comp_Orff_Carl IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Orff', 'Carl') RETURNING id INTO _id_comp_Orff_Carl;
  END IF;

  SELECT id INTO _id_comp_Espel_Guillo FROM compositores WHERE apellido = 'Espel' AND (nombre = 'Guillo' OR (nombre IS NULL AND 'Guillo' IS NULL)) LIMIT 1;
  IF _id_comp_Espel_Guillo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Espel', 'Guillo') RETURNING id INTO _id_comp_Espel_Guillo;
  END IF;

  SELECT id INTO _id_comp_Retamosa_Jorge FROM compositores WHERE apellido = 'Retamosa' AND (nombre = 'Jorge' OR (nombre IS NULL AND 'Jorge' IS NULL)) LIMIT 1;
  IF _id_comp_Retamosa_Jorge IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Retamosa', 'Jorge') RETURNING id INTO _id_comp_Retamosa_Jorge;
  END IF;

  SELECT id INTO _id_comp_Nicoletti_Juan_Pablo FROM compositores WHERE apellido = 'Nicoletti' AND (nombre = 'Juan Pablo' OR (nombre IS NULL AND 'Juan Pablo' IS NULL)) LIMIT 1;
  IF _id_comp_Nicoletti_Juan_Pablo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Nicoletti', 'Juan Pablo') RETURNING id INTO _id_comp_Nicoletti_Juan_Pablo;
  END IF;

  SELECT id INTO _id_comp_El_Secreto_ FROM compositores WHERE apellido = 'El Secreto' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_El_Secreto_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('El Secreto', NULL) RETURNING id INTO _id_comp_El_Secreto_;
  END IF;

  SELECT id INTO _id_comp_Vientos_de_Agua_ FROM compositores WHERE apellido = 'Vientos de Agua' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Vientos_de_Agua_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Vientos de Agua', NULL) RETURNING id INTO _id_comp_Vientos_de_Agua_;
  END IF;

  SELECT id INTO _id_arr_Ribero_G_ FROM compositores WHERE apellido = 'Ribero' AND (nombre = 'G.' OR (nombre IS NULL AND 'G.' IS NULL)) LIMIT 1;
  IF _id_arr_Ribero_G_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Ribero', 'G.') RETURNING id INTO _id_arr_Ribero_G_;
  END IF;

  SELECT id INTO _id_arr_Custer_ FROM compositores WHERE apellido = 'Custer' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_arr_Custer_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Custer', NULL) RETURNING id INTO _id_arr_Custer_;
  END IF;

  SELECT id INTO _id_arr_Gerez_ FROM compositores WHERE apellido = 'Gerez' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_arr_Gerez_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Gerez', NULL) RETURNING id INTO _id_arr_Gerez_;
  END IF;

  SELECT id INTO _id_arr_Ferreira_M_ FROM compositores WHERE apellido = 'Ferreira' AND (nombre = 'M.' OR (nombre IS NULL AND 'M.' IS NULL)) LIMIT 1;
  IF _id_arr_Ferreira_M_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Ferreira', 'M.') RETURNING id INTO _id_arr_Ferreira_M_;
  END IF;

  -- <p>Compilado Queen</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>Compilado Queen</p>' AND oc.id_compositor = _id_arr_Ribero_G_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Compilado Queen</p>',
      _id_arr_Ribero_G_,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.',
      '3.2.2.2 - 4.2.3.1 - Timp.+1 - Hp - Str',
      'https://drive.google.com/open?id=1Pmu9K4wdN41jUHdJd5fhzAwPTZjppaq7'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Queen_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Ribero_G_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Ribero_G_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1MxV1klNXc8HmR8ficXdFLOnOgxfts-jT/view?usp=drivesdk","description":"Arpa - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/10RkZ7czEQakawkU5DnZY3kFKS7XeQfUD/view?usp=drivesdk","description":"Clarinete Bb 1 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1Pp1pLBHFC5o_SkDX1sGQyqGcJuY_0QcR/view?usp=drivesdk","description":"Clarinete Bb 2 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1aClLxNoP9eOW9Dzt73ANDSkMofnHj6aj/view?usp=drivesdk","description":"Contrabajo - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1SImpr5W8UYTYmHAPpMrCtvx1T1xs59Ff/view?usp=drivesdk","description":"Corno F 1y2 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1SImpr5W8UYTYmHAPpMrCtvx1T1xs59Ff/view?usp=drivesdk","description":"Corno F 1y2 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1rENE5l9C7U9OCxLUMt8imSLQ1wc35W2n/view?usp=drivesdk","description":"Corno F 3y4 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1rENE5l9C7U9OCxLUMt8imSLQ1wc35W2n/view?usp=drivesdk","description":"Corno F 3y4 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1VKYilkxK-cSfe0upSHhaACmETW5E3hnt/view?usp=drivesdk","description":"Fagot 1 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/143GvchYD_OTyLuXsMheEY2LCZ8LEeW60/view?usp=drivesdk","description":"Fagot 2 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1xNiAV9d5ctMUkomeqMdW4bM2DDyHKY6h/view?usp=drivesdk","description":"Fl Piccolo - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1iCtYWpkEzuv-o8bY1KE4S361jR6OybR1/view?usp=drivesdk","description":"Flauta 1 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1TaG3EUrSjXaSzLUGXwclTufgTkL1qcMj/view?usp=drivesdk","description":"Flauta 2 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1KD0o99HXpHmAEREBMKzlL7jgkb64wh9N/view?usp=drivesdk","description":"Oboe 1 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1ehOr45ZggkRUEGqeLTOrNgQXkA-JT3qW/view?usp=drivesdk","description":"Oboe 2 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1yyY1KrniCWpNgk6YEdLvvRlyb2dubp7Q/view?usp=drivesdk","description":"Perc Percusión - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/182z8LlY6cy21l9duVG1zQrv0cqTtVC6Q/view?usp=drivesdk","description":"Perc Timbal - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1tTubuYNaAc3ulfpuQiukP4P4KApf5YPd/view?usp=drivesdk","description":"Trombón 1y2 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1tTubuYNaAc3ulfpuQiukP4P4KApf5YPd/view?usp=drivesdk","description":"Trombón 1y2 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1-q4LAl4XLgH5FaV4utOsG-H69eZqMz8c/view?usp=drivesdk","description":"Trombón 3 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/17JMxAXW31v2ByQ1fdeeeEt7VNKAeeY3K/view?usp=drivesdk","description":"Trompeta 1 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1oGwkHpy-JIwLhy3_FjyPtFMKJFV4ZjyB/view?usp=drivesdk","description":"Trompeta 2 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1MLfWwY4bS2KxLPQ8y9M8VpYr4GKSdtvN/view?usp=drivesdk","description":"Tuba - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/13e1wRleibBlW05gWqqptDqrQWW7zwGnM/view?usp=drivesdk","description":"Viola - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ZvfrLIRJacAK40yB7aAUZ_cOvbWAitSo/view?usp=drivesdk","description":"Violín 1 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1lMhhrNWnNIzZyNt5ExsVGroW35gVbTHA/view?usp=drivesdk","description":"Violín 2 - Compilado Queen - Ribero, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1iVYFWcdZqTH7ZA3blYpjtG2Keb4yyCNX/view?usp=drivesdk","description":"Violoncello - Compilado Queen - Ribero, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Compilado Queen</p>';
  END IF;

  -- <p>Hook — The Flight to Neverland</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Hook — The Flight to Neverland</p>'
      AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Hook — The Flight to Neverland</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).',
      '1.3.4.3 - 4.3.2.1 - Timp.+3 - Hp - Key - Str',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Williams_John, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Hook — The Flight to Neverland</p>';
  END IF;

  -- <p>Jurassic Park — El Mundo Perdido</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
      AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Jurassic Park — El Mundo Perdido</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.',
      '3.3.3.3 - 4.4.3.1 - Timp.+3 - Hp - Key - Str',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Williams_John, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Picc', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 4', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Jurassic Park — El Mundo Perdido</p>';
  END IF;

  -- <p>Jurassic Park, Highlights</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>Jurassic Park, Highlights</p>' AND oc.id_compositor = _id_arr_Custer_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Jurassic Park, Highlights</p>',
      _id_arr_Custer_,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — arr. Custer. Falta Violoncello en el set original.',
      '3.2.3.2 - 4.3.3.1 - Timp.+3 - Key - Str',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Williams_John, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Custer_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Custer_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Jurassic Park, Highlights</p>';
  END IF;

  -- <p>Misión Imposible</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>Misión Imposible</p>' AND oc.id_compositor = _id_arr_Custer_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Misión Imposible</p>',
      _id_arr_Custer_,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.',
      '2.1.3.1 - 4.2.3.1 - Timp.+2 - Key - Str',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Schifrin_Lalo, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Custer_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Custer_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Misión Imposible</p>';
  END IF;

  -- <p>Macondo</p><div>&nbsp; [versión banda]</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>' AND oc.id_compositor = _id_arr_Gerez_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Macondo</p><div>&nbsp; [versión banda]</div>',
      _id_arr_Gerez_,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).',
      '3.2.4.1 - 3.3.3.1 - Perc.x9 - Str + Saxofón x4',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Tradicional_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gerez_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gerez_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 4', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 5', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 6', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 7', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 8', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 9', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Alto 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Alto 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxofón', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Macondo</p><div>&nbsp; [versión banda]</div>';
  END IF;

  -- <p>Bambuco</p><div>&nbsp; [versión banda]</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
      AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Bambuco</p><div>&nbsp; [versión banda]</div>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.',
      '3.2.5.0 - 4.3.4.2 - Timp.+3 - Str + Saxofón x5',
      'https://drive.google.com/open?id=1oSrPX5LVG_V64WuR0tQuAReryulta2GK'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Leon_, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Barítono', '[{"url":"https://drive.google.com/file/d/1cBig_kmWuOrWnaNiUlGu6ZqQGZX0s5jS/view?usp=drivesdk","description":"Barítono - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/17ZZZv_WzT3ChnOmnlo0WfUtDoH5bbCO2/view?usp=drivesdk","description":"Clarinete Bajo - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1uOfwkpfrvuO3o96y1SvbCL7FwgmfQiVj/view?usp=drivesdk","description":"Clarinete Bb - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1syG03c9DrRYPuL3lHCoENt1lhnsmZc4A/view?usp=drivesdk","description":"Clarinete Bb 1 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1INArCao-9v7zuX7lIzKdTf7Um36USila/view?usp=drivesdk","description":"Clarinete Bb 2 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 3', '[{"url":"https://drive.google.com/file/d/1f_W-VthrSq0pQCNflEYEZgjje5DlNkha/view?usp=drivesdk","description":"Clarinete Bb 3 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1gGw_af1D6SFfjB5qkB6C82jKMd_7KUY2/view?usp=drivesdk","description":"Contrabajo - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/16EMpO7Oa13oCFOYB2Do3XqEvyAfZev89/view?usp=drivesdk","description":"Corno F 1 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1Qx_5YiK6n19JlLO0YHFQslyA7QInHg73/view?usp=drivesdk","description":"Corno F 2 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1DprSBQkq8DAwwp1vjuRjgix-3CtcW_BW/view?usp=drivesdk","description":"Corno F 3 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1IR9tdIFTpuFrZ7AaTsBCFLGR72ik-Ht-/view?usp=drivesdk","description":"Corno F 4 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1KCowZD9R4Ezmn8mUQW35jIRQsys5b56o/view?usp=drivesdk","description":"Fl Piccolo - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1nG1SguZn2lI8q1k55p6JGoSqwYmwiBZM/view?usp=drivesdk","description":"Flauta 1 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/11dmEWegUSfr6pRujQi6Th-YVgtUSpXBz/view?usp=drivesdk","description":"Flauta 2 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1MehXF9x7xyp4FzTF5UVJK2uTaCLmNyTk/view?usp=drivesdk","description":"Oboe 1 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1js2nb1h_rAyNhBilmfdiNDAxG5fNHAIx/view?usp=drivesdk","description":"Oboe 2 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1Xi07PUxyd2L--LWOfjIAE55MfiZDx3Uv/view?usp=drivesdk","description":"Perc Bombo - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1s54ardufEPDcbJ8fdRRUtgoUsbnYFM2q/view?usp=drivesdk","description":"Perc Percusión - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/1HHb-NUYP-TcSPZgx8hjYazZSKF4VmcjN/view?usp=drivesdk","description":"Perc Tambor - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1pVIHZhd9Ra7KuHVkD7PNdBWfTpt5Pwv3/view?usp=drivesdk","description":"Perc Timbal - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Alto 1', '[{"url":"https://drive.google.com/file/d/1YdfKqU7WgZA7ZN0VUcXhJhCixu7KpXwX/view?usp=drivesdk","description":"Saxo Alto 1 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Alto 2', '[{"url":"https://drive.google.com/file/d/1PlSin9CUSp3E9AJzhJOxz8lIK78V5uGx/view?usp=drivesdk","description":"Saxo Alto 2 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Barítono', '[{"url":"https://drive.google.com/file/d/1akgLphraa3qEh0fDHT5dbS0JiRhr6nVd/view?usp=drivesdk","description":"Saxo Barítono - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Soprano', '[{"url":"https://drive.google.com/file/d/13gfu03neCoHa_o8V4eHm5-kUppga-0KX/view?usp=drivesdk","description":"Saxo Soprano - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor 1', '[{"url":"https://drive.google.com/file/d/1lwfEe3NzgeJOILagYl_wB-nydUaw5_AB/view?usp=drivesdk","description":"Saxo Tenor 1 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1xtLyQ0o4-fjsQikWibxump4iv9_wejJq/view?usp=drivesdk","description":"SCORE - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1TJT2Ik7r_oGkSI1y2UBYsMJ_meOEg-fU/view?usp=drivesdk","description":"Trombón - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1HStokuSyArYSbPjtJw9rQDq3Ke8FtOU6/view?usp=drivesdk","description":"Trombón 1 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1bUK0KjcXLTzMfClIMxlYK6dtxYMC9EuO/view?usp=drivesdk","description":"Trombón 2 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1kcs6kMQMsno_EISJ3coASVr684uegmgA/view?usp=drivesdk","description":"Trombón 3 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1u494YBlvdL586cLPTY70uxSIWi2j8RH0/view?usp=drivesdk","description":"Trompeta - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1ydTYufzshataLXVXvmCfKjc49z38YtxT/view?usp=drivesdk","description":"Trompeta 1 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1iMHXRdiSS-rB8GfCOx9m8JGfsQhs7Hz3/view?usp=drivesdk","description":"Trompeta 2 - Bambuco [banda] - Leon.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1puojs76ej9INGdEwmaQRcrwB6NAQYTuQ/view?usp=drivesdk","description":"Tuba - Bambuco [banda] - Leon.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Bambuco</p><div>&nbsp; [versión banda]</div>';
  END IF;

  -- <p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
      AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.',
      '3.2.7.2 - 3.4.3.2 - Timp.+4 - Str + Saxofón x5',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Rozo_Contreras_Jos_, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Barítono', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 3A', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 3B', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Eb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Eb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Glockenspiel', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Alto 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Alto 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Barítono', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Soprano', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 4', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>';
  END IF;

  -- <p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
      AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.',
      '5.2.5.2 - 3.2.3.2 - Timp.+3 - Str + Saxofón x5',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Rozo_Contreras_Jos_, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Barítono', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete en Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete en Bb 2A', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete en Bb 2B', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete en Bb 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Clarinete piccolo en Eb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Clarinete piccolo en Eb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Glockenspiel', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Gong', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Alto 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Alto 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Barítono', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Soprano', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompetas 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompetas 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>';
  END IF;

  -- <p>Maculelê</p><div>&nbsp; [versión banda]</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>' AND oc.id_compositor = _id_arr_Ferreira_M_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Maculelê</p><div>&nbsp; [versión banda]</div>',
      _id_arr_Ferreira_M_,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.',
      '1.0.4.0 - 1.3.3.3 - Perc.x3 + Saxofón x5',
      'https://drive.google.com/open?id=1OljNhEaQY45i-xaf2Ak1Oh29FZK3RWoG'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Fortaleza_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Ferreira_M_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Ferreira_M_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Bombardino Bb', '[{"url":"https://drive.google.com/file/d/1mCFjgzRwzU6OZZWjrwAMbe20InwcqnUb/view?usp=drivesdk","description":"Bombardino Bb - Maculele - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Bombardino C', '[{"url":"https://drive.google.com/file/d/13XnlnY3vqE7IWB36QQ7oQfcfewVXcZAk/view?usp=drivesdk","description":"Bombardino C - Maculele - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Cl Requinto Eb', '[{"url":"https://drive.google.com/file/d/1e5KYZXhvOuYqvsJPe4k-puPGPctk0XQr/view?usp=drivesdk","description":"Cl Requinto Eb - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1mEjMxBSQ74GKBG_iGoGvtV3pFGIHY1Rg/view?usp=drivesdk","description":"Clarinete Bb 1 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/13xu59unpCwC0WbarfzBgSwG5sExr0rt4/view?usp=drivesdk","description":"Clarinete Bb 2 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 3', '[{"url":"https://drive.google.com/file/d/1gsA99nbNe0WAIMl5izmHzWMtsMCnVtSY/view?usp=drivesdk","description":"Clarinete Bb 3 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1IxEdVgOcI1Nt9GO9KmjzHz9ZPcu3trCb/view?usp=drivesdk","description":"Corno F - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1Bbm7oosd_bt6wK_BTCcoZIVMAievk4DL/view?usp=drivesdk","description":"Flauta - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1S-QQeRB3Z_mxHQOxphaUpJjmKY7cz7CJ/view?usp=drivesdk","description":"Perc Batería - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1a69-xq0SU3W-0zFLy3cd-IV6kFZO6m-T/view?usp=drivesdk","description":"Perc Percusión - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/19sAv5Km2Sw4MgtamXOYVW2fCFGUuz09X/view?usp=drivesdk","description":"Perc Triángulo - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Alto', '[{"url":"https://drive.google.com/file/d/1-5Dg4vAMJ3A7hNwiOuW_vvBC1gwRHTlh/view?usp=drivesdk","description":"Saxo Alto - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Alto 1', '[{"url":"https://drive.google.com/file/d/1zTGYd4456SoFYEZoqCMkEzxcI2PpZkeN/view?usp=drivesdk","description":"Saxo Alto 1 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Soprano', '[{"url":"https://drive.google.com/file/d/1HpWc0Rm1oKzcnAYwPYocv3137Crkqq5v/view?usp=drivesdk","description":"Saxo Soprano - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1od-xVemJ1lsEmvpFpOQOo07mZ7ZTr6j0/view?usp=drivesdk","description":"Saxo Tenor - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxofón', '[{"url":"https://drive.google.com/file/d/1A9ICFPzriq-roD5QC0dWY4514oYrQd_E/view?usp=drivesdk","description":"Saxofón - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1rg_fzJ8_KyuaxhqhAYkFqVpiYWJL97sW/view?usp=drivesdk","description":"SCORE - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1Tmg0WPLsSKaiVQ5Gr5S_LpeBd3jiOFJw/view?usp=drivesdk","description":"Trombón 1 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1FdSpuj8fgASMBQd8Pk-enslDyBMcSQZm/view?usp=drivesdk","description":"Trombón 2 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1WiA7vEVUZJcDee5CyNvd1OXGIfLp5L6I/view?usp=drivesdk","description":"Trombón 3 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1kmz6UtDNs2KEXGse9FiRhVjzsgEHc3rR/view?usp=drivesdk","description":"Trompeta Bb 1 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1O6xifgqhjHhvP1CRcEmtqbrcIbAc11CN/view?usp=drivesdk","description":"Trompeta Bb 2 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[{"url":"https://drive.google.com/file/d/122pl-LfN_n9Lxf1usjcSgxMC_5PyOUEr/view?usp=drivesdk","description":"Trompeta Bb 3 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1lPfujlW_4TAhqStXuLr9k_NEaXv8DwFH/view?usp=drivesdk","description":"Tuba - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Maculelê</p><div>&nbsp; [versión banda]</div>';
  END IF;

  -- <p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
      AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.',
      '2.2.1.0 - 1.1.2.1 - Perc.x2 - Str + Saxofón x3',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Tradicional_, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Conga Drums', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'La', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Sax', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Sax 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Sax 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>';
  END IF;

  -- <p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
      AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).',
      'Vn - 2.2.1.2 - 3.2.3.0 - Timp - Hp - Str',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Vieuxtemps_Henri, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Concierto para Violin Nro', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'SOLO Violin', '[]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>';
  END IF;

  -- <p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
      AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).',
      '2.2.0.2 - 2.2.3.0 - Timp - Str',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Saint_Sa_ns_Camille, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Concierto para Violin Nro', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>';
  END IF;

  -- <p>The Phantom Menace (Suite)</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>The Phantom Menace (Suite)</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>The Phantom Menace (Suite)</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/Phanton Menace.',
      '3.3.4.3 - 4.2.4.1 - Timp.+3 - Hp - Key - Str + Coro',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Williams_John, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Eb', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '23', 'Coro', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Ob EH', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>The Phantom Menace (Suite)</p>';
  END IF;

  -- <p>Hirdaith</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Hirdaith</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Hirdaith</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo.',
      'Vn - 2.2.2.4 - 4.1.1.1 - Timp.+16 - Hp - Str',
      'https://drive.google.com/open?id=1Tk-lzmbkT618tOlarlyzfHmGWN_hFRjm'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Macdonald_Hector, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1PwfF4uHgZIMuriTF_zRheT3TiN1f8NqK/view?usp=drivesdk","description":"Arpa - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1us44LyuqeDit9MdnZWtow_s50qSvWT7G/view?usp=drivesdk","description":"Clarinete Bajo - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1dCOgzdB9gEZWfubm9nFRTxq6J1khVZM7/view?usp=drivesdk","description":"Clarinete Bb - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1cUthNHQ-DW8g8omkhK91lsxg01BElkCy/view?usp=drivesdk","description":"Contrabajo - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1hanIHDgHCnCIuTSQS3Dwm3amMN-cInoi/view?usp=drivesdk","description":"Contrafagot - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1Fpe7mPJM1QxyUzBWExEx79ML0BkhpUax/view?usp=drivesdk","description":"Corno F 1y2 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1Fpe7mPJM1QxyUzBWExEx79ML0BkhpUax/view?usp=drivesdk","description":"Corno F 1y2 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1MNTXrXTnM7x7p-ixStW1YVEShCwiXEZo/view?usp=drivesdk","description":"Corno F 3y4 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1MNTXrXTnM7x7p-ixStW1YVEShCwiXEZo/view?usp=drivesdk","description":"Corno F 3y4 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1HstrG5TslpSeHCyzgF4tiFvp4FOeg_MB/view?usp=drivesdk","description":"Fagot - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1IAdlCm1MY4RTCjk9_2dezX8eOs1c8ogr/view?usp=drivesdk","description":"Fagot 1 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/174njafo60IX5HDr9YOV6X8oDwvvOEg9B/view?usp=drivesdk","description":"Fagot 2 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1q_ZypPvJElFo6-nDgw2p-o7GhEVh9nH9/view?usp=drivesdk","description":"Fl Piccolo - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1LbqWJHtJOymo4F0hs0mTsWOJgYqW8Ezs/view?usp=drivesdk","description":"Flauta - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1vzhMVGlV-5r4ftqQntKyHhaQF7cd_rA0/view?usp=drivesdk","description":"Ob EH - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1WAOs0fQusttdA7AKtnA-erjtycQ3KZ_C/view?usp=drivesdk","description":"Oboe - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[{"url":"https://drive.google.com/file/d/17A3kWn1_hD1G6mKv7K0BWmuPTM2a2kGf/view?usp=drivesdk","description":"Perc Percusión 1 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 10', '[{"url":"https://drive.google.com/file/d/1LDbctUe6YM25_rXjqN0BgFJVv-ePonX4/view?usp=drivesdk","description":"Perc Percusión 10 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 11', '[{"url":"https://drive.google.com/file/d/1JWI6I6iiWyd8flTn_JuF7sgJiY3vHKn6/view?usp=drivesdk","description":"Perc Percusión 11 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 12', '[{"url":"https://drive.google.com/file/d/13H6cMuWdP4pY1IZIp8govoyHIOgGnHzj/view?usp=drivesdk","description":"Perc Percusión 12 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 13', '[{"url":"https://drive.google.com/file/d/1GZLj4NdEHTRj-6VafVIMxfd7c-rXktEf/view?usp=drivesdk","description":"Perc Percusión 13 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 14', '[{"url":"https://drive.google.com/file/d/1JGuApK4TLLw-aJ1pwyK9yxoLfp7z_xm4/view?usp=drivesdk","description":"Perc Percusión 14 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 15', '[{"url":"https://drive.google.com/file/d/1SxIouy0JaOoFKUBQzozOcgXj1VR4eGvV/view?usp=drivesdk","description":"Perc Percusión 15 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 16', '[{"url":"https://drive.google.com/file/d/1hj_fNAqIYhAsSz4ZWjvvGu64QCPDR66_/view?usp=drivesdk","description":"Perc Percusión 16 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/11CDh24Y0QPtIi7G-trqat3hYFKywv37I/view?usp=drivesdk","description":"Perc Percusión 2 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 3', '[{"url":"https://drive.google.com/file/d/1IMYv4MfHa_JQ6OgH3J9QIi4r2NZqYfHV/view?usp=drivesdk","description":"Perc Percusión 3 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 4', '[{"url":"https://drive.google.com/file/d/1fc570jBcX8xPbPuG3P9qDEjqH9wyMB2_/view?usp=drivesdk","description":"Perc Percusión 4 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 5', '[{"url":"https://drive.google.com/file/d/1oq7EX2OY-KbdygvWkfA5XMOCGiUWskny/view?usp=drivesdk","description":"Perc Percusión 5 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 6', '[{"url":"https://drive.google.com/file/d/1I4J09F8dUQdichC5kt9qLPFJJ6MJBUB2/view?usp=drivesdk","description":"Perc Percusión 6 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 7', '[{"url":"https://drive.google.com/file/d/1XEOFAMURXZkkiCOu-a51Wc4sJFP_UTr4/view?usp=drivesdk","description":"Perc Percusión 7 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 8', '[{"url":"https://drive.google.com/file/d/16_h3sdVZg-GlmfwmmHMQJwbVDByuTSCJ/view?usp=drivesdk","description":"Perc Percusión 8 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 9', '[{"url":"https://drive.google.com/file/d/1fTizKaWEtDyKWwsIWOKst77ssx9ZmHip/view?usp=drivesdk","description":"Perc Percusión 9 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/17BH0hw4Xb4rQ-gGZwcAXQvP5CcCKBLRZ/view?usp=drivesdk","description":"Perc Timbal - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1BRtFVQNvO1-VHwr-MNWLk68fneSFr0cq/view?usp=drivesdk","description":"SCORE - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1pS3yXDdlz_VbHEtl3wr7SlZ2ctEr6Sr_/view?usp=drivesdk","description":"Trombón - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1VDKHo-fbU3fpPHtQV3SaS0yXHQSZF8Dz/view?usp=drivesdk","description":"Trompeta - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1hjN3-VfZTVfxtj9ZQdhSHc67rgy00xJx/view?usp=drivesdk","description":"Tuba - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/10BB9LgNRLltPMp7cndV0etYYUlkVtHUu/view?usp=drivesdk","description":"Viola - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/12as3KE_XrE_pht3UfLdm2OOgvDoiAApw/view?usp=drivesdk","description":"Violín 1 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1botMWXxIQRa5LhFn4vZrt80uT1LIss2W/view?usp=drivesdk","description":"Violín 2 - Hirdaith - Macdonald, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín Solo', '[{"url":"https://drive.google.com/file/d/1zT0l2Ndifc3ZWqM8qcLCXBqqzMZhg_-G/view?usp=drivesdk","description":"Violín Solo - Hirdaith - Macdonald, H.pdf"}]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1mqZ7l5rotAgsWIBk3-nveqHLA8w_nfMf/view?usp=drivesdk","description":"Violoncello - Hirdaith - Macdonald, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Hirdaith</p>';
  END IF;

  -- <p>Don Juan, Op. 20</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Don Juan, Op. 20</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Don Juan, Op. 20</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo.',
      '3.3.2.3 - 4.3.3.1 - Perc - Hp - Str',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Strauss_Richard, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Ob EH', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Don Juan, Op. 20</p>';
  END IF;

  -- <p>O Fortuna (Carmina Burana)</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>O Fortuna (Carmina Burana)</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo (solo O Fortuna).',
      '2.2.1.3 - 4.2.2.1 - Timp.+2 - Key - Str + Voz',
      'https://drive.google.com/open?id=1LqO2sdfMN_r2veryhjTPo_eNlXvM57bZ'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Orff_Carl, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/10OXEEz-zBQA_kKk8V6jK8zHiNAXJ-K4i/view?usp=drivesdk","description":"Clarinete Bb 1 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1q4kqBLpXFiUzVWqXUpShJ7qEmHxdCNXG/view?usp=drivesdk","description":"Contrabajo - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1HFHoDEQD9S_qdU1xix_ssSidsD7KUrJ2/view?usp=drivesdk","description":"Contrafagot - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1Zk6WN9jWThq7rd3RDG5o5CbDuJRMJbBZ/view?usp=drivesdk","description":"Corno F 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1Zk6WN9jWThq7rd3RDG5o5CbDuJRMJbBZ/view?usp=drivesdk","description":"Corno F 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1yE78zdMs43gfHsmXWIM2DEEUnXrC0lxI/view?usp=drivesdk","description":"Corno F 3y4 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1yE78zdMs43gfHsmXWIM2DEEUnXrC0lxI/view?usp=drivesdk","description":"Corno F 3y4 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/19Qo5g5iNLMjlICpPa774XKndb_l2Rx72/view?usp=drivesdk","description":"Fagot 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/19Qo5g5iNLMjlICpPa774XKndb_l2Rx72/view?usp=drivesdk","description":"Fagot 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1ikIX_ZvJRVOXbSmw4VLLpP33CyPda5WF/view?usp=drivesdk","description":"Flauta 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1ikIX_ZvJRVOXbSmw4VLLpP33CyPda5WF/view?usp=drivesdk","description":"Flauta 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1okg73sZ1wkeaVeH9Cr5-PRX7HiPAqNc4/view?usp=drivesdk","description":"Oboe 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1okg73sZ1wkeaVeH9Cr5-PRX7HiPAqNc4/view?usp=drivesdk","description":"Oboe 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[{"url":"https://drive.google.com/file/d/1rYGQ6iQvWAieIwhUgjEdfIcOinOLpTIp/view?usp=drivesdk","description":"Perc Percusión 1 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/10ud10gWW0nrNCYdHH46rlruu_33SsZ-3/view?usp=drivesdk","description":"Perc Percusión 2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1_dUx0uOMvLpJqU4Cz9wsBqRMSZgCj-oo/view?usp=drivesdk","description":"Perc Timbal - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1BxdfWxQ7LBkv4lgAlakmzMRc5bF-rCmX/view?usp=drivesdk","description":"Piano - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1kvJfQGxfNyy9eRJ5peroQmdl8fuUoxp3/view?usp=drivesdk","description":"SCORE - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1uxnipThRrMYJHghL_axE7AJj4VhOtPn-/view?usp=drivesdk","description":"Trombón 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1uxnipThRrMYJHghL_axE7AJj4VhOtPn-/view?usp=drivesdk","description":"Trombón 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1GGRCjOEagVBta6r7VSPxGLR0ODeBPM6P/view?usp=drivesdk","description":"Trompeta 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1GGRCjOEagVBta6r7VSPxGLR0ODeBPM6P/view?usp=drivesdk","description":"Trompeta 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1KPDeGbP1ZMFtH4ZK_IVRxwg4SiAqlUvb/view?usp=drivesdk","description":"Tuba - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Emqp6a8DhwqFRtBkhp8m3AY6Xrd72HQl/view?usp=drivesdk","description":"Viola - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1wKFZDTKM8ftl_zNowCAOMbdKDF6oiabf/view?usp=drivesdk","description":"Violín 1 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Ud_FFtlrGyrNPeklIPFlYJBqNx27XACd/view?usp=drivesdk","description":"Violín 2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1NwpFvL_p3Lu40OR0kwBgv9iNJ9K2w7sw/view?usp=drivesdk","description":"Violoncello - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1Mugy0qjpXZexGUO3HsHifuJ8kjHw3TB2/view?usp=drivesdk","description":"Voz - O Fortuna (Carmina Burana) - Orff, C.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>O Fortuna (Carmina Burana)</p>';
  END IF;

  -- <p>Otra Latitud</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Otra Latitud</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Otra Latitud</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/Guillo Espel.',
      '3.2.2.2 - 4.2.2.1 - Timp.+2 - Str',
      'https://drive.google.com/open?id=1sWCysyyewiYSsegu6W6YZNH0Qq_ppHSG'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Espel_Guillo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1gkSy22zs9-DCpcUtaCqTuo0aNSJTU5RK/view?usp=drivesdk","description":"Clarinete Bb 1 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1Dv6chFL3vhazB-ROsbuFocsuSyg_qIpK/view?usp=drivesdk","description":"Clarinete Bb 2 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1u2rtPA2vOWHpsxgbrEhBLCmyzd-5jxug/view?usp=drivesdk","description":"Contrabajo - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/148nmExxP46PAdMdJ9jblQiE5AJrDahYw/view?usp=drivesdk","description":"Corno F 1 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1YU2tyPs2GFpVr_7gtPBy22uk5gj4q_Vz/view?usp=drivesdk","description":"Corno F 2 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/19zn6fMMocUwhmgvfHPbQsKaEKa4c3IhU/view?usp=drivesdk","description":"Corno F 3 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1GS62GFDveg1mRiEbCORbhRlw4cjqwLMO/view?usp=drivesdk","description":"Corno F 4 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/10C3DGpuzIw0iPWDIjUo2OpWw_735idj6/view?usp=drivesdk","description":"Fagot 1 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1QGoQMC25AacVwevCX0Plbee7Snm7sZls/view?usp=drivesdk","description":"Fagot 2 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1X4YG-y7rCcSdj_SC3hvdg6B1RDdVSvx1/view?usp=drivesdk","description":"Fl Piccolo - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1GahiFqwGp_QW3S4BE3ktiUwisi-UDnaf/view?usp=drivesdk","description":"Flauta 1 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1klvdgD5KjPYfZ6SkiL6Sm5jE7rf_nsOz/view?usp=drivesdk","description":"Flauta 2 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/12SycCGvCIWzA8tiPhURYUGmx_L_YP6ga/view?usp=drivesdk","description":"Oboe 1 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1ioIY5Se0B3FL0wXbSZuWrquHXSPvoGwj/view?usp=drivesdk","description":"Oboe 2 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[{"url":"https://drive.google.com/file/d/1vB03DMQjO1SXoJ-ELwGilMJeUCxj5Qqv/view?usp=drivesdk","description":"Perc Percusión 1 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/16QkSD4eDS5MSxUtZzevXW50gDg4fK4hF/view?usp=drivesdk","description":"Perc Percusión 2 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/16SGazDon2187f1qAW-dTF7tAetYLs_j3/view?usp=drivesdk","description":"Perc Timbal - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/12o3UkVs2aMja8-vtJ9PmiDbWJQxOvS_c/view?usp=drivesdk","description":"SCORE - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1hzuxtxS7Pxc2zmPNJxsGEnK6dhpJlxvV/view?usp=drivesdk","description":"Trombón 1 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1MJGPNtuucNT-XneEcvo9unOA3MvhFKph/view?usp=drivesdk","description":"Trombón 2 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1plyHbKkMykyRUgE9acB7H7X8R-YDftqM/view?usp=drivesdk","description":"Trompeta 1 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1qOOEy6A16DrUAvwWXUr3aLm4Oh8vqf9r/view?usp=drivesdk","description":"Trompeta 2 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1a4MvjwcRRQxKdhaC2ztkSPPlMyK4VTx7/view?usp=drivesdk","description":"Tuba - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1DN7TK-O_jnWYeL3-t0dbJXlmVrKcHypO/view?usp=drivesdk","description":"Viola - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1UCiMO0f-V9AsTTPNOLpB_Nh5ABz_t6ym/view?usp=drivesdk","description":"Violín 1 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/19cJqJrpTgOKPS5a4szVPszIcJncq1PqU/view?usp=drivesdk","description":"Violín 2 - Otra Latitud - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1NCU03yGZSeaXl6PTE5wLzubZE7mgqJqa/view?usp=drivesdk","description":"Violoncello - Otra Latitud - Espel, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Otra Latitud</p>';
  END IF;

  -- <p>Vidala del Martirio</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Vidala del Martirio</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Vidala del Martirio</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/Guillo Espel.',
      '2.2.2.2 - 2.2.2.1 - Timp.+2 - Str',
      'https://drive.google.com/open?id=1iyH7mPZa49Pd5znhSHiLDB0XqkKxOpho'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Espel_Guillo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1nTqkYPI-A4Iu_z3hqZHQ6xdZwDb8YcHU/view?usp=drivesdk","description":"Clarinete Bb 1 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1wb_nhTWeBE3SVosdVwM5k8wneCYOGD1C/view?usp=drivesdk","description":"Clarinete Bb 2 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1EeFDfy-Ke47gKYCZv9WvHM7G2n2QyEx-/view?usp=drivesdk","description":"Contrabajo - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1Mlc3O0YfeQQnAiuqXkpgRxD1a7BsQF37/view?usp=drivesdk","description":"Corno F 1 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1WqQhRuCviZE5VtLb63-Pyy2g4VfuVkXv/view?usp=drivesdk","description":"Corno F 2 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1vIKp_kotZ8VRWtANeWD78QNCmsmaAiwm/view?usp=drivesdk","description":"Fagot 1 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1-yajNe2jg1EY1QliuN_C9dP_XCWmnLbF/view?usp=drivesdk","description":"Fagot 2 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/198-gta2dcce1Wzj7fVdUCeRvaF3LotKB/view?usp=drivesdk","description":"Flauta 1 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1Cz67bBj_IGf-8ddpUAnfU1UwOGdPyqbb/view?usp=drivesdk","description":"Flauta 2 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1pEJJ06BZO333-Qzs0fp-CydlMxJ15cRl/view?usp=drivesdk","description":"Oboe 1 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1npnBvcfE2-PJlVjuQrWjYgt2eYcH8ayA/view?usp=drivesdk","description":"Oboe 2 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[{"url":"https://drive.google.com/file/d/1pdJ-XBVUUPnwi_SDIKzosCekXQBeuGWn/view?usp=drivesdk","description":"Perc Percusión 1 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/1J0APKKmA3RuACoFjNGnjbCzfDcKnJ3-N/view?usp=drivesdk","description":"Perc Percusión 2 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1jEtZyubHS0I9N9fZIfyHYOEY7bdt3_xA/view?usp=drivesdk","description":"Perc Timbal - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1uzRFodV-Cq9uwFo8dA6b5N8x-3q2o8MY/view?usp=drivesdk","description":"SCORE - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1XTqPHC6uBg0syUTMYFgojRMK4Y5Kxb0H/view?usp=drivesdk","description":"Trombón 1 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1e3wjPC70rhYFXZ28dmPowb_r8UcB9MVl/view?usp=drivesdk","description":"Trombón 2 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/12INx7EYP1KcXr8JLLax4VfVDoSYj0TNZ/view?usp=drivesdk","description":"Trompeta 1 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/15wJj2UDyPNmZiov-hP_Q6Oiiu8tEz08A/view?usp=drivesdk","description":"Trompeta 2 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1dcIVtLO_HW53bLPHI2-x4d1ZNPNzxv9M/view?usp=drivesdk","description":"Tuba - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1nF99VoGeeC6Wvk8yhklDs27DhoSlCbhw/view?usp=drivesdk","description":"Viola - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1DLzChAGDIB-X8viBmXh9y0cKTwbT5mEb/view?usp=drivesdk","description":"Violín 1 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1SmelPx1uAMwkljgSRQhKFJeJ2bgN5fgx/view?usp=drivesdk","description":"Violín 2 - Vidala del Martirio - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/17PAZosblvzYIvzFk0qPcwkc2FLuqW529/view?usp=drivesdk","description":"Violoncello - Vidala del Martirio - Espel, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Vidala del Martirio</p>';
  END IF;

  -- <p>Salir al Ruedo</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Salir al Ruedo</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Salir al Ruedo</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/Guillo Espel.',
      '3.2.2.2 - 4.2.2.1 - Str',
      'https://drive.google.com/open?id=1s9vkj1AmUtd-xGu2oQ_1QPj3ExklWCAN'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Espel_Guillo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/104DpLVfPHZKe2TC2izQRrpOogRnW_-XC/view?usp=drivesdk","description":"Clarinete Bb 1 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1wWgpAe4M1aW2_zB-PXYHuA48ovIwrpJf/view?usp=drivesdk","description":"Clarinete Bb 2 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Md6ROXVBZITUhNIfcK-OK1e7t_7ZjQoX/view?usp=drivesdk","description":"Contrabajo - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/17nNW2gPFup6a2T4yEsMulHD-jwQA9tRm/view?usp=drivesdk","description":"Corno F 1 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1h3wIhNKFvpiBpkqu8Fi9PiHY8dQsS7yF/view?usp=drivesdk","description":"Corno F 2 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1V-24BqYwu2GwRcIdrBYx97NwL2GEDcWu/view?usp=drivesdk","description":"Corno F 3 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1batH0F2ui6PGeNEU6BADm4umZiAksEIb/view?usp=drivesdk","description":"Corno F 4 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1NkNgr1SdqzgXi7OAXSLoLJENcI4LC7re/view?usp=drivesdk","description":"Fagot 1 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/14Rp62LdN3vi_grnshtHtZACMm7Jp3qaM/view?usp=drivesdk","description":"Fagot 2 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1K3XF4C3UfMUqfmbI0cdV_NdG6Vr3KavK/view?usp=drivesdk","description":"Fl Piccolo - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1DFfszJUvdKXOUpYsg9OV_Mrk_vpMgs23/view?usp=drivesdk","description":"Flauta 1 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1ip2kIGjvy5RiNM0akbzvQ8MQZV1Lo7Kz/view?usp=drivesdk","description":"Flauta 2 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1o5KxxqpGWdYAydn92F0RfQm8-wPK_kzd/view?usp=drivesdk","description":"Oboe 1 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/18pKPrTgxRKdSg0TQcYuafZ67OYZ4jNLW/view?usp=drivesdk","description":"Oboe 2 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/11cq2DKAg1vMM6kwiflwUCjNe-IApWi0r/view?usp=drivesdk","description":"SCORE - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1DGI2UVmBcj7eZ2hferdxBAisG502hO_A/view?usp=drivesdk","description":"Trombón 1 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1_vHG7KGzgopQ5lT3MV5gYpMN1M1OPGle/view?usp=drivesdk","description":"Trombón 2 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1O8hnCCxfosQJbdTwfJAvT5POefnVMOLm/view?usp=drivesdk","description":"Trompeta 1 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1x95jyY9Z1TdfwBXRK3ESJ_6aJwN386re/view?usp=drivesdk","description":"Trompeta 2 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1t-nc06dadUvPCjqj01jtgxCW_25mX_kV/view?usp=drivesdk","description":"Tuba - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1vMr8iHHLPqejmlV4IATA6P6D_K2vicfk/view?usp=drivesdk","description":"Viola - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1-NJdMrKZJFKNfe3ipuPjM1BwbLVu_tFG/view?usp=drivesdk","description":"Violín 1 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1wOBTm_ZpAB6P27bwcHnnQUfSUyAuqs9-/view?usp=drivesdk","description":"Violín 2 - Salir al Ruedo - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1hSuR0HfCkQPLviRKbTkeZQ_uAp0ph4dp/view?usp=drivesdk","description":"Violoncello - Salir al Ruedo - Espel, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Salir al Ruedo</p>';
  END IF;

  -- <p>Fabi</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Fabi</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Fabi</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/Guillo Espel.',
      '2.2.2.2 - 4.2.2.0 - Str',
      'https://drive.google.com/open?id=10LhQhmH7D78YWSb5LqlHntetFvNum7uK'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Espel_Guillo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1uH5eUR7y7Qb5M28jgUD9MGgEN9Z1MOHz/view?usp=drivesdk","description":"Clarinete Bb 1 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1-v_K3oK0X-cGYmlzb52_QCGqGp2CNa1w/view?usp=drivesdk","description":"Clarinete Bb 2 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1n4Rp2eTTjXxrgIThEHU50PFzx2yDpuj0/view?usp=drivesdk","description":"Contrabajo - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1MkuolCSJpw_kpbC7IzbYgnkUgk77DLLU/view?usp=drivesdk","description":"Corno F 1 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1hWgbQmdByX1HGXX6zZiIbXbh97V8udMj/view?usp=drivesdk","description":"Corno F 2 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1ae7ePdZstrXPOD0HbzecC2qtQLBHm0RY/view?usp=drivesdk","description":"Corno F 3y4 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1ae7ePdZstrXPOD0HbzecC2qtQLBHm0RY/view?usp=drivesdk","description":"Corno F 3y4 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1DcamshkAa0dMCL2CT5YzDiMqMhEAawFk/view?usp=drivesdk","description":"Fagot 1 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1rLKz_21PCxhObO4t1DVh7ZBeyR_xpNwW/view?usp=drivesdk","description":"Fagot 2 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1pEKtLOAmxVPTVE7J3uQRPPoWEVGAWfNe/view?usp=drivesdk","description":"Flauta 1 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1PyEnqkNa1GC4hEU78Xz4GxOY5qKLFiHb/view?usp=drivesdk","description":"Flauta 2 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1ztrnzHlNrpBfNAiOiTGrgY4AVU_UJqna/view?usp=drivesdk","description":"Oboe 1 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1a_-BlZTZgJzpu0fTTH3vVU2Yna2Smqz6/view?usp=drivesdk","description":"Oboe 2 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1qbBwillpTfDF8nXyIK22yDae0Xmky9NP/view?usp=drivesdk","description":"SCORE - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1ZH7viC5TGrg8uHQzeGnE6qdH8Gr-fStr/view?usp=drivesdk","description":"Trombón 1 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1uQ7zJOc0Yvtrow_YVY1Kos2Gve2-cXbL/view?usp=drivesdk","description":"Trombón 2 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1w9yCvRl9ZFUzCVWXyUt5FjQhaNN5UpTF/view?usp=drivesdk","description":"Trompeta 1 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1Z3m9g0hpg6j4CghsEZsDnpDHaj-mM0vK/view?usp=drivesdk","description":"Trompeta 2 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1vC6V2dC8N_xmVqdtViLTpm8bl55fI7Qs/view?usp=drivesdk","description":"Viola - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1JOettFYTGbuBhXLuAfLSv8ljAX1OGxYR/view?usp=drivesdk","description":"Violín 1 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1a1lMNkxFdrE8NKKE1zRX_IUK5Vqc2qMD/view?usp=drivesdk","description":"Violín 2 - Fabi - Espel, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1tjfBgOP_yfAplN3fdxb_urF91Lk7Y9fl/view?usp=drivesdk","description":"Violoncello - Fabi - Espel, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Fabi</p>';
  END IF;

  -- <p>Años de Soledad</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Años de Soledad</p>'
      AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Años de Soledad</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).',
      '2.2.3.2 - 4.2.2.1 - Timp.+3 - Str',
      'https://drive.google.com/open?id=18WXpBpT4srxDXqiLQf_qpe-NV2-ph2hF'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Retamosa_Jorge, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1Vju1J1xVy8H2nR31rKHtv6oyEZoQFdI5/view?usp=drivesdk","description":"Clarinete Bajo - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1rGBjhLCNFxl6D6gfApqYc-eIYNl8_R2v/view?usp=drivesdk","description":"Clarinete Bb 1 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1pxUN6dVvsEVA0-w4Lcb5r_g4B1aUoOfh/view?usp=drivesdk","description":"Clarinete Bb 2 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1rYFoWaP0Or_0oEew2d5QVGs05a-qRxzu/view?usp=drivesdk","description":"Contrabajo - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/17ipDs-vVg_73agurlSV5nv3EBbgei4wF/view?usp=drivesdk","description":"Corno F 1y2 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/17ipDs-vVg_73agurlSV5nv3EBbgei4wF/view?usp=drivesdk","description":"Corno F 1y2 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1MhzdXFy2QMseuhQ98cBma0j76Q0UHnEA/view?usp=drivesdk","description":"Corno F 3y4 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1MhzdXFy2QMseuhQ98cBma0j76Q0UHnEA/view?usp=drivesdk","description":"Corno F 3y4 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1m_FRNSrzR8FbcqHbPhnYEuT6W-VDrf6Z/view?usp=drivesdk","description":"Fagot 1 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1IhwdefmG_pHCIi9sNOGMI-_lghQgE6wP/view?usp=drivesdk","description":"Fagot 2 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1aoceS0X3NePokCEBYAiRST9TUMlbyIML/view?usp=drivesdk","description":"Flauta 1 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1FYau37IDCGUF2sXtxYscVlhjXxnDlTce/view?usp=drivesdk","description":"Flauta 2 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Glockenspield Anos de Soledad', '[{"url":"https://drive.google.com/file/d/1YTha2Hv4ABkig0sl7mbTCpX8h1XibfD4/view?usp=drivesdk","description":"Glockenspield Anos de Soledad - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1TSmBreb2T3Qj5hadQRUECy7qIH3SbgAi/view?usp=drivesdk","description":"Oboe 1 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1OInRjSTkLYdrQsvHxiVorIO3dQ5jzUdq/view?usp=drivesdk","description":"Oboe 2 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1qbPN98Py5lN_rLOnX2z42CKIeh1haDBy/view?usp=drivesdk","description":"Perc Bombo - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/1oaz6_uvpWNs7uDx6kmzIg8mF5hxIRxAz/view?usp=drivesdk","description":"Perc Tambor - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1oO_6EHoIwY4ZLoMOW10tlHdFDppgnTgG/view?usp=drivesdk","description":"Perc Timbal - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1arikUCbVSS1wgaN_GfEMPFNPlkxm_yFk/view?usp=drivesdk","description":"SCORE - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1aHTcU9YEDtYW61WBLz_rBUZIWNmY4zd_/view?usp=drivesdk","description":"Trombón - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1GNBrhcrekcmyPkhlsvEGLd4S1lcPyHTZ/view?usp=drivesdk","description":"Trombón 1 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/11dAFcmfQ9OVKH0vAiSRpvm6Zhj2-S034/view?usp=drivesdk","description":"Trompeta - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1e_An-ZKkrrLyDP-7EnGIqMP2aEJbMHdW/view?usp=drivesdk","description":"Trompeta 1 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/18Neqhe-FpaEPLaLkCLdWZYUue6K6vHHq/view?usp=drivesdk","description":"Tuba - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1otA6avs3G96jEoifX_77V8WUr0sDvqqw/view?usp=drivesdk","description":"Viola - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/15LTfw5J78sa3qRaZoTNi_7-DAz4qO4G7/view?usp=drivesdk","description":"Violín 1 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1qoFPsoB19YA5DPVWAOlxOk5eeUmofpqq/view?usp=drivesdk","description":"Violín 2 - Años de Soledad - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1-8DZ3zBIIUqstHzHyKEXqUBSWcCQjQOA/view?usp=drivesdk","description":"Violoncello - Años de Soledad - Retamosa, J.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Años de Soledad</p>';
  END IF;

  -- <p>El día que me quieras</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>El día que me quieras</p>'
      AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>El día que me quieras</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).',
      '2.2.2.2 - 4.2.2.1 - Timp.+2 - Str',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Retamosa_Jorge, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>El día que me quieras</p>';
  END IF;

  -- <p>Reminiscencia</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Reminiscencia</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Reminiscencia</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/Retamosa.',
      '2.2.2.2 - 4.2.2.1 - Timp.+3 - Str',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Retamosa_Jorge, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Glockenspiel', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Reminiscencia</p>';
  END IF;

  -- <p>Toda Mi Vida</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Toda Mi Vida</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Toda Mi Vida</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/Retamosa.',
      '3.2.2.2 - 1.2.2.1 - Timp.+3 - Str + Voz',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Retamosa_Jorge, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Glockenspiel', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz Toda Mi Vida', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Toda Mi Vida</p>';
  END IF;

  -- <p>Concertango</p><div>&nbsp; I</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
      AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Concertango</p><div>&nbsp; I</div>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Concertango 1er movimiento.',
      '3.2.3.2 - 4.2.2.1 - Timp.+3 - Str',
      'https://drive.google.com/open?id=1Nm0D5ALi1xI8Cmz55OV-2z0TV0Oyem3v'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Retamosa_Jorge, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1GNp2xTyP5YsYUZInXzMpLlxtZU0_lEJx/view?usp=drivesdk","description":"Clarinete 1y2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1GNp2xTyP5YsYUZInXzMpLlxtZU0_lEJx/view?usp=drivesdk","description":"Clarinete 1y2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/11QMcvWqAJZON9dSsZq8nTouQ4bcbgZeA/view?usp=drivesdk","description":"Clarinete Bajo - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1gj2bv0cxhHjyFROtwp57YnUxpPjUKokt/view?usp=drivesdk","description":"Contrabajo - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1893_aq-644dhKBrop4owJYYE-sAUmxON/view?usp=drivesdk","description":"Corno F 1y2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1893_aq-644dhKBrop4owJYYE-sAUmxON/view?usp=drivesdk","description":"Corno F 1y2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1P9nz6T98yrz2TR6gT5LFyH7osCJzF1GH/view?usp=drivesdk","description":"Corno F 3y4 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1P9nz6T98yrz2TR6gT5LFyH7osCJzF1GH/view?usp=drivesdk","description":"Corno F 3y4 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/15M1Ll4yFy65v5Q8Czmam-XgXdtT7vqC8/view?usp=drivesdk","description":"Fagot 1y2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/15M1Ll4yFy65v5Q8Czmam-XgXdtT7vqC8/view?usp=drivesdk","description":"Fagot 1y2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/15idqjlo1sJiojShddcN9nsVspEERZ0cf/view?usp=drivesdk","description":"Fl Piccolo - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1RCL6BJDtHr3Ju8V1HjrTWjG7p0MqsaWa/view?usp=drivesdk","description":"Flauta 1y2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1RCL6BJDtHr3Ju8V1HjrTWjG7p0MqsaWa/view?usp=drivesdk","description":"Flauta 1y2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1hlyaaIYiaPBdIfbRGas36_oqS6D0rVGF/view?usp=drivesdk","description":"Oboe 1y2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1hlyaaIYiaPBdIfbRGas36_oqS6D0rVGF/view?usp=drivesdk","description":"Oboe 1y2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[{"url":"https://drive.google.com/file/d/1BT4SGihRPbedZs7jCT9iHW4OCmuAfDhe/view?usp=drivesdk","description":"Perc Percusión 1 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/1JE7--sp-nJ7iDACIYdvbIo9p23dZwib0/view?usp=drivesdk","description":"Perc Percusión 2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1PvFGQY6Hxn1n02DPh1q45RmJA0ssalQJ/view?usp=drivesdk","description":"Perc Platillo - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1-unJSwgzz1wmjl0lA84_Gx6QPkJxFF-9/view?usp=drivesdk","description":"Perc Timbal - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1LCI0ZiHAbvruRJmImaAySZ3UyIWVDXwB/view?usp=drivesdk","description":"SCORE - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1Q87IjbmWyuroOwBdZuhtzCWvZiQRzSwM/view?usp=drivesdk","description":"Trombón - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1vh1lYr620NKYKo4fFqx5A5MiKX2Bop6U/view?usp=drivesdk","description":"Trombón Bajo - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1HnRuLhGlVdrHNihH_CKO7DP_EB0VjBaV/view?usp=drivesdk","description":"Trompeta 1 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1Xx9RRYxR_1fbmMn44na59S43r4IUP75L/view?usp=drivesdk","description":"Trompeta 2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1XZakziwXvso17jbqe2IVtIJbIgAGPTde/view?usp=drivesdk","description":"Tuba - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1RLIMJhzqy7J-HdHdgHNxB3INgfGMPVU5/view?usp=drivesdk","description":"Viola - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1lI04BhBjWrcbUOCyrKpOCp8uR9Cii6tv/view?usp=drivesdk","description":"Violín 1 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1qnUJRLdWnXI9X2IkYOTz0xZ--P00i1Fk/view?usp=drivesdk","description":"Violín 2 - Concertango (I) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1a6pqelK_Mw--yRJmmiKXzkUfsHMor9WK/view?usp=drivesdk","description":"Violoncello - Concertango (I) - Retamosa, J.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Concertango</p><div>&nbsp; I</div>';
  END IF;

  -- <p>Concertango</p><div>&nbsp; III</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
      AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Concertango</p><div>&nbsp; III</div>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Concertango 3er movimiento.',
      '2.2.3.2 - 4.2.2.1 - Timp.+3 - Str',
      'https://drive.google.com/open?id=1SdSifq-IEXxh0xhTu0sfi48nhOc578tu'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Retamosa_Jorge, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1k-5pGmIVSDraOAVO3q6w5ooQx7cA8eH1/view?usp=drivesdk","description":"Clarinete 1y2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1k-5pGmIVSDraOAVO3q6w5ooQx7cA8eH1/view?usp=drivesdk","description":"Clarinete 1y2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1TnqZ8Uz9CR6XZHEnGhKAI0DA3ALNN3k-/view?usp=drivesdk","description":"Clarinete Bajo - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1rJCfjcOqub41sU9fbAssC59szMx0F2QR/view?usp=drivesdk","description":"Contrabajo - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/10kRT-yS7B5IzhpFi0EDL95KjOvYJ3vZG/view?usp=drivesdk","description":"Corno F 1y2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/10kRT-yS7B5IzhpFi0EDL95KjOvYJ3vZG/view?usp=drivesdk","description":"Corno F 1y2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/11GeawV7iOlUbY1uO6bSKer2xGwGyM65n/view?usp=drivesdk","description":"Corno F 3y4 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/11GeawV7iOlUbY1uO6bSKer2xGwGyM65n/view?usp=drivesdk","description":"Corno F 3y4 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1LGqJccArvzD5uYgrexsMydDgEGGxJ7WP/view?usp=drivesdk","description":"Fagot 1y2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1LGqJccArvzD5uYgrexsMydDgEGGxJ7WP/view?usp=drivesdk","description":"Fagot 1y2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1eATy6ZAEAV_iqIhJGytWII83ql-uEAQV/view?usp=drivesdk","description":"Flauta 1y2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1eATy6ZAEAV_iqIhJGytWII83ql-uEAQV/view?usp=drivesdk","description":"Flauta 1y2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1SDxZcglXeVn5c_fMGMSg30e7jy36NcGU/view?usp=drivesdk","description":"Oboe 1y2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1SDxZcglXeVn5c_fMGMSg30e7jy36NcGU/view?usp=drivesdk","description":"Oboe 1y2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[{"url":"https://drive.google.com/file/d/1dVM-Gib-Ev8ZRSFRhIVH54VJpwxRkjyc/view?usp=drivesdk","description":"Perc Percusión 1 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/1njf19qt_KWMqdaUd6M-big55QBCbYiC2/view?usp=drivesdk","description":"Perc Percusión 2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1ihOrJCIos_dHkhQs7MiAxAvk1twVyDx-/view?usp=drivesdk","description":"Perc Platillo - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1x0FUzEj00z4j5W7hqgetEXGdF-mVapJW/view?usp=drivesdk","description":"Perc Timbal - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1rC3EM51NHKcTzZbsfPpsCu858TGgOMqu/view?usp=drivesdk","description":"SCORE - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1fDckqW5vl2Xh8MtSBC5IJQ9qarYcvfMc/view?usp=drivesdk","description":"Trombón - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1_OTq-haNS_naUq8p38hyzl9EWpOrIhw0/view?usp=drivesdk","description":"Trombón Bajo - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1qZXaDCK9l1SsNKbovVVqV-1KWbhT3OLh/view?usp=drivesdk","description":"Trompeta 1 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1v0mwcacB_fPqUfOa0rIWYYlUF0gXvdAW/view?usp=drivesdk","description":"Trompeta 2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1WrZrm_dAiFsQBpnx30DrF38DFvTn-DWX/view?usp=drivesdk","description":"Tuba - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1hnhBt807ECOvTNsDy1tBG8j--lwF_vxK/view?usp=drivesdk","description":"Viola - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1sEKERIRS071IU39Z6mqKWTI9_hp8cGCU/view?usp=drivesdk","description":"Violín 1 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1_kALQSxiOCX68_REUZZGRdvp-xfF3r3M/view?usp=drivesdk","description":"Violín 2 - Concertango (III) - Retamosa, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/17X3GuF1M1BIiS04xPpxn4uCdvmAiF1bi/view?usp=drivesdk","description":"Violoncello - Concertango (III) - Retamosa, J.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Concertango</p><div>&nbsp; III</div>';
  END IF;

  -- <p>Qhapaqkunap</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Qhapaqkunap</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Qhapaqkunap</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).',
      '3.4.3.3 - 4.3.3.1 - Perc.x3 - Key - Str',
      'https://drive.google.com/open?id=1hZyjA_FVB80zoLl7RAA-nQwPzKjW1vCA'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Nicoletti_Juan_Pablo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1x0rwNs1ExcMCf5PoHwAEJ2SO0-1st4jj/view?usp=drivesdk","description":"Clarinete Bb 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1w7XK2nca0r26F4pgWE-yXkAnRZff91Gy/view?usp=drivesdk","description":"Clarinete Bb 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 3', '[{"url":"https://drive.google.com/file/d/1yS_kOPPnCW1nw1eGX5ruDAUR8DVR6UUw/view?usp=drivesdk","description":"Clarinete Bb 3 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1nPbNnPW1qIVWr9WJAXULWWUyn8xqKyrD/view?usp=drivesdk","description":"Contrabajo - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1dOXmMIlsGMueP1I36Gf2txF0rubvAj-q/view?usp=drivesdk","description":"Contrafagot - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1hzlwg48oT0sx7yb-3pIutgyz7a74rdt_/view?usp=drivesdk","description":"Corno F 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1w3m8iDpHX_ExcAkmkMSRPvQ_yY8Xx9T9/view?usp=drivesdk","description":"Corno F 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1akCGL-l2JemCQzHrTD56vtFHteggnfj5/view?usp=drivesdk","description":"Corno F 3 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1cXCuUqkMQ6KDPVOmU-P8ToECGjIEx7Xx/view?usp=drivesdk","description":"Corno F 4 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1LG3CDFBw1rzzIT5xTwiIA8OAQp_gsbhp/view?usp=drivesdk","description":"Fagot 1y2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1LG3CDFBw1rzzIT5xTwiIA8OAQp_gsbhp/view?usp=drivesdk","description":"Fagot 1y2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1AZKmuzdh9F2y3mdzZxKc42rltnuGblA2/view?usp=drivesdk","description":"Flauta - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1-Vo_fNSXK8lU2nu9d8ILVnkM6yXfeSoL/view?usp=drivesdk","description":"Flauta 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1icxgD-WsjZr_VACq_uSqQuqBrw9eG2Hu/view?usp=drivesdk","description":"Flauta 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1PydZ_rd9yQiQ_1i4ig5C47BGEYLWmPds/view?usp=drivesdk","description":"Ob EH - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1N8SMlIUUg3YPHjnXAVKDqUN1ZzD_GyYo/view?usp=drivesdk","description":"Oboe - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1G6x2wfrUhkz02xgfeYTy_YhCVU6yFi52/view?usp=drivesdk","description":"Oboe 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1QHw6zP7KES-1_bMQmDEUNK6P7OFUmlwU/view?usp=drivesdk","description":"Oboe 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1CDw5uR-3nvoaFOGY4fvhmDiZRI6YXyQC/view?usp=drivesdk","description":"Perc Percusión - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[{"url":"https://drive.google.com/file/d/1AHMhXVUAvkqAY37I7oLry3nyKt9oDWSJ/view?usp=drivesdk","description":"Perc Percusión 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/1ucW1ikEvDmdzxRR7IHyOkMRjEf3_SBCE/view?usp=drivesdk","description":"Perc Percusión 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/12YHywqzN1OsQVLkYL2Wf3zPel-5ewXt0/view?usp=drivesdk","description":"Piano - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1SyXZHopdTMnHwlhC3VMp70ywMqoC7XZ9/view?usp=drivesdk","description":"SCORE - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1fqYtjqrl5fgtyC2U6r67Qzo536fsoxDs/view?usp=drivesdk","description":"Trombón 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1Tj4JcPpeO_8k59xvWWThQRy9gaeaeQkl/view?usp=drivesdk","description":"Trombón 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1sxLIZIcXoo6SycV07DjYN4OfJCRUSM-N/view?usp=drivesdk","description":"Trombón Bajo - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/13rj_XI_mdPhk2ZFPBgNQv0jzY21ZVsqM/view?usp=drivesdk","description":"Trompeta - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1w59AvU0rP-wlOg5iV9u8t_narc91fk8L/view?usp=drivesdk","description":"Trompeta 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1bGCQ1BVOZe4BaI5t7mVBxdkwGFo7VkMM/view?usp=drivesdk","description":"Trompeta 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1sFt34taslGZs13i_IIYyeHEULtEIxSY9/view?usp=drivesdk","description":"Tuba - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1y5pUq7bRkGiyS8LQ5Swkb450xo3qbYPg/view?usp=drivesdk","description":"Viola - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 1', '[{"url":"https://drive.google.com/file/d/1aPdyaZztuWjGFhHGkLz0pP_65vCsLsCc/view?usp=drivesdk","description":"Viola 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1G-ShG1FPzh3TlpGi0wVtDEyyUBh3vXIr/view?usp=drivesdk","description":"Violín 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1zzgxRwFdyGIvdvhbTYGC4uVqHe1Dq4gi/view?usp=drivesdk","description":"Violín 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/10QxuUuNGcr9mNqxlYHW6OTvocEqKoeAi/view?usp=drivesdk","description":"Violoncello - Qhapaqkunap - Nicoletti, J.P.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Qhapaqkunap</p>';
  END IF;

  -- <p>Bishmaia Hanacpachapi</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Bishmaia Hanacpachapi</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Bishmaia Hanacpachapi</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/Nicoletti.',
      '3.2.1.2 - 4.3.2.1 - Timp.+3 - Str',
      'https://drive.google.com/open?id=1bI1DVDBmJ2Zs3BxYFRd0-7ES35knpHqR'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Nicoletti_Juan_Pablo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1lDWRNGBG228oNr7Fe_ZPxWjblBghIVvI/view?usp=drivesdk","description":"Clarinete Bb - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1GGlwEJQfRCOOQ8MtNJ_fhkJjoPzGfHNB/view?usp=drivesdk","description":"Contrabajo - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1XDSPOGA76TB1_X6fZbWoQtdZdZfY_ABq/view?usp=drivesdk","description":"Contrafagot - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1DEaP9upKTKhHysUteKlxW_qOxyDnWeeg/view?usp=drivesdk","description":"Corno F 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1DEaP9upKTKhHysUteKlxW_qOxyDnWeeg/view?usp=drivesdk","description":"Corno F 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1u7T_YQ2mmA_AceBdKrHfQR1tXz5Szcv1/view?usp=drivesdk","description":"Corno F 3y4 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1u7T_YQ2mmA_AceBdKrHfQR1tXz5Szcv1/view?usp=drivesdk","description":"Corno F 3y4 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1pfE7eXOkv8-HaS1aiWYb5eNqFnIOnp9_/view?usp=drivesdk","description":"Fagot - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1PpVVtJ66U24T0Fve9MDin02w9zrDFZ3R/view?usp=drivesdk","description":"Flauta - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1kR8hMXfjZguKzfgvNYk5LAtmxjLLK6jt/view?usp=drivesdk","description":"Flauta 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1kR8hMXfjZguKzfgvNYk5LAtmxjLLK6jt/view?usp=drivesdk","description":"Flauta 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1zsPvjT-Z2zDemlabNENZzLDDFlzz6LDU/view?usp=drivesdk","description":"Ob EH - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1mlScACTnnHvAmztIn8_cXDBVx7yQCBwK/view?usp=drivesdk","description":"Oboe - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1ZifistsLd7SoRqs7aVBF5cOLtb4QG29p/view?usp=drivesdk","description":"Perc Bombo - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Campanas', '[{"url":"https://drive.google.com/file/d/1tqsUlBygWBb1JqX1nKppNku6Pu6kCyRP/view?usp=drivesdk","description":"Perc Campanas - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Gong', '[{"url":"https://drive.google.com/file/d/18HTqce6TPvcY9Ne76nVQmOrdAi-BOEEH/view?usp=drivesdk","description":"Perc Gong - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/16jWrLBE8CG2V7W07qwrmpEmHvFPHEsyr/view?usp=drivesdk","description":"Perc Timbal - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1IhI2gFCwBBgp7epHIXnFfVsBufob3VNU/view?usp=drivesdk","description":"SCORE - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1vuJ-nnOxRT5NuN-zQHEPB2OfxLKl6IyW/view?usp=drivesdk","description":"Trombón - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1AyCQ5ZGcZ8o612LoN8XDGH5w8DIt2Uh7/view?usp=drivesdk","description":"Trombón Bajo - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1OxaQ59lT0xKnDTfPw1biAfbrDbt3MQHW/view?usp=drivesdk","description":"Trompeta - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1biLqz265x_GLsBJB_XBO1K7tnq6yu_Lv/view?usp=drivesdk","description":"Trompeta 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1biLqz265x_GLsBJB_XBO1K7tnq6yu_Lv/view?usp=drivesdk","description":"Trompeta 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1P5ts7BR1r8X-IBNRh615HtHjhCByhwYX/view?usp=drivesdk","description":"Tuba - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1nsHHALO2dOT-7-Lw3T3EMvdZRGIUQFZo/view?usp=drivesdk","description":"Viola - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1VlN0qfdfS_OdJH2Ps2fhiRBnbwUeD4Za/view?usp=drivesdk","description":"Violín 1 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/16e4F2_OpbFq8dFcgOmLFtH9q2n90Ivp2/view?usp=drivesdk","description":"Violín 2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1avn8YuoBcPEfztBRrFKivMSQpNKvWv-x/view?usp=drivesdk","description":"Violoncello - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Bishmaia Hanacpachapi</p>';
  END IF;

  -- <p>Lonquen</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Lonquen</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Lonquen</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/Nicoletti.',
      '2.1.1.1 - 1.1.2.1 - Perc.x3 - Str',
      'https://drive.google.com/open?id=13L64wpHsFCfdkH-QEKE-PMXZ-uDnvHJp'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Nicoletti_Juan_Pablo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinetes Lonquen', '[{"url":"https://drive.google.com/file/d/1T7OXqKFWANg8N2HZyq4daDHz8cnmt-vP/view?usp=drivesdk","description":"Clarinetes Lonquen - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1eFJvw6P2Z2M2Zq7XV_dqjsilh9aKuJmj/view?usp=drivesdk","description":"Contrabajo - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1PFMHXhavRmouptCatQ1xAZk_7_soNGgF/view?usp=drivesdk","description":"Corno F - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagotes Lonquen', '[{"url":"https://drive.google.com/file/d/1CwmDjhVKzxq2LpYsiFdXpFYPo5_TuSfM/view?usp=drivesdk","description":"Fagotes Lonquen - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1Dhxsa-hg_0wdgrFiAHxzFGn2ffeTSJvf/view?usp=drivesdk","description":"Flauta - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1M39KbzvR0soONRn0hXgc_c05nk3rv5UK/view?usp=drivesdk","description":"Flauta 1 - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1kHWD9Zy_GKoDQNglIF5nWfiiZqSyXfhE/view?usp=drivesdk","description":"Oboe - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1zVOVTBvSXGKR3mskKKjWb9cvVkL5JT34/view?usp=drivesdk","description":"Perc Percusión - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 1', '[{"url":"https://drive.google.com/file/d/16TMhOWpFCU5qzKoNIxexPOoVxarBpmWx/view?usp=drivesdk","description":"Perc Percusión 1 - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/1G8KcUg5ABI-FWJUbOsaJs4eFD1wTROWU/view?usp=drivesdk","description":"Perc Percusión 2 - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1EJZ8YR_O22xnENMd7bzJ2plOH-WiCblu/view?usp=drivesdk","description":"SCORE - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1JkEMk2h0P5KNzLbUeymoLLQVn5dmHAbD/view?usp=drivesdk","description":"Trombón - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1q6INdO85gHaVUOuu0f0lteYAcBmkRpLe/view?usp=drivesdk","description":"Trombón 1 - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompetas Lonquen', '[{"url":"https://drive.google.com/file/d/1IIVPhtEqDL4insATRAVx27AZjnrBmDte/view?usp=drivesdk","description":"Trompetas Lonquen - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1P6g2uw6cnn7N2BBlig2S46uQ_jSc0x0s/view?usp=drivesdk","description":"Tuba - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Sht6mvRUoOBQRnlcF8q0qPM0IJZo9lNG/view?usp=drivesdk","description":"Viola - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1cxOFNhisJ3bZL7BPqyRJkNXzQmovtFG8/view?usp=drivesdk","description":"Violín 1 - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1kIuJ6AwLoAFrQfGdFKQrYIFEfMrApQye/view?usp=drivesdk","description":"Violín 2 - Lonquen - Nicoletti, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1n8Jv32KrNe2RevKAONC4PACiHuN-X3QG/view?usp=drivesdk","description":"Violoncello - Lonquen - Nicoletti, J.P.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Lonquen</p>';
  END IF;

  -- <p>La Cancha</p><div>&nbsp; (El Secreto)</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/El Secreto.',
      '3.3.3.3 - 4.3.3.1 - Timp.+3 - Hp - Key - Str',
      'https://drive.google.com/open?id=1qxuN7xj1qod6c3NPr6czc2G5IAFKSMtW'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_El_Secreto_, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1AHqWoND2I3uaCs15YXSigBgKG2zHnNkr/view?usp=drivesdk","description":"Arpa - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1ERNvPryXIaJ0B8IGoB6w3MX7QxqZdp6j/view?usp=drivesdk","description":"Clarinete Bajo - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1hFXT-gDYEX5ahfn_VQU9tugs6N-LjNOV/view?usp=drivesdk","description":"Clarinete Bb 1 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/16dZPXL_mtdNqVyA1xBPYIVO9ZGf_3FS1/view?usp=drivesdk","description":"Clarinete Bb 2 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1WERlTktlvxoXTYsHKjzZtoftG09oGkai/view?usp=drivesdk","description":"Contrabajo - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1RVORy69K9ra_B8uc7LKTJbR--qAbu-11/view?usp=drivesdk","description":"Contrafagot - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1HLnfmKFDqkRPC1OZHXotHmI4yq4SV49r/view?usp=drivesdk","description":"Corno F 1 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1Q90oCefPOn42dfzIFKBeMvDd8yc1hb9l/view?usp=drivesdk","description":"Corno F 2 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1Tud6qdTi3i5ImffTzXfMyzRGOWR3h_fo/view?usp=drivesdk","description":"Corno F 3 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1mFW-fCGb9T90eKQuYdSoc453tZ8nXl3q/view?usp=drivesdk","description":"Corno F 4 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/10Jas8_bj--42B_bkhlH3rkz3f-in3mZ-/view?usp=drivesdk","description":"Fagot 1 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1rkVr2OPsWyQ9uBG8mUOttwqNkUGKvg_S/view?usp=drivesdk","description":"Fagot 2 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1ECH_9T3e5WplFTNoD9KmcPPEGVSSaYZy/view?usp=drivesdk","description":"Fl Piccolo - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1s0e54gcSfSi71ETKlWKBsiRJagC6N6sd/view?usp=drivesdk","description":"Flauta 1 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1TwSJKthJa3CnbqtahtHNHuJTSeSpo7hs/view?usp=drivesdk","description":"Flauta 2 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1E-pXih3iv8RoBCj54BTf4u5XdA200xUh/view?usp=drivesdk","description":"Ob EH - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/12dukxhZP9bibscQ3beODKtOjukhVWNve/view?usp=drivesdk","description":"Oboe 1 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/11w20y8Nr8aYOsEvgoyEqrBAMpq1vZBVM/view?usp=drivesdk","description":"Oboe 2 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1CsfEKtPGPe0Rtg1_N8yzlSaGg565Flgu/view?usp=drivesdk","description":"Perc Bombo - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1ly5d4Z0tWmtf9mK49wpns20IbVA5Yr77/view?usp=drivesdk","description":"Perc Percusión - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1tqHMyp_ZA09BF_5RGlyntOEyGQxVK24X/view?usp=drivesdk","description":"Perc Platillo - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1sOgSk_AqAWiYOoZ61O70RU64j3Fscs6z/view?usp=drivesdk","description":"Perc Timbal - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1v56fxZelZ8zwmTuY4IWyqnArogtw7evH/view?usp=drivesdk","description":"Piano - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1PV9F3NPZ8RpkxmEaAh_hIL2Y-oL590c9/view?usp=drivesdk","description":"SCORE - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1I01zmnTYYUPE42fjDUyDYwnuahghRMr7/view?usp=drivesdk","description":"Trombón 1 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1BG82kM1CcN-BqYl1UPi3gZa52v8czYZD/view?usp=drivesdk","description":"Trombón 2 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1wmE1IFa07RL-3npTBY6CX_veb4zx_-QL/view?usp=drivesdk","description":"Trombón Bajo - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1m1Mbi_6e_YjT8B50ZqYEw9lk4EgNKezA/view?usp=drivesdk","description":"Trompeta - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1NguhpXJyXyGOf32_eFU-YLOQjusJ1RKm/view?usp=drivesdk","description":"Trompeta 1 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1Z7EF8LLafNWAeWc7W7kzzG2Kk_OSG32k/view?usp=drivesdk","description":"Trompeta 2 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1YiHxsKwwbtuLlz1DYhMLtgtD8kowFBct/view?usp=drivesdk","description":"Tuba - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1cDYRB0j1nfxTnmkqsxzb0fduHoA7Ecas/view?usp=drivesdk","description":"Viola - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1MhQtLOpu6XLPTVB_8A5Vz9RtmCVYi8hI/view?usp=drivesdk","description":"Violín 1 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/14ysWiFSeFA76NP1-CrASlS6RdCKdMfPZ/view?usp=drivesdk","description":"Violín 2 - La Cancha - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1U0dboXX882Ygv_H89k8T44T6iMuWLS30/view?usp=drivesdk","description":"Violoncello - La Cancha - El Secreto.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>La Cancha</p><div>&nbsp; (El Secreto)</div>';
  END IF;

  -- <p>La Duda</p><div>&nbsp; (El Secreto)</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>La Duda</p><div>&nbsp; (El Secreto)</div>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/El Secreto.',
      '3.3.3.3 - 4.3.3.1 - Timp.+1 - Hp - Key - Str',
      'https://drive.google.com/open?id=1IczuwdCoDIbLxNC_uwS3bbEICrYoPC5p'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_El_Secreto_, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1SziWHUY1WM5ils7aDWJF0rLS7yTxfZhW/view?usp=drivesdk","description":"Arpa - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/10pF2sjk5B9F65lGXYvZQIJ8FXZuDo27Y/view?usp=drivesdk","description":"Clarinete Bajo - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1Jg_a3O3zx3_BB3LI_dZx_XExqzUmDnrh/view?usp=drivesdk","description":"Clarinete Bb 1 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1e8q2KcD0Gz4CmMiHouZGpS5Ne3AHe3dT/view?usp=drivesdk","description":"Clarinete Bb 2 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1zrKXztMGqGXR_CRAAR3r6WwdE3MvPnMQ/view?usp=drivesdk","description":"Contrabajo - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1XuYxY12I98RshAg3xkKdT4IIN0IiiujU/view?usp=drivesdk","description":"Contrafagot - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1quBZ2Xs4E1zhEIThDKhCeqft5T6191wB/view?usp=drivesdk","description":"Corno F 1 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/14buxd7djQJ5zpL6ypGaIRk5fK9ow1tl1/view?usp=drivesdk","description":"Corno F 2 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1mt_K6LFK7RzFu0LmUVZBP9Ez7jxL_y-H/view?usp=drivesdk","description":"Corno F 3 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1mRF3bCO0fSyAccWlPo_-FCVor-TwIu9Z/view?usp=drivesdk","description":"Corno F 4 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1ALf-LNFpGu8UI4mMn9aJhJNsBY0kYpMv/view?usp=drivesdk","description":"Fagot 1 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1OC03f28DTDWAoWjhWgrEO7TXvvmDloX3/view?usp=drivesdk","description":"Fagot 2 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1SRCOnnjHx9h5v8W88P8YjVSmxa4LEW4F/view?usp=drivesdk","description":"Fl Piccolo - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1mfHsdU4Y6vGx4xIeBAjKzApM5bLOiYKH/view?usp=drivesdk","description":"Flauta 1 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1dy7xzKJXqPCWZluW_joh6lcRDUgnLK_y/view?usp=drivesdk","description":"Flauta 2 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1hPReOJondeYBg5NB2BjuH7_X9Q4DCeSw/view?usp=drivesdk","description":"Ob EH - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1mVib2F-B4Wnjp9SEHJ3WR0YJD65PYcH_/view?usp=drivesdk","description":"Oboe 1 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1R8c5VZiHP9TyJnLNVEsst6VKQXsW7TYH/view?usp=drivesdk","description":"Oboe 2 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1BsII-3pcyOwNb9sOZpAgQO6SNnxilbRV/view?usp=drivesdk","description":"Perc Percusión - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1RI-dksyTrg2IzuCYXAI8u7u1DXFbZoqd/view?usp=drivesdk","description":"Perc Timbal - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1rE5XiTYAcfbuAhUFdty7qISXKEE0hRh5/view?usp=drivesdk","description":"Piano - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1hcz67Ytybc_uMW4OMwpM4l3DCZYH92e-/view?usp=drivesdk","description":"SCORE - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1HXFKzjob25mTXkjluwHrjDet908OUq7m/view?usp=drivesdk","description":"Trombón 1 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1BqqY9YomrXJhn0tRXxi2Dv86BlcBi9Wo/view?usp=drivesdk","description":"Trombón 2 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1bo4e13btav5HVjfMBmkvMHGu4Ukge9Y2/view?usp=drivesdk","description":"Trombón Bajo - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1OI-vd7ilC_AI2es70ooGBB1pBEGMkbdJ/view?usp=drivesdk","description":"Trompeta - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1Dfhbpqy7jYURIpX_th7Bjrjv9OpVZFbI/view?usp=drivesdk","description":"Trompeta 1 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1P9uoPQH10Bsn2UJdM7-DLvjDHYBgt6Ls/view?usp=drivesdk","description":"Trompeta 2 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1R4AtOawn5zP2bZKq5k9X4ECo1cn-BBCe/view?usp=drivesdk","description":"Tuba - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1c_LJVHy8a_qs17KiudCWZMHyxzfbHUj5/view?usp=drivesdk","description":"Viola - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1TdS1qk6-v9KEsvY91rLqkUtW501qiWc0/view?usp=drivesdk","description":"Violín 1 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1zdXXyTBC1pkdhTJkoSAkmdhTVnY48LYg/view?usp=drivesdk","description":"Violín 2 - La Duda - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ZTQtAwF0ZGPOZBlLz8gjTwOt39zaC-Cn/view?usp=drivesdk","description":"Violoncello - La Duda - El Secreto.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>La Duda</p><div>&nbsp; (El Secreto)</div>';
  END IF;

  -- <p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
      AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo/El Secreto.',
      '3.3.3.3 - 4.3.3.1 - Timp.+1 - Hp - Key - Str',
      'https://drive.google.com/open?id=1-gbxy0h3oijlbQk1DQZhswv_ken089zN'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_El_Secreto_, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1zxHMlaB3YpX2p58gjuyXjuFTexJs7R_p/view?usp=drivesdk","description":"Arpa - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1u65aCUCAMa_D4rDmz7aP0seDXI8WNuWN/view?usp=drivesdk","description":"Clarinete Bajo - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1O350edYeeY_60eNwB0VSqGL9blEJB5zF/view?usp=drivesdk","description":"Clarinete Bb 1 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1t7W7SDqq6o8IVEPydd_mABSC-y-M785N/view?usp=drivesdk","description":"Clarinete Bb 2 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1DLHkfqNBU9YfwRJbvuqSRosXD-u7fxqJ/view?usp=drivesdk","description":"Contrabajo - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1GVUMYS1gUXmaYytRtC_hB_XBNQXWIibE/view?usp=drivesdk","description":"Contrafagot - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1xBBXdlHI9iNYEg3p8QfYiyjkHV04Qp1H/view?usp=drivesdk","description":"Corno F 1 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1qfKfjca7d9fZoX95eF0cNO5BOTLz-nbY/view?usp=drivesdk","description":"Corno F 2 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1pBYFws4TFQeLpEIjY5RO8iai6yicEIUw/view?usp=drivesdk","description":"Corno F 3 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1fwZ9WKmjU80XyMMcZXXXCNSIBiVvGX4l/view?usp=drivesdk","description":"Corno F 4 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1NCErvLKITxl2bo90R7TMmAl08hbpZBXm/view?usp=drivesdk","description":"Fagot 1 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1KDCM5yqkO7uTMhUpDBNVI694LfXgMVXI/view?usp=drivesdk","description":"Fagot 2 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/13s1KIqUHmmkVrF8NaMqJZTQ1Qp8lgNe_/view?usp=drivesdk","description":"Flauta - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1ouKN9PfjmBRNHud9taI7xIGtBwA-kLrk/view?usp=drivesdk","description":"Flauta 1 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1o_JpOzCqDrNeGnbYvA1MIS4wsrj8Mu7D/view?usp=drivesdk","description":"Flauta 2 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1_RIURGETVGG3NQuGTw588b38VCKUwWA2/view?usp=drivesdk","description":"Ob EH - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1CxpFlk2aEkA8BwDwEZdBTOHNFYZuX_G8/view?usp=drivesdk","description":"Oboe 1 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1NX6s4dRGR-3NuYn8-terJ2t_mTO4Yj1j/view?usp=drivesdk","description":"Oboe 2 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1lWiTX_GIMQd-jjfQm4C8MqVg5N-LmZcb/view?usp=drivesdk","description":"Perc Platillo - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1HeGl-kmIUAqNa8_lRd4zmTvac5infpGU/view?usp=drivesdk","description":"Perc Timbal - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1Sky4aIMsE7g43fV9K-mVgqmbtJDPI_Wz/view?usp=drivesdk","description":"Piano - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1O2Izk9qkPVS65Tlhv7EZsq4AwHbteh8R/view?usp=drivesdk","description":"SCORE - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1WUEkMqOK38yNcLF3SZyP2GfiMfjqVtro/view?usp=drivesdk","description":"Trombón 1 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/191lF4EsV4VM6l9CSyL5LNEviIbOZcwUw/view?usp=drivesdk","description":"Trombón 2 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1sKm5bLeKtQ0jxhLjhnPrrIXPbyahMHNP/view?usp=drivesdk","description":"Trombón Bajo - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1hocMxCNvq16qfQZCsvBEh5S_9YHVdVh4/view?usp=drivesdk","description":"Trompeta - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1RyBbiQuTSFkFQVdRaBLehcRgYJiU0eJG/view?usp=drivesdk","description":"Trompeta 1 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1bO6IT74u5GYkLLNKWFioS9RPhC7Wwcsg/view?usp=drivesdk","description":"Trompeta 2 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1GmyrVLx7jkkPfDMO21oFLQARcCFb_7hE/view?usp=drivesdk","description":"Tuba - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/18q1DsYOpmWAqL6V7qVJsW4EJb1fNhfgj/view?usp=drivesdk","description":"Viola - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ehzhmqW8U0XyjEWAb3s2Hs3V1Cs2uZ01/view?usp=drivesdk","description":"Violín 1 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1uVUMKKcGsI5ztfKupI8hxgo52A55oPX7/view?usp=drivesdk","description":"Violín 2 - Retiro Obelisco - El Secreto.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/101z7H1VugIiSKC6KStBexo-A90Ko032T/view?usp=drivesdk","description":"Violoncello - Retiro Obelisco - El Secreto.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>';
  END IF;

  -- <p>Vientos de Agua</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Vientos de Agua</p>'
      AND o.observaciones = 'Para acomodar — Archivo viejo.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Vientos de Agua</p>',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Archivo viejo.',
      '3.3.2.2 - 1.1.3.1 - Timp.+2 - Hp - Key - Str + Bandoneón, Guitarra',
      'https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Vientos_de_Agua_, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '22b', 'Bandoneón', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Ob EH', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Vientos de Agua</p>';
  END IF;

END $$;
