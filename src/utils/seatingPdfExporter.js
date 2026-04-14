import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { sortSeatingItems } from "../services/giraService";

// --- CONSTANTES ---
const EXCLUDED_ROLES = [
  "staff", "produccion", "producción", "chofer", "archivo", 
  "utilero", "asistente", "iluminador", "sonido", "acompañante"
];

// Identifica si un instrumento es cuerda (01=Vln1, 02=Vln2, 03=Vla, 04=Vlc)
const isString = (id) => ["01", "02", "03", "04"].includes(String(id).padStart(2, '0'));

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

    const [contsRes, itemsRes, assignsRes, partsRes] = await Promise.all([
      supabase.from("seating_contenedores").select("*").eq("id_programa", gira.id).order("orden"),
      supabase
        .from("seating_contenedores_items")
        .select("*, integrantes(nombre, apellido)")
        .order("atril_num", { ascending: true, nullsFirst: true })
        .order("lado", { ascending: true, nullsFirst: true })
        .order("orden", { ascending: true, nullsFirst: true })
        .order("id", { ascending: true }),
      supabase.from("seating_asignaciones").select("*").eq("id_programa", gira.id),
      supabase.from("obras_particellas").select("id, nombre_archivo").in("id_obra", workIds)
    ]);

    if (contsRes.error) throw contsRes.error;
    if (itemsRes.error) throw itemsRes.error;

    const conts = contsRes.data || [];
    const items = itemsRes.data || [];
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

    // 3. TABLA 1: DISPOSICIÓN (Cuerdas)
    // Filtramos items válidos para esta gira
    const validItems = items.filter(i => conts.some(c => c.id === i.id_contenedor));
    const maxRows = Math.max(...conts.map(c => validItems.filter(i => i.id_contenedor === c.id).length || 0), 0);
    
    const containerHeaders = conts.map((c) => c.nombre.toUpperCase());
    const containerBody = [];

    for (let i = 0; i < maxRows; i++) {
      containerBody.push(
        conts.map((c) => {
          const groupItems = sortSeatingItems(
            validItems.filter((item) => item.id_contenedor === c.id),
          );
          const item = groupItems[i];
          if (!item?.integrantes) return "";
          return `${item.integrantes.apellido}, ${item.integrantes.nombre}.` || "";
        })
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

    // 4. TABLA 2: ASIGNACIÓN DE PARTICELLAS (Vientos y Otros)
    const finalY = doc.lastAutoTable.finalY;
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

    // IDs de músicos que YA están en la tabla de cuerdas (para no repetirlos)
    // Importante: normalizar a String para comparación segura
    const stringMusicianIds = new Set(validItems.map(i => String(i.id_musico || i.id_integrante)));

    const otherMusicians = roster
      .filter((m) => {
        // Normalización
        const role = (m.rol_gira || m.rol || "musico").toLowerCase().trim();
        const instrId = String(m.id_instr || "9999").padStart(2, '0');
        const mId = String(m.id_integrante || m.id);

        // A. Estado activo
        if (m.estado_gira === "ausente" || m.estado_gira === "baja") return false;
        
        // B. Roles Excluidos (Acompañante, Staff, etc.)
        if (EXCLUDED_ROLES.includes(role)) return false;
        
        // C. Filtro Instrumento: Si es Cuerda (01-04), lo excluimos PERO...
        // D. ...la validación final es si YA está en la tabla de arriba (Seating).
        // Esto cubre casos donde un "Violinista" toque percusión o viceversa.
        if (stringMusicianIds.has(mId)) return false;

        // Doble chequeo: Si por alguna razón no estaba en el seating pero es cuerda (01-04), 
        // generalmente NO debería estar en la tabla de vientos, salvo que sea un extra sin atril asignado.
        // Si quieres ser estricto con la vista técnica:
        if (isString(instrId)) return false; 

        return true;
      })
      .sort((a, b) => {
        // Ordenar por ID de instrumento (01, 02... 05, 06...) y luego apellido
        // id_instr viene como string "05", "10", etc.
        const instrA = a.id_instr || "9999";
        const instrB = b.id_instr || "9999";
        
        if (instrA !== instrB) return instrA.localeCompare(instrB);
        return (a.apellido || "").localeCompare(b.apellido || "");
      });

    const tableHeaders = [["Músico", ...obrasList.map(o => `${truncate(cleanHTML(o.composer), 10)}\n${truncate(cleanHTML(o.title), 12)}`)]];

    const tableBody = otherMusicians.map((m) => {
      const row = [`${m.apellido}, ${m.nombre}`];
      obrasList.forEach((o) => {
        // Buscar asignación
        const assign = assigns.find(a => 
          String(a.id_obra) === String(o.obra_id) && 
          a.id_musicos_asignados?.some(id => String(id) === String(m.id_integrante || m.id))
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