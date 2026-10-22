-- Limpia inserción parcial del seed 2027
DELETE FROM public.eventos
WHERE id_gira IN (
  SELECT id FROM public.programas
  WHERE coalesce(subtitulo, '') LIKE '%[seed:giras2027-sinf-cf]%'
);

DELETE FROM public.giras_fuentes
WHERE id_gira IN (
  SELECT id FROM public.programas
  WHERE coalesce(subtitulo, '') LIKE '%[seed:giras2027-sinf-cf]%'
);

DELETE FROM public.giras_integrantes
WHERE id_gira IN (
  SELECT id FROM public.programas
  WHERE coalesce(subtitulo, '') LIKE '%[seed:giras2027-sinf-cf]%'
);

DELETE FROM public.giras_localidades
WHERE id_gira IN (
  SELECT id FROM public.programas
  WHERE coalesce(subtitulo, '') LIKE '%[seed:giras2027-sinf-cf]%'
);

DELETE FROM public.programas
WHERE coalesce(subtitulo, '') LIKE '%[seed:giras2027-sinf-cf]%';

SELECT count(*) AS remaining_seed
FROM public.programas
WHERE coalesce(subtitulo, '') LIKE '%[seed:giras2027-sinf-cf]%';
