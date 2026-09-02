-- Backline FIMBA: nombre legible de la planta Drive (chip), junto a la URL.

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS planta_escenario_nombre text;

COMMENT ON COLUMN public.eventos.planta_escenario_nombre IS
  'Nombre legible de la planta de escenario (archivo Drive). Se muestra en chip Backline; complementa planta_escenario_url.';
