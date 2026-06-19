/**
 * Sync Falla — Para acomodar → BD (obra 3532, link_drive directo).
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import { FALLA_DRIVE_FOLDER, FALLA_WORK } from "./lib/fallaCatalog.mjs";

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
  const parts = await buildParts(FALLA_DRIVE_FOLDER, instrumentos);
  const inst = calculateInstrumentation(parts);

  console.log(
    `UPDATE obra ${FALLA_WORK.obraId}: ${parts.length} partes | ${inst}`,
  );

  let sql = `-- Falla — Danza Española Nro 1 ('La Vida Breve') → obra ${FALLA_WORK.obraId}
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
BEGIN
  UPDATE obras SET
    link_drive = '${sqlEscape(FALLA_DRIVE_FOLDER)}',
    observaciones = '${sqlEscape(`Para acomodar — ${FALLA_WORK.targetFolder}`)}',
    instrumentacion = '${sqlEscape(inst)}',
    anio_composicion = ${FALLA_WORK.anio}
  WHERE id = ${FALLA_WORK.obraId};

  DELETE FROM obras_particellas WHERE id_obra = ${FALLA_WORK.obraId};

`;

  for (const p of parts) {
    const solista = p.es_solista ? "true" : "false";
    sql += `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${FALLA_WORK.obraId}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});

`;
  }

  sql += `END $$;
`;

  writeSeed("supabase/seed_falla_sync.sql", sql, []);
  console.log("\nSeed: supabase/seed_falla_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
