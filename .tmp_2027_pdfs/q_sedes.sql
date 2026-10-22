-- sedes de sinfónicos 2026 + zonas
select gl.id_gira, p.nomenclador, p.zona, p.nombre_gira, l.id as id_loc, l.localidad, r.region
from giras_localidades gl
join programas p on p.id = gl.id_gira
join localidades l on l.id = gl.id_localidad
left join regiones r on r.id = l.id_region
where p.fecha_desde >= '2026-01-01' and p.fecha_desde < '2027-01-01'
  and p.tipo in ('Sinfónico','Camerata Filarmónica')
  and p.estado = 'Vigente'
order by p.fecha_desde, gl.id_gira, l.localidad
limit 80;

select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='eventos'
order by ordinal_position;
