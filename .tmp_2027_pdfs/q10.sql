select ec.id_ensamble, e.ensamble, e.id_familia, ec.id_ensamble_cf, cf.ensamble as cf_name
from ensambles_cf ec
join ensambles e on e.id = ec.id_ensamble
join ensambles cf on cf.id = ec.id_ensamble_cf
order by cf.ensamble, e.ensamble;
