-- Consultas resueltas: orden descendente por resolved_at (más recientes primero).

create or replace function public.entrada_ayuda_listar(p_estado text default 'pendiente')
returns setof public.entrada_ayuda_consulta
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text := lower(trim(coalesce(p_estado, 'pendiente')));
begin
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  if v_estado is null or v_estado = '' or v_estado = 'todas' then
    return query
      select *
      from public.entrada_ayuda_consulta
      order by coalesce(resolved_at, created_at) desc, created_at desc
      limit 200;
  elsif v_estado = 'resuelta' then
    return query
      select *
      from public.entrada_ayuda_consulta
      where estado = 'resuelta'
      order by coalesce(resolved_at, created_at) desc, created_at desc
      limit 200;
  else
    return query
      select *
      from public.entrada_ayuda_consulta
      where estado = v_estado
      order by created_at desc
      limit 200;
  end if;
end;
$$;

comment on function public.entrada_ayuda_listar(text) is
  'Lista consultas de ayuda (terceros). p_estado: pendiente|resuelta|descartada|todas. Resueltas: resolved_at desc.';
