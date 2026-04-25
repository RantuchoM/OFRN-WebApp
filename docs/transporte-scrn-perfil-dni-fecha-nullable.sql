-- scrn_perfiles: DNI y fecha de nacimiento opcionales (altas vía create-scrn-perfil sin esos datos).
-- Ejecutar en SQL Editor de Supabase si el INSERT falla con NOT NULL o CHECK en dni.
--
-- 1) Quitar NOT NULL si aplica
ALTER TABLE public.scrn_perfiles
  ALTER COLUMN dni DROP NOT NULL;

ALTER TABLE public.scrn_perfiles
  ALTER COLUMN fecha_nacimiento DROP NOT NULL;

-- 2) Si tenías un CHECK que obliga DNI numérico y usabas texto tipo 'PENDIENTE', relajar o borrarlo.
--    El nombre del constraint varía: buscá en information_schema o en el error al insertar.
-- Ejemplo (ajustar nombre real del constraint):
-- ALTER TABLE public.scrn_perfiles DROP CONSTRAINT IF EXISTS scrn_perfiles_dni_check;
