import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconCalculator,
  IconPlus,
  IconUserPlus,
  IconSearch,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconBriefcase,
  IconEye,
  IconEyeOff,
  IconDrive,
  IconBus,
  IconCloudUpload,
  IconLoader,
  IconRefresh,
  IconHistory,
} from "../../../components/ui/Icons";
import { useLogistics } from "../../../hooks/useLogistics";
import ViaticosForm from "./ViaticosForm";
import ViaticosBulkEditPanel from "./ViaticosBulkEditPanel";
import { exportViaticosToPDFForm } from "../../../utils/pdfFormExporter";
import RendicionForm from "./RendicionForm";
import DestaquesLocationPanel from "./DestaquesLocationPanel";
import ViaticosTable from "./ViaticosTable";
import DesdoblarViaticosModal from "./DesdoblarViaticosModal";
import { PDFDocument } from "pdf-lib";
import { Toaster, toast } from "sonner";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import ManualTrigger from "../../../components/manual/ManualTrigger";
import ValorDiarioVigenciaAdminModal from "../../../components/viaticos/ValorDiarioVigenciaAdminModal";
import { useAuth } from "../../../context/AuthContext";
import {
  getValorDiarioVigente,
  listValorDiarioVigencias,
} from "../../../services/viaticosValorDiarioService";
import { canAdminValorDiario } from "../../../utils/viaticosValorDiarioAdmin";
import {
  calculateDaysDiff,
  useViaticosIndividuales,
} from "../../../hooks/viaticos/useViaticosIndividuales";
import { calcValorDiarioProporcional } from "../../../utils/viaticosValorDiarioProporcional";
import {
  resolveAsientoHabitualViaticos,
  resolveCiudadOrigenViaticos,
  resolveLocalidadEfectivaViaticos,
  resolveLocalidadNombresReferenciaRecorrido,
  registerLocalidadViaticosEnMap,
} from "../../../utils/integranteDomicilioViaticos";
import { useViaticosMasivos } from "../../../hooks/viaticos/useViaticosMasivos";
import { mergeDestaqueLocationConfig } from "../../../utils/destaquesConfigMerge";
import {
  isRecorridosConfig,
  resolveLugarComisionDestaque,
  mergeLocalityNameById,
  localityIdsFromRecorridosStored,
} from "../../../utils/destaquesLugarComisionRecorridos";
import DateInput from "../../../components/ui/DateInput";
import MusicianForm from "../../Musicians/MusicianForm";
import { firstMondayAfter } from "../../../utils/dates";
import {
  getAnticipoSubtotalForExport,
  sumGastosViaticoRow,
} from "../../../utils/viaticosAnticipo";
import { parseSupabasePublicStorageUrl } from "../../../utils/supabaseStorage";
import { buildViaticosLogisticsMap } from "../../../utils/viaticosLogisticsSchedule";

const uint8ArrayToBase64 = (uint8Array) => {
  let binary = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return window.btoa(binary);
};

const normalizeStr = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
const esPerfilMasivo = (persona) => {
  const condicion = normalizeStr(persona.condicion);
  const rol = normalizeStr(persona.rol_gira || persona.rol);
  const esEstable = condicion === "estable";
  const esRolMusicoOSolista =
    rol.includes("music") ||
    rol.includes("solista") ||
    (rol === "" && persona.id_instr);
  return esEstable && esRolMusicoOSolista;
};

const isStablePerson = (person) => normalizeStr(person?.condicion) === "estable";

const zeroDestaqueMonetaryFields = (data) => {
  const monetaryKeys = [
    "subtotal",
    "totalFinal",
    "gasto_alojamiento",
    "gasto_combustible",
    "gasto_otros",
    "gastos_movilidad",
    "gastos_movil_otros",
    "gastos_capacit",
    "gasto_ceremonial",
    "gasto_pasajes",
    "rendicion_viaticos",
    "rendicion_gasto_alojamiento",
    "rendicion_gasto_pasajes",
    "rendicion_gasto_combustible",
    "rendicion_gastos_movil_otros",
    "rendicion_gastos_capacit",
    "rendicion_gasto_ceremonial",
    "rendicion_transporte_otros",
    "rendicion_viatico_monto",
    "total_percibir",
    "valorDiarioCalc",
    "anticipo_custom",
  ];

  const cloned = { ...data };
  monetaryKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(cloned, key)) {
      cloned[key] = 0;
    }
  });

  return cloned;
};

