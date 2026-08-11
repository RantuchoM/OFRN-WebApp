/**
 * Sync Charbonnier — Voces latinoamericanas (obra 3201) desde Drive.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import {
  CHARBONNIER_VOCES_DRIVE_FOLDER,
  CHARBONNIER_VOCES_WORK,
} from "./lib/charbonnierVocesCatalog.mjs";

function markSolistaIfVocal(part) {
  const label = `${part.instrumento_nombre || ""} ${part.nombre_archivo || ""}`;
  if (/soprano|cantante|voz\b/i.test(label)) {
    return { ...part, es_solista: true };
  }
  return part;
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
    const part = markSolistaIfVocal({
      ...suggested,
      url_archivo: JSON.stringify([
        { url: file.webViewLink, description: file.name },
      ]),
    });
    console.log(
      `  ${file.name} → ${part.id_instrumento} ${part.instrumento_nombre || ""} ${part.es_solista ? "(solista)" : ""}`,
    );
    parts.push(part);
  }
  return parts;
}

async function main() {
  const work = CHARBONNIER_VOCES_WORK;
  const instrumentos = await fetchInstrumentos();
  const parts = await buildParts(CHARBONNIER_VOCES_DRIVE_FOLDER, instrumentos);
  const inst = calculateInstrumentation(parts);

  console.log(
    `\nUPDATE obra ${work.obraId}: ${parts.length} partes | ${inst}`,
  );

  let sql = `-- Charbonnier — Voces latinoamericanas → obra ${work.obraId}
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
BEGIN
  UPDATE obras SET
    link_drive = '${sqlEscape(CHARBONNIER_VOCES_DRIVE_FOLDER)}',
    observaciones = '${sqlEscape(`Para acomodar — ${work.targetFolder}`)}',
    instrumentacion = '${sqlEscape(inst)}'
  WHERE id = ${work.obraId};

  DELETE FROM obras_particellas WHERE id_obra = ${work.obraId};

`;

  for (const p of parts) {
    const solista = p.es_solista ? "true" : "false";
    sql += `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${work.obraId}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});

`;
  }

  sql += `END $$;
`;

  writeSeed("supabase/seed_charbonnier_voces_sync.sql", sql, []);
  console.log("\nSeed: supabase/seed_charbonnier_voces_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
