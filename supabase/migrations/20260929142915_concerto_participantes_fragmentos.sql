-- Fragmentos del concurso viven en el participante, no en la nota del repertorio.
-- El texto ya cargado en observaciones pasa a fragmento_orquesta.
-- fragmento_solista queda vacío para cargarlo a mano.
-- Si fragmento_orquesta ya tiene texto, no se pisa.

alter table public.concerto_participantes
  add column if not exists fragmento_solista text,
  add column if not exists fragmento_orquesta text;

update public.concerto_participantes
set fragmento_orquesta = observaciones
where observaciones is not null
  and btrim(observaciones) <> ''
  and (fragmento_orquesta is null or btrim(fragmento_orquesta) = '');
