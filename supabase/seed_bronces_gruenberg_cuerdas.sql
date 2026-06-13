-- Bronces (varios arregladores) + Gruenberg cuarteto cuerdas (23 obras)
-- Generado: 2026-06-12

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Bach_Johann_Sebastian bigint;
  _id_comp_Beethoven_Ludwig_van bigint;
  _id_comp_Clarke_Jeremiah bigint;
  _id_comp_Elgar_Edward bigint;
  _id_comp_Pachelbel_Johann bigint;
  _id_comp_Verdi_Giuseppe bigint;
  _id_comp_Vivaldi_Antonio bigint;
  _id_comp_Wagner_Richard bigint;
  _id_comp_Chopin_Fr_d_ric bigint;
  _id_comp_Gluck_Christoph_Willibald bigint;
  _id_comp_Godard_Benjamin bigint;
  _id_comp_Kassmayer_ bigint;
  _id_comp_Leclair_Jean_Marie bigint;
  _id_comp_Mozart_Wolfgang_Amadeus bigint;
  _id_comp_Paderewski_Ignacy bigint;
  _id_comp_Raff_Joachim bigint;
  _id_comp_Schubert_Franz bigint;
  _id_arr_Gale_Jack bigint;
  _id_arr_Rossi_ bigint;
  _id_arr_Thomas_David_R_ bigint;
  _id_arr_Holcombe_William bigint;
  _id_arr_Dorsey_ bigint;
  _id_arr_Gruenberg_Eugene bigint;
