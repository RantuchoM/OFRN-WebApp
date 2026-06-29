-- Proyectos OFRN sin RLS global: sandbox accesible sin políticas authenticated

drop policy if exists instrumentacion_sandbox_select on public.instrumentacion_sandbox;
drop policy if exists instrumentacion_sandbox_insert on public.instrumentacion_sandbox;
drop policy if exists instrumentacion_sandbox_update on public.instrumentacion_sandbox;
drop policy if exists instrumentacion_sandbox_gira_select on public.instrumentacion_sandbox_gira;
drop policy if exists instrumentacion_sandbox_gira_insert on public.instrumentacion_sandbox_gira;
drop policy if exists instrumentacion_sandbox_gira_update on public.instrumentacion_sandbox_gira;
drop policy if exists instrumentacion_sandbox_gira_delete on public.instrumentacion_sandbox_gira;

alter table public.instrumentacion_sandbox disable row level security;
alter table public.instrumentacion_sandbox_gira disable row level security;
