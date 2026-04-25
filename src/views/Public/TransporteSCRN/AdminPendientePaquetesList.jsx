import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../services/supabase";
import AlertModal from "../../../components/ui/AlertModal";
import { scrnTransporteColorFromEntity } from "./scrnTransporteColor";

const ESTADO_OPTS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "aceptada", label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" },
  { value: "cancelada", label: "Cancelada" },
];

function formatMini(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function estadoRowBg(estado) {
  const x = String(estado || "").toLowerCase();
  if (x === "aceptada") return "bg-emerald-50/80";
  if (x === "pendiente") return "bg-amber-50/80";
  if (x === "rechazada") return "bg-rose-50/80";
  if (x === "cancelada") return "bg-slate-100/90";
  return "bg-white";
}

/**
 * Todas las solicitudes de paquete pendientes (vista admin global).
 */
export default function AdminPendientePaquetesList({ onDataChanged }) {
  const [loadErr, setLoadErr] = useState(null);
  const [missing, setMissing] = useState(false);
  const [rows, setRows] = useState([]);
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoadErr(null);
    setMissing(false);
    setLoading(true);

    const { data: p, error: pe } = await supabase
      .from("scrn_solicitudes_paquete")
      .select("id, id_viaje, id_usuario, dimensiones_aprox, peso_kg, descripcion, estado, created_at")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true });

    if (pe) {
      if (pe.code === "42P01" || (pe.message || "").includes("scrn_solicitudes_paquete")) {
        setMissing(true);
        setRows([]);
        setLoading(false);
        return;
      }
      setLoadErr(pe.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const list = p || [];
    const uids = [...new Set(list.map((x) => x.id_usuario).filter(Boolean))];
    const vids = [...new Set(list.map((x) => x.id_viaje).filter(Boolean))];
    const profMap = {};
    if (uids.length) {
      const { data: profs, error: perr } = await supabase
        .from("scrn_perfiles")
        .select("id, nombre, apellido, dni")
        .in("id", uids);
      if (!perr) {
        (profs || []).forEach((pr) => {
          profMap[pr.id] = pr;
        });
      }
    }
    const viajeMap = {};
    if (vids.length) {
      const { data: vj } = await supabase
        .from("scrn_viajes")
        .select("id, origen, destino_final, fecha_salida, id_transporte, scrn_transportes(*)")
        .in("id", vids);
      (vj || []).forEach((v) => {
        viajeMap[v.id] = v;
      });
    }

    setRows(
      list.map((row) => ({
        ...row,
        scrn_perfiles: profMap[row.id_usuario] || null,
        scrn_viajes: viajeMap[row.id_viaje] || null,
      })),
    );
    setEdits({});
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setEstadoEdit = (id, value) => {
    setEdits((prev) => ({ ...prev, [id]: value }));
  };

  const saveEstado = async (row) => {
    const next = edits[row.id] != null ? edits[row.id] : row.estado;
    if (String(next) === String(row.estado) && edits[row.id] == null) return;
    setSavingId(row.id);
    const { error } = await supabase
      .from("scrn_solicitudes_paquete")
      .update({
        estado: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    setSavingId(null);
    if (error) {
      setAlertModal({
        title: "No se pudo guardar",
        message: error.message || "Error al actualizar el paquete.",
      });
      return;
    }
    setEdits((prev) => {
      const n = { ...prev };
      delete n[row.id];
      return n;
    });
    await load();
    onDataChanged?.();
  };

  if (missing) {
    return (
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 text-[11px] text-amber-900">
        Paquetería: migrá{" "}
        <code className="text-[10px]">docs/transporte-scrn-solicitud-paquete.sql</code> para gestionar envíos
        desde aquí.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AlertModal
        isOpen={Boolean(alertModal)}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title || ""}
        message={alertModal?.message || ""}
      />
      <p className="text-xs text-slate-500">
        Solicitudes de envío de paquetes en estado pendiente, de todos los recorridos. Al aceptar o
        rechazar, dejan de listarse aquí si el estado deja de ser pendiente.
      </p>
      {loadErr ? <p className="text-[11px] text-rose-700">{loadErr}</p> : null}
      {loading ? (
        <div className="text-sm text-slate-500">Cargando paquetes…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-500">No hay solicitudes de paquete pendientes.</div>
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {rows.map((p) => {
              const per = p.scrn_perfiles;
              const nombre = [per?.nombre, per?.apellido].filter(Boolean).join(" ") || p.id_usuario;
              const cur = edits[p.id] != null ? edits[p.id] : p.estado;
              const dirty = String(cur) !== String(p.estado);
              const v = p.scrn_viajes;
              const tr = v?.scrn_transportes;
              return (
                <article
                  key={p.id}
                  className={`rounded-xl border border-slate-200 p-2.5 text-[11px] ${estadoRowBg(cur)}`}
                >
                  <div className="flex items-start gap-1.5">
                    <span
                      className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded border border-slate-300/90"
                      style={{ backgroundColor: scrnTransporteColorFromEntity(tr) }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800">
                        {v?.origen || "—"} → {v?.destino_final || "—"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Salida: {formatDateTime(v?.fecha_salida)} · {tr?.nombre || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">{nombre}</div>
                  <div className="text-[10px] text-slate-500 mb-1">DNI {per?.dni || "—"}</div>
                  <div className="text-[11px] text-slate-700">
                    <span className="font-semibold">Dim:</span> {p.dimensiones_aprox}
                  </div>
                  <div className="text-[11px] text-slate-700">
                    <span className="font-semibold">Peso:</span> {p.peso_kg} kg
                  </div>
                  <div className="text-[11px] text-slate-700 whitespace-pre-wrap">
                    <span className="font-semibold">Desc:</span> {p.descripcion}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">{formatMini(p.created_at)}</div>
                  <div className="mt-2 grid grid-cols-1 gap-1.5">
                    <select
                      value={cur}
                      onChange={(e) => setEstadoEdit(p.id, e.target.value)}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-[11px]"
                    >
                      {ESTADO_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!dirty || savingId === p.id}
                      onClick={() => saveEstado(p)}
                      className="h-8 w-full rounded border border-slate-600 bg-slate-800 text-[11px] font-bold text-white disabled:opacity-40"
                    >
                      {savingId === p.id ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white text-[11px] shadow-sm">
          <table className="w-full min-w-[52rem] border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold">Recorrido</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold">Solicitante</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold">Dimensiones</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold">Peso</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold">Descripción</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold">Estado</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold">Fecha</th>
                <th className="w-20 border-b border-slate-200 px-2 py-2 text-right font-bold">—</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const per = p.scrn_perfiles;
                const nombre = [per?.nombre, per?.apellido].filter(Boolean).join(" ") || p.id_usuario;
                const cur = edits[p.id] != null ? edits[p.id] : p.estado;
                const dirty = String(cur) !== String(p.estado);
                const v = p.scrn_viajes;
                const tr = v?.scrn_transportes;
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-100 last:border-0 ${estadoRowBg(cur)}`}
                  >
                    <td className="align-top px-2 py-2">
                      <div className="flex items-start gap-1.5">
                        <span
                          className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded border border-slate-300/90"
                          style={{ backgroundColor: scrnTransporteColorFromEntity(tr) }}
                          title={tr?.nombre || ""}
                          aria-hidden
                        />
                        <div>
                          <div className="font-semibold text-slate-800">
                            {v?.origen || "—"} → {v?.destino_final || "—"}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Salida: {formatDateTime(v?.fecha_salida)} · {tr?.nombre || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="align-top px-2 py-2">
                      <div className="font-semibold text-slate-800">{nombre}</div>
                      <div className="text-[10px] text-slate-500">DNI {per?.dni || "—"}</div>
                    </td>
                    <td className="align-top px-2 py-2 text-slate-800">{p.dimensiones_aprox}</td>
                    <td className="align-top px-2 py-2 tabular-nums">{p.peso_kg} kg</td>
                    <td className="max-w-xs align-top whitespace-pre-wrap px-2 py-2 text-slate-700">
                      {p.descripcion}
                    </td>
                    <td className="align-top px-2 py-2">
                      <select
                        value={cur}
                        onChange={(e) => setEstadoEdit(p.id, e.target.value)}
                        className="h-8 w-full min-w-0 rounded border border-slate-300 bg-white px-1 text-[11px]"
                      >
                        {ESTADO_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 align-top text-slate-500">
                      {formatMini(p.created_at)}
                    </td>
                    <td className="align-top px-2 py-2 text-right">
                      <button
                        type="button"
                        disabled={!dirty || savingId === p.id}
                        onClick={() => saveEstado(p)}
                        className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[9px] font-extrabold text-white disabled:opacity-40"
                      >
                        {savingId === p.id ? "…" : "Guardar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
