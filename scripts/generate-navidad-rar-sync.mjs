/**
 * Seed Drive -> BD: dos obras de Navidad (RAR de Downloads, Para acomodar).
 *   - Oh, Dulce Navidad (White Christmas) - Berlin / arr. Celso Torres Mora
 *   - El Burrito Sabanero - Hugo Blanco / arr. Yimi Giraldo
 * Etiqueta "Navidad" via palabras_clave + obras_palabras_clave (buildSeedSql tagName).
 *
 *   node scripts/generate-navidad-rar-sync.mjs
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
} from "./lib/repertoireSeedUtils.mjs";

const ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";
const PARENT_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";
const folderUrl = (id) => `https://drive.google.com/open?id=${id}`;

const WORKS = [
  {
    targetFolder: "Berlin, I. - Oh, Dulce Navidad (White Christmas)",
    titulo: "Oh, Dulce Navidad (White Christmas), para Orquesta y Coro",
    compositor: { apellido: "Berlin", nombre: "Irving" },
    arranger: { apellido: "Torres Mora", nombre: "Celso" },
    observaciones:
      "Para acomodar - Berlin, I. - Oh, Dulce Navidad (White Christmas). Arr. Celso Torres Mora (2015). Partes de Fl. 1, Ob. 1-2 y Fg. 1-2 rotuladas 'Navidad Blanca' (versión previa del mismo arreglo). Sin Flauta 2, Clarinetes ni voces separadas (SATB solo en el score).",
  },
  {
    targetFolder: "Blanco, H. - El Burrito Sabanero",
    titulo: "El Burrito Sabanero, para Orquesta y Coro",
    compositor: { apellido: "Blanco", nombre: "Hugo" },
    arranger: { apellido: "Giraldo", nombre: "Yimi" },
    observaciones:
      "Para acomodar - Blanco, H. - El Burrito Sabanero. Arr. Yimi Giraldo (Orquesta EAFIT). Partes recortadas de 'Partes.pdf'; Coro = 'Full vocal' (SATB).",
  },
];

const foldName = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (map.has(key)) {
      const ex = map.get(key);
      ex.url_archivo = JSON.stringify([
        ...JSON.parse(ex.url_archivo || "[]"),
        ...JSON.parse(p.url_archivo || "[]"),
      ]);
    } else map.set(key, { ...p });
  }
  return [...map.values()];
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const parent = await listFolder(folderUrl(PARENT_ID));
  const workData = [];
  const summary = [];
  for (const work of WORKS) {
    console.log(`\n=== ${work.titulo}`);
    const dir = join(ROOT, work.targetFolder);
    if (!existsSync(dir)) throw new Error(`No existe ${dir}`);
    const local = readdirSync(dir).filter((f) => /\.pdf$/i.test(f));
    const hit = parent.find(
      (f) =>
        String(f.mimeType || "").includes("folder") &&
        foldName(f.name) === foldName(work.targetFolder),
    );
    if (!hit?.id) throw new Error(`Drive no lista ${work.targetFolder}`);
    const driveFiles = (await listFolder(folderUrl(hit.id))).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
    const byName = new Map(driveFiles.map((f) => [foldName(f.name), f]));
    const files = local.map((name) => {
      const d = byName.get(foldName(name));
      return { name, webViewLink: d?.webViewLink || null, id: d?.id };
    });
    const missing = files.filter((f) => !f.webViewLink);
    if (missing.length)
      throw new Error(`Sin URL Drive: ${missing.map((m) => m.name).join("; ")}`);
    const parts = [];
    for (const f of files.sort((a, b) => a.name.localeCompare(b.name, "es"))) {
      const n = appendSeedPartsFromFile(parts, f, instrumentos);
      if (!n) console.warn("  SIN MATCH:", f.name);
    }
    const deduped = dedupeParts(parts);
    const inst = calculateInstrumentation(deduped);
    console.log(
      `  ${local.length} PDFs | ${deduped.length} particellas | ${inst} | folder ${hit.id}`,
    );
    for (const p of deduped)
      console.log(`    ${p.id_instrumento} | ${p.nombre_archivo}`);
    workData.push({
      titulo: work.titulo,
      compositors: [work.compositor],
      arranger: work.arranger,
      observaciones: work.observaciones,
      link_drive: folderUrl(hit.id),
      instrumentacion: inst,
      parts: deduped,
      anio: null,
      duracion_segundos: null,
    });
    summary.push({ titulo: work.titulo, folder: hit.id, parts: deduped.length, inst });
  }
  const sql = buildSeedSql({
    outComment: "-- Navidad: Oh, Dulce Navidad (White Christmas) + El Burrito Sabanero",
    workData,
    resolveArrangerVar: (w) => `_id_arr_${personVarSafe(personKey(w.arranger))}`,
    tagName: "Navidad",
  });
  const out = "supabase/seed_navidad_rar_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`\nSeed: ${out}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
