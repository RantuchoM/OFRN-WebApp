/**
 * Sync Mendelssohn Sym.1 — Para acomodar → BD (insert obra nueva).
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
  MENDELSSOHN_DRIVE_FOLDER,
  MENDELSSOHN_WORK,
} from "./lib/mendelssohnCatalog.mjs";

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
  const parts = await buildParts(MENDELSSOHN_DRIVE_FOLDER, instrumentos);

  let meta = {
    anio: MENDELSSOHN_WORK.anio,
    duracion_segundos: null,
  };
  const fetched = await fetchWorkMetadata(
    MENDELSSOHN_WORK.titulo,
    MENDELSSOHN_WORK.compositor,
    `Felix Mendelssohn Symphony No 1 Op 11`,
  );
  meta = {
    anio: fetched.anio ?? MENDELSSOHN_WORK.anio,
    duracion_segundos: fetched.duracion_segundos,
  };
  if (meta.duracion_segundos != null && meta.duracion_segundos > 3600) {
    meta.duracion_segundos = null;
  }
  await sleep(300);

  const inst = calculateInstrumentation(parts);
  console.log(
    `INSERT ${MENDELSSOHN_WORK.titulo}: ${parts.length} partes | ${inst}`,
  );

  const insertSql = buildSeedSql({
    outComment: `-- Mendelssohn — Sinfonía Nro 1 en Do Mayor, op.11 (obra nueva)`,
    workData: [
      {
        titulo: MENDELSSOHN_WORK.titulo,
        compositors: [MENDELSSOHN_WORK.compositor],
        arranger: null,
        observaciones: `Para acomodar — ${MENDELSSOHN_WORK.targetFolder}`,
        link_drive: MENDELSSOHN_DRIVE_FOLDER,
        instrumentacion: inst,
        parts,
        ...meta,
      },
    ],
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_mendelssohn_sync.sql", insertSql, [
    { titulo: MENDELSSOHN_WORK.titulo },
  ]);
  console.log("\nSeed: supabase/seed_mendelssohn_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
