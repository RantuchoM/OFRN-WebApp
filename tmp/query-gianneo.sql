SELECT c.id, c.apellido, c.nombre, count(oc.id_obra) AS obras
FROM compositores c
JOIN obras_compositores oc ON oc.id_compositor = c.id
  AND (oc.rol = 'compositor' OR oc.rol IS NULL)
WHERE c.apellido ILIKE '%giann%' OR c.nombre ILIKE '%giann%'
GROUP BY c.id, c.apellido, c.nombre
ORDER BY c.apellido;
