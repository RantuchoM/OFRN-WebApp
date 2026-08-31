import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { formatProgramNomenMes } from "../utils/giraUtils";
import { calcValorDiarioProporcional } from "../utils/viaticosValorDiarioProporcional";
import { scheduleFromParadaRange } from "../utils/viaticosParadasIntegrante";
import { listValorDiarioVigencias } from "./viaticosValorDiarioService";

const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

export const SEGUIMIENTO_TIPO_OPTIONS = [
  { value: null, label: "—" },
  { value: "viatico", label: "Viatico" },
  { value: "reintegro", label: "Reintegro" },
];

export const SEGUIMIENTO_COLOR_OPTIONS = [
  { value: null, label: "Sin marca" },
  { value: "amarillo", label: "Amarillo" },
  { value: "verde", label: "Verde" },
];

function unwrapEmbed(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function sliceTime(value) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const raw = String(dateStr).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!d || !m) return raw;
  return `${d}/${m}`;
}

function formatLegCell({ fecha, hora, vehiculo }) {
  const datePart = formatDateShort(fecha);
  const timePart = sliceTime(hora);
  if (!datePart && !timePart && !vehiculo) return "";
  const left =
    datePart && timePart
      ? `${datePart}|${timePart}`
      : datePart || timePart || "";
  const vehicle = String(vehiculo || "").trim();
  if (left && vehicle) return `${left} ${vehicle}`;
  return left || vehicle;
}

function formatPersonaCell({ apellido, nombre, tramoLabel, rolLabel }) {
  const name = `${apellido || ""}, ${nombre || ""}`.trim().replace(/^,\s*/, "");
  const parts = [name];
  if (tramoLabel) parts.push(tramoLabel);
  if (rolLabel) parts.push(rolLabel);
  return parts.filter(Boolean).join(" / ");
}

function resolveTramoLabel(row) {
  const etiqueta = String(row.etiqueta_tramo || "").trim();
  if (etiqueta) return etiqueta;
  if (row.id_evento_parada_inicio != null && row.id_evento_parada_fin != null) {
    const orden = row.tramo_orden != null ? Number(row.tramo_orden) : null;
    return Number.isFinite(orden) && orden > 0 ? `Tramo ${orden}` : "Tramo";
  }
  return "";
}

function resolveVehiculoLabel(row) {
  const patente = String(row.patente_oficial || "").trim();
  if (patente) return patente;
  const particular = String(row.patente_particular || "").trim();
  if (particular) return particular;
  const otros = String(row.transporte_otros || "").trim();
  if (otros) return otros;
  if (row.check_terrestre || row.check_aereo || row.check_patente_oficial) {
    return "A definir";
  }
  return "";
}

function resolveMonto(row, schedule, vigencias, factorTemporada) {
  if (row.anticipo_custom != null && row.anticipo_custom !== "") {
    const custom = parseFloat(row.anticipo_custom);
    if (Number.isFinite(custom)) return round2(custom);
  }
  if (row.backup_viatico != null && row.backup_viatico !== "") {
    const backup = parseFloat(row.backup_viatico);
    if (Number.isFinite(backup)) return round2(backup);
  }

  const rawPct =
    row.porcentaje === 0 || row.porcentaje ? row.porcentaje : 100;
  const fin = calcValorDiarioProporcional({
    fechaSalida: schedule.fecha_salida,
    horaSalida: schedule.hora_salida,
    fechaLlegada: schedule.fecha_llegada,
    horaLlegada: schedule.hora_llegada,
    vigencias,
    fallbackBase: 0,
    porcentaje: rawPct,
    factorTemporada: factorTemporada || 0,
  });
  if (fin.subtotal > 0) return round2(fin.subtotal);

  const dias = parseFloat(
    row.backup_dias_computables ?? row.dias_computables ?? 0,
  );
  if (Number.isFinite(dias) && dias > 0 && fin.valorDiarioCalc > 0) {
    return round2(dias * fin.valorDiarioCalc);
  }
  return 0;
}

function yearBounds(year) {
  const y = Number(year);
  return {
    desde: `${y}-01-01`,
    hasta: `${y}-12-31`,
  };
}

/**
 * Carga consolidada de viáticos individuales para Gestión → Seguimiento.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ year?: number }} [options]
 */
