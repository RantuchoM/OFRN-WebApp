-- Gira 137 "Recorriendo Nuestras Raíces (sexta edición)"
-- Bloque existente "Repertorio" id=111. Las cuatro obras de CUERDAS
-- van al final, después de Nostalgias (orden 10):
-- 3880 Abuelita Lorenza, 3881 Pastorcita de Antinaco,
-- 3882 La Nochera, 3883 Si Llega A Ser Tucumana [cuerdas].
-- Idempotente: no duplica (id_repertorio, id_obra).

DO $$
DECLARE
  _id_programa bigint := 137;
  _block_id bigint := 111;
  _orden int;
  _id_obra bigint;
  _ids bigint[] := ARRAY[3880, 3881, 3882, 3883];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM programas WHERE id = _id_programa) THEN
    RAISE EXCEPTION 'No existe gira/programa id=%', _id_programa;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM programas_repertorios
    WHERE id = _block_id AND id_programa = _id_programa AND nombre = 'Repertorio'
  ) THEN
    RAISE EXCEPTION 'Bloque repertorio % no es el Repertorio de la gira %', _block_id, _id_programa;
  END IF;

  SELECT COALESCE(MAX(orden), 0) INTO _orden
  FROM repertorio_obras
  WHERE id_repertorio = _block_id;

  FOREACH _id_obra IN ARRAY _ids LOOP
    IF NOT EXISTS (SELECT 1 FROM obras WHERE id = _id_obra) THEN
      RAISE EXCEPTION 'Obra no encontrada: %', _id_obra;
    END IF;

    IF EXISTS (
      SELECT 1 FROM repertorio_obras
      WHERE id_repertorio = _block_id AND id_obra = _id_obra
    ) THEN
      RAISE NOTICE 'Ya en bloque: %', _id_obra;
    ELSE
      _orden := _orden + 1;
      INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
      VALUES (_block_id, _id_obra, _orden);
      RAISE NOTICE 'Vinculada % orden=%', _id_obra, _orden;
    END IF;
  END LOOP;
END $$;
