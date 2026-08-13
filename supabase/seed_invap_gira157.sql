-- Asignar Show Invap al repertorio programa 157 (id_repertorio=132)
-- Generado: 2026-08-12
-- Existentes Lema: 3303, 3317, 3305, 3308, 3304, 3306
-- Nuevas: 3566, 3567, 3568, 3569

DO $$
DECLARE
  _orden int;
  _id_obra bigint;
BEGIN
  SELECT COALESCE(MAX(orden), 0) INTO _orden
  FROM repertorio_obras WHERE id_repertorio = 132;

  _id_obra := 3303;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 132 AND id_obra = _id_obra
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (132, _id_obra, _orden);
    RAISE NOTICE 'Agregada obra % en orden %', _id_obra, _orden;
  ELSE
    RAISE NOTICE 'Obra % ya estaba en repertorio 132', _id_obra;
  END IF;

  _id_obra := 3317;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 132 AND id_obra = _id_obra
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (132, _id_obra, _orden);
    RAISE NOTICE 'Agregada obra % en orden %', _id_obra, _orden;
  ELSE
    RAISE NOTICE 'Obra % ya estaba en repertorio 132', _id_obra;
  END IF;

  _id_obra := 3305;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 132 AND id_obra = _id_obra
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (132, _id_obra, _orden);
    RAISE NOTICE 'Agregada obra % en orden %', _id_obra, _orden;
  ELSE
    RAISE NOTICE 'Obra % ya estaba en repertorio 132', _id_obra;
  END IF;

  _id_obra := 3308;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 132 AND id_obra = _id_obra
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (132, _id_obra, _orden);
    RAISE NOTICE 'Agregada obra % en orden %', _id_obra, _orden;
  ELSE
    RAISE NOTICE 'Obra % ya estaba en repertorio 132', _id_obra;
  END IF;

  _id_obra := 3304;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 132 AND id_obra = _id_obra
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (132, _id_obra, _orden);
    RAISE NOTICE 'Agregada obra % en orden %', _id_obra, _orden;
  ELSE
    RAISE NOTICE 'Obra % ya estaba en repertorio 132', _id_obra;
  END IF;

  _id_obra := 3306;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 132 AND id_obra = _id_obra
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (132, _id_obra, _orden);
    RAISE NOTICE 'Agregada obra % en orden %', _id_obra, _orden;
  ELSE
    RAISE NOTICE 'Obra % ya estaba en repertorio 132', _id_obra;
  END IF;

  _id_obra := 3566;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 132 AND id_obra = _id_obra
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (132, _id_obra, _orden);
    RAISE NOTICE 'Agregada obra % en orden %', _id_obra, _orden;
  ELSE
    RAISE NOTICE 'Obra % ya estaba en repertorio 132', _id_obra;
  END IF;

  _id_obra := 3567;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 132 AND id_obra = _id_obra
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (132, _id_obra, _orden);
    RAISE NOTICE 'Agregada obra % en orden %', _id_obra, _orden;
  ELSE
    RAISE NOTICE 'Obra % ya estaba en repertorio 132', _id_obra;
  END IF;

  _id_obra := 3568;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 132 AND id_obra = _id_obra
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (132, _id_obra, _orden);
    RAISE NOTICE 'Agregada obra % en orden %', _id_obra, _orden;
  ELSE
    RAISE NOTICE 'Obra % ya estaba en repertorio 132', _id_obra;
  END IF;

  _id_obra := 3569;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = 132 AND id_obra = _id_obra
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (132, _id_obra, _orden);
    RAISE NOTICE 'Agregada obra % en orden %', _id_obra, _orden;
  ELSE
    RAISE NOTICE 'Obra % ya estaba en repertorio 132', _id_obra;
  END IF;

END $$;
