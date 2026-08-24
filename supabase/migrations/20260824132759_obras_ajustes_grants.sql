-- API roles need explicit grants on new tables (RLS alone is not enough)
grant select, insert, update, delete on public.obras_ajustes to authenticated, anon, service_role;
grant usage, select on sequence public.obras_ajustes_id_seq to authenticated, anon, service_role;