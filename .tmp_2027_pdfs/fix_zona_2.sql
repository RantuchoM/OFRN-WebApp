UPDATE public.programas
SET zona = 'Valle / Atlántica'
WHERE id = 202
  AND coalesce(subtitulo, '') LIKE '%[seed:giras2027-sinf-cf]%';

SELECT id, nombre_gira, zona FROM public.programas WHERE id = 202;
