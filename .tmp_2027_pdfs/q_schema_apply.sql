select column_name, is_nullable, column_default, data_type
from information_schema.columns
where table_schema='public' and table_name in ('programas','giras_localidades','giras_fuentes','giras_integrantes','eventos','localidades')
and column_name in (
  'id','nombre_gira','fecha_desde','fecha_hasta','tipo','zona','estado','nomenclador','mes_letra','subtitulo',
  'id_gira','id_localidad','tipo','valor_id','valor_texto',
  'id_integrante','rol','estado',
  'id_tipo_evento','id_locacion','fecha','hora_inicio','hora_fin','descripcion','is_deleted','visible_agenda','tecnica','convocados','audiencia_ofrn',
  'localidad','id_region','pais'
)
order by table_name, ordinal_position;

select enumlabel
from pg_enum e
join pg_type t on t.oid = e.enumtypid
where t.typname ilike '%programa%' or t.typname ilike '%tipo_programa%' or t.typname = 'estado_programa'
order by enumtypid, enumsortorder;

select unnest(enum_range(null::programas_tipo))::text as tipo;
select unnest(enum_range(null::programas_estado))::text as estado;
