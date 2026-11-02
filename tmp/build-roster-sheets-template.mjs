import ExcelJS from "exceljs";
import fs from "fs";

const SB_URL = "https://muxrbuivopnawnxlcjxq.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzIsImV4cCI6MjA4MDM1ODkzMn0._tMDAJg2r5vfR1y0JPYd3LVDB66CcyXtj5dY4RqrxIg";

const headers = [
  "Apellido",
  "Nombre",
  "Género",
  "Fecha de nacimiento",
  "DNI",
  "CUIL",
  "Teléfono",
  "Mail",
  "Alimentación",
  "Instrumento",
];
const diets = [
  "Estándar",
  "Celíaca",
  "Diabética",
  "Vegetariana",
  "Vegana",
  "Sin Sal",
  "Sin Lactosa",
];
const genero = ["M", "F", "-"];
const TEMPLATE_DATA_ROWS = 200;
const out = "c:/Proyectos/OFRN-WebApp/tmp/Plantilla_carga_masiva_roster.xlsx";

const instrRes = await fetch(
  `${SB_URL}/rest/v1/instrumentos?select=instrumento&order=instrumento`,
  { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
);
const instruments = (await instrRes.json())
  .map((r) => r.instrumento)
  .filter(Boolean);
console.log("instr", instruments.length);

const workbook = new ExcelJS.Workbook();
workbook.creator = "OFRN WebApp";
const sheet = workbook.addWorksheet("Personas");
headers.forEach((h, i) => {
  const cell = sheet.getCell(1, i + 1);
  cell.value = h;
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4338CA" },
  };
  cell.alignment = { vertical: "middle", horizontal: "center" };
});
sheet.getRow(1).height = 20;
sheet.columns = [
  { width: 18 },
  { width: 16 },
  { width: 10 },
  { width: 18 },
  { width: 14 },
  { width: 16 },
  { width: 16 },
  { width: 28 },
  { width: 16 },
  { width: 22 },
];

const last = TEMPLATE_DATA_ROWS + 1;
sheet.getColumn(4).numFmt = "dd/mm/yyyy";
sheet.dataValidations.add(`D2:D${last}`, {
  type: "date",
  operator: "between",
  allowBlank: true,
  formulae: [new Date(Date.UTC(1900, 0, 1)), new Date(Date.UTC(2100, 11, 31))],
  showErrorMessage: true,
  errorStyle: "stop",
  errorTitle: "Fecha de nacimiento",
  error: "Ingresá una fecha válida",
});

const lists = workbook.addWorksheet("_listas");
lists.state = "hidden";
diets.forEach((v, i) => {
  lists.getCell(i + 1, 1).value = v;
});
instruments.forEach((v, i) => {
  lists.getCell(i + 1, 2).value = v;
});
genero.forEach((v, i) => {
  lists.getCell(i + 1, 3).value = v;
});

const dietEnd = Math.max(diets.length, 1);
const instrEnd = Math.max(instruments.length, 1);

sheet.dataValidations.add(`C2:C${last}`, {
  type: "list",
  allowBlank: true,
  formulae: [`'_listas'!$C$1:$C$${genero.length}`],
  showErrorMessage: true,
  errorStyle: "warning",
  errorTitle: "Género",
  error: "Elegí M, F o -",
});
sheet.dataValidations.add(`I2:I${last}`, {
  type: "list",
  allowBlank: true,
  formulae: [`'_listas'!$A$1:$A$${dietEnd}`],
  showErrorMessage: true,
  errorStyle: "warning",
  errorTitle: "Alimentación",
  error: "Elegí un valor de la lista",
});
sheet.dataValidations.add(`J2:J${last}`, {
  type: "list",
  allowBlank: true,
  formulae: [`'_listas'!$B$1:$B$${instrEnd}`],
  showErrorMessage: true,
  errorStyle: "warning",
  errorTitle: "Instrumento",
  error: "Elegí un instrumento de la lista",
});

workbook.views = [{ activeTab: 0 }];
await workbook.xlsx.writeFile(out);
console.log("wrote", out, fs.statSync(out).size);
