-- El texto libre del participante pasa a llamarse observaciones.
-- La obra de catálogo no se copia: id_repertorio_obra apunta a la fila
-- del bloque de repertorio (repertorio_obras), de donde salen título, Drive y orgánico.
-- Va después de 20260924210000, que todavía lee la columna obra.

alter table public.concerto_participantes
  rename column obra to observaciones;

alter table public.concerto_participantes
  add column id_repertorio_obra bigint references public.repertorio_obras (id) on delete set null;

create index concerto_participantes_repertorio_obra_idx
  on public.concerto_participantes (id_repertorio_obra);

comment on column public.concerto_participantes.observaciones is
  'Nota libre del participante. No es el título de la obra de catálogo ni se copia al bloque.';

comment on column public.concerto_participantes.id_repertorio_obra is
  'Fila de repertorio_obras del bloque Concerto Competition de la gira. Null si no hay obra de catálogo vinculada.';
