-- Seed one-shot / idempotent: lote 2 artistas + participantes FIMBA 2026 (id_edicion = 1)
-- Fuente: planilla operativa (hoja omitida en seed 1). Año fechas: 2026.
-- Idempotencia: no inserta propuesta si ya existe mismo nombre (case-insensitive) en la edición;
--   participantes solo si la propuesta quedó recién creada en esta corrida.
-- Grupos grandes (Orquesta 120 / Coro 96): solo cantidad_planificada, sin placeholders de personas.
-- King Crimsom (planilla) → nombre canónico King Crimson.
-- Daniel Ruggiero cuarteto: IN por persona distinto → checkin_at = earliest IN (15/9), checkout_at = OUT común (18/9).

BEGIN;

CREATE TEMP TABLE _fimba_seed_propuestas (
  nombre text PRIMARY KEY,
  orden integer NOT NULL,
  color text,
  cantidad_planificada integer NOT NULL,
  plazas_extra_materiales integer NOT NULL DEFAULT 0,
  checkin_at date,
  checkout_at date,
  estado text NOT NULL DEFAULT 'activa'
) ON COMMIT DROP;

CREATE TEMP TABLE _fimba_seed_participantes (
  propuesta_nombre text NOT NULL,
  nombre text NOT NULL,
  apellido text NOT NULL,
  tipo_alimentacion text NOT NULL DEFAULT 'regular',
  activo boolean NOT NULL DEFAULT true,
  checkin_at date,
  checkout_at date
) ON COMMIT DROP;

INSERT INTO _fimba_seed_propuestas (
  nombre, orden, color, cantidad_planificada, plazas_extra_materiales, checkin_at, checkout_at, estado
) VALUES
  ('Orquesta Infantil Argentina', 3, '#d73289', 120, 0, DATE '2026-09-13', DATE '2026-09-17', 'activa'),
  ('Alba Carmona', 4, '#00b1eb', 3, 0, DATE '2026-09-15', DATE '2026-09-17', 'activa'),
  ('Filarmónica, CPN y Cecilia Eguiarte', 5, '#94216D', 1, 0, DATE '2026-09-13', DATE '2026-09-21', 'activa'),
  ('Daniel Ruggiero cuarteto', 6, '#2AC4EA', 4, 0, DATE '2026-09-15', DATE '2026-09-18', 'activa'),
  ('The Camarada Tango Quartet', 7, '#d73289', 4, 0, DATE '2026-09-15', DATE '2026-09-18', 'activa'),
  ('King Crimson', 8, '#00b1eb', 7, 0, DATE '2026-09-17', DATE '2026-09-20', 'activa'),
  ('Cuarteto Atlas', 9, '#94216D', 4, 0, DATE '2026-09-17', DATE '2026-09-21', 'activa'),
  ('Coro Polifónico Nacional', 10, '#2AC4EA', 96, 0, DATE '2026-09-17', DATE '2026-09-20', 'activa'),
  ('Raúl Traver', 11, '#d73289', 2, 0, DATE '2026-09-18', DATE '2026-09-20', 'activa');

-- Orquesta Infantil Argentina / Coro Polifónico Nacional: sin filas de participantes (cupo en plan).

-- Alba Carmona (qty 3)
INSERT INTO _fimba_seed_participantes (propuesta_nombre, nombre, apellido) VALUES
  ('Alba Carmona', 'Alba', 'Carmona'),
  ('Alba Carmona', 'Francisco', 'Jesus'),
  ('Alba Carmona', 'Alejandra', 'Villareal');

-- Filarmónica, CPN y Cecilia Eguiarte (qty 1)
INSERT INTO _fimba_seed_participantes (propuesta_nombre, nombre, apellido) VALUES
  ('Filarmónica, CPN y Cecilia Eguiarte', 'Cecilia', 'Eguiarte');

