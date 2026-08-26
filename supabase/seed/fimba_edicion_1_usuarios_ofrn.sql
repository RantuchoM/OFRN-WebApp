-- Seed: usuarios FIMBA 2026 (id_edicion = 1) para staff OFRN nombrados.
-- Clave: copia integrantes.clave_acceso (mismo login OFRN sirve en /fimba/login).
-- Idempotente: upsert por lower(mail)+id_edicion.
-- Confirmados en integrantes (2026-08-26):
--   Mauricio Charbonnier  charbonniermauricio@gmail.com  → editor_general
--   Claudio Rossi         claudiorossi194@gmail.com      → consulta
--   Martín Vidondo        martinvidondo@outlook.com      → editor_general
--   Martín Fraile         martinfraile@gmail.com         → editor_general
--   Julián Milanesi       milanesijulian@gmail.com       → editor_general
-- Nota: quienes ya son isManagement entran por intranet OFRN; la fila documenta
-- el grant y habilita /fimba/login. Claudio (produccion_general) queda RO vía
-- override resolveFimbaAccess (ofrn_fimba_consulta).

BEGIN;

CREATE TEMP TABLE _fimba_seed_usuarios (
  mail text PRIMARY KEY,
  nombre text NOT NULL,
  rol_fimba text NOT NULL
) ON COMMIT DROP;

INSERT INTO _fimba_seed_usuarios (mail, nombre, rol_fimba) VALUES
  ('charbonniermauricio@gmail.com', 'Mauricio Charbonnier', 'editor_general'),
  ('claudiorossi194@gmail.com', 'Claudio Rossi', 'consulta'),
  ('martinvidondo@outlook.com', 'Martín Vidondo', 'editor_general'),
  ('martinfraile@gmail.com', 'Martín Fraile Milstein', 'editor_general'),
  ('milanesijulian@gmail.com', 'Julián Milanesi', 'editor_general');

UPDATE public.fimba_usuarios u
SET
  nombre = s.nombre,
  rol_fimba = s.rol_fimba,
  activo = true,
  clave_acceso = COALESCE(
    NULLIF(btrim(i.clave_acceso), ''),
    u.clave_acceso
  ),
  updated_at = now()
FROM _fimba_seed_usuarios s
LEFT JOIN public.integrantes i ON lower(btrim(i.mail)) = lower(s.mail)
WHERE lower(u.mail) = lower(s.mail)
  AND u.id_edicion = 1;

INSERT INTO public.fimba_usuarios (
  mail, nombre, rol_fimba, id_edicion, clave_acceso, activo
)
SELECT
  s.mail,
  s.nombre,
  s.rol_fimba,
  1,
  NULLIF(btrim(i.clave_acceso), ''),
  true
FROM _fimba_seed_usuarios s
LEFT JOIN public.integrantes i ON lower(btrim(i.mail)) = lower(s.mail)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.fimba_usuarios u
  WHERE lower(u.mail) = lower(s.mail)
    AND u.id_edicion = 1
);

COMMIT;
