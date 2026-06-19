import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { useSearchParams } from "react-router-dom";
import ManualHeader from "../../components/public/ManualHeader";
import { useViaticosManualAuth } from "../../context/ViaticosManualAuthContext";
import {
  deleteRendicionGuardada,
  getViaticoGuardado,
  saveRendicionGuardada,
} from "../../services/viaticosManualService";
import { useViaticosManualCloudSave } from "../../hooks/viaticos/useViaticosManualCloudSave";
import ManualClearChoiceModal from "../../components/public/ManualClearChoiceModal";
import ManualPersonaImportPanel from "../../components/public/ManualPersonaImportPanel";
import ManualPersonaChoiceModal from "../../components/public/ManualPersonaChoiceModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
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
  formatSegmentosValorDiario,
} from "../../utils/viaticosValorDiarioProporcional";
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
  hasMeaningfulRendicionData,
  STORAGE_KEY,
  VIATICO_ORIGEN_SESSION_KEY,
  writeRendicionToStorage,
} from "../../utils/viaticosManualStorage";
import {
  exportViaticosToPDFForm,
  sumRendicion,
} from "../../utils/pdfFormExporter";
import {
  IconFileDownload,
  IconHistory,
  IconTrash,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import { calculateDaysDiff } from "../../hooks/viaticos/useViaticosIndividuales";

const LOCALIDADES_DATALIST_ID = "viaticos_manual_localidades";

const round2 = (num) =>
  Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v).trim().replace(/[$\s]/g, "");
  if (!s) return 0;
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
    if (!inQuotes && c === ",") {
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
  pushCell();
  const isLastRowEmpty = row.every((v) => String(v || "").trim() === "");
  if (!isLastRowEmpty) pushRow();
  return rows;
};

import { calcDevolucionReintegro } from "../../utils/rendicionDiff";

const DEFAULT_BASE = {
  apellido: "",
  nombre: "",
  dni: "",
  cargo: "",
  jornada_laboral: "",
  ciudad_origen: "",
  asiento_habitual: "",
  lugar_comision: "",
  motivo: "",
  fecha_salida: "",
  hora_salida: "",
  fecha_llegada: "",
  hora_llegada: "",
  valor_diario_base: 0,
  porcentaje: 100,
  temporada_alta: false,
};

const ZERO_REND = {
  rendicion_viaticos: 0,
  rendicion_gasto_alojamiento: 0,
  rendicion_transporte_otros: 0,
  rendicion_gasto_combustible: 0,
  rendicion_gastos_movil_otros: 0,
  rendicion_gastos_capacit: 0,
  rendicion_gasto_ceremonial: 0,
  rendicion_gasto_otros: 0,
};

