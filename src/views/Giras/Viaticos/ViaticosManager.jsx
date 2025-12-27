import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconLoader,
  IconCalculator,
  IconPlus,
  IconTrash,
  IconUserPlus,
  IconSearch,
  IconCheck,
  IconChevronDown,
  IconBriefcase,
  IconEye,
  IconEyeOff,
  IconPrinter,
  IconArrowLeft,
  IconDrive,
  IconFileExcel, // <--- NUEVO ICONO
} from "../../../components/ui/Icons";
import { useGiraRoster } from "../../../hooks/useGiraRoster";
import ViaticosForm from "./ViaticosForm";
import ViaticosBulkEditPanel from "./ViaticosBulkEditPanel";
import { exportViaticosToPDFForm } from "../../../utils/pdfFormExporter";
import RendicionForm from "./RendicionForm";
import DateInput from "../../../components/ui/DateInput";
import TimeInput from "../../../components/ui/TimeInput";
import { exportViaticosToExcel } from "../../../utils/excelExporter"; // <--- IMPORTANTE: Asegúrate de tener este archivo creado

import { toPng } from "html-to-image";
import jsPDF from "jspdf";

// --- UTILIDADES ---
const formatDateForDisplay = (isoDateString) => {
  if (!isoDateString) return "-";
  const [year, month, day] = isoDateString.split("-");
  return `${day}/${month}/${year}`;
};

const getMonthName = (dateStr) => {
  if (!dateStr) return "MES";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleString("es-AR", { month: "long" }).toUpperCase();
};

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

const calculateDaysDiff = (dSal, hSal, dLleg, hLleg) => {
  if (!dSal || !dLleg) return 0;
  const start = new Date(dSal + "T00:00:00");
  const end = new Date(dLleg + "T00:00:00");
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays < 0) return 0;
  if (diffDays === 0) return 0.5;

  const intermedios = Math.max(0, diffDays - 1);
  const factorSalida = getDepartureFactor(hSal || "12:00");
  const factorLlegada = getArrivalFactor(hLleg || "12:00");

  return intermedios + factorSalida + factorLlegada;
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
  else if (nombreCompleto.includes("GUTTMANN"))
    cargo = "Agente administrativo, chofer";
  else if (nombreCompleto.includes("EZEQUIEL ORTIZ"))
    cargo = "Agente administrativo, chofer";
  else if (esEstable) cargo = "Agente administrativo";

  let jornada = "";
  if (
    nombreCompleto.includes("FRAILE") ||
    nombreCompleto.includes("SPELZINI") ||
    nombreCompleto.includes("FERNÁNDEZ CARLA")
  )
    jornada = "8 A 14";
  else if (esEstable) jornada = "Horas Cátedra";

  return { cargo, jornada };
};

