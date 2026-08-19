-- Gira 165 "Feria del Libro Cipolletti" — 10 encargos de cine (Para arreglar, Lema)
-- Entrega 10/09/2026. Idempotente. No envía mail encargo_arreglo.

DO $$
DECLARE
  _id_programa bigint := 165;
  _lema_int bigint := 4340365;
  _lema_comp bigint;
  _block_id bigint;
  _orden int;
  _id_obra bigint;
  _id_tag bigint;
  _id_williams bigint;
  _id_shore bigint;
  _id_zimmer bigint;
  _id_badelt bigint;
  _id_morricone bigint;
  _id_gregson bigint;
  _id_powell bigint;
  _id_schifrin bigint;
  _id_hisaishi bigint;
  _cid bigint;
  rec record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM programas WHERE id = _id_programa) THEN
    RAISE EXCEPTION 'No existe gira/programa id=%', _id_programa;
  END IF;

  SELECT id INTO _block_id
  FROM programas_repertorios
  WHERE id_programa = _id_programa
  ORDER BY orden ASC, id ASC
  LIMIT 1;

  IF _block_id IS NULL THEN
    RAISE EXCEPTION 'Gira % no tiene bloque de repertorio', _id_programa;
  END IF;

  SELECT id INTO _lema_comp
  FROM compositores
  WHERE apellido = 'Lema' AND nombre = 'Germán'
  LIMIT 1;
  IF _lema_comp IS NULL THEN
    RAISE EXCEPTION 'Compositor Lema, Germán no encontrado';
  END IF;

  SELECT id INTO _id_tag FROM palabras_clave WHERE tag = 'Película' LIMIT 1;
  IF _id_tag IS NULL THEN
    INSERT INTO palabras_clave (tag) VALUES ('Película') RETURNING id INTO _id_tag;
  END IF;

  SELECT id INTO _id_williams FROM compositores WHERE apellido = 'Williams' AND nombre = 'John' LIMIT 1;
  IF _id_williams IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Williams', 'John') RETURNING id INTO _id_williams;
  END IF;

  SELECT id INTO _id_shore FROM compositores WHERE apellido = 'Shore' AND (nombre = 'Howard' OR nombre IS NULL) LIMIT 1;
  IF _id_shore IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Shore', 'Howard') RETURNING id INTO _id_shore;
  END IF;

  SELECT id INTO _id_zimmer FROM compositores WHERE apellido = 'Zimmer' AND nombre = 'Hans' LIMIT 1;
  IF _id_zimmer IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Zimmer', 'Hans') RETURNING id INTO _id_zimmer;
  END IF;

  SELECT id INTO _id_badelt FROM compositores WHERE apellido = 'Badelt' AND nombre = 'Klaus' LIMIT 1;
  IF _id_badelt IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Badelt', 'Klaus') RETURNING id INTO _id_badelt;
  END IF;

  SELECT id INTO _id_morricone FROM compositores WHERE apellido = 'Morricone' AND nombre = 'Ennio' LIMIT 1;
  IF _id_morricone IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Morricone', 'Ennio') RETURNING id INTO _id_morricone;
  END IF;

  SELECT id INTO _id_gregson
  FROM compositores
  WHERE apellido = 'Gregson-Williams' AND nombre = 'Harry'
  LIMIT 1;
  IF _id_gregson IS NULL THEN
    INSERT INTO compositores (apellido, nombre)
    VALUES ('Gregson-Williams', 'Harry')
    RETURNING id INTO _id_gregson;
  END IF;

  SELECT id INTO _id_powell FROM compositores WHERE apellido = 'Powell' AND nombre = 'John' LIMIT 1;
  IF _id_powell IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Powell', 'John') RETURNING id INTO _id_powell;
  END IF;

  SELECT id INTO _id_schifrin FROM compositores WHERE apellido = 'Schifrin' AND nombre = 'Lalo' LIMIT 1;
  IF _id_schifrin IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Schifrin', 'Lalo') RETURNING id INTO _id_schifrin;
  END IF;

  SELECT id INTO _id_hisaishi FROM compositores WHERE apellido = 'Hisaishi' AND nombre = 'Joe' LIMIT 1;
  IF _id_hisaishi IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Hisaishi', 'Joe') RETURNING id INTO _id_hisaishi;
  END IF;

  CREATE TEMP TABLE tmp_cine_gira_165 (
    titulo text PRIMARY KEY,
    anio int,
    composer_ids bigint[],
    ref_id bigint,
    ref_label text
  ) ON COMMIT DROP;

  INSERT INTO tmp_cine_gira_165 (titulo, anio, composer_ids, ref_id, ref_label) VALUES
    ('Star Wars', 1977, ARRAY[_id_williams], 3489, 'Obra original · Star Wars, Main Theme'),
    ('Harry Potter', 2001, ARRAY[_id_williams], 2349, 'Obra original · Suite Harry Potter y la Piedra Filosofal'),
    ('El Señor de los Anillos', 2001, ARRAY[_id_shore], NULL, NULL),
    ('Piratas del Caribe', 2003, ARRAY[_id_badelt, _id_zimmer], 3483, 'Obra original · Piratas del Caribe'),
    ('La misión – El oboe de Gabriel', 1986, ARRAY[_id_morricone], 1488, 'Obra original · El Oboe De Gabriel'),
    ('Cinema Paradiso', 1988, ARRAY[_id_morricone], 1295, 'Obra original · Suite from Cinema Paradiso'),
    ('Shrek', 2001, ARRAY[_id_gregson, _id_powell], NULL, NULL),
    ('Misión Imposible', 1996, ARRAY[_id_schifrin], NULL, NULL),
    ('Jurassic Park', 1993, ARRAY[_id_williams], 2344, 'Obra original · Jurassic Park'),
    ('El viaje de Chihiro', 2001, ARRAY[_id_hisaishi], NULL, NULL);

  SELECT COALESCE(MAX(orden), 0) INTO _orden
  FROM repertorio_obras
  WHERE id_repertorio = _block_id;

  FOR rec IN
    SELECT x.titulo, x.anio, x.composer_ids, x.ref_id, x.ref_label
    FROM unnest(ARRAY[
      'Star Wars',
      'Harry Potter',
      'El Señor de los Anillos',
      'Piratas del Caribe',
      'La misión – El oboe de Gabriel',
      'Cinema Paradiso',
      'Shrek',
      'Misión Imposible',
      'Jurassic Park',
      'El viaje de Chihiro'
    ]) WITH ORDINALITY AS t(titulo, ord)
    JOIN tmp_cine_gira_165 x ON x.titulo = t.titulo
    ORDER BY t.ord
  LOOP
    SELECT o.id INTO _id_obra
    FROM obras o
    WHERE o.titulo = rec.titulo
      AND o.estado = 'Para arreglar'
      AND o.id_integrante_arreglador = _lema_int
      AND o.fecha_esperada = DATE '2026-09-10'
    ORDER BY o.id
    LIMIT 1;

    IF _id_obra IS NULL THEN
      INSERT INTO obras (
        titulo,
        anio_composicion,
        estado,
        observaciones,
        fecha_esperada,
        id_integrante_arreglador,
        id_arreglador
      ) VALUES (
        rec.titulo,
        rec.anio,
        'Para arreglar',
        'Encargo de arreglo (Lema, 10/09/2026). Gira 165 Feria del Libro Cipolletti.',
        DATE '2026-09-10',
        _lema_int,
        _lema_comp
      )
      RETURNING id INTO _id_obra;
    ELSE
      UPDATE obras SET
        anio_composicion = COALESCE(rec.anio, anio_composicion),
        observaciones = 'Encargo de arreglo (Lema, 10/09/2026). Gira 165 Feria del Libro Cipolletti.',
        id_integrante_arreglador = _lema_int,
        id_arreglador = _lema_comp
      WHERE id = _id_obra;
    END IF;

    FOREACH _cid IN ARRAY rec.composer_ids LOOP
      INSERT INTO obras_compositores (id_obra, id_compositor, rol)
      SELECT _id_obra, _cid, 'compositor'
      WHERE NOT EXISTS (
        SELECT 1 FROM obras_compositores oc
        WHERE oc.id_obra = _id_obra
          AND oc.id_compositor = _cid
          AND oc.rol = 'compositor'
      );
    END LOOP;

    DELETE FROM obras_compositores
    WHERE id_obra = _id_obra AND rol = 'arreglador';

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _lema_comp, 'arreglador');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT _id_obra, _id_tag
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_palabras_clave opc
      WHERE opc.id_obra = _id_obra AND opc.id_palabra_clave = _id_tag
    );

    IF rec.ref_id IS NOT NULL AND EXISTS (SELECT 1 FROM obras WHERE id = rec.ref_id) THEN
      INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
      SELECT _id_obra, rec.ref_label, rec.ref_id, NULL, 0
      WHERE NOT EXISTS (
        SELECT 1 FROM arreglos_referencias ar
        WHERE ar.id_obra = _id_obra AND ar.id_obra_referencia = rec.ref_id
      );
    END IF;

    IF EXISTS (
      SELECT 1 FROM repertorio_obras
      WHERE id_repertorio = _block_id AND id_obra = _id_obra
    ) THEN
      RAISE NOTICE 'Ya en bloque: % (%)', _id_obra, rec.titulo;
    ELSE
      _orden := _orden + 1;
      INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
      VALUES (_block_id, _id_obra, _orden);
      RAISE NOTICE 'Vinculada % (%) orden=%', _id_obra, rec.titulo, _orden;
    END IF;
  END LOOP;

  RAISE NOTICE 'Gira % bloque % listo (10 encargos cine → Lema, 10/09/2026)', _id_programa, _block_id;
END $$;
