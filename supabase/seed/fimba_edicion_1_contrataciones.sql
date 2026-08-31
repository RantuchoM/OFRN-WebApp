-- Seed one-shot / idempotent: contrataciones FIMBA 2026 (id_edicion = 1)
-- Fuente: "FIMBA 2026 - Contrataciones.csv" (planilla operativa).
-- Montos "$2,000,000" → numeric.
-- id_propuesta: fuzzy match por tokens (≥4 chars) / containment sobre
--   fimba_propuestas de la edición (paréntesis del nombre CSV se ignoran al matchear).
-- Idempotencia: no reinserta si ya hay misma id_edicion + nombre (ci) + orden + monto.
-- estado_log: solo filas nuevas con ultimo_estado_conocido; created_by_label = 'import CSV'.

BEGIN;

CREATE TEMP TABLE _fimba_seed_contrataciones (
  orden integer NOT NULL,
  numero_expediente text,
  nombre text NOT NULL,
  monto numeric,
  tipo_contratacion text NOT NULL DEFAULT 'Expediente',
  envio_firma_mfm_nota boolean NOT NULL DEFAULT false,
  nota_firmada boolean NOT NULL DEFAULT false,
  falta_documentacion boolean NOT NULL DEFAULT false,
  enviado_adm boolean NOT NULL DEFAULT false,
  ultimo_estado_conocido text
) ON COMMIT DROP;

INSERT INTO _fimba_seed_contrataciones (
  orden,
  numero_expediente,
  nombre,
  monto,
  tipo_contratacion,
  envio_firma_mfm_nota,
  nota_firmada,
  falta_documentacion,
  enviado_adm,
  ultimo_estado_conocido
) VALUES
  (1,  NULL, 'Duo Salinas', 2000000, 'Expediente', true,  true,  false, true,  'Enviado a ADM 7/08'),
  (2,  NULL, 'Alba Carmona y la Filarmónica', 7000000, 'Expediente', false, false, false, false, 'Factura presentada'),
  (3,  NULL, 'Climatización (Alquilo todo Bariloche)', NULL, 'Expediente', false, false, false, false, NULL),
  (4,  NULL, 'Streaming', NULL, 'Expediente', false, false, false, false, 'Factura emitida'),
  (5,  NULL, 'Chango Spasiuk', 15000000, 'Expediente', false, false, false, false, NULL),
  (6,  NULL, 'Daniel Ruggiero cuarteto', 3000000, 'Expediente', false, false, false, false, 'Factura pedida'),
  (7,  NULL, 'Paola Vazquez - capsula mercado de la musica', 2000000, 'Expediente', false, false, false, false, NULL),
  (8,  NULL, 'Hamilton de Holanda', NULL, 'Expediente', false, false, false, false, 'Pagado'),
  (9,  NULL, 'Iluminación Puerto San Carlos', NULL, 'Expediente', false, false, false, false, NULL),
  (10, NULL, 'Sonido Puerto San Carlos', NULL, 'Expediente', false, false, false, false, NULL),
  (11, NULL, 'King Crimson', 8000000, 'Expediente', false, false, false, false, NULL),
  (12, NULL, 'Cuarteto de cuerdas Atlas (Ruggiero factura)', 5000000, 'Expediente', false, false, false, false, NULL),
  (13, NULL, 'CAMBA (Camping musical Bariloche)', NULL, 'Expediente', false, false, false, false, NULL),
  (14, NULL, 'Raúl Traver - David Benitez. Esperando papeles, SALE ANTES', 2000000, 'Expediente', false, false, false, false, NULL),
  (15, NULL, 'Sol Liebeskind - pianista', 1700000, 'Expediente', false, false, false, false, NULL),
  (16, NULL, 'Guillo Espel', 1900000, 'Expediente', false, false, false, false, NULL),
  (17, NULL, 'Paola Vazquez - capsula mercado de la musica', 2000000, 'Expediente', false, false, false, false, NULL),
  (18, NULL, 'Lucio Bellora', NULL, 'Expediente', false, false, false, false, NULL),
  (19, NULL, 'Bob Marley sinfónico', NULL, 'Expediente', false, false, false, false, NULL);

