import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconX,
  IconLoader,
  IconFileText,
  IconCheck,
  IconAlertCircle,
} from "../ui/Icons";
import {
  CONSTANCIA_ESTADO_LABEL,
  CONSTANCIA_ESTADOS,
  CONSTANCIA_TIPOS,
  CONSTANCIA_TIPO_LABEL,
  CONSTANCIA_TIPO_LABEL_SHORT,
} from "../../constants/constancias";
import {
  listGirasElegiblesConstancia,
  listMisConstancias,
  markConstanciasVistas,
  solicitarConstancia,
} from "../../services/constanciasService";
import { formatProgramSelectLabel } from "../../utils/giraUtils";

function estadoBadgeClass(estado) {
  if (estado === CONSTANCIA_ESTADOS.aprobada) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (estado === CONSTANCIA_ESTADOS.denegada) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-amber-50 text-amber-800 border-amber-200";
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [giras, setGiras] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [tipo, setTipo] = useState(CONSTANCIA_TIPOS.convocatoria);
  const [idGira, setIdGira] = useState("");

  const yaPedidas = useMemo(() => {
    const map = new Map();
    (solicitudes || []).forEach((s) => {
      map.set(solicitudKey(s.id_gira, s.tipo), s);
    });
    return map;
  }, [solicitudes]);

  const girasDisponibles = useMemo(() => {
    return (giras || []).filter((g) => {
      const prev = yaPedidas.get(solicitudKey(g.id, tipo));
      if (!prev) return true;
      return prev.estado === CONSTANCIA_ESTADOS.denegada;
    });
  }, [giras, yaPedidas, tipo]);

  useEffect(() => {
    if (!isOpen || !user?.id || !supabase) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [g, s] = await Promise.all([
          listGirasElegiblesConstancia(supabase, user.id, { tipo }),
          listMisConstancias(supabase, user.id),
        ]);
        if (cancelled) return;
        setGiras(g);
        setSolicitudes(s);
        await markConstanciasVistas(supabase, user.id);
        onBadgeChange?.();
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "No se pudieron cargar las constancias");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id, supabase, onBadgeChange, tipo]);

  useEffect(() => {
    setIdGira("");
  }, [tipo]);

  if (!isOpen) return null;

  const handleSolicitar = async () => {
    if (!idGira) {
      toast.error("Elegí una gira");
      return;
    }
    setSaving(true);
    try {
      await solicitarConstancia(supabase, {
        user,
        idGira: Number(idGira),
        tipo,
      });
      toast.success(
        "Solicitud enviada. Queda pendiente de revisión: vas a recibir el PDF por mail cuando la aprueben.",
      );
      setIdGira("");
      const [g, s] = await Promise.all([
        listGirasElegiblesConstancia(supabase, user.id, { tipo }),
        listMisConstancias(supabase, user.id),
      ]);
      setGiras(g);
      setSolicitudes(s);
      onBadgeChange?.();
    } catch (err) {
      if (err?.mailFailed && err?.solicitud) {
        toast.warning(err.message);
        setIdGira("");
        const [g, s] = await Promise.all([
          listGirasElegiblesConstancia(supabase, user.id, { tipo }),
          listMisConstancias(supabase, user.id),
        ]);
        setGiras(g);
        setSolicitudes(s);
        onBadgeChange?.();
      } else {
        toast.error(err?.message || "No se pudo solicitar");
      }
    } finally {
      setSaving(false);
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
              Nueva solicitud
            </h3>
            <p className="text-[11px] leading-snug text-slate-500">
              Podés pedir una de convocatoria y una de participación realizada
              por gira (sinfónico / camerata). La de participación realizada
              solo para giras ya finalizadas. Al enviar queda{" "}
              <strong>pendiente de revisión</strong>.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {[
                CONSTANCIA_TIPOS.convocatoria,
                CONSTANCIA_TIPOS.participacion,
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    tipo === t
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {CONSTANCIA_TIPO_LABEL_SHORT[t] || t}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <IconLoader size={14} className="animate-spin" /> Cargando giras…
              </div>
            ) : (
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
                      : "No hay giras elegibles pendientes de solicitar."}
                  </p>
                )}
                <button
                  type="button"
                  disabled={saving || !idGira}
                  onClick={handleSolicitar}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? (
                    <IconLoader size={14} className="animate-spin" />
                  ) : (
                    <IconFileText size={14} />
                  )}
                  Solicitar{" "}
                  {CONSTANCIA_TIPO_LABEL_SHORT[tipo]?.toLowerCase() ||
                    "constancia"}
                </button>
              </>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
              Mis solicitudes
            </h3>
            {loading && solicitudes.length === 0 ? null : solicitudes.length ===
              0 ? (
              <p className="text-xs text-slate-400">Todavía no pediste ninguna.</p>
            ) : (
              <ul className="space-y-2">
                {solicitudes.map((s) => (
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
                        <p className="text-[11px] text-slate-500">
                          {CONSTANCIA_TIPO_LABEL[s.tipo] ||
                            "Constancia de convocatoria"}{" "}
                          · {s.snap_instrumento || "—"} · pedida{" "}
                          {formatShortDate(s.solicitado_at)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${estadoBadgeClass(s.estado)}`}
                      >
                        {CONSTANCIA_ESTADO_LABEL[s.estado] || s.estado}
                      </span>
                    </div>
                    {s.estado === CONSTANCIA_ESTADOS.pendiente && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-700">
                        <IconAlertCircle size={12} />
                        En espera de aprobación. Te llegará el PDF por mail.
                      </p>
                    )}
                    {s.estado === CONSTANCIA_ESTADOS.aprobada && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-700">
                        <IconCheck size={12} />
                        Aprobada
                        {s.mail_enviado_at
                          ? " · PDF enviado por mail"
                          : s.mail_error
                            ? ` · aviso mail: ${s.mail_error}`
                            : ""}
                      </p>
                    )}
                    {s.estado === CONSTANCIA_ESTADOS.denegada && (
                      <p className="mt-1.5 text-[11px] text-rose-700">
                        Motivo: {s.motivo_denegacion || "—"}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
