import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { sumGastosViaticoRow } from "../../utils/viaticosAnticipo";
import {
  resolveAsientoHabitualViaticos,
  resolveCiudadOrigenViaticos,
} from "../../utils/integranteDomicilioViaticos";
import { scheduleFromParadaRange } from "../../utils/viaticosParadasIntegrante";
import { calculateDaysDiff } from "../../utils/viaticosDiasComputables";

export { calculateDaysDiff, explainViaticosDiasCalculation } from "../../utils/viaticosDiasComputables";

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const DETALLE_DB_FIELD_KEYS = [
  "id_gira",
  "id_integrante",
  "dias_computables",
  "porcentaje",
  "patente_oficial",
  "tipo_movilidad",
  "gasto_combustible",
  "gasto_otros",
  "gasto_alojamiento",
  "gastos_movilidad",
  "gastos_movil_otros",
  "gastos_capacit",
  "patente_particular",
  "check_aereo",
  "check_terrestre",
  "check_patente_oficial",
  "check_patente_particular",
  "check_otros",
  "transporte_otros",
  "cargo",
  "jornada_laboral",
  "rendicion_viaticos",
  "rendicion_gasto_alojamiento",
  "rendicion_gasto_otros",
  "rendicion_gasto_combustible",
  "rendicion_gastos_movil_otros",
  "rendicion_gastos_capacit",
  "rendicion_transporte_otros",
  "backup_fecha_salida",
  "backup_hora_salida",
  "backup_fecha_llegada",
  "backup_hora_llegada",
  "backup_dias_computables",
  "backup_viatico",
  "fecha_ultima_exportacion",
  "motivo",
  "lugar_comision",
  "anticipo_custom",
  "id_evento_parada_inicio",
  "id_evento_parada_fin",
  "tramo_orden",
  "etiqueta_tramo",
];

function pickDetalleForDb(row, overrides = {}) {
  const out = { ...overrides };
  DETALLE_DB_FIELD_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined) {
      out[key] = row[key];
    }
  });
  return out;
}

const getAutoDatosLaborales = (persona) => {
  if (!persona) return { cargo: "", jornada: "" };
  const nombreCompleto =
    `${persona.apellido || ""} ${persona.nombre || ""}`.toUpperCase();
  const esEstable = persona.condicion === "Estable";
  let cargo = "Externo";
  if (nombreCompleto.includes("FRAILE"))
    cargo = "Subsecretario de la Orquesta Filarmónica de Río Negro";
  else if (nombreCompleto.includes("SPELZINI"))
    cargo = "Director de la Orquesta Filarmónica de Río Negro";
  else if (esEstable) cargo = "Agente administrativo";
  let jornada = "";
  if (nombreCompleto.includes("FRAILE") || nombreCompleto.includes("SPELZINI"))
    jornada = "8 A 14";
  else if (esEstable) jornada = "Horas Cátedra";
  return { cargo, jornada };
};

