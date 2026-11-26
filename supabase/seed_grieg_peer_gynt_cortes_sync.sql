-- Grieg — La mañana y La muerte de Åse, recortes de Peer Gynt Suite 1
-- Programa 207 deja la suite completa y usa estas dos obras.
-- Generado: 2026-11-25

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Grieg_Edvard bigint;
BEGIN
  SELECT id INTO _id_comp_Grieg_Edvard FROM compositores WHERE apellido = 'Grieg' AND (nombre = 'Edvard' OR (nombre IS NULL AND 'Edvard' IS NULL)) LIMIT 1;
  IF _id_comp_Grieg_Edvard IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Grieg', 'Edvard') RETURNING id INTO _id_comp_Grieg_Edvard;
  END IF;

  -- <p>La mañana. Allegretto pastorale (Peer Gynt, Suite n.º 1, Op. 46)</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>La mañana. Allegretto pastorale (Peer Gynt, Suite n.º 1, Op. 46)</p>'
      AND o.observaciones = 'Para acomodar — Grieg, E. - La mañana (Peer Gynt). Recorte por páginas de la Suite 1 (obra 3497).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>La mañana. Allegretto pastorale (Peer Gynt, Suite n.º 1, Op. 46)</p>',
      NULL,
      1875,
      NULL,
      'Oficial',
      'Para acomodar — Grieg, E. - La mañana (Peer Gynt). Recorte por páginas de la Suite 1 (obra 3497).',
      '2.2.2.2 - 4.2.0.0 - Timp - Str',
      'https://drive.google.com/open?id=1M92xAxCXgtYE6MSiSk52NLEUDPeorNss'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Grieg_Edvard, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1pgMAT7pFUfM7-0ROWPuEy_4SVbj_mZxS/view?usp=drivesdk","description":"Clarinete Bb - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1ilGtHa0L_thndxGCdaJ4v92sXo8QqkDm/view?usp=drivesdk","description":"Clarinete Bb 2 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/13dAzamUt9hdQ9TvLRYhjBeZr0BBR8x30/view?usp=drivesdk","description":"Contrabajo - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1r3ue-lYC2GnlSOLzUC8ZHOGtyl95KLxg/view?usp=drivesdk","description":"Corno F 1y2y3y4 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1r3ue-lYC2GnlSOLzUC8ZHOGtyl95KLxg/view?usp=drivesdk","description":"Corno F 1y2y3y4 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1r3ue-lYC2GnlSOLzUC8ZHOGtyl95KLxg/view?usp=drivesdk","description":"Corno F 1y2y3y4 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1r3ue-lYC2GnlSOLzUC8ZHOGtyl95KLxg/view?usp=drivesdk","description":"Corno F 1y2y3y4 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1obHVTDFNqRsEprMZ-ZWcSGgq-FNeXc-O/view?usp=drivesdk","description":"Fagot - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1EI838UDuqdXzOOpYBUYjpm7Lzs9UqlCf/view?usp=drivesdk","description":"Fagot 2 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1l6eWBIg6ewPR5MWATvdui4mFt7vK7NfE/view?usp=drivesdk","description":"Flauta - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/144RySLRpber7i6iFa9rqaCqsxwLpzaLy/view?usp=drivesdk","description":"Flauta 2 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1kYAFqD6NvZMLCKZgrRxXs8GxqpgeC1mC/view?usp=drivesdk","description":"Oboe 1 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1ynfn_FAdtHsQQ_PH6WkuvZNag8TKqDLl/view?usp=drivesdk","description":"Oboe 2 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/10J2JgooQuzqZwg5QThiVuBD6fqn3hEiN/view?usp=drivesdk","description":"Perc Timbal - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1V7IAYtB0KpNhnkJ0Rd8MnQSHUgW18HHM/view?usp=drivesdk","description":"Trompeta - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1cjrGLXODR-twZGVyyxJSj0geMqS4bski/view?usp=drivesdk","description":"Trompeta 2 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1umm98DyHQBAG4NDhwEYP-L8vLPiNmr14/view?usp=drivesdk","description":"Viola - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1G0agGSVCsVl-HSwdNlIluNnrbd92qHtG/view?usp=drivesdk","description":"Violín 1 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1uDcw8dO5EL3iJAvtBuF3S7gwsfM7wOXI/view?usp=drivesdk","description":"Violín 2 - La mañana - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1b4DDU_fb3I5prw_oWFiR_7tERYHMbg9-/view?usp=drivesdk","description":"Violoncello - La mañana - op.46 - Grieg, E.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>La mañana. Allegretto pastorale (Peer Gynt, Suite n.º 1, Op. 46)</p>';
  END IF;

  -- <p>La muerte de Åse. Andante doloroso (Peer Gynt, Suite n.º 1, Op. 46)</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>La muerte de Åse. Andante doloroso (Peer Gynt, Suite n.º 1, Op. 46)</p>'
      AND o.observaciones = 'Para acomodar — Grieg, E. - La muerte de Åse (Peer Gynt). Recorte por páginas de la Suite 1 (obra 3497).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>La muerte de Åse. Andante doloroso (Peer Gynt, Suite n.º 1, Op. 46)</p>',
      NULL,
      1875,
      NULL,
      'Oficial',
      'Para acomodar — Grieg, E. - La muerte de Åse (Peer Gynt). Recorte por páginas de la Suite 1 (obra 3497).',
      'Str',
      'https://drive.google.com/open?id=1Mtzu9PRnWK7hb1LIsb72sGTtrkbBdMPl'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Grieg_Edvard, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/19lwZp_eFLAv4ohoQklV4sG59fXjiR1NC/view?usp=drivesdk","description":"Contrabajo - La muerte de Åse - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1sYc2OP_dQXnabz8UUSFo0TSyYe1uy70u/view?usp=drivesdk","description":"Viola - La muerte de Åse - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/16TMe4ydtiRzWJWtf76zZ0F8D94RNNfiG/view?usp=drivesdk","description":"Violín 1 - La muerte de Åse - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1OyKFnhODBG3maoPW5fk9F0JaZyj1JMYO/view?usp=drivesdk","description":"Violín 2 - La muerte de Åse - op.46 - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1z0rZRFx19_3Y9V4zVGNg00tB79mLvRI3/view?usp=drivesdk","description":"Violoncello - La muerte de Åse - op.46 - Grieg, E.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>La muerte de Åse. Andante doloroso (Peer Gynt, Suite n.º 1, Op. 46)</p>';
  END IF;

