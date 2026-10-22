-- ejemplo: fuentes de un Sinfónico full y una Camerata 2026
select p.id, p.nomenclador, p.nombre_gira, p.tipo, gf.tipo as ft, gf.valor_id, gf.valor_texto, e.ensamble
from programas p
left join giras_fuentes gf on gf.id_gira = p.id
left join ensambles e on e.id = nullif(gf.valor_id,'')::bigint and gf.tipo in ('ENSAMBLE','EXCL_ENSAMBLE')
where p.id in (
  select id from programas
  where fecha_desde >= '2026-01-01' and fecha_desde < '2027-01-01'
    and tipo in ('Sinfónico','Camerata Filarmónica')
    and coalesce(is_deleted,false)=false
  order by fecha_desde
  limit 8
)
order by p.fecha_desde, gf.tipo, coalesce(e.ensamble, gf.valor_texto);
