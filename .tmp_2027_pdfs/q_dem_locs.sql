select e.ensamble, e.id_localidad, l.localidad, l.hub
from ensambles e
left join localidades l on l.id = e.id_localidad
where e.ensamble in ('ABRON','BRAT','CAV','CEB','CPAT','ECAS','ES','PILTRI','PV','TREPUN','VN','VS')
order by l.localidad, e.ensamble;
