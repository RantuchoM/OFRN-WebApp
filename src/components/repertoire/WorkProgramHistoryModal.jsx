import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconCalendar,
  IconExternalLink,
  IconHistory,
  IconLoader,
  IconX,
} from "../ui/Icons";
import AppNavLink from "../ui/AppNavLink";
import {
  fetchDirectRepertorioAssignmentsForObra,
  fetchPlaceholderOpcionesForObra,
  fetchProgramIdsWithPlaceholders,
} from "../../services/repertorioPlaceholderOpciones";
import {
  emptyConvocatoria,
  fetchConvocatoriaByProgramIds,
  fetchLegacyAssignmentsForObra,
  parseLegacyConvocatoria,
} from "../../services/obraProgramHistoryService";
import LegacyTag from "./LegacyTag";

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function isModifiedNavClick(event) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

const MES_CORTO = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** Parsea `YYYY-MM-DD` (o Date) a partes locales sin corrimiento UTC. */
function parseDateParts(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return {
        y: Number(m[1]),
        mo: Number(m[2]),
        d: Number(m[3]),
      };
    }
  }
  try {
    const dt = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dt.getTime())) return null;
    return {
      y: dt.getFullYear(),
      mo: dt.getMonth() + 1,
      d: dt.getDate(),
    };
  } catch {
    return null;
  }
}

/**
 * Rango de gira: `19-22/feb/2025` (mismo mes), `19/feb/2025` (un día),
 * `30/jul-3/ago/2025` si cruza mes.
 */
function formatFechaRangoPrograma(fechaDesde, fechaHasta) {
  const desde = parseDateParts(fechaDesde);
  if (!desde) return null;
  const hasta = parseDateParts(fechaHasta) || desde;
  const mesDesde = MES_CORTO[desde.mo - 1] || String(desde.mo);
  const mesHasta = MES_CORTO[hasta.mo - 1] || String(hasta.mo);

  if (desde.y === hasta.y && desde.mo === hasta.mo) {
    if (desde.d === hasta.d) {
      return `${desde.d}/${mesDesde}/${desde.y}`;
    }
    return `${desde.d}-${hasta.d}/${mesDesde}/${desde.y}`;
  }
  if (desde.y === hasta.y) {
    return `${desde.d}/${mesDesde}-${hasta.d}/${mesHasta}/${desde.y}`;
  }
  return `${desde.d}/${mesDesde}/${desde.y}-${hasta.d}/${mesHasta}/${hasta.y}`;
}

