/**
 * Preview (NO escribe en DB) de giras Sinfónico / Camerata Filarmónica 2027.
 * Fuente: PDFs "Programas Sinfónicos y de Cámara 2027".
 */
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const IDS = {
  CFMon: 583032,
  CFVal: 195467,
  CFMar: 226257,
  ECAS: 1,
  CAV: 4,
  CEB: 34640,
  CPAT: 7,
  ES: 11,
  PILTRI: 10,
  VN: 5,
  Natacha: 8456903,
  Bariloche: 5,
  VillaRegina: 60,
  Viedma: 57,
  Cipolletti: 16,
  GeneralRoca: 30,
  ElBolson: 23,
  ChoeleChoel: 14,
  SAO: 51,
  Norquinco: 46,
  // Frutillar (Chile): no existe aún en localidades
  Frutillar: null,
};

const FAM_FULL = ["Cuerdas", "Maderas", "Bronces", "Percusión", "Prod."];
const FAM_VIENTOS = ["Maderas", "Bronces", "Percusión", "Prod."];

/** @typedef {{ tipo: 'FAMILIA'|'ENSAMBLE'|'PERSONA', label: string, id?: number }} Fuente */

/** @type {Fuente[]} */
const FUENTE_FULL = FAM_FULL.map((f) => ({ tipo: "FAMILIA", label: f }));

/** Cuerdas Val = solo cuerdas de valle (no todo CFVal) */
const FUENTE_CUERDAS_VAL = [
  { tipo: "ENSAMBLE", label: "CAV", id: IDS.CAV },
  { tipo: "ENSAMBLE", label: "CEB", id: IDS.CEB },
  { tipo: "ENSAMBLE", label: "CPAT", id: IDS.CPAT },
];

const FUENTE_CFMON = [{ tipo: "ENSAMBLE", label: "CFMon", id: IDS.CFMon }];
const FUENTE_CFMAR_CFVAL = [
  { tipo: "ENSAMBLE", label: "CFMar", id: IDS.CFMar },
  { tipo: "ENSAMBLE", label: "CFVal", id: IDS.CFVal },
];

function concierto(fecha, localidad, idLocalidad, hora = "20:00", nota = "") {
  return {
    fecha,
    localidad,
    id_localidad: idLocalidad,
    hora_inicio: hora || "20:00",
    descripcion: "Concierto Principal",
    nota,
  };
}

/**
 * Inferencia de zona (estilo sinfónicos 2026) a partir de las localías.
 */
function inferZona(localidadIds) {
  const set = new Set(localidadIds.filter(Boolean));
  const has = (...ids) => ids.some((id) => set.has(id));
  const tags = [];
  if (has(IDS.Bariloche, IDS.ElBolson, IDS.Norquinco)) tags.push("Andina");
  if (
    has(
      IDS.Cipolletti,
      IDS.VillaRegina,
      IDS.GeneralRoca,
      IDS.ChoeleChoel,
      IDS.SAO,
    )
  )
    tags.push("Valle");
  if (has(IDS.Viedma)) tags.push("Atlántica");
  if (tags.length === 0) return "—";
  return tags.join(" / ");
}

