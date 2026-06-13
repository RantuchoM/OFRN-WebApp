/**
 * Seed: obras desde «Para acomodar» (post-renombrado) → Archivo oficial + BD.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  SB_URL,
  SB_KEY,
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  headers,
  listFolder,
  personKey,
  personVarSafe,
  sleep,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const PARA_ACOMODAR =
  "https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

/** Carpeta original completa de Je veux vivre (27 particellas). */
const GOUNOD_JE_VEUX_VIVRE =
  "https://drive.google.com/drive/folders/1a_UH2yvl4xPRI1iLuce0M5h2_EyzfltC";

const COMPOSER_BY_TAG = {
  "Verdi, G": { apellido: "Verdi", nombre: "Giuseppe" },
  "Gounod, C": { apellido: "Gounod", nombre: "Charles" },
  "Rey Jr., V": { apellido: "Rey", nombre: "Venus" },
  "Medoza y Cortés, Q": { apellido: "Medoza y Cortés", nombre: "Quintín" },
  "Puccini, G": { apellido: "Puccini", nombre: "Giacomo" },
  "Grieg, E": { apellido: "Grieg", nombre: "Edvard" },
};

const FALLBACK_YEARS = {
  "Sí, vendetta ('Rigoletto')": 1851,
  "Je veux vivre ('Roméo et Juliette')": 1867,
  "A portrait of Frida Kahlo": 2019,
  "Peer Gynt (Suite 1)": 1875,
  "Peer Gynt (Suite 2)": 1891,
  "Il Trovatore, Coro de gitanos": 1853,
  "La forza del destino, Obertura": 1862,
  "Quando m'en vo (Vals de Musetta, 'La Bohème')": 1896,
};

const TARGET_FOLDERS = new Set([
  "Verdi, G. - Sí, vendetta ('Rigoletto')",
  "Rey Jr., V. - A portrait of Frida Kahlo",
  "Medoza y Cortés, Q. - Cielito Lindo",
  "Puccini, G. - Quando m'en vo (Vals de Musetta, 'La Bohème')",
  "Verdi, G. - Il Trovatore, Coro de gitanos",
  "Verdi, G. - La forza del destino, Obertura",
  "Grieg, E. - Peer Gynt (Suite 1)",
  "Grieg, E. - Peer Gynt (Suite 2)",
]);

/** Obras con carpeta Drive explícita (fuera de Para acomodar). */
const EXTRA_WORK_SOURCES = [
  {
    folderName: "Gounod, C. - Je veux vivre ('Roméo et Juliette')",
    folderUrl: GOUNOD_JE_VEUX_VIVRE,
    titulo: "Je veux vivre ('Roméo et Juliette')",
    compositor: { apellido: "Gounod", nombre: "Charles" },
  },
];

function parseCanonicalFolder(name) {
  const m = (name || "").match(/^\s*(.+?)\.\s*-\s*(.+?)\s*$/);
  if (!m) return null;
  const composerTag = m[1].trim();
  const titulo = m[2].trim();
  const compositor = COMPOSER_BY_TAG[composerTag];
  if (!compositor) return null;
  return { composerTag, titulo, compositors: [compositor] };
}

async function copyToArchivo(linkOrigen, nombreCarpeta) {
  const res = await fetch(`${SB_URL}/functions/v1/manage-drive`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "copiar_carpeta_a_archivo",
      link_origen: linkOrigen,
      nombre_carpeta: nombreCarpeta.slice(0, 200).replace(/[/\\?*:[\]]/g, "_"),
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data));
  return data.link_drive;
}

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

async function ingestWork({
  folderName,
  folderUrl,
  titulo,
  compositors,
  instrumentos,
}) {
  const parts = await buildParts(folderUrl, instrumentos);
  const meta = await fetchWorkMetadata(
    titulo,
    compositors[0],
    `${compositors[0].nombre || ""} ${compositors[0].apellido} ${titulo}`.trim(),
  );
  if (meta.anio == null && FALLBACK_YEARS[titulo] != null) {
    meta.anio = FALLBACK_YEARS[titulo];
  }
  if (meta.duracion_segundos != null && meta.duracion_segundos > 900) {
    meta.duracion_segundos = null;
  }

  console.log(`Copiando al Archivo: ${folderName}…`);
  const linkArchivo = await copyToArchivo(folderUrl, folderName);
  await sleep(400);

  const inst = calculateInstrumentation(parts);
  console.log(
    `  ${titulo}: ${parts.length} partes | ${inst} | año=${meta.anio ?? "—"} dur=${meta.duracion_segundos ?? "—"}s`,
  );

  return {
    titulo,
    compositors,
    arranger: null,
    observaciones: `Para acomodar — ${folderName}`,
    link_drive: linkArchivo,
    instrumentacion: inst,
    parts,
    ...meta,
  };
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const rootItems = await listFolder(PARA_ACOMODAR);
  const workData = [];

  for (const item of rootItems) {
    if (!item.mimeType?.includes("folder")) continue;
    if (!TARGET_FOLDERS.has(item.name)) {
      if (!item.name.includes("Grieg") && !item.name.includes("Gounod")) {
        console.warn("Omitida (no en lista):", item.name);
      }
      continue;
    }

    const parsed = parseCanonicalFolder(item.name);
    if (!parsed) {
      console.warn("No parseada:", item.name);
      continue;
    }

    workData.push(
      await ingestWork({
        folderName: item.name,
        folderUrl: item.webViewLink,
        titulo: parsed.titulo,
        compositors: parsed.compositors,
        instrumentos,
      }),
    );
    await sleep(200);
  }

  for (const extra of EXTRA_WORK_SOURCES) {
    workData.push(
      await ingestWork({
        folderName: extra.folderName,
        folderUrl: extra.folderUrl,
        titulo: extra.titulo,
        compositors: [extra.compositor],
        instrumentos,
      }),
    );
    await sleep(200);
  }

  workData.sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));

  const sql = buildSeedSql({
    outComment: `-- Para acomodar → Archivo: ${workData.length} obras`,
    workData,
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_para_acomodar.sql", sql, workData);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
