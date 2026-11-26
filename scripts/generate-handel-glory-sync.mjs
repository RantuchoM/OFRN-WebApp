/**
 * Actualiza la obra 3904 con el recorte de And the Glory of the Lord.
 * No crea otra obra. Violoncello y Contrabajo comparten el mismo PDF.
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  ANIO,
  DURACION_SEGUNDOS,
  OBRA_ID,
  OBSERVACIONES,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  TARGET_FOLDER,
  TITULO_HTML,
  driveFolderUrl,
} from "./lib/handelGloryCatalog.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sleep,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function discoverDriveFolderId() {
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  const needle = foldName(TARGET_FOLDER);
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const files = await listFolder(parentUrl);
    const hit = files.find(
      (f) =>
        String(f.mimeType || "").includes("folder") &&
        foldName(f.name) === needle,
    );
    if (hit?.id) {
      console.log(`Drive folder: ${hit.name} (${hit.id})`);
      return hit.id;
    }
    console.log(`  Intento ${attempt}: la carpeta todavía no está en Drive.`);
    await sleep(4000);
  }
  throw new Error(`Drive no lista «${TARGET_FOLDER}».`);
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const localDir = join(PARA_ACOMODAR_ROOT, TARGET_FOLDER);
  if (!existsSync(localDir)) throw new Error(`No está la carpeta local: ${localDir}`);
  const localNames = readdirSync(localDir)
    .filter((f) => /\.pdf$/i.test(f))
    .sort((a, b) => a.localeCompare(b, "es"));
  if (localNames.length !== 5) {
    throw new Error(`Se esperaban 5 PDF, hay ${localNames.length}`);
  }

  const driveId = await discoverDriveFolderId();
  const linkDrive = driveFolderUrl(driveId);

  let driveFiles = [];
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    driveFiles = (await listFolder(linkDrive)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
    if (driveFiles.length >= 5) break;
    console.log(`  Intento ${attempt}: Drive lista ${driveFiles.length} PDF.`);
    await sleep(4000);
  }
  const byName = new Map(driveFiles.map((f) => [foldName(f.name), f]));

  const parts = [];
  for (const name of localNames) {
    const hit = byName.get(foldName(name));
    if (!hit?.webViewLink) throw new Error(`Sin URL de Drive: ${name}`);
    const before = parts.length;
    appendSeedPartsFromFile(
      parts,
      { name, webViewLink: hit.webViewLink, id: hit.id },
      instrumentos,
    );
    if (parts.length === before) console.warn("  Sin match:", name);
  }

  const combined = parts.findIndex((p) =>
    /violoncello y contrabajo/i.test(p.nombre_archivo || ""),
  );
  if (combined >= 0) {
    const cello = instrumentos.find((i) => /^violoncello$/i.test(i.instrumento || ""));
    const bass = instrumentos.find((i) => /^contrabajo$/i.test(i.instrumento || ""));
    if (!cello || !bass) throw new Error("Faltan Violoncello o Contrabajo");
    const src = parts[combined];
    parts.splice(
      combined,
      1,
      { ...src, id_instrumento: cello.id, nombre_archivo: "Violoncello" },
      { ...src, id_instrumento: bass.id, nombre_archivo: "Contrabajo" },
    );
  }

  if (parts.length !== 6) {
    throw new Error(
      `Se esperaban 6 particellas, hay ${parts.length}: ${parts.map((p) => p.nombre_archivo).join(", ")}`,
    );
  }

  const partSql = parts
    .map(
      (p) =>
        `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${OBRA_ID}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', false);`,
    )
    .join("\n");

  const sql = `-- Händel, And the Glory of the Lord → obra ${OBRA_ID}
-- Recorte del coro [3] desde Messiah cuerdas y órgano. Vc y Cb, mismo PDF.

UPDATE obras SET
  titulo = '${sqlEscape(TITULO_HTML)}',
  anio_composicion = ${ANIO},
  duracion_segundos = ${DURACION_SEGUNDOS},
  link_drive = '${sqlEscape(linkDrive)}',
  observaciones = '${sqlEscape(OBSERVACIONES)}'
WHERE id = ${OBRA_ID};

DELETE FROM obras_particellas WHERE id_obra = ${OBRA_ID};

${partSql}
`;

  const out = "supabase/seed_handel_glory_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`Escrito ${out}`);
  console.log(parts.map((p) => p.nombre_archivo).join(", "));
  console.log(`Drive: ${linkDrive}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
