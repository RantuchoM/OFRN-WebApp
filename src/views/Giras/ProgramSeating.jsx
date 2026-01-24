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

// Librerías para reporte PDF (Asegúrate de tener jspdf-autotable instalado)
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
];

// --- CELDA DE INFO: Estructura Original ---
const ContainerInfoCell = ({ container, readOnly, myStandInfo }) => {
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
            <span
              className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded-full border border-slate-200 w-fit mt-0.5"
              title="Capacidad"
            >
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
          // Limpieza de HTML para evitar errores en PDF
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

  const particellaCounts = useMemo(() => {
    const counts = {};
    Object.values(assignments).forEach((partId) => {
      if (partId) counts[partId] = (counts[partId] || 0) + 1;
    });
    return counts;
  }, [assignments]);

  useEffect(() => {
    if (program?.id && !rosterLoading) fetchInitialData();
  }, [program.id, effectiveBlocks, rosterLoading, rawRoster]);

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
      const workIds = [...new Set(obras.map((o) => o.obra_id))];
      await fetchParticellas(workIds);
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

  const fetchParticellas = async (workIds) => {
    if (workIds.length === 0) return;
    let partsData = [];
    const chunkArray = (arr, size) => {
      const res = [];
      for (let i = 0; i < arr.length; i += size)
        res.push(arr.slice(i, i + size));
      return res;
    };
    const chunks = chunkArray(workIds, 10);
    for (const chunk of chunks) {
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
      const full = conts.map((c) => ({
        ...c,
        items: items?.filter((i) => i.id_contenedor === c.id) || [],
      }));
      setContainers(full);
    }
  };

  // --- COMPONENTE DEL EXPORTADOR ACTUALIZADO ---
  // --- COMPONENTE DEL EXPORTADOR ACTUALIZADO (A4 landscape) ---
  // --- COMPONENTE DEL EXPORTADOR ACTUALIZADO (A4 Portrait - Vertical) ---
  const handleExportReport = () => {
    setIsExporting(true);
    try {
      // Cambio a orientación "p" (portrait / vertical)
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Obtención de campos corregidos
      const nombre_gira = program?.nombre_gira || "Sin Título";
      const mes_letra = program?.mes_letra || "";
      const nomenclador = program?.nomenclador || "";

      const cleanHTML = (str) =>
        typeof str === "string" ? str.replace(/<[^>]*>?/gm, "") : "";
      const truncate = (str, n) =>
        str && str.length > n ? str.substr(0, n - 1) + "..." : str;

      // 1. Título y Encabezado - Formato: Seating | mes_letra - nomenclador. nombre_gira
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Seating | ${mes_letra} - ${nomenclador}. ${nombre_gira}`,
        14,
        12,
      );

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 16);
      doc.line(14, 18, pageWidth - 14, 18);

      // 2. Tabla Superior: Contenedores en Columnas (Cuerdas)
      const maxMembers = Math.max(
        ...containers.map((c) => c.items?.length || 0),
        0,
      );
      const containerHeaders = containers.map((c) => c.nombre.toUpperCase());
      const containerBody = [];

      for (let i = 0; i < maxMembers; i++) {
        const row = containers.map((c) => {
          const item = c.items[i];
          if (!item || !item.integrantes) return "";
          const apellido = item.integrantes.apellido || "";
          const inicialNombre = item.integrantes.nombre
            ? item.integrantes.nombre.charAt(0) + "."
            : "";
          return `${apellido}, ${inicialNombre}`;
        });
        containerBody.push(row);
      }

      autoTable(doc, {
        startY: 22,
        head: [containerHeaders],
        body: containerBody,
        theme: "grid",
        styles: { fontSize: 6.5, cellPadding: 0.6, halign: "center" },
        headStyles: {
          fillColor: [63, 81, 181],
          textColor: [255, 255, 255],
          fontSize: 7,
        },
        margin: { left: 14, right: 14 },
      });

      // 3. Tabla Inferior: Grilla de Asignación (Vientos y Percusión)
      const finalY = doc.lastAutoTable.finalY;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Asignación de Particellas (Vientos y Percusión)",
        14,
        finalY + 8,
      );

      // Header con "Compositor \n Obra" truncados
      const tableHeaders = [
        [
          "Músico",
          ...obras.map((o) => {
            const comp = truncate(cleanHTML(o.composer), 10);
            const tit = truncate(cleanHTML(o.title), 12);
            return `${comp}\n${tit}`;
          }),
        ],
      ];

      const tableBody = [];
      otherMusicians.forEach((m) => {
        const row = [`${m.apellido}, ${m.nombre}`];
        obras.forEach((o) => {
          const key = `M-${m.id}-${o.obra_id}`;
          const partId = assignments[key];
          const part = particellas.find((p) => String(p.id) === String(partId));
          row.push(part ? part.nombre_archivo : "-");
        });
        tableBody.push(row);
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
          cellPadding: 1,
        },
        columnStyles: {
          0: {
            fontStyle: "bold",
            fillColor: [245, 245, 245],
            halign: "left",
            cellWidth: "auto",
          },
        },
        tableWidth: "wrap",
        margin: { left: 14, right: 14 },
        pageBreak: "avoid",
      });

      doc.save(`Seating_${nombre_gira.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Error al exportar PDF:", err);
      alert("Error al generar el reporte PDF.");
    } finally {
      setIsExporting(false);
    }
  };
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
      alert("Error: " + error.message);
      return;
    }
    const instrName =
      instrumentList.find((i) => i.id === instrumentId)?.instrumento ||
      "Nuevo Instr.";
    const newPart = {
      ...data,
      instrumentos: { id: instrumentId, instrumento: instrName },
    };
    setParticellas((prev) => [...prev, newPart]);
    handleAssign(targetType, targetId, obraId, data.id);
    setCreateModalInfo(null);
  };

  const handleAssign = async (targetType, targetId, obraId, particellaId) => {
    if (!isEditor) return;
    const key = `${targetType}-${targetId}-${obraId}`;
    setAssignments((prev) => {
      const copy = { ...prev };
      if (!particellaId) delete copy[key];
      else copy[key] = particellaId;
      return copy;
    });
    if (targetType === "C") {
      await supabase.from("seating_asignaciones").delete().match({
        id_programa: program.id,
        id_contenedor: targetId,
        id_obra: obraId,
      });
      if (particellaId)
        await supabase.from("seating_asignaciones").insert({
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
            supabase.from("seating_asignaciones").insert({
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
            <IconDownload size={16} /> Descargar Reporte
          </button>
          {canManageSeating && (
            <>
              <button
                onClick={() => setShowRotationModal(true)}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 shadow-sm"
              >
                <IconLayers size={16} /> Rotación Anual
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
              >
                <IconHistory size={16} /> Reporte Histórico
              </button>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors ${showConfig ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                <IconSettings size={16} />{" "}
                {isEditor ? "Configurar Cuerdas" : "Ver Grupos Cuerdas"}
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

      <div className="flex-1 overflow-hidden p-4 flex flex-col">
        <Suspense
          fallback={
            <div className="p-4 text-center text-slate-400">
              Cargando gestor...
            </div>
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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-auto max-h-full">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
            <thead className="bg-slate-800 text-white font-bold sticky top-0 z-30 shadow-md">
              <tr>
                <th className="p-2 w-64 sticky left-0 bg-slate-800 z-40 border-r border-slate-600 pl-4">
                  Contenedor / Músico
                </th>
                {obras.map((obra) => {
                  const obraParts = particellas.filter(
                    (p) => p.id_obra === obra.obra_id,
                  );
                  const unassignedParts = obraParts.filter(
                    (p) => !particellaCounts[p.id],
                  );
                  const hasUnassigned = unassignedParts.length > 0;
                  return (
                    <th
                      key={obra.id}
                      className="p-1 min-w-[140px] border-l border-slate-600 align-bottom relative group"
                    >
                      <div className="flex flex-col gap-0.5 items-center w-full pb-1">
                        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                          <span className="text-[9px] uppercase tracking-wide">
                            {obra.composer}
                          </span>
                          {obra.link && (
                            <a
                              href={obra.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-300 hover:text-white"
                              title="Abrir en Drive"
                            >
                              <IconExternalLink size={10} />
                            </a>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-white leading-tight text-center px-1 mb-1 flex items-center justify-center gap-1">
                          <span
                            dangerouslySetInnerHTML={{ __html: obra.title }}
                          />
                          {hasUnassigned && (
                            <div className="relative group/icon">
                              <IconAlertCircle
                                size={12}
                                className="text-amber-400 cursor-help"
                              />
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-40 bg-white text-slate-700 shadow-xl rounded border border-slate-200 p-2 z-50 hidden group-hover/icon:block animate-in fade-in zoom-in-95 pointer-events-none">
                                <div className="text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 mb-1 pb-1">
                                  Sin Asignar ({unassignedParts.length})
                                </div>
                                <ul className="space-y-0.5">
                                  {unassignedParts.map((p) => (
                                    <li
                                      key={p.id}
                                      className="text-[9px] font-medium truncate"
                                    >
                                      • {p.nombre_archivo}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {containers.length > 0 && (
                <>
                  <tr className="bg-indigo-50/50">
                    <td
                      colSpan={obras.length + 1}
                      className="p-1 px-4 text-[10px] font-bold text-indigo-800 uppercase tracking-wider border-b border-indigo-100"
                    >
                      Sección de Cuerdas
                    </td>
                  </tr>
                  {containers.map((c) => {
                    const userItemIndex = c.items.findIndex(
                      (i) => String(i.id_musico) === String(user.id),
                    );
                    const isMyContainer = userItemIndex !== -1;
                    const myStandText = isMyContainer
                      ? `Atril ${Math.floor(userItemIndex / 2) + 1}`
                      : null;

                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors group ${isMyContainer ? "bg-amber-50" : "hover:bg-indigo-50/30"}`}
                      >
                        <td
                          className={`p-2 sticky left-0 border-r border-slate-200 z-20 pl-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] align-top ${isMyContainer ? "bg-amber-50 border-l-4 border-l-amber-400" : "bg-white group-hover:bg-indigo-50/30"}`}
                        >
                          <ContainerInfoCell
                            container={c}
                            readOnly={!isEditor}
                            myStandInfo={myStandText}
                          />
                        </td>
                        {obras.map((obra) => {
                          const availableParts = particellas.filter(
                            (p) => p.id_obra === obra.obra_id,
                          );
                          const currentVal =
                            assignments[`C-${c.id}-${obra.obra_id}`];
                          return (
                            <td
                              key={`${c.id}-${obra.id}`}
                              className={`p-1 border-l border-slate-100 relative min-w-[140px] align-top ${isMyContainer ? "bg-amber-50" : "bg-slate-50/30"}`}
                            >
                              <ParticellaSelect
                                options={availableParts}
                                value={currentVal}
                                onChange={(val) =>
                                  handleAssign("C", c.id, obra.obra_id, val)
                                }
                                onRequestCreate={() =>
                                  openCreateModal(obra.obra_id, "00", "C", c.id)
                                }
                                disabled={!isEditor}
                                placeholder="Asignar Grupo"
                                preferredInstrumentId={c.id_instrumento}
                                counts={particellaCounts}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}
              {otherMusicians.length > 0 && (
                <>
                  <tr className="bg-slate-100/50">
                    <td
                      colSpan={obras.length + 1}
                      className="p-1 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 border-t border-slate-200 mt-4"
                    >
                      Vientos y Percusión
                    </td>
                  </tr>
                  {otherMusicians.map((musician) => {
                    const isMe = String(musician.id) === String(user.id);
                    return (
                      <tr
                        key={musician.id}
                        className={`transition-colors group ${isMe ? "bg-amber-50" : "hover:bg-slate-50"}`}
                      >
                        <td
                          className={`p-2 sticky left-0 border-r border-slate-200 z-20 pl-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isMe ? "bg-amber-50 border-l-4 border-l-amber-400" : "bg-white group-hover:bg-slate-50"}`}
                        >
                          <div className="flex flex-col">
                            <span
                              className={`font-bold truncate text-xs ${isMe ? "text-amber-900" : "text-slate-700"}`}
                            >
                              {musician.apellido}, {musician.nombre}
                            </span>
                            <span className="text-[9px] text-slate-400 truncate flex items-center gap-1">
                              {musician.instrumentos?.instrumento}{" "}
                              {musician.rol_gira &&
                                musician.rol_gira !== "musico" && (
                                  <span className="text-amber-600">
                                    ({musician.rol_gira})
                                  </span>
                                )}
                            </span>
                          </div>
                        </td>
                        {obras.map((obra) => {
                          const availableParts = particellas.filter(
                            (p) => p.id_obra === obra.obra_id,
                          );
                          const currentVal =
                            assignments[`M-${musician.id}-${obra.obra_id}`];
                          return (
                            <td
                              key={`${musician.id}-${obra.id}`}
                              className={`p-1 border-l border-slate-100 relative min-w-[140px] ${isMe ? "bg-amber-50" : ""}`}
                            >
                              <ParticellaSelect
                                options={availableParts}
                                value={currentVal}
                                onChange={(val) =>
                                  handleAssign(
                                    "M",
                                    musician.id,
                                    obra.obra_id,
                                    val,
                                  )
                                }
                                onRequestCreate={() =>
                                  openCreateModal(
                                    obra.obra_id,
                                    musician.id_instr,
                                    "M",
                                    musician.id,
                                  )
                                }
                                disabled={!isEditor}
                                preferredInstrumentId={musician.id_instr}
                                counts={particellaCounts}
                              />
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
