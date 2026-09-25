-- El promedio de cada participante usa todos los puntajes guardados,
-- también si el votante no completó el resto de la boleta.
-- No devuelve quién votó. Sigue restringida a admin o editor.

create or replace function public.concerto_promedios(
  p_id_viewer bigint,
  p_id_instancia bigint
)
returns table (id_participante bigint, promedio numeric, cantidad integer)
language plpgsql
stable
security definer
set search_path = public
as $func$
#variable_conflict use_column
begin
  if not exists (
    select 1
    from public.integrantes i
    cross join lateral unnest(coalesce(i.rol_sistema, '{}'::text[])) as rol(valor)
    where i.id = p_id_viewer
      and lower(rol.valor) in ('admin', 'editor')
  ) then
    raise exception 'No autorizado para ver promedios.'
      using errcode = '42501';
  end if;

  return query
  select
    p.id,
    avg(v.puntaje),
    count(v.id)::integer
  from public.concerto_participantes p
  left join public.concerto_votos v
    on v.id_instancia = p_id_instancia
   and v.id_participante = p.id
  where p.id_instancia = p_id_instancia
  group by p.id, p.orden
  order by p.orden, p.id;
end;
$func$;

comment on function public.concerto_promedios(bigint, bigint) is
  'Promedio y cantidad de todos los puntajes guardados por participante. No exige boleta completa. No devuelve al votante. Solo admin o editor.';
