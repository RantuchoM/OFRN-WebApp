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
  IconArrowLeft,
  IconDrive,
  IconBus,
  IconInfo,
  IconCloudUpload,
  IconLoader,
  IconRefresh,
} from "../../../components/ui/Icons";
import { useLogistics } from "../../../hooks/useLogistics";
import ViaticosForm from "./ViaticosForm";
import ViaticosBulkEditPanel from "./ViaticosBulkEditPanel";
import { exportViaticosToPDFForm } from "../../../utils/pdfFormExporter";
import RendicionForm from "./RendicionForm";
import DestaquesLocationPanel from "./DestaquesLocationPanel";
import ViaticosTable from "./ViaticosTable";
import { PDFDocument } from "pdf-lib";
import { Toaster, toast } from "sonner"; // <--- IMPORTANTE
import ConfirmModal from "../../../components/ui/ConfirmModal"; // <--- IMPORTANTE
import ManualTrigger from "../../../components/manual/ManualTrigger"; // Ajusta la ruta según donde estés
// --- UTILIDADES ---
const calculateDaysDiff = (dSal, hSal, dLleg, hLleg) => {
  if (!dSal || !dLleg) return 0;
  const start = new Date(dSal + "T00:00:00");
  const end = new Date(dLleg + "T00:00:00");
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays < 0) return 0;
  if (diffDays === 0) return 0.5;

  const getDepartureFactor = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    const minutes = h * 60 + m;
    if (minutes <= 900) return 1.0;
    if (minutes <= 1260) return 0.75;
    return 0.0;
  };
  const getArrivalFactor = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    const minutes = h * 60 + m;
    if (minutes <= 180) return 0.0;
    if (minutes <= 899) return 0.75;
    return 1.0;
  };
  return (
    Math.max(0, diffDays - 1) +
    getDepartureFactor(hSal || "12:00") +
    getArrivalFactor(hLleg || "12:00")
  );
};

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const getAutoDatosLaborales = (persona) => {
  if (!persona) return { cargo: "", jornada: "" };
  const nombreCompleto =
    `${persona.apellido || ""} ${persona.nombre || ""}`.toUpperCase();
  const esEstable = persona.condicion === "Estable";
  let cargo = "Externo";
  if (nombreCompleto.includes("FRAILE"))
    cargo = "Subsecretario de la Orquesta Filarmónica de Río Negro";
  else if (nombreCompleto.includes("SPELZINI"))
    cargo = "Director de la Orquesta Filarmónica de Río Negro";
  else if (esEstable) cargo = "Agente administrativo";
  let jornada = "";
  if (nombreCompleto.includes("FRAILE") || nombreCompleto.includes("SPELZINI"))
    jornada = "8 A 14";
  else if (esEstable) jornada = "Horas Cátedra";
  return { cargo, jornada };
};

const uint8ArrayToBase64 = (uint8Array) => {
  let binary = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return window.btoa(binary);
};

// --- NUEVA LÓGICA DE CLASIFICACIÓN ---
const normalizeStr = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const esPerfilMasivo = (persona) => {
  // REGLA: Destaque Masivo solo si es ESTABLE Y (MÚSICO o SOLISTA)
  // Todo lo demás (Contratados, Directores, Staff, Invitados, Músicos Contratados) va a Individual
  const condicion = normalizeStr(persona.condicion);
  const rol = normalizeStr(persona.rol_gira || persona.rol); // Usamos rol_gira preferentemente

  const esEstable = condicion === "estable";
  // Si tiene instrumento asignado, asumimos músico si el rol no dice lo contrario
  const esRolMusicoOSolista =
    rol.includes("music") ||
    rol.includes("solista") ||
    (rol === "" && persona.id_instr);

  return esEstable && esRolMusicoOSolista;
};

// --- COMPONENTE BUSCADOR ---
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

