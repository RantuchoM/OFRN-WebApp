select id, fecha::text, hora_inicio::text, hora_fin::text, id_tipo_evento, id_locacion, descripcion, observaciones_internas
from eventos where id_gira = 203 and coalesce(is_deleted,false)=false order by fecha, hora_inicio;
