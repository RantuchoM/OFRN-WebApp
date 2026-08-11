-- FIMBA: flags early check-in / late check-out en propuesta (artista).
-- OFRN hospedaje usa fecha+hora en programas_hospedajes; FIMBA solo fecha + flags
-- operativos para hotelería/reportes (sin clonar tramos ni horas).

ALTER TABLE public.fimba_propuestas
  ADD COLUMN IF NOT EXISTS checkin_early boolean NOT NULL DEFAULT false;

ALTER TABLE public.fimba_propuestas
  ADD COLUMN IF NOT EXISTS checkout_late boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.fimba_propuestas.checkin_early IS
  'Early check-in solicitado/acordado para el artista (además de checkin_at).';

COMMENT ON COLUMN public.fimba_propuestas.checkout_late IS
  'Late check-out solicitado/acordado para el artista (además de checkout_at).';
