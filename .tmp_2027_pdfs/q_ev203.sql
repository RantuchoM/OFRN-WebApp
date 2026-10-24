select e.id, e.id_gira, e.fecha::text, e.hora_inicio::text, e.id_tipo_evento, e.descripcion, e.is_deleted
from eventos e
where e.id_gira between 201 and 216
order by e.id_gira, e.fecha;
