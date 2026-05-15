-- Magic link de un solo uso (mismo TTL que el OTP de la fila)

alter table public.entrada_auth_email_otp
  add column if not exists magic_token_hash text;

comment on column public.entrada_auth_email_otp.magic_token_hash is
  'SHA-256 del token del enlace mágico (pepper en edge function).';

create index if not exists idx_entrada_auth_email_otp_magic_active
  on public.entrada_auth_email_otp (magic_token_hash)
  where magic_token_hash is not null and consumed_at is null;
