/**
 * Sync Dvořák — Serenata para Cuerdas Op. 22 — Drive → BD.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  listFolder,
  sleep,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import {
  DVORAK_SERENATA_DRIVE_FOLDER,
  DVORAK_SERENATA_WORK,
} from "./lib/dvorakSerenataCuerdasCatalog.mjs";

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
  const parts = await buildParts(DVORAK_SERENATA_DRIVE_FOLDER, instrumentos);

  const fetched = await fetchWorkMetadata(
    "Serenata para Cuerdas en Mi mayor, Op. 22",
    DVORAK_SERENATA_WORK.compositor,
    "Dvořák Serenade for Strings in E major Op 22",
  );
  const meta = {
    anio: DVORAK_SERENATA_WORK.anio ?? fetched.anio,
    duracion_segundos: fetched.duracion_segundos,
  };
  if (meta.duracion_segundos != null && meta.duracion_segundos > 3600) {
    meta.duracion_segundos = null;
  }
  await sleep(300);

  const inst = calculateInstrumentation(parts);
  console.log(`INSERT Serenata Op. 22: ${parts.length} partes | ${inst}`);
  for (const p of parts) console.log("  ", p.id_instrumento, p.nombre_archivo);

  const sql = buildSeedSql({
    outComment: `-- Dvořák — Serenata para Cuerdas en Mi mayor, Op. 22`,
    workData: [
      {
        titulo: DVORAK_SERENATA_WORK.titulo,
        compositors: [DVORAK_SERENATA_WORK.compositor],
        arranger: null,
        observaciones: `Para acomodar — ${DVORAK_SERENATA_WORK.targetFolder}`,
        link_drive: DVORAK_SERENATA_DRIVE_FOLDER,
        instrumentacion: inst,
        parts,
        ...meta,
      },
    ],
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_dvorak_serenata_cuerdas_sync.sql", sql, [
    { titulo: DVORAK_SERENATA_WORK.titulo },
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