export function useViaticosIndividuales(
  supabase,
  giraId,
  roster,
  logisticsMap,
  config,
  allEvents = [],
) {
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
      // AGREGAMOS: rol, cargo, jornada a la consulta de integrantes
      let { data: detalles, error } = await supabase
        .from("giras_viaticos_detalle")
        .select(
          `
                    *, 
                    integrantes:id_integrante(
                        id, nombre, apellido, mail, dni, firma, id_instr, 
                        documentacion, docred, link_declaracion, link_carnet, link_dni_img,
                        motivo, cargo, jornada
                    )
                `,
        )
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
    return rows
      .map((row) => {
        const enRoster = (roster || []).find(
          (p) => String(p.id) === String(row.id_integrante),
        );
        const esBajaLogica = !enRoster || enRoster.estado_gira === "ausente";

        let persona = enRoster;
        const rawIntegrantes = row.integrantes;
        const joinedPersona = Array.isArray(rawIntegrantes)
          ? rawIntegrantes[0]
          : rawIntegrantes;
        if (!persona && rawIntegrantes) persona = joinedPersona;

        const logData = logisticsMap[row.id_integrante];
        let fechaSal = logData?.fecha_salida || null;
        let horaSal = logData?.hora_salida || null;
        let fechaLleg = logData?.fecha_llegada || null;
        let horaLleg = logData?.hora_llegada || null;

        if (row.id_evento_parada_inicio && row.id_evento_parada_fin) {
          const tramoSched = scheduleFromParadaRange(
            allEvents,
            row.id_evento_parada_inicio,
            row.id_evento_parada_fin,
          );
          if (tramoSched) {
            fechaSal = tramoSched.fecha_salida;
            horaSal = tramoSched.hora_salida;
            fechaLleg = tramoSched.fecha_llegada;
            horaLleg = tramoSched.hora_llegada;
          }
        }

        const diasAuto = calculateDaysDiff(
          fechaSal,
          horaSal,
          fechaLleg,
          horaLleg,
        );

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
        const rawPct =
          row.porcentaje === 0 || row.porcentaje ? row.porcentaje : 100;
        const pct = parseFloat(String(rawPct).replace("%", "")) / 100;
        const basePorcentaje = round2(base * pct);
        const factorTempGlobal = parseFloat(config?.factor_temporada || 0);
        const valorDiarioCalc = round2(basePorcentaje * (1 + factorTempGlobal));
        const subtotal = round2(dias * valorDiarioCalc);
        const anticipoParaTotal =
          row.anticipo_custom != null && row.anticipo_custom !== ""
            ? round2(parseFloat(row.anticipo_custom))
            : subtotal;

        const gastos = sumGastosViaticoRow(row);

        const totalFinal = round2(anticipoParaTotal + gastos);
        const ciudadOrigen = resolveCiudadOrigenViaticos(persona, row);
        const asientoHabitual = resolveAsientoHabitualViaticos(persona, row);

        return {
          ...rowWithLogistics,
          nombre: persona?.nombre || "Desconocido",
          apellido: persona?.apellido || `(ID: ${row.id_integrante})`,
          rol_roster: persona?.rol_gira || persona?.rol || "",
          cargo: row.cargo || persona?.rol_gira || "Músico",
          firma: persona ? persona.firma : null,
          dni: persona ? persona.dni : null,
          legajo: persona ? persona.legajo : "",
          ciudad_origen: ciudadOrigen,
          asiento_habitual: asientoHabitual,
          mail: persona?.mail || "",
          link_documentacion: joinedPersona?.documentacion || "",
          link_docred: joinedPersona?.docred || "",
          link_declaracion: joinedPersona?.link_declaracion || "",

          noEstaEnRoster: esBajaLogica,
          valorDiarioCalc,
          subtotal,
          anticipoParaTotal,
          totalFinal,
        };
      })
      .sort((a, b) => {
        const byName = (a.apellido || "").localeCompare(b.apellido || "");
        if (byName !== 0) return byName;
        return (a.tramo_orden || 1) - (b.tramo_orden || 1);
      });
  }, [rows, roster, config, logisticsMap, allEvents]);

  // --- ACCIONES ---

  const updateRow = async (id, field, value) => {
    const fieldKey = `${id}-${field}`;
    setUpdatingFields((prev) => new Set(prev).add(fieldKey));
    setErrorFields((prev) => {
      const n = new Set(prev);
      n.delete(fieldKey);
      return n;
    });

    if (successFields.has(fieldKey)) {
      setSuccessFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
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
    if (field === "anticipo_custom") {
      if (value === null || value === "" || value === undefined) {
        valueToSave = null;
      } else {
        const n = parseFloat(value);
        valueToSave = Number.isFinite(n) ? round2(n) : null;
      }
    }

    const updatedRow = { ...currentRow, [field]: valueToSave };
    setRows((prev) => prev.map((r) => (r.id === id ? updatedRow : r)));

    try {
      const payload = { [field]: valueToSave };
      const { error } = await supabase
        .from("giras_viaticos_detalle")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      setSuccessFields((prev) => new Set(prev).add(fieldKey));
      setTimeout(() => {
        setSuccessFields((prev) => {
          const next = new Set(prev);
          next.delete(fieldKey);
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error("Error al guardar:", err);
      const hint =
        field === "anticipo_custom"
          ? " ¿Ejecutaste la migración SQL (columna anticipo_custom en giras_viaticos_detalle)?"
          : "";
      const msg =
        err?.message ||
        err?.details ||
        err?.hint ||
        (typeof err === "string" ? err : JSON.stringify(err));
      toast.error(`No se guardó: ${msg}${hint}`);
      setErrorFields((prev) => new Set(prev).add(fieldKey));
      await fetchRows();
    } finally {
      setUpdatingFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
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
      setDeletingRows((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const addPerson = async (idIntegrante) => {
        // 1. Buscamos en el ROSTER (que ahora ya trae los campos gracias al fix anterior)
        const person = roster.find(p => p.id === idIntegrante);
        
        if (!person) return;

        // 2. Definimos los valores iniciales (Snapshot)
        // Prioridad: El campo 'cargo' directo de DB > rol_gira > rol
        const cargoInicial = person.cargo || person.rol_gira || person.rol || "";
        // Prioridad: El campo 'jornada' directo de DB > 'jornada_laboral' si existiera
        const jornadaInicial = person.jornada || person.jornada_laboral || ""; 
        const motivoInicial = person.motivo || ""; 

        const { error } = await supabase.from("giras_viaticos_detalle").insert({
            id_gira: giraId,
            id_integrante: idIntegrante,
            
            // 3. Guardamos los valores recuperados
            cargo: cargoInicial,
            jornada_laboral: jornadaInicial, // Asegúrate que en DB la columna se llame 'jornada_laboral' o 'jornada' y ajusta aquí
            motivo: motivoInicial, 
            
            // Valores por defecto financieros
            dias_computables: 0,
            porcentaje: 100
        });
        
        if (error) {
            console.error("Error al agregar persona:", error);
            toast.error("Error al agregar integrante");
        } else {
            fetchRows(); 
            toast.success("Integrante agregado (Datos importados)");
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
      const promises = selectedIds.map(async (rowId) => {
        const row = rows.find((r) => String(r.id) === String(rowId));
        if (!row) return;
        await supabase
          .from("giras_viaticos_detalle")
          .update(updates)
          .eq("id", row.id);
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

  const isMissingTramoColumnError = (err) => {
    const text = `${err?.message || ""} ${err?.details || ""} ${err?.hint || ""}`.toLowerCase();
    if (!text.includes("column")) return false;
    return (
      text.includes("does not exist") ||
      text.includes("no existe") ||
      text.includes("schema cache") ||
      text.includes("parada") ||
      text.includes("tramo_orden") ||
      text.includes("etiqueta_tramo")
    );
  };

  const stripTramoFields = (payload) => {
    const {
      id_evento_parada_inicio: _a,
      id_evento_parada_fin: _b,
      tramo_orden: _c,
      etiqueta_tramo: _d,
      ...rest
    } = payload;
    return rest;
  };

  const insertViaticoDetalleRows = async (payloads) => {
    let res = await supabase
      .from("giras_viaticos_detalle")
      .insert(payloads)
      .select("id");
    if (res.error && isMissingTramoColumnError(res.error)) {
      res = await supabase
        .from("giras_viaticos_detalle")
        .insert(payloads.map(stripTramoFields))
        .select("id");
      if (!res.error) {
        toast.warning(
          "Filas creadas sin tramos/paradas: aplicá la migración 20260602120000 en Supabase.",
        );
      }
    }
    return res;
  };

  const reinsertViaticoDetalle = async (row) => {
    const payload = stripTramoFields(
      pickDetalleForDb(row, {
        id_gira: giraId,
        id_integrante: row.id_integrante,
      }),
    );
    return supabase.from("giras_viaticos_detalle").insert(payload).select("id");
  };

  /** Recuperar fila perdida (p. ej. tras fallo de desdoble anterior). */
  const restoreViaticoRow = async (rowSnapshot) => {
    if (!rowSnapshot?.id_integrante) return;
    setLoading(true);
    try {
      const { error } = await reinsertViaticoDetalle(rowSnapshot);
      if (error) throw error;
      await fetchRows();
      toast.success("Fila de viático restaurada");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.message ||
          "No se pudo restaurar. Usá «Agregar…» para volver a cargar a la persona.",
      );
    } finally {
      setLoading(false);
    }
  };

  const splitBackupKey = `viatico_split_backup_${giraId}`;

  const splitViaticoRow = async (originalRow, tramosPreview) => {
    if (!originalRow?.id || !tramosPreview?.length) return;
    setLoading(true);
    let insertedIds = [];
    let originalDeleted = false;

    try {
      sessionStorage.setItem(
        splitBackupKey,
        JSON.stringify(pickDetalleForDb(originalRow)),
      );
      const baseFields = {
        id_gira: giraId,
        id_integrante: originalRow.id_integrante,
        cargo: originalRow.cargo,
        jornada_laboral: originalRow.jornada_laboral,
        motivo: originalRow.motivo,
        lugar_comision: originalRow.lugar_comision,
        porcentaje: originalRow.porcentaje ?? 100,
        gastos_movilidad: originalRow.gastos_movilidad,
        gasto_combustible: originalRow.gasto_combustible,
        gasto_alojamiento: originalRow.gasto_alojamiento,
        gasto_otros: originalRow.gasto_otros,
        gastos_movil_otros: originalRow.gastos_movil_otros,
        gastos_capacit: originalRow.gastos_capacit,
        check_aereo: originalRow.check_aereo,
        check_terrestre: originalRow.check_terrestre,
        check_patente_oficial: originalRow.check_patente_oficial,
        check_patente_particular: originalRow.check_patente_particular,
        transporte_otros: originalRow.transporte_otros,
        anticipo_custom: null,
      };

      const zeroGastos = {
        gastos_movilidad: 0,
        gasto_combustible: 0,
        gasto_alojamiento: 0,
        gasto_otros: 0,
        gastos_movil_otros: 0,
        gastos_capacit: 0,
        rendicion_viaticos: 0,
        rendicion_gasto_alojamiento: 0,
        rendicion_gasto_otros: 0,
        rendicion_gasto_combustible: 0,
        rendicion_gastos_movil_otros: 0,
        rendicion_gastos_capacit: 0,
        rendicion_transporte_otros: 0,
      };

      const payloads = tramosPreview.map((t, idx) => ({
        ...baseFields,
        ...(idx > 0 ? zeroGastos : {}),
        tramo_orden: t.tramo_orden ?? idx + 1,
        etiqueta_tramo: t.etiqueta_tramo || `Tramo ${idx + 1}`,
        id_evento_parada_inicio: t.id_evento_parada_inicio ?? null,
        id_evento_parada_fin: t.id_evento_parada_fin ?? null,
        anticipo_custom:
          idx === 0 && originalRow.anticipo_custom != null
            ? originalRow.anticipo_custom
            : null,
      }));

      const { data: inserted, error: insErr } =
        await insertViaticoDetalleRows(payloads);
      if (insErr) throw insErr;
      insertedIds = (inserted || []).map((r) => r.id).filter(Boolean);
      if (insertedIds.length !== payloads.length) {
        throw new Error("No se pudieron crear todas las filas del desdoble.");
      }

      const { error: delErr } = await supabase
        .from("giras_viaticos_detalle")
        .delete()
        .eq("id", originalRow.id);
      if (delErr) throw delErr;
      originalDeleted = true;

      sessionStorage.removeItem(splitBackupKey);
      await fetchRows();
      toast.success(`Viático desdoblado en ${payloads.length} filas`);
    } catch (err) {
      console.error(err);

      if (insertedIds.length > 0) {
        await supabase
          .from("giras_viaticos_detalle")
          .delete()
          .in("id", insertedIds);
        insertedIds = [];
      }

      if (originalDeleted) {
        const { error: restoreErr } = await reinsertViaticoDetalle(originalRow);
        if (restoreErr) {
          toast.error(
            "Se perdió la fila de viático. Volvé a agregar a la persona con «Agregar…».",
            { duration: 8000 },
          );
        } else {
          toast.warning(
            "No se pudo desdoblar; se restauró la fila original.",
            { duration: 6000 },
          );
        }
      } else {
        const raw =
          err?.message ||
          err?.details ||
          err?.hint ||
          "Error al desdoblar.";
        const isDuplicatePersona =
          String(raw).includes("giras_viaticos_detalle_id_gira_id_integrante") ||
          String(raw).includes("duplicate key");
        const msg = isDuplicatePersona
          ? "La base de datos solo permite un viático por persona. Ejecutá la migración 20260602130000_viaticos_detalle_allow_multi_tramo en Supabase."
          : raw;
        toast.error(msg, { duration: 10000 });
      }

      await fetchRows();
    } finally {
      setLoading(false);
    }
  };

  return {
    rows: activeRows,
    rawRows: rows,
    loading,
    fetchRows,
    updateRow,
    deleteRow,
    addPerson,
    addBatch,
    splitViaticoRow,
    restoreViaticoRow,
    feedback: { updatingFields, successFields, errorFields, deletingRows },
  };
}
