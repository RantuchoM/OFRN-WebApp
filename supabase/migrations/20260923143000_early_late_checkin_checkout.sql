-- Early check-in / late check-out como tipos de agenda de primera clase
-- y FKs opcionales en reglas logísticas (paridad check-in 22 / check-out 23).
-- Categoría Otros (id 5), igual que Check-in/Check-Out: visibles en UnifiedAgenda
-- sin quedar ocultos detrás de Transporte ni de Logística (id 3, default off).

INSERT INTO public.tipos_evento (id, nombre, color, id_categoria)
OVERRIDING SYSTEM VALUE
VALUES
  (40, 'Early check-in', '#0284c7', 5),
  (41, 'Late check-out', '#ea580c', 5)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  color = EXCLUDED.color,
  id_categoria = EXCLUDED.id_categoria;

SELECT setval(
  pg_get_serial_sequence('public.tipos_evento', 'id'),
  GREATEST(
    41,
    COALESCE((SELECT MAX(id) FROM public.tipos_evento), 41)
  )
);

ALTER TABLE public.giras_logistica_reglas
  ADD COLUMN IF NOT EXISTS id_evento_checkin_early integer,
  ADD COLUMN IF NOT EXISTS id_evento_checkout_late integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'giras_logistica_reglas_id_evento_checkin_early_fkey'
  ) THEN
    ALTER TABLE public.giras_logistica_reglas
      ADD CONSTRAINT giras_logistica_reglas_id_evento_checkin_early_fkey
      FOREIGN KEY (id_evento_checkin_early)
      REFERENCES public.eventos(id)
      ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'giras_logistica_reglas_id_evento_checkout_late_fkey'
  ) THEN
    ALTER TABLE public.giras_logistica_reglas
      ADD CONSTRAINT giras_logistica_reglas_id_evento_checkout_late_fkey
      FOREIGN KEY (id_evento_checkout_late)
      REFERENCES public.eventos(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

COMMENT ON COLUMN public.giras_logistica_reglas.id_evento_checkin_early IS
  'Evento Early check-in (tipos_evento=40, hora canónica 14:00). Media noche extra en reportes de hotel.';
COMMENT ON COLUMN public.giras_logistica_reglas.id_evento_checkout_late IS
  'Evento Late check-out (tipos_evento=41, hora canónica 10:00). Media noche extra en reportes de hotel.';
