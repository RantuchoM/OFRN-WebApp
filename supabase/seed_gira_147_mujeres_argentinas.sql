-- Gira 147 "Nuestras raices" — 9 encargos Ramírez-Zigarán (Para arreglar, Lema)
-- al bloque Repertorio. Quita las Oficiales si estaban. Idempotente.

DO $$
DECLARE
  _id_programa bigint := 147;
  _lema bigint := 4340365;
  _block_id bigint;
  _orden int;
  _id_obra bigint;
  _titulo text;
  _titles text[] := ARRAY[
    'Alfonsina y el Mar. <i>Suite Mujeres Argentinas</i>',
    'Dorotea, La Cautiva. <i>Suite Mujeres Argentinas</i>',
    'Duerme Negrito. <i>Suite Mujeres Argentinas</i>',
    'En Casa de Mariquita. <i>Suite Mujeres Argentinas</i>',
    'Gringa Chaqueña. <i>Suite Mujeres Argentinas</i>',
    'Juana Azurduy. <i>Suite Mujeres Argentinas</i>',
    'Las Cartas de Guadalupe. <i>Suite Mujeres Argentinas</i>',
    'Manuela, La Tucumana. <i>Suite Mujeres Argentinas</i>',
    'Rosarito Vera, Maestra. <i>Suite Mujeres Argentinas</i>'
  ];
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

  DELETE FROM repertorio_obras ro
  USING obras o
  WHERE ro.id_repertorio = _block_id
    AND ro.id_obra = o.id
    AND o.titulo = ANY (_titles)
    AND o.estado = 'Oficial';

  SELECT COALESCE(MAX(orden), 0) INTO _orden
  FROM repertorio_obras
  WHERE id_repertorio = _block_id;

  FOREACH _titulo IN ARRAY _titles LOOP
    SELECT o.id INTO _id_obra
    FROM obras o
    WHERE o.titulo = _titulo
      AND o.estado = 'Para arreglar'
      AND o.id_integrante_arreglador = _lema
    ORDER BY o.id
    LIMIT 1;

    IF _id_obra IS NULL THEN
      RAISE EXCEPTION 'Encargo Para arreglar (Lema) no encontrado: %', _titulo;
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

  RAISE NOTICE 'Gira % bloque % listo (encargos Lema)', _id_programa, _block_id;
END $$;
