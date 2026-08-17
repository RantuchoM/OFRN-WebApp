-- Al borrar una obra usada como referencia de arreglo, eliminar la fila entera.
-- ON DELETE SET NULL + arreglos_referencias_has_target fallaba cuando link era NULL
-- (p. ej. al eliminar una solicitud referenciada por otro encargo).

ALTER TABLE public.arreglos_referencias
  DROP CONSTRAINT IF EXISTS arreglos_referencias_id_obra_referencia_fkey;

ALTER TABLE public.arreglos_referencias
  ADD CONSTRAINT arreglos_referencias_id_obra_referencia_fkey
  FOREIGN KEY (id_obra_referencia)
  REFERENCES public.obras(id)
  ON DELETE CASCADE;
