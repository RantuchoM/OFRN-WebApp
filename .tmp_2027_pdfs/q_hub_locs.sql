select id, localidad, hub from localidades
where hub is not null
order by hub, localidad;
