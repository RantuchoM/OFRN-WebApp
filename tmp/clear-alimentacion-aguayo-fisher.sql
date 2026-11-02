-- Clear alimentacion only for Aguayo (Cantos) and Fisher (Del Silencio).
-- Preview first, then update.

select id, apellido, nombre, condicion::text as condicion, alimentacion
from integrantes
where id in (1767967586943, 48028288);

update integrantes
set alimentacion = null
where id in (1767967586943, 48028288)
  and lower(trim(condicion::text)) <> 'estable'
returning id, apellido, nombre, condicion::text as condicion, alimentacion;
