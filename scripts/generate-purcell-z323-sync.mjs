/**
 * Actualiza la obra 3906 con el score completo de Come, ye sons of art, Z.323.
 * No crea otra obra. El orgánico se escribe después de las particellas
 * porque el trigger ignora SCORE.
 */
import { existsSync, readdirSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  ANIO,
  DURACION_SEGUNDOS,
  INSTRUMENTACION,
  LINK_YOUTUBE,
  OBRA_ID,
  OBSERVACIONES,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  TARGET_FOLDER,
  TITULO_HTML,
  driveFolderUrl,
  partFilename,
} from "./lib/purcellZ323Catalog.mjs";
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

function ensureCanonicalName(localDir) {
  const pdfs = readdirSync(localDir).filter((f) => /\.pdf$/i.test(f));
  const target = partFilename("SCORE");
  if (pdfs.length === 1 && pdfs[0] === target) return target;
  if (pdfs.length !== 1) {
    throw new Error(`Se esperaba 1 PDF, hay ${pdfs.length}: ${pdfs.join(", ")}`);
  }
  renameSync(join(localDir, pdfs[0]), join(localDir, target));
  console.log(`Renombrado → ${target}`);
  return target;
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
  const localName = ensureCanonicalName(localDir);

  const driveId = await discoverDriveFolderId();
  const linkDrive = driveFolderUrl(driveId);

  let hit = null;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const driveFiles = (await listFolder(linkDrive)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
    hit = driveFiles.find((f) => foldName(f.name) === foldName(localName));
    if (hit?.webViewLink) break;
    console.log(`  Intento ${attempt}: el PDF todavía no está en Drive.`);
    await sleep(4000);
  }
  if (!hit?.webViewLink) throw new Error(`Sin URL de Drive: ${localName}`);

  const parts = [];
  appendSeedPartsFromFile(
    parts,
    { name: localName, webViewLink: hit.webViewLink, id: hit.id },
    instrumentos,
  );
  if (parts.length !== 1 || parts[0].nombre_archivo !== "SCORE") {
    throw new Error(`Se esperaba la particella SCORE, hay ${parts.length}`);
  }

  const partSql = parts
    .map(
      (p) =>
        `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${OBRA_ID}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', false);`,
    )
    .join("\n");

  const sql = `-- Purcell, Come, ye sons of art, Z.323 → obra ${OBRA_ID}
-- Score completo (Calebe Barros). Sin particellas de esta edición en IMSLP.

UPDATE obras SET
  titulo = '${sqlEscape(TITULO_HTML)}',
  anio_composicion = ${ANIO},
  duracion_segundos = ${DURACION_SEGUNDOS},
  link_youtube = '${sqlEscape(LINK_YOUTUBE)}',
  link_drive = '${sqlEscape(linkDrive)}',
  observaciones = '${sqlEscape(OBSERVACIONES)}'
WHERE id = ${OBRA_ID};

DELETE FROM obras_particellas WHERE id_obra = ${OBRA_ID};

${partSql}

-- Después del INSERT: el trigger deja el orgánico vacío porque solo hay SCORE.
UPDATE obras SET instrumentacion = '${sqlEscape(INSTRUMENTACION)}' WHERE id = ${OBRA_ID};
`;

  const out = "supabase/seed_purcell_z323_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`Escrito ${out}`);
  console.log(`Drive: ${linkDrive}`);
  console.log(`PDF: ${localName}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
