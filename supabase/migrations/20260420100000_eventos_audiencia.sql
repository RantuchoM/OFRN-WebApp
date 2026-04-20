alter table public.eventos
add column if not exists audiencia integer;

alter table public.eventos
drop constraint if exists eventos_audiencia_nonnegative;

alter table public.eventos
add constraint eventos_audiencia_nonnegative
check (audiencia is null or audiencia >= 0);
