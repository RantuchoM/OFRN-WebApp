/**
 * Sync Manuelita (Walsh) + Disney Favorites (quinteto) → BD + gira 170.
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  DISNEY_FAVORITES_WORK,
  GIRA_170,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  WALSH_DISNEY_WORKS,
  driveFolderUrl,
} from "./lib/walshDisneyCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  listFolder,
  personKey,
  personVarSafe,
  sleep,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (map.has(key)) {
      const existing = map.get(key);
      const merged = [
        ...JSON.parse(existing.url_archivo || "[]"),
        ...JSON.parse(p.url_archivo || "[]"),
      ];
      existing.url_archivo = JSON.stringify(merged);
    } else {
      map.set(key, { ...p });
    }
  }
  return [...map.values()];
}

function buildPartsFromFiles(files, instrumentos) {
  const parts = [];
  const pdfs = files
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  for (const file of pdfs) {
    const before = parts.length;
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) {
      console.warn("  Sin match:", file.name);
      continue;
    }
    if (!file.webViewLink) {
      for (let i = before; i < parts.length; i += 1) {
        parts[i].url_archivo = "[]";
      }
    }
    console.log(`  ${file.name} → ${n} particella(s)`);
  }
  return dedupeParts(parts);
}

function localPdfFiles(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

function localWorkDir(work) {
  const target = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (existsSync(target)) return target;
  if (!existsSync(PARA_ACOMODAR_ROOT)) return null;
  const needle = foldName(work.targetFolder).slice(0, 18);
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && foldName(d.name).includes(needle))
    .map((d) => d.name)[0];
  return hit ? join(PARA_ACOMODAR_ROOT, hit) : null;
}

async function discoverDriveFolderId(work) {
  if (work.driveFolderId) return work.driveFolderId;
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  try {
    const files = await listFolder(parentUrl);
    const needle = foldName(work.targetFolder);
    const hit =
      files.find((f) => foldName(f.name) === needle) ||
      files.find((f) => foldName(f.name).includes(needle.slice(0, 24)));
    if (hit?.id) {
      console.log(`  Drive folder: ${hit.name} (${hit.id})`);
      return hit.id;
    }
    console.warn(`  Para acomodar Drive aún no lista: ${work.targetFolder}`);
  } catch (e) {
    console.warn("  No se pudo listar Para acomodar:", e.message);
  }
  return null;
}

function inferInstrument(fileName, work) {
  const n = foldName(fileName);
  const hit = (work.renames || []).find((r) => {
    const canonical = foldName(
      canonicalPartFilename(
        r.instrument,
        work.workNumber,
        work.titulo,
        work.composerTag,
      ),
    );
    return (
      foldName(r.pdf) === n ||
      canonical === n ||
      n.startsWith(foldName(`${r.instrument} - `))
    );
  });
  return hit?.instrument || null;
}

function mergeDriveLinks(localFiles, driveFiles, work) {
  const byName = new Map((driveFiles || []).map((f) => [foldName(f.name), f]));
  const used = new Set();
  return localFiles.map((f) => {
    const exact = byName.get(foldName(f.name));
    if (exact?.webViewLink) {
      used.add(exact.id || exact.name);
      return { ...f, webViewLink: exact.webViewLink, id: exact.id };
    }
    const inst = inferInstrument(f.name, work);
    if (!inst) return f;
    const driveHit = (driveFiles || []).find((d) => {
      if (used.has(d.id || d.name)) return false;
      return inferInstrument(d.name, work) === inst;
    });
    if (!driveHit?.webViewLink) return f;
    used.add(driveHit.id || driveHit.name);
    return { ...f, webViewLink: driveHit.webViewLink, id: driveHit.id };
  });
}

function writeDisneyReplaceSql(data) {
  const work = data?.work || DISNEY_FAVORITES_WORK;
  const arr = work.arranger;
  const arrAp = sqlEscape(arr.apellido);
  const arrNom = arr.nombre ? `'${sqlEscape(arr.nombre)}'` : "NULL";
  const sql = `-- Disney Favorites (obra ${work.obraId}): reemplazo MuseScore Wood arr. Adrian Wagner
-- PDFs sobrescritos in-place en Drive (mismos file ids). No tocar particellas (seating).
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
DECLARE
  _id_arr bigint;
BEGIN
  SELECT id INTO _id_arr FROM compositores
  WHERE apellido = '${arrAp}' AND (nombre = ${arrNom} OR (nombre IS NULL AND ${arrNom} IS NULL))
  LIMIT 1;
  IF _id_arr IS NULL THEN
    INSERT INTO compositores (apellido, nombre)
    VALUES ('${arrAp}', ${arrNom})
    RETURNING id INTO _id_arr;
  END IF;

  UPDATE obras SET
    id_arreglador = _id_arr,
    observaciones = '${sqlEscape(work.observaciones)}',
    link_drive = '${sqlEscape(data?.link_drive || driveFolderUrl(work.driveFolderId))}'
  WHERE id = ${work.obraId};

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT ${work.obraId}, _id_arr, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores
    WHERE id_obra = ${work.obraId} AND id_compositor = _id_arr AND rol = 'arreglador'
  );
END $$;
`;
  writeFileSync("supabase/seed_disney_favorites_replace.sql", sql, "utf8");
  console.log("Replace: supabase/seed_disney_favorites_replace.sql");
}

function buildGiraSql(titles) {
  const titlesSql = titles
    .map((t) => `    '${sqlEscape(t)}'`)
    .join(",\n");
  return `-- Gira ${GIRA_170.id_programa} "${GIRA_170.nombre_gira}" — Manuelita + Disney Favorites
-- Bloque repertorio id=${GIRA_170.id_repertorio}. Idempotente.

DO $$
DECLARE
  _id_programa bigint := ${GIRA_170.id_programa};
  _block_id bigint := ${GIRA_170.id_repertorio};
  _orden int;
  _id_obra bigint;
  _titulo text;
  _titles text[] := ARRAY[
${titlesSql}
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM programas WHERE id = _id_programa) THEN
    RAISE EXCEPTION 'No existe gira/programa id=%', _id_programa;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM programas_repertorios
    WHERE id = _block_id AND id_programa = _id_programa
  ) THEN
    RAISE EXCEPTION 'Bloque repertorio % no pertenece a gira %', _block_id, _id_programa;
  END IF;

  SELECT COALESCE(MAX(orden), 0) INTO _orden
  FROM repertorio_obras
  WHERE id_repertorio = _block_id;

  FOREACH _titulo IN ARRAY _titles LOOP
    SELECT o.id INTO _id_obra
    FROM obras o
    WHERE o.titulo = _titulo
    ORDER BY o.id DESC
    LIMIT 1;

    IF _id_obra IS NULL THEN
      RAISE EXCEPTION 'Obra no encontrada: %', _titulo;
    END IF;

    IF EXISTS (
      SELECT 1 FROM repertorio_obras
      WHERE id_repertorio = _block_id AND id_obra = _id_obra
    ) THEN
      RAISE NOTICE 'Ya en bloque: % (%)', _id_obra, _titulo;
    ELSE
      _orden := _orden + 1;
      INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
      VALUES (_block_id, _id_obra, _orden);
      RAISE NOTICE 'Vinculada % (%) orden=%', _id_obra, _titulo, _orden;
    END IF;
  END LOOP;
END $$;
`;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const workData = [];
  let incompleteUrls = false;

  for (const work of WALSH_DISNEY_WORKS) {
    const localDir = localWorkDir(work);
    const localFiles = localPdfFiles(localDir);
    console.log(`\n=== ${work.titulo} ===`);
    console.log(`  Local: ${localDir || "(no)"} (${localFiles.length} PDFs)`);

    const driveId = await discoverDriveFolderId(work);
    const linkDrive = driveFolderUrl(driveId);
    let driveFiles = [];
    if (driveId) {
      try {
        driveFiles = (await listFolder(linkDrive)).filter((f) =>
          /\.pdf$/i.test(f.name || ""),
        );
        console.log(`  Drive: ${linkDrive} (${driveFiles.length} PDFs)`);
      } catch (e) {
        console.warn("  list_folder:", e.message);
      }
    }

    const files = mergeDriveLinks(localFiles, driveFiles, work);
    const withUrl = files.filter((f) => f.webViewLink).length;
    if (localFiles.length && withUrl < localFiles.length) {
      incompleteUrls = true;
      console.warn(`  URLs Drive incompletas (${withUrl}/${localFiles.length})`);
    }

    const parts = buildPartsFromFiles(files, instrumentos);
    const inst = calculateInstrumentation(parts);

    const fetched = await fetchWorkMetadata(
      work.titulo.replace(/\s*\[.+\]\s*$/, ""),
      work.compositor,
      work.durationQueryHint,
    );
    await sleep(250);
    const anio = work.anio ?? fetched.anio ?? null;
    let duracion = fetched.duracion_segundos ?? null;
    if (duracion != null && duracion > 900) duracion = null;

    console.log(
      `  ${parts.length} partes | ${inst} | anio=${anio ?? "null"} dur=${duracion ?? "null"}s`,
    );

    workData.push({
      work,
      titulo: work.titulo,
      compositors: [work.compositor],
      arranger: work.arranger,
      observaciones: work.observaciones,
      link_drive: linkDrive,
      instrumentacion: inst,
      parts,
      anio,
      duracion_segundos: duracion,
    });
  }

  const insertData = workData.filter(
    (w) => !(w.work?.action === "update" && w.work?.obraId),
  );
  const insertSql = buildSeedSql({
    outComment:
      "-- Walsh Manuelita + Disney Favorites (Para acomodar) → gira 170",
    workData: insertData,
    resolveArrangerVar: (w) =>
      w.arranger ? `_id_arr_${personVarSafe(personKey(w.arranger))}` : "NULL",
  });

  writeSeed("supabase/seed_walsh_disney_sync.sql", insertSql, insertData);
  writeDisneyReplaceSql(
    workData.find((w) => w.work?.key === DISNEY_FAVORITES_WORK.key),
  );
  const giraSql = buildGiraSql(workData.map((w) => w.titulo));
  writeFileSync("supabase/seed_gira_170_walsh_disney.sql", giraSql, "utf8");
  console.log("\nSeed: supabase/seed_walsh_disney_sync.sql");
  console.log("Gira: supabase/seed_gira_170_walsh_disney.sql");
  if (incompleteUrls) {
    console.log(
      "Nota: re-ejecutar `node scripts/generate-walsh-disney-sync.mjs` tras sync Drive para completar url_archivo.",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
