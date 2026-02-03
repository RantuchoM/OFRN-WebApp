import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconCalculator, IconPlus, IconUserPlus, IconSearch, IconCheck, IconChevronDown, 
  IconChevronRight, IconBriefcase, IconEye, IconEyeOff, IconDrive, IconBus, 
  IconCloudUpload, IconLoader, IconRefresh,
} from "../../../components/ui/Icons";
import { useLogistics } from "../../../hooks/useLogistics";
import ViaticosForm from "./ViaticosForm";
import ViaticosBulkEditPanel from "./ViaticosBulkEditPanel";
import { exportViaticosToPDFForm } from "../../../utils/pdfFormExporter";
import RendicionForm from "./RendicionForm";
import DestaquesLocationPanel from "./DestaquesLocationPanel";
import ViaticosTable from "./ViaticosTable";
import { PDFDocument } from "pdf-lib";
import { Toaster, toast } from "sonner"; 
import ConfirmModal from "../../../components/ui/ConfirmModal";
import ManualTrigger from "../../../components/manual/ManualTrigger";
import { useViaticosIndividuales } from "../../../hooks/viaticos/useViaticosIndividuales";
import { useViaticosMasivos } from "../../../hooks/viaticos/useViaticosMasivos";

const uint8ArrayToBase64 = (uint8Array) => {
  let binary = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return window.btoa(binary);
};

const normalizeStr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const esPerfilMasivo = (persona) => {
  const condicion = normalizeStr(persona.condicion);
  const rol = normalizeStr(persona.rol_gira || persona.rol); 
  const esEstable = condicion === "estable";
  const esRolMusicoOSolista = rol.includes("music") || rol.includes("solista") || (rol === "" && persona.id_instr);
  return esEstable && esRolMusicoOSolista;
};

