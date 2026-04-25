import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../services/supabase";
import AlertModal from "../../../components/ui/AlertModal";

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

function estadoRowBg(estado) {
  const x = String(estado || "").toLowerCase();
  if (x === "aceptada") return "bg-emerald-50/80";
  if (x === "pendiente") return "bg-amber-50/80";
  if (x === "rechazada") return "bg-rose-50/80";
  if (x === "cancelada") return "bg-slate-100/90";
  return "bg-white";
}

/**
 * Listado y gestión de paquetes para un recorrido (solo admin, RLS en server).
 */
export default function ViajePaquetesPanel({ viajeId, onDataChanged }) {
  const [loadErr, setLoadErr] = useState(null);
  const [missing, setMissing] = useState(false);
  const [bodegaLlena, setBodegaLlena] = useState(false);
  const [bodegaSaving, setBodegaSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  const load = useCallback(async () => {
    if (viajeId == null) return;
    setLoadErr(null);
    setMissing(false);

    const { data: v, error: ve } = await supabase
      .from("scrn_viajes")
      .select("id, paquetes_bodega_llena")
      .eq("id", viajeId)
      .maybeSingle();

    if (ve) {
      if (ve.code === "42703" && /paquetes_bodega_llena/i.test(ve.message || "")) {
        setLoadErr("Falta la columna paquetes_bodega_llena en scrn_viajes (migración SQL).");
        setRows([]);
        return;
      }
      setLoadErr(ve.message);
    } else {
      setBodegaLlena(Boolean(v?.paquetes_bodega_llena));
    }

    const { data: p, error: pe } = await supabase
      .from("scrn_solicitudes_paquete")
      .select("id, id_usuario, dimensiones_aprox, peso_kg, descripcion, estado, created_at")
      .eq("id_viaje", viajeId)
      .order("created_at", { ascending: true });

    if (pe) {
      if (pe.code === "42P01" || (pe.message || "").includes("scrn_solicitudes_paquete")) {
        setMissing(true);
        setRows([]);
        return;
      }
      setLoadErr(pe.message);
      setRows([]);
      return;
    }

    const list = p || [];
    const uids = [...new Set(list.map((x) => x.id_usuario).filter(Boolean))];
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
    setRows(
      list.map((row) => ({
        ...row,
        scrn_perfiles: profMap[row.id_usuario] || null,
      })),
    );
    setEdits({});
  }, [viajeId]);

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

  const toggleBodega = async () => {
    if (viajeId == null) return;
    setBodegaSaving(true);
    const next = !bodegaLlena;
    const { error } = await supabase
      .from("scrn_viajes")
      .update({ paquetes_bodega_llena: next })
      .eq("id", viajeId);
    setBodegaSaving(false);
    if (error) {
      setAlertModal({
        title: "No se pudo actualizar",
        message: error.message,
      });
      return;
    }
    setBodegaLlena(next);
    onDataChanged?.();
  };

  if (missing) {
    return (
      <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-lg px-2 py-1.5">
        Paquetería: migrá <code className="text-[10px]">docs/transporte-scrn-solicitud-paquete.sql</code> para
        ver solicitudes de envío en este recorrido.
      </div>
    );
  }

  return (
    <div className="mt-4 pt-3 border-t border-slate-200 w-full min-w-0 text-left">
      <AlertModal
        isOpen={Boolean(alertModal)}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title || ""}
        message={alertModal?.message || ""}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
          Paquetes (bodega)
        </h4>
        <label className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={bodegaLlena}
            disabled={bodegaSaving}
            onChange={toggleBodega}
            className="rounded border-slate-300"
          />
          Bodega llena (no aceptar nuevas solicitudes)
        </label>
      </div>
      {loadErr ? (
        <p className="text-[11px] text-rose-700 mb-2">{loadErr}</p>
      ) : null}
      <p className="text-[10px] text-slate-500 mb-2 leading-snug max-w-3xl">
        Todas las solicitudes de envío para este recorrido. Podés aceptar o rechazar cada una.
      </p>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 py-1">Ninguna solicitud de paquete en este recorrido.</p>
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {rows.map((p) => {
              const per = p.scrn_perfiles;
              const nombre = [per?.nombre, per?.apellido].filter(Boolean).join(" ") || p.id_usuario;
              const cur = edits[p.id] != null ? edits[p.id] : p.estado;
              const dirty = String(cur) !== String(p.estado);
              return (
                <article
                  key={p.id}
                  className={`rounded-xl border border-slate-200 p-2.5 text-[11px] ${estadoRowBg(cur)}`}
                >
                  <div className="font-semibold text-slate-800">{nombre}</div>
                  <div className="text-[10px] text-slate-500 mb-1.5">DNI {per?.dni || "—"}</div>
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
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 bg-white text-[11px]">
          <table className="w-full min-w-[44rem] border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="text-left font-bold px-2 py-1.5 border-b border-slate-200">Solicitante</th>
                <th className="text-left font-bold px-2 py-1.5 border-b border-slate-200">Dimensiones</th>
                <th className="text-left font-bold px-2 py-1.5 border-b border-slate-200">Peso</th>
                <th className="text-left font-bold px-2 py-1.5 border-b border-slate-200">Descripción</th>
                <th className="text-left font-bold px-2 py-1.5 border-b border-slate-200">Estado</th>
                <th className="text-left font-bold px-2 py-1.5 border-b border-slate-200">Fecha</th>
                <th className="text-right font-bold px-2 py-1.5 border-b border-slate-200 w-20">—</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const per = p.scrn_perfiles;
                const nombre = [per?.nombre, per?.apellido].filter(Boolean).join(" ") || p.id_usuario;
                const cur = edits[p.id] != null ? edits[p.id] : p.estado;
                const dirty = String(cur) !== String(p.estado);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-100 last:border-0 ${estadoRowBg(cur)}`}
                  >
                    <td className="px-2 py-1.5 align-top">
                      <div className="font-semibold text-slate-800">{nombre}</div>
                      <div className="text-[10px] text-slate-500">DNI {per?.dni || "—"}</div>
                    </td>
                    <td className="px-2 py-1.5 align-top text-slate-800">{p.dimensiones_aprox}</td>
                    <td className="px-2 py-1.5 align-top tabular-nums">{p.peso_kg} kg</td>
                    <td className="px-2 py-1.5 align-top text-slate-700 max-w-xs whitespace-pre-wrap">
                      {p.descripcion}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <select
                        value={cur}
                        onChange={(e) => setEstadoEdit(p.id, e.target.value)}
                        className="w-full min-w-0 h-8 text-[11px] rounded border border-slate-300 px-1 bg-white"
                      >
                        {ESTADO_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 align-top text-slate-500 whitespace-nowrap">
                      {formatMini(p.created_at)}
                    </td>
                    <td className="px-2 py-1.5 align-top text-right">
                      <button
                        type="button"
                        disabled={!dirty || savingId === p.id}
                        onClick={() => saveEstado(p)}
                        className="rounded border border-slate-600 bg-slate-800 text-white text-[9px] font-extrabold py-1 px-2 disabled:opacity-40"
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
