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
} from "../../components/ui/Icons";
import {
  CONSTANCIA_ESTADO_LABEL,
  CONSTANCIA_ESTADOS,
} from "../../constants/constancias";
import {
  listConstanciasGestion,
  aprobarConstancia,
  denegarConstancia,
  aprobarTodasConstanciasPendientes,
  reenviarConstanciaAprobada,
  descargarConstanciaPdf,
} from "../../services/constanciasService";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";

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

export default function ConstanciasHub() {
  const { user, isEditor, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("solicitud");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filtro, setFiltro] = useState("pendiente");
  const [busyId, setBusyId] = useState(null);
  const [denyTarget, setDenyTarget] = useState(null);
  const [denyMotivo, setDenyMotivo] = useState("");
  const [approvingAll, setApprovingAll] = useState(false);

  const canManage = isAdmin || isEditor;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const estado =
        filtro === "todas" ? undefined : filtro || CONSTANCIA_ESTADOS.pendiente;
      const data = await listConstanciasGestion(supabase, { estado });
      setRows(data);
    } catch (err) {
      console.error("[ConstanciasHub] load:", err);
      toast.error(err?.message || "Error al cargar solicitudes");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`constancia-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, rows]);

  const pendientesCount = useMemo(
    () =>
      rows.filter((r) => r.estado === CONSTANCIA_ESTADOS.pendiente).length,
    [rows],
  );

  const handleAprobar = async (id) => {
    setBusyId(id);
    try {
      await aprobarConstancia(supabase, {
        solicitudId: id,
        resueltoPorId: user?.id,
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
      const res = await aprobarTodasConstanciasPendientes(supabase, {
        resueltoPorId: user?.id,
      });
      if (res.fail === 0) {
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

  if (!canManage) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No tenés permiso para gestionar constancias.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "pendiente", label: "Pendientes" },
            { id: "aprobada", label: "Aprobadas" },
            { id: "denegada", label: "Denegadas" },
            { id: "todas", label: "Todas" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                filtro === f.id
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
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
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {approvingAll ? (
                <IconLoader size={14} className="animate-spin" />
              ) : (
                <IconCheck size={14} />
              )}
              Aprobar todas
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <IconLoader size={16} className="animate-spin" />
            Cargando…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No hay solicitudes en este filtro.
          </div>
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-bold">#</th>
                <th className="px-3 py-2 font-bold">Solicitante</th>
                <th className="px-3 py-2 font-bold">Gira</th>
                <th className="px-3 py-2 font-bold">Instrumento</th>
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
                    id={`constancia-${r.id}`}
                    className={`border-t border-slate-100 ${
                      highlighted ? "bg-indigo-50/80" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-slate-500">{r.id}</td>
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-800">{nombre || "—"}</div>
                      <div className="text-[10px] text-slate-500">
                        DNI {r.snap_dni || "—"} · {r.integrantes?.mail || "sin mail"}
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
                    <td className="px-3 py-2 text-slate-700">
                      {r.snap_instrumento || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {formatShortDate(r.snap_fecha_desde)} –{" "}
                      {formatShortDate(r.snap_fecha_hasta)}
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
                    <td className="px-3 py-2">
                      {r.estado === CONSTANCIA_ESTADOS.pendiente ? (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => handleAprobar(r.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busyId === r.id ? (
                              <IconLoader size={12} className="animate-spin" />
                            ) : (
                              <IconCheck size={12} />
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
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            <IconX size={12} />
                            Denegar
                          </button>
                        </div>
                      ) : r.estado === CONSTANCIA_ESTADOS.aprobada ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <IconFileText size={12} />
                            {formatShortDate(r.resuelto_at)}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              disabled={busyId === r.id || !r.integrantes?.mail}
                              title={
                                r.integrantes?.mail
                                  ? `Reenviar a ${r.integrantes.mail}`
                                  : "Sin email cargado"
                              }
                              onClick={() => handleReenviar(r)}
                              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                            >
                              {busyId === r.id ? (
                                <IconLoader size={12} className="animate-spin" />
                              ) : (
                                <IconMail size={12} />
                              )}
                              Reenviar
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => handleDescargar(r)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {busyId === r.id ? (
                                <IconLoader size={12} className="animate-spin" />
                              ) : (
                                <IconDownload size={12} />
                              )}
                              Descargar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <IconFileText size={12} />
                          {formatShortDate(r.resuelto_at)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {denyTarget &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <h3 className="text-sm font-bold text-slate-800">
                Denegar solicitud #{denyTarget.id}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                El motivo se envía por mail al solicitante y queda visible en Mis
                Constancias.
              </p>
              <textarea
                value={denyMotivo}
                onChange={(e) => setDenyMotivo(e.target.value)}
                rows={4}
                placeholder="Escribí el motivo…"
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDenyTarget(null);
                    setDenyMotivo("");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!denyMotivo.trim() || busyId === denyTarget.id}
                  onClick={confirmDenegar}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Confirmar denegación
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
