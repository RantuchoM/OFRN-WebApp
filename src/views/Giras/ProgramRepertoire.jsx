import React, { useState, useEffect, useMemo } from "react";
import {
  IconLoader,
  IconMusic,
  IconUsers,
  IconFileText,
  IconArrowLeft,
  IconFolderMusic,
  IconCopy,
  IconX,
  IconCheck,
  IconSearch,
  IconChevronRight,
  IconArrowRight,
  IconFilter,
  IconRefresh,
  IconViolin,
} from "../../components/ui/Icons";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import RepertoireManager from "../../components/repertoire/RepertoireManager";
import ProgramSeating from "../Giras/ProgramSeating";
import InstrumentationBadges from "../../components/instrumentation/InstrumentationBadges";
import MyPartsViewer from "./MyPartsViewer";
import {
  syncBowingToProgram,
  syncProgramRepertoire,
} from "../../services/giraService";
import { useGiraRoster } from "../../hooks/useGiraRoster";
import { toast } from "sonner";

// --- MODAL AVANZADO DE IMPORTACIÓN ---
const AdvancedImportModal = ({
  supabase,
  currentGiraId,
  onClose,
  onImport,
}) => {
  const [step, setStep] = useState(1); // 1: Seleccionar Gira, 2: Seleccionar Bloque
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Estado Paso 2
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [importing, setImporting] = useState(false);

  // Cargar lista de programas inicial
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const { data, error } = await supabase
          .from("programas")
          .select("id, nombre_gira, mes_letra, nomenclador")
          .neq("id", currentGiraId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setPrograms(data || []);
      } catch (err) {
        console.error("Error cargando programas:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
  }, [supabase, currentGiraId]);

  // Cargar bloques cuando se elige un programa
  const handleSelectProgram = async (prog) => {
    setSelectedProgram(prog);
    setStep(2);
    setLoadingBlocks(true);
    setBlocks([]);
    setSelectedBlockId(null);

    try {
      const { data, error } = await supabase
        .from("programas_repertorios")
        .select(
          `
          id, nombre, orden,
          repertorio_obras (
            id, orden, notas_especificas,
            obras ( id, titulo, compositores ( apellido ) )
          )
        `,
        )
        .eq("id_programa", prog.id)
        .order("orden");

      if (error) throw error;

      // Filtramos bloques vacíos para no ensuciar la UI
      const validBlocks = (data || []).filter(
        (b) => b.repertorio_obras.length > 0,
      );
      setBlocks(validBlocks);

      // Auto-seleccionar el primero si existe
      if (validBlocks.length > 0) {
        setSelectedBlockId(validBlocks[0].id);
      }
    } catch (err) {
      console.error("Error cargando bloques:", err);
    } finally {
      setLoadingBlocks(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedBlockId) return;
    setImporting(true);
    // Buscamos el objeto bloque completo para pasarlo al padre
    const blockToImport = blocks.find((b) => b.id === selectedBlockId);
    await onImport(blockToImport);
    setImporting(false);
    onClose();
  };

  // Filtrado en cliente para el buscador de giras
  const filteredPrograms = programs.filter(
    (p) =>
      p.nombre_gira.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nomenclador?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedBlockObj = blocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200 h-[80vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <IconCopy className="text-indigo-600" size={20} />
              Importar Repertorio
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {step === 1
                ? "Paso 1: Selecciona la gira de origen"
                : `Paso 2: Selecciona el bloque de "${selectedProgram?.nombre_gira}"`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full"
          >
            <IconX size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden bg-slate-50">
          {/* PASO 1: SELECCIONAR GIRA */}
          {step === 1 && (
            <div className="h-full flex flex-col p-6 max-w-2xl mx-auto">
              <div className="relative mb-4">
                <IconSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Buscar por nombre, mes o nomenclador..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-slate-200 shadow-sm">
                {loading ? (
                  <div className="p-8 text-center text-slate-400">
                    <IconLoader className="animate-spin inline mr-2" />{" "}
                    Cargando giras...
                  </div>
                ) : filteredPrograms.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic">
                    No se encontraron giras.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredPrograms.map((prog) => (
                      <button
                        key={prog.id}
                        onClick={() => handleSelectProgram(prog)}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-slate-700 text-sm group-hover:text-indigo-700">
                            {prog.nombre_gira}
                          </div>
                          <div className="text-xs text-slate-500 flex gap-2">
                            <span className="bg-slate-100 px-1.5 rounded text-slate-600 font-mono">
                              {prog.nomenclador}
                            </span>
                            <span>{prog.mes_letra}</span>
                          </div>
                        </div>
                        <IconChevronRight
                          size={18}
                          className="text-slate-300 group-hover:text-indigo-400"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 2: SELECCIONAR BLOQUE Y PREVISUALIZAR */}
          {step === 2 && (
            <div className="h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* SIDEBAR: LISTA DE BLOQUES */}
              <div className="w-full md:w-1/3 bg-white flex flex-col overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Bloques Disponibles
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {loadingBlocks ? (
                    <div className="p-4 text-center">
                      <IconLoader className="animate-spin inline text-indigo-500" />
                    </div>
                  ) : blocks.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs italic">
                      Esta gira no tiene obras cargadas.
                    </div>
                  ) : (
                    blocks.map((block) => {
                      const isSelected = selectedBlockId === block.id;
                      const count = block.repertorio_obras?.length || 0;
                      return (
                        <button
                          key={block.id}
                          onClick={() => setSelectedBlockId(block.id)}
                          className={`w-full text-left px-3 py-3 rounded-lg border transition-all flex items-center justify-between ${
                            isSelected
                              ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300 shadow-sm"
                              : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                          }`}
                        >
                          <div>
                            <div
                              className={`text-sm font-bold ${
                                isSelected
                                  ? "text-indigo-700"
                                  : "text-slate-700"
                              }`}
                            >
                              {block.nombre}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {count} {count === 1 ? "obra" : "obras"}
                            </div>
                          </div>
                          {isSelected && (
                            <IconArrowRight
                              size={16}
                              className="text-indigo-500"
                            />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="m-3 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded border border-slate-200 flex items-center justify-center gap-2"
                >
                  <IconArrowLeft size={14} /> Elegir otra gira
                </button>
              </div>

              {/* MAIN: PREVISUALIZACIÓN */}
              <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <IconFilter size={14} /> Previsualización
                  </span>
                  {selectedBlockObj && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                      {selectedBlockObj.nombre}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {!selectedBlockId ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                      <IconMusic size={48} strokeWidth={1} />
                      <p className="mt-2 text-sm">
                        Selecciona un bloque para ver sus obras
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedBlockObj?.repertorio_obras?.map((item, idx) => (
                        <div
                          key={item.id}
                          className="bg-white p-3 rounded border border-slate-200 flex gap-3 items-center"
                        >
                          <div className="font-mono text-slate-300 text-xs w-6 text-center">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-700 text-sm">
                              {item.obras?.titulo}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.obras?.compositores?.apellido}
                            </div>
                            {item.notas_especificas && (
                              <div className="mt-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded inline-block">
                                {item.notas_especificas}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* FOOTER ACCIONES */}
                <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={!selectedBlockId || importing}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    {importing ? (
                      <IconLoader className="animate-spin" size={16} />
                    ) : (
                      <IconCheck size={16} />
                    )}
                    Importar Bloque
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function ProgramRepertoire({ supabase, program, onBack, onRefreshGira = null }) {
  const { user, isEditor, isManagement } = useAuth();
  const { roster, loading: rosterLoading } = useGiraRoster(supabase, program);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("subTab") || "repertoire";

  // Estado local para los datos completos del repertorio
  const [repertorios, setRepertorios] = useState([]);
  const [loadingRepo, setLoadingRepo] = useState(true);
  const [repertoireKey, setRepertoireKey] = useState(0);
  const [canEdit, setCanEdit] = useState(false);

  // Estado para modal importar y acciones de Drive
  const [showImport, setShowImport] = useState(false);
  const [syncingRepertoire, setSyncingRepertoire] = useState(false);
  const [generatingBowScores, setGeneratingBowScores] = useState(false);
  const [repairingArcos, setRepairingArcos] = useState(false);

  // 1. Efecto de Permisos
  useEffect(() => {
    const checkPermissions = async () => {
      if (isEditor) {
        setCanEdit(true);
        return;
      }
      if (program?.tipo === "Ensamble") {
        const fuentes = program.giras_fuentes || [];
        const { data: coordData, error } = await supabase
          .from("ensambles_coordinadores")
          .select("id_ensamble")
          .eq("id_integrante", user.id);

        if (!error && coordData) {
          const myCoordinatedEnsembles = new Set(
            coordData.map((c) => c.id_ensamble),
          );
          const isCoordinator = fuentes.some(
            (f) =>
              f.tipo === "ENSAMBLE" && myCoordinatedEnsembles.has(f.valor_id),
          );
          if (isCoordinator) setCanEdit(true);
        }
      }
    };
    if (program && user) checkPermissions();
  }, [user, isEditor, program, supabase]);

  // 2. Efecto de Carga de Datos
  const fetchFullRepertoire = async () => {
    if (!program?.id) return;
    setLoadingRepo(true);
    try {
      const { data, error } = await supabase
        .from("programas_repertorios")
        .select(
          `
          *,
          repertorio_obras (
            id, id_obra, orden, notas_especificas, seating_provisorio, usar_seating_provisorio, id_arco_seleccionado,
            obras (
              id, titulo, duracion_segundos, instrumentacion, link_drive,
              obras_arcos (id, nombre, link, descripcion, id_drive_folder),
              compositores ( id, nombre, apellido ),
              obras_compositores (
                rol,
                compositores ( id, nombre, apellido )
              ),
              obras_particellas (
                id,
                nombre_archivo,
                nota_organico,
                es_solista,
                instrumentos ( instrumento, abreviatura )
              )
            )
          )
        `,
        )
        .eq("id_programa", program.id)
        .order("orden");

      if (error) throw error;

      if (!data || data.length === 0) {
        // Crear bloque por defecto si no existe
        const { data: newBlock, error: createError } = await supabase
          .from("programas_repertorios")
          .insert([
            { id_programa: program.id, nombre: "Repertorio", orden: 0 },
          ])
          .select(`*, repertorio_obras(*)`)
          .single();
        if (!createError) setRepertorios([newBlock]);
      } else {
        const sortedData = data.map((bloque) => ({
          ...bloque,
          repertorio_obras: (bloque.repertorio_obras || []).sort(
            (a, b) => a.orden - b.orden,
          ),
        }));
        setRepertorios(sortedData);
      }
    } catch (err) {
      console.error("Error fetching full repertoire:", err);
    } finally {
      setLoadingRepo(false);
    }
  };

  useEffect(() => {
    fetchFullRepertoire();
  }, [program?.id]);

  const handleRepertoireUpdate = (newBlocks) => {
    setRepertorios(newBlocks);
    setRepertoireKey((prev) => prev + 1);
  };

  const handleTabChange = (newTab) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("subTab", newTab);
      return newParams;
    });
  };

  const obrasWithInstrumentation = useMemo(() => {
    if (!repertorios || repertorios.length === 0) return [];
    const works = [];
    repertorios.forEach((block) => {
      (block.repertorio_obras || []).forEach((ro) => {
        const obra = ro.obras;
        if (!obra) return;
        const title = obra.titulo || "Obra";
        const cleanTitle =
          typeof title === "string"
            ? title.replace(/<[^>]*>?/gm, "")
            : "Obra";
        works.push({
          id: ro.id,
          obra_id: obra.id,
          title: cleanTitle,
          composer: "", // no necesitamos aquí el apellido
          shortTitle: cleanTitle.split(/\s+/).slice(0, 3).join(" "),
          obras_particellas: obra.obras_particellas || [],
          instrumentacion_effective:
            obra.instrumentacion ||
            calculateInstrumentation(obra.obras_particellas || []) ||
            "",
        });
      });
    });
    return works;
  }, [repertorios]);

  const canSeeInstrumentationBadges =
    ["admin", "editor", "coord_general"].includes(user?.rol_sistema);

  const handleBack = () => {
    if (activeTab !== "repertoire") {
      handleTabChange("repertoire");
    } else {
      onBack();
    }
  };

  const handleSyncRepertoireDrive = async () => {
    if (!program?.id) return;
    setSyncingRepertoire(true);
    try {
      await syncProgramRepertoire(supabase, program.id);
      toast.success(
        "Sincronización de Drive completada para este programa.",
      );
      await fetchFullRepertoire();
    } catch (err) {
      console.error("Error al sincronizar repertorio en Drive:", err);
      toast.error(
        "Error al sincronizar Drive: " +
          (err?.message || "Error desconocido"),
      );
    } finally {
      setSyncingRepertoire(false);
    }
  };

  const handleSyncArco = async (obra, nombreSet, targetDriveId = null) => {
    try {
      const result = await syncBowingToProgram(supabase, {
        programId: program.id,
        obraId: obra.id,
        obraTitulo: obra.titulo,
        nombreSet,
        targetDriveId,
      });

      let arcoId = null;
      if (!targetDriveId && result.realFolderId) {
        const { data: newArco, error: dbError } = await supabase
          .from("obras_arcos")
          .insert({
            id_obra: obra.id,
            nombre: nombreSet,
            id_drive_folder: result.realFolderId,
            link: `https://drive.google.com/drive/folders/${result.realFolderId}`,
            descripcion: `Creado para gira ${program.nomenclador}`,
          })
          .select()
          .single();
        if (dbError) throw dbError;
        arcoId = newArco.id;
      }
      return { success: true, ...result, newArcoId: arcoId };
    } catch (error) {
      console.error("Error syncing arco:", error);
      throw error;
    }
  };

  // --- NUEVA LÓGICA DE IMPORTACIÓN ---
  const handleImportBlock = async (sourceBlock) => {
    try {
      if (!sourceBlock || !sourceBlock.repertorio_obras?.length) {
        return alert("El bloque seleccionado está vacío.");
      }

      // 1. Determinar bloque destino (usamos el primero disponible o el que tenga el nombre similar si existiera)
      let targetRepoId = repertorios[0]?.id;

      // Si no hay bloque destino, creamos uno con el nombre del bloque origen
      if (!targetRepoId) {
        const { data: newB } = await supabase
          .from("programas_repertorios")
          .insert([
            { id_programa: program.id, nombre: sourceBlock.nombre || "Repertorio" },
          ])
          .select()
          .single();
        targetRepoId = newB.id;
      }

      // 2. Calcular orden inicial para apendear
      const currentMaxOrder = repertorios[0]?.repertorio_obras?.length
        ? Math.max(
            ...repertorios[0].repertorio_obras.map((o) => o.orden),
          )
        : 0;

      // 3. Preparar payload
      const sourceWorks = sourceBlock.repertorio_obras.sort(
        (a, b) => a.orden - b.orden,
      );
      const newRows = sourceWorks.map((w, i) => ({
        id_repertorio: targetRepoId,
        id_obra: w.obras?.id || w.id_obra, // Asegurar ID correcto
        orden: currentMaxOrder + i + 1,
        notas_especificas: w.notas_especificas,
        seating_provisorio: w.seating_provisorio,
        usar_seating_provisorio: w.usar_seating_provisorio,
      }));

      // 4. Insertar
      const { error } = await supabase
        .from("repertorio_obras")
        .insert(newRows);
      if (error) throw error;

      await fetchFullRepertoire();
    } catch (err) {
      alert("Error al importar: " + err.message);
    }
  };

  const extractFileIdFromUrl = (url) => {
    if (!url) return null;
    const match = String(url).match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  const handleGenerateBowScores = async () => {
    if (!program?.id) return;

    // Reunir todas las obras del repertorio actual
    const allWorks = [];
    for (const bloque of repertorios || []) {
      for (const item of bloque.repertorio_obras || []) {
        const obra = item.obras || null;
        const obraId = obra?.id || item.id_obra;
        if (!obraId) continue;
        allWorks.push({
          obraId,
          obraTitulo: obra?.titulo || "",
        });
      }
    }

    const uniqueWorksMap = new Map();
    for (const w of allWorks) {
      if (!uniqueWorksMap.has(w.obraId)) {
        uniqueWorksMap.set(w.obraId, w);
      }
    }

    const uniqueWorks = Array.from(uniqueWorksMap.values());

    if (!uniqueWorks.length) {
      toast.error("No se encontraron obras en el repertorio actual.");
      return;
    }

    setGeneratingBowScores(true);

    const promise = (async () => {
      // Cargar particellas de SCORE de cuerdas (id_instrumento === "50") para todas las obras del programa
      const obraIds = uniqueWorks.map((w) => w.obraId);
      const { data: particellas, error } = await supabase
        .from("obras_particellas")
        .select("id, id_obra, id_instrumento, nombre_archivo, url_archivo")
        .in("id_obra", obraIds)
        .eq("id_instrumento", "50");

      if (error) {
        throw error;
      }

      const files = [];

      for (const part of particellas || []) {
        if (!part.url_archivo) continue;

        // url_archivo puede ser:
        // - Un string simple con una URL de Drive
        // - Un JSON de array [{ url, name }]
        let candidateUrl = null;
        const raw = String(part.url_archivo).trim();

        if (raw.startsWith("[")) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const firstWithUrl = parsed.find((x) => x && x.url) || parsed[0];
              candidateUrl = firstWithUrl?.url || null;
            }
          } catch {
            candidateUrl = raw;
          }
        } else {
          candidateUrl = raw;
        }

        const fileId = extractFileIdFromUrl(candidateUrl);
        if (!fileId) continue;

        // No forzamos nombre aquí: dejamos que la Edge Function
        // use el nombre original de Drive y solo aplique el prefijo "[ARCOS] ".
        files.push({
          fileId,
          // destinationFolderId se resolverá en la Edge Function a partir de giraId
          prefixLabel: "[ARCOS] ",
        });
      }

      if (!files.length) {
        throw new Error(
          "No se encontraron particellas SCORE de cuerdas (instrumento 50) con archivo para copiar.",
        );
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        "manage-drive",
        {
          body: {
            action: "COPY_FILES_BATCH",
            giraId: program.id,
            files,
          },
        },
      );

      if (fnError) throw fnError;
      return { response: data, totalPrepared: files.length };
    })();

    try {
      await toast.promise(promise, {
        loading: "Copiando scores para arcos...",
        success: ({ response, totalPrepared }) => {
          const copied =
            response?.copied != null ? response.copied : totalPrepared;
          return `Se copiaron ${copied} particellas de cuerdas con éxito.`;
        },
        error: (err) =>
          `Error al copiar scores para arcos: ${
            err?.message || "Error desconocido"
          }`,
      });
    } finally {
      setGeneratingBowScores(false);
    }
  };

  const handleRepairArcos = async () => {
    if (!program?.id) return;

    const tasks = [];

    for (const bloque of repertorios || []) {
      for (const item of bloque.repertorio_obras || []) {
        const obra = item.obras;
        const arcoId = item.id_arco_seleccionado;
        if (!obra || !arcoId) continue;

        const arco = (obra.obras_arcos || []).find((a) => a.id === arcoId);
        if (!arco?.id_drive_folder) continue;

        tasks.push({ obra, arco });
      }
    }

    if (!tasks.length) {
      toast.error("No hay sets de arcos seleccionados en este programa.");
      return;
    }

    setRepairingArcos(true);

    const repairPromise = (async () => {
      let repaired = 0;
      for (const task of tasks) {
        const { obra, arco } = task;
        try {
          await handleSyncArco(obra, arco.nombre, arco.id_drive_folder);
          repaired += 1;
        } catch (e) {
          console.error("[AcomodarArcos] Error en obra", obra.id, e);
        }
      }
      return { repaired, total: tasks.length };
    })();

    try {
      await toast.promise(repairPromise, {
        loading: "Acomodando accesos de arcos...",
        success: ({ repaired, total }) =>
          `Se acomodaron ${repaired} de ${total} sets de arcos.`,
        error: (err) =>
          `Error al acomodar arcos: ${err?.message || "Error desconocido"}`,
      });
    } finally {
      setRepairingArcos(false);
    }
  };

  if (!program)
    return (
      <div className="p-10 text-center">
        <IconLoader className="animate-spin" />
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={handleBack}
            className="text-slate-400 hover:text-indigo-600 text-sm font-bold flex items-center gap-1 shrink-0"
          >
            <IconArrowLeft size={16} />
            {activeTab !== "repertoire"
              ? "Volver al Repertorio"
              : "Volver a Programas"}
          </button>
          <div className="flex flex-col">
            <h2 className="text-m font-bold text-slate-800 flex items-center gap-2">
              <span>Repertorio</span>
              {canSeeInstrumentationBadges &&
                activeTab === "repertoire" &&
                obrasWithInstrumentation.length > 0 && (
                  <InstrumentationBadges
                    works={obrasWithInstrumentation}
                    roster={roster}
                    organicoRevisado={!!program?.organico_revisado}
                    organicoComentario={program?.organico_comentario ?? null}
                    programId={program?.id}
                    supabase={supabase}
                    onOrganicoSave={onRefreshGira}
                    className="hidden md:flex flex-wrap items-center gap-1 ml-2"
                  />
                )}
            </h2>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg items-center">
          <button
            onClick={() => handleTabChange("repertoire")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "repertoire"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconMusic size={16} /> Repertorio
          </button>
          <button
            onClick={() => handleTabChange("seating")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "seating"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconUsers size={16} /> Seating
          </button>
          <button
            onClick={() => handleTabChange("my_parts")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "my_parts"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconFileText size={16} /> Mis Partes
          </button>
          {program.google_drive_folder_id && (
            <>
              <div className="w-px h-4 bg-slate-300 mx-1"></div>
              <a
                href={`https://drive.google.com/drive/folders/${program.google_drive_folder_id}`}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1.5 rounded-md text-slate-500 hover:text-green-700 hover:bg-white transition-all"
              >
                <IconFolderMusic size={18} />
              </a>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === "repertoire" && (
          <div className="h-full overflow-y-auto p-4">
            {loadingRepo ? (
              <div className="flex justify-center p-10">
                <IconLoader className="animate-spin text-indigo-500" />
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  {(isEditor || isManagement) && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateBowScores}
                        disabled={generatingBowScores}
                        className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded border border-slate-200 flex items-center gap-1 bg-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingBowScores ? (
                          <IconLoader
                            size={14}
                            className="animate-spin text-slate-500"
                          />
                        ) : (
                          <IconViolin size={14} />
                        )}
                        Scores para Arcos
                      </button>

                      <button
                        type="button"
                        onClick={handleRepairArcos}
                        disabled={repairingArcos}
                        className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded border border-slate-200 flex items-center gap-1 bg-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {repairingArcos ? (
                          <IconLoader
                            size={14}
                            className="animate-spin text-slate-500"
                          />
                        ) : (
                          <IconViolin size={14} />
                        )}
                        Acomodar Arcos
                      </button>

                      {isEditor && (
                        <>
                          <button
                            onClick={() => setShowImport(true)}
                            className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded border border-indigo-200 flex items-center gap-1 bg-white shadow-sm transition-all"
                          >
                            <IconCopy size={14} /> Importar Repertorio
                          </button>
                          <button
                            type="button"
                            onClick={handleSyncRepertoireDrive}
                            disabled={syncingRepertoire}
                            className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded border border-slate-200 flex items-center gap-1 bg-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {syncingRepertoire ? (
                              <IconLoader
                                size={14}
                                className="animate-spin text-slate-500"
                              />
                            ) : (
                              <IconRefresh size={14} />
                            )}
                            Sincronizar Drive
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <RepertoireManager
                  supabase={supabase}
                  programId={program.id}
                  initialData={repertorios}
                  onUpdate={handleRepertoireUpdate}
                  readOnly={!canEdit}
                  onSyncArco={handleSyncArco}
                />
              </>
            )}
          </div>
        )}

        {activeTab === "seating" && (
          <div className="h-full overflow-y-auto">
            <ProgramSeating
              key={repertoireKey}
              supabase={supabase}
              program={program}
              repertoireBlocks={repertorios}
              onBack={() => handleTabChange("repertoire")}
            />
          </div>
        )}

        {activeTab === "my_parts" && (
          <div className="h-full overflow-hidden">
            <MyPartsViewer
              supabase={supabase}
              gira={program}
              onOpenSeating={() => handleTabChange("seating")}
            />
          </div>
        )}
      </div>

      {showImport && (
        <AdvancedImportModal
          supabase={supabase}
          currentGiraId={program.id}
          onClose={() => setShowImport(false)}
          onImport={handleImportBlock}
        />
      )}
    </div>
  );
}
