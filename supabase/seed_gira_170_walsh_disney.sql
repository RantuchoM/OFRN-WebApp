-- Gira 170 "Agasajo Maestros Jardin 27" — Manuelita + Disney Favorites
-- Bloque repertorio id=147. Idempotente.

DO $$
DECLARE
  _id_programa bigint := 170;
  _block_id bigint := 147;
  _orden int;
  _id_obra bigint;
  _titulo text;
  _titles text[] := ARRAY[
    'Manuelita, la tortuga',
    'Disney Favorites [quinteto de vientos]'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM programas WHERE id = _id_programa) THEN
    RAISE EXCEPTION 'No existe gira/programa id=%', _id_programa;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM programas_repertorios
    WHERE id = _block_id AND id_programa = _id_programa
  ) THEN
    RAISE EXCEPTION 'Bloque repertorio % no pertenece a gira %', _block_id, _id_programa;
  END IF;

  SELECT COALESCE(MAX(orden), 0) INTO _orden
  FROM repertorio_obras
  WHERE id_repertorio = _block_id;

  FOREACH _titulo IN ARRAY _titles LOOP
    SELECT o.id INTO _id_obra
    FROM obras o
    WHERE o.titulo = _titulo
    ORDER BY o.id DESC
    LIMIT 1;

    IF _id_obra IS NULL THEN
      RAISE EXCEPTION 'Obra no encontrada: %', _titulo;
    END IF;

    IF EXISTS (
      SELECT 1 FROM repertorio_obras
      WHERE id_repertorio = _block_id AND id_obra = _id_obra
    ) THEN
      RAISE NOTICE 'Ya en bloque: % (%)', _id_obra, _titulo;
    ELSE
      _orden := _orden + 1;
      INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
      VALUES (_block_id, _id_obra, _orden);
      RAISE NOTICE 'Vinculada % (%) orden=%', _id_obra, _titulo, _orden;
    END IF;
  END LOOP;
END $$;
