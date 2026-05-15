-- Contraseña interna estable por email (solo service role) para no rotar auth.users en cada OTP;
-- así GoTrue no invalida refresh tokens en cada login (comportamiento de updateUserById + password).

alter table public.entrada_auth_email_user
  add column if not exists auth_password_plain text;

comment on column public.entrada_auth_email_user.auth_password_plain is
  'Contraseña del usuario en auth.users; reutilizada tras OTP. Solo lectura/escritura con service role (RLS deny all).';
