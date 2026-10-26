SELECT count(*)::int AS n,
  left(subtitulo, 80) AS muestra
FROM programas
WHERE subtitulo LIKE '%[seed:%'
GROUP BY left(subtitulo, 80)
ORDER BY n DESC;
