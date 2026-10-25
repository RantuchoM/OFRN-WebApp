select p.id, p.nombre_gira, p.fecha_desde::text, p.fecha_hasta::text, p.zona, p.subtitulo
from programas p where p.id = 203;

select e.id, e.fecha::text, e.hora_inicio::text, e.hora_fin::text, e.id_tipo_evento, e.descripcion, e.observaciones_internas
from eventos e where e.id_gira = 203 and coalesce(e.is_deleted,false)=false
order by e.fecha, e.hora_inicio;

select * from giras_tramo_segmentos where id_gira = 203 order by indice;
select gl.id_localidad, l.localidad from giras_localidades gl
join localidades l on l.id = gl.id_localidad where gl.id_gira = 203;
