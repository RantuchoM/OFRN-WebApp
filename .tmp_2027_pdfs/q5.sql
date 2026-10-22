select gf.id_gira, p.nombre_gira, p.tipo, p.nomenclador, gf.tipo as fuente_tipo, gf.valor_id, gf.valor_texto
from giras_fuentes gf
join programas p on p.id = gf.id_gira
where p.fecha_desde >= '2026-01-01' and p.fecha_desde < '2027-01-01'
  and p.tipo in ('Sinfónico', 'Camerata Filarmónica')
  and coalesce(p.is_deleted, false) = false
order by p.fecha_desde, gf.tipo, gf.valor_texto;