const PROGRAMAS = [
  {
    num: 1,
    nombre: "Apertura de temporada: Mahler y Wagner",
    tipo: "Sinfónico",
    desde: "2027-02-17",
    hasta: "2027-02-20",
    formacion: "Full orquesta",
    director_nota: "Martin Fraile Milstein",
    obras_nota: "Mahler Sym. 10; Wagner Preludio Tristán",
    localias: [{ id: IDS.Bariloche, nombre: "San Carlos de Bariloche" }],
    fuentes: FUENTE_FULL,
    personas: [],
    nota_localia:
      "Doc: Bariloche - Frutillar (Chile). Por ahora solo Bariloche; Frutillar pendiente.",
    conciertos: [
      concierto(
        "2027-02-19",
        "San Carlos de Bariloche",
        IDS.Bariloche,
        "20:00",
        "Fecha tentativa (vie). Nota: también Frutillar (Chile) en el doc — pendiente.",
      ),
      concierto(
        "2027-02-20",
        "San Carlos de Bariloche",
        IDS.Bariloche,
        "20:00",
        "Fecha tentativa (sáb)",
      ),
    ],
  },
  {
    num: 2,
    nombre: "Beethoven 200 años",
    tipo: "Sinfónico",
    desde: "2027-03-04",
    hasta: "2027-03-07",
    formacion: "Full orquesta",
    director_nota: "Martin Fraile Milstein",
    obras_nota: "Tchaikovsky 1812; Beethoven overtures; Gómez Carrillo Fiesta criolla",
    localias: [
      { id: IDS.VillaRegina, nombre: "Villa Regina" },
      { id: IDS.Viedma, nombre: "Viedma" },
    ],
    fuentes: FUENTE_FULL,
    personas: [],
    conciertos: [
      concierto("2027-03-05", "Villa Regina", IDS.VillaRegina, "20:00", "Círculo Italiano (nota doc)"),
      concierto("2027-03-07", "Viedma", IDS.Viedma, "20:00", "Jardines de Economía (nota doc)"),
    ],
  },
  {
    num: 3,
    nombre: "Directora mujer: Andrea Vela / Cinthia Aliretti",
    tipo: "Sinfónico",
    desde: "2027-03-30",
    hasta: "2027-04-02",
    formacion: "Full orquesta",
    director_nota: "Andrea Vela (Ec.) o Cinthia Aliretti (Br.) — a confirmar",
    obras_nota: "A definir",
    localias: [
      { id: IDS.Cipolletti, nombre: "Cipolletti" },
      { id: IDS.GeneralRoca, nombre: "General Roca" },
    ],
    fuentes: FUENTE_FULL,
    personas: [],
    conciertos: [
      concierto("2027-04-01", "Cipolletti", IDS.Cipolletti, "20:00", "Fecha tentativa"),
      concierto("2027-04-02", "General Roca", IDS.GeneralRoca, "12:00", "Sábado 12:00 (doc)"),
    ],
  },
  {
    num: 4,
    nombre: "Rusia",
    tipo: "Camerata Filarmónica",
    desde: "2027-04-21",
    hasta: "2027-04-24",
    formacion: "Cuerdas (CFMon + cuerdas CFVal)",
    director_nota: "Alejandro Muñoz",
    obras_nota: "Shostakovich op.110; Tchaikovsky Serenata op.48; falta 1 obra",
    localias: [{ id: IDS.Bariloche, nombre: "San Carlos de Bariloche" }],
    fuentes: [...FUENTE_CFMON, ...FUENTE_CUERDAS_VAL],
    personas: [],
    conciertos: [
      concierto("2027-04-23", "San Carlos de Bariloche", IDS.Bariloche, "20:00", "x2 Bariloche"),
      concierto("2027-04-24", "San Carlos de Bariloche", IDS.Bariloche, "12:00", "Sábado 12:00"),
    ],
  },
  {
    num: 5,
    nombre: "B y W.",
    tipo: "Camerata Filarmónica",
    desde: "2027-05-05",
    hasta: "2027-05-08",
    formacion: "Vientos y Percusión",
    director_nota: "Martin Fraile Milstein; solista Elías Gurevich (violín)",
    obras_nota: "Weill Violin Concerto; Beethoven octeto",
    localias: [{ id: IDS.Viedma, nombre: "Viedma" }],
    fuentes: FAM_VIENTOS.map((f) => ({ tipo: "FAMILIA", label: f })),
    personas: [
      {
        id: IDS.Natacha,
        label: "Rutinelli, Natacha (CB)",
        rol: "musico",
        estado: "confirmado",
        nota: "Contrabajo — override en giras_integrantes",
      },
    ],
    conciertos: [
      concierto("2027-05-07", "Viedma", IDS.Viedma, "20:00", "x2 Viedma"),
      concierto("2027-05-08", "Viedma", IDS.Viedma, "12:00", "Sábado 12:00"),
    ],
  },
  {
    num: 6,
    nombre: "Cuerdas CFMon",
    tipo: "Camerata Filarmónica",
    desde: "2027-05-19",
    hasta: "2027-05-22",
    formacion: "Cuerdas (Solo CFMon)",
    director_nota: "A definir",
    obras_nota: "A definir",
    localias: [{ id: IDS.ElBolson, nombre: "El Bolsón" }],
    fuentes: FUENTE_CFMON,
    personas: [],
    conciertos: [
      concierto("2027-05-21", "El Bolsón", IDS.ElBolson, "20:00", "x2 El Bolsón"),
      concierto("2027-05-22", "El Bolsón", IDS.ElBolson, "12:00", "Sábado 12:00"),
    ],
  },
  {
    num: 7,
    nombre: "Gala lírica italiana / Strauss",
    tipo: "Sinfónico",
    desde: "2027-06-02",
    hasta: "2027-06-05",
    formacion: "Full orquesta",
    director_nota: "Ezequiel Silverstein",
    obras_nota: "Puccini/Verdi; Strauss Don Juan y Últimas canciones",
    localias: [
      { id: IDS.Cipolletti, nombre: "Cipolletti" },
      { id: IDS.VillaRegina, nombre: "Villa Regina" },
    ],
    fuentes: FUENTE_FULL,
    personas: [],
    conciertos: [
      concierto("2027-06-04", "Cipolletti", IDS.Cipolletti, "20:00"),
      concierto("2027-06-05", "Villa Regina", IDS.VillaRegina, "20:00"),
    ],
  },
  {
    num: 8,
    nombre: "Mannheim — Choele Choel y SAO",
    tipo: "Camerata Filarmónica",
    desde: "2027-07-07",
    hasta: "2027-07-10",
    formacion: "CFMar + CFVal + solistas internos (Mannheim)",
    director_nota: "Marko Sanfelices; solistas internos",
    obras_nota: "A definir (Mannheim)",
    localias: [
      { id: IDS.ChoeleChoel, nombre: "Choele Choel" },
      { id: IDS.SAO, nombre: "San Antonio Oeste" },
    ],
    fuentes: FUENTE_CFMAR_CFVAL,
    personas: [],
    conciertos: [
      concierto("2027-07-09", "Choele Choel", IDS.ChoeleChoel, "20:00"),
      concierto("2027-07-10", "San Antonio Oeste", IDS.SAO, "20:00"),
    ],
  },
  {
    num: 9,
    nombre: "Mannheim — Viedma (agosto)",
    tipo: "Camerata Filarmónica",
    desde: "2027-08-04",
    hasta: "2027-08-07",
    formacion: "CFMar + CFVal + solistas internos (Mannheim)",
    director_nota: "Felipe Cunha (Portugal)",
    obras_nota: "A determinar por el director",
    localias: [{ id: IDS.Viedma, nombre: "Viedma" }],
    fuentes: FUENTE_CFMAR_CFVAL,
    personas: [],
    conciertos: [
      concierto("2027-08-06", "Viedma", IDS.Viedma, "20:00", "x2 Viedma"),
      concierto("2027-08-07", "Viedma", IDS.Viedma, "11:00", "Sábado 11:00"),
    ],
  },
  {
    num: 10,
    nombre: "Beethoven 200 años x 3",
    tipo: "Sinfónico",
    desde: "2027-08-18",
    hasta: "2027-08-21",
    formacion: "Full orquesta",
    director_nota: "Martin Fraile Milstein; Luis Salva vl/vc; Emilio Peroni pn",
    obras_nota: "Beethoven Concierto triple; misma sinfonía (precisa piano)",
    localias: [{ id: IDS.Cipolletti, nombre: "Cipolletti" }],
    fuentes: FUENTE_FULL,
    personas: [],
    conciertos: [
      concierto("2027-08-20", "Cipolletti", IDS.Cipolletti, "20:00", "x2 Cipolletti"),
      concierto("2027-08-21", "Cipolletti", IDS.Cipolletti, "11:00", "Sábado 11:00"),
    ],
  },
  {
    num: 11,
    nombre: "FIMBA 2027",
    tipo: "Sinfónico",
    desde: "2027-09-15",
    hasta: "2027-09-19",
    formacion: "Full orquesta",
    director_nota: "Martin Fraile Milstein; Marko Santelices; invitados Fidelio Trío / Yamandú Costa",
    obras_nota: "Beethoven Concierto triple + sinfonía; Concierto Pop (domingo)",
    localias: [{ id: IDS.Bariloche, nombre: "San Carlos de Bariloche" }],
    fuentes: FUENTE_FULL,
    personas: [],
    conciertos: [
      concierto("2027-09-16", "San Carlos de Bariloche", IDS.Bariloche, "20:00", "Jueves — The Fidelio Trío (nota doc)"),
      concierto("2027-09-18", "San Carlos de Bariloche", IDS.Bariloche, "20:00", "Sábado — Yamandú Costa (nota doc)"),
      concierto("2027-09-19", "San Carlos de Bariloche", IDS.Bariloche, "20:00", "Domingo — Concierto Pop"),
    ],
  },
  {
    num: 12,
    nombre: "Mannheim — Viedma (octubre)",
    tipo: "Camerata Filarmónica",
    desde: "2027-10-21",
    hasta: "2027-10-23",
    formacion: "CFMar + CFVal + solistas internos (Mannheim)",
    director_nota: "Director invitado",
    obras_nota: "A definir",
    localias: [{ id: IDS.Viedma, nombre: "Viedma" }],
    fuentes: FUENTE_CFMAR_CFVAL,
    personas: [],
    conciertos: [
      concierto("2027-10-22", "Viedma", IDS.Viedma, "20:00", "x2 Viedma"),
      concierto("2027-10-23", "Viedma", IDS.Viedma, "11:00", "Sábado 11:00"),
    ],
  },
  {
    num: 13,
    nombre: "Director invitado — Cipolletti y Regina",
    tipo: "Sinfónico",
    desde: "2027-11-03",
    hasta: "2027-11-06",
    formacion: "Full orquesta",
    director_nota: "Director invitado",
    obras_nota: "A definir",
    localias: [
      { id: IDS.Cipolletti, nombre: "Cipolletti" },
      { id: IDS.VillaRegina, nombre: "Villa Regina" },
    ],
    fuentes: FUENTE_FULL,
    personas: [],
    conciertos: [
      concierto("2027-11-05", "Cipolletti", IDS.Cipolletti, "20:00"),
      concierto("2027-11-06", "Villa Regina", IDS.VillaRegina, "20:00"),
    ],
  },
  {
    num: 14,
    nombre: "Obras Juan Falú",
    tipo: "Camerata Filarmónica",
    desde: "2027-11-12",
    hasta: "2027-11-15",
    formacion: "CFMontaña",
    director_nota: "Martin Fraile Milstein; Juan Falú",
    obras_nota: "Obras Juan Falú",
    localias: [
      { id: IDS.ElBolson, nombre: "El Bolsón" },
      { id: IDS.Norquinco, nombre: "Ñorquinco" },
    ],
    fuentes: [
      ...FUENTE_CFMON,
      { tipo: "FAMILIA", label: "Percusión" },
    ],
    personas: [],
    conciertos: [
      concierto("2027-11-13", "El Bolsón", IDS.ElBolson, "20:00"),
      concierto("2027-11-15", "Ñorquinco", IDS.Norquinco, "20:00"),
    ],
  },
  {
    num: 15,
    nombre: "Linues Lerner",
    tipo: "Sinfónico",
    desde: "2027-12-01",
    hasta: "2027-12-04",
    formacion: "Full Orquesta",
    director_nota: "Linues Lerner",
    obras_nota: "A definir",
    localias: [{ id: IDS.Bariloche, nombre: "San Carlos de Bariloche" }],
    fuentes: FUENTE_FULL,
    personas: [],
    conciertos: [
      concierto("2027-12-03", "San Carlos de Bariloche", IDS.Bariloche, "20:00", "x2 Bariloche"),
      concierto("2027-12-04", "San Carlos de Bariloche", IDS.Bariloche, "12:00", "Sábado 12:00"),
    ],
  },
  {
    num: 16,
    nombre: "Sinfónico-Coral",
    tipo: "Camerata Filarmónica",
    desde: "2027-12-06",
    hasta: "2027-12-08",
    formacion: "CFMontaña",
    director_nota: "A definir",
    obras_nota: "Sinfónico-Coral — Centro Cívico",
    localias: [{ id: IDS.Bariloche, nombre: "San Carlos de Bariloche" }],
    fuentes: FUENTE_CFMON,
    personas: [],
    conciertos: [
      concierto("2027-12-08", "San Carlos de Bariloche", IDS.Bariloche, "20:00", "Miércoles 8 — Centro Cívico"),
    ],
  },
].map((p) => ({
  ...p,
  estado: "Borrador",
  zona: inferZona(p.localias.map((l) => l.id)),
  localias_txt: p.localias.map((l) => l.nombre).join(" · "),
  fuentes_txt: p.fuentes
    .map((f) => (f.tipo === "FAMILIA" ? `FAM:${f.label}` : `ENS:${f.label}`))
    .join(" | "),
  personas_txt: p.personas.map((x) => x.label).join("; ") || "—",
  nota_localia: p.nota_localia || "",
  conciertos_txt: p.conciertos
    .map((c) => `${c.fecha}${c.hora_inicio ? ` ${c.hora_inicio}` : ""} @ ${c.localidad}`)
    .join(" · "),
}));

