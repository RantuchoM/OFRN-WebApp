-- Justificación obligatoria al marcar «Se ensayó igual».
-- Nullable: ensayos sin resolver quedan en null.
-- ADD COLUMN text NULL es catalog-only (no reescribe filas ni updated_at).
-- Un UPDATE que incluye este texto es editorial: sí pisa updated_at (pulso
-- de ese evento). El trigger sigue ignorando cambios SOLO de ensayo_pese_conflicto.

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS ensayo_pese_conflicto_justificacion text;

COMMENT ON COLUMN public.eventos.ensayo_pese_conflicto_justificacion IS
  'Motivo obligatorio al marcar ensayo_pese_conflicto (Se ensayó igual).';
