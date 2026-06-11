-- Completar calendario feriados Argentina 2026 (oficial)
-- Faltaban 2 días no laborables; corrección de detalle 2/4 (Malvinas, no Jueves Santo).

INSERT INTO public.feriados (fecha, detalle, es_feriado)
VALUES
  ('2026-07-10', 'Puente', false),
  ('2026-12-07', 'Puente', false)
ON CONFLICT (fecha) DO NOTHING;

UPDATE public.feriados
SET detalle = 'Día del Veterano y de los Caídos en la Guerra de Malvinas'
WHERE fecha = '2026-04-02';
