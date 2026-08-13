/**
 * Show Invap → Para acomodar + seed BD + repertorio gira 157
 *
 * - 6 obras Lema existentes → solo a repertorio 157
 * - 4 obras nuevas (Cantaloupe, Lester, Mexican Connection, El Vuelo)
 *   - El Vuelo: Lema = compositor (sin arreglador)
 *   - Resto: Lema = arreglador
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  suggestPartFromDriveFile,
} from "./lib/drivePartMatcher.mjs";
import {
  extractInstrumentFromExistingName,
  normalizeInstrumentLabel,
  renamePdfFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";
import {
  SB_URL,
  SB_KEY,
  headers,
  listFolder,
  fetchInstrumentos,
  sqlEscape,
  sleep,
  personVarSafe,
} from "./lib/repertoireSeedUtils.mjs";

const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";
const PARA_ACOMODAR_LOCAL =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";
const LEMA_INTEGRANTE_ID = 4340365;
const REPERTORIO_ID = 132; // programas_repertorios de programa 157
const FFPROBE =
  process.env.FFPROBE ||
  "C:\\Users\\marti\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffprobe.exe";

const EXISTING_FOR_GIRA = [
  { folder: "Almost Like Being In Love", obraId: 3303 },
  { folder: "Bernie's Tune", obraId: 3317 },
  { folder: "I Can't Get Started", obraId: 3305 },
  { folder: "If I Should Lose You", obraId: 3308 },
  { folder: "Summertime", obraId: 3304 },
  { folder: "Time After Time", obraId: 3306 },
];

/** Obras a crear (copia Drive + particellas). */
const NEW_WORKS = [
  {
    sourceFolderId: "1KjRoKpygNariau7Jrmlqa0q0bQlcWywT",
    sourceFolder: "Cantaloupe Island",
    targetFolder: "Hancock-Lema - Cantaloupe Island",
    titulo: "Cantaloupe Island",
    compositors: [{ apellido: "Hancock", nombre: "Herbie" }],
    arranger: { apellido: "Lema", nombre: "Germán" },
    composerTag: "Hancock-Lema",
    id_integrante_arreglador: LEMA_INTEGRANTE_ID,
  },
  {
    sourceFolderId: "1Rl_uBmvMsZQwzA2tm3JQOXVEJQxAUOvU",
    sourceFolder: "Lester Leaps In",
    targetFolder: "Young-Lema - Lester Leaps In",
    titulo: "Lester Leaps In",
    compositors: [{ apellido: "Young", nombre: "Lester" }],
    arranger: { apellido: "Lema", nombre: "Germán" },
    composerTag: "Young-Lema",
    id_integrante_arreglador: LEMA_INTEGRANTE_ID,
  },
  {
    sourceFolderId: "1qDjYd3KkFFmdtFSe3pzvzduS7yaqvT-W",
    sourceFolder: "The Mexican Connection",
    targetFolder: "Joel-Lema - The Mexican Connection",
    titulo: "The Mexican Connection",
    compositors: [{ apellido: "Joel", nombre: null }],
    arranger: { apellido: "Lema", nombre: "Germán" },
    composerTag: "Joel-Lema",
    id_integrante_arreglador: LEMA_INTEGRANTE_ID,
  },
  {
    sourceFolderId: "1E16N_OMNB9lyNT7wFP719X-U6WsEB9gd",
    sourceFolder: "El Vuelo del Wachinango",
    targetFolder: "Lema, G. - El Vuelo del Wachinango",
    titulo: "El Vuelo del Wachinango",
    compositors: [{ apellido: "Lema", nombre: "Germán" }],
    arranger: null, // Lema es compositor, no arreglador
    composerTag: "Lema, G",
    id_integrante_arreglador: null,
  },
];

const dryRun = process.argv.includes("--dry-run");
const skipCopy = process.argv.includes("--skip-copy");
const onlySeed = process.argv.includes("--only-seed");
const onlyGira = process.argv.includes("--only-gira");

