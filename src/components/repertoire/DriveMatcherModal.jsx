import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  IconDrive,
  IconX,
  IconCheck,
  IconLink,
  IconLoader,
  IconRefresh,
  IconArrowRight,
  IconPlus,
  IconTrash,
  IconEdit,
  IconSearch,
  IconBulb,
} from "../ui/Icons";
import SearchableSelect from "../ui/SearchableSelect";
import { calculateInstrumentation } from "../../utils/instrumentation";
import { INSTRUMENT_GROUPS } from "../../utils/instrumentGroups"; // <--- IMPORTAR
import { parseOrganicoVientosInput } from "../../utils/particellaOrganicoInput";
import OrganicoVientosAddField from "./OrganicoVientosAddField";
import { toast } from "sonner";
import { normalizeForSearch } from "../../utils/sanitize";
import {
  attachDriveLinksByFilename,
  expandDriveFileToParts,
  getDirectorInstrumentId,
  getSuggestedParts,
  getUncoveredDrivePartSuggestions,
  suggestDriveLinksForParts,
} from "../../utils/drivePartMatcher";

const capitalize = (s) => s && s[0].toUpperCase() + s.slice(1);

const sortByNameEs = (a, b) =>
  (a?.nombre_archivo ?? a?.name ?? "").localeCompare(
    b?.nombre_archivo ?? b?.name ?? "",
    "es",
    { numeric: true, sensitivity: "base" },
  );

const sortPartsByInstrumentAndName = (list) =>
  [...(list || [])].sort((a, b) => {
    const byInstrument = String(a?.id_instrumento ?? "").localeCompare(
      String(b?.id_instrumento ?? ""),
      "es",
      { numeric: true, sensitivity: "base" },
    );
    return byInstrument || sortByNameEs(a, b);
  });

const ModalPortal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body,
  );
};

