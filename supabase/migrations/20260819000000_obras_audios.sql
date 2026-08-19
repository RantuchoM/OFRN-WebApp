-- Audios Drive de una obra (uno o más movimientos). Identificados a mano en WorkForm / DriveMatcher.
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS audios jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.obras.audios IS
  'Array de { drive_file_id, name, url, label } con mp3/wav de la carpeta Drive, en orden de reproducción.';
