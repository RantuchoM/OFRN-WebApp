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
  IconDrive,
} from "../../../components/ui/Icons";
import { useGiraRoster } from "../../../hooks/useGiraRoster";
import ViaticosForm from "./ViaticosForm";
import ViaticosBulkEditPanel from "./ViaticosBulkEditPanel";

// Importamos tus inputs personalizados
import DateInput from "../../../components/ui/DateInput";
import TimeInput from "../../../components/ui/TimeInput";

// LIBRERÍA PDF
// ELIMINA: import html2pdf from "html2pdf.js";
// AGREGA ESTOS DOS:
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
// --- UTILIDADES DE FORMATO ---
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

// --- LÓGICA DE CÁLCULO ---
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

// --- LÓGICA DE NEGOCIO AUTOMÁTICA ---
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
  const { roster: fullRoster } = useGiraRoster(supabase, { id: giraId });
  const [viaticosRows, setViaticosRows] = useState([]);
  const [selection, setSelection] = useState(new Set());
  const [giraData, setGiraData] = useState(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState(null);

  // TOGGLES DE VISUALIZACIÓN
  const [showExpenses, setShowExpenses] = useState(true);
  const [showTransport, setShowTransport] = useState(false);

  const [printingRow, setPrintingRow] = useState(null);

  // ESTADOS DE EXPORTACIÓN
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [exportingRow, setExportingRow] = useState(null); // Fila oculta para renderizar PDF

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

  // Fetch Data (CORREGIDO: tabla 'programas')
  useEffect(() => {
    if (giraId) {
      // 1. Obtener datos del Programa (antes llamado Gira)
      supabase
        .from("programas")
        .select("*")
        .eq("id", giraId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Error cargando programa/gira:", error);
          } else if (data) {
            setGiraData(data);
          }
        });

      // 2. Obtener configuración y filas
      fetchViaticosData();
    }
  }, [giraId]);

  // Recalculo visual batch
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
        // Asumiendo que la tabla config usa 'id_gira' como FK aunque la tabla principal sea 'programas'
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
        .select("*")
        .order("id_integrante");
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

  const updateConfig = async (key, val) => {
    await supabase
      .from("giras_viaticos_config")
      .update({ [key]: val })
      .eq("id_gira", giraId);
    setConfig((prev) => ({ ...prev, [key]: val }));
  };

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

  // --- EXPORTACIÓN A DRIVE (Integrada y Blindada) ---
  // --- EXP// --- EXPORTACIÓN A DRIVE (Estrategia: FOTO EXACTA / html-to-image) ---
  const handleExportToDrive = async () => {
    if (selection.size === 0)
      return alert("Selecciona al menos un integrante.");
    if (!giraData) return alert("Cargando datos de gira...");

    setIsExporting(true);
    setExportStatus("Preparando...");

    try {
      // 1. Verificar / Crear Carpeta (Esto se queda igual, es rápido)
      let driveFolderId = config.link_drive;
      if (!driveFolderId) {
        const mes = getMonthName(giraData.fecha_desde);
        const nomenclador = giraData.nomenclador || giraData.nombre || "GIRA";
        const zona = config.giraData.zona || "ZONA";
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

      // 2. Proceso de Generación
      const selectedIds = Array.from(selection);
      let count = 0;

      // Cola de promesas de subida (para no bloquear la generación visual)
      const uploadPromises = [];

      for (const id of selectedIds) {
        count++;
        const row = activeRows.find((r) => r.id_integrante === id);
        if (!row) continue;

        setExportStatus(
          `Generando (${count}/${selectedIds.length}): ${row.apellido}...`
        );

        // A. Renderizamos
        const { valorDiarioCalc, subtotal, totalFinal } = calculateRow(row);
        const rowToPrint = { ...row, valorDiarioCalc, subtotal, totalFinal };

        setExportingRow(rowToPrint);

        // Reducimos el tiempo de espera. 300ms suele ser suficiente si no hay imágenes externas pesadas
        await new Promise((resolve) => setTimeout(resolve, 300));

        const element = document.getElementById("target-pdf-content");
        if (!element) throw new Error("Error render");
        // C. Configuración Ajustada (Ancho 1150px)
        const opt = {
          margin: 0, // Sin márgenes blancos extra
          filename: `Viaticos - ${row.apellido} ${row.nombre}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            scrollY: 0,
            // AUMENTAMOS ANCHO PARA EVITAR CORTES LATERALES
            windowWidth: 1150,
            width: 1150,
            x: 0,
            y: 0,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
        };
        // B. FOTO RÁPIDA Y LIGERA
        // Usamos toJpeg en lugar de toPng y skipFonts
        // import { toJpeg } from 'html-to-image'; <--- ASEGURATE DE IMPORTAR ESTO
        const dataUrl = await toPng(element, {
          quality: 0.85, // Calidad 85% (muy buena, mucho menos peso)
          backgroundColor: "white",
          pixelRatio: 1.5, // Bajamos de 2 a 1.5 (suficiente para impresión A4)
          skipFonts: true, // CRÍTICO: Evita el timeout de 60s buscando fuentes
          cacheBust: true, // Evita caché de imágenes rotas
        });

        // C. Armar PDF
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // 'FAST' es un método de compresión de PDF
        pdf.addImage(
          dataUrl,
          "JPEG",
          0,
          0,
          pdfWidth,
          pdfHeight,
          undefined,
          "FAST"
        );

        const pdfBlob = pdf.output("blob");

        // D. Convertir a Base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(pdfBlob);
        });
        const cleanBase64 = base64.split(",")[1];

        // E. SUBIDA ASÍNCRONA (No esperamos a que termine para seguir con el siguiente visualmente)
        // Guardamos la promesa en un array y seguimos
        const uploadTask = supabase.functions
          .invoke("manage-drive", {
            body: {
              action: "upload_file",
              parentId: driveFolderId,
              fileName: `Viaticos - ${row.apellido} ${row.nombre}.pdf`,
              fileBase64: cleanBase64,
              mimeType: "application/pdf",
            },
          })
          .then(({ error }) => {
            if (error) console.error(`Error subiendo ${row.apellido}:`, error);
          });

        uploadPromises.push(uploadTask);
      }

      setExportStatus("Finalizando subidas en segundo plano...");

      // Esperamos a que todas las subidas terminen juntas al final
      await Promise.all(uploadPromises);

      setExportStatus("¡Listo!");
      alert("Proceso completado. Todos los archivos están en Drive.");
    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setIsExporting(false);
      setExportStatus("");
      setExportingRow(null);
      setSelection(new Set());
    }
  };
  if (printingRow) {
    return (
      <div className="h-full bg-slate-100 p-4 overflow-auto animate-in fade-in duration-200">
        <ViaticosForm
          onBack={() => setPrintingRow(null)}
          initialData={printingRow}
          configData={config}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* ... (TODA LA PARTE DEL HEADER Y LA TABLA SE MANTIENE IGUAL QUE ANTES) ... */}

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 shrink-0 z-30 relative shadow-sm">
        {/* ... contenido del header ... */}
        {/* (Copia el header de tu versión anterior, no cambia nada aquí) */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <IconCalculator className="text-indigo-600" /> Viáticos
          </h2>
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
              {showExpenses ? <IconEye size={14} /> : <IconEyeOff size={14} />}
            </button>
            <div className="w-px h-8 bg-slate-200 mx-2"></div>
            <button
              onClick={handleAddProduction}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors shadow-sm"
            >
              {loading ? (
                <IconLoader className="animate-spin" size={16} />
              ) : (
                <IconBriefcase size={16} />
              )}{" "}
              + Producción
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
                  {loading ? (
                    <IconLoader className="animate-spin" size={16} />
                  ) : (
                    <IconPlus size={16} />
                  )}{" "}
                  Agregar
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
        {/* ... TABLA (Igual que antes) ... */}
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
                              value={row.gastos_movilidad}
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
                              value={row.gasto_combustible}
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
                              value={row.gasto_otros}
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
                              value={row.gastos_capacit}
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
                              value={row.gastos_movil_otros}
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
                              value={row.gasto_alojamiento}
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
                      <td className="px-2 py-2 text-center flex justify-center gap-1">
                        <button
                          onClick={() => setPrintingRow(rowWithTotals)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                          title="Imprimir Solicitud"
                        >
                          <IconPrinter size={16} />
                        </button>
                        <button
                          onClick={() => handleRemovePerson(row.id)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"
                        >
                          <IconTrash size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- COMPONENTE PANEL DE EDICIÓN MASIVA --- */}
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

      {/* --- CONTENEDOR OCULTO --- */}
      {/* ESTRATEGIA "PIXEL PERFECT":
          1. position fixed off-screen: Garantiza que el render no afecte al flujo pero sí exista en el DOM.
          2. width: 1100px: Ancho exacto que "engaña" a la hoja para renderizarse completa como en escritorio.
          3. pdf-export-mode: Clase CSS que inyectamos en ViaticosSheet.css para arreglar los softmerge.
      */}
      {/* --- CONTENEDOR OCULTO PARA EXPORTACIÓN --- */}
      {/* --- CONTENEDOR OCULTO (Estrategia html-to-image) --- */}
      {/* --- CONTENEDOR OCULTO --- */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -50 }}>
        {exportingRow && (
          <div
            id="viaticos-pdf-export-container"
            style={{
              width: "1050px", // <--- Debe coincidir o ser mayor al width de html2canvas
              backgroundColor: "white",
              padding: "0",
              margin: "0",
            }}
          >
            <ViaticosForm
              initialData={exportingRow}
              configData={config}
              onBack={() => {}}
              hideToolbar={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
