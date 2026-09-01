/**
 * Sync Charbonnier — Concierto para cello / Violoncello Nro. 1 (obra 3401).
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  suggestPartFromDriveFile,
} from "./lib/drivePartMatcher.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import {
  CHARBONNIER_CELLO_DRIVE,
  CHARBONNIER_CELLO_WORK,
} from "./lib/charbonnierCelloCatalog.mjs";

function markSolista(part, fileName) {
  if (
    /\bsolo\b|solista/i.test(fileName) ||
    /\bsolo\b|solista/i.test(part.nombre_archivo || "")
  ) {
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
    const before = parts.length;
    appendSeedPartsFromFile(parts, file, instrumentos);
    if (parts.length === before) {
      const one = suggestPartFromDriveFile(file, instrumentos);
      if (!one) {
        console.warn("  Sin match:", file.name);
        continue;
      }
      parts.push({
        ...one,
        url_archivo: JSON.stringify([
          { url: file.webViewLink, description: file.name },
        ]),
      });
    }
    const last = parts[parts.length - 1];
    Object.assign(last, markSolista(last, file.name));
    console.log(
      `  ${file.name} → ${last.id_instrumento} ${last.nombre_archivo}${last.es_solista ? " (solista)" : ""}`,
    );
  }
  return parts;
}

async function main() {
  const work = CHARBONNIER_CELLO_WORK;
  const instrumentos = await fetchInstrumentos();
  const parts = await buildParts(CHARBONNIER_CELLO_DRIVE, instrumentos);
  const inst = calculateInstrumentation(parts);

  console.log(
    `\nUPDATE obra ${work.obraId}: ${parts.length} partes | ${inst}`,
  );

  let sql = `-- Charbonnier — Concierto para Violoncello y orquesta Nro. 1 → obra ${work.obraId}
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- Drive: ${CHARBONNIER_CELLO_DRIVE}

DO $$
BEGIN
  UPDATE obras SET
    titulo = '${sqlEscape(work.tituloDb)}',
    link_drive = '${sqlEscape(CHARBONNIER_CELLO_DRIVE)}',
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

  writeSeed("supabase/seed_charbonnier_cello_sync.sql", sql, []);
  console.log("\nSeed: supabase/seed_charbonnier_cello_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
