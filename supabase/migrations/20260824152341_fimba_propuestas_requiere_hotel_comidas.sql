-- FIMBA: toggles por artista (propuesta) para hotelería y comidas.
-- Default true = se incluyen en reportes/exportaciones (comportamiento histórico).

ALTER TABLE public.fimba_propuestas
  ADD COLUMN IF NOT EXISTS requiere_hotel boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS requiere_comidas boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.fimba_propuestas.requiere_hotel IS
  'Si false, el artista se excluye de hotelería (pedido, rooming, Excel, totales camas-noche).';

COMMENT ON COLUMN public.fimba_propuestas.requiere_comidas IS
  'Si false, el artista se excluye de comidas (cubiertos por día, excepciones, Excel/PDF/texto).';
