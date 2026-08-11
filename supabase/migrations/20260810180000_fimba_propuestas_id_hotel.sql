-- FIMBA: enlace opcional de propuesta (artista) a catálogo de hoteles OFRN.
-- Mínimo para reportes de hotelería; no clona rooming ni programas_hospedajes.

ALTER TABLE public.fimba_propuestas
  ADD COLUMN IF NOT EXISTS id_hotel bigint
    REFERENCES public.hoteles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fimba_propuestas_id_hotel_idx
  ON public.fimba_propuestas (id_hotel)
  WHERE id_hotel IS NOT NULL;

COMMENT ON COLUMN public.fimba_propuestas.id_hotel IS
  'Hotel preferido/asignado del artista (catálogo public.hoteles). Opcional; cupos hotel = cantidad_planificada.';
