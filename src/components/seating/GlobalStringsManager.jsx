import React, { useState, useEffect, useMemo } from "react";
import {
  IconLayers,
  IconLoader,
  IconDownload,
  IconPlus,
  IconCheck,
  IconX,
  IconTrash,
  IconEdit,
  IconChevronDown,
  IconBulb,
} from "../ui/Icons";
import DateInput from "../ui/DateInput";
import {
  seatingMatrixToOrder,
  seatingItemMatrixPosition,
  sortSeatingItems,
  shiftSeatingLine,
} from "../../services/giraService";

const PROGRAM_TYPES = [
  { value: "Todos", label: "Todos" },
  { value: "Sinfónico", label: "Sinfónico" },
  { value: "Ensamble", label: "Ensamble" },
  { value: "Camerata", label: "Camerata" },
  { value: "Otros", label: "Otros" },
];

const ImportSeatingModal = ({
  isOpen,
  onClose,
  onConfirm,
  currentProgramId,
  supabase,
}) => {
  const [loading, setLoading] = useState(false);
  // Modo de importación:
  // - "update_members": actualizar integrantes manteniendo contenedores que matchean por nombre
  // - "create_new": crear nuevos contenedores sin tocar los existentes
  // - "full_replace": borrar contenedores actuales y recrear desde el origen
  const [mode, setMode] = useState("update_members");
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [rows, setRows] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedContainerIds, setSelectedContainerIds] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  });

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("programas")
        .select("id, nombre_gira, nomenclador, fecha_desde, tipo")
        .neq("id", currentProgramId)
        .gte("fecha_desde", fechaDesde)
        .order("fecha_desde", { ascending: true });

      if (tipoFiltro === "Sinfónico" || tipoFiltro === "Ensamble") {
        query = query.eq("tipo", tipoFiltro);
      } else if (tipoFiltro === "Otros") {
        query = query.not("tipo", "in", ["Sinfónico,Ensamble"]);
      }

      const { data: programasData } = await query;

      if (!programasData || programasData.length === 0) {
        setRows([]);
        setSelectedProgramId(null);
        setExpandedId(null);
        setLoading(false);
        return;
      }

      const ids = programasData.map((p) => p.id);
      const { data: contenedores } = await supabase
        .from("seating_contenedores")
        .select("id, id_programa, nombre, id_instrumento, orden")
        .in("id_programa", ids);

      const contIds = (contenedores || []).map((c) => c.id);
      let itemsByContainer = {};
      if (contIds.length > 0) {
        const { data: items } = await supabase
          .from("seating_contenedores_items")
          .select(
            "id, id_contenedor, id_musico, orden, atril_num, lado, integrantes(apellido, nombre)",
          )
          .in("id_contenedor", contIds);

        (items || []).forEach((item) => {
          const key = item.id_contenedor;
          if (!itemsByContainer[key]) itemsByContainer[key] = [];
          itemsByContainer[key].push(item);
        });
      }

      const grouped = {};
      (contenedores || []).forEach((c) => {
        if (!grouped[c.id_programa]) grouped[c.id_programa] = [];
        grouped[c.id_programa].push(c);
      });

      const mapped = programasData.map((p) => ({
        ...p,
        contenedores: (grouped[p.id] || [])
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
          .map((c) => {
            const raw = itemsByContainer[c.id] || [];
            const people = sortSeatingItems(raw).filter((row) => row.integrantes);
            const peopleNames = people
              .map((row) =>
                `${row.integrantes.apellido || ""} ${row.integrantes.nombre || ""}`.trim(),
              )
              .filter(Boolean);
            return {
              ...c,
              peopleCount: peopleNames.length,
              peopleNames,
            };
          }),
      }));

      setRows(mapped);
      const firstId = mapped[0]?.id || null;
      setSelectedProgramId(firstId);
      setExpandedId(firstId);
      setSelectedContainerIds(
        firstId ? (mapped[0]?.contenedores || []).map((c) => c.id) : [],
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrograms();
    }
  }, [isOpen, tipoFiltro, fechaDesde]);

  if (!isOpen) return null;

  const handleToggleContainer = (containerId, checked) => {
    setSelectedContainerIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, containerId]));
      }
      return prev.filter((id) => id !== containerId);
    });
  };

  const handleConfirm = () => {
    if (!selectedProgramId) return;
    if (selectedContainerIds.length === 0) {
      alert("Seleccioná al menos un contenedor para importar.");
      return;
    }
    onConfirm({
      sourceProgramId: selectedProgramId,
      mode,
      containerIds: selectedContainerIds,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4 border border-slate-200 flex flex-col max-h-[80vh]">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
          <IconDownload className="text-indigo-600" /> Importar Disposición
          desde otra gira
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Tipo de programa
            </label>
            <select
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
            >
              {PROGRAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <DateInput
              label="Fecha desde"
              value={fechaDesde}
              onChange={(iso) => setFechaDesde(iso || fechaDesde)}
              className="text-xs"
            />
          </div>
          <div className="flex items-end">
            <div className="flex flex-col gap-1 border p-2 rounded bg-slate-50 border-slate-200 w-full text-[11px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                Modo de importación
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="import-mode"
                  value="update_members"
                  className="accent-indigo-600"
                  checked={mode === "update_members"}
                  onChange={(e) => setMode(e.target.value)}
                />
                <span className="text-slate-700">
                  Actualizar integrantes (mantener grupos que coinciden por
                  nombre)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="import-mode"
                  value="create_new"
                  className="accent-indigo-600"
                  checked={mode === "create_new"}
                  onChange={(e) => setMode(e.target.value)}
                />
                <span className="text-slate-700">
                  Crear nuevos contenedores (no toca los existentes)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="import-mode"
                  value="full_replace"
                  className="accent-red-500"
                  checked={mode === "full_replace"}
                  onChange={(e) => setMode(e.target.value)}
                />
                <span className="text-slate-700">
                  Borrado total y recrear desde el programa origen
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto border border-slate-200 rounded-md mb-3">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-xs text-slate-500">
              <IconLoader className="animate-spin mr-2" size={14} />
              Buscando programas...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-xs text-slate-400 italic">
              No se encontraron programas con estos filtros.
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-2 py-1">Programa</th>
                  <th className="text-left px-2 py-1">Fecha</th>
                  <th className="text-left px-2 py-1">Tipo</th>
                  <th className="text-center px-2 py-1">Contenedores</th>
                  <th className="text-center px-2 py-1">Preview</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const isSelected = selectedProgramId === p.id;
                  const isExpanded = expandedId === p.id;
                  const conts = p.contenedores || [];
                  const fechaLabel = p.fecha_desde
                    ? new Date(p.fecha_desde).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })
                    : "-";
                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`cursor-pointer hover:bg-indigo-50 ${
                          isSelected ? "bg-indigo-50" : ""
                        }`}
                        onClick={() => {
                          setSelectedProgramId(p.id);
                          setSelectedContainerIds(
                            (p.contenedores || []).map((c) => c.id),
                          );
                        }}
                      >
                        <td className="px-2 py-1">
                          <div className="font-semibold text-slate-800 truncate">
                            {p.nomenclador || p.nombre_gira || "Sin título"}
                          </div>
                        </td>
                        <td className="px-2 py-1 text-slate-600">
                          {fechaLabel}
                        </td>
                        <td className="px-2 py-1 text-slate-600">
                          {p.tipo || "-"}
                        </td>
                        <td className="px-2 py-1 text-center text-slate-700 font-semibold">
                          {conts.length}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : p.id);
                              setSelectedProgramId(p.id);
                            }}
                            className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] border rounded-full text-slate-600 hover:bg-slate-100"
                          >
                            <IconChevronDown
                              size={12}
                              className={`mr-1 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                            Ver
                          </button>
                        </td>
                      </tr>
                      {isExpanded && conts.length > 0 && (
                        <tr className="bg-slate-50/80">
                          <td
                            colSpan={5}
                            className="px-3 py-2 border-t border-slate-200"
                          >
                            <div className="text-[10px] text-slate-500 mb-1 font-semibold uppercase">
                              Contenedores / Instrumentos / Músicos
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {conts.map((c) => {
                                const checked = selectedContainerIds.includes(
                                  c.id,
                                );
                                return (
                                  <label
                                    key={c.id}
                                    className={`px-2 py-1 rounded-full border text-[10px] flex items-center gap-1 shadow-sm cursor-pointer ${
                                      checked
                                        ? "bg-indigo-50 border-indigo-300 text-indigo-800"
                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="accent-indigo-600"
                                      checked={checked}
                                      onChange={(e) =>
                                        handleToggleContainer(c.id, e.target.checked)
                                      }
                                    />
                                    <span className="font-semibold">
                                      {c.nombre}
                                    </span>
                                    {typeof c.peopleCount === "number" && (
                                      <span className="text-[9px] text-slate-500">
                                        · {c.peopleCount}
                                      </span>
                                    )}
                                    {c.peopleNames &&
                                      c.peopleNames.length > 0 && (
                                        <span className="text-[9px] text-slate-400 truncate max-w-[140px]">
                                          {c.peopleNames
                                            .slice(0, 3)
                                            .map((n, idx) =>
                                              idx === 0 ? n : ` / ${n}`,
                                            )}
                                          {c.peopleNames.length > 3
                                            ? ` +${
                                                c.peopleNames.length - 3
                                              }`
                                            : ""}
                                        </span>
                                      )}
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-between gap-2 mt-2 text-[10px] items-center">
          <div className="text-slate-400">
            Seleccionados:{" "}
            <span className="font-bold text-slate-600">
              {selectedContainerIds.length}
            </span>{" "}
            grupos
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedProgramId || loading}
            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? (
              <IconLoader className="animate-spin" size={12} />
            ) : (
              <IconDownload size={12} />
            )}
            Importar
          </button>
        </div>
      </div>
    </div>
  );
};

