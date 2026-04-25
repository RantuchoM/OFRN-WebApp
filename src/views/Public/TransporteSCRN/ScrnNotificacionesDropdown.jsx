import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../services/supabase";
import { IconBell, IconX } from "../../../components/ui/Icons";

function isMissingTableError(error) {
  if (!error) return false;
  const c = String(error.code || "");
  const m = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return (
    c === "42P01" ||
    c === "PGRST205" ||
    (m.includes("scrn_notificaciones") && m.includes("not find"))
  );
}

function labelEstado(es) {
  const x = String(es || "").toLowerCase();
  if (x === "aceptada" || x === "aprobada") return "aceptada";
  if (x === "rechazada") return "rechazada";
  if (x === "cancelada") return "anulada";
  return x || "actualizada";
}

function textoNotificacion(n) {
  const m = n.metadata && typeof n.metadata === "object" ? n.metadata : {};
  if (n.tipo === "reserva_estado") {
    return `Tu solicitud de plaza: ${labelEstado(m.estado)}. ${m.origen || "—"} → ${m.destino_final || "—"}`;
  }
  if (n.tipo === "paquete_estado") {
    return `Envío de paquete: ${labelEstado(m.estado)}. ${m.origen || "—"} → ${m.destino_final || "—"}`;
  }
  if (n.tipo === "propuesta_viaje_estado") {
    return `Propuesta de recorrido: ${m.estado === "aprobada" ? "aprobada" : "rechazada"}. ${m.origen || ""} → ${m.destino_final || ""}`.trim();
  }
  return "Notificación";
}

function formatCorta(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function scrnNotifBadgeClass(n) {
  return n > 0
    ? "border border-amber-600 bg-amber-500 text-white shadow-sm"
    : "border border-slate-300 bg-slate-200 text-slate-600";
}

/**
 * Campana + panel de notificaciones internas (tabla scrn_notificaciones).
 */
export default function ScrnNotificacionesDropdown({ user, reloadToken = 0 }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [missingTable, setMissingTable] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const rootRef = useRef(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setMissingTable(false);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("scrn_notificaciones")
      .select("id, tipo, metadata, creada_at, leida_at")
      .eq("id_usuario", user.id)
      .order("creada_at", { ascending: false })
      .limit(50);

    if (error) {
      if (isMissingTableError(error)) {
        setMissingTable(true);
        setLoadError(null);
        setRows([]);
      } else {
        console.error("scrn_notificaciones:", error);
        setMissingTable(false);
        setLoadError(
          String(error.message || error.details || "").trim() ||
            "No se pudieron cargar las notificaciones (revisá permisos en Supabase).",
        );
        setRows([]);
      }
      setLoading(false);
      return;
    }
    setMissingTable(false);
    setLoadError(null);
    setRows(data || []);
    setLoading(false);
  }, [user?.id, reloadToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  useEffect(() => {
    if (!user?.id || missingTable) return;
    const t = setInterval(() => {
      void load();
    }, 120000);
    return () => clearInterval(t);
  }, [user?.id, missingTable, load]);

  useEffect(() => {
    if (!user?.id || missingTable) return;
    const ch = supabase
      .channel("scrn_notif_ui")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scrn_notificaciones",
          filter: `id_usuario=eq.${user.id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user?.id, missingTable, load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unread = useMemo(() => rows.filter((r) => !r.leida_at).length, [rows]);

  const marcarLeida = async (id) => {
    if (markingId) return;
    setMarkingId(id);
    const { error } = await supabase
      .from("scrn_notificaciones")
      .update({ leida_at: new Date().toISOString() })
      .eq("id", id);
    setMarkingId(null);
    if (error) {
      console.error("Marcar leída:", error);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, leida_at: new Date().toISOString() } : r)));
  };

  if (!user?.id) {
    return null;
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void load();
        }}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-700 transition-colors ${
          missingTable || loadError
            ? "border-amber-200 bg-amber-50/80 hover:bg-amber-100/80"
            : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
        title={
          missingTable
            ? "Notificaciones: ejecutá el SQL en el servidor"
            : loadError
              ? "Error al cargar notificaciones"
              : "Notificaciones"
        }
        aria-label="Notificaciones"
        aria-expanded={open}
      >
        <IconBell
          size={20}
          className={missingTable || loadError ? "text-amber-700" : "text-slate-600"}
        />
        {!missingTable && !loadError && unread > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 min-w-4 rounded-full px-1 text-center text-[9px] font-extrabold leading-4 ${scrnNotifBadgeClass(unread)}`}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed left-3 right-3 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-[22rem]"
          role="dialog"
          aria-label="Notificaciones"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
              Notificaciones
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
              aria-label="Cerrar"
            >
              <IconX size={16} />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {missingTable && (
              <p className="px-3 py-4 text-xs text-amber-900 bg-amber-50/80 leading-snug">
                La tabla de notificaciones aún no está creada. En Supabase ejecutá el script{" "}
                <code className="text-[10px] bg-amber-100/80 rounded px-0.5">docs/transporte-scrn-notificaciones.sql</code>{" "}
                y recargá la página.
              </p>
            )}
            {!missingTable && loadError && (
              <p className="px-3 py-4 text-xs text-rose-900 bg-rose-50/90 leading-snug border-b border-rose-100">
                {loadError}
              </p>
            )}
            {!missingTable && !loadError && loading && (
              <p className="px-3 py-4 text-center text-xs text-slate-500">Cargando…</p>
            )}
            {!missingTable && !loadError && !loading && rows.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-slate-500">
                Aún no hay notificaciones. Cuando un admin resuelva una solicitud tuya, aparecerá aquí.
              </p>
            )}
            {!missingTable &&
              !loadError &&
              !loading &&
              rows.map((n) => {
                const leida = Boolean(n.leida_at);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!leida) void marcarLeida(n.id);
                    }}
                    className={`w-full border-b border-slate-100 px-3 py-2.5 text-left last:border-0 ${
                      leida ? "bg-white" : "bg-amber-50/80"
                    } ${!leida ? "hover:bg-amber-100/80" : "hover:bg-slate-50"}`}
                  >
                    <p className="text-xs font-semibold text-slate-800 leading-snug">
                      {textoNotificacion(n)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{formatCorta(n.creada_at)}</p>
                    {!leida && (
                      <span className="text-[9px] font-bold uppercase text-amber-800 mt-0.5 inline-block">
                        Nuevo
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
