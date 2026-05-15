-- Recepción: tiempo real de ingresos por QR (entrada_reserva / entrada_reserva_entrada) filtrados por concierto.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'entrada_reserva'
  ) then
    alter publication supabase_realtime add table public.entrada_reserva;
  end if;
exception
  when undefined_object then
    null;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'entrada_reserva_entrada'
  ) then
    alter publication supabase_realtime add table public.entrada_reserva_entrada;
  end if;
exception
  when undefined_object then
    null;
end
$$;
