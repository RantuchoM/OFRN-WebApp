/**
 * Informe planificación ensambles 2027 (mismo que el mail CLI).
 * Genera PDF / Excel descargables desde Prestaciones → Proyección.
 */
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  estimatePcvFromFueraSegs,
  indexDemorasLocalidad,
  resolveGiraServiciosEstimate,
  sliceTime,
} from "./giraProyeccionPcv.js";
import {
  defaultProyeccionConfig,
  getAnioProyeccion,
  normalizeProyeccionConfig,
} from "./ensambleProyeccionConfig.js";
import {
  dayClipFromTramos,
  listMondaysFromTramos,
} from "./ensambleProyeccionEnsayos.js";
import {
  aggregateCicloStats,
  ciclosForEnsamble,
  formatConciertosEnsambleLabel,
  formatEnsNetosLabel,
} from "./ensambleCicloConciertos.js";
import {
  giraHasAwayPcv,
  giraKindLabel,
  giraTramoPesos,
} from "./serviciosEnsambleReport.js";

/**
 * Helvetica (WinAnsi) no dibuja → × ↔ · — …; en Gmail/visor se ven letras
 * con espaciado raro. Paridad con src/utils/serviciosPdf.js#toServiciosPdfText.
 */
function pdfText(value) {
  return String(value ?? "")
    .replace(/→|↔|⟶|➡/g, ">")
    .replace(/×/g, "x")
    .replace(/[–—]/g, "-")
    .replace(/\u00b7|·/g, "-")
    .replace(/…/g, "...")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/\s*-\s*/g, " - ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function pdfRow(cells) {
  return cells.map((c) => (typeof c === "number" ? c : pdfText(c)));
}

/** Viáticos (paridad src/utils/viaticosDiasComputables.js) */
function getDepartureFactor(timeStr) {
  const [h, m] = String(timeStr || "12:00").split(":").map(Number);
  const minutes = h * 60 + (m || 0);
  if (minutes <= 900) return 1;
  if (minutes <= 1260) return 0.75;
  return 0;
}
function getArrivalFactor(timeStr) {
  const [h, m] = String(timeStr || "12:00").split(":").map(Number);
  const minutes = h * 60 + (m || 0);
  if (minutes <= 180) return 0;
  if (minutes <= 899) return 0.75;
  return 1;
}
function calculateDaysDiff(dSal, hSal, dLleg, hLleg) {
  if (!dSal || !dLleg) return 0;
  const start = new Date(`${dSal}T00:00:00`);
  const end = new Date(`${dLleg}T00:00:00`);
  const diffDays = Math.round((end - start) / 86400000);
  if (diffDays < 0) return 0;
  if (diffDays === 0) {
    const [hs, ms] = String(hSal || "12:00").split(":").map(Number);
    const [hl, ml] = String(hLleg || "12:00").split(":").map(Number);
    const dur = hl * 60 + ml - (hs * 60 + ms);
    return dur >= 360 ? 1 : 0.75;
  }
  const middle = Math.max(0, diffDays - 1);
  return getDepartureFactor(hSal) + middle + getArrivalFactor(hLleg);
}

function classifyProgramaEnsambleConvocatoria(program, ensamble) {
  const fuentes = program?.giras_fuentes || [];
  const eid = Number(ensamble?.id);
  if (fuentes.some((f) => f?.tipo === "EXCL_ENSAMBLE" && Number(f.valor_id) === eid)) {
    return { status: "excluido", via: "EXCL_ENSAMBLE" };
  }
  if (fuentes.some((f) => f?.tipo === "ENSAMBLE" && Number(f.valor_id) === eid)) {
    return { status: "convocado", via: "ENSAMBLE" };
  }
  const familia = String(ensamble?.id_familia || "").trim();
  if (
    familia &&
    fuentes.some((f) => f?.tipo === "FAMILIA" && String(f.valor_texto).trim() === familia)
  ) {
    return { status: "convocado", via: "FAMILIA" };
  }
  const cfIds = ensamble?.id_ensamble_cf_ids || [];
  const cfHits = cfIds.filter(
    (cfId) =>
      !fuentes.some((f) => f?.tipo === "EXCL_ENSAMBLE" && Number(f.valor_id) === Number(cfId)) &&
      fuentes.some((f) => f?.tipo === "ENSAMBLE" && Number(f.valor_id) === Number(cfId)),
  );
  if (cfHits.length) return { status: "convocado", via: "CF" };
  return { status: "no", via: null };
}

export async function exportInformeEnsambles2027(bundle, opts = {}) {
  const format = opts.format || "both";
  const anio = Number(bundle.anio) || getAnioProyeccion();
  const proyeccionConfig = normalizeProyeccionConfig(
    bundle.proyeccionConfig || defaultProyeccionConfig(anio),
    anio,
  );
  const serviciosPorGira = Number(proyeccionConfig.servicios_por_gira) || 7;
  const tramosProy = proyeccionConfig.tramos;
  const mondays = listMondaysFromTramos(tramosProy);
  const { dayFrom: proyDayFrom, dayTo: proyDayTo } =
    dayClipFromTramos(tramosProy); // solo para textos / metadata del informe

  const girasRaw = bundle.girasRaw || [];
  const ensamblesRaw = bundle.ensamblesRaw || [];
  const ensayosProx = bundle.ensayosProx || [];
  const ciclosRaw = bundle.ciclosRaw || [];
  const feriados2027 = bundle.feriados2027 || [];
  const eventosGiras2027 = bundle.eventosGiras2027 || [];
  const demorasMap = indexDemorasLocalidad(
    opts.demorasRows || bundle.demorasRows || [],
  );
  const locNameById = new Map();
  const locAliasById = new Map();
  for (const l of bundle.localidades || []) {
    if (l?.id) {
      locNameById.set(Number(l.id), l.localidad || "");
      if (l.alias) locAliasById.set(Number(l.id), l.alias);
    }
  }
  for (const e of ensamblesRaw) {
    if (e.id_localidad && e.localidad) {
      locNameById.set(Number(e.id_localidad), e.localidad);
    }
    if (e.id_localidad && e.localidad_alias) {
      locAliasById.set(Number(e.id_localidad), e.localidad_alias);
    }
  }
  for (const g of girasRaw) {
    for (const l of g.localias || []) {
      if (l?.id && l?.localidad) locNameById.set(Number(l.id), l.localidad);
      if (l?.id && l?.alias) locAliasById.set(Number(l.id), l.alias);
    }
  }


/** Tipos que cuentan como servicio musical (paridad serviciosCantidad). */
const TIPO_SERVICIO = new Set([1, 2, 3, 13]); // Concierto, Ensayo, Ensayo General, Ensayo Ensamble

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function addMinutesToDateTime(isoDate, hhmm, addMin) {
  const [h, m] = String(hhmm).split(":").map(Number);
  const total = h * 60 + m + addMin;
  const dayAdd = Math.floor(total / (24 * 60));
  const rem = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(rem / 60)).padStart(2, "0");
  const mm = String(rem % 60).padStart(2, "0");
  return { date: addDays(isoDate, dayAdd), time: `${hh}:${mm}` };
}

function normalizeProgram(row) {
  const localias = Array.isArray(row.localias) ? row.localias : [];
  const fuentes = Array.isArray(row.fuentes) ? row.fuentes : [];
  const tramos = Array.isArray(row.tramos) ? row.tramos : [];
  const pid = Number(row.id);
  const eventos = eventosGiras2027
    .filter((e) => Number(e.id_gira) === pid)
    .map((e) => ({
      fecha: String(e.fecha).slice(0, 10),
      id_tipo_evento: Number(e.id_tipo_evento),
      tipo_evento: e.tipo_evento || e.descripcion || "",
      hora_inicio: e.hora_inicio,
      hora_fin: e.hora_fin,
      es_didactico: Boolean(e.es_didactico),
    }));
  return {
    id: row.id,
    nombre_gira: row.nombre_gira,
    tipo: row.tipo,
    zona: row.zona,
    fecha_desde: row.fecha_desde,
    fecha_hasta: row.fecha_hasta,
    estado: row.estado,
    hora_inicio_proyeccion: row.hora_inicio_proyeccion || null,
    hora_fin_proyeccion: row.hora_fin_proyeccion || null,
    servicios_estimados: row.servicios_estimados ?? null,
    eventos,
    giras_localidades: localias.map((l) => ({
      id_localidad: l.id,
      localidades: { id: l.id, localidad: l.localidad },
    })),
    giras_fuentes: fuentes.map((f) => ({
      tipo: f.tipo,
      valor_id: f.valor_id,
      valor_texto: f.valor_texto,
    })),
    tramos: tramos.map((s) => ({
      indice: Number(s.indice) || 0,
      fecha_desde: s.fecha_desde,
      fecha_hasta: s.fecha_hasta,
      localidad_ids: Array.isArray(s.localidad_ids)
        ? s.localidad_ids.map(Number).filter(Boolean)
        : [],
    })),
  };
}

