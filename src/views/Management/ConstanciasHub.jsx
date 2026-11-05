import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  IconLoader,
  IconCheck,
  IconX,
  IconRefresh,
  IconFileText,
  IconMail,
  IconDownload,
  IconUndo,
  IconPlus,
  IconRepeat,
} from "../../components/ui/Icons";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  CONSTANCIA_ESTADO_LABEL,
  CONSTANCIA_ESTADOS,
  CONSTANCIA_TIPO_LABEL,
  CONSTANCIA_TIPO_LABEL_SHORT,
  CONSTANCIA_TIPOS,
} from "../../constants/constancias";
import {
  listConstanciasGestion,
  listGirasElegiblesConstancia,
  aprobarConstancia,
  denegarConstancia,
  deshacerDenegacionConstancia,
  aprobarTodasConstanciasPendientes,
  reenviarConstanciaAprobada,
  descargarConstanciaPdf,
  updateConstanciaSnapFuncion,
  updateConstanciaSnapFechas,
  countConstanciasPendientes,
  generarConstanciaGestion,
  previewConstanciaGestion,
  suggestConstanciaFechasFromLogistics,
  reemitirConstanciaAprobada,
} from "../../services/constanciasService";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";
import {
  seatingApellidoNombre,
  seatingApellidoInicial,
  legalApellidoNombre,
} from "../../utils/integranteDisplayName";
import { formatProgramSelectLabel } from "../../utils/giraUtils";

function labelResueltoPor(row) {
  const ref = row?.resuelto_por_ref;
  if (!ref) return null;
  return seatingApellidoInicial(ref) || seatingApellidoNombre(ref) || null;
}

