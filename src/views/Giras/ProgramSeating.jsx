import React, { useState, useEffect, useMemo, Suspense } from "react";
import {
  IconUsers,
  IconLoader,
  IconSettings,
  IconLayers,
  IconExternalLink,
  IconAlertCircle,
  IconHistory,
  IconChevronDown,
  IconEdit,
  IconTrash,
  IconDownload,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { useGiraRoster } from "../../hooks/useGiraRoster";
import {
  ParticellaSelect,
  CreateParticellaModal,
} from "../../components/seating/SeatingControls";

// Librerías para reporte PDF
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const EXCLUDED_ROLES = [
  "staff",
  "produccion",
  "producción",
  "chofer",
  "archivo",
  "utilero",
  "asistente",
  "iluminador",
  "sonido",
  "acompañante"
];

// --- COMPONENTE MÓVIL OPTIMIZADO ---
const MobileSeatingTable = ({
  user,
  obras,
  assignments,
  filteredRoster,
  containers,
  particellas,
}) => {
  // Estado para acordeón
  const [expandedIds, setExpandedIds] = useState(() => {
    const myContainer = containers.find((c) =>
      c.items.some((i) => i.id_musico === user.id),
    );
    return myContainer ? [myContainer.id] : [];
  });

  const toggleContainer = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // --- HELPERS DE TEXTO ---
  const getShortComposer = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    return parts[parts.length - 1].toUpperCase();
  };

  const getFirstWord = (title) => {
    if (!title) return "";
    const clean = title.replace(/<[^>]*>?/gm, "");
    return clean.split(" ")[0];
  };

  const getPartName = (partId) => {
    if (!partId) return "-";
    const part = particellas.find((p) => p.id === partId);
    if (!part) return "?";

    // Abreviaciones para ahorrar espacio horizontal
    return part.nombre_archivo
      .replace(/Violin/i, "Vln")
      .replace(/Violoncello/i, "Vlc")
      .replace(/Contrabajo/i, "Cb")
      .replace(/Flauta/i, "Fl")
      .replace(/Oboe/i, "Ob")
      .replace(/Clarinete/i, "Cl")
      .replace(/Fagot/i, "Fg")
      .replace(/Corno/i, "Hn")
      .replace(/Trompeta/i, "Tpt")
      .replace(/Trombon/i, "Tbn")
      .replace(/Tuba/i, "Tb")
      .substring(0, 10);
  };

  const showFullTitle = (obra) => {
    alert(`${obra.composer}\n\n${obra.title.replace(/<[^>]*>?/gm, "")}`);
  };

  const windsAndPerc = filteredRoster.filter(
    (m) => !["01", "02", "03", "04"].includes(m.id_instr),
  );

  return (
    <div className="relative w-full border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col h-full">
      <div className="overflow-auto max-h-full">
        <table className="w-full text-left border-collapse">
          {/* --- HEADER --- */}
          <thead className="bg-slate-800 text-white sticky top-0 z-30 shadow-md">
            <tr>
              <th className="p-1 pl-2 w-[32vw] min-w-[110px] max-w-[140px] sticky left-0 z-40 bg-slate-800 border-r border-slate-600 text-[10px] font-bold uppercase tracking-tight align-bottom">
                Grupo / Músico
              </th>
              {obras.map((obra) => (
                <th
                  key={obra.id}
                  onClick={() => showFullTitle(obra)}
                  className="p-1 min-w-[70px] max-w-[80px] border-l border-slate-600 text-center cursor-pointer active:bg-slate-700 align-bottom pb-2"
                >
                  <div className="flex flex-col leading-none">
                    <span className="text-[8px] text-slate-400 font-normal truncate">
                      {getShortComposer(obra.composer)}
                    </span>
                    <span className="text-[10px] font-bold text-white truncate mt-0.5">
                      {getFirstWord(obra.title)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {/* --- CUERDAS (ACORDEÓN) --- */}
            {containers.map((c) => {
              const isExpanded = expandedIds.includes(c.id);
              const isMyContainer = c.items.some(
                (i) => i.id_musico === user.id,
              );

              return (
                <React.Fragment key={c.id}>
                  {/* FILA PADRE: NOMBRE GRUPO + ASIGNACIÓN GRUPAL */}
                  <tr
                    onClick={() => toggleContainer(c.id)}
                    className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors border-b border-slate-300"
                  >
                    <td
                      className={`p-1.5 pl-2 sticky left-0 z-20 border-r border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isMyContainer ? "bg-amber-100 border-l-4 border-l-amber-500" : "bg-slate-100"}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[10px] text-slate-800 uppercase truncate">
                          {c.nombre}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-slate-500">
                            ({c.items.length})
                          </span>
                          <IconChevronDown
                            size={14}
                            className={`text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Loop Obras (Asignación Contenedor) */}
                    {obras.map((obra) => {
                      const containerPartId =
                        assignments[`C-${c.id}-${obra.obra_id}`];
                      return (
                        <td
                          key={obra.id}
                          className="p-1 border-l border-slate-200 text-center align-middle"
                        >
                          <span className="text-[10px] font-bold text-slate-700 block truncate max-w-[75px]">
                            {getPartName(containerPartId)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* FILAS HIJAS: MÚSICOS (Solo si expandido) */}
                  {isExpanded &&
                    c.items.map((item, idx) => {
                      const isMe = String(item.id_musico) === String(user.id);
                      const deskNum = Math.floor(idx / 2) + 1;

                      return (
                        <tr
                          key={item.id}
                          className={isMe ? "bg-amber-50" : "bg-white"}
                        >
                          <td
                            className={`p-1 pl-4 sticky left-0 z-20 border-r border-slate-200 border-b border-slate-50 align-middle ${isMe ? "bg-amber-50" : "bg-white"}`}
                          >
                            <div className="flex flex-col leading-none border-l-2 border-slate-200 pl-2">
                              <span
                                className={`text-[10px] font-medium truncate ${isMe ? "text-amber-900 font-bold" : "text-slate-600"}`}
                              >
                                {item.integrantes.apellido},{" "}
                                {item.integrantes.nombre?.charAt(0)}.
                              </span>
                              <span className="text-[8px] text-slate-400 mt-0.5">
                                Atril {deskNum}
                              </span>
                            </div>
                          </td>

                          {obras.map((obra) => {
                            const individualPartId =
                              assignments[
                                `M-${item.id_musico}-${obra.obra_id}`
                              ];
                            const containerPartId =
                              assignments[`C-${c.id}-${obra.obra_id}`];
                            const showPart =
                              individualPartId &&
                              individualPartId !== containerPartId;

                            return (
                              <td
                                key={`${item.id}-${obra.id}`}
                                className="p-1 border-l border-slate-100 border-b border-slate-50 text-center align-middle"
                              >
                                {showPart ? (
                                  <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded truncate max-w-[70px] block mx-auto">
                                    {getPartName(individualPartId)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-300 select-none">
                                    〃
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}

            {/* --- VIENTOS Y PERCUSIÓN (SEPARADOR) --- */}
            {windsAndPerc.length > 0 && (
              <tr className="bg-slate-200">
                <td
                  className="sticky left-0 bg-slate-200 z-20 p-1.5 pl-2 text-[9px] font-bold text-slate-600 border-r border-slate-300 uppercase tracking-wider"
                  colSpan={obras.length + 1}
                >
                  Vientos y Percusión
                </td>
              </tr>
            )}

            {windsAndPerc.map((m) => {
              const isMe = String(m.id) === String(user.id);
              return (
                <tr
                  key={m.id}
                  className={isMe ? "bg-amber-50" : "even:bg-slate-50/50"}
                >
                  <td
                    className={`p-1 pl-2 sticky left-0 z-20 border-r border-slate-200 align-middle ${isMe ? "bg-amber-50 border-l-4 border-l-amber-400" : "bg-white"}`}
                  >
                    <div className="flex flex-col leading-none">
                      <span
                        className={`font-bold text-[10px] truncate ${isMe ? "text-amber-900" : "text-slate-800"}`}
                      >
                        {m.apellido}, {m.nombre?.charAt(0)}.
                      </span>
                      <span className="text-[8px] text-slate-400 truncate mt-0.5">
                        {m.instrumentos?.instrumento}
                      </span>
                    </div>
                  </td>
                  {obras.map((obra) => {
                    const partId = assignments[`M-${m.id}-${obra.obra_id}`];
                    return (
                      <td
                        key={`${m.id}-${obra.id}`}
                        className="p-1 border-l border-slate-100 text-center align-middle"
                      >
                        <span className="text-[9px] text-slate-700 font-medium block truncate max-w-[75px]">
                          {getPartName(partId)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- CELDA DE INFO (ESCRITORIO) ---
const ContainerInfoCell = ({ container, myStandInfo }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col h-full justify-start min-w-[140px]">
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex flex-col overflow-hidden">
          <span
            className="font-bold text-[10px] text-indigo-900 truncate uppercase tracking-wider"
            title={container.nombre}
          >
            {container.nombre}
          </span>
          {myStandInfo && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 rounded border border-amber-200 w-fit mt-0.5">
              {myStandInfo}
            </span>
          )}
          {!myStandInfo && container.capacidad && (
            <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded-full border border-slate-200 w-fit mt-0.5">
              {container.items.length}/{container.capacidad}
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full text-left text-[9px] py-1 px-1.5 rounded flex items-center justify-between transition-colors border ${
            expanded
              ? "bg-indigo-100 text-indigo-800 border-indigo-200"
              : "bg-white text-slate-500 border-slate-200 hover:border-indigo-200"
          }`}
        >
          <span className="font-bold">{container.items.length} músicos</span>
          <IconChevronDown
            size={10}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {expanded && (
          <div className="mt-1 space-y-0.5 border-l-2 border-indigo-200 pl-1 ml-1 animate-in slide-in-from-top-1 bg-white/50 rounded-r">
            {container.items.length === 0 && (
              <span className="text-[9px] text-slate-400 italic block pl-1">
                Vacío
              </span>
            )}
            {container.items.map((item, idx) => {
              const standNum = Math.floor(idx / 2) + 1;
              return (
                <div
                  key={item.id}
                  className="text-[9px] text-slate-700 truncate leading-tight py-0.5 flex justify-between"
                >
                  <span>
                    {item.integrantes?.apellido}, {item.integrantes?.nombre}
                  </span>
                  <span className="text-slate-400 text-[8px] ml-1">
                    Atril {standNum}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- LAZY MODALS ---
const SeatingHistoryModal = React.lazy(
  () => import("../../components/seating/SeatingHistoryModal"),
);
const GlobalStringsManager = React.lazy(
  () => import("../../components/seating/GlobalStringsManager"),
);
const AnnualRotationModal = React.lazy(
  () => import("../../components/seating/AnnualRotationModal"),
);

export default function ProgramSeating({
  supabase,
  program,
  onBack,
  repertoireBlocks = [],
}) {
  const { isEditor, user } = useAuth();
  const { roster: rawRoster, loading: rosterLoading } = useGiraRoster(
    supabase,
    program,
  );

  const canManageSeating = ["admin", "editor", "coord_general"].includes(
    user?.rol_sistema,
  );

  const [filteredRoster, setFilteredRoster] = useState([]);
  const [particellas, setParticellas] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [containers, setContainers] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [instrumentList, setInstrumentList] = useState([]);
  const [createModalInfo, setCreateModalInfo] = useState(null);
  const [fetchedBlocks, setFetchedBlocks] = useState([]);

  // Fetch Obras
  useEffect(() => {
    const fetchRepertoire = async () => {
      if (repertoireBlocks.length === 0 && program?.id) {
        setLoading(true);
        const { data } = await supabase
          .from("programas_repertorios")
          .select(
            `id, orden, nombre, repertorio_obras (id, orden, obras (id, titulo, link_drive, obras_compositores (rol, compositores (apellido))))`,
          )
          .eq("id_programa", program.id)
          .order("orden");

        if (data) {
          const sortedData = data.map((block) => ({
            ...block,
            repertorio_obras:
              block.repertorio_obras?.sort((a, b) => a.orden - b.orden) || [],
          }));
          setFetchedBlocks(sortedData);
        }
        setLoading(false);
      }
    };
    fetchRepertoire();
  }, [program.id, repertoireBlocks, supabase]);

  const effectiveBlocks =
    repertoireBlocks.length > 0 ? repertoireBlocks : fetchedBlocks;

  const obras = useMemo(() => {
    if (!effectiveBlocks || effectiveBlocks.length === 0) return [];
    return effectiveBlocks
      .flatMap((block) =>
        block.repertorio_obras.map((ro) => {
          if (!ro.obras) return null;
          const comp = ro.obras.obras_compositores?.find(
            (oc) => oc.rol === "compositor" || !oc.rol,
          )?.compositores;
          const compName = comp?.apellido || "Anónimo";
          const title = ro.obras.titulo || "Obra";
          const cleanTitle =
            typeof title === "string"
              ? title.replace(/<[^>]*>?/gm, "")
              : "Obra";
          return {
            id: ro.id,
            obra_id: ro.obras.id,
            link: ro.obras.link_drive,
            title: cleanTitle,
            composer: compName,
            shortTitle: cleanTitle.split(/\s+/).slice(0, 3).join(" "),
            fullTitle: `${compName} - ${cleanTitle}`,
          };
        }),
      )
      .filter(Boolean);
  }, [effectiveBlocks]);

  // Fetch Particellas (Triggered when works change)
  useEffect(() => {
    const fetchParts = async () => {
      if (obras.length === 0) return;
      const workIds = [...new Set(obras.map((o) => o.obra_id))];
      let partsData = [];
      // Chunk para no saturar URL
      for (let i = 0; i < workIds.length; i += 10) {
        const chunk = workIds.slice(i, i + 10);
        const { data } = await supabase
          .from("obras_particellas")
          .select(
            "id, id_obra, nombre_archivo, id_instrumento, instrumentos(id, instrumento)",
          )
          .in("id_obra", chunk);
        if (data) partsData = [...partsData, ...data];
      }
      setParticellas(partsData);
    };
    fetchParts();
  }, [obras, supabase]);

  const particellaCounts = useMemo(() => {
    const counts = {};
    Object.values(assignments).forEach((partId) => {
      if (partId) counts[partId] = (counts[partId] || 0) + 1;
    });
    return counts;
  }, [assignments]);

  // --- MEMOIZACIÓN CRÍTICA PARA RENDIMIENTO ---
  // Pre-calculamos las opciones disponibles por obra para no filtrar en cada celda
  const availablePartsByWork = useMemo(() => {
    const map = {};
    obras.forEach((o) => {
      map[o.obra_id] = particellas.filter((p) => p.id_obra === o.obra_id);
    });
    return map;
  }, [obras, particellas]);

  useEffect(() => {
    if (program?.id && !rosterLoading) fetchInitialData();
  }, [program.id, rosterLoading, rawRoster]);

  const isString = (id) => ["01", "02", "03", "04"].includes(id);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: instruments } = await supabase
        .from("instrumentos")
        .select("id, instrumento")
        .order("instrumento");
      setInstrumentList(instruments || []);
      const musicians = rawRoster.filter(
        (m) =>
          m.estado_gira !== "ausente" &&
          !EXCLUDED_ROLES.includes((m.rol_gira || "musico").toLowerCase()),
      );
      musicians.sort((a, b) => {
        const instrIdA = a.id_instr || "9999";
        const instrIdB = b.id_instr || "9999";
        if (instrIdA !== instrIdB) return instrIdA.localeCompare(instrIdB);
        return (a.apellido || "").localeCompare(b.apellido || "");
      });
      setFilteredRoster(musicians);
      await fetchContainers();

      const { data: assigns } = await supabase
        .from("seating_asignaciones")
        .select("*")
        .eq("id_programa", program.id);
      const finalMap = {};
      assigns?.forEach((row) => {
        const obraId = row.id_obra;
        if (row.id_contenedor)
          finalMap[`C-${row.id_contenedor}-${obraId}`] = row.id_particella;
        else if (row.id_musicos_asignados)
          row.id_musicos_asignados.forEach(
            (mId) => (finalMap[`M-${mId}-${obraId}`] = row.id_particella),
          );
      });
      setAssignments(finalMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContainers = async () => {
    const { data: conts } = await supabase
      .from("seating_contenedores")
      .select("*")
      .eq("id_programa", program.id)
      .order("orden");
    if (conts) {
      const { data: items } = await supabase
        .from("seating_contenedores_items")
        .select("*, integrantes(nombre, apellido, instrumentos(instrumento))")
        .in(
          "id_contenedor",
          conts.map((c) => c.id),
        )
        .order("orden");
      setContainers(
        conts.map((c) => ({
          ...c,
          items: items?.filter((i) => i.id_contenedor === c.id) || [],
        })),
      );
    }
  };

  // --- PDF EXPORT (Igual que antes) ---
  const handleExportReport = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const cleanHTML = (str) =>
        typeof str === "string" ? str.replace(/<[^>]*>?/gm, "") : "";
      const truncate = (str, n) =>
        str && str.length > n ? str.substr(0, n - 1) + "..." : str;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Seating | ${program?.mes_letra || ""} - ${program?.nomenclador || ""}. ${program?.nombre_gira || ""}`,
        14,
        12,
      );
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 16);
      doc.line(14, 18, 196, 18);

      const maxMembers = Math.max(
        ...containers.map((c) => c.items?.length || 0),
        0,
      );
      const containerHeaders = containers.map((c) => c.nombre.toUpperCase());
      const containerBody = [];
      for (let i = 0; i < maxMembers; i++) {
        containerBody.push(
          containers.map((c) => {
            const item = c.items[i];
            if (!item?.integrantes) return "";
            return `${item.integrantes.apellido}, ${item.integrantes.nombre || ""}.`;
          }),
        );
      }

      autoTable(doc, {
        startY: 22,
        head: [containerHeaders],
        body: containerBody,
        theme: "grid",
        styles: { fontSize: 6.5, cellPadding: 0.6, halign: "center" },
        headStyles: { fillColor: [63, 81, 181], textColor: 255, fontSize: 7 },
        margin: { left: 14, right: 14 },
      });

      const finalY = doc.lastAutoTable.finalY;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Asignación de Particellas", 14, finalY + 8);

      const otherMusicians = filteredRoster.filter(
        (m) => !isString(m.id_instr),
      );
      const tableHeaders = [
        [
          "Músico",
          ...obras.map(
            (o) =>
              `${truncate(cleanHTML(o.composer), 10)}\n${truncate(cleanHTML(o.title), 12)}`,
          ),
        ],
      ];
      const tableBody = otherMusicians.map((m) => {
        const row = [`${m.apellido}, ${m.nombre}`];
        obras.forEach((o) => {
          const pid = assignments[`M-${m.id}-${o.obra_id}`];
          const p = particellas.find((x) => String(x.id) === String(pid));
          row.push(p ? p.nombre_archivo : "-");
        });
        return row;
      });

      autoTable(doc, {
        startY: finalY + 12,
        head: tableHeaders,
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: 6,
          cellPadding: 0.8,
          halign: "center",
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [30, 41, 59],
          halign: "center",
          fontSize: 5.5,
        },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [245, 245, 245], halign: "left" },
        },
        margin: { left: 14, right: 14 },
        pageBreak: "avoid",
      });
      doc.save("Seating_Reporte.pdf");
    } catch (err) {
      alert("Error PDF");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // --- MODALS & UPDATES ---
  const openCreateModal = (obraId, defaultInstrId, targetType, targetId) => {
    setCreateModalInfo({ obraId, targetType, targetId, defaultInstrId });
  };

  const handleConfirmCreate = async (instrumentId, name) => {
    if (!createModalInfo) return;
    const { obraId, targetType, targetId } = createModalInfo;
    const { data, error } = await supabase
      .from("obras_particellas")
      .insert({
        id_obra: obraId,
        id_instrumento: instrumentId,
        nombre_archivo: name,
      })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return;
    }

    // Optimista local update
    const instrName =
      instrumentList.find((i) => i.id === instrumentId)?.instrumento || "Nuevo";
    setParticellas((prev) => [
      ...prev,
      { ...data, instrumentos: { id: instrumentId, instrumento: instrName } },
    ]);
    handleAssign(targetType, targetId, obraId, data.id);
    setCreateModalInfo(null);
  };

  const handleAssign = async (targetType, targetId, obraId, particellaId) => {
    if (!isEditor) return;
    const key = `${targetType}-${targetId}-${obraId}`;

    // Update local state instantáneamente
    setAssignments((prev) => {
      const copy = { ...prev };
      if (!particellaId) delete copy[key];
      else copy[key] = particellaId;
      return copy;
    });

    // DB Sync
    if (targetType === "C") {
      await supabase
        .from("seating_asignaciones")
        .delete()
        .match({
          id_programa: program.id,
          id_contenedor: targetId,
          id_obra: obraId,
        });
      if (particellaId)
        await supabase
          .from("seating_asignaciones")
          .insert({
            id_programa: program.id,
            id_obra: obraId,
            id_particella: particellaId,
            id_contenedor: targetId,
            id_musicos_asignados: null,
          });
    } else {
      const { data: existing } = await supabase
        .from("seating_asignaciones")
        .select("*")
        .eq("id_programa", program.id)
        .eq("id_obra", obraId);
      const updates = [];
      existing?.forEach((row) => {
        if (row.id_musicos_asignados?.includes(targetId)) {
          const newArr = row.id_musicos_asignados.filter(
            (id) => id !== targetId,
          );
          if (newArr.length === 0 && !row.id_contenedor)
            updates.push(
              supabase.from("seating_asignaciones").delete().eq("id", row.id),
            );
          else
            updates.push(
              supabase
                .from("seating_asignaciones")
                .update({ id_musicos_asignados: newArr })
                .eq("id", row.id),
            );
        }
      });
      if (particellaId) {
        const targetRow = existing?.find(
          (r) => r.id_particella === particellaId && !r.id_contenedor,
        );
        if (targetRow) {
          const newArr = [
            ...new Set([...(targetRow.id_musicos_asignados || []), targetId]),
          ];
          updates.push(
            supabase
              .from("seating_asignaciones")
              .update({ id_musicos_asignados: newArr })
              .eq("id", targetRow.id),
          );
        } else {
          updates.push(
            supabase
              .from("seating_asignaciones")
              .insert({
                id_programa: program.id,
                id_obra: obraId,
                id_particella: particellaId,
                id_musicos_asignados: [targetId],
              }),
          );
        }
      }
      await Promise.all(updates);
    }
  };

  const otherMusicians = filteredRoster.filter((m) => !isString(m.id_instr));

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <CreateParticellaModal
        isOpen={!!createModalInfo}
        onClose={() => setCreateModalInfo(null)}
        onConfirm={handleConfirmCreate}
        instrumentList={instrumentList}
        defaultInstrumentId={createModalInfo?.defaultInstrId}
      />

      {(loading || rosterLoading || isExporting) && (
        <div className="absolute inset-0 bg-white/80 z-[60] flex flex-col items-center justify-center gap-2">
          <IconLoader className="animate-spin text-indigo-600" size={32} />
          {isExporting && (
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest animate-pulse">
              Generando Reporte...
            </span>
          )}
        </div>
      )}

      <Suspense fallback={null}>
        {showHistory && (
          <SeatingHistoryModal
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            roster={filteredRoster}
            supabase={supabase}
          />
        )}
        {showRotationModal && (
          <AnnualRotationModal
            isOpen={showRotationModal}
            onClose={() => setShowRotationModal(false)}
            currentProgram={program}
            roster={rawRoster}
            supabase={supabase}
          />
        )}
      </Suspense>

      <div className="px-4 py-2 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <IconUsers className="text-indigo-600" /> Seating & Particellas
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <IconDownload size={16} />{" "}
            <span className="hidden sm:inline">Reporte</span>
          </button>
          {canManageSeating && (
            <>
              <button
                onClick={() => setShowRotationModal(true)}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 shadow-sm"
              >
                <IconLayers size={16} />{" "}
                <span className="hidden sm:inline">Rotación</span>
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
              >
                <IconHistory size={16} />{" "}
                <span className="hidden sm:inline">Historial</span>
              </button>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors ${showConfig ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                <IconSettings size={16} /> {isEditor ? "Cuerdas" : "Ver Grupos"}
              </button>
            </>
          )}
          <button
            onClick={onBack}
            className="text-sm font-medium text-slate-500 hover:text-indigo-600 ml-4"
          >
            ← Volver
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-2 md:p-4 flex flex-col">
        <Suspense
          fallback={
            <div className="p-4 text-center text-slate-400">Cargando...</div>
          }
        >
          {showConfig && canManageSeating && (
            <GlobalStringsManager
              programId={program.id}
              roster={filteredRoster}
              containers={containers}
              onUpdate={fetchContainers}
              supabase={supabase}
              readOnly={!isEditor}
            />
          )}
        </Suspense>

        {/* --- VISTA MÓVIL --- */}
        <div className="md:hidden flex-1 overflow-hidden">
          <MobileSeatingTable
            user={user}
            obras={obras}
            assignments={assignments}
            filteredRoster={filteredRoster}
            containers={containers}
            particellas={particellas}
          />
        </div>

        {/* --- VISTA ESCRITORIO (OPTIMIZADA) --- */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-auto max-h-full">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px] table-fixed">
            <thead className="bg-slate-800 text-white font-bold sticky top-0 z-30 shadow-md">
              <tr>
                <th className="p-2 w-48 sticky left-0 bg-slate-800 z-40 border-r border-slate-600 pl-4">
                  Contenedor / Músico
                </th>
                {obras.map((obra) => {
                  // Pre-cálculo para el header (Unassigned Warning)
                  const obraParts = availablePartsByWork[obra.obra_id] || [];
                  const unassignedParts = obraParts.filter(
                    (p) => !particellaCounts[p.id],
                  );
                  const hasUnassigned = unassignedParts.length > 0;

                  return (
                    <th
                      key={obra.id}
                      className="p-1 w-32 border-l border-slate-600 align-bottom relative group"
                    >
                      <div className="flex flex-col gap-0.5 items-center w-full pb-1 overflow-hidden">
                        <div className="flex items-center gap-1 opacity-70 hover:opacity-100">
                          <span className="text-[9px] uppercase tracking-wide truncate">
                            {obra.composer}
                          </span>
                          {obra.link && (
                            <a
                              href={obra.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-300 hover:text-white"
                            >
                              <IconExternalLink size={10} />
                            </a>
                          )}
                        </div>
                        <div
                          className="text-[10px] font-bold text-white leading-tight text-center px-1 mb-1 w-full truncate"
                          title={obra.title}
                          dangerouslySetInnerHTML={{ __html: obra.title }}
                        />
                        {hasUnassigned && (
                          <div className="absolute top-1 right-1">
                            <IconAlertCircle
                              size={10}
                              className="text-amber-400"
                            />
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* CUERDAS */}
              {containers.length > 0 && (
                <>
                  <tr className="bg-indigo-50/50">
                    <td
                      colSpan={obras.length + 1}
                      className="p-1 px-4 text-[10px] font-bold text-indigo-800 uppercase"
                    >
                      Sección de Cuerdas
                    </td>
                  </tr>
                  {containers.map((c) => {
                    const isMyContainer = c.items.some(
                      (i) => i.id_musico === user.id,
                    );
                    const myStandText = isMyContainer ? "Tu lugar" : null;
                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors group ${isMyContainer ? "bg-amber-50" : "hover:bg-indigo-50/30"}`}
                      >
                        <td
                          className={`p-2 sticky left-0 border-r border-slate-200 z-20 pl-4 align-top ${isMyContainer ? "bg-amber-50 border-l-4 border-l-amber-400" : "bg-white group-hover:bg-indigo-50/30"}`}
                        >
                          <ContainerInfoCell
                            container={c}
                            myStandInfo={myStandText}
                          />
                        </td>
                        {obras.map((obra) => {
                          const currentVal =
                            assignments[`C-${c.id}-${obra.obra_id}`];
                          // Usamos la lista memoizada
                          const availableParts =
                            availablePartsByWork[obra.obra_id] || [];

                          return (
                            <td
                              key={`${c.id}-${obra.id}`}
                              className={`p-1 border-l border-slate-100 relative align-top ${isMyContainer ? "bg-amber-50" : "bg-slate-50/30"}`}
                            >
                              {isEditor ? (
                                <ParticellaSelect
                                  options={availableParts}
                                  value={currentVal}
                                  onChange={(val) =>
                                    handleAssign("C", c.id, obra.obra_id, val)
                                  }
                                  onRequestCreate={() =>
                                    openCreateModal(
                                      obra.obra_id,
                                      "00",
                                      "C",
                                      c.id,
                                    )
                                  }
                                  disabled={false}
                                  placeholder="Asignar"
                                  preferredInstrumentId={c.id_instrumento}
                                  counts={particellaCounts}
                                />
                              ) : (
                                /* LECTURA OPTIMIZADA: Texto plano */
                                <div className="flex items-center justify-center h-full px-2">
                                  <span
                                    className="text-xs text-slate-700 truncate"
                                    title={
                                      currentVal
                                        ? availableParts.find(
                                            (p) => p.id === currentVal,
                                          )?.nombre_archivo
                                        : ""
                                    }
                                  >
                                    {currentVal
                                      ? availableParts.find(
                                          (p) => p.id === currentVal,
                                        )?.nombre_archivo
                                      : "-"}
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}
              {/* VIENTOS */}
              {otherMusicians.length > 0 && (
                <>
                  <tr className="bg-slate-100/50">
                    <td
                      colSpan={obras.length + 1}
                      className="p-1 px-4 text-[10px] font-bold text-slate-600 uppercase"
                    >
                      Vientos y Percusión
                    </td>
                  </tr>
                  {otherMusicians.map((m) => {
                    const isMe = String(m.id) === String(user.id);
                    return (
                      <tr
                        key={m.id}
                        className={`transition-colors group ${isMe ? "bg-amber-50" : "hover:bg-slate-50"}`}
                      >
                        <td
                          className={`p-2 sticky left-0 border-r border-slate-200 z-20 pl-4 align-top ${isMe ? "bg-amber-50 border-l-4 border-l-amber-400" : "bg-white group-hover:bg-slate-50"}`}
                        >
                          <div className="flex flex-col">
                            <span
                              className={`font-bold truncate text-xs ${isMe ? "text-amber-900" : "text-slate-700"}`}
                            >
                              {m.apellido}, {m.nombre}
                            </span>
                            <span className="text-[9px] text-slate-400 truncate">
                              {m.instrumentos?.instrumento}{" "}
                              {m.rol_gira && m.rol_gira !== "musico" && (
                                <span className="text-amber-600">
                                  ({m.rol_gira})
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        {obras.map((obra) => {
                          const currentVal =
                            assignments[`M-${m.id}-${obra.obra_id}`];
                          const availableParts =
                            availablePartsByWork[obra.obra_id] || [];
                          return (
                            <td
                              key={`${m.id}-${obra.id}`}
                              className={`p-1 border-l border-slate-100 relative align-top ${isMe ? "bg-amber-50" : ""}`}
                            >
                              {isEditor ? (
                                <ParticellaSelect
                                  options={availableParts}
                                  value={currentVal}
                                  onChange={(val) =>
                                    handleAssign("M", m.id, obra.obra_id, val)
                                  }
                                  onRequestCreate={() =>
                                    openCreateModal(
                                      obra.obra_id,
                                      m.id_instr,
                                      "M",
                                      m.id,
                                    )
                                  }
                                  disabled={false}
                                  placeholder="Asignar"
                                  preferredInstrumentId={m.id_instr}
                                  counts={particellaCounts}
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full px-2">
                                  <span
                                    className="text-xs text-slate-700 truncate"
                                    title={
                                      currentVal
                                        ? availableParts.find(
                                            (p) => p.id === currentVal,
                                          )?.nombre_archivo
                                        : ""
                                    }
                                  >
                                    {currentVal
                                      ? availableParts.find(
                                          (p) => p.id === currentVal,
                                        )?.nombre_archivo
                                      : "-"}
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
