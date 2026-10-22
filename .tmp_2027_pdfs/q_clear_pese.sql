SELECT id, fecha, left(coalesce(descripcion,''), 60) AS desc,
       left(coalesce(ensayo_pese_conflicto_justificacion,''), 80) AS just
FROM public.eventos
WHERE ensayo_pese_conflicto = true
ORDER BY fecha DESC;
