/**
 * Wrapper de seeds: re-exporta src/utils/drivePartMatcher.js con extracción de prefijo
 * de pdfPartsRenaming (nombres canónicos largos en PDFs de archivo).
 */
import { extractInstrumentFromExistingName } from "./pdfPartsRenaming.mjs";
import {
  DIRECTOR_INSTRUMENT_ID,
  attachDriveLinksByFilename,
  expandDriveFileToParts as coreExpandDriveFileToParts,
  fileProducesParticella,
  getDirectorInstrumentId,
  getDriveFilePrefix,
  getMatchScore,
  getSuggestedParts,
  isDriveFileExcludedFromMatching,
  normalizeInstrumentString,
  parseCombinedNumbers,
  parsePartSlot,
  partMatchesDriveFile,
  suggestDriveLinksForParts,
  suggestPartsFromDriveFile as coreSuggestPartsFromDriveFile,
  toSeedPartShape,
} from "../../src/utils/drivePartMatcher.js";

export {
  DIRECTOR_INSTRUMENT_ID,
  attachDriveLinksByFilename,
  fileProducesParticella,
  getDirectorInstrumentId,
  getDriveFilePrefix,
  getMatchScore,
  getSuggestedParts,
  isDriveFileExcludedFromMatching,
  normalizeInstrumentString,
  parseCombinedNumbers,
  parsePartSlot,
  partMatchesDriveFile,
  suggestDriveLinksForParts,
  toSeedPartShape,
};

const SEED_PREFIX_OPTIONS = {
  extractInstrument: extractInstrumentFromExistingName,
};

export function expandDriveFileToParts(file, catalog) {
  return coreExpandDriveFileToParts(file, catalog, SEED_PREFIX_OPTIONS);
}

/** Todas las particellas de un PDF (incl. combinados 1y2). */
export function suggestPartsFromDriveFile(file, catalog) {
  return coreSuggestPartsFromDriveFile(file, catalog, SEED_PREFIX_OPTIONS);
}

/** Compat: primera particella; preferir suggestPartsFromDriveFile en loops. */
export function suggestPartFromDriveFile(file, catalog) {
  const parts = suggestPartsFromDriveFile(file, catalog);
  return parts[0] ?? null;
}

/**
 * Añade al array `parts` todas las particellas derivadas de un PDF (incl. combinados).
 * @returns {number} cantidad de particellas añadidas
 */
export function appendSeedPartsFromFile(parts, file, catalog) {
  const list = suggestPartsFromDriveFile(file, catalog);
  for (const suggested of list) {
    parts.push({
      ...suggested,
      url_archivo: JSON.stringify([
        { url: file.webViewLink, description: file.name },
      ]),
    });
  }
  return list.length;
}