export default function RendicionesManual() {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const fileRef = useRef(null);
  const [cloudRendicionId, setCloudRendicionId] = useState(null);
  const [etiquetaDescriptiva, setEtiquetaDescriptiva] = useState("");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearDeleteConfirmOpen, setClearDeleteConfirmOpen] = useState(false);
  const [clearingCloud, setClearingCloud] = useState(false);
  const [viaticoOrigenId, setViaticoOrigenId] = useState(() => {
    try {
      return sessionStorage.getItem(VIATICO_ORIGEN_SESSION_KEY) || null;
    } catch {
      return null;
    }
  });
  const [saveMessage, setSaveMessage] = useState("");
  const [loadedFromStorage] = useState(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });
  const [base, setBase] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [selectedPersonaId, setSelectedPersonaId] = useState(null);
  const [pendingPersona, setPendingPersona] = useState(null);
  const [personaChoiceOpen, setPersonaChoiceOpen] = useState(false);
  const [chooseNewPersonaOpen, setChooseNewPersonaOpen] = useState(false);
  const [personaEditMode, setPersonaEditMode] = useState(null);
  const [changePersonaOpen, setChangePersonaOpen] = useState(false);
  const [vigenciaAdminOpen, setVigenciaAdminOpen] = useState(false);
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
  } = useValorDiarioVigente(base?.fecha_salida || "", {
    client: viaticosValorDiarioManualClient,
  });

  const canAdminVd = canAdminValorDiario({
    email: profile?.email || session?.user?.email,
  });

  const computeDefaultAnt = (b) => {
    const dias = toNumber(b?.dias_computables);
    const vd = toNumber(b?.valorDiarioCalc || b?.valor_diario_base);
    return {
      // Viáticos anticipados: días * valor diario
      rendicion_viaticos: dias * vd,
      rendicion_gasto_alojamiento: toNumber(b?.gasto_alojamiento),
      rendicion_transporte_otros: toNumber(
        b?.gasto_pasajes || b?.gastos_movilidad,
      ),
      rendicion_gasto_combustible: toNumber(b?.gasto_combustible),
      rendicion_gastos_movil_otros: toNumber(b?.gastos_movil_otros),
      rendicion_gastos_capacit: toNumber(b?.gastos_capacit),
      rendicion_gasto_ceremonial: toNumber(b?.gasto_ceremonial),
      rendicion_gasto_otros: toNumber(b?.gasto_otros),
    };
  };

  const autoAntViaticosRef = useRef(0);

  const [ant, setAnt] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj?.manual_rendicion?.ant || computeDefaultAnt(obj);
    } catch {
      return computeDefaultAnt({});
    }
  });

  const porcentajeNum = toNumber(base?.porcentaje || 100);
  const factor_temporada = base?.temporada_alta ? 0.3 : 0;

  const dias_computables = useMemo(() => {
    return calculateDaysDiff(
      base?.fecha_salida || "",
      base?.hora_salida || "",
      base?.fecha_llegada || "",
      base?.hora_llegada || "",
    );
  }, [
    base?.fecha_salida,
    base?.hora_salida,
    base?.fecha_llegada,
    base?.hora_llegada,
  ]);

  const valorDiarioBaseInfo = useMemo(
    () =>
      resolverValorDiarioBaseHistorial({
        fechaSalida: base?.fecha_salida || "",
        horaSalida: base?.hora_salida || "",
        fechaLlegada: base?.fecha_llegada || "",
        horaLlegada: base?.hora_llegada || "",
        vigencias,
      }),
    [
      base?.fecha_salida,
      base?.hora_salida,
      base?.fecha_llegada,
      base?.hora_llegada,
      vigencias,
    ],
  );

  const calcFinanciero = useMemo(() => {
    return calcValorDiarioProporcional({
      fechaSalida: base?.fecha_salida || "",
      horaSalida: base?.hora_salida || "",
      fechaLlegada: base?.fecha_llegada || "",
      horaLlegada: base?.hora_llegada || "",
      vigencias,
      fallbackBase: 0,
      porcentaje: porcentajeNum,
      factorTemporada: factor_temporada,
    });
  }, [
    base?.fecha_salida,
    base?.hora_salida,
    base?.fecha_llegada,
    base?.hora_llegada,
    porcentajeNum,
    factor_temporada,
    vigencias,
  ]);

  const valorDiarioCalc = calcFinanciero.valorDiarioCalc;
  const subtotal = calcFinanciero.subtotal;
  const desgloseValorDiario = useMemo(() => {
    if (!calcFinanciero.usaProporcional) return "";
    return formatSegmentosValorDiario(
      calcFinanciero.segmentos,
      fmtMoneyPreview,
    );
  }, [calcFinanciero]);

  // Guardar derivados en base para export/PDF y sincronización con Viáticos.
  useEffect(() => {
    setBase((prev) => {
      const next = {
        ...prev,
        dias_computables,
        valorDiarioCalc,
        subtotal,
        factor_temporada,
      };
      const same =
        toNumber(prev?.dias_computables) === toNumber(dias_computables) &&
        toNumber(prev?.valorDiarioCalc) === toNumber(valorDiarioCalc) &&
        toNumber(prev?.subtotal) === toNumber(subtotal) &&
        toNumber(prev?.factor_temporada) === toNumber(factor_temporada);
      return same ? prev : next;
    });
  }, [dias_computables, valorDiarioCalc, subtotal, factor_temporada]);

  // Mantener actualizado el anticipo de viáticos (días * valor diario),
  // sin pisar si el usuario lo editó manualmente.
  useEffect(() => {
    const computed = toNumber(dias_computables) * toNumber(valorDiarioCalc);
    const prevAuto = toNumber(autoAntViaticosRef.current);
    autoAntViaticosRef.current = computed;

    setAnt((prev) => {
      const current = toNumber(prev?.rendicion_viaticos);
      const rawCurrent = String(prev?.rendicion_viaticos ?? "").trim();
      const isEmpty = rawCurrent === "";
      const isStillAuto = Math.abs(current - prevAuto) < 0.000001;
      if (!isEmpty && !isStillAuto) return prev; // el usuario lo tocó
      if (Math.abs(current - computed) < 0.000001) return prev;
      return { ...prev, rendicion_viaticos: computed };
    });
  }, [dias_computables, valorDiarioCalc]);

  const personaOptions = useMemo(() => {
    return (personas || []).map((p) => ({
      id: p.id,
      label: `${p.apellido}, ${p.nombre}${p.dni ? ` (${p.dni})` : ""}`,
      subLabel: [p.cargo, p.jornada_laboral].filter(Boolean).join(" · "),
    }));
  }, [personas]);

  const personaLabel = useMemo(() => buildPersonaLabel(base), [base]);
  const hasPersonaLoaded = Boolean(personaLabel);
  const canUpdatePersonaInBase = useMemo(
    () =>
      isAuthenticated &&
      String(base?.apellido || "").trim() !== "" &&
      String(base?.nombre || "").trim() !== "",
    [isAuthenticated, base?.apellido, base?.nombre],
  );

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const obj = e.newValue ? JSON.parse(e.newValue) : {};
        setBase(obj || {});
        setAnt(obj?.manual_rendicion?.ant || computeDefaultAnt(obj || {}));
        setRend(
          obj?.manual_rendicion?.rend || {
            rendicion_viaticos: 0,
            rendicion_gasto_alojamiento: 0,
            rendicion_transporte_otros: 0,
            rendicion_gasto_combustible: 0,
            rendicion_gastos_movil_otros: 0,
            rendicion_gastos_capacit: 0,
            rendicion_gasto_ceremonial: 0,
            rendicion_gasto_otros: 0,
          },
        );
      } catch {
        setBase({});
        setAnt(computeDefaultAnt({}));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [rend, setRend] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj?.manual_rendicion?.rend || { ...ZERO_REND };
    } catch {
      return { ...ZERO_REND };
    }
  });

  // Persistencia: guardamos base + rendición (ant/rend) en la misma clave.
  useEffect(() => {
    writeRendicionToStorage(base, ant, rend);
  }, [base, ant, rend]);

  useEffect(() => {
    const fromViaticoId = searchParams.get("from_viatico");
    if (!fromViaticoId || !isAuthenticated) return;

    let cancelled = false;
    (async () => {
      try {
        const record = await getViaticoGuardado(fromViaticoId);
        if (cancelled || !record) return;
        const datos = record.datos || {};
        const nextBase = { ...DEFAULT_BASE, ...datos };
        const nextAnt = computeDefaultAnt(nextBase);
        const nextRend = { ...ZERO_REND };
        setBase(nextBase);
        setAnt(nextAnt);
        setRend(nextRend);
        setViaticoOrigenId(record.id);
        setCloudRendicionId(null);
        writeRendicionToStorage(nextBase, nextAnt, nextRend);
        try {
          sessionStorage.setItem(VIATICO_ORIGEN_SESSION_KEY, record.id);
        } catch {
          /* ignore */
        }
        setSaveMessage("Viático cargado para nueva rendición.");
      } catch (e) {
        if (!cancelled) setSaveMessage(e?.message || "No se pudo cargar el viático.");
      } finally {
        if (!cancelled) {
          const next = new URLSearchParams(searchParams);
          next.delete("from_viatico");
          setSearchParams(next, { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, isAuthenticated, setSearchParams]);

  const concepts = useMemo(() => {
    return [
      {
        key: "rendicion_viaticos",
        label: "Viáticos",
      },
      { key: "rendicion_gasto_alojamiento", label: "Alojamiento" },
      { key: "rendicion_transporte_otros", label: "Movilidad / Pasajes" },
      { key: "rendicion_gasto_combustible", label: "Combustible" },
      { key: "rendicion_gastos_movil_otros", label: "Otros movilidad" },
      { key: "rendicion_gastos_capacit", label: "Capacitación" },
      { key: "rendicion_gasto_ceremonial", label: "Ceremonial" },
      { key: "rendicion_gasto_otros", label: "Otros" },
    ];
  }, []);

  const totals = useMemo(() => {
    const totalAnt = Object.keys(ant || {}).reduce(
      (acc, k) => acc + toNumber(ant[k]),
      0,
    );
    const totalRend = sumRendicion({ ...rend });
    const { dev, reint } = calcDiff(totalAnt, totalRend);
    return { totalAnt, totalRend, dev, reint };
  }, [ant, rend]);

  const buildRendicionDatos = useCallback(
    () => ({
      ...base,
      dias_computables,
      factor_temporada,
      valorDiarioCalc,
      subtotal,
      manual_rendicion: { ant, rend },
    }),
    [base, dias_computables, factor_temporada, valorDiarioCalc, subtotal, ant, rend],
  );

  const getEtiqueta = useCallback(() => etiquetaDescriptiva.trim(), [etiquetaDescriptiva]);

  const saveRendicionRecord = useCallback(
    ({ id, etiqueta, datos }) =>
      saveRendicionGuardada({
        id,
        viatico_origen_id: viaticoOrigenId,
        etiqueta,
        datos,
      }),
    [viaticoOrigenId],
  );

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
    cloudId: cloudRendicionId,
    setCloudId: setCloudRendicionId,
    buildDatos: buildRendicionDatos,
    getEtiqueta,
    saveRecord: saveRendicionRecord,
    onSaveSuccess: handleSaveSuccess,
  });

  useEffect(() => {
    const nextBase =
      valorDiarioBaseInfo.estado === "unico"
        ? valorDiarioBaseInfo.valorDiarioBase
        : 0;
    suppressNextAutosave();
    setBase((prev) =>
      toNumber(prev.valor_diario_base) === toNumber(nextBase)
        ? prev
        : { ...prev, valor_diario_base: nextBase },
    );
  }, [valorDiarioBaseInfo, suppressNextAutosave]);

  useEffect(() => {
    suppressAutosaveRef.current = suppressNextAutosave;
  }, [suppressNextAutosave]);

  const handlePersonaSelect = (id) => {
    const p = (personas || []).find((x) => String(x.id) === String(id));
    if (!p) return;
    setPendingPersona(p);
    setPersonaChoiceOpen(true);
  };

  const applyPersonaToBase = useCallback((persona) => {
    const mapped = mapPersonaToFormFields(persona);
    setBase((prev) => ({
      ...prev,
      ...mapped,
    }));
    suppressNextAutosave();
  }, [suppressNextAutosave]);

  const handleImportPersonaFromDb = () => {
    if (!pendingPersona) return;
    applyPersonaToBase(pendingPersona);
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
      const saved = await upsertPersonaFromFormData(base);
      await refreshPersonaCatalog();
      if (saved?.id) setSelectedPersonaId(saved.id);
    } catch {
      /* el autosave también intenta actualizar la base */
    }
  }, [isAuthenticated, canUpdatePersonaInBase, base, refreshPersonaCatalog]);

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
    setBase((prev) => ({ ...prev, ...mapped }));
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
    () => Boolean(cloudRendicionId) || hasMeaningfulRendicionData(base, ant, rend),
    [cloudRendicionId, base, ant, rend],
  );

  const autosaveSnapshot = useMemo(
    () => JSON.stringify(buildRendicionDatos()),
    [buildRendicionDatos],
  );

  useEffect(() => {
    if (!isAuthenticated || !shouldAutosaveCloud) return;
    scheduleAutosave();
  }, [isAuthenticated, shouldAutosaveCloud, autosaveSnapshot, scheduleAutosave]);

  const numberInputClass = useCallback(
    (key, val) => getCloudFieldClass(key, inputClass(val)),
    [getCloudFieldClass],
  );

  const rendicionInputClass = useCallback(
    (key, val) =>
      getCloudFieldClass(
        key,
        "w-32 text-right border border-slate-300 rounded-lg px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-indigo-500/30",
      ),
    [getCloudFieldClass],
  );

  const handleLoadSavedRendicion = useCallback(
    ({ record, mode = "edit" }) => {
      const datos = record?.datos || {};
      const nextBase = { ...DEFAULT_BASE, ...datos };
      const nextAnt = datos?.manual_rendicion?.ant || computeDefaultAnt(nextBase);
      const nextRend = datos?.manual_rendicion?.rend || { ...ZERO_REND };
      const prevDescriptive = String(record?.etiqueta || "").trim();
      setBase(nextBase);
      setAnt(nextAnt);
      setRend(nextRend);
      setCloudRendicionId(mode === "edit" ? record?.id || null : null);
      setViaticoOrigenId(mode === "edit" ? record?.viatico_origen_id || null : null);
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
      writeRendicionToStorage(nextBase, nextAnt, nextRend);
      setSaveMessage(
        mode === "duplicate"
          ? "Copia de la rendición cargada. Al guardar se creará un registro nuevo."
          : "Editando la rendición original. Al guardar se actualizará este registro.",
      );
    },
    [resetFieldFeedback],
  );

  useEffect(() => {
    return registerLoadHandlers({ onLoadRendicion: handleLoadSavedRendicion });
  }, [registerLoadHandlers, handleLoadSavedRendicion]);

  const updateRend = (key) => (e) => {
    setRend((prev) => ({ ...prev, [key]: e.target.value }));
    notifyFieldChange(`rend:${key}`);
  };

  const updateAnt = (key) => (e) => {
    setAnt((prev) => ({ ...prev, [key]: e.target.value }));
    notifyFieldChange(`ant:${key}`);
  };

  const updateBase = (key) => (e) => {
    setBase((prev) => ({ ...prev, [key]: e.target.value }));
    notifyFieldChange(key);
  };

  const setBaseValue = (key, value) => {
    setBase((prev) => ({ ...prev, [key]: value }));
    notifyFieldChange(key);
  };

  const handleImportCsv = async (file) => {
    const text = await file.text();
    const rows = parseCsv(text || "");
    if (!rows || rows.length < 2) return;
    const header = rows[0].map((h) => String(h || "").trim());
    const row = rows[1];
    const has = (name) => header.includes(name);
    const get = (name) => {
      const idx = header.indexOf(name);
      if (idx < 0) return "";
      return row[idx] ?? "";
    };
    const merged = {
      ...base,
      apellido: get("apellido") || base.apellido,
      nombre: get("nombre") || base.nombre,
      dni: get("dni") || base.dni,
      cargo: get("cargo") || base.cargo,
      jornada_laboral: get("jornada_laboral") || base.jornada_laboral,
      ciudad_origen: get("ciudad_origen") || base.ciudad_origen,
      asiento_habitual: get("asiento_habitual") || base.asiento_habitual,
      lugar_comision: get("lugar_comision") || base.lugar_comision,
      motivo: get("motivo") || base.motivo,
      fecha_salida: get("fecha_salida") || base.fecha_salida,
      hora_salida: get("hora_salida") || base.hora_salida,
      fecha_llegada: get("fecha_llegada") || base.fecha_llegada,
      hora_llegada: get("hora_llegada") || base.hora_llegada,
      porcentaje: toNumber(get("porcentaje") || base.porcentaje || 100) || 100,
      temporada_alta:
        String(
          get("temporada_alta") || base.temporada_alta || "",
        ).toLowerCase() === "true" ||
        String(get("temporada_alta") || "").trim() === "1",
      subtotal: toNumber(get("subtotal") || base.subtotal),
      gasto_alojamiento: toNumber(
        get("gasto_alojamiento") || base.gasto_alojamiento,
      ),
      gasto_pasajes: toNumber(get("gasto_pasajes") || base.gasto_pasajes),
      gastos_movilidad: toNumber(
        get("gastos_movilidad") || base.gastos_movilidad,
      ),
      gasto_combustible: toNumber(
        get("gasto_combustible") || base.gasto_combustible,
      ),
      gasto_otros: toNumber(get("gasto_otros") || base.gasto_otros),
      gastos_movil_otros: toNumber(
        get("gastos_movil_otros") || base.gastos_movil_otros,
      ),
      gastos_capacit: toNumber(get("gastos_capacit") || base.gastos_capacit),
      gasto_ceremonial: toNumber(
        get("gasto_ceremonial") || base.gasto_ceremonial,
      ),
      totalFinal: toNumber(get("totalFinal") || base.totalFinal),
      factor_temporada: toNumber(
        get("factor_temporada") || base.factor_temporada,
      ),
    };
    setBase(merged);
    const nextAnt = has("ant_rendicion_viaticos")
      ? {
          rendicion_viaticos: get("ant_rendicion_viaticos"),
          rendicion_gasto_alojamiento: get("ant_rendicion_gasto_alojamiento"),
          rendicion_transporte_otros: get("ant_rendicion_transporte_otros"),
          rendicion_gasto_combustible: get("ant_rendicion_gasto_combustible"),
          rendicion_gastos_movil_otros: get("ant_rendicion_gastos_movil_otros"),
          rendicion_gastos_capacit: get("ant_rendicion_gastos_capacit"),
          rendicion_gasto_ceremonial: get("ant_rendicion_gasto_ceremonial"),
          rendicion_gasto_otros: get("ant_rendicion_gasto_otros"),
        }
      : computeDefaultAnt(merged);
    setAnt(nextAnt);

    const nextRend = has("rendicion_viaticos")
      ? {
          ...ZERO_REND,
          rendicion_viaticos: get("rendicion_viaticos"),
          rendicion_gasto_alojamiento: get("rendicion_gasto_alojamiento"),
          rendicion_transporte_otros: get("rendicion_transporte_otros"),
          rendicion_gasto_combustible: get("rendicion_gasto_combustible"),
          rendicion_gastos_movil_otros: get("rendicion_gastos_movil_otros"),
          rendicion_gastos_capacit: get("rendicion_gastos_capacit"),
          rendicion_gasto_ceremonial: get("rendicion_gasto_ceremonial"),
          rendicion_gasto_otros: get("rendicion_gasto_otros"),
        }
      : rend;
    setRend(nextRend);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...merged,
          manual_rendicion: {
            ant: nextAnt,
            rend: nextRend,
          },
        }),
      );
    } catch {}
  };

  const resetRendicionForm = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(VIATICO_ORIGEN_SESSION_KEY);
    } catch {}
    setCloudRendicionId(null);
    setViaticoOrigenId(null);
    setEtiquetaDescriptiva("");
    resetFieldFeedback();
    setSaveMessage("");
    setBase({ ...DEFAULT_BASE });
    setAnt(computeDefaultAnt(DEFAULT_BASE));
    setRend({ ...ZERO_REND });
    setPersonaEditMode(null);
    setChangePersonaOpen(false);
    setSelectedPersonaId(null);
  }, [resetFieldFeedback]);

  const handleClear = () => setClearDialogOpen(true);

  const handleClearNew = () => {
    resetRendicionForm();
    setClearDialogOpen(false);
  };

  const handleRequestClearDelete = () => {
    setClearDialogOpen(false);
    setClearDeleteConfirmOpen(true);
  };

  const handleClearDelete = async () => {
    const deletingId = cloudRendicionId;
    setClearingCloud(true);
    setSaveMessage("");
    try {
      if (deletingId && isAuthenticated) {
        await deleteRendicionGuardada(deletingId);
      }
      resetRendicionForm();
      setClearDialogOpen(false);
      setClearDeleteConfirmOpen(false);
      setSaveMessage(
        deletingId && isAuthenticated
          ? "Rendición eliminada de la nube."
          : "Planilla limpiada.",
      );
    } catch (e) {
      setSaveMessage(e?.message || "No se pudo eliminar la rendición.");
      throw e;
    } finally {
      setClearingCloud(false);
    }
  };

  const handleExportCsv = () => {
    const payload = {
      ...base,
      dias_computables,
      factor_temporada,
      valorDiarioCalc,
      subtotal,

      // Anticipos (compatibles con CSV de viáticos)
      gasto_alojamiento: toNumber(ant.rendicion_gasto_alojamiento),
      gasto_pasajes: 0,
      gastos_movilidad: toNumber(ant.rendicion_transporte_otros),
      gasto_combustible: toNumber(ant.rendicion_gasto_combustible),
      gasto_otros: toNumber(ant.rendicion_gasto_otros),
      gastos_movil_otros: toNumber(ant.rendicion_gastos_movil_otros),
      gastos_capacit: toNumber(ant.rendicion_gastos_capacit),
      gasto_ceremonial: toNumber(ant.rendicion_gasto_ceremonial),
      totalFinal: totals.totalAnt,

      // Para retomar rendición
      ...rend,
      ant_rendicion_viaticos: ant.rendicion_viaticos,
      ant_rendicion_gasto_alojamiento: ant.rendicion_gasto_alojamiento,
      ant_rendicion_transporte_otros: ant.rendicion_transporte_otros,
      ant_rendicion_gasto_combustible: ant.rendicion_gasto_combustible,
      ant_rendicion_gastos_movil_otros: ant.rendicion_gastos_movil_otros,
      ant_rendicion_gastos_capacit: ant.rendicion_gastos_capacit,
      ant_rendicion_gasto_ceremonial: ant.rendicion_gasto_ceremonial,
      ant_rendicion_gasto_otros: ant.rendicion_gasto_otros,
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
    const safeName =
      `${(base.apellido || "Rendicion").trim()}_${(base.nombre || "Manual").trim()}`
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 80);
    saveAs(blob, `${safeName}_Rendicion_Datos.csv`);
  };

  const handleDownload = async () => {
    const configData = {
      lugar_comision: base.lugar_comision || "",
      motivo: base.motivo || "",
      factor_temporada: toNumber(base.factor_temporada) || 0,
      keep_editable: true,
    };

    const data = {
      apellido: base.apellido || "",
      nombre: base.nombre || "",
      dni: base.dni || "",
      cargo: base.cargo || "",
      jornada_laboral: base.jornada_laboral || "",
      ciudad_origen: base.ciudad_origen || "",
      asiento_habitual: base.asiento_habitual || "",

      motivo: base.motivo || "",
      fecha_salida: base.fecha_salida || "",
      hora_salida: base.hora_salida || "",
      fecha_llegada: base.fecha_llegada || "",
      hora_llegada: base.hora_llegada || "",
      dias_computables,
      porcentaje: porcentajeNum || 100,
      valorDiarioCalc,

      // Anticipados editables
      subtotal: toNumber(ant.rendicion_viaticos),
      gasto_alojamiento: toNumber(ant.rendicion_gasto_alojamiento),
      gastos_movilidad: toNumber(ant.rendicion_transporte_otros),
      gasto_combustible: toNumber(ant.rendicion_gasto_combustible),
      gastos_movil_otros: toNumber(ant.rendicion_gastos_movil_otros),
      gastos_capacit: toNumber(ant.rendicion_gastos_capacit),
      gasto_ceremonial: toNumber(ant.rendicion_gasto_ceremonial),
      gasto_otros: toNumber(ant.rendicion_gasto_otros),
      totalFinal: totals.totalAnt,

      // rendiciones
      ...Object.fromEntries(
        Object.entries(rend).map(([k, v]) => [k, toNumber(v)]),
      ),

      firma: null,
    };

    const pdfBytes = await exportViaticosToPDFForm(
      {},
      [data],
      configData,
      "rendicion",
    );
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const safeName =
      `${(base.apellido || "Rendicion").trim()}_${(base.nombre || "Manual").trim()}`
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 80);
    saveAs(blob, `${safeName}_Rendicion.pdf`);
  };

  const hasSyncedData = Object.values(base || {}).some(
    (v) => String(v ?? "").trim() !== "",
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <ManualHeader
          session={session}
          profile={profile}
          isGuest={isGuest}
          onLogin={openLogin}
          onLogout={onLogout}
          onOpenSaved={openSavedPanel}
          isCloudSaving={isSaving}
          onImport={() => fileRef.current?.click()}
          onExport={handleExportCsv}
          importInput={
            <input
              ref={fileRef}
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
            <div className="inline-flex items-stretch rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden shrink-0">
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
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition whitespace-nowrap"
                title="Descargar PDF"
              >
                <IconFileDownload size={14} />
                PDF
              </button>
            </div>
          }
        />

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 pt-5">
            <h1 className="text-xl font-black text-slate-800">
              Rendiciones Manual (Secretaría)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Cargá importes rendidos y generá el PDF de rendición. Los datos
              personales se sincronizan con Viáticos. Iniciá sesión para guardar en la nube.
            </p>
            {saveMessage && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {saveMessage}
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            <ManualPersonaImportPanel
              data={base}
              onFieldChange={updateBase}
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

            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Comisión
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Motivo
                  <input
                    className={`mt-1 w-full ${inputClass(base.motivo)}`}
                    value={base.motivo || ""}
                    onChange={updateBase("motivo")}
                    placeholder="Motivo"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Lugar comisión
                  <input
                    type="text"
                    autoComplete="off"
                    list={LOCALIDADES_DATALIST_ID}
                    className={`mt-1 w-full ${inputClass(base.lugar_comision)}`}
                    value={base.lugar_comision || ""}
                    onChange={updateBase("lugar_comision")}
                    placeholder="Lugar"
                  />
                </label>

                <label className="text-xs font-bold text-slate-600 md:row-start-2 md:col-start-1">
                  Fecha salida
                  <div className="mt-1">
                    <DateInput
                      value={base.fecha_salida || ""}
                      onChange={(v) => setBaseValue("fecha_salida", v)}
                      showDayName={false}
                      className={`!py-1.5 !pl-8 !pr-2 !rounded-lg text-xs ${
                        base.fecha_salida
                          ? occupiedDateInputClass
                          : ""
                      }`}
                    />
                  </div>
                </label>

                <label className="text-xs font-bold text-slate-600 md:row-start-2 md:col-start-2">
                  Hora salida
                  <div className="mt-1">
                    <TimeInput
                      value={base.hora_salida || ""}
                      onChange={(v) => setBaseValue("hora_salida", v || "")}
                      className={`border border-slate-300 rounded-lg outline-none px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/30 ${
                        String(base.hora_salida || "").trim()
                          ? occupiedTimeInputClass
                          : "bg-white"
                      }`}
                    />
                  </div>
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 md:row-start-2 md:col-start-3 md:col-span-2 md:row-span-2 md:self-stretch">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Resumen (anticipo)
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Días</span>
                      <span className="font-black">
                        {toNumber(dias_computables) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valor diario</span>
                      <span className="font-black">
                        {fmtMoneyPreview(valorDiarioCalc)}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-between pt-2 border-t border-slate-200 text-slate-700">
                      <span className="font-black">Viáticos anticipados</span>
                      <span className="font-black">
                        {fmtMoneyPreview(ant.rendicion_viaticos)}
                      </span>
                    </div>
                  </div>
                </div>

                <label className="text-xs font-bold text-slate-600 md:row-start-3 md:col-start-1">
                  Fecha llegada
                  <div className="mt-1">
                    <DateInput
                      value={base.fecha_llegada || ""}
                      onChange={(v) => setBaseValue("fecha_llegada", v)}
                      showDayName={false}
                      className={`!py-1.5 !pl-8 !pr-2 !rounded-lg text-xs ${
                        base.fecha_llegada
                          ? occupiedDateInputClass
                          : ""
                      }`}
                    />
                  </div>
                </label>

                <label className="text-xs font-bold text-slate-600 md:row-start-3 md:col-start-2">
                  Hora llegada
                  <div className="mt-1">
                    <TimeInput
                      value={base.hora_llegada || ""}
                      onChange={(v) => setBaseValue("hora_llegada", v || "")}
                      className={`border border-slate-300 rounded-lg outline-none px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/30 ${
                        String(base.hora_llegada || "").trim()
                          ? occupiedTimeInputClass
                          : "bg-white"
                      }`}
                    />
                  </div>
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Financieros
                </div>
                {canAdminVd ? (
                  <button
                    type="button"
                    onClick={() => setVigenciaAdminOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 transition"
                    title="Administrar vigencias del valor diario"
                  >
                    <IconHistory size={13} />
                    Vigencias
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="text-xs font-bold text-slate-600">
                  Valor diario base
                  <ValorDiarioBaseHistoricoField
                    fechaSalida={base?.fecha_salida || ""}
                    horaSalida={base?.hora_salida || ""}
                    fechaLlegada={base?.fecha_llegada || ""}
                    horaLlegada={base?.hora_llegada || ""}
                    vigencias={vigencias}
                    fmtMoney={fmtMoneyPreview}
                  />
                </div>
                <label className="text-xs font-bold text-slate-600">
                  % viático
                  <select
                    className={`mt-1 w-full ${getCloudFieldClass(
                      "porcentaje",
                      `${baseFieldClass} bg-sky-50 border-sky-300`,
                    )}`}
                    value={String(base?.porcentaje ?? 100)}
                    onChange={updateBase("porcentaje")}
                  >
                    <option value="100">100%</option>
                    <option value="80">80%</option>
                    <option value="0">0%</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                  <div>
                    <div className="text-xs font-black text-slate-700">
                      Temporada alta
                    </div>
                    <div className="text-[11px] text-slate-500">
                      +30% (factor 0,30)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!base?.temporada_alta}
                    onChange={updateBase("temporada_alta")}
                    className="h-5 w-5 accent-indigo-600"
                  />
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:self-stretch">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Valor diario calculado
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-800">
                    {fmtMoneyPreview(valorDiarioCalc)}
                  </div>
                  {desgloseValorDiario ? (
                    <p className="mt-1 text-[10px] text-indigo-600 font-semibold">
                      Prorrateo: {desgloseValorDiario}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="text-left px-4 py-3 font-black uppercase tracking-wider">
                      Concepto
                    </th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider">
                      Anticipado
                    </th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider">
                      Rendido
                    </th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider">
                      Devolución
                    </th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider">
                      Reintegro
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {concepts.map((c) => {
                    const antVal = toNumber(ant[c.key]);
                    const rendVal = toNumber(rend[c.key]);
                    const { dev, reint } = calcDiff(antVal, rendVal);
                    return (
                      <tr key={c.key}>
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {c.label}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            inputMode="decimal"
                            className={rendicionInputClass(`ant:${c.key}`, ant[c.key])}
                            value={ant[c.key]}
                            onChange={updateAnt(c.key)}
                            onFocus={() => {
                              if (String(ant[c.key] ?? "").trim() === "0")
                                setAnt((p) => ({ ...p, [c.key]: "" }));
                            }}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            inputMode="decimal"
                            className={rendicionInputClass(`rend:${c.key}`, rend[c.key])}
                            value={rend[c.key]}
                            onChange={updateRend(c.key)}
                            onFocus={() => {
                              if (String(rend[c.key] ?? "").trim() === "0")
                                setRend((p) => ({ ...p, [c.key]: "" }));
                            }}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                          {fmtMoneyPreview(dev)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                          {fmtMoneyPreview(reint)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td className="px-4 py-3 font-black text-slate-700">
                      Totales
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">
                      {fmtMoneyPreview(totals.totalAnt)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">
                      {fmtMoneyPreview(totals.totalRend)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">
                      {fmtMoneyPreview(totals.dev)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">
                      {fmtMoneyPreview(totals.reint)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        </div>
      </div>

      <ManualClearChoiceModal
        open={clearDialogOpen}
        type="rendicion"
        onClose={() => !clearingCloud && setClearDialogOpen(false)}
        onNew={handleClearNew}
        onDeleteCurrent={handleRequestClearDelete}
        deleting={clearingCloud}
      />

      <ConfirmDialog
        isOpen={clearDeleteConfirmOpen}
        onClose={() => !clearingCloud && setClearDeleteConfirmOpen(false)}
        onConfirm={handleClearDelete}
        title="¿Borrar la rendición actual?"
        message={
          cloudRendicionId && isAuthenticated
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
        message="Se limpiarán los datos personales de la planilla. El resto de la rendición (fechas, importes, etc.) se mantiene."
        confirmText="Elegir otra persona"
        cancelText="Cancelar"
      />

      <ValorDiarioVigenciaAdminModal
        open={vigenciaAdminOpen}
        onClose={() => setVigenciaAdminOpen(false)}
        vigencias={vigencias}
        onSaved={refreshVigencias}
        client={viaticosValorDiarioManualClient}
        fechaReferencia={base?.fecha_salida || ""}
      />
    </div>
  );
}