/** Fila etiquetada de chips (ensambles, familias o excluidos de la convocatoria). */
function ConvocatoriaChips({ label, names, chipClassName }) {
  if (!names?.length) return null;
  return (
    <div className="text-[10px] text-slate-600 mt-1 flex flex-wrap items-center gap-1">
      <span className="text-[9px] font-bold uppercase text-slate-400">
        {label}:
      </span>
      {names.map((name) => (
        <span
          key={name}
          className={`inline-flex px-1.5 py-0.5 rounded border ${chipClassName}`}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

/**
 * Historial de programas/giras donde la obra está asignada
 * (`repertorio_obras` + `obras_repertorios_legacy`).
 * Portal a document.body. Overlay por encima de WorkForm (`z-[9999]`) con `z-[10050]`.
 */
export default function WorkProgramHistoryModal({
  work,
  onClose,
  supabase,
  isEditor = false,
  overlayClassName = "z-[10050]",
  onNavigate = null,
}) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [opcionesSlots, setOpcionesSlots] = useState([]);
  const [programsWithPlaceholders, setProgramsWithPlaceholders] = useState(
    () => new Set(),
  );

  useEffect(() => {
    const fetchHistory = async () => {
      if (!work?.id) return;
      setLoading(true);
      try {
        const [rows, opciones, legacyRows] = await Promise.all([
          fetchDirectRepertorioAssignmentsForObra(supabase, work.id),
          isEditor
            ? fetchPlaceholderOpcionesForObra(supabase, work.id)
            : Promise.resolve([]),
          fetchLegacyAssignmentsForObra(supabase, work.id),
        ]);

        const liveHistory = (rows || [])
          .map((item) => ({
            key: `live-${item.id}`,
            source: "live",
            id: item.id,
            bloque: item.programas_repertorios?.nombre,
            gira: item.programas_repertorios?.programas,
            convocatoria: emptyConvocatoria(),
          }))
          .filter((h) => h.gira);

        const programIds = [
          ...new Set(
            [
              ...liveHistory.map((h) => h.gira?.id),
              ...(opciones || []).map(
                (o) => o.repertorio_obras?.programas_repertorios?.programas?.id,
              ),
            ].filter(Boolean),
          ),
        ];

        const [withPh, convocatoriaByProgram] = await Promise.all([
          fetchProgramIdsWithPlaceholders(supabase, programIds),
          fetchConvocatoriaByProgramIds(supabase, programIds),
        ]);

        for (const item of liveHistory) {
          const pid = Number(item.gira?.id);
          item.convocatoria = convocatoriaByProgram.get(pid) || emptyConvocatoria();
        }

        const legacyHistory = (legacyRows || []).map((row) => ({
          key: `legacy-${row.id}`,
          source: "legacy",
          id: row.id,
          bloque: null,
          gira: {
            id: null,
            nombre_gira: row.nombre_gira,
            mes_letra: row.mes_letra,
            nomenclador: row.nomenclador,
            fecha_desde: row.fecha_desde,
            fecha_hasta: row.fecha_hasta,
            tipo: row.tipo,
            zona: row.zona,
          },
          // Texto libre: mezcla ensambles (PILTRI) y familias (Cuerdas) → separar.
          convocatoria: parseLegacyConvocatoria(row.ensambles),
          fuente: row.fuente,
        }));

        const historyData = [...liveHistory, ...legacyHistory];
        historyData.sort(
          (a, b) =>
            new Date(b.gira?.fecha_desde || 0) -
            new Date(a.gira?.fecha_desde || 0),
        );

        setHistory(historyData);
        setOpcionesSlots(opciones || []);
        setProgramsWithPlaceholders(withPh);
      } catch (err) {
        console.error("Error history:", err);
        setHistory([]);
        setOpcionesSlots([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [work?.id, supabase, isEditor]);

  useEffect(() => {
    if (!onClose) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleGoClick = (event) => {
    if (event.defaultPrevented || isModifiedNavClick(event)) return;
    onClose?.();
    onNavigate?.();
  };

  const empty = history.length === 0 && opcionesSlots.length === 0;

  return createPortal(
    <div
      className={`fixed inset-0 ${overlayClassName} flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <IconHistory className="text-indigo-600" /> Historial
            </h3>
            <div className="text-xs text-slate-500 line-clamp-1">
              {stripHtml(work?.titulo) || "Obra"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded"
            aria-label="Cerrar historial"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {loading ? (
            <div className="text-center py-8 text-indigo-500">
              <IconLoader className="animate-spin inline" />
            </div>
          ) : empty ? (
            <div className="text-center py-8 text-slate-400 italic text-sm">
              Esta obra no está asignada a ningún programa.
            </div>
          ) : (
            <div className="space-y-3">
              {isEditor && opcionesSlots.length > 0 && (
                <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                  <div className="text-[10px] font-bold uppercase text-violet-800">
                    Opción en slots a definir
                  </div>
                  {opcionesSlots.map((op) => {
                    const slot = op.repertorio_obras;
                    const prog = slot?.programas_repertorios?.programas;
                    const bloque = slot?.programas_repertorios?.nombre;
                    return (
                      <div
                        key={op.id}
                        className="text-xs text-slate-700 bg-white/80 rounded border border-violet-100 px-2 py-1.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-violet-900">
                            {slot?.titulo_placeholder || "Slot a definir"}
                          </span>
                          {prog && (
                            <span className="text-slate-500">
                              {" "}
                              · {prog.nomenclador} {prog.nombre_gira}
                              {bloque ? ` (${bloque})` : ""}
                            </span>
                          )}
                        </div>
                        {prog?.id != null && (
                          <AppNavLink
                            mode="GIRAS"
                            view="REPERTOIRE"
                            giraId={prog.id}
                            onClick={handleGoClick}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
                            title="Ir al repertorio de esta gira"
                          >
                            <IconExternalLink size={11} /> Ir
                          </AppNavLink>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {history.map((item) => {
                const isLegacy = item.source === "legacy";
                const fechaLabel = formatFechaRangoPrograma(
                  item.gira?.fecha_desde,
                  item.gira?.fecha_hasta,
                );
                return (
                  <div
                    key={item.key}
                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center gap-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-indigo-700 uppercase mb-0.5 flex flex-wrap items-center gap-1">
                        <span>
                          {[item.gira?.nomenclador, item.gira?.mes_letra]
                            .filter(Boolean)
                            .join(" · ")}
                          {item.gira?.tipo && (
                            <span className="text-slate-500 font-medium ml-1">
                              · {item.gira.tipo}
                            </span>
                          )}
                        </span>
                        {isLegacy && <LegacyTag size="xs" />}
                        {!isLegacy &&
                          programsWithPlaceholders.has(item.gira.id) && (
                            <span className="inline-flex items-center text-[8px] bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded border border-violet-200 font-semibold normal-case tracking-normal">
                              Tiene slots a definir
                            </span>
                          )}
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {item.gira.nombre_gira}
                      </div>
                      {item.gira?.zona ? (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Zona: {item.gira.zona}
                        </div>
                      ) : null}
                      <ConvocatoriaChips
                        label="Ensambles"
                        names={item.convocatoria?.ensambles}
                        chipClassName="bg-emerald-50 text-emerald-800 border-emerald-100"
                      />
                      <ConvocatoriaChips
                        label="Familias"
                        names={item.convocatoria?.familias}
                        chipClassName="bg-sky-50 text-sky-800 border-sky-100"
                      />
                      <ConvocatoriaChips
                        label="Excluidos"
                        names={item.convocatoria?.excluidos}
                        chipClassName="bg-slate-100 text-slate-500 border-slate-200 line-through"
                      />

                      {item.bloque && (
                        <div className="text-[10px] text-slate-500 mt-1 bg-slate-50 inline-block px-1.5 rounded border border-slate-100">
                          Bloque: {item.bloque}
                        </div>
                      )}
                      {isLegacy && item.fuente ? (
                        <div className="text-[9px] text-slate-400 mt-1 italic">
                          Fuente: {item.fuente}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {fechaLabel && (
                        <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1">
                          <IconCalendar size={12} /> {fechaLabel}
                        </div>
                      )}
                      {!isLegacy && item.gira?.id != null && (
                        <AppNavLink
                          mode="GIRAS"
                          view="REPERTOIRE"
                          giraId={item.gira.id}
                          onClick={handleGoClick}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 opacity-80 group-hover:opacity-100 transition-opacity"
                          title="Ir al repertorio de esta gira"
                        >
                          <IconExternalLink size={12} /> Ir
                        </AppNavLink>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
