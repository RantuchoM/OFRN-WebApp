-- Ícono raster opcional (PNG/WebP) para el plano de escenario.
-- El binario vive en Storage. La columna guarda solo la URL pública.
-- Si stage_plot_raster_url está seteada, el lienzo la prefiere sobre svg_icon.

ALTER TABLE public.instrumentos
  ADD COLUMN IF NOT EXISTS stage_plot_raster_url text;

ALTER TABLE public.instrumentos
  DROP CONSTRAINT IF EXISTS instrumentos_stage_plot_raster_url_check;

ALTER TABLE public.instrumentos
  ADD CONSTRAINT instrumentos_stage_plot_raster_url_check
  CHECK (
    stage_plot_raster_url IS NULL
    OR (
      char_length(stage_plot_raster_url) BETWEEN 12 AND 2000
      AND stage_plot_raster_url ~ '^https://[^[:space:]]+$'
    )
  );

COMMENT ON COLUMN public.instrumentos.stage_plot_raster_url IS
  'URL pública PNG/WebP en el bucket stage-plot-icons. Si está seteada, el plano la muestra en lugar de svg_icon.';

ALTER TABLE public.elementos_escenario
  ADD COLUMN IF NOT EXISTS stage_plot_raster_url text;

ALTER TABLE public.elementos_escenario
  DROP CONSTRAINT IF EXISTS elementos_escenario_stage_plot_raster_url_check;

ALTER TABLE public.elementos_escenario
  ADD CONSTRAINT elementos_escenario_stage_plot_raster_url_check
  CHECK (
    stage_plot_raster_url IS NULL
    OR (
      char_length(stage_plot_raster_url) BETWEEN 12 AND 2000
      AND stage_plot_raster_url ~ '^https://[^[:space:]]+$'
    )
  );

COMMENT ON COLUMN public.elementos_escenario.stage_plot_raster_url IS
  'URL pública PNG/WebP en el bucket stage-plot-icons. Si está seteada, el plano la muestra en lugar de svg_icon.';

-- Bucket público: el lienzo, la paleta y el PDF cargan la URL sin firmar.
-- Tope 1 MB y solo PNG/WebP. Escritura anon + authenticated, igual que el
-- resto de Escenario (el cliente de la app usa la anon key; el gate es canEdit).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stage-plot-icons',
  'stage-plot-icons',
  true,
  1048576,
  ARRAY['image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "stage-plot-icons public read" ON storage.objects;
CREATE POLICY "stage-plot-icons public read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'stage-plot-icons');

DROP POLICY IF EXISTS "stage-plot-icons insert" ON storage.objects;
CREATE POLICY "stage-plot-icons insert"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'stage-plot-icons'
  AND (
    name LIKE 'instrumentos/%'
    OR name LIKE 'elementos/%'
  )
);

DROP POLICY IF EXISTS "stage-plot-icons update" ON storage.objects;
CREATE POLICY "stage-plot-icons update"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'stage-plot-icons')
WITH CHECK (
  bucket_id = 'stage-plot-icons'
  AND (
    name LIKE 'instrumentos/%'
    OR name LIKE 'elementos/%'
  )
);

DROP POLICY IF EXISTS "stage-plot-icons delete" ON storage.objects;
CREATE POLICY "stage-plot-icons delete"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'stage-plot-icons'
  AND (
    name LIKE 'instrumentos/%'
    OR name LIKE 'elementos/%'
  )
);
