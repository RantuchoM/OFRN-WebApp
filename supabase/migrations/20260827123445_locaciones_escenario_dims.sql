-- Dimensiones predeterminadas de escenario (cm) por locación / venue.
-- Usadas al crear o cambiar el tamaño de un lienzo de plano de escenario.

alter table public.locaciones
  add column if not exists escenario_ancho_cm integer,
  add column if not exists escenario_profundo_cm integer;

comment on column public.locaciones.escenario_ancho_cm is
  'Ancho predeterminado del escenario en cm (stage.widthCm del plano).';

comment on column public.locaciones.escenario_profundo_cm is
  'Profundo predeterminado del escenario en cm (stage.heightCm del plano).';

alter table public.locaciones
  drop constraint if exists locaciones_escenario_ancho_cm_check;

alter table public.locaciones
  add constraint locaciones_escenario_ancho_cm_check
  check (
    escenario_ancho_cm is null
    or (escenario_ancho_cm >= 40 and escenario_ancho_cm <= 1600)
  );

alter table public.locaciones
  drop constraint if exists locaciones_escenario_profundo_cm_check;

alter table public.locaciones
  add constraint locaciones_escenario_profundo_cm_check
  check (
    escenario_profundo_cm is null
    or (escenario_profundo_cm >= 30 and escenario_profundo_cm <= 1200)
  );
