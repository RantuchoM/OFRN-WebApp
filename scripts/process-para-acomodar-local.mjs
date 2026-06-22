/**
 * Renombra carpetas/PDFs en «Para acomodar» según reglas pdf-parts-renaming.
 * Trabaja sobre la carpeta local sincronizada con Google Drive.
 */
import { execSync } from "child_process";
import {
  existsSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import {
  renameFolderIfNeeded,
  renamePdfFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";

const LOCAL_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

const SPLIT_SCRIPT =
  "c:\\Users\\marti\\Downloads\\Charbonnier\\scripts\\split_and_rename_parts.py";

/** @type {Array<object>} */
const WORKS = [
  {
    sourceFolder: "04 - Sí, vendetta, 'Rigoletto' - Verdi",
    targetFolder: "Verdi, G. - Sí, vendetta ('Rigoletto')",
    composerTag: "Verdi, G",
    workTitle: "Sí, vendetta ('Rigoletto')",
    workNumber: "04",
    splits: [],
  },
  {
    sourceFolder: "11 - Je veux Vivre, 'Romeo y Julieta' - Gounod, C",
    targetFolder: "Gounod, C. - Je veux vivre ('Roméo et Juliette')",
    composerTag: "Gounod, C",
    workTitle: "Je veux vivre ('Roméo et Juliette')",
    workNumber: "11",
    splits: [],
  },
  {
    sourceFolder: "A portrait of Frida Kalho. Versión Final",
    targetFolder: "Rey Jr., V. - A portrait of Frida Kahlo",
    composerTag: "Rey Jr., V",
    workTitle: "A portrait of Frida Kahlo",
    workNumber: null,
    splits: [],
  },
  {
    sourceFolder: "Medoza y Cortés, Q. - Cielito Lindo",
    targetFolder: "Medoza y Cortés, Q. - Cielito Lindo",
    composerTag: "Medoza y Cortés, Q",
    workTitle: "Cielito Lindo",
    workNumber: null,
    splits: [],
  },
  {
    sourceFolder: "Puccini, G. - Quando m'en vo (Vals de Musetta, 'La Boheme')",
    targetFolder: "Puccini, G. - Quando m'en vo (Vals de Musetta, 'La Bohème')",
    composerTag: "Puccini, G",
    workTitle: "Quando m'en vo (Vals de Musetta, 'La Bohème')",
    workNumber: null,
    splits: [],
  },
  {
    sourceFolder: "Verdi II Trovatore Coro de Gitanos",
    targetFolder: "Verdi, G. - Il Trovatore, Coro de gitanos",
    composerTag: "Verdi, G",
    workTitle: "Il Trovatore, Coro de gitanos",
    workNumber: null,
    splits: [],
  },
  {
    sourceFolder: "Verdi La Fuerza del Destino Obertura",
    targetFolder: "Verdi, G. - La forza del destino, Obertura",
    composerTag: "Verdi, G",
    workTitle: "La forza del destino, Obertura",
    workNumber: null,
    splits: [],
  },
];

const GRIEG_SUBWORKS = [
  {
    parentFolder: "Grieg - Peer Gynt (de Suite 1 y 2)",
    sourceSubfolder: "Grieg Suite 1 completa",
    targetFolder: "Grieg, E. - Peer Gynt (Suite 1)",
    composerTag: "Grieg, E",
    workTitle: "Peer Gynt (Suite 1)",
    workNumber: null,
    splits: [
      {
        pdf: "Corno 1 2 3 4 en F Grieg Suite 1 completa.pdf",
        manifest: {
          parts: [
            { instrument: "Corno F 1", start: 1, end: 1 },
            { instrument: "Corno F 2", start: 2, end: 2 },
            { instrument: "Corno F 3", start: 3, end: 3 },
            { instrument: "Corno F 4", start: 4, end: 4 },
          ],
        },
      },
    ],
  },
  {
    parentFolder: "Grieg - Peer Gynt (de Suite 1 y 2)",
    sourceSubfolder: "Grieg Suite 2 completa",
    targetFolder: "Grieg, E. - Peer Gynt (Suite 2)",
    composerTag: "Grieg, E",
    workTitle: "Peer Gynt (Suite 2)",
    workNumber: null,
    splits: [],
  },
];

function runSplit(workDir, pdfName, manifest, dryRun) {
  const pdfPath = join(workDir, pdfName);
  if (!existsSync(pdfPath)) return;
  const manifestPath = join(workDir, `${pdfName}.manifest.json`);
  if (!dryRun) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    execSync(
      `python "${SPLIT_SCRIPT}" --work-dir "${workDir}" --input "${pdfPath}" --manifest "${manifestPath}" --split-only`,
      { stdio: "inherit" },
    );
    unlinkSync(pdfPath);
    unlinkSync(manifestPath);
  } else {
    console.log(`  [SPLIT] ${pdfName} → ${manifest.parts.length} partes`);
  }
}

function processWork(work, dryRun) {
  const folderPath = join(LOCAL_ROOT, work.targetFolder);
  if (existsSync(join(LOCAL_ROOT, work.sourceFolder))) {
    const folderRename = renameFolderIfNeeded(
      LOCAL_ROOT,
      work.sourceFolder,
      work.targetFolder,
      dryRun,
    );
    if (folderRename) {
      console.log(`Carpeta: ${folderRename.from} → ${folderRename.to}`);
    }
  } else if (!existsSync(join(LOCAL_ROOT, work.targetFolder))) {
    throw new Error(`No se encuentra obra: ${work.sourceFolder} / ${work.targetFolder}`);
  }

  const dir =
    existsSync(join(LOCAL_ROOT, work.targetFolder))
      ? join(LOCAL_ROOT, work.targetFolder)
      : join(LOCAL_ROOT, work.sourceFolder);
  if (!existsSync(dir)) {
    throw new Error(`Carpeta no encontrada: ${dir}`);
  }

  for (const split of work.splits || []) {
    runSplit(dir, split.pdf, split.manifest, dryRun);
  }

  const renames = renamePdfFilesInFolder(
    dir,
    {
      workNumber: work.workNumber,
      workTitle: work.workTitle,
      composerTag: work.composerTag,
    },
    { dryRun },
  );
  console.log(`\n${work.targetFolder} (${renames.length} PDFs)`);
  for (const r of renames) {
    if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
    else console.log(`  OK: ${r.file}`);
  }
}

function resolveGriegWorkDir(sub) {
  const parentPath = join(LOCAL_ROOT, sub.parentFolder);
  const candidates = [
    join(LOCAL_ROOT, sub.targetFolder),
    join(parentPath, sub.targetFolder),
    join(parentPath, sub.sourceSubfolder),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(`No se encuentra carpeta Grieg: ${sub.targetFolder}`);
}

function processGriegSubwork(sub, dryRun) {
  const parentPath = join(LOCAL_ROOT, sub.parentFolder);
  const subSrc = join(parentPath, sub.sourceSubfolder);
  if (
    existsSync(subSrc) &&
    sub.sourceSubfolder !== sub.targetFolder
  ) {
    const fr = renameFolderIfNeeded(
      parentPath,
      sub.sourceSubfolder,
      sub.targetFolder,
      dryRun,
    );
    if (fr) console.log(`Subcarpeta: ${fr.from} → ${fr.to}`);
  }

  const workDir = resolveGriegWorkDir(sub);
  for (const split of sub.splits || []) {
    runSplit(workDir, split.pdf, split.manifest, dryRun);
  }

  const renames = renamePdfFilesInFolder(
    workDir,
    {
      workNumber: sub.workNumber,
      workTitle: sub.workTitle,
      composerTag: sub.composerTag,
    },
    { dryRun },
  );
  console.log(`\n${sub.targetFolder} (${renames.length} PDFs)`);
  for (const r of renames) {
    if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
    else console.log(`  OK: ${r.file}`);
  }

  const topTarget = join(LOCAL_ROOT, sub.targetFolder);
  if (!dryRun && workDir !== topTarget) {
    if (existsSync(topTarget)) {
      throw new Error(`Ya existe en raíz: ${topTarget}`);
    }
    renameSync(workDir, topTarget);
    console.log(`  Movido a raíz: ${sub.targetFolder}`);
  } else if (dryRun && workDir !== topTarget) {
    console.log(`  [MOVE] → ${LOCAL_ROOT}\\${sub.targetFolder}`);
  }
}

function cleanupGriegParent(dryRun) {
  const parent = join(LOCAL_ROOT, "Grieg - Peer Gynt (de Suite 1 y 2)");
  if (!existsSync(parent)) return;
  const left = readdirSync(parent);
  if (left.length === 0 && !dryRun) {
    rmSync(parent, { recursive: true });
    console.log("\nEliminada carpeta vacía: Grieg - Peer Gynt (de Suite 1 y 2)");
  }
}

const dryRun = process.argv.includes("--dry-run");

console.log(`Para acomodar: ${LOCAL_ROOT}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

if (!existsSync(LOCAL_ROOT)) {
  throw new Error(`No existe carpeta local: ${LOCAL_ROOT}`);
}

for (const w of WORKS) processWork(w, dryRun);
for (const g of GRIEG_SUBWORKS) processGriegSubwork(g, dryRun);
cleanupGriegParent(dryRun);

console.log("\nListo.");
