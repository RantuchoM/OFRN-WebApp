/**
 * Sync Nabucco IMSLP (ARIAS) → obra 3548.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import { NABUCCO_DRIVE_FOLDER, NABUCCO_WORK } from "./lib/nabuccoCatalog.mjs";

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
  return parts;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const parts = await buildParts(NABUCCO_DRIVE_FOLDER, instrumentos);
  const inst = calculateInstrumentation(parts);

  console.log(
    `UPDATE obra ${NABUCCO_WORK.obraId}: ${parts.length} partes | ${inst}`,
  );
  for (const p of parts) {
    console.log(`  ${p.id_instrumento} ${p.nombre_archivo}`);
  }

  let sql = `-- Verdi — Coro de los Esclavos ('Nabucco') IMSLP → obra ${NABUCCO_WORK.obraId}
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- Drive: ${NABUCCO_DRIVE_FOLDER}

DO $$
BEGIN
  UPDATE obras SET
    link_drive = '${sqlEscape(NABUCCO_DRIVE_FOLDER)}',
    instrumentacion = '${sqlEscape(inst)}',
    anio_composicion = ${NABUCCO_WORK.anio}
  WHERE id = ${NABUCCO_WORK.obraId};

  DELETE FROM obras_particellas WHERE id_obra = ${NABUCCO_WORK.obraId};

`;

  for (const p of parts) {
    const solista = p.es_solista ? "true" : "false";
    sql += `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${NABUCCO_WORK.obraId}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});

`;
  }

  sql += `END $$;
`;

  writeSeed("supabase/seed_nabucco_sync.sql", sql, []);
  console.log("\nSeed: supabase/seed_nabucco_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