export { PROGRAMAS, IDS };

async function writeExcel(outPath) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "OFRN preview giras 2027";
  wb.created = new Date();

  const resumen = wb.addWorksheet("Programas");
  resumen.columns = [
    { header: "#", key: "num", width: 5 },
    { header: "Tipo", key: "tipo", width: 22 },
    { header: "Estado", key: "estado", width: 10 },
    { header: "Nombre", key: "nombre", width: 42 },
    { header: "Desde", key: "desde", width: 12 },
    { header: "Hasta", key: "hasta", width: 12 },
    { header: "Zona", key: "zona", width: 14 },
    { header: "Localías (giras_localidades)", key: "localias_txt", width: 48 },
    { header: "Formación (doc)", key: "formacion", width: 36 },
    { header: "Convocatoria (giras_fuentes)", key: "fuentes_txt", width: 48 },
    { header: "Personas (giras_integrantes)", key: "personas_txt", width: 28 },
    { header: "Conciertos", key: "conciertos_txt", width: 55 },
    { header: "Director / notas", key: "director_nota", width: 40 },
    { header: "Obras (nota, sin repertorio aún)", key: "obras_nota", width: 45 },
    { header: "Nota localía", key: "nota_localia", width: 50 },
  ];
  resumen.getRow(1).font = { bold: true };
  resumen.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };
  resumen.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (const p of PROGRAMAS) {
    const row = resumen.addRow(p);
    if (p.tipo === "Sinfónico") {
      row.getCell("tipo").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF08A" },
      };
    } else {
      row.getCell("tipo").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFBBF7D0" },
      };
    }
  }

  const conc = wb.addWorksheet("Conciertos");
  conc.columns = [
    { header: "Programa #", key: "num", width: 10 },
    { header: "Nombre gira", key: "nombre", width: 36 },
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Hora", key: "hora", width: 8 },
    { header: "Localidad", key: "localidad", width: 28 },
    { header: "id_localidad", key: "id_localidad", width: 12 },
    { header: "id_locacion", key: "id_locacion", width: 12 },
    { header: "Descripción", key: "descripcion", width: 20 },
    { header: "Nota", key: "nota", width: 50 },
  ];
  conc.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  conc.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };
  for (const p of PROGRAMAS) {
    for (const c of p.conciertos) {
      conc.addRow({
        num: p.num,
        nombre: p.nombre,
        fecha: c.fecha,
        hora: c.hora_inicio || "",
        localidad: c.localidad,
        id_localidad: c.id_localidad ?? "PENDIENTE",
        id_locacion: "(vacío — venue a cargar)",
        descripcion: c.descripcion,
        nota: c.nota || "",
      });
    }
  }

  const fuentes = wb.addWorksheet("Fuentes");
  fuentes.columns = [
    { header: "Programa #", key: "num", width: 10 },
    { header: "Tipo fuente", key: "tipo", width: 12 },
    { header: "Label", key: "label", width: 16 },
    { header: "valor_id", key: "id", width: 12 },
    { header: "valor_texto", key: "texto", width: 16 },
  ];
  fuentes.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  fuentes.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };
  for (const p of PROGRAMAS) {
    for (const f of p.fuentes) {
      fuentes.addRow({
        num: p.num,
        tipo: f.tipo,
        label: f.label,
        id: f.tipo === "ENSAMBLE" ? f.id : "",
        texto: f.tipo === "FAMILIA" ? f.label : "",
      });
    }
    for (const per of p.personas) {
      fuentes.addRow({
        num: p.num,
        tipo: "PERSONA→giras_integrantes",
        label: per.label,
        id: per.id,
        texto: `${per.rol}/${per.estado}`,
      });
    }
  }

  const notas = wb.addWorksheet("Notas");
  notas.getColumn(1).width = 100;
  const lines = [
    "PREVIEW — no se escribió nada en la base.",
    "",
    "Alcance: 16 programas (#1–#16). Estado Borrador. Sin repertorio, sin ensayos, sin logística, sin ciclos de cámara, sin Jazz Band.",
    "Sí: programas + giras_fuentes + giras_localidades + conciertos (eventos id_tipo_evento=1) + Natacha en #5 vía giras_integrantes.",
    "",
    "Full orquesta = FAMILIA Cuerdas|Maderas|Bronces|Percusión|Prod.",
    "Cuerdas Val = ENSAMBLE CAV+CEB+CPAT (no todo CFVal).",
    "Cuerdas Mon / CFMontaña = ENSAMBLE CFMon.",
    "Mannheim (#8/#9/#12) = ENSAMBLE CFMar + CFVal.",
    "#5 = FAMILIA Maderas|Bronces|Percusión|Prod. + Rutinelli Natacha (id 8456903) confirmado.",
    "",
    "Zonas inferidas: Andina / Valle / Atlántica (Alto Valle y Valle Medio unificados como Valle).",
    "Programa #1: localía solo Bariloche; nota de Frutillar (Chile) pendiente.",
    "Horas: sábado 11/12 según doc; el resto a las 20:00. Locación (venue) vacía.",
    "Nomenclador / mes_letra: vacíos (se sincronizan después).",
    "Staff artístico (directores/solistas invitados): solo nota; NO se insertan como staff.",
  ];
  lines.forEach((l, i) => {
    notas.getCell(i + 1, 1).value = l;
  });

  await wb.xlsx.writeFile(outPath);
  return outPath;
}