function driveFolderUrl(id) {
  return `https://drive.google.com/drive/folders/${id}`;
}

function extractFolderId(link) {
  const m = String(link || "").match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m?.[1] || null;
}

async function copyToParaAcomodar(sourceFolderId, nombreCarpeta) {
  const res = await fetch(`${SB_URL}/functions/v1/manage-drive`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "copiar_link_a_carpeta",
      link_origen: driveFolderUrl(sourceFolderId),
      nombre_carpeta: nombreCarpeta,
      id_carpeta_destino: PARA_ACOMODAR_FOLDER_ID,
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data));
  return data;
}

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (map.has(key)) {
      const existing = map.get(key);
      const merged = [
        ...JSON.parse(existing.url_archivo),
        ...JSON.parse(p.url_archivo),
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
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) {
      const one = suggestPartFromDriveFile(file, instrumentos);
      if (one) {
        parts.push({
          ...one,
          url_archivo: JSON.stringify([
            { url: file.webViewLink, description: file.name },
          ]),
        });
      } else {
        console.warn("  Sin match particella:", file.name);
      }
    }
  }
  return dedupeParts(parts);
}

async function downloadDriveFileTo(fileId, destPath) {
  const res = await fetch(`${SB_URL}/functions/v1/manage-drive`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "get_file_content",
      sourceUrl: `https://drive.google.com/file/d/${fileId}/view`,
    }),
  });
  const data = await res.json();
  if (!data.success || !data.fileBase64) {
    throw new Error(`download failed: ${JSON.stringify(data).slice(0, 300)}`);
  }
  writeFileSync(destPath, Buffer.from(data.fileBase64, "base64"));
}

function ffprobeDurationSeconds(filePath) {
  if (!existsSync(FFPROBE)) return null;
  const r = spawnSync(
    FFPROBE,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.warn("  ffprobe error:", r.stderr || r.error);
    return null;
  }
  const sec = parseFloat(String(r.stdout || "").trim());
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return Math.round(sec);
}

async function durationFromMp3InFolder(files, localFolderName) {
  // Prefer local synced MP3 + ffprobe (get_file_content base64 falla con MP3 grandes)
  if (localFolderName) {
    const localDir = join(PARA_ACOMODAR_LOCAL, localFolderName);
    if (existsSync(localDir)) {
      try {
        const { readdirSync } = await import("fs");
        const mp3Local = readdirSync(localDir).find((f) => /\.mp3$/i.test(f));
        if (mp3Local) {
          const sec = ffprobeDurationSeconds(join(localDir, mp3Local));
          console.log(
            `  Duración local (${mp3Local}): ${sec != null ? `${sec}s` : "no detectada"}`,
          );
          if (sec != null) return sec;
        }
      } catch (e) {
        console.warn("  ffprobe local:", e.message);
      }
    }
  }

  const mp3 = files.find((f) => /\.mp3$/i.test(f.name || ""));
  if (!mp3?.id) return null;
  const tmpDir = join(process.cwd(), "scripts", ".tmp-invap");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  const dest = join(tmpDir, `${mp3.id}.mp3`);
  console.log(`  Descargando MP3 para duración: ${mp3.name}`);
  try {
    await downloadDriveFileTo(mp3.id, dest);
    const sec = ffprobeDurationSeconds(dest);
    console.log(`  Duración: ${sec != null ? `${sec}s` : "no detectada"}`);
    return sec;
  } catch (e) {
    console.warn("  No se pudo obtener duración MP3:", e.message);
    return null;
  }
}

function waitForLocalFolder(folderName, timeoutMs = 180000) {
  const target = join(PARA_ACOMODAR_LOCAL, folderName);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(target)) return target;
    spawnSync("powershell", ["-Command", "Start-Sleep -Seconds 3"], {
      stdio: "ignore",
    });
    process.stdout.write(".");
  }
  return existsSync(target) ? target : null;
}

