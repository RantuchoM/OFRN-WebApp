/**
 * Alta FIMBA: no defaultar a tipos_evento 16 («Nuevo evento»).
 * Run: node scripts/verify-fimba-create-tipo.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIMBA_CATALOG_TIPO_GENERICO,
  FIMBA_TIPO_EVENTO_TRASLADO,
  resolveFimbaCreateTipoId,
} from "../src/utils/fimbaCreateTipo.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

assert(
  FIMBA_CATALOG_TIPO_GENERICO === 16,
  "id 16 sigue siendo el tipo genérico del catálogo",
);
assert(
  resolveFimbaCreateTipoId(null) == null,
  "alta agenda sin tipo → null (no 16)",
);
assert(
  resolveFimbaCreateTipoId("") == null,
  "alta agenda tipo vacío → null",
);
assert(
  resolveFimbaCreateTipoId(undefined, { forceTransporte: true }) ===
    FIMBA_TIPO_EVENTO_TRASLADO,
  "forceTransporte sin tipo → Traslado 11",
);
assert(resolveFimbaCreateTipoId(2) === 2, "tipo explícito Ensayo se conserva");
assert(
  resolveFimbaCreateTipoId(16) === 16,
  "si el usuario elige 16, se respeta",
);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const viewFiles = [
  "src/views/Fimba/FimbaAgendaPage.jsx",
  "src/views/Fimba/FimbaConsultaAgenda.jsx",
  "src/views/Fimba/FimbaEventoFormModal.jsx",
  "src/views/Fimba/FimbaTransportPage.jsx",
];
for (const rel of viewFiles) {
  const src = readFileSync(join(root, rel), "utf8");
  assert(
    !src.includes("FIMBA_DEFAULT_TIPO_EVENTO"),
    `${rel} no usa FIMBA_DEFAULT_TIPO_EVENTO como default de alta`,
  );
}
assert(
  readFileSync(join(root, "src/views/Fimba/FimbaAgendaPage.jsx"), "utf8").includes(
    "defaultTipoId={null}",
  ),
  "Agenda staff pasa defaultTipoId null",
);
assert(
  readFileSync(join(root, "src/views/Fimba/FimbaConsultaAgenda.jsx"), "utf8").includes(
    "defaultTipoId={null}",
  ),
  "Agenda consulta pasa defaultTipoId null",
);

if (process.exitCode) {
  console.error("verify-fimba-create-tipo: FAILED");
  process.exit(1);
}
console.log("verify-fimba-create-tipo: PASS");