async function writePdf(outPath) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text("Preview giras 2027 — Sinfónico / Camerata Filarmónica (Borrador)", 40, 36);
  doc.setFontSize(9);
  doc.text(
    "No aplicado a DB. Conciertos + localías + convocatoria. Sin repertorio/ensayos/logística/ciclos cámara.",
    40,
    52,
  );

  autoTable(doc, {
    startY: 64,
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59] },
    head: [["#", "Tipo", "Nombre", "Fechas", "Zona", "Localías", "Convocatoria", "Conciertos"]],
    body: PROGRAMAS.map((p) => [
      p.num,
      p.tipo === "Sinfónico" ? "Sinf" : "CF",
      p.nombre,
      `${p.desde} → ${p.hasta}`,
      p.zona,
      p.localias_txt,
      p.fuentes_txt + (p.personas_txt !== "—" ? ` + ${p.personas_txt}` : ""),
      p.conciertos_txt,
    ]),
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 28 },
      2: { cellWidth: 110 },
      3: { cellWidth: 88 },
      4: { cellWidth: 55 },
      5: { cellWidth: 100 },
      6: { cellWidth: 130 },
      7: { cellWidth: 160 },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const v = data.cell.raw;
        if (v === "Sinf") data.cell.styles.fillColor = [254, 240, 138];
        if (v === "CF") data.cell.styles.fillColor = [187, 247, 208];
      }
    },
  });

  doc.addPage();
  doc.setFontSize(12);
  doc.text("Detalle de conciertos", 40, 36);
  autoTable(doc, {
    startY: 48,
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59] },
    head: [["#", "Gira", "Fecha", "Hora", "Localidad", "Nota"]],
    body: PROGRAMAS.flatMap((p) =>
      p.conciertos.map((c) => [
        p.num,
        p.nombre,
        c.fecha,
        c.hora_inicio || "",
        c.localidad,
        c.nota || "",
      ]),
    ),
  });

  doc.save(outPath);
  return outPath;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const downloads = path.join(os.homedir(), "Downloads");
  const xlsxPath = path.join(downloads, "preview_giras_sinf_cf_2027.xlsx");
  const pdfPath = path.join(downloads, "preview_giras_sinf_cf_2027.pdf");

  await writeExcel(xlsxPath);
  await writePdf(pdfPath);
  console.log("Excel:", xlsxPath);
  console.log("PDF:", pdfPath);
  console.log("Programas:", PROGRAMAS.length);
  console.log(
    "Conciertos:",
    PROGRAMAS.reduce((n, p) => n + p.conciertos.length, 0),
  );
}
