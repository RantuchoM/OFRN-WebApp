-- Alimentación OFRN: null / vacío / General → Estándar; NOT NULL + DEFAULT de ahora en más.

UPDATE public.integrantes
SET alimentacion = 'Estándar'
WHERE alimentacion IS NULL
   OR btrim(alimentacion) = ''
   OR lower(
        translate(
          btrim(alimentacion),
          'ÁÉÍÓÚÜáéíóúü',
          'AEIOUUaeiouu'
        )
      ) = 'general';

ALTER TABLE public.integrantes
  ALTER COLUMN alimentacion SET DEFAULT 'Estándar';

UPDATE public.integrantes
SET alimentacion = 'Estándar'
WHERE alimentacion IS NULL
   OR btrim(alimentacion) = '';

ALTER TABLE public.integrantes
  ALTER COLUMN alimentacion SET NOT NULL;
