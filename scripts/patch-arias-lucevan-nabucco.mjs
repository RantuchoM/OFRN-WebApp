/**
 * Genera SQL para refrescar particellas de E lucevan (3507) y Nabucco (3514).
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

const PATCHES = [
  { id: 3507, titulo: "E lucevan le stelle ('Tosca')" },
  { id: 3514, titulo: "Coro de los Esclavos ('Nabucco')" },
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

async function resolveFolder(id) {
  const res = await fetch(
    `${SB_URL}/rest/v1/obras?id=eq.${id}&select=link_drive,titulo`,
    { headers: { Authorization: headers.Authorization, apikey: headers.apikey } },
  );
  const rows = await res.json();
  return rows[0]?.link_drive;
}

let sql = `-- Patch E lucevan + Nabucco particellas
-- ${new Date().toISOString().slice(0, 10)}

DO $$
BEGIN
`;

const instrumentos = await fetchInstrumentos();

for (const patch of PATCHES) {
  const folder = await resolveFolder(patch.id);
  if (!folder) {
    console.warn("Sin link_drive:", patch.id);
    continue;
  }
  const parts = await buildParts(folder, instrumentos);
  const inst = calculateInstrumentation(parts);
  console.log(`${patch.titulo} (${patch.id}): ${parts.length} partes | ${inst}`);

  sql += `  UPDATE obras SET instrumentacion = '${sqlEscape(inst)}' WHERE id = ${patch.id};
  DELETE FROM obras_particellas WHERE id_obra = ${patch.id};

`;
  for (const p of parts) {
    const solista = p.es_solista ? "true" : "false";
    sql += `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${patch.id}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});

`;
  }
}

sql += `END $$;
`;

await import("fs").then(({ writeFileSync }) =>
  writeFileSync("supabase/patch_arias_lucevan_nabucco.sql", sql, "utf8"),
);
console.log("Escrito supabase/patch_arias_lucevan_nabucco.sql");
