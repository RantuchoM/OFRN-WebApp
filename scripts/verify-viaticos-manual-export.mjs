/**
 * Correr con: node --import ./scripts/register-ext-js.mjs scripts/verify-viaticos-manual-export.mjs
 *
 * Pantalla de /viaticos-manual y /rendiciones-manual vs PDF.
 * Dos vigencias: el PDF dual debe llevar los mismos días y valores que los rangos,
 * y el total debe ser el de la pantalla (ceremonial incluido, pasajes una sola vez).
 */
import { createRequire } from "module";
import { inflateSync } from "zlib";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { PDFDocument, PDFName } from "pdf-lib";
import { calcValorDiarioProporcional } from "../src/utils/viaticosValorDiarioProporcional.js";
import {
  resolveExportedTotalFinal,
  sumGastosViaticoRow,
} from "../src/utils/viaticosAnticipo.js";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

globalThis.alert = (msg) => {
  throw new Error(String(msg));
};

globalThis.fetch = async (url) => {
  const rel = String(url).replace(/^\//, "");
  const buf = readFileSync(join(root, "public", rel));
  return {
    ok: true,
    headers: { get: () => "application/pdf" },
    arrayBuffer: async () =>
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  };
};

const { exportViaticosToPDFForm } = await import(
  "../src/utils/pdfFormExporter.js"
);

const vigencias = [
  {
    id: 1,
    vigencia_desde: "2026-01-01",
    vigencia_hasta: "2026-09-15",
    monto: 86000,
  },
  {
    id: 2,
    vigencia_desde: "2026-09-16",
    vigencia_hasta: null,
    monto: 92000,
  },
];

const fin = calcValorDiarioProporcional({
  fechaSalida: "2026-09-14",
  horaSalida: "08:00",
  fechaLlegada: "2026-09-18",
  horaLlegada: "18:00",
  vigencias,
  porcentaje: 80,
  factorTemporada: 0,
});

const gastos = {
  gasto_alojamiento: 1000,
  gasto_pasajes: 2000,
  gasto_combustible: 300,
  gasto_otros: 400,
  gastos_capacit: 500,
  gasto_ceremonial: 600,
  gastos_movil_otros: 700,
};
const totalGastos = Object.values(gastos).reduce((a, b) => a + b, 0);
const totalFinal = Math.round((fin.subtotal + totalGastos) * 100) / 100;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("OK", msg);
  }
}

assert(fin.usaProporcional, "el viaje cruza dos vigencias");
assert(fin.segmentos.length === 2, `dos segmentos (hay ${fin.segmentos.length})`);
assert(fin.segmentos[0].dias === 2, `rango anterior 2 días (hay ${fin.segmentos[0].dias})`);
assert(fin.segmentos[1].dias === 3, `rango vigente 3 días (hay ${fin.segmentos[1].dias})`);
assert(fin.segmentos[0].valorDiarioCalc === 68800, "valor anterior 68800");
assert(fin.segmentos[1].valorDiarioCalc === 73600, "valor vigente 73600");
assert(fin.subtotal === 358400, `anticipo 358400 (hay ${fin.subtotal})`);
assert(totalFinal === 363900, `total pantalla 363900 (hay ${totalFinal})`);

const duplicated = {
  ...gastos,
  gastos_movilidad: gastos.gasto_pasajes,
  subtotal: fin.subtotal,
};
const naive = Math.round((fin.subtotal + sumGastosViaticoRow(duplicated)) * 100) / 100;
assert(
  naive !== totalFinal,
  `la re-suma vieja (${naive}) no coincide con la pantalla (${totalFinal})`,
);
assert(
  resolveExportedTotalFinal(
    { ...duplicated, totalFinal },
    fin.subtotal,
  ) === totalFinal,
  "el export conserva el total de la pantalla",
);

function pdfText(value) {
  if (!value) return "";
  if (typeof value.decodeText === "function") return value.decodeText();
  if (typeof value.asString === "function") return value.asString();
  return String(value);
}

/** El texto pintado vive en streams FlateDecode, a veces como hex `<3134...>`. */
function pdfContainsText(bytes, needle) {
  const raw = Buffer.from(bytes);
  const chunks = [raw.toString("latin1")];
  let idx = 0;
  while ((idx = raw.indexOf("stream", idx)) !== -1) {
    let start = idx + 6;
    if (raw[start] === 0x0d) start += 1;
    if (raw[start] === 0x0a) start += 1;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    try {
      chunks.push(inflateSync(raw.subarray(start, end)).toString("latin1"));
    } catch {
      /* no es Flate */
    }
    idx = end + 9;
  }
  const hay = chunks.join("\n").toLowerCase();
  const hex = Buffer.from(needle, "latin1").toString("hex");
  return hay.includes(String(needle).toLowerCase()) || hay.includes(hex);
}

/** El PDF final copia los widgets a la página; el catálogo AcroForm no siempre viaja. */
async function readFields(bytes) {
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const annots = page.node.lookup(PDFName.of("Annots"));
  const out = {};
  if (!annots || typeof annots.size !== "function") return out;
  for (let i = 0; i < annots.size(); i++) {
    const dict = annots.lookup(i);
    const name = pdfText(dict.lookup(PDFName.of("T")));
    if (!name) continue;
    out[name] = pdfText(dict.lookup(PDFName.of("V")));
  }
  return out;
}

