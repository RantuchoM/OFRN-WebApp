select p.id, p.nombre_gira, p.tipo, p.nomenclador, p.fecha_desde::text, p.fecha_hasta::text, p.zona, p.estado
from programas p
where p.fecha_desde >= '2026-01-01' and p.fecha_desde < '2027-01-01'
  and p.tipo in ('Sinfónico', 'Camerata Filarmónica')
order by p.fecha_desde
limit 40;
