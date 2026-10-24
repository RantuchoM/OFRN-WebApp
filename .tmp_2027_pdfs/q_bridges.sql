select fecha::text as fecha, detalle, es_feriado
from public.feriados
where fecha >= '2026-01-01' and fecha < '2028-01-01'
  and (detalle ilike '%uente%' or es_feriado = false)
order by fecha;