const viaticoRow = {
  apellido: "Perez",
  nombre: "Ana",
  cargo: "Violin",
  jornada_laboral: "Completa",
  ciudad_origen: "Viedma",
  asiento_habitual: "Viedma",
  motivo: "Concierto",
  lugar_comision: "Bariloche",
  fecha_salida: "2026-09-14",
  hora_salida: "08:00",
  fecha_llegada: "2026-09-18",
  hora_llegada: "18:00",
  dias_computables: fin.dias_computables,
  porcentaje: 80,
  valorDiarioCalc: fin.valorDiarioCalc,
  subtotal: fin.subtotal,
  segmentosValorDiario: fin.segmentos,
  usaProporcional: true,
  ...gastos,
  transporte_otros: "Remis",
  totalFinal,
  firma: null,
};

const viaticoBytes = await exportViaticosToPDFForm(
  {},
  [viaticoRow],
  {
    lugar_comision: "Bariloche",
    motivo: "Concierto",
    factor_temporada: 0,
    keep_editable: true,
  },
  "viatico",
);
const viatico = await readFields(viaticoBytes);
console.log("viatico campos", {
  dias_computados: viatico.dias_computados,
  valor_diario: viatico.valor_diario,
  dias_computados1: viatico.dias_computados1,
  valor_diario1: viatico.valor_diario1,
  dias_computados_total: viatico.dias_computados_total,
  gasto_anticipo: viatico.gasto_anticipo,
  gasto_movilidad: viatico.gasto_movilidad,
  gasto_ceremonial: viatico.gasto_ceremonial,
  total_anticipo: viatico.total_anticipo,
  transporte_otros: viatico.transporte_otros,
});

assert(viatico.dias_computados === "2", "PDF días rango anterior");
assert(viatico.valor_diario === "68800", "PDF valor rango anterior");
assert(viatico.dias_computados1 === "3", "PDF días rango vigente");
assert(viatico.valor_diario1 === "73600", "PDF valor rango vigente");
assert(viatico.dias_computados_total === "5", "PDF días totales");
assert(viatico.gasto_anticipo === "358400", "PDF anticipo = subtotal");
assert(viatico.gasto_movilidad === "2000", "PDF pasajes una sola vez");
assert(viatico.gasto_ceremonial === "600", "PDF ceremonial");
assert(viatico.total_anticipo === "363900", "PDF total = pantalla");
assert(viatico.transporte_otros === "Remis", "PDF otro medio = texto de pantalla");
assert(!viatico.check_temporada, "sin temporada no marca X");
assert(!("dia_salida" in viatico), "fecha salida aplanada, ya no es campo");
assert(!("dia_llegada" in viatico), "fecha llegada aplanada, ya no es campo");
assert(viatico.hora_salida === "08:00", "la hora de salida sigue siendo campo");
assert(pdfContainsText(viaticoBytes, "14/09/26"), "fecha salida pintada 14/09/26");
assert(pdfContainsText(viaticoBytes, "18/09/26"), "fecha llegada pintada 18/09/26");

const rendicionBytes = await exportViaticosToPDFForm(
  {},
  [
    {
      ...viaticoRow,
      subtotal: fin.subtotal,
      totalFinal,
      gastos_movilidad: gastos.gasto_pasajes,
      rendicion_viaticos: fin.subtotal,
      rendicion_gasto_alojamiento: gastos.gasto_alojamiento,
      rendicion_transporte_otros: gastos.gasto_pasajes,
      rendicion_gasto_combustible: gastos.gasto_combustible,
      rendicion_gastos_movil_otros: gastos.gastos_movil_otros,
      rendicion_gastos_capacit: gastos.gastos_capacit,
      rendicion_gasto_ceremonial: gastos.gasto_ceremonial,
      rendicion_gasto_otros: gastos.gasto_otros,
    },
  ],
  {
    lugar_comision: "Bariloche",
    motivo: "Concierto",
    factor_temporada: 0.3,
    keep_editable: true,
  },
  "rendicion",
);
const rend = await readFields(rendicionBytes);
console.log("rendicion campos", {
  dias_computados: rend.dias_computados,
  valor_diario: rend.valor_diario,
  dias_computados1: rend.dias_computados1,
  valor_diario1: rend.valor_diario1,
  viaticos_ant: rend.viaticos_ant,
  totales_ant: rend.totales_ant,
  check_temporada: rend.check_temporada,
  gastos_ceremonial_ant: rend.gastos_ceremonial_ant,
});

assert(rend.dias_computados === "2", "rendición días rango anterior");
assert(rend.valor_diario === "68800", "rendición valor rango anterior");
assert(rend.dias_computados1 === "3", "rendición días rango vigente");
assert(rend.valor_diario1 === "73600", "rendición valor rango vigente");
assert(rend.viaticos_ant === "358400", "rendición anticipo viáticos");
assert(rend.gastos_ceremonial_ant === "600", "rendición ceremonial");
assert(rend.totales_ant === "363900", "rendición total = pantalla");
assert(rend.check_temporada === "X", "rendición marca temporada alta");
assert(!("dia_salida" in rend), "rendición fecha salida aplanada");
assert(!("dia_llegada" in rend), "rendición fecha llegada aplanada");
assert(pdfContainsText(rendicionBytes, "14/09/2026"), "rendición pinta salida dd/MM/yyyy");
assert(pdfContainsText(rendicionBytes, "18/09/2026"), "rendición pinta llegada dd/MM/yyyy");

if (process.exitCode) {
  console.error("Hay diferencias entre pantalla y PDF");
} else {
  console.log("Pantalla y PDF coinciden");
}
