import fs from "node:fs";

const sql = `select p.id, p.nombre_gira, p.tipo::text, p.subtitulo,
  p.fecha_desde::text, p.fecha_hasta::text,
  coalesce((
    select json_agg(json_build_object('tipo', gf.tipo, 'valor_id', gf.valor_id))
    from giras_fuentes gf where gf.id_gira = p.id
  ), '[]'::json) as fuentes,
  coalesce((
    select json_agg(json_build_object(
      'fecha', e.fecha::text,
      'hora_inicio', e.hora_inicio::text,
      'hora_fin', e.hora_fin::text,
      'es_didactico', e.es_didactico,
      'descripcion', e.descripcion
    ) order by e.fecha, e.hora_inicio)
    from eventos e where e.id_gira = p.id and coalesce(e.is_deleted,false)=false
  ), '[]'::json) as eventos
from programas p
where coalesce(p.subtitulo,'') like '%[seed:ciclos2027-ensamble]%'
order by p.fecha_desde, p.nombre_gira;
`;
const path = new URL("./q_ciclos.sql", import.meta.url);
fs.writeFileSync(path, sql);
const buf = fs.readFileSync(path);
if (buf[0] === 0xef) fs.writeFileSync(path, buf.slice(3));
console.log("ok");
