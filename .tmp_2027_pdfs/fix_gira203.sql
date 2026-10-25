-- Gira 203: Directora mujer — 7 al 10 de abril 2027
-- Idempotente: alinea programa + conciertos (vie 9/4 20:00, sáb 10/4 12:00).

UPDATE public.programas
SET fecha_desde = '2027-04-07',
    fecha_hasta = '2027-04-10'
WHERE id = 203;

WITH conc AS (
  SELECT id,
         row_number() OVER (ORDER BY fecha, hora_inicio) AS rn
  FROM public.eventos
  WHERE id_gira = 203
    AND coalesce(is_deleted, false) = false
    AND id_tipo_evento = 1
)
UPDATE public.eventos e
SET fecha = CASE c.rn
      WHEN 1 THEN '2027-04-09'::date
      WHEN 2 THEN '2027-04-10'::date
      ELSE e.fecha
    END,
    hora_inicio = CASE c.rn
      WHEN 1 THEN '20:00'::time
      WHEN 2 THEN '12:00'::time
      ELSE e.hora_inicio
    END,
    hora_fin = CASE c.rn
      WHEN 1 THEN '21:30'::time
      WHEN 2 THEN '13:30'::time
      ELSE e.hora_fin
    END,
    observaciones_internas = CASE c.rn
      WHEN 1 THEN 'Cipolletti 20:00 (fecha tentativa)'
      WHEN 2 THEN 'General Roca sábado 12:00'
      ELSE e.observaciones_internas
    END,
    last_modified_at = now()
FROM conc c
WHERE e.id = c.id;

SELECT p.id, p.nombre_gira, p.fecha_desde::text, p.fecha_hasta::text,
  (SELECT json_agg(json_build_object(
      'id', e.id,
      'fecha', e.fecha::text,
      'hora', e.hora_inicio::text,
      'obs', e.observaciones_internas
    ) ORDER BY e.fecha, e.hora_inicio)
   FROM eventos e
   WHERE e.id_gira = p.id AND coalesce(e.is_deleted,false)=false) AS eventos
FROM programas p WHERE p.id = 203;
