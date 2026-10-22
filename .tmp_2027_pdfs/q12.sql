select id, nombre_gira, tipo, nomenclador, fecha_desde::text, estado
from programas
where fecha_desde >= '2027-01-01' and fecha_desde < '2028-01-01'
order by fecha_desde, id;
