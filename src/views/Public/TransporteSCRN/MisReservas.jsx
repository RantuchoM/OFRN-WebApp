import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../services/supabase";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import { IconEdit, IconX } from "../../../components/ui/Icons";
import { localidadesToSearchableOptions } from "./localidadesSearchable";
import ReservaPasajerosEditor from "./ReservaPasajerosEditor";
import { requeueAceptadaToPendiente } from "./reservaGestionUtils";
import {
  getFilaVal,
  normEstado,
  PAX_PARADAS_KEYS,
  normParadaStr,
  getPaxParadasVal,
} from "./viajeReservaParadasUtils";
import { scrnEstadoBadgeClass } from "./scrnReservaEstadoUI";
import { scrnTransporteColorFromEntity } from "./scrnTransporteColor";
import { isSalidaHoyOFutura } from "./viajeSalidaTemporal";
import { paxEmailMostrar, paxNombreCompleto } from "./scrnReservaPaxUtils";

const TRAMO_LABEL = { ida: "Ida", vuelta: "Vuelta", ambos: "Ambos" };
const TRAMO_OPTS = [
  { value: "ida", label: "Ida" },
  { value: "vuelta", label: "Vuelta" },
  { value: "ambos", label: "Ambos" },
];

const PAX_ESTADO_OPTS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "aceptada", label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" },
  { value: "cancelada", label: "Anulada" },
];