END $$;

-- Programa 6 (Ecos del alma): la suite completa pasa a estos dos recortes.
DO $$
DECLARE
  _manana bigint;
  _ase bigint;
BEGIN
  SELECT id INTO _manana FROM obras
  WHERE titulo = '<p>La mañana. Allegretto pastorale (Peer Gynt, Suite n.º 1, Op. 46)</p>' AND observaciones = 'Para acomodar — Grieg, E. - La mañana (Peer Gynt). Recorte por páginas de la Suite 1 (obra 3497).'
  ORDER BY id DESC LIMIT 1;
  SELECT id INTO _ase FROM obras
  WHERE titulo = '<p>La muerte de Åse. Andante doloroso (Peer Gynt, Suite n.º 1, Op. 46)</p>' AND observaciones = 'Para acomodar — Grieg, E. - La muerte de Åse (Peer Gynt). Recorte por páginas de la Suite 1 (obra 3497).'
  ORDER BY id DESC LIMIT 1;
  IF _manana IS NULL OR _ase IS NULL THEN
    RAISE EXCEPTION 'No se encontraron las obras recortadas';
  END IF;

  IF EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 172 AND id_obra = 3497
  ) THEN
    UPDATE repertorio_obras
    SET id_obra = _manana
    WHERE id_repertorio = 172 AND id_obra = 3497;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 172 AND id_obra = _ase
  ) THEN
    UPDATE repertorio_obras
    SET orden = orden + 1
    WHERE id_repertorio = 172 AND orden >= 2;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (172, _ase, 2);
  END IF;
END $$;
