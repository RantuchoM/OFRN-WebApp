-- FIMBA: carpeta Google Drive de documentación por artista (propuesta).
-- URL o ID de carpeta; el listado en-app usa edge function manage-drive (OAuth Archivo).

ALTER TABLE public.fimba_propuestas
  ADD COLUMN IF NOT EXISTS carpeta_documentacion text;

COMMENT ON COLUMN public.fimba_propuestas.carpeta_documentacion IS
  'Carpeta de documentación del artista en Google Drive (URL completa y/o ID de carpeta). Preview via manage-drive list_folder_files.';
