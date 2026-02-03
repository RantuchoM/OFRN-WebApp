import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";

// --- UTILIDADES DE CÁLCULO INTERNAS ---
const calculateDaysDiff = (dSal, hSal, dLleg, hLleg) => {
    if (!dSal || !dLleg) return 0;
    const start = new Date(dSal + "T00:00:00");
    const end = new Date(dLleg + "T00:00:00");
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
  
    if (diffDays < 0) return 0;
    if (diffDays === 0) return 0.5;
  
    const getDepartureFactor = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(":").map(Number);
      const minutes = h * 60 + m;
      if (minutes <= 900) return 1.0;
      if (minutes <= 1260) return 0.75;
      return 0.0;
    };
    const getArrivalFactor = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(":").map(Number);
      const minutes = h * 60 + m;
      if (minutes <= 180) return 0.0;
      if (minutes <= 899) return 0.75;
      return 1.0;
    };
    return (
      Math.max(0, diffDays - 1) +
      getDepartureFactor(hSal || "12:00") +
      getArrivalFactor(hLleg || "12:00")
    );
};
  
const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const getAutoDatosLaborales = (persona) => {
    if (!persona) return { cargo: "", jornada: "" };
    const nombreCompleto = `${persona.apellido || ""} ${persona.nombre || ""}`.toUpperCase();
    const esEstable = persona.condicion === "Estable";
    let cargo = "Externo";
    if (nombreCompleto.includes("FRAILE")) cargo = "Subsecretario de la Orquesta Filarmónica de Río Negro";
    else if (nombreCompleto.includes("SPELZINI")) cargo = "Director de la Orquesta Filarmónica de Río Negro";
    else if (esEstable) cargo = "Agente administrativo";
    let jornada = "";
    if (nombreCompleto.includes("FRAILE") || nombreCompleto.includes("SPELZINI")) jornada = "8 A 14";
    else if (esEstable) jornada = "Horas Cátedra";
    return { cargo, jornada };
};