const lbl = "text-[10px] font-bold uppercase tracking-wide text-slate-500";
const inp = "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm";

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ResumenParadasPaxReadonly({ reserva, pax }) {
  return (
    <div className="text-xs text-slate-600 space-y-1.5 border-t border-slate-200/90 pt-2 mt-1">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
        Paradas y plazas (solo lectura)
      </p>
      <div>
        <span className="text-slate-500">Tramo: </span>
        {TRAMO_LABEL[reserva.tramo] || reserva.tramo || "—"}
      </div>
      <div>
        <span className="text-slate-500">Subida: </span>
        {reserva.localidad_subida || "—"}
        {reserva.obs_subida ? (
          <span className="text-slate-500"> · {reserva.obs_subida}</span>
        ) : null}
      </div>
      <div>
        <span className="text-slate-500">Bajada: </span>
        {reserva.localidad_bajada || "—"}
        {reserva.obs_bajada ? (
          <span className="text-slate-500"> · {reserva.obs_bajada}</span>
        ) : null}
      </div>
      <div>
        <span className="text-slate-500">Plazas: </span>
        <span className="font-semibold text-slate-800">
          {1 + pax.length} persona{1 + pax.length === 1 ? "" : "s"} en total
          {pax.length > 0
            ? ` (quien inscribe la solicitud + ${pax.length} más)`
            : " (quien inscribe la solicitud)"}
        </span>
      </div>
      {pax.length > 0 && (
        <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
          {pax.map((a) => (
            <li key={a.id}>
              {paxNombreCompleto(a, null)}
              {paxEmailMostrar(a) ? (
                <span className="text-slate-500"> · {paxEmailMostrar(a)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MisReservas({
  user,
  reloadKey = 0,
  scrnPerfiles = [],
  localidades = [],
  onGestionCambiada,
}) {
  const [loading, setLoading] = useState(true);
  const [reservas, setReservas] = useState([]);
  const [viajesMap, setViajesMap] = useState({});
  const [paxReload, setPaxReload] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [estadoAlInicio, setEstadoAlInicio] = useState(null);
  const [paradaDraft, setParadaDraft] = useState(null);
  const [savingParadas, setSavingParadas] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);
  const [comoPasajero, setComoPasajero] = useState([]);
  const [editingPasajero, setEditingPasajero] = useState(null);
  const [paxRowDraft, setPaxRowDraft] = useState(null);
  const [savingPaxRow, setSavingPaxRow] = useState(false);

  const locOptions = useMemo(
    () => localidadesToSearchableOptions(localidades),
    [localidades],
  );

  const refetchPaxYReservas = useCallback(() => {
    setPaxReload((n) => n + 1);
  }, []);

  const abrirEdicion = (r) => {
    setEditingId(r.id);
    setEstadoAlInicio(r.estado || "pendiente");
    setParadaDraft({
      tramo: r.tramo || "ambos",
      localidad_subida: r.localidad_subida || "",
      localidad_bajada: r.localidad_bajada || "",
      obs_subida: r.obs_subida || "",
      obs_bajada: r.obs_bajada || "",
    });
  };

  const cerrarEdicion = () => {
    setEditingId(null);
    setEstadoAlInicio(null);
    setParadaDraft(null);
  };

  const cerrarEdicionPasajero = () => {
    setEditingPasajero(null);
    setPaxRowDraft(null);
  };

  const abrirEdicionPasajero = (item) => {
    const { pax, reserva } = item;
    setEditingPasajero(item);
    setPaxRowDraft({
      estado: pax.estado || "pendiente",
      tramo: getPaxParadasVal(pax, reserva, {}, {}, "tramo") || "ida",
      localidad_subida: getPaxParadasVal(pax, reserva, {}, {}, "localidad_subida") || "",
      localidad_bajada: getPaxParadasVal(pax, reserva, {}, {}, "localidad_bajada") || "",
      obs_subida: getPaxParadasVal(pax, reserva, {}, {}, "obs_subida") || "",
      obs_bajada: getPaxParadasVal(pax, reserva, {}, {}, "obs_bajada") || "",
    });
  };

  const afterCambioQueRequiereGestion = useCallback(() => {
    onGestionCambiada?.();
  }, [onGestionCambiada]);

  const paxOnReload = useCallback(
    async (reservaId) => {
      await requeueAceptadaToPendiente(reservaId);
      refetchPaxYReservas();
      afterCambioQueRequiereGestion();
    },
    [refetchPaxYReservas, afterCambioQueRequiereGestion],
  );

  const guardarParadas = useCallback(
    async (reserva) => {
      if (!paradaDraft) return;
      const su = String(paradaDraft.localidad_subida || "").trim();
      const bj = String(paradaDraft.localidad_bajada || "").trim();
      if (!su || !bj) {
        alert("Completá localidad de subida y de bajada.");
        return;
      }
      setSavingParadas(true);
      const { error } = await supabase
        .from("scrn_reservas")
        .update({
          tramo: paradaDraft.tramo || "ida",
          localidad_subida: su,
          localidad_bajada: bj,
          obs_subida: String(paradaDraft.obs_subida || "").trim() || null,
          obs_bajada: String(paradaDraft.obs_bajada || "").trim() || null,
        })
        .eq("id", reserva.id);
      if (error) {
        setSavingParadas(false);
        alert(`No se pudo guardar: ${error.message}`);
        return;
      }
      if (estadoAlInicio === "aceptada") {
        await requeueAceptadaToPendiente(reserva.id);
      }
      setSavingParadas(false);
      cerrarEdicion();
      refetchPaxYReservas();
      afterCambioQueRequiereGestion();
    },
    [paradaDraft, estadoAlInicio, refetchPaxYReservas, afterCambioQueRequiereGestion],
  );

  const cancelarReserva = useCallback(
    async (id) => {
      if (!window.confirm("¿Anular esta reservación? El equipo de transporte lo verá para gestionar.")) {
        return;
      }
      const { error } = await supabase
        .from("scrn_reservas")
        .update({ estado: "cancelada" })
        .eq("id", id);
      if (error) {
        alert(`No se pudo anular: ${error.message}\n` + (error.message?.includes("check") || error.message?.includes("constraint") ? "¿Existe el estado 'cancelada' en la base?" : ""));
        return;
      }
      cerrarEdicion();
      refetchPaxYReservas();
      afterCambioQueRequiereGestion();
    },
    [refetchPaxYReservas, afterCambioQueRequiereGestion],
  );

  const guardarMiFilaPasajero = useCallback(async () => {
    if (!editingPasajero || !paxRowDraft || !user?.id) return;
    const { pax, reserva } = editingPasajero;
    const su = String(paxRowDraft.localidad_subida || "").trim();
    const bj = String(paxRowDraft.localidad_bajada || "").trim();
    if (!su || !bj) {
      alert("Completá localidad de subida y de bajada.");
      return;
    }
    setSavingPaxRow(true);
    const up = { estado: normEstado(paxRowDraft.estado) };
    for (const k of PAX_PARADAS_KEYS) {
      const draftRaw =
        k === "tramo" ? paxRowDraft.tramo || "ida" : String(paxRowDraft[k] ?? "").trim();
      let tit = normParadaStr(getFilaVal(reserva, {}, k));
      if (k === "tramo" && !tit) tit = "ida";
      const d = normParadaStr(k === "tramo" ? draftRaw || "ida" : draftRaw);
      up[k] = d === tit ? null : (String(draftRaw || "").trim() || null);
    }
    const { error } = await supabase
      .from("scrn_reserva_pasajeros")
      .update(up)
      .eq("id", pax.id)
      .eq("id_perfil", user.id);
    if (error) {
      setSavingPaxRow(false);
      alert(
        `No se pudo guardar: ${error.message}\n` +
          (error.message?.includes("column") ? "¿Corriste docs/transporte-scrn-pasajeros-paradas.sql?" : ""),
      );
      return;
    }
    if (reserva.estado === "aceptada") {
      await requeueAceptadaToPendiente(reserva.id);
    }
    setSavingPaxRow(false);
    cerrarEdicionPasajero();
    refetchPaxYReservas();
    afterCambioQueRequiereGestion();
  }, [
    editingPasajero,
    paxRowDraft,
    user?.id,
    refetchPaxYReservas,
    afterCambioQueRequiereGestion,
  ]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      setLoading(true);

      const { data: reservasData, error: reservasError } = await supabase
        .from("scrn_reservas")
        .select("*")
        .eq("id_usuario", user.id)
        .order("created_at", { ascending: false });

      if (reservasError) {
        console.error("Error cargando reservas:", reservasError);
        setLoading(false);
        return;
      }

      const reservaList = reservasData || [];
      const titularReservaIds = new Set(reservaList.map((item) => item.id));
      const reservaIds = reservaList.map((item) => item.id);

      const { data: comoPaxRows, error: comoPaxErr } = await supabase
        .from("scrn_reserva_pasajeros")
        .select("*")
        .eq("id_perfil", user.id)
        .neq("estado", "cancelada");

      if (comoPaxErr) {
        console.error("Error cargando filas como pasajero:", comoPaxErr);
      }

      const filasComoPax = (comoPaxRows || []).filter(
        (row) => row.id_perfil && !titularReservaIds.has(row.id_reserva),
      );
      const reservaIdsComoPax = [...new Set(filasComoPax.map((p) => p.id_reserva))];

      let reservasComoMap = {};
      if (reservaIdsComoPax.length > 0) {
        const { data: rsComo, error: rComoErr } = await supabase
          .from("scrn_reservas")
          .select("*")
          .in("id", reservaIdsComoPax);
        if (rComoErr) {
          console.error("Error cargando reservas (como pasajero):", rComoErr);
        } else {
          (rsComo || []).forEach((rr) => {
            reservasComoMap[rr.id] = rr;
          });
        }
      }

      const viajeIdsTitular = [...new Set(reservaList.map((item) => item.id_viaje).filter(Boolean))];
      const viajeIdsComo = [
        ...new Set(
          Object.values(reservasComoMap)
            .map((r) => r.id_viaje)
            .filter(Boolean),
        ),
      ];
      const allViajeIds = [...new Set([...viajeIdsTitular, ...viajeIdsComo])];

      const [{ data: viajesData, error: viajesError }, { data: paxData, error: paxError }] =
        await Promise.all([
          allViajeIds.length
            ? supabase
                .from("scrn_viajes")
                .select("*, scrn_transportes(*)")
                .in("id", allViajeIds)
            : Promise.resolve({ data: [] }),
          reservaIds.length
            ? supabase
                .from("scrn_reserva_pasajeros")
                .select("*")
                .in("id_reserva", reservaIds)
                .order("id", { ascending: true })
            : Promise.resolve({ data: [] }),
        ]);

      if (viajesError) {
        console.error("Error cargando viajes de reservas:", viajesError);
      }
      if (paxError) {
        console.error("Error cargando pasajeros:", paxError);
      }

      const paxPids = [...new Set((paxData || []).map((r) => r.id_perfil).filter(Boolean))];
      const { data: paxProfs, error: paxProfErr } = paxPids.length
        ? await supabase.from("scrn_perfiles").select("id, nombre, apellido, dni").in("id", paxPids)
        : { data: [] };
      if (paxProfErr) {
        console.error("Error cargando perfiles de acompañantes:", paxProfErr);
      }
      const paxPerfilMap = Object.fromEntries((paxProfs || []).map((p) => [p.id, p]));

      const paxByReserva = {};
      (paxData || []).forEach((row) => {
        if (!paxByReserva[row.id_reserva]) paxByReserva[row.id_reserva] = [];
        paxByReserva[row.id_reserva].push({
          ...row,
          perfil: row.id_perfil ? paxPerfilMap[row.id_perfil] || null : null,
        });
      });

      const nextMap = {};
      (viajesData || []).forEach((viaje) => {
        nextMap[viaje.id] = viaje;
      });

      const listaComo = filasComoPax
        .map((pax) => {
          const res = reservasComoMap[pax.id_reserva];
          if (!res) return null;
          return {
            pax,
            reserva: res,
            viaje: nextMap[res.id_viaje] || null,
          };
        })
        .filter(Boolean);

      setReservas(reservaList.map((r) => ({ ...r, pasajeros: paxByReserva[r.id] || [] })));
      setViajesMap(nextMap);
      setComoPasajero(listaComo);
      setLoading(false);
    };

    loadData();
  }, [reloadKey, paxReload, user?.id]);

  const hasData = useMemo(
    () => reservas.length > 0 || comoPasajero.length > 0,
    [reservas.length, comoPasajero.length],
  );

  const reservasMostradas = useMemo(() => {
    if (verHistorial) return reservas;
    return reservas.filter((r) => {
      const v = viajesMap[r.id_viaje];
      return isSalidaHoyOFutura(v?.fecha_salida);
    });
  }, [reservas, viajesMap, verHistorial]);

  const comoPasajeroMostrados = useMemo(() => {
    if (verHistorial) return comoPasajero;
    return comoPasajero.filter(({ viaje }) => isSalidaHoyOFutura(viaje?.fecha_salida));
  }, [comoPasajero, verHistorial]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-3">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm md:text-base font-extrabold text-slate-800 uppercase tracking-wide">
            Mis viajes
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Como <span className="font-semibold">titular</span> podés editar la solicitud y acompañantes; como{" "}
            <span className="font-semibold">pasajero con perfil</span> (otra persona te cargó) editás solo tu
            fila. Con cambios relevantes, la solicitud puede volver a{" "}
            <span className="font-semibold">pendiente de revisión</span>. La{" "}
            <span className="font-semibold">X anula</span> solo si sos quien inscribió esa reserva.
          </p>
        </div>
        {hasData && (
          <button
            type="button"
            onClick={() => setVerHistorial((x) => !x)}
            className="shrink-0 self-start rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            {verHistorial ? "Ocultar historial" : "Ver historial"}
          </button>
        )}
      </header>

      {!verHistorial && hasData && (
        <p className="text-[11px] text-slate-500 -mt-1">
          Por defecto solo se listan reservas cuyo recorrido tiene salida hoy o más adelante.
        </p>
      )}

      {loading && (
        <div className="text-sm text-slate-500">Cargando reservaciones...</div>
      )}

      {!loading && !hasData && (
        <div className="text-sm text-slate-500">
          Aún no registrás solicitudes de transporte.
        </div>
      )}

      {!loading &&
        hasData &&
        reservasMostradas.length === 0 &&
        comoPasajeroMostrados.length === 0 &&
        !verHistorial && (
        <div className="text-sm text-slate-600 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          No tenés viajes próximos (salidas anteriores a hoy).{" "}
          <button
            type="button"
            onClick={() => setVerHistorial(true)}
            className="text-xs font-bold text-indigo-700 underline hover:text-indigo-900"
          >
            Ver historial
          </button>
        </div>
      )}

      {!loading &&
        reservasMostradas.length > 0 &&
        reservasMostradas.map((reserva) => {
          const viaje = viajesMap[reserva.id_viaje];
          const estado = reserva.estado || "pendiente";
          const pax = reserva.pasajeros || [];
          const puedeGestionar = estado === "pendiente" || estado === "aceptada";
          const isEditing = editingId === reserva.id;
          return (
            <article
              key={reserva.id}
              className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2"
            >
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-slate-800 leading-snug break-words w-full pr-0">
                  {viaje?.origen || "Origen"} - {viaje?.destino_final || "Destino"}
                </h4>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 w-full min-w-0">
                  <div className="text-xs text-slate-500 min-w-0 flex-1 sm:flex-none">
                    Creada: {formatDateTime(reserva.created_at)}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wide border px-2 py-1 rounded-full ${scrnEstadoBadgeClass(estado)}`}
                    >
                      {estado}
                    </span>
                    {puedeGestionar && !isEditing && (
                      <button
                        type="button"
                        title="Editar paradas u otras personas"
                        onClick={() => abrirEdicion(reserva)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        <IconEdit size={16} />
                      </button>
                    )}
                    {puedeGestionar && !isEditing && (
                      <button
                        type="button"
                        title="Anular reservación"
                        onClick={() => cancelarReserva(reserva.id)}
                        className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                      >
                        <IconX size={16} />
                      </button>
                    )}
                    {puedeGestionar && isEditing && (
                      <button
                        type="button"
                        title="Cerrar sin guardar (paradas)"
                        onClick={cerrarEdicion}
                        className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 text-xs font-bold"
                      >
                        <IconX size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-600 grid sm:grid-cols-2 gap-2">
                <span>Salida: {formatDateTime(viaje?.fecha_salida)}</span>
                <span>
                  Llegada estimada (fin de recorrido):{" "}
                  {formatDateTime(viaje?.fecha_llegada_estimada)}
                </span>
                {viaje?.fecha_retorno ? (
                  <span className="sm:col-span-2">
                    Retorno: {formatDateTime(viaje.fecha_retorno)}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 flex-wrap min-w-0 sm:col-span-2">
                  <span>Transporte:</span>
                  <span
                    className="inline-block h-3.5 w-3.5 rounded border border-slate-300/90 shrink-0"
                    style={{ backgroundColor: scrnTransporteColorFromEntity(viaje?.scrn_transportes) }}
                    title={viaje?.scrn_transportes?.nombre || ""}
                    aria-hidden
                  />
                  <span>{viaje?.scrn_transportes?.nombre || "-"}</span>
                </span>
              </div>

              {!isEditing && (
                <ResumenParadasPaxReadonly reserva={reserva} pax={pax} />
              )}

              {isEditing && paradaDraft && (
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                    Editar paradas
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className={lbl} htmlFor={`m-${reserva.id}-t`}>
                        Tramo
                      </label>
                      <select
                        id={`m-${reserva.id}-t`}
                        className={inp + " bg-white"}
                        value={paradaDraft.tramo}
                        onChange={(e) =>
                          setParadaDraft((d) => ({ ...d, tramo: e.target.value }))
                        }
                      >
                        {TRAMO_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className={lbl}>Localidad de subida</span>
                      <SearchableSelect
                        options={locOptions}
                        value={paradaDraft.localidad_subida || null}
                        onChange={(v) =>
                          setParadaDraft((d) => ({ ...d, localidad_subida: v || "" }))
                        }
                        placeholder="Buscar localidad…"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className={lbl}>Localidad de bajada</span>
                      <SearchableSelect
                        options={locOptions}
                        value={paradaDraft.localidad_bajada || null}
                        onChange={(v) =>
                          setParadaDraft((d) => ({ ...d, localidad_bajada: v || "" }))
                        }
                        placeholder="Buscar localidad…"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className={lbl} htmlFor={`m-${reserva.id}-ou`}>
                        Obs. subida
                      </label>
                      <textarea
                        id={`m-${reserva.id}-ou`}
                        className={inp + " min-h-14"}
                        value={paradaDraft.obs_subida}
                        onChange={(e) =>
                          setParadaDraft((d) => ({ ...d, obs_subida: e.target.value }))
                        }
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className={lbl} htmlFor={`m-${reserva.id}-ob`}>
                        Obs. bajada
                      </label>
                      <textarea
                        id={`m-${reserva.id}-ob`}
                        className={inp + " min-h-14"}
                        value={paradaDraft.obs_bajada}
                        onChange={(e) =>
                          setParadaDraft((d) => ({ ...d, obs_bajada: e.target.value }))
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={cerrarEdicion}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      disabled={savingParadas}
                      onClick={() => guardarParadas(reserva)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
                    >
                      {savingParadas ? "Guardando…" : "Guardar paradas"}
                    </button>
                  </div>
                </div>
              )}

              {isEditing && (
                <ReservaPasajerosEditor
                  reserva={{ ...reserva, pasajeros: pax }}
                  allProfiles={scrnPerfiles}
                  onReload={async () => paxOnReload(reserva.id)}
                />
              )}
            </article>
          );
        })}

      {!loading && comoPasajeroMostrados.length > 0 && (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
            Figurás como pasajero (tu perfil vinculado)
          </h4>
          {comoPasajeroMostrados.map((item) => {
            const { pax, reserva, viaje } = item;
            const estadoMiFila = normEstado(pax.estado);
            const estadoSolicitud = normEstado(reserva.estado);
            const puedeEditarFila = estadoMiFila === "pendiente" || estadoMiFila === "aceptada";
            const isEd = editingPasajero?.pax?.id === pax.id;
            return (
              <article
                key={`pax-${pax.id}`}
                className="border border-indigo-200/80 rounded-xl p-3 bg-indigo-50/40 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-indigo-800">
                      Solicitud de otra persona
                    </p>
                    <h4 className="text-sm font-bold text-slate-900">
                      {viaje?.origen || "Origen"} — {viaje?.destino_final || "Destino"}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Tu plaza:{" "}
                      <span
                        className={`font-bold uppercase text-[10px] border px-1.5 py-0.5 rounded-full ${scrnEstadoBadgeClass(estadoMiFila)}`}
                      >
                        {estadoMiFila}
                      </span>
                      <span className="text-slate-500"> · Solicitud: {estadoSolicitud}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {puedeEditarFila && !isEd && (
                      <button
                        type="button"
                        title="Editar tu tramo y paradas"
                        onClick={() => abrirEdicionPasajero(item)}
                        className="p-1.5 rounded-lg border border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50"
                      >
                        <IconEdit size={16} />
                      </button>
                    )}
                    {isEd && (
                      <button
                        type="button"
                        title="Cerrar"
                        onClick={cerrarEdicionPasajero}
                        className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                      >
                        <IconX size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-600 grid sm:grid-cols-2 gap-2">
                  <span>Salida: {formatDateTime(viaje?.fecha_salida)}</span>
                  <span className="inline-flex items-center gap-1.5 flex-wrap min-w-0 sm:col-span-2">
                    <span>Transporte:</span>
                    <span
                      className="inline-block h-3.5 w-3.5 rounded border border-slate-300/90 shrink-0"
                      style={{ backgroundColor: scrnTransporteColorFromEntity(viaje?.scrn_transportes) }}
                      aria-hidden
                    />
                    <span>{viaje?.scrn_transportes?.nombre || "-"}</span>
                  </span>
                </div>

                {!isEd && (
                  <div className="text-xs text-slate-700 space-y-1 border-t border-indigo-100 pt-2">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Tus paradas</p>
                    <div>
                      <span className="text-slate-500">Tramo: </span>
                      {TRAMO_LABEL[getPaxParadasVal(pax, reserva, {}, {}, "tramo")] ||
                        getPaxParadasVal(pax, reserva, {}, {}, "tramo") ||
                        "—"}
                    </div>
                    <div>
                      <span className="text-slate-500">Subida: </span>
                      {getPaxParadasVal(pax, reserva, {}, {}, "localidad_subida") || "—"}
                    </div>
                    <div>
                      <span className="text-slate-500">Bajada: </span>
                      {getPaxParadasVal(pax, reserva, {}, {}, "localidad_bajada") || "—"}
                    </div>
                  </div>
                )}

                {isEd && paxRowDraft && (
                  <div className="border-t border-indigo-100 pt-3 space-y-2">
                    <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                      Tu tramo y paradas
                    </p>
                    <div className="space-y-1">
                      <label className={lbl} htmlFor={`pax-${pax.id}-est`}>
                        Estado de tu plaza
                      </label>
                      <select
                        id={`pax-${pax.id}-est`}
                        className={inp + " bg-white"}
                        value={paxRowDraft.estado}
                        onChange={(e) =>
                          setPaxRowDraft((d) => ({ ...d, estado: e.target.value }))
                        }
                      >
                        {PAX_ESTADO_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={lbl} htmlFor={`pax-${pax.id}-t`}>
                          Tramo
                        </label>
                        <select
                          id={`pax-${pax.id}-t`}
                          className={inp + " bg-white"}
                          value={paxRowDraft.tramo}
                          onChange={(e) =>
                            setPaxRowDraft((d) => ({ ...d, tramo: e.target.value }))
                          }
                        >
                          {TRAMO_OPTS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className={lbl}>Subida</span>
                        <SearchableSelect
                          options={locOptions}
                          value={paxRowDraft.localidad_subida || null}
                          onChange={(v) =>
                            setPaxRowDraft((d) => ({ ...d, localidad_subida: v || "" }))
                          }
                          placeholder="Localidad…"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className={lbl}>Bajada</span>
                        <SearchableSelect
                          options={locOptions}
                          value={paxRowDraft.localidad_bajada || null}
                          onChange={(v) =>
                            setPaxRowDraft((d) => ({ ...d, localidad_bajada: v || "" }))
                          }
                          placeholder="Localidad…"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className={lbl} htmlFor={`pax-${pax.id}-ou`}>
                          Obs. subida
                        </label>
                        <textarea
                          id={`pax-${pax.id}-ou`}
                          className={inp + " min-h-14"}
                          value={paxRowDraft.obs_subida}
                          onChange={(e) =>
                            setPaxRowDraft((d) => ({ ...d, obs_subida: e.target.value }))
                          }
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className={lbl} htmlFor={`pax-${pax.id}-ob`}>
                          Obs. bajada
                        </label>
                        <textarea
                          id={`pax-${pax.id}-ob`}
                          className={inp + " min-h-14"}
                          value={paxRowDraft.obs_bajada}
                          onChange={(e) =>
                            setPaxRowDraft((d) => ({ ...d, obs_bajada: e.target.value }))
                          }
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={cerrarEdicionPasajero}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
                      >
                        Cerrar
                      </button>
                      <button
                        type="button"
                        disabled={savingPaxRow}
                        onClick={guardarMiFilaPasajero}
                        className="px-3 py-1.5 rounded-lg bg-indigo-800 text-white text-xs font-bold disabled:opacity-50"
                      >
                        {savingPaxRow ? "Guardando…" : "Guardar"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
