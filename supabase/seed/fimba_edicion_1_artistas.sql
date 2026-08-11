-- Seed one-shot / idempotent: artistas + participantes para FIMBA 2026 (id_edicion = 1)
-- Fuente: planilla operativa (capturas). Año fechas: 2026.
-- Idempotencia: no inserta propuesta si ya existe mismo nombre en la edición;
--   participantes solo si la propuesta quedó recién creada en esta corrida.
-- Nota: fila "David Benitez" visible en captura superior sin nombre de artista legible → omitida.

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
  activo boolean NOT NULL DEFAULT true
) ON COMMIT DROP;

INSERT INTO _fimba_seed_propuestas (
  nombre, orden, color, cantidad_planificada, plazas_extra_materiales, checkin_at, checkout_at, estado
) VALUES
  ('Sol Liebeskind', 0, '#d73289', 2, 0, DATE '2026-09-18', DATE '2026-09-20', 'activa'),
  ('Guillo Espel', 1, '#00b1eb', 4, 0, DATE '2026-09-19', DATE '2026-09-20', 'activa'),
  ('DUO Salsano I Salinas', 2, '#94216D', 2, 0, DATE '2026-09-20', DATE '2026-09-21', 'activa');

-- Sol Liebeskind (qty 2)
INSERT INTO _fimba_seed_participantes (propuesta_nombre, nombre, apellido) VALUES
  ('Sol Liebeskind', 'Sol', 'Liebeskind'),
  ('Sol Liebeskind', 'Musico Sol', 'Liebeskind');

-- Guillo Espel: planilla "xxx" ×4 → Por confirmar
INSERT INTO _fimba_seed_participantes (propuesta_nombre, nombre, apellido) VALUES
  ('Guillo Espel', 'Por confirmar', ''),
  ('Guillo Espel', 'Por confirmar', ''),
  ('Guillo Espel', 'Por confirmar', ''),
  ('Guillo Espel', 'Por confirmar', '');

-- DUO Salsano I Salinas (qty 2)
INSERT INTO _fimba_seed_participantes (propuesta_nombre, nombre, apellido) VALUES
  ('DUO Salsano I Salinas', 'Lilia Beatriz', 'Salsano'),
  ('DUO Salsano I Salinas', 'Daniela Noemi', 'Salinas');

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
  activo
)
SELECT
  i.id,
  sp.nombre,
  sp.apellido,
  sp.tipo_alimentacion,
  sp.activo
FROM inserted i
JOIN _fimba_seed_participantes sp ON sp.propuesta_nombre = i.nombre;

COMMIT;

-- Verificación
SELECT
  p.id AS id_propuesta,
  p.nombre AS artista,
  p.cantidad_planificada,
  p.checkin_at,
  p.checkout_at,
  count(fp.id) FILTER (WHERE fp.activo) AS participantes_activos
FROM public.fimba_propuestas p
LEFT JOIN public.fimba_participantes fp ON fp.id_propuesta = p.id
WHERE p.id_edicion = 1
GROUP BY p.id, p.nombre, p.cantidad_planificada, p.checkin_at, p.checkout_at
ORDER BY p.orden, p.nombre;