function normalizeEnsamble(row) {
  return {
    id: row.id,
    ensamble: row.ensamble,
    id_familia: row.id_familia,
    id_localidad: row.id_localidad,
    localidades: row.id_localidad
      ? { id: row.id_localidad, localidad: row.localidad }
      : null,
    id_ensamble_cf_ids: Array.isArray(row.cf_ids) ? row.cf_ids : [],
  };
}

const programs = girasRaw.map(normalizeProgram);
const ensambles = ensamblesRaw.map(normalizeEnsamble);

/** Programas tipo Ensamble (ciclos) — no entran en la matriz L/A ni en giras. */
function normalizeCicloProgram(row) {
  const fuentes = Array.isArray(row.fuentes) ? row.fuentes : [];
  const eventos = Array.isArray(row.eventos) ? row.eventos : [];
  return {
    id: row.id,
    nombre_gira: row.nombre_gira,
    tipo: row.tipo,
    subtitulo: row.subtitulo,
    fecha_desde: row.fecha_desde,
    fecha_hasta: row.fecha_hasta,
    ensambleIds: fuentes
      .filter((f) => f?.tipo === "ENSAMBLE")
      .map((f) => Number(f.valor_id))
      .filter((id) => Number.isFinite(id) && id > 0),
    eventos: eventos.map((e) => ({
      fecha: e.fecha,
      hora_inicio: e.hora_inicio,
      hora_fin: e.hora_fin,
      es_didactico: Boolean(e.es_didactico),
      descripcion: e.descripcion,
    })),
  };
}

const cicloPrograms = ciclosRaw.map(normalizeCicloProgram);

function ensambleCicloStats(ensambleId) {
  const list = ciclosForEnsamble(cicloPrograms, ensambleId);
  return {
    ...aggregateCicloStats(list),
    programasList: list,
  };
}

function ensayoServicioValue(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return 0;
  const [h1, m1] = String(horaInicio).slice(0, 5).split(":").map(Number);
  const [h2, m2] = String(horaFin).slice(0, 5).split(":").map(Number);
  const secs = (h2 * 60 + m2 - (h1 * 60 + m1)) * 60;
  if (secs <= 1800) return 0;
  if (secs < 7200) return 0.5;
  return 1;
}

/**
 * Plantilla semanal: dow 1=lun … 7=dom (ISO).
 * Acepta filas de `ensamble_proyeccion_ensayos` (iso_dow + ensambles name)
 * o legacy eventos semana modelo (fecha + id_tipo_evento 13).
 */
function buildWeeklyTemplate(ensayos) {
  const byEnsamble = new Map();
  for (const ev of ensayos || []) {
    const name = String(ev.ensambles || "").trim();
    if (!name || name.includes(",")) continue;

    let isoDow = Number(ev.iso_dow ?? ev.isoDow);
    if (!Number.isFinite(isoDow) || isoDow < 1 || isoDow > 7) {
      if (Number(ev.id_tipo_evento) !== 13) continue;
      if (!ev.fecha) continue;
      const d = new Date(`${ev.fecha}T12:00:00`);
      const js = d.getDay();
      isoDow = js === 0 ? 7 : js;
    }

    const hora_inicio = String(ev.hora_inicio || "").slice(0, 5);
    const hora_fin = String(ev.hora_fin || "").slice(0, 5);
    const value = ensayoServicioValue(hora_inicio, hora_fin);
    if (!byEnsamble.has(name)) byEnsamble.set(name, []);
    byEnsamble.get(name).push({
      isoDow,
      hora_inicio,
      hora_fin,
      value,
      titulo: ev.titulo || ev.descripcion || "Ensayo",
      id_locacion: ev.id_locacion != null ? Number(ev.id_locacion) : null,
      locacion: ev.locacion || null,
    });
  }
  return byEnsamble;
}

function dateForDow(mondayIso, isoDow) {
  return addDays(mondayIso, isoDow - 1);
}

function overlapsGira(program, dayIso) {
  const a = String(program.fecha_desde).slice(0, 10);
  const b = String(program.fecha_hasta || program.fecha_desde).slice(0, 10);
  return dayIso >= a && dayIso <= b;
}

