import React, { useEffect, useMemo, useRef, useState } from "react";
import { exportControlVehiculoToPDF } from "../../../utils/pdfFormExporter";
import { IconCheckCircle, IconClock, IconEdit, IconLoader } from "../../../components/ui/Icons";

const PRE_ITEMS = [
  "aceite",
  "agua_refrigerante",
  "combustible",
  "luces_delanteras",
  "luces_traseras",
  "luces_giro",
  "parabrisas",
  "espejos",
  "limpiaparabrisas",
  "cubiertas",
  "rueda_auxilio",
  "gato_llave",
  "documentacion",
];
const POST_ITEMS = [
  "aceite",
  "agua_refrigerante",
  "combustible",
  "luces_delanteras",
  "luces_traseras",
  "luces_giro",
  "parabrisas",
  "espejos",
  "limpiaparabrisas",
  "cubiertas",
  "rueda_auxilio",
  "interior",
];
const ITEM_LABELS = {
  aceite: "Nivel de aceite",
  agua_refrigerante: "Agua / Refrigerante",
  combustible: "Combustible",
  luces_delanteras: "Luces delanteras",
  luces_traseras: "Luces traseras",
  luces_giro: "Luces de giro",
  parabrisas: "Parabrisas",
  espejos: "Espejos",
  limpiaparabrisas: "Limpia parabrisas",
  cubiertas: "Cubiertas",
  rueda_auxilio: "Rueda de auxilio",
  gato_llave: "Gato y llave rueda",
  documentacion: "Documentación",
  interior: "Interior del vehículo",
};

const buildChecklist = (keys) =>
  keys.reduce((acc, key) => {
    acc[key] = { estado: "", obs: "" };
    return acc;
  }, {});

const buildDefaultAcroformPayload = () => ({
  general: {
    vehiculo: "",
    patente: "",
    chofer: "",
    fecha_control: "",
    hora_retiro: "",
    hora_entrega: "",
    km_retiro: "",
    km_entrega: "",
  },
  previo: {
    meta: {
      fecha_retiro: "",
      hora_retiro: "",
      km_retiro: "",
    },
    items: buildChecklist(PRE_ITEMS),
    observaciones_generales: "",
    firma_chofer: "",
  },
  posterior: {
    meta: {
      fecha_entrega: "",
      hora_entrega: "",
      km_entrega: "",
    },
    items: buildChecklist(POST_ITEMS),
    novedades_incidentes: "",
    firma_chofer: "",
    firma_responsable: "",
  },
});

const nowDateLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const nowTimeLocal = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const DEFAULT_FORM = {
  control_previo_completo: false,
  control_posterior_completo: false,
  km_retiro: "",
  km_entrega: "",
  limpieza_turno_at: "",
  limpieza_estado: "pendiente",
  limpieza_notas: "",
  limpieza_google_calendar_event_id: "",
  limpieza_google_calendar_synced_at: "",
  last_edited_at: "",
  last_edited_by_nombre: "",
  acroform_payload: buildDefaultAcroformPayload(),
};

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function formatAuditDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatKm(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("es-AR");
}

function mergeAcroformPayload(existing, fallback) {
  const base = buildDefaultAcroformPayload();
  const merged = {
    ...base,
    ...(existing || {}),
    general: { ...base.general, ...(existing?.general || {}) },
    previo: {
      ...base.previo,
      ...(existing?.previo || {}),
      items: { ...base.previo.items, ...(existing?.previo?.items || {}) },
    },
    posterior: {
      ...base.posterior,
      ...(existing?.posterior || {}),
      items: { ...base.posterior.items, ...(existing?.posterior?.items || {}) },
    },
  };
  merged.previo.meta = { ...(base.previo.meta || {}), ...(merged.previo?.meta || {}) };
  merged.posterior.meta = { ...(base.posterior.meta || {}), ...(merged.posterior?.meta || {}) };
  merged.previo.items = { ...(base.previo.items || {}), ...(merged.previo?.items || {}) };
  merged.posterior.items = { ...(base.posterior.items || {}), ...(merged.posterior?.items || {}) };
  if (fallback?.transporteNombre && !merged.general.vehiculo) {
    merged.general.vehiculo = fallback.transporteNombre;
  }
  if (fallback?.patente && !merged.general.patente) {
    merged.general.patente = fallback.patente;
  }
  if (fallback?.choferNombre && !merged.general.chofer) {
    merged.general.chofer = fallback.choferNombre;
  }
  if (fallback?.kmRetiro != null && merged.general.km_retiro === "") {
    merged.general.km_retiro = String(fallback.kmRetiro);
  }
  if (fallback?.kmEntrega != null && merged.general.km_entrega === "") {
    merged.general.km_entrega = String(fallback.kmEntrega);
  }
  if (!merged.previo?.meta?.km_retiro && fallback?.kmRetiro != null) {
    merged.previo.meta.km_retiro = String(fallback.kmRetiro);
  }
  if (!merged.posterior?.meta?.km_entrega && fallback?.kmEntrega != null) {
    merged.posterior.meta.km_entrega = String(fallback.kmEntrega);
  }
  if (!merged.previo?.meta?.fecha_retiro) merged.previo.meta.fecha_retiro = nowDateLocal();
  if (!merged.previo?.meta?.hora_retiro) merged.previo.meta.hora_retiro = nowTimeLocal();
  if (!merged.posterior?.meta?.fecha_entrega) merged.posterior.meta.fecha_entrega = nowDateLocal();
  if (!merged.posterior?.meta?.hora_entrega) merged.posterior.meta.hora_entrega = nowTimeLocal();
  return merged;
}