// --- COMPONENTE PRINCIPAL ---
export default function ViaticosManager({ supabase, giraId }) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    valor_diario_base: 0,
    factor_temporada: 0,
    motivo: "",
    lugar_comision: "",
    link_drive: "",
  });
  const [latestGlobalValue, setLatestGlobalValue] = useState(0);

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
  } = useLogistics(supabase, giraObj);

  const [viaticosRows, setViaticosRows] = useState([]);
  const [selection, setSelection] = useState(new Set());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState(null);

  const [showDatos, setShowDatos] = useState(true);
  const [showAnticipo, setShowAnticipo] = useState(true);
  const [showTransport, setShowTransport] = useState(false);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showRendiciones, setShowRendiciones] = useState(false);

  const [updatingFields, setUpdatingFields] = useState(new Set());
  const [successFields, setSuccessFields] = useState(new Set());
  const [deletingRows, setDeletingRows] = useState(new Set());
  const [notification, setNotification] = useState(null);
  // En ViaticosManager.jsx, junto a tus otros useState
  const [confirmPromise, setConfirmPromise] = useState(null);
  const [previewRow, setPreviewRow] = useState(null);
  const [previewMode, setPreviewMode] = useState("viatico");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [batchValues, setBatchValues] = useState({
    cargo: "",
    jornada_laboral: "",
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

  const [destaquesConfigs, setDestaquesConfigs] = useState({});
  const [showIndividualPanel, setShowIndividualPanel] = useState(true);
  const [showMassivePanel, setShowMassivePanel] = useState(true);

  // --- CALCULO DE PENDIENTES INDIVIDUALES (Todos los que NO son Masivos) ---
  const individualsPendingCount = useMemo(() => {
    if (!roster || roster.length === 0) return 0;
    const existingIds = new Set(
      viaticosRows.map((r) => String(r.id_integrante)),
    );

    return roster.filter((p) => {
      if (p.estado_gira === "ausente") return false; // No contar ausentes
      if (existingIds.has(String(p.id))) return false; // Ya en tabla

      // Si es Target de Masivo, no lo contamos aquí. Contamos el resto.
      if (esPerfilMasivo(p)) return false;

      return true;
    }).length;
  }, [roster, viaticosRows]);

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
      fetchViaticosData();
    }
  }, [giraId]);

  const fetchViaticosData = async () => {
    if (viaticosRows.length === 0) setLoading(true);
    try {
      const { data: maxGlobalData } = await supabase
        .from("giras_viaticos_config")
        .select("valor_diario_base")
        .order("valor_diario_base", { ascending: false })
        .limit(1)
        .single();
      const maxVal = maxGlobalData?.valor_diario_base || 0;
      setLatestGlobalValue(maxVal);

      const { data: conf } = await supabase
        .from("giras_viaticos_config")
        .select("*")
        .eq("id_gira", giraId)
        .single();
      if (conf) {
        if (!conf.valor_diario_base || conf.valor_diario_base === 0) {
          setConfig({ ...conf, valor_diario_base: maxVal });
          if (maxVal > 0)
            await supabase
              .from("giras_viaticos_config")
              .update({ valor_diario_base: maxVal })
              .eq("id_gira", giraId);
        } else {
          setConfig(conf);
        }
      } else {
        const { data: newConf } = await supabase
          .from("giras_viaticos_config")
          .insert([{ id_gira: giraId, valor_diario_base: maxVal }])
          .select()
          .single();
        if (newConf) setConfig(newConf);
      }

      let { data: detalles, error } = await supabase
        .from("giras_viaticos_detalle")
        .select(
          `*, integrantes:id_integrante(id, nombre, apellido, mail, dni, firma, id_instr, documentacion, docred)`,
        )
        .eq("id_gira", giraId)
        .order("id");
      if (error || !detalles) {
        const res = await supabase
          .from("giras_viaticos_detalle")
          .select("*")
          .eq("id_gira", giraId)
          .order("id");
        detalles = res.data;
      }
      setViaticosRows(detalles || []);

      const { data: locConfigs } = await supabase
        .from("giras_destaques_config")
        .select("*")
        .eq("id_gira", giraId);
      const locMap = {};
      locConfigs?.forEach((c) => {
        locMap[c.id_localidad] = c;
      });
      setDestaquesConfigs(locMap);
    } catch (error) {
      console.error("Critical error fetching viaticos:", error);
    } finally {
      setLoading(false);
    }
  };

  const logisticsMap = useMemo(() => {
    if (!summary) return {};
    const map = {};
    summary.forEach((person) => {
      const transports = person.logistics?.transports || [];
      if (transports.length === 0) return;

      let minSalida = null,
        maxLlegada = null;

      transports.forEach((t) => {
        let nombreFinal = t.nombre || "Transporte";
        if (t.detalle && t.detalle.trim() !== "")
          nombreFinal = `${nombreFinal} - ${t.detalle}`;

        // --- LOGICA DE SALIDA ---
        if (t.subidaData) {
          const dateTimeStr = `${t.subidaData.fecha}T${t.subidaData.hora || "00:00"}`;
          const dateObj = new Date(dateTimeStr);
          if (!minSalida || dateObj < minSalida.dt) {
            minSalida = {
              dt: dateObj,
              fecha: t.subidaData.fecha,
              hora: t.subidaData.hora ? t.subidaData.hora.slice(0, 5) : "00:00",
              lugar: t.subidaData.nombre_localidad || "Origen",
              transporte: nombreFinal,
              // CAPTURAMOS LA PATENTE AQUÍ (Viene del join de logística)
              patente: t.patente || t.transporteData?.patente || "",
            };
          }
        }

        // --- LOGICA DE LLEGADA ---
        if (t.bajadaData) {
          const dateTimeStr = `${t.bajadaData.fecha}T${t.bajadaData.hora || "00:00"}`;
          const dateObj = new Date(dateTimeStr);
          if (!maxLlegada || dateObj > maxLlegada.dt) {
            maxLlegada = {
              dt: dateObj,
              fecha: t.bajadaData.fecha,
              hora: t.bajadaData.hora ? t.bajadaData.hora.slice(0, 5) : "00:00",
              lugar: t.bajadaData.nombre_localidad || "Destino",
              transporte: nombreFinal,
            };
          }
        }
      });

      if (minSalida || maxLlegada) {
        map[person.id] = {
          fecha_salida: minSalida?.fecha,
          hora_salida: minSalida?.hora,
          transporte_salida: minSalida?.transporte,
          lugar_salida: minSalida?.lugar,
          patente: minSalida?.patente, // <--- LA PASAMOS AL MAPA FINAL
          fecha_llegada: maxLlegada?.fecha,
          hora_llegada: maxLlegada?.hora,
          transporte_llegada: maxLlegada?.transporte,
          lugar_llegada: maxLlegada?.lugar,
        };
      }
    });
    return map;
  }, [summary]);
  function calculateRow(row, currentConfig) {
    const base = parseFloat(currentConfig?.valor_diario_base || 0);
    const dias = parseFloat(row.dias_computables || 0);
    const rawPct =
      row.porcentaje === 0 || row.porcentaje ? row.porcentaje : 100;
    const pct = parseFloat(String(rawPct).replace("%", "")) / 100;
    const basePorcentaje = round2(base * pct);
    const factorTempGlobal = parseFloat(currentConfig?.factor_temporada || 0);
    const valorDiarioCalc = round2(basePorcentaje * (1 + factorTempGlobal));
    const subtotal = round2(dias * valorDiarioCalc);
    const gastos =
      parseFloat(row.gastos_movilidad || 0) +
      parseFloat(row.gasto_combustible || 0) +
      parseFloat(row.gasto_otros || 0) +
      parseFloat(row.gastos_capacit || 0) +
      parseFloat(row.gastos_movil_otros || 0) +
      parseFloat(row.gasto_alojamiento || 0) +
      parseFloat(row.gasto_pasajes || 0) +
      parseFloat(row.transporte_otros || 0);
    return { valorDiarioCalc, subtotal, totalFinal: round2(subtotal + gastos) };
  }

  const activeRows = useMemo(() => {
    return viaticosRows
      .map((row) => {
        const enRoster = (roster || []).find(
          (p) => String(p.id) === String(row.id_integrante),
        );
        const esBajaLogica = !enRoster || enRoster.estado_gira === "ausente";
        let persona = enRoster;
        const rawIntegrantes = row.integrantes;
        const joinedPersona = Array.isArray(rawIntegrantes)
          ? rawIntegrantes[0]
          : rawIntegrantes;
        if (!persona && rawIntegrantes) persona = joinedPersona;

        const logData = logisticsMap[row.id_integrante];
        const fechaSal = logData?.fecha_salida || null;
        const horaSal = logData?.hora_salida || null;
        const fechaLleg = logData?.fecha_llegada || null;
        const horaLleg = logData?.hora_llegada || null;

        const diasAuto = calculateDaysDiff(
          fechaSal,
          horaSal,
          fechaLleg,
          horaLleg,
        );

        const rowWithLogistics = {
          ...row,
          fecha_salida: fechaSal,
          hora_salida: horaSal,
          fecha_llegada: fechaLleg,
          hora_llegada: horaLleg,
          dias_computables: diasAuto,
        };

        const { valorDiarioCalc, subtotal, totalFinal } = calculateRow(
          rowWithLogistics,
          config,
        );

        return {
          ...rowWithLogistics,
          nombre: persona?.nombre || "Desconocido",
          apellido: persona?.apellido || `(ID: ${row.id_integrante})`,
          rol_roster: persona?.rol_gira || persona?.rol || "",
          cargo: row.cargo || persona?.rol_gira || "Músico",
          firma: persona ? persona.firma : null,
          dni: persona ? persona.dni : null,
          legajo: persona ? persona.legajo : "",
          ciudad_origen: persona?.localidades?.localidad || "",
          mail: persona?.mail || "",
          link_documentacion: joinedPersona?.documentacion || "",
          link_docred: joinedPersona?.docred || "",

          noEstaEnRoster: esBajaLogica,
          valorDiarioCalc,
          subtotal,
          totalFinal,
        };
      })
      .sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
  }, [viaticosRows, roster, config, logisticsMap]);

  // --- FILTRO: Opciones Buscador (Solo NO Masivos y NO Ausentes) ---
  // --- FILTRO: Opciones Buscador (Solo PRESENTES y NO cargados aún) ---
  const candidateOptions = useMemo(() => {
    if (!roster || roster.length === 0) return [];

    // IDs de personas que ya tienen una fila en viaticos
    const existingIds = new Set(
      viaticosRows.map((r) => String(r.id_integrante)),
    );

    return roster
      .filter((p) => {
        const estaPresente = p.estado_gira !== "ausente";
        const noEstaCargado = !existingIds.has(String(p.id));
        return estaPresente && noEstaCargado;
      })
      .map((p) => ({
        value: p.id,
        label: `${p.apellido || ""}, ${p.nombre || ""}`,
        subLabel: p.rol_gira || p.rol || "Sin Rol",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [roster, viaticosRows]);
  // --- FILTRO: Roster Masivo (Solo Masivos y NO Ausentes) ---
  const massiveRoster = useMemo(() => {
    return (roster || []).filter(
      (p) => esPerfilMasivo(p) && p.estado_gira !== "ausente",
    );
  }, [roster]);
  // Estado para el modal de confirmación
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

  // --- FUNCIÓN REFACTORIZADA CON TOAST ---
  const handleSendMassiveEmails = async (skipConfirm = false) => {
    // 1. Validar selección
    if (selection.size === 0) {
      toast.error("No hay nadie seleccionado");
      return;
    }

    const selectedData = activeRows.filter((r) =>
      selection.has(r.id_integrante),
    );

    // Si NO es automático (skipConfirm false) y NO estamos mostrando el modal,
    // abrimos el modal y detenemos la ejecución aquí.
    if (!skipConfirm && !showEmailConfirm) {
      setShowEmailConfirm(true);
      return;
    }

    // --- INICIO DEL PROCESO (Feedback Visual con Toast) ---
    // Creamos un ID de toast para actualizarlo mientras progresa
    const toastId = toast.loading("Iniciando proceso de envío...");
    setIsExporting(true);

    let enviados = 0;
    let errores = 0;

    try {
      for (const [index, persona] of selectedData.entries()) {
        // Actualizamos el toast con el progreso
        toast.loading(
          `Enviando ${index + 1} de ${selectedData.length}: ${persona.apellido}...`,
          {
            id: toastId, // Usamos el mismo ID para que no se acumulen
          },
        );

        if (!persona.mail) {
          console.warn(`Omitiendo a ${persona.apellido}: No tiene mail.`);
          errores++;
          continue;
        }

        const detallePayload = {
          // ... (tu mapeo de datos sigue igual) ...
          dias_computables: persona.dias_computables,
          porcentaje: persona.porcentaje,
          subtotal_viatico: persona.subtotal,
          total_percibir: persona.totalFinal,
          gasto_combustible: persona.gasto_combustible,
          gasto_pasajes: persona.gasto_pasajes,
          gasto_alojamiento: persona.gasto_alojamiento,
          gasto_otros: persona.gasto_otros,
          gastos_movilidad: persona.gastos_movilidad,
          gastos_movil_otros: persona.gastos_movil_otros,
          gastos_capacit: persona.gastos_capacit,
        };

        const { error } = await supabase.functions.invoke("mails_produccion", {
          body: {
            action: "enviar_mail",
            templateId: "viaticos_simple",
            email: persona.mail,
            nombre: persona.nombre,
            gira: giraData?.nombre_gira,
            detalle: detallePayload,
          },
        });

        if (error) {
          console.error(`Error enviando a ${persona.apellido}:`, error);
          errores++;
        } else {
          enviados++;
        }
      }

      // --- RESULTADO FINAL ---
      if (errores === 0) {
        toast.success(`¡Listo! Se enviaron ${enviados} correos exitosamente.`, {
          id: toastId,
          duration: 5000,
        });
      } else {
        toast.warning(`Proceso finalizado con observaciones.`, {
          id: toastId,
          description: `Enviados: ${enviados} - Fallidos/Sin Mail: ${errores}`,
          duration: 8000,
        });
      }

      if (!skipConfirm) setSelection(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Error crítico en el proceso de envío", { id: toastId });
    } finally {
      setIsExporting(false);
      if (!skipConfirm) setShowEmailConfirm(false); // Cierra modal si estaba abierto
    }
  };

  const updateRow = async (id, field, value) => {
    const fieldKey = `${id}-${field}`;
    setUpdatingFields((prev) => new Set(prev).add(fieldKey));

    if (successFields.has(fieldKey))
      setSuccessFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });

    const currentRow = viaticosRows.find((r) => r.id === id);
    if (!currentRow) return;

    // --- NUEVA LÓGICA DE SANITIZACIÓN ---
    let valueToSave = value;
    if (field === "porcentaje") {
      // Eliminamos el % si el usuario lo escribió y convertimos a número
      const cleanValue = String(value).replace("%", "").trim();
      valueToSave = cleanValue === "" ? 100 : parseFloat(cleanValue);

      if (isNaN(valueToSave)) valueToSave = 100;
    }
    // ------------------------------------

    const updatedRow = { ...currentRow, [field]: valueToSave };
    setViaticosRows((prev) => prev.map((r) => (r.id === id ? updatedRow : r)));

    try {
      const payload = { [field]: valueToSave };
      const { error } = await supabase
        .from("giras_viaticos_detalle")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      setSuccessFields((prev) => new Set(prev).add(fieldKey));
      setTimeout(() => {
        setSuccessFields((prev) => {
          const next = new Set(prev);
          next.delete(fieldKey);
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error("Error al guardar:", err);
      // Opcional: alert("No se pudo guardar el valor 100. Verifique la conexión.");
      fetchViaticosData(); // Revertir cambios locales si falla
    } finally {
      setUpdatingFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
    }
  };
  const handleDeleteRow = async (id) => {
    if (!confirm(`¿Eliminar de la lista de viáticos?`)) return;
    setDeletingRows((prev) => new Set(prev).add(id));
    try {
      await supabase.from("giras_viaticos_detalle").delete().eq("id", id);
      setViaticosRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingRows((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };
  const handleApplyBatch = async () => {
    setLoading(true);
    try {
      const updates = {};
      // Dentro de handleApplyBatch, modifica el forEach:
      Object.keys(batchValues).forEach((key) => {
        const val = batchValues[key];
        if (val !== "" && val !== null && val !== false) {
          // Si es porcentaje, lo limpiamos también aquí
          if (key === "porcentaje") {
            updates[key] = parseFloat(String(val).replace("%", "")) || 100;
          } else {
            updates[key] = val;
          }
        }
      });
      if (Object.keys(updates).length === 0) {
        alert("No has ingresado ningún valor.");
        setLoading(false);
        return;
      }
      const selectedIds = Array.from(selection);
      const promises = selectedIds.map(async (integranteId) => {
        const row = viaticosRows.find((r) => r.id_integrante === integranteId);
        if (!row) return;
        await supabase
          .from("giras_viaticos_detalle")
          .update(updates)
          .eq("id", row.id);
      });
      await Promise.all(promises);
      await fetchViaticosData();
      setSelection(new Set());
      alert("Aplicado.");
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleAddPerson = async () => {
    if (!selectedToAdd) return;
    setLoading(true);
    const persona = roster.find((p) => p.id === selectedToAdd);
    if (!persona) {
      alert("Error: No se encontró la persona.");
      setLoading(false);
      return;
    }
    const { cargo, jornada } = getAutoDatosLaborales(persona);
    try {
      const { data, error } = await supabase
        .from("giras_viaticos_detalle")
        .insert([
          {
            id_gira: giraId,
            id_integrante: selectedToAdd,
            dias_computables: 0,
            porcentaje: 100,
            cargo,
            jornada_laboral: jornada,
          },
        ])
        .select();
      if (error) throw error;
      setViaticosRows((prev) => [...prev, ...data]);
      setSelectedToAdd(null);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- AGREGAR INDIVIDUALES MASIVAMENTE ---
  const handleAddIndividuals = async () => {
    setLoading(true);
    try {
      if (!roster || roster.length === 0) {
        alert("Roster vacío.");
        setLoading(false);
        return;
      }
      const existingIds = new Set(
        viaticosRows.map((r) => String(r.id_integrante)),
      );
      const toAdd = [];
      const seen = new Set();

      roster.forEach((p) => {
        const idStr = String(p.id);
        // FILTRO ESTRICTO: NO Masivo, NO Ausente, NO Existente
        if (
          !esPerfilMasivo(p) &&
          p.estado_gira !== "ausente" &&
          !existingIds.has(idStr) &&
          !seen.has(idStr)
        ) {
          seen.add(idStr);
          const { cargo, jornada } = getAutoDatosLaborales(p);
          toAdd.push({
            id_gira: giraId,
            id_integrante: p.id,
            dias_computables: 0,
            porcentaje: 100,
            cargo: cargo !== "Externo" ? cargo : "Staff / Contratado",
            jornada_laboral: jornada,
          });
        }
      });

      if (toAdd.length === 0) {
        alert("No se encontraron integrantes individuales pendientes.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("giras_viaticos_detalle")
        .insert(toAdd)
        .select();
      if (error) throw error;
      setViaticosRows((prev) => [...prev, ...data]);
      setIsAddOpen(false);
      alert(`Se agregaron ${toAdd.length} integrantes.`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selection);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelection(newSet);
  };
  const selectAll = () => {
    if (selection.size === activeRows.length) setSelection(new Set());
    else setSelection(new Set(activeRows.map((r) => r.id_integrante)));
  };

  const updateConfig = (key, val) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, [key]: val };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const changesToSave = pendingUpdatesRef.current;
      pendingUpdatesRef.current = {};
      try {
        await supabase
          .from("giras_viaticos_config")
          .update(changesToSave)
          .eq("id_gira", giraId);
      } catch (err) {
        console.error("Error guardando config:", err);
      }
    }, 1000);
  };

  const uploadPdfToDrive = async (pdfBytes, fileName, parentId) => {
    const fileBase64 = uint8ArrayToBase64(pdfBytes);
    const { data, error } = await supabase.functions.invoke("manage-drive", {
      body: {
        action: "upload_file",
        fileBase64,
        fileName,
        parentId,
        mimeType: "application/pdf",
      },
    });
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    return data;
  };

  const fetchPdfFromDrive = async (driveUrl) => {
    try {
      // NUEVA LÓGICA: Si es Supabase, descargamos directo. Si no, usamos la Edge Function.
      if (driveUrl.includes("supabase.co")) {
        const res = await fetch(driveUrl);
        const arrayBuffer = await res.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }

      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "get_file_content", sourceUrl: driveUrl },
      });

      if (error) throw error;
      if (!data || !data.success)
        throw new Error(data?.error || "Error descargando archivo de Drive");

      const binaryString = window.atob(data.fileBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (err) {
      console.error("Error fetchPdfFromDrive:", err);
      return null;
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

    const updates = dataList
      .filter((r) => r.id)
      .map((row) => {
        return supabase
          .from("giras_viaticos_detalle")
          .update({
            fecha_ultima_exportacion: now,
            backup_fecha_salida: row.fecha_salida,
            backup_hora_salida: row.hora_salida,
            backup_fecha_llegada: row.fecha_llegada,
            backup_hora_llegada: row.hora_llegada,
            backup_dias_computables: row.dias_computables,
          })
          .eq("id", row.id);
      });
    await Promise.all(updates);

    const total = dataList.length;
    const totalLocs = involvedLocationIds.length;

    if (!options.unifyFiles) {
      let count = 0;
      for (const personData of dataList) {
        count++;

        let locProgressStr = "";
        if (totalLocs > 0) {
          const currentLocId = personData.id_localidad || "unknown";
          const locIndex = involvedLocationIds.findIndex(
            (id) => String(id) === String(currentLocId),
          );
          if (locIndex !== -1) {
            locProgressStr = ` - Loc ${locIndex + 1}/${totalLocs}`;
          }
        }

        const prefix = `[${count}/${total}${locProgressStr}]`;
        const nameSafe = `${personData.apellido}, ${personData.nombre}`;
        const singleDataArray = [personData];

        if (options.viatico) {
          setExportStatus(`${prefix} Subiendo Viático: ${nameSafe}...`);
          const pdfBytes = await exportViaticosToPDFForm(
            giraData,
            singleDataArray,
            config,
            "viatico",
          );
          await uploadPdfToDrive(
            pdfBytes,
            `${nameSafe} - Viático.pdf`,
            folderId,
          );
        }
        if (options.rendicion) {
          setExportStatus(`${prefix} Subiendo Rendición: ${nameSafe}...`);
          const pdfBytes = await exportViaticosToPDFForm(
            giraData,
            singleDataArray,
            config,
            "rendicion",
          );
          await uploadPdfToDrive(
            pdfBytes,
            `${nameSafe} - Rendición.pdf`,
            folderId,
          );
        }
        if (options.destaque) {
          setExportStatus(`${prefix} Subiendo Destaque: ${nameSafe}...`);
          const pdfBytes = await exportViaticosToPDFForm(
            giraData,
            singleDataArray,
            config,
            "destaque",
          );
          await uploadPdfToDrive(
            pdfBytes,
            `${nameSafe} - Destaque.pdf`,
            folderId,
          );
        }
        if (options.docComun && personData.link_documentacion) {
          setExportStatus(`${prefix} Transfiriendo Doc: ${nameSafe}...`);

          const isBucket =
            personData.link_documentacion.includes("supabase.co");

          await supabase.functions.invoke("manage-drive", {
            body: {
              // Si es Bucket, usamos una nueva lógica que implementaremos en la Edge Function
              // Si no, seguimos usando copy_file
              action: isBucket ? "upload_from_url" : "copy_file",
              sourceUrl: personData.link_documentacion,
              targetParentId: folderId,
              newName: `${nameSafe} - Documentación`,
            },
          });
        }
        if (options.docReducida && personData.link_docred) {
          setExportStatus(`${prefix} Copiando DocRed: ${nameSafe}...`);
          await supabase.functions.invoke("manage-drive", {
            body: {
              action: "copy_file",
              sourceUrl: personData.link_docred,
              targetParentId: folderId,
              newName: `${nameSafe} - Doc. Reducida`,
            },
          });
        }
      }
    } else {
      setExportStatus("Iniciando fusión maestra...");
      const masterDoc = await PDFDocument.create();
      let pagesAdded = 0;
      let count = 0;

      for (const personData of dataList) {
        count++;

        let locProgressStr = "";
        if (totalLocs > 0) {
          const currentLocId = personData.id_localidad || "unknown";
          const locIndex = involvedLocationIds.findIndex(
            (id) => String(id) === String(currentLocId),
          );
          if (locIndex !== -1) {
            locProgressStr = ` - Loc ${locIndex + 1}/${totalLocs}`;
          }
        }

        const prefix = `[${count}/${total}${locProgressStr}]`;
        setExportStatus(`${prefix} Unificando: ${personData.apellido}...`);

        const singleData = [personData];
        const mergePdfBytes = async (bytes) => {
          try {
            const srcDoc = await PDFDocument.load(bytes);
            const copiedPages = await masterDoc.copyPages(
              srcDoc,
              srcDoc.getPageIndices(),
            );
            copiedPages.forEach((page) => masterDoc.addPage(page));
            pagesAdded++;
          } catch (e) {
            console.error("Error merging PDF:", e);
          }
        };

        if (options.viatico)
          await mergePdfBytes(
            await exportViaticosToPDFForm(
              giraData,
              singleData,
              config,
              "viatico",
            ),
          );
        if (options.destaque)
          await mergePdfBytes(
            await exportViaticosToPDFForm(
              giraData,
              singleData,
              config,
              "destaque",
            ),
          );
        if (options.rendicion)
          await mergePdfBytes(
            await exportViaticosToPDFForm(
              giraData,
              singleData,
              config,
              "rendicion",
            ),
          );
        if (options.docComun && personData.link_documentacion) {
          setExportStatus(
            `${prefix} Descargando Doc de ${personData.apellido}...`,
          );
          const bytes = await fetchPdfFromDrive(personData.link_documentacion);
          if (bytes) await mergePdfBytes(bytes);
        }
        if (options.docReducida && personData.link_docred) {
          setExportStatus(
            `${prefix} Descargando DocRed de ${personData.apellido}...`,
          );
          const bytes = await fetchPdfFromDrive(personData.link_docred);
          if (bytes) await mergePdfBytes(bytes);
        }
      }

      if (pagesAdded > 0) {
        setExportStatus("Subiendo PDF Maestro a Drive...");
        const masterBytes = await masterDoc.save();
        await uploadPdfToDrive(
          masterBytes,
          `Exportación Lote - ${giraName} - ${dateStr}.pdf`,
          folderId,
        );
      } else {
        alert("No se generó ninguna página válida.");
      }
    }
  };
  // --- FUNCIÓN PARA INICIALIZAR CARPETA ---
  // --- FUNCIÓN PARA INICIALIZAR CARPETA (MODIFICADA PARA RETORNAR ID) ---
  const handleCreateDriveFolder = async (silent = false) => {
    if (!giraId) return null;
    if (!silent) setLoading(true); // Solo muestra loading si es llamada manual

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

      // Actualizamos estado local
      setConfig((prev) => ({ ...prev, link_drive: data.folderId }));

      if (!silent) alert("Carpeta de Drive creada exitosamente.");

      // IMPORTANTE: Retornamos el ID para que otras funciones lo usen
      return data.folderId;
    } catch (err) {
      console.error(err);
      alert("Error creando carpeta: " + err.message);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  };const handleExportToDrive = async (options) => {
    // 1. Validaciones con Toast
    if (selection.size === 0) {
      toast.error("Selecciona al menos un integrante.");
      return;
    }

    const hasSelection =
      options.viatico ||
      options.rendicion ||
      options.destaque ||
      options.docComun ||
      options.docReducida;

    if (!hasSelection) {
      toast.error("Selecciona al menos un tipo de documento para generar.");
      return;
    }

    // 2. PREGUNTA ESTÉTICA (Promesa que espera al Modal)
    // El código se "pausa" aquí hasta que el usuario responda en el Modal
    const shouldSendEmails = await new Promise((resolve) => {
      setConfirmPromise({
        isOpen: true,
        title: "Opciones de Salida",
        message: "¿Deseas enviar también los correos electrónicos de notificación a los seleccionados automáticamente al finalizar la exportación?",
        confirmText: "Sí, enviar correos",
        cancelText: "No, solo Drive",
        resolve, // Guardamos la función resolve para llamarla desde el modal
      });
    });

    // 3. Lógica de Carpeta Drive (Creación automática si no existe)
    let driveFolderId = config?.link_drive;

    if (!driveFolderId) {
      // Reutilizamos el modal para preguntar si crear carpeta (opcional, o usar confirm nativo aquí si prefieres simplificar)
      // Por simplicidad en este paso, asumimos que si no hay carpeta, preguntamos con native confirm o lo creamos directo.
      // Si quieres usar el modal estético aquí también, necesitarías anidar promesas, pero usemos window.confirm solo para este caso borde técnico:
      const confirmCreate = window.confirm(
        "No hay carpeta de Drive asignada.\n¿Crearla ahora automáticamente?"
      );
      
      if (!confirmCreate) return;

      const toastId = toast.loading("Creando carpeta en Drive...");
      const newId = await handleCreateDriveFolder(true); // true = silent mode
      
      if (!newId) {
        toast.error("No se pudo crear la carpeta.", { id: toastId });
        return;
      }
      driveFolderId = newId;
      toast.dismiss(toastId);
    }

    // 4. Inicio del Proceso
    const toastId = toast.loading("Iniciando exportación...");
    setExportStatus("Generando documentos PDF...");
    setIsExporting(true);

    try {
      const selectedData = activeRows.filter((r) =>
        selection.has(r.id_integrante),
      );

      // --- PASO A: EXPORTAR A DRIVE ---
      // Actualizamos el mensaje del toast existente
      toast.loading(`Generando ${selectedData.length} expedientes y subiendo a Drive...`, { id: toastId });
      
      await processExportList(selectedData, driveFolderId, options, []);

      // --- PASO B: ENVIAR MAILS (Si el usuario dijo que SÍ) ---
      if (shouldSendEmails) {
        setExportStatus("Enviando correos de notificación...");
        toast.loading("Exportación lista. Iniciando envío de correos...", { id: toastId });
        
        // Llamamos a la función de mails en modo "skipConfirm" (true)
        await handleSendMassiveEmails(true); 
      }

      // 5. Finalización Exitosa
      const successMessage = shouldSendEmails
        ? "¡Proceso completo! Archivos subidos y correos enviados."
        : "¡Exportación a Drive finalizada correctamente!";

      toast.success(successMessage, { 
        id: toastId, // Transformamos el toast de carga en éxito
        duration: 5000 
      });

      setSelection(new Set()); // Limpiamos selección
      
      // Abrir carpeta
      window.open(
        `https://drive.google.com/drive/folders/${driveFolderId}`,
        "_blank",
      );

    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error: " + err.message, { id: toastId });
    } finally {
      setIsExporting(false);
      setExportStatus("");
    }
  };

  const handleExportLocationBatch = async (
    peopleArray,
    folderId,
    options,
    locationIdOrIds,
  ) => {
    if (!peopleArray || peopleArray.length === 0)
      return alert("No hay personas en esta localidad.");
    const targetFolderId = folderId || config.link_drive;
    if (!targetFolderId) return alert("Error: No se especificó carpeta.");

    setExportStatus("Preparando lote de localidad...");
    setIsExporting(true);

    try {
      const locationIds = Array.isArray(locationIdOrIds)
        ? locationIdOrIds
        : locationIdOrIds
          ? [locationIdOrIds]
          : [];
      const officialRulesByLoc = {};

      for (const locId of locationIds) {
        const locRule = routeRules?.find(
          (r) =>
            r.alcance === "Localidad" &&
            String(r.id_localidad) === String(locId) &&
            r.evento_subida,
        );
        let fechaSal = null;
        let horaSal = null;
        let fechaLleg = null;
        let horaLleg = null;

        if (locRule && locRule.evento_subida) {
          fechaSal = locRule.evento_subida.fecha;
          horaSal = locRule.evento_subida.hora_inicio;
          const evtLlegada = locRule.evento_bajada;
          fechaLleg = evtLlegada?.fecha || null;
          horaLleg = evtLlegada?.hora_inicio || null;
        }

        const referencePerson = peopleArray.find(
          (p) => String(p.id_localidad || "unknown") === String(locId),
        );

        if (referencePerson && referencePerson.travelData) {
          if (!fechaSal) {
            fechaSal = referencePerson.travelData.fecha_salida;
            horaSal = referencePerson.travelData.hora_salida;
          }
          if (!fechaLleg) {
            fechaLleg = referencePerson.travelData.fecha_llegada;
            horaLleg = referencePerson.travelData.hora_llegada;
          }
        }

        officialRulesByLoc[locId] = { fechaSal, horaSal, fechaLleg, horaLleg };

        const diasCalc = calculateDaysDiff(
          fechaSal,
          horaSal,
          fechaLleg,
          horaLleg,
        );

        const payload = {
          id_gira: giraId,
          id_localidad: locId,
          fecha_ultima_exportacion: new Date().toISOString(),
          backup_fecha_salida: fechaSal,
          backup_hora_salida: horaSal,
          backup_fecha_llegada: fechaLleg,
          backup_hora_llegada: horaLleg,
          backup_dias_computables: diasCalc,
        };
        const existingConfig = Object.values(destaquesConfigs).find(
          (c) => String(c.id_localidad) === String(locId),
        );
        if (existingConfig)
          await supabase
            .from("giras_destaques_config")
            .update(payload)
            .eq("id", existingConfig.id);
        else await supabase.from("giras_destaques_config").insert([payload]);
      }

      await fetchViaticosData();

      const richData = peopleArray.map((p) => {
        const existingRow = activeRows.find((r) => r.id_integrante === p.id);
        const pLocId = p.id_localidad || "unknown";
        const rule = officialRulesByLoc[pLocId] || {};

        const finalFechaSal = rule.fechaSal || p.travelData?.fecha_salida;
        const finalHoraSal = rule.horaSal || p.travelData?.hora_salida;
        const finalFechaLleg = rule.fechaLleg || p.travelData?.fecha_llegada;
        const finalHoraLleg = rule.horaLleg || p.travelData?.hora_llegada;

        const diasOficiales = calculateDaysDiff(
          finalFechaSal,
          finalHoraSal,
          finalFechaLleg,
          finalHoraLleg,
        );

        if (existingRow) {
          return {
            ...existingRow,
            fecha_salida: finalFechaSal,
            hora_salida: finalHoraSal,
            fecha_llegada: finalFechaLleg,
            hora_llegada: finalHoraLleg,
            dias_computables: diasOficiales,
          };
        }

        return {
          ...p,
          nombre: p.nombre,
          apellido: p.apellido,
          dni: p.dni,
          legajo: p.legajo,
          cargo: "Agente administrativo",
          jornada_laboral: "Horas Cátedra",
          link_documentacion: p.documentacion,
          link_docred: p.docred,
          fecha_salida: finalFechaSal,
          hora_salida: finalHoraSal,
          fecha_llegada: finalFechaLleg,
          hora_llegada: finalHoraLleg,
          dias_computables: diasOficiales,
          valorDiarioCalc: 0,
          subtotal: 0,
          totalFinal: 0,
        };
      });

      await processExportList(richData, targetFolderId, options, locationIds);
      setNotification("¡Lote exportado!");
    } catch (err) {
      console.error(err);
      alert("Error exportando lote: " + err.message);
    } finally {
      setIsExporting(false);
      setExportStatus("");
      setTimeout(() => setNotification(null), 3000);
    }
  };
  const handleSaveLocationConfig = async () => {};

  if (previewRow) {
    return (
      <div className="h-full bg-white p-4 overflow-auto animate-in fade-in duration-200">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex justify-between mb-4">
            <button
              onClick={() => setPreviewRow(null)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold"
            >
              <IconArrowLeft size={16} /> Volver a la lista
            </button>
            <div className="text-sm font-bold text-slate-400 uppercase">
              VISTA PREVIA DE PANTALLA
            </div>
          </div>
          {previewMode === "rendicion" ? (
            <RendicionForm data={previewRow} configData={config} />
          ) : (
            <ViaticosForm
              onBack={() => setPreviewRow(null)}
              initialData={previewRow}
              configData={config}
              hideAmounts={previewMode === "destaque"}
              hideToolbar={true}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
      <Toaster position="top-center" richColors closeButton />
      <ConfirmModal
        isOpen={confirmPromise?.isOpen}
        onClose={() => {
          // Si cierra sin elegir (clic afuera o X), asumimos que NO quiere mails, pero SÍ exportar
          // O puedes cancelar todo llamando a resolve(null) y manejándolo arriba.
          // Aquí asumimos "No enviar mails, solo exportar":
          confirmPromise?.resolve(false);
          setConfirmPromise(null);
        }}
        title="Opciones de Salida"
        message="¿Deseas enviar también los correos electrónicos de notificación a los seleccionados automáticamente al finalizar la exportación?"
        confirmText="Sí, enviar correos"
        cancelText="No, solo Drive"
        onConfirm={() => {
          confirmPromise?.resolve(true); // Resuelve la promesa con TRUE
          setConfirmPromise(null);
        }}
      />
      {/* 2. EL MODAL (Para confirmar el envío de mails) */}
      <ConfirmModal
        isOpen={showEmailConfirm}
        onClose={() => setShowEmailConfirm(false)}
        onConfirm={() => handleSendMassiveEmails(true)}
        title="Enviar Notificaciones"
        message={`Estás a punto de enviar ${selection.size} correos electrónicos...`}
        confirmText="Enviar Correos"
      />
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
                    className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showExpenses ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"}`}
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
                  {/* --- AQUÍ ESTÁ LA LÓGICA DRIVE --- */}
                  {config.link_drive ? (
                    <button
                      onClick={() =>
                        window.open(
                          `https://drive.google.com/drive/folders/${config.link_drive}`,
                          "_blank",
                        )
                      }
                      className="p-2 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center justify-center gap-2 text-xs font-bold"
                      title="Abrir carpeta de Drive"
                    >
                      <IconDrive size={18} /> Carpeta
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCreateDriveFolder(false)} // false = no silencioso (activa loading)
                      disabled={loading}
                      className={`p-2 rounded-lg border border-indigo-200 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                        loading
                          ? "bg-indigo-100 text-indigo-400 cursor-wait"
                          : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      }`}
                      title="Crear carpeta en Drive para esta gira"
                    >
                      {loading ? (
                        <>
                          <IconLoader className="animate-spin" size={14} />
                          <span>Creando...</span>
                        </>
                      ) : (
                        <>
                          <IconCloudUpload size={18} />
                          <span>Crear Drive</span>
                        </>
                      )}
                    </button>
                  )}
                  {/* --------------------------------- */}
                  <div className="w-px h-8 bg-slate-200 mx-2"></div>
                  {/* BOTÓN INDIVIDUALES CON BADGE */}
                  <button
                    onClick={handleAddIndividuals}
                    disabled={loading || rosterLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors shadow-sm disabled:opacity-50 relative"
                  >
                    <IconBriefcase size={16} />
                    {rosterLoading ? "..." : "+ Todos los Indiv."}
                    {individualsPendingCount > 0 && !rosterLoading && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm border border-white">
                        {individualsPendingCount}
                      </span>
                    )}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setIsAddOpen(!isAddOpen)}
                      disabled={rosterLoading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all disabled:opacity-50 ${isAddOpen ? "bg-slate-200 text-slate-800" : "bg-slate-800 text-white hover:bg-slate-700"}`}
                    >
                      <IconUserPlus size={16} />{" "}
                      {rosterLoading
                        ? "..."
                        : isAddOpen
                          ? "Cerrar"
                          : "Agregar..."}
                    </button>

                    {isAddOpen && (
                      /* CAMBIO AQUÍ: z-[100] para que no quede debajo de la tabla */
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-[100] animate-in zoom-in-95 origin-top-right">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">
                          Agregar Integrante
                        </h4>
                        <MemberSearchSelect
                          options={candidateOptions}
                          value={selectedToAdd}
                          onChange={setSelectedToAdd}
                          placeholder="Buscar por nombre..."
                        />
                        <button
                          onClick={handleAddPerson}
                          disabled={!selectedToAdd || loading}
                          className="mt-3 w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 disabled:bg-slate-300 shadow-md hover:bg-indigo-700 transition-colors"
                        >
                          <IconPlus size={16} /> Confirmar Alta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                  <div className="bg-white px-2 py-1 rounded border border-indigo-100 flex items-center gap-1 shadow-sm">
                    <span className="text-xs font-bold text-indigo-700">
                      BASE:
                    </span>
                    <span className="text-indigo-700 font-bold">$</span>
                    <input
                      type="number"
                      className="bg-transparent w-20 font-bold text-indigo-700 outline-none"
                      value={config.valor_diario_base || 0}
                      onChange={(e) =>
                        updateConfig("valor_diario_base", e.target.value)
                      }
                    />
                    {latestGlobalValue > config.valor_diario_base && (
                      <button
                        onClick={() =>
                          updateConfig("valor_diario_base", latestGlobalValue)
                        }
                        className="text-indigo-400 hover:text-indigo-600 ml-1"
                        title={`Actualizar a último valor conocido: $${latestGlobalValue}`}
                      >
                        <IconRefresh size={14} />
                      </button>
                    )}
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
                        <IconCheck
                          size={10}
                          className="text-white"
                          strokeWidth={4}
                        />
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold ${config.factor_temporada === 0.3 ? "text-amber-700" : "text-slate-400"}`}
                    >
                      TEMP (30%)
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 gap-2">
                  <div className="flex-1 bg-white px-2 py-1 rounded border border-slate-200 flex items-center gap-2 shadow-sm focus-within:border-indigo-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Motivo:
                    </span>
                    <input
                      type="text"
                      className="bg-transparent w-full text-sm outline-none text-slate-700 font-medium"
                      placeholder="Ej: Gira Patagónica"
                      value={config.motivo || ""}
                      onChange={(e) => updateConfig("motivo", e.target.value)}
                    />
                  </div>
                  <div className="flex-1 bg-white px-2 py-1 rounded border border-slate-200 flex items-center gap-2 shadow-sm focus-within:border-indigo-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Lugar:
                    </span>
                    <input
                      type="text"
                      className="bg-transparent w-full text-sm outline-none text-slate-700 font-medium"
                      placeholder="Ej: Bariloche"
                      value={config.lugar_comision || ""}
                      onChange={(e) =>
                        updateConfig("lugar_comision", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
              <ViaticosTable
                rows={activeRows}
                selection={selection}
                onSelectAll={selectAll}
                onToggleSelection={toggleSelection}
                onUpdateRow={updateRow}
                onDeleteRow={handleDeleteRow}
                showDatos={showDatos}
                showAnticipo={showAnticipo}
                showTransport={showTransport}
                showExpenses={showExpenses}
                showRendiciones={showRendiciones}
                config={config}
                updatingFields={updatingFields}
                deletingRows={deletingRows}
                successFields={successFields}
                logisticsMap={logisticsMap}
                routeRules={routeRules}
                transportesList={transportes}
              />
              {selection.size > 0 && (
                <ViaticosBulkEditPanel
                  selectionSize={selection.size}
                  onClose={() => setSelection(new Set())}
                  values={batchValues}
                  setValues={setBatchValues}
                  onApply={handleApplyBatch}
                  loading={loading}
                  onExport={handleExportToDrive}
                  isExporting={isExporting}
                  exportStatus={exportStatus}
                  onSendEmails={handleSendMassiveEmails}
                />
              )}
            </div>
          </div>
        )}
      </div>
      <div className="bg-white border-b border-slate-200 shadow-sm mb-12">
        <div
          className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setShowMassivePanel(!showMassivePanel)}
        >
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <IconBus className="text-indigo-600" /> Destaques Masivos
          </h2>
          <button className="text-slate-400">
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
              roster={massiveRoster} // PASAMOS SOLO LOS MASIVOS AQUÍ
              configs={destaquesConfigs}
              globalConfig={config}
              onSaveConfig={handleSaveLocationConfig}
              onExportBatch={handleExportLocationBatch}
              existingViaticosIds={viaticosRows.map((r) => r.id_integrante)}
              isExporting={isExporting}
              exportStatus={exportStatus}
              logisticsMap={logisticsMap}
              routeRules={routeRules}
              transportesList={transportes}
              viaticosRows={viaticosRows}
            />
          </div>
        )}
      </div>
      {notification && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3">
            <div className="bg-green-500 rounded-full p-1 text-slate-900">
              <IconCheck size={14} strokeWidth={3} />
            </div>
            <span className="font-medium text-sm">{notification}</span>
          </div>
        </div>
      )}
    </div>
  );
}
