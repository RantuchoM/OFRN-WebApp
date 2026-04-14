import React, { useEffect, useMemo, useState, Suspense } from "react";
import {
  IconHistory,
  IconDownload,
  IconAlertTriangle,
  IconLoader,
  IconLayers,
} from "../../components/ui/Icons";
import MultiSelect from "../../components/ui/MultiSelect";
import { useAuth } from "../../context/AuthContext";
import SeatingHistoryModal from "../../components/seating/SeatingHistoryModal";
import { getProgramTypeColor } from "../../utils/giraUtils";
import { generateSeatingPdf } from "../../utils/seatingPdfExporter";
import { exportSeatingToExcel } from "../../utils/seatingExcelExporter";
import { fetchRosterForGira } from "../../hooks/useGiraRoster";
import { sortSeatingItems } from "../../services/giraService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const AnnualRotationModal = React.lazy(
  () => import("../../components/seating/AnnualRotationModal"),
);

export default function SeatingReports({ supabase }) {
  const { isEditor, isAdmin } = useAuth();
  const canManage = isEditor || isAdmin;

  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [selectedProgramIds, setSelectedProgramIds] = useState([]);

  const [exportingPdfs, setExportingPdfs] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRoster, setHistoryRoster] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rotationOpen, setRotationOpen] = useState(false);

  useEffect(() => {
    if (!canManage) return;
    const loadPrograms = async () => {
      setLoadingPrograms(true);
      try {
        // 1) Programas con al menos un grupo de Seating
        const { data: contRows, error: contError } = await supabase
          .from("seating_contenedores")
          .select("id_programa")
          .not("id_programa", "is", null);
        if (contError) throw contError;

        // 2) Programas con al menos una particella asignada a músico
        const { data: assignRows, error: assignError } = await supabase
          .from("seating_asignaciones")
          .select("id_programa, id_musicos_asignados");
        if (assignError) throw assignError;

        const programIds = new Set();

        (contRows || []).forEach((row) => {
          if (row.id_programa) programIds.add(row.id_programa);
        });

        (assignRows || []).forEach((row) => {
          const list = row.id_musicos_asignados;
          if (Array.isArray(list) && list.length > 0 && row.id_programa) {
            programIds.add(row.id_programa);
          }
        });

        if (programIds.size === 0) {
          setPrograms([]);
          return;
        }

        const { data, error } = await supabase
          .from("programas")
          .select(
            "id, nombre_gira, nomenclador, mes_letra, fecha_desde, fecha_hasta, tipo",
          )
          .in("id", Array.from(programIds))
          .order("fecha_desde", { ascending: true });
        if (error) throw error;
        setPrograms(data || []);
      } catch (err) {
        console.error("Error cargando programas para SeatingReports:", err);
        alert(
          "Error al cargar los programas con Seating. Verifica tus permisos.",
        );
      } finally {
        setLoadingPrograms(false);
      }
    };
    loadPrograms();
  }, [canManage, supabase]);

  const programOptions = useMemo(
    () =>
      programs.map((p) => {
        const label = `${p.mes_letra || ""} | ${p.nomenclador || ""}. ${
          p.nombre_gira || ""
        }`.trim();
        const subLabel = p.tipo || "";
        const badgeClass = getProgramTypeColor(p.tipo);
        return {
          id: p.id,
          label,
          subLabel,
          badgeClass,
        };
      }),
    [programs],
  );

  const selectedPrograms = useMemo(
    () =>
      programs.filter((p) =>
        selectedProgramIds.includes(p.id),
      ),
    [programs, selectedProgramIds],
  );

  const ensureGlobalRoster = async () => {
    if (historyRoster.length > 0) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("integrantes")
        .select("id, nombre, apellido, id_instr")
        .in("id_instr", ["01", "02", "03", "04"]);
      if (error) throw error;
      setHistoryRoster(data || []);
    } catch (err) {
      console.error("Error cargando roster global de cuerdas:", err);
      alert("Error al cargar el historial global de seating.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = async () => {
    await ensureGlobalRoster();
    setHistoryOpen(true);
  };

  const fetchLocalRepertorio = async (programId) => {
    const { data, error } = await supabase
      .from("programas_repertorios")
      .select(
        `id, nombre, orden, repertorio_obras (id, orden, excluir, obras (id, titulo, obras_compositores (rol, compositores (nombre, apellido))))`,
      )
      .eq("id_programa", programId)
      .order("orden");
    if (error) throw error;
    return (data || []).map((r) => ({
      ...r,
      repertorio_obras: (r.repertorio_obras || []).sort(
        (a, b) => a.orden - b.orden,
      ),
    }));
  };

  const buildSeatingStateForProgram = async (program, roster, localRepertorio) => {
    // Contenedores e items (cuerdas)
    let containers = [];
    const { data: conts, error: contsError } = await supabase
      .from("seating_contenedores")
      .select("*")
      .eq("id_programa", program.id)
      .order("orden");
    if (contsError) throw contsError;

    if (conts && conts.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from("seating_contenedores_items")
        .select("*, integrantes(nombre, apellido, instrumentos(instrumento))")
        .in(
          "id_contenedor",
          conts.map((c) => c.id),
        )
        .order("atril_num", { ascending: true, nullsFirst: true })
        .order("lado", { ascending: true, nullsFirst: true })
        .order("id", { ascending: true });
      if (itemsError) throw itemsError;

      const confirmedRosterIds = new Set(
        (roster || [])
          .filter((m) => m.estado_gira === "confirmado")
          .map((m) => Number(m.id)),
      );

      containers = conts.map((c) => {
        const containerItems =
          items?.filter(
            (i) => Number(i.id_contenedor) === Number(c.id),
          ) || [];
        const presentItems = containerItems.filter((item) =>
          confirmedRosterIds.has(Number(item.id_musico)),
        );
        return {
          ...c,
          items: presentItems,
        };
      });
    }

    // Asignaciones
    const assignments = {};
    const { data: assigns, error: assignsError } = await supabase
      .from("seating_asignaciones")
      .select("*")
      .eq("id_programa", program.id);
    if (assignsError) throw assignsError;
    assigns?.forEach((row) => {
      const obraId = row.id_obra;
      if (row.id_contenedor) {
        assignments[`C-${row.id_contenedor}-${obraId}`] = row.id_particella;
      } else if (row.id_musicos_asignados) {
        row.id_musicos_asignados.forEach((mId) => {
          assignments[`M-${mId}-${obraId}`] = row.id_particella;
        });
      }
    });

    // Particellas
    const workIds = (localRepertorio || [])
      .flatMap((block) =>
        (block.repertorio_obras || [])
          .filter((o) => !o.excluir)
          .map((o) => o.obras?.id),
      )
      .filter(Boolean);

    let particellas = [];
    if (workIds.length > 0) {
      const chunkSize = 40;
      for (let i = 0; i < workIds.length; i += chunkSize) {
        const chunk = workIds.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from("obras_particellas")
          .select("id, nombre_archivo, id_obra")
          .in("id_obra", chunk);
        if (error) throw error;
        if (data) particellas = [...particellas, ...data];
      }
    }

    return { assignments, containers, particellas };
  };

  const handleExportPdfs = async () => {
    if (selectedPrograms.length === 0) {
      alert("Seleccioná al menos una gira para exportar los PDFs de Seating.");
      return;
    }
    setExportingPdfs(true);
    try {
      for (const program of selectedPrograms) {
        // localRepertorio + roster por programa
        const localRepertorio = await fetchLocalRepertorio(program.id);
        const { roster } = await fetchRosterForGira(supabase, program);
        // Reutilizamos el exportador existente (descarga un PDF por programa)
        // eslint-disable-next-line no-await-in-loop
        await generateSeatingPdf(supabase, program, localRepertorio, roster);
      }
    } catch (err) {
      console.error("Error en exportación masiva de PDFs:", err);
      alert(
        "Ocurrió un error al generar los PDFs de Seating. Revisa la consola para más detalles.",
      );
    } finally {
      setExportingPdfs(false);
    }
  };

  const handleExportUnifiedPdf = async () => {
    if (selectedPrograms.length === 0) {
      alert("Seleccioná al menos una gira para exportar el PDF unificado.");
      return;
    }
    setExportingPdfs(true);
    try {
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

      for (let index = 0; index < selectedPrograms.length; index++) {
        const program = selectedPrograms[index];
        if (index > 0) doc.addPage();

        const localRepertorio = await fetchLocalRepertorio(program.id);
        const { roster } = await fetchRosterForGira(supabase, program);
        const { assignments, containers, particellas } =
          await buildSeatingStateForProgram(
            program,
            roster,
            localRepertorio,
          );

        // Encabezado
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(
          `Seating | ${program?.mes_letra || ""} - ${
            program?.nomenclador || ""
          }. ${program?.nombre_gira || ""}`,
          14,
          12,
        );
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Generado: ${new Date().toLocaleDateString()}`,
          14,
          16,
        );
        doc.line(14, 18, 196, 18);

        // Tabla 1: Cuerdas (contenedores)
        const validItems = containers.flatMap((c) =>
          (c.items || []).map((i) => ({ ...i, id_contenedor: c.id })),
        );
        const maxRows =
          containers.length > 0
            ? Math.max(
                ...containers.map(
                  (c) =>
                    validItems.filter(
                      (i) => i.id_contenedor === c.id,
                    ).length || 0,
                ),
                0,
              )
            : 0;

        const containerHeaders = containers.map((c) =>
          String(c.nombre || "").toUpperCase(),
        );
        const containerBody = [];
        for (let r = 0; r < maxRows; r++) {
          containerBody.push(
            containers.map((c) => {
              const groupItems = sortSeatingItems(
                validItems.filter((i) => i.id_contenedor === c.id),
              );
              const item = groupItems[r];
              if (!item?.integrantes) return "";
              return `${item.integrantes.apellido || ""}, ${
                item.integrantes.nombre || ""
              }.`;
            }),
          );
        }

        autoTable(doc, {
          startY: 22,
          head: [containerHeaders],
          body: containerBody,
          theme: "grid",
          styles: { fontSize: 6.5, cellPadding: 0.6, halign: "center" },
          headStyles: { fillColor: [63, 81, 181], textColor: 255 },
          margin: { left: 14, right: 14 },
        });

        // Tabla 2: Vientos y otros
        const finalY = doc.lastAutoTable.finalY || 22;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(
          "Asignación de Particellas (Vientos y Otros)",
          14,
          finalY + 8,
        );

        const obrasList = (localRepertorio || [])
          .flatMap((block) =>
            (block.repertorio_obras || []).map((ro) => ({
              obra_id: ro.obras.id,
              title: ro.obras.titulo,
            })),
          )
          .filter(Boolean);

        const otherMusicians = (roster || [])
          .filter((m) => !["01", "02", "03", "04"].includes(m.id_instr))
          .sort((a, b) => {
            const instrA = a.id_instr || "9999";
            const instrB = b.id_instr || "9999";
            if (instrA !== instrB) return instrA.localeCompare(instrB);
            return (a.apellido || "").localeCompare(b.apellido || "");
          });

        const tableHeaders = [
          [
            "Músico",
            ...obrasList.map((o) => o.title || "Obra"),
          ],
        ];

        const tableBody = otherMusicians.map((m) => {
          const row = [`${m.apellido || ""}, ${m.nombre || ""}`];
          obrasList.forEach((o) => {
            const assign = assignments[
              `M-${m.id}-${o.obra_id}`
            ];
            const partName = (particellas || []).find(
              (p) => String(p.id) === String(assign),
            )?.nombre_archivo;
            row.push(partName || "-");
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
          headStyles: { fillColor: [30, 41, 59], halign: "center" },
          columnStyles: {
            0: {
              fontStyle: "bold",
              fillColor: [245, 245, 245],
              halign: "left",
            },
          },
          margin: { left: 14, right: 14 },
        });
      }

      doc.save("Seating_unificado.pdf");
    } catch (err) {
      console.error("Error en exportación unificada de PDFs:", err);
      alert(
        "Ocurrió un error al generar el PDF unificado de Seating.",
      );
    } finally {
      setExportingPdfs(false);
    }
  };

  const handleExportUnifiedExcel = async () => {
    if (selectedPrograms.length === 0) {
      alert("Seleccioná al menos una gira para exportar el Excel unificado.");
      return;
    }
    setExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();

      for (const program of selectedPrograms) {
        const sheetName =
          (program.nomenclador || program.nombre_gira || "Gira")
            .toString()
            .substring(0, 25);
        const sheet = workbook.addWorksheet(sheetName || "Gira");

        const localRepertorio = await fetchLocalRepertorio(program.id);
        const { roster } = await fetchRosterForGira(supabase, program);
        const { assignments, containers, particellas } =
          await buildSeatingStateForProgram(
            program,
            roster,
            localRepertorio,
          );

        // Header programa
        const title = `Seating | ${program?.mes_letra || ""} - ${
          program?.nomenclador || ""
        }. ${program?.nombre_gira || ""}`;
        const headerRow = sheet.addRow([title]);
        headerRow.font = {
          bold: true,
          size: 14,
          color: { argb: "FFFFFFFF" },
          name: "Calibri",
        };
        headerRow.alignment = {
          horizontal: "left",
          vertical: "middle",
        };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E293B" },
        };
        sheet.mergeCells(1, 1, 1, 6);

        sheet.addRow([]);

        // Disposición de cuerdas
        const maxRows =
          containers.length > 0
            ? Math.max(
                ...containers.map((c) => (c.items || []).length || 0),
                0,
              )
            : 0;

        if (containers.length > 0 && maxRows > 0) {
          const headerValues = containers.map((c) =>
            (c.nombre || "").toUpperCase(),
          );
          const tableHeaderRow = sheet.addRow(headerValues);
          tableHeaderRow.font = {
            bold: true,
            size: 10,
            color: { argb: "FFFFFFFF" },
            name: "Calibri",
          };
          tableHeaderRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1F2937" },
          };

          for (let i = 0; i < maxRows; i++) {
            const rowValues = containers.map((c) => {
              const item = (c.items || [])[i];
              if (!item?.integrantes) return "";
              return `${item.integrantes.apellido || ""}, ${
                item.integrantes.nombre || ""
              }.`;
            });
            sheet.addRow(rowValues);
          }
        }

        sheet.addRow([]);

        // Tabla de particellas (vientos/otros)
        const obrasList = (localRepertorio || [])
          ?.flatMap((block) =>
            (block.repertorio_obras || []).map((ro) => ({
              obra_id: ro.obras.id,
              title: ro.obras.titulo || "Obra",
            })),
          )
          .filter(Boolean);

        if (obrasList.length > 0) {
          const otherMusicians = (roster || [])
            .filter(
              (m) => !["01", "02", "03", "04"].includes(m.id_instr),
            )
            .sort((a, b) => {
              const instrA = a.id_instr || "9999";
              const instrB = b.id_instr || "9999";
              if (instrA !== instrB) return instrA.localeCompare(instrB);
              return (a.apellido || "").localeCompare(b.apellido || "");
            });

          const headerValues = [
            "Músico",
            ...obrasList.map((o) => o.title),
          ];
          sheet.addRow(headerValues);

          otherMusicians.forEach((m) => {
            const rowValues = [
              `${m.apellido || ""}, ${m.nombre || ""}`,
              ...obrasList.map((o) => {
                const key = `M-${m.id}-${o.obra_id}`;
                const partId = assignments[key];
                const part = (particellas || []).find(
                  (p) => String(p.id) === String(partId),
                );
                return part?.nombre_archivo || "-";
              }),
            ];
            sheet.addRow(rowValues);
          });
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "Seating_unificado.xlsx",
      );
    } catch (err) {
      console.error("Error en exportación unificada de Excel:", err);
      alert(
        "Ocurrió un error al generar el Excel unificado de Seating.",
      );
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportExcel = async () => {
    if (selectedPrograms.length === 0) {
      alert(
        "Seleccioná al menos una gira para generar el Excel consolidado de Seating.",
      );
      return;
    }
    setExportingExcel(true);
    try {
      for (const program of selectedPrograms) {
        const localRepertorio = await fetchLocalRepertorio(program.id);
        const { roster } = await fetchRosterForGira(supabase, program);
        const { assignments, containers, particellas } =
          await buildSeatingStateForProgram(
            program,
            roster,
            localRepertorio,
          );
        // eslint-disable-next-line no-await-in-loop
        await exportSeatingToExcel(
          supabase,
          program,
          localRepertorio,
          roster,
          assignments,
          containers,
          particellas,
        );
      }
    } catch (err) {
      console.error("Error en exportación masiva de Excel de Seating:", err);
      alert(
        "Ocurrió un error al generar el Excel de Seating. Revisa la consola para más detalles.",
      );
    } finally {
      setExportingExcel(false);
    }
  };

  if (!canManage) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
        No tenés permisos para acceder a los informes globales de Seating.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Informes Globales de Seating
            </h3>
            <p className="text-xs text-slate-500">
              Seleccioná una o varias giras para generar reportes masivos de Seating
              (PDF y Excel) o revisar el historial histórico de cuerdas.
            </p>
          </div>
          {loadingPrograms && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <IconLoader className="animate-spin" size={14} />
              Cargando giras...
            </span>
          )}
        </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MultiSelect
            label="Giras con Seating guardado"
            options={programOptions}
            selectedIds={selectedProgramIds}
            onChange={setSelectedProgramIds}
          />
          <div className="flex flex-col gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <IconAlertTriangle
                size={14}
                className="text-amber-500 mt-0.5 shrink-0"
              />
              <p>
                Solo se listan los programas que ya tienen al menos un grupo de
                Seating guardado (<code>seating_contenedores</code>).
              </p>
            </div>
            <p>
              Los colores de las etiquetas reflejan el tipo de programa
              (Sinfónico, Cámara, Ensamble, etc.) según{" "}
              <code>giraUtils.getProgramTypeColor</code>.
            </p>
          </div>
        </div>

            <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportPdfs}
            disabled={exportingPdfs || selectedPrograms.length === 0}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingPdfs ? (
              <IconLoader className="animate-spin" size={14} />
            ) : (
              <IconDownload size={14} />
            )}
            <span>Exportar PDFs Seleccionados</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingExcel || selectedPrograms.length === 0}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingExcel ? (
              <IconLoader className="animate-spin" size={14} />
            ) : (
              <IconDownload size={14} />
            )}
            <span>Generar Excel Consolidado</span>
          </button>
          <button
            type="button"
            onClick={handleExportUnifiedPdf}
            disabled={exportingPdfs || selectedPrograms.length === 0}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingPdfs ? (
              <IconLoader className="animate-spin" size={14} />
            ) : (
              <IconDownload size={14} />
            )}
            <span>PDF Unificado</span>
          </button>
          <button
            type="button"
            onClick={handleExportUnifiedExcel}
            disabled={exportingExcel || selectedPrograms.length === 0}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-900 bg-slate-200 hover:bg-slate-300 border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingExcel ? (
              <IconLoader className="animate-spin" size={14} />
            ) : (
              <IconDownload size={14} />
            )}
            <span>Excel Unificado</span>
          </button>
          <button
            type="button"
            onClick={handleOpenHistory}
            disabled={historyLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {historyLoading ? (
              <IconLoader className="animate-spin" size={14} />
            ) : (
              <IconHistory size={14} />
            )}
            <span>Ver Histórico Global (Cuerdas)</span>
          </button>
          <button
            type="button"
            onClick={() => setRotationOpen(true)}
            disabled={selectedPrograms.length === 0}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconLayers size={14} />
            <span>Rotación Anual</span>
          </button>
          {selectedPrograms.length === 0 && !loadingPrograms && (
            <span className="text-[11px] text-slate-400">
              Tip: seleccioná al menos una gira para habilitar la exportación.
            </span>
          )}
        </div>
      </div>

      {historyOpen && (
        <SeatingHistoryModal
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          roster={historyRoster}
          supabase={supabase}
        />
      )}
      {rotationOpen && selectedPrograms[0] && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white px-4 py-3 rounded-lg shadow text-sm text-slate-600 flex items-center gap-2">
                <IconLoader className="animate-spin text-indigo-600" size={16} />
                Cargando Rotación Anual...
              </div>
            </div>
          }
        >
          <AnnualRotationModal
            isOpen={rotationOpen}
            onClose={() => setRotationOpen(false)}
            currentProgram={selectedPrograms[0]}
            roster={[]}
            supabase={supabase}
          />
        </Suspense>
      )}
    </div>
  );
}

