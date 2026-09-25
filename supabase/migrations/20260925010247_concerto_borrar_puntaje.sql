-- Borra un solo puntaje del votante, solo con la ventana de la instancia abierta.

create or replace function public.concerto_borrar_puntaje(
  p_id_votante bigint,
  p_id_instancia bigint,
  p_id_participante bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_inst public.concerto_instancias;
  v_deleted integer;
begin
  select *
  into v_inst
  from public.concerto_instancias
  where id = p_id_instancia
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'La instancia no existe.');
  end if;

  if v_inst.abre_en is null
     or v_inst.cierra_en is null
     or now() < v_inst.abre_en
     or now() > v_inst.cierra_en then
    return jsonb_build_object('ok', false, 'error', 'La votación no está abierta.');
  end if;

  delete from public.concerto_votos
  where id_instancia = p_id_instancia
    and id_votante = p_id_votante
    and id_participante = p_id_participante;

  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    return jsonb_build_object('ok', false, 'error', 'No hay un puntaje para borrar.');
  end if;

  return jsonb_build_object('ok', true, 'error', null);
end;
$func$;

comment on function public.concerto_borrar_puntaje(bigint, bigint, bigint) is
  'Borra el puntaje de un votante para un participante. Solo si la ventana de la instancia está abierta. No toca otros votos.';

revoke all on function public.concerto_borrar_puntaje(bigint, bigint, bigint) from public;
grant execute on function public.concerto_borrar_puntaje(bigint, bigint, bigint) to anon, authenticated;
