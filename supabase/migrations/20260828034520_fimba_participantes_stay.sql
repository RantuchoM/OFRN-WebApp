-- FIMBA: check-in / check-out por persona (override del rango del artista).
-- Vacío = hereda fimba_propuestas.checkin_at / checkout_at.
-- Caso: Daniel Ruggiero cuarteto — Ruggiero IN 15/9, el resto IN 16/9, OUT 18/9.

ALTER TABLE public.fimba_participantes
  ADD COLUMN IF NOT EXISTS checkin_at date,
  ADD COLUMN IF NOT EXISTS checkout_at date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fimba_participantes_stay_chk'
  ) THEN
    ALTER TABLE public.fimba_participantes
      ADD CONSTRAINT fimba_participantes_stay_chk
      CHECK (
        checkout_at IS NULL
        OR checkin_at IS NULL
        OR checkout_at >= checkin_at
      );
  END IF;
END $$;

COMMENT ON COLUMN public.fimba_participantes.checkin_at IS
  'Check-in propio. NULL = usa fimba_propuestas.checkin_at.';

COMMENT ON COLUMN public.fimba_participantes.checkout_at IS
  'Check-out propio. NULL = usa fimba_propuestas.checkout_at.';

-- Backfill operativo 2026 (edición 1): fechas que FIMBA no podía cargar por persona.
UPDATE public.fimba_participantes fp
SET
  checkin_at = v.checkin_at,
  checkout_at = v.checkout_at,
  updated_at = timezone('utc'::text, now())
FROM public.fimba_propuestas p
JOIN (
  VALUES
    ('ruggiero', DATE '2026-09-15', DATE '2026-09-18'),
    ('mastrocola', DATE '2026-09-16', DATE '2026-09-18'),
    ('longo', DATE '2026-09-16', DATE '2026-09-18'),
    ('negri', DATE '2026-09-16', DATE '2026-09-18')
) AS v(apellido, checkin_at, checkout_at) ON true
WHERE fp.id_propuesta = p.id
  AND p.id_edicion = 1
  AND lower(btrim(p.nombre)) = 'daniel ruggiero cuarteto'
  AND lower(btrim(fp.apellido)) = v.apellido;
