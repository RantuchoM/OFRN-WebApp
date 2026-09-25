-- Mail real de cada perfil SCRN para la pantalla admin de Usuarios.
-- scrn_perfiles no guarda el correo: está en auth.users y en entrada_auth_email_user.

create or replace function public.scrn_admin_list_user_emails()
returns table (id uuid, email text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.scrn_perfiles p
    where p.id = auth.uid()
      and coalesce(p.es_admin, false) = true
  ) then
    raise exception 'Solo un admin puede ver los mails';
  end if;

  return query
  select
    sp.id,
    coalesce(nullif(trim(u.email), ''), nullif(trim(m.email), '')) as email
  from public.scrn_perfiles sp
  left join auth.users u on u.id = sp.id
  left join public.entrada_auth_email_user m on m.user_id = sp.id;
end;
$$;

revoke all on function public.scrn_admin_list_user_emails() from public;
grant execute on function public.scrn_admin_list_user_emails() to authenticated;

comment on function public.scrn_admin_list_user_emails() is
  'Lista id + mail de scrn_perfiles. Solo un admin de oficina externa.';
