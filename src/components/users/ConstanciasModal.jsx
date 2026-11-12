import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconX,
  IconLoader,
  IconFileText,
  IconCheck,
  IconAlertCircle,
  IconMail,
  IconDownload,
} from "../ui/Icons";
import {
  CONSTANCIA_ESTADO_LABEL,
  CONSTANCIA_ESTADOS,
  CONSTANCIA_MODO_PARA_FIRMAR,
  CONSTANCIA_TIPOS,
  CONSTANCIA_TIPO_LABEL_SHORT,
} from "../../constants/constancias";
import {
  listGirasElegiblesConstancia,
  listMisConstancias,
  markConstanciasVistas,
  solicitarConstancia,
  reenviarConstanciaAprobada,
  descargarConstanciaPdf,
  descargarConstanciaParticipacionParaFirmar,
  suggestConstanciaFechasFromLogistics,
} from "../../services/constanciasService";
import {
  formatProgramNomenMes,
  formatProgramSelectLabel,
} from "../../utils/giraUtils";

function isoDay(value) {
  const s = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

const SOLICITUDES_PAGE_SIZE = 5;

function estadoBadgeClass(estado) {
  if (estado === CONSTANCIA_ESTADOS.aprobada) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (estado === CONSTANCIA_ESTADOS.denegada) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function tipoBadgeClass(tipo) {
  if (tipo === CONSTANCIA_TIPOS.participacion) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }
  if (tipo === CONSTANCIA_MODO_PARA_FIRMAR) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-violet-200 bg-violet-50 text-violet-800";
}

function isModoParaFirmar(tipo) {
  return tipo === CONSTANCIA_MODO_PARA_FIRMAR;
}

function formatShortDate(iso) {
  if (!iso) return "—";
  const d = String(iso).slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function solicitudKey(idGira, tipo) {
  return `${idGira}:${tipo || CONSTANCIA_TIPOS.convocatoria}`;
}

/** Más recientes primero (solicitado_at). */
function sortSolicitudesRecientes(list) {
  return [...(list || [])].sort((a, b) =>
    String(b.solicitado_at || "").localeCompare(String(a.solicitado_at || "")),
  );
}

function formatSolicitudGiraMeta(s) {
  const prog = s?.programas || {};
  const meta = formatProgramNomenMes({
    mes_letra: prog.mes_letra,
    nomenclador: prog.nomenclador,
    zona: prog.zona,
  });
  const desde = s.snap_fecha_desde || prog.fecha_desde;
  const hasta = s.snap_fecha_hasta || prog.fecha_hasta;
  const fechas =
    desde || hasta
      ? `${formatShortDate(desde)}–${formatShortDate(hasta)}`
      : "";
  return [meta, fechas].filter(Boolean).join(" · ");
}

export default function ConstanciasModal({
  isOpen,
  onClose,
  user,
  supabase,
  isEditor = false,
  pendientesGestion = 0,
  onOpenGestion,
  onBadgeChange,
}) {
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [loadingGiras, setLoadingGiras] = useState(false);
  const [saving, setSaving] = useState(false);
  const [giras, setGiras] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  /** Vacío hasta que elija Convocatoria / Participación / Para firmar. */
  const [tipo, setTipo] = useState("");
  const [idGira, setIdGira] = useState("");
  const [visibleSolicitudes, setVisibleSolicitudes] = useState(
    SOLICITUDES_PAGE_SIZE,
  );
  const [busySolicitudId, setBusySolicitudId] = useState(null);
  const [logistica, setLogistica] = useState(null);
  const [loadingLogistica, setLoadingLogistica] = useState(false);
  const [incluirDiaSalida, setIncluirDiaSalida] = useState(false);
  const [incluirDiaRegreso, setIncluirDiaRegreso] = useState(false);

  const yaPedidas = useMemo(() => {
    const map = new Map();
    (solicitudes || []).forEach((s) => {
      map.set(solicitudKey(s.id_gira, s.tipo), s);
    });
    return map;
  }, [solicitudes]);

  const girasDisponibles = useMemo(() => {
    if (!tipo) return [];
    // Para firmar: no hay solicitud; todas las elegibles quedan disponibles.
    if (isModoParaFirmar(tipo)) return giras || [];
    return (giras || []).filter((g) => {
      const prev = yaPedidas.get(solicitudKey(g.id, tipo));
      if (!prev) return true;
      return prev.estado === CONSTANCIA_ESTADOS.denegada;
    });
  }, [giras, yaPedidas, tipo]);

  const solicitudesOrdenadas = useMemo(
    () => sortSolicitudesRecientes(solicitudes),
    [solicitudes],
  );

  const solicitudesVisibles = useMemo(
    () => solicitudesOrdenadas.slice(0, visibleSolicitudes),
    [solicitudesOrdenadas, visibleSolicitudes],
  );

  const hayMasSolicitudes =
    visibleSolicitudes < solicitudesOrdenadas.length;

  // Al abrir: solo solicitudes (pendientes/aprobadas primero en el listado).
  useEffect(() => {
    if (!isOpen || !user?.id || !supabase) return undefined;
    let cancelled = false;
    setTipo("");
    setIdGira("");
    setGiras([]);
    setLogistica(null);
    setIncluirDiaSalida(false);
    setIncluirDiaRegreso(false);
    setVisibleSolicitudes(SOLICITUDES_PAGE_SIZE);
    (async () => {
      setLoadingSolicitudes(true);
      try {
        const s = await listMisConstancias(supabase, user.id);
        if (cancelled) return;
        setSolicitudes(s);
        setVisibleSolicitudes(SOLICITUDES_PAGE_SIZE);
        await markConstanciasVistas(supabase, user.id);
        onBadgeChange?.();
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "No se pudieron cargar las constancias");
      } finally {
        if (!cancelled) setLoadingSolicitudes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id, supabase, onBadgeChange]);

  // Giras solo cuando eligió tipo.
  useEffect(() => {
    if (!isOpen || !user?.id || !supabase || !tipo) {
      setGiras([]);
      setLoadingGiras(false);
      return undefined;
    }
    let cancelled = false;
    setIdGira("");
    setLogistica(null);
    setIncluirDiaSalida(false);
    setIncluirDiaRegreso(false);
    (async () => {
      setLoadingGiras(true);
      try {
        const g = await listGirasElegiblesConstancia(supabase, user.id, { tipo });
        if (cancelled) return;
        setGiras(g);
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "No se pudieron cargar las giras");
        if (!cancelled) setGiras([]);
      } finally {
        if (!cancelled) setLoadingGiras(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id, supabase, tipo]);

  // Logística de viaje al elegir gira (solo no locales con ↑/↓ fuera del rango del programa).
  useEffect(() => {
    if (!isOpen || !user?.id || !supabase || !idGira) {
      setLogistica(null);
      setIncluirDiaSalida(false);
      setIncluirDiaRegreso(false);
      setLoadingLogistica(false);
      return undefined;
    }
    let cancelled = false;
    setIncluirDiaSalida(false);
    setIncluirDiaRegreso(false);
    (async () => {
      setLoadingLogistica(true);
      try {
        const gira = (giras || []).find(
          (g) => String(g.id) === String(idGira),
        );
        const sug = await suggestConstanciaFechasFromLogistics(supabase, {
          idIntegrante: user.id,
          idGira: Number(idGira),
        });
        if (cancelled) return;
        const progDesde = isoDay(gira?.fecha_desde);
        const progHasta = isoDay(gira?.fecha_hasta) || progDesde;
        const logDesde = isoDay(sug?.fechaDesde);
        const logHasta = isoDay(sug?.fechaHasta);
        const puedeSalida =
          sug?.isLocal === false &&
          Boolean(logDesde && progDesde && logDesde < progDesde);
        const puedeRegreso =
          sug?.isLocal === false &&
          Boolean(logHasta && progHasta && logHasta > progHasta);
        setLogistica({
          ...sug,
          progDesde,
          progHasta,
          puedeSalida,
          puedeRegreso,
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setLogistica(null);
      } finally {
        if (!cancelled) setLoadingLogistica(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id, supabase, idGira, giras]);

  if (!isOpen) return null;

  const refreshSolicitudes = async () => {
    const s = await listMisConstancias(supabase, user.id);
    setSolicitudes(s);
    onBadgeChange?.();
  };

  const refreshGiras = async () => {
    if (!tipo) return;
    const g = await listGirasElegiblesConstancia(supabase, user.id, { tipo });
    setGiras(g);
  };

  const handleSolicitar = async () => {
    if (!tipo) {
      toast.error("Elegí el tipo de constancia");
      return;
    }
    if (!idGira) {
      toast.error("Elegí una gira");
      return;
    }
    if (isModoParaFirmar(tipo)) {
      setSaving(true);
      try {
        const { filename } = await descargarConstanciaParticipacionParaFirmar(
          supabase,
          {
            idIntegrante: user.id,
            idGira: Number(idGira),
            incluirDiaSalida:
              Boolean(incluirDiaSalida) && Boolean(logistica?.puedeSalida),
            incluirDiaRegreso:
              Boolean(incluirDiaRegreso) && Boolean(logistica?.puedeRegreso),
          },
        );
        toast.success(
          `Descargado: ${filename}. Imprimila y llévala: te la firman en persona.`,
        );
      } catch (err) {
        toast.error(err?.message || "No se pudo descargar la plantilla");
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    try {
      await solicitarConstancia(supabase, {
        user,
        idGira: Number(idGira),
        tipo,
        incluirDiaSalida:
          Boolean(incluirDiaSalida) && Boolean(logistica?.puedeSalida),
        incluirDiaRegreso:
          Boolean(incluirDiaRegreso) && Boolean(logistica?.puedeRegreso),
      });
      toast.success(
        "Solicitud enviada. Queda pendiente de revisión: vas a recibir el PDF por mail cuando la aprueben.",
      );
      setIdGira("");
      setIncluirDiaSalida(false);
      setIncluirDiaRegreso(false);
      await refreshSolicitudes();
      await refreshGiras();
    } catch (err) {
      if (err?.mailFailed && err?.solicitud) {
        toast.warning(err.message);
        setIdGira("");
        setIncluirDiaSalida(false);
        setIncluirDiaRegreso(false);
        await refreshSolicitudes();
        await refreshGiras();
      } else {
        toast.error(err?.message || "No se pudo solicitar");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReenviar = async (row) => {
    const mail = row.integrantes?.mail || user?.mail || "";
    if (!mail) {
      toast.error("No tenés email cargado en el perfil");
      return;
    }
    setBusySolicitudId(row.id);
    try {
      await reenviarConstanciaAprobada(supabase, { solicitudId: row.id });
      toast.success(`PDF reenviado a ${mail}`);
      await refreshSolicitudes();
    } catch (err) {
      toast.error(err?.message || "No se pudo reenviar");
    } finally {
      setBusySolicitudId(null);
    }
  };

  const handleDescargar = async (row) => {
    setBusySolicitudId(row.id);
    try {
      const { filename } = await descargarConstanciaPdf(row);
      toast.success(`Descargado: ${filename}`);
    } catch (err) {
      toast.error(err?.message || "No se pudo descargar el PDF");
    } finally {
      setBusySolicitudId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <IconFileText size={18} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">Mis Constancias</h2>
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {isEditor && pendientesGestion > 0 && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGestion?.();
              }}
              className="flex w-full items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-left text-xs font-bold text-indigo-800 hover:bg-indigo-100"
            >
              <span>
                {pendientesGestion} solicitud
                {pendientesGestion === 1 ? "" : "es"} abierta
                {pendientesGestion === 1 ? "" : "s"} en Gestión
              </span>
              <span className="underline">Gestionar</span>
            </button>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
              Mis solicitudes
            </h3>
            {loadingSolicitudes && solicitudesOrdenadas.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <IconLoader size={14} className="animate-spin" /> Cargando
                solicitudes…
              </div>
            ) : solicitudesOrdenadas.length === 0 ? (
              <p className="text-xs text-slate-400">Todavía no pediste ninguna.</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {solicitudesVisibles.map((s) => {
                    const giraMeta = formatSolicitudGiraMeta(s);
                    return (
                      <li
                        key={s.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">
                              {s.snap_gira_nombre ||
                                s.programas?.nombre_gira ||
                                `Gira #${s.id_gira}`}
                            </p>
                            {giraMeta ? (
                              <p className="truncate text-[11px] text-slate-600">
                                {giraMeta}
                              </p>
                            ) : null}
                            <p className="text-[11px] text-slate-500">
                              {s.snap_funcion
                                ? `como ${s.snap_funcion}`
                                : s.snap_instrumento || "—"}{" "}
                              · pedida {formatShortDate(s.solicitado_at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${tipoBadgeClass(s.tipo)}`}
                            >
                              {CONSTANCIA_TIPO_LABEL_SHORT[s.tipo] ||
                                CONSTANCIA_TIPO_LABEL_SHORT.convocatoria}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${estadoBadgeClass(s.estado)}`}
                            >
                              {CONSTANCIA_ESTADO_LABEL[s.estado] || s.estado}
                            </span>
                          </div>
                        </div>
                        {s.estado === CONSTANCIA_ESTADOS.pendiente && (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-700">
                            <IconAlertCircle size={12} />
                            En espera de aprobación. Te llegará el PDF por mail.
                          </p>
                        )}
                        {s.estado === CONSTANCIA_ESTADOS.aprobada && (
                          <div className="mt-1.5 space-y-1.5">
                            <p className="flex flex-wrap items-center gap-1 text-[11px] text-emerald-700">
                              <IconCheck size={12} />
                              Aprobada
                              {s.reemitida_at ? (
                                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                                  Reemitida {formatShortDate(s.reemitida_at)}
                                </span>
                              ) : null}
                              {s.mail_enviado_at
                                ? " · PDF enviado por mail"
                                : s.mail_error
                                  ? ` · aviso mail: ${s.mail_error}`
                                  : ""}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                disabled={
                                  busySolicitudId === s.id ||
                                  !(s.integrantes?.mail || user?.mail)
                                }
                                title={
                                  s.integrantes?.mail || user?.mail
                                    ? `Reenviar a ${s.integrantes?.mail || user?.mail}`
                                    : "Sin email cargado"
                                }
                                onClick={() => handleReenviar(s)}
                                className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                              >
                                {busySolicitudId === s.id ? (
                                  <IconLoader
                                    size={12}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <IconMail size={12} />
                                )}
                                Reenviar
                              </button>
                              <button
                                type="button"
                                disabled={busySolicitudId === s.id}
                                onClick={() => handleDescargar(s)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                {busySolicitudId === s.id ? (
                                  <IconLoader
                                    size={12}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <IconDownload size={12} />
                                )}
                                Descargar
                              </button>
                            </div>
                          </div>
                        )}
                        {s.estado === CONSTANCIA_ESTADOS.denegada && (
                          <p className="mt-1.5 text-[11px] text-rose-700">
                            Motivo: {s.motivo_denegacion || "—"}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {hayMasSolicitudes ? (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleSolicitudes((n) => n + SOLICITUDES_PAGE_SIZE)
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Mostrar más (
                    {solicitudesOrdenadas.length - visibleSolicitudes}{" "}
                    restantes)
                  </button>
                ) : null}
              </>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
              {isModoParaFirmar(tipo) ? "Imprimir plantilla" : "Nueva solicitud"}
            </h3>
            <p className="text-[11px] leading-snug text-slate-500">
              Elegí el tipo de documento. Podés pedir una convocatoria y una
              participación realizada por gira (sinfónico / camerata). La
              plantilla «para firmar» se descarga al instante, sin solicitud.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setTipo(CONSTANCIA_TIPOS.convocatoria)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  tipo === CONSTANCIA_TIPOS.convocatoria
                    ? `border-violet-300 bg-violet-50 ring-2 ring-violet-200/80 ${
                        loadingGiras ? "animate-pulse" : ""
                      }`
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${tipoBadgeClass(CONSTANCIA_TIPOS.convocatoria)}`}
                  >
                    {CONSTANCIA_TIPO_LABEL_SHORT.convocatoria}
                  </span>
                  {tipo === CONSTANCIA_TIPOS.convocatoria && loadingGiras ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-700">
                      <IconLoader size={12} className="animate-spin" />
                      Cargando giras…
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
                  Certifica que fuiste <strong>convocado/a</strong> a la gira
                  (como violinista, flautista, etc.). Sirve para giras futuras o
                  pasadas en las que figurás en la nómina.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setTipo(CONSTANCIA_TIPOS.participacion)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  tipo === CONSTANCIA_TIPOS.participacion
                    ? `border-sky-300 bg-sky-50 ring-2 ring-sky-200/80 ${
                        loadingGiras ? "animate-pulse" : ""
                      }`
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${tipoBadgeClass(CONSTANCIA_TIPOS.participacion)}`}
                  >
                    {CONSTANCIA_TIPO_LABEL_SHORT.participacion}
                  </span>
                  {tipo === CONSTANCIA_TIPOS.participacion && loadingGiras ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-700">
                      <IconLoader size={12} className="animate-spin" />
                      Cargando giras…
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
                  Certifica que <strong>participaste</strong> de ensayos y
                  conciertos. Solo se puede pedir de giras ya{" "}
                  <strong>finalizadas</strong> (fecha de fin anterior a hoy).
                </p>
              </button>
              <button
                type="button"
                onClick={() => setTipo(CONSTANCIA_MODO_PARA_FIRMAR)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  tipo === CONSTANCIA_MODO_PARA_FIRMAR
                    ? `border-amber-300 bg-amber-50 ring-2 ring-amber-200/80 ${
                        loadingGiras ? "animate-pulse" : ""
                      }`
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${tipoBadgeClass(CONSTANCIA_MODO_PARA_FIRMAR)}`}
                  >
                    {CONSTANCIA_TIPO_LABEL_SHORT[CONSTANCIA_MODO_PARA_FIRMAR]}
                  </span>
                  {tipo === CONSTANCIA_MODO_PARA_FIRMAR && loadingGiras ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800">
                      <IconLoader size={12} className="animate-spin" />
                      Cargando giras…
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
                  Descargá el PDF de participación <strong>sin firma</strong>.
                  Incluye giras futuras. No genera solicitud: imprimí y listo.
                </p>
              </button>
            </div>

            {isModoParaFirmar(tipo) ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-snug text-amber-950">
                <p className="font-bold">Importante</p>
                <p className="mt-1">
                  Debés <strong>imprimirla y llevarla</strong>. La firma se
                  hace en persona; el archivo no incluye firma digital.
                </p>
              </div>
            ) : null}

            {!tipo ? (
              <p className="text-[11px] text-slate-400">
                Seleccioná un tipo arriba para ver el desplegable de giras.
              </p>
            ) : loadingGiras ? null : (
              <>
                <select
                  value={idGira}
                  onChange={(e) => setIdGira(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  <option value="">Elegí una gira…</option>
                  {girasDisponibles.map((g) => (
                    <option key={g.id} value={g.id}>
                      {formatProgramSelectLabel(g)}
                      {g.fecha_desde
                        ? ` (${formatShortDate(g.fecha_desde)}–${formatShortDate(g.fecha_hasta)})`
                        : ""}
                    </option>
                  ))}
                </select>
                {girasDisponibles.length === 0 && (
                  <p className="text-[11px] text-slate-400">
                    {tipo === CONSTANCIA_TIPOS.participacion
                      ? "No hay giras finalizadas elegibles pendientes de solicitar."
                      : isModoParaFirmar(tipo)
                        ? "No hay giras elegibles para imprimir."
                        : "No hay giras elegibles pendientes de solicitar."}
                  </p>
                )}
                {idGira && loadingLogistica ? (
                  <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                    <IconLoader size={12} className="animate-spin" />
                    Revisando tu logística de viaje…
                  </p>
                ) : null}
                {idGira &&
                !loadingLogistica &&
                logistica &&
                (logistica.puedeSalida || logistica.puedeRegreso) ? (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] font-bold text-slate-700">
                      Tu viaje según logística
                    </p>
                    {logistica.label ? (
                      <p className="text-[11px] text-slate-500">
                        {logistica.label}
                      </p>
                    ) : null}
                    <p className="text-[11px] text-slate-500">
                      Fechas base de la gira:{" "}
                      {formatShortDate(logistica.progDesde)}–
                      {formatShortDate(logistica.progHasta)}. Podés incluir el
                      día extra de viaje:
                    </p>
                    {logistica.puedeSalida ? (
                      <label className="flex cursor-pointer items-start gap-2 text-[12px] text-slate-800">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={incluirDiaSalida}
                          onChange={(e) =>
                            setIncluirDiaSalida(e.target.checked)
                          }
                        />
                        <span>
                          Incluir el día de salida (
                          {formatShortDate(logistica.fechaDesde)})
                        </span>
                      </label>
                    ) : null}
                    {logistica.puedeRegreso ? (
                      <label className="flex cursor-pointer items-start gap-2 text-[12px] text-slate-800">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={incluirDiaRegreso}
                          onChange={(e) =>
                            setIncluirDiaRegreso(e.target.checked)
                          }
                        />
                        <span>
                          Incluir el día de regreso (
                          {formatShortDate(logistica.fechaHasta)})
                        </span>
                      </label>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={saving || !idGira || loadingLogistica}
                  onClick={handleSolicitar}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                    isModoParaFirmar(tipo)
                      ? "bg-amber-700 hover:bg-amber-800"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {saving ? (
                    <IconLoader size={14} className="animate-spin" />
                  ) : isModoParaFirmar(tipo) ? (
                    <IconDownload size={14} />
                  ) : (
                    <IconFileText size={14} />
                  )}
                  {isModoParaFirmar(tipo)
                    ? "Descargar PDF (sin firma)"
                    : `Solicitar ${
                        CONSTANCIA_TIPO_LABEL_SHORT[tipo]?.toLowerCase() ||
                        "constancia"
                      }`}
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
