import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { saveAs } from "file-saver";
import { exportViaticosToPDFForm } from "../../utils/pdfFormExporter";
import { calculateDaysDiff } from "../../hooks/viaticos/useViaticosIndividuales";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import ManualHeader from "../../components/public/ManualHeader";
import ManualPersonaImportPanel from "../../components/public/ManualPersonaImportPanel";
import ManualPersonaChoiceModal from "../../components/public/ManualPersonaChoiceModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useViaticosManualAuth } from "../../context/ViaticosManualAuthContext";
import {
  deleteViaticoGuardado,
  listMisRecorridosParaExportar,
  saveViaticoGuardado,
} from "../../services/viaticosManualService";
import { useViaticosManualCloudSave } from "../../hooks/viaticos/useViaticosManualCloudSave";
import { useManualPersonaCatalog } from "../../hooks/viaticos/useManualPersonaCatalog";
import { useValorDiarioVigente } from "../../hooks/viaticos/useValorDiarioVigente";
import { upsertPersonaFromFormData } from "../../services/viaticosManualPersonaService";
import { viaticosValorDiarioManualClient } from "../../services/viaticosValorDiarioService";
import ValorDiarioVigenciaAdminModal from "../../components/viaticos/ValorDiarioVigenciaAdminModal";
import ValorDiarioBaseHistoricoField, {
  resolverValorDiarioBaseHistorial,
} from "../../components/viaticos/ValorDiarioBaseHistoricoField";
import { canAdminValorDiario } from "../../utils/viaticosValorDiarioAdmin";
import {
  calcValorDiarioProporcional,
  segmentosParaVista,
} from "../../utils/viaticosValorDiarioProporcional";
import RangosValorDiario from "../../components/viaticos/RangosValorDiario";
import AnticipoDiasHelp from "../../components/viaticos/AnticipoDiasHelp";
import ArsAmountInput from "../../components/viaticos/ArsAmountInput";
import ManualClearChoiceModal from "../../components/public/ManualClearChoiceModal";
import {
  baseFieldClass,
  buildPersonaLabel,
  emptyPersonaFields,
  parsePersonaSearchQuery,
  inputClass,
  MANUAL_PERSONA_FIELDS,
  mapPersonaToFormFields,
  occupiedDateInputClass,
  occupiedTimeInputClass,
} from "../../utils/manualFieldClasses";
import {
  hasMeaningfulViaticoData,
  readAndClearScrnViaticoPrefill,
  readManualStorage,
  STORAGE_KEY,
  writeViaticoToStorage,
} from "../../utils/viaticosManualStorage";
import {
  IconCalculator,
  IconFileDownload,
  IconHistory,
  IconTrash,
} from "../../components/ui/Icons";

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v).trim().replace(/[$\s]/g, "");
  if (!s) return 0;
  // Formato es-AR: 1.234,56 o 1234,56
  if (/,\d{1,2}$/.test(s) && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoneyPreview = (val) =>
  toNumber(val).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const LOCALIDADES_DATALIST_ID = "viaticos_manual_localidades";

// Parser CSV simple con soporte de comillas dobles y separador coma.
// Devuelve array de filas (array de celdas).
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && (c === ",")) {
      pushCell();
      continue;
    }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && next === "\n") i++;
      pushCell();
      pushRow();
      continue;
    }
    cell += c;
  }
  // Última celda/fila
  pushCell();
  // Evitar agregar fila vacía final si el archivo termina en newline
  const isLastRowEmpty = row.every((v) => String(v || "").trim() === "");
  if (!isLastRowEmpty) pushRow();

  return rows;
};

const DEFAULT_FORM = {
  // Personales
  apellido: "",
  nombre: "",
  dni: "",
  cargo: "",
  jornada_laboral: "",
  ciudad_origen: "",
  asiento_habitual: "",

  // Comisión
  motivo: "",
  lugar_comision: "",
  fecha_salida: "",
  hora_salida: "",
  fecha_llegada: "",
  hora_llegada: "",

  // Financieros
  valor_diario_base: 0, // debe iniciar en 0
  temporada_alta: false, // +30%
  porcentaje: 100,

  // Transporte (checks + detalles)
  check_aereo: false,
  check_terrestre: false,
  check_patente_oficial: false,
  patente_oficial: "",
  check_patente_particular: false,
  patente_particular: "",
  transporte_otros: "",
  transporte_otros_detalle: "",

  // Gastos
  gasto_alojamiento: 0,
  gasto_pasajes: 0,
  gasto_combustible: 0,
  gasto_otros: 0,
  gastos_capacit: 0,
  gastos_movil_otros: 0,
  gasto_ceremonial: 0,
};

