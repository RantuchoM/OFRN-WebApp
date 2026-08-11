/**
 * FIMBA — Gestionar subidas / bajadas por parada.
 * - Artistas: plazas (cantidad_planificada + materiales vía input numérico)
 * - Orquesta OFRN: embebe StopRulesManager (giras_logistica_rutas) en la misma modal
 */
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconX,
  IconPlus,
  IconTrash,
  IconMapPin,
  IconClock,
  IconUsers,
  IconLoader,
} from "../../components/ui/Icons";
import {
  clearFimbaPropuestaRutaStop,
  computeFimbaCapacity,
  labelGiraTransporte,
  listFimbaPropuestaRutas,
  upsertFimbaPropuestaRutaStop,
} from "../../services/fimbaService";
import { formatEventLocation } from "../../utils/fimbaTransportBoarding";
import StopRulesManager from "../Giras/StopRulesManager";
import { supabase } from "../../services/supabase";

export default function FimbaStopRulesManager({
  isOpen,
  onClose,
  event,
  type, // "up" | "down"
  transportId,
  edicionId,
  giraId,
  vehiculos = [],
  propuestas = [],
  passengers = [],
  admissionRules = [],
  regions = [],
  localities = [],
  onRefresh,
}) {
  const [tab, setTab] = useState("artistas"); // artistas | orquesta
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [propuestaId, setPropuestaId] = useState("");
  const [plazas, setPlazas] = useState("");
  const [vehicleId, setVehicleId] = useState(
    transportId != null ? String(transportId) : "",
  );
  const [saving, setSaving] = useState(false);

  const title = type === "up" ? "Gestionar Subidas" : "Gestionar Bajadas";
  const colorClass = type === "up" ? "text-emerald-700" : "text-rose-700";
  const bgClass = type === "up" ? "bg-emerald-50" : "bg-rose-50";
  const field =
    type === "up" ? "id_evento_subida" : "id_evento_bajada";

  useEffect(() => {
    if (isOpen && transportId != null) {
      setVehicleId(String(transportId));
    } else if (isOpen && (vehiculos || []).length === 1 && !vehicleId) {
      setVehicleId(String(vehiculos[0].id));
    }
  }, [isOpen, transportId, vehiculos, vehicleId]);

  useEffect(() => {
    if (!isOpen || !edicionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { rutas: rows, error: err } = await listFimbaPropuestaRutas(
        edicionId,
        {
          id_gira_transporte: vehicleId || null,
          id_evento: event?.id,
          type,
        },
      );
      if (cancelled) return;
      if (err) setError(err.message || "No se pudieron cargar las rutas");
      setRutas(rows || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, edicionId, vehicleId, event?.id, type]);

  const activeVehicle = useMemo(
    () =>
      (vehiculos || []).find((v) => String(v.id) === String(vehicleId)) || null,
    [vehiculos, vehicleId],
  );

  const defaultPlazasForPropuesta = (pid) => {
    const p = (propuestas || []).find((x) => String(x.id) === String(pid));
    if (!p) return 1;
    return Math.max(1, computeFimbaCapacity(p).para_transporte || 1);
  };

  const handlePropuestaChange = (id) => {
    setPropuestaId(id);
    if (id) setPlazas(String(defaultPlazasForPropuesta(id)));
  };

  const reloadRutas = async () => {
    const { rutas: rows, error: err } = await listFimbaPropuestaRutas(
      edicionId,
      {
        id_gira_transporte: vehicleId || null,
        id_evento: event?.id,
        type,
      },
    );
    if (err) setError(err.message);
    setRutas(rows || []);
  };

  const handleAdd = async () => {
    if (!propuestaId) {
      setError("Elegí un artista");
      return;
    }
    if (!vehicleId) {
      setError("Elegí un vehículo");
      return;
    }
    const n = Math.max(0, Number(plazas) || 0);
    if (n <= 0) {
      setError("Cantidad de plazas > 0");
      return;
    }
    setSaving(true);
    setError(null);
    let res = await upsertFimbaPropuestaRutaStop({
      id_propuesta: propuestaId,
      id_gira_transporte: vehicleId,
      plazas: n,
      type,
      id_evento: event.id,
      replaceConflict: false,
    });
    if (res.conflict) {
      const ok = window.confirm(
        `${res.error?.message || "Conflicto"}.\n\n¿Reemplazar la parada anterior?`,
      );
      if (ok) {
        res = await upsertFimbaPropuestaRutaStop({
          id_propuesta: propuestaId,
          id_gira_transporte: vehicleId,
          plazas: n,
          type,
          id_evento: event.id,
          replaceConflict: true,
        });
      } else {
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    if (res.error) {
      setError(res.error.message || "No se pudo guardar");
      return;
    }
    setPropuestaId("");
    setPlazas("");
    await reloadRutas();
    onRefresh?.();
  };

  const handleDelete = async (ruta) => {
    if (!window.confirm("¿Quitar esta definición de parada?")) return;
    setSaving(true);
    const { error: err } = await clearFimbaPropuestaRutaStop(ruta.id, type);
    setSaving(false);
    if (err) {
      setError(err.message || "No se pudo eliminar");
      return;
    }
    await reloadRutas();
    onRefresh?.();
  };

  if (!isOpen || !event) return null;

  const location = formatEventLocation(event);
  const hora = event.hora_inicio ? String(event.hora_inicio).slice(0, 5) : "—";

  const body = (
    <>
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95">
          <div
            className={`p-4 border-b rounded-t-xl flex justify-between items-start ${bgClass}`}
          >
            <div>
              <h3
                className={`text-lg font-bold ${colorClass} flex items-center gap-2`}
              >
                <IconMapPin size={20} /> {title}
              </h3>
              <div className="mt-1 text-sm font-medium text-slate-600">
                {location}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <IconClock size={12} /> {hora} hs
                {activeVehicle ? (
                  <span className="ml-2 font-semibold text-slate-600">
                    · {labelGiraTransporte(activeVehicle)}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-white/50 rounded-full transition-colors"
            >
              <IconX size={20} className="text-slate-500" />
            </button>
          </div>

          <div className="px-4 pt-3 flex gap-2 border-b border-slate-100">
            <button
              type="button"
              className={`px-3 py-1.5 text-xs font-bold rounded-t ${
                tab === "artistas"
                  ? "bg-slate-100 text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setTab("artistas")}
            >
              Artistas FIMBA
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-xs font-bold rounded-t ${
                tab === "orquesta"
                  ? "bg-slate-100 text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setTab("orquesta")}
            >
              Orquesta OFRN
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {error && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">
                {error}
              </div>
            )}

            {tab === "artistas" && (
              <>
                {(vehiculos || []).length > 1 && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      VEHÍCULO
                    </label>
                    <select
                      className="w-full text-xs border rounded p-2 outline-none focus:border-pink-500"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                    >
                      <option value="">— Elegir —</option>
                      {(vehiculos || []).map((v) => (
                        <option key={v.id} value={v.id}>
                          {labelGiraTransporte(v)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Reglas activas (cantidad)
                  </h4>
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-4 justify-center">
                      <IconLoader size={16} className="animate-spin" /> Cargando…
                    </div>
                  ) : rutas.length === 0 ? (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-400">
                        Nadie tiene cantidad asignada en esta parada aún.
                      </span>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                      {rutas.map((r) => {
                        const p = r.propuesta || {};
                        const name = p.nombre || `Artista #${r.id_propuesta}`;
                        return (
                          <li
                            key={r.id}
                            className="px-3 py-2 flex justify-between items-center bg-white hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-700 truncate">
                                {name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {type === "up" ? "Sube" : "Baja"}
                                {r.id_evento_subida && r.id_evento_bajada
                                  ? " · trayecto completo"
                                  : " · extremo pendiente"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full text-slate-500 bg-slate-100">
                                <IconUsers size={12} /> {r.plazas}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDelete(r)}
                                disabled={saving}
                                className="text-slate-300 hover:text-red-500 p-1"
                                title="Quitar"
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-pink-900 uppercase tracking-wider">
                    Asignar artista + cantidad
                  </h4>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        ARTISTA
                      </label>
                      <select
                        className="w-full text-xs border rounded p-2 outline-none focus:border-pink-500 bg-white"
                        value={propuestaId}
                        onChange={(e) => handlePropuestaChange(e.target.value)}
                      >
                        <option value="">— Seleccionar —</option>
                        {(propuestas || []).map((p) => {
                          const cap = computeFimbaCapacity(p).para_transporte;
                          return (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                              {cap ? ` (${cap} transp.)` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div style={{ width: 88 }}>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        PLAZAS
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        className="w-full text-xs border rounded p-2 outline-none focus:border-pink-500 bg-white"
                        value={plazas}
                        onChange={(e) => setPlazas(e.target.value)}
                        placeholder="n"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 m-0">
                    Default plazas = planificada + extras materiales. Cada
                    definición define {type === "up" ? "dónde sube" : "dónde baja"}{" "}
                    el bloque de plazas del artista en el vehículo (como
                    OFRN, pero por cantidad).
                  </p>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={saving || loading || !vehicleId}
                    className={`w-full py-2 rounded text-xs font-bold text-white shadow-sm flex justify-center items-center gap-2 disabled:opacity-60 ${
                      type === "up"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {saving ? (
                      <IconLoader size={14} className="animate-spin" />
                    ) : (
                      <IconPlus size={14} />
                    )}{" "}
                    Asignar parada
                  </button>
                </div>
              </>
            )}

            {tab === "orquesta" && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 m-0">
                  Las subidas y bajadas de orquesta usan las mismas reglas
                  OFRN (
                  <code className="text-[11px]">giras_logistica_rutas</code>
                  ): por persona, categoría, localidad o región.
                </p>

                {(vehiculos || []).length > 1 && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      VEHÍCULO
                    </label>
                    <select
                      className="w-full text-xs border rounded p-2 outline-none focus:border-pink-500"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                    >
                      <option value="">— Elegir —</option>
                      {(vehiculos || []).map((v) => (
                        <option key={v.id} value={v.id}>
                          {labelGiraTransporte(v)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {giraId == null ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Esta edición no tiene gira OFRN vinculada; no se pueden
                    gestionar reglas de orquesta.
                  </p>
                ) : !vehicleId ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Elegí un vehículo para cargar las reglas de orquesta de
                    esa unidad.
                  </p>
                ) : (
                  <StopRulesManager
                    isOpen
                    embedded
                    onClose={onClose}
                    event={event}
                    type={type}
                    transportId={Number(vehicleId)}
                    supabase={supabase}
                    giraId={Number(giraId)}
                    regions={regions}
                    localities={localities}
                    passengers={passengers}
                    admissionRules={admissionRules}
                    onRefresh={() => {
                      onRefresh?.();
                    }}
                  />
                )}

                <p className="text-[10px] text-slate-400 m-0">
                  IDs de integrantes son numéricos. Tras editar, la planilla
                  recalcula «Orquesta n» con los pasajeros presentes en la
                  parada (boarding), no el roster estático entero.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(body, document.body);
}