-- Resolver id_propuesta fuzzy (mejor score de tokens / containment)
CREATE TEMP TABLE _fimba_seed_match ON COMMIT DROP AS
SELECT
  s.orden,
  s.nombre AS seed_nombre,
  m.id_propuesta,
  m.propuesta_nombre,
  m.score
FROM _fimba_seed_contrataciones s
LEFT JOIN LATERAL (
  SELECT
    p.id AS id_propuesta,
    p.nombre AS propuesta_nombre,
    sc.score
  FROM public.fimba_propuestas p
  CROSS JOIN LATERAL (
    SELECT
      (
        CASE
          WHEN lower(btrim(p.nombre)) = lower(btrim(s.nombre)) THEN 100
          WHEN lower(btrim(s.nombre)) LIKE lower(btrim(p.nombre)) || '%' THEN 90
          WHEN lower(
            regexp_replace(btrim(s.nombre), '\([^)]*\)', ' ', 'g')
          ) LIKE '%' || lower(btrim(p.nombre)) || '%' THEN 80
          WHEN lower(btrim(p.nombre)) LIKE '%' || lower(btrim(s.nombre)) || '%' THEN 70
          ELSE 0
        END
        + COALESCE((
          SELECT count(*)::int * 12
          FROM unnest(
            regexp_split_to_array(
              lower(
                regexp_replace(
                  translate(
                    regexp_replace(btrim(s.nombre), '\([^)]*\)', ' ', 'g'),
                    'áéíóúüñÁÉÍÓÚÜÑ',
                    'aeiouunAEIOUUN'
                  ),
                  '[^a-z0-9]+',
                  ' ',
                  'g'
                )
              ),
              '\s+'
            )
          ) AS tok
          WHERE length(tok) >= 4
            AND lower(
              translate(p.nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')
            ) LIKE '%' || tok || '%'
        ), 0)
      ) AS score
  ) sc
  WHERE p.id_edicion = 1
    AND sc.score >= 12
  ORDER BY sc.score DESC, length(p.nombre) DESC, p.id ASC
  LIMIT 1
) m ON true;

WITH inserted AS (
  INSERT INTO public.fimba_contrataciones (
    id_edicion,
    orden,
    numero_expediente,
    id_propuesta,
    nombre,
    monto,
    tipo_contratacion,
    envio_firma_mfm_nota,
    nota_firmada,
    falta_documentacion,
    enviado_adm,
    ultimo_estado_conocido
  )
  SELECT
    1,
    s.orden,
    s.numero_expediente,
    m.id_propuesta,
    s.nombre,
    s.monto,
    s.tipo_contratacion,
    s.envio_firma_mfm_nota,
    s.nota_firmada,
    s.falta_documentacion,
    s.enviado_adm,
    s.ultimo_estado_conocido
  FROM _fimba_seed_contrataciones s
  LEFT JOIN _fimba_seed_match m ON m.orden = s.orden
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.fimba_contrataciones c
    WHERE c.id_edicion = 1
      AND lower(btrim(c.nombre)) = lower(btrim(s.nombre))
      AND c.orden = s.orden
      AND c.monto IS NOT DISTINCT FROM s.monto
  )
  RETURNING
    id,
    orden,
    nombre,
    id_propuesta,
    ultimo_estado_conocido
)
INSERT INTO public.fimba_contrataciones_estado_log (
  id_contratacion,
  estado,
  created_by_label
)
SELECT
  i.id,
  btrim(i.ultimo_estado_conocido),
  'import CSV'
FROM inserted i
WHERE i.ultimo_estado_conocido IS NOT NULL
  AND btrim(i.ultimo_estado_conocido) <> ''
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_name = 'fimba_contrataciones_estado_log'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.fimba_contrataciones_estado_log l
    WHERE l.id_contratacion = i.id
      AND lower(btrim(l.estado)) = lower(btrim(i.ultimo_estado_conocido))
      AND l.created_by_label = 'import CSV'
  );

-- Diagnóstico de matches (visible en resultado de db query si el cliente lo muestra)
SELECT
  s.orden,
  s.nombre AS csv_nombre,
  m.id_propuesta,
  m.propuesta_nombre,
  m.score
FROM _fimba_seed_contrataciones s
LEFT JOIN _fimba_seed_match m ON m.orden = s.orden
ORDER BY s.orden;

COMMIT;