const MemberSearchSelect = ({ options = [], value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
  
    useEffect(() => {
      function handleClickOutside(event) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
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
      return options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()));
    }, [options, search]);
  
    const selectedLabel = options?.find((o) => o.value === value)?.label || "";
  
    return (
      <div className="relative w-full" ref={wrapperRef}>
        <div onClick={() => setIsOpen(!isOpen)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white flex items-center justify-between cursor-pointer hover:border-indigo-400 shadow-sm select-none">
          <span className={value ? "text-slate-700 font-medium" : "text-slate-400"}>{value ? selectedLabel : placeholder}</span>
          <IconChevronDown size={16} className="text-slate-400" />
        </div>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden animate-in zoom-in-95 flex flex-col max-h-60">
            <div className="p-2 border-b bg-slate-50 relative shrink-0">
              <IconSearch size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input ref={inputRef} type="text" className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500/50 outline-none" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center italic">Sin resultados</div>
              ) : (
                filteredOptions.map((opt, i) => (
                  <div key={`${opt.value}-${i}`} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 flex justify-between ${value === opt.value ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700"}`}>
                    <div className="flex flex-col"><span>{opt.label}</span>{opt.subLabel && <span className="text-[10px] text-slate-400">{opt.subLabel}</span>}</div>
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
  const [config, setConfig] = useState({ valor_diario_base: 0, factor_temporada: 0, motivo: "", lugar_comision: "", link_drive: "", porcentaje_destaques: 100 });
  const [latestGlobalValue, setLatestGlobalValue] = useState(0);
  const saveTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef({});

  const [giraData, setGiraData] = useState(null);
  const giraObj = useMemo(() => giraData || { id: giraId }, [giraData, giraId]);
  const { summary, roster, routeRules, transportes, loading: rosterLoading } = useLogistics(supabase, giraObj);

  const logisticsMap = useMemo(() => {
    if (!summary) return {};
    const map = {};
    summary.forEach((person) => {
      const transports = person.logistics?.transports || [];
      if (transports.length === 0) return;
      let minSalida = null, maxLlegada = null;
      transports.forEach((t) => {
        let nombreFinal = t.nombre || "Transporte";
        if (t.detalle && t.detalle.trim() !== "") nombreFinal = `${nombreFinal} - ${t.detalle}`;
        if (t.subidaData) {
          const dateTimeStr = `${t.subidaData.fecha}T${t.subidaData.hora || "00:00"}`;
          const dateObj = new Date(dateTimeStr);
          if (!minSalida || dateObj < minSalida.dt) {
            minSalida = { dt: dateObj, fecha: t.subidaData.fecha, hora: t.subidaData.hora ? t.subidaData.hora.slice(0, 5) : "00:00", lugar: t.subidaData.nombre_localidad || "Origen", transporte: nombreFinal, patente: t.patente || t.transporteData?.patente || "" };
          }
        }
        if (t.bajadaData) {
          const dateTimeStr = `${t.bajadaData.fecha}T${t.bajadaData.hora || "00:00"}`;
          const dateObj = new Date(dateTimeStr);
          if (!maxLlegada || dateObj > maxLlegada.dt) {
            maxLlegada = { dt: dateObj, fecha: t.bajadaData.fecha, hora: t.bajadaData.hora ? t.bajadaData.hora.slice(0, 5) : "00:00", lugar: t.bajadaData.nombre_localidad || "Destino", transporte: nombreFinal };
          }
        }
      });
      if (minSalida || maxLlegada) {
        map[person.id] = { fecha_salida: minSalida?.fecha, hora_salida: minSalida?.hora, transporte_salida: minSalida?.transporte, lugar_salida: minSalida?.lugar, patente: minSalida?.patente, fecha_llegada: maxLlegada?.fecha, hora_llegada: maxLlegada?.hora, transporte_llegada: maxLlegada?.transporte, lugar_llegada: maxLlegada?.lugar };
      }
    });
    return map;
  }, [summary]);

  const { rows: viaticosRows, loading: rowsLoading, fetchRows: fetchViaticos, updateRow, deleteRow, addPerson, addBatch, feedback: feedbackIndividual } = useViaticosIndividuales(supabase, giraId, roster, logisticsMap, config);
  const { configs: destaquesConfigs, updateLocationConfig, feedback: feedbackMasivo } = useViaticosMasivos(supabase, giraId);

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [selection, setSelection] = useState(new Set());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState(null);

  const [showDatos, setShowDatos] = useState(true);
  const [showAnticipo, setShowAnticipo] = useState(true);
  const [showTransport, setShowTransport] = useState(false);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showRendiciones, setShowRendiciones] = useState(false);
  const [showIndividualPanel, setShowIndividualPanel] = useState(true);
  const [showMassivePanel, setShowMassivePanel] = useState(true);

  // ESTADOS DE EXPORTACIÓN
  const [confirmPromise, setConfirmPromise] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [exportDetail, setExportDetail] = useState(""); // Segunda línea de detalle
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [notification, setNotification] = useState(null);

  const [batchValues, setBatchValues] = useState({
    cargo: "", jornada_laboral: "", gastos_movilidad: "", gasto_combustible: "", gasto_alojamiento: "", gasto_pasajes: "", gasto_otros: "", gastos_capacit: "", gastos_movil_otros: "", check_aereo: "", check_terrestre: "", check_patente_oficial: "", patente_oficial: "", check_patente_particular: "", patente_particular: "", check_otros: "", transporte_otros: "", rendicion_viaticos: "", rendicion_gasto_alojamiento: "", rendicion_gasto_pasajes: "", rendicion_gasto_combustible: "", rendicion_gastos_movil_otros: "", rendicion_gastos_capacit: "", rendicion_transporte_otros: "",
  });

  useEffect(() => {
    if (giraId) {
      supabase.from("programas").select("*").eq("id", giraId).single().then(({ data }) => { if (data) setGiraData(data); });
      fetchViaticos(); 
      fetchConfigGlobal();
    }
  }, [giraId, fetchViaticos]);

  const fetchConfigGlobal = async () => {
      setLoadingConfig(true);
      try {
        const { data: maxGlobalData } = await supabase.from("giras_viaticos_config").select("valor_diario_base").order("valor_diario_base", { ascending: false }).limit(1).single();
        const maxVal = maxGlobalData?.valor_diario_base || 0;
        setLatestGlobalValue(maxVal);

        const { data: conf } = await supabase.from("giras_viaticos_config").select("*").eq("id_gira", giraId).single();
        if (conf) {
          if (!conf.valor_diario_base || conf.valor_diario_base === 0) {
            setConfig({ ...conf, valor_diario_base: maxVal });
            if (maxVal > 0) await supabase.from("giras_viaticos_config").update({ valor_diario_base: maxVal }).eq("id_gira", giraId);
          } else {
            setConfig(conf);
          }
        } else {
          const { data: newConf } = await supabase.from("giras_viaticos_config").insert([{ id_gira: giraId, valor_diario_base: maxVal }]).select().single();
          if (newConf) setConfig(newConf);
        }
      } catch(e) { console.error(e) }
      finally { setLoadingConfig(false) }
  }

  const updateConfig = (key, val) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, [key]: val };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const changesToSave = pendingUpdatesRef.current;
      pendingUpdatesRef.current = {};
      try {
        await supabase.from("giras_viaticos_config").update(changesToSave).eq("id_gira", giraId);
      } catch (err) {
        console.error("Error guardando config:", err);
      }
    }, 1000);
  };

  const individualsPendingCount = useMemo(() => {
    if (!roster || roster.length === 0) return 0;
    const existingIds = new Set(viaticosRows.map((r) => String(r.id_integrante)));
    return roster.filter((p) => {
      if (p.estado_gira === "ausente") return false;
      if (existingIds.has(String(p.id))) return false;
      if (esPerfilMasivo(p)) return false;
      return true;
    }).length;
  }, [roster, viaticosRows]);

  const candidateOptions = useMemo(() => {
    if (!roster) return [];
    const existingIds = new Set(viaticosRows.map((r) => String(r.id_integrante)));
    return roster
      .filter((p) => p.estado_gira !== "ausente" && !existingIds.has(String(p.id)))
      .map((p) => ({ value: p.id, label: `${p.apellido || ""}, ${p.nombre || ""}`, subLabel: p.rol_gira || p.rol || "Sin Rol" }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [roster, viaticosRows]);

  const massiveRoster = useMemo(() => {
    return (roster || []).filter((p) => esPerfilMasivo(p) && p.estado_gira !== "ausente");
  }, [roster]);

  const handleAddIndividuals = async () => {
    const existingIds = new Set(viaticosRows.map(r => String(r.id_integrante)));
    roster.forEach(p => {
        if (!esPerfilMasivo(p) && p.estado_gira !== 'ausente' && !existingIds.has(String(p.id))) {
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
        body: { action: "create_viaticos_folder", giraId: parseInt(giraId), nombreSet: giraData?.nombre || "Gira" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Error al crear carpeta");
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

  const uploadPdfToDrive = async (pdfBytes, fileName, parentId) => {
    const fileBase64 = uint8ArrayToBase64(pdfBytes);
    const { data, error } = await supabase.functions.invoke("manage-drive", {
      body: { action: "upload_file", fileBase64, fileName, parentId, mimeType: "application/pdf" },
    });
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    return data;
  };

  const fetchPdfFromDrive = async (driveUrl) => {
    try {
      if (driveUrl.includes("supabase.co")) {
        const res = await fetch(driveUrl);
        const arrayBuffer = await res.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "get_file_content", sourceUrl: driveUrl },
      });
      if (error) throw error;
      if (!data || !data.success) throw new Error(data?.error || "Error descargando archivo");
      
      const binaryString = window.atob(data.fileBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
      return bytes;
    } catch (err) { console.error("Error fetchPdfFromDrive:", err); return null; }
  };

  const copyDriveFile = async (url, targetFolder, newName) => {
      const isBucket = url.includes("supabase.co");
      await supabase.functions.invoke("manage-drive", {
          body: { action: isBucket ? "upload_from_url" : "copy_file", sourceUrl: url, targetParentId: targetFolder, newName }
      });
  };

  const appendPersonToDoc = async (targetDoc, personData, options, giraData, config, setDetail) => {
      const name = personData.apellido;
      
      const mergeBytes = async (bytes, label) => {
          if(!bytes) return;
          try {
            const srcDoc = await PDFDocument.load(bytes);
            const copiedPages = await targetDoc.copyPages(srcDoc, srcDoc.getPageIndices());
            copiedPages.forEach(p => targetDoc.addPage(p));
          } catch(e) { 
            console.error(`Error fusionando ${label}:`, e); 
            toast.error(`Error al unir ${label} de ${name}`);
          }
      };

      const single = [personData];
      
      if (options.destaque) {
          if (setDetail) setDetail(`Generando Destaque (${name})...`);
          await mergeBytes(await exportViaticosToPDFForm(giraData, single, config, "destaque"), "Destaque");
      }
      if (options.viatico) {
          if (setDetail) setDetail(`Generando Viático (${name})...`);
          await mergeBytes(await exportViaticosToPDFForm(giraData, single, config, "viatico"), "Viático");
      }
      if (options.rendicion) {
          if (setDetail) setDetail(`Generando Rendición (${name})...`);
          await mergeBytes(await exportViaticosToPDFForm(giraData, single, config, "rendicion"), "Rendición");
      }
      
      if (options.docComun && personData.documentacion) {
          if (setDetail) setDetail(`Descargando Documentación (${name})...`);
          const bytes = await fetchPdfFromDrive(personData.documentacion);
          if (bytes) await mergeBytes(bytes, "Documentación");
      }
      if (options.docReducida && personData.docred) {
          if (setDetail) setDetail(`Descargando Doc. Reducida (${name})...`);
          const bytes = await fetchPdfFromDrive(personData.docred);
          if (bytes) await mergeBytes(bytes, "Doc. Reducida");
      }
  };

  const processExportList = async (dataList, folderId, options, involvedLocationIds = []) => {
    const now = new Date().toISOString();
    const dateStr = new Date().toLocaleDateString("es-AR").replace(/\//g, "-");
    const giraName = giraData?.nombre || "Gira";

    setExportStatus("Iniciando...");
    setExportDetail("Actualizando registros en BD...");

    const individualUpdates = dataList.filter(r => r.id).map(row => 
        supabase.from("giras_viaticos_detalle").update({
            fecha_ultima_exportacion: now,
            backup_fecha_salida: row.fecha_salida,
            backup_hora_salida: row.hora_salida,
            backup_fecha_llegada: row.fecha_llegada,
            backup_hora_llegada: row.hora_llegada,
            backup_dias_computables: row.dias_computables,
        }).eq("id", row.id)
    );
    
    const massUpdates = [];
    if (involvedLocationIds.length > 0) {
        involvedLocationIds.forEach(locConfigId => {
            const peopleInLoc = dataList.filter(p => p._massConfigId === locConfigId);
            if (peopleInLoc.length > 0) {
                const idsToAdd = peopleInLoc.map(p => p.id); 
                const currentConfig = destaquesConfigs[locConfigId] || {};
                const currentIds = currentConfig.ids_exportados_viatico || [];
                const newIds = [...new Set([...currentIds, ...idsToAdd])];
                massUpdates.push(
                    supabase.from("giras_destaques_config")
                        .update({ ids_exportados_viatico: newIds, fecha_ultima_exportacion: now })
                        .eq("id", currentConfig.id) 
                );
            }
        });
    }
    await Promise.all([...individualUpdates, ...massUpdates]);

    const total = dataList.length;
    const mode = options.unificationMode || 'individual'; 

    // MODO MASTER
    if (mode === 'master') {
        setExportStatus("Generando archivo maestro...");
        setExportDetail("Inicializando PDF unificado...");
        const masterDoc = await PDFDocument.create();
        let pagesAdded = 0;
        let count = 0;

        for (const personData of dataList) {
            count++;
            const name = `${personData.apellido}, ${personData.nombre}`;
            setExportStatus(`[${count}/${total}] Unificando: ${name}`);
            
            await appendPersonToDoc(masterDoc, personData, options, giraData, config, setExportDetail);
            pagesAdded++;
        }

        if (pagesAdded > 0) {
            setExportStatus("Subiendo a Drive...");
            setExportDetail("Guardando archivo maestro...");
            const masterBytes = await masterDoc.save();
            await uploadPdfToDrive(masterBytes, `Exportación Master - ${giraName} - ${dateStr}.pdf`, folderId);
            
            setNotification("Archivo Master creado correctamente");
            toast.success("Archivo Master creado correctamente");
        }

    // MODO LOCATION (Por Localidad)
    } else if (mode === 'location') {
        const groups = {};
        dataList.forEach(p => {
            const key = p._massConfigId || 'individuales';
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });

        const groupKeys = Object.keys(groups);
        let groupIdx = 0;

        for (const key of groupKeys) {
            groupIdx++;
            const groupData = groups[key];
            const groupName = groupData[0]._groupName || "Varios";
            
            setExportStatus(`Grupo [${groupIdx}/${groupKeys.length}]: ${groupName}`);
            
            const locDoc = await PDFDocument.create();
            let pagesInLoc = 0;
            let pCount = 0;

            for (const personData of groupData) {
                pCount++;
                const name = `${personData.apellido}, ${personData.nombre}`;
                setExportStatus(`[${groupIdx}/${groupKeys.length}] ${groupName}: ${pCount}/${groupData.length}`);
                
                await appendPersonToDoc(locDoc, personData, options, giraData, config, setExportDetail);
                pagesInLoc++;
            }

            if (pagesInLoc > 0) {
                setExportStatus(`Subiendo PDF: ${groupName}...`);
                setExportDetail(`Guardando en carpeta de la gira...`);
                const locBytes = await locDoc.save();
                await uploadPdfToDrive(locBytes, `${groupName} - ${dateStr}.pdf`, folderId);
            }
        }
        setNotification(`Se crearon ${groupKeys.length} archivos de localidad.`);
        toast.success(`Se crearon ${groupKeys.length} archivos de localidad.`);

    // MODO INDIVIDUAL
    } else {
        let count = 0;
        for (const personData of dataList) {
            count++;
            const nameSafe = `${personData.apellido}, ${personData.nombre}`;
            const prefix = `[${count}/${total}]`;
            setExportStatus(`${prefix} ${nameSafe}`);
            
            if (options.viatico) {
                setExportDetail("Generando PDF Viático...");
                const pdfBytes = await exportViaticosToPDFForm(giraData, [personData], config, "viatico");
                setExportDetail("Subiendo PDF Viático...");
                await uploadPdfToDrive(pdfBytes, `${nameSafe} - Viático.pdf`, folderId);
            }
            if (options.destaque) {
                setExportDetail("Generando PDF Destaque...");
                const pdfBytes = await exportViaticosToPDFForm(giraData, [personData], config, "destaque");
                setExportDetail("Subiendo PDF Destaque...");
                await uploadPdfToDrive(pdfBytes, `${nameSafe} - Destaque.pdf`, folderId);
            }
            if (options.rendicion) {
                setExportDetail("Generando PDF Rendición...");
                const pdfBytes = await exportViaticosToPDFForm(giraData, [personData], config, "rendicion");
                setExportDetail("Subiendo PDF Rendición...");
                await uploadPdfToDrive(pdfBytes, `${nameSafe} - Rendición.pdf`, folderId);
            }
            
            if (options.docComun && personData.documentacion) {
                setExportDetail("Duplicando Documentación en Drive...");
                await copyDriveFile(personData.documentacion, folderId, `${nameSafe} - Documentación`);
            }
            if (options.docReducida && personData.docred) {
                setExportDetail("Duplicando Doc. Reducida en Drive...");
                await copyDriveFile(personData.docred, folderId, `${nameSafe} - Doc. Reducida`);
            }
        }
        
        setNotification(`Se procesaron ${count} integrantes correctamente.`);
        toast.success(`Se procesaron ${count} integrantes correctamente.`);
    }
    setExportDetail(""); 
    setExportStatus("");
  };

  const handleExportLocationBatch = async (peopleArray, folderId, options, locationIdOrIds) => {
      if (!peopleArray || peopleArray.length === 0) return toast.error("No hay personas.");
      const targetFolderId = folderId || config.link_drive;
      if (!targetFolderId) return toast.error("Carpeta Drive no configurada.");

      setExportStatus("Preparando datos masivos...");
      setIsExporting(true);

      try {
        const richData = peopleArray.map(p => {
            const locId = p._massConfigId;
            const massConfig = destaquesConfigs[locId] || {}; 
            const rich = { ...p };

            rich.gasto_alojamiento = massConfig.gasto_alojamiento || 0;
            rich.gasto_combustible = massConfig.gasto_combustible || 0;
            rich.gasto_otros = massConfig.gasto_otros || 0;
            rich.gastos_movilidad = massConfig.gastos_movilidad || 0;
            rich.gastos_movil_otros = massConfig.gastos_movil_otros || 0;
            rich.gastos_capacit = massConfig.gastos_capacit || 0;
            rich.transporte_otros = massConfig.transporte_otros || "";
            
            rich.rendicion_gasto_alojamiento = massConfig.rendicion_gasto_alojamiento || 0;
            rich.rendicion_gasto_combustible = massConfig.rendicion_gasto_combustible || 0;
            rich.rendicion_gasto_otros = massConfig.rendicion_gasto_otros || 0;
            rich.rendicion_gastos_movil_otros = massConfig.rendicion_gastos_movil_otros || 0;
            rich.rendicion_gastos_capacit = massConfig.rendicion_gastos_capacit || 0;
            rich.rendicion_transporte_otros = massConfig.rendicion_transporte_otros || 0;
            rich.rendicion_viaticos = massConfig.rendicion_viatico_monto || 0; 

            rich.documentacion = p.documentacion || p.documentacion;
            rich.docred = p.docred || p.docred;
            rich.cargo = p.cargo || p.rol || ""; 
            rich.jornada = p.jornada_laboral || p.jornada || ""; 

            let dias = 0;
            if (p.travelData) {
                const start = new Date(p.travelData.fecha_salida + "T00:00:00");
                const end = new Date(p.travelData.fecha_llegada + "T00:00:00");
                const diffDays = Math.round((end - start) / (1000 * 3600 * 24));
                dias = diffDays < 0 ? 0 : (diffDays === 0 ? 0.5 : diffDays);
                
                rich.fecha_salida = p.travelData.fecha_salida;
                rich.hora_salida = p.travelData.hora_salida;
                rich.fecha_llegada = p.travelData.fecha_llegada;
                rich.hora_llegada = p.travelData.hora_llegada;
            } else {
                dias = massConfig.backup_dias_computables || 0;
            }
            rich.dias_computables = dias;

            const base = parseFloat(config.valor_diario_base || 0);
            const factor = 1 + parseFloat(config.factor_temporada || 0);
            const pctGlobal = config.porcentaje_destaques !== undefined ? parseFloat(config.porcentaje_destaques) : 100;
            const valDiario = Math.round(base * factor * (pctGlobal / 100));
            
            rich.subtotal = Math.round(dias * valDiario * 100) / 100;
            
            const totalGastos = 
                parseFloat(rich.gasto_alojamiento) + 
                parseFloat(rich.gasto_combustible) + 
                parseFloat(rich.gasto_otros) + 
                parseFloat(rich.gastos_movilidad) + 
                parseFloat(rich.gastos_movil_otros) + 
                parseFloat(rich.gastos_capacit);
            
            rich.totalFinal = rich.subtotal + totalGastos;

            rich.ciudad_origen = p.localidades?.localidad || "";
            rich.lugar_comision = config.lugar_comision || "Comisión Gira";
            rich.asiento_habitual = p.localidades?.localidad || "";

            return rich;
        });

        await processExportList(richData, targetFolderId, options, locationIdOrIds);

      } catch (err) {
          console.error(err);
          toast.error("Error batch: " + err.message);
      } finally {
          setIsExporting(false);
          setExportStatus("");
      }
  };

  const handleExportToDrive = async (options) => {
    if (selection.size === 0) { toast.error("Selecciona alguien."); return; }
    
    // --- NORMALIZACIÓN DE DATOS ---
    const selectedData = viaticosRows
        .filter((r) => selection.has(r.id_integrante))
        .map(row => {
            const person = row.integrantes || {}; 
            return {
                ...row,
                ...person, 
                documentacion: person.documentacion || person.documentacion || row.documentacion,
                docred: person.docred || person.docred || row.docred
            };
        });

    let driveFolderId = config?.link_drive;
    if (!driveFolderId) { toast.error("Sin carpeta Drive"); return; }

    setExportStatus("Exportando individuales...");
    setIsExporting(true);
    try {
        await processExportList(selectedData, driveFolderId, options, []);
        setSelection(new Set());
    } catch(e) { console.error(e); toast.error(e.message); }
    finally { setIsExporting(false); setExportStatus(""); }
  };

  // --- FUNCIÓN DE EMAIL MASIVO ---
  const handleSendMassiveEmails = async (skipConfirm = false) => {
    if (selection.size === 0) return toast.error("Selecciona al menos un integrante.");
    
    if (!skipConfirm) {
        setShowEmailConfirm(true);
        return;
    }
    
    setShowEmailConfirm(false);
    const toastId = toast.loading("Iniciando proceso de envío...");
    
    let successCount = 0;
    let errorsCount = 0;

    try {
        const selectedData = viaticosRows.filter((r) => selection.has(r.id_integrante));
        
        for (const [index, row] of selectedData.entries()) {
            const person = row.integrantes || row;
            const email = person.mail || person.email || row.mail || row.email;
            const name = person.nombre || person.apellido;

            // Actualizamos el toast con el progreso
            toast.loading(`Enviando ${index + 1} de ${selectedData.length}: ${person.apellido}...`, { id: toastId });

            if (!email) {
                console.warn(`SKIPPED: No tiene mail ${name}.`);
                errorsCount++;
                continue;
            }

            // PAYLOAD COMPLETO (Igual que Legacy)
            const detalleCompleto = {
                dias_computables: row.dias_computables,
                porcentaje: row.porcentaje,
                monto_viatico: parseFloat(row.monto_viatico || row.subtotal_viatico || row.subtotal || 0),
                subtotal_viatico: parseFloat(row.subtotal || row.monto_viatico || 0), // Redundancia por si acaso
                gasto_combustible: parseFloat(row.gasto_combustible || 0),
                gasto_alojamiento: parseFloat(row.gasto_alojamiento || 0),
                gasto_pasajes: parseFloat(row.gasto_pasajes || 0),
                gasto_otros: parseFloat(row.gasto_otros || 0),
                gastos_movilidad: parseFloat(row.gastos_movilidad || 0),
                gastos_movil_otros: parseFloat(row.gastos_movil_otros || 0),
                gastos_capacit: parseFloat(row.gastos_capacit || 0),
                total_percibir: parseFloat(row.total_percibir || row.totalFinal || 0)
            };

            const { error } = await supabase.functions.invoke('mails_produccion', {
                body: {
                    action: "enviar_mail",
                    templateId: "viaticos_simple",
                    email: email,
                    nombre: person.nombre || "Integrante",
                    gira: giraData?.nombre || "Gira OFRN",
                    detalle: detalleCompleto 
                }
            });
            
            if (error) {
                console.error(`ERROR enviando a ${email}:`, error);
                errorsCount++;
            } else {
                successCount++;
            }
        }

        if (errorsCount === 0) {
            toast.success(`¡Listo! Se enviaron ${successCount} correos exitosamente.`, { id: toastId, duration: 5000 });
        } else {
            toast.warning(`Proceso finalizado. Enviados: ${successCount} - Fallidos: ${errorsCount}`, { id: toastId, duration: 8000 });
        }

        setSelection(new Set()); 
        
    } catch (error) {
        console.error("Error crítico:", error);
        toast.error("Error en el proceso de envío.", { id: toastId });
    }
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selection);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelection(newSet);
  };
  const selectAll = () => {
    if (selection.size === viaticosRows.length) setSelection(new Set());
    else setSelection(new Set(viaticosRows.map((r) => r.id_integrante)));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
      {/* ELIMINADO EL TOASTER DUPLICADO, USAMOS EL DE APP.JSX */}
      
      <ConfirmModal isOpen={confirmPromise?.isOpen} onClose={() => { confirmPromise?.resolve(false); setConfirmPromise(null); }} title={confirmPromise?.title} message={confirmPromise?.message} confirmText={confirmPromise?.confirmText} cancelText={confirmPromise?.cancelText} onConfirm={() => { confirmPromise?.resolve(true); setConfirmPromise(null); }} />
      <ConfirmModal isOpen={showEmailConfirm} onClose={() => setShowEmailConfirm(false)} onConfirm={() => handleSendMassiveEmails(true)} title="Enviar Notificaciones" message={`Estás a punto de enviar ${selection.size} correos...`} confirmText="Enviar" />

      {/* PANEL SUPERIOR: INDIVIDUALES */}
      <div className="bg-white border-b border-slate-200 shadow-sm mb-4">
        <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowIndividualPanel(!showIndividualPanel)}>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><IconCalculator className="text-indigo-600" /> Viáticos Individuales</h2>
          <button className="text-slate-400">{showIndividualPanel ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}</button>
        </div>
        
        {showIndividualPanel && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <ManualTrigger section="vi_ticos_intro_mkd1at12" />
            <div className="px-6 pb-4 flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                 <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setShowDatos(!showDatos)} className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showDatos ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"}`}>Datos {showDatos ? <IconEye size={14} /> : <IconEyeOff size={14} />}</button>
                    <button onClick={() => setShowAnticipo(!showAnticipo)} className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showAnticipo ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"}`}>Anticipo {showAnticipo ? <IconEye size={14} /> : <IconEyeOff size={14} />}</button>
                    <button onClick={() => setShowTransport(!showTransport)} className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showTransport ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"}`}>Transp. {showTransport ? <IconEye size={14} /> : <IconEyeOff size={14} />}</button>
                    <button onClick={() => setShowExpenses(!showExpenses)} className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showExpenses ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-white text-slate-400 border-slate-200"}`}>Gastos {showExpenses ? <IconEye size={14} /> : <IconEyeOff size={14} />}</button>
                    <button onClick={() => setShowRendiciones(!showRendiciones)} className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showRendiciones ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-slate-400 border-slate-200"}`}>Rendic. {showRendiciones ? <IconEye size={14} /> : <IconEyeOff size={14} />}</button>
                    
                    {config.link_drive ? (
                        <button onClick={() => window.open(`https://drive.google.com/drive/folders/${config.link_drive}`, "_blank")} className="p-2 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center justify-center gap-2 text-xs font-bold"><IconDrive size={18} /> Carpeta</button>
                    ) : (
                        <button onClick={() => handleCreateDriveFolder(false)} disabled={loadingConfig} className="p-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 flex items-center gap-2 text-xs font-bold">{loadingConfig ? <IconLoader className="animate-spin" /> : <IconCloudUpload />} Crear Drive</button>
                    )}

                    <div className="w-px h-8 bg-slate-200 mx-2"></div>
                    
                    <button onClick={handleAddIndividuals} disabled={rowsLoading || rosterLoading} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors shadow-sm disabled:opacity-50 relative">
                        <IconBriefcase size={16} /> {rosterLoading ? "..." : "+ Todos los Indiv."}
                        {individualsPendingCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white">{individualsPendingCount}</span>}
                    </button>

                    <div className="relative">
                        <button onClick={() => setIsAddOpen(!isAddOpen)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700"><IconUserPlus size={16} /> Agregar...</button>
                        {isAddOpen && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-[100] animate-in zoom-in-95">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Agregar Integrante</h4>
                                <MemberSearchSelect options={candidateOptions} value={selectedToAdd} onChange={setSelectedToAdd} placeholder="Buscar..." />
                                <button onClick={() => { addPerson(selectedToAdd); setIsAddOpen(false); setSelectedToAdd(null); }} className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">Confirmar</button>
                            </div>
                        )}
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-4 text-sm bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                      <div className="bg-white px-2 py-1 rounded border border-indigo-100 flex items-center gap-1 shadow-sm">
                          <span className="text-xs font-bold text-indigo-700">BASE: $</span>
                          <input type="number" className="bg-transparent w-20 font-bold text-indigo-700 outline-none" value={config.valor_diario_base || 0} onChange={(e) => updateConfig("valor_diario_base", e.target.value)} />
                          {latestGlobalValue > config.valor_diario_base && <button onClick={() => updateConfig("valor_diario_base", latestGlobalValue)}><IconRefresh size={14} /></button>}
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded border border-amber-100 bg-white shadow-sm cursor-pointer hover:bg-amber-50" onClick={() => updateConfig("factor_temporada", config.factor_temporada === 0.3 ? 0 : 0.3)}>
                          <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${config.factor_temporada === 0.3 ? "bg-amber-500 border-amber-600" : "border-slate-300"}`}>{config.factor_temporada === 0.3 && <IconCheck size={10} className="text-white" />}</div>
                          <span className="text-xs font-bold text-amber-700">TEMP (30%)</span>
                      </div>
                  </div>
                  <div className="flex flex-1 gap-2">
                      <input type="text" className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-sm" placeholder="Motivo" value={config.motivo || ""} onChange={(e) => updateConfig("motivo", e.target.value)} />
                      <input type="text" className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-sm" placeholder="Lugar" value={config.lugar_comision || ""} onChange={(e) => updateConfig("lugar_comision", e.target.value)} />
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
              />

              {selection.size > 0 && (
                <ViaticosBulkEditPanel
                  selectionSize={selection.size}
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
        <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowMassivePanel(!showMassivePanel)}>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><IconBus className="text-indigo-600" /> Destaques Masivos</h2>
          <button className="text-slate-400">{showMassivePanel ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}</button>
        </div>
        {showMassivePanel && (
          <div className="px-6 pb-8 animate-in slide-in-from-top-2 duration-200">
            <DestaquesLocationPanel
              roster={massiveRoster}
              configs={destaquesConfigs} 
              globalConfig={config}
              onSaveLocationConfig={updateLocationConfig} 
              onUpdateGlobalConfig={updateConfig}
              feedback={feedbackMasivo}
              existingViaticosIds={viaticosRows.map(r => r.id_integrante)} 
              logisticsMap={logisticsMap}
              routeRules={routeRules}
              transportesList={transportes}
              onExportBatch={handleExportLocationBatch} 
              isExporting={isExporting}
              exportStatus={exportStatus}
              exportDetail={exportDetail} // PASAMOS EL DETALLE AL COMPONENTE HIJO
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
    </div>
  );
}