export default function DriveMatcherModal({
  isOpen,
  onClose,
  folderUrl,
  parts,
  onPartsChange,
  supabase,
  catalogoInstrumentos,
}) {
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [assignments, setAssignments] = useState({});

  // --- SELECCIÓN DE ARCHIVOS (Múltiple) ---
  const [selectedFiles, setSelectedFiles] = useState([]); // Array de objetos file
  const [lastFileIndex, setLastFileIndex] = useState(-1); // Para rango con Shift

  // Estados UI
  const [genQuantity, setGenQuantity] = useState(1);
  const [organicoVientosInput, setOrganicoVientosInput] = useState("");
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [selectedInstrId, setSelectedInstrId] = useState("");
  const [showInstrumentOptions, setShowInstrumentOptions] = useState(false);

  const [editingPartId, setEditingPartId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const instrumentInputRef = useRef(null);
  const editInputRef = useRef(null);
  const particellaSelectAllRef = useRef(null);

  /** Multiselección de particellas en el modal (tempId) */
  const [selectedPartTempIds, setSelectedPartTempIds] = useState(() => new Set());

  const currentInstrumentation = calculateInstrumentation(parts);
  const suggestedParts = useMemo(
    () => getSuggestedParts(driveFiles, catalogoInstrumentos),
    [driveFiles, catalogoInstrumentos],
  );
  const suggestedInstrumentation = useMemo(
    () => calculateInstrumentation(suggestedParts),
    [suggestedParts],
  );
  const directorId = useMemo(
    () => getDirectorInstrumentId(catalogoInstrumentos),
    [catalogoInstrumentos],
  );
  const hasDirector = useMemo(() => {
    const checkList = [...(parts || []), ...(suggestedParts || [])];
    return checkList.some((p) => {
      const base = (p.instrumento_nombre || "").toLowerCase();
      return (
        p.id_instrumento === directorId ||
        base.includes("director") ||
        base.includes("conductor") ||
        base.includes("score")
      );
    });
  }, [parts, suggestedParts, directorId]);

  const sortedDriveFiles = useMemo(
    () =>
      [...(driveFiles || [])].sort((a, b) =>
        sortByNameEs({ name: a.name }, { name: b.name }),
      ),
    [driveFiles],
  );

  const uncoveredDrivePartSuggestions = useMemo(
    () =>
      getUncoveredDrivePartSuggestions(
        parts,
        sortedDriveFiles,
        catalogoInstrumentos,
      ),
    [parts, sortedDriveFiles, catalogoInstrumentos],
  );

  const autoCreateEligibleFileIds = useMemo(() => {
    const ids = new Set();
    for (const suggestion of uncoveredDrivePartSuggestions) {
      if (suggestion.file?.id) ids.add(suggestion.file.id);
    }
    return ids;
  }, [uncoveredDrivePartSuggestions]);

  const uncoveredDriveSuggestionFileCount = autoCreateEligibleFileIds.size;
  const hasUncoveredDrivePartSuggestions =
    parts.length > 0 && uncoveredDrivePartSuggestions.length > 0;

  const partsWithoutLinks = useMemo(
    () => (parts || []).filter((p) => !(p.links?.length)),
    [parts],
  );

  const linkSuggestionsByPartId = useMemo(
    () => suggestDriveLinksForParts(parts, sortedDriveFiles),
    [parts, sortedDriveFiles],
  );

  const pendingLinkSuggestionCount = useMemo(
    () => Object.keys(linkSuggestionsByPartId).length,
    [linkSuggestionsByPartId],
  );

  const hasPlaceholderLinkSuggestions =
    parts.length > 0 && pendingLinkSuggestionCount > 0;

  useEffect(() => {
    if (!isOpen) return;
    const initialMap = {};
    parts.forEach((p) => {
      initialMap[p.tempId] = p.links || [];
    });
    setAssignments(initialMap);
  }, [isOpen, parts]);

  useEffect(() => {
    if (!isOpen) setSelectedPartTempIds(new Set());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (folderUrl) fetchFiles();
    else setDriveFiles([]);
    setSelectedFiles([]);
  }, [isOpen, folderUrl]);

  useEffect(() => {
    if (editingPartId && editInputRef.current) editInputRef.current.focus();
  }, [editingPartId]);

  useEffect(() => {
    const valid = new Set((parts || []).map((p) => p.tempId));
    setSelectedPartTempIds((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [parts]);

  useEffect(() => {
    const el = particellaSelectAllRef.current;
    if (!el) return;
    const n = selectedPartTempIds.size;
    const total = (parts || []).length;
    el.indeterminate = total > 0 && n > 0 && n < total;
  }, [selectedPartTempIds, parts]);

  const fetchFiles = async () => {
    if (!folderUrl) return;
    setLoading(true);
    console.log("DEBUG [Modal]: Llamando a Edge Function con URL:", folderUrl);

    try {
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "list_folder_files", folderUrl },
      });

      if (error) {
        console.error("DEBUG [Modal]: Error de Supabase Invoke:", error);
        throw error;
      }

      console.log("DEBUG [Modal]: Datos recibidos de la Edge Function:", data);

      if (data?.files) {
        setDriveFiles(data.files);
      } else {
        console.warn(
          "DEBUG [Modal]: La respuesta no contiene el array 'files'",
        );
      }
    } catch (err) {
      console.error("DEBUG [Modal]: Error capturado en fetchFiles:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGICA DE SELECCIÓN DE ARCHIVOS (SHIFT + CLICK) ---
  const handleFileClick = (e, file, index) => {
    // Si estamos editando nombres, no cambiamos selección
    if (editingPartId) return;

    let newSelection = [];

    if (e.shiftKey && lastFileIndex !== -1) {
      // Rango (índices sobre lista ordenada)
      const start = Math.min(lastFileIndex, index);
      const end = Math.max(lastFileIndex, index);
      newSelection = sortedDriveFiles.slice(start, end + 1);
    } else if (e.ctrlKey || e.metaKey) {
      // Multi-select toggle
      const exists = selectedFiles.some((f) => f.id === file.id);
      if (exists) newSelection = selectedFiles.filter((f) => f.id !== file.id);
      else newSelection = [...selectedFiles, file];
      setLastFileIndex(index);
    } else {
      // Selección única
      newSelection = [file];
      setLastFileIndex(index);
    }
    setSelectedFiles(newSelection);
  };

  // --- ASIGNACIÓN (INDIVIDUAL O CASCADA) ---
  const handlePartAssignmentClick = (clickedPart) => {
    if (editingPartId || selectedFiles.length === 0) return;

    // 1. ORDENAR PARTES VISUALMENTE (Crucial para la cascada)
    const sortedParts = [...parts].sort((a, b) =>
      (a.nombre_archivo ?? "").localeCompare(b.nombre_archivo ?? "", "es", {
        numeric: true,
        sensitivity: "base",
      }),
    );

    // CASO A: UN SOLO ARCHIVO (Toggle)
    if (selectedFiles.length === 1) {
      const file = selectedFiles[0];
      const partId = clickedPart.tempId;
      const currentLinks = assignments[partId] || [];
      const exists = currentLinks.some((l) => l.url === file.webViewLink);

      let newLinks;
      if (exists)
        newLinks = currentLinks.filter((l) => l.url !== file.webViewLink);
      else
        newLinks = [
          ...currentLinks,
          { url: file.webViewLink, description: file.name },
        ];

      const updatedParts = parts.map((p) =>
        p.tempId === partId ? { ...p, links: newLinks } : p,
      );
      onPartsChange(updatedParts);
      return;
    }

    // CASO B: MÚLTIPLES ARCHIVOS (Cascada)
    const startIndex = sortedParts.findIndex(
      (p) => p.tempId === clickedPart.tempId,
    );
    if (startIndex === -1) return;

    // Creamos un mapa de actualizaciones para ser eficientes
    const updatesMap = {}; // { tempId: [links] }

    selectedFiles.forEach((file, i) => {
      const targetIndex = startIndex + i;
      // Si hay parte disponible en la secuencia
      if (targetIndex < sortedParts.length) {
        const targetPart = sortedParts[targetIndex];
        const currentLinks = targetPart.links || [];

        // Evitar duplicados si ya tiene ese link
        if (!currentLinks.some((l) => l.url === file.webViewLink)) {
          // Agregamos el archivo a los links existentes
          updatesMap[targetPart.tempId] = [
            ...currentLinks,
            { url: file.webViewLink, description: file.name },
          ];
        }
      }
    });

    // Si hubo cambios, actualizamos el padre
    if (Object.keys(updatesMap).length > 0) {
      const updatedParts = parts.map((p) => {
        if (updatesMap[p.tempId]) {
          return {
            ...p,
            links: updatesMap[p.tempId],
            // MANTENEMOS el ID que ya tenga (si el padre ya lo guardó)
            id: p.id,
          };
        }
        return p;
      });

      // Notificamos al padre
      onPartsChange(updatedParts);
      setSelectedFiles([]);
    }
  };

  const removeSpecificLink = (partId, linkUrl) => {
    const updatedParts = parts.map((p) =>
      p.tempId === partId
        ? { ...p, links: (p.links || []).filter((l) => l.url !== linkUrl) }
        : p,
    );
    onPartsChange(updatedParts);
  };

  // ... (Gestsión de Partes: handleAddPart, handleDeletePart, etc. se mantienen igual)
  const allOptions = [...INSTRUMENT_GROUPS, ...(catalogoInstrumentos || [])];

  const queryNorm = normalizeForSearch(instrumentQuery);
  const filteredInstruments = allOptions.filter((i) =>
    normalizeForSearch(i.instrumento).includes(queryNorm),
  );

  const handleAddPart = () => {
    let finalInstrId = selectedInstrId;

    if (
      !finalInstrId &&
      filteredInstruments.length > 0 &&
      instrumentQuery.length >= 2
    ) {
      const match =
        filteredInstruments.find(
          (i) =>
            normalizeForSearch(i.instrumento) ===
            normalizeForSearch(instrumentQuery),
        ) || filteredInstruments[0];
      if (match) finalInstrId = match.id;
    }

    if (!finalInstrId || genQuantity < 1) return;

    // A. CHECK GRUPO
    const selectedGroup = INSTRUMENT_GROUPS.find((g) => g.id === finalInstrId);
    let newParts = [];

    if (selectedGroup) {
      selectedGroup.definitions.forEach((def) => {
        newParts.push({
          tempId: Date.now() + Math.random(),
          id: undefined,
          id_instrumento: def.id_instrumento,
          nombre_archivo: def.nombre_archivo,
          links: [],
          nota_organico: "",
          instrumento_nombre: def.instrumento_base,
          es_solista: false,
        });
      });
    } else {
      // B. INDIVIDUAL
      const instrObj = (catalogoInstrumentos || []).find(
        (i) => i.id === finalInstrId,
      );
      const isDirector =
        instrObj &&
        (instrObj.instrumento?.toLowerCase().includes("director") ||
          instrObj.instrumento?.toLowerCase().includes("conductor"));
      const baseName = isDirector
        ? "SCORE"
        : instrObj
          ? capitalize(instrObj.instrumento)
          : "Instrumento";
      const realId = instrObj ? instrObj.id : finalInstrId;

      for (let i = 1; i <= genQuantity; i++) {
        const name = isDirector ? "SCORE" : genQuantity > 1 ? `${baseName} ${i}` : baseName;
        newParts.push({
          tempId: Date.now() + i + Math.random(),
          id: undefined,
          id_instrumento: realId,
          nombre_archivo: name,
          links: [],
          nota_organico: "",
          instrumento_nombre: instrObj?.instrumento,
          es_solista: false,
        });
      }
    }

    if (onPartsChange) {
      // Combinar y ordenar
      const updatedParts = [...parts, ...newParts].sort((a, b) =>
        a.id_instrumento.localeCompare(b.id_instrumento),
      );
      onPartsChange(updatedParts);
    }

    setInstrumentQuery("");
    setSelectedInstrId("");
    setGenQuantity(1);
    setShowInstrumentOptions(false);

    setTimeout(() => {
      if (instrumentInputRef.current) instrumentInputRef.current.focus();
    }, 0);
  };

  const handleAddPartsFromOrganico = () => {
    const parsed = parseOrganicoVientosInput(organicoVientosInput);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    const newParts = parsed.definitions.map((def) => ({
      tempId: Date.now() + Math.random(),
      id: undefined,
      id_instrumento: def.id_instrumento,
      nombre_archivo: def.nombre_archivo,
      links: [],
      nota_organico: "",
      instrumento_nombre: def.instrumento_base,
      es_solista: false,
    }));
    if (onPartsChange) {
      onPartsChange(
        [...parts, ...newParts].sort((a, b) =>
          a.id_instrumento.localeCompare(b.id_instrumento),
        ),
      );
    }
    setOrganicoVientosInput("");
    toast.success(
      `${newParts.length} particella${newParts.length === 1 ? "" : "s"} añadida${newParts.length === 1 ? "" : "s"} desde orgánico`,
    );
  };

  const handleDeletePart = (tempId) => {
    if (!confirm("¿Eliminar?")) return;
    if (onPartsChange) onPartsChange(parts.filter((p) => p.tempId !== tempId));
  };

  const handleBulkDeleteSelectedParticellas = () => {
    const n = selectedPartTempIds.size;
    if (n === 0) return;
    const msg =
      n === 1
        ? "¿Eliminar esta particella?"
        : `¿Eliminar las ${n} particellas seleccionadas?`;
    if (!window.confirm(msg)) return;
    const sel = selectedPartTempIds;
    if (onPartsChange)
      onPartsChange(parts.filter((x) => !sel.has(x.tempId)));
    setSelectedPartTempIds(new Set());
  };
  const startEditing = (e, part) => {
    e.stopPropagation();
    setEditingPartId(part.tempId);
    setEditingName(part.nombre_archivo);
  };
  const saveEditingName = () => {
    if (onPartsChange && editingPartId)
      onPartsChange(
        parts.map((p) =>
          p.tempId === editingPartId
            ? { ...p, nombre_archivo: editingName }
            : p,
        ),
      );
    setEditingPartId(null);
  };
  const updatePartNote = (tempId, val) => {
    if (onPartsChange)
      onPartsChange(
        parts.map((p) =>
          p.tempId === tempId ? { ...p, nota_organico: val } : p,
        ),
      );
  };
  const togglePartSolista = (tempId) => {
    if (onPartsChange)
      onPartsChange(
        parts.map((p) =>
          p.tempId === tempId ? { ...p, es_solista: !p.es_solista } : p,
        ),
      );
  };

  const instrumentOptions = useMemo(() => {
    const list = (catalogoInstrumentos || []).map((i) => ({
      id: i.id,
      label: i.instrumento || String(i.id),
      subLabel: i.abreviatura || String(i.id),
    }));
    return list.sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [catalogoInstrumentos]);

  const updatePartInstrument = (tempId, newInstrumentId) => {
    if (!onPartsChange || !newInstrumentId) return;
    const instrObj = (catalogoInstrumentos || []).find(
      (i) => String(i.id) === String(newInstrumentId),
    );
    onPartsChange(
      parts.map((p) =>
        p.tempId === tempId
          ? {
              ...p,
              id_instrumento: newInstrumentId,
              instrumento_nombre: instrObj?.instrumento || String(newInstrumentId),
            }
          : p,
      ),
    );
  };

  const getFileAssignmentCount = (fileUrl) => {
    let count = 0;
    Object.values(assignments).forEach((links) => {
      if (links.some((l) => l.url === fileUrl)) count++;
    });
    return count;
  };

  const handleApplySuggestedPartsWithLinks = () => {
    if (!suggestedParts?.length || !onPartsChange) return;
    const linked = attachDriveLinksByFilename(suggestedParts, sortedDriveFiles);
    onPartsChange(linked);
  };

  const handleAddUncoveredDrivePartSuggestions = () => {
    if (!onPartsChange || uncoveredDrivePartSuggestions.length === 0) return;

    const newParts = uncoveredDrivePartSuggestions.map(({ part }) => ({
      ...part,
      links: [...(part.links || [])],
    }));
    onPartsChange(sortPartsByInstrumentAndName([...parts, ...newParts]));
    toast.success(
      `${newParts.length} particella${newParts.length === 1 ? "" : "s"} faltante${newParts.length === 1 ? "" : "s"} agregada${newParts.length === 1 ? "" : "s"} desde ${uncoveredDriveSuggestionFileCount} PDF${uncoveredDriveSuggestionFileCount === 1 ? "" : "s"}`,
    );
  };

  const applySuggestedLinkToPart = (part, file) => {
    if (!onPartsChange || !file?.webViewLink) return;
    const currentLinks = part.links || [];
    const exists = currentLinks.some((l) => l.url === file.webViewLink);
    const newLinks = exists
      ? currentLinks.filter((l) => l.url !== file.webViewLink)
      : [
          ...currentLinks,
          { url: file.webViewLink, description: file.name },
        ];
    onPartsChange(
      parts.map((p) =>
        p.tempId === part.tempId ? { ...p, links: newLinks } : p,
      ),
    );
  };

  const handleApplyAllLinkSuggestions = () => {
    if (!onPartsChange || pendingLinkSuggestionCount === 0) return;
    const updatedParts = parts.map((part) => {
      const file = linkSuggestionsByPartId[part.tempId];
      if (!file?.webViewLink || part.links?.length) return part;
      const links = [...(part.links || [])];
      if (!links.some((l) => l.url === file.webViewLink)) {
        links.push({ url: file.webViewLink, description: file.name });
      }
      return { ...part, links };
    });
    onPartsChange(updatedParts);
    toast.success(
      `${pendingLinkSuggestionCount} enlace${pendingLinkSuggestionCount === 1 ? "" : "s"} vinculado${pendingLinkSuggestionCount === 1 ? "" : "s"}`,
    );
  };

  const handleAddDirectorPart = () => {
    if (!directorId) return;
    const instrObj = (catalogoInstrumentos || []).find(
      (i) => i.id === directorId,
    );
    const newPart = {
      tempId: Date.now() + Math.random(),
      id: undefined,
      id_instrumento: directorId,
      nombre_archivo: "Director",
      links: [],
      nota_organico: "",
      instrumento_nombre: instrObj?.instrumento || "Director",
      es_solista: false,
    };
    if (onPartsChange) onPartsChange([...parts, newPart]);
  };

  const handleCreatePartFromFile = (e, file) => {
    e.stopPropagation();
    if (!file?.webViewLink || !onPartsChange) return;

    const suggestionsForFile = uncoveredDrivePartSuggestions
      .filter((suggestion) => suggestion.file?.id === file.id)
      .map(({ part }) => part);
    const expanded = suggestionsForFile.length
      ? suggestionsForFile
      : expandDriveFileToParts(file, catalogoInstrumentos);
    if (!expanded.length) {
      const prefix = (file.name || "").split(".")[0].split("-")[0].trim();
      window.alert(
        prefix
          ? `No se pudo detectar un instrumento para "${prefix}".`
          : "No se pudo detectar un instrumento para este archivo.",
      );
      return;
    }

    const newParts = expanded.map((p) => ({
      ...p,
      links: p.links?.length
        ? p.links
        : [{ url: file.webViewLink, description: file.name }],
    }));
    const updatedParts = sortPartsByInstrumentAndName([...parts, ...newParts]);
    onPartsChange(updatedParts);
  };

  const requestClose = async () => {
    if (closing) return;
    setClosing(true);
    try {
      await onClose?.();
    } finally {
      setClosing(false);
    }
  };

  if (!isOpen) return null;

  const sortedParts = [...parts].sort(sortByNameEs);

  return (
    <ModalPortal>
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* HEADER */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <IconDrive className="text-blue-600" /> Asistente de Enlaces Drive
            </h3>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 inline-block w-fit">
                {currentInstrumentation || "Sin instrumentación"}
              </div>
              {suggestedParts.length > 0 && parts.length === 0 && (
                <div className="mt-1 text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1 rounded flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span>
                    Instrumentación detectada:{" "}
                    <span className="font-mono font-bold">
                      {suggestedInstrumentation || "No identificada"}
                    </span>
                    . Se crearán las particellas en la obra, se guardarán y se
                    vincularán los PDF/enlaces de Drive cuando el nombre del
                    archivo coincida con la particella.
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleApplySuggestedPartsWithLinks}
                      className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 shadow-sm"
                    >
                      Insertar y vincular
                    </button>
                    {!hasDirector && (
                      <button
                        type="button"
                        onClick={handleAddDirectorPart}
                        className="px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-bold hover:bg-amber-100"
                      >
                        + Agregar Director
                      </button>
                    )}
                  </div>
                </div>
              )}
              {hasPlaceholderLinkSuggestions && (
                <div className="mt-1 text-[11px] bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1 rounded flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span>
                    {partsWithoutLinks.length} particella
                    {partsWithoutLinks.length === 1 ? "" : "s"} sin enlace —{" "}
                    <span className="font-bold">
                      {pendingLinkSuggestionCount} sugerencia
                      {pendingLinkSuggestionCount === 1 ? "" : "s"}
                    </span>{" "}
                    detectada{pendingLinkSuggestionCount === 1 ? "" : "s"} por
                    nombre de archivo.
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyAllLinkSuggestions}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold hover:bg-amber-200 shrink-0"
                  >
                    <IconBulb size={12} className="text-amber-500" />
                    Vincular sugerencias
                  </button>
                </div>
              )}
              {hasUncoveredDrivePartSuggestions && (
                <div className="mt-1 text-[11px] bg-sky-50 border border-sky-200 text-sky-900 px-2 py-1 rounded flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span>
                    {uncoveredDriveSuggestionFileCount} PDF
                    {uncoveredDriveSuggestionFileCount === 1 ? "" : "s"} sin
                    particella asociada —{" "}
                    <span className="font-bold">
                      {uncoveredDrivePartSuggestions.length} instrumento
                      {uncoveredDrivePartSuggestions.length === 1 ? "" : "s"}{" "}
                      faltante
                      {uncoveredDrivePartSuggestions.length === 1 ? "" : "s"}
                    </span>{" "}
                    detectado
                    {uncoveredDrivePartSuggestions.length === 1 ? "" : "s"}.
                  </span>
                  <button
                    type="button"
                    onClick={handleAddUncoveredDrivePartSuggestions}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-900 text-[11px] font-bold hover:bg-sky-200 shrink-0"
                  >
                    <IconPlus size={12} />
                    Agregar faltantes
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="text-xs text-slate-400 mr-2 text-right hidden md:block">
              Shift+Click = Selección múltiple
              <br />
              Asignación en cascada automática
            </div>
            <button
              onClick={fetchFiles}
              className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
            >
              <IconRefresh
                size={18}
                className={loading ? "animate-spin" : ""}
              />
            </button>
            <button
              type="button"
              disabled={closing}
              onClick={() => void requestClose()}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
              title={closing ? "Guardando cambios…" : "Cerrar"}
            >
              <IconX size={24} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 flex overflow-hidden">
          {/* IZQUIERDA: PARTICELLAS */}
          <div className="w-7/12 border-r border-slate-200 flex flex-col bg-slate-50/30">
            {/* BARRA CREAR */}
            <div className="p-2 bg-white border-b border-slate-200 flex flex-wrap gap-2 shadow-sm z-20 items-center">
              <div className="flex min-w-0 flex-1 basis-[12rem] gap-2 items-center">
                <div className="flex-1 min-w-0 relative">
                  <input
                    ref={instrumentInputRef}
                    type="text"
                    className="w-full text-xs border p-1.5 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    placeholder="Buscar instrumento..."
                    value={instrumentQuery}
                    onChange={(e) => {
                      setInstrumentQuery(e.target.value);
                      setSelectedInstrId("");
                      setShowInstrumentOptions(true);
                    }}
                    onFocus={() => setShowInstrumentOptions(true)}
                    onBlur={() =>
                      setTimeout(() => setShowInstrumentOptions(false), 200)
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleAddPart()}
                  />
                  {showInstrumentOptions && instrumentQuery && (
                    <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded shadow-xl max-h-48 overflow-y-auto z-50">
                      {filteredInstruments.map((i) => (
                        <div
                          key={i.id}
                          className="p-2 hover:bg-indigo-50 cursor-pointer text-xs text-slate-700 border-b border-slate-50 last:border-0"
                          onMouseDown={() => {
                            setSelectedInstrId(i.id);
                            setInstrumentQuery(i.instrumento);
                            setShowInstrumentOptions(false);
                          }}
                        >
                          {i.instrumento}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-14 shrink-0">
                  <input
                    type="number"
                    min="1"
                    className="w-full text-xs border p-1.5 rounded text-center outline-none focus:border-blue-500"
                    value={genQuantity}
                    onChange={(e) =>
                      setGenQuantity(parseInt(e.target.value) || 1)
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleAddPart()}
                    title="Cantidad"
                    aria-label="Cantidad"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPart}
                  className="shrink-0 bg-indigo-100 text-indigo-700 p-1.5 rounded hover:bg-indigo-200"
                  title="Añadir instrumento(s)"
                >
                  <IconPlus size={16} />
                </button>
              </div>
              <OrganicoVientosAddField
                variant="compact"
                value={organicoVientosInput}
                onChange={setOrganicoVientosInput}
                onAdd={handleAddPartsFromOrganico}
              />
            </div>

            {selectedPartTempIds.size > 0 && (
              <div className="mx-2 mt-1 mb-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50/90 px-2 py-1.5 text-[11px] shadow-sm shrink-0">
                <span className="font-semibold text-rose-900">
                  {selectedPartTempIds.size}{" "}
                  {selectedPartTempIds.size === 1
                    ? "seleccionada"
                    : "seleccionadas"}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPartTempIds(new Set())}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Quitar selección
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDeleteSelectedParticellas}
                    className="flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 font-bold text-white hover:bg-red-700"
                  >
                    <IconTrash size={12} />
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            <div className="p-2 bg-slate-100 border-b text-xs font-bold text-slate-500 uppercase flex justify-between items-center gap-2 sticky top-0 z-10">
              <div className="flex items-center gap-2 min-w-0">
                <input
                  ref={particellaSelectAllRef}
                  type="checkbox"
                  disabled={parts.length === 0}
                  checked={
                    parts.length > 0 &&
                    selectedPartTempIds.size === parts.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPartTempIds(
                        new Set(parts.map((x) => x.tempId)),
                      );
                    } else {
                      setSelectedPartTempIds(new Set());
                    }
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                  title="Seleccionar todas"
                  aria-label="Seleccionar todas las particellas"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="truncate">
                  Particellas ({parts.length})
                </span>
              </div>
              <span className="shrink-0">Enlaces</span>
            </div>

            <div className="overflow-y-auto p-3 space-y-2 flex-1">
              {sortedParts.map((part) => {
                const persistedLinks = Array.isArray(part.links) ? part.links : [];
                const hasLinkedFiles = persistedLinks.length > 0;
                const currentLinks =
                  persistedLinks.length > 0
                    ? persistedLinks
                    : assignments[part.tempId] || [];
                const isEditing = editingPartId === part.tempId;
                const suggestedFile = !hasLinkedFiles
                  ? linkSuggestionsByPartId[part.tempId]
                  : null;

                const baseCard =
                  hasLinkedFiles
                    ? "bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100"
                    : part.es_solista
                      ? "bg-sky-50 border-sky-200 hover:border-sky-400 hover:bg-sky-100"
                      : "bg-white border-slate-200 hover:border-indigo-300";

                const selectionDropCue =
                  selectedFiles.length > 0 && !isEditing
                    ? hasLinkedFiles
                      ? "cursor-pointer hover:shadow-md ring-2 ring-blue-400/35 border-dashed border-blue-400"
                      : "cursor-pointer hover:border-blue-500 hover:shadow-md hover:bg-blue-50 border-dashed border-blue-300"
                    : "";

                return (
                  <div
                    key={part.tempId}
                    onClick={() => handlePartAssignmentClick(part)} // <--- CLICK AQUÍ GATILLA LA CASCADA
                    className={`p-2 rounded border transition-all relative group ${baseCard} ${selectionDropCue}`}
                  >
                    <div className="flex justify-between items-center gap-2 flex-wrap">
                      <label
                        className="shrink-0 flex items-start pt-0.5 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                        title="Seleccionar para eliminar varias"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPartTempIds.has(part.tempId)}
                          onChange={() =>
                            setSelectedPartTempIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(part.tempId))
                                next.delete(part.tempId);
                              else next.add(part.tempId);
                              return next;
                            })
                          }
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          aria-label={`Seleccionar ${part.nombre_archivo || "particella"}`}
                        />
                      </label>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            className="text-sm font-bold text-slate-800 border border-indigo-300 rounded px-1 py-0 w-full outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={saveEditingName}
                            onKeyDown={(e) =>
                              e.key === "Enter" && saveEditingName()
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="font-bold text-sm text-slate-700 truncate cursor-text hover:text-indigo-600"
                              onClick={(e) => startEditing(e, part)}
                            >
                              {part.nombre_archivo}
                            </span>
                            <label
                              className="flex items-center gap-1 shrink-0 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                              title="Solista"
                            >
                              <input
                                type="checkbox"
                                checked={!!part.es_solista}
                                onChange={() => togglePartSolista(part.tempId)}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span className="text-[9px] font-semibold uppercase text-slate-500">Solista</span>
                            </label>
                            <input
                              type="text"
                              className="w-12 text-[10px] border-b border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-slate-500 text-center outline-none placeholder:text-slate-300"
                              placeholder="Org."
                              value={part.nota_organico || ""}
                              onChange={(e) =>
                                updatePartNote(part.tempId, e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              title="Nota orgánico"
                            />
                            {suggestedFile && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applySuggestedLinkToPart(part, suggestedFile);
                                }}
                                className="inline-flex items-center gap-1 max-w-[11rem] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-medium border border-amber-200 hover:bg-amber-200 transition-colors shrink-0"
                                title="Vincular archivo sugerido"
                              >
                                <IconBulb
                                  size={12}
                                  className="text-amber-500 shrink-0"
                                />
                                <span className="truncate">
                                  {suggestedFile.name}
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isEditing && (
                          <>
                            {hasLinkedFiles && (
                              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 rounded font-bold mr-1 select-none">
                                {persistedLinks.length}
                              </span>
                            )}
                            <button
                              onClick={(e) => startEditing(e, part)}
                              className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                            >
                              <IconEdit size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePart(part.tempId);
                              }}
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                            >
                              <IconTrash size={12} />
                            </button>
                          </>
                        )}
                        <div
                          className="w-28 min-w-[7rem]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SearchableSelect
                            options={instrumentOptions}
                            value={part.id_instrumento}
                            onChange={(id) => updatePartInstrument(part.tempId, id)}
                            placeholder="Instr."
                            className="text-[10px]"
                            dropdownMinWidth={200}
                          />
                        </div>
                      </div>
                    </div>
                    {currentLinks.length > 0 && !isEditing && (
                      <div className="mt-1 space-y-1 pl-8">
                        {currentLinks.map((link, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm group-hover:border-slate-300"
                          >
                            <div className="flex items-center gap-1 truncate max-w-[350px]">
                              <IconLink
                                size={10}
                                className="text-blue-400 shrink-0"
                              />
                              <span
                                className="truncate text-slate-600"
                                title={link.description}
                              >
                                {link.description}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSpecificLink(part.tempId, link.url);
                              }}
                              className="text-slate-300 hover:text-red-500 p-0.5"
                            >
                              <IconX size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedFiles.length > 0 && !isEditing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-500/5 opacity-0 hover:opacity-100 rounded transition-opacity pointer-events-none">
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded shadow flex items-center gap-1">
                          <IconCheck size={12} />{" "}
                          {selectedFiles.length > 1
                            ? `Asignar ${selectedFiles.length} (Cascada)`
                            : `Asignar: ${selectedFiles[0]?.name.substring(
                                0,
                                15,
                              )}...`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DERECHA: DRIVE */}
          <div className="w-5/12 flex flex-col bg-white border-l border-slate-200 shadow-xl z-20">
            <div className="p-3 bg-indigo-50 border-b border-indigo-100 text-xs font-bold text-indigo-700 uppercase flex justify-between items-center shadow-sm">
              <span>Archivos Drive ({driveFiles.length})</span>
              {loading && <IconLoader className="animate-spin" size={12} />}
            </div>
            {driveFiles.length === 0 && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <IconDrive size={48} className="mb-2 opacity-20" />
                <p className="text-sm">Carpeta vacía.</p>
              </div>
            )}
            <div className="overflow-y-auto p-2 space-y-1 flex-1 bg-slate-50 select-none">
              {sortedDriveFiles.map((file, idx) => {
                const isSelected = selectedFiles.some((f) => f.id === file.id);
                let assignCount = 0;
                Object.values(assignments).forEach((links) => {
                  if (links.some((l) => l.url === file.webViewLink))
                    assignCount++;
                });
                const isUsed = assignCount > 0;
                const canAutoCreatePart =
                  !isUsed && autoCreateEligibleFileIds.has(file.id);

                return (
                  <div
                    key={file.id}
                    onClick={(e) => handleFileClick(e, file, idx)} // <--- MANEJO DE SELECCIÓN MÚLTIPLE
                    className={`p-2.5 rounded text-sm cursor-pointer border flex justify-between items-center transition-all duration-150 ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : isUsed
                          ? "bg-emerald-50 text-slate-600 border-emerald-200"
                          : "bg-white hover:bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                      <IconDrive
                        size={16}
                        className={`shrink-0 ${
                          isSelected
                            ? "text-white"
                            : isUsed
                              ? "text-emerald-500"
                              : "text-slate-400"
                        }`}
                      />
                      <span className="truncate font-medium">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {canAutoCreatePart && (
                        <button
                          type="button"
                          onClick={(e) => handleCreatePartFromFile(e, file)}
                          className={`p-1 rounded transition-colors ${
                            isSelected
                              ? "bg-white/20 text-white hover:bg-white/30"
                              : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                          }`}
                          title="Crear particella según el nombre del archivo y vincular"
                        >
                          <IconPlus size={14} />
                        </button>
                      )}
                      {isUsed && !isSelected && (
                        <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1.5 rounded-full font-bold ml-2">
                          {assignCount}
                        </span>
                      )}
                      {isSelected && (
                        <IconArrowRight
                          size={16}
                          className="animate-pulse ml-2"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end shrink-0 z-30">
          <button
            type="button"
            disabled={closing}
            onClick={() => void requestClose()}
            className="flex items-center gap-2 px-6 py-2 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {closing ? (
              <>
                <IconLoader size={16} className="animate-spin shrink-0" />
                Guardando…
              </>
            ) : (
              "Cerrar"
            )}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
