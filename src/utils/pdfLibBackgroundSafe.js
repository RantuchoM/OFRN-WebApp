import { ParseSpeeds } from "pdf-lib";

/**
 * Chrome (y Firefox) limitan `setTimeout` en pestañas en segundo plano a ~1 s
 * y, tras unos minutos, a ~1 min. pdf-lib cede el hilo con `waitForTick()` =
 * `setTimeout(0)` cada N objetos: parseo default `ParseSpeeds.Slow` (100) y
 * guardado default `objectsPerTick` 50. Un PDF de documentación de cientos
 * de objetos parece trabado al sacar de foco la pestaña.
 *
 * `Fastest` / `Infinity` evita esos yields internos. El lote sigue en
 * background; el overlay puede verse quieto (Chrome pausa animaciones CSS).
 */
export const PDF_LOAD_BG_SAFE = {
  capNumbers: true,
  parseSpeed: ParseSpeeds.Fastest,
};

/** PDFs de Drive (doc. común / reducida): sin capNumbers de plantillas Acrobat. */
export const PDF_LOAD_DOCS_BG_SAFE = {
  parseSpeed: ParseSpeeds.Fastest,
};

export const PDF_SAVE_BG_SAFE = {
  objectsPerTick: Number.POSITIVE_INFINITY,
};

export const PDF_SAVE_FORM_BG_SAFE = {
  useObjectStreams: false,
  updateFieldAppearances: true,
  objectsPerTick: Number.POSITIVE_INFINITY,
};

let yieldWorker = null;

function pingYieldWorker() {
  if (!yieldWorker) {
    const src = "onmessage=function(){postMessage(0)}";
    yieldWorker = new Worker(
      URL.createObjectURL(new Blob([src], { type: "text/javascript" })),
    );
  }
  return new Promise((resolve) => {
    const onMsg = () => {
      yieldWorker.removeEventListener("message", onMsg);
      resolve();
    };
    yieldWorker.addEventListener("message", onMsg);
    yieldWorker.postMessage(0);
  });
}

function pingMessageChannel() {
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = () => {
      port1.close();
      port2.close();
      resolve();
    };
    port2.postMessage(null);
  });
}

/**
 * Cede el hilo para que React pinte el overlay de exportación.
 * No usa rAF ni setTimeout: ambos se pausan/throttlean en pestaña oculta.
 */
export async function yieldExportLoop() {
  try {
    if (typeof Worker !== "undefined" && typeof Blob !== "undefined") {
      await pingYieldWorker();
      return;
    }
  } catch {
    /* CSP / workers off */
  }
  if (typeof MessageChannel === "function") {
    await pingMessageChannel();
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
}
