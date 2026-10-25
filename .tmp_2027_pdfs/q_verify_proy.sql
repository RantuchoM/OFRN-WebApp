select count(*) as demoras from gira_demoras_hub;
select id, nombre_gira, fecha_desde::text, hora_inicio_proyeccion::text, hora_fin_proyeccion::text, servicios_estimados
from programas
where id = 203;
select id, localidad, hub from localidades where hub is not null order by hub, id;