-- Daniel Ruggiero cuarteto (qty 4) — IN por persona: Ruggiero 15/9, resto 16/9; OUT 18/9
INSERT INTO _fimba_seed_participantes (propuesta_nombre, nombre, apellido, checkin_at, checkout_at) VALUES
  ('Daniel Ruggiero cuarteto', 'Osvaldo Daniel', 'Ruggiero', DATE '2026-09-15', DATE '2026-09-18'),
  ('Daniel Ruggiero cuarteto', 'Nicolas Adrián', 'Mastrocola', DATE '2026-09-16', DATE '2026-09-18'),
  ('Daniel Ruggiero cuarteto', 'Emilio Carlos', 'Longo', DATE '2026-09-16', DATE '2026-09-18'),
  ('Daniel Ruggiero cuarteto', 'Facundo Nahuel', 'Negri', DATE '2026-09-16', DATE '2026-09-18');

-- The Camarada Tango Quartet (qty 4)
INSERT INTO _fimba_seed_participantes (propuesta_nombre, nombre, apellido) VALUES
  ('The Camarada Tango Quartet', 'Beth Ross', 'Buckley'),
  ('The Camarada Tango Quartet', 'Andrés', 'Martín'),
  ('The Camarada Tango Quartet', 'David', 'Buckley'),
  ('The Camarada Tango Quartet', 'Dana', 'Burnett');

-- King Crimson (qty 7; planilla: King Crimsom)
INSERT INTO _fimba_seed_participantes (propuesta_nombre, nombre, apellido) VALUES
  ('King Crimson', 'Gonzalo', 'Arias'),
  ('King Crimson', 'Steve', 'Ball'),
  ('King Crimson', 'Martín De', 'Aguirre'),
  ('King Crimson', 'Fernando', 'Kabusacki'),
  ('King Crimson', 'Claudio La', 'Falce'),
  ('King Crimson', 'Luciano', 'Pietrafesa'),
  ('King Crimson', 'Yoyo', 'Sevilla');

-- Cuarteto Atlas (qty 4)
INSERT INTO _fimba_seed_participantes (propuesta_nombre, nombre, apellido) VALUES
  ('Cuarteto Atlas', 'Ricardo', 'Amado'),
  ('Cuarteto Atlas', 'Carlos', 'Mendes'),
  ('Cuarteto Atlas', 'Ricardo', 'Taboada'),
  ('Cuarteto Atlas', 'Ricardo', 'Santoro');

-- Raúl Traver (qty 2; incluye David Benitez omitido en seed 1)
INSERT INTO _fimba_seed_participantes (propuesta_nombre, nombre, apellido) VALUES
  ('Raúl Traver', 'Raúl', 'Traver'),
  ('Raúl Traver', 'David', 'Benitez');

-- Insert propuestas faltantes (edición 1)
WITH inserted AS (
  INSERT INTO public.fimba_propuestas (
    id_edicion,
    nombre,
    color,
    orden,
    cantidad_planificada,
    plazas_extra_materiales,
    checkin_at,
    checkout_at,
    estado
  )
  SELECT
    1,
    s.nombre,
    s.color,
    s.orden,
    s.cantidad_planificada,
    s.plazas_extra_materiales,
    s.checkin_at,
    s.checkout_at,
    s.estado
  FROM _fimba_seed_propuestas s
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.fimba_propuestas p
    WHERE p.id_edicion = 1
      AND lower(btrim(p.nombre)) = lower(btrim(s.nombre))
  )
  RETURNING id, nombre
)
INSERT INTO public.fimba_participantes (
  id_propuesta,
  nombre,
  apellido,
  tipo_alimentacion,
  activo,
  checkin_at,
  checkout_at
)
SELECT
  i.id,
  sp.nombre,
  sp.apellido,
  sp.tipo_alimentacion,
  sp.activo,
  sp.checkin_at,
  sp.checkout_at
FROM inserted i
JOIN _fimba_seed_participantes sp ON sp.propuesta_nombre = i.nombre;

COMMIT;

-- Verificación
SELECT
  p.id AS id_propuesta,
  p.nombre AS artista,
  p.orden,
  p.cantidad_planificada,
  p.checkin_at,
  p.checkout_at,
  count(fp.id) FILTER (WHERE fp.activo) AS participantes_activos
FROM public.fimba_propuestas p
LEFT JOIN public.fimba_participantes fp ON fp.id_propuesta = p.id
WHERE p.id_edicion = 1
GROUP BY p.id, p.nombre, p.orden, p.cantidad_planificada, p.checkin_at, p.checkout_at
ORDER BY p.orden, p.nombre;
