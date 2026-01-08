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
  IconTrash,
  IconLoader,
  IconBus,
} from "../../../components/ui/Icons";
import { useGiraRoster } from "../../../hooks/useGiraRoster";
import ViaticosForm from "./ViaticosForm";
import ViaticosBulkEditPanel from "./ViaticosBulkEditPanel";
import { exportViaticosToPDFForm } from "../../../utils/pdfFormExporter";
import RendicionForm from "./RendicionForm";
import DateInput from "../../../components/ui/DateInput";
import TimeInput from "../../../components/ui/TimeInput";
import DestaquesLocationPanel from "./DestaquesLocationPanel";

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

// --- LÓGICA DE NEGOCIO ---
const getAutoDatosLaborales = (persona) => {
  if (!persona) return { cargo: "", jornada: "" };
  const nombreCompleto = `${persona.apellido || ""} ${
    persona.nombre || ""
  }`.toUpperCase();
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
      opt.label.toLowerCase().includes(search.toLowerCase())
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
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 flex justify-between ${
                    value === opt.value
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "text-slate-700"
                  }`}
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
    factor_temporada: 0.5,
    motivo: "",
    lugar_comision: "",
    link_drive: "",
  });
  const saveTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef({});

  const [giraData, setGiraData] = useState(null);
  const giraObj = useMemo(() => giraData || { id: giraId }, [giraData, giraId]);
  const { roster: rosterData, loading: rosterLoadingRaw } = useGiraRoster(
    supabase,
    giraObj
  );
  const fullRoster = rosterData || [];
  const isRosterLoading = rosterLoadingRaw && fullRoster.length === 0;

  const [viaticosRows, setViaticosRows] = useState([]);
  const [selection, setSelection] = useState(new Set());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState(null);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showTransport, setShowTransport] = useState(false);
  const [showRendiciones, setShowRendiciones] = useState(false);
  const [previewRow, setPreviewRow] = useState(null);
  const [previewMode, setPreviewMode] = useState("viatico");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [batchValues, setBatchValues] = useState({
    fecha_salida: "",
    hora_salida: "",
    fecha_llegada: "",
    hora_llegada: "",
    dias_computables: "",
    porcentaje: "",
    es_temporada_alta: "",
    cargo: "",
    jornada_laboral: "",
    gastos_movilidad: "",
    gasto_combustible: "",
    gasto_otros: "",
    gastos_capacit: "",
    gastos_movil_otros: "",
    gasto_alojamiento: "",
    check_aereo: "",
    check_terrestre: "",
    check_patente_oficial: "",
    patente_oficial: "",
    check_patente_particular: "",
    patente_particular: "",
    check_otros: "",
    transporte_otros: "",
  });

  // Estados nuevos para Destaques
  const [destaquesConfigs, setDestaquesConfigs] = useState({});
  const [showIndividualPanel, setShowIndividualPanel] = useState(true);
  const [showMassivePanel, setShowMassivePanel] = useState(true);

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
    setLoading(true);
    try {
      // 1. Config General
      const { data: conf } = await supabase
        .from("giras_viaticos_config")
        .select("*")
        .eq("id_gira", giraId)
        .single();
      if (conf) setConfig(conf);
      else {
        const { data: newConf } = await supabase
          .from("giras_viaticos_config")
          .insert([{ id_gira: giraId, valor_diario_base: 0 }])
          .select()
          .single();
        if (newConf) setConfig(newConf);
      }

      // 2. Detalles Individuales
      const { data: detalles } = await supabase
        .from("giras_viaticos_detalle")
        .select(`*, integrantes(firma)`)
        .order("id");
      setViaticosRows(detalles || []);

      // 3. Configs por Localidad
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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  function calculateRow(row, currentConfig) {
    const base = parseFloat(currentConfig?.valor_diario_base || 0);
    const dias = parseFloat(row.dias_computables || 0);
    const pct = parseFloat(row.porcentaje || 100) / 100;
    const basePorcentaje = round2(base * pct);
    const factorTemp = row.es_temporada_alta
      ? parseFloat(currentConfig?.factor_temporada || 0.5)
      : 0;
    const valorDiarioCalc = round2(basePorcentaje * (1 + factorTemp));
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
    const rosterSafe = fullRoster || [];
    return viaticosRows
      .map((row) => {
        const persona = rosterSafe.find(
          (p) => String(p.id) === String(row.id_integrante)
        );
        const { valorDiarioCalc, subtotal, totalFinal } = calculateRow(
          row,
          config
        );
        const ciudadOrigen = persona?.localidades?.localidad || "Viedma";
        return {
          ...row,
          nombre: persona ? persona.nombre : "Desconocido",
          apellido: persona ? persona.apellido : "Desconocido",
          rol_roster: persona ? persona.rol_gira || persona.rol : "",
          cargo:
            row.cargo || (persona ? persona.rol_gira || persona.rol : "Músico"),
          firma: persona ? persona.firma : null,
          ciudad_origen: ciudadOrigen,
          valorDiarioCalc,
          subtotal,
          totalFinal,
        };
      })
      .sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
  }, [viaticosRows, fullRoster, config]);

  const candidateOptions = useMemo(() => {
    if (!fullRoster || fullRoster.length === 0) return [];
    const existingIds = new Set(
      viaticosRows.map((r) => String(r.id_integrante))
    );
    const seen = new Set();
    const opts = [];
    fullRoster.forEach((p) => {
      const idStr = String(p.id);
      if (!existingIds.has(idStr) && !seen.has(idStr)) {
        seen.add(idStr);
        opts.push({
          value: p.id,
          label: `${p.apellido || ""}, ${p.nombre || ""}`,
          subLabel: p.rol_gira || p.rol || "Sin Rol",
        });
      }
    });
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [fullRoster, viaticosRows]);

  const updateRow = async (id, field, value) => {
    const currentRow = viaticosRows.find((r) => r.id === id);
    if (!currentRow) return;
    const updatedRow = { ...currentRow, [field]: value };
    if (
      ["fecha_salida", "hora_salida", "fecha_llegada", "hora_llegada"].includes(
        field
      )
    ) {
      updatedRow.dias_computables = calculateDaysDiff(
        updatedRow.fecha_salida,
        updatedRow.hora_salida,
        updatedRow.fecha_llegada,
        updatedRow.hora_llegada
      );
    }
    setViaticosRows((prev) => prev.map((r) => (r.id === id ? updatedRow : r)));
    try {
      const payload = { [field]: value };
      if (updatedRow.dias_computables !== currentRow.dias_computables)
        payload.dias_computables = updatedRow.dias_computables;
      await supabase
        .from("giras_viaticos_detalle")
        .update(payload)
        .eq("id", id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRow = async (id) => {
    if (!confirm("¿Eliminar este integrante de la lista de viáticos?")) return;
    setViaticosRows((prev) => prev.filter((r) => r.id !== id));
    try {
      await supabase.from("giras_viaticos_detalle").delete().eq("id", id);
    } catch (err) {
      console.error(err);
      alert("Error eliminando fila");
      fetchViaticosData();
    }
  };

  const handleApplyBatch = async () => {
    /* ... igual ... */ setLoading(true);
    try {
      const updates = {};
      Object.keys(batchValues).forEach((key) => {
        if (
          batchValues[key] !== "" &&
          batchValues[key] !== null &&
          batchValues[key] !== false
        ) {
          updates[key] = batchValues[key];
        }
      });
      if (Object.keys(updates).length === 0) {
        alert("No has ingresado ningún valor para aplicar.");
        setLoading(false);
        return;
      }
      const selectedIds = Array.from(selection);
      const promises = selectedIds.map(async (integranteId) => {
        const row = viaticosRows.find((r) => r.id_integrante === integranteId);
        if (!row) return;
        const newRowData = { ...row, ...updates };
        if (
          updates.fecha_salida ||
          updates.hora_salida ||
          updates.fecha_llegada ||
          updates.hora_llegada
        ) {
          newRowData.dias_computables = calculateDaysDiff(
            newRowData.fecha_salida,
            newRowData.hora_salida,
            newRowData.fecha_llegada,
            newRowData.hora_llegada
          );
          updates.dias_computables = newRowData.dias_computables;
        }
        await supabase
          .from("giras_viaticos_detalle")
          .update(updates)
          .eq("id", row.id);
      });
      await Promise.all(promises);
      await fetchViaticosData();
      setSelection(new Set());
      alert("Cambios masivos aplicados correctamente.");
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleAddPerson = async () => {
    /* ... igual ... */ if (!selectedToAdd) return;
    setLoading(true);
    const persona = fullRoster.find((p) => p.id === selectedToAdd);
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
  const handleAddProduction = async () => {
    /* ... igual ... */ setLoading(true);
    try {
      if (!fullRoster || fullRoster.length === 0) {
        alert("Roster vacío.");
        setLoading(false);
        return;
      }
      const existingIds = new Set(
        viaticosRows.map((r) => String(r.id_integrante))
      );
      const toAdd = [];
      const seen = new Set();
      const normalize = (s) =>
        (s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      fullRoster.forEach((p) => {
        const idStr = String(p.id);
        const roleGira = normalize(p.rol_gira);
        const roleBase = normalize(p.rol);
        const isProd =
          roleGira.includes("prod") ||
          roleGira.includes("staff") ||
          roleGira.includes("tecnic") ||
          roleGira.includes("logist") ||
          roleGira.includes("coord") ||
          roleBase.includes("prod") ||
          roleBase.includes("staff") ||
          roleBase.includes("tecnic");
        if (isProd && !existingIds.has(idStr) && !seen.has(idStr)) {
          seen.add(idStr);
          const { cargo, jornada } = getAutoDatosLaborales(p);
          toAdd.push({
            id_gira: giraId,
            id_integrante: p.id,
            dias_computables: 0,
            porcentaje: 100,
            cargo: cargo !== "Externo" ? cargo : "Producción / Staff",
            jornada_laboral: jornada,
          });
        }
      });
      if (toAdd.length === 0) {
        alert("No se encontraron nuevos integrantes.");
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

  const handleExportToDrive = async (options) => {
    /* ... igual ... */ const opts = options || { viatico: true };
    if (selection.size === 0)
      return alert("Selecciona al menos un integrante.");
    setIsExporting(true);
    setExportStatus("Iniciando...");
    try {
      let driveFolderId = config.link_drive;
      if (!driveFolderId) {
        setExportStatus("Creando carpeta...");
        const folderName = `Gira ${giraData?.id} - Viaticos`;
        const { data: folderData, error } = await supabase.functions.invoke(
          "manage-drive",
          { body: { action: "create_folder", folderName } }
        );
        if (error) throw error;
        driveFolderId = folderData.folderId;
        await supabase
          .from("giras_viaticos_config")
          .update({ link_drive: driveFolderId })
          .eq("id_gira", giraId);
        setConfig((prev) => ({ ...prev, link_drive: driveFolderId }));
      }
      const selectedIds = Array.from(selection);
      let count = 0;
      for (const id of selectedIds) {
        count++;
        const row = activeRows.find((r) => r.id_integrante === id);
        if (!row) continue;
        const baseName = `${row.apellido}, ${row.nombre}`;
        if (opts.viatico) {
          setExportStatus(
            `(${count}/${selectedIds.length}) ${row.apellido}: Viático...`
          );
          const pdfBytes = await exportViaticosToPDFForm(
            giraData,
            [row],
            config,
            "viatico"
          );
          const base64 = btoa(
            new Uint8Array(pdfBytes).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          await supabase.functions.invoke("manage-drive", {
            body: {
              action: "upload_file",
              parentId: driveFolderId,
              fileName: `${baseName} - Viático.pdf`,
              fileBase64: base64,
              mimeType: "application/pdf",
            },
          });
        }
        if (opts.destaque) {
          setExportStatus(
            `(${count}/${selectedIds.length}) ${row.apellido}: Destaque...`
          );
          const pdfBytes = await exportViaticosToPDFForm(
            giraData,
            [row],
            config,
            "destaque"
          );
          const base64 = btoa(
            new Uint8Array(pdfBytes).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          await supabase.functions.invoke("manage-drive", {
            body: {
              action: "upload_file",
              parentId: driveFolderId,
              fileName: `${baseName} - Destaque.pdf`,
              fileBase64: base64,
              mimeType: "application/pdf",
            },
          });
        }
        if (opts.rendicion) {
          setExportStatus(
            `(${count}/${selectedIds.length}) ${row.apellido}: Rendición...`
          );
          const pdfBytes = await exportViaticosToPDFForm(
            giraData,
            [row],
            config,
            "rendicion"
          );
          const base64 = btoa(
            new Uint8Array(pdfBytes).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          await supabase.functions.invoke("manage-drive", {
            body: {
              action: "upload_file",
              parentId: driveFolderId,
              fileName: `${baseName} - Rendición.pdf`,
              fileBase64: base64,
              mimeType: "application/pdf",
            },
          });
        }
        if (opts.docComun || opts.docReducida) {
          const persona = fullRoster.find((p) => String(p.id) === String(id));
          if (persona?.documentacion) {
            setExportStatus(
              `(${count}/${selectedIds.length}) ${row.apellido}: Copiando Doc...`
            );
            await supabase.functions.invoke("manage-drive", {
              body: {
                action: "copy_file",
                sourceUrl: persona.documentacion,
                targetParentId: driveFolderId,
                newName: `${baseName} - Documentación`,
              },
            });
          }
        }
      }
      setExportStatus("¡Terminado!");
      alert("Exportación completada.");
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    } finally {
      setIsExporting(false);
      setExportStatus("");
      setSelection(new Set());
    }
  };

  // --- NUEVAS FUNCIONES PARA DESTAQUES ---
  const handleSaveLocationConfig = async (locId, data) => {
    // Validación estricta para no guardar basura
    if (!locId || locId === "unknown") return;

    try {
      const payload = {
        id_gira: giraId,
        id_localidad: locId,
        fecha_salida: data.fecha_salida || null,
        hora_salida: data.hora_salida || null,
        fecha_llegada: data.fecha_llegada || null,
        hora_llegada: data.hora_llegada || null,
        dias_computables: data.dias_computables || 0,
        porcentaje_liquidacion: data.porcentaje_liquidacion || 100,
      };

      // USAR maybeSingle() EN LUGAR DE single() PARA EVITAR ERROR SI NO EXISTE
      const { data: existing, error: fetchError } = await supabase
        .from("giras_destaques_config")
        .select("id")
        .eq("id_gira", giraId)
        .eq("id_localidad", locId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const { error } = await supabase
          .from("giras_destaques_config")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("giras_destaques_config")
          .insert([payload]);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error auto-save location:", err);
    }
  };

  const handleExportLocationBatch = async (locIds, groupedData, inputs, options) => {
      // options = { generatePdf: boolean, docType: 'none'|'doc'|'docred', includeExisting: boolean }
      
      setIsExporting(true);
      setExportStatus("Preparando exportación masiva...");

      try {
          // 1. Asegurar carpeta en Drive
          let driveFolderId = config.link_drive;
          if (!driveFolderId) {
            setExportStatus("Creando carpeta base...");
            const folderName = `Gira ${giraData?.id} - Viaticos`;
            const { data: folderData, error } = await supabase.functions.invoke("manage-drive", {
                body: { action: "create_folder", folderName }
            });
            if (error) throw error;
            driveFolderId = folderData.folderId;
            await supabase.from("giras_viaticos_config").update({ link_drive: driveFolderId }).eq("id_gira", giraId);
            setConfig(prev => ({ ...prev, link_drive: driveFolderId }));
          }

          // 2. Calcular lista de personas a procesar
          const groupsToExport = groupedData.filter(g => locIds.includes(g.id));
          const allPeople = [];
          
          groupsToExport.forEach(g => {
              // Si includeExisting es true, usamos g.people completo. Si no, filtramos.
              const eligible = options.includeExisting 
                  ? g.people 
                  : g.people.filter(p => !p.hasViatico);
              
              // Agregamos config de localidad a cada persona para facilitar el loop
              eligible.forEach(p => {
                  allPeople.push({ 
                      ...p, 
                      groupConfig: inputs[g.id] || {}, 
                      groupName: g.name || "SinLocalidad" 
                  });
              });
          });

          if (allPeople.length === 0) {
              alert("No hay personas para exportar con la configuración actual (intenta marcar 'Incluir músicos que ya tienen viático').");
              setIsExporting(false);
              return;
          }

          // 3. Iterar sobre la lista consolidada
          let current = 0;
          for (const item of allPeople) {
              current++;
              const p = item;
              const configLoc = item.groupConfig;
              const locName = item.groupName;
              const baseName = `${p.apellido}, ${p.nombre}`;

              setExportStatus(`(${current}/${allPeople.length}) ${p.apellido}...`);

              // A. GENERAR PDF DESTAQUE
              if (options.generatePdf) {
                  setExportStatus(`(${current}/${allPeople.length}) ${p.apellido}: PDF Destaque...`);
                  
                  const mockRow = {
                      ...p,
                      id_integrante: p.id,
                      cargo: getAutoDatosLaborales(p).cargo,
                      jornada_laboral: getAutoDatosLaborales(p).jornada,
                      ciudad_origen: p.localidades?.localidad || "Viedma",
                      fecha_salida: configLoc.fecha_salida,
                      hora_salida: configLoc.hora_salida,
                      fecha_llegada: configLoc.fecha_llegada,
                      hora_llegada: configLoc.hora_llegada,
                      dias_computables: configLoc.dias_computables,
                      porcentaje: configLoc.porcentaje_liquidacion,
                      // Valores por defecto
                      gasto_alojamiento: 0,
                      subtotal: 0, totalFinal: 0, valorDiarioCalc: 0,
                      es_temporada_alta: false, 
                      check_aereo: false, 
                      check_terrestre: false,
                      check_patente_oficial: false, 
                      check_patente_particular: false
                  };

                  const pdfBytes = await exportViaticosToPDFForm(giraData, [mockRow], config, 'destaque');
                  const base64 = btoa(new Uint8Array(pdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                  const fileName = `${baseName} - Destaque (${locName}).pdf`;
                  
                  await supabase.functions.invoke("manage-drive", {
                      body: { action: "upload_file", parentId: driveFolderId, fileName, fileBase64: base64, mimeType: "application/pdf" },
                   });
              }

              // B. COPIAR DOCUMENTACIÓN (CORREGIDO)
              if (options.docType !== 'none') {
                   // Selección dinámica de la URL según el tipo
                   const sourceUrl = options.docType === 'docred' ? p.docred : p.documentacion;

                   if (sourceUrl) {
                       setExportStatus(`(${current}/${allPeople.length}) ${p.apellido}: Copiando Doc...`);
                       
                       const label = options.docType === 'docred' ? 'Doc. Reducida' : 'Documentación';
                       const newName = `${baseName} - ${label} (${locName})`;
                       
                       await supabase.functions.invoke("manage-drive", {
                        body: { action: "copy_file", sourceUrl: sourceUrl, targetParentId: driveFolderId, newName },
                      });
                   } else {
                       console.warn(`Saltando documentación para ${p.apellido}: No tiene archivo ${options.docType}.`);
                   }
              }
          }
          
          setExportStatus("¡Exportación finalizada!");
          alert(`Proceso completado. Se procesaron ${allPeople.length} registros.`);

      } catch (err) {
          console.error(err);
          alert("Error: " + err.message);
      } finally {
          setIsExporting(false);
          setExportStatus("");
      }
  };

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
      {/* 1. SECCIÓN: VIÁTICOS INDIVIDUALES */}
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
            <div className="px-6 pb-4 flex flex-col gap-4">
              {/* Controles de la tabla (Botones, Configs) */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTransport(!showTransport)}
                    className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${
                      showTransport
                        ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                        : "bg-white text-slate-400 border-slate-200"
                    }`}
                  >
                    Transp.
                  </button>
                  <button
                    onClick={() => setShowExpenses(!showExpenses)}
                    className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${
                      showExpenses
                        ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                        : "bg-white text-slate-400 border-slate-200"
                    }`}
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
                    className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${
                      showRendiciones
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-white text-slate-400 border-slate-200"
                    }`}
                  >
                    Rendic.{" "}
                    {showRendiciones ? (
                      <IconEye size={14} />
                    ) : (
                      <IconEyeOff size={14} />
                    )}
                  </button>
                  {config.link_drive && (
                    <button
                      onClick={() =>
                        window.open(
                          `https://drive.google.com/drive/folders/${config.link_drive}`,
                          "_blank"
                        )
                      }
                      className="p-2 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center justify-center"
                      title="Abrir carpeta de Drive"
                    >
                      <IconDrive size={18} />
                    </button>
                  )}
                  <div className="w-px h-8 bg-slate-200 mx-2"></div>
                  <button
                    onClick={handleAddProduction}
                    disabled={loading || isRosterLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <IconBriefcase size={16} />{" "}
                    {isRosterLoading ? "..." : "+ Producción"}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setIsAddOpen(!isAddOpen)}
                      disabled={isRosterLoading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all disabled:opacity-50 ${
                        isAddOpen
                          ? "bg-slate-200 text-slate-800"
                          : "bg-slate-800 text-white hover:bg-slate-700"
                      }`}
                    >
                      <IconUserPlus size={16} />{" "}
                      {isRosterLoading
                        ? "..."
                        : isAddOpen
                        ? "Cerrar"
                        : "Agregar..."}
                    </button>
                    {isAddOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in zoom-in-95 origin-top-right">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                          Agregar Individual
                        </h4>
                        <MemberSearchSelect
                          options={candidateOptions}
                          value={selectedToAdd}
                          onChange={setSelectedToAdd}
                          placeholder="Buscar..."
                        />
                        <button
                          onClick={handleAddPerson}
                          disabled={!selectedToAdd || loading}
                          className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold flex justify-center items-center gap-2 disabled:bg-slate-300"
                        >
                          <IconPlus size={16} /> Agregar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Configuración */}
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
                  </div>
                  <div className="bg-white px-2 py-1 rounded border border-amber-100 flex items-center gap-1 shadow-sm">
                    <span className="text-xs font-bold text-amber-700">
                      TEMP (+%):
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      className="bg-transparent w-10 font-bold text-amber-700 outline-none"
                      value={config.factor_temporada || 0}
                      onChange={(e) =>
                        updateConfig("factor_temporada", e.target.value)
                      }
                    />
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

              {/* Tabla Individual */}
              <div className="relative overflow-x-auto min-h-[300px]">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full text-sm text-left border-separate border-spacing-0">
                    <thead className="text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-3 w-10 text-center sticky top-0 left-0 z-50 bg-slate-50 border-b border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <input
                            type="checkbox"
                            onChange={selectAll}
                            checked={
                              selection.size === activeRows.length &&
                              activeRows.length > 0
                            }
                            className="rounded text-indigo-600"
                          />
                        </th>
                        <th className="px-3 py-3 w-48 sticky top-0 left-[40px] z-50 bg-slate-50 border-b border-r border-slate-200 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)]">
                          Integrante
                        </th>
                        <th className="px-2 py-3 w-32 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                          Cargo/Función
                        </th>
                        <th className="px-2 py-3 w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                          Jornada
                        </th>
                        <th className="px-2 py-3 bg-slate-50 border-l min-w-[220px] sticky top-0 z-40 border-b border-slate-200">
                          Salida (D/H)
                        </th>
                        <th className="px-2 py-3 bg-slate-50 border-r min-w-[220px] sticky top-0 z-40 border-b border-slate-200">
                          Llegada (D/H)
                        </th>
                        <th className="px-1 py-3 text-center w-12 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                          Días
                        </th>
                        <th className="px-1 py-3 text-center w-16 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                          %
                        </th>
                        <th className="px-1 py-3 text-center text-amber-700 w-10 sticky top-0 z-40 bg-amber-50 border-b border-amber-100">
                          Temp
                        </th>
                        <th className="px-2 py-3 text-right text-slate-600 w-32 sticky top-0 z-40 bg-slate-100 border-b border-slate-200">
                          $ Diario
                        </th>
                        <th className="px-2 py-3 text-right text-indigo-800 font-bold w-32 border-r border-indigo-100 sticky top-0 z-40 bg-indigo-50 border-b border-slate-200">
                          Subtotal
                        </th>
                        {showTransport && (
                          <>
                            <th className="px-2 py-3 text-center text-blue-700 w-20 sticky top-0 z-40 bg-blue-50 border-b border-blue-100">
                              Medios
                            </th>
                            <th className="px-2 py-3 text-blue-700 w-32 sticky top-0 z-40 bg-blue-50 border-b border-blue-100">
                              Oficial
                            </th>
                            <th className="px-2 py-3 text-blue-700 w-32 sticky top-0 z-40 bg-blue-50 border-b border-blue-100">
                              Particular
                            </th>
                            <th className="px-2 py-3 text-blue-700 w-32 border-r border-blue-100 sticky top-0 z-40 bg-blue-50 border-b border-blue-100">
                              Otros
                            </th>
                          </>
                        )}
                        {showExpenses && (
                          <>
                            <th className="px-2 py-3 text-right text-slate-400 font-normal w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                              Mov.
                            </th>
                            <th className="px-2 py-3 text-right text-slate-400 font-normal w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                              Comb.
                            </th>
                            <th className="px-2 py-3 text-right text-slate-400 font-normal w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                              Otros
                            </th>
                            <th className="px-2 py-3 text-right text-slate-400 font-normal w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                              Capac.
                            </th>
                            <th className="px-2 py-3 text-right text-slate-400 font-normal w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                              M.Otr
                            </th>
                            <th className="px-2 py-3 text-right text-slate-400 font-normal border-r w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                              Aloj.
                            </th>
                          </>
                        )}
                        <th className="px-3 py-3 text-right text-white w-36 sticky top-0 z-40 bg-slate-800 border-b border-slate-900">
                          Total Final
                        </th>
                        {showRendiciones && (
                          <>
                            <th className="px-2 py-3 text-green-700 w-24 border-l border-green-100 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                              R. Viát.
                            </th>
                            <th className="px-2 py-3 text-green-700 w-24 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                              R. Aloj.
                            </th>
                            <th className="px-2 py-3 text-green-700 w-24 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                              R. Pasajes
                            </th>
                            <th className="px-2 py-3 text-green-700 w-24 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                              R. Comb.
                            </th>
                            <th className="px-2 py-3 text-green-700 w-24 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                              R. Mov.Otr
                            </th>
                            <th className="px-2 py-3 text-green-700 w-24 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                              R. Capac.
                            </th>
                            <th className="px-2 py-3 text-green-700 w-24 border-r border-green-100 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                              R. Otros T.
                            </th>
                          </>
                        )}
                        <th className="px-2 py-3 w-16 text-center sticky top-0 z-40 bg-slate-50 border-b border-slate-200"></th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {activeRows.map((row) => {
                        const isSelected = selection.has(row.id_integrante);
                        const stickyBg = isSelected
                          ? "bg-indigo-50"
                          : "bg-white group-hover:bg-slate-50";
                        const rowClass = `transition-colors group ${
                          isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                        }`;
                        const cellClass = "px-2 py-2 border-b border-slate-100";
                        return (
                          <tr key={row.id_integrante} className={rowClass}>
                            <td
                              className={`px-3 py-2 text-center border-b border-r border-slate-100 sticky left-0 z-30 ${stickyBg}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  toggleSelection(row.id_integrante)
                                }
                                className="rounded text-indigo-600"
                              />
                            </td>
                            <td
                              className={`px-3 py-2 font-medium text-slate-700 border-b border-r border-slate-200 sticky left-[40px] z-30 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] ${stickyBg}`}
                            >
                              {row.apellido}, {row.nombre}
                              <div className="text-[9px] text-slate-400">
                                {row.rol_roster} -{" "}
                                <span className="text-slate-500 font-bold">
                                  {row.ciudad_origen}
                                </span>
                              </div>
                            </td>
                            <td className={cellClass}>
                              <input
                                type="text"
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-slate-600"
                                value={row.cargo || ""}
                                onChange={(e) =>
                                  updateRow(row.id, "cargo", e.target.value)
                                }
                              />
                            </td>
                            <td className={cellClass}>
                              <input
                                type="text"
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-slate-600"
                                placeholder="-"
                                value={row.jornada_laboral || ""}
                                onChange={(e) =>
                                  updateRow(
                                    row.id,
                                    "jornada_laboral",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="px-1 py-2 border-b border-l border-slate-100 bg-white">
                              <div className="flex gap-1 items-center justify-center w-full">
                                <DateInput
                                  value={row.fecha_salida}
                                  onChange={(val) =>
                                    updateRow(row.id, "fecha_salida", val)
                                  }
                                  className="w-20 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-[10px] font-medium text-slate-700 text-center px-0"
                                />
                                <TimeInput
                                  value={row.hora_salida}
                                  onChange={(val) =>
                                    updateRow(row.id, "hora_salida", val)
                                  }
                                  className="w-[45px] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-[10px] text-slate-500 text-center px-0"
                                />
                              </div>
                            </td>
                            <td className="px-1 py-2 border-b border-r border-slate-100 bg-white">
                              <div className="flex gap-1 items-center justify-center w-full">
                                <DateInput
                                  value={row.fecha_llegada}
                                  onChange={(val) =>
                                    updateRow(row.id, "fecha_llegada", val)
                                  }
                                  className="w-20 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-[10px] font-medium text-slate-700 text-center px-0"
                                />
                                <TimeInput
                                  value={row.hora_llegada}
                                  onChange={(val) =>
                                    updateRow(row.id, "hora_llegada", val)
                                  }
                                  className="w-[45px] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-[10px] text-slate-500 text-center px-0"
                                />
                              </div>
                            </td>
                            <td
                              className={`px-1 py-2 text-center font-mono font-bold text-slate-700 bg-slate-50 border-b border-slate-200`}
                            >
                              {row.dias_computables}
                            </td>
                            <td className="px-1 py-2 text-center border-b border-slate-100">
                              <select
                                className="bg-transparent text-xs text-center outline-none"
                                value={row.porcentaje || 100}
                                onChange={(e) =>
                                  updateRow(
                                    row.id,
                                    "porcentaje",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="100">100%</option>
                                <option value="80">80%</option>
                                <option value="0">0%</option>
                              </select>
                            </td>
                            <td className="px-1 py-2 text-center border-b border-slate-100">
                              <input
                                type="checkbox"
                                checked={row.es_temporada_alta || false}
                                onChange={(e) =>
                                  updateRow(
                                    row.id,
                                    "es_temporada_alta",
                                    e.target.checked
                                  )
                                }
                                className="rounded text-amber-600"
                              />
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-slate-500 border-b border-slate-100">
                              ${row.valorDiarioCalc}
                            </td>
                            <td className="px-2 py-2 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30 border-r border-b border-indigo-100">
                              ${row.subtotal}
                            </td>
                            {showTransport && (
                              <>
                                <td className="px-2 py-2 text-center border-l border-b border-slate-100">
                                  <div className="flex flex-col gap-1 items-start text-[10px] text-slate-600">
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={row.check_aereo || false}
                                        onChange={(e) =>
                                          updateRow(
                                            row.id,
                                            "check_aereo",
                                            e.target.checked
                                          )
                                        }
                                      />{" "}
                                      Aéreo
                                    </label>
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={row.check_terrestre || false}
                                        onChange={(e) =>
                                          updateRow(
                                            row.id,
                                            "check_terrestre",
                                            e.target.checked
                                          )
                                        }
                                      />{" "}
                                      Terrestre
                                    </label>
                                  </div>
                                </td>
                                <td className={cellClass}>
                                  <div className="flex flex-col gap-1">
                                    <label className="flex items-center gap-1 text-[10px] text-slate-600">
                                      <input
                                        type="checkbox"
                                        checked={
                                          row.check_patente_oficial || false
                                        }
                                        onChange={(e) =>
                                          updateRow(
                                            row.id,
                                            "check_patente_oficial",
                                            e.target.checked
                                          )
                                        }
                                      />{" "}
                                      Oficial
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Patente..."
                                      value={row.patente_oficial || ""}
                                      onChange={(e) =>
                                        updateRow(
                                          row.id,
                                          "patente_oficial",
                                          e.target.value
                                        )
                                      }
                                      className="w-full text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
                                    />
                                  </div>
                                </td>
                                <td className={cellClass}>
                                  <div className="flex flex-col gap-1">
                                    <label className="flex items-center gap-1 text-[10px] text-slate-600">
                                      <input
                                        type="checkbox"
                                        checked={
                                          row.check_patente_particular || false
                                        }
                                        onChange={(e) =>
                                          updateRow(
                                            row.id,
                                            "check_patente_particular",
                                            e.target.checked
                                          )
                                        }
                                      />{" "}
                                      Particular
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Patente..."
                                      value={row.patente_particular || ""}
                                      onChange={(e) =>
                                        updateRow(
                                          row.id,
                                          "patente_particular",
                                          e.target.value
                                        )
                                      }
                                      className="w-full text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
                                    />
                                  </div>
                                </td>
                                <td className="px-2 py-2 border-b border-r border-slate-200">
                                  <div className="flex flex-col gap-1">
                                    <label className="flex items-center gap-1 text-[10px] text-slate-600">
                                      <input
                                        type="checkbox"
                                        checked={row.check_otros || false}
                                        onChange={(e) =>
                                          updateRow(
                                            row.id,
                                            "check_otros",
                                            e.target.checked
                                          )
                                        }
                                      />{" "}
                                      Otros
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Detalle..."
                                      value={row.transporte_otros || ""}
                                      onChange={(e) =>
                                        updateRow(
                                          row.id,
                                          "transporte_otros",
                                          e.target.value
                                        )
                                      }
                                      className="w-full text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
                                    />
                                  </div>
                                </td>
                              </>
                            )}
                            {showExpenses && (
                              <>
                                <td className={cellClass}>
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                                    placeholder="-"
                                    value={row.gastos_movilidad || ""}
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "gastos_movilidad",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td className={cellClass}>
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                                    placeholder="-"
                                    value={row.gasto_combustible || ""}
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "gasto_combustible",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td className={cellClass}>
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                                    placeholder="-"
                                    value={row.gasto_otros || ""}
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "gasto_otros",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td className={cellClass}>
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                                    placeholder="-"
                                    value={row.gastos_capacit || ""}
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "gastos_capacit",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td className={cellClass}>
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                                    placeholder="-"
                                    value={row.gastos_movil_otros || ""}
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "gastos_movil_otros",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-1 py-2 border-b border-r border-slate-100">
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                                    placeholder="-"
                                    value={row.gasto_alojamiento || ""}
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "gasto_alojamiento",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                              </>
                            )}
                            <td className="px-3 py-2 text-right font-bold text-slate-900 bg-slate-50 border-b border-l border-slate-200">
                              ${row.totalFinal}
                            </td>
                            {showRendiciones && (
                              <>
                                <td className="px-1 py-2 bg-green-50/20 border-b border-l border-green-100">
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none hover:border-green-400 text-green-700"
                                    value={row.rendicion_viaticos || ""}
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "rendicion_viaticos",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-1 py-2 bg-green-50/20 border-b border-green-100">
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none hover:border-green-400 text-green-700"
                                    value={
                                      row.rendicion_gasto_alojamiento || ""
                                    }
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "rendicion_gasto_alojamiento",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-1 py-2 bg-green-50/20 border-b border-green-100">
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none hover:border-green-400 text-green-700"
                                    value={row.rendicion_gasto_pasajes || ""}
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "rendicion_gasto_pasajes",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-1 py-2 bg-green-50/20 border-b border-green-100">
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none hover:border-green-400 text-green-700"
                                    value={
                                      row.rendicion_gasto_combustible || ""
                                    }
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "rendicion_gasto_combustible",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-1 py-2 bg-green-50/20 border-b border-green-100">
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none hover:border-green-400 text-green-700"
                                    value={
                                      row.rendicion_gastos_movil_otros || ""
                                    }
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "rendicion_gastos_movil_otros",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-1 py-2 bg-green-50/20 border-b border-green-100">
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none hover:border-green-400 text-green-700"
                                    value={row.rendicion_gastos_capacit || ""}
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "rendicion_gastos_capacit",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-1 py-2 bg-green-50/20 border-b border-r border-green-100">
                                  <input
                                    type="number"
                                    className="w-full text-right bg-transparent outline-none hover:border-green-400 text-green-700"
                                    value={row.rendicion_transporte_otros || ""}
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "rendicion_transporte_otros",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                              </>
                            )}
                            <td className="px-2 py-2 text-center border-b border-slate-100">
                              <button
                                onClick={() => handleDeleteRow(row.id)}
                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                                title="Eliminar fila"
                              >
                                <IconTrash size={16} />
                              </button>
                            </td>
                            {/* Print Button (Optional, can be added back if needed here) */}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Bulk Panel Flotante */}
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
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. SECCIÓN: DESTAQUES MASIVOS */}
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
              roster={fullRoster}
              configs={destaquesConfigs}
              onSaveConfig={handleSaveLocationConfig}
              onExportBatch={handleExportLocationBatch}
              existingViaticosIds={viaticosRows.map((r) => r.id_integrante)}
              // --- NUEVAS PROPS PARA EL MODAL DE PROGRESO ---
              isExporting={isExporting}
              exportStatus={exportStatus}
            />
          </div>
        )}
      </div>
    </div>
  );
}
