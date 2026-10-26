import {
  estimatePcvFromFueraSegs,
  formatPcvFranja,
  groupFueraTrips,
  lookupDemoraLocalidad,
  sliceTime,
} from "../../utils/giraProyeccionPcv";
import {
  aggregateCicloStats,
  ciclosForEnsamble,
} from "../../utils/ensambleCicloConciertos";
import {
  classifyProgramaEnsambleConvocatoria,
  formatTramoShareLabel,
  giraTramoPesos,
} from "../../utils/serviciosEnsambleReport";

/** Tipos con servicio musical (informe feriados). */
export const TIPO_SERVICIO_FERIADO = new Set([1, 2, 3, 13]);

/**
 * Días no hábiles (feriado / no laborable / domingo) con ensayo o concierto
 * en la gira. 1 por día. Ordenados por fecha.
 * @returns {{ fecha: string, esDomingo: boolean, esFeriado: boolean, detalle: string|null }[]}
 */
export function listFeriadosCrossingForGira(eventos, feriadosByFecha) {
  const serviceDays = new Set();
  for (const ev of eventos || []) {
    if (!TIPO_SERVICIO_FERIADO.has(Number(ev.id_tipo_evento))) continue;
    const day = String(ev.fecha || "").slice(0, 10);
    if (day) serviceDays.add(day);
  }
  const days = [];
  for (const day of [...serviceDays].sort()) {
    const fer = feriadosByFecha?.get?.(day);
    const esDomingo = new Date(`${day}T12:00:00`).getDay() === 0;
    if (!fer && !esDomingo) continue;
    days.push({
      fecha: day,
      esDomingo,
      esFeriado: Boolean(fer),
      detalle: fer?.detalle ? String(fer.detalle).trim() || null : null,
    });
  }
  return days;
}

/** Cantidad de días no hábiles con servicio (paridad informe). */
export function countFeriadosForGira(eventos, feriadosByFecha) {
  return listFeriadosCrossingForGira(eventos, feriadosByFecha).length;
}

