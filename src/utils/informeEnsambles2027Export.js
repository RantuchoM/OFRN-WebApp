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
  sliceTime,
} from "./giraProyeccionPcv.js";

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

function isGiraFueraDeCasa(program, ensamble) {
  const home = Number(ensamble?.id_localidad);
  if (!Number.isFinite(home) || home <= 0) return false;
  const locs = (program?.giras_localidades || [])
    .map((r) => Number(r?.id_localidad ?? r?.localidades?.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (!locs.length) return false;
  return !locs.includes(home);
}

function gcdInt(a, b) {
  let x = Math.abs(Number(a) || 0);
  let y = Math.abs(Number(b) || 0);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function formatTramoShareLabel(parte, total) {
  const p = Number(parte) || 0;
  const n = Number(total) || 0;
  if (p <= 0 || n <= 1 || p >= n) return "";
  const g = gcdInt(p, n);
  return `${p / g}/${n / g} fuera de casa`;
}

/** Pesos por tramo (paridad serviciosEnsambleReport.giraTramoPesos). */
function giraTramoPesos(program, ensamble) {
  const home = Number(ensamble?.id_localidad);
  const withLocs = [...(program?.tramos || [])]
    .sort((a, b) => Number(a?.indice) - Number(b?.indice))
    .map((seg) =>
      (seg.localidad_ids || [])
        .map(Number)
        .filter((id) => Number.isFinite(id) && id > 0),
    )
    .filter((ids) => ids.length > 0);

  const whole = (fuera) =>
    fuera
      ? { tramoCount: 1, tramosFuera: 1, pesoEnCasa: 0, pesoFuera: 1, fueraSegs: [] }
      : { tramoCount: 1, tramosFuera: 0, pesoEnCasa: 1, pesoFuera: 0, fueraSegs: [] };

  if (withLocs.length < 2 || !Number.isFinite(home) || home <= 0) {
    const fuera = isGiraFueraDeCasa(program, ensamble);
    return {
      ...whole(fuera),
      fueraSegs: fuera
        ? [
            {
              fecha_desde: program.fecha_desde,
              fecha_hasta: program.fecha_hasta,
              localidad_ids: (program.giras_localidades || [])
                .map((r) => Number(r.id_localidad))
                .filter(Boolean),
            },
          ]
        : [],
    };
  }

  const segs = [...(program?.tramos || [])].sort(
    (a, b) => Number(a?.indice) - Number(b?.indice),
  );
  const tramoCount = withLocs.length;
  const fueraSegs = [];
  let tramosFuera = 0;
  for (const seg of segs) {
    const ids = (seg.localidad_ids || []).map(Number).filter(Boolean);
    if (!ids.length) continue;
    if (!ids.includes(home)) {
      tramosFuera += 1;
      fueraSegs.push(seg);
    }
  }
  return {
    tramoCount,
    tramosFuera,
    pesoEnCasa: (tramoCount - tramosFuera) / tramoCount,
    pesoFuera: tramosFuera / tramoCount,
    fueraSegs,
  };
}

export async function exportInformeEnsambles2027(bundle, opts = {}) {
  const format = opts.format || "both";
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
  for (const e of ensamblesRaw) {
    if (e.id_localidad && e.localidad) {
      locNameById.set(Number(e.id_localidad), e.localidad);
    }
  }
  for (const g of girasRaw) {
    for (const l of g.localias || []) {
      if (l?.id && l?.localidad) locNameById.set(Number(l.id), l.localidad);
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

/** Concierto = 1; didáctico = 0,5. */
function conciertoServicioValue(evt) {
  return evt?.es_didactico ? 0.5 : 1;
}

function ensambleCicloStats(ensambleId) {
  let programas = 0;
  let conciertos = 0;
  for (const prog of cicloPrograms) {
    if (!prog.ensambleIds.includes(Number(ensambleId))) continue;
    programas += 1;
    for (const ev of prog.eventos || []) {
      conciertos += conciertoServicioValue(ev);
    }
  }
  return {
    programasEnsamble: programas,
    conciertosEnsamble: Math.round(conciertos * 100) / 100,
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

function listMondays(fromIso, toIso) {
  const out = [];
  let cur = fromIso;
  while (cur <= toIso) {
    out.push(cur);
    cur = addDays(cur, 7);
  }
  return out;
}

/** 1ª semana feb 2027 = lun 01/02; 3ª dic = lun 13/12 */
const WEEK_START = "2027-02-01";
const WEEK_END = "2027-12-13";
const mondays = listMondays(WEEK_START, WEEK_END);

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

const LOC_SHORT = {
  "San Carlos de Bariloche": "Bariloche",
  "San Antonio Oeste": "SAO",
};

function shortLocalidadName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  return LOC_SHORT[raw] || raw;
}

function localidadNameById(id) {
  const n = Number(id);
  const name = locNameById.get(n);
  if (name) return shortLocalidadName(name) || name;
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
    .map((r) => shortLocalidadName(r?.localidades?.localidad))
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
  let pcv = 0;
  const girasList = [];

  for (const program of programs) {
    const cls = classifyProgramaEnsambleConvocatoria(program, ens);
    if (cls.status !== "convocado") continue;
    const pesos = giraTramoPesos(program, ens);
    girasFuera += pesos.pesoFuera;
    girasCasa += pesos.pesoEnCasa;

    let pcvGira = 0;
    let pcvNota = "en casa — sin PCV";
    let pcvFranja = "";
    if (pesos.pesoFuera > 0) {
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
      if (pesos.tramoCount > 1 && pesos.tramosFuera < pesos.tramoCount) {
        const share = formatTramoShareLabel(pesos.tramosFuera, pesos.tramoCount);
        pcvNota = `${share || "mixto"} — ${pcvNota}`;
      }
      pcv += pcvGira;
    }

    let casaFuera = "En casa";
    if (pesos.pesoFuera >= 1) casaFuera = "Fuera";
    else if (pesos.pesoFuera > 0) {
      casaFuera = `Mixto ${formatTramoShareLabel(pesos.tramosFuera, pesos.tramoCount) || ""}`.trim();
    }

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
      pesoFuera: Math.round(pesos.pesoFuera * 100) / 100,
      pesoEnCasa: Math.round(pesos.pesoEnCasa * 100) / 100,
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

  for (const monday of mondays) {
    for (const slot of tpl) {
      const day = dateForDow(monday, slot.isoDow);
      if (day < "2027-02-01" || day > "2027-12-19") continue;
      ensayosTotal += 1;
      ensayosServiciosBrutos += slot.value;

      const conflicting = programs.filter(
        (p) =>
          overlapsGira(p, day) &&
          classifyProgramaEnsambleConvocatoria(p, ens).status === "convocado",
      );
      if (conflicting.length) {
        ensayosConflicto += 1;
        ensayosServiciosConflicto += slot.value;
        const rowC = {
          ensamble: ens.ensamble,
          fecha: day,
          hora: `${slot.hora_inicio}-${slot.hora_fin}`,
          servicio: slot.value,
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
  const girasFueraR = Math.round(girasFuera * 100) / 100;
  const girasCasaR = Math.round(girasCasa * 100) / 100;
  const girasTotalR = Math.round((girasFueraR + girasCasaR) * 100) / 100;
  /** Estimado fijo de servicios de gira (conciertos/ensayos de gira). */
  const SERVICIOS_POR_GIRA = 7;
  const servGirasEst =
    Math.round(girasTotalR * SERVICIOS_POR_GIRA * 100) / 100;
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
    girasTotal: girasTotalR,
    programasEnsamble: cicloStats.programasEnsamble,
    conciertosEnsamble: cicloStats.conciertosEnsamble,
    servGirasEst,
    pcv: pcvRound,
    prestNetas,
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

function matrixMark(pesoFuera, pesoEnCasa) {
  const f = Number(pesoFuera) || 0;
  const c = Number(pesoEnCasa) || 0;
  if (f <= 0) return "L";
  if (c <= 0) return "A";
  return "L/A";
}

function matrixSumLabel(casa, fuera) {
  const n = Number(casa) || 0;
  const m = Number(fuera) || 0;
  const t = Math.round((n + m) * 100) / 100;
  return `${fmtQty(n)}L + ${fmtQty(m)}A = ${fmtQty(t)}`;
}

/** Matriz doble entrada: filas = giras, columnas = ensambles, celda L/A. */
const ensambleCols = rows.map((r) => r.ensamble);
const markByKey = new Map();
for (const r of rows) {
  for (const g of r.girasList || []) {
    markByKey.set(
      `${r.ensamble}|${g.giraId}`,
      matrixMark(g.pesoFuera, g.pesoEnCasa),
    );
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
  matrixSumLabel(r.girasCasa, r.girasFuera),
);

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
  matrixLA: "FEF3C7", // amber-100
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
  } else if (mark === "L/A") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.matrixLA } };
  }
}

/** Escribe la matriz L/A al inicio de la hoja Resumen; devuelve la siguiente fila libre. */
function writeExcelMatrix(ws) {
  const title = ws.getCell(1, 1);
  title.value =
    "Matriz giras × ensambles (L = local / en casa, A = afuera) — solo giras Sinfónico/CF; sin programas de ensamble";
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
  wb.creator = "OFRN informe ensambles 2027";

  const resumen = wb.addWorksheet("Resumen");
  const metricsStart = writeExcelMatrix(resumen);

  // Dos secciones: Giras (… Prog. ensamble) | Prestaciones (Giras x7 … Conc. ensamble … Prest. tot.)
  const colDefs = [
    { key: "ensamble", label: "Ensamble", group: "Giras", fill: FILL.identity, w: 11, align: "center" },
    { key: "familia", label: "Familia", group: "Giras", fill: FILL.identity, w: 11, align: "center" },
    { key: "sede", label: "Sede", group: "Giras", fill: FILL.identity, w: 14, align: "center" },
    { key: "girasFuera", label: "Fuera", group: "Giras", fill: FILL.fuera, w: 9, align: "center" },
    { key: "girasCasa", label: "En casa", group: "Giras", fill: FILL.casa, w: 9, align: "center" },
    { key: "girasTotal", label: "Total Giras", group: "Giras", fill: FILL.girasTot, w: 10, align: "center" },
    { key: "programasEnsamble", label: "Prog. ensamble", group: "Giras", fill: "FFECFDF5", w: 11, align: "center" },
    { key: "servGirasEst", label: "Giras x7", group: "Prestaciones", fill: FILL.servGiras, w: 10, align: "center" },
    { key: "pcv", label: "PCV", group: "Prestaciones", fill: FILL.pcv, w: 9, align: "center" },
    { key: "prestNetas", label: "Ens. netos", group: "Prestaciones", fill: FILL.prestNetas, w: 10, align: "center" },
    { key: "conciertosEnsamble", label: "Conc. ensamble", group: "Prestaciones", fill: "FFD1FAE5", w: 11, align: "center" },
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
    ws.getCell(line, 1).value = "Giras fuera / en casa / total";
    ws.getCell(line, 2).value = `${r.girasFuera} / ${r.girasCasa} / ${r.girasTotal}`;
    line += 1;
    ws.getCell(line, 1).value = "Programas de ensamble";
    ws.getCell(line, 2).value = r.programasEnsamble;
    line += 1;
    ws.getCell(line, 1).value = "Conciertos de ensamble (1 / 0,5 didácticos)";
    ws.getCell(line, 2).value = r.conciertosEnsamble;
    line += 1;
    ws.getCell(line, 1).value = "Giras x7";
    ws.getCell(line, 2).value = r.servGirasEst;
    line += 1;
    ws.getCell(line, 1).value = "PCV";
    ws.getCell(line, 2).value = r.pcv;
    line += 1;
    ws.getCell(line, 1).value = "Ens. netos (ensayos)";
    ws.getCell(line, 2).value = r.prestNetas;
    line += 1;
    ws.getCell(line, 1).value =
      "Feriados (feriado / no laborable / domingo en gira)";
    ws.getCell(line, 2).value = r.feriados;
    line += 1;
    ws.getCell(line, 1).value =
      "Prest. tot. (Giras x7 + PCV + Ens. netos + Conc. ens. + Feriados)";
    ws.getCell(line, 2).value = r.serviciosTotales;
    line += 2;

    ws.getCell(line, 1).value = "Cálculo de ensayos";
    ws.getCell(line, 1).font = { bold: true };
    line += 1;
    ws.getCell(line, 1).value = "Modelo";
    ws.getCell(line, 2).value =
      "Plantilla semanal editable (ensamble_proyeccion_ensayos), repetida lun 01/02/2027 … lun 13/12/2027";
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

    ws.getCell(line, 1).value = "Giras en casa";
    ws.getCell(line, 1).font = { bold: true };
    paintHeader(ws.getCell(line, 1), FILL.casa);
    line += 1;
    const enCasa = (r.girasList || []).filter((g) => Number(g.pesoFuera) === 0);
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
    const fueraList = (r.girasList || []).filter((g) => Number(g.pesoFuera) > 0);
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
      Number(g.pesoFuera) >= 1
        ? FILL.fuera
        : Number(g.pesoFuera) > 0
          ? "FFFFFBEB" // amber-50 mixto
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
    "Informe planificación ensambles 2027 (incluye giras Borrador seed).",
    "Primera hoja: matriz giras × ensambles — L = local (en casa), A = afuera, L/A = mixto por tramos. Pie: nL + mA = total.",
    "Colores alineados a Prestaciones: Fuera=naranja, En casa=celeste, PCV=teal, Ens. netos=esmeralda, Detalle ensayos=esmeralda.",
    "x7 = Total giras × 7 (estimado fijo por gira; respeta pesos de tramo). Separado del bloque Giras.",
    "Dos secciones: Giras (incl. Prog. ensamble) | Prestaciones (Giras x7, PCV, Ens. netos, Conc. ensamble, Feriados, Prest. tot.).",
    "Feriados: 1 servicio por feriado / no laborable / domingo SOLO si ese día hay ensayo o concierto (tipos 1/2/3/13). No cuenta día de traslado ni otros eventos de logística. Domingos por criterio (no en tabla). Puentes turísticos 2027 aún no decretados; 2026 ya en BD.",
    "Prest. tot. = Giras x7 + PCV + Ens. netos + Conc. ensamble + Feriados.",
    "Prog./Conc. ensamble = Ciclos de Cámara I–III. Concierto=1; didáctico=0,5. No entran en la matriz L/A.",
    "Ens. netos = servicios de ensayos proyectados netos de conflicto pleno pendiente.",
    "Tramos de localía: con 2+ segmentos con sede, casa/fuera y PCV se pesan 1/n por tramo (igual que el informe de ensamble en la app). Sin tramos: la unión de giras_localidades es todo o nada.",
    "PCV franja: «martes 20/10, 22 hs a domingo 25/10, 10 hs. 4,5 días» (salida → llegada vuelta).",
    "PCV: ventana ida+vuelta (matriz + salidas); con tramos solo los tramos fuera. El Bolsón ↔ Bariloche ~2h30.",
    "Tramos seed: Cipolletti→Villa Regina último día (207, 213); El Bolsón→Ñorquinco último día (214 Falú).",
    "Cada gira se lista con localía entre paréntesis.",
    "Ensayos: plantilla editable ensamble_proyeccion_ensayos × 46 semanas (01/02/2027–13/12/2027).",
    "Hojas Det <ensamble>: cálculo de ensayos, giras en casa, franjas PCV, feriados en gira y conflictos.",
  ];
  lines.forEach((l, i) => {
    notas.getCell(i + 1, 1).value = l;
  });

  return await wb.xlsx.writeBuffer();
}

function pdfWriteEnsamblePage(doc, r) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfText(r.ensamble), 36, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    pdfText(`${r.sede || "sin sede"}${r.familia ? ` - ${r.familia}` : ""}`),
    36,
    50,
  );

  autoTable(doc, {
    startY: 60,
    margin: { left: 36, right: 36 },
    styles: { fontSize: 8, cellPadding: 2.5, font: "helvetica" },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    head: [pdfRow(["Concepto", "Valor"])],
    body: [
      pdfRow([
        "Giras fuera / en casa / total",
        `${r.girasFuera} / ${r.girasCasa} / ${r.girasTotal}`,
      ]),
      pdfRow(["Programas de ensamble", String(r.programasEnsamble)]),
      pdfRow(["Giras x7", String(r.servGirasEst)]),
      pdfRow(["PCV", String(r.pcv)]),
      pdfRow(["Ens. netos (ensayos)", String(r.prestNetas)]),
      pdfRow([
        "Conc. ensamble (1 / 0,5 didacticos)",
        String(r.conciertosEnsamble),
      ]),
      pdfRow([
        "Feriados (feriado / no laborable / domingo en gira)",
        String(r.feriados),
      ]),
      pdfRow([
        "Prest. tot. (Giras x7 + PCV + Ens. netos + Conc. ens. + Feriados)",
        String(r.serviciosTotales),
      ]),
    ],
    columnStyles: { 0: { cellWidth: 170 }, 1: { cellWidth: "auto" } },
  });

  let y = (doc.lastAutoTable?.finalY || 120) + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfText("Feriados / no laborables / domingos en gira"), 36, y);
  y += 4;
  const ferList = r.feriadosHits || [];
  autoTable(doc, {
    startY: y,
    margin: { left: 36, right: 36 },
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfText("Giras en casa"), 36, y);
  y += 4;
  const enCasa = (r.girasList || []).filter((g) => Number(g.pesoFuera) === 0);
  autoTable(doc, {
    startY: y,
    margin: { left: 36, right: 36 },
    styles: { fontSize: 7, cellPadding: 2, font: "helvetica" },
    headStyles: { fillColor: [186, 230, 253], textColor: [15, 23, 42] },
    head: [pdfRow(["Gira", "Fechas", "Via"])],
    body: enCasa.length
      ? enCasa.map((g) =>
          pdfRow([g.nombre, `${g.desde} > ${g.hasta}`, g.via || ""]),
        )
      : [pdfRow(["(ninguna)", "", ""])],
    columnStyles: { 0: { cellWidth: 280 }, 1: { cellWidth: 130 }, 2: { cellWidth: 70 } },
  });

  y = (doc.lastAutoTable?.finalY || y) + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(pdfText("Giras fuera / mixtas + PCV"), 36, y);
  y += 4;
  const fueraList = (r.girasList || []).filter((g) => Number(g.pesoFuera) > 0);
  autoTable(doc, {
    startY: y,
    margin: { left: 36, right: 36 },
    styles: { fontSize: 6.5, cellPadding: 1.8, overflow: "linebreak", font: "helvetica" },
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
  if (y > 500) {
    doc.addPage("a4", "landscape");
    y = 36;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(pdfText("Ensayos en conflicto (muestra)"), 36, y);
  y += 4;
  const confl = (r.conflictosEns || []).slice(0, 18);
  autoTable(doc, {
    startY: y,
    margin: { left: 36, right: 36 },
    styles: { fontSize: 6.5, cellPadding: 1.6, overflow: "linebreak", font: "helvetica" },
    headStyles: { fillColor: [254, 202, 202], textColor: [127, 29, 29] },
    head: [pdfRow(["Fecha", "Horario", "Serv.", "Gira(s)"])],
    body: confl.length
      ? confl.map((c) =>
          pdfRow([c.fecha, c.hora, String(c.servicio), c.giras]),
        )
      : [pdfRow(["(ninguno)", "", "", ""])],
    columnStyles: {
      0: { cellWidth: 68 },
      1: { cellWidth: 68 },
      2: { cellWidth: 36 },
      3: { cellWidth: 310 },
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
      36,
      footY,
    );
  }
}

function writePdfMatrixPage(doc) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(
    pdfText(
      "Matriz giras x ensambles (L/A) - solo giras Sinfonico/CF (sin programas de ensamble)",
    ),
    28,
    28,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    pdfText(
      "Filas: fecha desde - hasta. Zona. Localia/es. Pie: nL + mA = total por ensamble.",
    ),
    28,
    40,
  );

  const head = [
    pdfRow(["Gira (fechas. zona. localia)", ...ensambleCols]),
  ];
  const body = [
    ...matrixRows.map((mr) => pdfRow([mr.label, ...mr.cells])),
    pdfRow(["Suma (nL + mA = total)", ...matrixTotals]),
  ];
  const totalRowIndex = body.length - 1;

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 24;
  const usable = pageW - margin * 2;
  const labelW = 200;
  const ensW = Math.max(28, (usable - labelW) / Math.max(ensambleCols.length, 1));

  autoTable(doc, {
    startY: 48,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 5.5,
      cellPadding: 1.2,
      font: "helvetica",
      overflow: "linebreak",
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontSize: 6,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: labelW, halign: "left", fontSize: 5 },
      ...Object.fromEntries(
        ensambleCols.map((_, i) => [i + 1, { cellWidth: ensW, halign: "center" }]),
      ),
    },
    head,
    body,
    didParseCell(data) {
      if (data.section === "body" && data.column.index > 0) {
        const raw = String(data.cell.raw ?? data.cell.text?.[0] ?? "");
        if (raw === "L") {
          data.cell.styles.fillColor = [219, 234, 254];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 8;
        } else if (raw === "A") {
          data.cell.styles.fillColor = [255, 237, 213];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 8;
        } else if (raw === "L/A") {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 6.5;
        }
      }
      if (data.section === "body" && data.row.index === totalRowIndex) {
        data.cell.styles.fillColor = [226, 232, 240];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 5;
      }
    },
  });
}

function writePdfResumenPage(doc) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(
    pdfText("Informe ensambles 2027 - giras / PCV / Ens. netos"),
    40,
    32,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    pdfText(
      "Dos bloques: Giras | Prestaciones (… Feriados … Prest. tot.). Feriados=feriado/no laborable/domingo en gira. Conc.=1 (0,5 didactico). Matriz L/A pag. 2.",
    ),
    40,
    46,
  );

  // Giras … Prog.ens. | Prestaciones: Giras x7, PCV, Ens. netos, Conc.ens., Feriados, Prest. tot.
  const SEP = "";
  const pdfHead = pdfRow([
    "Ens.",
    "Sede",
    "Fuera",
    "Casa",
    "Total Giras",
    "Prog. ens.",
    SEP,
    "Giras x7",
    "PCV",
    "Ens. netos",
    "Conc. ens.",
    "Feriados",
    "Prest. tot.",
  ]);
  const pdfBody = rows.map((r) =>
    pdfRow([
      r.ensamble,
      r.sede,
      r.girasFuera,
      r.girasCasa,
      r.girasTotal,
      r.programasEnsamble,
      SEP,
      r.servGirasEst,
      r.pcv,
      r.prestNetas,
      r.conciertosEnsamble,
      r.feriados,
      r.serviciosTotales,
    ]),
  );
  const sepCols = new Set([6]);
  const toneByCol = {
    2: [255, 247, 237],
    3: [240, 249, 255],
    4: [226, 232, 240],
    5: [236, 253, 245],
    7: [224, 231, 255],
    8: [240, 253, 250],
    9: [236, 253, 245],
    10: [209, 250, 229],
    11: [252, 231, 243],
    12: [248, 250, 252],
  };
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 24;
  const usable = pageW - marginX * 2;
  const sepW = 5;
  const dataCols = 12;
  const dataW = (usable - sepW) / dataCols;

  autoTable(doc, {
    startY: 56,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.4,
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
      fontSize: 6.5,
    },
    columnStyles: Object.fromEntries(
      pdfHead.map((_, i) => [
        i,
        sepCols.has(i)
          ? { cellWidth: sepW, fillColor: [51, 65, 85] }
          : { cellWidth: dataW, halign: "center" },
      ]),
    ),
    head: [pdfHead],
    body: pdfBody,
    didParseCell(data) {
      const idx = data.column.index;
      if (sepCols.has(idx)) {
        data.cell.styles.fillColor = [51, 65, 85];
        data.cell.styles.textColor = [51, 65, 85];
        data.cell.text = [""];
        return;
      }
      data.cell.styles.halign = "center";
      if (data.section === "body" && toneByCol[idx]) {
        data.cell.styles.fillColor = toneByCol[idx];
        data.cell.styles.textColor = [15, 23, 42];
      }
    },
  });
}

async function writePdf() {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  // 1) Resumen  2) Matriz L/A (solo giras sinf/CF)  3+) detalle por ensamble
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
  const base = opts.fileBase || `informe_ensambles_2027_${stamp}`;
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
