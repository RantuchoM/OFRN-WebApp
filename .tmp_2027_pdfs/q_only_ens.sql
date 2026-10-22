select e.id, e.ensamble, e.id_familia, e.id_localidad, l.localidad,
  (select json_agg(ec.id_ensamble_cf order by ec.id_ensamble_cf)
   from ensambles_cf ec where ec.id_ensamble = e.id) as cf_ids
from ensambles e
left join localidades l on l.id = e.id_localidad
where e.ensamble not ilike 'CF%'
  and e.ensamble not ilike 'Jazz%'
  and e.ensamble not ilike 'Prod%'
  and e.ensamble not ilike 'Prueba%'
order by e.ensamble;
