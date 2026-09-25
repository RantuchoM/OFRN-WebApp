/**
 * Verifica mapeo AcroForm de patente + leyenda de renuncia en destaque.
 * Caso: fila tipo La Fuerza del Legado (patente_oficial vacío; placa en travel/logística).
 */
import { createRequire } from "module";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";
import {
  resolveAnticipoParaPdfViatico,
  RENUNCIA_VIATICOS_TEXTO,
} from "../src/utils/viaticosAnticipo.js";
import {
  resolveCheckPatenteOficial,
  resolvePatenteOficialValue,
} from "../src/utils/transporteOficial.js";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = join(root, "public/plantillas/plantilla_viaticos.pdf");

const rowLikeTable = {
  apellido: "Navarrete",
  nombre: "Axel Leonel",
  porcentaje: 0,
  subtotal: 0,
  patente_oficial: "",
  check_patente_oficial: false,
  travelData: { patente: "PFU470", es_oficial: true },
  logistics_transports: [
    { patente: "", transportes: { patente: "PFU470", es_oficial: true } },
  ],
};

const patente = resolvePatenteOficialValue({
  stored: rowLikeTable.patente_oficial,
  travelPatente: rowLikeTable.travelData.patente,
  transports: rowLikeTable.logistics_transports,
});
const checkOficial = resolveCheckPatenteOficial(
  rowLikeTable.check_patente_oficial,
  rowLikeTable.travelData.es_oficial,
);
const zeroed = { ...rowLikeTable, subtotal: 0, valorDiarioCalc: 0 };
const anticipoDestaque = resolveAnticipoParaPdfViatico(zeroed, false, true);
const anticipoSinRenuncia = resolveAnticipoParaPdfViatico(zeroed, false, false);

if (patente !== "PFU470") {
  console.error("FAIL patente resolver", patente);
  process.exit(1);
}
if (!checkOficial) {
  console.error("FAIL check oficial");
  process.exit(1);
}
if (anticipoDestaque !== RENUNCIA_VIATICOS_TEXTO) {
  console.error("FAIL renuncia destaque", anticipoDestaque);
  process.exit(1);
}
if (anticipoSinRenuncia !== 0) {
  console.error("FAIL destaque sin renuncia debe ser 0", anticipoSinRenuncia);
  process.exit(1);
}

const bytes = readFileSync(templatePath);
const srcDoc = await PDFDocument.load(bytes, { capNumbers: true });
const form = srcDoc.getForm();
form.getTextField("patente").setText(patente);
form.getTextField("check_patente").setText(checkOficial ? "X" : "");
form.getTextField("gasto_anticipo").setText(anticipoDestaque);
form.getTextField("nombre_y_apellido").setText("Navarrete, Axel Leonel");
form.updateFieldAppearances();

const beforeFlatten = {
  patente: form.getTextField("patente").getText(),
  check_patente: form.getTextField("check_patente").getText(),
  gasto_anticipo: form.getTextField("gasto_anticipo").getText(),
};
if (beforeFlatten.patente !== "PFU470") {
  console.error("FAIL field patente", beforeFlatten);
  process.exit(1);
}
if (beforeFlatten.check_patente !== "X") {
  console.error("FAIL field check_patente", beforeFlatten);
  process.exit(1);
}
if (beforeFlatten.gasto_anticipo !== RENUNCIA_VIATICOS_TEXTO) {
  console.error("FAIL field gasto_anticipo", beforeFlatten);
  process.exit(1);
}

form.flatten();
const outBytes = await srcDoc.save({ useObjectStreams: false });

const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
pdfjs.GlobalWorkerOptions.workerSrc = require.resolve(
  "pdfjs-dist/legacy/build/pdf.worker.js",
);
const loadingTask = pdfjs.getDocument({
  data: new Uint8Array(outBytes),
  useSystemFonts: true,
  disableWorker: true,
});
const pdf = await loadingTask.promise;
const page = await pdf.getPage(1);
const content = await page.getTextContent();
const pdfjsText = content.items.map((it) => it.str).join(" ");
const hasPatente = pdfjsText.includes("PFU470");
const hasRenuncia =
  pdfjsText.includes("RENUNCIA A VIÁTICOS") ||
  pdfjsText.includes("RENUNCIA A VIATICOS") ||
  pdfjsText.includes("RENUNCIA");

if (!hasPatente || !hasRenuncia) {
  console.error("FAIL flattened text", {
    hasPatente,
    hasRenuncia,
    sample: pdfjsText.slice(0, 800),
  });
  process.exit(1);
}

console.log("OK: patente PFU470 + RENUNCIA A VIÁTICOS en destaque (AcroForm + flatten)");
