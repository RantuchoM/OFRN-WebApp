-- Permitir el mismo hotel en distintos tramos de una gira.
-- Reemplaza unique_program_hotel (id_programa, id_hotel), que impedía reutilizar
-- el mismo establecimiento al volver a una localidad más adelante.

ALTER TABLE public.programas_hospedajes
  DROP CONSTRAINT IF EXISTS unique_program_hotel;

DROP INDEX IF EXISTS public.unique_program_hotel;

-- Con tramos: una reserva por hotel y segmento.
CREATE UNIQUE INDEX IF NOT EXISTS programas_hospedajes_programa_hotel_segmento_uidx
  ON public.programas_hospedajes (id_programa, id_hotel, id_segmento)
  WHERE id_segmento IS NOT NULL;

-- Sin tramos / legacy (id_segmento NULL): una reserva por hotel y programa.
CREATE UNIQUE INDEX IF NOT EXISTS programas_hospedajes_programa_hotel_sin_segmento_uidx
  ON public.programas_hospedajes (id_programa, id_hotel)
  WHERE id_segmento IS NULL;
