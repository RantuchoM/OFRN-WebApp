import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../services/supabase";
import { scrnTransporteColorFromEntity } from "./scrnTransporteColor";
import { badgeClassEstadoPaquete, labelEstadoPaquete } from "./scrnPaqueteEstadoUI";
import { isSalidaHoyOFutura } from "./viajeSalidaTemporal";
import AlertModal from "../../../components/ui/AlertModal";
import ConfirmModal from "../../../components/ui/ConfirmModal";

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildPaqueteEstadoConstraintHint(error) {
  const msg = String(error?.message || "");
  if (!/scrn_solic_paq_estado_check|check constraint/i.test(msg)) {
    return msg || "No se pudo cancelar el envío.";
  }
  return (
    "No se pudo cancelar porque la base todavía no acepta el estado 'cancelada' en paquetería.\n" +
    "Ejecutá nuevamente: docs/transporte-scrn-solicitud-paquete.sql"
  );
}

export default function MisEnvios({ user, reloadKey = 0, onGestionCambiada }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [missingTable, setMissingTable] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setMissingTable(false);
    const { data, error } = await supabase
      .from("scrn_solicitudes_paquete")
      .select("*, scrn_viajes(*, scrn_transportes(*))")
      .eq("id_usuario", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42P01" || (error.message || "").includes("scrn_solicitudes_paquete")) {
        setMissingTable(true);
        setRows([]);
      } else {
        console.error("Error cargando envíos de paquetes:", error);
        setRows([]);
      }
      setLoading(false);
      return;
    }
    setRows(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const cancelarEnvio = useCallback(
    async (row) => {
      if (!row?.id) return;
      setCancelingId(row.id);
      const { error } = await supabase
        .from("scrn_solicitudes_paquete")
        .update({ estado: "cancelada" })
        .eq("id", row.id);
      if (error) {
        setCancelingId(null);
        setAlertModal({
          title: "No se pudo cancelar",
          message: buildPaqueteEstadoConstraintHint(error),
        });
        return;
      }

      await supabase.functions
        .invoke("mails_produccion", {
          body: {
            action: "enviar_mail",
            templateId: "scrn_transporte_evento",
            email: "filarmonica.scrn@gmail.com",
            detalle: {
              titulo: "Cancelación de envío de paquete",
              lineas: [
                `Email: ${user?.email || "Sin email"}`,
                `Origen: ${row?.scrn_viajes?.origen || "-"}`,
                `Destino: ${row?.scrn_viajes?.destino_final || "-"}`,
                `Salida: ${row?.scrn_viajes?.fecha_salida ? new Date(row.scrn_viajes.fecha_salida).toLocaleString("es-AR") : "-"}`,
                `ID viaje: ${row?.id_viaje || "-"}`,
                `ID paquete: ${row?.id || "-"}`,
              ],
            },
          },
        })
        .catch((mailErr) => {
          console.warn("No se pudo enviar mail de cancelación de paquete:", mailErr);
        });

      setCancelingId(null);
      await load();
      onGestionCambiada?.();
    },
    [load, onGestionCambiada, user?.email],
  );

  const rowsMostrados = useMemo(() => {
    if (verHistorial) return rows;
    return rows.filter((p) => isSalidaHoyOFutura(p.scrn_viajes?.fecha_salida));
  }, [rows, verHistorial]);

  if (!user?.id) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-3">
      <AlertModal
        isOpen={Boolean(alertModal)}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title || ""}
        message={alertModal?.message || ""}
      />
      <ConfirmModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          const target = cancelTarget;
          setCancelTarget(null);
          if (target) await cancelarEnvio(target);
        }}
        title="Cancelar envío"
        message="¿Cancelar este envío? El equipo de transporte recibirá un aviso."
        confirmText="Cancelar envío"
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md transition-all active:scale-[0.98] w-full sm:w-auto"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Mis paquetes</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Solicitudes de envío de paquetes: cada una pasa por aprobación de un administrador.
            Si está pendiente o aceptada, podés cancelarla.
          </p>
        </div>
        {!missingTable && rows.length > 0 && (
          <button
            type="button"
            onClick={() => setVerHistorial((x) => !x)}
            className="shrink-0 self-start rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            {verHistorial ? "Ocultar historial" : "Ver historial"}
          </button>
        )}
      </div>

      {!verHistorial && rows.length > 0 && (
        <p className="text-[11px] text-slate-500 -mt-1">
          Por defecto solo se muestran envíos en recorridos con salida hoy o posteriores.
        </p>
      )}

      {loading && (
        <div className="text-sm text-slate-500">Cargando…</div>
      )}

      {missingTable && !loading && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200/90 rounded-lg px-3 py-2">
          La tabla de paquetería aún no está en la base. Ejecutá la migración en{" "}
          <code className="text-xs">docs/transporte-scrn-solicitud-paquete.sql</code>.
        </div>
      )}

      {!loading && !missingTable && rows.length === 0 && (
        <div className="text-sm text-slate-500">No tenés solicitudes de envío registradas.</div>
      )}

      {!loading && !missingTable && rows.length > 0 && rowsMostrados.length === 0 && !verHistorial && (
        <div className="text-sm text-slate-600 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          No tenés envíos en recorridos próximos.{" "}
          <button
            type="button"
            onClick={() => setVerHistorial(true)}
            className="text-xs font-bold text-indigo-700 underline hover:text-indigo-900"
          >
            Ver historial
          </button>
        </div>
      )}

      <div className="space-y-3">
        {!loading &&
          !missingTable &&
          rowsMostrados.map((p) => {
            const v = p.scrn_viajes;
            const tr = v?.scrn_transportes;
            const estado = String(p.estado || "pendiente").toLowerCase();
            const puedeCancelar = estado === "pendiente" || estado === "aceptada";
            return (
              <article
                key={p.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm"
                style={
                  tr
                    ? { borderLeftWidth: 4, borderLeftColor: scrnTransporteColorFromEntity(tr) }
                    : undefined
                }
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">
                      {v?.origen || "—"} — {v?.destino_final || "—"}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {tr?.nombre ? (
                        <span>
                          {tr.nombre} {tr.tipo ? `· ${tr.tipo}` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Enviado: {formatDateTime(p.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start shrink-0">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClassEstadoPaquete(p.estado)}`}
                    >
                      {labelEstadoPaquete(p.estado)}
                    </span>
                    {puedeCancelar && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(p)}
                        disabled={cancelingId === p.id}
                        className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        {cancelingId === p.id ? "Cancelando..." : "Cancelar"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-500">Dimensiones: </span>
                    {p.dimensiones_aprox}
                  </div>
                  <div>
                    <span className="text-slate-500">Peso: </span>
                    {p.peso_kg != null ? `${p.peso_kg} kg` : "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Descripción: </span>
                    {p.descripcion || "—"}
                  </div>
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}
