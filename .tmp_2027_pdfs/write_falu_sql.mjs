import fs from "node:fs";

const sql = `select p.id, p.nombre_gira, p.fecha_desde::text, p.fecha_hasta::text,
  (select json_agg(json_build_object(
    'fecha', e.fecha::text,
    'hora', e.hora_inicio::text,
    'desc', e.descripcion,
    'locacion', loc.nombre
  ) order by e.fecha, e.hora_inicio)
   from eventos e
   left join locaciones loc on loc.id = e.id_locacion
   where e.id_programa = p.id) as evs,
  (select string_agg(l.localidad, ' · ' order by l.localidad)
   from giras_localidades gl join localidades l on l.id = gl.id_localidad
   where gl.id_gira = p.id) as locs
from programas p
where p.id in (206, 214);
`;
const path = new URL("./q_falu.sql", import.meta.url);
fs.writeFileSync(path, sql);
const buf = fs.readFileSync(path);
if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
  fs.writeFileSync(path, buf.slice(3));
}
console.log("ok");
