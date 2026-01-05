import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  IconMusic,
  IconPlus,
  IconTrash,
  IconSearch,
  IconLoader,
  IconCheck,
  IconX,
  IconLink,
  IconChevronDown,
  IconAlertCircle,
  IconEdit,
  IconYoutube,
  IconDrive,
} from "../ui/Icons";
import { formatSecondsToTime } from "../../utils/time";
import {
  calculateInstrumentation,
  calculateTotalDuration,
} from "../../utils/instrumentation";
import CommentsManager from "../comments/CommentsManager";
import CommentButton from "../comments/CommentButton";
import { useAuth } from "../../context/AuthContext";
import WorkForm from "../../views/Repertoire/WorkForm";

const ModalPortal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body
  );
};

// --- RENDERER DE TEXTO RICO ---
const RichTextPreview = ({ content, className = "" }) => {
  if (!content) return null;
  return (
    <div
      className={`whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:ml-1 leading-tight ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

// --- COMPONENTE INTERNO: SELECTOR DE SOLISTA ---
const SoloistSelect = ({ currentId, musicians, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);
  const selectedMusician = musicians.find((m) => m.id === currentId);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = musicians.filter((m) =>
    `${m.apellido}, ${m.nombre}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {!isOpen ? (
        <div
          onClick={() => setIsOpen(true)}
          className="w-full text-[10px] text-slate-700 truncate cursor-pointer hover:bg-indigo-50 p-1 rounded border border-transparent hover:border-indigo-100 min-h-[24px] flex items-center"
        >
          {selectedMusician ? (
            <span className="font-bold text-indigo-700">
              {selectedMusician.apellido}, {selectedMusician.nombre}
            </span>
          ) : (
            <span className="text-slate-400 italic">- Seleccionar -</span>
          )}
        </div>
      ) : (
        <div className="absolute top-0 left-0 w-64 bg-white border border-indigo-200 shadow-xl rounded z-50 animate-in zoom-in-95 duration-100">
          <input
            type="text"
            autoFocus
            placeholder="Buscar apellido..."
            className="w-full p-2 text-xs border-b border-slate-100 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto">
            <div
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="p-2 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer border-b border-slate-50 italic"
            >
              - Quitar Solista -
            </div>
            {filtered.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  onChange(m.id);
                  setIsOpen(false);
                }}
                className={`p-2 text-xs cursor-pointer hover:bg-indigo-50 flex justify-between ${
                  currentId === m.id
                    ? "bg-indigo-50 font-bold text-indigo-700"
                    : "text-slate-600"
                }`}
              >
                <span>
                  {m.apellido}, {m.nombre}
                </span>
                <span className="text-[9px] text-slate-400 ml-2 truncate max-w-[80px]">
                  {m.instrumentos?.instrumento}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function RepertoireManager({
  supabase,
  programId,
  giraId,
  initialData = [],
  isCompact = false,
  readOnly = undefined,
}) {
  const { isEditor: isGlobalEditor } = useAuth();
  
  const isEditor = readOnly !== undefined ? !readOnly : isGlobalEditor;

  const [repertorios, setRepertorios] = useState(initialData);
  const [musicians, setMusicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [editingBlock, setEditingBlock] = useState({ id: null, nombre: "" });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditWorkModalOpen, setIsEditWorkModalOpen] = useState(false);
  const [activeRepertorioId, setActiveRepertorioId] = useState(null);
  const [activeWorkItem, setActiveWorkItem] = useState(null);
  const [worksLibrary, setWorksLibrary] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [instrumentList, setInstrumentList] = useState([]);
  const [commentsState, setCommentsState] = useState(null);
  const [filters, setFilters] = useState({
    compositor: "",
    titulo: "",
    arreglador: "",
  });
  const [workFormData, setWorkFormData] = useState({});

  useEffect(() => {
    if (!initialData.length && programId) fetchFullRepertoire();
    else if (initialData.length)
      setRepertorios(
        initialData.map((r) => ({
          ...r,
          repertorio_obras:
            r.repertorio_obras?.sort((a, b) => a.orden - b.orden) || [],
        }))
      );
    if (musicians.length === 0) fetchMusicians();
  }, [programId]);

  useEffect(() => {
    if (isAddModalOpen || isEditWorkModalOpen) {
      if (worksLibrary.length === 0) fetchLibrary();
      if (instrumentList.length === 0) fetchInstruments();
    }
  }, [isAddModalOpen, isEditWorkModalOpen]);

  const fetchMusicians = async () => {
    const { data } = await supabase
      .from("integrantes")
      .select("id, nombre, apellido, instrumentos(instrumento)")
      .order("apellido");
    if (data) setMusicians(data);
  };
  const fetchInstruments = async () => {
    const { data } = await supabase
      .from("instrumentos")
      .select("id, instrumento")
      .order("id");
    if (data) setInstrumentList(data);
  };

  const fetchFullRepertoire = async () => {
    if (repertorios.length === 0) setLoading(true);

    const { data: reps, error } = await supabase
      .from("programas_repertorios")
      .select(
        `*, repertorio_obras (id, orden, notas_especificas, id_solista, google_drive_shortcut_id, excluir, obras (id, titulo, duracion_segundos, estado, link_drive, link_youtube, anio_composicion, instrumentacion, compositores (id, apellido, nombre), obras_compositores (rol, compositores(id, apellido, nombre)), obras_particellas (nombre_archivo, nota_organico, instrumentos (instrumento))), integrantes (id, apellido, nombre))`
      )
      .eq("id_programa", programId)
      .order("orden", { ascending: true });

    if (!error)
      setRepertorios(
        reps.map((r) => ({
          ...r,
          repertorio_obras:
            r.repertorio_obras?.sort((a, b) => a.orden - b.orden) || [],
        }))
      );
    setLoading(false);
  };
  const fetchLibrary = async () => {
    setLoadingLibrary(true);
    const { data, error } = await supabase
      .from("obras")
      .select(
        `*, obras_compositores (rol, compositores (apellido, nombre)), obras_palabras_clave (palabras_clave (tag)), obras_particellas (nombre_archivo, nota_organico, instrumentos (instrumento))`
      )
      .order("titulo");
    if (!error && data)
      setWorksLibrary(
        data.map((w) => ({
          ...w,
          compositor_full: getComposers(w),
          arreglador_full: getArranger(w),
        }))
      );
    setLoadingLibrary(false);
  };

  const autoSyncDrive = async () => {
    setSyncingDrive(true);
    try {
      await supabase.functions.invoke("manage-drive", {
        body: { action: "sync_program", programId: programId },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleWorkSaved = async (savedWorkId, isNew = false) => {
    if (isNew && activeRepertorioId) {
      await addWorkToBlock(savedWorkId, activeRepertorioId);
      if (isAddModalOpen) setIsAddModalOpen(false);
    }
    fetchFullRepertoire();
    if (!isNew) {
      autoSyncDrive();
    }
  };

  const openEditModal = (item) => {
    setActiveWorkItem(item);
    setWorkFormData({ ...item.obras, id: item.obras.id });
    setIsEditWorkModalOpen(true);
  };

  const openCreateModal = () => {
    setWorkFormData({
      id: null,
      titulo: "",
      duracion_segundos: 0,
      link_drive: "",
      link_youtube: "",
      estado: "Solicitud",
    });
    setIsEditWorkModalOpen(true);
  };

  const startEditBlock = (rep) => {
    setEditingBlock({ id: rep.id, nombre: rep.nombre });
  };
  const saveBlockName = async () => {
    if (!editingBlock.nombre.trim()) return;
    setRepertorios(
      repertorios.map((r) =>
        r.id === editingBlock.id ? { ...r, nombre: editingBlock.nombre } : r
      )
    );
    await supabase
      .from("programas_repertorios")
      .update({ nombre: editingBlock.nombre })
      .eq("id", editingBlock.id);
    setEditingBlock({ id: null, nombre: "" });
  };

  const moveWork = async (repertorioId, workId, direction) => {
    if (!isEditor) return;
    const repIndex = repertorios.findIndex((r) => r.id === repertorioId);
    const obras = [...repertorios[repIndex].repertorio_obras];
    const workIndex = obras.findIndex((o) => o.id === workId);
    if (
      (direction === -1 && workIndex === 0) ||
      (direction === 1 && workIndex === obras.length - 1)
    )
      return;
    const itemA = obras[workIndex];
    const itemB = obras[workIndex + direction];
    [itemA.orden, itemB.orden] = [itemB.orden, itemA.orden];
    [obras[workIndex], obras[workIndex + direction]] = [itemB, itemA];
    const newRepertorios = [...repertorios];
    newRepertorios[repIndex].repertorio_obras = obras;
    setRepertorios(newRepertorios);
    await supabase
      .from("repertorio_obras")
      .update({ orden: itemA.orden })
      .eq("id", itemA.id);
    await supabase
      .from("repertorio_obras")
      .update({ orden: itemB.orden })
      .eq("id", itemB.id);
    autoSyncDrive();
  };

  const addWorkToBlock = async (workId, targetRepertorioId = null) => {
    const repId = targetRepertorioId || activeRepertorioId;
    if (!repId) return;

    const currentRep = repertorios.find((r) => r.id === repId);
    const maxOrder =
      currentRep?.repertorio_obras?.reduce(
        (max, o) => (o.orden > max ? o.orden : max),
        0
      ) || 0;

    await supabase
      .from("repertorio_obras")
      .insert([{ id_repertorio: repId, id_obra: workId, orden: maxOrder + 1 }]);

    if (isAddModalOpen && !targetRepertorioId) {
      setIsAddModalOpen(false);
      fetchFullRepertoire();
    }
    autoSyncDrive();
  };

  const removeWork = async (itemId) => {
    if (!confirm("¿Quitar obra?")) return;
    await supabase.from("repertorio_obras").delete().eq("id", itemId);
    fetchFullRepertoire();
    autoSyncDrive();
  };

  const addRepertoireBlock = async () => {
    const nombre = prompt("Nombre del bloque:", "Nuevo Bloque");
    if (!nombre) return;
    await supabase
      .from("programas_repertorios")
      .insert([
        { id_programa: programId, nombre, orden: repertorios.length + 1 },
      ]);
    fetchFullRepertoire();
  };

  const deleteRepertoireBlock = async (id) => {
    if (!confirm("¿Eliminar bloque?")) return;
    await supabase.from("programas_repertorios").delete().eq("id", id);
    fetchFullRepertoire();
    autoSyncDrive();
  };

  const updateWorkDetail = async (itemId, field, value) => {
    setRepertorios(
      repertorios.map((r) => ({
        ...r,
        repertorio_obras: r.repertorio_obras.map((o) =>
          o.id === itemId ? { ...o, [field]: value } : o
        ),
      }))
    );
    await supabase
      .from("repertorio_obras")
      .update({ [field]: value })
      .eq("id", itemId);
    if (field === "id_solista" && value && giraId) {
      try {
        await supabase.from("giras_integrantes").upsert(
          {
            id_gira: giraId,
            id_integrante: value,
            rol: "solista",
            estado: "confirmado",
          },
          { onConflict: "id_gira, id_integrante" }
        );
      } catch (e) {
        console.error(e);
      }
    }
  };

  const getComposers = (obra) =>
    obra.obras_compositores?.length > 0
      ? obra.obras_compositores
          .filter((oc) => !oc.rol || oc.rol === "compositor")
          .map(
            (oc) => `${oc.compositores?.apellido}, ${oc.compositores?.nombre}`
          )
          .join(" / ")
      : obra.compositores
      ? `${obra.compositores.apellido}, ${obra.compositores.nombre}`
      : "Anónimo";
  const getArranger = (obra) => {
    const arr = obra.obras_compositores?.find((oc) => oc.rol === "arreglador");
    return arr
      ? `${arr.compositores.apellido}, ${arr.compositores.nombre}`
      : "-";
  };

  const filteredLibrary = worksLibrary.filter(
    (w) =>
      (!filters.titulo ||
        w.titulo.toLowerCase().includes(filters.titulo.toLowerCase())) &&
      (!filters.compositor ||
        w.compositor_full
          ?.toLowerCase()
          .includes(filters.compositor.toLowerCase())) &&
      (!filters.arreglador ||
        w.arreglador_full
          ?.toLowerCase()
          .includes(filters.arreglador.toLowerCase()))
  );

  return (
    <div className={containerClasses(isCompact)}>
      {repertorios.map((rep) => (
        <div
          key={rep.id}
          className={`border border-slate-200 ${
            isCompact ? "mb-4 rounded shadow-sm" : "shadow-sm bg-white mb-6"
          }`}
        >
          {/* HEADER BLOQUE */}
          <div className="bg-indigo-50/50 p-2 border-b border-slate-200 flex justify-between items-center h-10">
            <div className="flex items-center gap-2">
              <IconMusic size={14} className="text-indigo-600" />
              {editingBlock.id === rep.id ? (
                <input
                  autoFocus
                  type="text"
                  className="w-full text-xs p-1 border border-indigo-300 rounded outline-none"
                  value={editingBlock.nombre}
                  onChange={(e) =>
                    setEditingBlock({ ...editingBlock, nombre: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveBlockName();
                  }}
                  onBlur={saveBlockName}
                />
              ) : (
                <span
                  className="font-bold text-slate-800 text-xs uppercase flex items-center gap-2 group cursor-pointer"
                  onClick={() => isEditor && startEditBlock(rep)}
                >
                  {rep.nombre}{" "}
                  {isEditor && (
                    <IconEdit
                      size={12}
                      className="opacity-0 group-hover:opacity-100 text-slate-400"
                    />
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-1.5 rounded border">
                Total: {calculateTotalDuration(rep.repertorio_obras)}
              </span>
              {isEditor && (
                <button
                  onClick={() => deleteRepertoireBlock(rep.id)}
                  className="text-slate-400 hover:text-red-600 p-1"
                >
                  <IconTrash size={12} />
                </button>
              )}
            </div>
          </div>

          {/* TABLA OBRAS */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse table-fixed min-w-[1000px]">
              <thead className={tableHeaderClasses(isCompact)}>
                <tr>
                  <th className="p-1 w-8 text-center">#</th>
                  <th className="p-1 w-8 text-center">GD</th>
                  <th className="p-1 w-32">Compositor</th>
                  <th className="p-1 w-110">Obra</th>
                  <th className="p-1 w-58 text-center">Instr.</th>
                  <th className="p-1 w-12 text-center">Dur.</th>
                  <th className="p-1 w-32">Solista</th>
                  <th className="p-1 w-24">Arr.</th>
                  <th className="p-1 w-30">Notas</th>
                  <th className="p-1 w-8 text-center">YT</th>
                  <th className="p-1 w-16 text-right"></th>
                  <th className="p-1 w-8 text-center">Excl.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rep.repertorio_obras.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-yellow-50 group">
                    <td className="p-1 text-center font-bold text-slate-500">
                      <div className="flex flex-col items-center">
                        {isEditor && !isCompact && (
                          <button
                            onClick={() => moveWork(rep.id, item.id, -1)}
                            disabled={idx === 0}
                            className="text-slate-300 hover:text-indigo-600 disabled:opacity-0 p-0.5"
                          >
                            <IconChevronDown size={8} className="rotate-180" />
                          </button>
                        )}
                        <span>{idx + 1}</span>
                        {isEditor && !isCompact && (
                          <button
                            onClick={() => moveWork(rep.id, item.id, 1)}
                            disabled={idx === rep.repertorio_obras.length - 1}
                            className="text-slate-300 hover:text-indigo-600 disabled:opacity-0 p-0.5"
                          >
                            <IconChevronDown size={8} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-1 text-center">
                      {item.google_drive_shortcut_id ? (
                        <IconDrive className="w-3.5 h-3.5 mx-auto text-slate-600" />
                      ) : item.obras.link_drive ? (
                        <a
                          href={item.obras.link_drive}
                          target="_blank"
                          className="block w-2 h-2 bg-amber-400 rounded-full mx-auto"
                        ></a>
                      ) : (
                        <span className="text-slate-200">-</span>
                      )}
                    </td>
                    <td
                      className="p-1 truncate text-slate-600"
                      title={getComposers(item.obras)}
                    >
                      {getComposers(item.obras)}
                    </td>
                    
                    {/* CELDA OBRA: FORMATO RICO */}
                    <td
                      className="p-1 text-slate-800"
                      title={item.obras.titulo?.replace(/<[^>]*>?/gm, '')}
                    >
                      <RichTextPreview content={item.obras.titulo} />
                      {item.obras.estado !== "Oficial" && (
                        <span className="ml-1 text-[8px] bg-amber-100 text-amber-700 px-1 rounded border border-amber-200 align-text-top">
                          PEND
                        </span>
                      )}
                    </td>

                    <td className="p-1 text-center whitespace-pre-line text-[10px] text-slate-500 font-mono">
                      {item.obras.instrumentacion ||
                        calculateInstrumentation(
                          item.obras.obras_particellas
                        ) ||
                        "-"}
                    </td>
                    <td className="p-1 text-center font-mono">
                      {formatSecondsToTime(item.obras.duracion_segundos)}
                    </td>
                    <td className="p-0 border-l border-slate-100 align-middle">
                      {isEditor ? (
                        <div className="px-1">
                          <SoloistSelect
                            currentId={item.id_solista}
                            musicians={musicians}
                            onChange={(newId) =>
                              updateWorkDetail(item.id, "id_solista", newId)
                            }
                          />
                        </div>
                      ) : (
                        <span className="block p-1 truncate text-[10px]">
                          {item.integrantes
                            ? `${item.integrantes.apellido}, ${item.integrantes.nombre}`
                            : "-"}
                        </span>
                      )}
                    </td>
                    <td className="p-1 truncate text-slate-500">
                      {getArranger(item.obras)}
                    </td>
                    
                    {/* CELDA NOTAS: FORMATO RICO EN LECTURA */}
                    <td className="p-0 border-l border-slate-100 align-middle">
                      {isEditor ? (
                        <input
                          type="text"
                          className="w-full bg-transparent p-1 text-[10px] outline-none"
                          placeholder="..."
                          value={item.notas_especificas || ""}
                          onChange={(e) =>
                            updateWorkDetail(
                              item.id,
                              "notas_especificas",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        <div className="block p-1 text-[10px]">
                          <RichTextPreview content={item.notas_especificas} />
                        </div>
                      )}
                    </td>

                    <td className="p-1 text-center">
                      {item.obras.link_youtube ? (
                        <a
                          href={item.obras.link_youtube}
                          target="_blank"
                          className="text-red-600"
                        >
                          <IconYoutube size={14} />
                        </a>
                      ) : (
                        <span className="text-slate-200">-</span>
                      )}
                    </td>

                    <td className="p-1 text-right">
                      <div className="flex justify-end gap-1">
                        <CommentButton
                          supabase={supabase}
                          entityType="OBRA"
                          entityId={item.id}
                          onClick={() =>
                            setCommentsState({
                              type: "OBRA",
                              id: item.id,
                              title: item.obras.titulo,
                            })
                          }
                          className="p-1"
                        />
                        {isEditor && (
                          <>
                            <button
                              onClick={() => openEditModal(item)}
                              className="text-slate-300 hover:text-indigo-600 p-1"
                            >
                              <IconEdit size={12} />
                            </button>
                            <button
                              onClick={() => removeWork(item.id)}
                              className="text-slate-300 hover:text-red-600 p-1"
                            >
                              <IconX size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    {/* NUEVA CELDA CHECKBOX EXCLUIR */}
                    <td className="p-1 text-center align-middle">
                      {isEditor ? (
                        <input
                          type="checkbox"
                          className="cursor-pointer accent-red-600"
                          checked={!!item.excluir}
                          onChange={(e) =>
                            updateWorkDetail(
                              item.id,
                              "excluir",
                              e.target.checked
                            )
                          }
                          title="Excluir de la programación"
                        />
                      ) : item.excluir ? (
                        <span className="text-red-600 font-bold text-[10px]">
                          NO
                        </span>
                      ) : (
                        <span className="text-slate-200">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isEditor && (
            <div className="bg-slate-50 border-t p-1">
              <button
                onClick={() => {
                  setActiveRepertorioId(rep.id);
                  setIsAddModalOpen(true);
                }}
                className="w-full py-1 text-slate-400 hover:text-indigo-600 text-[10px] font-bold uppercase flex justify-center gap-1 hover:bg-slate-100"
              >
                <IconPlus size={10} /> Agregar Obra
              </button>
            </div>
          )}
        </div>
      ))}
      {!isCompact && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {syncingDrive && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                <IconLoader className="animate-spin inline mr-1" />
                Syncing...
              </span>
            )}
          </div>
          {isEditor && (
            <button
              onClick={addRepertoireBlock}
              className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-2"
            >
              <IconPlus size={16} /> Bloque
            </button>
          )}
        </div>
      )}

      {/* MODAL BUSCAR  */}
      {isAddModalOpen && isEditor && (
        <ModalPortal>
          <div className="bg-white w-full max-w-5xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-3 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 flex gap-2">
                <IconSearch size={18} /> Buscar Obra
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="p-2 border-b grid grid-cols-1 md:grid-cols-5 gap-2 bg-white">
              <input
                type="text"
                placeholder="Compositor..."
                autoFocus
                className="w-full p-1.5 border rounded text-xs outline-none focus:border-indigo-500"
                value={filters.compositor}
                onChange={(e) =>
                  setFilters({ ...filters, compositor: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Arreglador..."
                className="w-full p-1.5 border rounded text-xs outline-none focus:border-indigo-500"
                value={filters.arreglador}
                onChange={(e) =>
                  setFilters({ ...filters, arreglador: e.target.value })
                }
              />
              <div className="relative col-span-2">
                <IconSearch
                  className="absolute left-2 top-2.5 text-slate-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Título..."
                  className="w-full pl-7 p-1.5 border rounded text-xs outline-none focus:border-indigo-500"
                  value={filters.titulo}
                  onChange={(e) =>
                    setFilters({ ...filters, titulo: e.target.value })
                  }
                />
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  openCreateModal();
                }}
                className="bg-indigo-600 text-white px-3 rounded text-xs font-bold hover:bg-indigo-700 flex justify-center items-center gap-1"
              >
                <IconPlus size={12} /> Crear Solicitud
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* ... TABLA DE BÚSQUEDA IGUAL ... */}
              {loadingLibrary ? (
                <div className="p-8 text-center text-indigo-600">
                  <IconLoader className="animate-spin inline" />
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0 font-bold shadow-sm">
                    <tr>
                      <th className="p-2 w-1/4">Compositor</th>
                      <th className="p-2 w-1/4">Arreglador</th>
                      <th className="p-2 w-1/3">Obra</th>
                      <th className="p-2 text-center w-16">Duración</th>
                      <th className="p-2 text-center w-24">Instr.</th>
                      <th className="p-2 text-center w-12">Año</th>
                      <th className="p-2 text-center w-10">Drive</th>
                      <th className="p-2 text-right w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredLibrary.map((w) => (
                      <tr key={w.id} className="hover:bg-indigo-50 group">
                        <td className="p-2 text-slate-600 font-medium truncate">
                          {w.compositor_full}
                        </td>
                        <td className="p-2 text-slate-500 truncate">
                          {w.arreglador_full !== "-" ? w.arreglador_full : ""}
                        </td>
                        <td className="p-2 text-slate-800 font-bold truncate">
                          <RichTextPreview content={w.titulo} />
                        </td>
                        <td className="p-2 text-center font-mono text-[10px] text-slate-400">
                          {formatSecondsToTime(w.duracion_segundos)}
                        </td>
                        <td className="p-2 text-center font-mono text-[10px] text-slate-500 bg-slate-50/50 rounded">
                          {w.instrumentacion ||
                            calculateInstrumentation(w.obras_particellas) ||
                            "-"}
                        </td>
                        <td className="p-2 text-center text-slate-500">
                          {w.anio_composicion || "-"}
                        </td>
                        <td className="p-2 text-center">
                          {w.link_drive ? (
                            <a
                              href={w.link_drive}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-800 inline-block p-1 bg-blue-50 rounded-full"
                            >
                              <IconDrive size={14} />
                            </a>
                          ) : (
                            <span className="text-slate-200">-</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => addWorkToBlock(w.id)}
                            className="bg-white border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded font-bold hover:bg-indigo-600 hover:text-white shadow-sm transition-colors text-[10px]"
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL EDITAR (WORKFORM) */}
      {isEditWorkModalOpen && isEditor && (
        <ModalPortal>
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <WorkForm
              supabase={supabase}
              formData={workFormData}
              onCancel={() => setIsEditWorkModalOpen(false)}
              onSave={handleWorkSaved}
              catalogoInstrumentos={instrumentList}
            />
          </div>
        </ModalPortal>
      )}

      {commentsState && (
        <div
          className="fixed inset-0 z-[80] flex justify-end bg-black/20 backdrop-blur-[1px]"
          onClick={() => setCommentsState(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="h-full">
            <CommentsManager
              supabase={supabase}
              entityType={commentsState.type}
              entityId={commentsState.id}
              title={commentsState.title}
              onClose={() => setCommentsState(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const containerClasses = (isCompact) => (isCompact ? "bg-white" : "space-y-8");
const tableHeaderClasses = (isCompact) =>
  isCompact
    ? "hidden"
    : "bg-blue-200 text-slate-700 border-b-2 border-slate-400 font-bold uppercase tracking-tight";