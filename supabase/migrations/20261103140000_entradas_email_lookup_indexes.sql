-- Lookups de mail en Entradas / OFRN: índice B-tree (O(log n)), no escaneo.
-- Los mails de Entradas ya van normalizados en minúsculas; eq usa el UNIQUE existente.
-- En integrantes, lower() cubre mail / email_acceso con casing mixto.

create index if not exists integrantes_mail_lower_idx
  on public.integrantes (lower(mail));

create index if not exists integrantes_email_acceso_lower_idx
  on public.integrantes (lower(email_acceso));

comment on index public.integrantes_mail_lower_idx is
  'Acelera lookup OFRN por mail en entradas-auth-email (eq/ilike normalizado).';

comment on index public.integrantes_email_acceso_lower_idx is
  'Acelera lookup OFRN por email_acceso en entradas-auth-email.';
