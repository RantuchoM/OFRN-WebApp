/**
 * Renombra audios extensionless del concierto Charbonnier (si Drive no los tiene bloqueados).
 */
import { copyFileSync, existsSync, renameSync, unlinkSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import {
  CHARBONNIER_CELLO_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/charbonnierCelloCatalog.mjs";
import { safeFileName } from "./lib/pdfPartsRenaming.mjs";

const workDir = join(PARA_ACOMODAR_ROOT, CHARBONNIER_CELLO_WORK.targetFolder);

function extOf(p) {
  try {
    const out = execFileSync(
      "python",
      ["-c", "import sys; print(open(sys.argv[1],'rb').read(12))", p],
      { encoding: "utf8", timeout: 30000 },
    );
    if (/ftyp|isom|mp4|M4A/i.test(out)) return ".m4a";
    if (out.includes("ID3")) return ".mp3";
    if (out.includes("RIFF") || out.includes("WAVE")) return ".wav";
    if (out.includes("OggS")) return ".ogg";
  } catch (e) {
    console.warn("ext detect:", e.message);
  }
  return ".wav";
}

for (const a of CHARBONNIER_CELLO_WORK.audioSources) {
  const src = join(workDir, a.from);
  if (!existsSync(src)) {
    console.log("skip (missing):", a.from);
    continue;
  }
  const ext = extOf(src);
  const destName = safeFileName(
    `AUDIO - ${CHARBONNIER_CELLO_WORK.titulo} - ${a.label} - ${CHARBONNIER_CELLO_WORK.composerTag}${ext}`,
  );
  const dst = join(workDir, destName);
  console.log(a.from, "→", destName);
  try {
    renameSync(src, dst);
    console.log("  OK rename");
  } catch (e) {
    console.warn("  rename", e.code, "- copy…");
    try {
      copyFileSync(src, dst);
      try {
        unlinkSync(src);
      } catch {
        /* leave original if locked */
      }
      console.log("  OK copy");
    } catch (e2) {
      console.error("  FAIL", e2.message);
    }
  }
}