function buildInsertSql(workData) {
  // Custom seed: includes id_integrante_arreglador
  const composerVars = new Map();
  const arrangerVars = new Map();
  for (const w of workData) {
    for (const c of w.compositors) {
      composerVars.set(`${c.apellido}|${c.nombre || ""}`, c);
    }
    if (w.arranger) {
      arrangerVars.set(`${w.arranger.apellido}|${w.arranger.nombre || ""}`, w.arranger);
    }
  }

  const decls = [
    "_id_obra bigint",
    ...[...composerVars.keys()].map((k) => `_id_comp_${personVarSafe(k)} bigint`),
    ...[...arrangerVars.keys()].map((k) => `_id_arr_${personVarSafe(k)} bigint`),
  ];

  let sql = `-- Show Invap Jazz Band — altas nuevas
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
DECLARE
  ${decls.join(";\n  ")};
BEGIN
`;

  for (const [key, c] of composerVars) {
    const safe = personVarSafe(key);
    const ap = sqlEscape(c.apellido);
    const nom = c.nombre ? `'${sqlEscape(c.nombre)}'` : "NULL";
    sql += `  SELECT id INTO _id_comp_${safe} FROM compositores WHERE apellido = '${ap}' AND (nombre = ${nom} OR (nombre IS NULL AND ${nom} IS NULL)) LIMIT 1;
  IF _id_comp_${safe} IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('${ap}', ${nom}) RETURNING id INTO _id_comp_${safe};
  END IF;

`;
  }

  for (const [key, a] of arrangerVars) {
    const safe = personVarSafe(key);
    const ap = sqlEscape(a.apellido);
    const nom = a.nombre ? `'${sqlEscape(a.nombre)}'` : "NULL";
    sql += `  SELECT id INTO _id_arr_${safe} FROM compositores WHERE apellido = '${ap}' AND (nombre = ${nom} OR (nombre IS NULL AND ${nom} IS NULL)) LIMIT 1;
  IF _id_arr_${safe} IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('${ap}', ${nom}) RETURNING id INTO _id_arr_${safe};
  END IF;

`;
  }

  for (const w of workData) {
    const titulo = sqlEscape(w.titulo);
    const arrVar = w.arranger
      ? `_id_arr_${personVarSafe(`${w.arranger.apellido}|${w.arranger.nombre || ""}`)}`
      : "NULL";
    const idInt =
      w.id_integrante_arreglador != null ? String(w.id_integrante_arreglador) : "NULL";
    const dur =
      w.duracion_segundos != null ? String(w.duracion_segundos) : "NULL";

    const idempotency = w.arranger
      ? `    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '${titulo}' AND oc.id_compositor = ${arrVar}`
      : `    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor'
    WHERE o.titulo = '${titulo}' AND oc.id_compositor = _id_comp_${personVarSafe(`${w.compositors[0].apellido}|${w.compositors[0].nombre || ""}`)}
      AND NOT EXISTS (
        SELECT 1 FROM obras_compositores oc2
        WHERE oc2.id_obra = o.id AND oc2.rol = 'arreglador'
      )`;

    sql += `  -- ${w.titulo}
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    ${idempotency}
  ) THEN
    INSERT INTO obras (
      titulo, id_arreglador, duracion_segundos, estado, observaciones,
      instrumentacion, link_drive, id_integrante_arreglador
    ) VALUES (
      '${titulo}',
      ${arrVar},
      ${dur},
      'Oficial',
      '${sqlEscape(w.observaciones)}',
      '${sqlEscape(w.instrumentacion)}',
      '${sqlEscape(w.link_drive)}',
      ${idInt}
    )
    RETURNING id INTO _id_obra;

`;
    for (const c of w.compositors) {
      const safe = personVarSafe(`${c.apellido}|${c.nombre || ""}`);
      sql += `    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_${safe}, 'compositor');
`;
    }
    if (w.arranger) {
      sql += `    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, ${arrVar}, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = ${arrVar}
    );

`;
    }
    for (const p of w.parts) {
      const solista = p.es_solista ? "true" : "false";
      sql += `    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});
`;
    }
    sql += `  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): ${titulo}';
  END IF;

`;
  }

  sql += `END $$;
`;
  return sql;
}

