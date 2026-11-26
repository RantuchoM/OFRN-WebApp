/**
 * Crea Concierto de Aranjuez en el archivo (no lo agrega a un programa).
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  ANIO,
  COMPOSITOR_ID,
  DURACION_SEGUNDOS,
  INSTRUMENTACION,
  LINK_YOUTUBE,
  OBSERVACIONES,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  PARTS,
  TARGET_FOLDER,
  TITULO_HTML,
  driveFolderUrl,
  partFilename,
} from "./lib/aranjuezCatalog.mjs";
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

  const metaByName = new Map(
    PARTS.map((p) => [foldName(partFilename(p.instrument)), p]),
  );
  const localNames = readdirSync(localDir)
    .filter((f) => /\.pdf$/i.test(f))
    .sort((a, b) => a.localeCompare(b, "es"));
  if (localNames.length !== PARTS.length) {
    throw new Error(`Se esperaban ${PARTS.length} PDF, hay ${localNames.length}`);
  }

  const driveId = await discoverDriveFolderId();
  const linkDrive = driveFolderUrl(driveId);

  let driveFiles = [];
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    driveFiles = (await listFolder(linkDrive)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
    if (driveFiles.length >= PARTS.length) break;
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
    if (parts.length !== before + 1) {
      throw new Error(`Match inesperado en ${name}: +${parts.length - before}`);
    }
    const meta = metaByName.get(foldName(name));
    const row = parts[parts.length - 1];
    row.es_solista = Boolean(meta?.solista);
    row.nota_organico = meta?.nota || null;
    row.nombre_archivo = meta?.instrument || row.nombre_archivo;
  }

  const partSql = parts
    .map((p) => {
      const nota = p.nota_organico ? `'${sqlEscape(p.nota_organico)}'` : "NULL";
      const solista = p.es_solista ? "true" : "false";
      return `    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista}, ${nota});`;
    })
    .join("\n");

  const sql = `-- Rodrigo, Concierto de Aranjuez. Alquiler Schott. No se agrega a un programa.

DO $$
DECLARE
  _id_obra bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.id_compositor = ${COMPOSITOR_ID} AND oc.rol = 'compositor'
    WHERE o.titulo = '${sqlEscape(TITULO_HTML)}'
  ) THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, link_youtube)
    VALUES (
      '${sqlEscape(TITULO_HTML)}',
      ${ANIO},
      ${DURACION_SEGUNDOS},
      'Oficial',
      '${sqlEscape(OBSERVACIONES)}',
      '${sqlEscape(INSTRUMENTACION)}',
      '${sqlEscape(linkDrive)}',
      '${sqlEscape(LINK_YOUTUBE)}'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, ${COMPOSITOR_ID}, 'compositor');

${partSql}

    -- El trigger suma la reducción de piano como Key. El orgánico de la obra no la incluye.
    UPDATE obras SET instrumentacion = '${sqlEscape(INSTRUMENTACION)}' WHERE id = _id_obra;

    RAISE NOTICE 'Obra creada: %', _id_obra;
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Concierto de Aranjuez';
  END IF;
END $$;
`;

  const out = "supabase/seed_aranjuez_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`Escrito ${out} (${parts.length} partes)`);
  console.log(`Drive: ${linkDrive}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