function formatShortDate(iso) {
  if (!iso) return "—";
  const d = String(iso).slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function estadoClass(estado) {
  if (estado === CONSTANCIA_ESTADOS.aprobada) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (estado === CONSTANCIA_ESTADOS.denegada) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function filtroEstadoChipClass(id, active) {
  const map = {
    pendiente: active
      ? "border-amber-400 bg-amber-100 text-amber-950 shadow-sm shadow-amber-200/60"
      : "border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100",
    aprobada: active
      ? "border-emerald-400 bg-emerald-100 text-emerald-950 shadow-sm shadow-emerald-200/60"
      : "border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100",
    denegada: active
      ? "border-rose-400 bg-rose-100 text-rose-950 shadow-sm shadow-rose-200/60"
      : "border-rose-200 bg-rose-50/70 text-rose-800 hover:bg-rose-100",
    todas: active
      ? "border-slate-400 bg-slate-200 text-slate-900 shadow-sm"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  };
  return map[id] || map.todas;
}

function filtroTipoChipClass(id, active) {
  if (id === CONSTANCIA_TIPOS.convocatoria) {
    return active
      ? "border-violet-400 bg-violet-100 text-violet-950 shadow-sm shadow-violet-200/60"
      : "border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100";
  }
  if (id === CONSTANCIA_TIPOS.participacion) {
    return active
      ? "border-sky-400 bg-sky-100 text-sky-950 shadow-sm shadow-sky-200/60"
      : "border-sky-200 bg-sky-50/70 text-sky-800 hover:bg-sky-100";
  }
  return active
    ? "border-indigo-400 bg-indigo-100 text-indigo-950 shadow-sm shadow-indigo-200/60"
    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
}

export default function ConstanciasHub() {
  const { user, isEditor, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("solicitud");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filtro, setFiltro] = useState("pendiente");
  /** todas | convocatoria | participacion */
  const [filtroTipo, setFiltroTipo] = useState("todas");
  const [busyId, setBusyId] = useState(null);
  const [denyTarget, setDenyTarget] = useState(null);
  const [denyMotivo, setDenyMotivo] = useState("");
  const [undoTarget, setUndoTarget] = useState(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  /** Borradores del texto «como …» por solicitud (convocatoria). */
  const [comoById, setComoById] = useState({});
  /** Borradores de fechas del PDF por solicitud (no aprobadas). */
  const [fechasById, setFechasById] = useState({});
  const [pendientesTotal, setPendientesTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const canManage = isAdmin || isEditor;

  const tipoFilterParam =
    filtroTipo === CONSTANCIA_TIPOS.convocatoria ||
    filtroTipo === CONSTANCIA_TIPOS.participacion
      ? filtroTipo
      : undefined;

  const load = useCallback(
    async (overrides = {}) => {
      setLoading(true);
      try {
        const filtroEff =
          overrides.filtro !== undefined ? overrides.filtro : filtro;
        const estado =
          filtroEff === "todas"
            ? undefined
            : filtroEff || CONSTANCIA_ESTADOS.pendiente;
        const [data, pendientes] = await Promise.all([
          listConstanciasGestion(supabase, {
            estado,
            tipo: tipoFilterParam,
          }),
          countConstanciasPendientes(supabase, { tipo: tipoFilterParam }),
        ]);
        setRows(data);
        setPendientesTotal(pendientes);
      } catch (err) {
        console.error("[ConstanciasHub] load:", err);
        toast.error(err?.message || "Error al cargar solicitudes");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [filtro, tipoFilterParam],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!highlightId) return;
    const nodes = document.querySelectorAll(
      `[data-constancia-id="${CSS.escape(String(highlightId))}"]`,
    );
    const el = [...nodes].find((n) => n.offsetParent !== null) || nodes[0];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, rows]);

  useEffect(() => {
    setComoById((prev) => {
      const next = { ...prev };
      (rows || []).forEach((r) => {
        if (next[r.id] === undefined) {
          next[r.id] =
            String(r.snap_funcion || "").trim() ||
            String(r.snap_instrumento || "")
              .trim()
              .toLowerCase() ||
            "";
        }
      });
      return next;
    });
    setFechasById((prev) => {
      const next = { ...prev };
      (rows || []).forEach((r) => {
        if (next[r.id] === undefined) {
          next[r.id] = {
            desde: String(r.snap_fecha_desde || "").slice(0, 10),
            hasta: String(r.snap_fecha_hasta || "").slice(0, 10),
          };
        }
      });
      return next;
    });
  }, [rows]);

  const pendientesCount = useMemo(() => {
    if (filtro === CONSTANCIA_ESTADOS.pendiente) {
      return rows.length;
    }
    return pendientesTotal;
  }, [filtro, rows, pendientesTotal]);

  const persistComoIfNeeded = async (row) => {
    if (!row || row.estado !== CONSTANCIA_ESTADOS.pendiente) {
      return;
    }
    const val = String(comoById[row.id] ?? "").trim();
    if (!val) return;
    if (val === String(row.snap_funcion || "").trim()) return;
    await updateConstanciaSnapFuncion(supabase, {
      solicitudId: row.id,
      snapFuncion: val,
    });
  };

  const persistFechasIfNeeded = async (row) => {
    if (!row || row.estado === CONSTANCIA_ESTADOS.aprobada) return;
    const draft = fechasById[row.id];
    if (!draft?.desde) return;
    const desde = String(draft.desde).slice(0, 10);
    const hasta = String(draft.hasta || draft.desde).slice(0, 10);
    if (
      desde === String(row.snap_fecha_desde || "").slice(0, 10) &&
      hasta === String(row.snap_fecha_hasta || "").slice(0, 10)
    ) {
      return;
    }
    const updated = await updateConstanciaSnapFechas(supabase, {
      solicitudId: row.id,
      fechaDesde: desde,
      fechaHasta: hasta,
    });
    setRows((prev) =>
      (prev || []).map((x) => (x.id === row.id ? { ...x, ...updated } : x)),
    );
  };

  /** Pendiente/denegada: autosave. Aprobada: solo draft local hasta Reemitir. */
  const canEditFechas = (estado) =>
    estado === CONSTANCIA_ESTADOS.pendiente ||
    estado === CONSTANCIA_ESTADOS.denegada ||
    estado === CONSTANCIA_ESTADOS.aprobada;

  const canEditComo = (estado) =>
    estado === CONSTANCIA_ESTADOS.pendiente ||
    estado === CONSTANCIA_ESTADOS.aprobada;

  const isAprobadaDraftOnly = (estado) =>
    estado === CONSTANCIA_ESTADOS.aprobada;

  const handleAprobar = async (id) => {
    setBusyId(id);
    try {
      const row = rows.find((r) => r.id === id);
      if (row) {
        await persistComoIfNeeded(row);
        await persistFechasIfNeeded(row);
      }
      await aprobarConstancia(supabase, {
        solicitudId: id,
        resueltoPorId: user?.id,
        snapFuncion: String(comoById[id] ?? "").trim() || undefined,
      });
      toast.success("Constancia aprobada y PDF enviado");
      if (highlightId && String(highlightId) === String(id)) {
        const next = new URLSearchParams(searchParams);
        next.delete("solicitud");
        setSearchParams(next, { replace: true });
      }
      await load();
    } catch (err) {
      toast.error(err?.message || "No se pudo aprobar");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleReenviar = async (row) => {
    setBusyId(row.id);
    try {
      await reenviarConstanciaAprobada(supabase, { solicitudId: row.id });
      toast.success(`PDF reenviado a ${row.integrantes?.mail || "el solicitante"}`);
      await load();
    } catch (err) {
      toast.error(err?.message || "No se pudo reenviar");
    } finally {
      setBusyId(null);
    }
  };

  const handleReemitir = async (row) => {
    setBusyId(row.id);
    try {
      const draftFechas = fechasById[row.id] || {
        desde: String(row.snap_fecha_desde || "").slice(0, 10),
        hasta: String(row.snap_fecha_hasta || "").slice(0, 10),
      };
      const como =
        String(comoById[row.id] ?? "").trim() ||
        String(row.snap_funcion || "").trim();
      await reemitirConstanciaAprobada(supabase, {
        solicitudId: row.id,
        snapFuncion: como,
        fechaDesde: draftFechas.desde,
        fechaHasta: draftFechas.hasta,
        resueltoPorId: user?.id,
      });
      toast.success(
        `Constancia reemitida y enviada a ${row.integrantes?.mail || "el solicitante"}`,
      );
      await load();
    } catch (err) {
      if (err?.mailFailed && err?.solicitud) {
        toast.warning(err.message);
        await load();
      } else {
        toast.error(err?.message || "No se pudo reemitir");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDescargar = async (row) => {
    setBusyId(row.id);
    try {
      const { filename } = await descargarConstanciaPdf(row);
      toast.success(`Descargado: ${filename}`);
    } catch (err) {
      toast.error(err?.message || "No se pudo descargar el PDF");
    } finally {
      setBusyId(null);
    }
  };

  const handleAprobarTodas = async () => {
    setApprovingAll(true);
    try {
      const pendientes = rows.filter(
        (r) => r.estado === CONSTANCIA_ESTADOS.pendiente,
      );
      for (const row of pendientes) {
        try {
          await persistComoIfNeeded(row);
        } catch (err) {
          console.error("[ConstanciasHub] persist como:", err);
        }
      }
      const res = await aprobarTodasConstanciasPendientes(supabase, {
        resueltoPorId: user?.id,
        tipo: tipoFilterParam,
      });
      if (res.ok === 0 && res.fail === 0) {
        toast.message("No hay pendientes en este filtro");
      } else if (res.fail === 0) {
        toast.success(`Se aprobaron ${res.ok} solicitud${res.ok === 1 ? "" : "es"}`);
      } else {
        toast.warning(
          `Aprobadas: ${res.ok}. Fallidas: ${res.fail}. Revisá los errores.`,
        );
      }
      await load();
    } catch (err) {
      toast.error(err?.message || "Error al aprobar todas");
    } finally {
      setApprovingAll(false);
    }
  };

  const aprobarTodasLabel =
    filtroTipo === CONSTANCIA_TIPOS.participacion
      ? "Aprobar todas (participación realizada)"
      : filtroTipo === CONSTANCIA_TIPOS.convocatoria
        ? "Aprobar todas (convocatoria)"
        : "Aprobar todas";

  const confirmDenegar = async () => {
    if (!denyTarget) return;
    setBusyId(denyTarget.id);
    try {
      await denegarConstancia(supabase, {
        solicitudId: denyTarget.id,
        resueltoPorId: user?.id,
        motivo: denyMotivo,
      });
      toast.success("Solicitud denegada");
      setDenyTarget(null);
      setDenyMotivo("");
      await load();
    } catch (err) {
      toast.error(err?.message || "No se pudo denegar");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeshacerDenegacion = async () => {
    if (!undoTarget) return;
    setUndoBusy(true);
    setBusyId(undoTarget.id);
    try {
      await deshacerDenegacionConstancia(supabase, {
        solicitudId: undoTarget.id,
      });
      toast.success("Denegación deshecha: vuelve a Pendientes");
      setUndoTarget(null);
      await load();
    } catch (err) {
      toast.error(err?.message || "No se pudo deshacer");
      throw err;
    } finally {
      setUndoBusy(false);
      setBusyId(null);
    }
  };

  if (!canManage) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No tenés permiso para gestionar constancias.
      </div>
    );
  }

  const renderComoField = (r, nombre, { large = false } = {}) => {
    if (canEditComo(r.estado)) {
      const draftOnly = isAprobadaDraftOnly(r.estado);
      return (
        <div className={large ? "w-full" : "min-w-[8.5rem]"}>
          {large ? (
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              como…
            </label>
          ) : null}
          <input
            type="text"
            value={comoById[r.id] ?? ""}
            onChange={(e) =>
              setComoById((prev) => ({
                ...prev,
                [r.id]: e.target.value,
              }))
            }
            onBlur={() => {
              if (draftOnly) return;
              persistComoIfNeeded(r).catch((err) => {
                toast.error(err?.message || "No se pudo guardar «como…»");
              });
            }}
            placeholder="violinista"
            className={`w-full rounded-md border border-slate-200 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
              large ? "px-3 py-2.5 text-sm" : "px-2 py-1 text-[11px]"
            }`}
            aria-label={`como ${nombre || r.id}`}
          />
          <div
            className={`mt-0.5 text-slate-400 ${large ? "text-[11px]" : "text-[9px]"}`}
          >
            {r.snap_instrumento || ""}
            {draftOnly ? (
              <span className="ml-1 text-indigo-600">· Reemitir para aplicar</span>
            ) : null}
          </div>
        </div>
      );
    }
    return (
      <div>
        {large ? (
          <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            como…
          </div>
        ) : null}
        <div className={`font-medium text-slate-800 ${large ? "text-sm" : ""}`}>
          {r.snap_funcion ||
            String(r.snap_instrumento || "")
              .toLowerCase() ||
            "—"}
        </div>
        <div className={`text-slate-400 ${large ? "text-[11px]" : "text-[9px]"}`}>
          {r.snap_instrumento || ""}
        </div>
      </div>
    );
  };

  const renderFechasField = (r, { large = false } = {}) => {
    if (!canEditFechas(r.estado)) {
      return (
        <div className={large ? "w-full" : ""}>
          {large ? (
            <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Fechas del PDF
            </div>
          ) : null}
          <div className={`text-slate-700 ${large ? "text-sm" : ""}`}>
            {formatShortDate(r.snap_fecha_desde)} –{" "}
            {formatShortDate(r.snap_fecha_hasta)}
          </div>
        </div>
      );
    }
    const draftOnly = isAprobadaDraftOnly(r.estado);
    const draft = fechasById[r.id] || {
      desde: String(r.snap_fecha_desde || "").slice(0, 10),
      hasta: String(r.snap_fecha_hasta || "").slice(0, 10),
    };
    return (
      <FechasConstanciaEditor
        large={large}
        desde={draft.desde}
        hasta={draft.hasta}
        idIntegrante={r.id_integrante}
        idGira={r.id_gira}
        hintExtra={
          draftOnly ? "Cambios locales · Reemitir para aplicar" : null
        }
        onChange={(next) =>
          setFechasById((prev) => ({
            ...prev,
            [r.id]: next,
          }))
        }
        onPersist={() => {
          if (draftOnly) return;
          persistFechasIfNeeded(r).catch((err) => {
            toast.error(err?.message || "No se pudieron guardar las fechas");
          });
        }}
        onApplySuggestion={(sug) => {
          const next = {
            desde: sug.fechaDesde || draft.desde,
            hasta: sug.fechaHasta || sug.fechaDesde || draft.hasta,
          };
          setFechasById((prev) => ({ ...prev, [r.id]: next }));
          if (draftOnly) {
            toast.message("Fechas de logística listas · Reemitir para aplicar");
            return;
          }
          updateConstanciaSnapFechas(supabase, {
            solicitudId: r.id,
            fechaDesde: next.desde,
            fechaHasta: next.hasta,
          })
            .then((updated) => {
              setRows((prev) =>
                (prev || []).map((x) =>
                  x.id === r.id ? { ...x, ...updated } : x,
                ),
              );
              toast.success("Fechas actualizadas desde logística");
            })
            .catch((err) => {
              toast.error(err?.message || "No se pudieron guardar las fechas");
            });
        }}
      />
    );
  };

  const renderActions = (r, { large = false } = {}) => {
    const btnPad = large ? "px-3 py-2.5 text-xs" : "px-2 py-1 text-[10px]";
    const iconSz = large ? 14 : 12;
    if (r.estado === CONSTANCIA_ESTADOS.pendiente) {
      return (
        <div className={`flex gap-2 ${large ? "w-full" : "flex-wrap"}`}>
          <button
            type="button"
            disabled={busyId === r.id || !String(comoById[r.id] || "").trim()}
            onClick={() => handleAprobar(r.id)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 font-bold text-white hover:bg-emerald-700 disabled:opacity-50 ${btnPad}`}
          >
            {busyId === r.id ? (
              <IconLoader size={iconSz} className="animate-spin" />
            ) : (
              <IconCheck size={iconSz} />
            )}
            Aprobar
          </button>
          <button
            type="button"
            disabled={busyId === r.id}
            onClick={() => {
              setDenyTarget(r);
              setDenyMotivo("");
            }}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 ${btnPad}`}
          >
            <IconX size={iconSz} />
            Denegar
          </button>
        </div>
      );
    }
    if (r.estado === CONSTANCIA_ESTADOS.aprobada) {
      const comoOk = Boolean(String(comoById[r.id] ?? r.snap_funcion ?? "").trim());
      const fechasDraft = fechasById[r.id] || {
        desde: String(r.snap_fecha_desde || "").slice(0, 10),
        hasta: String(r.snap_fecha_hasta || "").slice(0, 10),
      };
      const fechasOk = Boolean(fechasDraft.desde);
      const por = labelResueltoPor(r);
      return (
        <div className={`flex flex-col gap-1 ${large ? "w-full" : ""}`}>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <IconFileText size={12} />
              {formatShortDate(r.reemitida_at || r.resuelto_at)}
              {por
                ? ` · ${r.reemitida_at ? "reemitió" : "emitió"} ${por}`
                : ""}
            </span>
            {r.reemitida_at ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-700">
                Reemitida
              </span>
            ) : null}
          </div>
          <div className={`flex gap-2 ${large ? "w-full flex-wrap" : "flex-wrap"}`}>
            <button
              type="button"
              disabled={busyId === r.id || !r.integrantes?.mail || !comoOk || !fechasOk}
              title="Guarda fechas/rol, regenera el PDF y avisa al músico"
              onClick={() => handleReemitir(r)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 font-bold text-white hover:bg-indigo-700 disabled:opacity-50 ${btnPad}`}
            >
              {busyId === r.id ? (
                <IconLoader size={iconSz} className="animate-spin" />
              ) : (
                <IconRepeat size={iconSz} />
              )}
              Reemitir
            </button>
            <button
              type="button"
              disabled={busyId === r.id || !r.integrantes?.mail}
              title={
                r.integrantes?.mail
                  ? `Reenviar a ${r.integrantes.mail}`
                  : "Sin email cargado"
              }
              onClick={() => handleReenviar(r)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 ${btnPad}`}
            >
              {busyId === r.id ? (
                <IconLoader size={iconSz} className="animate-spin" />
              ) : (
                <IconMail size={iconSz} />
              )}
              Reenviar
            </button>
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => handleDescargar(r)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${btnPad}`}
            >
              {busyId === r.id ? (
                <IconLoader size={iconSz} className="animate-spin" />
              ) : (
                <IconDownload size={iconSz} />
              )}
              Descargar
            </button>
          </div>
        </div>
      );
    }
    const porDenegacion = labelResueltoPor(r);
    return (
      <div className={`flex flex-col gap-1 ${large ? "w-full" : ""}`}>
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
          <IconFileText size={12} />
          {formatShortDate(r.resuelto_at)}
          {porDenegacion ? ` · denegó ${porDenegacion}` : ""}
        </span>
        <button
          type="button"
          disabled={busyId === r.id}
          onClick={() => setUndoTarget(r)}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50 ${btnPad} ${large ? "w-full" : ""}`}
        >
          {busyId === r.id ? (
            <IconLoader size={iconSz} className="animate-spin" />
          ) : (
            <IconUndo size={iconSz} />
          )}
          Deshacer
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/80 p-1">
            {[
              { id: "pendiente", label: "Pendientes" },
              { id: "aprobada", label: "Aprobadas" },
              { id: "denegada", label: "Denegadas" },
              { id: "todas", label: "Todas" },
            ].map((f) => {
              const active = filtro === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${filtroEstadoChipClass(f.id, active)}`}
                >
                  {f.label}
                  {f.id === "pendiente" ? (
                    <span
                      className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
                        active
                          ? "bg-amber-600 text-white"
                          : "bg-amber-200/90 text-amber-950"
                      }`}
                    >
                      {pendientesCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200/80 bg-white p-1">
            {[
              { id: "todas", label: "Todos los tipos" },
              {
                id: CONSTANCIA_TIPOS.convocatoria,
                label: CONSTANCIA_TIPO_LABEL_SHORT.convocatoria,
              },
              {
                id: CONSTANCIA_TIPOS.participacion,
                label: CONSTANCIA_TIPO_LABEL_SHORT.participacion,
              },
            ].map((f) => {
              const active = filtroTipo === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroTipo(f.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${filtroTipoChipClass(f.id, active)}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            <IconPlus size={14} />
            Generar
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <IconRefresh size={14} />
            Actualizar
          </button>
          {(filtro === "pendiente" || filtro === "todas") && (
            <button
              type="button"
              disabled={approvingAll || (filtro === "pendiente" && pendientesCount === 0)}
              onClick={handleAprobarTodas}
              title={
                filtroTipo === "todas"
                  ? "Aprueba todas las pendientes visibles en este listado"
                  : `Aprueba las pendientes de ${CONSTANCIA_TIPO_LABEL[filtroTipo] || filtroTipo}`
              }
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {approvingAll ? (
                <IconLoader size={14} className="animate-spin" />
              ) : (
                <IconCheck size={14} />
              )}
              {aprobarTodasLabel}
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto md:rounded-lg md:border md:border-slate-200 md:bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-sm text-slate-500 md:border-0">
            <IconLoader size={16} className="animate-spin" />
            Cargando…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 md:border-0">
            No hay solicitudes en este filtro.
          </div>
        ) : (
          <>
            {/* Móvil: tarjetas con acciones grandes */}
            <ul className="flex flex-col gap-3 pb-2 md:hidden">
              {rows.map((r) => {
                const highlighted =
                  highlightId && String(highlightId) === String(r.id);
                const nombre = [r.snap_nombre, r.snap_apellido]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <li
                    key={r.id}
                    data-constancia-id={r.id}
                    className={`rounded-xl border bg-white p-3.5 shadow-sm ${
                      highlighted
                        ? "border-indigo-300 ring-2 ring-indigo-200"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-base font-bold text-slate-900">
                          {nombre || "—"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          #{r.id} · DNI {r.snap_dni || "—"}
                        </div>
                        {r.integrantes?.mail ? (
                          <div className="truncate text-[11px] text-slate-400">
                            {r.integrantes.mail}
                          </div>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${estadoClass(r.estado)}`}
                      >
                        {CONSTANCIA_ESTADO_LABEL[r.estado] || r.estado}
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          r.tipo === CONSTANCIA_TIPOS.participacion
                            ? "border-sky-200 bg-sky-50 text-sky-800"
                            : "border-violet-200 bg-violet-50 text-violet-800"
                        }`}
                      >
                        {CONSTANCIA_TIPO_LABEL_SHORT[r.tipo] ||
                          CONSTANCIA_TIPO_LABEL_SHORT.convocatoria}
                      </span>
                    </div>

                    <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2">
                      <div className="text-sm font-semibold text-slate-800">
                        {r.snap_gira_nombre || "—"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {[r.snap_gira_tipo, r.snap_localidades]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>

                    {r.estado === CONSTANCIA_ESTADOS.denegada &&
                    r.motivo_denegacion ? (
                      <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-2 text-[12px] text-rose-700">
                        {r.motivo_denegacion}
                      </div>
                    ) : null}

                    <div className="mt-3">
                      {renderComoField(r, nombre, { large: true })}
                    </div>
                    <div className="mt-3">
                      {renderFechasField(r, { large: true })}
                    </div>
                    <div className="mt-3">
                      {renderActions(r, { large: true })}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop: tabla */}
            <table className="hidden min-w-full text-left text-xs md:table">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">#</th>
                  <th className="px-3 py-2 font-bold">Solicitante</th>
                  <th className="px-3 py-2 font-bold">Tipo</th>
                  <th className="px-3 py-2 font-bold">Gira</th>
                  <th className="px-3 py-2 font-bold">como…</th>
                  <th className="px-3 py-2 font-bold">Fechas</th>
                  <th className="px-3 py-2 font-bold">Estado</th>
                  <th className="px-3 py-2 font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const highlighted =
                    highlightId && String(highlightId) === String(r.id);
                  const nombre = [r.snap_nombre, r.snap_apellido]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr
                      key={r.id}
                      data-constancia-id={r.id}
                      className={`border-t border-slate-100 ${
                        highlighted
                          ? "bg-indigo-50/80"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-slate-500">
                        {r.id}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-800">
                          {nombre || "—"}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          DNI {r.snap_dni || "—"} ·{" "}
                          {r.integrantes?.mail || "sin mail"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            r.tipo === CONSTANCIA_TIPOS.participacion
                              ? "border-sky-200 bg-sky-50 text-sky-800"
                              : "border-violet-200 bg-violet-50 text-violet-800"
                          }`}
                        >
                          {CONSTANCIA_TIPO_LABEL_SHORT[r.tipo] ||
                            CONSTANCIA_TIPO_LABEL_SHORT.convocatoria}
                        </span>
                        <div className="mt-0.5 text-[9px] text-slate-400">
                          {CONSTANCIA_TIPO_LABEL[r.tipo] || ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">
                          {r.snap_gira_nombre || "—"}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {r.snap_gira_tipo || ""} · {r.snap_localidades || ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">
                        {renderComoField(r, nombre)}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-600">
                        {renderFechasField(r)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${estadoClass(r.estado)}`}
                        >
                          {CONSTANCIA_ESTADO_LABEL[r.estado] || r.estado}
                        </span>
                        {r.estado === CONSTANCIA_ESTADOS.denegada &&
                          r.motivo_denegacion && (
                            <div className="mt-1 max-w-[12rem] text-[10px] text-rose-600">
                              {r.motivo_denegacion}
                            </div>
                          )}
                      </td>
                      <td className="px-3 py-2">{renderActions(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {denyTarget &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-3">
            <div className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:rounded-xl">
              <h3 className="text-base font-bold text-slate-800 sm:text-sm">
                Denegar solicitud #{denyTarget.id}
              </h3>
              <p className="mt-1 text-sm text-slate-500 sm:text-xs">
                El motivo se envía por mail al solicitante y queda visible en Mis
                Constancias.
              </p>
              <textarea
                value={denyMotivo}
                onChange={(e) => setDenyMotivo(e.target.value)}
                rows={4}
                placeholder="Escribí el motivo…"
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-3 text-base focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 sm:py-2 sm:text-sm"
              />
              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDenyTarget(null);
                    setDenyMotivo("");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 sm:py-1.5 sm:text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!denyMotivo.trim() || busyId === denyTarget.id}
                  onClick={confirmDenegar}
                  className="rounded-lg bg-rose-600 px-3 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 sm:py-1.5 sm:text-xs"
                >
                  Confirmar denegación
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <ConfirmModal
        isOpen={Boolean(undoTarget)}
        onClose={() => {
          if (undoBusy) return;
          setUndoTarget(null);
        }}
        title="Deshacer denegación"
        message={
          undoTarget
            ? `¿Confirmás volver la solicitud #${undoTarget.id} a Pendientes? No se envía mail.`
            : ""
        }
        confirmText="Deshacer"
        confirmLoading={undoBusy}
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        onConfirm={confirmDeshacerDenegacion}
      />

      {createOpen && (
        <GenerarConstanciaModal
          resueltoPorId={user?.id}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            setFiltro("aprobada");
            await load({ filtro: "aprobada" });
          }}
        />
      )}
    </div>
  );
}

function foldSearch(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function FechasConstanciaEditor({
  large = false,
  desde,
  hasta,
  idIntegrante,
  idGira,
  onChange,
  onPersist,
  onApplySuggestion,
  autoSuggest = true,
  hintExtra = null,
}) {
  const [logBusy, setLogBusy] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    if (!autoSuggest || !idIntegrante || !idGira) {
      setSuggestion(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLogBusy(true);
      try {
        const sug = await suggestConstanciaFechasFromLogistics(supabase, {
          idIntegrante,
          idGira,
        });
        if (!cancelled) setSuggestion(sug);
      } catch {
        if (!cancelled) {
          setSuggestion({
            isLocal: null,
            label: "No se pudo calcular la logística.",
            reason: "error",
          });
        }
      } finally {
        if (!cancelled) setLogBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoSuggest, idIntegrante, idGira]);

  const canApply =
    suggestion &&
    suggestion.isLocal === false &&
    (suggestion.fechaDesde || suggestion.fechaHasta);

  const inputClass = large
    ? "w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    : "w-[8.5rem] rounded-md border border-slate-200 px-1.5 py-1 text-[11px] text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400";

  return (
    <div className={large ? "w-full" : "min-w-[11rem]"}>
      {large ? (
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Fechas del PDF
        </label>
      ) : null}
      <div className={`flex ${large ? "flex-col gap-2 sm:flex-row sm:items-center" : "flex-col gap-1"}`}>
        <input
          type="date"
          value={desde || ""}
          onChange={(e) =>
            onChange({
              desde: e.target.value,
              hasta: hasta || e.target.value,
            })
          }
          onBlur={onPersist}
          className={inputClass}
          aria-label="Fecha desde"
        />
        <span className="hidden text-slate-400 sm:inline">–</span>
        <input
          type="date"
          value={hasta || ""}
          onChange={(e) =>
            onChange({
              desde: desde || e.target.value,
              hasta: e.target.value,
            })
          }
          onBlur={onPersist}
          className={inputClass}
          aria-label="Fecha hasta"
        />
      </div>
      <div
        className={`mt-1 text-slate-500 ${large ? "text-[11px]" : "text-[9px]"}`}
      >
        {hintExtra ? (
          <div className="mb-0.5 font-medium text-indigo-600">{hintExtra}</div>
        ) : null}
        {logBusy ? (
          <span className="inline-flex items-center gap-1">
            <IconLoader size={11} className="animate-spin" />
            Calculando logística…
          </span>
        ) : suggestion?.label ? (
          <div className="flex flex-col gap-1">
            <span>{suggestion.label}</span>
            {canApply ? (
              <button
                type="button"
                onClick={() => onApplySuggestion?.(suggestion)}
                className="w-fit text-left font-bold text-indigo-700 hover:underline"
              >
                Usar fechas de logística
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GenerarConstanciaModal({ resueltoPorId, onClose, onCreated }) {
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [query, setQuery] = useState("");
  const [persona, setPersona] = useState(null);
  const [tipo, setTipo] = useState(CONSTANCIA_TIPOS.convocatoria);
  const [giras, setGiras] = useState([]);
  const [loadingGiras, setLoadingGiras] = useState(false);
  const [idGira, setIdGira] = useState("");
  const [como, setComo] = useState("");
  const [instrumento, setInstrumento] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [mail, setMail] = useState("");
  const [legalLabel, setLegalLabel] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPeople(true);
      const { data, error } = await supabase
        .from("integrantes")
        .select(
          "id, nombre, apellido, nombre_preferencia, apellido_preferencia, mail, es_simulacion",
        )
        .eq("es_simulacion", false)
        .order("apellido", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error(error.message || "No se pudo cargar el padrón");
        setPeople([]);
      } else {
        setPeople(data || []);
      }
      setLoadingPeople(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPeople = useMemo(() => {
    const q = foldSearch(query.trim());
    if (!q) return people.slice(0, 40);
    return people
      .filter((p) => {
        const blob = foldSearch(
          `${p.apellido || ""} ${p.nombre || ""} ${p.apellido_preferencia || ""} ${p.nombre_preferencia || ""} ${p.mail || ""}`,
        );
        return blob.includes(q);
      })
      .slice(0, 40);
  }, [people, query]);

  useEffect(() => {
    if (!persona?.id || !tipo) {
      setGiras([]);
      setIdGira("");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingGiras(true);
      setIdGira("");
      setComo("");
      setInstrumento("");
      setFechaDesde("");
      setFechaHasta("");
      setMail(persona.mail || "");
      setLegalLabel(legalApellidoNombre(persona));
      try {
        const list = await listGirasElegiblesConstancia(supabase, persona.id, {
          tipo,
        });
        if (!cancelled) setGiras(list || []);
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.message || "No se pudieron cargar las giras");
          setGiras([]);
        }
      } finally {
        if (!cancelled) setLoadingGiras(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persona?.id, tipo]);

  useEffect(() => {
    if (!persona?.id || !idGira) {
      setComo("");
      setInstrumento("");
      setFechaDesde("");
      setFechaHasta("");
      return;
    }
    let cancelled = false;
    (async () => {
      setPreviewBusy(true);
      try {
        const [prev, sug] = await Promise.all([
          previewConstanciaGestion(supabase, {
            idIntegrante: persona.id,
            idGira: Number(idGira),
          }),
          suggestConstanciaFechasFromLogistics(supabase, {
            idIntegrante: persona.id,
            idGira: Number(idGira),
          }).catch(() => null),
        ]);
        if (cancelled) return;
        setComo(String(prev.snap_funcion || "").trim());
        setInstrumento(String(prev.snap_instrumento || "").trim());
        const baseDesde = String(prev.snap_fecha_desde || "").slice(0, 10);
        const baseHasta = String(prev.snap_fecha_hasta || "").slice(0, 10);
        if (sug && sug.isLocal === false && (sug.fechaDesde || sug.fechaHasta)) {
          setFechaDesde(sug.fechaDesde || baseDesde);
          setFechaHasta(sug.fechaHasta || sug.fechaDesde || baseHasta);
        } else {
          setFechaDesde(baseDesde);
          setFechaHasta(baseHasta);
        }
        setMail(prev.mail || persona.mail || "");
        setLegalLabel(
          [prev.snap_apellido, prev.snap_nombre].filter(Boolean).join(", ") ||
            legalApellidoNombre(persona),
        );
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.message || "No se pudo armar el preview");
        }
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persona?.id, idGira]);

  const handleGenerar = async () => {
    if (!persona?.id) {
      toast.error("Elegí una persona");
      return;
    }
    if (!idGira) {
      toast.error("Elegí una gira");
      return;
    }
    if (!String(como || "").trim()) {
      toast.error("Indicá el texto «como …»");
      return;
    }
    setSaving(true);
    try {
      const row = await generarConstanciaGestion(supabase, {
        idIntegrante: persona.id,
        idGira: Number(idGira),
        tipo,
        snapFuncion: como,
        resueltoPorId,
        fechaDesde,
        fechaHasta,
      });
      toast.success(
        `Constancia #${row.id} generada y enviada a ${row.integrantes?.mail || mail}`,
      );
      await onCreated?.(row);
    } catch (err) {
      if (err?.mailFailed && err?.solicitud) {
        toast.warning(err.message);
        await onCreated?.(err.solicitud);
      } else {
        toast.error(err?.message || "No se pudo generar");
      }
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-3">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 sm:text-sm">
              Generar constancia
            </h3>
            <p className="text-[11px] text-slate-500">
              Queda aprobada, se envía el PDF por mail y aparece en Mis
              Constancias.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Persona
            </label>
            {persona ? (
              <div className="flex items-start justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900">
                    {seatingApellidoNombre(persona)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Legal: {legalLabel || legalApellidoNombre(persona)}
                    {mail ? ` · ${mail}` : " · sin mail"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPersona(null);
                    setQuery("");
                    setIdGira("");
                    setGiras([]);
                  }}
                  className="shrink-0 text-[11px] font-bold text-indigo-700 hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por apellido, nombre o mail…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  autoFocus
                />
                <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-slate-200">
                  {loadingPeople ? (
                    <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                      <IconLoader size={14} className="animate-spin" />
                      Cargando padrón…
                    </div>
                  ) : filteredPeople.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-slate-400">
                      Sin resultados
                    </div>
                  ) : (
                    <ul>
                      {filteredPeople.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setPersona(p);
                              setQuery("");
                            }}
                            className="flex w-full flex-col items-start border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50 last:border-0"
                          >
                            <span className="text-sm font-semibold text-slate-800">
                              {seatingApellidoNombre(p)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {legalApellidoNombre(p)}
                              {p.mail ? ` · ${p.mail}` : ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Tipo
            </label>
            <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[
                {
                  id: CONSTANCIA_TIPOS.convocatoria,
                  label: CONSTANCIA_TIPO_LABEL_SHORT.convocatoria,
                },
                {
                  id: CONSTANCIA_TIPOS.participacion,
                  label: CONSTANCIA_TIPO_LABEL_SHORT.participacion,
                },
              ].map((t) => {
                const active = tipo === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!persona}
                    onClick={() => setTipo(t.id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-40 ${filtroTipoChipClass(t.id, active)}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Gira
            </label>
            <select
              value={idGira}
              disabled={!persona || loadingGiras}
              onChange={(e) => setIdGira(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-slate-50 disabled:opacity-60"
            >
              <option value="">
                {loadingGiras
                  ? "Cargando giras…"
                  : !persona
                    ? "Elegí primero una persona"
                    : giras.length === 0
                      ? "Sin giras elegibles"
                      : "Elegí una gira…"}
              </option>
              {giras.map((g) => (
                <option key={g.id} value={g.id}>
                  {formatProgramSelectLabel(g)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              como…
            </label>
            <div className="relative">
              <input
                type="text"
                value={como}
                onChange={(e) => setComo(e.target.value)}
                disabled={!idGira || previewBusy}
                placeholder="violinista"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-slate-50"
              />
              {previewBusy ? (
                <IconLoader
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                />
              ) : null}
            </div>
            {instrumento ? (
              <div className="mt-0.5 text-[11px] text-slate-400">
                Instrumento: {instrumento}
              </div>
            ) : null}
          </div>

          {persona && idGira ? (
            <FechasConstanciaEditor
              large
              desde={fechaDesde}
              hasta={fechaHasta}
              idIntegrante={persona.id}
              idGira={Number(idGira)}
              onChange={({ desde, hasta }) => {
                setFechaDesde(desde);
                setFechaHasta(hasta);
              }}
              onPersist={() => {}}
              onApplySuggestion={(sug) => {
                setFechaDesde(sug.fechaDesde || fechaDesde);
                setFechaHasta(
                  sug.fechaHasta || sug.fechaDesde || fechaHasta,
                );
              }}
            />
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-3 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 sm:py-2 sm:text-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={
              saving ||
              !persona ||
              !idGira ||
              !String(como || "").trim() ||
              previewBusy
            }
            onClick={handleGenerar}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 sm:py-2 sm:text-xs"
          >
            {saving ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconCheck size={14} />
            )}
            Generar y enviar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
