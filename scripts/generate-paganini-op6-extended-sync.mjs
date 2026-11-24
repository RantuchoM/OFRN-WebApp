/**
 * Crea/actualiza obra 3916 (Paganini Op.6 orquesta extendida) y la suma
 * al mismo repertorio que 3900 para que el director elija.
 *
 *   node scripts/generate-paganini-op6-extended-sync.mjs
 *   node scripts/generate-paganini-op6-extended-sync.mjs --allow-empty-urls
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  collapseSameChairTranspositions,
} from "./lib/drivePartMatcher.mjs";
import {
  PAGANINI_OP6_EXTENDED_WORK,
  PARA_ACOMODAR_FOLDER_ID,
  driveFolderUrl,
} from "./lib/paganiniOp6ExtendedCatalog.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";

const work = PAGANINI_OP6_EXTENDED_WORK;
const ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

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

async function discoverDriveFolderId() {
  if (work.driveFolderId) return work.driveFolderId;
  const files = await listFolder(driveFolderUrl(PARA_ACOMODAR_FOLDER_ID));
  const needle = foldName(work.targetFolder);
  const hit = files.find(
    (f) =>
      String(f.mimeType || "").includes("folder") &&
      foldName(f.name) === needle,
  );
  if (!hit?.id) {
    throw new Error(`Drive no lista «${work.targetFolder}». Esperá File Stream.`);
  }
  return hit.id;
}

async function main() {
  const allowEmpty = process.argv.includes("--allow-empty-urls");
  const localDir = join(ROOT, work.targetFolder);
  if (!existsSync(localDir)) throw new Error(`No existe ${localDir}`);

  const localFiles = readdirSync(localDir)
    .filter((f) => /\.pdf$/i.test(f) && !/raw split/i.test(f))
    .map((name) => ({ name, webViewLink: null }));

  const driveId = await discoverDriveFolderId();
  const linkDrive = driveFolderUrl(driveId);
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
      `URLs incompletas ${withUrl}/${localFiles.length}. Sync o --allow-empty-urls.`,
    );
  }

  const instrumentos = await fetchInstrumentos();
  const parts = buildParts(files, instrumentos);
  const inst = calculateInstrumentation(parts);
  console.log(`→ ${parts.length} partes | ${inst}`);

  const obs = `Para acomodar — ${work.targetFolder}. ${work.observacionesExtra || ""}`.trim();
  const sibling = work.mergeRepertorioWithObraId;

  let sql = `-- Paganini Op.6 orquesta extendida → obra ${work.obraId} (junto a ${sibling})
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
DECLARE
  v_obra int := ${work.obraId};
  v_rep int;
BEGIN
  INSERT INTO obras (id, titulo, duracion_segundos, estado, observaciones, instrumentacion, anio_composicion, link_drive)
  VALUES (
    v_obra,
    '${sqlEscape(work.titulo)}',
    ${work.duracion_segundos ?? "NULL"},
    'Oficial',
    '${sqlEscape(obs)}',
    '${sqlEscape(inst)}',
    ${work.anio},
    '${sqlEscape(linkDrive)}'
  )
  ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    duracion_segundos = EXCLUDED.duracion_segundos,
    estado = EXCLUDED.estado,
    observaciones = EXCLUDED.observaciones,
    instrumentacion = EXCLUDED.instrumentacion,
    anio_composicion = EXCLUDED.anio_composicion,
    link_drive = EXCLUDED.link_drive;

  IF NOT EXISTS (
    SELECT 1 FROM obras_compositores
    WHERE id_obra = v_obra AND id_compositor = ${work.compositorId}
  ) THEN
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (v_obra, ${work.compositorId}, 'compositor');
  END IF;

  DELETE FROM obras_particellas WHERE id_obra = v_obra;
`;

  for (const p of parts) {
    sql += `
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (v_obra, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${p.es_solista ? "true" : "false"});
`;
  }

  sql += `
  -- Aclarar set hermano (3900) y sumar 3916 a los mismos repertorios
  UPDATE obras SET
    titulo = '<p>Concierto para Violín Nro. 1 en Re mayor, Op. 6 (set vientos Generoso)</p><div>&nbsp; I. Allegro maestoso</div><div>&nbsp; II. Adagio</div><div>&nbsp; III. Rondo. Allegro spirituoso</div>',
    observaciones = 'Para acomodar — Paganini, N. - Concierto Violin Nro 1 Op.6. Set Generoso/Music Addict: vientos/metales + Violín Solo + SCORE (sin cuerdas orquestales ni fagot/perc). Alternativa: obra ${work.obraId} orquesta extendida completa. Director elige.',
    estado = 'Solicitud'
  WHERE id = ${sibling};

  FOR v_rep IN
    SELECT DISTINCT id_repertorio FROM repertorio_obras WHERE id_obra = ${sibling}
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM repertorio_obras
      WHERE id_repertorio = v_rep AND id_obra = v_obra
    ) THEN
      INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
      SELECT v_rep, v_obra, COALESCE(MAX(orden), 0) + 1
      FROM repertorio_obras WHERE id_repertorio = v_rep;
    END IF;
  END LOOP;

  PERFORM setval(
    pg_get_serial_sequence('obras', 'id'),
    GREATEST((SELECT max(id) FROM obras), v_obra)
  );
END $$;
`;

  const out = "supabase/seed_paganini_op6_extended_3916_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`Seed: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
