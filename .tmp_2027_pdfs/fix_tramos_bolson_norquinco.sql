-- Obras Juan Falú (214): El Bolsón la mayor parte; Ñorquinco (área Bariloche) solo el último día.
DO $$
DECLARE
  r record;
  v_seg0 bigint;
  v_seg1 bigint;
  v_corte_fecha date;
BEGIN
  FOR r IN
    SELECT id, fecha_desde, fecha_hasta
    FROM public.programas
    WHERE id = 214
  LOOP
    v_corte_fecha := r.fecha_hasta;

    DELETE FROM public.giras_tramo_cortes WHERE id_gira = r.id;
    DELETE FROM public.giras_tramo_segmentos WHERE id_gira = r.id;

    INSERT INTO public.giras_tramo_cortes (
      id_gira, orden, fecha, hora,
      fecha_checkout, hora_checkout, fecha_checkin, hora_checkin
    ) VALUES (
      r.id, 1, v_corte_fecha, '10:00:00',
      v_corte_fecha, '10:00:00', v_corte_fecha, '14:00:00'
    );

    INSERT INTO public.giras_tramo_segmentos (id_gira, indice, fecha_desde, fecha_hasta)
    VALUES (r.id, 0, r.fecha_desde, v_corte_fecha)
    RETURNING id INTO v_seg0;

    INSERT INTO public.giras_tramo_segmentos (id_gira, indice, fecha_desde, fecha_hasta)
    VALUES (r.id, 1, v_corte_fecha, r.fecha_hasta)
    RETURNING id INTO v_seg1;

    INSERT INTO public.giras_tramo_localidades (id_segmento, id_localidad)
    VALUES (v_seg0, 23); -- El Bolsón

    INSERT INTO public.giras_tramo_localidades (id_segmento, id_localidad)
    VALUES (v_seg1, 46); -- Ñorquinco (área Bariloche)
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
WHERE p.id = 214
ORDER BY s.indice;
