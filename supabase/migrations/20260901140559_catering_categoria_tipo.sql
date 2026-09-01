-- Categoría de agenda «Catering» (hermana de Comidas / Ensayos / Transporte).
-- FIMBA y UnifiedAgenda filtran por tipos_evento.id_categoria; una categoría
-- sin tipo asignado no aparece en el dropdown (caso actual: «Reunión»).
-- No usa id_categoria = 4 (Comidas): no entra a logística de viandas OFRN.

INSERT INTO public.categorias_tipos_eventos (nombre)
SELECT 'Catering'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categorias_tipos_eventos
  WHERE lower(btrim(nombre)) = 'catering'
);

INSERT INTO public.tipos_evento (nombre, color, id_categoria)
SELECT 'Catering', '#ea580c', c.id
FROM public.categorias_tipos_eventos c
WHERE lower(btrim(c.nombre)) = 'catering'
  AND NOT EXISTS (
    SELECT 1
    FROM public.tipos_evento t
    WHERE t.id_categoria = c.id
      AND lower(btrim(t.nombre)) = 'catering'
  );
