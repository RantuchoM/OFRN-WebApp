/**
 * Sync obra 2458 (Concierto triple) desde carpeta archivo + Drive.
 * Fusiona repertorio 3898 → 2458 y marca 3898 Informativo.
 *
 *   node scripts/generate-beethoven-triple-sync.mjs
 *   node scripts/generate-beethoven-triple-sync.mjs --allow-empty-urls
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  collapseSameChairTranspositions,
} from "./lib/drivePartMatcher.mjs";
import {
  ARCHIVO_ORQUESTA_ROOT,
  BEETHOVEN_TRIPLE_WORK,
  driveFolderUrl,
} from "./lib/beethovenTripleCatalog.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";

const work = BEETHOVEN_TRIPLE_WORK;

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildParts(files, instrumentos) {
  const parts = [];
  for (const file of files
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"))) {
    const before = parts.length;
    appendSeedPartsFromFile(parts, file, instrumentos);
    if (parts.length === before) console.warn("  Sin match:", file.name);
    else console.log(`  ${file.name}`);
  }
  return collapseSameChairTranspositions(parts);
}

async function main() {
  const allowEmpty = process.argv.includes("--allow-empty-urls");
  const localDir = join(ARCHIVO_ORQUESTA_ROOT, work.targetFolder);
  if (!existsSync(localDir)) {
    throw new Error(
      `No existe ${localDir}. Corré process-beethoven-triple-local.mjs primero.`,
    );
  }

  const localFiles = readdirSync(localDir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));

  const linkDrive = driveFolderUrl(work.driveFolderId);
  let driveFiles = [];
  try {
    driveFiles = (await listFolder(linkDrive)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
  } catch (e) {
    console.warn(`listFolder: ${e.message}`);
  }

  const byName = new Map(driveFiles.map((f) => [foldName(f.name), f]));
  const files = localFiles.map((f) => {
    const hit = byName.get(foldName(f.name));
    return hit?.webViewLink
      ? { ...f, webViewLink: hit.webViewLink, id: hit.id }
      : f;
  });
  const withUrl = files.filter((f) => f.webViewLink).length;
  console.log(
    `${work.targetFolder}: local ${localFiles.length} / drive ${driveFiles.length} / urls ${withUrl}`,
  );
  if (withUrl < localFiles.length && !allowEmpty) {
    throw new Error(
      `URLs incompletas ${withUrl}/${localFiles.length}. Sync Drive o --allow-empty-urls.`,
    );
  }

  const instrumentos = await fetchInstrumentos();
  const parts = buildParts(files, instrumentos);
  const inst = calculateInstrumentation(parts);
  console.log(`→ ${parts.length} partes | ${inst}`);

  const obs = `Archivo — ${work.targetFolder}. ${work.observacionesExtra || ""}`.trim();

  let sql = `-- Beethoven Concierto triple Op.56 → obra ${work.obraId} (fusiona ${work.mergeFromObraId})
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
BEGIN
  -- Repertorio temporada: 3898 → 2458
  UPDATE repertorio_obras
  SET id_obra = ${work.obraId}
  WHERE id_obra = ${work.mergeFromObraId}
    AND NOT EXISTS (
      SELECT 1 FROM repertorio_obras x
      WHERE x.id_repertorio = repertorio_obras.id_repertorio
        AND x.id_obra = ${work.obraId}
    );

  DELETE FROM repertorio_obras WHERE id_obra = ${work.mergeFromObraId};

  UPDATE obras SET
    titulo = '${sqlEscape(work.titulo)}',
    link_drive = '${sqlEscape(linkDrive)}',
    observaciones = '${sqlEscape(obs)}',
    instrumentacion = '${sqlEscape(inst)}',
    anio_composicion = ${work.anio},
    duracion_segundos = ${work.duracion_segundos ?? "NULL"},
    estado = 'Oficial'
  WHERE id = ${work.obraId};

  DELETE FROM obras_particellas WHERE id_obra = ${work.obraId};
`;

  for (const p of parts) {
    sql += `
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${work.obraId}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${p.es_solista ? "true" : "false"});
`;
  }

  sql += `
  UPDATE obras SET
    estado = 'Informativo',
    observaciones = 'Fusionada en obra archivo ${work.obraId} (Concierto triple Op. 56). Solicitud temporada 2027 retirada.',
    link_drive = NULL,
    instrumentacion = NULL
  WHERE id = ${work.mergeFromObraId};

  DELETE FROM obras_particellas WHERE id_obra = ${work.mergeFromObraId};
END $$;
`;

  const out = "supabase/seed_beethoven_triple_2458_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`Seed: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
