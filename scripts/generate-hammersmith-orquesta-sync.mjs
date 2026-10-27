/**
 * Sync Hammersmith (ORQUESTA Drive) → obra #3687 (versión banda).
 *
 *   node scripts/generate-hammersmith-orquesta-sync.mjs
 */
import { existsSync, readdirSync } from "fs";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  collapseSameChairTranspositions,
} from "./lib/drivePartMatcher.mjs";
import {
  HAMMERSMITH_ORQUESTA_DRIVE_FOLDER_ID,
  HAMMERSMITH_ORQUESTA_ROOT,
  HAMMERSMITH_ORQUESTA_WORK,
  driveFolderUrl,
} from "./lib/hammersmithOrquestaCatalog.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const work = HAMMERSMITH_ORQUESTA_WORK;

async function main() {
  const localDir = HAMMERSMITH_ORQUESTA_ROOT;
  if (!existsSync(localDir)) throw new Error(`No existe ${localDir}`);

  const localFiles = readdirSync(localDir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));

  const instrumentos = await fetchInstrumentos();
  const linkDrive = driveFolderUrl(HAMMERSMITH_ORQUESTA_DRIVE_FOLDER_ID);
  const driveFiles = (await listFolder(linkDrive)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  console.log(`local ${localFiles.length} / drive ${driveFiles.length}`);
  console.log(linkDrive);

  const byName = new Map(driveFiles.map((f) => [f.name, f]));
  const files = localFiles.map((f) => {
    const hit = byName.get(f.name);
    if (!hit?.webViewLink) throw new Error(`Sin URL Drive: ${f.name}`);
    return { ...f, webViewLink: hit.webViewLink, id: hit.id };
  });

  const parts = [];
  for (const file of [...files].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  )) {
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) console.warn("Sin match:", file.name);
    else console.log(`${file.name} → +${n}`);
  }
  const collapsed = collapseSameChairTranspositions(parts);
  const inst = calculateInstrumentation(collapsed);
  console.log(`${collapsed.length} particellas | ${inst}`);

  let sql = `-- Holst Hammersmith Op.52 (banda) → obra ${work.obraId}
-- Carpeta ORQUESTA Drive ${HAMMERSMITH_ORQUESTA_DRIVE_FOLDER_ID}
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
BEGIN
  UPDATE obras SET
    titulo = '${sqlEscape(work.tituloDb)}',
    link_drive = '${sqlEscape(linkDrive)}',
    observaciones = '${sqlEscape(work.observaciones)}',
    instrumentacion = '${sqlEscape(inst)}',
    anio_composicion = ${work.anio},
    duracion_segundos = ${work.duracion_segundos}
  WHERE id = ${work.obraId};

  DELETE FROM obras_particellas WHERE id_obra = ${work.obraId};

`;

  for (const p of collapsed) {
    const solista = p.es_solista ? "true" : "false";
    sql += `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${work.obraId}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});

`;
  }

  sql += `END $$;
`;

  writeSeed("supabase/seed_hammersmith_orquesta_sync.sql", sql, [work]);
  console.log(`\nDrive: ${linkDrive}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
