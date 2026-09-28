-- Navidad Coral 130: ensayos ensamble ES asociados
SELECT COUNT(*) AS n_ensamble,
  ROUND(SUM(CASE WHEN dur>=7200 THEN 1.0 WHEN dur IS NULL THEN 0 ELSE 0.5 END)::numeric,1) AS serv_ens
FROM (
  SELECT CASE WHEN e.hora_inicio IS NULL OR e.hora_fin IS NULL THEN NULL
    ELSE (EXTRACT(EPOCH FROM (e.hora_fin::time - e.hora_inicio::time)))::int END AS dur
  FROM eventos_programas_asociados epa
  JOIN eventos e ON e.id = epa.id_evento
  WHERE epa.id_programa = 130 AND e.id_tipo_evento = 13
    AND COALESCE(e.is_deleted,false)=false AND COALESCE(e.tecnica,false)=false
) x;