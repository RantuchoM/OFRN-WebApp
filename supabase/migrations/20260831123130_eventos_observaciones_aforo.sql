-- Observaciones de aforo por evento (solo conciertos en UI).
-- Distinto de locaciones.capacidad (aforo numérico del venue) y de
-- fimba_venue_info.observaciones (metadata operativa por edición+locación).

alter table public.eventos
  add column if not exists observaciones_aforo text;

comment on column public.eventos.observaciones_aforo is
  'Notas de aforo del espectáculo (texto libre). Por evento, no por locación.';
