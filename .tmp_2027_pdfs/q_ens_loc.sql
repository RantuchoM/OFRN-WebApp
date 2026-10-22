select e.id, e.ensamble, e.id_familia, e.id_localidad, l.localidad, r.region
from ensambles e
left join localidades l on l.id = e.id_localidad
left join regiones r on r.id = l.id_region
where e.ensamble not ilike 'CF%'
  and e.ensamble not ilike 'Jazz%'
  and e.ensamble not ilike 'Prod%'
order by e.ensamble;
