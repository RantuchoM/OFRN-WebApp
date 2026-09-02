-- Backline FIMBA: campos operativos por concierto (eventos).
-- Planilla `/fimba/edicion/:id/backline` — una fila por evento tipo Concierto.

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS backline_descripcion text,
  ADD COLUMN IF NOT EXISTS backline_monto numeric,
  ADD COLUMN IF NOT EXISTS planta_escenario_url text;

COMMENT ON COLUMN public.eventos.backline_descripcion IS
  'Notas libres de backline / rider técnico del concierto (planilla FIMBA Backline). Distinto de eventos.descripcion (Detalle agenda).';

COMMENT ON COLUMN public.eventos.backline_monto IS
  'Monto asociado al backline del concierto (ARS). Nullable.';

COMMENT ON COLUMN public.eventos.planta_escenario_url IS
  'URL externa de planta de escenario (p.ej. Google Drive). Complementa stage_plot_eventos / RiderMaker interno.';
