import React, { useState, useEffect, useRef } from "react";
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
} from "../ui/Icons";
import { calculateInstrumentation } from "../../utils/instrumentation";
import { INSTRUMENT_GROUPS } from "../../utils/instrumentGroups"; // <--- IMPORTAR

const capitalize = (s) => s && s[0].toUpperCase() + s.slice(1);

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
  const [loading, setLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [assignments, setAssignments] = useState({});

  // --- SELECCIÓN DE ARCHIVOS (Múltiple) ---
  const [selectedFiles, setSelectedFiles] = useState([]); // Array de objetos file
  const [lastFileIndex, setLastFileIndex] = useState(-1); // Para rango con Shift

  // Estados UI
  const [genQuantity, setGenQuantity] = useState(1);
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [selectedInstrId, setSelectedInstrId] = useState("");
  const [showInstrumentOptions, setShowInstrumentOptions] = useState(false);

  const [editingPartId, setEditingPartId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const instrumentInputRef = useRef(null);
  const editInputRef = useRef(null);

  const currentInstrumentation = calculateInstrumentation(parts);

  useEffect(() => {
    if (isOpen) {
      const initialMap = {};
      parts.forEach((p) => {
        initialMap[p.tempId] = p.links || [];
      });
      setAssignments(initialMap);

      if (folderUrl) fetchFiles();
      else setDriveFiles([]);

      setSelectedFiles([]); // Reset selección al abrir
    }
  }, [isOpen, folderUrl, parts]);

  useEffect(() => {
    if (editingPartId && editInputRef.current) editInputRef.current.focus();
  }, [editingPartId]);

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
      // Rango
      const start = Math.min(lastFileIndex, index);
      const end = Math.max(lastFileIndex, index);
      newSelection = driveFiles.slice(start, end + 1);
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
      a.nombre_archivo.localeCompare(b.nombre_archivo, undefined, {
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

  const filteredInstruments = allOptions.filter((i) =>
    i.instrumento.toLowerCase().includes(instrumentQuery.toLowerCase()),
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
          (i) => i.instrumento.toLowerCase() === instrumentQuery.toLowerCase(),
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
        });
      });
    } else {
      // B. INDIVIDUAL
      const instrObj = (catalogoInstrumentos || []).find(
        (i) => i.id === finalInstrId,
      );
      // Fallback por si acaso
      const baseName = instrObj
        ? capitalize(instrObj.instrumento)
        : "Instrumento";
      const realId = instrObj ? instrObj.id : finalInstrId;

      for (let i = 1; i <= genQuantity; i++) {
        const name = genQuantity > 1 ? `${baseName} ${i}` : baseName;
        newParts.push({
          tempId: Date.now() + i + Math.random(),
          id: undefined,
          id_instrumento: realId,
          nombre_archivo: name,
          links: [],
          nota_organico: "",
          instrumento_nombre: instrObj?.instrumento,
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

  const handleDeletePart = (tempId) => {
    if (!confirm("¿Eliminar?")) return;
    if (onPartsChange) onPartsChange(parts.filter((p) => p.tempId !== tempId));
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
  const getFileAssignmentCount = (fileUrl) => {
    let count = 0;
    Object.values(assignments).forEach((links) => {
      if (links.some((l) => l.url === fileUrl)) count++;
    });
    return count;
  };

  if (!isOpen) return null;

  const sortedParts = [...parts].sort((a, b) =>
    a.nombre_archivo.localeCompare(b.nombre_archivo, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

  return (
    <ModalPortal>
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* HEADER */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <IconDrive className="text-blue-600" /> Asistente de Enlaces Drive
            </h3>
            <div className="text-sm font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 inline-block w-fit">
              {currentInstrumentation || "Sin instrumentación"}
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
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
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
            <div className="p-2 bg-white border-b border-slate-200 flex gap-2 shadow-sm z-20 items-center">
              <div className="flex-1 relative">
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
              <div className="w-16">
                <input
                  type="number"
                  min="1"
                  className="w-full text-xs border p-1.5 rounded text-center outline-none focus:border-blue-500"
                  value={genQuantity}
                  onChange={(e) =>
                    setGenQuantity(parseInt(e.target.value) || 1)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleAddPart()}
                />
              </div>
              <button
                onClick={handleAddPart}
                className="bg-indigo-100 text-indigo-700 p-1.5 rounded hover:bg-indigo-200"
              >
                <IconPlus size={16} />
              </button>
            </div>

            <div className="p-2 bg-slate-100 border-b text-xs font-bold text-slate-500 uppercase flex justify-between sticky top-0 z-10">
              <span>Particellas ({parts.length})</span>
              <span>Enlaces</span>
            </div>

            <div className="overflow-y-auto p-3 space-y-2 flex-1">
              {sortedParts.map((part) => {
                const currentLinks = assignments[part.tempId] || [];
                const isAssigned = currentLinks.length > 0;
                const isEditing = editingPartId === part.tempId;

                return (
                  <div
                    key={part.tempId}
                    onClick={() => handlePartAssignmentClick(part)} // <--- CLICK AQUÍ GATILLA LA CASCADA
                    className={`p-2 rounded border transition-all relative group ${
                      selectedFiles.length > 0 && !isEditing
                        ? "cursor-pointer hover:border-blue-500 hover:shadow-md hover:bg-blue-50 border-dashed border-blue-300"
                        : "bg-white border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex justify-between items-center h-7 gap-2">
                      <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0 select-none">
                        {part.id_instrumento}
                      </span>
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
                          <div className="flex items-center gap-2">
                            <span
                              className="font-bold text-sm text-slate-700 truncate cursor-text hover:text-indigo-600"
                              onClick={(e) => startEditing(e, part)}
                            >
                              {part.nombre_archivo}
                            </span>
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
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <>
                            {isAssigned && (
                              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 rounded font-bold mr-1 select-none">
                                {currentLinks.length}
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
                      </div>
                    </div>
                    {isAssigned && !isEditing && (
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
              {driveFiles.map((file, idx) => {
                const isSelected = selectedFiles.some((f) => f.id === file.id);
                let assignCount = 0;
                Object.values(assignments).forEach((links) => {
                  if (links.some((l) => l.url === file.webViewLink))
                    assignCount++;
                });
                const isUsed = assignCount > 0;

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
            onClick={onClose}
            className="px-6 py-2 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