export function useViaticosIndividuales(supabase, giraId, roster, logisticsMap, config) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Estados de feedback visual (Sincronización celda por celda)
    const [updatingFields, setUpdatingFields] = useState(new Set());
    const [successFields, setSuccessFields] = useState(new Set());
    const [errorFields, setErrorFields] = useState(new Set());
    const [deletingRows, setDeletingRows] = useState(new Set());

    // --- CARGA INICIAL ---
    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            let { data: detalles, error } = await supabase
                .from("giras_viaticos_detalle")
                .select(`*, integrantes:id_integrante(id, nombre, apellido, mail, dni, firma, id_instr, documentacion, docred)`)
                .eq("id_gira", giraId)
                .order("id");
            
            if (error) throw error;
            setRows(detalles || []);
        } catch (err) {
            console.error("Error fetching viaticos rows:", err);
            toast.error("Error cargando viáticos individuales");
        } finally {
            setLoading(false);
        }
    }, [supabase, giraId]);

    // --- CÁLCULO DE FILAS ACTIVAS (MERGE CON ROSTER Y LOGISTICA) ---
    // Esta es la "magia" que antes hacía el Manager. Ahora el hook te devuelve la data lista para pintar.
    const activeRows = useMemo(() => {
        return rows.map((row) => {
            const enRoster = (roster || []).find((p) => String(p.id) === String(row.id_integrante));
            const esBajaLogica = !enRoster || enRoster.estado_gira === "ausente";
            
            let persona = enRoster;
            const rawIntegrantes = row.integrantes;
            const joinedPersona = Array.isArray(rawIntegrantes) ? rawIntegrantes[0] : rawIntegrantes;
            if (!persona && rawIntegrantes) persona = joinedPersona;
    
            const logData = logisticsMap[row.id_integrante];
            const fechaSal = logData?.fecha_salida || null;
            const horaSal = logData?.hora_salida || null;
            const fechaLleg = logData?.fecha_llegada || null;
            const horaLleg = logData?.hora_llegada || null;
    
            const diasAuto = calculateDaysDiff(fechaSal, horaSal, fechaLleg, horaLleg);
    
            const rowWithLogistics = {
              ...row,
              fecha_salida: fechaSal,
              hora_salida: horaSal,
              fecha_llegada: fechaLleg,
              hora_llegada: horaLleg,
              dias_computables: diasAuto,
            };
            
            // Cálculos financieros
            const base = parseFloat(config?.valor_diario_base || 0);
            const dias = parseFloat(rowWithLogistics.dias_computables || 0);
            const rawPct = row.porcentaje === 0 || row.porcentaje ? row.porcentaje : 100;
            const pct = parseFloat(String(rawPct).replace("%", "")) / 100;
            const basePorcentaje = round2(base * pct);
            const factorTempGlobal = parseFloat(config?.factor_temporada || 0);
            const valorDiarioCalc = round2(basePorcentaje * (1 + factorTempGlobal));
            const subtotal = round2(dias * valorDiarioCalc);
            
            const gastos =
              parseFloat(row.gastos_movilidad || 0) +
              parseFloat(row.gasto_combustible || 0) +
              parseFloat(row.gasto_otros || 0) +
              parseFloat(row.gastos_capacit || 0) +
              parseFloat(row.gastos_movil_otros || 0) +
              parseFloat(row.gasto_alojamiento || 0) +
              parseFloat(row.gasto_pasajes || 0) +
              parseFloat(row.transporte_otros || 0);
            
            const totalFinal = round2(subtotal + gastos);
    
            return {
              ...rowWithLogistics,
              nombre: persona?.nombre || "Desconocido",
              apellido: persona?.apellido || `(ID: ${row.id_integrante})`,
              rol_roster: persona?.rol_gira || persona?.rol || "",
              cargo: row.cargo || persona?.rol_gira || "Músico",
              firma: persona ? persona.firma : null,
              dni: persona ? persona.dni : null,
              legajo: persona ? persona.legajo : "",
              ciudad_origen: persona?.localidades?.localidad || "",
              mail: persona?.mail || "",
              link_documentacion: joinedPersona?.documentacion || "",
              link_docred: joinedPersona?.docred || "",
    
              noEstaEnRoster: esBajaLogica,
              valorDiarioCalc,
              subtotal,
              totalFinal,
            };
          })
          .sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
    }, [rows, roster, config, logisticsMap]);

    // --- ACCIONES ---

    const updateRow = async (id, field, value) => {
        const fieldKey = `${id}-${field}`;
        setUpdatingFields((prev) => new Set(prev).add(fieldKey));
        setErrorFields(prev => { const n = new Set(prev); n.delete(fieldKey); return n; });
    
        if (successFields.has(fieldKey)) {
          setSuccessFields((prev) => { const next = new Set(prev); next.delete(fieldKey); return next; });
        }
    
        // Optimistic UI Update
        const currentRow = rows.find((r) => r.id === id);
        if (!currentRow) return;
    
        let valueToSave = value;
        if (field === "porcentaje") {
          const cleanValue = String(value).replace("%", "").trim();
          valueToSave = cleanValue === "" ? 100 : parseFloat(cleanValue);
          if (isNaN(valueToSave)) valueToSave = 100;
        }
    
        const updatedRow = { ...currentRow, [field]: valueToSave };
        setRows((prev) => prev.map((r) => (r.id === id ? updatedRow : r)));
    
        try {
          const payload = { [field]: valueToSave };
          const { error } = await supabase.from("giras_viaticos_detalle").update(payload).eq("id", id);
    
          if (error) throw error;
    
          setSuccessFields((prev) => new Set(prev).add(fieldKey));
          setTimeout(() => {
            setSuccessFields((prev) => { const next = new Set(prev); next.delete(fieldKey); return next; });
          }, 2000);
        } catch (err) {
          console.error("Error al guardar:", err);
          setErrorFields((prev) => new Set(prev).add(fieldKey));
          // Revertir en caso de error crítico podría implementarse aquí recargando fetchRows
        } finally {
          setUpdatingFields((prev) => { const next = new Set(prev); next.delete(fieldKey); return next; });
        }
    };

    const deleteRow = async (id) => {
        if (!confirm(`¿Eliminar de la lista de viáticos?`)) return;
        setDeletingRows((prev) => new Set(prev).add(id));
        try {
          await supabase.from("giras_viaticos_detalle").delete().eq("id", id);
          setRows((prev) => prev.filter((r) => r.id !== id));
          toast.success("Eliminado correctamente");
        } catch (err) {
          console.error(err);
          toast.error("Error al eliminar");
        } finally {
          setDeletingRows((prev) => { const next = new Set(prev); next.delete(id); return next; });
        }
    };

    const addPerson = async (personId) => {
        if (!personId) return;
        setLoading(true);
        const persona = roster.find((p) => p.id === personId);
        if (!persona) { toast.error("Persona no encontrada en roster"); setLoading(false); return; }
        
        const { cargo, jornada } = getAutoDatosLaborales(persona);
        try {
          const { data, error } = await supabase
            .from("giras_viaticos_detalle")
            .insert([{
                id_gira: giraId,
                id_integrante: personId,
                dias_computables: 0,
                porcentaje: 100,
                cargo,
                jornada_laboral: jornada,
            }])
            .select();
          if (error) throw error;
          setRows((prev) => [...prev, ...data]);
          toast.success("Agregado correctamente");
        } catch (err) {
          toast.error("Error al agregar: " + err.message);
        } finally {
          setLoading(false);
        }
    };

    const addBatch = async (batchValues, selectionSet, clearSelection) => {
        setLoading(true);
        try {
            const updates = {};
            Object.keys(batchValues).forEach((key) => {
                const val = batchValues[key];
                if (val !== "" && val !== null && val !== false) {
                    if (key === "porcentaje") {
                        updates[key] = parseFloat(String(val).replace("%", "")) || 100;
                    } else {
                        updates[key] = val;
                    }
                }
            });

            if (Object.keys(updates).length === 0) {
                toast.warning("No has ingresado ningún valor.");
                return;
            }

            const selectedIds = Array.from(selectionSet);
            // Ejecutar promesas en paralelo
            const promises = selectedIds.map(async (integranteId) => {
                const row = rows.find((r) => r.id_integrante === integranteId);
                if (!row) return;
                await supabase.from("giras_viaticos_detalle").update(updates).eq("id", row.id);
            });

            await Promise.all(promises);
            await fetchRows(); // Recargar para asegurar consistencia
            clearSelection();
            toast.success("Cambios masivos aplicados");
        } catch (err) {
            console.error(err);
            toast.error("Error en edición masiva");
        } finally {
            setLoading(false);
        }
    };

    return {
        rows: activeRows, // Devolvemos las filas ya procesadas y listas para usar
        rawRows: rows,    // Devolvemos las crudas por si acaso
        loading,
        fetchRows,
        updateRow,
        deleteRow,
        addPerson,
        addBatch,
        feedback: { updatingFields, successFields, errorFields, deletingRows }
    };
}