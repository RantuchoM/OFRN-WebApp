select p.id, p.nombre_gira, p.tipo::text, p.zona, p.fecha_desde::text, p.fecha_hasta::text, p.estado::text,
  (select json_agg(json_build_object('id', l.id, 'localidad', l.localidad) order by l.localidad)
   from giras_localidades gl join localidades l on l.id = gl.id_localidad
   where gl.id_gira = p.id) as localias,
  (select json_agg(json_build_object(
      'tipo', gf.tipo,
      'valor_id', gf.valor_id,
      'valor_texto', gf.valor_texto,
      'ensamble', e.ensamble
    ) order by gf.tipo, coalesce(e.ensamble, gf.valor_texto))
   from giras_fuentes gf
   left join ensambles e on e.id = gf.valor_id
   where gf.id_gira = p.id) as fuentes
from programas p
where coalesce(p.subtitulo,'') like '%[seed:giras2027-sinf-cf]%'
order by p.fecha_desde, p.id;
