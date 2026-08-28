import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { sortSeatingItems } from "../services/giraService";
import { integranteKey } from "./integranteIds";
import {
  confirmedSeatingRosterKeySet,
  isConfirmedConvocadoForSeatingReports,
  isMusicianOnConfirmedSeatingRoster,
} from "./seatingRosterGate";
import {
  didParseCellSeatingStringsStandPairs,
  seatingStringsGridEvenRowCount,
} from "./seatingPdfStringsTableHooks";
import { sortWindMusiciansForSeating } from "./seatingWindOrder";
import { fetchCuerdasDispositionGroups } from "./seatingCuerdasConfig";

// Identifica si un instrumento es cuerda (códigos tal cual en BD; sin forzar "1"→"01")
const isStringInstrument = (id) =>
  ["01", "02", "03", "04"].includes(String(id ?? "").trim());

const cleanHTML = (str) => typeof str === "string" ? str.replace(/<[^>]*>?/gm, "") : "";
const truncate = (str, n) => str && str.length > n ? str.substr(0, n - 1) + "..." : str;

const getComposerName = (obra) => {
  if (obra.obras_compositores?.length > 0) {
    const comps = obra.obras_compositores
      .filter(oc => oc.rol === "compositor" && oc.compositores)
      .map(oc => oc.compositores);
    if (comps.length > 0) return comps.map(c => `${c.nombre} ${c.apellido}`).join("\n");
  }
  return "Autor Desconocido";
};

const appendDispositionTable = (doc, containers, validItems, startY, title) => {
  if (title) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, startY);
    startY += 4;
  }
  const rawMaxRows = Math.max(
    ...containers.map(
      (c) => validItems.filter((i) => i.id_contenedor === c.id).length || 0,
    ),
    0,
  );
  const maxRows = seatingStringsGridEvenRowCount(rawMaxRows);
  const containerHeaders = containers.map((c) => c.nombre.toUpperCase());
  const containerBody = [];
  for (let i = 0; i < maxRows; i++) {
    containerBody.push(
      containers.map((c) => {
        const groupItems = sortSeatingItems(
          validItems.filter((item) => item.id_contenedor === c.id),
        );
        const item = groupItems[i];
        if (!item?.integrantes) return "";
        return `${item.integrantes.apellido}, ${item.integrantes.nombre}.` || "";
      }),
    );
  }
  autoTable(doc, {
    startY,
    head: [containerHeaders],
    body: containerBody,
    theme: "grid",
    styles: { fontSize: 6.5, cellPadding: 0.6, halign: "center" },
    headStyles: { fillColor: [63, 81, 181], textColor: 255 },
    margin: { left: 14, right: 14 },
    didParseCell: didParseCellSeatingStringsStandPairs,
  });
  return doc.lastAutoTable.finalY;
};

/**
 * Genera el reporte PDF de Seating.
 * @param {Object} supabase - Cliente Supabase
 * @param {Object} gira - Datos de la gira
 * @param {Array} localRepertorio - Estructura del repertorio
 * @param {Array} roster - Lista de músicos YA PROCESADA por useGiraRoster
 */