export default function GlobalStringsManager({
  programId,
  roster,
  containers,
  onUpdate,
  supabase,
  readOnly,
}) {
  const getItemMatrixPosition = (item, fallbackIndex = 0) =>
    seatingItemMatrixPosition(item, fallbackIndex);

  const validMusicianIds = useMemo(() => new Set(roster.map((m) => m.id)), [roster]);
  const displayContainers = useMemo(() => containers.map((c) => ({ ...c, validItems: c.items?.filter((i) => validMusicianIds.has(i.id_musico)) || [] })), [containers, validMusicianIds]);
  const stringMusicians = useMemo(() => roster.filter((m) => ["01", "02", "03", "04"].includes(m.id_instr)), [roster]);
  const assignedIds = new Set();
  displayContainers.forEach((c) => c.validItems.forEach((i) => assignedIds.add(i.id_musico)));
  const available = stringMusicians.filter((m) => !assignedIds.has(m.id));

  const [dragOverContainerId, setDragOverContainerId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCap, setEditCap] = useState("");
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderMode, setReorderMode] = useState("adelantar"); // "adelantar" | "acomodar"
  const [previewMap, setPreviewMap] = useState({}); // { [itemId]: { atril_num, lado, orden } }

  const seatingSuggestionsByContainer = useMemo(() => {
    const byContainer = {};
    displayContainers.forEach((container) => {
      const perItemSuggestion = {};
      [0, 1].forEach((lado) => {
        const sideItems = (container.validItems || [])
          .map((item, idx) => {
            const pos = getItemMatrixPosition(item, idx);
            return { item, idx, atril_num: Number(pos.atril_num), lado: Number(pos.lado) };
          })
          .filter((entry) => entry.lado === lado)
          .sort((a, b) => a.atril_num - b.atril_num || Number(a.item.id) - Number(b.item.id));

        if (!sideItems.length) return;

        const bySeat = new Map();
        sideItems.forEach((entry) => {
          if (!bySeat.has(entry.atril_num)) bySeat.set(entry.atril_num, []);
          bySeat.get(entry.atril_num).push(entry);
        });

        // Orden sugerido: primero titulares por atril (sin huecos), luego superpuestos.
        const orderedEntries = [];
        Array.from(bySeat.keys())
          .sort((a, b) => a - b)
          .forEach((atril) => {
            const entries = bySeat.get(atril) || [];
            if (!entries.length) return;
            orderedEntries.push({ ...entries[0], provisional: false });
            entries.slice(1).forEach((extra) => {
              orderedEntries.push({ ...extra, provisional: true });
            });
          });

        orderedEntries.forEach((entry, index) => {
          const newAtril = index + 1;
          const moved = newAtril !== entry.atril_num;
          if (!moved && !entry.provisional) return;

          let suggestionType = "provisional";
          if (!entry.provisional) {
            suggestionType =
              newAtril === entry.atril_num - 1 ? "shift_up_one" : "reordered";
          }

          perItemSuggestion[entry.item.id] = {
            atril_num: newAtril,
            lado,
            orden: seatingMatrixToOrder(newAtril, lado),
            suggestionType,
          };
        });
      });

      if (Object.keys(perItemSuggestion).length) {
        byContainer[container.id] = perItemSuggestion;
      }
    });
    return byContainer;
  }, [displayContainers]);

  const hasSeatingSuggestions =
    Object.keys(seatingSuggestionsByContainer).length > 0;

  const createContainer = async () => {
    if (readOnly) return;
    const name = prompt("Nombre del grupo:", `Grupo ${containers.length + 1}`);
    if (!name) return;
    await supabase.from("seating_contenedores").insert({ id_programa: programId, nombre: name, orden: containers.length, id_instrumento: "00" });
    onUpdate();
  };
  const deleteContainer = async (id) => {
    if (readOnly) return;
    if (!confirm("¿Eliminar este grupo?")) return;
    await supabase.from("seating_contenedores").delete().eq("id", id);
    onUpdate();
  };
  const startEditing = (c) => { setEditingId(c.id); setEditName(c.nombre); setEditCap(c.capacidad || ""); };
  const saveEditing = async (id) => {
    await supabase.from("seating_contenedores").update({ nombre: editName, capacidad: editCap ? parseInt(editCap) : null }).eq("id", id);
    setEditingId(null); onUpdate();
  };
  const updateOrderInDB = async (items) => {
    await Promise.all(
      items.map((item, index) => {
        let atril_num =
          item.atril_num != null && !Number.isNaN(Number(item.atril_num))
            ? Number(item.atril_num)
            : Math.floor(index / 2) + 1;
        let lado =
          item.lado != null && !Number.isNaN(Number(item.lado))
            ? Number(item.lado)
            : index % 2;
        const orden = seatingMatrixToOrder(atril_num, lado);
        return supabase
          .from("seating_contenedores_items")
          .update({ atril_num, lado, orden })
          .eq("id", item.id);
      }),
    );
  };

  const getTargetPositionForInsert = (
    container,
    targetIndex,
    explicitAtril = null,
    explicitLado = null,
  ) => {
    if (explicitAtril != null && explicitLado != null) {
      return {
        atril_num: Number(explicitAtril),
        lado: Number(explicitLado),
      };
    }
    const items = container.validItems || [];
    if (!items.length) {
      return { atril_num: 1, lado: 0 };
    }
    const last = items[items.length - 1];
    const lastAtril =
      last.atril_num != null && !Number.isNaN(Number(last.atril_num))
        ? Number(last.atril_num)
        : 1;
    return { atril_num: lastAtril + 1, lado: 0 };
  };

  const addMusician = async (
    containerId,
    musicianId,
    targetIndex = -1,
    explicitAtril = null,
    explicitLado = null,
  ) => {
    if (
      readOnly ||
      containers.some((c) => c.items.some((i) => i.id_musico === musicianId))
    )
      return;
    const container = displayContainers.find((c) => c.id === containerId);
    if (!container) return;

    const { atril_num, lado } = getTargetPositionForInsert(
      container,
      targetIndex,
      explicitAtril,
      explicitLado,
    );

    const targetOccupied = (container.validItems || []).some((item, idx) => {
      const pos = getItemMatrixPosition(item, idx);
      return Number(pos.atril_num) === Number(atril_num) && Number(pos.lado) === Number(lado);
    });

    if (targetOccupied) {
      // Desplazar solo la línea afectada para hacer espacio
      const { error: shiftError } = await shiftSeatingLine(supabase, {
        containerId,
        startAtril: atril_num,
        lado,
        direction: 1,
      });
      if (shiftError) {
        // Si falla el RPC, no seguimos para no romper el orden existente
        // eslint-disable-next-line no-alert
        alert("Error desplazando la línea de atril.");
        return;
      }
    }

    const orden = seatingMatrixToOrder(atril_num, lado);

    const { data: newItem } = await supabase
      .from("seating_contenedores_items")
      .insert({
        id_contenedor: containerId,
        id_musico: musicianId,
        atril_num,
        lado,
        orden,
      })
      .select("*, integrantes(nombre, apellido, instrumentos(instrumento))")
      .single();
    if (!newItem) return;

    // Refrescamos desde DB; el corrimiento ya lo hizo shift_seating_line
    onUpdate();
  };
  const handleReorder = async (
    itemId,
    sourceContainerId,
    targetContainerId,
    targetIndex,
    explicitPos = null,
  ) => {
    const sourceContainer = displayContainers.find((c) => String(c.id) === String(sourceContainerId));
    const sourceItem = sourceContainer?.validItems.find((i) => String(i.id) === String(itemId));
    const sourceIdx = sourceContainer?.validItems.findIndex((i) => String(i.id) === String(itemId));
    const sourcePos =
      sourceItem && sourceIdx != null && sourceIdx >= 0
        ? getItemMatrixPosition(sourceItem, sourceIdx)
        : null;

    const targetContainer = displayContainers.find(
      (c) => c.id == targetContainerId,
    );
    const { atril_num, lado } = getTargetPositionForInsert(
      targetContainer,
      targetIndex,
      explicitPos?.atril_num ?? null,
      explicitPos?.lado ?? null,
    );

    if (
      sourcePos &&
      String(sourceContainerId) === String(targetContainerId) &&
      Number(sourcePos.atril_num) === Number(atril_num) &&
      Number(sourcePos.lado) === Number(lado)
    ) {
      return;
    }

    const targetOccupied = (targetContainer?.validItems || []).some((item, idx) => {
      if (String(item.id) === String(itemId)) return false;
      const pos = getItemMatrixPosition(item, idx);
      return Number(pos.atril_num) === Number(atril_num) && Number(pos.lado) === Number(lado);
    });

    // Si cae sobre asiento ocupado, desplazamos esa línea un atril hacia abajo.
    if (targetOccupied) {
      await shiftSeatingLine(supabase, {
        containerId: targetContainerId,
        startAtril: atril_num,
        lado,
        direction: 1,
      });
    }
    const orden = seatingMatrixToOrder(atril_num, lado);

    // Si cambia de contenedor, actualizamos luego del corrimiento para que no afecte al item movido.
    if (sourceContainerId != null && sourceContainerId != targetContainerId) {
      await supabase
        .from("seating_contenedores_items")
        .update({ id_contenedor: targetContainerId })
        .eq("id", itemId);
    }

    await supabase
      .from("seating_contenedores_items")
      .update({ atril_num, lado, orden })
      .eq("id", itemId);

    // Refrescamos datos; el corrimiento ya lo hizo shift_seating_line
    onUpdate();
  };
  const removeMusician = async (itemId) => {
    if (readOnly) return;

    // Localizamos el contenedor y el item para conocer su posición matricial
    const container = displayContainers.find((c) =>
      c.validItems.some((i) => i.id === itemId),
    );
    const item = container?.validItems.find((i) => i.id === itemId);

    let atril_num = null;
    let lado = null;
    if (item) {
      const idx = container.validItems.indexOf(item);
      const pos = getItemMatrixPosition(item, idx >= 0 ? idx : 0);
      atril_num = pos.atril_num;
      lado = pos.lado;
    }

    await supabase
      .from("seating_contenedores_items")
      .delete()
      .eq("id", itemId);

    // Compactamos solo la línea de ese lado hacia arriba
    if (container && atril_num != null && lado != null) {
      await shiftSeatingLine(supabase, {
        containerId: container.id,
        startAtril: atril_num + 1,
        lado,
        direction: -1,
      });
    }

    onUpdate();
  };

  const applySeatingSuggestions = async (containerIds = null) => {
    if (readOnly || !hasSeatingSuggestions) return;
    const idsSet = Array.isArray(containerIds)
      ? new Set(containerIds.map((id) => String(id)))
      : null;
    const updates = [];
    Object.entries(seatingSuggestionsByContainer).forEach(([containerId, containerSuggestions]) => {
      if (idsSet && !idsSet.has(String(containerId))) return;
      Object.entries(containerSuggestions).forEach(([itemId, pos]) => {
        updates.push(
          supabase
            .from("seating_contenedores_items")
            .update({
              atril_num: pos.atril_num,
              lado: pos.lado,
              orden: pos.orden,
            })
            .eq("id", itemId),
        );
      });
    });
    if (updates.length) {
      await Promise.all(updates);
      onUpdate();
    }
  };
  const handleImportSeating = async ({
    sourceProgramId,
    mode,
    containerIds,
  }) => {
    setIsImporting(true);
    setShowImportModal(false);
    try {
      // Traemos contenedores e items del programa origen solo para los seleccionados
      const { data: sourceContainers } = await supabase
        .from("seating_contenedores")
        .select("*")
        .eq("id_programa", sourceProgramId)
        .in("id", containerIds)
        .order("orden");

      if (!sourceContainers?.length) {
        alert("La gira seleccionada no tiene contenedores para importar.");
        setIsImporting(false);
        return;
      }

      const { data: sourceItems } = await supabase
        .from("seating_contenedores_items")
        .select("*")
        .in(
          "id_contenedor",
          sourceContainers.map((c) => c.id),
        )
        .order("orden");

      const sourceItemsByContainer = {};
      (sourceItems || []).forEach((it) => {
        if (!sourceItemsByContainer[it.id_contenedor]) {
          sourceItemsByContainer[it.id_contenedor] = [];
        }
        sourceItemsByContainer[it.id_contenedor].push(it);
      });

      // Si el modo es full_replace, limpiamos todos los contenedores del programa actual
      if (mode === "full_replace") {
        if (
          !window.confirm(
            "Esto eliminará todos los grupos y sus integrantes actuales. ¿Continuar?",
          )
        ) {
          setIsImporting(false);
          return;
        }
        await supabase
          .from("seating_contenedores_items")
          .delete()
          .in(
            "id_contenedor",
            containers.map((c) => c.id),
          );
        await supabase
          .from("seating_contenedores")
          .delete()
          .eq("id_programa", programId);
      }

      // Mapa de contenedores actuales por nombre normalizado (para match inteligente)
      const normalizeName = (name) =>
        (name || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      let { data: currentContainers } = await supabase
        .from("seating_contenedores")
        .select("*")
        .eq("id_programa", programId)
        .order("orden");

      currentContainers = currentContainers || [];

      const byName = new Map();
      currentContainers.forEach((c) => {
        const key = normalizeName(c.nombre);
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key).push(c);
      });

      let currentOrderIndex =
        mode === "full_replace"
          ? 0
          : currentContainers.length > 0
            ? Math.max(...currentContainers.map((c) => c.orden || 0)) + 1
            : 0;

      for (const srcCont of sourceContainers) {
        const srcItems = sourceItemsByContainer[srcCont.id] || [];
        const normalizedName = normalizeName(srcCont.nombre);

        if (mode === "update_members") {
          const candidates = byName.get(normalizedName) || [];
          const target = candidates[0];
          if (target) {
            // 1) Borrar integrantes actuales del contenedor destino
            await supabase
              .from("seating_contenedores_items")
              .delete()
              .eq("id_contenedor", target.id);

            // 2) Insertar nuevos integrantes manteniendo id_contenedor
            const itemsToInsert = srcItems.map((item, idx) => {
              const hasAtril =
                item.atril_num != null && !Number.isNaN(Number(item.atril_num));
              const atril_num = hasAtril
                ? Number(item.atril_num)
                : Math.floor(idx / 2) + 1;
              const lado =
                item.lado != null && !Number.isNaN(Number(item.lado))
                  ? Number(item.lado)
                  : idx % 2;
              return {
                id_contenedor: target.id,
                id_musico: item.id_musico,
                atril_num,
                lado,
                orden: seatingMatrixToOrder(atril_num, lado),
              };
            });
            if (itemsToInsert.length) {
              await supabase
                .from("seating_contenedores_items")
                .insert(itemsToInsert);
            }
            continue;
          }
          // Si no hay match por nombre, caemos a create_new para este grupo puntual
        }

        // create_new o fallback desde update_members: crear un contenedor nuevo
        const { data: newCont } = await supabase
          .from("seating_contenedores")
          .insert({
            id_programa: programId,
            nombre: srcCont.nombre,
            id_instrumento: srcCont.id_instrumento || "00",
            orden: currentOrderIndex++,
            capacidad: srcCont.capacidad ?? null,
          })
          .select()
          .single();

        if (!newCont) continue;

        const itemsToInsert = srcItems.map((item, idx) => {
          const hasAtril =
            item.atril_num != null && !Number.isNaN(Number(item.atril_num));
          const atril_num = hasAtril
            ? Number(item.atril_num)
            : Math.floor(idx / 2) + 1;
          const lado =
            item.lado != null && !Number.isNaN(Number(item.lado))
              ? Number(item.lado)
              : idx % 2;
          return {
            id_contenedor: newCont.id,
            id_musico: item.id_musico,
            atril_num,
            lado,
            orden: seatingMatrixToOrder(atril_num, lado),
          };
        });
        if (itemsToInsert.length) {
          await supabase.from("seating_contenedores_items").insert(itemsToInsert);
        }
      }

      onUpdate();
    } catch (e) {
      console.error(e);
      alert("Error importando.");
    } finally {
      setIsImporting(false);
    }
  };
  const handleDragStart = (e, type, id, containerId) => {
    if (readOnly) return;
    e.dataTransfer.setData("type", type);
    e.dataTransfer.setData("id", id);
    e.dataTransfer.setData("sourceContainerId", containerId ?? "");
  };

  const handleDropOnCell = async (
    e,
    targetContainerId,
    atril_num,
    lado,
  ) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverContainerId(null);
    setDragOverItemId(null);

    const type = e.dataTransfer.getData("type");
    const id = e.dataTransfer.getData("id");
    const sourceId = e.dataTransfer.getData("sourceContainerId") || null;

    const targetContainer = displayContainers.find(
      (c) => c.id === targetContainerId,
    );
    if (!targetContainer) return;

    // Si hay superposiciones pendientes, las aplicamos automáticamente al primer movimiento.
    if (hasSeatingSuggestions) {
      const targetIds = [targetContainerId];
      if (sourceId && String(sourceId) !== String(targetContainerId)) {
        targetIds.push(sourceId);
      }
      await applySeatingSuggestions(targetIds);
    }

    // Índice aproximado solo para mantener orden visual local;
    // la matriz real se define por (atril_num, lado).
    const targetIndex = targetContainer.validItems.length;

    if (type === "NEW") {
      await addMusician(targetContainerId, id, targetIndex, atril_num, lado);
    } else if (type === "MOVE") {
      await handleReorder(id, sourceId, targetContainerId, targetIndex, {
        atril_num,
        lado,
      });
    }
  };

  const buildPreviewForMode = (mode) => {
    const result = {};
    displayContainers.forEach((c) => {
      const items = c.validItems || [];
      if (items.length === 0) return;

      if (mode === "adelantar") {
        // Compactar por lado, manteniendo lateralidad
        const left = items
          .filter((i) => Number(i.lado) === 0)
          .sort(
            (a, b) =>
              (a.atril_num || 0) - (b.atril_num || 0) ||
              Number(a.id) - Number(b.id),
          );
        left.forEach((item, idx) => {
          const atril_num = idx + 1;
          const lado = 0;
          const orden = seatingMatrixToOrder(atril_num, lado);
          result[item.id] = { atril_num, lado, orden };
        });

        const right = items
          .filter((i) => Number(i.lado) === 1)
          .sort(
            (a, b) =>
              (a.atril_num || 0) - (b.atril_num || 0) ||
              Number(a.id) - Number(b.id),
          );
        right.forEach((item, idx) => {
          const atril_num = idx + 1;
          const lado = 1;
          const orden = seatingMatrixToOrder(atril_num, lado);
          result[item.id] = { atril_num, lado, orden };
        });
      } else {
        // "acomodar": ignorar lado y rellenar matriz 0|1,2|3,...
        const withLegacyOrder = items.map((item) => {
          const hasMatrix =
            item.atril_num != null && !Number.isNaN(Number(item.atril_num));
          const baseOrden =
            item.orden != null && !Number.isNaN(Number(item.orden))
              ? Number(item.orden)
              : 9999;
          return {
            ...item,
            _sortKey: hasMatrix
              ? (item.atril_num || 0) * 10 +
                (Number(item.lado) || 0) +
                baseOrden / 10000
              : baseOrden,
          };
        });

        const sorted = withLegacyOrder.sort(
          (a, b) => a._sortKey - b._sortKey || Number(a.id) - Number(b.id),
        );

        sorted.forEach((item, idx) => {
          const atril_num = Math.floor(idx / 2) + 1;
          const lado = idx % 2;
          const orden = seatingMatrixToOrder(atril_num, lado);
          result[item.id] = { atril_num, lado, orden };
        });
      }
    });
    return result;
  };

  const applyReorderFromPreview = async () => {
    const updates = [];
    Object.entries(previewMap).forEach(([id, pos]) => {
      updates.push(
        supabase
          .from("seating_contenedores_items")
          .update({
            atril_num: pos.atril_num,
            lado: pos.lado,
            orden: pos.orden,
          })
          .eq("id", id),
      );
    });
    if (updates.length) {
      await Promise.all(updates);
    }
    setShowReorderModal(false);
    setPreviewMap({});
    onUpdate();
  };

  // Normaliza un contenedor específico: compacta atriles por lado (adelantar)
  const normalizeContainerOnServer = async (containerId) => {
    const { data: items } = await supabase
      .from("seating_contenedores_items")
      .select("*")
      .eq("id_contenedor", containerId);
    if (!items || items.length === 0) return;

    const updates = [];

    const left = items
      .filter((i) => Number(i.lado) === 0)
      .sort(
        (a, b) =>
          (a.atril_num || 0) - (b.atril_num || 0) ||
          Number(a.id) - Number(b.id),
      );
    left.forEach((item, idx) => {
      const atril_num = idx + 1;
      const lado = 0;
      const orden = seatingMatrixToOrder(atril_num, lado);
      updates.push(
        supabase
          .from("seating_contenedores_items")
          .update({ atril_num, orden })
          .eq("id", item.id),
      );
    });

    const right = items
      .filter((i) => Number(i.lado) === 1)
      .sort(
        (a, b) =>
          (a.atril_num || 0) - (b.atril_num || 0) ||
          Number(a.id) - Number(b.id),
      );
    right.forEach((item, idx) => {
      const atril_num = idx + 1;
      const lado = 1;
      const orden = seatingMatrixToOrder(atril_num, lado);
      updates.push(
        supabase
          .from("seating_contenedores_items")
          .update({ atril_num, orden })
          .eq("id", item.id),
      );
    });

    if (updates.length) {
      await Promise.all(updates);
    }
  };

  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 animate-in fade-in shrink-0">
      <ImportSeatingModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onConfirm={handleImportSeating} currentProgramId={programId} supabase={supabase} />
      {showReorderModal && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-4 border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <IconEdit size={14} /> Reordenar Cuerdas
              </h4>
              <button
                onClick={() => {
                  setShowReorderModal(false);
                  setPreviewMap({});
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <IconX size={14} />
              </button>
            </div>
            <div className="flex gap-3 mb-3 text-[11px]">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  className="accent-indigo-600"
                  checked={reorderMode === "adelantar"}
                  onChange={() => {
                    setReorderMode("adelantar");
                    setPreviewMap(buildPreviewForMode("adelantar"));
                  }}
                />
                <span className="font-semibold text-slate-700">
                  Adelantar atriles (respeta Afuera/Adentro)
                </span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  className="accent-indigo-600"
                  checked={reorderMode === "acomodar"}
                  onChange={() => {
                    setReorderMode("acomodar");
                    setPreviewMap(buildPreviewForMode("acomodar"));
                  }}
                />
                <span className="font-semibold text-slate-700">
                  Acomodar (legacy 0|1,2|3,...)
                </span>
              </label>
            </div>
            <div className="flex-1 overflow-auto border border-slate-200 rounded-md p-2 bg-slate-50">
              {displayContainers.map((c) => {
                const items = c.validItems || [];
                if (!items.length) return null;
                return (
                  <div key={c.id} className="mb-3 bg-white rounded border border-slate-200">
                    <div className="px-2 py-1 border-b border-slate-100 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>{c.nombre}</span>
                    </div>
                    <div className="p-2 text-[11px] grid grid-cols-4 gap-0">
                      <div className="font-semibold text-slate-500 mb-1 col-span-2 text-center">
                        Antes
                      </div>
                      <div className="font-semibold text-slate-500 mb-1 col-span-2 text-center">
                        Después
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 text-center border border-slate-200 bg-slate-50">
                        Afuera
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 text-center border border-slate-200 bg-slate-50">
                        Adentro
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 text-center border border-slate-200 bg-emerald-50/70">
                        Afuera
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 text-center border border-slate-200 bg-emerald-50/70">
                        Adentro
                      </div>
                      {(() => {
                        const beforeStands = {};
                        items.forEach((item) => {
                          const a =
                            item.atril_num != null &&
                            !Number.isNaN(Number(item.atril_num))
                              ? Number(item.atril_num)
                              : 1;
                          const l =
                            item.lado != null && !Number.isNaN(Number(item.lado))
                              ? Number(item.lado)
                              : 0;
                          if (!beforeStands[a]) beforeStands[a] = { left: null, right: null };
                          if (l === 0) beforeStands[a].left = item;
                          else if (l === 1) beforeStands[a].right = item;
                        });

                        const afterStands = {};
                        items.forEach((item) => {
                          const next = previewMap[item.id];
                          const a =
                            next && next.atril_num != null
                              ? Number(next.atril_num)
                              : item.atril_num || 1;
                          const l =
                            next && next.lado != null
                              ? Number(next.lado)
                              : Number(item.lado) || 0;
                          if (!afterStands[a]) afterStands[a] = { left: null, right: null };
                          if (l === 0) afterStands[a].left = item;
                          else if (l === 1) afterStands[a].right = item;
                        });

                        const allAtriles = Array.from(
                          new Set([
                            ...Object.keys(beforeStands).map(Number),
                            ...Object.keys(afterStands).map(Number),
                          ]),
                        ).sort((x, y) => x - y);

                        if (allAtriles.length === 0) {
                          return (
                            <div className="col-span-4 text-center text-slate-400 text-[10px] py-2">
                              Sin músicos en este contenedor.
                            </div>
                          );
                        }

                        return allAtriles.map((a) => {
                          const b = beforeStands[a] || { left: null, right: null };
                          const d = afterStands[a] || { left: null, right: null };
                          const cellClass = (itemBefore, itemAfter) => {
                            if (!itemAfter) return "text-slate-400";
                            const prev = previewMap[itemAfter.id];
                            const changed =
                              prev &&
                              (prev.atril_num !== itemAfter.atril_num ||
                                prev.lado !== itemAfter.lado);
                            return changed ? "text-fixed-indigo font-bold" : "text-slate-600";
                          };
                            return (
                            <React.Fragment key={`row-${c.id}-${a}`}>
                              {/* Antes afuera */}
                              <div className="py-0.5 border border-slate-200 bg-slate-50 text-center">
                                <span className="truncate block">
                                  {b.left
                                    ? `${b.left.integrantes?.apellido}, ${b.left.integrantes?.nombre}`
                                    : "Vacío"}
                                </span>
                              </div>
                              {/* Antes adentro */}
                              <div className="py-0.5 border border-slate-200 bg-slate-50 text-center">
                                <span className="truncate block">
                                  {b.right
                                    ? `${b.right.integrantes?.apellido}, ${b.right.integrantes?.nombre}`
                                    : "Vacío"}
                                </span>
                              </div>
                              {/* Después afuera */}
                              <div
                                className={`py-0.5 border border-slate-200 bg-emerald-50/70 text-center ${cellClass(
                                  b.left,
                                  d.left,
                                )}`}
                              >
                                <span className="truncate block">
                                  {d.left
                                    ? `${d.left.integrantes?.apellido}, ${d.left.integrantes?.nombre}`
                                    : "Vacío"}
                                </span>
                              </div>
                              {/* Después adentro */}
                              <div
                                className={`py-0.5 border border-slate-200 bg-emerald-50/70 text-center ${cellClass(
                                  b.right,
                                  d.right,
                                )}`}
                              >
                                <span className="truncate block">
                                  {d.right
                                    ? `${d.right.integrantes?.apellido}, ${d.right.integrantes?.nombre}`
                                    : "Vacío"}
                                </span>
                              </div>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-end gap-2 text-[11px]">
              <button
                onClick={() => {
                  setShowReorderModal(false);
                  setPreviewMap({});
                }}
                className="px-3 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={applyReorderFromPreview}
                className="px-3 py-1 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-700"
              >
                Aplicar cambios
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><IconLayers size={16} /> Disposición de Cuerdas</h3>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {hasSeatingSuggestions && (
              <button
                onClick={() => applySeatingSuggestions()}
                className="bg-orange-100 border border-orange-300 text-orange-800 px-2 py-1 rounded text-[10px] font-bold hover:bg-orange-200 flex items-center gap-1"
                title="Aplicar sugerencias de compactación y superposición"
              >
                <IconBulb size={12} /> Aplicar sugerencias
              </button>
            )}
            <span className="text-[10px] text-slate-400 italic mr-2 hidden sm:inline">
              Arrastra para reordenar
            </span>
            <button
              onClick={() => {
                const initialPreview = buildPreviewForMode(reorderMode);
                setPreviewMap(initialPreview);
                setShowReorderModal(true);
              }}
              className="bg-white border border-slate-300 text-slate-600 px-2 py-1 rounded text-[10px] font-bold hover:bg-slate-50 flex items-center gap-1"
            >
              <IconEdit size={12} /> Reordenar
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              disabled={isImporting}
              className="bg-white border border-slate-300 text-slate-600 px-2 py-1 rounded text-[10px] font-bold hover:bg-slate-50 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              {isImporting ? (
                <IconLoader className="animate-spin" size={12} />
              ) : (
                <IconDownload size={12} />
              )}{" "}
              Importar
            </button>
            <button
              onClick={createContainer}
              className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-700 flex items-center gap-1"
            >
              <IconPlus size={12} /> Nuevo Grupo
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-12 gap-4 h-[350px]">
        {!readOnly && (
          <div className="col-span-3 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden shadow-sm">
            <div className="p-2 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase flex justify-between"><span>Sin Asignar ({available.length})</span></div>
            <div className="overflow-y-auto p-1 space-y-0.5 flex-1 select-none">
              {available.map((m) => (<div key={m.id} draggable={!readOnly} onDragStart={(e) => handleDragStart(e, "NEW", m.id, null)} className="text-[10px] p-1.5 bg-slate-50 border border-slate-100 rounded flex justify-between items-center hover:bg-indigo-50 cursor-grab active:cursor-grabbing"><div className="truncate pointer-events-none"><span className="text-slate-500">{m.nombre}</span> <span className="text-slate-700">{m.apellido} ({m.instrumentos?.instrumento})</span></div></div>))}
              {available.length === 0 && <div className="text-center text-[10px] text-slate-300 italic mt-4">Todos asignados</div>}
            </div>
          </div>
        )}
        <div className={`${readOnly ? "col-span-12" : "col-span-9"} grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto content-start pr-1`}>
          {displayContainers.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-indigo-100 rounded-lg shadow-sm flex flex-col h-fit transition-all duration-200"
            >
              <div className="p-1.5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30 rounded-t-lg min-h-[32px]">
                {editingId === c.id ? (<div className="flex items-center gap-1 w-full"><input className="w-full text-[10px] border border-indigo-300 rounded px-1 py-0.5 focus:outline-none" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus /><input type="number" className="w-10 text-[10px] border border-indigo-300 rounded px-1 py-0.5 text-center" value={editCap} onChange={(e) => setEditCap(e.target.value)} /><button onClick={() => saveEditing(c.id)} className="text-green-600"><IconCheck size={12} /></button><button onClick={() => setEditingId(null)} className="text-red-500"><IconX size={12} /></button></div>) : (<><div className="flex items-center gap-1 overflow-hidden"><span className="font-bold text-[10px] text-indigo-900 truncate uppercase tracking-wider" title={c.nombre}>{c.nombre}</span>{c.capacidad && (<span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded-full border border-slate-200">{c.validItems.length}/{c.capacidad}</span>)}<button onClick={() => startEditing(c)} className="text-slate-400 hover:text-indigo-600 ml-1 p-1"><IconEdit size={12} /></button></div>{!readOnly && (<div className="flex items-center gap-1">{Object.keys(seatingSuggestionsByContainer[c.id] || {}).length > 0 && (<button onClick={() => applySeatingSuggestions([c.id])} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-800 hover:bg-amber-200">Aplicar</button>)}<button onClick={() => deleteContainer(c.id)} className="text-slate-300 hover:text-red-500"><IconTrash size={10} /></button></div>)}</>)}
              </div>
              <div className="p-1 space-y-0.5 min-h-[40px]">
                {(() => {
                  const containerSuggestions = seatingSuggestionsByContainer[c.id] || {};
                  const placements = {};
                  c.validItems.forEach((item, idx) => {
                    const suggestedPos = containerSuggestions[item.id];
                    const basePos = getItemMatrixPosition(item, idx);
                    placements[item.id] = suggestedPos
                      ? { ...suggestedPos }
                      : { ...basePos, suggestionType: null };
                  });

                  const stands = {};
                  c.validItems.forEach((item) => {
                    const a = Number(placements[item.id]?.atril_num ?? 1);
                    const l = Number(placements[item.id]?.lado ?? 0);
                    if (!stands[a]) stands[a] = { left: null, right: null };
                    const payload = {
                      ...item,
                      _suggestionType: placements[item.id]?.suggestionType || null,
                    };
                    if (l === 0) stands[a].left = payload;
                    else if (l === 1) stands[a].right = payload;
                  });
                  const atrilesExistentes = Object.keys(stands)
                    .map((n) => Number(n))
                    .sort((a, b) => a - b);
                  const maxAtril =
                    atrilesExistentes.length > 0
                      ? atrilesExistentes[atrilesExistentes.length - 1]
                      : 0;

                  // Fila fantasma solo visible cuando estamos arrastrando sobre este contenedor
                  const atriles =
                    maxAtril > 0
                      ? dragOverContainerId === c.id
                        ? [...atrilesExistentes, maxAtril + 1]
                        : atrilesExistentes
                      : dragOverContainerId === c.id
                        ? [1]
                        : [];

                  if (atriles.length === 0) {
                    return (
                      <div className="flex items-stretch gap-1 mb-0.5">
                        {[0, 1].map((ladoVal) => (
                          <div
                            key={`empty-1-${ladoVal}`}
                            className="flex-1 min-w-0 px-0.5"
                            onDragOver={(e) => {
                              if (!readOnly) {
                                e.preventDefault();
                                setDragOverContainerId(c.id);
                                setDragOverItemId(`empty-1-${ladoVal}`);
                              }
                            }}
                            onDrop={(e) =>
                              handleDropOnCell(e, c.id, 1, ladoVal)
                            }
                          >
                            <div className="flex items-center justify-center p-1 border border-dashed border-slate-200 text-[10px] text-slate-300 bg-slate-50 rounded">
                              Vacío
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return atriles.map((a) => {
                    const row = stands[a] || { left: null, right: null };
                    const { left, right } = row;
                    const renderCell = (item, ladoVal) => {
                      const key = item ? item.id : `empty-${a}-${ladoVal}`;
                      return (
                        <div
                          key={key}
                          className={`flex-1 min-w-0 px-0.5`}
                          onDragOver={(e) => {
                            if (!readOnly) {
                              e.preventDefault();
                              setDragOverContainerId(c.id);
                              setDragOverItemId(key);
                            }
                          }}
                          onDrop={(e) =>
                            handleDropOnCell(e, c.id, a, ladoVal)
                          }
                        >
                          <div
                            draggable={!readOnly && !!item}
                            onDragStart={(e) =>
                              item &&
                              handleDragStart(e, "MOVE", item.id, c.id)
                            }
                            className={`flex items-center gap-1.5 p-1 border rounded text-[10px] group transition-colors ${
                              dragOverContainerId === c.id &&
                              dragOverItemId === key
                                ? "ring-2 ring-indigo-400 ring-offset-1 bg-indigo-50 border-indigo-400"
                                : item?._suggestionType === "provisional"
                                  ? "cursor-grab bg-orange-50 border-orange-300 text-orange-900"
                                : item?._suggestionType === "shift_up_one"
                                  ? "cursor-grab bg-amber-50 border-amber-300 text-amber-900"
                                : item
                                  ? "cursor-grab bg-white border-slate-100"
                                  : "cursor-default bg-slate-50 border-dashed border-slate-200 text-slate-300"
                            }`}
                          >
                            <div className="flex-1 min-w-0 pointer-events-none">
                              <span className="truncate block font-medium">
                                {item
                                  ? `${item.integrantes?.nombre} ${item.integrantes?.apellido}`
                                  : "Vacío"}
                              </span>
                              {item?._suggestionType === "provisional" && (
                                <span className="truncate block text-[9px] font-semibold text-orange-700">
                                  Provisorio
                                </span>
                              )}
                              {item?._suggestionType === "shift_up_one" && (
                                <span className="truncate block text-[9px] font-semibold text-amber-700">
                                  Sube 1
                                </span>
                              )}
                            </div>
                            {item && !readOnly && (
                              <button
                                onClick={() => removeMusician(item.id)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <IconX size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    };
                    return (
                      <div
                        key={`stand-${c.id}-${a}`}
                        className="flex items-stretch gap-1 mb-0.5"
                      >
                        {renderCell(left, 0)}
                        {renderCell(right, 1)}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}