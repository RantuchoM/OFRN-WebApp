import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getConciertosFullData,
  getProgramasSinConciertos,
} from "../../services/giraService";
import { ProgramaSinConciertosGestionRow } from "../../components/giras/ProgramasSinConciertosBanner";
import { buildMergedConciertosTimeline } from "../../utils/conciertosTimeline";
import { exportConciertosToExcel } from "../../utils/excelExporter";
import { exportConciertosToPDF } from "../../utils/agendaPdfExporter";
import {
  getTodayDateStringLocal,
  formatDisplayDate,
  formatWeekdayLongLocal,
} from "../../utils/dates";
import GestionProgramaCellContent from "../../components/giras/GestionProgramaCellContent";
import GestionConciertoLocacionCell from "../../components/giras/GestionConciertoLocacionCell";
import GestionConciertoVenueCell from "../../components/giras/GestionConciertoVenueCell";
import GestionParticipantesCell from "../../components/giras/GestionParticipantesCell";
import {
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconFileExcel,
  IconMusic,
} from "../../components/ui/Icons";

const normalize = (val) => String(val || "").trim().toLowerCase();

const formatHora = (raw) => (raw ? String(raw).slice(0, 5) : "-");

function mapLocationsOptions(data) {
  return (data || []).map((l) => ({
    id: l.id,
    label: `${l.nombre} (${l.localidades?.localidad || "Sin localidad"})`,
    originalName: l.nombre,
  }));
}

const formatRepertorioLine = (item) => {
  const compositor = String(item?.compositor || "Autor Desconocido").trim();
  const titulo = String(item?.titulo || "Obra sin título").trim();
  return { compositor, titulo };
};

function buildGestionTableRow({
  id,
  programId,
  fecha,
  fechaWeekday = "",
  hora,
  nomenclador,
  mes_letra,
  nombre_gira,
  ensambles = [],
  familias = [],
  locacion = "-",
  localidad = "-",
  id_locacion = null,
  id_estado_venue = null,
  venue_estado = "-",
  venue_estado_color = "",
  repertorio = [],
  difusion_observaciones = "",
  tipo_programa = "",
  estado_programa = "Vigente",
}) {
  const ensambleItems = (ensambles || [])
    .map((ens) => ({
      id: ens.id,
      nombre: String(ens.nombre || "").trim(),
      excluido: Boolean(ens.excluido),
    }))
    .filter((ens) => ens.nombre);
  const familiaLines = familias.filter(Boolean);
  const participantesParts = [
    ...ensambleItems.map((ens) =>
      ens.excluido ? `${ens.nombre} (excl.)` : ens.nombre,
    ),
    ...familiaLines,
  ];
  const primeraLineaPrograma = [nomenclador, mes_letra].filter(Boolean).join(" - ");
  const segundaLineaPrograma = nombre_gira || "";
  const programaLabel = [primeraLineaPrograma, segundaLineaPrograma]
    .filter(Boolean)
    .join("\n");
  const locacionLocalidad = [locacion || "-", localidad || "-"].join("\n");
  const repertorioLines = repertorio.map(formatRepertorioLine);

  return {
    id,
    programId,
    fecha,
    fechaWeekday,
    hora,
    programa: programaLabel || "-",
    participantes: participantesParts.join("\n") || "-",
    participantesEnsamble: ensambleItems,
    participantesFamilia: familiaLines,
    locacionLocalidad,
    locacion: locacion || "-",
    localidad: localidad || "-",
    idLocacion: id_locacion ?? null,
    idEstadoVenue: id_estado_venue ?? null,
    estadoVenue: venue_estado || "-",
    estadoVenueColor: venue_estado_color || "",
    repertorio:
      repertorioLines.map((line) => `${line.compositor} | ${line.titulo}`).join("\n") ||
      "-",
    repertorioLines,
    difusionObservaciones: String(difusion_observaciones || "").trim(),
    tipoPrograma: String(tipo_programa || "").trim(),
    nomenclador: String(nomenclador || "").trim(),
    mesLetra: String(mes_letra || "").trim(),
    nombreGira: String(nombre_gira || "").trim(),
    estadoPrograma: String(estado_programa || "Borrador").trim(),
  };
}

function DetailModal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
        <div className="max-h-[65vh] overflow-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}

