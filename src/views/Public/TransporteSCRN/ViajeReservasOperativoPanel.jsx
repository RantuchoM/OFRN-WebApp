import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../services/supabase";
import AlertModal from "../../../components/ui/AlertModal";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import {
  getFilaVal,
  isFilaDirty,
  normEstado,
  PAX_PARADAS_KEYS,
  getPaxParadasVal,
  hasPaxParadasDraftChanges,
  normParadaStr,
} from "./viajeReservaParadasUtils";
import { requeueAceptadaToPendiente } from "./reservaGestionUtils";
import { scrnEstadoSelectClassName } from "./scrnReservaEstadoUI";
import { IconSave, IconTrash, IconX } from "../../../components/ui/Icons";
import ReservaPasajerosEditor from "./ReservaPasajerosEditor";
import ViajePaquetesPanel from "./ViajePaquetesPanel";
import { paxEmailMostrar, paxNombreCompleto } from "./scrnReservaPaxUtils";

const TRAMO_OPTS = [
  { value: "ida", label: "Ida" },
  { value: "vuelta", label: "Vuelta" },
  { value: "ambos", label: "Ambos" },
];

const ESTADO_OPTS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "aceptada", label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" },
  { value: "cancelada", label: "Anulada" },
];

const thBase =
  "border-b-2 border-slate-300 bg-slate-200/95 text-slate-800 text-left font-semibold px-2 py-2 align-bottom border-x border-slate-200/80 first:border-l-0 last:border-r-0";
const tdBase = "border border-slate-200 align-middle px-1.5 py-1.5 min-h-[3.25rem]";
const cellInp =
  "w-full min-w-0 h-9 text-[11px] rounded-md border border-slate-300 px-1.5 box-border bg-white text-slate-800 shadow-sm focus:ring-1 focus:ring-blue-500/30 focus:border-blue-400";
const cellEstadoSelectBase =
  "w-full min-w-0 h-9 text-[11px] rounded-md px-1.5 box-border shadow-sm focus:ring-1 focus:ring-blue-500/30 focus:outline-none";
const cellTa =
  "w-full min-w-0 h-[2.5rem] min-h-[2.5rem] max-h-24 resize-y text-[11px] rounded-md border border-slate-300 px-1.5 py-1 box-border bg-white text-slate-800 leading-snug focus:ring-1 focus:ring-blue-500/30 focus:border-blue-400";

function estadoRowBg(estado) {
  const x = normEstado(estado);
  if (x === "aceptada") return "bg-emerald-50/80";
  if (x === "pendiente") return "bg-amber-50/80";
  if (x === "rechazada") return "bg-rose-50/80";
  if (x === "cancelada") return "bg-slate-100/90 text-slate-600";
  return "bg-white";
}

function Th2({ className = "", line1, line2, align = "left" }) {
  const a =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <th className={`${thBase} ${a} ${className}`} scope="col">
      <span className="block text-xs font-bold leading-snug text-slate-900">{line1}</span>
      {line2 ? (
        <span className="mt-0.5 block text-[10px] font-normal normal-case leading-tight text-slate-500">
          {line2}
        </span>
      ) : null}
    </th>
  );
}

