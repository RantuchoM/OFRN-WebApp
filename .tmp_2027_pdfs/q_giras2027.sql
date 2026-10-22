select p.id, p.nombre_gira, p.tipo::text, p.zona, p.fecha_desde::text, p.fecha_hasta::text, p.estado::text,
  (select string_agg(l.localidad || '(' || l.id || ')', ' · ' order by l.localidad)
   from giras_localidades gl join localidades l on l.id = gl.id_localidad
   where gl.id_gira = p.id) as localias,
  (select string_agg(
      gf.tipo || ':' || coalesce(gf.valor_texto, e.ensamble, gf.valor_id::text),
      ' | ' order by gf.tipo, coalesce(e.ensamble, gf.valor_texto))
   from giras_fuentes gf
   left join ensambles e on e.id = gf.valor_id
   where gf.id_gira = p.id) as fuentes
from programas p
where coalesce(p.subtitulo,'') like '%[seed:giras2027-sinf-cf]%'
order by p.fecha_desde;

select e.id, e.ensamble, e.id_familia, e.id_localidad, l.localidad
from ensambles e
left join localidades l on l.id = e.id_localidad
where e.ensamble not ilike 'CF%'
  and e.ensamble not ilike 'Jazz%'
  and e.ensamble not ilike 'Prod%'
  and e.ensamble not ilike 'Prueba%'
order by e.ensamble;

select id_ensamble, id_ensamble_cf, cf.ensamble as cf
from ensambles_cf ec
join ensambles cf on cf.id = ec.id_ensamble_cf
order by 1;