BEGIN
  SELECT id INTO _id_comp_Bach_Johann_Sebastian FROM compositores WHERE apellido = 'Bach' AND (nombre = 'Johann Sebastian' OR (nombre IS NULL AND 'Johann Sebastian' IS NULL)) LIMIT 1;
  IF _id_comp_Bach_Johann_Sebastian IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Bach', 'Johann Sebastian') RETURNING id INTO _id_comp_Bach_Johann_Sebastian;
  END IF;

  SELECT id INTO _id_comp_Beethoven_Ludwig_van FROM compositores WHERE apellido = 'Beethoven' AND (nombre = 'Ludwig van' OR (nombre IS NULL AND 'Ludwig van' IS NULL)) LIMIT 1;
  IF _id_comp_Beethoven_Ludwig_van IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Beethoven', 'Ludwig van') RETURNING id INTO _id_comp_Beethoven_Ludwig_van;
  END IF;

  SELECT id INTO _id_comp_Clarke_Jeremiah FROM compositores WHERE apellido = 'Clarke' AND (nombre = 'Jeremiah' OR (nombre IS NULL AND 'Jeremiah' IS NULL)) LIMIT 1;
  IF _id_comp_Clarke_Jeremiah IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Clarke', 'Jeremiah') RETURNING id INTO _id_comp_Clarke_Jeremiah;
  END IF;

  SELECT id INTO _id_comp_Elgar_Edward FROM compositores WHERE apellido = 'Elgar' AND (nombre = 'Edward' OR (nombre IS NULL AND 'Edward' IS NULL)) LIMIT 1;
  IF _id_comp_Elgar_Edward IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Elgar', 'Edward') RETURNING id INTO _id_comp_Elgar_Edward;
  END IF;

  SELECT id INTO _id_comp_Pachelbel_Johann FROM compositores WHERE apellido = 'Pachelbel' AND (nombre = 'Johann' OR (nombre IS NULL AND 'Johann' IS NULL)) LIMIT 1;
  IF _id_comp_Pachelbel_Johann IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Pachelbel', 'Johann') RETURNING id INTO _id_comp_Pachelbel_Johann;
  END IF;

  SELECT id INTO _id_comp_Verdi_Giuseppe FROM compositores WHERE apellido = 'Verdi' AND (nombre = 'Giuseppe' OR (nombre IS NULL AND 'Giuseppe' IS NULL)) LIMIT 1;
  IF _id_comp_Verdi_Giuseppe IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Verdi', 'Giuseppe') RETURNING id INTO _id_comp_Verdi_Giuseppe;
  END IF;

  SELECT id INTO _id_comp_Vivaldi_Antonio FROM compositores WHERE apellido = 'Vivaldi' AND (nombre = 'Antonio' OR (nombre IS NULL AND 'Antonio' IS NULL)) LIMIT 1;
  IF _id_comp_Vivaldi_Antonio IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Vivaldi', 'Antonio') RETURNING id INTO _id_comp_Vivaldi_Antonio;
  END IF;

  SELECT id INTO _id_comp_Wagner_Richard FROM compositores WHERE apellido = 'Wagner' AND (nombre = 'Richard' OR (nombre IS NULL AND 'Richard' IS NULL)) LIMIT 1;
  IF _id_comp_Wagner_Richard IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Wagner', 'Richard') RETURNING id INTO _id_comp_Wagner_Richard;
  END IF;

  SELECT id INTO _id_comp_Chopin_Fr_d_ric FROM compositores WHERE apellido = 'Chopin' AND (nombre = 'Frédéric' OR (nombre IS NULL AND 'Frédéric' IS NULL)) LIMIT 1;
  IF _id_comp_Chopin_Fr_d_ric IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Chopin', 'Frédéric') RETURNING id INTO _id_comp_Chopin_Fr_d_ric;
  END IF;

  SELECT id INTO _id_comp_Gluck_Christoph_Willibald FROM compositores WHERE apellido = 'Gluck' AND (nombre = 'Christoph Willibald' OR (nombre IS NULL AND 'Christoph Willibald' IS NULL)) LIMIT 1;
  IF _id_comp_Gluck_Christoph_Willibald IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Gluck', 'Christoph Willibald') RETURNING id INTO _id_comp_Gluck_Christoph_Willibald;
  END IF;

  SELECT id INTO _id_comp_Godard_Benjamin FROM compositores WHERE apellido = 'Godard' AND (nombre = 'Benjamin' OR (nombre IS NULL AND 'Benjamin' IS NULL)) LIMIT 1;
  IF _id_comp_Godard_Benjamin IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Godard', 'Benjamin') RETURNING id INTO _id_comp_Godard_Benjamin;
  END IF;

  SELECT id INTO _id_comp_Kassmayer_ FROM compositores WHERE apellido = 'Kassmayer' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Kassmayer_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Kassmayer', NULL) RETURNING id INTO _id_comp_Kassmayer_;
  END IF;

  SELECT id INTO _id_comp_Leclair_Jean_Marie FROM compositores WHERE apellido = 'Leclair' AND (nombre = 'Jean-Marie' OR (nombre IS NULL AND 'Jean-Marie' IS NULL)) LIMIT 1;
  IF _id_comp_Leclair_Jean_Marie IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Leclair', 'Jean-Marie') RETURNING id INTO _id_comp_Leclair_Jean_Marie;
  END IF;

  SELECT id INTO _id_comp_Mozart_Wolfgang_Amadeus FROM compositores WHERE apellido = 'Mozart' AND (nombre = 'Wolfgang Amadeus' OR (nombre IS NULL AND 'Wolfgang Amadeus' IS NULL)) LIMIT 1;
  IF _id_comp_Mozart_Wolfgang_Amadeus IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Mozart', 'Wolfgang Amadeus') RETURNING id INTO _id_comp_Mozart_Wolfgang_Amadeus;
  END IF;

  SELECT id INTO _id_comp_Paderewski_Ignacy FROM compositores WHERE apellido = 'Paderewski' AND (nombre = 'Ignacy' OR (nombre IS NULL AND 'Ignacy' IS NULL)) LIMIT 1;
  IF _id_comp_Paderewski_Ignacy IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Paderewski', 'Ignacy') RETURNING id INTO _id_comp_Paderewski_Ignacy;
  END IF;

  SELECT id INTO _id_comp_Raff_Joachim FROM compositores WHERE apellido = 'Raff' AND (nombre = 'Joachim' OR (nombre IS NULL AND 'Joachim' IS NULL)) LIMIT 1;
  IF _id_comp_Raff_Joachim IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Raff', 'Joachim') RETURNING id INTO _id_comp_Raff_Joachim;
  END IF;

  SELECT id INTO _id_comp_Schubert_Franz FROM compositores WHERE apellido = 'Schubert' AND (nombre = 'Franz' OR (nombre IS NULL AND 'Franz' IS NULL)) LIMIT 1;
  IF _id_comp_Schubert_Franz IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Schubert', 'Franz') RETURNING id INTO _id_comp_Schubert_Franz;
  END IF;

  SELECT id INTO _id_arr_Gale_Jack FROM compositores WHERE apellido = 'Gale' AND (nombre = 'Jack' OR (nombre IS NULL AND 'Jack' IS NULL)) LIMIT 1;
  IF _id_arr_Gale_Jack IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Gale', 'Jack') RETURNING id INTO _id_arr_Gale_Jack;
  END IF;

  SELECT id INTO _id_arr_Rossi_ FROM compositores WHERE apellido = 'Rossi' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_arr_Rossi_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Rossi', NULL) RETURNING id INTO _id_arr_Rossi_;
  END IF;

  SELECT id INTO _id_arr_Thomas_David_R_ FROM compositores WHERE apellido = 'Thomas' AND (nombre = 'David R.' OR (nombre IS NULL AND 'David R.' IS NULL)) LIMIT 1;
  IF _id_arr_Thomas_David_R_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Thomas', 'David R.') RETURNING id INTO _id_arr_Thomas_David_R_;
  END IF;

  SELECT id INTO _id_arr_Holcombe_William FROM compositores WHERE apellido = 'Holcombe' AND (nombre = 'William' OR (nombre IS NULL AND 'William' IS NULL)) LIMIT 1;
  IF _id_arr_Holcombe_William IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Holcombe', 'William') RETURNING id INTO _id_arr_Holcombe_William;
  END IF;

  SELECT id INTO _id_arr_Dorsey_ FROM compositores WHERE apellido = 'Dorsey' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_arr_Dorsey_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Dorsey', NULL) RETURNING id INTO _id_arr_Dorsey_;
  END IF;

  SELECT id INTO _id_arr_Gruenberg_Eugene FROM compositores WHERE apellido = 'Gruenberg' AND (nombre = 'Eugene' OR (nombre IS NULL AND 'Eugene' IS NULL)) LIMIT 1;
  IF _id_arr_Gruenberg_Eugene IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Gruenberg', 'Eugene') RETURNING id INTO _id_arr_Gruenberg_Eugene;
  END IF;

  -- Air on the G String [Quinteto bronces]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Air on the G String [Quinteto bronces]' AND oc.id_compositor = _id_arr_Gale_Jack
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Air on the G String [Quinteto bronces]',
      _id_arr_Gale_Jack,
      1720,
      216,
      'Oficial',
      'Quinteto bronces — arr. Jack Gale',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1nLd1QS0ZAH3WAFMXe4lVqB0XSAQO8gg2'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bach_Johann_Sebastian, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gale_Jack, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gale_Jack
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/12mhMdtwiS8wRpCJ5gqi6GJ82p_mJKaJg/view?usp=drivesdk","description":"Corno 1 - Air on the G String - Bach-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/17oqGar7WqafG2EGqOQSaJRym7H6qGwGD/view?usp=drivesdk","description":"Trombón - Air on the G String - Bach-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1rewFCdS7-LkRHmAcsZR2yb8IcHXqeoh3/view?usp=drivesdk","description":"Trompeta 1 - Air on the G String - Bach-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1zj-nYzhtPzFkZokHy8DR6ddL-iIRXCnB/view?usp=drivesdk","description":"Trompeta 2 - Air on the G String - Bach-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1HJSNDNJxP6jUL3DXJYKVajt7O40Ccbeo/view?usp=drivesdk","description":"Tuba - Air on the G String - Bach-Gale.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Air on the G String [Quinteto bronces]';
  END IF;

  -- Sheep May Safely Graze [Quinteto bronces]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Sheep May Safely Graze [Quinteto bronces]' AND oc.id_compositor = _id_arr_Gale_Jack
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Sheep May Safely Graze [Quinteto bronces]',
      _id_arr_Gale_Jack,
      1713,
      294,
      'Oficial',
      'Quinteto bronces — arr. Jack Gale',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1YsCup45x6pwe1CWphkBr8rTDY48lTWLn'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bach_Johann_Sebastian, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gale_Jack, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gale_Jack
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1k1cPITgmfdKoLyA-hIiP2vDi59uRuntP/view?usp=drivesdk","description":"Corno 1 - Sheep May Safely Graze - Bach-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1O4-CeNLTBulkRoMS2HoPuUKXmKDzNVbn/view?usp=drivesdk","description":"Trombón - Sheep May Safely Graze - Bach-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1xFhcR1sdEzqsJ9EgtD5dF3VgMC1NVhMT/view?usp=drivesdk","description":"Trompeta 1 - Sheep May Safely Graze - Bach-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1KWI8hjnXLyd_HPl_wKkoqdi2CYO0XBxv/view?usp=drivesdk","description":"Trompeta 2 - Sheep May Safely Graze - Bach-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1NpyRBMqjAgyUSOotsMd83lABCbEomWog/view?usp=drivesdk","description":"Tuba - Sheep May Safely Graze - Bach-Gale.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Sheep May Safely Graze [Quinteto bronces]';
  END IF;

  -- Jesu Joy of Mans Desiring [Quinteto bronces]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Jesu Joy of Mans Desiring [Quinteto bronces]' AND oc.id_compositor = _id_arr_Rossi_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Jesu Joy of Mans Desiring [Quinteto bronces]',
      _id_arr_Rossi_,
      1723,
      217,
      'Oficial',
      'Quinteto bronces — arr. Rossi',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1vo2Za0l2POpYr4SsoDay6ZvtF90r9foY'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bach_Johann_Sebastian, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Rossi_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Rossi_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1jhEZcU8pW5_1sryLW_KAJga_UwTA6luP/view?usp=drivesdk","description":"Corno 1 - Jesu Joy of Mans Desiring - Bach-Rossi.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/13v4zYD3z745BR9LUY6R_RY1L79DDY-Xk/view?usp=drivesdk","description":"Trombón - Jesu Joy of Mans Desiring - Bach-Rossi.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1JrVoa9CKT33P7w6RgFyPSVi5X5Xr9K0Y/view?usp=drivesdk","description":"Trompeta 1 - Jesu Joy of Mans Desiring - Bach-Rossi.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1BtjxUvj9d6chyaqTrzkgGKAucR7I-AC8/view?usp=drivesdk","description":"Trompeta 2 - Jesu Joy of Mans Desiring - Bach-Rossi.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1vcBR3RJ-v84nOwEDvNq3sf5bg2rK7hWe/view?usp=drivesdk","description":"Tuba - Jesu Joy of Mans Desiring - Bach-Rossi.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Jesu Joy of Mans Desiring [Quinteto bronces]';
  END IF;

  -- Ode To Joy [Quinteto bronces]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Ode To Joy [Quinteto bronces]' AND oc.id_compositor = _id_arr_Thomas_David_R_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Ode To Joy [Quinteto bronces]',
      _id_arr_Thomas_David_R_,
      1824,
      146,
      'Oficial',
      'Quinteto bronces — arr. David R. Thomas',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1Inr_HQhG4ad6WkBsQT9FDLHC1l9KPSHp'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Beethoven_Ludwig_van, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Thomas_David_R_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Thomas_David_R_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1xQ6OAxM2Dda65KjZ05wkjgP-U-fmiT86/view?usp=drivesdk","description":"Corno 1 - Ode To Joy - Beethoven-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1qJBsW-1wbMS8TcMVH1Mu7WAvxePx2HWJ/view?usp=drivesdk","description":"Trombón - Ode To Joy - Beethoven-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1PVSBi2Ae3MHEyUDWiOjAzvKFcPCRG8i2/view?usp=drivesdk","description":"Trompeta 1 - Ode To Joy - Beethoven-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1TREmCWiBPIkxX8Lyvq6iFW3YaNuObQTX/view?usp=drivesdk","description":"Trompeta 2 - Ode To Joy - Beethoven-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/16OzzHq2W83PwfGx_UIugu8zekDsoTlsb/view?usp=drivesdk","description":"Tuba - Ode To Joy - Beethoven-Thomas.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Ode To Joy [Quinteto bronces]';
  END IF;

  -- Trumpet Voluntary [Quinteto bronces]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Trumpet Voluntary [Quinteto bronces]' AND oc.id_compositor = _id_arr_Thomas_David_R_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Trumpet Voluntary [Quinteto bronces]',
      _id_arr_Thomas_David_R_,
      1700,
      182,
      'Oficial',
      'Quinteto bronces — arr. David R. Thomas',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1TrbWyajC1DX66MP1xhb3-cvtUytt3kbp'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Clarke_Jeremiah, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Thomas_David_R_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Thomas_David_R_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1p1_axBHzbHyS6JNFLVLYSZSoD3dkBgED/view?usp=drivesdk","description":"Corno 1 - Trumpet Voluntary - Clarke-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1ADi9RRSY64uB-Cq5J_yYBiZDojnkBESf/view?usp=drivesdk","description":"Trombón - Trumpet Voluntary - Clarke-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1n4pZvT-9JWgiNSlBw-vR8Mr6BZytDVRz/view?usp=drivesdk","description":"Trompeta 1 - Trumpet Voluntary - Clarke-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1HfvfXeL03XlkEmgPG-08wDyKuC2mjX3Q/view?usp=drivesdk","description":"Trompeta 2 - Trumpet Voluntary - Clarke-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1qdZ5Rhbg7MGCaiah6k1qIGgiuQwN_naL/view?usp=drivesdk","description":"Tuba - Trumpet Voluntary - Clarke-Thomas.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Trumpet Voluntary [Quinteto bronces]';
  END IF;

  -- Pomp And Circumstance [Quinteto bronces]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Pomp And Circumstance [Quinteto bronces]' AND oc.id_compositor = _id_arr_Gale_Jack
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Pomp And Circumstance [Quinteto bronces]',
      _id_arr_Gale_Jack,
      1901,
      528,
      'Oficial',
      'Quinteto bronces — arr. Jack Gale',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1rTFxiToSJuJjSyw-mWhpcuePCl1R5zRr'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Elgar_Edward, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gale_Jack, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gale_Jack
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1XOprxPE9Oj6gsgWKr7Qh2uvHi2ephq19/view?usp=drivesdk","description":"Corno 1 - Pomp And Circumstance - Elgar-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1Yp9pGZNgGEPHyJ3IIVbX4wYbyNZQwRQQ/view?usp=drivesdk","description":"Trombón - Pomp And Circumstance - Elgar-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1PjUc0WIOoCk0rAo3_XnA32f9ba15qdfm/view?usp=drivesdk","description":"Trompeta 1 - Pomp And Circumstance - Elgar-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1eG83ei14Iv7i25KL5FD3rtqIY565GiSv/view?usp=drivesdk","description":"Trompeta 2 - Pomp And Circumstance - Elgar-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1jjsQ2wDk17YKrDcrC5ugexkSq-8Dizdw/view?usp=drivesdk","description":"Tuba - Pomp And Circumstance - Elgar-Gale.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Pomp And Circumstance [Quinteto bronces]';
  END IF;

  -- Kanon [Quinteto bronces]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Kanon [Quinteto bronces]' AND oc.id_compositor = _id_arr_Thomas_David_R_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Kanon [Quinteto bronces]',
      _id_arr_Thomas_David_R_,
      1680,
      295,
      'Oficial',
      'Quinteto bronces — arr. David R. Thomas',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1Sjep7mOqhDus4NzW41P14P7UD0carCCu'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Pachelbel_Johann, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Thomas_David_R_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Thomas_David_R_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1ACYR-kddcU_6Ix4COdhQTpZxg9-iBE8V/view?usp=drivesdk","description":"Corno 1 - Kanon - Pachelbel-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1EsztgcgO-ywDhE1olVr0gIaaDLfQImLh/view?usp=drivesdk","description":"Trombón - Kanon - Pachelbel-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1FNeTtvSSBx1OGJp9DGZMxX4L3HcD-txg/view?usp=drivesdk","description":"Trompeta 1 - Kanon - Pachelbel-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1i-uhw4hZ_NqKF934YAuvjhaO7Ocgb4XV/view?usp=drivesdk","description":"Trompeta 2 - Kanon - Pachelbel-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1A6CWUN5q3TSije6R-DCxZuJAFkEQe3K3/view?usp=drivesdk","description":"Tuba - Kanon - Pachelbel-Thomas.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Kanon [Quinteto bronces]';
  END IF;

  -- Triumphal March from Aida [Quinteto bronces]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Triumphal March from Aida [Quinteto bronces]' AND oc.id_compositor = _id_arr_Holcombe_William
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Triumphal March from Aida [Quinteto bronces]',
      _id_arr_Holcombe_William,
      1871,
      374,
      'Oficial',
      'Quinteto bronces — arr. William Holcombe',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/14qp9xyWaqy8t_JU2zl8LfHWV3oC9_tir'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Verdi_Giuseppe, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Holcombe_William, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Holcombe_William
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/14BBgUi6yAuthTAkEyye4_IO1-JDkH0RV/view?usp=drivesdk","description":"Corno 1 - Triumphal March from Aida - Verdi-Holcombe.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1mlXL6Shhrntp78WQg-T0g4VdbNQzQALc/view?usp=drivesdk","description":"Trombón - Triumphal March from Aida - Verdi-Holcombe.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1KJasodhZFsYdVZfO-gCnDr-EN8C_rBg5/view?usp=drivesdk","description":"Trompeta 1 - Triumphal March from Aida - Verdi-Holcombe.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1QIG6P7VesFGdbgr6_3wCNKd3Z5Ocq_hT/view?usp=drivesdk","description":"Trompeta 2 - Triumphal March from Aida - Verdi-Holcombe.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/12wf2CdOafnQeGmE8ejBkoIFouKPFvHpI/view?usp=drivesdk","description":"Tuba - Triumphal March from Aida - Verdi-Holcombe.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Triumphal March from Aida [Quinteto bronces]';
  END IF;

  -- Spring [Quinteto bronces]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Spring [Quinteto bronces]' AND oc.id_compositor = _id_arr_Dorsey_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Spring [Quinteto bronces]',
      _id_arr_Dorsey_,
      1725,
      137,
      'Oficial',
      'Quinteto bronces — arr. Dorsey',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1zMQyHe-EZ_baqljqKnSsSpqeO7UwgQ4-'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Vivaldi_Antonio, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Dorsey_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Dorsey_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1lXdDMxIgjO_L0kI7xrmj_ALMhaZZiOG2/view?usp=drivesdk","description":"Corno 1 - Spring - Vivaldi-Dorsey.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1t2-io02UkRwEKwwiNvP0ly7BjExCtEdH/view?usp=drivesdk","description":"Trombón - Spring - Vivaldi-Dorsey.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1Ug483_DoPQrsoMNsUS_MJIs9f7jyjgfP/view?usp=drivesdk","description":"Trompeta 1 - Spring - Vivaldi-Dorsey.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1A50cX_vwCPc3q3H9O26-HLpF6GasGcph/view?usp=drivesdk","description":"Trompeta 2 - Spring - Vivaldi-Dorsey.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1rTIBNpTxDkvOh3J2aWJSqMlKp4zf9DDt/view?usp=drivesdk","description":"Tuba - Spring - Vivaldi-Dorsey.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Spring [Quinteto bronces]';
  END IF;

  -- Elsa's Procession [Quinteto bronces]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Elsa''s Procession [Quinteto bronces]' AND oc.id_compositor = _id_arr_Gale_Jack
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Elsa''s Procession [Quinteto bronces]',
      _id_arr_Gale_Jack,
      1850,
      458,
      'Oficial',
      'Quinteto bronces — arr. Jack Gale',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1c4zdfYEyyZa4ekqcr92I_C-15cWpRybC'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Wagner_Richard, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gale_Jack, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gale_Jack
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/110vjnwIAAM3m-z4H4l8ExwGLWW1EtMoR/view?usp=drivesdk","description":"Corno 1 - Elsa''s Procession - Wagner-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1cuAhZNB7sVnuvs08Uuc5XPFLP4xyfnRa/view?usp=drivesdk","description":"Trombón - Elsa''s Procession - Wagner-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1zxfxjuYnPyCvx6o2COX9WSndg6Nuw9rI/view?usp=drivesdk","description":"Trompeta 1 - Elsa''s Procession - Wagner-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1FFlu65VwB-xGtkq6DzD06f179s6R03I2/view?usp=drivesdk","description":"Trompeta 2 - Elsa''s Procession - Wagner-Gale.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1q-xOce1L-gZGKKCRP7s58m3grhQOkTKs/view?usp=drivesdk","description":"Tuba - Elsa''s Procession - Wagner-Gale.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Elsa''s Procession [Quinteto bronces]';
  END IF;

  -- Bridal Chorus [Quinteto bronces]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Bridal Chorus [Quinteto bronces]' AND oc.id_compositor = _id_arr_Thomas_David_R_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Bridal Chorus [Quinteto bronces]',
      _id_arr_Thomas_David_R_,
      1850,
      159,
      'Oficial',
      'Quinteto bronces — arr. David R. Thomas',
      '0.0.0.0 - 1.2.1.1',
      'https://drive.google.com/drive/folders/1QhuMdSUlKKPcVTZbJ2F9e4gv4aKWs_9O'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Wagner_Richard, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Thomas_David_R_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Thomas_David_R_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1TjwRaNru2wI45nMVA2wzMlv2riLrwKz7/view?usp=drivesdk","description":"Corno 1 - Bridal Chorus - Wagner-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1q1v6ID5GC5ktCExbBOmnFu0K8vmOq6qB/view?usp=drivesdk","description":"Trombón - Bridal Chorus - Wagner-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1TVRlXL7LNbtB5pLw2ChJCQcisJlUOaG-/view?usp=drivesdk","description":"Trompeta 1 - Bridal Chorus - Wagner-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1X9-y-hLD2XXAvovsaN01STayD2lqJK28/view?usp=drivesdk","description":"Trompeta 2 - Bridal Chorus - Wagner-Thomas.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1ZyKG2SNNQRzxn4r7X0GNKkk5vFWj-vt3/view?usp=drivesdk","description":"Tuba - Bridal Chorus - Wagner-Thomas.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Bridal Chorus [Quinteto bronces]';
  END IF;

  -- Prelude in B minor [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Prelude in B minor [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Prelude in B minor [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1709,
      718,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/198UEN93n0s7OYBIgmDQNoXcPjP5RJ1qy'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bach_Johann_Sebastian, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1bXqVoyMhyXqz7ZYgkqZd9jVMHK4ZA2q_/view?usp=drivesdk","description":"Viola - Prelude in B minor - Bach-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/17hBgAOoHAucCo0H7aXRujbaf-bACWo9g/view?usp=drivesdk","description":"Violín 1 - Prelude in B minor - Bach-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Z8rXlw-FU0sOpHj8xh-ktpHJyQnKQ-D4/view?usp=drivesdk","description":"Violín 2 - Prelude in B minor - Bach-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/18gi9mLWZmFxHgdkN-EQAYdf7mAQMgXWC/view?usp=drivesdk","description":"Violonchelo - Prelude in B minor - Bach-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Prelude in B minor [Cuarteto cuerdas]';
  END IF;

  -- Adagio from Moonlight Sonata [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Adagio from Moonlight Sonata [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Adagio from Moonlight Sonata [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1801,
      248,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/1BeC-d1Zz3eaKnDm6WFeZe2iq585S0-S4'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Beethoven_Ludwig_van, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1u1JuPF0VwVtwdANyK-v67rzMc5zDtO1b/view?usp=drivesdk","description":"Viola - Adagio from Moonlight Sonata - Beethoven-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/10D5Uwt1w9WOUSfxYzvykIjKKu4vF_hc8/view?usp=drivesdk","description":"Violín 1 - Adagio from Moonlight Sonata - Beethoven-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1JRaY4Nqy4P7KJ-579iQXhe6cSmx5hIoC/view?usp=drivesdk","description":"Violín 2 - Adagio from Moonlight Sonata - Beethoven-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/1Zqew-uWYsHQROfWr46SLrXO653gqgQGw/view?usp=drivesdk","description":"Violonchelo - Adagio from Moonlight Sonata - Beethoven-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Adagio from Moonlight Sonata [Cuarteto cuerdas]';
  END IF;

  -- Prelude Op. 28 No. 4 [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Prelude Op. 28 No. 4 [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Prelude Op. 28 No. 4 [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1839,
      116,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/1iCD1fuyKyS_NORs1ziq4ffCP4BUDsdI_'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Chopin_Fr_d_ric, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1vLyQ2aHf9xR0ZuPDm80TuBGZ0tT1JJIc/view?usp=drivesdk","description":"Viola - Prelude Op. 28 No. 4 - Chopin-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1S_icIjzYtLkKWQGbPZScjhO_BPwFKexb/view?usp=drivesdk","description":"Violín 1 - Prelude Op. 28 No. 4 - Chopin-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Bv7W8LBT5g8LlMUSS6MLVjRtgUhw__r8/view?usp=drivesdk","description":"Violín 2 - Prelude Op. 28 No. 4 - Chopin-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/1Nr60hi-E3MGVGMwiSops0zWaj_qG7zfW/view?usp=drivesdk","description":"Violonchelo - Prelude Op. 28 No. 4 - Chopin-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Prelude Op. 28 No. 4 [Cuarteto cuerdas]';
  END IF;

  -- Gavotte from Paris and Helena [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Gavotte from Paris and Helena [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Gavotte from Paris and Helena [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1779,
      193,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/1Cd-wKxZg1z_s2RDqNJJbg_OJBh47peSa'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Gluck_Christoph_Willibald, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1B5OH0mziYYFRFx0oRF6F_o3Mk_C7BO87/view?usp=drivesdk","description":"Viola - Gavotte from Paris and Helena - Gluck-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1eqL7MiOkPO1vF6ndrDXXa8BAFKZ1eoUp/view?usp=drivesdk","description":"Violín 1 - Gavotte from Paris and Helena - Gluck-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1NjmzRkNxIui9sVh-Ibgo8DlOT1W21kwP/view?usp=drivesdk","description":"Violín 2 - Gavotte from Paris and Helena - Gluck-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/1Iky3VTdJ37hOAyvLt1zUBNW2-inIHklQ/view?usp=drivesdk","description":"Violonchelo - Gavotte from Paris and Helena - Gluck-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Gavotte from Paris and Helena [Cuarteto cuerdas]';
  END IF;

  -- Canzonetta [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Canzonetta [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Canzonetta [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1880,
      225,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/155gEZpKZbA-0MrxOki-imqnB88RK6iH_'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Godard_Benjamin, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1-rRWPSFhhOJdUC2Gk8lHhfIgpPyxkBum/view?usp=drivesdk","description":"Viola - Canzonetta - Godard-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/12_3JcEqG20XCXI78jNhf8onAvCrtGYX2/view?usp=drivesdk","description":"Violín 1 - Canzonetta - Godard-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1iEOjOAeQimg92GRGwH71gJUEymrHRWL6/view?usp=drivesdk","description":"Violín 2 - Canzonetta - Godard-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/1lQIdY1WzVfs-7o_6udxMDRre1RbQu6yN/view?usp=drivesdk","description":"Violonchelo - Canzonetta - Godard-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Canzonetta [Cuarteto cuerdas]';
  END IF;

  -- Ungarisch No. 1 [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Ungarisch No. 1 [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Ungarisch No. 1 [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1900,
      NULL,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/1OBxS2h7okvzVSvYQGr96er6qfRhnTmki'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Kassmayer_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1aXjEz-bAefUimSY6W1T74DCmxJx0rWqM/view?usp=drivesdk","description":"Viola - Ungarisch No. 1 - Kassmayer-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1I9dZ0CZ2PFsNZnV9Y2AanKeH0bHCRo5Y/view?usp=drivesdk","description":"Violín 1 - Ungarisch No. 1 - Kassmayer-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/18UfoJUrcpigXhqz-IxG9z6xSgoh8WWAv/view?usp=drivesdk","description":"Violín 2 - Ungarisch No. 1 - Kassmayer-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/1kM7qnTlvaJ5fyaQUj_I198ccLP32Oa9z/view?usp=drivesdk","description":"Violonchelo - Ungarisch No. 1 - Kassmayer-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Ungarisch No. 1 [Cuarteto cuerdas]';
  END IF;

  -- Ungarisch No. 2 [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Ungarisch No. 2 [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Ungarisch No. 2 [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1900,
      NULL,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/1A5HbS9_A-LOM3Ng_y331yIxiCu9ylMb8'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Kassmayer_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1_xMwrqXaUZC93CpS9J_5h3IBCRRZHCwF/view?usp=drivesdk","description":"Viola - Ungarisch No. 2 - Kassmayer-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Emk6FOCsGYJ26NY1yUud4hrNX4lBpVaZ/view?usp=drivesdk","description":"Violín 1 - Ungarisch No. 2 - Kassmayer-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1bEo9ubN41mFKxY_Sbw-C2LnFQ9AP1iys/view?usp=drivesdk","description":"Violín 2 - Ungarisch No. 2 - Kassmayer-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/1nUsMVzr0fvTQpjhJaOUIziMTYosWbVfe/view?usp=drivesdk","description":"Violonchelo - Ungarisch No. 2 - Kassmayer-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Ungarisch No. 2 [Cuarteto cuerdas]';
  END IF;

  -- Sarabande et Tambourin [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Sarabande et Tambourin [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Sarabande et Tambourin [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1730,
      140,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/1u3byiccIJ8rsz1WyDkn0ojdhv7lzkl-I'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Leclair_Jean_Marie, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1_Tul6w9cUcAPzj9wk7vEDkKIizliPA6T/view?usp=drivesdk","description":"Viola - Sarabande et Tambourin - Leclair-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1JM7SCg6_OptaJkbG7ot7EW6Rj4ZXeL8K/view?usp=drivesdk","description":"Violín 1 - Sarabande et Tambourin - Leclair-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1ZS8u2cwHoUE8YmtaOp8fpP92UGMtf5ta/view?usp=drivesdk","description":"Violín 2 - Sarabande et Tambourin - Leclair-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/1hfTeAtA3WHp4tAmnTPpMztG9bssBdhTx/view?usp=drivesdk","description":"Violonchelo - Sarabande et Tambourin - Leclair-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Sarabande et Tambourin [Cuarteto cuerdas]';
  END IF;

  -- Alla turca [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Alla turca [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Alla turca [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1783,
      110,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/17QQeD6-g37U4JjVGXsWzbNd85Kz68BMV'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Mozart_Wolfgang_Amadeus, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1wXA9__1bowzj18yvIWmgGd33Qc10b-vJ/view?usp=drivesdk","description":"Viola - Alla turca - Mozart-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1vb_jaH_b8iluewtqDv3PQuCdsOXtMzY0/view?usp=drivesdk","description":"Violín 1 - Alla turca - Mozart-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1jmvsawFNLoIXM46MZLOYVWfa-rO4P4iT/view?usp=drivesdk","description":"Violín 2 - Alla turca - Mozart-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/1DWhBovu1Dy8JB5ipzEjPDpMpZxkKkXc-/view?usp=drivesdk","description":"Violonchelo - Alla turca - Mozart-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Alla turca [Cuarteto cuerdas]';
  END IF;

  -- Menuet Op. 14 No. 1 [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Menuet Op. 14 No. 1 [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Menuet Op. 14 No. 1 [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1884,
      247,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/1pQfqHwOT489x3-CEgauiTbUnrvLk9zOx'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Paderewski_Ignacy, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ievEmr7EyNyKUWv69z_4OTFHibtfokmW/view?usp=drivesdk","description":"Viola - Menuet Op. 14 No. 1 - Paderewski-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1yX4aGrD8CxKw9o2WuwUpM2_tI6d0dRV1/view?usp=drivesdk","description":"Violín 1 - Menuet Op. 14 No. 1 - Paderewski-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1H_LuFa5eM6ldhyqZswbI3eMpmGdr4V8x/view?usp=drivesdk","description":"Violín 2 - Menuet Op. 14 No. 1 - Paderewski-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/1MHFNuTkaYa_AXLa5nHO2PS0E8sYuDaiG/view?usp=drivesdk","description":"Violonchelo - Menuet Op. 14 No. 1 - Paderewski-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Menuet Op. 14 No. 1 [Cuarteto cuerdas]';
  END IF;

  -- Tarantella [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Tarantella [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Tarantella [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1855,
      206,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/1NFrOIhMBIjtug-uXAYEuXNRhNfI09kJ2'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Raff_Joachim, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1vHT2MaX10JbYgYsqEuli7-8FN0K4DoaD/view?usp=drivesdk","description":"Viola - Tarantella - Raff-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1bU0GVk-hxJ_Hq2PIZPKA_YCXOx74nfW9/view?usp=drivesdk","description":"Violín 1 - Tarantella - Raff-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Zw0CMAqu1J6HgxihgvAz6yZ-uyesh6LU/view?usp=drivesdk","description":"Violín 2 - Tarantella - Raff-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/1TlcBnX6yVqGDBdF7UDduTEfO6YsQ6KpF/view?usp=drivesdk","description":"Violonchelo - Tarantella - Raff-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Tarantella [Cuarteto cuerdas]';
  END IF;

  -- Menuet from Op. 78 [Cuarteto cuerdas]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Menuet from Op. 78 [Cuarteto cuerdas]' AND oc.id_compositor = _id_arr_Gruenberg_Eugene
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Menuet from Op. 78 [Cuarteto cuerdas]',
      _id_arr_Gruenberg_Eugene,
      1827,
      94,
      'Oficial',
      'Cuarteto cuerdas — arr. Eugene Gruenberg',
      'Str',
      'https://drive.google.com/drive/folders/15BYku-pGCB4z1HBUajfCYWk2lW9G-2zK'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Schubert_Franz, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Gruenberg_Eugene, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Gruenberg_Eugene
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1AyBm41G-Dd6jfacQyaYO4VhvcukrorIa/view?usp=drivesdk","description":"Viola - Menuet from Op. 78 - Schubert-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1AXPL8WIywEy94yAhotY8oWv7LsoEaL5A/view?usp=drivesdk","description":"Violín 1 - Menuet from Op. 78 - Schubert-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Le4_ifxOBRfyqL5MymEpr1T7RgUbJ9GA/view?usp=drivesdk","description":"Violín 2 - Menuet from Op. 78 - Schubert-Gruenberg.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violonchelo', '[{"url":"https://drive.google.com/file/d/17EoMM7x1pmrKVoNcFq9q8BfPhzVfkiOb/view?usp=drivesdk","description":"Violonchelo - Menuet from Op. 78 - Schubert-Gruenberg.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Menuet from Op. 78 [Cuarteto cuerdas]';
  END IF;

END $$;
