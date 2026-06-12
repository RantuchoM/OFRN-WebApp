/**
 * Parchea obras Magnolario ya insertadas: título con [Magnolario] + instrumentación vía calculateInstrumentation.
 */
import { writeFileSync } from "fs";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";

const SB_URL = "https://muxrbuivopnawnxlcjxq.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzIsImV4cCI6MjA4MDM1ODkzMn0._tMDAJg2r5vfR1y0JPYd3LVDB66CcyXtj5dY4RqrxIg";

const TITLE_SUFFIX = " [Magnolario]";
const headers = { Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY };

const sqlEscape = (s) => String(s ?? "").replace(/'/g, "''");

function withMagnolarioSuffix(titulo) {
  const t = (titulo || "").trim();
  if (t.endsWith(TITLE_SUFFIX)) return t;
  return `${t}${TITLE_SUFFIX}`;
}

function partsFromRows(particellas) {
  return (particellas || []).map((p) => ({
    nombre_archivo: p.nombre_archivo,
    instrumento_nombre: p.instrumentos?.instrumento,
    instrumento_abreviatura: p.instrumentos?.abreviatura,
    es_solista: !!p.es_solista,
    nota_organico: p.nota_organico || "",
  }));
}

async function main() {
  const res = await fetch(
    `${SB_URL}/rest/v1/obras?observaciones=like.Magnolario%25&select=id,titulo,instrumentacion,obras_particellas(nombre_archivo,es_solista,nota_organico,instrumentos(instrumento,abreviatura))&order=id`,
    { headers },
  );
  if (!res.ok) throw new Error(await res.text());
  const obras = await res.json();

  if (!obras.length) {
    console.log("No hay obras Magnolario para parchear.");
    return;
  }

  let sql = `-- Parche títulos [Magnolario] + instrumentación calculada\nBEGIN;\n\n`;

  for (const obra of obras) {
    const newTitle = withMagnolarioSuffix(obra.titulo);
    const newInstr = calculateInstrumentation(partsFromRows(obra.obras_particellas));
    sql += `UPDATE obras SET titulo = '${sqlEscape(newTitle)}', instrumentacion = '${sqlEscape(newInstr)}' WHERE id = ${obra.id};\n`;
    console.log(`${obra.id}: "${obra.titulo}" → "${newTitle}" | ${obra.instrumentacion} → ${newInstr}`);
  }

  sql += `\nCOMMIT;\n`;
  const outPath = "supabase/patch_magnolario_titles_instrumentacion.sql";
  writeFileSync(outPath, sql, "utf8");
  console.log(`\nEscrito ${outPath} (${obras.length} obras)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
