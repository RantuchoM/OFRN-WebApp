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
  "Nota interna",
  "Localidad",
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

const [instrRes, locRes] = await Promise.all([
  fetch(`${SB_URL}/rest/v1/instrumentos?select=instrumento&order=instrumento`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  }),
  fetch(`${SB_URL}/rest/v1/localidades?select=localidad&order=localidad`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  }),
]);
const instruments = (await instrRes.json())
  .map((r) => r.instrumento)
  .filter(Boolean);
const localities = (await locRes.json())
  .map((r) => r.localidad)
  .filter(Boolean);

const code = `function setupRosterTemplate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var headers = ${JSON.stringify(headers)};
  var diets = ${JSON.stringify(diets)};
  var instruments = ${JSON.stringify(instruments)};
  var genero = ${JSON.stringify(genero)};
  var localities = ${JSON.stringify(localities)};
  var LAST = 201;

  var personas = ss.getSheetByName('Personas');
  if (!personas) {
    personas = ss.getSheets()[0];
    personas.setName('Personas');
  }
  personas.clear();
  personas.getRange(1, 1, 1, headers.length).setValues([headers]);
  personas.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#4338CA')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  personas.setFrozenRows(1);
  personas.setColumnWidth(1, 120);
  personas.setColumnWidth(2, 110);
  personas.setColumnWidth(3, 70);
  personas.setColumnWidth(4, 130);
  personas.setColumnWidth(5, 100);
  personas.setColumnWidth(6, 110);
  personas.setColumnWidth(7, 110);
  personas.setColumnWidth(8, 180);
  personas.setColumnWidth(9, 110);
  personas.setColumnWidth(10, 150);
  personas.setColumnWidth(11, 180);
  personas.setColumnWidth(12, 130);
  personas.getRange('D2:D' + LAST).setNumberFormat('dd/mm/yyyy');

  var lists = ss.getSheetByName('_listas');
  if (lists) {
    lists.clear();
    lists.showSheet();
  } else {
    lists = ss.insertSheet('_listas');
  }
  for (var i = 0; i < diets.length; i++) lists.getRange(i + 1, 1).setValue(diets[i]);
  for (var j = 0; j < instruments.length; j++) lists.getRange(j + 1, 2).setValue(instruments[j]);
  for (var k = 0; k < genero.length; k++) lists.getRange(k + 1, 3).setValue(genero[k]);
  for (var m = 0; m < localities.length; m++) lists.getRange(m + 1, 4).setValue(localities[m]);

  var ruleG = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange(1, 3, genero.length, 3), true)
    .setAllowInvalid(true)
    .setHelpText('Elegí M, F o -')
    .build();
  var ruleA = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange(1, 1, diets.length, 1), true)
    .setAllowInvalid(true)
    .setHelpText('Elegí un valor de la lista')
    .build();
  var ruleI = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange(1, 2, instruments.length, 2), true)
    .setAllowInvalid(true)
    .setHelpText('Elegí un instrumento de la lista')
    .build();
  var ruleL = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange(1, 4, Math.max(localities.length, 1), 4), true)
    .setAllowInvalid(true)
    .setHelpText('Elegí una localidad de residencia')
    .build();
  personas.getRange('C2:C' + LAST).setDataValidation(ruleG);
  personas.getRange('I2:I' + LAST).setDataValidation(ruleA);
  personas.getRange('J2:J' + LAST).setDataValidation(ruleI);
  if (localities.length) personas.getRange('L2:L' + LAST).setDataValidation(ruleL);

  lists.hideSheet();
  ss.setActiveSheet(personas);
}
`;

const out = "c:/Proyectos/OFRN-WebApp/tmp/setup-roster-template.gs";
fs.writeFileSync(out, code);
console.log("wrote", out, code.length, "instr", instruments.length, "loc", localities.length);
