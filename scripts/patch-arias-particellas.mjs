/**
 * Re-sincroniza particellas desde Drive para obras ARIAS con instrumentos corregidos.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  fetchInstrumentos,
  headers,
  listFolder,
  SB_URL,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";

/** Obras con renombrado de PDFs / corrección de instrumentos. */
export const INSTRUMENT_PATCH_OBRA_IDS = [
  3491, 3492, 3493, 3495, 3496,
  3506, 3507, 3508, 3509, 3510, 3511, 3512, 3513, 3514,
];

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (map.has(key)) {
      const existing = map.get(key);
      existing.url_archivo = JSON.stringify([
        ...JSON.parse(existing.url_archivo),
        ...JSON.parse(p.url_archivo),
      ]);
    } else {
      map.set(key, { ...p });
    }
  }
  return [...map.values()];
}

async function buildParts(folderUrl, instrumentos) {
  const files = (await listFolder(folderUrl)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  const parts = [];
  for (const file of files.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
    const suggested = suggestPartFromDriveFile(file, instrumentos);
    if (!suggested) {
      console.warn("  Sin match:", file.name);
      continue;
    }
    parts.push({
      ...suggested,
      url_archivo: JSON.stringify([
        { url: file.webViewLink, description: file.name },
      ]),
    });
  }
  return dedupeParts(parts);
}

async function fetchObra(id) {
  const res = await fetch(
    `${SB_URL}/rest/v1/obras?id=eq.${id}&select=id,titulo,link_drive,instrumentacion`,
    { headers: { Authorization: headers.Authorization, apikey: headers.apikey } },
  );
  const rows = await res.json();
  return rows[0];
}

const ids = process.argv.slice(2).map(Number).filter(Boolean);
const targetIds = ids.length ? ids : INSTRUMENT_PATCH_OBRA_IDS;

let sql = `-- Patch particellas ARIAS (instrumentos corregidos)
-- ${new Date().toISOString().slice(0, 10)}

DO $$
BEGIN
`;

const instrumentos = await fetchInstrumentos();

for (const id of targetIds) {
  const obra = await fetchObra(id);
  if (!obra?.link_drive) {
    console.warn("Sin link_drive:", id);
    continue;
  }
  const parts = await buildParts(obra.link_drive, instrumentos);
  const inst = calculateInstrumentation(parts);
  console.log(`${obra.titulo} (${id}): ${parts.length} partes | ${inst}`);

  sql += `  UPDATE obras SET instrumentacion = '${sqlEscape(inst)}' WHERE id = ${id};
  DELETE FROM obras_particellas WHERE id_obra = ${id};

`;
  for (const p of parts) {
    const solista = p.es_solista ? "true" : "false";
    sql += `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${id}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});

`;
  }
}

sql += `END $$;
`;

await import("fs").then(({ writeFileSync }) =>
  writeFileSync("supabase/patch_arias_particellas.sql", sql, "utf8"),
);
console.log("\nEscrito supabase/patch_arias_particellas.sql");
