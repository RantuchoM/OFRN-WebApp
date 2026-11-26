/**
 * Actualiza la obra 3894 (Sinfonía de cámara, Op. 110a) con las particellas
 * ya renombradas en Para acomodar. No crea otra obra.
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  ANIO,
  ARREGLADOR_ID,
  COMPOSITOR_ID,
  DURACION_SEGUNDOS,
  LINK_YOUTUBE,
  OBRA_ID,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  TARGET_FOLDER,
  TITULO_HTML,
  driveFolderUrl,
} from "./lib/shostakovich110aCatalog.mjs";
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

function buildParts(files, instrumentos) {
  const parts = [];
  for (const file of files) {
    const before = parts.length;
    appendSeedPartsFromFile(parts, file, instrumentos);
    const added = parts.length - before;
    console.log(`  ${file.name} → ${added}`);
    if (!added) console.warn("  Sin match:", file.name);
  }
  return parts;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const localDir = join(PARA_ACOMODAR_ROOT, TARGET_FOLDER);
  if (!existsSync(localDir)) throw new Error(`No está la carpeta local: ${localDir}`);
  const localNames = readdirSync(localDir)
    .filter((f) => /\.pdf$/i.test(f))
    .sort((a, b) => a.localeCompare(b, "es"));
  if (localNames.length !== 6) {
    throw new Error(`Se esperaban 6 PDF, hay ${localNames.length}`);
  }

  const driveId = await discoverDriveFolderId();
  const linkDrive = driveFolderUrl(driveId);
  const driveFiles = (await listFolder(linkDrive)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  const byName = new Map(driveFiles.map((f) => [foldName(f.name), f]));
  const files = localNames.map((name) => {
    const hit = byName.get(foldName(name));
    if (!hit?.webViewLink) throw new Error(`Sin URL de Drive: ${name}`);
    return { name, webViewLink: hit.webViewLink, id: hit.id };
  });

  const parts = buildParts(files, instrumentos);
  if (parts.length !== 6) {
    throw new Error(`Se esperaban 6 particellas, hay ${parts.length}`);
  }
  const inst = calculateInstrumentation(
    parts.map((p) => ({
      ...p,
      instrumento_nombre:
        instrumentos.find((i) => String(i.id) === String(p.id_instrumento))
          ?.instrumento || "",
    })),
  );
  console.log("Orgánico:", inst);

  const partSql = parts
    .map(
      (p) =>
        `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${OBRA_ID}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', false);`,
    )
    .join("\n");

  const sql = `-- Shostakovich, Sinfonía de cámara Op. 110a → obra ${OBRA_ID}
-- Arreglo de Rudolf Barshai del Cuarteto n.º 8. SCORE + 5 cuerdas.

UPDATE obras SET
  titulo = '${sqlEscape(TITULO_HTML)}',
  anio_composicion = ${ANIO},
  duracion_segundos = ${DURACION_SEGUNDOS},
  link_youtube = '${sqlEscape(LINK_YOUTUBE)}',
  link_drive = '${sqlEscape(linkDrive)}',
  instrumentacion = '${sqlEscape(inst)}',
  id_arreglador = ${ARREGLADOR_ID},
  estado = 'Oficial'
WHERE id = ${OBRA_ID};

UPDATE obras_compositores
SET rol = 'arreglador'
WHERE id_obra = ${OBRA_ID} AND id_compositor = ${ARREGLADOR_ID} AND rol = 'compositor';

INSERT INTO obras_compositores (id_obra, id_compositor, rol)
SELECT ${OBRA_ID}, ${ARREGLADOR_ID}, 'arreglador'
WHERE NOT EXISTS (
  SELECT 1 FROM obras_compositores
  WHERE id_obra = ${OBRA_ID} AND id_compositor = ${ARREGLADOR_ID}
);

DELETE FROM obras_particellas WHERE id_obra = ${OBRA_ID};

${partSql}
`;

  const out = "supabase/seed_shostakovich_110a_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`Escrito ${out}`);
  console.log(`Drive: ${linkDrive}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
