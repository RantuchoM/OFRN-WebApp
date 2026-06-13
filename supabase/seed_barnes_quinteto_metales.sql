-- Barnes (Walter): 14 obras quinteto metales
-- Origen: https://drive.google.com/open?id=1_le2MfO2mDb_vcjuwaDkv-AN3Tb53Cma
-- Generado: 2026-06-12

DO $$
DECLARE
  _id_barnes bigint;
  _id_obra bigint;
  _id_comp_Bach_Johann_Sebastian bigint;
  _id_comp_Bizet_Georges bigint;
  _id_comp_Clarke_Jeremiah bigint;
  _id_comp_Handel_George_Frideric bigint;
  _id_comp_Haydn_Franz_Joseph bigint;
  _id_comp_Mouret_Jean_Joseph bigint;
  _id_comp_Nicolai_Otto bigint;
  _id_comp_Pachelbel_Johann bigint;
  _id_comp_Purcell_Henry bigint;
  _id_comp_Tradicional_ bigint;
BEGIN
  SELECT id INTO _id_barnes FROM compositores WHERE apellido = 'Barnes' AND nombre = 'Walter' LIMIT 1;
  IF _id_barnes IS NULL THEN
    RAISE EXCEPTION 'Arreglador Walter Barnes no encontrado en compositores';
  END IF;

  SELECT id INTO _id_comp_Bach_Johann_Sebastian FROM compositores WHERE apellido = 'Bach' AND (nombre = 'Johann Sebastian' OR (nombre IS NULL AND 'Johann Sebastian' IS NULL)) LIMIT 1;
  IF _id_comp_Bach_Johann_Sebastian IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Bach', 'Johann Sebastian') RETURNING id INTO _id_comp_Bach_Johann_Sebastian;
  END IF;

  SELECT id INTO _id_comp_Bizet_Georges FROM compositores WHERE apellido = 'Bizet' AND (nombre = 'Georges' OR (nombre IS NULL AND 'Georges' IS NULL)) LIMIT 1;
  IF _id_comp_Bizet_Georges IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Bizet', 'Georges') RETURNING id INTO _id_comp_Bizet_Georges;
  END IF;

  SELECT id INTO _id_comp_Clarke_Jeremiah FROM compositores WHERE apellido = 'Clarke' AND (nombre = 'Jeremiah' OR (nombre IS NULL AND 'Jeremiah' IS NULL)) LIMIT 1;
  IF _id_comp_Clarke_Jeremiah IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Clarke', 'Jeremiah') RETURNING id INTO _id_comp_Clarke_Jeremiah;
  END IF;

  SELECT id INTO _id_comp_Handel_George_Frideric FROM compositores WHERE apellido = 'Handel' AND (nombre = 'George Frideric' OR (nombre IS NULL AND 'George Frideric' IS NULL)) LIMIT 1;
  IF _id_comp_Handel_George_Frideric IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Handel', 'George Frideric') RETURNING id INTO _id_comp_Handel_George_Frideric;
  END IF;

  SELECT id INTO _id_comp_Haydn_Franz_Joseph FROM compositores WHERE apellido = 'Haydn' AND (nombre = 'Franz Joseph' OR (nombre IS NULL AND 'Franz Joseph' IS NULL)) LIMIT 1;
  IF _id_comp_Haydn_Franz_Joseph IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Haydn', 'Franz Joseph') RETURNING id INTO _id_comp_Haydn_Franz_Joseph;
  END IF;

  SELECT id INTO _id_comp_Mouret_Jean_Joseph FROM compositores WHERE apellido = 'Mouret' AND (nombre = 'Jean Joseph' OR (nombre IS NULL AND 'Jean Joseph' IS NULL)) LIMIT 1;
  IF _id_comp_Mouret_Jean_Joseph IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Mouret', 'Jean Joseph') RETURNING id INTO _id_comp_Mouret_Jean_Joseph;
  END IF;

  SELECT id INTO _id_comp_Nicolai_Otto FROM compositores WHERE apellido = 'Nicolai' AND (nombre = 'Otto' OR (nombre IS NULL AND 'Otto' IS NULL)) LIMIT 1;
  IF _id_comp_Nicolai_Otto IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Nicolai', 'Otto') RETURNING id INTO _id_comp_Nicolai_Otto;
  END IF;

  SELECT id INTO _id_comp_Pachelbel_Johann FROM compositores WHERE apellido = 'Pachelbel' AND (nombre = 'Johann' OR (nombre IS NULL AND 'Johann' IS NULL)) LIMIT 1;
  IF _id_comp_Pachelbel_Johann IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Pachelbel', 'Johann') RETURNING id INTO _id_comp_Pachelbel_Johann;
  END IF;

  SELECT id INTO _id_comp_Purcell_Henry FROM compositores WHERE apellido = 'Purcell' AND (nombre = 'Henry' OR (nombre IS NULL AND 'Henry' IS NULL)) LIMIT 1;
  IF _id_comp_Purcell_Henry IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Purcell', 'Henry') RETURNING id INTO _id_comp_Purcell_Henry;
  END IF;

  SELECT id INTO _id_comp_Tradicional_ FROM compositores WHERE apellido = 'Tradicional' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Tradicional_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Tradicional', NULL) RETURNING id INTO _id_comp_Tradicional_;
  END IF;

  -- Contrapunctus I [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Contrapunctus I [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Contrapunctus I [Quinteto metales]',
      _id_barnes,
      1745,
      207,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1ktqBCsyAWrTsQH9ZLpF2SoyfD39FeWDF'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bach_Johann_Sebastian, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1P7VZn8Nxc8GkjF2a0Gf5gy-D1fsz1xbS/view?usp=drivesdk","description":"Corno 1 - Contrapunctus I - Bach-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1QRE5pFfJmUPb80p9g_Ojc7hdd8NezxXX/view?usp=drivesdk","description":"Trombón - Contrapunctus I - Bach-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1W8mf9o5rg_HNau8QLtleHW0gFQX3BVWv/view?usp=drivesdk","description":"Trompeta 1 - Contrapunctus I - Bach-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1jzHTj6fPCNS0OSkQZTGAQyqe8YtFfFKQ/view?usp=drivesdk","description":"Trompeta 2 - Contrapunctus I - Bach-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1a3MSbhKHRmMOkl82HRwiecsokxrrE4S8/view?usp=drivesdk","description":"Tuba - Contrapunctus I - Bach-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Contrapunctus I [Quinteto metales]';
  END IF;

  -- My Heart Ever Faithful [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'My Heart Ever Faithful [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'My Heart Ever Faithful [Quinteto metales]',
      _id_barnes,
      1727,
      122,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1gBsF7Vc4OMDaOArsNC5AYXSrfenkyKNy'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bach_Johann_Sebastian, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1BZu_FxtkMgVD4Yr_BTchiLA9ADi6Mgm4/view?usp=drivesdk","description":"Corno 1 - My Heart Ever Faithful - Bach-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1zpf6d9fO-3dG0oHc1mN5Pr3h93dC6r-u/view?usp=drivesdk","description":"Trombón - My Heart Ever Faithful - Bach-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1TWmXTaExs_OyMmp6qyrj61gYO2OfPhtq/view?usp=drivesdk","description":"Trompeta 1 - My Heart Ever Faithful - Bach-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/17Vz9Uxs4YyzpkZkDBpAbHz3D0AdiZCwh/view?usp=drivesdk","description":"Trompeta 2 - My Heart Ever Faithful - Bach-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1fsYg6ScHCoHooMV8BC6oy1zssVfM8nR-/view?usp=drivesdk","description":"Tuba - My Heart Ever Faithful - Bach-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): My Heart Ever Faithful [Quinteto metales]';
  END IF;

  -- Toreador Song [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Toreador Song [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Toreador Song [Quinteto metales]',
      _id_barnes,
      1875,
      130,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1jrHlep2FT-gE6miuAuFgr7vqpnUUgeEZ'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bizet_Georges, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1aKDG5brMfAYZyK8_RhiEeKAXKZxfG4TH/view?usp=drivesdk","description":"Corno 1 - Toreador Song - Bizet-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1W0Hup10LzJiYikG8w9eHf6UVEUOzaD79/view?usp=drivesdk","description":"Trombón - Toreador Song - Bizet-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1hZ0U5LFH6FWQEa_DW2SRskTjGxce7nTz/view?usp=drivesdk","description":"Trompeta 1 - Toreador Song - Bizet-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1oH1SZnH-1_IczBOTzTMIIk0fun_cJBEk/view?usp=drivesdk","description":"Trompeta 2 - Toreador Song - Bizet-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1JEUjMY8xoFM8caDAXrkepmXGRAw7_UqS/view?usp=drivesdk","description":"Tuba - Toreador Song - Bizet-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Toreador Song [Quinteto metales]';
  END IF;

  -- Trumpet Voluntary [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Trumpet Voluntary [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Trumpet Voluntary [Quinteto metales]',
      _id_barnes,
      1700,
      182,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1JtMnhpIxnBRBUyWkZdmhgpOcXUKHDZp3'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Clarke_Jeremiah, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1WctJKHLzhmsj-9dIUGSiOa_ru4D69U9k/view?usp=drivesdk","description":"Corno 1 - Trumpet Voluntary - Clarke-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1EkObd8PKyct_GZW_RGZjjxiaZwsCD755/view?usp=drivesdk","description":"Trombón - Trumpet Voluntary - Clarke-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1w2E3BZAnSoI9nkz8q7MB1MmaRkf4fizb/view?usp=drivesdk","description":"Trompeta 1 - Trumpet Voluntary - Clarke-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1eMEoDQLdB-3TPEG2LvhlOm4WlaMw9C8p/view?usp=drivesdk","description":"Trompeta 2 - Trumpet Voluntary - Clarke-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1w0RJGEv_e0z4663mV599x7jkq0XmUbtA/view?usp=drivesdk","description":"Tuba - Trumpet Voluntary - Clarke-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Trumpet Voluntary [Quinteto metales]';
  END IF;

  -- Largo [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Largo [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Largo [Quinteto metales]',
      _id_barnes,
      1738,
      165,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1_rOGQ9OOHtl_iFcnpyFlE7K72Y9iMY5j'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Handel_George_Frideric, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1Je5qkMiwW5m25uZMSTWas2u20_S3hJmf/view?usp=drivesdk","description":"Corno 1 - Largo - Handel-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1Xkm-wqzX9kzMqF8CJC0QrEhg6GDuOWUC/view?usp=drivesdk","description":"Trombón - Largo - Handel-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1N2-XaPateNhFXDD5iAmlCsttKMkz8Uqu/view?usp=drivesdk","description":"Trompeta 1 - Largo - Handel-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1wzUkB08Am2f__K7pW8AJtDJ5Zo4ul0og/view?usp=drivesdk","description":"Trompeta 2 - Largo - Handel-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1sG4seq5TJua7JtFNJyJOR7qXZ9N5QNve/view?usp=drivesdk","description":"Tuba - Largo - Handel-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Largo [Quinteto metales]';
  END IF;

  -- Andante [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Andante [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Andante [Quinteto metales]',
      _id_barnes,
      1791,
      159,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/14dkNdKUiwRpQmolmOuTE4OPhygKXTQjS'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Haydn_Franz_Joseph, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1c8LjS3qvQ98tcnwkhz8ZjHg-1TZeC7P8/view?usp=drivesdk","description":"Corno 1 - Andante - Haydn-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1cAJwsnc28dqd2oSkKmCYKQ2YmYf_2wes/view?usp=drivesdk","description":"Trombón - Andante - Haydn-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1-110XxlQEMwGx-42a4psA9hA1l1xPdsl/view?usp=drivesdk","description":"Trompeta 1 - Andante - Haydn-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1a_qRfw5FVPbI-Lky3mnz2yWo_rIflMYm/view?usp=drivesdk","description":"Trompeta 2 - Andante - Haydn-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1kfN1u4OM9Aj0CLNRj8OeS7uowM1ou_3Q/view?usp=drivesdk","description":"Tuba - Andante - Haydn-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Andante [Quinteto metales]';
  END IF;

  -- Rondeau [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Rondeau [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Rondeau [Quinteto metales]',
      _id_barnes,
      1729,
      116,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/16OR1tAUSnvWWSSfN7xgea-vXChYxK5Fa'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Mouret_Jean_Joseph, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1dD6D075MKxSGId8vwmHdyL4S7Dg771W_/view?usp=drivesdk","description":"Corno 1 - Rondeau - Mouret-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1GItX7zqajvV64t29MPkMWE7Z9XGOUvV0/view?usp=drivesdk","description":"Trombón - Rondeau - Mouret-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1w13xSd_49J5YUDkoqCDThhLJW63woXFs/view?usp=drivesdk","description":"Trompeta 1 - Rondeau - Mouret-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1JObui1l7QZoI1Udb0qY_bNDOT_BH8kcm/view?usp=drivesdk","description":"Trompeta 2 - Rondeau - Mouret-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1yUr_L3QhBE-lfzjszbhwsTtvgpKGDLHo/view?usp=drivesdk","description":"Tuba - Rondeau - Mouret-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Rondeau [Quinteto metales]';
  END IF;

  -- Cor Royal [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Cor Royal [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Cor Royal [Quinteto metales]',
      _id_barnes,
      1849,
      197,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1ZNAz_q3X0STxin43j2ibdXEd4bx8O344'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Nicolai_Otto, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1_TICz0XXgSKUzxAbJ8FV6tKhdVQSDFmV/view?usp=drivesdk","description":"Corno 1 - Cor Royal - Nicolai-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1OsrHHraqVMlaYH2HQjjCw7ml1uoFdioo/view?usp=drivesdk","description":"Trombón - Cor Royal - Nicolai-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1PtfMzFKga-vCFIb7zdD3LHQUzgW-wfoZ/view?usp=drivesdk","description":"Trompeta 1 - Cor Royal - Nicolai-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1eFwtMXyL4ougVHmQrecN0OSjPsNflGJT/view?usp=drivesdk","description":"Trompeta 2 - Cor Royal - Nicolai-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1rnwybL1ofvTDv_BwJGulFoPJTujVPs8D/view?usp=drivesdk","description":"Tuba - Cor Royal - Nicolai-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Cor Royal [Quinteto metales]';
  END IF;

  -- Canon [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Canon [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Canon [Quinteto metales]',
      _id_barnes,
      1680,
      295,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1ap0BpkITyCqjrkz7SXelddtH_wyz-Biy'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Pachelbel_Johann, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1Lgn9NwdV2pP7Ls-lnAyg-1mrrUz4Q9-m/view?usp=drivesdk","description":"Corno 1 - Canon - Pachelbel-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1o2zJ3bHt8tOzCvazzWTOVLhl4h95FfcB/view?usp=drivesdk","description":"Trombón - Canon - Pachelbel-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1HfoXHN1y1uZh-zuk5g9_YL0iVnBznJMk/view?usp=drivesdk","description":"Trompeta 1 - Canon - Pachelbel-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1GwvJ5Yb43HuE0JUs7UQoox9Qe9vv1Bvf/view?usp=drivesdk","description":"Trompeta 2 - Canon - Pachelbel-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1MXDSMkT-bkduRv-cYVCKX-ybIuNQLYG3/view?usp=drivesdk","description":"Tuba - Canon - Pachelbel-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Canon [Quinteto metales]';
  END IF;

  -- Trumpet Tune and Ayre [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Trumpet Tune and Ayre [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Trumpet Tune and Ayre [Quinteto metales]',
      _id_barnes,
      1690,
      87,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1tx4p-H4DoOe_BrmgXlUlAQoAgLDrluUa'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Purcell_Henry, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1uF7Kkmc3OSHluqLsAiGwG_HCkBStgp-R/view?usp=drivesdk","description":"Corno 1 - Trumpet Tune and Ayre - Purcell-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1CzLMq1wDkbd3as4aRza4BHD9O7IRtQdi/view?usp=drivesdk","description":"Trombón - Trumpet Tune and Ayre - Purcell-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1E42-9jqspfmL8ow2mmCRPjWfL0E6C665/view?usp=drivesdk","description":"Trompeta 1 - Trumpet Tune and Ayre - Purcell-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1TjcbF8Sl57QK3hB-iMHgM-7OC5aFmFpN/view?usp=drivesdk","description":"Trompeta 2 - Trumpet Tune and Ayre - Purcell-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1qF_aHqe1yjaeWEySRkjD4hEeA4Tf3QfA/view?usp=drivesdk","description":"Tuba - Trumpet Tune and Ayre - Purcell-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Trumpet Tune and Ayre [Quinteto metales]';
  END IF;

  -- Amazing Grace [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Amazing Grace [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Amazing Grace [Quinteto metales]',
      _id_barnes,
      NULL,
      252,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1wekl2EMOxMx_JozdXn8wzuVnbkgjwBW0'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Tradicional_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1osUAU7EThQEd1ZTMsN-OjhxxvksJb9Ky/view?usp=drivesdk","description":"Corno 1 - Amazing Grace - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/136SGj3PEfcwfjgLeW0tzK1TUUqUiTqNf/view?usp=drivesdk","description":"Trombón - Amazing Grace - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1_AnwRScAOBNxGFN_TXINlt7e7GbckAac/view?usp=drivesdk","description":"Trompeta 1 - Amazing Grace - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/13qXojv3Asu6Vcil7k6N2DrMcVRww-zzs/view?usp=drivesdk","description":"Trompeta 2 - Amazing Grace - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1-LNwsccGsqM9vwWQh2bk3bKoNXns_Hne/view?usp=drivesdk","description":"Tuba - Amazing Grace - Tradicional-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Amazing Grace [Quinteto metales]';
  END IF;

  -- Hava Nagila [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Hava Nagila [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Hava Nagila [Quinteto metales]',
      _id_barnes,
      NULL,
      146,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1_kN-S8ZY4rIxHtWMJv8d71yJn9JrUXfu'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Tradicional_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1CPF8FfLnSZnuagfop6xwkLgUQPf2KzhW/view?usp=drivesdk","description":"Corno 1 - Hava Nagila - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1oyjeaxkfE3-ZfqtcWQBYXaMt6-huC_-l/view?usp=drivesdk","description":"Trombón - Hava Nagila - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1kWnOhKMDTl9lbGNn1rvGBSK-sqLmq4P5/view?usp=drivesdk","description":"Trompeta 1 - Hava Nagila - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1QtV4Tn5uq6a6z00F4sDRZzrJKyXLI-6O/view?usp=drivesdk","description":"Trompeta 2 - Hava Nagila - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1CRF_F21M4AjxkO-UHDEUMCwgbK6E5T2O/view?usp=drivesdk","description":"Tuba - Hava Nagila - Tradicional-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Hava Nagila [Quinteto metales]';
  END IF;

  -- Just a Closer Walk [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Just a Closer Walk [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Just a Closer Walk [Quinteto metales]',
      _id_barnes,
      NULL,
      250,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1b5o1VQ2wzKhG9LdOQpxcmUYpzriImdfR'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Tradicional_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1MkGYnKwwTGHquuAZO-9eL-lj4EUYRv-K/view?usp=drivesdk","description":"Corno 1 - Just a Closer Walk - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/15pnrEX87flUWMGrdFqcxPR6gGle3RyXa/view?usp=drivesdk","description":"Trombón - Just a Closer Walk - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1BBkywZF0htuNPQHBMmEn2cmh8Y8YuTIQ/view?usp=drivesdk","description":"Trompeta 1 - Just a Closer Walk - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1q3YfnXjO9c8lC29pQ4hGDwmk8ClbBAgV/view?usp=drivesdk","description":"Trompeta 2 - Just a Closer Walk - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1r0VzTbPY1k3MA1LJcp8okXVjJ9cuhojE/view?usp=drivesdk","description":"Tuba - Just a Closer Walk - Tradicional-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Just a Closer Walk [Quinteto metales]';
  END IF;

  -- Sakura & Kimigayo [Quinteto metales]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Sakura & Kimigayo [Quinteto metales]' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Sakura & Kimigayo [Quinteto metales]',
      _id_barnes,
      NULL,
      165,
      'Oficial',
      'Quinteto metales — arr. Walter Barnes',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1A4QBvayhNsnxaqs0mehH7oyo98PeecAC'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Tradicional_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1zh-M8M36y55FR5wGw2QUul7tRvnRtKkr/view?usp=drivesdk","description":"Corno 1 - Sakura & Kimigayo - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1GF4i1JM5tEYw73VJqVUrJQYKEJxqvcua/view?usp=drivesdk","description":"Trombón - Sakura & Kimigayo - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1HO3Fb19Z0kL3eNt0TPzid5eqANr0g4XA/view?usp=drivesdk","description":"Trompeta 1 - Sakura & Kimigayo - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1QKxi0KINjc9fWEH4tsSQvuoQS73U63Cd/view?usp=drivesdk","description":"Trompeta 2 - Sakura & Kimigayo - Tradicional-Barnes.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1w6Nky7CgkTbizTts7xhxIiSXwC4358J4/view?usp=drivesdk","description":"Tuba - Sakura & Kimigayo - Tradicional-Barnes.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Sakura & Kimigayo [Quinteto metales]';
  END IF;

END $$;