function formatMini(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function normPaxEst(p, paxEdits) {
  if (paxEdits[p.id] && Object.prototype.hasOwnProperty.call(paxEdits[p.id], "estado")) {
    return normEstado(paxEdits[p.id].estado);
  }
  return normEstado(p.estado);
}

function isPaxDirty(p, paxEdits) {
  const e = paxEdits[p.id];
  if (!e || e.estado === undefined) return false;
  return normEstado(p.estado) !== normEstado(e.estado);
}

/**
 * Cada persona (fila de solicitud o de scrn_reserva_pasajeros) tiene estado propio.
 */
export default function ViajeReservasOperativoPanel({
  viajeId,
  localidades = [],
  allProfiles = [],
  onDataChanged,
  isAdmin = false,
  viajeForDefaults = null,
}) {
  const [reservas, setReservas] = useState([]);
  const [edits, setEdits] = useState({});
  const [paxEdits, setPaxEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [savedFlashId, setSavedFlashId] = useState(null);
  const [savedPaxFlashId, setSavedPaxFlashId] = useState(null);
  const [paxIdToDelete, setPaxIdToDelete] = useState(null);
  const [reservaIdToDelete, setReservaIdToDelete] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [nuevaReservaBusy, setNuevaReservaBusy] = useState(false);
  const [nuevaReservaFormAbierta, setNuevaReservaFormAbierta] = useState(false);
  const [nuevaReservaForm, setNuevaReservaForm] = useState({
    id_usuario: "",
    tramo: "ambos",
    localidad_subida: "",
    localidad_bajada: "",
    obs_subida: "",
    obs_bajada: "",
    estado: "aceptada",
  });

  const load = useCallback(async () => {
    if (viajeId == null) return;
    setLoading(true);

    const { data: rsv, error: rerr } = await supabase
      .from("scrn_reservas")
      .select("*")
      .eq("id_viaje", viajeId)
      .order("created_at", { ascending: true });

    if (rerr) {
      console.error("Error cargando reservas del viaje:", rerr);
      setReservas([]);
      setEdits({});
      setPaxEdits({});
      setLoading(false);
      return;
    }

    const list = rsv || [];
    const uids = [...new Set(list.map((r) => r.id_usuario).filter(Boolean))];
    const rids = list.map((r) => r.id);

    const { data: paxData } = rids.length
      ? await supabase
          .from("scrn_reserva_pasajeros")
          .select("*")
          .in("id_reserva", rids)
          .order("id", { ascending: true })
      : { data: [] };

    const paxPids = [...new Set((paxData || []).map((x) => x.id_perfil).filter(Boolean))];
    const allProfIds = [...new Set([...uids, ...paxPids])];

    const { data: perfilesData } = allProfIds.length
      ? await supabase.from("scrn_perfiles").select("id, nombre, apellido, dni").in("id", allProfIds)
      : { data: [] };

    const perfMap = {};
    (perfilesData || []).forEach((p) => {
      perfMap[p.id] = p;
    });

    const pMap = {};
    (paxData || []).forEach((p) => {
      if (!pMap[p.id_reserva]) pMap[p.id_reserva] = [];
      pMap[p.id_reserva].push({
        ...p,
        estado: p.estado ?? "pendiente",
        perfil: p.id_perfil ? perfMap[p.id_perfil] || null : null,
      });
    });

    const enriched = list.map((row) => ({
      ...row,
      perfil: perfMap[row.id_usuario] || null,
      pasajeros: pMap[row.id] || [],
    }));

    setReservas(enriched);
    setEdits({});
    setPaxEdits({});
    setLoading(false);
  }, [viajeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setNuevaReservaFormAbierta(false);
  }, [viajeId]);

  useEffect(() => {
    if (!viajeForDefaults) return;
    setNuevaReservaForm((f) => ({
      ...f,
      localidad_subida: viajeForDefaults.origen || "",
      localidad_bajada: viajeForDefaults.destino_final || "",
      tramo: "ambos",
    }));
  }, [viajeForDefaults?.id, viajeForDefaults?.origen, viajeForDefaults?.destino_final]);

  const paxPerfilesById = useMemo(() => {
    const m = {};
    (allProfiles || []).forEach((p) => {
      if (p?.id) m[p.id] = p;
    });
    (reservas || []).forEach((r) => {
      (r.pasajeros || []).forEach((px) => {
        if (px?.id_perfil && px?.perfil) m[px.id_perfil] = px.perfil;
      });
    });
    return m;
  }, [allProfiles, reservas]);

  const setField = (id, key) => (e) => {
    const v = e.target.value;
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: v },
    }));
  };

  const setPaxField = (paxId) => (e) => {
    const v = e.target.value;
    setPaxEdits((prev) => ({
      ...prev,
      [paxId]: { ...prev[paxId], estado: v },
    }));
  };

  const setPaxParada = (paxId, key) => (value) => {
    setPaxEdits((prev) => ({
      ...prev,
      [paxId]: { ...prev[paxId], [key]: value },
    }));
  };

  const solicitudAnulada = (r) => normEstado(r.estado) === "cancelada";

  const profileIdsCargadosPorViaje = useMemo(() => {
    const ids = new Set();
    (reservas || []).forEach((r) => {
      if (normEstado(r.estado) !== "cancelada" && r.id_usuario) ids.add(r.id_usuario);
      (r.pasajeros || []).forEach((p) => {
        if (p.id_perfil && normEstado(p.estado || "pendiente") !== "cancelada") {
          ids.add(p.id_perfil);
        }
      });
    });
    return ids;
  }, [reservas]);

  const excludedIdsForReserva = useCallback(
    (r) => {
      const ids = new Set(profileIdsCargadosPorViaje);
      ids.delete(r.id_usuario);
      (r.pasajeros || []).forEach((p) => {
        if (p.id_perfil) ids.delete(p.id_perfil);
      });
      return [...ids];
    },
    [profileIdsCargadosPorViaje],
  );

  const perfilesDisponiblesNuevaReserva = useMemo(() => {
    if (!isAdmin || !allProfiles?.length) return [];
    return (allProfiles || []).filter((p) => p.id && !profileIdsCargadosPorViaje.has(p.id));
  }, [isAdmin, allProfiles, profileIdsCargadosPorViaje]);

  const crearReservaAdmin = async () => {
    if (!isAdmin || viajeId == null) return;
    const uid = nuevaReservaForm.id_usuario;
    const su = String(nuevaReservaForm.localidad_subida || "").trim();
    const bj = String(nuevaReservaForm.localidad_bajada || "").trim();
    if (!uid || !su || !bj) {
      setAlertModal({
        title: "Faltan datos",
        message: "Elegí el perfil solicitante y completá subida y bajada.",
      });
      return;
    }
    if (
      typeof viajeForDefaults?.plazasDisponibles === "number" &&
      viajeForDefaults.plazasDisponibles <= 0
    ) {
      setAlertModal({
        title: "Sin cupo",
        message: "Este recorrido no tiene plazas disponibles para una reserva nueva.",
      });
      return;
    }
    setNuevaReservaBusy(true);
    const { error } = await supabase.from("scrn_reservas").insert({
      id_viaje: viajeId,
      id_usuario: uid,
      estado: nuevaReservaForm.estado || "aceptada",
      tramo: nuevaReservaForm.tramo || "ambos",
      localidad_subida: su,
      localidad_bajada: bj,
      obs_subida: String(nuevaReservaForm.obs_subida || "").trim() || null,
      obs_bajada: String(nuevaReservaForm.obs_bajada || "").trim() || null,
    });
    setNuevaReservaBusy(false);
    if (error) {
      setAlertModal({
        title: "No se pudo crear la reserva",
        message: error.message || "Error al insertar en scrn_reservas.",
      });
      return;
    }
    setNuevaReservaForm((f) => ({
      ...f,
      id_usuario: "",
      obs_subida: "",
      obs_bajada: "",
      estado: "aceptada",
    }));
    setNuevaReservaFormAbierta(false);
    await load();
    onDataChanged?.();
  };

  const doSaveFila = async (r) => {
    const d = { ...r, ...edits[r.id] };
    const su = String(d.localidad_subida || "").trim();
    const bj = String(d.localidad_bajada || "").trim();
    if (!su || !bj) {
      setAlertModal({
        title: "Faltan datos",
        message: "Completá localidad de subida y de bajada antes de guardar.",
      });
      return;
    }
    const estado = normEstado(d.estado);
    setSavingKey(`r-${r.id}`);
    const { error } = await supabase
      .from("scrn_reservas")
      .update({
        tramo: d.tramo || "ida",
        localidad_subida: su,
        localidad_bajada: bj,
        obs_subida: String(d.obs_subida || "").trim() || null,
        obs_bajada: String(d.obs_bajada || "").trim() || null,
        estado,
      })
      .eq("id", r.id);
    setSavingKey(null);
    if (error) {
      setAlertModal({
        title: "No se pudo guardar",
        message: error.message || "Error desconocido al actualizar la reserva.",
      });
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[r.id];
      return next;
    });
    setSavedFlashId(r.id);
    setTimeout(() => {
      setSavedFlashId((cur) => (cur === r.id ? null : cur));
    }, 2000);
    await load();
    onDataChanged?.();
  };

  const requestSaveFila = (r) => {
    const d = { ...r, ...edits[r.id] };
    const su = String(d.localidad_subida || "").trim();
    const bj = String(d.localidad_bajada || "").trim();
    if (!su || !bj) {
      setAlertModal({
        title: "Faltan datos",
        message: "Completá localidad de subida y de bajada antes de guardar.",
      });
      return;
    }
    const nextE = normEstado(d.estado);
    const prevE = normEstado(r.estado);

    if (nextE === "cancelada" && prevE !== "cancelada") {
      setConfirmModal({
        title: "Anular solicitud (quien inscribió)",
        message:
          "¿Anular toda la solicitud a quien inscribió? Las paradas dejan de editarse; podés reactivar el estado después.",
        confirmText: "Anular",
        confirmClassName:
          "px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md transition-all active:scale-[0.98] w-full sm:w-auto",
        onConfirm: () => doSaveFila(r),
      });
      return;
    }
    if (prevE === "cancelada" && nextE !== "cancelada") {
      setConfirmModal({
        title: "Reactivar solicitud",
        message: "¿Confirmar el nuevo estado y las paradas guardadas?",
        confirmText: "Confirmar",
        onConfirm: () => doSaveFila(r),
      });
      return;
    }
    doSaveFila(r);
  };

  const revertFila = (r) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[r.id];
      return next;
    });
  };

  const doSavePax = async (p, r) => {
    const st = normPaxEst(p, paxEdits);
    const up = { estado: st };
    for (const k of PAX_PARADAS_KEYS) {
      const draft = getPaxParadasVal(p, r, edits, paxEdits, k);
      const tit = getFilaVal(r, edits, k);
      const d = normParadaStr(draft);
      const t = normParadaStr(tit);
      up[k] = d === t ? null : (String(draft || "").trim() || null);
    }
    setSavingKey(`p-${p.id}`);
    const { error } = await supabase.from("scrn_reserva_pasajeros").update(up).eq("id", p.id);
    setSavingKey(null);
    if (error) {
      setAlertModal({
        title: "No se pudo guardar",
        message:
          error.message ||
          "Error al actualizar la persona. ¿Corriste docs/transporte-scrn-pasajeros-paradas.sql?",
      });
      return;
    }
    const prevAccepted = normEstado(r.estado) === "aceptada";
    const estadoChanged = normEstado(st) !== normEstado(p.estado);
    if (
      prevAccepted &&
      (estadoChanged || hasPaxParadasDraftChanges(p, r, edits, paxEdits))
    ) {
      await requeueAceptadaToPendiente(r.id);
    }
    setPaxEdits((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
    setSavedPaxFlashId(p.id);
    setTimeout(() => setSavedPaxFlashId((cur) => (cur === p.id ? null : cur)), 2000);
    await load();
    onDataChanged?.();
  };

  const requestSavePax = (p, r) => {
    const nextE = normPaxEst(p, paxEdits);
    const prevE = normEstado(p.estado);
    if (nextE === "cancelada" && prevE !== "cancelada") {
      setConfirmModal({
        title: "Anular persona",
        message: "¿Anular esta persona en la solicitud? Dejará de contar como plaza aceptada.",
        confirmText: "Anular",
        confirmClassName:
          "px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md transition-all active:scale-[0.98] w-full sm:w-auto",
        onConfirm: () => doSavePax(p, r),
      });
      return;
    }
    if (prevE === "cancelada" && nextE !== "cancelada") {
      setConfirmModal({
        title: "Reactivar persona",
        message: "¿Confirmar el nuevo estado para esta persona?",
        confirmText: "Confirmar",
        onConfirm: () => doSavePax(p, r),
      });
      return;
    }
    doSavePax(p, r);
  };

  const revertPax = (p) => {
    setPaxEdits((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
  };

  const runDeletePax = async (paxId) => {
    setSavingKey(`del-${paxId}`);
    const { error } = await supabase.from("scrn_reserva_pasajeros").delete().eq("id", paxId);
    setSavingKey(null);
    if (error) {
      setAlertModal({ title: "No se pudo quitar", message: error.message });
      return;
    }
    setPaxIdToDelete(null);
    setPaxEdits((prev) => {
      const next = { ...prev };
      delete next[paxId];
      return next;
    });
    await load();
    onDataChanged?.();
  };

  const runDeleteReserva = async (id) => {
    setReservaIdToDelete(null);
    if (id == null) return;
    setSavingKey(`del-r-${id}`);
    const { error: pErr } = await supabase
      .from("scrn_reserva_pasajeros")
      .delete()
      .eq("id_reserva", id);
    if (pErr) {
      setSavingKey(null);
      setAlertModal({ title: "No se pudo eliminar", message: pErr.message });
      return;
    }
    const { error: rErr } = await supabase.from("scrn_reservas").delete().eq("id", id);
    setSavingKey(null);
    if (rErr) {
      setAlertModal({ title: "No se pudo eliminar la reserva", message: rErr.message });
      return;
    }
    setEdits((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await load();
    onDataChanged?.();
  };

  const derived = (r, idx) => {
    const effSt = normEstado(getFilaVal(r, edits, "estado"));
    const isDead = effSt === "rechazada" || effSt === "cancelada";
    const filaDirty = isFilaDirty(r, edits);
    const justSaved = savedFlashId === r.id;
    const cellBg = justSaved ? "bg-sky-100/80" : filaDirty ? "bg-amber-100/90" : estadoRowBg(effSt);
    const td = `${tdBase} ${cellBg}`;
    const pVal = (key) => getFilaVal(r, edits, key);
    return { effSt, isDead, filaDirty, justSaved, cellBg, td, pVal };
  };

  const derivedPax = (p, r, groupIdx) => {
    const eff = normPaxEst(p, paxEdits);
    const isDead = eff === "rechazada" || eff === "cancelada";
    const dirty = isPaxDirty(p, paxEdits) || hasPaxParadasDraftChanges(p, r, edits, paxEdits);
    const justSaved = savedPaxFlashId === p.id;
    const cellBg = solicitudAnulada(r)
      ? "bg-slate-100/90 text-slate-600"
      : justSaved
        ? "bg-sky-100/80"
        : dirty
          ? "bg-amber-100/90"
          : estadoRowBg(eff);
    const td = `${tdBase} ${cellBg}`;
    return { eff, isDead, dirty, justSaved, cellBg, td };
  };

  if (loading) {
    return (
      <div className="text-xs text-slate-500 py-1 border-t border-slate-200">
        Cargando reservas…
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 pt-2 mt-1 text-left w-full min-w-0">
      <AlertModal
        isOpen={Boolean(alertModal)}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title || ""}
        message={alertModal?.message || ""}
      />
      <ConfirmModal
        isOpen={Boolean(confirmModal)}
        onClose={() => setConfirmModal(null)}
        onConfirm={confirmModal?.onConfirm}
        title={confirmModal?.title || ""}
        message={confirmModal?.message || ""}
        confirmText={confirmModal?.confirmText}
        confirmClassName={confirmModal?.confirmClassName}
      />
      <ConfirmModal
        isOpen={paxIdToDelete != null}
        onClose={() => setPaxIdToDelete(null)}
        title="Quitar persona"
        message="¿Eliminar a esta persona de la solicitud? No podrá recuperarse."
        confirmText="Quitar"
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md w-full sm:w-auto"
        onConfirm={() => paxIdToDelete != null && runDeletePax(paxIdToDelete)}
      />
      <ConfirmModal
        isOpen={reservaIdToDelete != null}
        onClose={() => setReservaIdToDelete(null)}
        title="Eliminar reserva"
        message="Se borra toda la solicitud en este recorrido, incluidas las demás personas. No podrá recuperarse."
        confirmText="Eliminar"
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md w-full sm:w-auto"
        onConfirm={() => reservaIdToDelete != null && runDeleteReserva(reservaIdToDelete)}
      />

      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-2">
        Reservas, pasajeros y paradas
      </h4>
      <p className="text-[11px] text-slate-500 mb-2 leading-snug max-w-3xl">
        Cada <span className="font-semibold text-slate-700">persona</span> es independiente: tiene su propio
        estado. Una es quien <span className="font-semibold text-slate-700">inscribió la solicitud</span> (fila
        con paradas y tramo); cada pasajero puede tener{" "}
        <span className="font-semibold text-slate-700">tramo y paradas propias</span> (si coinciden con el
        titular, se guardan como herencia en base). Podés sumar personas desde la solicitud pública o con el
        bloque de abajo. Plazas = personas con estado aceptada. SQL:{" "}
        <code className="text-[10px] bg-slate-100 px-0.5 rounded">transporte-scrn-pasajeros-estado.sql</code>,{" "}
        <code className="text-[10px] bg-slate-100 px-0.5 rounded">transporte-scrn-pasajeros-paradas.sql</code>.
      </p>

      {reservas.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">Sin reservas en este recorrido todavía.</p>
      ) : (
        <>
      <div className="md:hidden space-y-4">
        {reservas.map((r, gIdx) => {
          const d = derived(r, gIdx);
          const paxs = r.pasajeros || [];
          const nPersonasSol = 1 + paxs.length;
          const addLocked = solicitudAnulada(r) || d.isDead;
          return (
            <article
              key={r.id}
              className={`rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${d.cellBg}`}
            >
              <div className="px-3 py-2 border-b border-slate-200/90 bg-slate-800/5">
                <span className="text-[9px] font-extrabold uppercase text-slate-600">Solicitante</span>
                <div className="text-sm font-bold text-slate-900">
                  {(r.perfil?.nombre || "—")} {(r.perfil?.apellido || "").trim()}
                </div>
                <div className="text-slate-500 text-[10px]">
                  DNI {r.perfil?.dni || "—"} · {formatMini(r.created_at)} · {nPersonasSol}{" "}
                  persona(s) en solicitud
                </div>
              </div>
              <div className="p-3 space-y-3">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500">Tramo</span>
                  <select
                    className={cellInp + " w-full mt-0.5"}
                    disabled={d.isDead || savingKey === `r-${r.id}`}
                    value={d.pVal("tramo") || "ida"}
                    onChange={setField(r.id, "tramo")}
                  >
                    {TRAMO_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[9px] font-bold uppercase text-slate-500">Paradas (subida / bajada)</div>
                <div className="space-y-2">
                  <select
                    className={cellInp + " w-full text-[11px]"}
                    disabled={d.isDead}
                    value={d.pVal("localidad_subida") || ""}
                    onChange={setField(r.id, "localidad_subida")}
                  >
                    <option value="">Subida…</option>
                    {localidades.map((loc) => (
                      <option key={`m${r.id}s${loc.id}`} value={loc.localidad}>
                        {loc.localidad}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className={cellTa + " w-full"}
                    disabled={d.isDead}
                    value={d.pVal("obs_subida") || ""}
                    onChange={setField(r.id, "obs_subida")}
                    rows={2}
                    placeholder="Observaciones subida…"
                  />
                </div>
                <div className="space-y-2">
                  <select
                    className={cellInp + " w-full text-[11px]"}
                    disabled={d.isDead}
                    value={d.pVal("localidad_bajada") || ""}
                    onChange={setField(r.id, "localidad_bajada")}
                  >
                    <option value="">Bajada…</option>
                    {localidades.map((loc) => (
                      <option key={`m${r.id}b${loc.id}`} value={loc.localidad}>
                        {loc.localidad}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className={cellTa + " w-full"}
                    disabled={d.isDead}
                    value={d.pVal("obs_bajada") || ""}
                    onChange={setField(r.id, "obs_bajada")}
                    rows={2}
                    placeholder="Observaciones bajada…"
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-2 w-full">
                  <div className="w-full min-w-0 min-[380px]:max-w-[12rem] flex-1 min-[380px]:min-w-0 sm:shrink-0 sm:flex-none">
                    <span className="text-[9px] font-bold uppercase text-slate-500">Estado</span>
                    <select
                      className={`${cellEstadoSelectBase} w-full mt-0.5 ${scrnEstadoSelectClassName(d.pVal("estado"))}`}
                      value={d.pVal("estado")}
                      onChange={setField(r.id, "estado")}
                      disabled={savingKey === `r-${r.id}`}
                    >
                      {ESTADO_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex min-h-9 items-center justify-end gap-1 shrink-0 ms-auto sm:ms-0">
                    {d.filaDirty && !d.isDead && (
                      <>
                        <button
                          type="button"
                          title="Guardar"
                          aria-label="Guardar cambios"
                          disabled={savingKey === `r-${r.id}`}
                          onClick={() => requestSaveFila(r)}
                          className="inline-flex items-center justify-center rounded-md border border-slate-600 bg-slate-800 p-1.5 text-white shadow-sm hover:bg-slate-700 disabled:opacity-50"
                        >
                          {savingKey === `r-${r.id}` ? (
                            <span className="text-[10px] font-bold px-0.5">…</span>
                          ) : (
                            <IconSave className="text-white" size={20} />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Descartar cambios"
                          aria-label="Descartar cambios"
                          onClick={() => revertFila(r)}
                          className="inline-flex items-center justify-center rounded-md border border-amber-400/80 bg-amber-50 p-1.5 text-amber-900"
                        >
                          <IconX className="text-amber-900" size={16} />
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        title="Eliminar toda la reserva"
                        aria-label="Eliminar toda la reserva"
                        disabled={Boolean(savingKey)}
                        onClick={() => setReservaIdToDelete(r.id)}
                        className="inline-flex items-center justify-center rounded-md border border-rose-300/90 bg-rose-50/90 p-1.5 text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <IconTrash className="text-rose-800" size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {paxs.map((p) => {
                const dp = derivedPax(p, r, gIdx);
                return (
                  <div key={p.id} className={`border-t border-slate-200 p-3 ${dp.cellBg}`}>
                    <span className="text-[9px] font-extrabold uppercase text-sky-800">Persona</span>
                    <div className="text-sm font-semibold text-slate-900">
                      {paxNombreCompleto(p, paxPerfilesById)}
                    </div>
                    {paxEmailMostrar(p) ? (
                      <div className="text-[10px] text-slate-500">{paxEmailMostrar(p)}</div>
                    ) : null}
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-500">Tramo</span>
                      <select
                        className={cellInp + " w-full mt-0.5"}
                        disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                        value={getPaxParadasVal(p, r, edits, paxEdits, "tramo") || "ida"}
                        onChange={(e) => setPaxParada(p.id, "tramo")(e.target.value)}
                      >
                        {TRAMO_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-[9px] font-bold uppercase text-slate-500">Paradas (subida / bajada)</div>
                    <div className="space-y-2">
                      <select
                        className={cellInp + " w-full text-[11px]"}
                        disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                        value={getPaxParadasVal(p, r, edits, paxEdits, "localidad_subida") || ""}
                        onChange={(e) => setPaxParada(p.id, "localidad_subida")(e.target.value)}
                      >
                        <option value="">Subida…</option>
                        {localidades.map((loc) => (
                          <option key={`m${r.id}p${p.id}s${loc.id}`} value={loc.localidad}>
                            {loc.localidad}
                          </option>
                        ))}
                      </select>
                      <textarea
                        className={cellTa + " w-full"}
                        disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                        value={getPaxParadasVal(p, r, edits, paxEdits, "obs_subida") || ""}
                        onChange={(e) => setPaxParada(p.id, "obs_subida")(e.target.value)}
                        rows={2}
                        placeholder="Observaciones subida…"
                      />
                    </div>
                    <div className="space-y-2">
                      <select
                        className={cellInp + " w-full text-[11px]"}
                        disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                        value={getPaxParadasVal(p, r, edits, paxEdits, "localidad_bajada") || ""}
                        onChange={(e) => setPaxParada(p.id, "localidad_bajada")(e.target.value)}
                      >
                        <option value="">Bajada…</option>
                        {localidades.map((loc) => (
                          <option key={`m${r.id}p${p.id}b${loc.id}`} value={loc.localidad}>
                            {loc.localidad}
                          </option>
                        ))}
                      </select>
                      <textarea
                        className={cellTa + " w-full"}
                        disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                        value={getPaxParadasVal(p, r, edits, paxEdits, "obs_bajada") || ""}
                        onChange={(e) => setPaxParada(p.id, "obs_bajada")(e.target.value)}
                        rows={2}
                        placeholder="Observaciones bajada…"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">
                      Si tus paradas coinciden con el titular, al guardar quedan como herencia (null en base).
                    </p>
                    <div className="mt-2 flex flex-wrap items-end justify-between gap-2 w-full">
                      <div className="w-full min-w-0 min-[380px]:max-w-[12rem] flex-1 min-[380px]:min-w-0 sm:shrink-0 sm:flex-none">
                        <span className="text-[9px] font-bold uppercase text-slate-500">Estado</span>
                        <select
                          className={`${cellEstadoSelectBase} w-full mt-0.5 ${scrnEstadoSelectClassName(normPaxEst(p, paxEdits))}`}
                          value={normPaxEst(p, paxEdits)}
                          onChange={setPaxField(p.id)}
                          disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                        >
                          {ESTADO_OPTS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex min-h-9 items-center justify-end gap-1 shrink-0 ms-auto sm:ms-0">
                        {dp.dirty && !solicitudAnulada(r) && (
                          <>
                            <button
                              type="button"
                              title="Guardar"
                              aria-label="Guardar cambios"
                              disabled={savingKey === `p-${p.id}`}
                              onClick={() => requestSavePax(p, r)}
                              className="inline-flex items-center justify-center rounded-md border border-slate-600 bg-slate-800 p-1.5 text-white shadow-sm hover:bg-slate-700 disabled:opacity-50"
                            >
                              {savingKey === `p-${p.id}` ? (
                                <span className="text-[10px] font-bold px-0.5">…</span>
                              ) : (
                                <IconSave className="text-white" size={20} />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Descartar cambios"
                              aria-label="Descartar cambios"
                              onClick={() => revertPax(p)}
                              className="inline-flex items-center justify-center rounded-md border border-amber-400/80 bg-amber-50 p-1.5 text-amber-900"
                            >
                              <IconX className="text-amber-900" size={16} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          title="Quitar de la solicitud"
                          aria-label="Quitar de la solicitud"
                          disabled={solicitudAnulada(r) || Boolean(savingKey)}
                          onClick={() => setPaxIdToDelete(p.id)}
                          className="inline-flex items-center justify-center rounded-md border border-rose-300/90 bg-rose-50/90 p-1.5 text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <IconTrash className="text-rose-800" size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className={`border-t p-3 ${d.cellBg}`}>
                <ReservaPasajerosEditor
                  reserva={r}
                  allProfiles={allProfiles}
                  excludedProfileIds={excludedIdsForReserva(r)}
                  readOnly={addLocked}
                  compact
                  tableRow
                  addOnly
                  collapsibleAdd
                  onReload={async () => {
                    await load();
                    onDataChanged?.();
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-300/80 bg-white shadow-sm">
        <table className="w-full min-w-[56rem] border-collapse text-slate-800 text-[11px]">
          <thead>
            <tr>
              <Th2 className="min-w-[8rem] w-[14%]" line1="Persona" line2="Solicitante u otra" />
              <Th2 className="w-12" line1="Plaza" line2="personas" align="center" />
              <Th2 className="w-24" line1="Tramo" line2="Por fila (titular o pasajero)" />
              <Th2 className="min-w-[14rem] w-1/4" line1="Subida" line2="Por fila" />
              <Th2 className="min-w-[14rem] w-1/4" line1="Bajada" line2="Por fila" />
              <Th2
                className="w-28 min-w-[7.5rem]"
                line1="Estado"
                line2="Colores por valor"
                align="right"
              />
              <Th2
                className="w-24 min-w-[5.5rem]"
                line1="Acción"
                line2="Guardar / quitar"
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {reservas.map((r, gIdx) => {
              const d = derived(r, gIdx);
              const paxs = r.pasajeros || [];
              const nPersonasSol = 1 + paxs.length;
              const addLocked = solicitudAnulada(r) || d.isDead;
              return (
                <Fragment key={r.id}>
                  <tr className={d.cellBg}>
                    <td className={d.td}>
                      <div className="min-h-10 flex flex-col justify-center">
                        <span className="text-[9px] font-extrabold uppercase text-slate-500">Solicitante</span>
                        <span className="text-sm font-bold text-slate-900">
                          {(r.perfil?.nombre || "—")} {(r.perfil?.apellido || "").trim()}
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          DNI {r.perfil?.dni || "—"} · {formatMini(r.created_at)}
                        </span>
                      </div>
                    </td>
                    <td
                      className={d.td + " text-center text-xs font-semibold tabular-nums text-slate-700"}
                      title="Personas en esta solicitud (incl. solicitante)"
                    >
                      {nPersonasSol}
                    </td>
                    <td className={d.td + " p-1"}>
                      <select
                        className={cellInp + " w-full"}
                        disabled={d.isDead || savingKey === `r-${r.id}`}
                        value={d.pVal("tramo") || "ida"}
                        onChange={setField(r.id, "tramo")}
                      >
                        {TRAMO_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={d.td + " p-1"}>
                      <div className="flex flex-col gap-1.5 min-w-0 sm:flex-row sm:items-stretch">
                        <select
                          className={cellInp + " w-full text-[11px]"}
                          disabled={d.isDead}
                          value={d.pVal("localidad_subida") || ""}
                          onChange={setField(r.id, "localidad_subida")}
                        >
                          <option value="">Elegir…</option>
                          {localidades.map((loc) => (
                            <option key={`t${r.id}s${loc.id}`} value={loc.localidad}>
                              {loc.localidad}
                            </option>
                          ))}
                        </select>
                        <textarea
                          className={cellTa + " w-full"}
                          disabled={d.isDead}
                          value={d.pVal("obs_subida") || ""}
                          onChange={setField(r.id, "obs_subida")}
                          rows={1}
                          placeholder="Observaciones..."
                        />
                      </div>
                    </td>
                    <td className={d.td + " p-1"}>
                      <div className="flex flex-col gap-1.5 min-w-0 sm:flex-row sm:items-stretch">
                        <select
                          className={cellInp + " w-full text-[11px]"}
                          disabled={d.isDead}
                          value={d.pVal("localidad_bajada") || ""}
                          onChange={setField(r.id, "localidad_bajada")}
                        >
                          <option value="">Elegir…</option>
                          {localidades.map((loc) => (
                            <option key={`t${r.id}b${loc.id}`} value={loc.localidad}>
                              {loc.localidad}
                            </option>
                          ))}
                        </select>
                        <textarea
                          className={cellTa + " w-full"}
                          disabled={d.isDead}
                          value={d.pVal("obs_bajada") || ""}
                          onChange={setField(r.id, "obs_bajada")}
                          rows={1}
                          placeholder="Observaciones..."
                        />
                      </div>
                    </td>
                    <td className={d.td + " p-1 text-right"}>
                      <select
                        className={`${cellEstadoSelectBase} w-full min-w-0 max-w-full ${scrnEstadoSelectClassName(d.pVal("estado"))}`}
                        value={d.pVal("estado")}
                        onChange={setField(r.id, "estado")}
                        disabled={savingKey === `r-${r.id}`}
                      >
                        {ESTADO_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={d.td + " p-1 text-right align-middle min-w-0 w-[4.5rem]"}>
                      <div className="flex items-center justify-end gap-0.5 flex-wrap">
                        {d.filaDirty && !d.isDead && (
                          <>
                            <button
                              type="button"
                              title="Guardar"
                              aria-label="Guardar"
                              disabled={savingKey === `r-${r.id}`}
                              onClick={() => requestSaveFila(r)}
                              className="inline-flex items-center justify-center rounded border border-slate-600 bg-slate-800 p-1.5 text-white disabled:opacity-50"
                            >
                              {savingKey === `r-${r.id}` ? (
                                <span className="text-[9px]">…</span>
                              ) : (
                                <IconSave className="text-white" size={18} />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Descartar cambios"
                              aria-label="Descartar cambios"
                              onClick={() => revertFila(r)}
                              className="inline-flex items-center justify-center rounded border border-amber-400/80 bg-amber-50/90 p-1.5 text-amber-900 hover:bg-amber-100/90"
                            >
                              <IconX className="text-amber-900" size={16} />
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            title="Eliminar toda la reserva"
                            aria-label="Eliminar toda la reserva"
                            disabled={Boolean(savingKey)}
                            onClick={() => setReservaIdToDelete(r.id)}
                            className="inline-flex items-center justify-center rounded border border-rose-300/90 bg-rose-50/90 p-1.5 text-rose-800 hover:bg-rose-100/90 disabled:opacity-50"
                          >
                            <IconTrash className="text-rose-800" size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {paxs.map((p) => {
                    const dp = derivedPax(p, r, gIdx);
                    return (
                      <tr key={p.id} className={dp.cellBg}>
                        <td className={dp.td}>
                          <div className="min-h-10 flex flex-col justify-center">
                            <span className="text-[9px] font-extrabold uppercase text-sky-800">Persona</span>
                            <span className="text-sm font-semibold text-slate-900">
                              {paxNombreCompleto(p, paxPerfilesById)}
                            </span>
                            {p.id_perfil ? (
                              <span className="text-[9px] text-emerald-700 font-bold">Perfil vinculado</span>
                            ) : null}
                            {paxEmailMostrar(p) ? (
                              <span className="text-[10px] text-slate-500 truncate max-w-[12rem]">
                                {paxEmailMostrar(p)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className={dp.td + " text-center text-xs font-bold"}>1</td>
                        <td className={dp.td + " p-1"}>
                          <select
                            className={cellInp + " w-full"}
                            value={getPaxParadasVal(p, r, edits, paxEdits, "tramo") || "ida"}
                            onChange={(e) => setPaxParada(p.id, "tramo")(e.target.value)}
                            disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                          >
                            {TRAMO_OPTS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={dp.td + " p-1"}>
                          <div className="flex flex-col gap-1.5 min-w-0 sm:flex-row sm:items-stretch">
                            <select
                              className={cellInp + " w-full text-[11px]"}
                              disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                              value={getPaxParadasVal(p, r, edits, paxEdits, "localidad_subida") || ""}
                              onChange={(e) => setPaxParada(p.id, "localidad_subida")(e.target.value)}
                            >
                              <option value="">Elegir…</option>
                              {localidades.map((loc) => (
                                <option key={`t${r.id}p${p.id}s${loc.id}`} value={loc.localidad}>
                                  {loc.localidad}
                                </option>
                              ))}
                            </select>
                            <textarea
                              className={cellTa + " w-full"}
                              disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                              value={getPaxParadasVal(p, r, edits, paxEdits, "obs_subida") || ""}
                              onChange={(e) => setPaxParada(p.id, "obs_subida")(e.target.value)}
                              rows={1}
                              placeholder="Observaciones..."
                            />
                          </div>
                        </td>
                        <td className={dp.td + " p-1"}>
                          <div className="flex flex-col gap-1.5 min-w-0 sm:flex-row sm:items-stretch">
                            <select
                              className={cellInp + " w-full text-[11px]"}
                              disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                              value={getPaxParadasVal(p, r, edits, paxEdits, "localidad_bajada") || ""}
                              onChange={(e) => setPaxParada(p.id, "localidad_bajada")(e.target.value)}
                            >
                              <option value="">Elegir…</option>
                              {localidades.map((loc) => (
                                <option key={`t${r.id}p${p.id}b${loc.id}`} value={loc.localidad}>
                                  {loc.localidad}
                                </option>
                              ))}
                            </select>
                            <textarea
                              className={cellTa + " w-full"}
                              disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                              value={getPaxParadasVal(p, r, edits, paxEdits, "obs_bajada") || ""}
                              onChange={(e) => setPaxParada(p.id, "obs_bajada")(e.target.value)}
                              rows={1}
                              placeholder="Observaciones..."
                            />
                          </div>
                        </td>
                        <td className={dp.td + " p-1 text-right"}>
                          <select
                            className={`${cellEstadoSelectBase} w-full min-w-0 max-w-full ${scrnEstadoSelectClassName(normPaxEst(p, paxEdits))}`}
                            value={normPaxEst(p, paxEdits)}
                            onChange={setPaxField(p.id)}
                            disabled={solicitudAnulada(r) || savingKey === `p-${p.id}`}
                          >
                            {ESTADO_OPTS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={dp.td + " p-1 text-right align-middle min-w-0 w-[4.5rem]"}>
                          <div className="flex items-center justify-end gap-0.5 flex-wrap">
                            {dp.dirty && !solicitudAnulada(r) && (
                              <>
                                <button
                                  type="button"
                                  title="Guardar"
                                  aria-label="Guardar"
                                  disabled={savingKey === `p-${p.id}`}
                                  onClick={() => requestSavePax(p, r)}
                                  className="inline-flex items-center justify-center rounded border border-slate-600 bg-slate-800 p-1.5 text-white disabled:opacity-50"
                                >
                                  {savingKey === `p-${p.id}` ? (
                                    <span className="text-[9px]">…</span>
                                  ) : (
                                    <IconSave className="text-white" size={18} />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  title="Descartar cambios"
                                  aria-label="Descartar cambios"
                                  onClick={() => revertPax(p)}
                                  className="inline-flex items-center justify-center rounded border border-amber-400/80 bg-amber-50/90 p-1.5 text-amber-900 hover:bg-amber-100/90"
                                >
                                  <IconX className="text-amber-900" size={16} />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              title="Quitar de la solicitud"
                              aria-label="Quitar"
                              disabled={solicitudAnulada(r) || Boolean(savingKey)}
                              onClick={() => setPaxIdToDelete(p.id)}
                              className="inline-flex items-center justify-center rounded border border-rose-300/90 bg-rose-50/90 p-1.5 text-rose-800 hover:bg-rose-100/90 disabled:opacity-50"
                            >
                              <IconTrash className="text-rose-800" size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className={d.cellBg}>
                    <td colSpan={7} className={d.td + " border-t border-dashed border-slate-300/80 p-2"}>
                      <ReservaPasajerosEditor
                        reserva={r}
                        allProfiles={allProfiles}
                        excludedProfileIds={excludedIdsForReserva(r)}
                        readOnly={addLocked}
                        compact
                        tableRow
                        addOnly
                        collapsibleAdd
                        onReload={async () => {
                          await load();
                          onDataChanged?.();
                        }}
                      />
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
        </>
      )}

      {isAdmin && viajeForDefaults && (
        <div className="mt-4 w-full min-w-0">
          {!nuevaReservaFormAbierta ? (
            <button
              type="button"
              onClick={() => setNuevaReservaFormAbierta(true)}
              className="w-full sm:w-auto rounded-lg border border-dashed border-blue-300 bg-white px-3 py-2.5 text-left text-xs font-extrabold text-blue-900 shadow-sm hover:bg-blue-50/80"
            >
              + Nueva reserva
            </button>
          ) : (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-2">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-blue-900">
                  Nueva reserva en este recorrido
                </p>
                <p className="text-[10px] text-slate-600">
                  Solicitud aparte (otro titular). No suma personas a una reserva existente.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-600">Solicitante (perfil)</label>
                  <select
                    value={nuevaReservaForm.id_usuario}
                    onChange={(e) =>
                      setNuevaReservaForm((f) => ({ ...f, id_usuario: e.target.value }))
                    }
                    className={cellInp + " w-full"}
                  >
                    <option value="">Elegir perfil…</option>
                    {perfilesDisponiblesNuevaReserva.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.apellido}, {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600">Estado</label>
                  <select
                    value={nuevaReservaForm.estado}
                    onChange={(e) =>
                      setNuevaReservaForm((f) => ({ ...f, estado: e.target.value }))
                    }
                    className={cellInp + " w-full"}
                  >
                    {ESTADO_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600">Tramo</label>
                  <select
                    value={nuevaReservaForm.tramo}
                    onChange={(e) =>
                      setNuevaReservaForm((f) => ({ ...f, tramo: e.target.value }))
                    }
                    className={cellInp + " w-full"}
                  >
                    {TRAMO_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-600">Subida</label>
                  <select
                    value={nuevaReservaForm.localidad_subida || ""}
                    onChange={(e) =>
                      setNuevaReservaForm((f) => ({ ...f, localidad_subida: e.target.value }))
                    }
                    className={cellInp + " w-full text-[11px]"}
                  >
                    <option value="">Elegir…</option>
                    {localidades.map((loc) => (
                      <option key={`nr-s-${loc.id}`} value={loc.localidad}>
                        {loc.localidad}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-600">Bajada</label>
                  <select
                    value={nuevaReservaForm.localidad_bajada || ""}
                    onChange={(e) =>
                      setNuevaReservaForm((f) => ({ ...f, localidad_bajada: e.target.value }))
                    }
                    className={cellInp + " w-full text-[11px]"}
                  >
                    <option value="">Elegir…</option>
                    {localidades.map((loc) => (
                      <option key={`nr-b-${loc.id}`} value={loc.localidad}>
                        {loc.localidad}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-600">Obs. subida</label>
                  <textarea
                    className={cellTa + " w-full"}
                    rows={1}
                    value={nuevaReservaForm.obs_subida}
                    onChange={(e) =>
                      setNuevaReservaForm((f) => ({ ...f, obs_subida: e.target.value }))
                    }
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-600">Obs. bajada</label>
                  <textarea
                    className={cellTa + " w-full"}
                    rows={1}
                    value={nuevaReservaForm.obs_bajada}
                    onChange={(e) =>
                      setNuevaReservaForm((f) => ({ ...f, obs_bajada: e.target.value }))
                    }
                    placeholder="Opcional"
                  />
                </div>
                <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={nuevaReservaBusy}
                    onClick={() => setNuevaReservaFormAbierta(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-extrabold text-slate-700 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={nuevaReservaBusy}
                    onClick={crearReservaAdmin}
                    className="rounded-lg border border-blue-700 bg-blue-800 px-3 py-2 text-[11px] font-extrabold text-white disabled:opacity-50"
                  >
                    {nuevaReservaBusy ? "Creando…" : "Crear reserva"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ViajePaquetesPanel viajeId={viajeId} onDataChanged={onDataChanged} />
    </div>
  );
}
