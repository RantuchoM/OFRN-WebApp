import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconCalculator,
  IconClock,
  IconEdit,
  IconFileExcel,
  IconFileText,
  IconLoader,
  IconRefresh,
} from "../ui/Icons";
import {
  demorasMapFromRows,
  fetchEnsamblesProyeccionMatrix,
  fetchEventosGiraTiposServicio,
  fetchFeriadosPeriod,
  fetchGiraDemorasLocalidad,
  fetchLocalidadesAll,
  fetchProgramasProyeccion,
  resetProgramaProyeccionDefaults,
  updateProgramaProyeccion,
} from "../../services/giraProyeccionService";
import {
  DEFAULT_SERVICIOS_ESTIMADOS,
  resolveGiraServiciosEstimate,
  sliceTime,
} from "../../utils/giraProyeccionPcv";
import { projectEnsayosNetos } from "../../utils/ensambleProyeccionEnsayos";
import { downloadInformeEnsambles2027 } from "../../services/informeEnsambles2027Service";
import { fetchLocacionesForProyeccion } from "../../services/ensambleProyeccionEnsayosService";
import { formatDdMmYyyy, formatWeekdayLongLocal } from "../../utils/dates";
import { getProgramTypeColor } from "../../utils/giraUtils";
import { classifyProgramaEnsambleConvocatoria } from "../../utils/serviciosEnsambleReport";
import {
  buildEnsambleProyeccionDetalle,
  findMissingDemorasTemporada,
  groupEnsamblesByCf,
  listFeriadosCrossingForGira,
  proyeccionCellForEnsamble,
} from "./proyeccionSandboxHelpers";
import DemorasLocalidadModal from "./DemorasLocalidadModal";
import EnsambleProyeccionDetalle from "./EnsambleProyeccionDetalle";
import GiraFormEditPortal from "./GiraFormEditPortal";

function timeInputValue(t) {
  return sliceTime(t) || "";
}

function capitalizeLocal(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Tooltip de la columna Feriados: qué día(s) atraviesa la gira. */
function feriadosTooltip(days) {
  if (!days?.length) {
    return "Feriado / no laborable / domingo con ensayo o concierto";
  }
  return days
    .map((d) => {
      const wd = capitalizeLocal(formatWeekdayLongLocal(d.fecha));
      const date = formatDdMmYyyy(d.fecha);
      const head = [wd, date].filter(Boolean).join(" ");
      let reason = d.detalle || null;
      if (!reason) {
        if (d.esFeriado && d.esDomingo) reason = "Feriado / domingo";
        else if (d.esFeriado) reason = "Feriado";
        else if (d.esDomingo) reason = "Domingo";
      }
      return reason ? `${head} — ${reason}` : head;
    })
    .join(" · ");
}

/** Celda de solo lectura; doble clic → input; blur/Enter guarda. */
function DblClickCell({
  display,
  editValue,
  inputType = "text",
  editing,
  onStartEdit,
  onChange,
  onCommit,
  onCancel,
  title = "Doble clic para editar",
  inputClassName = "w-full rounded border border-orange-300 bg-white px-1 py-0.5 text-center text-[11px] text-slate-800",
}) {
  if (editing) {
    return (
      <input
        autoFocus
        type={inputType}
        value={editValue ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onCommit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel?.();
          }
        }}
        className={inputClassName}
      />
    );
  }
  return (
    <button
      type="button"
      title={title}
      onDoubleClick={onStartEdit}
      className="block w-full cursor-default rounded px-0.5 text-center hover:bg-white/50"
    >
      {display}
    </button>
  );
}

function DateStackDisplay({ iso }) {
  if (!iso) return <span className="opacity-50">—</span>;
  return (
    <span className="inline-flex flex-col items-center leading-tight">
      <span className="text-[9px] capitalize opacity-70">
        {formatWeekdayLongLocal(iso)}
      </span>
      <span>{formatDdMmYyyy(iso)}</span>
    </span>
  );
}

function enrichDemoras(rows, nameById) {
  return (rows || []).map((d) => ({
    ...d,
    origen_nombre:
      nameById.get(Number(d.id_localidad_origen)) ||
      `loc ${d.id_localidad_origen}`,
    destino_nombre:
      nameById.get(Number(d.id_localidad_destino)) ||
      `loc ${d.id_localidad_destino}`,
  }));
}