function primaryDestLocId(program, homeId) {
  const ids = (program.giras_localidades || [])
    .map((r) => Number(r.id_localidad ?? r.localidades?.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const away = ids.filter((id) => id !== Number(homeId));
  return (away[0] ?? ids[0]) || null;
}

function shortLocalidadName(name, id) {
  const n = Number(id);
  if (Number.isFinite(n) && locAliasById.has(n)) {
    return locAliasById.get(n);
  }
  const raw = String(name || "").trim();
  if (!raw) return "";
  for (const [lid, alias] of locAliasById) {
    if (locNameById.get(lid) === raw) return alias;
  }
  return raw;
}

function localidadNameById(id) {
  const n = Number(id);
  const name = locNameById.get(n);
  if (name) return shortLocalidadName(name, n) || name;
  return String(id);
}

/** Localías de la gira para el nombre: "Cipolletti → Villa Regina" si hay tramos. */
function programLocaliasLabel(program) {
  const tramos = [...(program?.tramos || [])]
    .sort((a, b) => Number(a?.indice) - Number(b?.indice))
    .map((seg) => {
      const ids = (seg.localidad_ids || []).map(Number).filter(Boolean);
      if (!ids.length) return "";
      return ids.map(localidadNameById).join("/");
    })
    .filter(Boolean);
  if (tramos.length >= 2) return tramos.join(" → ");

  const names = (program?.giras_localidades || [])
    .map((r) =>
      shortLocalidadName(
        r?.localidades?.localidad,
        r?.id_localidad ?? r?.localidades?.id,
      ),
    )
    .filter(Boolean);
  return [...new Set(names)].join(" · ");
}

function giraDisplayName(program) {
  const base = String(program?.nombre_gira || "").trim();
  const locs = programLocaliasLabel(program);
  return locs ? `${base} (${locs})` : base;
}

const WEEKDAY_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function weekdayEs(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return WEEKDAY_ES[new Date(y, m - 1, d).getDay()] || "";
}

function dayMonth(iso) {
  if (!iso) return "";
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${Number(d)}/${Number(m)}`;
}

function hourHs(hhmm) {
  const [h, m] = String(hhmm || "00:00")
    .slice(0, 5)
    .split(":")
    .map(Number);
  if (!Number.isFinite(h)) return "";
  if (!m) return `${h} hs`;
  return `${h}:${String(m).padStart(2, "0")} hs`;
}

function formatDiasLabel(n) {
  const v = Number(n) || 0;
  const label = String(v).replace(".", ",");
  return v === 1 ? `${label} día` : `${label} días`;
}

/** "martes 20/10, 22 hs a domingo 25/10, 10 hs. 4,5 días" */
function formatPcvFranja(win) {
  if (!win?.out?.date) return "";
  const outDate = win.out.date;
  const outTime = win.out.time || "12:00";
  const arrDate = win.back?.arrive?.date || win.back?.date;
  const arrTime = win.back?.arrive?.time || win.back?.time || "12:00";
  if (!arrDate) return "";
  return `${weekdayEs(outDate)} ${dayMonth(outDate)}, ${hourHs(outTime)} a ${weekdayEs(arrDate)} ${dayMonth(arrDate)}, ${hourHs(arrTime)}. ${formatDiasLabel(win.dias)}`;
}

const template = buildWeeklyTemplate(ensayosProx);

const rows = [];
const detalleGiras = [];
const detalleEnsayosConflicto = [];

for (const ens of ensambles) {
  let girasFuera = 0;
  let girasCasa = 0;
  let girasMixtas = 0;
  let pcv = 0;
  let servGirasEstAcc = 0;
  const girasList = [];

  for (const program of programs) {
    const cls = classifyProgramaEnsambleConvocatoria(program, ens);
    if (cls.status !== "convocado") continue;
    const pesos = giraTramoPesos(program, ens);
    girasFuera += Number(pesos.pesoFuera) || 0;
    girasCasa += Number(pesos.pesoEnCasa) || 0;
    girasMixtas += Number(pesos.pesoMixta) || 0;
    const estGira = resolveGiraServiciosEstimate(
      program,
      [],
      serviciosPorGira,
    );
    // Cada gira convocada cuenta 1 (casa / fuera / mixta son enteros exclusivos).
    servGirasEstAcc += Number(estGira.value) || 0;

    let pcvGira = 0;
    let pcvNota = "en casa — sin PCV";
    let pcvFranja = "";
    if (giraHasAwayPcv(pesos)) {
      const homeLoc = Number(ens.id_localidad);
      const trip = estimatePcvFromFueraSegs({
        homeLocId: homeLoc,
        fueraSegs: pesos.fueraSegs,
        fechaDesdeFallback: program.fecha_desde,
        fechaHastaFallback: program.fecha_hasta || program.fecha_desde,
        horaInicioProy: sliceTime(program?.hora_inicio_proyeccion) || "15:00",
        horaFinProy: sliceTime(program?.hora_fin_proyeccion) || "23:00",
        demorasMap,
        locNameById,
        pickDest: (seg) =>
          (seg?.localidad_ids || []).find((id) => Number(id) !== homeLoc) ||
          primaryDestLocId(program, homeLoc),
      });
      pcvGira = Number(trip.dias) || 0;
      pcvNota = trip.nota || pcvNota;
      pcvFranja = (trip.windows || [])
        .map((w) => formatPcvFranja(w))
        .filter(Boolean)
        .join(" · ");
      if ((Number(pesos.pesoMixta) || 0) >= 1) {
        pcvNota = `mixta — ${pcvNota}`;
      }
      pcv += pcvGira;
    }

    const casaFuera = giraKindLabel(pesos);

    const item = {
      ensamble: ens.ensamble,
      giraId: program.id,
      nombre: giraDisplayName(program),
      localias: programLocaliasLabel(program),
      tipo: program.tipo,
      zona: program.zona,
      desde: program.fecha_desde,
      hasta: program.fecha_hasta,
      casaFuera,
      kind: pesos.kind,
      pesoFuera: Number(pesos.pesoFuera) || 0,
      pesoEnCasa: Number(pesos.pesoEnCasa) || 0,
      pesoMixta: Number(pesos.pesoMixta) || 0,
      via: cls.via,
      pcv: Math.round(pcvGira * 100) / 100,
      pcvNota,
      pcvFranja,
    };
    girasList.push(item);
    detalleGiras.push(item);
  }

  const tpl = template.get(ens.ensamble) || [];
  const DOW_LABEL = {
    1: "lunes",
    2: "martes",
    3: "miércoles",
    4: "jueves",
    5: "viernes",
    6: "sábado",
    7: "domingo",
  };
  let ensayosTotal = 0;
  let ensayosServiciosBrutos = 0;
  let ensayosConflicto = 0;
  let ensayosServiciosConflicto = 0;
  const conflictosEns = [];

  // Solo semanas cuyo lunes está en algún tramo (huecos = vacaciones / cortes).
  for (const monday of mondays) {
    for (const slot of tpl) {
      const day = dateForDow(monday, slot.isoDow);
      const slotVal = Number(slot.value) || 0;
      if (!slotVal) continue;
      ensayosTotal += 1;
      ensayosServiciosBrutos += slotVal;

      const conflicting = programs.filter(
        (p) =>
          overlapsGira(p, day) &&
          classifyProgramaEnsambleConvocatoria(p, ens).status === "convocado",
      );
      if (conflicting.length) {
        ensayosConflicto += 1;
        ensayosServiciosConflicto += slotVal;
        const rowC = {
          ensamble: ens.ensamble,
          fecha: day,
          hora: `${slot.hora_inicio}-${slot.hora_fin}`,
          servicio: slotVal,
          giras: conflicting.map((p) => giraDisplayName(p)).join(" · "),
        };
        conflictosEns.push(rowC);
        detalleEnsayosConflicto.push(rowC);
      }
    }
  }

  const ensayosNetos = Math.max(
    0,
    ensayosServiciosBrutos - ensayosServiciosConflicto,
  );
  const pcvRound = Math.round(pcv * 100) / 100;
  const prestNetas = Math.round(ensayosNetos * 100) / 100;
  const girasFueraR = girasFuera;
  const girasCasaR = girasCasa;
  const girasMixtasR = girasMixtas;
  const girasTotalR = girasFueraR + girasCasaR + girasMixtasR;
  /** Suma por gira (manual o default config); no es total×n fijo. */
  const servGirasEst = Math.round(servGirasEstAcc * 100) / 100;
  const cicloStats = ensambleCicloStats(ens.id);

  /**
   * Feriados: 1 servicio por día no hábil (feriado / no laborable / domingo)
   * en que hay ensayo o concierto (no traslados ni otros eventos de logística).
   */
  const feriadosLookup = new Map(
    feriados2027.map((f) => [String(f.fecha).slice(0, 10), f]),
  );
  const serviceDayMeta = new Map(); // fecha -> { giras:Set, tipos:Set }
  const bumpServiceDay = (day, giraNombre, tipoLabel) => {
    if (!day) return;
    let meta = serviceDayMeta.get(day);
    if (!meta) {
      meta = { giras: new Set(), tipos: new Set() };
      serviceDayMeta.set(day, meta);
    }
    if (giraNombre) meta.giras.add(giraNombre);
    if (tipoLabel) meta.tipos.add(tipoLabel);
  };

  for (const program of programs) {
    const cls = classifyProgramaEnsambleConvocatoria(program, ens);
    if (cls.status !== "convocado") continue;
    const gName = giraDisplayName(program);
    for (const ev of program.eventos || []) {
      if (!TIPO_SERVICIO.has(Number(ev.id_tipo_evento))) continue;
      bumpServiceDay(
        String(ev.fecha).slice(0, 10),
        gName,
        ev.tipo_evento || "Servicio",
      );
    }
  }
  for (const prog of cicloPrograms) {
    if (!prog.ensambleIds.includes(Number(ens.id))) continue;
    const gName = prog.nombre_gira || "Ciclo ensamble";
    for (const ev of prog.eventos || []) {
      // Ciclos: conciertos (y ensayos si hubiera)
      bumpServiceDay(String(ev.fecha).slice(0, 10), gName, "Concierto ensamble");
    }
  }

  const feriadosHits = [];
  for (const [day, meta] of [...serviceDayMeta.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const fer = feriadosLookup.get(day);
    const isSunday = new Date(`${day}T12:00:00`).getDay() === 0;
    if (!fer && !isSunday) continue;
    feriadosHits.push({
      fecha: day,
      detalle: fer?.detalle || "Domingo",
      es_feriado: fer ? Boolean(fer.es_feriado) : true,
      tipo: fer ? (fer.es_feriado ? "Feriado" : "No laborable") : "Domingo",
      giras: [...meta.giras].join(" · "),
      servicios: [...meta.tipos].join(" · "),
    });
  }
  const feriadosCount = feriadosHits.length;

  rows.push({
    ensamble: ens.ensamble,
    familia: ens.id_familia || "",
    sede: ens.localidades?.localidad || "",
    id_localidad: ens.id_localidad,
    girasFuera: girasFueraR,
    girasCasa: girasCasaR,
    girasMixtas: girasMixtasR,
    girasTotal: girasTotalR,
    programasEnsamble: cicloStats.programasEnsamble,
    conciertosEnsamble: cicloStats.conciertosEnsamble,
    conciertosEnsambleReg: cicloStats.conciertosEnsambleReg,
    conciertosEnsambleDid: cicloStats.conciertosEnsambleDid,
    conciertosEnsambleLabel: cicloStats.conciertosEnsambleLabel,
    programasEnsambleList: cicloStats.programasList || [],
    servGirasEst,
    pcv: pcvRound,
    prestNetas,
    ensNetosLabel: formatEnsNetosLabel(
      Math.round(ensayosServiciosBrutos * 100) / 100,
      Math.round(ensayosServiciosConflicto * 100) / 100,
      prestNetas,
      fmtQty,
    ),
    feriados: feriadosCount,
    feriadosHits,
    serviciosTotales:
      Math.round(
        (pcvRound +
          prestNetas +
          servGirasEst +
          cicloStats.conciertosEnsamble +
          feriadosCount) *
          100,
      ) / 100,
    ensayosSemanaModelo: tpl.length,
    semanasProyectadas: mondays.length,
    ensayosTotal,
    ensayosConflicto,
    ensayosServiciosBrutos: Math.round(ensayosServiciosBrutos * 100) / 100,
    ensayosServiciosConflicto:
      Math.round(ensayosServiciosConflicto * 100) / 100,
    ensayosNetos: prestNetas,
    girasList,
    templateSlots: tpl.map(
      (s) =>
        `${DOW_LABEL[s.isoDow] || s.isoDow} ${s.hora_inicio}-${s.hora_fin}${
          s.locacion ? ` @ ${s.locacion}` : ""
        } → ${s.value}`,
    ),
    conflictosEns,
  });
}

rows.sort((a, b) => a.ensamble.localeCompare(b.ensamble, "es"));

function formatDdMmYyyyIso(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return String(iso).slice(0, 10);
  return `${d}/${m}/${y}`;
}

function fmtQty(n) {
  const v = Math.round(Number(n) * 100) / 100;
  return String(v).replace(".", ",");
}

/** "fecha desde - fecha hasta. Zona. Localidad/es" */
function matrixGiraLabel(program) {
  const a = formatDdMmYyyyIso(program.fecha_desde);
  const b = formatDdMmYyyyIso(program.fecha_hasta || program.fecha_desde);
  const zona = String(program.zona || "").trim() || "-";
  const locs = programLocaliasLabel(program) || "-";
  return `${a} - ${b}. ${zona}. ${locs}`;
}

function matrixMark(g) {
  if ((Number(g?.pesoMixta) || 0) >= 1) return "M";
  if ((Number(g?.pesoFuera) || 0) >= 1) return "A";
  return "L";
}

function matrixSumLabel(casa, fuera, mixtas = 0) {
  const n = Number(casa) || 0;
  const m = Number(fuera) || 0;
  const x = Number(mixtas) || 0;
  const t = n + m + x;
  return `${fmtQty(n)}L + ${fmtQty(m)}A + ${fmtQty(x)}M = ${fmtQty(t)}`;
}

/** Matriz Excel: filas = giras, columnas = ensambles, celda L/A. */
const ensambleCols = rows.map((r) => r.ensamble);
const markByKey = new Map();
/** Cuadro PDF (panel superior): L / días PCV / vacío. */
const cuadroCellByKey = new Map();
for (const r of rows) {
  for (const g of r.girasList || []) {
    const key = `${r.ensamble}|${g.giraId}`;
    markByKey.set(key, matrixMark(g));
    if (!giraHasAwayPcv(g)) {
      cuadroCellByKey.set(key, { kind: "L", label: "L" });
    } else {
      cuadroCellByKey.set(key, {
        kind: "pcv",
        label: fmtQty(g.pcv),
      });
    }
  }
}
const matrixPrograms = [...programs].sort((a, b) => {
  const da = String(a.fecha_desde || "");
  const db = String(b.fecha_desde || "");
  if (da !== db) return da.localeCompare(db);
  return Number(a.id) - Number(b.id);
});
const matrixRows = matrixPrograms.map((program) => ({
  program,
  label: matrixGiraLabel(program),
  cells: ensambleCols.map(
    (ensName) => markByKey.get(`${ensName}|${program.id}`) || "",
  ),
}));
const matrixTotals = rows.map((r) =>
  matrixSumLabel(r.girasCasa, r.girasFuera, r.girasMixtas),
);

const feriadosByDay = new Map(
  (feriados2027 || []).map((f) => [String(f.fecha).slice(0, 10), f]),
);

function feriadosCountForProgram(program) {
  const days = new Set();
  for (const ev of program.eventos || []) {
    if (!TIPO_SERVICIO.has(Number(ev.id_tipo_evento))) continue;
    const day = String(ev.fecha || "").slice(0, 10);
    if (!day) continue;
    const fer = feriadosByDay.get(day);
    const isSunday = new Date(`${day}T12:00:00`).getDay() === 0;
    if (fer || isSunday) days.add(day);
  }
  return days.size;
}

/**
 * Prest. del cuadro: solo override manual o default de config
 * (`servicios_por_gira`). No usa suma de eventos (E) — eso distorsiona
 * la proyección.
 */
function prestLabelForProgram(program) {
  const est = resolveGiraServiciosEstimate(program, [], serviciosPorGira);
  const src = est.source === "manual" ? "M" : "A";
  return `${fmtQty(est.value)} ${src}`;
}

const cuadroRows = matrixPrograms.map((program) => {
  const locs = programLocaliasLabel(program);
  return {
    program,
    gira: program.nombre_gira || `Gira ${program.id}`,
    giraSub: [program.tipo, locs].filter(Boolean).join(" · ") || "—",
    fDesde: formatDdMmYyyyIso(program.fecha_desde),
    hInicio: sliceTime(program.hora_inicio_proyeccion) || "15:00",
    fHasta: formatDdMmYyyyIso(
      program.fecha_hasta || program.fecha_desde,
    ),
    hFin: sliceTime(program.hora_fin_proyeccion) || "23:00",
    prest: prestLabelForProgram(program),
    feriados: feriadosCountForProgram(program),
    cells: ensambleCols.map((ensName) => {
      const cell = cuadroCellByKey.get(`${ensName}|${program.id}`);
      return cell || { kind: "empty", label: "" };
    }),
  };
});

const FILL = {
  identity: "FFF1F5F9", // slate-100
  fuera: "FFFFF7ED", // orange-50
  casa: "FFF0F9FF", // sky-50
  girasTot: "FFE2E8F0", // slate-200
  servGiras: "FFE0E7FF", // indigo-100
  pcv: "FFF0FDFA", // teal-50
  prestNetas: "FFECFDF5", // emerald-50
  total: "FFF8FAFC", // slate-50
  ensayos: "FFECFDF5", // emerald group
  headerDark: "FF1E293B",
  matrixL: "FFDBEAFE", // blue-100
  matrixA: "FFFFEDD5", // orange-100
  matrixLA: "FEF3C7", // amber-100 (legado L/A)
  matrixM: "FEF3C7", // amber-100
  mixtas: "FFFFFBEB", // amber-50
};

function paintHeader(cell, argb) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  cell.font = { bold: true, color: { argb: "FF0F172A" } };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
}

function paintMatrixCell(cell, mark) {
  cell.value = mark || "";
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.font = { bold: true, size: 11 };
  if (mark === "L") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.matrixL } };
  } else if (mark === "A") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.matrixA } };
  } else if (mark === "M" || mark === "L/A") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.matrixM } };
  }
}

/** Escribe la matriz L/A al inicio de la hoja Resumen; devuelve la siguiente fila libre. */
function writeExcelMatrix(ws) {
  const title = ws.getCell(1, 1);
  title.value =
    "Matriz giras × ensambles (L = local / en casa, A = afuera, M = mixta) — solo giras Sinfónico/CF; sin programas de ensamble";
  title.font = { bold: true, size: 12 };
  ws.mergeCells(1, 1, 1, 1 + ensambleCols.length);

  const headRow = 2;
  ws.getCell(headRow, 1).value = "Gira (fechas · zona · localía)";
  paintHeader(ws.getCell(headRow, 1), FILL.headerDark);
  ws.getCell(headRow, 1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ensambleCols.forEach((name, i) => {
    const cell = ws.getCell(headRow, i + 2);
    cell.value = name;
    paintHeader(cell, FILL.identity);
  });
  ws.getColumn(1).width = 48;
  ensambleCols.forEach((_, i) => {
    ws.getColumn(i + 2).width = 8;
  });
  ws.getRow(headRow).height = 28;

  let rowIdx = headRow + 1;
  for (const mr of matrixRows) {
    const labelCell = ws.getCell(rowIdx, 1);
    labelCell.value = mr.label;
    labelCell.alignment = { vertical: "middle", wrapText: true };
    labelCell.font = { size: 8 };
    mr.cells.forEach((mark, i) => {
      paintMatrixCell(ws.getCell(rowIdx, i + 2), mark);
    });
    ws.getRow(rowIdx).height = 28;
    rowIdx += 1;
  }

  const totLabel = ws.getCell(rowIdx, 1);
  totLabel.value = "Suma (nL + mA = total)";
  totLabel.font = { bold: true, size: 9 };
  totLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.girasTot } };
  matrixTotals.forEach((txt, i) => {
    const cell = ws.getCell(rowIdx, i + 2);
    cell.value = txt;
    cell.font = { bold: true, size: 7 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.girasTot } };
  });
  ws.getRow(rowIdx).height = 36;
  return rowIdx + 2;
}

async function writeExcel() {
  const wb = new ExcelJS.Workbook();
  wb.creator = `OFRN informe ensambles ${anio}`;

  const resumen = wb.addWorksheet("Resumen");
  const metricsStart = writeExcelMatrix(resumen);

  // Dos secciones: Giras (… Prog. ensamble) | Prestaciones (Prest. por gira … Prest. tot.)
  const colDefs = [
    { key: "ensamble", label: "Ensamble", group: "Giras", fill: FILL.identity, w: 11, align: "center" },
    { key: "familia", label: "Familia", group: "Giras", fill: FILL.identity, w: 11, align: "center" },
    { key: "sede", label: "Sede", group: "Giras", fill: FILL.identity, w: 14, align: "center" },
    { key: "girasFuera", label: "Fuera", group: "Giras", fill: FILL.fuera, w: 9, align: "center" },
    { key: "girasMixtas", label: "Mixtas", group: "Giras", fill: FILL.mixtas, w: 9, align: "center" },
    { key: "girasCasa", label: "En casa", group: "Giras", fill: FILL.casa, w: 9, align: "center" },
    { key: "girasTotal", label: "Total Giras", group: "Giras", fill: FILL.girasTot, w: 10, align: "center" },
    { key: "programasEnsamble", label: "Prog. ensamble", group: "Giras", fill: "FFECFDF5", w: 11, align: "center" },
    { key: "servGirasEst", label: "Prest. por gira", group: "Prestaciones", fill: FILL.servGiras, w: 12, align: "center" },
    { key: "pcv", label: "PCV", group: "Prestaciones", fill: FILL.pcv, w: 9, align: "center" },
    { key: "ensNetosLabel", label: "Ens. netos", group: "Prestaciones", fill: FILL.prestNetas, w: 16, align: "center" },
    { key: "conciertosEnsambleLabel", label: "Conc. ensamble", group: "Prestaciones", fill: "FFD1FAE5", w: 16, align: "center" },
    { key: "feriados", label: "Feriados", group: "Prestaciones", fill: "FFFCE7F3", w: 9, align: "center" },
    { key: "serviciosTotales", label: "Prest. tot.", group: "Prestaciones", fill: FILL.total, w: 10, align: "center" },
  ];

  const groupRow = metricsStart;
  const labelRow = metricsStart + 1;
  resumen.getRow(groupRow).height = 22;
  resumen.getRow(labelRow).height = 30;
  let c = 1;
  while (c <= colDefs.length) {
    const start = c;
    const group = colDefs[c - 1].group;
    while (c <= colDefs.length && colDefs[c - 1].group === group) c += 1;
    const end = c - 1;
    for (let i = start; i <= end; i += 1) {
      paintHeader(resumen.getCell(groupRow, i), colDefs[i - 1].fill);
    }
    if (end > start) resumen.mergeCells(groupRow, start, groupRow, end);
    const cell = resumen.getCell(groupRow, start);
    cell.value = group;
    paintHeader(cell, colDefs[start - 1].fill);
  }
  // Separador visual al inicio de Prestaciones (2 secciones)
  const groupStarts = [];
  {
    let i = 0;
    while (i < colDefs.length) {
      const g = colDefs[i].group;
      groupStarts.push(i + 1);
      while (i < colDefs.length && colDefs[i].group === g) i += 1;
    }
  }
  colDefs.forEach((def, i) => {
    const cell = resumen.getCell(labelRow, i + 1);
    cell.value = def.label;
    paintHeader(cell, def.fill);
    resumen.getColumn(i + 1).width = def.w;
  });
  // Mantener ancha la col 1 por la matriz de arriba
  resumen.getColumn(1).width = Math.max(48, colDefs[0].w);

  const applyMetricsCell = (excelRow, values, { bold = false } = {}) => {
    values.forEach((v, i) => {
      const cell = excelRow.getCell(i + 1);
      cell.value = v;
      cell.alignment = {
        vertical: "middle",
        horizontal: colDefs[i].align || "center",
        wrapText: true,
      };
      if (bold) cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: colDefs[i].fill },
      };
      // Borde izquierdo grueso al inicio de grupo (separación Tot.g | x7 y Prest.tot | Ens.)
      if (groupStarts.includes(i + 1) && i > 0) {
        cell.border = {
          left: { style: "medium", color: { argb: "FF334155" } },
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
      }
    });
  };

  // Bordes también en cabeceras de grupo/etiqueta
  for (const col of groupStarts) {
    if (col <= 1) continue;
    for (const r of [groupRow, labelRow]) {
      const cell = resumen.getCell(r, col);
      cell.border = {
        ...(cell.border || {}),
        left: { style: "medium", color: { argb: "FF334155" } },
      };
    }
  }

  for (const r of rows) {
    const values = colDefs.map((d) => r[d.key]);
    const excelRow = resumen.getRow(resumen.rowCount + 1);
    applyMetricsCell(excelRow, values);
  }

  const totValues = colDefs.map((d) => {
    if (d.key === "ensamble") return "TOTAL";
    if (["familia", "sede"].includes(d.key)) return "";
    if (d.key === "conciertosEnsambleLabel") {
      const reg = rows.reduce(
        (acc, r) => acc + (Number(r.conciertosEnsambleReg) || 0),
        0,
      );
      const did = rows.reduce(
        (acc, r) => acc + (Number(r.conciertosEnsambleDid) || 0),
        0,
      );
      const w = rows.reduce(
        (acc, r) => acc + (Number(r.conciertosEnsamble) || 0),
        0,
      );
      return formatConciertosEnsambleLabel({
        regular: reg,
        didactic: did,
        weighted: Math.round(w * 100) / 100,
      });
    }
    if (d.key === "ensNetosLabel") {
      const b = rows.reduce(
        (acc, r) => acc + (Number(r.ensayosServiciosBrutos) || 0),
        0,
      );
      const c = rows.reduce(
        (acc, r) => acc + (Number(r.ensayosServiciosConflicto) || 0),
        0,
      );
      const n = rows.reduce(
        (acc, r) => acc + (Number(r.prestNetas) || 0),
        0,
      );
      return formatEnsNetosLabel(
        Math.round(b * 100) / 100,
        Math.round(c * 100) / 100,
        Math.round(n * 100) / 100,
        fmtQty,
      );
    }
    if (typeof rows[0]?.[d.key] === "number") {
      const s = rows.reduce((acc, r) => acc + (Number(r[d.key]) || 0), 0);
      return Math.round(s * 100) / 100;
    }
    return "";
  });
  const totExcelRow = resumen.getRow(resumen.rowCount + 1);
  applyMetricsCell(totExcelRow, totValues, { bold: true });

  // One detail sheet per ensamble
  for (const r of rows) {
    const name = `Det ${r.ensamble}`.slice(0, 31);
    const ws = wb.addWorksheet(name);
    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 55;
    ws.getColumn(3).width = 18;
    ws.getColumn(4).width = 14;
    ws.getColumn(5).width = 55;

    let line = 1;
    const title = ws.getCell(line, 1);
    title.value = `Detalle — ${r.ensamble} (${r.sede || "sin sede"})`;
    title.font = { bold: true, size: 14 };
    line += 2;

    ws.getCell(line, 1).value = "Resumen";
    ws.getCell(line, 1).font = { bold: true };
    line += 1;
    ws.getCell(line, 1).value = "Giras fuera / mixtas / en casa / total";
    ws.getCell(line, 2).value =
      `${r.girasFuera} / ${r.girasMixtas || 0} / ${r.girasCasa} / ${r.girasTotal}`;
    line += 1;
    ws.getCell(line, 1).value = "Programas de ensamble";
    ws.getCell(line, 2).value = r.programasEnsamble;
    line += 1;
    ws.getCell(line, 1).value = "Conciertos de ensamble (1 / 0,5 didácticos)";
    ws.getCell(line, 2).value =
      r.conciertosEnsambleLabel || String(r.conciertosEnsamble);
    line += 1;
    ws.getCell(line, 1).value = "Prestaciones por gira";
    ws.getCell(line, 2).value = r.servGirasEst;
    line += 1;
    ws.getCell(line, 1).value = "PCV";
    ws.getCell(line, 2).value = r.pcv;
    line += 1;
    ws.getCell(line, 1).value = "Ens. netos (ensayos)";
    ws.getCell(line, 2).value = r.ensNetosLabel || String(r.prestNetas);
    line += 1;
    ws.getCell(line, 1).value =
      "Feriados (feriado / no laborable / domingo en gira)";
    ws.getCell(line, 2).value = r.feriados;
    line += 1;
    ws.getCell(line, 1).value =
      "Prest. tot. (Prest. por gira + PCV + Ens. netos + Conc. ens. + Feriados)";
    ws.getCell(line, 2).value = r.serviciosTotales;
    line += 2;

    ws.getCell(line, 1).value = "Cálculo de ensayos";
    ws.getCell(line, 1).font = { bold: true };
    line += 1;
    ws.getCell(line, 1).value = "Modelo";
    ws.getCell(line, 2).value =
      `Plantilla semanal editable (ensamble_proyeccion_ensayos) × tramos de ${anio}`;
    line += 1;
    ws.getCell(line, 1).value = "Slots semanales";
    ws.getCell(line, 2).value =
      (r.templateSlots || []).join(" · ") || "(sin slots en plantilla)";
    line += 1;
    ws.getCell(line, 1).value = "Fórmula";
    ws.getCell(line, 2).value = `ensayos tot. ${r.ensayosTotal} = ${r.ensayosSemanaModelo} slots × ${r.semanasProyectadas} semanas; Ens. netos = brutos − conflicto (${r.ensayosServiciosBrutos} − ${r.ensayosServiciosConflicto})`;
    line += 1;
    ws.getCell(line, 1).value = "Valor por ensayo";
    ws.getCell(line, 2).value = "≥2 h → 1; >30 min y <2 h → 0,5; ≤30 min → 0";
    line += 2;

    ws.getCell(line, 1).value = "Programas de ensamble (listado)";
    ws.getCell(line, 1).font = { bold: true };
    paintHeader(ws.getCell(line, 1), "FFECFDF5");
    line += 1;
    const progList = r.programasEnsambleList || [];
    if (!progList.length) {
      ws.getCell(line, 1).value = "(ninguno)";
      line += 1;
    } else {
      ws.getCell(line, 1).value = "Programa";
      ws.getCell(line, 2).value = "Fechas";
      ws.getCell(line, 3).value = "Conc.";
      ws.getCell(line, 4).value = "Didáct.";
      ws.getCell(line, 5).value = "Prest.";
      for (let i = 1; i <= 5; i += 1) {
        paintHeader(ws.getCell(line, i), "FFECFDF5");
      }
      line += 1;
      for (const p of progList) {
        ws.getCell(line, 1).value = p.subtitulo
          ? `${p.nombre} — ${p.subtitulo}`
          : p.nombre;
        ws.getCell(line, 2).value = `${p.desde} → ${p.hasta}`;
        ws.getCell(line, 3).value = p.regular;
        ws.getCell(line, 4).value = p.didactic;
        ws.getCell(line, 5).value = p.label;
        line += 1;
      }
    }
    line += 1;

    ws.getCell(line, 1).value = "Giras en casa";
    ws.getCell(line, 1).font = { bold: true };
    paintHeader(ws.getCell(line, 1), FILL.casa);
    line += 1;
    const enCasa = (r.girasList || []).filter(
      (g) => (Number(g.pesoEnCasa) || 0) >= 1,
    );
    if (!enCasa.length) {
      ws.getCell(line, 1).value = "(ninguna)";
      line += 1;
    } else {
      ws.getCell(line, 1).value = "Gira";
      ws.getCell(line, 2).value = "Fechas";
      ws.getCell(line, 3).value = "Vía";
      ["A", "B", "C"].forEach((_, i) => paintHeader(ws.getCell(line, i + 1), FILL.casa));
      line += 1;
      for (const g of enCasa) {
        ws.getCell(line, 1).value = g.nombre;
        ws.getCell(line, 2).value = `${g.desde} → ${g.hasta}`;
        ws.getCell(line, 3).value = g.via;
        line += 1;
      }
    }
    line += 1;

    ws.getCell(line, 1).value = "Giras fuera / mixtas + franja PCV";
    ws.getCell(line, 1).font = { bold: true };
    paintHeader(ws.getCell(line, 1), FILL.pcv);
    line += 1;
    const fueraList = (r.girasList || []).filter((g) => giraHasAwayPcv(g));
    ws.getCell(line, 1).value = "Gira";
    ws.getCell(line, 2).value = "Fechas";
    ws.getCell(line, 3).value = "PCV días";
    ws.getCell(line, 4).value = "Franja (ida → vuelta)";
    ws.getCell(line, 5).value = "Nota";
    for (let i = 1; i <= 5; i += 1) paintHeader(ws.getCell(line, i), FILL.pcv);
    line += 1;
    if (!fueraList.length) {
      ws.getCell(line, 1).value = "(ninguna)";
      line += 1;
    } else {
      for (const g of fueraList) {
        ws.getCell(line, 1).value = g.nombre;
        ws.getCell(line, 2).value = `${g.desde} → ${g.hasta}`;
        ws.getCell(line, 3).value = g.pcv;
        ws.getCell(line, 4).value = g.pcvFranja || "";
        ws.getCell(line, 5).value = g.pcvNota || "";
        line += 1;
      }
    }
    line += 1;

    ws.getCell(line, 1).value = "Feriados / no laborables / domingos en gira";
    ws.getCell(line, 1).font = { bold: true };
    paintHeader(ws.getCell(line, 1), "FFFCE7F3");
    line += 1;
    ws.getCell(line, 1).value = "Fecha";
    ws.getCell(line, 2).value = "Detalle";
    ws.getCell(line, 3).value = "Tipo";
    ws.getCell(line, 4).value = "Servicio(s)";
    ws.getCell(line, 5).value = "Gira(s)";
    for (let i = 1; i <= 5; i += 1) paintHeader(ws.getCell(line, i), "FFFCE7F3");
    line += 1;
    const ferList = r.feriadosHits || [];
    if (!ferList.length) {
      ws.getCell(line, 1).value = "(ninguno)";
      line += 1;
    } else {
      for (const f of ferList) {
        ws.getCell(line, 1).value = f.fecha;
        ws.getCell(line, 2).value = f.detalle;
        ws.getCell(line, 3).value = f.tipo;
        ws.getCell(line, 4).value = f.servicios || "";
        ws.getCell(line, 5).value = f.giras;
        line += 1;
      }
    }
    line += 1;

    ws.getCell(line, 1).value = "Ensayos en conflicto (detalle)";
    ws.getCell(line, 1).font = { bold: true };
    paintHeader(ws.getCell(line, 1), "FFFEE2E2");
    line += 1;
    ws.getCell(line, 1).value = "Fecha";
    ws.getCell(line, 2).value = "Horario";
    ws.getCell(line, 3).value = "Servicio";
    ws.getCell(line, 4).value = "Gira(s)";
    for (let i = 1; i <= 4; i += 1) paintHeader(ws.getCell(line, i), "FFFEE2E2");
    line += 1;
    const confl = r.conflictosEns || [];
    if (!confl.length) {
      ws.getCell(line, 1).value = "(ninguno)";
    } else {
      for (const c of confl) {
        ws.getCell(line, 1).value = c.fecha;
        ws.getCell(line, 2).value = c.hora;
        ws.getCell(line, 3).value = c.servicio;
        ws.getCell(line, 4).value = c.giras;
        line += 1;
      }
    }
  }

  const gSheet = wb.addWorksheet("Giras por ensamble");
  gSheet.columns = [
    { header: "Ensamble", key: "ensamble", width: 12 },
    { header: "Gira", key: "nombre", width: 55 },
    { header: "Localía", key: "localias", width: 28 },
    { header: "Tipo", key: "tipo", width: 20 },
    { header: "Zona", key: "zona", width: 18 },
    { header: "Desde", key: "desde", width: 12 },
    { header: "Hasta", key: "hasta", width: 12 },
    { header: "Casa/Fuera", key: "casaFuera", width: 12 },
    { header: "Vía", key: "via", width: 10 },
    { header: "PCV", key: "pcv", width: 8 },
    { header: "Franja PCV", key: "pcvFranja", width: 62 },
    { header: "Nota PCV", key: "pcvNota", width: 40 },
  ];
  gSheet.getRow(1).font = { bold: true };
  for (const g of detalleGiras) {
    const row = gSheet.addRow(g);
    const fill =
      (Number(g.pesoMixta) || 0) >= 1
        ? FILL.mixtas
        : (Number(g.pesoFuera) || 0) >= 1
          ? FILL.fuera
          : FILL.casa;
    for (let i = 1; i <= 12; i += 1) {
      row.getCell(i).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fill },
      };
    }
  }

  const cSheet = wb.addWorksheet("Ensayos en conflicto");
  cSheet.columns = [
    { header: "Ensamble", key: "ensamble", width: 12 },
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Horario", key: "hora", width: 14 },
    { header: "Servicio", key: "servicio", width: 10 },
    { header: "Gira(s) en conflicto", key: "giras", width: 60 },
  ];
  cSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  cSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF991B1B" },
  };
  for (const c of detalleEnsayosConflicto) cSheet.addRow(c);

  const notas = wb.addWorksheet("Notas");
  notas.getColumn(1).width = 110;
  const lines = [
    `Informe planificación ensambles ${anio} (incluye giras Borrador seed).`,
    "Primera hoja: matriz giras × ensambles — L = local (en casa), A = afuera, M = mixta (2+ localías con al menos una local). Pie: nL + mA + xM = total (enteros).",
    "Colores alineados a Prestaciones: Fuera=naranja, Mixtas=ámbar, En casa=celeste, PCV=teal, Ens. netos=esmeralda.",
    `Prestaciones por gira = suma de ensayos/conciertos estimados por gira (manual o default ${serviciosPorGira}).`,
    "Dos secciones: Giras (incl. Prog. ensamble) | Prestaciones (Prest. por gira, PCV, Ens. netos, Conc. ensamble, Feriados, Prest. tot.).",
    `Feriados: 1 servicio por feriado / no laborable / domingo SOLO si ese día hay ensayo o concierto (tipos 1/2/3/13). No cuenta día de traslado ni otros eventos de logística. Domingos por criterio (no en tabla). Año ${anio}.`,
    "Prest. tot. = Prest. por gira + PCV + Ens. netos + Conc. ensamble + Feriados.",
    "Prog./Conc. ensamble = Ciclos de Cámara I–III. Concierto=1; didáctico=0,5. No entran en la matriz L/A/M.",
    "Ens. netos = servicios de ensayos proyectados netos de conflicto pleno pendiente.",
    "Localías: casa = todas locales; fuera = ninguna local; mixta = 2+ localías con ≥1 local y ≥1 ajena (conteo entero 1, sin 1/n).",
    "PCV franja: «martes 20/10, 22 hs a domingo 25/10, 10 hs. 4,5 días» (salida → llegada vuelta).",
    "PCV: ventana ida+vuelta (matriz + salidas); en mixtas/fuera solo tramos ajenos a la sede. El Bolsón ↔ Bariloche ~2h30.",
    "Tramos seed: Cipolletti→Villa Regina último día (207, 213); El Bolsón→Ñorquinco último día (214 Falú).",
    "Cada gira se lista con localía entre paréntesis.",
    `Ensayos: plantilla editable ensamble_proyeccion_ensayos × ${mondays.length} lunes en tramos de config (${proyDayFrom}–${proyDayTo}). Servicios/gira estimados: ${serviciosPorGira}.`,
    "Hojas Det <ensamble>: cálculo de ensayos, giras en casa, franjas PCV, feriados en gira y conflictos.",
  ];
  lines.forEach((l, i) => {
    notas.getCell(i + 1, 1).value = l;
  });

  return await wb.xlsx.writeBuffer();
}

function pdfWriteEnsamblePage(doc, r) {
  const marginX = 36;

  // Encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfText(r.ensamble), marginX, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    pdfText(
      `${r.sede || "sin sede"}${r.familia ? `  |  ${r.familia}` : ""}  |  Proyección ${anio}`,
    ),
    marginX,
    46,
  );

  // --- Bloque 1: Giras ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(154, 52, 18);
  doc.text(pdfText("1. Giras (convocatoria)"), marginX, 62);

  autoTable(doc, {
    startY: 66,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 9,
      cellPadding: 3.2,
      font: "helvetica",
      halign: "center",
      valign: "middle",
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
    },
    head: [
      pdfRow([
        "Fuera de casa",
        "Mixtas",
        "En casa",
        "Total giras",
        "Programas de ensamble",
      ]),
    ],
    body: [
      pdfRow([
        String(r.girasFuera),
        String(r.girasMixtas || 0),
        String(r.girasCasa),
        String(r.girasTotal),
        String(r.programasEnsamble),
      ]),
    ],
    columnStyles: {
      0: { cellWidth: 100, fillColor: [255, 247, 237], textColor: [154, 52, 18], fontStyle: "bold", fontSize: 12 },
      1: { cellWidth: 90, fillColor: [255, 251, 235], textColor: [146, 64, 14], fontStyle: "bold", fontSize: 12 },
      2: { cellWidth: 100, fillColor: [240, 249, 255], textColor: [12, 74, 110], fontStyle: "bold", fontSize: 12 },
      3: { cellWidth: 100, fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 12 },
      4: { cellWidth: 130, fillColor: [236, 253, 245], textColor: [6, 95, 70], fontStyle: "bold", fontSize: 12 },
    },
  });

  let y = (doc.lastAutoTable?.finalY || 90) + 12;

  // --- Bloque 2: Prestaciones ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(49, 46, 129);
  doc.text(pdfText("2. Prestaciones (como se arma el total)"), marginX, y);
  y += 4;

  const prestRows = [
    {
      label: "Prestaciones por gira",
      hint: "Ensayos y conciertos en gira",
      value: fmtQty(r.servGirasEst),
      fill: [224, 231, 255],
    },
    {
      label: "PCV",
      hint: "Dias de viatico fuera de casa",
      value: fmtQty(r.pcv),
      fill: [204, 251, 241],
    },
    {
      label: "Ensayos netos",
      hint: "Brutos - conflicto = netos",
      value: r.ensNetosLabel || String(r.prestNetas),
      fill: [237, 233, 254],
    },
    {
      label: "Conciertos de ensamble",
      hint: "1 por concierto; 0,5 por didactico",
      value: r.conciertosEnsambleLabel || String(r.conciertosEnsamble),
      fill: [209, 250, 229],
    },
    {
      label: "Feriados",
      hint: "Feriado / no laborable / domingo con servicio",
      value: String(r.feriados),
      fill: [252, 231, 243],
    },
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      font: "helvetica",
      valign: "middle",
    },
    headStyles: {
      fillColor: [49, 46, 129],
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
    },
    head: [pdfRow(["Concepto", "Que significa", "Valor"])],
    body: prestRows.map((row) => pdfRow([row.label, row.hint, row.value])),
    columnStyles: {
      0: { cellWidth: 130, fontStyle: "bold", halign: "left" },
      1: { cellWidth: 220, fontSize: 8, textColor: [71, 85, 105], halign: "left" },
      2: { cellWidth: 170, fontStyle: "bold", fontSize: 11, halign: "center" },
    },
    didParseCell(data) {
      if (data.section !== "body" || data.column.index !== 2) return;
      const fill = prestRows[data.row.index]?.fill;
      if (fill) data.cell.styles.fillColor = fill;
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 6;

  // Total destacado
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 11,
      cellPadding: 4,
      font: "helvetica",
      fontStyle: "bold",
      valign: "middle",
    },
    body: [
      pdfRow([
        "TOTAL PRESTACIONES",
        "Prest. por gira + PCV + Ens. netos + Conc. ens. + Feriados",
        fmtQty(r.serviciosTotales),
      ]),
    ],
    columnStyles: {
      0: {
        cellWidth: 130,
        fillColor: [15, 23, 42],
        textColor: 255,
        halign: "left",
      },
      1: {
        cellWidth: 220,
        fillColor: [30, 41, 59],
        textColor: [203, 213, 225],
        fontSize: 8,
        fontStyle: "normal",
        halign: "left",
      },
      2: {
        cellWidth: 170,
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 14,
        halign: "center",
      },
    },
    theme: "plain",
  });

  // Detalle: Giras en casa → Giras fuera → Programas → Feriados → Ensayos en conflicto
  const ensureSpace = (needed = 40) => {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + needed > pageH - 28) {
      doc.addPage("a4", "landscape");
      y = 36;
    }
  };

  /** "martes, 01 de julio de 2027" */
  const formatFechaConflicto = (iso) => {
    const day = String(iso || "").slice(0, 10);
    const [yy, mm, dd] = day.split("-").map(Number);
    if (!yy || !mm || !dd) return day || "";
    const date = new Date(yy, mm - 1, dd);
    if (Number.isNaN(date.getTime())) return day;
    const weekday = new Intl.DateTimeFormat("es-AR", { weekday: "long" })
      .format(date)
      .toLowerCase();
    const month = new Intl.DateTimeFormat("es-AR", { month: "long" })
      .format(date)
      .toLowerCase();
    return `${weekday}, ${String(dd).padStart(2, "0")} de ${month} de ${yy}`;
  };

  y = (doc.lastAutoTable?.finalY || y) + 14;
  ensureSpace(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfText("Giras en casa"), marginX, y);
  y += 4;
  const enCasa = (r.girasList || []).filter(
    (g) => (Number(g.pesoEnCasa) || 0) >= 1,
  );
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 7, cellPadding: 2, font: "helvetica" },
    headStyles: { fillColor: [186, 230, 253], textColor: [15, 23, 42] },
    head: [pdfRow(["Gira", "Fechas", "Via"])],
    body: enCasa.length
      ? enCasa.map((g) =>
          pdfRow([g.nombre, `${g.desde} > ${g.hasta}`, g.via || ""]),
        )
      : [pdfRow(["(ninguna)", "", ""])],
    columnStyles: {
      0: { cellWidth: 280 },
      1: { cellWidth: 130 },
      2: { cellWidth: 70 },
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 12;
  ensureSpace(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfText("Giras fuera / mixtas"), marginX, y);
  y += 4;
  const fueraList = (r.girasList || []).filter((g) => giraHasAwayPcv(g));
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.8,
      overflow: "linebreak",
      font: "helvetica",
    },
    headStyles: { fillColor: [204, 251, 241], textColor: [15, 23, 42] },
    head: [pdfRow(["Gira", "Casa/Fuera", "PCV", "Franja PCV"])],
    body: fueraList.length
      ? fueraList.map((g) =>
          pdfRow([
            g.nombre,
            g.casaFuera,
            String(g.pcv),
            g.pcvFranja || g.pcvNota || "",
          ]),
        )
      : [pdfRow(["(ninguna)", "", "", ""])],
    columnStyles: {
      0: { cellWidth: 200 },
      1: { cellWidth: 70 },
      2: { cellWidth: 36 },
      3: { cellWidth: 250 },
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 12;
  ensureSpace(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfText("Programas de ensamble"), marginX, y);
  y += 4;
  const progList = r.programasEnsambleList || [];
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 7, cellPadding: 2, font: "helvetica" },
    headStyles: { fillColor: [236, 253, 245], textColor: [15, 23, 42] },
    head: [pdfRow(["Programa", "Fechas", "Conc.", "Didact.", "Prest."])],
    body: progList.length
      ? progList.map((p) =>
          pdfRow([
            p.subtitulo ? `${p.nombre} - ${p.subtitulo}` : p.nombre,
            `${p.desde} > ${p.hasta}`,
            String(p.regular),
            String(p.didactic),
            p.label,
          ]),
        )
      : [pdfRow(["(ninguno)", "", "", "", ""])],
    columnStyles: {
      0: { cellWidth: 220 },
      1: { cellWidth: 110 },
      2: { cellWidth: 40 },
      3: { cellWidth: 48 },
      4: { cellWidth: 90 },
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 12;
  ensureSpace(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfText("Feriados"), marginX, y);
  y += 4;
  const ferList = r.feriadosHits || [];
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 7, cellPadding: 2, font: "helvetica" },
    headStyles: { fillColor: [252, 231, 243], textColor: [15, 23, 42] },
    head: [pdfRow(["Fecha", "Detalle", "Tipo", "Servicio", "Gira(s)"])],
    body: ferList.length
      ? ferList.map((f) =>
          pdfRow([
            formatDdMmYyyyIso(f.fecha),
            f.detalle,
            f.tipo,
            f.servicios || "",
            f.giras || "",
          ]),
        )
      : [pdfRow(["(ninguno)", "", "", "", ""])],
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 160 },
      2: { cellWidth: 58 },
      3: { cellWidth: 90 },
      4: { cellWidth: 210 },
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 12;
  ensureSpace(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfText("Ensayos en conflicto"), marginX, y);
  y += 4;
  const confl = (r.conflictosEns || []).slice(0, 18);
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.6,
      overflow: "linebreak",
      font: "helvetica",
    },
    headStyles: { fillColor: [254, 202, 202], textColor: [127, 29, 29] },
    head: [pdfRow(["Fecha", "Horario", "Serv.", "Gira(s)"])],
    body: confl.length
      ? confl.map((c) =>
          pdfRow([
            formatFechaConflicto(c.fecha),
            c.hora,
            String(c.servicio),
            c.giras,
          ]),
        )
      : [pdfRow(["(ninguno)", "", "", ""])],
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 68 },
      2: { cellWidth: 36 },
      3: { cellWidth: 248 },
    },
  });
  if ((r.conflictosEns || []).length > confl.length) {
    const footY = (doc.lastAutoTable?.finalY || y) + 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(
      pdfText(
        `... y ${(r.conflictosEns || []).length - confl.length} mas (ver Excel).`,
      ),
      marginX,
      footY,
    );
  }
}

/**
 * Página 2: mismo cuadro que el panel superior de Proyección
 * (gira · fechas · horas · prest. · feriados · L / PCV por ensamble).
 */
function writePdfMatrixPage(doc) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(
    pdfText(`Proyección PCV ${anio} - cuadro giras x ensambles`),
    28,
    28,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    pdfText(
      "L = en casa. Numero = dias PCV. Prest. M=manual A=default config (no suma eventos). Feriados = feriado/no laborable/domingo con servicio.",
    ),
    28,
    40,
  );

  const metaKeys = [
    "Gira",
    "F. inicio",
    "H. inicio",
    "F. fin",
    "H. fin",
    "Prest.",
    "Feriados",
  ];
  const head = [pdfRow([...metaKeys, ...ensambleCols])];
  const body = cuadroRows.map((row) =>
    pdfRow([
      `${row.gira}\n${row.giraSub}`,
      row.fDesde,
      row.hInicio,
      row.fHasta,
      row.hFin,
      row.prest,
      row.feriados > 0 ? String(row.feriados) : "",
      ...row.cells.map((c) => c.label || ""),
    ]),
  );

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const usable = pageW - margin * 2;
  const ensCount = Math.max(ensambleCols.length, 1);
  const giraW = 118;
  const dateW = 42;
  const timeW = 32;
  const prestW = 36;
  const ferW = 28;
  const metaW = giraW + dateW * 2 + timeW * 2 + prestW + ferW;
  const ensW = Math.max(22, (usable - metaW) / ensCount);
  const metaIdx = {
    gira: 0,
    fDesde: 1,
    hInicio: 2,
    fHasta: 3,
    hFin: 4,
    prest: 5,
    feriados: 6,
  };
  const firstEnsCol = metaKeys.length;

  autoTable(doc, {
    startY: 48,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 5.5,
      cellPadding: 1.1,
      font: "helvetica",
      overflow: "linebreak",
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontSize: 5.5,
      fontStyle: "bold",
      valign: "middle",
    },
    columnStyles: {
      [metaIdx.gira]: { cellWidth: giraW, halign: "left", fontSize: 5 },
      [metaIdx.fDesde]: { cellWidth: dateW },
      [metaIdx.hInicio]: { cellWidth: timeW },
      [metaIdx.fHasta]: { cellWidth: dateW },
      [metaIdx.hFin]: { cellWidth: timeW },
      [metaIdx.prest]: { cellWidth: prestW },
      [metaIdx.feriados]: { cellWidth: ferW, fillColor: [252, 231, 243] },
      ...Object.fromEntries(
        ensambleCols.map((_, i) => [
          firstEnsCol + i,
          { cellWidth: ensW, halign: "center" },
        ]),
      ),
    },
    head,
    body,
    didParseCell(data) {
      if (data.section === "head" && data.column.index === metaIdx.feriados) {
        data.cell.styles.fillColor = [251, 207, 232];
        data.cell.styles.textColor = [131, 24, 67];
      }
      if (data.section !== "body") return;
      const col = data.column.index;
      if (col === metaIdx.feriados) {
        data.cell.styles.fillColor = [252, 231, 243];
        data.cell.styles.textColor = [157, 23, 77];
        data.cell.styles.fontStyle = "bold";
        return;
      }
      if (col < firstEnsCol) return;
      const ensIdx = col - firstEnsCol;
      const row = cuadroRows[data.row.index];
      const cell = row?.cells?.[ensIdx];
      if (!cell) return;
      if (cell.kind === "L") {
        data.cell.styles.fillColor = [224, 242, 254];
        data.cell.styles.textColor = [12, 74, 110];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 7;
      } else if (cell.kind === "pcv") {
        data.cell.styles.fillColor = [240, 253, 250];
        data.cell.styles.textColor = [19, 78, 74];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 6.5;
      }
    },
  });
}

function writePdfResumenPage(doc) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(
    pdfText(`Proyección de convocatorias y prestaciones (${anio})`),
    40,
    32,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    pdfText(
      "Dos cuadros: Giras (arriba) y Prestaciones (abajo). Conc. ens.=prest. (N + M did.). Pag. 2 = cuadro proyección (L / PCV).",
    ),
    40,
    46,
  );

  const marginX = 28;
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - marginX * 2;
  const ensW = 78;
  const sedeW = 88;

  const drawResumenBlock = ({
    startY,
    title,
    head,
    body,
    toneByCol,
    widths,
  }) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfText(title), marginX, startY);

    autoTable(doc, {
      startY: startY + 6,
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.2,
        font: "helvetica",
        halign: "center",
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        halign: "center",
        valign: "middle",
        fontSize: 8,
      },
      columnStyles: Object.fromEntries(
        widths.map((w, i) => [
          i,
          {
            cellWidth: w,
            halign: i === 0 || i === 1 ? "left" : "center",
          },
        ]),
      ),
      head: [pdfRow(head)],
      body: body.map((cells) => pdfRow(cells)),
      didParseCell(data) {
        const idx = data.column.index;
        data.cell.styles.halign = idx <= 1 ? "left" : "center";
        if (data.section === "body" && toneByCol[idx]) {
          data.cell.styles.fillColor = toneByCol[idx];
          data.cell.styles.textColor = [15, 23, 42];
        }
      },
    });
    return doc.lastAutoTable?.finalY || startY;
  };

  // Cuadro 1 — Giras
  const girasRest = usable - ensW - sedeW;
  const girasMetricW = girasRest / 5;
  const yAfterGiras = drawResumenBlock({
    startY: 58,
    title: "Giras",
    head: [
      "Ensamble",
      "Sede",
      "Fuera",
      "Mixtas",
      "En casa",
      "Total giras",
      "Prog. ens.",
    ],
    body: rows.map((r) => [
      r.ensamble,
      r.sede,
      r.girasFuera,
      r.girasMixtas || 0,
      r.girasCasa,
      r.girasTotal,
      r.programasEnsamble,
    ]),
    toneByCol: {
      2: [255, 247, 237],
      3: [255, 251, 235],
      4: [240, 249, 255],
      5: [226, 232, 240],
      6: [236, 253, 245],
    },
    widths: [
      ensW,
      sedeW,
      girasMetricW,
      girasMetricW,
      girasMetricW,
      girasMetricW,
      girasMetricW,
    ],
  });

  // Cuadro 2 — Prestaciones (nombres de ensamble repetidos)
  const prestRest = usable - ensW - sedeW;
  // Ens. netos + Conc. ens. más anchos (etiquetas compuestas)
  const prestNetosW = Math.max(90, prestRest * 0.2);
  const prestConcW = Math.max(78, prestRest * 0.18);
  const prestFerW = Math.max(42, prestRest * 0.09);
  const prestOtherW = (prestRest - prestNetosW - prestConcW - prestFerW) / 3;
  drawResumenBlock({
    startY: yAfterGiras + 16,
    title: "Prestaciones",
    head: [
      "Ensamble",
      "Sede",
      "Prest. por gira",
      "PCV",
      "Ens. netos",
      "Conc. ens.",
      "Feriados",
      "Prest. tot.",
    ],
    body: rows.map((r) => [
      r.ensamble,
      r.sede,
      r.servGirasEst,
      r.pcv,
      r.ensNetosLabel || String(r.prestNetas),
      r.conciertosEnsambleLabel || String(r.conciertosEnsamble),
      r.feriados,
      r.serviciosTotales,
    ]),
    toneByCol: {
      2: [224, 231, 255],
      3: [240, 253, 250],
      4: [236, 253, 245],
      5: [209, 250, 229],
      6: [252, 231, 243],
      7: [248, 250, 252],
    },
    widths: [
      ensW,
      sedeW,
      prestOtherW,
      prestOtherW,
      prestNetosW,
      prestConcW,
      prestFerW,
      prestOtherW,
    ],
  });
}

async function writePdf() {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  // 1) Resumen  2) Cuadro proyección (panel superior)  3+) detalle por ensamble
  writePdfResumenPage(doc);
  doc.addPage("a4", "landscape");
  writePdfMatrixPage(doc);

  for (const r of rows) {
    doc.addPage("a4", "landscape");
    pdfWriteEnsamblePage(doc, r);
  }

  return doc.output("blob");
}


  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const base = opts.fileBase || `informe_ensambles_${anio}_${stamp}`;
  const results = {};
  if (format === "xlsx" || format === "both" || format === "excel") {
    const buf = await writeExcel();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `${base}.xlsx`);
    results.xlsx = blob;
  }
  if (format === "pdf" || format === "both") {
    const blob = await writePdf();
    saveAs(blob, `${base}.pdf`);
    results.pdf = blob;
  }
  return results;
}
