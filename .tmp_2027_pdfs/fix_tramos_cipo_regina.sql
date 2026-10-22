-- Cipolletti todo el tramo salvo el último día = solo Villa Regina.
-- Giras 207 (02–05/06/2027) y 213 (03–06/11/2027).
-- Corte el último día a las 10:00; tramo 0 = Cipolletti, tramo 1 = Regina.

DO $$
DECLARE
  r record;
  v_corte_id bigint;
  v_seg0 bigint;
  v_seg1 bigint;
  v_corte_fecha date;
BEGIN
  FOR r IN
    SELECT id, fecha_desde, fecha_hasta
    FROM public.programas
    WHERE id IN (207, 213)
  LOOP
    v_corte_fecha := r.fecha_hasta;

    -- Limpiar cortes/segmentos previos de estas giras seed
    DELETE FROM public.giras_tramo_cortes WHERE id_gira = r.id;
    DELETE FROM public.giras_tramo_segmentos WHERE id_gira = r.id;

    INSERT INTO public.giras_tramo_cortes (
      id_gira, orden, fecha, hora,
      fecha_checkout, hora_checkout, fecha_checkin, hora_checkin
    ) VALUES (
      r.id, 1, v_corte_fecha, '10:00:00',
      v_corte_fecha, '10:00:00', v_corte_fecha, '14:00:00'
    )
    RETURNING id INTO v_corte_id;

    -- Tramo 0: Cipolletti desde inicio hasta día del corte
    INSERT INTO public.giras_tramo_segmentos (id_gira, indice, fecha_desde, fecha_hasta)
    VALUES (r.id, 0, r.fecha_desde, v_corte_fecha)
    RETURNING id INTO v_seg0;

    -- Tramo 1: Villa Regina solo el último día
    INSERT INTO public.giras_tramo_segmentos (id_gira, indice, fecha_desde, fecha_hasta)
    VALUES (r.id, 1, v_corte_fecha, r.fecha_hasta)
    RETURNING id INTO v_seg1;

    INSERT INTO public.giras_tramo_localidades (id_segmento, id_localidad)
    VALUES (v_seg0, 16); -- Cipolletti

    INSERT INTO public.giras_tramo_localidades (id_segmento, id_localidad)
    VALUES (v_seg1, 60); -- Villa Regina

    -- Union en giras_localidades (ya deberían estar ambas)
    INSERT INTO public.giras_localidades (id_gira, id_localidad)
    VALUES (r.id, 16), (r.id, 60)
    ON CONFLICT DO NOTHING;

    -- Quitar duplicados si hay constraint distinta
    -- (giras_localidades puede no tener unique; no tocamos de más)
  END LOOP;
END $$;

SELECT p.id, p.nombre_gira,
  s.indice, s.fecha_desde::text, s.fecha_hasta::text,
  (select string_agg(l.localidad, ', ')
   from giras_tramo_localidades tl
   join localidades l on l.id = tl.id_localidad
   where tl.id_segmento = s.id) as locs
FROM programas p
JOIN giras_tramo_segmentos s ON s.id_gira = p.id
WHERE p.id IN (207, 213)
ORDER BY p.id, s.indice;