/** Destino primario: primera localidad distinta del home (o la primera). */
export function primaryDestFromLocalias(girasLocalidades, homeLocId) {
  const ids = (girasLocalidades || [])
    .map((r) => Number(r?.id_localidad ?? r?.localidades?.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (!ids.length) return null;
  const home = Number(homeLocId);
  const away = ids.find((id) => id !== home);
  return away ?? ids[0];
}

export function fmtPcvCell(n) {
  const v = Math.round(Number(n) * 100) / 100;
  if (!Number.isFinite(v)) return "";
  return String(v).replace(".", ",");
}

/**
 * Celda gira × ensamble: vacío si no convocado; "L" si local; si no, días PCV.
 * @returns {{ kind: 'empty'|'L'|'pcv', label: string, dias?: number }}
 */
export function proyeccionCellForEnsamble(program, ensamble, demorasMap, locNameById) {
  const cls = classifyProgramaEnsambleConvocatoria(program, ensamble);
  if (cls.status !== "convocado") {
    return { kind: "empty", label: "" };
  }
  const pesos = giraTramoPesos(program, ensamble);
  if ((Number(pesos.pesoFuera) || 0) <= 0) {
    return { kind: "L", label: "L" };
  }

  const home = Number(ensamble?.id_localidad ?? ensamble?.localidades?.id);
  const hin = sliceTime(program?.hora_inicio_proyeccion) || "15:00";
  const hfin = sliceTime(program?.hora_fin_proyeccion) || "23:00";
  const segs = pesos.fueraSegs?.length
    ? pesos.fueraSegs
    : [
        {
          fecha_desde: program.fecha_desde,
          fecha_hasta: program.fecha_hasta || program.fecha_desde,
          localidad_ids: (program.giras_localidades || [])
            .map((r) => Number(r?.id_localidad ?? r?.localidades?.id))
            .filter(Boolean),
        },
      ];

  const { dias } = estimatePcvFromFueraSegs({
    homeLocId: home,
    fueraSegs: segs,
    fechaDesdeFallback: program.fecha_desde,
    fechaHastaFallback: program.fecha_hasta || program.fecha_desde,
    horaInicioProy: hin,
    horaFinProy: hfin,
    demorasMap,
    locNameById,
    pickDest: (seg) =>
      (seg?.localidad_ids || []).find((id) => Number(id) !== home) ||
      primaryDestFromLocalias(program.giras_localidades, home),
  });
  return { kind: "pcv", label: fmtPcvCell(dias), dias };
}

/**
 * CF de camerata (CF*) preferida para agrupar columnas; Jazz Band queda al final.
 */
export function primaryCfForEnsamble(ensamble, cfById) {
  const ids = ensamble?.id_ensamble_cf_ids || [];
  const cfOnly = ids.filter((id) =>
    String(cfById.get(Number(id))?.ensamble || "")
      .trim()
      .toUpperCase()
      .startsWith("CF"),
  );
  const pick = cfOnly[0] ?? ids[0] ?? null;
  return pick != null ? Number(pick) : null;
}

/**
 * @returns {{ cfId: number|null, cfLabel: string, ensambles: object[] }[]}
 */
export function groupEnsamblesByCf(ensambles, cfById) {
  const buckets = new Map();
  for (const ens of ensambles || []) {
    const cfId = primaryCfForEnsamble(ens, cfById);
    const key = cfId != null ? String(cfId) : "_";
    if (!buckets.has(key)) {
      const label =
        cfId != null
          ? cfById.get(cfId)?.ensamble || `CF ${cfId}`
          : "Sin CF";
      buckets.set(key, { cfId, cfLabel: label, ensambles: [] });
    }
    buckets.get(key).ensambles.push(ens);
  }
  for (const g of buckets.values()) {
    g.ensambles.sort((a, b) =>
      String(a.ensamble || "").localeCompare(String(b.ensamble || ""), "es"),
    );
  }
  return [...buckets.values()].sort((a, b) =>
    String(a.cfLabel || "").localeCompare(String(b.cfLabel || ""), "es"),
  );
}

function nameOfLoc(locNameById, id) {
  return locNameById?.get?.(Number(id)) || `loc ${id}`;
}

function pickFueraDest(seg, program, home) {
  return (
    (seg?.localidad_ids || []).find((id) => Number(id) !== home) ||
    primaryDestFromLocalias(program?.giras_localidades, home)
  );
}

/**
 * Pares localidad↔localidad usados por PCV en la temporada sin demora cargada.
 * También localidades de la temporada que no aparecen en ningún tramo de demoras.
 */
export function findMissingDemorasTemporada({
  programas,
  ensambles,
  demorasMap,
  demorasRows,
  locNameById,
}) {
  const missingPairs = new Map();
  const seasonLocIds = new Set();

  const markPair = (a, b) => {
    const o = Number(a);
    const d = Number(b);
    if (!Number.isFinite(o) || !Number.isFinite(d) || o <= 0 || d <= 0 || o === d)
      return;
    if (lookupDemoraLocalidad(demorasMap, o, d)) return;
    const key = o < d ? `${o}|${d}` : `${d}|${o}`;
    if (missingPairs.has(key)) return;
    missingPairs.set(key, {
      id_localidad_origen: o,
      id_localidad_destino: d,
      origen_nombre: nameOfLoc(locNameById, o),
      destino_nombre: nameOfLoc(locNameById, d),
    });
  };

  for (const program of programas || []) {
    for (const gl of program.giras_localidades || []) {
      const id = Number(gl?.id_localidad ?? gl?.localidades?.id);
      if (id) seasonLocIds.add(id);
    }
    for (const seg of program.giras_tramo_segmentos || []) {
      for (const tl of seg.giras_tramo_localidades || []) {
        const id = Number(tl?.id_localidad ?? tl?.localidades?.id);
        if (id) seasonLocIds.add(id);
      }
    }

    for (const ensamble of ensambles || []) {
      const cls = classifyProgramaEnsambleConvocatoria(program, ensamble);
      if (cls.status !== "convocado") continue;
      const home = Number(
        ensamble?.id_localidad ?? ensamble?.localidades?.id,
      );
      if (!home) continue;
      seasonLocIds.add(home);
      const pesos = giraTramoPesos(program, ensamble);
      if ((Number(pesos.pesoFuera) || 0) <= 0) continue;
      const segs = pesos.fueraSegs?.length
        ? pesos.fueraSegs
        : [
            {
              fecha_desde: program.fecha_desde,
              fecha_hasta: program.fecha_hasta || program.fecha_desde,
              localidad_ids: (program.giras_localidades || [])
                .map((r) => Number(r?.id_localidad ?? r?.localidades?.id))
                .filter(Boolean),
            },
          ];
      for (const trip of groupFueraTrips(segs)) {
        const first = trip[0];
        const last = trip[trip.length - 1];
        const destOut = Number(pickFueraDest(first, program, home));
        const destBack =
          Number(pickFueraDest(last, program, home)) || destOut;
        if (destOut) {
          seasonLocIds.add(destOut);
          markPair(home, destOut);
        }
        if (destBack) {
          seasonLocIds.add(destBack);
          markPair(destBack, home);
        }
      }
    }
  }

  const demoraLocIds = new Set();
  for (const r of demorasRows || []) {
    const o = Number(r.id_localidad_origen);
    const d = Number(r.id_localidad_destino);
    if (o) demoraLocIds.add(o);
    if (d) demoraLocIds.add(d);
  }

  const locsSinConexion = [...seasonLocIds]
    .filter((id) => !demoraLocIds.has(id))
    .map((id) => ({
      id,
      localidad: nameOfLoc(locNameById, id),
    }))
    .sort((a, b) =>
      String(a.localidad).localeCompare(String(b.localidad), "es"),
    );

  return {
    missingPairs: [...missingPairs.values()].sort((a, b) =>
      `${a.origen_nombre}|${a.destino_nombre}`.localeCompare(
        `${b.origen_nombre}|${b.destino_nombre}`,
        "es",
      ),
    ),
    locsSinConexion,
  };
}

/**
 * Detalle por ensamble (paridad hojas individuales del informe / PDF proyección).
 */
export function buildEnsambleProyeccionDetalle({
  ensamble,
  programas,
  eventosByGira,
  demorasMap,
  locNameById,
  feriadosByFecha,
  ciclos = [],
}) {
  if (!ensamble) return null;
  const home = Number(ensamble?.id_localidad ?? ensamble?.localidades?.id);
  const sede =
    ensamble?.localidades?.localidad ||
    nameOfLoc(locNameById, home) ||
    "sin sede";

  let girasFuera = 0;
  let girasCasa = 0;
  let pcv = 0;
  const girasList = [];
  const feriadosHits = [];
  const feriadosSeen = new Set();

  for (const program of programas || []) {
    const cls = classifyProgramaEnsambleConvocatoria(program, ensamble);
    if (cls.status !== "convocado") continue;
    const pesos = giraTramoPesos(program, ensamble);
    girasFuera += pesos.pesoFuera;
    girasCasa += pesos.pesoEnCasa;

    let pcvGira = 0;
    let pcvNota = "en casa — sin PCV";
    let pcvFranja = "";
    if ((Number(pesos.pesoFuera) || 0) > 0) {
      const segs = pesos.fueraSegs?.length
        ? pesos.fueraSegs
        : [
            {
              fecha_desde: program.fecha_desde,
              fecha_hasta: program.fecha_hasta || program.fecha_desde,
              localidad_ids: (program.giras_localidades || [])
                .map((r) => Number(r?.id_localidad ?? r?.localidades?.id))
                .filter(Boolean),
            },
          ];
      const trip = estimatePcvFromFueraSegs({
        homeLocId: home,
        fueraSegs: segs,
        fechaDesdeFallback: program.fecha_desde,
        fechaHastaFallback: program.fecha_hasta || program.fecha_desde,
        horaInicioProy:
          sliceTime(program?.hora_inicio_proyeccion) || "15:00",
        horaFinProy: sliceTime(program?.hora_fin_proyeccion) || "23:00",
        demorasMap,
        locNameById,
        pickDest: (seg) => pickFueraDest(seg, program, home),
      });
      pcvGira = Number(trip.dias) || 0;
      pcvNota = trip.nota || pcvNota;
      pcvFranja = (trip.windows || [])
        .map((w) => formatPcvFranja(w))
        .filter(Boolean)
        .join(" · ");
      if (pesos.tramoCount > 1 && pesos.tramosFuera < pesos.tramoCount) {
        const share = formatTramoShareLabel(
          pesos.tramosFuera,
          pesos.tramoCount,
        );
        pcvNota = `${share || "mixto"} — ${pcvNota}`;
      }
      pcv += pcvGira;
    }

    let casaFuera = "En casa";
    if (pesos.pesoFuera >= 1) casaFuera = "Fuera";
    else if (pesos.pesoFuera > 0) {
      casaFuera =
        `Mixto ${formatTramoShareLabel(pesos.tramosFuera, pesos.tramoCount) || ""}`.trim();
    }

    const locs = (program.giras_localidades || [])
      .map((g) => g.localidades?.localidad)
      .filter(Boolean)
      .join(" · ");

    girasList.push({
      giraId: program.id,
      nombre: program.nombre_gira || `Gira ${program.id}`,
      localias: locs,
      tipo: program.tipo,
      desde: program.fecha_desde,
      hasta: program.fecha_hasta,
      casaFuera,
      pesoFuera: Math.round(pesos.pesoFuera * 100) / 100,
      via: cls.via,
      pcv: Math.round(pcvGira * 100) / 100,
      pcvNota,
      pcvFranja,
    });

    const evts = eventosByGira?.get?.(Number(program.id)) || [];
    for (const day of listFeriadosCrossingForGira(evts, feriadosByFecha)) {
      if (feriadosSeen.has(day.fecha)) continue;
      feriadosSeen.add(day.fecha);
      const fer = feriadosByFecha?.get?.(day.fecha);
      feriadosHits.push({
        fecha: day.fecha,
        detalle: day.detalle || fer?.detalle || (day.esDomingo ? "Domingo" : "Feriado"),
        tipo: fer
          ? fer.es_feriado
            ? "Feriado"
            : "No laborable"
          : day.esDomingo
            ? "Domingo"
            : "Feriado",
        gira: program.nombre_gira,
      });
    }
  }

  feriadosHits.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const girasFueraR = Math.round(girasFuera * 100) / 100;
  const girasCasaR = Math.round(girasCasa * 100) / 100;
  const pcvRound = Math.round(pcv * 100) / 100;

  const programasEnsambleList = ciclosForEnsamble(ciclos, ensamble.id);
  const cicloStats = aggregateCicloStats(programasEnsambleList);

  return {
    ensamble: ensamble.ensamble,
    sede,
    id_localidad: home,
    girasFuera: girasFueraR,
    girasCasa: girasCasaR,
    girasTotal: Math.round((girasFueraR + girasCasaR) * 100) / 100,
    pcv: pcvRound,
    feriados: feriadosHits.length,
    feriadosHits,
    girasList,
    enCasa: girasList.filter((g) => Number(g.pesoFuera) === 0),
    fuera: girasList.filter((g) => Number(g.pesoFuera) > 0),
    programasEnsambleList,
    programasEnsamble: cicloStats.programasEnsamble,
    conciertosEnsamble: cicloStats.conciertosEnsamble,
    conciertosEnsambleReg: cicloStats.conciertosEnsambleReg,
    conciertosEnsambleDid: cicloStats.conciertosEnsambleDid,
    conciertosEnsambleLabel: cicloStats.conciertosEnsambleLabel,
  };
}
