-- FIMBA: rider logístico rich-text por artista (propuesta).
-- HTML (Quill); vacío / solo whitespace se persiste como NULL en app.

ALTER TABLE public.fimba_propuestas
  ADD COLUMN IF NOT EXISTS rider text;

COMMENT ON COLUMN public.fimba_propuestas.rider IS
  'Rider logístico del artista (HTML rich-text). NULL si vacío.';
