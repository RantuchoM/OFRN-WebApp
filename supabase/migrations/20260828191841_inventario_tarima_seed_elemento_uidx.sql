-- Seed tarima default + unique stock por elemento.

INSERT INTO public.inventario_items (categoria, nombre, cantidad)
SELECT v.categoria, v.nombre, 0
FROM (VALUES
  ('silla', 'Sillas'),
  ('banqueta', 'Banquetas'),
  ('atril', 'Atriles')
) AS v(categoria, nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventario_items i WHERE i.categoria = v.categoria
);

INSERT INTO public.inventario_items (categoria, nombre, cantidad, ancho_cm, profundo_cm, forma)
SELECT 'tarima', 'Tarima 200 × 100 cm', 0, 200, 100, 'rect'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.inventario_items i
  WHERE i.categoria = 'tarima'
    AND i.forma = 'rect'
    AND i.ancho_cm = 200
    AND i.profundo_cm = 100
);

CREATE UNIQUE INDEX IF NOT EXISTS inventario_items_elemento_uidx
  ON public.inventario_items (elemento_escenario_id)
  WHERE categoria = 'elemento' AND elemento_escenario_id IS NOT NULL;
