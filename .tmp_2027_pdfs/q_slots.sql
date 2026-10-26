SELECT en.ensamble, count(*)::int AS slots,
  string_agg(e.iso_dow::text || ' ' || e.hora_inicio::text || '-' || e.hora_fin::text, ', ' ORDER BY e.iso_dow, e.hora_inicio) AS detalle
FROM ensamble_proyeccion_ensayos e
JOIN ensambles en ON en.id = e.id_ensamble
WHERE e.activo
GROUP BY en.ensamble
ORDER BY en.ensamble;
