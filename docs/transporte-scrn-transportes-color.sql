-- Color de interfaz por transporte (hex #RGB o #RRGGBB), usado en calendario, recorridos y listas.

ALTER TABLE public.scrn_transportes
  ADD COLUMN IF NOT EXISTS color text;

UPDATE public.scrn_transportes
SET color = '#64748b'
WHERE color IS NULL OR btrim(color) = '';

ALTER TABLE public.scrn_transportes
  ALTER COLUMN color SET DEFAULT '#64748b';

ALTER TABLE public.scrn_transportes
  ALTER COLUMN color SET NOT NULL;

ALTER TABLE public.scrn_transportes
  DROP CONSTRAINT IF EXISTS scrn_transportes_color_hex_check;

ALTER TABLE public.scrn_transportes
  ADD CONSTRAINT scrn_transportes_color_hex_check
  CHECK (color ~* '^#([0-9a-f]{3}|[0-9a-f]{6})$');

COMMENT ON COLUMN public.scrn_transportes.color IS
  'Color UI (hex) para unificar recorridos y filas vinculadas a este id_transporte.';