function buildGiraSql(obraIds) {
  let sql = `-- Asignar obras al repertorio programa 157 (id_repertorio=${REPERTORIO_ID})
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
DECLARE
  _orden int;
  _id_obra bigint;
BEGIN
  SELECT COALESCE(MAX(orden), 0) INTO _orden
  FROM repertorio_obras WHERE id_repertorio = ${REPERTORIO_ID};

`;
  for (const id of obraIds) {
    sql += `  _id_obra := ${id};
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = ${REPERTORIO_ID} AND id_obra = _id_obra
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (${REPERTORIO_ID}, _id_obra, _orden);
    RAISE NOTICE 'Agregada obra % en orden %', _id_obra, _orden;
  ELSE
    RAISE NOTICE 'Obra % ya estaba en repertorio ${REPERTORIO_ID}', _id_obra;
  END IF;

`;
  }
  sql += `END $$;
`;
  return sql;
}

async function resolveNewObraIds(workData) {
  const ids = [];
  for (const w of workData) {
    const titulo = encodeURIComponent(w.titulo);
    const rows = await fetch(
      `${SB_URL}/rest/v1/obras?titulo=eq.${titulo}&select=id,titulo,id_integrante_arreglador,obras_compositores(rol,compositores(apellido,nombre))&order=id.desc&limit=5`,
      { headers: { Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY } },
    ).then((r) => r.json());
    let hit = null;
    for (const o of rows || []) {
      const comps = (o.obras_compositores || []).filter((x) => x.rol === "compositor");
      const arrs = (o.obras_compositores || []).filter((x) => x.rol === "arreglador");
      const hasComp = comps.some(
        (c) =>
          (c.compositores?.apellido || "").toLowerCase() ===
          w.compositors[0].apellido.toLowerCase(),
      );
      if (!hasComp) continue;
      if (w.arranger) {
        const hasArr = arrs.some(
          (a) => (a.compositores?.apellido || "").toLowerCase() === "lema",
        );
        if (hasArr) {
          hit = o;
          break;
        }
      } else if (arrs.length === 0) {
        hit = o;
        break;
      }
    }
    if (hit) {
      ids.push(hit.id);
      console.log(`  Resuelto ${w.titulo} → id ${hit.id}`);
    } else {
      console.warn(`  No se pudo resolver id de ${w.titulo}`);
    }
  }
  return ids;
}

async function applySqlViaRestNotPossible() {
  // Seeds are applied via supabase db query --linked
  return null;
}

