import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../services/supabase";
import { ensureScrnPerfilForNewEmail } from "../../../services/scrnCreatePerfil";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import { localidadesToSearchableOptions } from "./localidadesSearchable";
import { initialViajeForm, ViajeFormFields } from "./ViajeFormFields";
import {
  buildTransporteOcupadoAlerta,
  findConflictingViajesForTransporte,
  propuestaOcupacionWindowFromForm,
} from "./viajeTransporteConflict";
import { topeTransportePasajeros } from "./scrnPlazasCapacidad";
import AlertModal from "../../../components/ui/AlertModal";

const initialParadas = {
  tramo: "ambos",
  localidad_subida: "",
  obs_subida: "",
  localidad_bajada: "",
  obs_bajada: "",
};

function newKey() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ProponerNuevoViajeModal({
  isOpen,
  onClose,
  user,
  profile,
  localidades = [],
  scrnPerfiles = [],
  transportes = [],
  viajes = [],
  onSubmitted,
}) {
  const [viajeForm, setViajeForm] = useState(initialViajeForm);
  const [paradas, setParadas] = useState(initialParadas);
  const [extra, setExtra] = useState([]);
  const [draftManual, setDraftManual] = useState({ nombre: "", apellido: "", email: "" });
  const [perfilSelectKey, setPerfilSelectKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [transporteOcupadoMsg, setTransporteOcupadoMsg] = useState(null);
  const [paradasCustom, setParadasCustom] = useState(false);

  const perfilesDisponibles = useMemo(
    () =>
      (scrnPerfiles || [])
        .filter((p) => p.id && p.id !== user?.id)
        .filter(
          (p) => !extra.some((row) => row.id_perfil && row.id_perfil === p.id),
        ),
    [scrnPerfiles, user?.id, extra],
  );

  const plazasNecesarias = 1 + extra.length;

  const capSeleccionada = useMemo(() => {
    const id = Number(viajeForm.id_transporte);
    const t = transportes.find((x) => Number(x.id) === id);
    return topeTransportePasajeros(t);
  }, [transportes, viajeForm.id_transporte]);

  const locOptions = useMemo(
    () => localidadesToSearchableOptions(localidades),
    [localidades],
  );

  useEffect(() => {
    if (!isOpen || paradasCustom) return;
    setParadas((p) => ({
      ...p,
      tramo: "ambos",
      localidad_subida: viajeForm.origen || "",
      localidad_bajada: viajeForm.destino_final || "",
    }));
  }, [isOpen, viajeForm.origen, viajeForm.destino_final, paradasCustom]);

  if (!isOpen) return null;

  const setParadaField = (field) => (event) => {
    setParadas((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetAndClose = () => {
    setViajeForm(initialViajeForm);
    setParadas(initialParadas);
    setExtra([]);
    setPerfilSelectKey((k) => k + 1);
    setDraftManual({ nombre: "", apellido: "", email: "" });
    setError("");
    setTransporteOcupadoMsg(null);
    setParadasCustom(false);
    onClose?.();
  };

  const addFromPerfil = (perfilId) => {
    if (!perfilId) return;
    const p = scrnPerfiles.find((x) => x.id === perfilId);
    if (!p) return;
    if (p.id === user?.id) return;
    setExtra((list) => [
      ...list,
      {
        key: newKey(),
        id_perfil: p.id,
        nombre: p.nombre || "",
        apellido: p.apellido || "",
        email: null,
        origen: "perfil",
      },
    ]);
    setPerfilSelectKey((k) => k + 1);
  };

  const addManual = () => {
    const n = draftManual.nombre.trim();
    const a = draftManual.apellido.trim();
    const e = draftManual.email.trim();
    if (!n || !a || !e) {
      setError("Completá nombre, apellido y email de la persona.");
      return;
    }
    setError("");
    setExtra((list) => [
      ...list,
      {
        key: newKey(),
        id_perfil: null,
        nombre: n,
        apellido: a,
        email: e,
        origen: "manual",
      },
    ]);
    setDraftManual({ nombre: "", apellido: "", email: "" });
  };

  const removeRow = (key) => {
    setExtra((list) => list.filter((r) => r.key !== key));
  };

  const fmtAlert = (d) =>
    d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user?.id) return;

    setError("");
    if (!viajeForm.id_transporte) {
      setError("Elegí un transporte.");
      return;
    }
    const tramoRes = paradasCustom ? paradas.tramo : "ambos";
    const su = (paradasCustom ? paradas.localidad_subida : viajeForm.origen || "").trim();
    const bj = (paradasCustom ? paradas.localidad_bajada : viajeForm.destino_final || "").trim();
    if (!su || !bj) {
      setError(
        "Faltan origen/destino del recorrido o subida/bajada. Elegí paradas personalizadas si hace falta.",
      );
      return;
    }

    const win = propuestaOcupacionWindowFromForm(
      viajeForm.fecha_salida,
      viajeForm.fecha_llegada_estimada,
      viajeForm.fecha_retorno || null,
    );
    if (!win) {
      setError("Revisá salida, “Llega a Origen” y, si aplica, retorno para solo vuelta.");
      return;
    }
    const tStart = win.start;
    const tEnd = win.end;
    if (Number.isNaN(tStart.getTime()) || Number.isNaN(tEnd.getTime())) {
      setError("Revisá salida, “Llega a Origen” y, si aplica, retorno para solo vuelta.");
      return;
    }
    if (tEnd < tStart) {
      setError("La franja de uso del transporte no puede terminar antes de la salida.");
      return;
    }

    if (plazasNecesarias > capSeleccionada) {
      setError(
        `Ese transporte admite ${capSeleccionada} plaza(s) para pasajeros como máximo (chofer y cupo fijo descontado); estás pidiendo ${plazasNecesarias} (vos inscribís + otras personas).`,
      );
      return;
    }

    const idTransporte = Number(viajeForm.id_transporte);
    const conflictos = findConflictingViajesForTransporte(
      idTransporte,
      tStart,
      tEnd,
      viajes,
    );
    if (conflictos.length > 0) {
      const msg = buildTransporteOcupadoAlerta(conflictos, fmtAlert);
      setTransporteOcupadoMsg(msg);
      return;
    }

    setSaving(true);

    const extraConPerfil = [];
    for (const row of extra) {
      if (row.id_perfil || !row.email?.trim()) {
        extraConPerfil.push(row);
        continue;
      }
      const res = await ensureScrnPerfilForNewEmail({
        email: row.email.trim(),
        nombre: (row.nombre || "").trim(),
        apellido: (row.apellido || "").trim(),
      });
      if (res.error) {
        setSaving(false);
        setError(res.error);
        return;
      }
      extraConPerfil.push({ ...row, id_perfil: res.id, email: null });
    }

    const paxForJson = extraConPerfil.map((row) => ({
      id_perfil: row.id_perfil || null,
      nombre: (row.nombre || "").trim(),
      apellido: (row.apellido || "").trim(),
      email: row.email ? row.email.trim() : null,
    }));

    const { error: insertError } = await supabase
      .from("scrn_solicitudes_nuevo_viaje")
      .insert({
        id_usuario: user.id,
        id_transporte: idTransporte,
        motivo: viajeForm.motivo.trim() || null,
        origen: viajeForm.origen.trim(),
        destino_final: viajeForm.destino_final.trim(),
        fecha_salida: tStart.toISOString(),
        fecha_llegada_estimada: new Date(viajeForm.fecha_llegada_estimada).toISOString(),
        fecha_retorno: viajeForm.fecha_retorno
          ? new Date(viajeForm.fecha_retorno).toISOString()
          : null,
        observaciones: viajeForm.observaciones.trim() || null,
        tramo: tramoRes,
        localidad_subida: su,
        obs_subida: (paradasCustom ? paradas.obs_subida : "").trim() || null,
        localidad_bajada: bj,
        obs_bajada: (paradasCustom ? paradas.obs_bajada : "").trim() || null,
        pasajeros_json: paxForJson,
        estado: "pendiente",
      });

    if (insertError) {
      setSaving(false);
      setError(
        insertError.message +
          (insertError.message?.includes("relation") || insertError.code === "42P01"
            ? "\n(¿Se ejecutó docs/transporte-scrn-solicitud-nuevo-viaje.sql en Supabase?)"
            : ""),
      );
      return;
    }

    try {
      await supabase.functions.invoke("mails_produccion", {
        body: {
          action: "enviar_mail",
          templateId: "scrn_transporte_evento",
          email: "filarmonica.scrn@gmail.com",
          detalle: {
            titulo: "Nueva propuesta de recorrido",
            lineas: [
              `Usuario: ${`${profile?.nombre || ""} ${profile?.apellido || ""}`.trim() || "Sin nombre"}`,
              `Email: ${user?.email || "Sin email"}`,
              `Origen: ${viajeForm?.origen || "-"}`,
              `Destino: ${viajeForm?.destino_final || "-"}`,
              `Salida: ${tStart ? tStart.toLocaleString("es-AR") : "-"}`,
              `Transporte: ${idTransporte || "-"}`,
              `Plazas solicitadas: ${plazasNecesarias}`,
            ],
          },
        },
      });
    } catch {
      // No bloquear si el mail falla
    }

    setSaving(false);
    resetAndClose();
    onSubmitted?.();
  };

  return createPortal(
    <>
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Proponer un recorrido nuevo</h3>
            <p className="text-xs text-slate-500 mt-1">
              Completá el viaje, “Llega a Origen” (cuando se libera el vehículo), las paradas y los
              otras personas en la propuesta. Por defecto las paradas son el recorrido completo. Un administrador lo
              revisa y, si lo aprueba, se crea el recorrido; si el transporte ya está ocupado en esa
              franja, se muestra un aviso.
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Plazas pedidas:{" "}
              <span className="font-bold text-slate-800">{plazasNecesarias}</span>
              {viajeForm.id_transporte
                ? ` · Cupo del transporte: ${capSeleccionada || "—"}`
                : null}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="shrink-0 px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <ViajeFormFields
            values={viajeForm}
            onFieldChange={(field, value) =>
              setViajeForm((prev) => ({ ...prev, [field]: value }))
            }
            localidades={localidades}
            transportes={transportes}
            fieldIdPrefix="prop-viaje"
          />

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Paradas de tu reserva
            </h4>
            {!paradasCustom ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                <p className="text-xs font-bold text-slate-800">Recorrido completo (por defecto)</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Se pide con tramo <span className="font-semibold">ambos</span>, subida en el origen
                  del recorrido y bajada en el destino que cargaste arriba (se actualizan si cambiás
                  origen o destino).
                </p>
                <button
                  type="button"
                  onClick={() => setParadasCustom(true)}
                  className="text-xs font-bold uppercase tracking-wide text-blue-700 hover:text-blue-900 underline"
                >
                  Cambiar subida, bajada o tramo
                </button>
              </div>
            ) : (
              <div className="space-y-3 border border-amber-200/80 rounded-xl p-3 bg-amber-50/40">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] text-amber-900 font-semibold">Paradas a tu medida</p>
                  <button
                    type="button"
                    onClick={() => {
                      setParadasCustom(false);
                      setParadas((p) => ({
                        ...p,
                        tramo: "ambos",
                        localidad_subida: viajeForm.origen || "",
                        localidad_bajada: viajeForm.destino_final || "",
                        obs_subida: "",
                        obs_bajada: "",
                      }));
                    }}
                    className="shrink-0 text-[10px] font-bold uppercase text-slate-600 hover:text-slate-800"
                  >
                    Volver al recorrido completo
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Tramo
                    </label>
                    <select
                      value={paradas.tramo}
                      onChange={setParadaField("tramo")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="ida">Ida</option>
                      <option value="vuelta">Vuelta</option>
                      <option value="ambos">Ambos</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Localidad de subida
                    </span>
                    <SearchableSelect
                      options={locOptions}
                      value={paradas.localidad_subida || null}
                      onChange={(v) =>
                        setParadas((prev) => ({ ...prev, localidad_subida: v || "" }))
                      }
                      placeholder="Buscar localidad de subida…"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Localidad de bajada
                    </span>
                    <SearchableSelect
                      options={locOptions}
                      value={paradas.localidad_bajada || null}
                      onChange={(v) =>
                        setParadas((prev) => ({ ...prev, localidad_bajada: v || "" }))
                      }
                      placeholder="Buscar localidad de bajada…"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Observaciones de subida (opcional)
                    </label>
                    <textarea
                      value={paradas.obs_subida}
                      onChange={setParadaField("obs_subida")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-14"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Observaciones de bajada (opcional)
                    </label>
                    <textarea
                      value={paradas.obs_bajada}
                      onChange={setParadaField("obs_bajada")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-14"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
            <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
              Otras personas (inicial)
            </p>
            <p className="text-[11px] text-slate-500">
              Vos inscribís la propuesta; cada fila abajo es otra persona, independiente.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Perfil existente</label>
                <select
                  key={perfilSelectKey}
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) addFromPerfil(v);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Añadir desde listado…</option>
                  {perfilesDisponibles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.apellido}, {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="space-y-1 sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-500">Nueva persona (sin login)</span>
              </div>
              <input
                value={draftManual.nombre}
                onChange={(e) => setDraftManual((d) => ({ ...d, nombre: e.target.value }))}
                placeholder="Nombre"
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                value={draftManual.apellido}
                onChange={(e) => setDraftManual((d) => ({ ...d, apellido: e.target.value }))}
                placeholder="Apellido"
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                type="email"
                value={draftManual.email}
                onChange={(e) => setDraftManual((d) => ({ ...d, email: e.target.value }))}
                placeholder="Email"
                className="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={addManual}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 text-xs font-bold uppercase"
                >
                  Añadir persona
                </button>
              </div>
            </div>
            {extra.length > 0 && (
              <ul className="text-xs space-y-1.5">
                {extra.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                  >
                    <span>
                      {row.apellido}, {row.nombre}
                      {row.email ? ` · ${row.email}` : ""}
                      {row.id_perfil ? " · (perfil)" : " · (invitado)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="text-rose-600 font-bold text-[11px] uppercase"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 whitespace-pre-wrap">
              {error}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-sm font-semibold"
            >
              {saving ? "Enviando…" : "Enviar propuesta"}
            </button>
          </div>
        </form>
      </div>
    </div>
    <AlertModal
      isOpen={Boolean(transporteOcupadoMsg)}
      onClose={() => setTransporteOcupadoMsg(null)}
      title="Transporte no disponible en esa franja"
      message={transporteOcupadoMsg || ""}
      buttonText="Entendido"
      overlayZClass="z-[110]"
      panelClassName="max-w-lg"
    />
    </>,
    document.body,
  );
}