export default function PrestacionesProyeccionSandbox({
  supabase,
  fechaDesde,
  fechaHasta,
}) {
  const [loading, setLoading] = useState(true);
  const [programas, setProgramas] = useState([]);
  const [eventosByGira, setEventosByGira] = useState(new Map());
  const [demoras, setDemoras] = useState([]);
  const [locNameById, setLocNameById] = useState(() => new Map());
  const [savingId, setSavingId] = useState(null);
  const [localidades, setLocalidades] = useState([]);
  const [locaciones, setLocaciones] = useState([]);
  const [ensambleGroups, setEnsambleGroups] = useState([]);
  const [feriadosByFecha, setFeriadosByFecha] = useState(() => new Map());
  const [editGiraId, setEditGiraId] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [demorasModalOpen, setDemorasModalOpen] = useState(false);
  const [selectedEnsambleId, setSelectedEnsambleId] = useState("");
  const [ensayoSlots, setEnsayoSlots] = useState([]);
  /** @type {[{ id: number, field: string, value: string }|null, Function]} */
  const [editCell, setEditCell] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [progs, demRows, locs, matrix, feriados, locsVenue] =
        await Promise.all([
        fetchProgramasProyeccion({ fechaDesde, fechaHasta }),
        fetchGiraDemorasLocalidad(),
        fetchLocalidadesAll(),
        fetchEnsamblesProyeccionMatrix(),
        fetchFeriadosPeriod({ fechaDesde, fechaHasta }),
        fetchLocacionesForProyeccion(),
      ]);
      const evts = await fetchEventosGiraTiposServicio(progs.map((p) => p.id));
      const byGira = new Map();
      for (const e of evts) {
        const gid = Number(e.id_gira);
        if (!byGira.has(gid)) byGira.set(gid, []);
        byGira.get(gid).push(e);
      }
      const ferMap = new Map();
      for (const f of feriados || []) {
        const day = String(f.fecha || "").slice(0, 10);
        if (day) ferMap.set(day, f);
      }
      setProgramas(progs);
      setEventosByGira(byGira);
      setLocNameById(locs.nameById);
      setDemoras(enrichDemoras(demRows, locs.nameById));
      setLocalidades(locs.rows);
      setLocaciones(locsVenue || []);
      setEnsambleGroups(
        groupEnsamblesByCf(matrix.ensambles, matrix.cfById),
      );
      setFeriadosByFecha(ferMap);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo cargar la proyección");
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    load();
  }, [load]);

  const demorasMap = useMemo(() => demorasMapFromRows(demoras), [demoras]);

  const flatEnsambles = useMemo(
    () => ensambleGroups.flatMap((g) => g.ensambles),
    [ensambleGroups],
  );

  const rows = useMemo(() => {
    return programas.map((p) => {
      const evts = eventosByGira.get(Number(p.id)) || [];
      const est = resolveGiraServiciosEstimate(p, evts);
      const hin = sliceTime(p.hora_inicio_proyeccion) || "15:00";
      const hfin = sliceTime(p.hora_fin_proyeccion) || "23:00";
      const locs = (p.giras_localidades || [])
        .map((g) => g.localidades?.localidad)
        .filter(Boolean)
        .join(" · ");
      const cellsByEnsambleId = new Map();
      for (const ens of flatEnsambles) {
        cellsByEnsambleId.set(
          Number(ens.id),
          proyeccionCellForEnsamble(p, ens, demorasMap, locNameById),
        );
      }
      const feriadosDays = listFeriadosCrossingForGira(evts, feriadosByFecha);
      return {
        program: p,
        locs,
        est,
        hin,
        hfin,
        evts,
        feriados: feriadosDays.length,
        feriadosDays,
        cellsByEnsambleId,
      };
    });
  }, [
    programas,
    eventosByGira,
    demorasMap,
    locNameById,
    flatEnsambles,
    feriadosByFecha,
  ]);

  const missingDemoras = useMemo(
    () =>
      findMissingDemorasTemporada({
        programas,
        ensambles: flatEnsambles,
        demorasMap,
        demorasRows: demoras,
        locNameById,
      }),
    [programas, flatEnsambles, demorasMap, demoras, locNameById],
  );

  const selectedEnsamble = useMemo(
    () =>
      flatEnsambles.find(
        (e) => Number(e.id) === Number(selectedEnsambleId),
      ) || null,
    [flatEnsambles, selectedEnsambleId],
  );

  const ensambleDetalle = useMemo(
    () =>
      buildEnsambleProyeccionDetalle({
        ensamble: selectedEnsamble,
        programas,
        eventosByGira,
        demorasMap,
        locNameById,
        feriadosByFecha,
      }),
    [
      selectedEnsamble,
      programas,
      eventosByGira,
      demorasMap,
      locNameById,
      feriadosByFecha,
    ],
  );

  const ensayosStats = useMemo(() => {
    if (!selectedEnsamble) return null;
    return projectEnsayosNetos({
      slots: ensayoSlots,
      programs: programas,
      isConvocado: (p) =>
        classifyProgramaEnsambleConvocatoria(p, selectedEnsamble).status ===
        "convocado",
    });
  }, [selectedEnsamble, ensayoSlots, programas]);

  /** Optimistic local update while typing; DB commit on blur. */
  const setProgramaFields = (id, patch) => {
    setProgramas((prev) =>
      prev.map((p) => (Number(p.id) === Number(id) ? { ...p, ...patch } : p)),
    );
  };

  const commitPrograma = async (id, patch) => {
    const normalized = {};
    if ("fecha_desde" in patch) {
      normalized.fecha_desde = patch.fecha_desde
        ? String(patch.fecha_desde).slice(0, 10)
        : null;
    }
    if ("fecha_hasta" in patch) {
      normalized.fecha_hasta = patch.fecha_hasta
        ? String(patch.fecha_hasta).slice(0, 10)
        : null;
    }
    if ("hora_inicio_proyeccion" in patch) {
      normalized.hora_inicio_proyeccion =
        timeInputValue(patch.hora_inicio_proyeccion) || "15:00";
    }
    if ("hora_fin_proyeccion" in patch) {
      normalized.hora_fin_proyeccion =
        timeInputValue(patch.hora_fin_proyeccion) || "23:00";
    }
    if ("servicios_estimados" in patch) {
      normalized.servicios_estimados =
        patch.servicios_estimados === "" || patch.servicios_estimados == null
          ? null
          : Number(patch.servicios_estimados);
    }
    if (!Object.keys(normalized).length) return;

    setSavingId(id);
    try {
      const updated = await updateProgramaProyeccion(id, normalized);
      setProgramas((prev) =>
        prev.map((row) =>
          Number(row.id) === Number(id) ? { ...row, ...updated } : row,
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar");
      load();
    } finally {
      setSavingId(null);
    }
  };

  const startCellEdit = (id, field, value) => {
    setEditCell({ id: Number(id), field, value: value ?? "" });
  };

  const cancelCellEdit = () => setEditCell(null);

  const commitCellEdit = async () => {
    if (!editCell) return;
    const { id, field, value } = editCell;
    setEditCell(null);
    const patch = { [field]: value === "" ? null : value };
    setProgramaFields(id, patch);
    await commitPrograma(id, patch);
  };

  const isEditing = (id, field) =>
    editCell &&
    Number(editCell.id) === Number(id) &&
    editCell.field === field;

  const onResetDefaults = async (row) => {
    setSavingId(row.program.id);
    try {
      const updated = await resetProgramaProyeccionDefaults(
        row.program.id,
        row.evts,
      );
      setProgramas((prev) =>
        prev.map((p) =>
          Number(p.id) === Number(row.program.id) ? { ...p, ...updated } : p,
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo recalcular");
    } finally {
      setSavingId(null);
    }
  };

  const onExportInforme = async (format) => {
    if (!supabase) {
      toast.error("Sin conexión a Supabase");
      return;
    }
    setExporting(format);
    try {
      await downloadInformeEnsambles2027(supabase, format);
      toast.success(
        format === "pdf"
          ? "PDF del informe ensambles 2027 descargado"
          : "Excel del informe ensambles 2027 descargado",
      );
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo exportar el informe");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Cargando proyección…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-orange-100 bg-orange-50/50 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-900">
          <IconCalculator size={14} />
          Proyección PCV
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDemorasModalOpen(true)}
            title="Editar demoras localidad → localidad"
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${
              missingDemoras.missingPairs.length ||
              missingDemoras.locsSinConexion.length
                ? "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
                : "border-slate-200 bg-white text-slate-700 hover:border-orange-300"
            }`}
          >
            {missingDemoras.missingPairs.length ||
            missingDemoras.locsSinConexion.length ? (
              <IconAlertTriangle size={13} />
            ) : (
              <IconClock size={13} />
            )}
            Demoras
            {missingDemoras.missingPairs.length
              ? ` (${missingDemoras.missingPairs.length})`
              : ""}
          </button>
          <button
            type="button"
            onClick={() => onExportInforme("pdf")}
            disabled={Boolean(exporting) || !supabase}
            title="Informe planificación ensambles 2027 (PDF — mismo que el mail)"
            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
          >
            {exporting === "pdf" ? (
              <IconLoader size={13} className="animate-spin" />
            ) : (
              <IconFileText size={13} />
            )}
            PDF informe
          </button>
          <button
            type="button"
            onClick={() => onExportInforme("excel")}
            disabled={Boolean(exporting) || !supabase}
            title="Informe planificación ensambles 2027 (Excel — mismo que el mail)"
            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
          >
            {exporting === "excel" ? (
              <IconLoader size={13} className="animate-spin" />
            ) : (
              <IconFileExcel size={13} />
            )}
            Excel informe
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:border-orange-300"
          >
            <IconRefresh size={13} />
            Recargar
          </button>
        </div>
      </div>

      <div className="max-h-[min(70vh,calc(100vh-14rem))] overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-center text-[11px]">
          <thead className="bg-slate-50 text-[10px] tracking-wide text-slate-500">
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 top-0 z-40 w-8 border-b border-r border-slate-200 bg-slate-50 px-2 py-2"
              />
              <th
                rowSpan={2}
                className="sticky left-8 top-0 z-40 min-w-[10rem] border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center uppercase shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
              >
                Gira
              </th>
              <th
                rowSpan={2}
                className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 px-2 py-2 text-center uppercase"
              >
                F. inicio
              </th>
              <th
                rowSpan={2}
                className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 px-2 py-2 text-center uppercase"
              >
                H. inicio
              </th>
              <th
                rowSpan={2}
                className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 px-2 py-2 text-center uppercase"
              >
                F. fin
              </th>
              <th
                rowSpan={2}
                className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 px-2 py-2 text-center uppercase"
              >
                H. fin
              </th>
              <th
                rowSpan={2}
                className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 px-2 py-2 text-center uppercase"
              >
                Serv.
              </th>
              <th
                rowSpan={2}
                className="sticky top-0 z-30 border-b border-r border-slate-200 bg-pink-50 px-2 py-2 text-center uppercase text-pink-800"
                title="Días feriado / no laborable / domingo con ensayo o concierto en la gira"
              >
                Feriados
              </th>
              {ensambleGroups.map((g) => (
                <th
                  key={g.cfId ?? g.cfLabel}
                  colSpan={g.ensambles.length}
                  className="sticky top-0 z-30 border-b border-l border-slate-200 bg-fuchsia-50 px-1 py-1.5 text-center text-[10px] font-black uppercase text-fuchsia-800"
                >
                  {g.cfLabel}
                </th>
              ))}
            </tr>
            <tr>
              {ensambleGroups.map((g) =>
                g.ensambles.map((ens, idx) => (
                  <th
                    key={ens.id}
                    className={`sticky top-[2.15rem] z-20 border-b border-slate-200 bg-slate-50 px-1 py-1 text-center text-[9px] font-bold uppercase text-slate-600 ${
                      idx === 0 ? "border-l border-slate-200" : ""
                    }`}
                    title={
                      ens.localidades?.localidad ||
                      ens.localidad ||
                      ens.ensamble
                    }
                  >
                    {ens.ensamble}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const p = row.program;
              const busy = savingId === p.id;
              const isManual = row.est.source === "manual";
              const sourceLabel = isManual
                ? "M"
                : row.est.source === "eventos"
                  ? "E"
                  : "A";
              const typeColor = getProgramTypeColor(p.tipo);
              const hin = timeInputValue(p.hora_inicio_proyeccion) || "15:00";
              const hfin = timeInputValue(p.hora_fin_proyeccion) || "23:00";
              const fDesde = p.fecha_desde
                ? String(p.fecha_desde).slice(0, 10)
                : "";
              const fHasta = p.fecha_hasta
                ? String(p.fecha_hasta).slice(0, 10)
                : fDesde;
              return (
                <tr
                  key={p.id}
                  className={`border-t border-slate-100/80 ${typeColor}`}
                >
                  <td className="sticky left-0 z-10 px-1.5 py-1.5 text-center bg-inherit">
                    <button
                      type="button"
                      disabled={!supabase}
                      onClick={() => setEditGiraId(p.id)}
                      className="inline-flex rounded border border-current/20 bg-white/70 p-1 opacity-80 hover:opacity-100"
                      title="Editar programa"
                      aria-label={`Editar ${p.nombre_gira || "gira"}`}
                    >
                      <IconEdit size={13} />
                    </button>
                  </td>
                  <td className="sticky left-8 z-10 max-w-[14rem] bg-inherit px-2 py-1.5 text-center">
                    <div className="font-semibold">{p.nombre_gira}</div>
                    <div className="text-[10px] opacity-80">
                      {p.tipo} · {row.locs || "—"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-center">
                    <DblClickCell
                      editing={isEditing(p.id, "fecha_desde")}
                      display={<DateStackDisplay iso={fDesde} />}
                      editValue={
                        isEditing(p.id, "fecha_desde")
                          ? editCell.value
                          : fDesde
                      }
                      inputType="date"
                      onStartEdit={() =>
                        startCellEdit(p.id, "fecha_desde", fDesde)
                      }
                      onChange={(v) =>
                        setEditCell((c) => (c ? { ...c, value: v } : c))
                      }
                      onCommit={commitCellEdit}
                      onCancel={cancelCellEdit}
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-center font-medium">
                    <DblClickCell
                      editing={isEditing(p.id, "hora_inicio_proyeccion")}
                      display={hin}
                      editValue={
                        isEditing(p.id, "hora_inicio_proyeccion")
                          ? editCell.value
                          : hin
                      }
                      inputType="time"
                      onStartEdit={() =>
                        startCellEdit(p.id, "hora_inicio_proyeccion", hin)
                      }
                      onChange={(v) =>
                        setEditCell((c) => (c ? { ...c, value: v } : c))
                      }
                      onCommit={commitCellEdit}
                      onCancel={cancelCellEdit}
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-center">
                    <DblClickCell
                      editing={isEditing(p.id, "fecha_hasta")}
                      display={<DateStackDisplay iso={fHasta} />}
                      editValue={
                        isEditing(p.id, "fecha_hasta")
                          ? editCell.value
                          : fHasta
                      }
                      inputType="date"
                      onStartEdit={() =>
                        startCellEdit(p.id, "fecha_hasta", fHasta)
                      }
                      onChange={(v) =>
                        setEditCell((c) => (c ? { ...c, value: v } : c))
                      }
                      onCommit={commitCellEdit}
                      onCancel={cancelCellEdit}
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-center font-medium">
                    <DblClickCell
                      editing={isEditing(p.id, "hora_fin_proyeccion")}
                      display={hfin}
                      editValue={
                        isEditing(p.id, "hora_fin_proyeccion")
                          ? editCell.value
                          : hfin
                      }
                      inputType="time"
                      onStartEdit={() =>
                        startCellEdit(p.id, "hora_fin_proyeccion", hfin)
                      }
                      onChange={(v) =>
                        setEditCell((c) => (c ? { ...c, value: v } : c))
                      }
                      onCommit={commitCellEdit}
                      onCancel={cancelCellEdit}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder={String(DEFAULT_SERVICIOS_ESTIMADOS)}
                        value={
                          p.servicios_estimados != null
                            ? p.servicios_estimados
                            : ""
                        }
                        onChange={(e) =>
                          setProgramaFields(p.id, {
                            servicios_estimados:
                              e.target.value === "" ? null : e.target.value,
                          })
                        }
                        onBlur={(e) =>
                          commitPrograma(p.id, {
                            servicios_estimados:
                              e.target.value === "" ? null : e.target.value,
                          })
                        }
                        className="w-14 rounded border border-slate-200/80 bg-white/80 px-1 py-0.5 text-center text-slate-800"
                        title="Vacío = automático (eventos o 7)"
                      />
                      <span
                        className="inline-flex items-center gap-0.5 rounded bg-white/60 px-1 font-bold opacity-80"
                        title={
                          isManual
                            ? "Manual"
                            : row.est.source === "eventos"
                              ? "Desde eventos"
                              : "Default 7"
                        }
                      >
                        {sourceLabel}
                        {p.servicios_estimados == null
                          ? `=${row.est.value}`
                          : ""}
                        {isManual ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onResetDefaults(row)}
                            className="ml-0.5 rounded p-0.5 text-slate-500 hover:bg-white hover:text-orange-700 disabled:opacity-40"
                            title="Volver a automático (15:00 / 23|14, sin override)"
                            aria-label="Quitar manual y recalcular defaults"
                          >
                            <IconRefresh size={11} />
                          </button>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td
                    className="border-r border-slate-100 bg-pink-50/50 px-2 py-1.5 text-center font-bold tabular-nums text-pink-900"
                    title={
                      row.feriados > 0
                        ? feriadosTooltip(row.feriadosDays)
                        : "Sin feriados / domingos con ensayo o concierto"
                    }
                  >
                    {row.feriados > 0 ? row.feriados : ""}
                  </td>
                  {ensambleGroups.map((g) =>
                    g.ensambles.map((ens, idx) => {
                      const cell =
                        row.cellsByEnsambleId.get(Number(ens.id)) || {
                          kind: "empty",
                          label: "",
                        };
                      const bg =
                        cell.kind === "L"
                          ? "bg-sky-100/80 text-sky-900"
                          : cell.kind === "pcv"
                            ? "bg-teal-50/90 text-teal-900"
                            : "";
                      return (
                        <td
                          key={`${p.id}-${ens.id}`}
                          className={`px-1 py-1.5 text-center font-bold tabular-nums ${bg} ${
                            idx === 0 ? "border-l border-slate-100" : ""
                          }`}
                          title={
                            cell.kind === "L"
                              ? `${ens.ensamble}: en casa`
                              : cell.kind === "pcv"
                                ? `${ens.ensamble}: ${cell.label} días PCV`
                                : `${ens.ensamble}: no convocado`
                          }
                        >
                          {cell.label}
                        </td>
                      );
                    }),
                  )}
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td
                  colSpan={8 + flatEnsambles.length}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  No hay giras Sinf/CF en el período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <div>
            <div className="text-xs font-bold text-slate-800">
              Detalle por ensamble
            </div>
            <p className="text-[10px] text-slate-500">
              Mismo contenido que las hojas individuales del PDF/Excel informe
              (giras, PCV, feriados).
            </p>
          </div>
          <label className="text-[10px] font-bold uppercase text-slate-500">
            Ensamble
            <select
              value={selectedEnsambleId}
              onChange={(e) => {
                setSelectedEnsambleId(e.target.value);
                setEnsayoSlots([]);
              }}
              className="mt-0.5 block min-w-[12rem] rounded border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold normal-case text-slate-800"
            >
              <option value="">— Elegir —</option>
              {ensambleGroups.map((g) => (
                <optgroup key={g.cfId ?? g.cfLabel} label={g.cfLabel}>
                  {g.ensambles.map((ens) => (
                    <option key={ens.id} value={ens.id}>
                      {ens.ensamble}
                      {ens.localidades?.localidad
                        ? ` (${ens.localidades.localidad})`
                        : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <EnsambleProyeccionDetalle
          detail={ensambleDetalle}
          ensambleId={
            selectedEnsambleId ? Number(selectedEnsambleId) : null
          }
          locaciones={locaciones}
          ensayosStats={ensayosStats}
          onEnsayoSlotsChange={setEnsayoSlots}
        />
      </div>

      <DemorasLocalidadModal
        open={demorasModalOpen}
        onClose={() => setDemorasModalOpen(false)}
        localidades={localidades}
        demoras={demoras}
        onDemorasChange={setDemoras}
        missingPairs={missingDemoras.missingPairs}
        locsSinConexion={missingDemoras.locsSinConexion}
        locNameById={locNameById}
      />

      {editGiraId && supabase ? (
        <GiraFormEditPortal
          supabase={supabase}
          giraId={editGiraId}
          onClose={() => setEditGiraId(null)}
          onSaved={() => {
            setEditGiraId(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}
