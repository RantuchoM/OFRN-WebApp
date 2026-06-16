-- Agrega 2 fanfarrias de Manuel de Falla al primer bloque de repertorio
-- existente de la gira (programa) ID = 10. Los links IMSLP se guardan
-- como nota interna en obras.observaciones.
-- Respeta schema: obras (titulo, duracion_segundos, observaciones, estado),
-- obras_compositores y repertorio_obras.

DO $$
DECLARE
  _id_programa bigint := 10;
  _block_id bigint;
  _next_orden int;
  _id_obra bigint;
  _id_falla bigint;
  _titulo text;
  _nota text;
BEGIN
  -- 1) Obtener el primer bloque de repertorio existente para la gira 10 (por orden).
  SELECT id INTO _block_id
  FROM programas_repertorios
  WHERE id_programa = _id_programa
  ORDER BY orden ASC
  LIMIT 1;

  IF _block_id IS NULL THEN
    RAISE EXCEPTION 'No existe ningún bloque de repertorio para la gira (id_programa) %. Crear uno antes de ejecutar este script.', _id_programa;
  END IF;

  SELECT COALESCE(MAX(orden), 0) + 1 INTO _next_orden
  FROM repertorio_obras
  WHERE id_repertorio = _block_id;

  -- 2) Resolver o crear compositor: Manuel de Falla.
  SELECT id INTO _id_falla
  FROM compositores
  WHERE apellido = 'Falla'
    AND (nombre = 'Manuel de' OR nombre IS NULL)
  LIMIT 1;

  IF _id_falla IS NULL THEN
    INSERT INTO compositores (apellido, nombre)
    VALUES ('Falla', 'Manuel de')
    RETURNING id INTO _id_falla;
  END IF;

  -- 3) Fanfare pour une fête.
  _titulo := 'Fanfare pour une fête';
  _nota := 'https://imslp.org/wiki/Fanfare_pour_une_f%C3%AAte_(Falla%2C_Manuel_de)';

  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id
  WHERE oc.id_compositor = _id_falla
    AND lower(trim(regexp_replace(o.titulo, '<[^>]*>', '', 'g'))) = lower(_titulo)
  ORDER BY o.id
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, duracion_segundos, estado, observaciones)
    VALUES (_titulo, NULL, 'Solicitud', _nota)
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_falla, 'compositor');
  ELSE
    UPDATE obras
    SET
      estado = 'Solicitud',
      observaciones = CASE
        WHEN COALESCE(trim(observaciones), '') = '' THEN _nota
        WHEN position(_nota in observaciones) > 0 THEN observaciones
        ELSE observaciones || E'\n' || _nota
      END
    WHERE id = _id_obra;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM repertorio_obras
    WHERE id_repertorio = _block_id
      AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, _next_orden);
    _next_orden := _next_orden + 1;
  END IF;

  -- 4) Fanfare sobre el nombre de Enrique Fernández Arbós.
  _titulo := 'Fanfare sobre el nombre de Enrique Fernández Arbós';
  _nota := 'https://imslp.org/wiki/Homenajes_(Falla%2C_Manuel_de)';

  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id
  WHERE oc.id_compositor = _id_falla
    AND lower(trim(regexp_replace(o.titulo, '<[^>]*>', '', 'g'))) = lower(_titulo)
  ORDER BY o.id
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, duracion_segundos, estado, observaciones)
    VALUES (_titulo, NULL, 'Solicitud', _nota)
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_falla, 'compositor');
  ELSE
    UPDATE obras
    SET
      estado = 'Solicitud',
      observaciones = CASE
        WHEN COALESCE(trim(observaciones), '') = '' THEN _nota
        WHEN position(_nota in observaciones) > 0 THEN observaciones
        ELSE observaciones || E'\n' || _nota
      END
    WHERE id = _id_obra;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM repertorio_obras
    WHERE id_repertorio = _block_id
      AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, _next_orden);
  END IF;
END $$;