const MemberSearchSelect = ({ options = [], value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target))
        setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!options) return [];
    if (!search) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search]);

  const selectedLabel = options?.find((o) => o.value === value)?.label || "";

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white flex items-center justify-between cursor-pointer hover:border-indigo-400 shadow-sm select-none"
      >
        <span
          className={value ? "text-slate-700 font-medium" : "text-slate-400"}
        >
          {value ? selectedLabel : placeholder}
        </span>
        <IconChevronDown size={16} className="text-slate-400" />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden animate-in zoom-in-95 flex flex-col max-h-60">
          <div className="p-2 border-b bg-slate-50 relative shrink-0">
            <IconSearch
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={inputRef}
              type="text"
              className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500/50 outline-none"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center italic">
                Sin resultados
              </div>
            ) : (
              filteredOptions.map((opt, i) => (
                <div
                  key={`${opt.value}-${i}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 flex justify-between ${value === opt.value ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700"}`}
                >
                  <div className="flex flex-col">
                    <span>{opt.label}</span>
                    {opt.subLabel && (
                      <span className="text-[10px] text-slate-400">
                        {opt.subLabel}
                      </span>
                    )}
                  </div>
                  {value === opt.value && <IconCheck size={14} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ViaticosManager({ supabase, giraId }) {
  const { user, isAdmin } = useAuth();
  const canAdminVd = canAdminValorDiario({
    email: user?.mail || user?.email,
    isAdmin,
  });
  const [vigenciaAdminOpen, setVigenciaAdminOpen] = useState(false);
  const [vigencias, setVigencias] = useState([]);
  const [config, setConfig] = useState({
    valor_diario_base: 0,
    factor_temporada: 0,
    motivo: "",
    motivo_destaques_exportacion: "",
    lugar_comision: "",
    lugar_comision_destaques_exportacion: "",
    link_drive: "",
    porcentaje_destaques: 100,
    rendicion_fecha: null,
  });
  const [vigenteValorDiario, setVigenteValorDiario] = useState(0);
  const saveTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef({});

  const [giraData, setGiraData] = useState(null);
  const giraObj = useMemo(() => giraData || { id: giraId }, [giraData, giraId]);
  const {
    summary,
    roster,
    routeRules,
    transportes,
    loading: rosterLoading,
    refresh: refreshLogistics,
    allEvents,
  } = useLogistics(supabase, giraObj);

  const logisticsMap = useMemo(
    () =>
      buildViaticosLogisticsMap({
        summary,
        roster,
        routeRules,
        transportes,
      }),
    [summary, roster, routeRules, transportes],
  );

  const logisticsTransportsByPerson = useMemo(() => {
    const map = {};
    (summary || []).forEach((person) => {
      const key = String(person.id);
      map[key] = person.logistics?.transports || [];
    });
    return map;
  }, [summary]);

  const {
    rows: viaticosRows,
    loading: rowsLoading,
    fetchRows: fetchViaticos,
    updateRow,
    deleteRow,
    addPerson,
    addBatch,
    splitViaticoRow,
    mergeViaticoTramos,
    restoreViaticoRow,
    feedback: feedbackIndividual,
  } = useViaticosIndividuales(
    supabase,
    giraId,
    roster,
    logisticsMap,
    config,
    allEvents,
    summary,
    vigencias,
  );
  const {
    configs: destaquesConfigs,
    generalConfig: destaquesGeneralConfig,
    updateLocationConfig,
    fetchConfigs: fetchDestaquesConfigs,
    feedback: feedbackMasivo,
  } = useViaticosMasivos(supabase, giraId);

  const [desdoblarRow, setDesdoblarRow] = useState(null);
  const [desdoblarSaving, setDesdoblarSaving] = useState(false);
  const [recoverSnapshot, setRecoverSnapshot] = useState(null);

  useEffect(() => {
    if (!giraId) return;
    const key = `viatico_split_backup_${giraId}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      setRecoverSnapshot(null);
      return;
    }
    try {
      const snap = JSON.parse(raw);
      const hasRow = (viaticosRows || []).some(
        (r) => String(r.id_integrante) === String(snap.id_integrante),
      );
      setRecoverSnapshot(hasRow ? null : snap);
    } catch {
      setRecoverSnapshot(null);
    }
  }, [giraId, viaticosRows]);

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [selection, setSelection] = useState(new Set());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState(null);

  const [showDatos, setShowDatos] = useState(false);
  const [showAnticipo, setShowAnticipo] = useState(true);
  const [showTransport, setShowTransport] = useState(false);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showRendiciones, setShowRendiciones] = useState(false);
  const [useHistoricalCalc, setUseHistoricalCalc] = useState(false);
  const [showIndividualPanel, setShowIndividualPanel] = useState(true);
  const [showMassivePanel, setShowMassivePanel] = useState(true);
  const [destaquesShowBackup, setDestaquesShowBackup] = useState(false);
  const [destaquesSelToolbar, setDestaquesSelToolbar] = useState({
    canSelect: false,
    label: "Sel. pendientes",
  });
  const destaquesPanelRef = useRef(null);
  const [editingMusician, setEditingMusician] = useState(null);

  // ESTADOS DE EXPORTACIÓN
  const [fusionarConfirm, setFusionarConfirm] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [exportDetail, setExportDetail] = useState(""); // Segunda línea de detalle
  /** Registro persistente por corrida de export (persona + ítem que falló). */
  const [exportFailureLog, setExportFailureLog] = useState([]);
  /** Exportación viático 0%: anticipo como «RENUNCIA A VIÁTICOS» en PDF. */
  const [exportRenunciaViaticos, setExportRenunciaViaticos] = useState(true);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [notification, setNotification] = useState(null);

  const selectionHasViaticoCero = useMemo(
    () =>
      viaticosRows.some(
        (r) => selection.has(r.id) && parseFloat(r.porcentaje ?? 100) === 0,
      ),
    [viaticosRows, selection],
  );


  const refreshViaticosData = async () => {
    await Promise.all([refreshLogistics(), fetchViaticos()]);
  };

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  const [batchValues, setBatchValues] = useState({
    cargo: "",
    jornada_laboral: "",
    motivo: "",
    gastos_movilidad: "",
    gasto_combustible: "",
    gasto_alojamiento: "",
    gasto_pasajes: "",
    gasto_otros: "",
    gastos_capacit: "",
    gastos_movil_otros: "",
    check_aereo: "",
    check_terrestre: "",
    check_patente_oficial: "",
    patente_oficial: "",
    check_patente_particular: "",
    patente_particular: "",
    check_otros: "",
    transporte_otros: "",
    rendicion_viaticos: "",
    rendicion_gasto_alojamiento: "",
    rendicion_gasto_pasajes: "",
    rendicion_gasto_combustible: "",
    rendicion_gastos_movil_otros: "",
    rendicion_gastos_capacit: "",
    rendicion_transporte_otros: "",
  });

  useEffect(() => {
    if (giraId) {
      supabase
        .from("programas")
        .select("*")
        .eq("id", giraId)
        .single()
        .then(({ data }) => {
          if (data) setGiraData(data);
        });
      fetchViaticos();
      fetchConfigGlobal();
    }
  }, [giraId, fetchViaticos]);

  useEffect(() => {
    if (!giraData?.fecha_desde) return;
    refreshVigencias(giraData.fecha_desde).catch(() => {});
  }, [giraData?.fecha_desde]);

  const refreshVigencias = async (fechaRef) => {
    const rows = await listValorDiarioVigencias(supabase);
    setVigencias(rows);
    const vigente = await getValorDiarioVigente(fechaRef, supabase);
    setVigenteValorDiario(vigente);
    return vigente;
  };

  const fetchConfigGlobal = async () => {
    setLoadingConfig(true);
    try {
      let fechaRef = giraData?.fecha_desde || "";
      if (!fechaRef) {
        const { data: prog } = await supabase
          .from("programas")
          .select("fecha_desde")
          .eq("id", giraId)
          .single();
        fechaRef = prog?.fecha_desde || "";
      }
      const vigenteVal = await refreshVigencias(fechaRef);

      const { data: conf } = await supabase
        .from("giras_viaticos_config")
        .select("*")
        .eq("id_gira", giraId)
        .single();
      if (conf) {
        const merged = { ...conf, valor_diario_base: vigenteVal || 0 };
        setConfig(merged);
        if (vigenteVal > 0 && conf.valor_diario_base !== vigenteVal) {
          await supabase
            .from("giras_viaticos_config")
            .update({ valor_diario_base: vigenteVal })
            .eq("id_gira", giraId);
        }
      } else {
        const { data: newConf } = await supabase
          .from("giras_viaticos_config")
          .insert([{ id_gira: giraId, valor_diario_base: vigenteVal }])
          .select()
          .single();
        if (newConf) setConfig(newConf);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const updateConfig = (key, val) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, [key]: val };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const changesToSave = pendingUpdatesRef.current;
      pendingUpdatesRef.current = {};
      try {
        const { error } = await supabase
          .from("giras_viaticos_config")
          .update(changesToSave)
          .eq("id_gira", giraId);
        if (error) {
          console.error("Error guardando config:", error);
          toast.error(
            error.message?.includes("porcentaje_destaques")
              ? "Falta la columna porcentaje_destaques en la BD. Ejecutá la migración 20260519120000."
              : "Error al guardar configuración de viáticos",
          );
        }
      } catch (err) {
        console.error("Error guardando config:", err);
      }
    }, 1000);
  };

  /** Integrantes del roster que aún no tienen fila en viáticos (no ausentes, no perfil masivo). */
  const individualsPending = useMemo(() => {
    if (!roster || roster.length === 0) return [];
    const existingIds = new Set(
      viaticosRows.map((r) => String(r.id_integrante)),
    );
    return roster.filter((p) => {
      if (p.estado_gira === "ausente") return false;
      if (existingIds.has(String(p.id))) return false;
      if (esPerfilMasivo(p)) return false;
      return true;
    });
  }, [roster, viaticosRows]);

  const individualsPendingCount = individualsPending.length;

  const individualsPendingNamesSorted = useMemo(() => {
    return [...individualsPending]
      .map((p) =>
        `${p.apellido || ""}, ${p.nombre || ""}`.trim() ||
        p.rol_gira ||
        p.rol ||
        "Sin nombre",
      )
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [individualsPending]);

  const rendicionFechaDefault = useMemo(
    () => firstMondayAfter(giraData?.fecha_hasta),
    [giraData?.fecha_hasta],
  );

  const rendicionFechaForInput =
    config.rendicion_fecha || rendicionFechaDefault || "";

  const candidateOptions = useMemo(() => {
    if (!roster) return [];
    const existingIds = new Set(
      viaticosRows.map((r) => String(r.id_integrante)),
    );
    return roster
      .filter(
        (p) => p.estado_gira !== "ausente" && !existingIds.has(String(p.id)),
      )
      .map((p) => ({
        value: p.id,
        label: `${p.apellido || ""}, ${p.nombre || ""}`,
        subLabel: p.rol_gira || p.rol || "Sin Rol",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [roster, viaticosRows]);

  const massiveRoster = useMemo(() => {
    return (roster || []).filter(
      (p) => esPerfilMasivo(p) && p.estado_gira !== "ausente",
    );
  }, [roster]);

  const handleAddIndividuals = async () => {
    const existingIds = new Set(
      viaticosRows.map((r) => String(r.id_integrante)),
    );
    roster.forEach((p) => {
      if (
        !esPerfilMasivo(p) &&
        p.estado_gira !== "ausente" &&
        !existingIds.has(String(p.id))
      ) {
        addPerson(p.id);
      }
    });
  };

  const handleApplyBatch = async () => {
    await addBatch(batchValues, selection, () => setSelection(new Set()));
  };

  const handleCreateDriveFolder = async (silent = false) => {
    if (!giraId) return null;
    if (!silent) setLoadingConfig(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: {
          action: "create_viaticos_folder",
          giraId: parseInt(giraId),
          nombreSet: giraData?.nombre || "Gira",
        },
      });
      if (error) throw error;
      if (!data?.success)
        throw new Error(data?.error || "Error al crear carpeta");
      updateConfig("link_drive", data.folderId);
      if (!silent) toast.success("Carpeta creada");
      return data.folderId;
    } catch (err) {
      console.error(err);
      toast.error("Error creando carpeta");
      return null;
    } finally {
      if (!silent) setLoadingConfig(false);
    }
  };
  const ensureGoogleAccessToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "get_temp_token" },
      });
      if (error || !data?.accessToken) {
        throw new Error(error?.message || "No se pudo obtener token de Drive");
      }
      return data.accessToken;
    } catch (e) {
      console.error("[ViaticosManager] Error obteniendo token de Drive", e);
      throw e;
    }
  };

  const uploadPdfToDrive = async (pdfBytes, fileName, parentId) => {
    const accessToken = await ensureGoogleAccessToken();
    const bytes = new Uint8Array(pdfBytes);
    const blob = new Blob([bytes], { type: "application/pdf" });

    const metadata = {
      name: fileName,
      parents: [parentId],
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    form.append("file", blob);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Error subiendo PDF a Drive: ${res.status} ${text || ""}`,
      );
    }

    const data = await res.json();
    return data;
  };

  const resolveSupabaseSignedUrl = async (rawUrl, expiresIn = 60 * 10) => {
    const parsed = parseSupabasePublicStorageUrl(rawUrl);
    if (!parsed?.bucket || !parsed?.path) return null;
    const cleanPath = parsed.path.split("?")[0];
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(cleanPath, expiresIn);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  };

  const fetchPdfFromDrive = async (driveUrl) => {
    try {
      if (driveUrl.includes("supabase.co")) {
        const signedUrl = await resolveSupabaseSignedUrl(driveUrl);
        const sourceUrl = signedUrl || driveUrl;
        const res = await fetch(sourceUrl);
        if (!res.ok) throw new Error(`Error descargando bucket (${res.status})`);
        const arrayBuffer = await res.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }

      if (!driveUrl.includes("drive.google.com")) {
        const res = await fetch(driveUrl);
        const arrayBuffer = await res.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }

      const accessToken = await ensureGoogleAccessToken();
      const fileIdMatch = driveUrl.match(/[-\w]{25,}/);
      const fileId = fileIdMatch ? fileIdMatch[0] : null;
      if (!fileId) {
        throw new Error("No se pudo extraer ID de Drive.");
      }

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!res.ok) {
        throw new Error(`Error descargando desde Drive (${res.status})`);
      }
      const arrayBuffer = await res.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (err) {
      console.error("Error fetchPdfFromDrive:", err);
      return null;
    }
  };

  const copyDriveFile = async (url, targetFolder, newName) => {
    const isBucket = url.includes("supabase.co");
    if (isBucket) {
      const signedUrl = await resolveSupabaseSignedUrl(url, 60 * 30);
      await supabase.functions.invoke("manage-drive", {
        body: {
          action: "upload_from_url",
          sourceUrl: signedUrl || url,
          targetParentId: targetFolder,
          newName,
        },
      });
      return;
    }

    // Copia server-side directa dentro de Drive (sin mover bytes por Supabase)
    const match = url.match(/[-\w]{25,}/);
    const fileId = match ? match[0] : null;
    if (!fileId) {
      throw new Error("No se pudo extraer ID de Drive para copiar archivo.");
    }

    await supabase.functions.invoke("manage-drive", {
      body: {
        action: "copy_file",
        fileId,
        destinationFolderId: targetFolder,
        newName,
      },
    });
  };

  const getDjUrl = (personData) =>
    personData?.link_declaracion ||
    personData?.declaracion_jurada ||
    personData?.dj ||
    "";

const isPdfUrl = (url) => /\.pdf(\?|$)/i.test(String(url || "").trim());

const collectTransportSupportDocs = (personData) => {
  const transports = Array.isArray(personData?.logistics_transports)
    ? personData.logistics_transports
    : [];
  const docs = [];
  const seen = new Set();
  const addDoc = (url, label) => {
    const clean = String(url || "").trim();
    if (!clean || seen.has(`${label}:${clean}`)) return;
    seen.add(`${label}:${clean}`);
    docs.push({ url: clean, label });
  };
  transports.forEach((t, idx) => {
    const suffix = transports.length > 1 ? ` (${idx + 1})` : "";
    if (t?.vehicleDocumentation) {
      addDoc(t.vehicleDocumentation, `Doc. Vehículo${suffix}`);
    }
    if (t?.id_chofer) {
      addDoc(t?.chofer?.link_carnet, `Carnet Chofer${suffix}`);
      addDoc(t?.chofer?.link_dni_img, `DNI Chofer${suffix}`);
    }
  });
  return docs;
};

  const appendPersonToDoc = async (
    targetDoc,
    personData,
    options,
    giraData,
    pdfExportConfig,
    setDetail,
  ) => {
    const shortName = personData.apellido;
    const personLabel = `${personData.apellido || ""}, ${personData.nombre || ""}`.trim();

    const pushExportFailure = (item, message) => {
      const entry = {
        ts: new Date().toISOString(),
        personId: personData.id,
        personLabel: personLabel || `id ${personData.id}`,
        item,
        message: message || "Error desconocido",
      };
      setExportFailureLog((prev) => [...prev, entry]);
      console.warn("[Export viáticos/destaques]", entry);
    };

    const mergeBytes = async (bytesSource, label) => {
      try {
        const bytes =
          bytesSource && typeof bytesSource.then === "function"
            ? await bytesSource
            : bytesSource;
        if (!bytes) return;
        const srcDoc = await PDFDocument.load(bytes);
        const copiedPages = await targetDoc.copyPages(
          srcDoc,
          srcDoc.getPageIndices(),
        );
        copiedPages.forEach((p) => targetDoc.addPage(p));
      } catch (e) {
        console.error(`Error fusionando ${label}:`, e);
        const msg = e?.message || String(e);
        pushExportFailure(label, msg);
        toast.error(`No se pudo incluir ${label}: ${personLabel} — ${msg}`);
      }
    };

    const single = [personData];

    if (options.destaque) {
      const destaqueData = zeroDestaqueMonetaryFields(personData);
      const singleDestaque = [destaqueData];
      if (setDetail) setDetail(`Generando Destaque (${shortName})...`);
      await mergeBytes(
        exportViaticosToPDFForm(
          giraData,
          singleDestaque,
          pdfExportConfig,
          "destaque",
        ),
        "Destaque",
      );
    }
    if (options.viatico) {
      if (setDetail) setDetail(`Generando Viático (${shortName})...`);
      await mergeBytes(
        exportViaticosToPDFForm(
          giraData,
          single,
          pdfExportConfig,
          "viatico",
        ),
        "Viático",
      );
    }
    if (options.rendicion) {
      if (setDetail) setDetail(`Generando Rendición (${shortName})...`);
      await mergeBytes(
        exportViaticosToPDFForm(
          giraData,
          single,
          pdfExportConfig,
          "rendicion",
        ),
        "Rendición",
      );
    }

    if (options.docComun && personData.documentacion) {
      if (setDetail) setDetail(`Descargando Documentación (${shortName})...`);
      const bytes = await fetchPdfFromDrive(personData.documentacion);
      if (bytes) await mergeBytes(bytes, "Documentación");
      else
        pushExportFailure(
          "Documentación",
          "No se pudo descargar el PDF (enlace vacío o error de red/Drive).",
        );
    }
    if (options.docReducida && options.addDj) {
      const djUrl = getDjUrl(personData);
      if (djUrl) {
        if (setDetail) setDetail(`Descargando DJ (${shortName})...`);
        const bytes = await fetchPdfFromDrive(djUrl);
        if (bytes) await mergeBytes(bytes, "DJ");
        else
          pushExportFailure(
            "DJ",
            "No se pudo descargar el PDF de la declaración jurada.",
          );
      } else {
        pushExportFailure(
          "DJ",
          "Marcado para adjuntar DJ pero la persona no tiene enlace de declaración jurada.",
        );
      }
    }
    if (options.docReducida && personData.docred) {
      if (setDetail) setDetail(`Descargando Doc. Reducida (${shortName})...`);
      const bytes = await fetchPdfFromDrive(personData.docred);
      if (bytes) await mergeBytes(bytes, "Doc. Reducida");
      else
        pushExportFailure(
          "Doc. Reducida",
          "No se pudo descargar el PDF de documentación reducida.",
        );
    }

    if (options.docComun || options.docReducida) {
      const supportDocs = collectTransportSupportDocs(personData);
      for (const doc of supportDocs) {
        if (!isPdfUrl(doc.url)) {
          pushExportFailure(
            doc.label,
            "No se adjuntó porque el archivo no es PDF.",
          );
          continue;
        }
        if (setDetail) setDetail(`Descargando ${doc.label} (${shortName})...`);
        const bytes = await fetchPdfFromDrive(doc.url);
        if (bytes) await mergeBytes(bytes, doc.label);
        else
          pushExportFailure(
            doc.label,
            "No se pudo descargar el archivo del vehículo/chofer.",
          );
      }
    }
  };

  const processExportList = async (
    dataList,
    folderId,
    options,
    involvedLocationIds = [],
  ) => {
    const now = new Date().toISOString();
    const dateStr = new Date().toLocaleDateString("es-AR").replace(/\//g, "-");
    const giraName = giraData?.nombre || "Gira";

    setExportStatus("Iniciando...");
    setExportDetail("Actualizando registros en BD...");
    setExportFailureLog([]);

    const pdfExportConfig = {
      ...config,
      useHistoricalCalc,
      renuncia_viaticos: !!options.renuncia_viaticos,
    };

    const updateViaticoExportAudit = async (detalleId, row) => {
      const basePayload = {
        fecha_ultima_exportacion: now,
        backup_fecha_salida: row.fecha_salida,
        backup_hora_salida: row.hora_salida,
        backup_fecha_llegada: row.fecha_llegada,
        backup_hora_llegada: row.hora_llegada,
        backup_dias_computables: row.dias_computables,
      };
      const payloadWithBackupViatico = {
        ...basePayload,
        backup_viatico: getAnticipoSubtotalForExport(row, useHistoricalCalc),
      };

      let res = await supabase
        .from("giras_viaticos_detalle")
        .update(payloadWithBackupViatico)
        .eq("id", detalleId);

      const missingBackupColumn =
        res?.error &&
        (String(res.error?.message || "").toLowerCase().includes("backup_viatico") ||
          String(res.error?.details || "").toLowerCase().includes("backup_viatico") ||
          String(res.error?.hint || "").toLowerCase().includes("backup_viatico"));

      if (missingBackupColumn) {
        // Compatibilidad con esquemas antiguos que aún no tienen backup_viatico.
        res = await supabase
          .from("giras_viaticos_detalle")
          .update(basePayload)
          .eq("id", detalleId);
      }
      return res;
    };

    const individualUpdates = dataList
      .map((row) => {
        if (!row.id) return null;
        return updateViaticoExportAudit(row.id, row);
      })
      .filter(Boolean);

    const massUpdates = [];
    let needsDestaquesConfigRefresh = false;
    if (involvedLocationIds.length > 0) {
      involvedLocationIds.forEach((locConfigId) => {
        if (locConfigId == null || locConfigId === "unknown") return;
        const locKey = String(locConfigId);
        const peopleInLoc = dataList.filter(
          (p) => String(p._massConfigId) === locKey,
        );
        if (peopleInLoc.length === 0) return;

        const idsToAdd = peopleInLoc
          .map((p) => Number(p.id_integrante ?? p.id))
          .filter((id) => !Number.isNaN(id));
        const currentConfig =
          destaquesConfigs[locKey] ?? destaquesConfigs[locConfigId] ?? {};
        const currentIds = (currentConfig.ids_exportados_viatico || []).map(Number);
        const newIds = [...new Set([...currentIds, ...idsToAdd])];
        const payload = {
          ids_exportados_viatico: newIds,
          fecha_ultima_exportacion: now,
        };

        if (currentConfig.id) {
          massUpdates.push(
            supabase
              .from("giras_destaques_config")
              .update(payload)
              .eq("id", currentConfig.id),
          );
        } else {
          needsDestaquesConfigRefresh = true;
          massUpdates.push(
            supabase.from("giras_destaques_config").insert({
              id_gira: giraId,
              id_localidad: Number(locConfigId),
              ...payload,
            }),
          );
        }
      });
    }

    const dbResults = await Promise.all([...individualUpdates, ...massUpdates]);
    const dbErrors = dbResults.map((r) => r?.error).filter(Boolean);
    if (dbErrors.length > 0) {
      console.error("[Export viáticos] Errores al actualizar BD:", dbErrors);
      toast.error(
        `Exportación: ${dbErrors.length} error(es) al guardar en BD. Revisá consola.`,
      );
    }
    if (needsDestaquesConfigRefresh) {
      await fetchDestaquesConfigs();
    }

    const total = dataList.length;
    const mode = options.unificationMode || "individual";

    // MODO MASTER
    if (mode === "master") {
      setExportStatus("Generando archivo maestro...");
      setExportDetail("Inicializando PDF unificado...");
      const masterDoc = await PDFDocument.create();
      let pagesAdded = 0;
      let count = 0;

      for (const personData of dataList) {
        count++;
        const name = `${personData.apellido}, ${personData.nombre}`;
        setExportStatus(`[${count}/${total}] Unificando: ${name}`);

        await appendPersonToDoc(
          masterDoc,
          personData,
          options,
          giraData,
          pdfExportConfig,
          setExportDetail,
        );
        pagesAdded++;
      }

      if (pagesAdded > 0) {
        setExportStatus("Subiendo a Drive...");
        setExportDetail("Guardando archivo maestro...");
        const masterBytes = await masterDoc.save();
        await uploadPdfToDrive(
          masterBytes,
          `Exportación Master - ${giraName} - ${dateStr}.pdf`,
          folderId,
        );

        setNotification("Archivo Master creado correctamente");
        toast.success("Archivo Master creado correctamente");
      }

      // MODO LOCATION (Por Localidad)
    } else if (mode === "location") {
      const groups = {};
      dataList.forEach((p) => {
        const key = p._massConfigId || "individuales";
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      });

      const groupKeys = Object.keys(groups);
      let groupIdx = 0;

      for (const key of groupKeys) {
        groupIdx++;
        const groupData = groups[key];
        const groupName = groupData[0]._groupName || "Varios";

        setExportStatus(
          `Grupo [${groupIdx}/${groupKeys.length}]: ${groupName}`,
        );

        const locDoc = await PDFDocument.create();
        let pagesInLoc = 0;
        let pCount = 0;

        for (const personData of groupData) {
          pCount++;
          const name = `${personData.apellido}, ${personData.nombre}`;
          setExportStatus(
            `[${groupIdx}/${groupKeys.length}] ${groupName}: ${pCount}/${groupData.length}`,
          );

          await appendPersonToDoc(
            locDoc,
            personData,
            options,
            giraData,
            pdfExportConfig,
            setExportDetail,
          );
          pagesInLoc++;
        }

        if (pagesInLoc > 0) {
          setExportStatus(`Subiendo PDF: ${groupName}...`);
          setExportDetail(`Guardando en carpeta de la gira...`);
          const locBytes = await locDoc.save();
          await uploadPdfToDrive(
            locBytes,
            `${groupName} - ${dateStr}.pdf`,
            folderId,
          );
        }
      }
      setNotification(`Se crearon ${groupKeys.length} archivos de localidad.`);
      toast.success(`Se crearon ${groupKeys.length} archivos de localidad.`);

      // MODO INDIVIDUAL
    } else {
      let successCount = 0;
      let attempt = 0;
      for (const personData of dataList) {
        attempt++;
        const tramoSuffix = personData.etiqueta_tramo
          ? ` (${personData.etiqueta_tramo})`
          : personData.tramo_orden > 1
            ? ` (Tramo ${personData.tramo_orden})`
            : "";
        const nameSafe = `${personData.apellido}, ${personData.nombre}${tramoSuffix}`;
        const prefix = `[${attempt}/${total}]`;
        setExportStatus(`${prefix} ${nameSafe}`);

        try {
          const shouldBuildMergedPacket = options.docComun || options.docReducida;
          if (shouldBuildMergedPacket) {
            setExportDetail("Generando PDF integrado...");
            const personDoc = await PDFDocument.create();
            await appendPersonToDoc(
              personDoc,
              personData,
              options,
              giraData,
              pdfExportConfig,
              setExportDetail,
            );
            const mergedBytes = await personDoc.save();
            setExportDetail("Subiendo PDF integrado...");
            await uploadPdfToDrive(
              mergedBytes,
              `${nameSafe} - Documentación.pdf`,
              folderId,
            );
            successCount++;
            continue;
          }

          if (options.viatico) {
            setExportDetail("Generando PDF Viático...");
            const pdfBytes = await exportViaticosToPDFForm(
              giraData,
              [personData],
              pdfExportConfig,
              "viatico",
            );
            setExportDetail("Subiendo PDF Viático...");
            await uploadPdfToDrive(
              pdfBytes,
              `${nameSafe} - Viático.pdf`,
              folderId,
            );
          }
          if (options.destaque) {
            setExportDetail("Generando PDF Destaque...");
            const destaqueData = zeroDestaqueMonetaryFields(personData);
            const pdfBytes = await exportViaticosToPDFForm(
              giraData,
              [destaqueData],
              pdfExportConfig,
              "destaque",
            );
            setExportDetail("Subiendo PDF Destaque...");
            await uploadPdfToDrive(
              pdfBytes,
              `${nameSafe} - Destaque.pdf`,
              folderId,
            );
          }
          if (options.rendicion) {
            setExportDetail("Generando PDF Rendición...");
            const pdfBytes = await exportViaticosToPDFForm(
              giraData,
              [personData],
              pdfExportConfig,
              "rendicion",
            );
            setExportDetail("Subiendo PDF Rendición...");
            await uploadPdfToDrive(
              pdfBytes,
              `${nameSafe} - Rendición.pdf`,
              folderId,
            );
          }

          if (options.docComun && personData.documentacion) {
            setExportDetail("Duplicando Documentación en Drive...");
            await copyDriveFile(
              personData.documentacion,
              folderId,
              `${nameSafe} - Documentación`,
            );
          }
          if (options.docReducida && options.addDj) {
            const djUrl = getDjUrl(personData);
            if (djUrl) {
              setExportDetail("Duplicando DJ en Drive...");
              await copyDriveFile(
                djUrl,
                folderId,
                `${nameSafe} - DJ`,
              );
            }
          }
          if (options.docReducida && personData.docred) {
            setExportDetail("Duplicando Doc. Reducida en Drive...");
            await copyDriveFile(
              personData.docred,
              folderId,
              `${nameSafe} - Doc. Reducida`,
            );
          }
          if (options.docComun || options.docReducida) {
            const supportDocs = collectTransportSupportDocs(personData);
            for (const doc of supportDocs) {
              if (!isPdfUrl(doc.url)) {
                setExportFailureLog((prev) => [
                  ...prev,
                  {
                    ts: new Date().toISOString(),
                    personId: personData.id,
                    personLabel: nameSafe,
                    item: doc.label,
                    message: "No se adjuntó porque el archivo no es PDF.",
                  },
                ]);
                continue;
              }
              setExportDetail(`Duplicando ${doc.label} en Drive...`);
              await copyDriveFile(doc.url, folderId, `${nameSafe} - ${doc.label}`);
            }
          }
          successCount++;
        } catch (err) {
          console.error("processExportList individual:", err);
          const msg = err?.message || String(err);
          setExportFailureLog((prev) => [
            ...prev,
            {
              ts: new Date().toISOString(),
              personId: personData.id,
              personLabel: nameSafe,
              item: "Exportación (PDF/Drive)",
              message: msg,
            },
          ]);
          console.warn("[Export viáticos/destaques]", {
            personLabel: nameSafe,
            item: "Exportación (PDF/Drive)",
            message: msg,
          });
          toast.error(`No se pudo exportar todo para ${nameSafe}: ${msg}`);
        }
      }

      if (successCount > 0) {
        setNotification(
          `Se procesaron ${successCount} integrantes correctamente.`,
        );
        toast.success(
          `Se procesaron ${successCount} integrantes correctamente.`,
        );
      }
    }
    setExportDetail("");
    setExportStatus("");
  };

  const handleExportLocationBatch = async (
    peopleArray,
    folderId,
    options,
    locationIdOrIds,
  ) => {
    if (!peopleArray || peopleArray.length === 0)
      return toast.error("No hay personas.");
    const targetFolderId = folderId || config.link_drive;
    if (!targetFolderId) return toast.error("Carpeta Drive no configurada.");

    setExportStatus("Preparando datos masivos...");
    setIsExporting(true);

    try {
      const addLocalityName = (map, id, name) => {
        const label = String(name || "").trim();
        if (id == null || !label) return;
        map[id] = label;
        map[String(id)] = label;
      };
      const localityNameByIdForDestaques = mergeLocalityNameById(
        options?.localityNameById,
      );
      const registerPersonLocalities = (person) => {
        registerLocalidadViaticosEnMap(localityNameByIdForDestaques, person);
        addLocalityName(
          localityNameByIdForDestaques,
          person._massConfigId,
          person._groupName,
        );
      };
      (massiveRoster || []).forEach(registerPersonLocalities);
      peopleArray.forEach(registerPersonLocalities);
      localityIdsFromRecorridosStored(
        config.lugar_comision_destaques_exportacion,
      ).forEach((id) => {
        if (
          localityNameByIdForDestaques[id] ||
          localityNameByIdForDestaques[String(id)]
        ) {
          return;
        }
        const fromPerson = peopleArray.find(
          (person) =>
            String(resolveLocalidadEfectivaViaticos(person).id) === String(id) ||
            String(person._massConfigId) === String(id),
        );
        if (fromPerson) registerPersonLocalities(fromPerson);
      });

      const missingRouteIds = localityIdsFromRecorridosStored(
        config.lugar_comision_destaques_exportacion,
      ).filter(
        (id) =>
          !localityNameByIdForDestaques[id] &&
          !localityNameByIdForDestaques[String(id)],
      );
      if (missingRouteIds.length > 0) {
        const { data: locRows, error: locErr } = await supabase
          .from("localidades")
          .select("id, localidad")
          .in("id", missingRouteIds);
        if (locErr) console.warn("[Destaques] localidades recorrido:", locErr);
        (locRows || []).forEach((row) =>
          addLocalityName(localityNameByIdForDestaques, row.id, row.localidad),
        );
      }

      const richData = peopleArray.map((p) => {
        const locEfectiva = resolveLocalidadEfectivaViaticos(p);
        const configLocKey = locEfectiva.id ?? p._massConfigId;
        const massConfig = mergeDestaqueLocationConfig(
          destaquesGeneralConfig,
          destaquesConfigs[configLocKey] ??
            destaquesConfigs[p._massConfigId] ??
            {},
        );
        const rich = { ...p };
        const patenteOficialFromMass = String(
          massConfig.patente_oficial || "",
        ).trim();
        const patenteOficialFromPerson = String(p.patente_oficial || "").trim();
        const patenteOficialFromTravel = String(
          p.travelData?.patente || "",
        ).trim();
        const patenteParticularFromMass = String(
          massConfig.patente_particular || "",
        ).trim();
        const patenteParticularFromPerson = String(
          p.patente_particular || "",
        ).trim();

        rich.gasto_alojamiento = massConfig.gasto_alojamiento || 0;
        rich.gasto_combustible = massConfig.gasto_combustible || 0;
        rich.gasto_otros = massConfig.gasto_otros || 0;
        rich.gastos_movilidad = massConfig.gastos_movilidad || 0;
        rich.gastos_movil_otros = massConfig.gastos_movil_otros || 0;
        rich.gastos_capacit = massConfig.gastos_capacit || 0;
        rich.transporte_otros = massConfig.transporte_otros || "";
        rich.check_aereo = massConfig.check_aereo ?? false;
        rich.check_terrestre = massConfig.check_terrestre ?? false;
        rich.check_otros = massConfig.check_otros ?? false;
        rich.check_patente_oficial =
          massConfig.check_patente_oficial ?? p.check_patente_oficial ?? false;
        rich.patente_oficial =
          patenteOficialFromMass ||
          patenteOficialFromPerson ||
          patenteOficialFromTravel;
        rich.check_patente_particular =
          massConfig.check_patente_particular ??
          p.check_patente_particular ??
          false;
        rich.patente_particular =
          patenteParticularFromMass || patenteParticularFromPerson;

        rich.rendicion_gasto_alojamiento =
          massConfig.rendicion_gasto_alojamiento || 0;
        rich.rendicion_gasto_combustible =
          massConfig.rendicion_gasto_combustible || 0;
        rich.rendicion_gasto_otros = massConfig.rendicion_gasto_otros || 0;
        rich.rendicion_gastos_movil_otros =
          massConfig.rendicion_gastos_movil_otros || 0;
        rich.rendicion_gastos_capacit =
          massConfig.rendicion_gastos_capacit || 0;
        rich.rendicion_transporte_otros =
          massConfig.rendicion_transporte_otros || 0;
        rich.rendicion_viaticos = massConfig.rendicion_viatico_monto || 0;

        rich.documentacion = p.documentacion || p.documentacion;
        rich.docred = p.docred || p.docred;
        rich.link_declaracion =
          p.link_declaracion || p.declaracion_jurada || p.dj || "";
        const fallbackCargo = isStablePerson(p) ? "Agente administrativo" : "";
        rich.cargo = p.cargo || p.rol || fallbackCargo;
        const motivoDestaques =
          config.motivo_destaques_exportacion?.trim() || config.motivo || "";
        const fallbackJornada = isStablePerson(p) ? "Horas cátedra" : "";
        rich.motivo =
          p.motivo && p.motivo.trim() !== ""
            ? p.motivo
            : motivoDestaques;
        rich.jornada = p.jornada_laboral || p.jornada || fallbackJornada;
        rich.jornada_laboral = rich.jornada;

        let dias = 0;
        const hasLocalityDaysOverride = Number.isFinite(
          Number(p._diasComputablesLocalidad),
        );
        const pctGlobal =
          config.porcentaje_destaques !== undefined
            ? parseFloat(config.porcentaje_destaques)
            : 100;

        if (p.travelData) {
          rich.fecha_salida = p.travelData.fecha_salida;
          rich.hora_salida = p.travelData.hora_salida;
          rich.fecha_llegada = p.travelData.fecha_llegada;
          rich.hora_llegada = p.travelData.hora_llegada;

          dias = calculateDaysDiff(
            p.travelData.fecha_salida,
            p.travelData.hora_salida,
            p.travelData.fecha_llegada,
            p.travelData.hora_llegada,
          );
        } else {
          dias = massConfig.backup_dias_computables || 0;
        }
        if (hasLocalityDaysOverride) {
          dias = Number(p._diasComputablesLocalidad);
        }
        rich.dias_computables = dias;

        if (
          p.travelData &&
          !hasLocalityDaysOverride &&
          dias > 0
        ) {
          const fin = calcValorDiarioProporcional({
            fechaSalida: p.travelData.fecha_salida,
            horaSalida: p.travelData.hora_salida,
            fechaLlegada: p.travelData.fecha_llegada,
            horaLlegada: p.travelData.hora_llegada,
            vigencias,
            fallbackBase: 0,
            porcentaje: pctGlobal,
            factorTemporada: config.factor_temporada || 0,
          });
          rich.valorDiarioCalc = fin.valorDiarioCalc;
          rich.subtotal = fin.subtotal;
        } else if (dias > 0 && vigencias.length > 0) {
          const fin = calcValorDiarioProporcional({
            fechaSalida: rich.fecha_salida || p.travelData?.fecha_salida,
            horaSalida: rich.hora_salida || p.travelData?.hora_salida,
            fechaLlegada: rich.fecha_llegada || p.travelData?.fecha_llegada,
            horaLlegada: rich.hora_llegada || p.travelData?.hora_llegada,
            vigencias,
            fallbackBase: 0,
            porcentaje: pctGlobal,
            factorTemporada: config.factor_temporada || 0,
          });
          rich.valorDiarioCalc = fin.valorDiarioCalc;
          rich.subtotal = fin.subtotal;
        } else {
          const base = parseFloat(vigenteValorDiario || 0);
          const factor = 1 + parseFloat(config.factor_temporada || 0);
          const valDiario = Math.round(base * factor * (pctGlobal / 100));
          const computedSub = Math.round(dias * valDiario * 100) / 100;
          rich.valorDiarioCalc = valDiario;
          rich.subtotal = computedSub;
        }
        rich.porcentaje = pctGlobal;
        rich.subtotal = getAnticipoSubtotalForExport(rich, useHistoricalCalc);

        const totalGastos =
          parseFloat(rich.gasto_alojamiento) +
          parseFloat(rich.gasto_combustible) +
          parseFloat(rich.gasto_otros) +
          parseFloat(rich.gastos_movilidad) +
          parseFloat(rich.gastos_movil_otros) +
          parseFloat(rich.gastos_capacit);

        rich.totalFinal = rich.subtotal + totalGastos;

        const ciudadOrigen = resolveCiudadOrigenViaticos(p, p);
        const asientoHabitual = resolveAsientoHabitualViaticos(p, p);
        rich.ciudad_origen = ciudadOrigen;
        const refLocId = locEfectiva.id;
        const refLocNombres = resolveLocalidadNombresReferenciaRecorrido(p);
        const lugarStored = config.lugar_comision_destaques_exportacion;
        if (isRecorridosConfig(lugarStored)) {
          const fromRoute = resolveLugarComisionDestaque(
            lugarStored,
            refLocId,
            localityNameByIdForDestaques,
            refLocNombres,
          );
          rich.lugar_comision = fromRoute != null ? String(fromRoute) : "";
        } else {
          rich.lugar_comision =
            lugarStored?.trim() || config.lugar_comision?.trim() || "";
        }
        rich.asiento_habitual = asientoHabitual;

        if (options?.destaque) {
          return zeroDestaqueMonetaryFields(rich);
        }

        return rich;
      });

      await processExportList(
        richData,
        targetFolderId,
        options,
        locationIdOrIds,
      );
    } catch (err) {
      console.error(err);
      const msg = err?.message || String(err);
      setExportFailureLog((prev) => [
        ...prev,
        {
          ts: new Date().toISOString(),
          personLabel: "(lote destaques)",
          item: "Exportación masiva",
          message: msg,
        },
      ]);
      console.warn("[Export viáticos/destaques]", { item: "Batch", message: msg });
      toast.error("Error batch: " + msg);
    } finally {
      setIsExporting(false);
      setExportStatus("");
    }
  };

  const handleExportToDrive = async (options) => {
    if (selection.size === 0) {
      toast.error("Selecciona alguien.");
      return;
    }

    // --- NORMALIZACIÓN DE DATOS (anticipo custom > histórico > calculado) ---
    const selectedData = viaticosRows
      .filter((r) => selection.has(r.id))
      .map((row) => {
        const person = row.integrantes || {};
        const useTramoSchedule =
          row.id_evento_parada_inicio && row.id_evento_parada_fin;
        const logData = useTramoSchedule
          ? {
              fecha_salida: row.fecha_salida,
              hora_salida: row.hora_salida,
              fecha_llegada: row.fecha_llegada,
              hora_llegada: row.hora_llegada,
            }
          : logisticsMap?.[String(row.id_integrante)] ||
            logisticsMap?.[row.id_integrante] ||
            {};
        const patenteOficialFromRow = String(row.patente_oficial || "").trim();
        const patenteOficialFromLogistics = String(logData?.patente || "").trim();
        const ciudadOrigen = resolveCiudadOrigenViaticos(person, row);
        const asientoHabitual = resolveAsientoHabitualViaticos(person, row);
        const effectiveSubtotal = getAnticipoSubtotalForExport(row, useHistoricalCalc);
        const totalFinalNorm = effectiveSubtotal + sumGastosViaticoRow(row);
        return {
          ...person,
          ...row,
          id: row.id,
          motivo:
            row.motivo && String(row.motivo).trim() !== ""
              ? row.motivo
              : config.motivo || "",
          lugar_comision:
            row.lugar_comision != null &&
            String(row.lugar_comision).trim() !== ""
              ? row.lugar_comision
              : config.lugar_comision || "",
          subtotal: effectiveSubtotal,
          totalFinal: totalFinalNorm,
          // En tabla la patente oficial visible viene de logística; si no hubo edición manual en el detalle, usamos ese valor al exportar.
          patente_oficial: patenteOficialFromRow || patenteOficialFromLogistics,
          documentacion:
            person.documentacion || row.documentacion,
          docred: person.docred || row.docred,
          link_declaracion:
            person.link_declaracion ||
            row.link_declaracion ||
            row.declaracion_jurada ||
            row.dj ||
            "",
          ciudad_origen: ciudadOrigen,
          asiento_habitual: asientoHabitual,
          logistics_transports:
            logisticsTransportsByPerson[String(row.id_integrante)] || [],
        };
      });

    let driveFolderId = config?.link_drive;
    if (!driveFolderId) {
      toast.error("Sin carpeta Drive");
      return;
    }

    // Normalizar modo de unificación:
    // - Si ya viene definido (por ejemplo, "location"), se respeta.
    // - Si no viene definido, usamos el toggle del panel bulk:
    //     unifyFiles = true  -> "master" (1 PDF unificado)
    //     unifyFiles = false -> "individual" (PDF por persona)
    const normalizedOptions = {
      ...options,
      renuncia_viaticos: !!(options.renuncia_viaticos || exportRenunciaViaticos),
      unificationMode:
        options.unificationMode ||
        (options.unifyFiles ? "master" : "individual"),
    };

    setExportStatus("Exportando...");
    setIsExporting(true);
    try {
      await processExportList(selectedData, driveFolderId, normalizedOptions, []);
      setSelection(new Set());
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setIsExporting(false);
      setExportStatus("");
    }
  };

  // --- FUNCIÓN DE EMAIL MASIVO ---
  const handleSendMassiveEmails = async (skipConfirm = false) => {
    if (selection.size === 0)
      return toast.error("Selecciona al menos un integrante.");

    if (!skipConfirm) {
      setShowEmailConfirm(true);
      return;
    }

    setShowEmailConfirm(false);
    const toastId = toast.loading("Iniciando proceso de envío...");

    let successCount = 0;
    let errorsCount = 0;

    try {
      const selectedData = viaticosRows.filter((r) => selection.has(r.id));

      for (const [index, row] of selectedData.entries()) {
        const person = row.integrantes || row;
        const email = person.mail || person.email || row.mail || row.email;
        const name = person.nombre || person.apellido;

        // Actualizamos el toast con el progreso
        toast.loading(
          `Enviando ${index + 1} de ${selectedData.length}: ${person.apellido}...`,
          { id: toastId },
        );

        if (!email) {
          console.warn(`SKIPPED: No tiene mail ${name}.`);
          errorsCount++;
          continue;
        }

        const effectiveSubtotal = getAnticipoSubtotalForExport(row, useHistoricalCalc);
        const totalPercibir = effectiveSubtotal + sumGastosViaticoRow(row);

        // PAYLOAD COMPLETO (Igual que Legacy)
        const detalleCompleto = {
          dias_computables: row.dias_computables,
          porcentaje: row.porcentaje,
          monto_viatico: effectiveSubtotal,
          subtotal_viatico: effectiveSubtotal,
          gasto_combustible: parseFloat(row.gasto_combustible || 0),
          gasto_alojamiento: parseFloat(row.gasto_alojamiento || 0),
          gasto_pasajes: parseFloat(row.gasto_pasajes || 0),
          gasto_otros: parseFloat(row.gasto_otros || 0),
          gastos_movilidad: parseFloat(row.gastos_movilidad || 0),
          gastos_movil_otros: parseFloat(row.gastos_movil_otros || 0),
          gastos_capacit: parseFloat(row.gastos_capacit || 0),
          total_percibir: totalPercibir,
        };

        const { error } = await supabase.functions.invoke("mails_produccion", {
          body: {
            action: "enviar_mail",
            templateId: "viaticos_simple",
            email: email,
            nombre: person.nombre || "Integrante",
            gira: giraData?.nombre || "Gira OFRN",
            detalle: detalleCompleto,
          },
        });

        if (error) {
          console.error(`ERROR enviando a ${email}:`, error);
          errorsCount++;
        } else {
          successCount++;
        }
      }

      if (errorsCount === 0) {
        toast.success(
          `¡Listo! Se enviaron ${successCount} correos exitosamente.`,
          { id: toastId, duration: 5000 },
        );
      } else {
        toast.warning(
          `Proceso finalizado. Enviados: ${successCount} - Fallidos: ${errorsCount}`,
          { id: toastId, duration: 8000 },
        );
      }

      setSelection(new Set());
    } catch (error) {
      console.error("Error crítico:", error);
      toast.error("Error en el proceso de envío.", { id: toastId });
    }
  };

  const toggleSelection = (rowId) => {
    const newSet = new Set(selection);
    if (newSet.has(rowId)) newSet.delete(rowId);
    else newSet.add(rowId);
    setSelection(newSet);
  };
  const selectAll = () => {
    if (selection.size === viaticosRows.length) setSelection(new Set());
    else setSelection(new Set(viaticosRows.map((r) => r.id)));
  };

  const handleConfirmDesdoblar = async (row, tramosPreview) => {
    setDesdoblarSaving(true);
    try {
      await splitViaticoRow(row, tramosPreview);
      setDesdoblarRow(null);
    } finally {
      setDesdoblarSaving(false);
    }
  };

  const handleFusionarTramos = (row, tramoGroup) => {
    if ((tramoGroup?.length || 0) < 2) return;
    setFusionarConfirm({ row, tramoGroup });
  };

  const handleConfirmFusionarTramos = async () => {
    const pending = fusionarConfirm;
    if (!pending?.tramoGroup?.length) return;
    setFusionarConfirm(null);
    await mergeViaticoTramos(pending.tramoGroup);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
      {/* ELIMINADO EL TOASTER DUPLICADO, USAMOS EL DE APP.JSX */}

      <ConfirmDialog
        isOpen={!!fusionarConfirm}
        onClose={() => setFusionarConfirm(null)}
        onConfirm={handleConfirmFusionarTramos}
        title="Fusionar tramos"
        message={
          fusionarConfirm
            ? `¿Fusionar ${fusionarConfirm.tramoGroup.length} tramos de ${fusionarConfirm.row.apellido}, ${fusionarConfirm.row.nombre} en una sola fila?\n\nSe sumarán gastos y rendiciones. Las fechas volverán al recorrido completo de logística.`
            : ""
        }
        confirmText="Fusionar"
      />
      <ConfirmDialog
        isOpen={showEmailConfirm}
        onClose={() => setShowEmailConfirm(false)}
        onConfirm={() => handleSendMassiveEmails(true)}
        title="Enviar Notificaciones"
        message={`Estás a punto de enviar ${selection.size} correos...`}
        confirmText="Enviar"
      />

      {/* PANEL SUPERIOR: INDIVIDUALES */}
      <div className="bg-white border-b border-slate-200 shadow-sm mb-4">
        <div
          className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setShowIndividualPanel(!showIndividualPanel)}
        >
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <IconCalculator className="text-indigo-600" /> Viáticos Individuales
          </h2>
          <button className="text-slate-400">
            {showIndividualPanel ? (
              <IconChevronDown size={20} />
            ) : (
              <IconChevronRight size={20} />
            )}
          </button>
        </div>

        {showIndividualPanel && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <ManualTrigger section="vi_ticos_intro_mkd1at12" />
            <div className="px-6 pb-4 flex flex-col gap-4">
              {recoverSnapshot && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <span>
                    Hay un respaldo de viático sin fila en la tabla (posible fallo al
                    desdoblar).
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800"
                    onClick={async () => {
                      await restoreViaticoRow(recoverSnapshot);
                      sessionStorage.removeItem(`viatico_split_backup_${giraId}`);
                      setRecoverSnapshot(null);
                    }}
                  >
                    Restaurar fila
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setShowDatos(!showDatos)}
                    className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showDatos ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"}`}
                  >
                    Datos{" "}
                    {showDatos ? (
                      <IconEye size={14} />
                    ) : (
                      <IconEyeOff size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => setShowAnticipo(!showAnticipo)}
                    className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showAnticipo ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"}`}
                  >
                    Anticipo{" "}
                    {showAnticipo ? (
                      <IconEye size={14} />
                    ) : (
                      <IconEyeOff size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => setShowTransport(!showTransport)}
                    className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showTransport ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"}`}
                  >
                    Transp.{" "}
                    {showTransport ? (
                      <IconEye size={14} />
                    ) : (
                      <IconEyeOff size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => setShowExpenses(!showExpenses)}
                    className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showExpenses ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-white text-slate-400 border-slate-200"}`}
                  >
                    Gastos{" "}
                    {showExpenses ? (
                      <IconEye size={14} />
                    ) : (
                      <IconEyeOff size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => setShowRendiciones(!showRendiciones)}
                    className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showRendiciones ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-slate-400 border-slate-200"}`}
                  >
                    Rendic.{" "}
                    {showRendiciones ? (
                      <IconEye size={14} />
                    ) : (
                      <IconEyeOff size={14} />
                    )}
                  </button>

                  {config.link_drive ? (
                    <button
                      onClick={() =>
                        window.open(
                          `https://drive.google.com/drive/folders/${config.link_drive}`,
                          "_blank",
                        )
                      }
                      className="p-2 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center justify-center gap-2 text-xs font-bold"
                    >
                      <IconDrive size={18} /> Carpeta
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCreateDriveFolder(false)}
                      disabled={loadingConfig}
                      className="p-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 flex items-center gap-2 text-xs font-bold"
                    >
                      {loadingConfig ? (
                        <IconLoader className="animate-spin" />
                      ) : (
                        <IconCloudUpload />
                      )}{" "}
                      Crear Drive
                    </button>
                  )}

                  <div className="w-px h-8 bg-slate-200 mx-2"></div>

                  <div className="relative group inline-flex">
                    <button
                      type="button"
                      onClick={handleAddIndividuals}
                      disabled={rowsLoading || rosterLoading}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors shadow-sm disabled:opacity-50 relative"
                    >
                      <IconBriefcase size={16} />{" "}
                      {rosterLoading ? "..." : "+ Todos los Indiv."}
                      {individualsPendingCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white">
                          {individualsPendingCount}
                        </span>
                      )}
                    </button>
                    {individualsPendingCount > 0 && (
                      <div
                        className="pointer-events-none invisible absolute bottom-full left-1/2 z-[200] flex w-max max-w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 flex-col items-stretch opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100"
                        role="tooltip"
                      >
                        <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-xs text-white shadow-xl">
                          <p className="mb-1.5 border-b border-slate-600 pb-1 text-[11px] font-bold uppercase tracking-wide text-amber-200/90">
                            Pendientes ({individualsPendingCount})
                          </p>
                          <ul className="max-h-64 list-none space-y-0.5 overflow-y-auto pr-1 font-normal leading-snug">
                            {individualsPendingNamesSorted.map((name, i) => (
                              <li key={`${name}-${i}`}>{name}</li>
                            ))}
                          </ul>
                        </div>
                        {/* Puente invisible: mismo ancho que el panel para mantener hover al cruzar desde el botón */}
                        <div
                          className="h-3 w-full min-w-[8rem] shrink-0"
                          aria-hidden
                        />
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setIsAddOpen(!isAddOpen)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700"
                    >
                      <IconUserPlus size={16} /> Agregar...
                    </button>
                    {isAddOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-[100] animate-in zoom-in-95">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                          Agregar Integrante
                        </h4>
                        <MemberSearchSelect
                          options={candidateOptions}
                          value={selectedToAdd}
                          onChange={setSelectedToAdd}
                          placeholder="Buscar..."
                        />
                        <button
                          onClick={() => {
                            addPerson(selectedToAdd);
                            setIsAddOpen(false);
                            setSelectedToAdd(null);
                          }}
                          className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg font-bold"
                        >
                          Confirmar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                  <div className="bg-white px-2 py-1 rounded border border-indigo-100 flex flex-col gap-0.5 shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-indigo-700">
                        BASE:
                      </span>
                      <span className="text-xs font-black text-indigo-800">
                        {vigenteValorDiario > 0
                          ? `$${Number(vigenteValorDiario).toLocaleString("es-AR")}`
                          : "—"}
                      </span>
                      {canAdminVd ? (
                        <button
                          type="button"
                          title="Histórico y vigencias del valor diario"
                          onClick={() => setVigenciaAdminOpen(true)}
                          className="ml-1 text-indigo-600 hover:text-indigo-800"
                        >
                          <IconHistory size={14} />
                        </button>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight max-w-[220px]">
                      Según historial vigente al inicio de la gira. Cada viático
                      prorratea según sus fechas de viaje.
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded border border-amber-100 bg-white shadow-sm cursor-pointer hover:bg-amber-50"
                    onClick={() =>
                      updateConfig(
                        "factor_temporada",
                        config.factor_temporada === 0.3 ? 0 : 0.3,
                      )
                    }
                  >
                    <div
                      className={`w-3 h-3 rounded-sm border flex items-center justify-center ${config.factor_temporada === 0.3 ? "bg-amber-500 border-amber-600" : "border-slate-300"}`}
                    >
                      {config.factor_temporada === 0.3 && (
                        <IconCheck size={10} className="text-white" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-amber-700">
                      TEMP (30%)
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 gap-2 flex-wrap items-center">
                  <input
                    type="text"
                    className="flex-1 min-w-[120px] bg-white border border-slate-200 rounded px-2 py-1 text-sm"
                    placeholder="Motivo"
                    value={config.motivo || ""}
                    onChange={(e) => updateConfig("motivo",  e.target.value)}
                  />
                  <input
                    type="text"
                    className="flex-1 min-w-[120px] bg-white border border-slate-200 rounded px-2 py-1 text-sm"
                    placeholder="Lugar"
                    value={config.lugar_comision || ""}
                    onChange={(e) =>
                      updateConfig("lugar_comision", e.target.value)
                    }
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                      Fecha de Rendición
                    </span>
                    <div className="flex items-center gap-1">
                      <DateInput
                        value={rendicionFechaForInput}
                        onChange={(v) =>
                          updateConfig("rendicion_fecha", v || null)
                        }
                        showDayName={false}
                        className={
                          config.rendicion_fecha
                            ? "h-8 min-w-[140px] border border-blue-300 bg-blue-100 text-sm font-medium text-blue-900 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400 [&_input]:!text-blue-900 [&_span]:!text-blue-400/80"
                            : "h-8 min-w-[140px] border border-slate-200 bg-white text-sm focus-within:ring-2 focus-within:ring-indigo-500"
                        }
                      />
                      {config.rendicion_fecha ? (
                        <button
                          type="button"
                          title="Volver a la fecha por defecto (primer lunes posterior al fin de gira)"
                          className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white p-1 text-slate-400 shadow-sm hover:border-emerald-300 hover:text-emerald-600 hover:shadow"
                          onClick={() => updateConfig("rendicion_fecha", null)}
                        >
                          <IconRefresh size={10} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <ViaticosTable
                rows={viaticosRows}
                selection={selection}
                onSelectAll={selectAll}
                onToggleSelection={toggleSelection}
                onUpdateRow={updateRow}
                onDeleteRow={deleteRow}
                showDatos={showDatos}
                showAnticipo={showAnticipo}
                showTransport={showTransport}
                showExpenses={showExpenses}
                showRendiciones={showRendiciones}
                config={config}
                updatingFields={feedbackIndividual.updatingFields}
                successFields={feedbackIndividual.successFields}
                errorFields={feedbackIndividual.errorFields}
                deletingRows={feedbackIndividual.deletingRows}
                logisticsMap={logisticsMap}
                useHistoricalCalc={useHistoricalCalc}
                onUseHistoricalCalcChange={setUseHistoricalCalc}
                onEditMusician={(integranteId) => {
                  const musician =
                    roster.find((m) => String(m.id) === String(integranteId)) ||
                    viaticosRows.find(
                      (r) => String(r.id_integrante) === String(integranteId),
                    )?.integrantes ||
                    { id: integranteId };
                  setEditingMusician(musician);
                }}
                onDesdoblarViatico={setDesdoblarRow}
                onFusionarTramos={handleFusionarTramos}
                exportRenunciaViaticos={exportRenunciaViaticos}
                onExportRenunciaViaticosChange={setExportRenunciaViaticos}
              />

              {selection.size > 0 && (
                <ViaticosBulkEditPanel
                  selectionSize={selection.size}
                  selectionHasViaticoCero={selectionHasViaticoCero}
                  exportRenunciaViaticos={exportRenunciaViaticos}
                  onExportRenunciaViaticosChange={setExportRenunciaViaticos}
                  onClose={() => setSelection(new Set())}
                  values={batchValues}
                  setValues={setBatchValues}
                  onApply={handleApplyBatch}
                  loading={rowsLoading}
                  onExport={handleExportToDrive}
                  isExporting={isExporting}
                  exportStatus={exportStatus}
                  exportDetail={exportDetail}
                  onSendEmails={handleSendMassiveEmails}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* PANEL INFERIOR: MASIVOS (DESTAQUES) */}
      <div className="bg-white border-b border-slate-200 shadow-sm mb-12">
        <div
          className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setShowMassivePanel(!showMassivePanel)}
        >
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 shrink-0">
              <IconBus className="text-indigo-600" /> Destaques Masivos
            </h2>
            <div
              className="flex items-center gap-2 flex-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              {config?.link_drive ? (
                <a
                  href={`https://drive.google.com/drive/folders/${config.link_drive}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 shrink-0"
                >
                  <IconDrive size={14} /> Carpeta Viáticos
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setDestaquesShowBackup((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                  destaquesShowBackup
                    ? "bg-cyan-100 text-cyan-800 border-cyan-200 shadow-inner"
                    : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm"
                }`}
              >
                <IconHistory size={14} /> Historial{" "}
                {destaquesShowBackup ? (
                  <IconEye size={14} />
                ) : (
                  <IconEyeOff size={14} />
                )}
              </button>
              {showMassivePanel && destaquesSelToolbar.canSelect ? (
                <button
                  type="button"
                  onClick={() =>
                    destaquesPanelRef.current?.togglePendingSelection?.()
                  }
                  className="text-xs text-indigo-600 font-medium hover:underline shrink-0"
                >
                  {destaquesSelToolbar.label}
                </button>
              ) : null}
            </div>
          </div>
          <button type="button" className="text-slate-400 shrink-0">
            {showMassivePanel ? (
              <IconChevronDown size={20} />
            ) : (
              <IconChevronRight size={20} />
            )}
          </button>
        </div>
        {showMassivePanel && (
          <div className="px-6 pb-8 animate-in slide-in-from-top-2 duration-200">
            <DestaquesLocationPanel
              ref={destaquesPanelRef}
              supabase={supabase}
              showBackup={destaquesShowBackup}
              onSelectionToolbarChange={setDestaquesSelToolbar}
              roster={massiveRoster}
              configs={destaquesConfigs}
              destaquesGeneralConfig={destaquesGeneralConfig}
              globalConfig={config}
              giraLabel={
                [giraData?.mes_letra, giraData?.nomenclador, giraData?.nombre_gira]
                  .filter(Boolean)
                  .join(" — ") || "Gira"
              }
              onSaveLocationConfig={updateLocationConfig}
              onUpdateGlobalConfig={updateConfig}
              feedback={feedbackMasivo}
              existingViaticosIds={viaticosRows.map((r) => r.id_integrante)}
              logisticsMap={logisticsMap}
              routeRules={routeRules}
              transportesList={transportes}
              onExportBatch={handleExportLocationBatch}
              isExporting={isExporting}
              exportStatus={exportStatus}
              exportDetail={exportDetail} // PASAMOS EL DETALLE AL COMPONENTE HIJO
              exportFailureLog={exportFailureLog}
              onClearExportFailureLog={() => setExportFailureLog([])}
            />
          </div>
        )}
      </div>

      {notification && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3">
            <div className="bg-green-500 rounded-full p-1 text-slate-900">
              <IconCheck size={14} strokeWidth={3} />
            </div>
            <span className="font-medium text-sm">{notification}</span>
          </div>
        </div>
      )}
      <DesdoblarViaticosModal
        isOpen={!!desdoblarRow}
        onClose={() => setDesdoblarRow(null)}
        row={desdoblarRow}
        summary={summary}
        allEvents={allEvents}
        saving={desdoblarSaving}
        onConfirm={handleConfirmDesdoblar}
      />
      {editingMusician && (
        <MusicianForm
          supabase={supabase}
          musician={editingMusician}
          onSave={refreshViaticosData}
          onCancel={async () => {
            setEditingMusician(null);
            await refreshViaticosData();
          }}
        />
      )}

      <ValorDiarioVigenciaAdminModal
        open={vigenciaAdminOpen}
        onClose={() => setVigenciaAdminOpen(false)}
        vigencias={vigencias}
        onSaved={async () => {
          await refreshVigencias(giraData?.fecha_desde || "");
          await fetchConfigGlobal();
        }}
        client={supabase}
        fechaReferencia={giraData?.fecha_desde || ""}
      />
    </div>
  );
}
