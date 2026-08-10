import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  fetchAsistenciaMatrixBaseData,
  resolveGiraRosterForMatrix,
} from "./giraService";
import {
  SERVICIO_COLUMN_DEFS,
  buildCustomByEventId,
  buildDraftGiraIds,
  buildGrupoMembersMap,
  formatServicioPartsPlain,
} from "../utils/serviciosCantidad";
import { integranteKey } from "../utils/integranteIds";

const EVENT_SELECT = `
  id, fecha, hora_inicio, hora_fin, tecnica, is_deleted, id_tipo_evento, id_gira, es_didactico,
  eventos_ensambles ( id_ensamble ),
  eventos_grupos ( id_grupo )
`;

/**
 * Eventos relevantes (ensayo ensamble / ensayo gira / concierto) desde el 1-ene del año anterior.
 */
export async function fetchServiciosCantidadEvents(supabase) {
  if (!supabase) return { events: [], customRows: [], grupoMemberRows: [], error: null };
  const y = new Date().getFullYear();
  const minFecha = `${y - 1}-01-01`;
  try {
    const { data: events, error: evErr } = await supabase
      .from("eventos")
      .select(EVENT_SELECT)
      .eq("is_deleted", false)
      .in("id_tipo_evento", [1, 2, 3, 13])
      .gte("fecha", minFecha)
      .order("fecha", { ascending: true });
    if (evErr) throw evErr;

    const list = events || [];
    const eventIds = list.map((e) => e.id).filter(Boolean);
    const giraIds = [
      ...new Set(list.map((e) => e.id_gira).filter((id) => id != null)),
    ];

    const [customRes, grupoRes] = await Promise.all([
      eventIds.length
        ? supabase
            .from("eventos_asistencia_custom")
            .select("id_evento, id_integrante, tipo")
            .in("id_evento", eventIds)
        : Promise.resolve({ data: [], error: null }),
      giraIds.length
        ? supabase
            .from("giras_grupos")
            .select("id, id_gira, giras_grupos_integrantes ( id_integrante )")
            .in("id_gira", giraIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (customRes.error) throw customRes.error;
    if (grupoRes.error) throw grupoRes.error;

    const grupoMemberRows = [];
    for (const g of grupoRes.data || []) {
      for (const m of g.giras_grupos_integrantes || []) {
        grupoMemberRows.push({
          id_grupo: g.id,
          id_integrante: m.id_integrante,
          id_gira: g.id_gira,
        });
      }
    }

    // programas.estado para draft filter (programas con eventos)
    let programasEstado = [];
    if (giraIds.length) {
      const { data, error } = await supabase
        .from("programas")
        .select("id, estado")
        .in("id", giraIds);
      if (error) throw error;
      programasEstado = data || [];
    }

    return {
      events: list,
      customRows: customRes.data || [],
      grupoMemberRows,
      programasEstado,
      error: null,
    };
  } catch (e) {
    console.error("[serviciosCantidad] fetch events:", e);
    return {
      events: [],
      customRows: [],
      grupoMemberRows: [],
      programasEstado: [],
      error: e,
    };
  }
}

export async function fetchServiciosCantidadBaseData(supabase) {
  const base = await fetchAsistenciaMatrixBaseData(supabase);
  if (base.error) return { ...base, events: [], customRows: [], grupoMemberRows: [] };

  const ev = await fetchServiciosCantidadEvents(supabase);
  if (ev.error) {
    return {
      ...base,
      events: [],
      customRows: [],
      grupoMemberRows: [],
      error: ev.error,
    };
  }

  // Merge estado from programasEstado into base programas when missing
  const estadoById = new Map(
    (ev.programasEstado || []).map((p) => [p.id, p.estado]),
  );
  const programas = (base.programas || []).map((p) => ({
    ...p,
    estado: p.estado ?? estadoById.get(p.id) ?? p.estado,
  }));

  // memberships for ensamble ensayos: need full memberships (not only "hoy")?
  // Base already filters to active today — for historical convocation we need fecha-sensitive
  // membership within isIntegranteConvocadoToEnsayo (uses membershipActiveOnProgramDate per event).
  // So reload raw memberships without hoy filter for accurate past ensayes.
  let membershipsAll = base.memberships || [];
  try {
    const { data, error } = await supabase
      .from("integrantes_ensambles")
      .select("id_ensamble, id_integrante, fecha_desde, fecha_hasta");
    if (!error && data) membershipsAll = data;
  } catch {
    /* keep base memberships */
  }

  return {
    ...base,
    programas,
    memberships: membershipsAll,
    membershipsTree: base.memberships,
    events: ev.events,
    customRows: ev.customRows,
    grupoMemberRows: ev.grupoMemberRows,
    error: null,
  };
}

export async function resolveRostersForPrograms(supabase, programas) {
  const entries = await Promise.all(
    (programas || []).map(async (g) => {
      const { countedIds, preAltaIds, reemplazoIds, licenciaIds } =
        await resolveGiraRosterForMatrix(supabase, g.id);
      return [
        g.id,
        {
          counted: countedIds,
          preAlta: preAltaIds,
          reemplazo: reemplazoIds,
          licencia: licenciaIds,
        },
      ];
    }),
  );
  return Object.fromEntries(entries);
}

export function buildServiciosComputeContext({
  rosterByGiraId,
  memberships,
  customRows,
  grupoMemberRows,
  programas,
  filteredProgramas,
  showPastInYear,
}) {
  return {
    rosterByGiraId: rosterByGiraId || {},
    memberships: memberships || [],
    customByEventId: buildCustomByEventId(customRows),
    grupoMembersMap: buildGrupoMembersMap(grupoMemberRows),
    draftGiraIds: buildDraftGiraIds(programas),
    filteredProgramIds: new Set(
      (filteredProgramas || []).map((p) => p.id).filter((id) => id != null),
    ),
    showPastInYear: Boolean(showPastInYear),
  };
}

/**
 * @param {object} params
 * @param {Array} params.visibleRows
 * @param {Record<string, object>} params.bucketsByIntegranteId
 * @param {Array} [params.rowGroups]
 * @param {boolean} [params.groupByEnsambles]
 * @param {string} [params.fileName]
 */
export async function downloadServiciosCantidadExcel({
  visibleRows,
  bucketsByIntegranteId,
  rowGroups = [],
  groupByEnsambles = false,
  fileName = "cantidad_servicios",
}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Servicios");

  const headers = [
    "Integrante",
    "Instrumento",
    ...SERVICIO_COLUMN_DEFS.map((c) => c.label),
  ];
  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };

  const pushRow = (row) => {
    const iid = integranteKey(row.id);
    const buckets = bucketsByIntegranteId[iid] || {};
    const name = `${row.apellido || ""}, ${row.nombre || ""}`.trim();
    const inst =
      row.instrumentDisplay ||
      row.instrumentos?.instrumento ||
      row.instrumentos?.abreviatura ||
      "";
    ws.addRow([
      name,
      inst,
      ...SERVICIO_COLUMN_DEFS.map((c) =>
        formatServicioPartsPlain(buckets[c.key]),
      ),
    ]);
  };

  if (groupByEnsambles && rowGroups?.length) {
    for (const g of rowGroups) {
      if (g.label) {
        const headerRow = ws.addRow([g.label]);
        headerRow.font = { bold: true, italic: true };
      }
      for (const row of g.rows || []) pushRow(row);
    }
  } else {
    for (const row of visibleRows || []) pushRow(row);
  }

  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 28);
  });

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${fileName}.xlsx`,
  );
}
