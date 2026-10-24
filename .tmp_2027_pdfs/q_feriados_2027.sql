select fecha::text as fecha, detalle, es_feriado
from public.feriados
where fecha >= '2027-01-01' and fecha < '2028-01-01'
order by fecha;
