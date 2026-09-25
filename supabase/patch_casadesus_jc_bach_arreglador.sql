-- Obra 3647: compositor Johann Christian Bach, arreglador Henri Casadesus.
-- No toca programas ni otras obras. No re-ejecuta el seed.

DO $$
DECLARE
  _bach bigint;
  _casa bigint;
BEGIN
  SELECT id INTO _bach
  FROM compositores
  WHERE apellido = 'Bach' AND nombre = 'Johann Christian'
  LIMIT 1;

  IF _bach IS NULL THEN
    INSERT INTO compositores (apellido, nombre)
    VALUES ('Bach', 'Johann Christian')
    RETURNING id INTO _bach;
  END IF;

  SELECT id INTO _casa
  FROM compositores
  WHERE apellido = 'Casadesus' AND nombre = 'Henri'
  LIMIT 1;

  IF _casa IS NULL THEN
    RAISE EXCEPTION 'No existe Casadesus, Henri';
  END IF;

  UPDATE obras
  SET id_arreglador = _casa
  WHERE id = 3647;

  UPDATE obras_compositores
  SET rol = 'arreglador'
  WHERE id_obra = 3647
    AND id_compositor = _casa
    AND rol = 'compositor';

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT 3647, _bach, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores
    WHERE id_obra = 3647 AND id_compositor = _bach AND rol = 'compositor'
  );
END $$;
