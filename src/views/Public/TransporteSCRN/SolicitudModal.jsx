import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../services/supabase";
import { ensureScrnPerfilForNewEmail } from "../../../services/scrnCreatePerfil";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import { localidadesToSearchableOptions } from "./localidadesSearchable";
import { scrnTransporteColorFromEntity } from "./scrnTransporteColor";

const initialFormState = {
  tramo: "ambos",
  localidad_subida: "",
  obs_subida: "",
  localidad_bajada: "",
  obs_bajada: "",
};

function newKey() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function rowKeyForPerfil(id) {
  return id ? `perfil-${id}` : newKey();
}

function buildPaqueteEstadoConstraintHint(error) {
  const msg = String(error?.message || "");
  if (!/scrn_solic_paq_estado_check|check constraint/i.test(msg)) {
    return msg || "No se pudo cancelar el paquete.";
  }
  return (
    "No se pudo cancelar el paquete porque la base todavía no acepta el estado 'cancelada'.\n" +
    "Ejecutá nuevamente: docs/transporte-scrn-solicitud-paquete.sql"
  );
}

export default function SolicitudModal({
  isOpen,
  onClose,
  viaje,
  user,
  profile,
  localidades = [],
  scrnPerfiles = [],
  onAdminEditTransporte,
  onAdminEditViaje,
  onEnviarPaquete,
  onSubmitted,
}) {
  const esAdmin = Boolean(profile?.es_admin);
  const [form, setForm] = useState(initialFormState);
  const [extra, setExtra] = useState([]);
  const [draftManual, setDraftManual] = useState({ nombre: "", apellido: "", email: "" });
  const [perfilSelectKey, setPerfilSelectKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [paradasCustom, setParadasCustom] = useState(false);
  const [existingReserva, setExistingReserva] = useState(null);
  const [existingPaquete, setExistingPaquete] = useState(null);
  const [profileIdsCargadosViaje, setProfileIdsCargadosViaje] = useState([]);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [showPasajeroForm, setShowPasajeroForm] = useState(false);

  const usuarioActualRow = useMemo(() => {
    if (!user?.id) return null;
    return {
      key: rowKeyForPerfil(user.id),
      id_perfil: user.id,
      nombre: profile?.nombre || user?.user_metadata?.nombre || "",
      apellido: profile?.apellido || user?.user_metadata?.apellido || "",
      email: user?.email || null,
      origen: "perfil",
      solicitante: true,
    };
  }, [profile?.apellido, profile?.nombre, user?.email, user?.id, user?.user_metadata]);

  const perfilesDisponibles = useMemo(
    () =>
      (scrnPerfiles || [])
        .filter((p) => p.id)
        .filter((p) => !profileIdsCargadosViaje.includes(p.id))
        .filter(
          (p) => !extra.some((row) => row.id_perfil && row.id_perfil === p.id),
        ),
    [scrnPerfiles, extra, profileIdsCargadosViaje],
  );

  const locOptions = useMemo(
    () => localidadesToSearchableOptions(localidades),
    [localidades],
  );

  const filasNuevas = useMemo(
    () => extra.filter((r) => !r.paxId),
    [extra],
  );

  useEffect(() => {
    if (!isOpen || !viaje) return;
    setForm({
      tramo: "ambos",
      localidad_subida: viaje.origen || "",
      localidad_bajada: viaje.destino_final || "",
      obs_subida: "",
      obs_bajada: "",
    });
    setParadasCustom(false);
    setShowPasajeroForm(false);
  }, [isOpen, viaje?.id]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!isOpen || !viaje?.id || !user?.id) {
        if (alive) setExistingReserva(null);
        if (alive) setProfileIdsCargadosViaje([]);
        if (alive) setExtra([]);
        return;
      }
      setCheckingExisting(true);
      const [{ data, error: exErr }, { data: paqData, error: paqErr }, { data: allRsv }] = await Promise.all([
        supabase
          .from("scrn_reservas")
          .select("id, estado, tramo, localidad_subida, localidad_bajada, created_at")
          .eq("id_viaje", viaje.id)
          .eq("id_usuario", user.id)
          .neq("estado", "cancelada")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("scrn_solicitudes_paquete")
          .select("id, estado, created_at")
          .eq("id_viaje", viaje.id)
          .eq("id_usuario", user.id)
          .in("estado", ["pendiente", "aceptada"])
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("scrn_reservas")
          .select("id, id_usuario, estado")
          .eq("id_viaje", viaje.id),
      ]);
      if (!alive) return;
      if (exErr) {
        console.error("Error verificando reserva existente:", exErr);
        setExistingReserva(null);
        if (alive) setExtra(usuarioActualRow ? [usuarioActualRow] : []);
      } else {
        const r0 = (data || [])[0] || null;
        setExistingReserva(r0);
        if (r0?.id) {
          const { data: paxList, error: paxErr } = await supabase
            .from("scrn_reserva_pasajeros")
            .select("id, id_perfil, nombre, apellido, email, estado")
            .eq("id_reserva", r0.id)
            .order("id", { ascending: true });
          if (!alive) return;
          if (paxErr) {
            console.error("Error cargando pasajeros de la reserva:", paxErr);
            if (alive) setExtra(usuarioActualRow ? [usuarioActualRow] : []);
          } else {
            const activos = (paxList || []).filter(
              (p) => String(p.estado || "pendiente") !== "cancelada",
            );
            if (activos.length > 0) {
              const paxPids = [...new Set(activos.map((x) => x.id_perfil).filter(Boolean))];
              let pmap = {};
              if (paxPids.length) {
                const { data: paxProfs, error: pe } = await supabase
                  .from("scrn_perfiles")
                  .select("id, nombre, apellido")
                  .in("id", paxPids);
                if (pe) {
                  console.error("Error cargando perfiles de pasajeros:", pe);
                } else {
                  pmap = Object.fromEntries((paxProfs || []).map((pr) => [pr.id, pr]));
                }
              }
              setExtra(
                activos.map((p) => {
                  const pr = p.id_perfil ? pmap[p.id_perfil] : null;
                  return {
                    key: `pax-${p.id}`,
                    paxId: p.id,
                    id_perfil: p.id_perfil,
                    nombre: p.id_perfil
                      ? (pr?.nombre ?? p.nombre ?? "")
                      : (p.nombre || ""),
                    apellido: p.id_perfil
                      ? (pr?.apellido ?? p.apellido ?? "")
                      : (p.apellido || ""),
                    email: p.email || null,
                    origen: p.id_perfil ? "perfil" : "manual",
                    solicitante: Boolean(
                      p.id_perfil && user?.id && p.id_perfil === user.id,
                    ),
                  };
                }),
              );
            } else if (alive) {
              setExtra(usuarioActualRow ? [usuarioActualRow] : []);
            }
          }
        } else if (alive) {
          setExtra(usuarioActualRow ? [usuarioActualRow] : []);
        }
      }
      if (paqErr) {
        setExistingPaquete(null);
      } else {
        setExistingPaquete((paqData || [])[0] || null);
      }
      const reservasActivas = (allRsv || []).filter((r) => String(r.estado || "") !== "cancelada");
      const reserveIds = reservasActivas.map((r) => r.id);
      const ids = new Set(reservasActivas.map((r) => r.id_usuario).filter(Boolean));
      if (reserveIds.length > 0) {
        const { data: paxRows } = await supabase
          .from("scrn_reserva_pasajeros")
          .select("id_perfil, estado")
          .in("id_reserva", reserveIds);
        (paxRows || []).forEach((p) => {
          if (String(p.estado || "pendiente") === "cancelada") return;
          if (p.id_perfil) ids.add(p.id_perfil);
        });
      }
      if (!alive) return;
      ids.delete(user.id);
      setProfileIdsCargadosViaje([...ids]);
      setCheckingExisting(false);
    };
    run();
    return () => {
      alive = false;
    };
  }, [isOpen, viaje?.id, user?.id, usuarioActualRow]);

  const cancelarReserva = async () => {
    if (!existingReserva?.id) return;
    if (!window.confirm("¿Cancelar tu solicitud/carga en este recorrido?")) return;
    setSaving(true);
    setError("");
    const { error: cancelErr } = await supabase
      .from("scrn_reservas")
      .update({ estado: "cancelada" })
      .eq("id", existingReserva.id);
    if (cancelErr) {
      setSaving(false);
      setError(
        cancelErr.message ||
          "No se pudo cancelar. Si sos UX, revisá políticas RLS para cancelar reservas.",
      );
      return;
    }
    const paxRes = await supabase
      .from("scrn_reserva_pasajeros")
      .update({ estado: "cancelada" })
      .eq("id_reserva", existingReserva.id);
    if (paxRes.error) {
      console.warn("No se pudieron cancelar acompañantes:", paxRes.error);
    }
    await supabase.functions
      .invoke("mails_produccion", {
        body: {
          action: "enviar_mail",
          templateId: "scrn_transporte_evento",
          email: "filarmonica.scrn@gmail.com",
          detalle: {
            titulo: "Cancelación de reserva de lugar",
            lineas: [
              `Usuario: ${`${profile?.nombre || ""} ${profile?.apellido || ""}`.trim() || "Sin nombre"}`,
              `Email: ${user?.email || "Sin email"}`,
              `Origen: ${viaje?.origen || "-"}`,
              `Destino: ${viaje?.destino_final || "-"}`,
              `Salida: ${viaje?.fecha_salida ? new Date(viaje.fecha_salida).toLocaleString("es-AR") : "-"}`,
              `ID viaje: ${viaje?.id || "-"}`,
              `ID reserva: ${existingReserva?.id || "-"}`,
            ],
          },
        },
      })
      .catch((mailErr) => {
        console.warn("No se pudo enviar mail de cancelación de reserva:", mailErr);
      });
    setExistingReserva(null);
    setSaving(false);
    onSubmitted?.();
  };

  const cancelarPaquete = async () => {
    if (!existingPaquete?.id) return;
    if (!window.confirm("¿Cancelar tu paquete en este recorrido?")) return;
    setSaving(true);
    setError("");
    const { error: cancelErr } = await supabase
      .from("scrn_solicitudes_paquete")
      .update({ estado: "cancelada" })
      .eq("id", existingPaquete.id);
    if (cancelErr) {
      setSaving(false);
      setError(buildPaqueteEstadoConstraintHint(cancelErr));
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
              `Usuario: ${`${profile?.nombre || ""} ${profile?.apellido || ""}`.trim() || "Sin nombre"}`,
              `Email: ${user?.email || "Sin email"}`,
              `Origen: ${viaje?.origen || "-"}`,
              `Destino: ${viaje?.destino_final || "-"}`,
              `Salida: ${viaje?.fecha_salida ? new Date(viaje.fecha_salida).toLocaleString("es-AR") : "-"}`,
              `ID viaje: ${viaje?.id || "-"}`,
              `ID paquete: ${existingPaquete?.id || "-"}`,
            ],
          },
        },
      })
      .catch((mailErr) => {
        console.warn("No se pudo enviar mail de cancelación de paquete:", mailErr);
      });
    setExistingPaquete(null);
    setSaving(false);
    onSubmitted?.();
  };

  const plazasDisponiblesNum =
    typeof viaje?.plazasDisponibles === "number" ? Math.max(viaje.plazasDisponibles, 0) : null;
  const yaEstoyEnTransporte = Boolean(existingReserva);
  const maxPersonas =
    plazasDisponiblesNum == null ? Number.POSITIVE_INFINITY : plazasDisponiblesNum;
  const plazasNecesarias = yaEstoyEnTransporte ? filasNuevas.length : extra.length;
  const noHayLugarParaMiNuevaReserva =
    !yaEstoyEnTransporte && plazasDisponiblesNum != null && plazasDisponiblesNum <= 0;
  const sinLugarParaAcompanantes =
    plazasDisponiblesNum != null && maxPersonas <= 0;
  const excedeCupo = plazasDisponiblesNum != null && plazasNecesarias > plazasDisponiblesNum;
  const hayAlMenosUnaFilaAEnviar = yaEstoyEnTransporte
    ? filasNuevas.length > 0
    : extra.length > 0;

  if (!isOpen || !viaje) return null;

  const setField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetAndClose = () => {
    setForm(initialFormState);
    setExtra([]);
    setPerfilSelectKey((k) => k + 1);
    setDraftManual({ nombre: "", apellido: "", email: "" });
    setError("");
    setParadasCustom(false);
    onClose?.();
  };

  const addFromPerfil = (perfilId) => {
    if (!perfilId) return;
    const countHaciaCupo = existingReserva ? filasNuevas.length : extra.length;
    if (countHaciaCupo >= maxPersonas) {
      setError("No podés añadir más personas: no hay plazas disponibles.");
      return;
    }
    const p = scrnPerfiles.find((x) => x.id === perfilId);
    if (!p) return;
    if (extra.some((row) => row.id_perfil === p.id)) return;
    setExtra((list) => [
      ...list,
      {
        key: rowKeyForPerfil(p.id),
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
    const countHaciaCupo = existingReserva ? filasNuevas.length : extra.length;
    if (countHaciaCupo >= maxPersonas) {
      setError("No podés añadir más personas: no hay plazas disponibles.");
      return;
    }
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
    setExtra((list) => {
      const row = list.find((r) => r.key === key);
      if (row?.paxId) return list;
      return list.filter((r) => r.key !== key);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user?.id) return;

    const toInsert = yaEstoyEnTransporte
      ? extra.filter((r) => !r.paxId)
      : extra;
    const need = toInsert.length;
    if (need <= 0) {
      setError(
        yaEstoyEnTransporte
          ? "Agregá al menos una persona nueva para sumar a esta solicitud."
          : "Agregá al menos una persona en “Solicitar plaza para”.",
      );
      return;
    }
    if (typeof viaje.plazasDisponibles === "number" && need > viaje.plazasDisponibles) {
      setError(
        `Solo hay ${viaje.plazasDisponibles} plaza(s) disponible(s) en este recorrido (pedís ${need}).`,
      );
      return;
    }
    if (!yaEstoyEnTransporte && typeof viaje.plazasDisponibles === "number" && viaje.plazasDisponibles <= 0) {
      setError("Este transporte ya no tiene plazas disponibles.");
      return;
    }

    setSaving(true);
    setError("");

    const tramoRes = paradasCustom ? form.tramo : "ambos";
    const su = (paradasCustom
      ? form.localidad_subida
      : viaje.origen || ""
    ).trim();
    const bj = (paradasCustom
      ? form.localidad_bajada
      : viaje.destino_final || ""
    ).trim();
    if (!su || !bj) {
      setSaving(false);
      setError("Faltan subida o bajada. Activá “Cambiar paradas” y elegilas, o revisá el viaje.");
      return;
    }

    let reservaId = existingReserva?.id || null;
    if (!reservaId) {
      const { data: resRow, error: insertError } = await supabase
        .from("scrn_reservas")
        .insert({
          id_viaje: viaje.id,
          id_usuario: user.id,
          estado: esAdmin ? "aceptada" : "pendiente",
          tramo: tramoRes,
          localidad_subida: su,
          obs_subida: (paradasCustom ? form.obs_subida : "").trim() || null,
          localidad_bajada: bj,
          obs_bajada: (paradasCustom ? form.obs_bajada : "").trim() || null,
        })
        .select("id")
        .single();

      if (insertError || !resRow?.id) {
        setSaving(false);
        setError(insertError?.message || "No se pudo crear la reserva.");
        return;
      }
      reservaId = resRow.id;
    } else if (esAdmin && existingReserva?.estado !== "aceptada") {
      await supabase
        .from("scrn_reservas")
        .update({ estado: "aceptada" })
        .eq("id", reservaId);
    }

    if (toInsert.length > 0) {
      const toInsertConPerfil = [];
      for (const row of toInsert) {
        if (row.id_perfil || !row.email?.trim()) {
          toInsertConPerfil.push(row);
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
        toInsertConPerfil.push({ ...row, id_perfil: res.id, email: null });
      }

      const rows = toInsertConPerfil.map((row) => ({
        id_reserva: reservaId,
        id_perfil: row.id_perfil || null,
        nombre: row.id_perfil ? null : (row.nombre?.trim() || null),
        apellido: row.id_perfil ? null : (row.apellido?.trim() || null),
        email: row.id_perfil ? null : (row.email ? row.email.trim() : null),
        estado: esAdmin ? "aceptada" : "pendiente",
      }));

      const { error: paxError } = await supabase
        .from("scrn_reserva_pasajeros")
        .insert(rows);
      if (paxError) {
        setSaving(false);
        setError(
          `${paxError.message}\n` +
            (paxError.message?.includes("scrn_reserva_pasajeros")
              ? "¿Ejecutaste el SQL de docs/transporte-scrn-pasajeros.sql en Supabase?"
              : ""),
        );
        return;
      }
    }

    if (!esAdmin) {
      await supabase.functions.invoke("mails_produccion", {
        body: {
          action: "enviar_mail",
          templateId: "scrn_transporte_evento",
          email: "filarmonica.scrn@gmail.com",
          detalle: {
            titulo: "Nueva solicitud de lugar",
            lineas: [
              `Usuario: ${`${profile?.nombre || ""} ${profile?.apellido || ""}`.trim() || "Sin nombre"}`,
              `Email: ${user?.email || "Sin email"}`,
              `Origen: ${viaje?.origen || "-"}`,
              `Destino: ${viaje?.destino_final || "-"}`,
              `Salida: ${viaje?.fecha_salida ? new Date(viaje.fecha_salida).toLocaleString("es-AR") : "-"}`,
              `Sube en: ${su || "-"}`,
              `Baja en: ${bj || "-"}`,
              `Plazas solicitadas: ${need}`,
              `Personas (nuevas): ${toInsert
                .map((p) => `${p.apellido || ""}, ${p.nombre || ""}`.replace(/^,\s*/, "").trim())
                .filter(Boolean)
                .join("; ") || "-"}`,
              `ID viaje: ${viaje?.id || "-"}`,
              `ID reserva: ${reservaId || "-"}`,
            ],
          },
        },
      });
    }

    setSaving(false);
    setForm(initialFormState);
    setExtra([]);
    setPerfilSelectKey((k) => k + 1);
    onSubmitted?.();
    onClose?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Solicitar plazas</h3>
            <p className="text-xs text-slate-500">
              {viaje.origen} - {viaje.destino_final}
            </p>
            {viaje.scrn_transportes ? (
              <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                <span
                  className="inline-block h-3.5 w-3.5 rounded border border-slate-300 shrink-0"
                  style={{ backgroundColor: scrnTransporteColorFromEntity(viaje.scrn_transportes) }}
                  aria-hidden
                />
                <span>
                  <span className="font-semibold text-slate-700">Transporte:</span>{" "}
                  {viaje.scrn_transportes.nombre}
                  {viaje.scrn_transportes.tipo ? ` · ${viaje.scrn_transportes.tipo}` : ""}
                </span>
              </p>
            ) : null}
            <p className="text-[11px] text-slate-500 mt-1">
              {yaEstoyEnTransporte
                ? "Ya tenés una carga en este recorrido. Podés sumar personas si hay lugar. Total nuevo: "
                : esAdmin
                  ? "Carga directa (admin). Elegí abajo quiénes viajan. Total: "
                  : "Vos inscribís la solicitud; abajo elegí quiénes viajan. Total: "}
              <span className="font-bold text-slate-800">{plazasNecesarias}</span> plazas.
            </p>
            {checkingExisting ? (
              <p className="text-[11px] text-slate-500 mt-1">Verificando si ya tenés reserva…</p>
            ) : null}
            {existingReserva ? (
              <div className="mt-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-800">
                Ya estás cargado/a en este recorrido ({existingReserva.estado}).
                <button
                  type="button"
                  onClick={cancelarReserva}
                  disabled={saving}
                  className="ml-2 font-bold underline hover:text-emerald-900 disabled:no-underline"
                >
                  Cancelar
                </button>
              </div>
            ) : null}
            {existingPaquete ? (
              <div className="mt-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[11px] text-indigo-800">
                Tenés un paquete cargado para este recorrido ({existingPaquete.estado}).
                <button
                  type="button"
                  onClick={cancelarPaquete}
                  disabled={saving}
                  className="ml-2 font-bold underline hover:text-indigo-900 disabled:no-underline"
                >
                  Cancelar paquete
                </button>
              </div>
            ) : null}
            {noHayLugarParaMiNuevaReserva ? (
              <p className="text-[11px] text-rose-700 mt-1 font-semibold">
                Transporte completo: no hay plazas para nuevas solicitudes.
              </p>
            ) : null}
            {yaEstoyEnTransporte && sinLugarParaAcompanantes ? (
              <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                Ya estás en este transporte, pero no quedan plazas para sumar otras personas.
              </p>
            ) : null}
            {plazasDisponiblesNum != null && (
              <p className="text-[11px] text-slate-500 mt-1">
                Disponibles ahora:{" "}
                <span className="font-semibold text-slate-700">{plazasDisponiblesNum}</span>{" "}
                {yaEstoyEnTransporte ? `(podés sumar hasta ${Math.max(maxPersonas, 0)} personas)` : ""}
              </p>
            )}
            {onEnviarPaquete && viaje?.id ? (
              <div className="mt-2 pt-2 border-t border-slate-100">
                {viaje.paquetes_bodega_llena ? (
                  <p className="text-[11px] text-amber-800 font-medium">
                    Bodega de paquetería llena en este recorrido. No se aceptan nuevos envíos por ahora.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => onEnviarPaquete(viaje)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-800 hover:bg-slate-100"
                  >
                    Enviar un paquete
                  </button>
                )}
              </div>
            ) : null}
            {profile?.es_admin && (viaje?.scrn_transportes?.id || viaje?.id) ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {viaje?.scrn_transportes?.id ? (
                  <button
                    type="button"
                    onClick={() => onAdminEditTransporte?.(viaje.scrn_transportes.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700 hover:bg-blue-100"
                  >
                    Editar transporte
                  </button>
                ) : null}
                {viaje?.id ? (
                  <button
                    type="button"
                    onClick={() => onAdminEditViaje?.(viaje.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-700 hover:bg-violet-100"
                  >
                    Editar recorrido
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            onClick={resetAndClose}
            className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {!paradasCustom ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
              <p className="text-xs font-bold text-slate-800">Recorrido completo (por defecto)</p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Se solicita con el tramo <span className="font-semibold">ambos</span>, subida en{" "}
                <span className="font-semibold">{viaje.origen || "—"}</span> y bajada en{" "}
                <span className="font-semibold">{viaje.destino_final || "—"}</span>, como define este
                viaje.
              </p>
              <button
                type="button"
                onClick={() => {
                  setParadasCustom(true);
                  setForm((prev) => ({
                    ...prev,
                    tramo: prev.tramo || "ambos",
                    localidad_subida: prev.localidad_subida || viaje.origen || "",
                    localidad_bajada: prev.localidad_bajada || viaje.destino_final || "",
                  }));
                }}
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
                    setForm((prev) => ({
                      ...prev,
                      tramo: "ambos",
                      localidad_subida: viaje.origen || "",
                      localidad_bajada: viaje.destino_final || "",
                      obs_subida: "",
                      obs_bajada: "",
                    }));
                  }}
                  className="shrink-0 text-[10px] font-bold uppercase text-slate-600 hover:text-slate-800"
                >
                  Volver al recorrido completo
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Tramo
                </label>
                <select
                  value={form.tramo}
                  onChange={setField("tramo")}
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
                  value={form.localidad_subida || null}
                  onChange={(v) =>
                    setForm((prev) => ({ ...prev, localidad_subida: v || "" }))
                  }
                  placeholder="Buscar localidad de subida…"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Observaciones de subida (opcional)
                </label>
                <textarea
                  value={form.obs_subida}
                  onChange={setField("obs_subida")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-16"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Localidad de bajada
                </span>
                <SearchableSelect
                  options={locOptions}
                  value={form.localidad_bajada || null}
                  onChange={(v) =>
                    setForm((prev) => ({ ...prev, localidad_bajada: v || "" }))
                  }
                  placeholder="Buscar localidad de bajada…"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Observaciones de bajada (opcional)
                </label>
                <textarea
                  value={form.obs_bajada}
                  onChange={setField("obs_bajada")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-16"
                />
              </div>
            </div>
          )}

          {!noHayLugarParaMiNuevaReserva && !sinLugarParaAcompanantes && (
            <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                  Solicitar plaza para:
                </p>
                <button
                  type="button"
                  onClick={() => setShowPasajeroForm((v) => !v)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-bold uppercase text-slate-700 hover:bg-slate-50"
                >
                  {showPasajeroForm ? "Ocultar" : "+ Persona"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Cada fila se gestionará como una solicitud individual. Podés quitarte si solo cargás
                la solicitud para otra persona.
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-bold">Persona</th>
                      <th className="px-2 py-1.5 text-left font-bold hidden sm:table-cell">Email</th>
                      <th className="px-2 py-1.5 text-left font-bold">Tipo</th>
                      <th className="px-2 py-1.5 text-right font-bold">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extra.length > 0 ? (
                      extra.map((row) => (
                        <tr key={row.key}>
                          <td className="px-2 py-1.5">
                            <div className="font-semibold text-slate-800">
                              {`${row.apellido || ""}, ${row.nombre || ""}`.replace(/^,\s*/, "").trim() ||
                                row.email ||
                                "Persona sin nombre"}
                            </div>
                            {row.solicitante ? (
                              <div className="text-[10px] text-slate-500">Usuario actual</div>
                            ) : null}
                            {row.email ? (
                              <div className="text-[10px] text-slate-500 sm:hidden">{row.email}</div>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5 text-slate-500 hidden sm:table-cell">
                            {row.email || "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {row.id_perfil ? "Perfil" : "Invitado"}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {row.paxId ? (
                              <span className="text-slate-400 font-bold text-[10px] uppercase">
                                En solicitud
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => removeRow(row.key)}
                                className="text-rose-600 font-bold text-[11px] uppercase hover:text-rose-800"
                              >
                                Quitar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-2 py-3 text-center text-slate-500">
                          Agregá al menos una persona.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {showPasajeroForm && (
                <>
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
                        disabled={
                          noHayLugarParaMiNuevaReserva ||
                          (existingReserva ? filasNuevas.length : extra.length) >= maxPersonas
                        }
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
                        disabled={
                          noHayLugarParaMiNuevaReserva ||
                          (existingReserva ? filasNuevas.length : extra.length) >= maxPersonas
                        }
                        className="w-full sm:w-auto px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 text-xs font-bold uppercase"
                      >
                        Añadir persona
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 whitespace-pre-wrap">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                checkingExisting ||
                noHayLugarParaMiNuevaReserva ||
                excedeCupo ||
                !hayAlMenosUnaFilaAEnviar
              }
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-semibold"
            >
              {saving ? "Guardando..." : esAdmin ? "Guardar carga" : "Enviar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
