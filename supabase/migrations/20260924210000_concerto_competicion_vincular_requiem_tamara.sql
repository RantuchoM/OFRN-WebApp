-- Completa dos huecos de la semilla de Concerto Competition 2026.
-- Idempotente: no pisa un id_gira ya cargado ni duplica el vínculo.

update public.concerto_instancias as i
set id_gira = p.id
from public.concerto_ediciones as e
join public.programas as p
  on p.nombre_gira = 'W.A Mozart'
 and p.fecha_desde = date '2026-11-11'
 and p.fecha_hasta = date '2026-11-14'
where i.id_edicion = e.id
  and e.nombre = 'Concerto Competition 2026'
  and i.titulo = 'Réquiem de Mozart'
  and i.id_gira is null
  and (
    select count(*)
    from public.programas p2
    where p2.nombre_gira = 'W.A Mozart'
      and p2.fecha_desde = date '2026-11-11'
      and p2.fecha_hasta = date '2026-11-14'
  ) = 1;

insert into public.concerto_participante_integrantes (id_participante, id_integrante)
select part.id, i.id
from public.concerto_participantes as part
join public.concerto_instancias as inst
  on inst.id = part.id_instancia
join public.concerto_ediciones as e
  on e.id = inst.id_edicion
join public.integrantes as i
  on i.es_simulacion is not true
 and translate(lower(coalesce(i.nombre, '')), 'áéíóúüñàèìòù', 'aeiouunaeiou') like '%tamara%'
where e.nombre = 'Concerto Competition 2026'
  and inst.titulo = 'Brillo y Tempestad'
  and part.obra = 'Concierto para fagot de Carl Maria von Weber en fa mayor'
  and (
    select count(*)
    from public.integrantes i2
    where i2.es_simulacion is not true
      and translate(lower(coalesce(i2.nombre, '')), 'áéíóúüñàèìòù', 'aeiouunaeiou') like '%tamara%'
  ) = 1
  and not exists (
    select 1
    from public.concerto_participante_integrantes pi
    where pi.id_participante = part.id
  )
on conflict do nothing;
