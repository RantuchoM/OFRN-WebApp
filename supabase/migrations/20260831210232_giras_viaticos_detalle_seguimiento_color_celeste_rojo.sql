-- Amplía marcas de color del seguimiento de viáticos: celeste y rojo.
ALTER TABLE public.giras_viaticos_detalle
  DROP CONSTRAINT IF EXISTS giras_viaticos_detalle_seguimiento_color_check;

ALTER TABLE public.giras_viaticos_detalle
  ADD CONSTRAINT giras_viaticos_detalle_seguimiento_color_check
  CHECK (
    seguimiento_color IS NULL
    OR seguimiento_color = ANY (
      ARRAY[
        'amarillo'::text,
        'verde'::text,
        'celeste'::text,
        'rojo'::text
      ]
    )
  );

COMMENT ON COLUMN public.giras_viaticos_detalle.seguimiento_color IS
  'Marca visual de fila en Seguimiento de viáticos: amarillo | verde | celeste | rojo';
