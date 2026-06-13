/**
 * Seed: quinteto bronces (varios arregladores) + cuarteto cuerdas Gruenberg.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
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

const COLLECTIONS = [
  {
    id: "bronces",
    rootFolder: "https://drive.google.com/open?id=1Yn1iRsfzHz2_T9QVZXHV8h7BINYc5giu",
    titleSuffix: " [Quinteto bronces]",
    durationHint: (titulo, compositor) => {
      const label = compositor.nombre
        ? `${compositor.nombre} ${compositor.apellido}`
        : compositor.apellido;
      return `${label} ${titulo} brass quintet`;
    },
    parseFolderName(name) {
      const m = (name || "").match(
        /^(.+?)\s*-\s*(.+?)\s*-\s*(.+?)\s*\[para quinteto de bronces\]/i,
      );
      if (!m) return null;
      const composerKey = m[1].trim();
      const arrangerKey = m[2].trim();
      const compositor = COMPOSER_MAP[composerKey];
      const arranger = ARRANGER_MAP[arrangerKey];
      if (!compositor || !arranger) return null;
      return {
        titulo: m[3].trim(),
        compositors: [compositor],
        arranger,
        observaciones: `Quinteto bronces — arr. ${arrangerLabel(arranger)}`,
      };
    },
  },
  {
    id: "gruenberg",
    rootFolder: "https://drive.google.com/open?id=1ed7pJq5Oc8V1xUnlM5CnqKZdfZovy9sN",
    titleSuffix: " [Cuarteto cuerdas]",
    durationHint: (titulo, compositor) => {
      const label = compositor.nombre
        ? `${compositor.nombre} ${compositor.apellido}`
        : compositor.apellido;
      return `${label} ${titulo} string quartet`;
    },
    parseFolderName(name) {
      const m = (name || "").match(
        /^(.+?)-Gruenberg\s*-\s*(.+?)\s*\[para cuarteto de cuerdas\]/i,
      );
      if (!m) return null;
      const composerKey = m[1].trim();
      const compositor = COMPOSER_MAP[composerKey];
      if (!compositor) return null;
      return {
        titulo: m[2].trim(),
        compositors: [compositor],
        arranger: GRUENBERG_ARRANGER,
        observaciones: "Cuarteto cuerdas — arr. Eugene Gruenberg",
      };
    },
  },
];

const GRUENBERG_ARRANGER = { apellido: "Gruenberg", nombre: "Eugene" };

const COMPOSER_MAP = {
  Bach: { apellido: "Bach", nombre: "Johann Sebastian" },
  Beethoven: { apellido: "Beethoven", nombre: "Ludwig van" },
  Chopin: { apellido: "Chopin", nombre: "Frédéric" },
  Clarke: { apellido: "Clarke", nombre: "Jeremiah" },
  Elgar: { apellido: "Elgar", nombre: "Edward" },
  Gluck: { apellido: "Gluck", nombre: "Christoph Willibald" },
  Godard: { apellido: "Godard", nombre: "Benjamin" },
  Kassmayer: { apellido: "Kassmayer", nombre: null },
  Leclair: { apellido: "Leclair", nombre: "Jean-Marie" },
  Mozart: { apellido: "Mozart", nombre: "Wolfgang Amadeus" },
  Paderewski: { apellido: "Paderewski", nombre: "Ignacy" },
  Pachelbel: { apellido: "Pachelbel", nombre: "Johann" },
  Raff: { apellido: "Raff", nombre: "Joachim" },
  Schubert: { apellido: "Schubert", nombre: "Franz" },
  Verdi: { apellido: "Verdi", nombre: "Giuseppe" },
  Vivaldi: { apellido: "Vivaldi", nombre: "Antonio" },
  Wagner: { apellido: "Wagner", nombre: "Richard" },
};

const ARRANGER_MAP = {
  Gale: { apellido: "Gale", nombre: "Jack" },
  Rossi: { apellido: "Rossi", nombre: null },
  Thomas: { apellido: "Thomas", nombre: "David R." },
  Holcombe: { apellido: "Holcombe", nombre: "William" },
  Dorsey: { apellido: "Dorsey", nombre: null },
};

const FALLBACK_YEARS = {
  "Air on the G String": 1720,
  "Sheep May Safely Graze": 1713,
  "Jesu Joy of Mans Desiring": 1723,
  "Ode To Joy": 1824,
  "Trumpet Voluntary": 1700,
  "Pomp And Circumstance": 1901,
  Kanon: 1680,
  "Triumphal March from Aida": 1871,
  Spring: 1723,
  "Elsa's Procession": 1850,
  "Bridal Chorus": 1850,
  "Prelude in B minor": 1709,
  "Adagio from Moonlight Sonata": 1801,
  "Prelude Op. 28 No. 4": 1839,
  "Gavotte from Paris and Helena": 1779,
  Canzonetta: 1880,
  "Ungarisch No. 1": 1900,
  "Ungarisch No. 2": 1900,
  "Sarabande et Tambourin": 1730,
  "Alla turca": 1783,
  "Menuet Op. 14 No. 1": 1884,
  Tarantella: 1855,
  "Menuet from Op. 78": 1827,
};

function arrangerLabel(a) {
  return a.nombre ? `${a.nombre} ${a.apellido}` : a.apellido;
}

async function buildCollectionWorks(collection, instrumentos) {
  const rootItems = await listFolder(collection.rootFolder);
  const folders = rootItems.filter(
    (f) => f.mimeType === "application/vnd.google-apps.folder",
  );
  const workData = [];

  for (const folder of folders.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
    const parsed = collection.parseFolderName(folder.name);
    if (!parsed) {
      console.warn(`[${collection.id}] Carpeta no parseada:`, folder.name);
      continue;
    }

    const files = (await listFolder(folder.webViewLink)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
    const parts = [];
    for (const file of files.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "es"),
    )) {
      const suggested = suggestPartFromDriveFile(file, instrumentos);
      if (!suggested) {
        console.warn(`[${collection.id}] Sin match:`, parsed.titulo, file.name);
        continue;
      }
      parts.push({
        ...suggested,
        url_archivo: JSON.stringify([
          { url: file.webViewLink, description: file.name },
        ]),
      });
    }

    const meta = await fetchWorkMetadata(
      parsed.titulo,
      parsed.compositors[0],
      collection.durationHint(parsed.titulo, parsed.compositors[0]),
    );
    if (meta.anio == null && FALLBACK_YEARS[parsed.titulo] != null) {
      meta.anio = FALLBACK_YEARS[parsed.titulo];
    }

    const tituloFull = withTitleSuffix(parsed.titulo, collection.titleSuffix);
    const inst = calculateInstrumentation(parts);
    console.log(
      `  [${collection.id}] ${tituloFull}: arr=${arrangerLabel(parsed.arranger)} año=${meta.anio ?? "—"} dur=${meta.duracion_segundos ?? "—"}s ${inst}`,
    );

    workData.push({
      ...parsed,
      titulo: tituloFull,
      link_drive: folder.webViewLink,
      instrumentacion: inst,
      parts,
      ...meta,
    });
    await sleep(120);
  }

  return workData;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const allWorks = [];

  for (const collection of COLLECTIONS) {
    console.log(`\n=== ${collection.id.toUpperCase()} ===`);
    const works = await buildCollectionWorks(collection, instrumentos);
    allWorks.push(...works);
  }

  const sql = buildSeedSql({
    outComment: `-- Bronces (varios arregladores) + Gruenberg cuarteto cuerdas (${allWorks.length} obras)`,
    workData: allWorks,
    resolveArrangerVar: (w) => `_id_arr_${personVarSafe(personKey(w.arranger))}`,
  });

  writeSeed("supabase/seed_bronces_gruenberg_cuerdas.sql", sql, allWorks);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
