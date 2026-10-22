select id, localidad from localidades where localidad ilike '%frutillar%' or localidad ilike '%chile%';
select distinct zona from programas where zona is not null order by 1;
select gf.tipo, count(*) from giras_fuentes gf join programas p on p.id=gf.id_gira where p.id=4 group by 1;
-- PERSONA fuente?
select distinct tipo from giras_fuentes order by 1;
