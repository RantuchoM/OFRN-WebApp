-- Temporada 2027: Beethoven octeto op.103 y Weill concierto de violín op.12 (catálogo; sin programa)
-- Generado: 2026-09-29

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Beethoven_Ludwig_van bigint;
  _id_comp_Weill_Kurt bigint;
BEGIN
  SELECT id INTO _id_comp_Beethoven_Ludwig_van FROM compositores WHERE apellido = 'Beethoven' AND (nombre = 'Ludwig van' OR (nombre IS NULL AND 'Ludwig van' IS NULL)) LIMIT 1;
  IF _id_comp_Beethoven_Ludwig_van IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Beethoven', 'Ludwig van') RETURNING id INTO _id_comp_Beethoven_Ludwig_van;
  END IF;

  SELECT id INTO _id_comp_Weill_Kurt FROM compositores WHERE apellido = 'Weill' AND (nombre = 'Kurt' OR (nombre IS NULL AND 'Kurt' IS NULL)) LIMIT 1;
  IF _id_comp_Weill_Kurt IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Weill', 'Kurt') RETURNING id INTO _id_comp_Weill_Kurt;
  END IF;

  -- <p>Octeto en Mib mayor, Op. 103</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Andante</div><div>&nbsp; III. Minuet - Trio</div><div>&nbsp; IV. Finale. Presto</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Octeto en Mib mayor, Op. 103</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Andante</div><div>&nbsp; III. Minuet - Trio</div><div>&nbsp; IV. Finale. Presto</div>'
      AND o.observaciones = 'Para acomodar — Beethoven, L. - Octeto, Op. 103. Partes Breitkopf (Beethoven Werke) IMSLP PMLP27872. Portada suelta del Oboe 1 recortada.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Octeto en Mib mayor, Op. 103</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Andante</div><div>&nbsp; III. Minuet - Trio</div><div>&nbsp; IV. Finale. Presto</div>',
      NULL,
      1792,
      NULL,
      'Oficial',
      'Para acomodar — Beethoven, L. - Octeto, Op. 103. Partes Breitkopf (Beethoven Werke) IMSLP PMLP27872. Portada suelta del Oboe 1 recortada.',
      '0.2.2.2 - 2.0.0.0',
      'https://drive.google.com/open?id=12_vOnfp3FrYEhMOoHAAb15uIoXoqx1ZB'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Beethoven_Ludwig_van, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1sMlnsKFGdhD1HohCMuLSnw6ukheFS1W-/view?usp=drivesdk","description":"Clarinete 1 - op.103. Octeto en Mib mayor - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1_ECqnTvXb8u2h1UYrSp5LFmEEXOWCE7x/view?usp=drivesdk","description":"Clarinete 2 - op.103. Octeto en Mib mayor - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1mVGgNZkesBys615aaZb5MFFrNu3JRNPE/view?usp=drivesdk","description":"Corno 1 - op.103. Octeto en Mib mayor - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1SKrH4K32SsfrjruiYa6ktj_RBroDn1CR/view?usp=drivesdk","description":"Corno 2 - op.103. Octeto en Mib mayor - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1FnPnMG5o791vnJ4dUxO6H4AyjsLk-EM4/view?usp=drivesdk","description":"Fagot 1 - op.103. Octeto en Mib mayor - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1nF-jqm5n2FPvC0vXo9FGLAMea6SB4sY3/view?usp=drivesdk","description":"Fagot 2 - op.103. Octeto en Mib mayor - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1XXNNL6M8-1aXVRHS9ZLHqwlVYJz47m8T/view?usp=drivesdk","description":"Oboe 1 - op.103. Octeto en Mib mayor - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1s-mSO38T4Ge-_07Qoe1n2h1xf3408qIi/view?usp=drivesdk","description":"Oboe 2 - op.103. Octeto en Mib mayor - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1OrCjZIKLLtkHsRDSyPkBmjGcZxb0yW2X/view?usp=drivesdk","description":"SCORE - op.103. Octeto en Mib mayor - Beethoven, L.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Octeto en Mib mayor, Op. 103</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Andante</div><div>&nbsp; III. Minuet - Trio</div><div>&nbsp; IV. Finale. Presto</div>';
  END IF;

  -- <p>Concierto para Violín, Op. 12</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Concierto para Violín, Op. 12</p>'
      AND o.observaciones = 'Para acomodar — Weill, K. - Concierto para Violín, Op. 12. Universal Edition U.E. 8340 (IMSLP PMLP659197). Flauta 2 incluye los cambios a piccolo. Clarinetes en Sib y en La van en la misma parte. Batería: xilófono, triángulo, platillos, tambor y gran cassa.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Concierto para Violín, Op. 12</p>',
      NULL,
      1924,
      1980,
      'Oficial',
      'Para acomodar — Weill, K. - Concierto para Violín, Op. 12. Universal Edition U.E. 8340 (IMSLP PMLP659197). Flauta 2 incluye los cambios a piccolo. Clarinetes en Sib y en La van en la misma parte. Batería: xilófono, triángulo, platillos, tambor y gran cassa.',
      'Vn - 2.1.2.2 - 2.1.0.0 - Timp.+1 - Str',
      'https://drive.google.com/open?id=1STA2_Z4opzNhycdDZIrLtth830ZjgNIi'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Weill_Kurt, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1LSRu9-OU2HApg4CxvQmziDUy4lvkRSUk/view?usp=drivesdk","description":"Clarinete 1 - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1N1VjZCxWttQEXV95eK_dYm5ahG2txvBc/view?usp=drivesdk","description":"Clarinete 2 - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/18FmMN-deKlO05_EGJdWNRCKpBfezq22Z/view?usp=drivesdk","description":"Contrabajo - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1JWxZxghKUiOwkVqzejN8H1KDbNAaY56H/view?usp=drivesdk","description":"Corno 1 - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1sGlY2lwPmMT0j75uPxalRJ-dSy44l7CK/view?usp=drivesdk","description":"Corno 2 - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1YyOXml54RCUyMJA1XDCCIsJNvqt_SBhh/view?usp=drivesdk","description":"Fagot 1 - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/10Odzi-Y_sJZbvjruqv93wXYHxRu6IAvh/view?usp=drivesdk","description":"Fagot 2 - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1duIJVzuvZXaX2881CFDTC96Rbg8Ra6sz/view?usp=drivesdk","description":"Flauta 1 - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/12YG7js2ylXEeWuGurj7xY7y6TYg2YdME/view?usp=drivesdk","description":"Flauta 2 - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1QsYsmS9exJVFGx1RWX1BlfyRtplsW9xo/view?usp=drivesdk","description":"Oboe - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1L0NglNaColNqX4PliLJaSdvOoBPAsaMz/view?usp=drivesdk","description":"Perc Batería - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1LpS_0IcUu1Rngn9kTWIkH8rOQ7RrlA6y/view?usp=drivesdk","description":"Perc Timbal - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/11JVyksggxZjsDCfXHWWnS-WBtCaziFEG/view?usp=drivesdk","description":"SCORE - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1Dur41l6l4oCYK8_fdE6X6fkRZ2ixQK0k/view?usp=drivesdk","description":"Trompeta - op.12. Concierto para Violín - Weill, K.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín Solo', '[{"url":"https://drive.google.com/file/d/1_h3diiwywZSWwDCTxwI1CKGwiVUWdTfB/view?usp=drivesdk","description":"Violín Solo - op.12. Concierto para Violín - Weill, K.pdf"}]', true);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Concierto para Violín, Op. 12</p>';
  END IF;

END $$;