export default function ConciertosView({ supabase }) {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locacionesOptions, setLocacionesOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [programasSinConciertos, setProgramasSinConciertos] = useState([]);
  const [dateFrom, setDateFrom] = useState(getTodayDateStringLocal());
  const [dateTo, setDateTo] = useState("");
  const [selectedProgramTypes, setSelectedProgramTypes] = useState(new Set());
  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
  const [selectedFamilies, setSelectedFamilies] = useState(new Set());
  const [repertorioModalRow, setRepertorioModalRow] = useState(null);
  const [observacionesModalRow, setObservacionesModalRow] = useState(null);
  const [headerExpanded, setHeaderExpanded] = useState(false);

  const fetchLocations = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("locaciones")
      .select("id, nombre, localidades(localidad)")
      .order("nombre");
    setLocacionesOptions(mapLocationsOptions(data));
  }, [supabase]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const loadConciertos = async () => {
    setLoading(true);
    try {
      const [data, sinConciertos] = await Promise.all([
        getConciertosFullData(supabase, {
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        }),
        getProgramasSinConciertos(supabase, {
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        }),
      ]);
      setRows(data || []);
      setProgramasSinConciertos(sinConciertos || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConciertos();
  }, [dateFrom, dateTo]);

  const programTypes = useMemo(() => {
    const types = new Set();
    rows.forEach((row) => {
      if (row.tipo_programa) types.add(row.tipo_programa);
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  useEffect(() => {
    setSelectedProgramTypes((prev) => {
      const hasPrev = prev.size > 0;
      const next = new Set();
      programTypes.forEach((type) => {
        if (hasPrev) {
          if (prev.has(type)) next.add(type);
        } else if (normalize(type) !== "comisión" && normalize(type) !== "comision") {
          next.add(type);
        }
      });
      return next;
    });
  }, [programTypes]);

  const ensembles = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      (row.ensambles || []).forEach((ens) => {
        if (ens?.id == null) return;
        if (!map.has(ens.id)) map.set(ens.id, ens.nombre || `Ensamble ${ens.id}`);
      });
    });
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rows]);

  const families = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      (row.familias || []).forEach((fam) => {
        if (fam) set.add(fam);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  useEffect(() => {
    setSelectedEnsembles((prev) => {
      const available = new Set(ensembles.map((e) => String(e.id)));
      return new Set(Array.from(prev).filter((id) => available.has(String(id))));
    });
  }, [ensembles]);

  useEffect(() => {
    setSelectedFamilies((prev) => {
      const available = new Set(families.map((f) => normalize(f)));
      return new Set(Array.from(prev).filter((f) => available.has(normalize(f))));
    });
  }, [families]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (selectedProgramTypes.size > 0 && !selectedProgramTypes.has(row.tipo_programa)) {
        return false;
      }

      if (dateFrom && row.fecha && row.fecha < dateFrom) return false;
      if (dateTo && row.fecha && row.fecha > dateTo) return false;

      const participantFilterActive =
        selectedEnsembles.size > 0 || selectedFamilies.size > 0;
      if (!participantFilterActive) return true;

      const hasSelectedEnsamble = (row.ensambles || []).some((ens) =>
        selectedEnsembles.has(String(ens.id)),
      );
      const hasSelectedFamily = (row.familias || []).some((fam) =>
        selectedFamilies.has(normalize(fam)),
      );

      return hasSelectedEnsamble || hasSelectedFamily;
    });
  }, [rows, selectedProgramTypes, selectedEnsembles, selectedFamilies, dateFrom, dateTo]);

  const filteredProgramasSinConciertos = useMemo(() => {
    return programasSinConciertos.filter((p) => {
      if (selectedProgramTypes.size > 0 && !selectedProgramTypes.has(p.tipo)) {
        return false;
      }
      return true;
    });
  }, [programasSinConciertos, selectedProgramTypes]);

  const tableRowsById = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      map.set(
        row.id,
        buildGestionTableRow({
          id: row.id,
          programId: row.id_gira || null,
          fecha: formatDisplayDate(row.fecha) || row.fecha || "-",
          fechaWeekday: formatWeekdayLongLocal(row.fecha),
          hora: formatHora(row.hora_inicio),
          nomenclador: row.nomenclador,
          mes_letra: row.mes_letra,
          nombre_gira: row.nombre_gira,
          ensambles: row.ensambles,
          familias: row.familias,
          locacion: row.locacion,
          localidad: row.localidad,
          id_locacion: row.id_locacion,
          id_estado_venue: row.id_estado_venue,
          venue_estado: row.venue_estado,
          venue_estado_color: row.venue_estado_color,
          repertorio: row.repertorio,
          difusion_observaciones: row.difusion_observaciones,
          tipo_programa: row.tipo_programa,
          estado_programa: row.estado_programa,
        }),
      );
    });
    return map;
  }, [filteredRows]);

  const programasSinConciertosRowsById = useMemo(() => {
    const map = new Map();
    filteredProgramasSinConciertos.forEach((programa) => {
      const fechaDesde =
        formatDisplayDate(programa.fecha_desde) || programa.fecha_desde || "-";
      const fechaHasta =
        formatDisplayDate(programa.fecha_hasta) || programa.fecha_hasta || "-";
      map.set(
        programa.id,
        buildGestionTableRow({
          id: `sin-conc-${programa.id}`,
          programId: programa.id,
          fecha: `${fechaDesde}\n→ ${fechaHasta}`,
          hora: "—",
          nomenclador: programa.nomenclador,
          mes_letra: programa.mes_letra,
          nombre_gira: programa.nombre_gira,
          ensambles: programa.ensambles,
          familias: programa.familias,
          repertorio: programa.repertorio,
          difusion_observaciones: programa.difusion_observaciones,
          tipo_programa: programa.tipo,
          estado_programa: programa.estado,
        }),
      );
    });
    return map;
  }, [filteredProgramasSinConciertos]);

  const tableRows = useMemo(
    () => Array.from(tableRowsById.values()),
    [tableRowsById],
  );

  const mergedTimeline = useMemo(
    () =>
      buildMergedConciertosTimeline(filteredRows, filteredProgramasSinConciertos),
    [filteredRows, filteredProgramasSinConciertos],
  );

  const handleToggleProgramType = (type) => {
    setSelectedProgramTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleToggleEnsamble = (id) => {
    const sid = String(id);
    setSelectedEnsembles((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const handleToggleFamily = (family) => {
    const n = normalize(family);
    setSelectedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const handleExportExcel = async () => {
    await exportConciertosToExcel(tableRows);
  };

  const handleExportPdf = () => {
    const subtitle = `${tableRows.length} concierto(s) filtrado(s)`;
    exportConciertosToPDF(tableRows, "Gestión de Conciertos", subtitle);
  };

  const handleOpenProgramAgenda = (programId) => {
    if (!programId) return;
    const url = `${window.location.pathname}?tab=giras&view=AGENDA&giraId=${programId}`;
    window.location.assign(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Rango de fechas
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHeaderExpanded((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            {headerExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            Filtros
          </button>
        </div>

        {headerExpanded && (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
                  Tipo de programa
                </p>
                <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {programTypes.length === 0 && (
                    <p className="text-xs text-slate-400">Sin tipos disponibles</p>
                  )}
                  {programTypes.map((type) => (
                    <label
                      key={type}
                      className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProgramTypes.has(type)}
                        onChange={() => handleToggleProgramType(type)}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
                  Ensambles y Familias
                </p>
                <div className="max-h-28 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Ensambles</p>
                    {ensembles.map((ens) => (
                      <label
                        key={ens.id}
                        className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEnsembles.has(String(ens.id))}
                          onChange={() => handleToggleEnsamble(ens.id)}
                        />
                        <span>{ens.nombre}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Familias</p>
                    {families.map((fam) => (
                      <label
                        key={fam}
                        className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFamilies.has(normalize(fam))}
                          onChange={() => handleToggleFamily(fam)}
                        />
                        <span>{fam}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadConciertos}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                disabled={loading}
              >
                {loading ? "Actualizando..." : "Actualizar"}
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                disabled={tableRows.length === 0}
              >
                <IconFileExcel size={14} />
                Exportar Excel
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                disabled={tableRows.length === 0}
              >
                <IconDownload size={14} />
                Exportar PDF
              </button>
            </div>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th className="w-[1%] whitespace-nowrap border-b border-slate-200 px-2 py-2 text-left">
                Fecha
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Hora</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Programa</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">
                Ensambles/Familias
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">
                Locación/Localidad
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">
                Estado del Venue
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Repertorio</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">
                Redes / Difusión
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">
                  Cargando conciertos...
                </td>
              </tr>
            )}
            {!loading && mergedTimeline.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">
                  No hay conciertos para los filtros seleccionados.
                </td>
              </tr>
            )}
            {!loading &&
              mergedTimeline.map((entry) => {
                if (entry.kind === "sin_conciertos") {
                  const sinRow = programasSinConciertosRowsById.get(entry.item.id);
                  return (
                    <ProgramaSinConciertosGestionRow
                      key={`sin-conc-${entry.item.id}`}
                      row={sinRow}
                      onOpenProgram={handleOpenProgramAgenda}
                      onOpenRepertorio={setRepertorioModalRow}
                      onOpenObservaciones={setObservacionesModalRow}
                    />
                  );
                }

                const row = tableRowsById.get(entry.item.id);
                if (!row) return null;

                return (
                <tr key={row.id} className="align-top text-slate-700 odd:bg-white even:bg-slate-50">
                  <td className="w-[1%] whitespace-nowrap border-b border-slate-100 px-2 py-2">
                    <div className="leading-tight">
                      <div>{row.fecha}</div>
                      {row.fechaWeekday ? (
                        <div className="text-[11px] text-slate-500">{row.fechaWeekday}</div>
                      ) : null}
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">{row.hora}</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <GestionProgramaCellContent
                      tipoPrograma={row.tipoPrograma}
                      nomenclador={row.nomenclador}
                      mesLetra={row.mesLetra}
                      nombreGira={row.nombreGira}
                      estadoPrograma={row.estadoPrograma}
                      onOpenAgenda={() => handleOpenProgramAgenda(row.programId)}
                      agendaDisabled={!row.programId}
                    />
                  </td>
                  <td className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2">
                    <GestionParticipantesCell
                      participantesEnsamble={row.participantesEnsamble}
                      participantesFamilia={row.participantesFamilia}
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <GestionConciertoLocacionCell
                      supabase={supabase}
                      eventId={row.id}
                      idLocacion={row.idLocacion}
                      locacion={row.locacion}
                      localidad={row.localidad}
                      locacionesOptions={locacionesOptions}
                      onRefreshLocations={fetchLocations}
                      onUpdated={loadConciertos}
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <GestionConciertoVenueCell
                      supabase={supabase}
                      eventId={row.id}
                      idEstadoVenue={row.idEstadoVenue}
                      estadoNombre={row.estadoVenue}
                      estadoColor={row.estadoVenueColor}
                      userId={userId ?? null}
                      onUpdated={loadConciertos}
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setRepertorioModalRow(row)}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                        row.repertorioLines.length > 0
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          : "border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200"
                      }`}
                      title={
                        row.repertorioLines.length > 0
                          ? "Ver repertorio"
                          : "Sin repertorio cargado"
                      }
                    >
                      <IconMusic size={14} />
                    </button>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!row.difusionObservaciones) return;
                        setObservacionesModalRow(row);
                      }}
                      className={`h-4 w-4 rounded-[2px] border rotate-[-8deg] transition-transform hover:rotate-0 ${
                        row.difusionObservaciones
                          ? "border-amber-500/90 bg-amber-300 hover:bg-amber-200"
                          : "cursor-default border-dashed border-amber-400/80 bg-amber-50"
                      }`}
                      title={
                        row.difusionObservaciones
                          ? "Ver observaciones de Redes/Difusión"
                          : "Sin observaciones de Redes/Difusión"
                      }
                    />
                  </td>
                </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <DetailModal
        open={Boolean(repertorioModalRow)}
        title={
          String(repertorioModalRow?.id || "").startsWith("sin-conc-")
            ? "Repertorio del programa"
            : "Repertorio del concierto"
        }
        subtitle={repertorioModalRow?.programa || ""}
        onClose={() => setRepertorioModalRow(null)}
      >
        {repertorioModalRow?.repertorioLines?.length ? (
          <ul className="space-y-2">
            {repertorioModalRow.repertorioLines.map((line, idx) => (
              <li
                key={`rep-modal-${repertorioModalRow.id}-${idx}`}
                className="flex flex-wrap gap-x-2 border-b border-slate-100 pb-2 text-sm last:border-b-0"
              >
                <span className="whitespace-pre-line font-bold text-slate-700">
                  {line.compositor}
                </span>
                <span className="hidden text-slate-300 sm:inline">|</span>
                <span className="italic text-slate-600">{line.titulo}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            {String(repertorioModalRow?.id || "").startsWith("sin-conc-")
              ? "Este programa no tiene repertorio cargado."
              : "Este concierto no tiene repertorio cargado."}
          </p>
        )}
      </DetailModal>

      <DetailModal
        open={Boolean(observacionesModalRow)}
        title="Observaciones de Redes y Difusión"
        subtitle={observacionesModalRow?.programa || ""}
        onClose={() => setObservacionesModalRow(null)}
      >
        <p className="whitespace-pre-wrap text-sm text-slate-700">
          {observacionesModalRow?.difusionObservaciones || "Sin observaciones."}
        </p>
      </DetailModal>
    </div>
  );
}
