-- Arreglador a notificar (integrante que recibe el mail de encargo)
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS id_integrante_arreglador bigint REFERENCES public.integrantes(id);
