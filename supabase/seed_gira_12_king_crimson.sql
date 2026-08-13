-- Bloque "King Crimson" al final de gira (programa) 12.
-- Vincula obras existentes con título [The LCG]. NO inserta obras nuevas.
-- Idempotente: reutiliza el bloque si ya existe; no duplica repertorio_obras.
-- Requiere que Larks' Tongues in Aspic [The LCG] ya esté en obras
-- (aplicar antes supabase/seed_larks_sync.sql si hace falta).

DO $$
DECLARE
  _id_programa bigint := 12;
  _block_id bigint;
  _orden_block int;
  _orden int := 0;
  _id_obra bigint;
  _titulo text;
  _preferred_core text[] := ARRAY[
    '21st Century Schizoid Man [The LCG]',
    'Red [The LCG]',
    'Asturias [The LCG]',
    'Dangerous curves [The LCG]',
    'All or nothing, Part II [The LCG]',
    'Vroom [The LCG]',
    'Eye of the Needle [The LCG]',
    'Black Light [The LCG]',
    'Pie Jesu [The LCG]',
    'Driving Force [The LCG]',
    'Midnight Blue [The LCG]'
  ];
  _larks_title text := 'Larks'' Tongues in Aspic [The LCG]';
  _row record;
BEGIN
  SELECT id INTO _block_id
  FROM programas_repertorios
  WHERE id_programa = _id_programa AND nombre = 'King Crimson'
  LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM obras WHERE titulo = _larks_title) THEN
    RAISE EXCEPTION 'Falta Larks'' Tongues in Aspic [The LCG]. Aplicar supabase/seed_larks_sync.sql primero.';
  END IF;

  FOREACH _titulo IN ARRAY _preferred_core LOOP
    IF NOT EXISTS (SELECT 1 FROM obras WHERE titulo = _titulo) THEN
      RAISE EXCEPTION 'Obra LCG no encontrada (no se inserta): %', _titulo;
    END IF;
  END LOOP;

  IF _block_id IS NULL THEN
    SELECT COALESCE(MAX(orden), 0) + 1 INTO _orden_block
    FROM programas_repertorios
    WHERE id_programa = _id_programa;

    INSERT INTO programas_repertorios (id_programa, nombre, orden)
    VALUES (_id_programa, 'King Crimson', _orden_block)
    RETURNING id INTO _block_id;

    RAISE NOTICE 'Creado bloque King Crimson id=% orden=% (gira %)', _block_id, _orden_block, _id_programa;
  ELSE
    SELECT orden INTO _orden_block
    FROM programas_repertorios
    WHERE id = _block_id;
    RAISE NOTICE 'Reutilizando bloque King Crimson id=% orden=% (gira %)', _block_id, _orden_block, _id_programa;
  END IF;

  FOR _row IN
    WITH preferred(ord, titulo) AS (
      SELECT t.ord, t.titulo
      FROM unnest(_preferred_core) WITH ORDINALITY AS t(titulo, ord)
    ),
    preferred_obras AS (
      SELECT p.ord::numeric AS sort_key, o.id AS id_obra, o.titulo
      FROM preferred p
      JOIN LATERAL (
        SELECT id, titulo
        FROM obras
        WHERE titulo = p.titulo
        ORDER BY id
        LIMIT 1
      ) o ON true
    ),
    extras AS (
      SELECT
        1000 + row_number() OVER (ORDER BY o.titulo, o.id)::numeric AS sort_key,
        o.id AS id_obra,
        o.titulo
      FROM obras o
      WHERE o.titulo ILIKE '%[The LCG]%'
        AND o.titulo IS DISTINCT FROM _larks_title
        AND NOT (o.titulo = ANY (_preferred_core))
    ),
    larks AS (
      SELECT 2000::numeric AS sort_key, o.id AS id_obra, o.titulo
      FROM obras o
      WHERE o.titulo = _larks_title
      ORDER BY o.id
      LIMIT 1
    )
    SELECT sort_key, id_obra, titulo
    FROM (
      SELECT * FROM preferred_obras
      UNION ALL
      SELECT * FROM extras
      UNION ALL
      SELECT * FROM larks
    ) x
    ORDER BY sort_key
  LOOP
    IF _row.id_obra IS NULL THEN
      RAISE EXCEPTION 'Obra LCG no encontrada (no se inserta): %', _row.titulo;
    END IF;

    _orden := _orden + 1;
    _id_obra := _row.id_obra;
    _titulo := _row.titulo;

    IF EXISTS (
      SELECT 1 FROM repertorio_obras
      WHERE id_repertorio = _block_id AND id_obra = _id_obra
    ) THEN
      UPDATE repertorio_obras
      SET orden = _orden
      WHERE id_repertorio = _block_id AND id_obra = _id_obra;
      RAISE NOTICE 'Obra % (%) ya en bloque; orden=%', _id_obra, _titulo, _orden;
    ELSE
      INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
      VALUES (_block_id, _id_obra, _orden);
      RAISE NOTICE 'Vinculada obra % (%) orden=%', _id_obra, _titulo, _orden;
    END IF;
  END LOOP;

  IF _orden = 0 THEN
    RAISE EXCEPTION 'No se vincularon obras LCG al bloque King Crimson';
  END IF;

  RAISE NOTICE 'King Crimson listo: block_id=% obras=%', _block_id, _orden;
END $$;
