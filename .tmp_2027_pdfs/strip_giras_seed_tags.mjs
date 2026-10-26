import fs from "fs";

const p = "supabase/seed_giras_2027_sinf_cf.sql";
let s = fs.readFileSync(p, "utf8");
s = s.replace(/\. \[seed:giras2027-sinf-cf\]/g, ".");
s = s.replace(/'\[seed:giras2027-sinf-cf\]'/g, "NULL");
s = s.replace(/-- Tag: \[seed:giras2027-sinf-cf\]\r?\n/g, "");
s = s.replace(
  /WHERE coalesce\(subtitulo, ''\) LIKE '%\[seed:giras2027-sinf-cf\]%';/,
  [
    "WHERE nombre_gira = 'Apertura de temporada: Mahler y Wagner'",
    "    AND fecha_desde >= DATE '2027-01-01'",
    "    AND fecha_desde <= DATE '2027-12-31';",
  ].join("\n"),
);
s = s.replace(
  /RAISE EXCEPTION 'Ya existen % programas con tag % — aborto \(idempotencia\)', v_existing, '\[seed:giras2027-sinf-cf\]';/,
  "RAISE EXCEPTION 'Ya existe programa Apertura de temporada: Mahler y Wagner en 2027 — aborto (idempotencia)';",
);
fs.writeFileSync(p, s);
console.log("remaining [seed:", (s.match(/\[seed:/g) || []).length);