export async function fetchViaticosSeguimientoRows(supabase, options = {}) {
  const year = options.year ?? new Date().getFullYear();
  const { desde, hasta } = yearBounds(year);

  const [
    { data: detalleData, error: detalleError },
    vigencias,
    { data: configsData, error: configsError },
  ] = await Promise.all([
    supabase
      .from("giras_viaticos_detalle")
      .select(
        `
        id,
        id_gira,
        id_integrante,
        dias_computables,
        porcentaje,
        patente_oficial,
        patente_particular,
        transporte_otros,
        check_aereo,
        check_terrestre,
        check_patente_oficial,
        check_patente_particular,
        cargo,
        anticipo_custom,
        backup_viatico,
        backup_fecha_salida,
        backup_hora_salida,
        backup_fecha_llegada,
        backup_hora_llegada,
        backup_dias_computables,
        id_evento_parada_inicio,
        id_evento_parada_fin,
        tramo_orden,
        etiqueta_tramo,
        seguimiento_tipo,
        seguimiento_color,
        integrantes:id_integrante(id, nombre, apellido),
        programas:id_gira!inner(
          id, mes_letra, nomenclador, zona, nombre_gira, fecha_desde, fecha_hasta
        )
      `,
      )
      .gte("programas.fecha_desde", desde)
      .lte("programas.fecha_desde", hasta)
      .order("id", { ascending: true }),
    listValorDiarioVigencias(supabase),
    supabase.from("giras_viaticos_config").select("id_gira, factor_temporada"),
  ]);

  if (detalleError) throw detalleError;
  if (configsError) throw configsError;

  const factorByGira = new Map();
  (configsData || []).forEach((c) => {
    factorByGira.set(String(c.id_gira), parseFloat(c.factor_temporada || 0) || 0);
  });

  const inYear = detalleData || [];

  const giraIds = [
    ...new Set(inYear.map((r) => r.id_gira).filter((id) => id != null)),
  ];

  let rolesMap = new Map();
  if (giraIds.length > 0) {
    const { data: rolesData, error: rolesError } = await supabase
      .from("giras_integrantes")
      .select("id_gira, id_integrante, rol")
      .in("id_gira", giraIds);
    if (rolesError) throw rolesError;
    rolesMap = new Map(
      (rolesData || []).map((r) => [
        `${r.id_gira}:${r.id_integrante}`,
        r.rol || "",
      ]),
    );
  }

  const eventIds = [
    ...new Set(
      inYear
        .flatMap((r) => [r.id_evento_parada_inicio, r.id_evento_parada_fin])
        .filter((id) => id != null),
    ),
  ];
  let eventsById = new Map();
  if (eventIds.length > 0) {
    const { data: eventsData, error: eventsError } = await supabase
      .from("eventos")
      .select(
        `
        id, fecha, hora_inicio, descripcion, id_gira_transporte,
        locaciones:id_locacion(nombre, localidades:id_localidad(localidad))
      `,
      )
      .in("id", eventIds);
    if (eventsError) throw eventsError;
    eventsById = new Map((eventsData || []).map((e) => [String(e.id), e]));
  }

  const rows = inYear.map((row) => {
    const persona = unwrapEmbed(row.integrantes);
    const programa = unwrapEmbed(row.programas);
    const rolGira =
      rolesMap.get(`${row.id_gira}:${row.id_integrante}`) || "";
    const tramoLabel = resolveTramoLabel(row);

    let fechaSalida = row.backup_fecha_salida || null;
    let horaSalida = sliceTime(row.backup_hora_salida);
    let fechaLlegada = row.backup_fecha_llegada || null;
    let horaLlegada = sliceTime(row.backup_hora_llegada);

    if (
      (!fechaSalida || !fechaLlegada) &&
      row.id_evento_parada_inicio != null &&
      row.id_evento_parada_fin != null
    ) {
      const allEvents = [
        eventsById.get(String(row.id_evento_parada_inicio)),
        eventsById.get(String(row.id_evento_parada_fin)),
      ].filter(Boolean);
      const tramoSched = scheduleFromParadaRange(
        allEvents,
        row.id_evento_parada_inicio,
        row.id_evento_parada_fin,
      );
      if (tramoSched) {
        fechaSalida = fechaSalida || tramoSched.fecha_salida;
        horaSalida = horaSalida || sliceTime(tramoSched.hora_salida);
        fechaLlegada = fechaLlegada || tramoSched.fecha_llegada;
        horaLlegada = horaLlegada || sliceTime(tramoSched.hora_llegada);
      }
    }

    const vehiculo = resolveVehiculoLabel(row);
    const schedule = {
      fecha_salida: fechaSalida,
      hora_salida: horaSalida,
      fecha_llegada: fechaLlegada,
      hora_llegada: horaLlegada,
    };
    const factor = factorByGira.get(String(row.id_gira)) || 0;
    const monto = resolveMonto(row, schedule, vigencias, factor);
    const apellido = persona?.apellido || "";
    const nombre = persona?.nombre || "";
    const rolLabel = String(row.cargo || rolGira || "").trim();
    const programaLabel = formatProgramNomenMes(programa) ||
      String(programa?.nombre_gira || "").trim() ||
      `Gira ${row.id_gira}`;

    return {
      id: row.id,
      id_gira: row.id_gira,
      id_integrante: row.id_integrante,
      apellido,
      nombre,
      rol_gira: rolGira,
      cargo: row.cargo || "",
      rolLabel,
      tramoLabel,
      personaCell: formatPersonaCell({
        apellido,
        nombre,
        tramoLabel,
        rolLabel,
      }),
      fecha_salida: fechaSalida,
      hora_salida: horaSalida,
      fecha_llegada: fechaLlegada,
      hora_llegada: horaLlegada,
      vehiculo,
      salidaCell: formatLegCell({
        fecha: fechaSalida,
        hora: horaSalida,
        vehiculo,
      }),
      regresoCell: formatLegCell({
        fecha: fechaLlegada,
        hora: horaLlegada,
        vehiculo,
      }),
      programaLabel,
      programaFechaDesde: programa?.fecha_desde
        ? String(programa.fecha_desde).slice(0, 10)
        : null,
      monto,
      seguimiento_tipo: row.seguimiento_tipo || null,
      seguimiento_color: row.seguimiento_color || null,
    };
  });

  rows.sort((a, b) => {
    const da = a.fecha_salida || a.programaFechaDesde || "";
    const db = b.fecha_salida || b.programaFechaDesde || "";
    if (da !== db) return da.localeCompare(db);
    const byApellido = (a.apellido || "").localeCompare(b.apellido || "", "es");
    if (byApellido !== 0) return byApellido;
    return (a.tramoLabel || "").localeCompare(b.tramoLabel || "", "es");
  });

  return { year, rows, vigencias };
}