export default function ViaticosManual() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const {
    session,
    profile,
    isGuest,
    isAuthenticated,
    openLogin,
    openSavedPanel,
    onLogout,
    registerLoadHandlers,
  } = useViaticosManualAuth();
  const importFileRef = useRef(null);
  const [cloudViaticoId, setCloudViaticoId] = useState(null);
  const [etiquetaDescriptiva, setEtiquetaDescriptiva] = useState("");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearDeleteConfirmOpen, setClearDeleteConfirmOpen] = useState(false);
  const [clearingCloud, setClearingCloud] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_FORM;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return DEFAULT_FORM;
      return { ...DEFAULT_FORM, ...parsed };
    } catch {
      return DEFAULT_FORM;
    }
  });

  useEffect(() => {
    writeViaticoToStorage(form);
  }, [form]);

  const [selectedPersonaId, setSelectedPersonaId] = useState(null);
  const [pendingPersona, setPendingPersona] = useState(null);
  const [personaChoiceOpen, setPersonaChoiceOpen] = useState(false);
  const [chooseNewPersonaOpen, setChooseNewPersonaOpen] = useState(false);
  const [personaEditMode, setPersonaEditMode] = useState(null);
  const [changePersonaOpen, setChangePersonaOpen] = useState(false);
  const [vigenciaAdminOpen, setVigenciaAdminOpen] = useState(false);
  const [scrnPrefillPending, setScrnPrefillPending] = useState(null);
  const scrnPrefillHandledRef = useRef(false);
  const pdfButtonRef = useRef(null);
  const [recorridosExport, setRecorridosExport] = useState([]);
  const [recorridoExportKey, setRecorridoExportKey] = useState("");
  const [exportHint, setExportHint] = useState("");

  const suppressAutosaveRef = useRef(() => {});

  const {
    personas,
    localidades,
    status: catalogStatus,
    refresh: refreshPersonaCatalog,
  } = useManualPersonaCatalog();

  const {
    vigencias,
    refresh: refreshVigencias,
  } = useValorDiarioVigente(form.fecha_salida, {
    client: viaticosValorDiarioManualClient,
  });

  const canAdminVd = canAdminValorDiario({
    email: profile?.email || session?.user?.email,
  });

  const personaOptions = useMemo(() => {
    return (personas || []).map((p) => ({
      id: p.id,
      label: `${p.apellido}, ${p.nombre}${p.dni ? ` (${p.dni})` : ""}`,
      subLabel: [p.cargo, p.jornada_laboral].filter(Boolean).join(" · "),
    }));
  }, [personas]);

  const personaLabel = useMemo(() => buildPersonaLabel(form), [form]);
  const hasPersonaLoaded = Boolean(personaLabel);
  const canUpdatePersonaInBase = useMemo(
    () =>
      isAuthenticated &&
      String(form.apellido || "").trim() !== "" &&
      String(form.nombre || "").trim() !== "",
    [isAuthenticated, form.apellido, form.nombre],
  );

  const dias_computables = useMemo(() => {
    return calculateDaysDiff(
      form.fecha_salida,
      form.hora_salida,
      form.fecha_llegada,
      form.hora_llegada,
    );
  }, [form.fecha_salida, form.hora_salida, form.fecha_llegada, form.hora_llegada]);

  const factor_temporada = form.temporada_alta ? 0.3 : 0;

  const valorDiarioBaseInfo = useMemo(
    () =>
      resolverValorDiarioBaseHistorial({
        fechaSalida: form.fecha_salida,
        horaSalida: form.hora_salida,
        fechaLlegada: form.fecha_llegada,
        horaLlegada: form.hora_llegada,
        vigencias,
      }),
    [
      form.fecha_salida,
      form.hora_salida,
      form.fecha_llegada,
      form.hora_llegada,
      vigencias,
    ],
  );

  const calcFinanciero = useMemo(() => {
    return calcValorDiarioProporcional({
      fechaSalida: form.fecha_salida,
      horaSalida: form.hora_salida,
      fechaLlegada: form.fecha_llegada,
      horaLlegada: form.hora_llegada,
      vigencias,
      fallbackBase: 0,
      porcentaje: form.porcentaje,
      factorTemporada: factor_temporada,
    });
  }, [
    form.fecha_salida,
    form.hora_salida,
    form.fecha_llegada,
    form.hora_llegada,
    form.porcentaje,
    factor_temporada,
    vigencias,
  ]);

  const valorDiarioCalc = calcFinanciero.valorDiarioCalc;
  const subtotal = calcFinanciero.subtotal;
  const segmentosValor = calcFinanciero.segmentos;

  const totalGastos = useMemo(() => {
    return round2(
      toNumber(form.gasto_alojamiento) +
        toNumber(form.gasto_pasajes) +
        toNumber(form.gasto_combustible) +
        toNumber(form.gasto_otros) +
        toNumber(form.gastos_capacit) +
        toNumber(form.gastos_movil_otros) +
        toNumber(form.gasto_ceremonial),
    );
  }, [
    form.gasto_alojamiento,
    form.gasto_pasajes,
    form.gasto_combustible,
    form.gasto_otros,
    form.gastos_capacit,
    form.gastos_movil_otros,
    form.gasto_ceremonial,
  ]);

  const totalFinal = useMemo(() => round2(subtotal + totalGastos), [subtotal, totalGastos]);

  const buildViaticoDatos = useCallback(
    () => ({
      ...form,
      dias_computables,
      factor_temporada,
      valorDiarioCalc,
      subtotal,
      totalGastos,
      totalFinal,
    }),
    [form, dias_computables, factor_temporada, valorDiarioCalc, subtotal, totalGastos, totalFinal],
  );

  const getEtiqueta = useCallback(() => etiquetaDescriptiva.trim(), [etiquetaDescriptiva]);

  const handleSaveSuccess = useCallback(
    (datos) => {
      upsertPersonaFromFormData(datos)
        .then(() => refreshPersonaCatalog())
        .catch(() => {});
    },
    [refreshPersonaCatalog],
  );

  const {
    getCloudFieldClass,
    notifyFieldChange,
    scheduleAutosave,
    suppressNextAutosave,
    resetFieldFeedback,
    flashFieldsSuccess,
    isSaving,
  } = useViaticosManualCloudSave({
    enabled: isAuthenticated,
    cloudId: cloudViaticoId,
    setCloudId: setCloudViaticoId,
    buildDatos: buildViaticoDatos,
    getEtiqueta,
    saveRecord: saveViaticoGuardado,
    onSaveSuccess: handleSaveSuccess,
  });

  useEffect(() => {
    const nextBase =
      valorDiarioBaseInfo.estado === "unico"
        ? valorDiarioBaseInfo.valorDiarioBase
        : 0;
    suppressNextAutosave();
    setForm((prev) =>
      toNumber(prev.valor_diario_base) === toNumber(nextBase)
        ? prev
        : { ...prev, valor_diario_base: nextBase },
    );
  }, [valorDiarioBaseInfo, suppressNextAutosave]);

  useEffect(() => {
    suppressAutosaveRef.current = suppressNextAutosave;
  }, [suppressNextAutosave]);

  const applyScrnPrefill = useCallback(
    (prefill) => {
      if (!prefill || typeof prefill !== "object") return;
      const { scrn_origen: scrnOrigen, ...formFields } = prefill;
      suppressAutosaveRef.current?.();
      setCloudViaticoId(null);
      setEtiquetaDescriptiva("");
      setSelectedPersonaId(null);
      setForm({
        ...DEFAULT_FORM,
        ...formFields,
        ...(scrnOrigen ? { scrn_origen: scrnOrigen } : {}),
      });
    },
    [],
  );

  useEffect(() => {
    if (scrnPrefillHandledRef.current) return;
    if (searchParams.get("prefill") !== "scrn") return;
    scrnPrefillHandledRef.current = true;

    // Preferimos el prefill del estado de navegación (in-app, no efímero);
    // sessionStorage queda como respaldo (y se limpia siempre para evitar datos viejos).
    const statePrefill = location.state?.scrnViaticoPrefill;
    const sessionPrefill = readAndClearScrnViaticoPrefill();
    const payload =
      statePrefill && typeof statePrefill === "object"
        ? statePrefill
        : sessionPrefill;

    const wantExport =
      searchParams.get("export") === "1" || Boolean(location.state?.scrnExport);
    const next = new URLSearchParams(searchParams);
    next.delete("prefill");
    next.delete("export");
    setSearchParams(next, { replace: true });
    if (wantExport) {
      setExportHint("Viaje cargado. Usá el botón PDF de arriba para exportar el viático.");
    }
    if (!payload) return;

    const existing = readManualStorage();
    if (hasMeaningfulViaticoData(existing || {})) {
      setScrnPrefillPending(payload);
    } else {
      applyScrnPrefill(payload);
    }
  }, [location.state, searchParams, setSearchParams, applyScrnPrefill]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRecorridosExport([]);
      setRecorridoExportKey("");
      return;
    }
    let cancelled = false;
    listMisRecorridosParaExportar()
      .then((rows) => {
        if (!cancelled) setRecorridosExport(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setRecorridosExport([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleElegirRecorridoExport = (key) => {
    setRecorridoExportKey(key);
    const opt = recorridosExport.find((row) => row.key === key);
    if (!opt?.prefill) return;
    setExportHint("Viaje cargado. Usá el botón PDF de arriba para exportar el viático.");
    if (hasMeaningfulViaticoData(form)) {
      setScrnPrefillPending(opt.prefill);
    } else {
      applyScrnPrefill(opt.prefill);
    }
  };

  const handlePersonaSelect = (id) => {
    const p = (personas || []).find((x) => String(x.id) === String(id));
    if (!p) return;
    setPendingPersona(p);
    setPersonaChoiceOpen(true);
  };

  const applyPersonaToForm = useCallback((persona) => {
    const mapped = mapPersonaToFormFields(persona);
    setForm((prev) => ({
      ...prev,
      ...mapped,
    }));
    suppressNextAutosave();
  }, [suppressNextAutosave]);

  const handleImportPersonaFromDb = () => {
    if (!pendingPersona) return;
    applyPersonaToForm(pendingPersona);
    flashFieldsSuccess(MANUAL_PERSONA_FIELDS);
    setSelectedPersonaId(pendingPersona.id);
    setPersonaChoiceOpen(false);
    setPendingPersona(null);
    setPersonaEditMode(null);
    setChangePersonaOpen(false);
  };

  const savePersonaToBase = useCallback(async () => {
    if (!isAuthenticated || !canUpdatePersonaInBase) return;
    try {
      const saved = await upsertPersonaFromFormData(form);
      await refreshPersonaCatalog();
      if (saved?.id) setSelectedPersonaId(saved.id);
    } catch {
      /* el autosave también intenta actualizar la base */
    }
  }, [isAuthenticated, canUpdatePersonaInBase, form, refreshPersonaCatalog]);

  const handleStartEdit = () => {
    setChangePersonaOpen(false);
    setPersonaEditMode("edit");
  };

  const handleFinishEditing = useCallback(async () => {
    setPersonaEditMode(null);
    await savePersonaToBase();
  }, [savePersonaToBase]);

  const startCreatePersona = useCallback((searchQuery = "") => {
    const mapped = parsePersonaSearchQuery(searchQuery);
    setForm((prev) => ({ ...prev, ...mapped }));
    setSelectedPersonaId(null);
    setPendingPersona(null);
    setPersonaChoiceOpen(false);
    setChangePersonaOpen(false);
    setPersonaEditMode("add");
  }, []);

  const handleCreateNewPersona = useCallback(
    (searchQuery = "") => {
      if (searchQuery) {
        startCreatePersona(searchQuery);
        return;
      }
      if (!hasPersonaLoaded) {
        startCreatePersona();
        return;
      }
      setChooseNewPersonaOpen(true);
    },
    [hasPersonaLoaded, startCreatePersona],
  );

  const handleAddNewPersona = () => handleCreateNewPersona();

  const handleSelectExistingPersona = () => {
    setPersonaEditMode(null);
    setChangePersonaOpen(true);
  };

  const handleChangePersona = () => {
    setPersonaEditMode(null);
    setChangePersonaOpen((v) => !v);
  };

  const confirmChooseNewPersona = useCallback(() => {
    startCreatePersona();
  }, [startCreatePersona]);

  const shouldAutosaveCloud = useMemo(
    () => Boolean(cloudViaticoId) || hasMeaningfulViaticoData(form),
    [cloudViaticoId, form],
  );

  const autosaveSnapshot = useMemo(
    () => JSON.stringify(buildViaticoDatos()),
    [buildViaticoDatos],
  );

  useEffect(() => {
    if (!isAuthenticated || !shouldAutosaveCloud) return;
    scheduleAutosave();
  }, [isAuthenticated, shouldAutosaveCloud, autosaveSnapshot, scheduleAutosave]);

  const numberInputClass = useCallback(
    (key, val) => getCloudFieldClass(key, inputClass(val)),
    [getCloudFieldClass],
  );

  const handleLoadSavedViatico = useCallback(
    ({ record, mode = "edit" }) => {
      const datos = record?.datos || {};
      const { manual_rendicion: _mr, ...formFields } = datos;
      const prevDescriptive = String(record?.etiqueta || "").trim();
      setForm((prev) => ({ ...DEFAULT_FORM, ...prev, ...formFields }));
      setCloudViaticoId(mode === "edit" ? record?.id || null : null);
      setEtiquetaDescriptiva(
        mode === "duplicate"
          ? prevDescriptive
            ? `${prevDescriptive} (copia)`
            : "(copia)"
          : prevDescriptive,
      );
      resetFieldFeedback();
      setPersonaEditMode(null);
      setChangePersonaOpen(false);
      writeViaticoToStorage({ ...DEFAULT_FORM, ...formFields });
      setSaveMessage(
        mode === "duplicate"
          ? "Copia del viático cargada. Al guardar se creará un registro nuevo."
          : "Editando el viático original. Al guardar se actualizará este registro.",
      );
    },
    [resetFieldFeedback],
  );

  useEffect(() => {
    return registerLoadHandlers({ onLoadViatico: handleLoadSavedViatico });
  }, [registerLoadHandlers, handleLoadSavedViatico]);

  const update = (key) => (e) => {
    const { type, checked, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [key]: type === "checkbox" ? checked : value,
    }));
    notifyFieldChange(key);
  };

  const setValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    notifyFieldChange(key);
  };

  const handleDownload = async () => {
    const configData = {
      lugar_comision: form.lugar_comision || "",
      motivo: form.motivo || "",
      factor_temporada,
      keep_editable: true,
    };

    const viaticoRow = {
      apellido: form.apellido || "",
      nombre: form.nombre || "",
      dni: form.dni || "",
      cargo: form.cargo || "",
      jornada_laboral: form.jornada_laboral || "",
      ciudad_origen: form.ciudad_origen || "",
      asiento_habitual: form.asiento_habitual || "",

      motivo: form.motivo || "",
      lugar_comision: form.lugar_comision || "",
      fecha_salida: form.fecha_salida || "",
      hora_salida: form.hora_salida || "",
      fecha_llegada: form.fecha_llegada || "",
      hora_llegada: form.hora_llegada || "",

      dias_computables,
      porcentaje: toNumber(form.porcentaje),
      valorDiarioCalc,
      subtotal,
      segmentosValorDiario: segmentosValor,
      usaProporcional: calcFinanciero.usaProporcional,

      check_aereo: !!form.check_aereo,
      check_terrestre: !!form.check_terrestre,
      check_patente_oficial: !!form.check_patente_oficial,
      patente_oficial: form.patente_oficial || "",
      check_patente_particular: !!form.check_patente_particular,
      patente_particular: form.patente_particular || "",
      transporte_otros: form.transporte_otros || form.transporte_otros_detalle || "",
      transporte_otros_detalle: form.transporte_otros_detalle || "",

      gasto_alojamiento: toNumber(form.gasto_alojamiento),
      gasto_pasajes: toNumber(form.gasto_pasajes),
      gasto_combustible: toNumber(form.gasto_combustible),
      gasto_otros: toNumber(form.gasto_otros),
      gastos_capacit: toNumber(form.gastos_capacit),
      gastos_movil_otros: toNumber(form.gastos_movil_otros),
      gasto_ceremonial: toNumber(form.gasto_ceremonial),

      totalFinal,

      // Importante: sin firma digital (firma ológrafa posterior)
      firma: null,
    };

    const pdfBytes = await exportViaticosToPDFForm({}, [viaticoRow], configData, "viatico");
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const safeName = `${(form.apellido || "Viaticos").trim()}_${(form.nombre || "Manual").trim()}`
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80);
    saveAs(blob, `${safeName}_Viaticos.pdf`);
  };

  const resetViaticoForm = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setCloudViaticoId(null);
    setEtiquetaDescriptiva("");
    resetFieldFeedback();
    setSaveMessage("");
    setForm({
      ...DEFAULT_FORM,
    });
    setPersonaEditMode(null);
    setChangePersonaOpen(false);
    setSelectedPersonaId(null);
  }, [resetFieldFeedback]);

  const handleClear = () => setClearDialogOpen(true);

  const handleClearNew = () => {
    resetViaticoForm();
    setClearDialogOpen(false);
  };

  const handleRequestClearDelete = () => {
    setClearDialogOpen(false);
    setClearDeleteConfirmOpen(true);
  };

  const handleClearDelete = async () => {
    const deletingId = cloudViaticoId;
    setClearingCloud(true);
    setSaveMessage("");
    try {
      if (deletingId && isAuthenticated) {
        await deleteViaticoGuardado(deletingId);
      }
      resetViaticoForm();
      setClearDialogOpen(false);
      setClearDeleteConfirmOpen(false);
      setSaveMessage(
        deletingId && isAuthenticated
          ? "Viático eliminado de la nube."
          : "Planilla limpiada.",
      );
    } catch (e) {
      setSaveMessage(e?.message || "No se pudo eliminar el viático.");
      throw e;
    } finally {
      setClearingCloud(false);
    }
  };

  const handleExportCsv = () => {
    const payload = {
      ...form,
      dias_computables,
      factor_temporada,
      valorDiarioCalc,
      subtotal,
      totalGastos,
      totalFinal,
    };
    const keys = Object.keys(payload);
    const escape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      const needs = /[",\n\r]/.test(s);
      const safe = s.replace(/"/g, '""');
      return needs ? `"${safe}"` : safe;
    };
    const csv = `${keys.join(",")}\n${keys.map((k) => escape(payload[k])).join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const safeName = `${(form.apellido || "Viaticos").trim()}_${(form.nombre || "Manual").trim()}`
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80);
    saveAs(blob, `${safeName}_Viatico_Datos_Rendicion.csv`);
  };

  const handleImportCsv = async (file) => {
    try {
      const text = await file.text();
      const rows = parseCsv(text || "");
      if (!rows || rows.length < 2) return;
      const header = rows[0].map((h) => String(h || "").trim());
      const row = rows[1];
      const get = (name) => {
        const idx = header.indexOf(name);
        if (idx < 0) return "";
        return row[idx] ?? "";
      };
      setForm((prev) => ({
        ...prev,
        apellido: get("apellido") || prev.apellido,
        nombre: get("nombre") || prev.nombre,
        dni: get("dni") || prev.dni,
        cargo: get("cargo") || prev.cargo,
        jornada_laboral: get("jornada_laboral") || prev.jornada_laboral,
        ciudad_origen: get("ciudad_origen") || prev.ciudad_origen,
        asiento_habitual: get("asiento_habitual") || prev.asiento_habitual,
        motivo: get("motivo") || prev.motivo,
        lugar_comision: get("lugar_comision") || prev.lugar_comision,
        fecha_salida: get("fecha_salida") || prev.fecha_salida,
        hora_salida: get("hora_salida") || prev.hora_salida,
        fecha_llegada: get("fecha_llegada") || prev.fecha_llegada,
        hora_llegada: get("hora_llegada") || prev.hora_llegada,
        porcentaje: get("porcentaje") !== "" ? get("porcentaje") : prev.porcentaje,
        temporada_alta:
          String(get("temporada_alta") || "").toLowerCase() === "true" || String(get("temporada_alta") || "") === "1"
            ? true
            : String(get("temporada_alta") || "").toLowerCase() === "false" || String(get("temporada_alta") || "") === "0"
              ? false
              : prev.temporada_alta,
        gasto_alojamiento: get("gasto_alojamiento") !== "" ? get("gasto_alojamiento") : prev.gasto_alojamiento,
        gasto_pasajes: get("gasto_pasajes") !== "" ? get("gasto_pasajes") : prev.gasto_pasajes,
        gasto_combustible: get("gasto_combustible") !== "" ? get("gasto_combustible") : prev.gasto_combustible,
        gasto_otros: get("gasto_otros") !== "" ? get("gasto_otros") : prev.gasto_otros,
        gastos_capacit: get("gastos_capacit") !== "" ? get("gastos_capacit") : prev.gastos_capacit,
        gastos_movil_otros: get("gastos_movil_otros") !== "" ? get("gastos_movil_otros") : prev.gastos_movil_otros,
        gasto_ceremonial: get("gasto_ceremonial") !== "" ? get("gasto_ceremonial") : prev.gasto_ceremonial,
      }));
    } catch {}
  };

  return (
    <div className="scrn-shell min-h-screen text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <ManualHeader
          session={session}
          profile={profile}
          isGuest={isGuest}
          onLogin={openLogin}
          onLogout={onLogout}
          onOpenSaved={openSavedPanel}
          isCloudSaving={isSaving}
          onImport={() => importFileRef.current?.click()}
          onExport={handleExportCsv}
          importInput={
            <input
              ref={importFileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportCsv(f);
                e.target.value = "";
              }}
            />
          }
          trailingActions={
            <div className="inline-flex shrink-0 items-stretch overflow-hidden border border-[#c5d0dc] bg-white">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-rose-700 bg-rose-50 text-xs font-black hover:bg-rose-100 active:bg-rose-100 transition whitespace-nowrap"
                title="Limpiar planilla"
              >
                <IconTrash size={14} className="text-rose-600" />
                Limpiar
              </button>
              <div className="w-px bg-slate-200" />
              <button
                ref={pdfButtonRef}
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0054a6] text-white text-xs font-black hover:bg-[#003d7a] transition whitespace-nowrap"
                title="Descargar PDF del viático"
              >
                <IconFileDownload size={14} />
                PDF
              </button>
            </div>
          }
        />

        <div className="overflow-hidden border border-[#c5d0dc] border-t-4 border-t-[#0054a6] bg-white">

          <div className="px-6 pt-5">
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <IconCalculator size={20} className="text-[#0054a6]" />
              Viáticos Manual (Secretaría)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Exportá la planilla oficial en PDF con el botón <strong>PDF</strong> de arriba
              (DECTO-2025-867-E-GDERNE-RNE). El botón <strong>Exportar</strong> baja un CSV para rendiciones.
            </p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500">
                Elegir un viaje propio para exportar
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-semibold text-slate-800"
                  value={recorridoExportKey}
                  disabled={!isAuthenticated}
                  onChange={(e) => handleElegirRecorridoExport(e.target.value)}
                >
                  <option value="">
                    {isAuthenticated
                      ? recorridosExport.length
                        ? "Elegí un recorrido…"
                        : "No tenés viajes elegibles"
                      : "Iniciá sesión para ver tus viajes"}
                  </option>
                  {recorridosExport.map((row) => (
                    <option key={row.key} value={row.key}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-1 text-[11px] text-slate-500">
                Carga la planilla con los datos del recorrido. Después exportá con el botón PDF.
              </p>
              {exportHint ? (
                <p className="mt-1 text-[11px] font-semibold text-emerald-800">{exportHint}</p>
              ) : null}
            </div>
            {saveMessage && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {saveMessage}
              </div>
            )}
          </div>

          <div className="p-6 space-y-8">
            <ManualPersonaImportPanel
              data={form}
              onFieldChange={update}
              getCloudFieldClass={getCloudFieldClass}
              localidades={localidades}
              hasPersonaLoaded={hasPersonaLoaded}
              isEditing={personaEditMode !== null}
              editMode={personaEditMode}
              changePersonaOpen={changePersonaOpen}
              onStartEdit={handleStartEdit}
              onFinishEditing={handleFinishEditing}
              onCreateNewPersona={handleCreateNewPersona}
              onSelectExistingPersona={handleSelectExistingPersona}
              onAddNewPersona={handleAddNewPersona}
              onChangePersona={handleChangePersona}
              onCancelChangePersona={() => setChangePersonaOpen(false)}
              personaOptions={personaOptions}
              selectedPersonaId={selectedPersonaId}
              onPersonaSelect={handlePersonaSelect}
              catalogStatus={catalogStatus}
              personasCount={personas.length}
              personaLabel={personaLabel}
            />

            {/* Comisión + cálculo. Columna derecha: un solo panel. */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Comisión
              </div>
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:items-stretch">
                <label className="text-xs font-bold text-slate-600 md:col-start-1 md:row-start-1">
                  Motivo
                  <input
                    className={`mt-1 w-full ${inputClass(form.motivo)}`}
                    value={form.motivo}
                    onChange={update("motivo")}
                    placeholder="Motivo"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-start-2 md:row-start-1">
                  Lugar comisión
                  <input
                    type="text"
                    autoComplete="off"
                    list={LOCALIDADES_DATALIST_ID}
                    className={`mt-1 w-full ${inputClass(form.lugar_comision)}`}
                    value={form.lugar_comision}
                    onChange={update("lugar_comision")}
                    placeholder="Lugar"
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-start-1 md:row-start-2">
                  <label className="text-xs font-bold text-slate-600">
                    Fecha salida
                    <div className="mt-1">
                      <DateInput
                        value={form.fecha_salida}
                        onChange={(v) => setValue("fecha_salida", v)}
                        confirmPicker
                        showDayName={false}
                        className={`!py-1.5 !pl-8 !pr-2 !rounded-lg text-xs ${
                          form.fecha_salida ? occupiedDateInputClass : ""
                        }`}
                      />
                    </div>
                  </label>

                  <label className="text-xs font-bold text-slate-600">
                    Hora salida
                    <div className="mt-1">
                      <TimeInput
                        value={form.hora_salida}
                        allowEmpty
                        showClear
                        onChange={(v) => setValue("hora_salida", v || "")}
                        className={`border border-slate-300 rounded-lg outline-none px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#0054a6]/30 ${
                          String(form.hora_salida || "").trim() ? occupiedTimeInputClass : "bg-white"
                        }`}
                      />
                    </div>
                  </label>

                  <label className="text-xs font-bold text-slate-600">
                    Fecha llegada
                    <div className="mt-1">
                      <DateInput
                        value={form.fecha_llegada}
                        onChange={(v) => setValue("fecha_llegada", v)}
                        confirmPicker
                        showDayName={false}
                        className={`!py-1.5 !pl-8 !pr-2 !rounded-lg text-xs ${
                          form.fecha_llegada ? occupiedDateInputClass : ""
                        }`}
                      />
                    </div>
                  </label>

                  <label className="text-xs font-bold text-slate-600">
                    Hora llegada
                    <div className="mt-1">
                      <TimeInput
                        value={form.hora_llegada}
                        allowEmpty
                        showClear
                        onChange={(v) => setValue("hora_llegada", v || "")}
                        className={`border border-slate-300 rounded-lg outline-none px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#0054a6]/30 ${
                          String(form.hora_llegada || "").trim() ? occupiedTimeInputClass : "bg-white"
                        }`}
                      />
                    </div>
                  </label>
                </div>

                <div className="flex flex-col gap-3 md:col-start-1 md:row-start-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                      Cálculo
                    </div>
                    {canAdminVd ? (
                      <button
                        type="button"
                        onClick={() => setVigenciaAdminOpen(true)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#0054a6] hover:bg-[#e8f1fa] transition"
                        title="Administrar vigencias del valor diario"
                      >
                        <IconHistory size={13} />
                        Vigencias
                      </button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(6.5rem,0.7fr)_minmax(0,1fr)]">
                    <div className="col-span-2 flex h-full min-w-0 flex-col text-xs font-bold text-slate-600 lg:col-span-1">
                      <span className="flex min-h-8 items-end">Valor diario base</span>
                      <ValorDiarioBaseHistoricoField
                        fechaSalida={form.fecha_salida}
                        horaSalida={form.hora_salida}
                        fechaLlegada={form.fecha_llegada}
                        horaLlegada={form.hora_llegada}
                        vigencias={vigencias}
                        fmtMoney={fmtMoneyPreview}
                      />
                    </div>
                    <label className="flex h-full min-w-0 flex-col text-xs font-bold text-slate-600">
                      <span className="flex min-h-8 items-end">% viático</span>
                      <select
                        className={`mt-1 min-h-[38px] w-full flex-1 ${getCloudFieldClass(
                          "porcentaje",
                          `${baseFieldClass} bg-sky-50 border-sky-300`,
                        )}`}
                        value={String(form.porcentaje)}
                        onChange={(e) => {
                          update("porcentaje")(e);
                          notifyFieldChange("porcentaje");
                        }}
                      >
                        <option value="100">100%</option>
                        <option value="80">80%</option>
                        <option value="0">0%</option>
                      </select>
                    </label>
                    <label className="flex h-full min-w-0 flex-col text-xs font-bold text-slate-600">
                      <span className="flex min-h-8 items-end">Temporada alta</span>
                      <span className="mt-1 flex min-h-[38px] flex-1 items-center justify-end rounded-lg border border-slate-200 bg-slate-50 px-3">
                        <input
                          type="checkbox"
                          checked={form.temporada_alta}
                          onChange={update("temporada_alta")}
                          className="h-5 w-5 accent-[#0054a6]"
                        />
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 md:col-start-2 md:row-start-2 md:row-span-2">
                  <div>
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Valor diario calculado
                      <AnticipoDiasHelp
                        fechaSalida={form.fecha_salida}
                        horaSalida={form.hora_salida}
                        fechaLlegada={form.fecha_llegada}
                        horaLlegada={form.hora_llegada}
                        segmentos={segmentosValor}
                        fmtMoney={fmtMoneyPreview}
                      />
                    </div>
                    <div className="mt-1">
                      <RangosValorDiario
                        segmentos={segmentosValor}
                        valorDiarioCalc={valorDiarioCalc}
                        dias={dias_computables}
                        subtotal={subtotal}
                        fmtMoney={fmtMoneyPreview}
                        presentacion="tarifa"
                      />
                    </div>
                  </div>
                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Resumen (anticipo)
                    </div>
                    {segmentosParaVista(segmentosValor).length > 1 ? (
                      <div className="mt-2">
                        <RangosValorDiario
                          segmentos={segmentosValor}
                          valorDiarioCalc={valorDiarioCalc}
                          dias={dias_computables}
                          subtotal={subtotal}
                          fmtMoney={fmtMoneyPreview}
                          presentacion="dinero"
                        />
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-bold text-slate-600">Viáticos anticipados</span>
                        <span className="text-sm font-black text-slate-800">{fmtMoneyPreview(subtotal)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Transporte */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* Transporte (columna izquierda) */}
              <section className="space-y-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Transporte (para tildes en PDF)
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-white">
                    <input
                      type="checkbox"
                      checked={form.check_aereo}
                      onChange={update("check_aereo")}
                      className="h-5 w-5 accent-[#0054a6]"
                    />
                    <span className="text-sm font-bold text-slate-700">Aéreo</span>
                  </label>
                  <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-white">
                    <input
                      type="checkbox"
                      checked={form.check_terrestre}
                      onChange={update("check_terrestre")}
                      className="h-5 w-5 accent-[#0054a6]"
                    />
                    <span className="text-sm font-bold text-slate-700">Terrestre</span>
                  </label>
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.check_patente_oficial}
                        onChange={update("check_patente_oficial")}
                        className="h-5 w-5 accent-[#0054a6]"
                      />
                      <span className="text-sm font-bold text-slate-700">Vehículo oficial</span>
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Patente oficial
                      <input
                        className={`mt-1 w-full ${inputClass(form.patente_oficial)}`}
                        value={form.patente_oficial}
                        onChange={update("patente_oficial")}
                        placeholder="AAA000"
                      />
                    </label>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.check_patente_particular}
                        onChange={update("check_patente_particular")}
                        className="h-5 w-5 accent-[#0054a6]"
                      />
                      <span className="text-sm font-bold text-slate-700">Vehículo particular</span>
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Patente particular
                      <input
                        className={`mt-1 w-full ${inputClass(form.patente_particular)}`}
                        value={form.patente_particular}
                        onChange={update("patente_particular")}
                        placeholder="AAA000"
                      />
                    </label>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <div className="text-sm font-bold text-slate-700">Otro</div>
                    <label className="text-xs font-bold text-slate-600">
                      Descripción “Otro”
                      <input
                        className={`mt-1 w-full ${inputClass(form.transporte_otros_detalle || form.transporte_otros)}`}
                        value={form.transporte_otros_detalle || form.transporte_otros}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            transporte_otros_detalle: v,
                            transporte_otros: v,
                          }));
                          notifyFieldChange("transporte_otros");
                        }}
                        placeholder="Detalle"
                      />
                    </label>
                  </div>
                </div>
              </section>

              {/* Gastos (columna derecha) */}
              <section className="space-y-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Gastos
                </div>
                <div className="space-y-3">
                  {[
                    ["gasto_alojamiento", "Alojamiento"],
                    ["gasto_pasajes", "Pasajes / Movilidad"],
                    ["gasto_combustible", "Combustible"],
                    ["gasto_otros", "Otros (columna “Otros”)"],
                    ["gastos_capacit", "Capacitación"],
                    ["gasto_ceremonial", "Ceremonial"],
                    ["gastos_movil_otros", "Otros movilidad"],
                  ].map(([key, label]) => (
                    <label key={key} className="text-xs font-bold text-slate-600 block">
                      {label}
                      <ArsAmountInput
                        value={form[key]}
                        onValueChange={(n) => setValue(key, n)}
                        className={`mt-1 w-full ${numberInputClass(key, form[key])}`}
                      />
                    </label>
                  ))}

                  <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    El PDF calcula y muestra <strong>Subtotal</strong> y <strong>Total</strong> a partir de
                    los valores ingresados arriba. El campo <strong>Firma</strong> se exporta vacío
                    (firma ológrafa posterior).
                  </div>
                </div>
              </section>
            </div>

            {/* Resumen (al final) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Gastos (total)
                </div>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {fmtMoneyPreview(totalGastos)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Valor diario (cálculo)
                </div>
                <div className="mt-1">
                  <RangosValorDiario
                    segmentos={segmentosValor}
                    valorDiarioCalc={valorDiarioCalc}
                    dias={dias_computables}
                    subtotal={subtotal}
                    fmtMoney={fmtMoneyPreview}
                    showTramoSubtotal={false}
                    showTotal={false}
                    valueClassName="text-lg font-black text-slate-800"
                  />
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Base:{" "}
                  <span className="font-bold">
                    {valorDiarioBaseInfo.estado === "unico"
                      ? fmtMoneyPreview(valorDiarioBaseInfo.valorDiarioBase)
                      : valorDiarioBaseInfo.estado === "prorrateo"
                        ? "historial (prorrateo)"
                        : "—"}
                  </span>{" "}
                  · %: <span className="font-bold">{String(form.porcentaje || 0)}%</span> · Temp:{" "}
                  <span className="font-bold">{form.temporada_alta ? "ALTA (+30%)" : "BAJA"}</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Subtotal (anticipo)
                </div>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {fmtMoneyPreview(subtotal)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Total final
                </div>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {fmtMoneyPreview(totalFinal)}
                </div>
              </div>
            </div>

            {/* Datalist (sugerencias de localidades; permite texto libre) */}
          </div>
        </div>
      </div>

      <ManualClearChoiceModal
        open={clearDialogOpen}
        type="viatico"
        onClose={() => !clearingCloud && setClearDialogOpen(false)}
        onNew={handleClearNew}
        onDeleteCurrent={handleRequestClearDelete}
        deleting={clearingCloud}
      />

      <ConfirmDialog
        isOpen={clearDeleteConfirmOpen}
        onClose={() => !clearingCloud && setClearDeleteConfirmOpen(false)}
        onConfirm={handleClearDelete}
        title="¿Borrar el viático actual?"
        message={
          cloudViaticoId && isAuthenticated
            ? "Se eliminará el registro guardado en la nube y se limpiará la planilla. Esta acción no se puede deshacer."
            : "Se limpiará la planilla actual. Esta acción no se puede deshacer."
        }
        confirmText="Borrar"
        cancelText="Cancelar"
        confirmLoading={clearingCloud}
        loadingText="Borrando…"
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
      />

      <ManualPersonaChoiceModal
        open={personaChoiceOpen}
        label={
          pendingPersona
            ? `${pendingPersona.apellido}, ${pendingPersona.nombre}${pendingPersona.dni ? ` (${pendingPersona.dni})` : ""}`
            : ""
        }
        onClose={() => {
          setPersonaChoiceOpen(false);
          setPendingPersona(null);
        }}
        onImport={handleImportPersonaFromDb}
        onCreateNew={() => startCreatePersona()}
      />

      <ConfirmDialog
        isOpen={chooseNewPersonaOpen}
        onClose={() => setChooseNewPersonaOpen(false)}
        onConfirm={confirmChooseNewPersona}
        title="¿Elegir otra persona?"
        message="Se limpiarán los datos personales de la planilla. El resto del viático (fechas, importes, etc.) se mantiene."
        confirmText="Elegir otra persona"
        cancelText="Cancelar"
      />

      <ConfirmDialog
        isOpen={Boolean(scrnPrefillPending)}
        onClose={() => setScrnPrefillPending(null)}
        onConfirm={() => {
          if (scrnPrefillPending) applyScrnPrefill(scrnPrefillPending);
          setScrnPrefillPending(null);
        }}
        title="¿Reemplazar planilla con datos del transporte?"
        message="La planilla actual tiene datos cargados. Si continuás, se reemplazarán con la información del recorrido SCRN."
        confirmText="Reemplazar"
        cancelText="Cancelar"
      />

      <ValorDiarioVigenciaAdminModal
        open={vigenciaAdminOpen}
        onClose={() => setVigenciaAdminOpen(false)}
        vigencias={vigencias}
        onSaved={async () => {
          await refreshVigencias();
          await refreshPersonaCatalog();
        }}
        client={viaticosValorDiarioManualClient}
        fechaReferencia={form.fecha_salida}
      />
    </div>
  );
}

