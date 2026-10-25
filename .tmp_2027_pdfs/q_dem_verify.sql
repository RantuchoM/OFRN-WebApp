select count(*)::int as n from gira_demoras_localidad;

select o.localidad as origen, d.localidad as destino, g.minutos
from gira_demoras_localidad g
join localidades o on o.id = g.id_localidad_origen
join localidades d on d.id = g.id_localidad_destino
where o.localidad = 'Villa Regina' or d.localidad = 'Villa Regina'
order by 1, 2;