const toNullableInt = (value) => {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

export default function ViajeControlVehiculoModal({
  supabase,
  viaje,
  transporte,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errorMsg, setErrorMsg] = useState("");
  const [syncUiState, setSyncUiState] = useState("idle"); // idle | saving | saved | error
  const [activeStage, setActiveStage] = useState(null); // "previo" | "posterior" | null
  const [openNotes, setOpenNotes] = useState({});
  const [editingLimpieza, setEditingLimpieza] = useState(false);
  const [previousTripKm, setPreviousTripKm] = useState(null);
  const [previousTripDate, setPreviousTripDate] = useState("");
  const autoSaveTimerRef = useRef(null);
  const isHydratingRef = useRef(true);
  const lastLimpiezaHashRef = useRef("");


  const title = useMemo(() => {
    const motivo = viaje?.motivo?.trim() || `Viaje #${viaje?.id}`;
    return `${motivo} · ${transporte?.nombre || "Vehículo"}`;
  }, [viaje, transporte]);

  const loadAll = async () => {
    if (!viaje?.id || !transporte?.id) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const [{ data: controlRow, error: controlErr }, { data: choferRow }] = await Promise.all([
        supabase
          .from("scrn_viajes_controles")
          .select("*")
          .eq("id_viaje", viaje.id)
          .maybeSingle(),
        viaje?.id_chofer
          ? supabase
              .from("scrn_perfiles")
              .select("nombre, apellido")
              .eq("id", viaje.id_chofer)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (controlErr) throw controlErr;

      const choferNombre =
        choferRow?.apellido || choferRow?.nombre
          ? `${choferRow?.apellido || ""}${choferRow?.apellido && choferRow?.nombre ? ", " : ""}${choferRow?.nombre || ""}`.trim()
          : "";

      const acroformPayload = mergeAcroformPayload(controlRow?.acroform_payload, {
        transporteNombre: transporte?.nombre || "",
        patente: transporte?.patente || "",
        choferNombre,
        kmRetiro: controlRow?.km_retiro,
        kmEntrega: controlRow?.km_entrega,
      });

      acroformPayload.general.vehiculo = transporte?.nombre || acroformPayload.general.vehiculo || "";
      acroformPayload.general.patente = transporte?.patente || acroformPayload.general.patente || "";
      if (choferNombre) acroformPayload.general.chofer = choferNombre;

      setForm({
        control_previo_completo: !!controlRow?.control_previo_completo,
        control_posterior_completo: !!controlRow?.control_posterior_completo,
        km_retiro: controlRow?.km_retiro ?? "",
        km_entrega: controlRow?.km_entrega ?? "",
        limpieza_turno_at: toLocalDateTimeInput(controlRow?.limpieza_turno_at),
        limpieza_estado: controlRow?.limpieza_estado || "pendiente",
        limpieza_notas: controlRow?.limpieza_notas || "",
        limpieza_google_calendar_event_id:
          controlRow?.limpieza_google_calendar_event_id || "",
        limpieza_google_calendar_synced_at:
          controlRow?.limpieza_google_calendar_synced_at || "",
        last_edited_at: controlRow?.last_edited_at || "",
        last_edited_by_nombre: controlRow?.last_edited_by_nombre || "",
        acroform_payload: acroformPayload,
      });
      lastLimpiezaHashRef.current = JSON.stringify({
        turno: controlRow?.limpieza_turno_at || null,
        estado: controlRow?.limpieza_estado || "pendiente",
        notas: controlRow?.limpieza_notas || "",
      });
      setEditingLimpieza(false);
      if (viaje?.fecha_salida) {
        const { data: prevViaje, error: prevViajeErr } = await supabase
          .from("scrn_viajes")
          .select("id,fecha_salida")
          .eq("id_transporte", transporte.id)
          .lt("fecha_salida", viaje.fecha_salida)
          .order("fecha_salida", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (prevViajeErr) throw prevViajeErr;
        if (!prevViaje?.id) {
          setPreviousTripKm(null);
          setPreviousTripDate("");
        } else {
          const { data: prevControl, error: prevControlErr } = await supabase
            .from("scrn_viajes_controles")
            .select("km_entrega")
            .eq("id_viaje", prevViaje.id)
            .maybeSingle();
          if (prevControlErr) throw prevControlErr;
          setPreviousTripKm(prevControl?.km_entrega ?? null);
          setPreviousTripDate(prevViaje?.fecha_salida || "");
        }
      } else {
        setPreviousTripKm(null);
        setPreviousTripDate("");
      }
    } catch (e) {
      setErrorMsg(e?.message || "Error cargando controles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id, transporte?.id]);

  const buildPayload = () => ({
    id_viaje: viaje.id,
    id_transporte: transporte.id,
    km_retiro: toNullableInt(form.acroform_payload?.previo?.meta?.km_retiro),
    km_entrega: toNullableInt(form.acroform_payload?.posterior?.meta?.km_entrega),
    limpieza_turno_at: form.limpieza_turno_at
      ? new Date(form.limpieza_turno_at).toISOString()
      : null,
    limpieza_estado: form.limpieza_estado || "pendiente",
    limpieza_notas: (form.limpieza_notas || "").trim() || null,
    acroform_payload: {
      ...form.acroform_payload,
      general: {
        ...(form.acroform_payload?.general || {}),
        km_retiro:
          form.acroform_payload?.previo?.meta?.km_retiro === ""
            ? ""
            : String(form.acroform_payload?.previo?.meta?.km_retiro || ""),
        km_entrega:
          form.acroform_payload?.posterior?.meta?.km_entrega === ""
            ? ""
            : String(form.acroform_payload?.posterior?.meta?.km_entrega || ""),
        vehiculo:
          form.acroform_payload?.general?.vehiculo || transporte?.nombre || "",
        patente:
          form.acroform_payload?.general?.patente || transporte?.patente || "",
      },
    },
  });

  const applyKmRetiroFloor = (payload, floorKm) => {
    if (floorKm == null) return payload;
    if (payload.km_retiro == null || payload.km_retiro >= floorKm) return payload;
    return {
      ...payload,
      km_retiro: floorKm,
      acroform_payload: {
        ...(payload.acroform_payload || {}),
        previo: {
          ...((payload.acroform_payload || {}).previo || {}),
          meta: {
            ...(((payload.acroform_payload || {}).previo || {}).meta || {}),
            km_retiro: String(floorKm),
          },
        },
        general: {
          ...((payload.acroform_payload || {}).general || {}),
          km_retiro: String(floorKm),
        },
      },
    };
  };

  const validateKmBeforeSave = async (payload) => {
    const prevKm = previousTripKm;
    if (prevKm == null) return null;

    if (payload.km_retiro != null && payload.km_retiro < prevKm) {
      return `km_retiro (${payload.km_retiro}) no puede ser menor al km del viaje anterior (${prevKm})`;
    }
    if (payload.km_entrega != null && payload.km_entrega < prevKm) {
      return `km_entrega (${payload.km_entrega}) no puede ser menor al km del viaje anterior (${prevKm})`;
    }
    if (
      payload.km_retiro != null &&
      payload.km_entrega != null &&
      payload.km_entrega < payload.km_retiro
    ) {
      return "km_entrega no puede ser menor a km_retiro";
    }
    return null;
  };

  const saveViajeControl = async ({ silent = false } = {}) => {
    if (!viaje?.id || !transporte?.id) return;
    if (!silent) setSaving(true);
    setSyncUiState("saving");
    setErrorMsg("");
    let hadError = false;
    try {
      let payload = buildPayload();
      payload = applyKmRetiroFloor(payload, previousTripKm);
      if (
        String(payload.km_retiro ?? "") !==
        String(form.acroform_payload?.previo?.meta?.km_retiro ?? "")
      ) {
        setForm((prev) => ({
          ...prev,
          acroform_payload: {
            ...(prev.acroform_payload || {}),
            previo: {
              ...(prev.acroform_payload?.previo || {}),
              meta: {
                ...(prev.acroform_payload?.previo?.meta || {}),
                km_retiro: String(payload.km_retiro ?? ""),
              },
            },
            general: {
              ...(prev.acroform_payload?.general || {}),
              km_retiro: String(payload.km_retiro ?? ""),
            },
          },
        }));
      }
      const kmValidationError = await validateKmBeforeSave(payload);
      if (kmValidationError) {
        throw new Error(kmValidationError);
      }
      const limpiezaHash = JSON.stringify({
        turno: payload.limpieza_turno_at || null,
        estado: payload.limpieza_estado || "pendiente",
        notas: payload.limpieza_notas || "",
      });
      const limpiezaChanged = limpiezaHash !== lastLimpiezaHashRef.current;
      const { data: savedRow, error } = await supabase
        .from("scrn_viajes_controles")
        .upsert(payload, { onConflict: "id_viaje" })
        .select("last_edited_at,last_edited_by_nombre")
        .single();
      if (error) throw error;
      if (savedRow) {
        setForm((prev) => ({
          ...prev,
          last_edited_at: savedRow.last_edited_at || prev.last_edited_at || "",
          last_edited_by_nombre:
            savedRow.last_edited_by_nombre || prev.last_edited_by_nombre || "",
        }));
      }
      lastLimpiezaHashRef.current = limpiezaHash;
      if (!silent) {
        await loadAll();
        onSaved?.();
      } else if (limpiezaChanged) {
        onSaved?.();
      }
    } catch (e) {
      hadError = true;
      const details = [e?.message, e?.details, e?.hint].filter(Boolean).join(" · ");
      setErrorMsg(details || "Error guardando control");
      // Deja trazabilidad útil en consola para diagnóstico de triggers SQL
      console.error("Error guardando scrn_viajes_controles", e);
      setSyncUiState("error");
    } finally {
      if (!silent) setSaving(false);
      if (!hadError) setSyncUiState("saved");
    }
  };

  useEffect(() => {
    if (loading) return;
    if (isHydratingRef.current) {
      isHydratingRef.current = false;
      return;
    }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void saveViajeControl({ silent: true });
    }, 900);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);


  const updateGeneral = (field, value) => {
    setForm((prev) => ({
      ...prev,
      acroform_payload: {
        ...prev.acroform_payload,
        general: { ...(prev.acroform_payload?.general || {}), [field]: value },
      },
    }));
  };

  const updateChecklist = (block, itemKey, field, value) => {
    setForm((prev) => ({
      ...prev,
      acroform_payload: {
        ...prev.acroform_payload,
        [block]: {
          ...(prev.acroform_payload?.[block] || {}),
          items: {
            ...(prev.acroform_payload?.[block]?.items || {}),
            [itemKey]: {
              ...((prev.acroform_payload?.[block]?.items || {})[itemKey] || {}),
              [field]: value,
            },
          },
        },
      },
    }));
  };

  const updateBlockField = (block, field, value) => {
    setForm((prev) => ({
      ...prev,
      acroform_payload: {
        ...prev.acroform_payload,
        [block]: { ...(prev.acroform_payload?.[block] || {}), [field]: value },
      },
    }));
  };

  const exportStagePdf = (stage) =>
    exportControlVehiculoToPDF({
      viaje,
      transporte,
      controlRow: { ...form, acroform_payload: form.acroform_payload },
      stage,
    });

  const getStageStatus = (stage) => {
    const isComplete =
      stage === "previo"
        ? !!form.control_previo_completo
        : !!form.control_posterior_completo;
    if (isComplete) return "finalizado";
    const block = stage === "previo" ? form.acroform_payload?.previo : form.acroform_payload?.posterior;
    const hasAny =
      Object.values(block?.items || {}).some((it) => !!it?.estado) ||
      (stage === "previo"
        ? !!block?.meta?.fecha_retiro || !!block?.meta?.hora_retiro || !!block?.meta?.km_retiro
        : !!block?.meta?.fecha_entrega || !!block?.meta?.hora_entrega || !!block?.meta?.km_entrega);
    return hasAny ? "incompleto" : "pendiente";
  };
  const previoFinalizado = getStageStatus("previo") === "finalizado";
  const kmRetiroValue = toNullableInt(form.acroform_payload?.previo?.meta?.km_retiro);
  const kmEntregaValue = toNullableInt(form.acroform_payload?.posterior?.meta?.km_entrega);
  const kmRetiroInvalid =
    previousTripKm != null && kmRetiroValue != null && kmRetiroValue < previousTripKm;
  const kmEntregaInvalid =
    previousTripKm != null && kmEntregaValue != null && kmEntregaValue < previousTripKm;
  const kmOrderInvalid =
    kmRetiroValue != null &&
    kmEntregaValue != null &&
    kmEntregaValue < kmRetiroValue;
  const lastEditedText = form.last_edited_at
    ? `Última vez editado por: ${form.last_edited_by_nombre || "Usuario"} en ${formatAuditDateTime(form.last_edited_at)}`
    : "Sin ediciones registradas";

  const toggleNote = (key) => {
    setOpenNotes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      className="fixed inset-0 z-[220] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800 truncate">
              Control de vehículo
            </h3>
            <p className="text-xs text-slate-500 truncate">{title}</p>
          </div>
          <div className="inline-flex items-center gap-2 text-[11px] text-slate-600">
            {syncUiState === "saving" ? (
              <>
                <IconLoader size={14} className="animate-spin text-indigo-600" />
                <span>Sincronizando…</span>
              </>
            ) : syncUiState === "saved" ? (
              <>
                <IconCheckCircle size={14} className="text-emerald-600" />
                <span>Guardado automático</span>
              </>
            ) : syncUiState === "error" ? (
              <span className="text-rose-700 font-semibold">Error al guardar</span>
            ) : (
              <span className="text-slate-400">Auto-guardado activo</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            ×
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(92vh-64px)]">
          {loading ? <div className="text-sm text-slate-500">Cargando…</div> : null}
          {errorMsg ? (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
              {errorMsg}
            </div>
          ) : null}

          <div className="grid md:grid-cols-2 gap-4">
            <section className="rounded-xl border border-slate-200 p-3 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-700">Control por viaje</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Vehículo</label>
                  <input
                    value={form.acroform_payload?.general?.vehiculo || ""}
                    readOnly
                    className="w-full rounded border border-slate-300 bg-slate-100 px-2 py-1.5 text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Patente</label>
                  <input
                    value={form.acroform_payload?.general?.patente || ""}
                    readOnly
                    className="w-full rounded border border-slate-300 bg-slate-100 px-2 py-1.5 text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Chofer</label>
                  <input
                    value={form.acroform_payload?.general?.chofer || ""}
                    readOnly
                    className="w-full rounded border border-slate-300 bg-slate-100 px-2 py-1.5 text-sm text-slate-700"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-700">Limpieza post-viaje</h4>
                <button
                  type="button"
                  onClick={() => setEditingLimpieza((v) => !v)}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                >
                  <IconEdit size={12} /> {editingLimpieza ? "Cerrar edición" : "Editar turno"}
                </button>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500">Turno: </span>
                  <span className="font-semibold">{form.limpieza_turno_at || "Sin turno asignado"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Estado: </span>
                  <span className="font-semibold">{form.limpieza_estado || "-"}</span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {form.limpieza_google_calendar_event_id ? (
                    <>
                      <IconCheckCircle size={14} className="text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">
                        Sincronizado con Google Calendar
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-700 font-semibold">
                      Pendiente de sincronización con Google Calendar
                    </span>
                  )}
                </div>
                {form.limpieza_google_calendar_synced_at ? (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Última sync: {new Date(form.limpieza_google_calendar_synced_at).toLocaleString("es-AR")}
                  </div>
                ) : null}
              </div>
              {editingLimpieza && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Turno</label>
                    <input
                      type="datetime-local"
                      value={form.limpieza_turno_at}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, limpieza_turno_at: e.target.value }))
                      }
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Estado</label>
                    <select
                      value={form.limpieza_estado}
                      onChange={(e) => setForm((prev) => ({ ...prev, limpieza_estado: e.target.value }))}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm bg-white"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="programado">Programado</option>
                      <option value="realizado">Realizado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Notas</label>
                    <textarea
                      value={form.limpieza_notas}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, limpieza_notas: e.target.value }))
                      }
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm min-h-20"
                    />
                  </div>
                </>
              )}
            </section>
          </div>

          <section className="rounded-xl border border-slate-200 p-3 space-y-3">
            <div className="grid w-full gap-2 md:grid-cols-2">
              <div className="rounded border border-slate-200 p-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStage("previo")}
                    className={`rounded px-3 py-2 text-xs font-bold uppercase ${
                      getStageStatus("previo") === "finalizado"
                        ? "bg-emerald-600 text-white border border-emerald-700"
                        : getStageStatus("previo") === "incompleto"
                          ? "bg-amber-500 text-white border border-amber-600"
                          : activeStage === "previo"
                            ? "bg-indigo-700 text-white"
                            : "border border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {getStageStatus("previo") === "finalizado"
                      ? "Control previo finalizado"
                      : getStageStatus("previo") === "incompleto"
                        ? "Control previo incompleto"
                        : "Iniciar control previo"}
                  </button>
                  {getStageStatus("previo") === "finalizado" && (
                    <button
                      type="button"
                      onClick={() => exportStagePdf("previo")}
                      className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase text-emerald-800"
                    >
                      Exportar
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{lastEditedText}</p>
              </div>

              <div className="rounded border border-slate-200 p-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!previoFinalizado) return;
                      setActiveStage("posterior");
                    }}
                    disabled={!previoFinalizado}
                    title={!previoFinalizado ? "Primero completá el control previo" : "Iniciar control final"}
                    className={`rounded px-3 py-2 text-xs font-bold uppercase ${
                      !previoFinalizado
                        ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                        : getStageStatus("posterior") === "finalizado"
                          ? "bg-emerald-600 text-white border border-emerald-700"
                          : getStageStatus("posterior") === "incompleto"
                            ? "bg-amber-500 text-white border border-amber-600"
                            : activeStage === "posterior"
                              ? "bg-indigo-700 text-white"
                              : "border border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {getStageStatus("posterior") === "finalizado"
                      ? "Control final finalizado"
                      : getStageStatus("posterior") === "incompleto"
                        ? "Control final incompleto"
                        : "Iniciar control final"}
                  </button>
                  {getStageStatus("posterior") === "finalizado" && (
                    <button
                      type="button"
                      onClick={() => exportStagePdf("posterior")}
                      className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase text-emerald-800"
                    >
                      Exportar
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{lastEditedText}</p>
              </div>
            </div>

            {activeStage === "previo" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-700">Control previo</h4>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={form.acroform_payload?.previo?.meta?.fecha_retiro || ""}
                    onChange={(e) => updateBlockField("previo", "meta", {
                      ...(form.acroform_payload?.previo?.meta || {}),
                      fecha_retiro: e.target.value,
                    })}
                    className={`rounded border px-2 py-1 text-xs ${
                      form.acroform_payload?.previo?.meta?.fecha_retiro
                        ? "border-slate-300"
                        : "border-amber-400 bg-amber-50"
                    }`}
                    title="Fecha retiro"
                  />
                  <input
                    type="time"
                    value={form.acroform_payload?.previo?.meta?.hora_retiro || ""}
                    onChange={(e) => updateBlockField("previo", "meta", {
                      ...(form.acroform_payload?.previo?.meta || {}),
                      hora_retiro: e.target.value,
                    })}
                    className={`rounded border px-2 py-1 text-xs ${
                      form.acroform_payload?.previo?.meta?.hora_retiro
                        ? "border-slate-300"
                        : "border-amber-400 bg-amber-50"
                    }`}
                    title="Hora retiro"
                  />
                  <input
                    type="number"
                    min={0}
                    value={form.acroform_payload?.previo?.meta?.km_retiro || ""}
                    onChange={(e) => updateBlockField("previo", "meta", {
                      ...(form.acroform_payload?.previo?.meta || {}),
                      km_retiro: e.target.value,
                    })}
                    className={`rounded border px-2 py-1 text-xs ${
                      kmRetiroInvalid
                        ? "border-rose-400 bg-rose-50"
                        : form.acroform_payload?.previo?.meta?.km_retiro
                          ? "border-slate-300"
                          : "border-amber-400 bg-amber-50"
                    }`}
                    placeholder="KM retiro"
                  />
                </div>
                {previousTripKm != null && (
                  <p className={`text-[11px] ${kmRetiroInvalid ? "text-rose-700 font-semibold" : "text-slate-500"}`}>
                    Debe ser mayor al último registro: {formatKm(previousTripKm)} km, fecha {formatShortDateTime(previousTripDate) || "-"}. Retiro cargado: {formatKm(kmRetiroValue)} km.
                  </p>
                )}
                <div className="rounded border border-slate-200 overflow-hidden">
                  <div className="w-full">
                    <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] md:gap-2 bg-slate-50 border-b border-slate-200 text-[10px] md:text-[12px] font-black uppercase text-slate-600">
                      <div className="grid grid-cols-[minmax(0,1fr)_24px_24px_24px_18px] md:grid-cols-[minmax(0,1fr)_40px_40px_40px_26px]">
                        <div className="px-1.5 py-1.5 md:px-2.5 md:py-2">Criterio</div>
                        <div className="px-1 py-2 md:py-2.5 text-center text-emerald-700">B</div>
                        <div className="px-1 py-2 md:py-2.5 text-center text-amber-600">R</div>
                        <div className="px-1 py-2 md:py-2.5 text-center text-rose-700">M</div>
                        <div className="px-1 py-2 md:py-2.5 text-center text-amber-700">•</div>
                      </div>
                      <div className="hidden md:flex items-center px-2.5 py-2 text-amber-700">Obs</div>
                    </div>
                    {PRE_ITEMS.map((itemKey) => {
                      const estado = form.acroform_payload?.previo?.items?.[itemKey]?.estado || "";
                      const hasObs = !!form.acroform_payload?.previo?.items?.[itemKey]?.obs?.trim();
                      const showObs = openNotes[`previo-${itemKey}`] || false;
                      return (
                        <div key={`pre-row-${itemKey}`} className={`border-b border-slate-100 last:border-b-0 md:grid md:grid-cols-[minmax(0,1fr)_320px] md:gap-2 ${!estado ? "bg-amber-50/60" : ""}`}>
                          <div className="grid grid-cols-[minmax(0,1fr)_24px_24px_24px_18px] md:grid-cols-[minmax(0,1fr)_40px_40px_40px_26px] items-center">
                            <div className="px-1.5 py-1 md:px-2.5 md:py-2 text-[11px] md:text-[15px] text-slate-800 truncate">{ITEM_LABELS[itemKey]}</div>
                            <label className="flex justify-center">
                              <input
                                type="radio"
                                name={`previo-${itemKey}`}
                                checked={estado === "bien"}
                                onChange={() => updateChecklist("previo", itemKey, "estado", "bien")}
                                className="scale-90 md:scale-110"
                              />
                            </label>
                            <label className="flex justify-center">
                              <input
                                type="radio"
                                name={`previo-${itemKey}`}
                                checked={estado === "regular"}
                                onChange={() => updateChecklist("previo", itemKey, "estado", "regular")}
                                className="scale-90 md:scale-110"
                              />
                            </label>
                            <label className="flex justify-center">
                              <input
                                type="radio"
                                name={`previo-${itemKey}`}
                                checked={estado === "mal"}
                                onChange={() => updateChecklist("previo", itemKey, "estado", "mal")}
                                className="scale-90 md:scale-110"
                              />
                            </label>
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => toggleNote(`previo-${itemKey}`)}
                                className={`w-3 h-3 md:w-4 md:h-4 rounded-[2px] shadow-sm border rotate-[-8deg] hover:rotate-0 transition-transform ${
                                  hasObs
                                    ? "bg-amber-300 border-amber-500/90 hover:bg-amber-200"
                                    : "bg-amber-50 border-dashed border-amber-400/80 hover:bg-amber-100"
                                }`}
                                title={hasObs ? "Editar observación" : "Agregar observación"}
                              />
                            </div>
                          </div>
                          <div className={`${showObs ? "block" : "hidden"} md:block px-2 pb-2 md:px-2.5 md:py-1`}>
                            <textarea
                              value={form.acroform_payload?.previo?.items?.[itemKey]?.obs || ""}
                              onChange={(e) => updateChecklist("previo", itemKey, "obs", e.target.value)}
                              className="w-full rounded border border-amber-300 bg-amber-50 px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm min-h-16 md:min-h-20"
                              placeholder="Nota rápida"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded border border-slate-200 p-2">
                  <button
                    type="button"
                    onClick={() => toggleNote("previo-general")}
                    className="text-[11px] text-amber-700 underline"
                  >
                    {openNotes["previo-general"]
                      ? "Ocultar observaciones/firma previo"
                      : "Observaciones/firma previo"}
                  </button>
                  {openNotes["previo-general"] && (
                    <div className="mt-2 grid md:grid-cols-2 gap-2">
                      <textarea
                        value={form.acroform_payload?.previo?.observaciones_generales || ""}
                        onChange={(e) =>
                          updateBlockField("previo", "observaciones_generales", e.target.value)
                        }
                        className="w-full rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs min-h-16"
                        placeholder="Observaciones al retirar"
                      />
                      <input
                        value={form.acroform_payload?.previo?.firma_chofer || ""}
                        onChange={(e) => updateBlockField("previo", "firma_chofer", e.target.value)}
                        className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs"
                        placeholder="Firma chofer retirar"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeStage === "posterior" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-700">Control final</h4>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={form.acroform_payload?.posterior?.meta?.fecha_entrega || ""}
                    onChange={(e) => updateBlockField("posterior", "meta", {
                      ...(form.acroform_payload?.posterior?.meta || {}),
                      fecha_entrega: e.target.value,
                    })}
                    className={`rounded border px-2 py-1 text-xs ${
                      form.acroform_payload?.posterior?.meta?.fecha_entrega
                        ? "border-slate-300"
                        : "border-amber-400 bg-amber-50"
                    }`}
                    title="Fecha entrega"
                  />
                  <input
                    type="time"
                    value={form.acroform_payload?.posterior?.meta?.hora_entrega || ""}
                    onChange={(e) => updateBlockField("posterior", "meta", {
                      ...(form.acroform_payload?.posterior?.meta || {}),
                      hora_entrega: e.target.value,
                    })}
                    className={`rounded border px-2 py-1 text-xs ${
                      form.acroform_payload?.posterior?.meta?.hora_entrega
                        ? "border-slate-300"
                        : "border-amber-400 bg-amber-50"
                    }`}
                    title="Hora entrega"
                  />
                  <input
                    type="number"
                    min={0}
                    value={form.acroform_payload?.posterior?.meta?.km_entrega || ""}
                    onChange={(e) => updateBlockField("posterior", "meta", {
                      ...(form.acroform_payload?.posterior?.meta || {}),
                      km_entrega: e.target.value,
                    })}
                    className={`rounded border px-2 py-1 text-xs ${
                      kmEntregaInvalid || kmOrderInvalid
                        ? "border-rose-400 bg-rose-50"
                        : form.acroform_payload?.posterior?.meta?.km_entrega
                          ? "border-slate-300"
                          : "border-amber-400 bg-amber-50"
                    }`}
                    placeholder="KM entrega"
                  />
                </div>
                {previousTripKm != null && (
                  <p className={`text-[11px] ${kmEntregaInvalid ? "text-rose-700 font-semibold" : "text-slate-500"}`}>
                    Debe ser mayor al último registro: {formatKm(previousTripKm)} km, fecha {formatShortDateTime(previousTripDate) || "-"}. Retiro: {formatKm(kmRetiroValue)} km. Entrega: {formatKm(kmEntregaValue)} km.
                  </p>
                )}
                {kmOrderInvalid && (
                  <p className="text-[11px] text-rose-700 font-semibold">
                    KM entrega ({formatKm(kmEntregaValue)}) debe ser mayor o igual a KM retiro ({formatKm(kmRetiroValue)}).
                  </p>
                )}
                <div className="rounded border border-slate-200 overflow-hidden">
                  <div className="w-full">
                    <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] md:gap-2 bg-slate-50 border-b border-slate-200 text-[10px] md:text-[12px] font-black uppercase text-slate-600">
                      <div className="grid grid-cols-[minmax(0,1fr)_36px_24px_24px_24px_18px] md:grid-cols-[minmax(0,1fr)_60px_40px_40px_40px_26px]">
                        <div className="px-1.5 py-1.5 md:px-2.5 md:py-2">Criterio</div>
                        <div className="px-1 py-1.5 md:py-2.5 text-center flex items-center justify-center">
                          <IconClock size={12} className="text-slate-500" />
                        </div>
                        <div className="px-1 py-1.5 md:py-2.5 text-center text-emerald-700">B</div>
                        <div className="px-1 py-1.5 md:py-2.5 text-center text-amber-600">R</div>
                        <div className="px-1 py-1.5 md:py-2.5 text-center text-rose-700">M</div>
                        <div className="px-1 py-1.5 md:py-2.5 text-center text-amber-700">•</div>
                      </div>
                      <div className="hidden md:flex items-center px-2.5 py-2 text-amber-700">Obs</div>
                    </div>
                    {POST_ITEMS.map((itemKey) => {
                      const previoEstado = form.acroform_payload?.previo?.items?.[itemKey]?.estado || "-";
                      const estado = form.acroform_payload?.posterior?.items?.[itemKey]?.estado || "";
                      const hasObs = !!form.acroform_payload?.posterior?.items?.[itemKey]?.obs?.trim();
                      const showObs = openNotes[`posterior-${itemKey}`] || false;
                      return (
                        <div key={`post-row-${itemKey}`} className={`border-b border-slate-100 last:border-b-0 md:grid md:grid-cols-[minmax(0,1fr)_320px] md:gap-2 ${!estado ? "bg-amber-50/60" : ""}`}>
                          <div className="grid grid-cols-[minmax(0,1fr)_36px_24px_24px_24px_18px] md:grid-cols-[minmax(0,1fr)_60px_40px_40px_40px_26px] items-center">
                            <div className="px-1.5 py-1 md:px-2.5 md:py-2 text-[11px] md:text-[15px] text-slate-800 truncate">{ITEM_LABELS[itemKey]}</div>
                            <div
                              className={`px-1 py-1 md:py-2 text-center text-[10px] md:text-[12px] font-bold uppercase ${
                                previoEstado === "bien"
                                  ? "text-emerald-700"
                                  : previoEstado === "regular"
                                    ? "text-amber-600"
                                    : previoEstado === "mal"
                                      ? "text-rose-700"
                                      : "text-slate-400"
                              }`}
                            >
                              {previoEstado === "bien"
                                ? "B"
                                : previoEstado === "regular"
                                  ? "R"
                                  : previoEstado === "mal"
                                    ? "M"
                                    : "-"}
                            </div>
                            <label className="flex justify-center">
                              <input
                                type="radio"
                                name={`posterior-${itemKey}`}
                                checked={estado === "bien"}
                                onChange={() => updateChecklist("posterior", itemKey, "estado", "bien")}
                                className="scale-90 md:scale-110"
                              />
                            </label>
                            <label className="flex justify-center">
                              <input
                                type="radio"
                                name={`posterior-${itemKey}`}
                                checked={estado === "regular"}
                                onChange={() => updateChecklist("posterior", itemKey, "estado", "regular")}
                                className="scale-90 md:scale-110"
                              />
                            </label>
                            <label className="flex justify-center">
                              <input
                                type="radio"
                                name={`posterior-${itemKey}`}
                                checked={estado === "mal"}
                                onChange={() => updateChecklist("posterior", itemKey, "estado", "mal")}
                                className="scale-90 md:scale-110"
                              />
                            </label>
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => toggleNote(`posterior-${itemKey}`)}
                                className={`w-3 h-3 md:w-4 md:h-4 rounded-[2px] shadow-sm border rotate-[-8deg] hover:rotate-0 transition-transform ${
                                  hasObs
                                    ? "bg-amber-300 border-amber-500/90 hover:bg-amber-200"
                                    : "bg-amber-50 border-dashed border-amber-400/80 hover:bg-amber-100"
                                }`}
                                title={hasObs ? "Editar observación" : "Agregar observación"}
                              />
                            </div>
                          </div>
                          <div className={`${showObs ? "block" : "hidden"} md:block px-2 pb-2 md:px-2.5 md:py-1`}>
                            <textarea
                              value={form.acroform_payload?.posterior?.items?.[itemKey]?.obs || ""}
                              onChange={(e) => updateChecklist("posterior", itemKey, "obs", e.target.value)}
                              className="w-full rounded border border-amber-300 bg-amber-50 px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm min-h-16 md:min-h-20"
                              placeholder="Nota final"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded border border-slate-200 p-2">
                  <button
                    type="button"
                    onClick={() => toggleNote("posterior-general")}
                    className="text-[11px] text-amber-700 underline"
                  >
                    {openNotes["posterior-general"]
                      ? "Ocultar novedades final"
                      : "Novedades final"}
                  </button>
                  {openNotes["posterior-general"] && (
                    <div className="mt-2">
                      <textarea
                        value={form.acroform_payload?.posterior?.novedades_incidentes || ""}
                        onChange={(e) =>
                          updateBlockField("posterior", "novedades_incidentes", e.target.value)
                        }
                        className="w-full rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs min-h-16"
                        placeholder="Novedades / incidentes"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