/**
 * Actualiza tipo y/o color de seguimiento de una fila de detalle.
 */
export async function patchViaticoSeguimiento(
  supabase,
  id,
  { seguimiento_tipo, seguimiento_color },
) {
  const payload = {};
  if (seguimiento_tipo !== undefined) {
    payload.seguimiento_tipo = seguimiento_tipo || null;
  }
  if (seguimiento_color !== undefined) {
    payload.seguimiento_color = seguimiento_color || null;
  }
  const { data, error } = await supabase
    .from("giras_viaticos_detalle")
    .update(payload)
    .eq("id", id)
    .select("id, seguimiento_tipo, seguimiento_color")
    .single();
  if (error) throw error;
  return data;
}

function tipoLabel(value) {
  if (value === "viatico") return "Viatico";
  if (value === "reintegro") return "Reintegro";
  return "";
}

function colorLabel(value) {
  if (value === "amarillo") return "Amarillo";
  if (value === "verde") return "Verde";
  return "";
}

export function formatMontoArs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n);
}

/**
 * Exporta el seguimiento visible a Excel (columnas de la planilla).
 */
export async function downloadViaticosSeguimientoExcel({
  rows,
  year,
  fileName,
}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Viáticos ${year}`);

  ws.addRow([
    "Persona / Tramo / Rol",
    "Salida",
    "Regreso",
    "Programa",
    "Monto",
    "Tipo",
    "Color",
  ]);
  ws.getRow(1).font = { bold: true };

  for (const row of rows || []) {
    const excelRow = ws.addRow([
      row.personaCell,
      row.salidaCell,
      row.regresoCell,
      row.programaLabel,
      Number(row.monto) || 0,
      tipoLabel(row.seguimiento_tipo),
      colorLabel(row.seguimiento_color),
    ]);
    if (row.seguimiento_color === "amarillo") {
      excelRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF59D" },
        };
      });
    } else if (row.seguimiento_color === "verde") {
      excelRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFA5D6A7" },
        };
      });
    }
  }

  ws.getColumn(5).numFmt = '"$"#,##0.00';
  ws.columns.forEach((col, idx) => {
    let max = 12;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, idx === 0 ? 40 : 28);
  });

  const buf = await wb.xlsx.writeBuffer();
  const safe =
    fileName ||
    `Seguimiento_viaticos_${year}`;
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safe}.xlsx`,
  );
}
