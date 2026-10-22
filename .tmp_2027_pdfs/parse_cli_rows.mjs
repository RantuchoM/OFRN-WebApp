import fs from "node:fs";

const [,, inPath, outPath] = process.argv;
let t = fs.readFileSync(inPath, "utf8");
// CLI injects version banners mid-stream
t = t
  .split(/\r?\n/)
  .filter(
    (line) =>
      !/^A new version of Supabase CLI/i.test(line) &&
      !/^We recommend updating/i.test(line) &&
      !/^https:\/\/supabase\.com\/docs/i.test(line) &&
      !/Initialising login role/i.test(line) &&
      !/^En línea:/i.test(line) &&
      !/^\s*\+\s/i.test(line) &&
      !/CategoryInfo/i.test(line) &&
      !/FullyQualifiedErrorId/i.test(line) &&
      !/NativeCommandError/i.test(line) &&
      !/node\.exe :/i.test(line),
  )
  .join("\n");

const start = t.indexOf("{");
if (start < 0) throw new Error("no json object");
let depth = 0;
let end = -1;
let inStr = false;
let esc = false;
for (let k = start; k < t.length; k++) {
  const c = t[k];
  if (inStr) {
    if (esc) esc = false;
    else if (c === "\\") esc = true;
    else if (c === '"') inStr = false;
    continue;
  }
  if (c === '"') {
    inStr = true;
    continue;
  }
  if (c === "{") depth++;
  else if (c === "}") {
    depth--;
    if (depth === 0) {
      end = k;
      break;
    }
  }
}
if (end < 0) throw new Error("unterminated json");
const payload = JSON.parse(t.slice(start, end + 1));
const rows = payload.rows || [];
fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
console.log("wrote", outPath, "rows", rows.length);
for (const r of rows.filter((x) => Array.isArray(x.tramos) && x.tramos.length >= 2)) {
  console.log(
    r.id,
    r.nombre_gira,
    r.tramos
      .map(
        (s) =>
          `${s.indice}:${(s.localidad_ids || []).join("+")} ${s.fecha_desde}→${s.fecha_hasta}`,
      )
      .join(" | "),
  );
}