// --- COMPONENTE BUSCADOR ---
const MemberSearchSelect = ({ options, value, onChange, placeholder }) => {
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
    if (!search) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

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
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden animate-in zoom-in-95 flex flex-col">
          <div className="p-2 border-b bg-slate-50 relative">
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
          <div className="max-h-60 overflow-y-auto">
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
  const [printMenuId, setPrintMenuId] = useState(null);

  const { roster: fullRoster } = useGiraRoster(supabase, { id: giraId });
  const [viaticosRows, setViaticosRows] = useState([]);
  const [selection, setSelection] = useState(new Set());
  const [giraData, setGiraData] = useState(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState(null);

  const [showExpenses, setShowExpenses] = useState(true);
  const [showTransport, setShowTransport] = useState(false);
  const [showRendiciones, setShowRendiciones] = useState(false);
  const [printingRow, setPrintingRow] = useState(null);

  // ESTADOS DE EXPORTACIÓN
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [exportingRow, setExportingRow] = useState(null);
  const [exportMode, setExportMode] = useState("viatico"); // "viatico" | "destaque"

  // Panel Masivo
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

  useEffect(() => {
    if (giraId) {
      supabase
        .from("programas")
        .select("*")
        .eq("id", giraId)
        .single()
        .then(({ data, error }) => {
          if (error) console.error("Error cargando programa/gira:", error);
          else if (data) setGiraData(data);
        });
      fetchViaticosData();
    }
  }, [giraId]);

  useEffect(() => {
    const { fecha_salida, hora_salida, fecha_llegada, hora_llegada } =
      batchValues;
    if (fecha_salida && fecha_llegada) {
      const hSal = hora_salida || "08:00";
      const hLleg = hora_llegada || "23:00";
      const diasCalc = calculateDaysDiff(
        fecha_salida,
        hSal,
        fecha_llegada,
        hLleg
      );
      setBatchValues((prev) => {
        if (prev.dias_computables === diasCalc) return prev;
        return { ...prev, dias_computables: diasCalc };
      });
    }
  }, [
    batchValues.fecha_salida,
    batchValues.fecha_llegada,
    batchValues.hora_salida,
    batchValues.hora_llegada,
  ]);

  const fetchViaticosData = async () => {
    setLoading(true);
    try {
      const { data: conf } = await supabase
        .from("giras_viaticos_config")
        .select("*")
        .eq("id_gira", giraId)
        .single();
      if (conf) setConfig(conf);
      else {
        const { data: newConf } = await supabase
          .from("giras_viaticos_config")
          .insert([
            {
              id_gira: giraId,
              valor_diario_base: 0,
              factor_temporada: 0.5,
              motivo: "",
              lugar_comision: "",
            },
          ])
          .select()
          .single();
        if (newConf) setConfig(newConf);
      }
      const { data: detalles } = await supabase
        .from("giras_viaticos_detalle")
        .select(`*, integrantes(firma)`)
        .order("id");
      setViaticosRows(detalles || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const activeRows = useMemo(() => {
    return viaticosRows
      .map((row) => {
        const persona = fullRoster.find(
          (p) => String(p.id) === String(row.id_integrante)
        );
        const cargoDefault =
          row.cargo || (persona ? persona.rol_gira || persona.rol : "Músico");
        return {
          ...row,
          nombre: persona ? persona.nombre : "Desconocido",
          apellido: persona ? persona.apellido : "Desconocido",
          rol_roster: persona ? persona.rol_gira || persona.rol : "",
          cargo: cargoDefault,
          firma: persona ? persona.firma : null,
        };
      })
      .sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
  }, [viaticosRows, fullRoster]);

  const candidateOptions = useMemo(() => {
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
          subLabel: p.rol_gira || p.rol,
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

    const payload = { [field]: value };
    if (updatedRow.dias_computables !== currentRow.dias_computables) {
      payload.dias_computables = updatedRow.dias_computables;
    }

    try {
      await supabase
        .from("giras_viaticos_detalle")
        .update(payload)
        .eq("id", id);
    } catch (err) {
      console.error("Error guardando fila", err);
    }
  };

  const handleAddPerson = async () => {
    if (!selectedToAdd) return;
    setLoading(true);
    const persona = fullRoster.find((p) => p.id === selectedToAdd);
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
  const handlePreview = (row, mode) => {
    setExportMode(mode);
    setPrintingRow(row);
  };
  const handleAddProduction = async () => {
    setLoading(true);
    try {
      const existingIds = new Set(
        viaticosRows.map((r) => String(r.id_integrante))
      );
      const toAdd = [];
      const seen = new Set();
      fullRoster.forEach((p) => {
        const idStr = String(p.id);
        const isProd =
          p.rol_gira === "produccion" ||
          p.rol === "produccion" ||
          p.rol?.toLowerCase().includes("prod");
        if (isProd && !existingIds.has(idStr) && !seen.has(idStr)) {
          seen.add(idStr);
          const { cargo, jornada } = getAutoDatosLaborales(p);
          toAdd.push({
            id_gira: giraId,
            id_integrante: p.id,
            dias_computables: 0,
            porcentaje: 100,
            cargo,
            jornada_laboral: jornada,
          });
        }
      });
      if (toAdd.length === 0) {
        alert("Sin nuevos integrantes de producción.");
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
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePerson = async (id_detalle) => {
    if (!confirm("¿Quitar de la lista?")) return;
    try {
      const { error } = await supabase
        .from("giras_viaticos_detalle")
        .delete()
        .eq("id", id_detalle);
      if (error) throw error;
      setViaticosRows((prev) => prev.filter((r) => r.id !== id_detalle));
      setSelection(new Set());
    } catch (err) {
      alert("Error: " + err.message);
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

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

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

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const applyBatch = async () => {
    if (selection.size === 0) return;
    setLoading(true);
    const cleanBatch = {};
    Object.keys(batchValues).forEach((key) => {
      if (batchValues[key] !== "") cleanBatch[key] = batchValues[key];
    });

    const updates = Array.from(selection).map((id_integrante) => {
      const currentRow =
        viaticosRows.find((r) => r.id_integrante === id_integrante) || {};
      const mergedData = { ...currentRow, ...cleanBatch };
      if (
        cleanBatch.fecha_salida ||
        cleanBatch.fecha_llegada ||
        cleanBatch.hora_salida ||
        cleanBatch.hora_llegada
      ) {
        const hSal = mergedData.hora_salida || "08:00";
        const hLleg = mergedData.hora_llegada || "23:00";
        mergedData.dias_computables = calculateDaysDiff(
          mergedData.fecha_salida,
          hSal,
          mergedData.fecha_llegada,
          hLleg
        );
      }
      return {
        id_gira: giraId,
        id_integrante: id_integrante,
        ...cleanBatch,
        dias_computables: mergedData.dias_computables,
        updated_at: new Date(),
      };
    });

    try {
      const { error } = await supabase
        .from("giras_viaticos_detalle")
        .upsert(updates, { onConflict: "id_gira, id_integrante" });
      if (error) throw error;
      await fetchViaticosData();
      setSelection(new Set());
      alert("Actualizado correctamente.");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateRow = (row) => {
    const base = parseFloat(config.valor_diario_base || 0);
    const dias = parseFloat(row.dias_computables || 0);
    const pct = parseFloat(row.porcentaje || 100) / 100;
    const basePorcentaje = round2(base * pct);
    const factorTemp = row.es_temporada_alta
      ? parseFloat(config.factor_temporada || 0.5)
      : 0;
    const valorDiarioCalc = round2(basePorcentaje * (1 + factorTemp));
    const subtotal = round2(dias * valorDiarioCalc);
    const gastos =
      parseFloat(row.gastos_movilidad || 0) +
      parseFloat(row.gasto_combustible || 0) +
      parseFloat(row.gasto_otros || 0) +
      parseFloat(row.gastos_capacit || 0) +
      parseFloat(row.gastos_movil_otros || 0) +
      parseFloat(row.gasto_alojamiento || 0);
    const totalFinal = round2(subtotal + gastos);
    return { valorDiarioCalc, subtotal, totalFinal };
  };

  const generatePdf = async (row, mode, folderId) => {
    const { valorDiarioCalc, subtotal, totalFinal } = calculateRow(row);
    const rowToPrint = { ...row, valorDiarioCalc, subtotal, totalFinal };

    setExportMode(mode);
    setExportingRow(rowToPrint);

    await new Promise((resolve) => setTimeout(resolve, 350));

    const element = document.getElementById("target-pdf-content");
    if (!element) throw new Error("Error render DOM (Container missing)");

    const dataUrl = await toPng(element, {
      quality: 0.85,
      backgroundColor: "white",
      pixelRatio: 1.5,
      skipFonts: true,
      cacheBust: true,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(dataUrl, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

    const base64 = pdf.output("datauristring").split(",")[1];

    const prefix =
      mode === "destaque"
        ? "Destaque"
        : mode === "rendicion"
        ? "Rendición"
        : "Viaticos";

    return supabase.functions.invoke("manage-drive", {
      body: {
        action: "upload_file",
        parentId: folderId,
        fileName: `${prefix} - ${row.apellido} ${row.nombre}.pdf`,
        fileBase64: base64,
        mimeType: "application/pdf",
      },
    });
  };

  const handleExportToDrive = async (options) => {
    const opts = options || { viatico: true };

    if (selection.size === 0)
      return alert("Selecciona al menos un integrante.");
    if (!giraData) return alert("Cargando datos de gira...");

    setIsExporting(true);
    setExportStatus("Preparando carpeta...");

    try {
      let driveFolderId = config.link_drive;
      if (!driveFolderId) {
        const mes = getMonthName(giraData.fecha_desde);
        const nomenclador = giraData.nomenclador || giraData.nombre || "GIRA";
        const zona = giraData.zona || "ZONA";
        const folderName = `${mes} | ${nomenclador} | ${zona}`;

        setExportStatus(`Creando carpeta: ${folderName}...`);
        const { data: folderData, error: folderError } =
          await supabase.functions.invoke("manage-drive", {
            body: { action: "create_folder", folderName: folderName },
          });

        if (folderError) throw new Error(folderError.message);
        driveFolderId = folderData.folderId;
        await updateConfig("link_drive", driveFolderId);
      }

      const selectedIds = Array.from(selection);
      let count = 0;
      const totalOps = selectedIds.length;

      for (const id of selectedIds) {
        count++;
        const row = activeRows.find((r) => r.id_integrante === id);
        if (!row) continue;

        const fullPersona = fullRoster.find((p) => String(p.id) === String(id));

        if (opts.viatico) {
          setExportStatus(
            `(${count}/${totalOps}) ${row.apellido}: Generando Viático...`
          );
          await generatePdf(row, "viatico", driveFolderId);
        }

        if (opts.destaque) {
          setExportStatus(
            `(${count}/${totalOps}) ${row.apellido}: Generando Destaque...`
          );
          await generatePdf(row, "destaque", driveFolderId);
        }

        if (opts.rendicion) {
          setExportStatus(
            `(${count}/${totalOps}) ${row.apellido}: Generando Rendición...`
          );
          await generatePdf(row, "rendicion", driveFolderId);
        }

        if (opts.docComun && fullPersona?.documentacion) {
          setExportStatus(
            `(${count}/${totalOps}) ${row.apellido}: Copiando Doc...`
          );
          await supabase.functions.invoke("manage-drive", {
            body: {
              action: "copy_file",
              sourceUrl: fullPersona.documentacion,
              targetParentId: driveFolderId,
              newName: `Documentacion - ${row.apellido} ${row.nombre}`,
            },
          });
        }
      }

      setExportStatus("¡Listo! Todo subido.");
      alert("Proceso completado correctamente.");
    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setIsExporting(false);
      setExportStatus("");
      setExportingRow(null);
      setExportMode("viatico");
      setSelection(new Set());
    }
  };

  if (printingRow) {
    return (
      <div className="h-full bg-white p-4 overflow-auto animate-in fade-in duration-200">
        <div className="max-w-[1100px] mx-auto">
          <button
            onClick={() => {
              setPrintingRow(null);
              setExportMode("viatico");
            }}
            className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold no-print"
          >
            <IconArrowLeft size={16} /> Volver a la lista
          </button>

          {exportMode === "rendicion" ? (
            <RendicionForm data={printingRow} configData={config} />
          ) : (
            <ViaticosForm
              onBack={() => {
                setPrintingRow(null);
                setExportMode("viatico");
              }}
              initialData={printingRow}
              configData={config}
              hideAmounts={exportMode === "destaque"}
              hideToolbar={false}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 shrink-0 z-30 relative shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <IconCalculator className="text-indigo-600" /> Viáticos
          </h2>
          <div className="flex gap-2">
            {/* BOTÓN EXPORTAR EXCEL NUEVO */}
            <button
              onClick={() => exportViaticosToExcel(giraData, activeRows)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors text-sm font-bold"
              title="Descargar Excel (.xlsx)"
            >
              <IconFileExcel size={18} />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>

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
              {showExpenses ? <IconEye size={14} /> : <IconEyeOff size={14} />}
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
            <div className="w-px h-8 bg-slate-200 mx-2"></div>
            <button
              onClick={handleAddProduction}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors shadow-sm"
            >
              <IconBriefcase size={16} /> + Producción
            </button>
            <button
              onClick={() => setIsAddOpen(!isAddOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all ${
                isAddOpen
                  ? "bg-slate-200 text-slate-800"
                  : "bg-slate-800 text-white hover:bg-slate-700"
              }`}
            >
              <IconUserPlus size={16} /> {isAddOpen ? "Cerrar" : "Agregar..."}
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
                  className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold flex justify-center items-center gap-2"
                >
                  <IconPlus size={16} /> Agregar
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <div className="bg-white px-2 py-1 rounded border border-indigo-100 flex items-center gap-1 shadow-sm">
              <span className="text-xs font-bold text-indigo-700">BASE:</span>
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
                placeholder="Ej: Gira Patagónica 2024"
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
                onChange={(e) => updateConfig("lugar_comision", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative z-0">
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-w-[1500px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] sticky top-0 z-10 shadow-sm border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 w-8 text-center bg-slate-50">
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
                  <th className="px-3 py-3 bg-slate-50 w-48">Integrante</th>
                  <th className="px-2 py-3 bg-slate-50 w-32">Cargo/Función</th>
                  <th className="px-2 py-3 bg-slate-50 w-24">Jornada</th>
                  <th className="px-2 py-3 bg-slate-50 border-l w-56">
                    Salida (D/H)
                  </th>
                  <th className="px-2 py-3 bg-slate-50 border-r w-56">
                    Llegada (D/H)
                  </th>
                  <th className="px-1 py-3 text-center bg-slate-50 w-12">
                    Días
                  </th>
                  <th className="px-1 py-3 text-center bg-slate-50 w-16">%</th>
                  <th className="px-1 py-3 text-center bg-amber-50 text-amber-700 w-10">
                    Temp
                  </th>
                  <th className="px-2 py-3 text-right bg-slate-100 text-slate-600 w-24">
                    $ Diario
                  </th>
                  <th className="px-2 py-3 text-right bg-indigo-50 text-indigo-800 font-bold w-24 border-r border-indigo-100">
                    Subtotal
                  </th>
                  {showTransport && (
                    <>
                      <th className="px-2 py-3 text-center bg-blue-50 text-blue-700 w-20">
                        Medios
                      </th>
                      <th className="px-2 py-3 bg-blue-50 text-blue-700 w-32">
                        Oficial
                      </th>
                      <th className="px-2 py-3 bg-blue-50 text-blue-700 w-32">
                        Particular
                      </th>
                      <th className="px-2 py-3 bg-blue-50 text-blue-700 w-32 border-r border-blue-100">
                        Otros
                      </th>
                    </>
                  )}
                  {showExpenses && (
                    <>
                      <th className="px-2 py-3 text-right text-slate-400 font-normal w-20">
                        Mov.
                      </th>
                      <th className="px-2 py-3 text-right text-slate-400 font-normal w-20">
                        Comb.
                      </th>
                      <th className="px-2 py-3 text-right text-slate-400 font-normal w-20">
                        Otros
                      </th>
                      <th className="px-2 py-3 text-right text-slate-400 font-normal w-20">
                        Capac.
                      </th>
                      <th className="px-2 py-3 text-right text-slate-400 font-normal w-20">
                        M.Otr
                      </th>
                      <th className="px-2 py-3 text-right text-slate-400 font-normal border-r w-20">
                        Aloj.
                      </th>
                    </>
                  )}

                  <th className="px-3 py-3 text-right bg-slate-800 text-white w-28">
                    Total Final
                  </th>
                  {showRendiciones && (
                    <>
                      <th className="px-2 py-3 bg-green-50 text-green-700 w-20 border-l border-green-100">
                        R. Viát.
                      </th>
                      <th className="px-2 py-3 bg-green-50 text-green-700 w-20">
                        R. Aloj.
                      </th>
                      <th className="px-2 py-3 bg-green-50 text-green-700 w-20">
                        R. Pasajes
                      </th>
                      <th className="px-2 py-3 bg-green-50 text-green-700 w-20">
                        R. Comb.
                      </th>
                      <th className="px-2 py-3 bg-green-50 text-green-700 w-20">
                        R. Mov.Otr
                      </th>
                      <th className="px-2 py-3 bg-green-50 text-green-700 w-20">
                        R. Capac.
                      </th>
                      <th className="px-2 py-3 bg-green-50 text-green-700 w-24 border-r border-green-100">
                        R. Otros T.
                      </th>
                    </>
                  )}
                  <th className="px-2 py-3 w-16 bg-slate-50 text-center">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activeRows.map((row) => {
                  const isSelected = selection.has(row.id_integrante);
                  const { valorDiarioCalc, subtotal, totalFinal } =
                    calculateRow(row);
                  const rowWithTotals = {
                    ...row,
                    valorDiarioCalc,
                    subtotal,
                    totalFinal,
                  };

                  return (
                    <tr
                      key={row.id_integrante}
                      className={`hover:bg-slate-50 transition-colors group ${
                        isSelected ? "bg-indigo-50/60" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(row.id_integrante)}
                          className="rounded text-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-700">
                        {row.apellido}, {row.nombre}
                        <div className="text-[9px] text-slate-400">
                          {row.rol_roster}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-slate-600"
                          value={row.cargo || ""}
                          onChange={(e) =>
                            updateRow(row.id, "cargo", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-slate-600"
                          placeholder="-"
                          value={row.jornada_laboral || ""}
                          onChange={(e) =>
                            updateRow(row.id, "jornada_laboral", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-2 py-2 border-l">
                        <div className="flex gap-2 items-center">
                          <DateInput
                            value={row.fecha_salida}
                            onChange={(val) =>
                              updateRow(row.id, "fecha_salida", val)
                            }
                            className="w-32 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-xs font-medium text-slate-700 [&_input]:pl-2 [&_div.absolute]:hidden"
                          />
                          <TimeInput
                            value={row.hora_salida}
                            onChange={(val) =>
                              updateRow(row.id, "hora_salida", val)
                            }
                            className="w-20 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-[10px] text-slate-500 text-center [&_input]:pr-2 [&_button]:hidden"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 border-r">
                        <div className="flex gap-2 items-center">
                          <DateInput
                            value={row.fecha_llegada}
                            onChange={(val) =>
                              updateRow(row.id, "fecha_llegada", val)
                            }
                            className="w-32 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-xs font-medium text-slate-700 [&_input]:pl-2 [&_div.absolute]:hidden"
                          />
                          <TimeInput
                            value={row.hora_llegada}
                            onChange={(val) =>
                              updateRow(row.id, "hora_llegada", val)
                            }
                            className="w-20 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-[10px] text-slate-500 text-center [&_input]:pr-2 [&_button]:hidden"
                          />
                        </div>
                      </td>
                      <td className="px-1 py-2 text-center font-mono font-bold text-slate-700 bg-slate-50">
                        {row.dias_computables}
                      </td>
                      <td className="px-1 py-2 text-center">
                        <select
                          className="bg-transparent text-xs text-center outline-none border-b border-transparent hover:border-slate-300 focus:border-indigo-500 cursor-pointer"
                          value={row.porcentaje || 100}
                          onChange={(e) =>
                            updateRow(row.id, "porcentaje", e.target.value)
                          }
                        >
                          <option value="100">100%</option>
                          <option value="80">80%</option>
                          <option value="0">0%</option>
                        </select>
                      </td>
                      <td className="px-1 py-2 text-center">
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
                          className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-slate-500">
                        ${valorDiarioCalc}
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30 border-r border-indigo-100">
                        ${subtotal}
                      </td>
                      {showTransport && (
                        <>
                          <td className="px-2 py-2 text-center border-l bg-slate-50">
                            <div className="flex flex-col gap-1 items-start text-[10px] text-slate-600">
                              <label className="flex items-center gap-1 cursor-pointer">
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
                              <label className="flex items-center gap-1 cursor-pointer">
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
                          <td className="px-2 py-2 bg-slate-50">
                            <div className="flex flex-col gap-1">
                              <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={row.check_patente_oficial || false}
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
                          <td className="px-2 py-2 bg-slate-50">
                            <div className="flex flex-col gap-1">
                              <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
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
                          <td className="px-2 py-2 bg-slate-50 border-r border-slate-200">
                            <div className="flex flex-col gap-1">
                              <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
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
                          <td className="px-1 py-2">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-indigo-500 text-slate-500"
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
                          <td className="px-1 py-2">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-indigo-500 text-slate-500"
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
                          <td className="px-1 py-2">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-indigo-500 text-slate-500"
                              placeholder="-"
                              value={row.gasto_otros || ""}
                              onChange={(e) =>
                                updateRow(row.id, "gasto_otros", e.target.value)
                              }
                            />
                          </td>
                          <td className="px-1 py-2">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-indigo-500 text-slate-500"
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
                          <td className="px-1 py-2">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-indigo-500 text-slate-500"
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
                          <td className="px-1 py-2 border-r">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-indigo-500 text-slate-500"
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
                      <td className="px-3 py-2 text-right font-bold text-slate-900 bg-slate-50 border-l">
                        ${totalFinal}
                      </td>
                      {showRendiciones && (
                        <>
                          <td className="px-1 py-2 bg-green-50/20 border-l border-green-100">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-green-400 text-green-700 font-medium"
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
                          <td className="px-1 py-2 bg-green-50/20">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-green-400 text-green-700 font-medium"
                              value={row.rendicion_gasto_alojamiento || ""}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  "rendicion_gasto_alojamiento",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="px-1 py-2 bg-green-50/20">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-green-400 text-green-700 font-medium"
                              value={row.rendicion_gasto_otros || ""}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  "rendicion_gasto_otros",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="px-1 py-2 bg-green-50/20">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-green-400 text-green-700 font-medium"
                              value={row.rendicion_gasto_combustible || ""}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  "rendicion_gasto_combustible",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="px-1 py-2 bg-green-50/20">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-green-400 text-green-700 font-medium"
                              value={row.rendicion_gastos_movil_otros || ""}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  "rendicion_gastos_movil_otros",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="px-1 py-2 bg-green-50/20">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-green-400 text-green-700 font-medium"
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
                          <td className="px-1 py-2 bg-green-50/20 border-r border-green-100">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-transparent hover:border-green-400 text-green-700 font-medium"
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
                      <td className="px-3 py-2 text-right relative">
                        <button
                          onClick={() =>
                            setPrintMenuId(
                              printMenuId === row.id_integrante
                                ? null
                                : row.id_integrante
                            )
                          }
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                          title="Imprimir / Exportar..."
                        >
                          <IconPrinter size={18} />
                        </button>

                        {/* MENÚ DESPLEGABLE */}
                        {printMenuId === row.id_integrante && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setPrintMenuId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-lg z-20 py-1 animate-in fade-in zoom-in duration-100 flex flex-col">
                              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-50">
                                Exportar Individual
                              </div>

                              {/* --- OPCIÓN EXCEL (NUEVO) --- */}
                              <button
                                onClick={() => {
                                  setPrintMenuId(null);
                                  // Pasamos un array con SOLO este integrante, y la configuración
                                  exportViaticosToExcel(
                                    giraData,
                                    [rowWithTotals],
                                    config
                                  );
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center gap-2 text-emerald-700 font-medium border-b border-slate-50"
                              >
                                <IconFileExcel size={16} /> Excel (Editable)
                              </button>
                              <button
                                onClick={() => {
                                  setPrintMenuId(null);
                                  // Usar el nuevo exportador de formularios PDF
                                  exportViaticosToPDFForm(
                                    giraData,
                                    [rowWithTotals],
                                    config
                                  );
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 flex items-center gap-2 text-red-700 font-medium border-b border-slate-50"
                              >
                                <IconFilePdf size={16} /> PDF Oficial
                              </button>
                              {/* --------------------------- */}

                              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                                Vista Previa / PDF
                              </div>

                              <button
                                onClick={() => {
                                  setPrintMenuId(null);
                                  handlePreview(row, "viatico");
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center gap-2 text-slate-700"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                Formulario Viático
                              </button>
                              <button
                                onClick={() => {
                                  setPrintMenuId(null);
                                  handlePreview(rowWithTotals, "destaque");
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center gap-2 text-slate-700"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                Formulario Destaque
                              </button>
                              <button
                                onClick={() => {
                                  setPrintMenuId(null);
                                  handlePreview(row, "rendicion");
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center gap-2 text-slate-700"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Planilla Rendición
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selection.size > 0 && (
          <ViaticosBulkEditPanel
            selectionSize={selection.size}
            onClose={() => setSelection(new Set())}
            values={batchValues}
            setValues={setBatchValues}
            onApply={applyBatch}
            loading={loading}
            onExport={handleExportToDrive}
            isExporting={isExporting}
            exportStatus={exportStatus}
          />
        )}
      </div>

      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -50 }}>
        {exportingRow && (
          <div
            id="target-pdf-content"
            style={{ width: "1000px", backgroundColor: "white" }}
          >
            {exportMode === "rendicion" ? (
              <RendicionForm data={exportingRow} configData={config} />
            ) : (
              <ViaticosForm
                initialData={exportingRow}
                configData={config}
                onBack={() => {}}
                hideToolbar={true}
                hideAmounts={exportMode === "destaque"}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
