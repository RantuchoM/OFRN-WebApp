-- SCRN controles de viaje:
-- Validacion de kilometraje por orden cronologico del viaje (fecha_salida),
-- no por maximo global historico.

create or replace function public.scrn_viajes_controles_validate_km()
returns trigger
language plpgsql
as $$
declare
  v_prev_km integer;
  v_fecha_salida timestamp with time zone;
begin
  if new.km_retiro is not null and new.km_retiro < 0 then
    raise exception 'km_retiro no puede ser negativo';
  end if;
  if new.km_entrega is not null and new.km_entrega < 0 then
    raise exception 'km_entrega no puede ser negativo';
  end if;
  if new.km_retiro is not null and new.km_entrega is not null and new.km_entrega < new.km_retiro then
    raise exception 'km_entrega no puede ser menor a km_retiro';
  end if;

  select v.fecha_salida
    into v_fecha_salida
  from public.scrn_viajes v
  where v.id = new.id_viaje;

  if v_fecha_salida is null then
    return new;
  end if;

  select c.km_entrega
    into v_prev_km
  from public.scrn_viajes_controles c
  join public.scrn_viajes v on v.id = c.id_viaje
  where c.id_transporte = new.id_transporte
    and c.id_viaje <> new.id_viaje
    and c.km_entrega is not null
    and v.fecha_salida < v_fecha_salida
  order by v.fecha_salida desc
  limit 1;

  if v_prev_km is not null then
    if new.km_retiro is not null and new.km_retiro < v_prev_km then
      raise exception 'km_retiro (%) no puede ser menor al km del viaje anterior (%)', new.km_retiro, v_prev_km;
    end if;
    if new.km_entrega is not null and new.km_entrega < v_prev_km then
      raise exception 'km_entrega (%) no puede ser menor al km del viaje anterior (%)', new.km_entrega, v_prev_km;
    end if;
  end if;

  return new;
end;
$$;

