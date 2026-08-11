-- FIMBA: carpeta Google Drive de documentación por contratación (no por artista).
-- Copia valores legados de fimba_propuestas.carpeta_documentacion a la primera
-- contratación del artista (orden ASC, id ASC) y elimina la columna en propuestas.

ALTER TABLE public.fimba_contrataciones
  ADD COLUMN IF NOT EXISTS carpeta_documentacion text;

COMMENT ON COLUMN public.fimba_contrataciones.carpeta_documentacion IS
  'Carpeta de documentación del expediente en Google Drive (URL y/o ID). Preview via manage-drive list_folder_files.';

-- Solo si aún existe la columna legada en propuestas:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fimba_propuestas'
      AND column_name = 'carpeta_documentacion'
  ) THEN
    -- 1:1 o multi: adjunta a la primera contratación del artista sin carpeta
    WITH ranked AS (
      SELECT
        c.id AS contratacion_id,
        p.carpeta_documentacion AS carpeta,
        ROW_NUMBER() OVER (
          PARTITION BY p.id
          ORDER BY c.orden ASC NULLS LAST, c.id ASC
        ) AS rn
      FROM public.fimba_propuestas p
      INNER JOIN public.fimba_contrataciones c
        ON c.id_propuesta = p.id
      WHERE p.carpeta_documentacion IS NOT NULL
        AND btrim(p.carpeta_documentacion) <> ''
        AND (c.carpeta_documentacion IS NULL OR btrim(c.carpeta_documentacion) = '')
    ),
    picked AS (
      SELECT contratacion_id, carpeta
      FROM ranked
      WHERE rn = 1
    )
    UPDATE public.fimba_contrataciones c
    SET
      carpeta_documentacion = picked.carpeta,
      updated_at = timezone('utc'::text, now())
    FROM picked
    WHERE c.id = picked.contratacion_id;

    ALTER TABLE public.fimba_propuestas
      DROP COLUMN IF EXISTS carpeta_documentacion;
  END IF;
END $$;
