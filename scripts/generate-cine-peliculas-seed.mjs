/**
 * Seed: TEMPORAL CINE → obras con tag Películas + particellas Drive.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile, DIRECTOR_INSTRUMENT_ID } from "./lib/drivePartMatcher.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  listFolder,
  personKey,
  personVarSafe,
  sleep,
  withTitleSuffix,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const ROOT_FOLDER =
  "https://drive.google.com/open?id=1C2XlYc1gf00NRMvq2Vl3Slpj4M23x9AD";

const TITLE_SUFFIX = " [Películas]";
const TAG_NAME = "Películas";

const COMPOSERS = {
  Badelt: { apellido: "Badelt", nombre: "Klaus" },
  Horner: { apellido: "Horner", nombre: "James" },
  Williams: { apellido: "Williams", nombre: "John" },
  Zimmer: { apellido: "Zimmer", nombre: "Hans" },
};

const ARRANGERS = {
  Ricketts: { apellido: "Ricketts", nombre: "Theodore" },
  Moss: { apellido: "Moss", nombre: null },
  Sayre: { apellido: "Sayre", nombre: "Jerry" },
  Williams: { apellido: "Williams", nombre: "John" },
};

const FALLBACK_YEARS = {
  "Piratas del Caribe": 2003,
  "Apollo 13": 1995,
  Titanic: 1997,
  "Star Wars, Main Theme": 1977,
  "Amistad, Dry your Tears, Afrika": 1997,
  "The Imperial March": 1980,
  "The Lion King": 1994,
};

const FALLBACK_DURATIONS = {
  Titanic: 240,
};

function parseFolderEntry(name) {
  let m = (name || "").match(/^Badelt-Ricketts\s*-\s*(.+)$/i);
  if (m) {
    return {
      titulo: m[1].trim(),
      compositors: [COMPOSERS.Badelt],
      arranger: ARRANGERS.Ricketts,
      observaciones: "Películas — arr. Theodore Ricketts (Badelt)",
    };
  }
  m = (name || "").match(/^Horner-Moss\s*-\s*(.+)$/i);
  if (m) {
    return {
      titulo: m[1].trim(),
      compositors: [COMPOSERS.Horner],
      arranger: ARRANGERS.Moss,
      observaciones: "Películas — arr. Moss (Horner)",
    };
  }
  m = (name || "").match(/^Williams-Sayre\s*-\s*(.+)$/i);
  if (m) {
    return {
      titulo: m[1].trim(),
      compositors: [COMPOSERS.Williams],
      arranger: ARRANGERS.Sayre,
      observaciones: "Películas — arr. Jerry Sayre (Williams)",
    };
  }
  m = (name || "").match(/^Williams,\s*J\s*-\s*(.+)$/i);
  if (m) {
    return {
      titulo: m[1].trim(),
      compositors: [COMPOSERS.Williams],
      arranger: ARRANGERS.Williams,
      observaciones: "Películas — John Williams",
    };
  }
  return null;
}

function scorePartFromFile(file) {
  return {
    id_instrumento: DIRECTOR_INSTRUMENT_ID,
    nombre_archivo: "SCORE",
    instrumento_nombre: "Director",
    instrumento_abreviatura: null,
    es_solista: false,
    url_archivo: JSON.stringify([
      { url: file.webViewLink, description: file.name },
    ]),
  };
}

async function buildPartsFromFolder(folderUrl, instrumentos) {
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
  const rootItems = await listFolder(ROOT_FOLDER);
  const workData = [];

  for (const item of rootItems) {
    if (item.mimeType === "application/vnd.google-apps.folder") {
      const parsed = parseFolderEntry(item.name);
      if (!parsed) {
        console.warn("Carpeta no parseada:", item.name);
        continue;
      }
      const parts = await buildPartsFromFolder(item.webViewLink, instrumentos);
      const meta = await fetchWorkMetadata(
        parsed.titulo,
        parsed.compositors[0],
        `${parsed.compositors[0].nombre || ""} ${parsed.compositors[0].apellido} ${parsed.titulo} film score`.trim(),
      );
      if (meta.anio == null && FALLBACK_YEARS[parsed.titulo] != null) {
        meta.anio = FALLBACK_YEARS[parsed.titulo];
      }
      if (meta.duracion_segundos != null && meta.duracion_segundos > 900) {
        meta.duracion_segundos = FALLBACK_DURATIONS[parsed.titulo] ?? null;
      }
      const titulo = withTitleSuffix(parsed.titulo, TITLE_SUFFIX);
      const inst = calculateInstrumentation(parts);
      console.log(
        `  ${titulo}: ${parts.length} partes | ${inst} | año=${meta.anio ?? "—"} dur=${meta.duracion_segundos ?? "—"}s`,
      );
      workData.push({
        ...parsed,
        titulo,
        link_drive: item.webViewLink,
        instrumentacion: inst,
        parts,
        ...meta,
      });
      await sleep(120);
      continue;
    }

    if (!/\.pdf$/i.test(item.name || "")) continue;

    if (/Imperial March/i.test(item.name)) {
      const titulo = withTitleSuffix("The Imperial March", TITLE_SUFFIX);
      const parts = [scorePartFromFile(item)];
      const meta = await fetchWorkMetadata(
        "The Imperial March",
        COMPOSERS.Williams,
        "John Williams Imperial March film score",
      );
      if (meta.anio == null) meta.anio = FALLBACK_YEARS["The Imperial March"];
      if (meta.duracion_segundos != null && meta.duracion_segundos > 900) {
        meta.duracion_segundos = null;
      }
      console.log(`  ${titulo}: 1 PDF score`);
      workData.push({
        titulo,
        compositors: [COMPOSERS.Williams],
        arranger: ARRANGERS.Williams,
        observaciones: "Películas — John Williams (Star Wars)",
        link_drive: item.webViewLink,
        instrumentacion: calculateInstrumentation(parts),
        parts,
        ...meta,
      });
      await sleep(120);
      continue;
    }

    if (/Lion King/i.test(item.name)) {
      const titulo = withTitleSuffix("The Lion King", TITLE_SUFFIX);
      const parts = [scorePartFromFile(item)];
      const meta = await fetchWorkMetadata(
        "The Lion King",
        COMPOSERS.Zimmer,
        "Hans Zimmer Lion King film score",
      );
      if (meta.anio == null) meta.anio = FALLBACK_YEARS["The Lion King"];
      if (meta.duracion_segundos != null && meta.duracion_segundos > 900) {
        meta.duracion_segundos = null;
      }
      console.log(`  ${titulo}: 1 PDF (score + parts)`);
      workData.push({
        titulo,
        compositors: [COMPOSERS.Zimmer],
        arranger: null,
        observaciones: "Películas — The Lion King (PDF score + parts)",
        link_drive: item.webViewLink,
        instrumentacion: calculateInstrumentation(parts),
        parts,
        ...meta,
      });
      await sleep(120);
    }
  }

  const sql = buildSeedSql({
    outComment: `-- TEMPORAL CINE: ${workData.length} obras con tag Películas`,
    workData,
    tagName: TAG_NAME,
    resolveArrangerVar: (w) => `_id_arr_${personVarSafe(personKey(w.arranger))}`,
  });

  writeSeed("supabase/seed_cine_peliculas.sql", sql, workData);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