async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
  console.log("Para acomodar local:", PARA_ACOMODAR_LOCAL);

  if (onlyGira) {
    const ids = EXISTING_FOR_GIRA.map((x) => x.obraId);
    // try load previously created ids from manifest
    const manifestPath = "scripts/tmp-invap-manifest.json";
    if (existsSync(manifestPath)) {
      const m = JSON.parse(readFileSync(manifestPath, "utf8"));
      for (const id of m.newObraIds || []) ids.push(id);
    }
    const sql = buildGiraSql(ids);
    writeFileSync("supabase/seed_invap_gira157.sql", sql, "utf8");
    console.log("Escrito supabase/seed_invap_gira157.sql");
    return;
  }

  const instrumentos = await fetchInstrumentos();
  const workData = [];
  const copyResults = [];

  for (const work of NEW_WORKS) {
    console.log(`\n=== ${work.titulo} ===`);
    let linkDrive = null;
    let folderId = work.sourceFolderId;

    if (!onlySeed && !skipCopy) {
      if (dryRun) {
        console.log(`  [dry] copiar ${work.sourceFolder} → ${work.targetFolder}`);
      } else {
        console.log(`  Copiando a Para acomodar como «${work.targetFolder}»…`);
        const copied = await copyToParaAcomodar(
          work.sourceFolderId,
          work.targetFolder,
        );
        linkDrive = copied.link_drive;
        folderId = extractFolderId(linkDrive) || folderId;
        console.log(`  Copia OK: ${linkDrive}`);
        copyResults.push({
          titulo: work.titulo,
          targetFolder: work.targetFolder,
          link_drive: linkDrive,
          folderId,
        });

        // Esperar sync local y renombrar PDFs
        process.stdout.write("  Esperando sync local");
        const localPath = waitForLocalFolder(work.targetFolder, 240000);
        console.log("");
        if (localPath) {
          console.log(`  Local: ${localPath}`);
          const renames = renamePdfFilesInFolder(
            localPath,
            {
              workNumber: null,
              workTitle: work.titulo,
              composerTag: work.composerTag,
            },
            { dryRun: false },
          );
          for (const r of renames.filter((x) => x.action === "rename")) {
            console.log(`    ${r.from} → ${r.to}`);
          }
          // dar tiempo a que Drive propague renames
          await sleep(5000);
        } else {
          console.warn(
            "  Carpeta local aún no sincronizada; seed usará nombres originales de la copia Drive.",
          );
        }
      }
    } else if (skipCopy || onlySeed) {
      // Reusar manifest si existe
      const manifestPath = "scripts/tmp-invap-manifest.json";
      if (existsSync(manifestPath)) {
        const m = JSON.parse(readFileSync(manifestPath, "utf8"));
        const prev = (m.copies || []).find((c) => c.titulo === work.titulo);
        if (prev) {
          linkDrive = prev.link_drive;
          folderId = prev.folderId || extractFolderId(linkDrive);
          console.log(`  Reusando copia: ${linkDrive}`);
        }
      }
      if (!linkDrive) {
        // fallback: usar source (no ideal)
        linkDrive = driveFolderUrl(work.sourceFolderId);
        folderId = work.sourceFolderId;
        console.warn("  Sin copia previa; usando carpeta fuente.");
      }
    }

    if (dryRun && !linkDrive) {
      linkDrive = driveFolderUrl(work.sourceFolderId);
      folderId = work.sourceFolderId;
    }

    // Listar archivos (preferir copia)
    await sleep(800);
    let files = await listFolder(driveFolderUrl(folderId));
    // Si acabamos de renombrar localmente, re-list puede aún tener nombres viejos;
    // intentamos una segunda pasada.
    if (!dryRun && !onlySeed && !skipCopy) {
      await sleep(4000);
      files = await listFolder(driveFolderUrl(folderId));
    }

    const parts = buildPartsFromFiles(files, instrumentos);
    const inst = calculateInstrumentation(parts);
    console.log(`  Partes: ${parts.length} | ${inst}`);

    let duracion = null;
    if (!dryRun) {
      duracion = await durationFromMp3InFolder(files, work.targetFolder);
    }

    workData.push({
      ...work,
      observaciones: `Show Invap / Jazz Band — ${work.targetFolder}`,
      link_drive: linkDrive || driveFolderUrl(work.sourceFolderId),
      instrumentacion: inst,
      parts,
      duracion_segundos: duracion,
    });
  }

  writeFileSync(
    "scripts/tmp-invap-manifest.json",
    JSON.stringify({ copies: copyResults, generatedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );

  const insertSql = buildInsertSql(workData);
  writeFileSync("supabase/seed_invap_show_new.sql", insertSql, "utf8");
  console.log(`\nEscrito supabase/seed_invap_show_new.sql (${workData.length} obras)`);

  // Preview matcher issues
  for (const w of workData) {
    console.log(`\n${w.titulo}:`);
    for (const p of w.parts) {
      console.log(`  - [${p.id_instrumento}] ${p.nombre_archivo}${p.es_solista ? " (solo)" : ""}`);
    }
  }

  if (dryRun) {
    console.log("\nDry-run: no se aplica SQL ni gira.");
    return;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