export const generateSeatingPdf = async (supabase, gira, localRepertorio, roster) => {
  try {
    // 1. CARGA DE DATOS DE SEATING (Contenedores y Asignaciones)
    const workIds = localRepertorio
      .flatMap(r => r.repertorio_obras?.map(o => o.obras.id))
      .filter(Boolean);

    const [disposition, assignsRes, partsRes] = await Promise.all([
      fetchCuerdasDispositionGroups(supabase, gira.id),
      supabase.from("seating_asignaciones").select("*").eq("id_programa", gira.id),
      supabase.from("obras_particellas").select("id, nombre_archivo").in("id_obra", workIds)
    ]);

    const groups = disposition.groups || [];
    const conts = groups.flatMap((g) => g.containers);
    const assigns = assignsRes.data || [];
    const allParts = partsRes.data || [];

    if (conts.length === 0) {
      alert("No hay grupos de Seating guardados para generar el PDF.");
      return;
    }

    // 2. INICIO PDF
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Seating | ${gira?.mes_letra || ""} - ${gira?.nomenclador || ""}. ${gira?.nombre_gira || ""}`, 14, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 16);
    doc.line(14, 18, 196, 18);

    // 3. TABLA(S) DISPOSICIÓN: una por config de cuerdas
    const rosterKeys = confirmedSeatingRosterKeySet(roster);
    let cursorY = 22;
    const multi = groups.length > 1;
    const allStringItems = [];
    for (const { config, containers } of groups) {
      if (!containers.length) continue;
      const flatItems = containers.flatMap((c) => c.items || []);
      const validItems = flatItems.filter((i) =>
        isMusicianOnConfirmedSeatingRoster(rosterKeys, i.id_musico),
      );
      allStringItems.push(...validItems);
      const title = multi
        ? `Disposición · ${config.nombre || "Cuerdas"}`
        : null;
      if (multi && cursorY > 22) {
        doc.addPage();
        cursorY = 16;
      }
      cursorY = appendDispositionTable(
        doc,
        containers,
        validItems,
        cursorY,
        title,
      );
      cursorY += 6;
    }

    // 4. TABLA 2: ASIGNACIÓN DE PARTICELLAS (Vientos y Otros)
    const finalY = doc.lastAutoTable?.finalY ?? cursorY;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Asignación de Particellas (Vientos y Otros)", 14, finalY + 8);

    const obrasList = localRepertorio.flatMap(block => 
      block.repertorio_obras?.map(ro => ({
        obra_id: ro.obras.id,
        title: ro.obras.titulo,
        composer: getComposerName(ro.obras)
      }))
    ).filter(Boolean);

    const stringMusicianIds = new Set(
      allStringItems.map((i) => integranteKey(i.id_musico ?? i.id_integrante)),
    );

    const otherMusicians = sortWindMusiciansForSeating(
      roster.filter((m) => {
        if (!isConfirmedConvocadoForSeatingReports(m)) return false;
        const instrId = String(m.id_instr ?? "").trim();
        const mId = integranteKey(m.id);
        if (stringMusicianIds.has(mId)) return false;
        if (isStringInstrument(instrId)) return false;
        return true;
      }),
      {
        obras: obrasList,
        particellas: allParts,
        getPartIdsForObra: (musicianId, obraId) => {
          const mid = integranteKey(musicianId);
          const assign = assigns.find(
            (a) =>
              String(a.id_obra) === String(obraId) &&
              a.id_musicos_asignados?.some((id) => integranteKey(id) === mid),
          );
          return assign?.id_particella ? [assign.id_particella] : [];
        },
      },
    );

    const tableHeaders = [["Músico", ...obrasList.map(o => `${truncate(cleanHTML(o.composer), 10)}\n${truncate(cleanHTML(o.title), 12)}`)]];

    const tableBody = otherMusicians.map((m) => {
      const row = [`${m.apellido}, ${m.nombre}`];
      obrasList.forEach((o) => {
        // Buscar asignación
        const mid = integranteKey(m.id_integrante ?? m.id);
        const assign = assigns.find(
          (a) =>
            String(a.id_obra) === String(o.obra_id) &&
            a.id_musicos_asignados?.some(
              (id) => integranteKey(id) === mid,
            ),
        );
        
        const pName = allParts.find(p => String(p.id) === String(assign?.id_particella))?.nombre_archivo;
        row.push(pName || "-");
      });
      return row;
    });

    autoTable(doc, {
      startY: finalY + 12,
      head: tableHeaders,
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 6, cellPadding: 0.8, halign: "center", valign: "middle", overflow: "linebreak" },
      headStyles: { fillColor: [30, 41, 59], halign: "center" },
      columnStyles: { 0: { fontStyle: "bold", fillColor: [245, 245, 245], halign: "left" } },
      margin: { left: 14, right: 14 },
      pageBreak: "avoid",
    });

    doc.save(`Seating_${gira.nomenclador}_Reporte.pdf`);

  } catch (err) {
    console.error("Error generando PDF Seating:", err);
    alert("Error al generar el reporte: " + err.message);
  }
};