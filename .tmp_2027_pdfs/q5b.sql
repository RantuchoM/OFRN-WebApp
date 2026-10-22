select p.id, p.nomenclador, p.tipo, gf.tipo as ft, gf.valor_id, gf.valor_texto
from programas p
join giras_fuentes gf on gf.id_gira = p.id
where p.fecha_desde >= '2026-01-01' and p.fecha_desde < '2027-01-01'
  and p.tipo in ('Sinfónico', 'Camerata Filarmónica')
order by p.fecha_desde, p.id, gf.tipo, gf.valor_texto
limit 120;
