import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconCheck,
  IconLoader,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "../ui/Icons";
import { normalizeForSearch } from "../../utils/sanitize";
import {
  addPlaceholderOpcion,
  fetchDirectRepertorioAssignmentsForObra,
  fetchPlaceholderOpcionesForObra,
  fetchPlaceholdersInBlock,
  fetchProgramIdsWithPlaceholders,
  removeDirectRepertorioAssignment,
  removePlaceholderOpcion,
  searchProgramasForAssign,
} from "../../services/repertorioPlaceholderOpciones";

const RichTextPreview = ({ content, className = "" }) => {
  const plain = String(content || "")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  return <span className={className}>{plain}</span>;
};

function GiraSearchPicker({
  giras,
  girasWithPlaceholders,
  selectedGiraId,
  onSelect,
  searchQuery,
  onSearchChange,
  searching,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = giras.find((g) => String(g.id) === String(selectedGiraId));

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = giras.filter((g) => {
    if (!searchQuery.trim()) return true;
    const hay = normalizeForSearch(
      `${g.mes_letra} ${g.nomenclador} ${g.nombre_gira}`,
    );
    return hay.includes(normalizeForSearch(searchQuery));
  });

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <IconSearch
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Buscar gira (nombre, mes, nomenclador)..."
          value={open ? searchQuery : selected ? formatGiraLabel(selected) : searchQuery}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) onSelect("");
          }}
        />
        {searching && (
          <IconLoader
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
          />
        )}
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg text-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-slate-400 italic text-xs">
              Sin resultados
            </li>
          ) : (
            filtered.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-indigo-50 ${
                    String(g.id) === String(selectedGiraId)
                      ? "bg-indigo-50 font-semibold"
                      : ""
                  }`}
                  onClick={() => {
                    onSelect(String(g.id));
                    onSearchChange("");
                    setOpen(false);
                  }}
                >
                  <span>{formatGiraLabel(g)}</span>
                  {girasWithPlaceholders.has(g.id) && (
                    <span className="ml-1 text-[9px] text-violet-700 font-semibold">
                      · slots a definir
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function formatGiraLabel(g) {
  if (!g) return "";
  return `${g.mes_letra || ""} | ${g.nombre_gira || ""} (${g.nomenclador || ""})`.trim();
}

function ExistingAssignmentList({ items, emptyLabel, onRemove, removingId }) {
  if (!items.length) {
    return (
      <p className="text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-lg p-3 text-center">
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="space-y-2 max-h-40 overflow-y-auto">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-start justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50/80 text-xs"
        >
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-800 truncate">{item.giraLabel}</div>
            {item.bloqueLabel && (
              <div className="text-slate-500 mt-0.5">{item.bloqueLabel}</div>
            )}
            {item.detail && (
              <div className="text-violet-700 mt-0.5 truncate">{item.detail}</div>
            )}
          </div>
          <button
            type="button"
            disabled={removingId === item.key}
            onClick={() => onRemove(item)}
            className="shrink-0 p-1.5 rounded text-red-500 hover:bg-red-50 disabled:opacity-50"
            title="Desasociar"
          >
            {removingId === item.key ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconTrash size={14} />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function AssignProgramModal({ work, onClose, supabase, isEditor }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("definitivo");
  const [giraSearch, setGiraSearch] = useState("");
  const [giras, setGiras] = useState([]);
  const [searchingGiras, setSearchingGiras] = useState(false);
  const [selectedGiraId, setSelectedGiraId] = useState("");
  const [girasWithPlaceholders, setGirasWithPlaceholders] = useState(
    () => new Set(),
  );
  const [bloques, setBloques] = useState([]);
  const [selectedBloqueId, setSelectedBloqueId] = useState("");
  const [isCreatingBloque, setIsCreatingBloque] = useState(false);
  const [newBloqueName, setNewBloqueName] = useState("");
  const [placeholders, setPlaceholders] = useState([]);
  const [selectedPlaceholderId, setSelectedPlaceholderId] = useState("");
  const [directAssignments, setDirectAssignments] = useState([]);
  const [placeholderAssignments, setPlaceholderAssignments] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const loadExisting = useCallback(async () => {
    if (!work?.id) return;
    setLoadingExisting(true);
    try {
      const [direct, opciones] = await Promise.all([
        fetchDirectRepertorioAssignmentsForObra(supabase, work.id),
        isEditor
          ? fetchPlaceholderOpcionesForObra(supabase, work.id)
          : Promise.resolve([]),
      ]);
      setDirectAssignments(direct);
      setPlaceholderAssignments(opciones);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExisting(false);
    }
  }, [supabase, work?.id, isEditor]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  useEffect(() => {
    if (!selectedGiraId) return;
    if (giras.some((g) => String(g.id) === String(selectedGiraId))) return;
    (async () => {
      const { data } = await supabase
        .from("programas")
        .select("id, nombre_gira, mes_letra, nomenclador, fecha_desde")
        .eq("id", selectedGiraId)
        .maybeSingle();
      if (data) {
        setGiras((prev) => [data, ...prev.filter((g) => g.id !== data.id)]);
      }
    })();
  }, [selectedGiraId, giras, supabase]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setSearchingGiras(true);
      try {
        const data = await searchProgramasForAssign(supabase, giraSearch);
        setGiras(data);
        const withPh = await fetchProgramIdsWithPlaceholders(
          supabase,
          data.map((p) => p.id),
        );
        setGirasWithPlaceholders(withPh);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingGiras(false);
      }
    }, giraSearch.trim().length >= 2 ? 250 : 0);
    return () => clearTimeout(t);
  }, [giraSearch, supabase]);

  useEffect(() => {
    if (!selectedGiraId) {
      setBloques([]);
      setSelectedBloqueId("");
      return;
    }
    const fetchBloques = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("programas_repertorios")
        .select("id, nombre, orden")
        .eq("id_programa", selectedGiraId)
        .order("orden", { ascending: true });
      setBloques(data || []);
      setSelectedBloqueId("");
      setIsCreatingBloque(false);
      setPlaceholders([]);
      setSelectedPlaceholderId("");
      setLoading(false);
    };
    fetchBloques();
  }, [selectedGiraId, supabase]);

  useEffect(() => {
    if (
      activeTab !== "a-definir" ||
      !selectedBloqueId ||
      !isEditor
    ) {
      setPlaceholders([]);
      setSelectedPlaceholderId("");
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const rows = await fetchPlaceholdersInBlock(supabase, selectedBloqueId);
        const linked = new Set(
          placeholderAssignments
            .filter(
              (o) =>
                o.repertorio_obras?.programas_repertorios?.id ===
                Number(selectedBloqueId),
            )
            .map((o) => o.repertorio_obras?.id),
        );
        const available = rows.filter((ph) => !linked.has(ph.id));
        setPlaceholders(available);
        if (available.length === 1) {
          setSelectedPlaceholderId(String(available[0].id));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [
    selectedBloqueId,
    activeTab,
    isEditor,
    supabase,
    placeholderAssignments,
  ]);

  const resetNewAssociationForm = useCallback(() => {
    setGiraSearch("");
    setSelectedGiraId("");
    setSelectedBloqueId("");
    setSelectedPlaceholderId("");
    setIsCreatingBloque(false);
    setNewBloqueName("");
    setBloques([]);
    setPlaceholders([]);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetNewAssociationForm();
  };

  const directListItems = directAssignments.map((row) => {
    const prog = row.programas_repertorios?.programas;
    const bloque = row.programas_repertorios?.nombre;
    return {
      key: `direct-${row.id}`,
      rowId: row.id,
      type: "direct",
      giraLabel: prog
        ? `${prog.nomenclador} · ${prog.nombre_gira}`
        : "Programa",
      bloqueLabel: bloque ? `Bloque: ${bloque}` : null,
    };
  });

  const placeholderListItems = placeholderAssignments.map((op) => {
    const slot = op.repertorio_obras;
    const prog = slot?.programas_repertorios?.programas;
    const bloque = slot?.programas_repertorios?.nombre;
    return {
      key: `opt-${op.id}`,
      opcionId: op.id,
      type: "opcion",
      giraLabel: prog
        ? `${prog.nomenclador} · ${prog.nombre_gira}`
        : "Programa",
      bloqueLabel: bloque ? `Bloque: ${bloque}` : null,
      detail: slot?.titulo_placeholder || "Slot a definir",
    };
  });

  const handleRemove = async (item) => {
    setRemovingId(item.key);
    try {
      if (item.type === "direct") {
        await removeDirectRepertorioAssignment(supabase, item.rowId);
      } else {
        await removePlaceholderOpcion(supabase, item.opcionId);
      }
      await loadExisting();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAssociate = async () => {
    setLoading(true);
    try {
      let targetBloqueId = selectedBloqueId;
      if (isCreatingBloque && newBloqueName) {
        const lastOrder =
          bloques.length > 0 ? Math.max(...bloques.map((b) => b.orden || 0)) : 0;
        const { data: newBlock, error: blockError } = await supabase
          .from("programas_repertorios")
          .insert([
            {
              id_programa: selectedGiraId,
              nombre: newBloqueName,
              orden: lastOrder + 1,
            },
          ])
          .select()
          .single();
        if (blockError) throw blockError;
        targetBloqueId = newBlock.id;
      }
      if (!targetBloqueId) {
        alert("Seleccioná o creá un bloque.");
        return;
      }

      if (activeTab === "a-definir") {
        if (!isEditor) return;
        if (!selectedPlaceholderId) {
          alert("Seleccioná un slot a definir.");
          return;
        }
        await addPlaceholderOpcion(
          supabase,
          Number(selectedPlaceholderId),
          work.id,
        );
      } else {
        const already = directAssignments.some(
          (r) => r.programas_repertorios?.id === Number(targetBloqueId),
        );
        if (already) {
          alert("Esta obra ya está en ese bloque.");
          return;
        }
        const { count } = await supabase
          .from("repertorio_obras")
          .select("id", { count: "exact", head: true })
          .eq("id_repertorio", targetBloqueId);
        const { error: assignError } = await supabase
          .from("repertorio_obras")
          .insert([
            {
              id_repertorio: targetBloqueId,
              id_obra: work.id,
              orden: (count || 0) + 1,
            },
          ]);
        if (assignError) throw assignError;
      }

      await loadExisting();
      setSelectedPlaceholderId("");
      if (activeTab === "a-definir" && selectedBloqueId) {
        const rows = await fetchPlaceholdersInBlock(supabase, selectedBloqueId);
        const linked = new Set(
          (await fetchPlaceholderOpcionesForObra(supabase, work.id))
            .filter(
              (o) =>
                o.repertorio_obras?.programas_repertorios?.id ===
                Number(selectedBloqueId),
            )
            .map((o) => o.repertorio_obras?.id),
        );
        setPlaceholders(rows.filter((ph) => !linked.has(ph.id)));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const canAssociateDefinitivo =
    activeTab === "definitivo" &&
    selectedGiraId &&
    (selectedBloqueId || newBloqueName.trim());

  const canAssociateADefinir =
    activeTab === "a-definir" &&
    isEditor &&
    selectedGiraId &&
    (selectedBloqueId || newBloqueName.trim()) &&
    selectedPlaceholderId;

  const girasForPicker =
    activeTab === "a-definir"
      ? giras.filter((g) => girasWithPlaceholders.has(g.id))
      : giras;

  const renderNewAssociationForm = () => (
    <div className="pt-2 border-t border-slate-100 space-y-3">
      <h4 className="text-[10px] font-bold uppercase text-slate-500">
        {activeTab === "definitivo"
          ? "Nueva asociación a repertorio"
          : "Nueva opción en slot a definir"}
      </h4>
      <div>
        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
          Gira
        </label>
        <GiraSearchPicker
          giras={girasForPicker}
          girasWithPlaceholders={girasWithPlaceholders}
          selectedGiraId={selectedGiraId}
          onSelect={setSelectedGiraId}
          searchQuery={giraSearch}
          onSearchChange={setGiraSearch}
          searching={searchingGiras}
        />
        {activeTab === "a-definir" &&
          !searchingGiras &&
          girasForPicker.length === 0 &&
          giras.length > 0 && (
            <p className="text-[10px] text-violet-700 mt-1">
              Ninguna gira visible tiene slots a definir. Probá otra búsqueda.
            </p>
          )}
      </div>

      {selectedGiraId && (
        <div className="animate-in slide-in-from-top-1 fade-in space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              Bloque
            </label>
            {!isCreatingBloque ? (
              <div className="flex gap-2">
                <select
                  className={`w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 ${
                    activeTab === "a-definir"
                      ? "border-violet-200 focus:ring-violet-400"
                      : "border-slate-300 focus:ring-indigo-500"
                  }`}
                  value={selectedBloqueId}
                  onChange={(e) => setSelectedBloqueId(e.target.value)}
                  disabled={bloques.length === 0}
                >
                  <option value="">
                    {bloques.length === 0
                      ? "-- Sin bloques --"
                      : "-- Seleccionar bloque --"}
                  </option>
                  {bloques.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingBloque(true);
                    setSelectedBloqueId("");
                  }}
                  className={`p-2 rounded-lg border shrink-0 ${
                    activeTab === "a-definir"
                      ? "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                      : "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100"
                  }`}
                  title="Crear bloque"
                >
                  <IconPlus size={18} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`w-full p-2 border rounded-lg text-sm outline-none ring-2 ${
                    activeTab === "a-definir"
                      ? "border-violet-300 ring-violet-100"
                      : "border-indigo-300 ring-indigo-100"
                  }`}
                  placeholder="Nombre (ej: Programa I)"
                  value={newBloqueName}
                  onChange={(e) => setNewBloqueName(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCreatingBloque(false)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  <IconX size={18} />
                </button>
              </div>
            )}
            {bloques.length === 0 && !isCreatingBloque && (
              <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                <IconAlertCircle size={10} /> Gira sin bloques — creá uno con +.
              </p>
            )}
          </div>

          {activeTab === "a-definir" &&
            selectedBloqueId &&
            !isCreatingBloque && (
              <div>
                <label className="text-[10px] font-bold uppercase text-violet-700 mb-1 block">
                  Slot a definir
                </label>
                {loading ? (
                  <p className="text-xs text-slate-400">Cargando slots…</p>
                ) : placeholders.length === 0 ? (
                  <p className="text-[10px] text-violet-700 bg-violet-50 border border-violet-100 rounded p-2">
                    No hay slots disponibles en este bloque (o ya están
                    vinculados).
                  </p>
                ) : (
                  <select
                    className="w-full p-2 border border-violet-200 rounded-lg text-sm bg-violet-50/30 outline-none focus:ring-2 focus:ring-violet-400"
                    value={selectedPlaceholderId}
                    onChange={(e) =>
                      setSelectedPlaceholderId(e.target.value)
                    }
                  >
                    <option value="">-- Seleccionar slot --</option>
                    {placeholders.map((ph) => (
                      <option key={ph.id} value={ph.id}>
                        {ph.titulo_placeholder}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleAssociate}
              disabled={
                loading ||
                (activeTab === "definitivo"
                  ? !canAssociateDefinitivo
                  : !canAssociateADefinir)
              }
              className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 font-bold shadow-sm flex items-center gap-2 ${
                activeTab === "a-definir"
                  ? "bg-violet-700 hover:bg-violet-800"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {loading ? (
                <IconLoader className="animate-spin" size={14} />
              ) : (
                <IconPlus size={14} />
              )}
              {activeTab === "definitivo" ? "Asociar al bloque" : "Agregar opción"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-start shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="font-bold text-lg text-slate-800">Asignar a Gira</h3>
            <RichTextPreview
              content={work.titulo}
              className="text-xs text-slate-500 line-clamp-2"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 shrink-0"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex border-b shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange("definitivo")}
            className={`flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wide border-b-2 ${
              activeTab === "definitivo"
                ? "border-indigo-600 text-indigo-800 bg-indigo-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Repertorio definitivo
          </button>
          {isEditor && (
            <button
              type="button"
              onClick={() => handleTabChange("a-definir")}
              className={`flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wide border-b-2 ${
                activeTab === "a-definir"
                  ? "border-violet-600 text-violet-800 bg-violet-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              A definir
            </button>
          )}
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 block">
              {activeTab === "definitivo"
                ? "En repertorio definitivo"
                : "Como opción en slots a definir"}
            </label>
            {loadingExisting ? (
              <div className="flex justify-center py-4 text-indigo-500">
                <IconLoader className="animate-spin" size={18} />
              </div>
            ) : (
              <ExistingAssignmentList
                items={
                  activeTab === "definitivo"
                    ? directListItems
                    : placeholderListItems
                }
                emptyLabel={
                  activeTab === "definitivo"
                    ? "Sin asignaciones definitivas"
                    : "Sin opciones en slots a definir"
                }
                onRemove={handleRemove}
                removingId={removingId}
              />
            )}
          </div>

          {activeTab === "definitivo" && renderNewAssociationForm()}
          {activeTab === "a-definir" && isEditor && renderNewAssociationForm()}
        </div>

        <div className="flex gap-2 justify-end p-4 border-t shrink-0 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
