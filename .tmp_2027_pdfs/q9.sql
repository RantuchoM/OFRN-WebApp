-- columnas giras_fuentes y programas relevantes
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name in ('giras_fuentes','programas')
and column_name in (
  'id','id_gira','tipo','valor_id','valor_texto','nombre_gira','nomenclador','mes_letra',
  'fecha_desde','fecha_hasta','zona','estado','director','comentario','descripcion'
)
order by table_name, column_name;
