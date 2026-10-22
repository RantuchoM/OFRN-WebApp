select column_name, data_type
from information_schema.columns
where table_name = 'ensambles' and table_schema = 'public'
order by ordinal_position;
