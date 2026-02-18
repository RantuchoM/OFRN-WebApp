import React, { useState, useEffect, useMemo, useCallback } from "react";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import SearchableSelect from "../../components/ui/SearchableSelect";
import LocationSelectWithCreate from "../../components/forms/LocationSelectWithCreate";
import MultiSelect from "../../components/ui/MultiSelect";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  IconSave,
  IconLoader,
  IconCalendar,
  IconMusic,
  IconUsers,
  IconUserPlus,
  IconUserX,
  IconTrash,
} from "../../components/ui/Icons";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext"; // Importamos el contexto de autenticación

export default function IndependentRehearsalForm({
  supabase,
  onSuccess,
  onCancel,
  initialData = null,
  myEnsembles = [],
}) {
  const { isEditor, isManagement } = useAuth(); // Obtenemos los roles del usuario
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [programasOptions, setProgramasOptions] = useState([]);
  const [ensamblesOptions, setEnsamblesOptions] = useState([]);
  const [locationsOptions, setLocationsOptions] = useState([]);
  const [membersOptions, setMembersOptions] = useState([]);

  const [formData, setFormData] = useState({
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    id_locacion: "",
    descripcion: "",
    selectedProgramas: [],
    selectedEnsambles: [],
  });

  const [customAttendance, setCustomAttendance] = useState([]);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState("");

  const [initialSnapshot, setInitialSnapshot] = useState(null);

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    const currentSnapshot = {
      form: formData,
      attendance: customAttendance,
    };
    return JSON.stringify(initialSnapshot) !== JSON.stringify(currentSnapshot);
  }, [formData, customAttendance, initialSnapshot]);

  const handleSafeCancel = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onCancel();
    }
  };

  const fetchLocations = useCallback(async () => {
    const { data } = await supabase
      .from("locaciones")
      .select("id, nombre, localidades(localidad)")
      .order("nombre");
    setLocationsOptions(
      (data || []).map((l) => ({
        id: l.id,
        label: `${l.nombre} (${l.localidades?.localidad || "Sin localidad"})`,
        originalName: l.nombre,
      })),
    );
  }, [supabase]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];

        const [progsData, ensamblesData, locData, membersData] =
          await Promise.all([
            supabase
              .from("programas")
              .select("id, nombre_gira, fecha_desde, mes_letra, nomenclador")
              .gte("fecha_hasta", today)
              .order("fecha_desde", { ascending: true }),

            supabase.from("ensambles").select("id, ensamble").order("ensamble"),

            supabase
              .from("locaciones")
              .select("id, nombre, localidades(localidad)")
              .order("nombre"),

            supabase
              .from("integrantes")
              .select("id, nombre, apellido")
              .order("apellido"),
          ]);

        setProgramasOptions(
          (progsData.data || []).map((p) => ({
            id: p.id,
            label: `${p.mes_letra || "?"} | ${p.nomenclador || ""} - ${p.nombre_gira}`,
            subLabel: p.fecha_desde
              ? `Inicio: ${format(new Date(p.fecha_desde), "dd/MM/yyyy")}`
              : "Sin fecha",
          })),
        );

        const myIds = new Set(myEnsembles.map((e) => e.id));
        const sortedEns = (ensamblesData.data || []).sort((a, b) => {
          const aMine = myIds.has(a.id);
          const bMine = myIds.has(b.id);
          if (aMine && !bMine) return -1;
          if (!aMine && bMine) return 1;
          return a.ensamble.localeCompare(b.ensamble);
        });

        setEnsamblesOptions(
          sortedEns.map((e) => ({
            id: e.id,
            label: myIds.has(e.id) ? `★ ${e.ensamble}` : e.ensamble,
          })),
        );

        setLocationsOptions(
          (locData.data || []).map((l) => ({
            id: l.id,
            label: `${l.nombre} (${l.localidades?.localidad || "Sin localidad"})`,
            originalName: l.nombre,
          })),
        );

        setMembersOptions(
          (membersData.data || []).map((m) => ({
            id: m.id,
            label: `${m.apellido}, ${m.nombre}`,
          })),
        );

        let finalForm = {
          fecha: "",
          hora_inicio: "",
          hora_fin: "",
          id_locacion: "",
          descripcion: "",
          selectedEnsambles:
            myEnsembles.length === 1 ? [myEnsembles[0].id] : [],
          selectedProgramas: [],
        };
        let finalCustom = [];

        if (initialData) {
          const [relsEns, relsProg, relsCustom] = await Promise.all([
            supabase
              .from("eventos_ensambles")
              .select("id_ensamble")
              .eq("id_evento", initialData.id),
            supabase
              .from("eventos_programas_asociados")
              .select("id_programa")
              .eq("id_evento", initialData.id),
            supabase
              .from("eventos_asistencia_custom")
              .select(
                "id_integrante, tipo, nota, integrantes(nombre, apellido)",
              )
              .eq("id_evento", initialData.id),
          ]);

          finalForm = {
            fecha: initialData.fecha || "",
            hora_inicio: initialData.hora_inicio || "",
            hora_fin: initialData.hora_fin || "",
            id_locacion: initialData.id_locacion || "",
            descripcion: initialData.descripcion || "",
            selectedEnsambles: relsEns.data?.map((r) => r.id_ensamble) || [],
            selectedProgramas: relsProg.data?.map((r) => r.id_programa) || [],
          };

          finalCustom =
            relsCustom.data?.map((c) => ({
              id_integrante: c.id_integrante,
              tipo: c.tipo,
              nota: c.nota || "",
              label: `${c.integrantes?.apellido}, ${c.integrantes?.nombre}`,
            })) || [];
        }

        setFormData(finalForm);
        setCustomAttendance(finalCustom);
        setInitialSnapshot({ form: finalForm, attendance: finalCustom });
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [supabase, initialData, myEnsembles]);

  const handleAddCustom = (tipo) => {
    if (!selectedMemberToAdd) return;
    if (customAttendance.some((c) => c.id_integrante === selectedMemberToAdd)) {
      toast.warning("Este integrante ya está en la lista de excepciones.");
      return;
    }
    const memberObj = membersOptions.find((m) => m.id === selectedMemberToAdd);
    if (!memberObj) return;

    setCustomAttendance([
      ...customAttendance,
      {
        id_integrante: selectedMemberToAdd,
        tipo: tipo,
        label: memberObj.label,
        nota: "",
      },
    ]);
    setSelectedMemberToAdd("");
  };

  const handleRemoveCustom = (id_integrante) => {
    setCustomAttendance((prev) =>
      prev.filter((c) => c.id_integrante !== id_integrante),
    );
  };

  const handleDelete = async () => {
    if (!initialData) return;
    if (
      !confirm(
        "¿Estás seguro de eliminar este ensayo? Esta acción no se puede deshacer.",
      )
    )
      return;

    toast.promise(
      async () => {
        const { error } = await supabase
          .from("eventos")
          .delete()
          .eq("id", initialData.id);
        if (error) throw error;
        if (onSuccess) onSuccess();
      },
      {
        loading: "Eliminando ensayo...",
        success: "Ensayo eliminado correctamente",
        error: (err) => `Error al eliminar: ${err.message}`,
      },
    );
  };

  const handleSubmit = async () => {
    if (!formData.fecha) return toast.error("Falta la Fecha del ensayo.");
    if (!formData.hora_inicio) return toast.error("Falta la Hora de Inicio.");

    if (formData.hora_fin && formData.hora_fin <= formData.hora_inicio) {
      return toast.error("La hora de fin debe ser posterior a la de inicio.");
    }

    if (formData.selectedEnsambles.length === 0) {
      return toast.error("Selecciona al menos un ensamble base.");
    }

    // --- LÓGICA DE PERMISOS ACTUALIZADA ---
    const myIds = myEnsembles.map((e) => e.id);
    const hasMyEnsemble = formData.selectedEnsambles.some((id) =>
      myIds.includes(id),
    );

    // Si NO es editor ni admin, obligatoriamente debe incluir un ensamble propio
    if (!isEditor && !isManagement && !hasMyEnsemble) {
      return toast.error("Debes incluir al menos un ensamble que coordines.");
    }

    setLoading(true);

    toast.promise(
      async () => {
        let eventId = initialData?.id;

        const eventPayload = {
          fecha: formData.fecha,
          hora_inicio: formData.hora_inicio,
          hora_fin: formData.hora_fin || null,
          id_locacion: formData.id_locacion || null,
          id_gira: null,
          id_tipo_evento: 13,
          descripcion: formData.descripcion || "Ensayo de preparación",
        };

        if (initialData) {
          const { error } = await supabase
            .from("eventos")
            .update(eventPayload)
            .eq("id", eventId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("eventos")
            .insert([eventPayload])
            .select()
            .single();
          if (error) throw error;
          eventId = data.id;
        }

        if (initialData) {
          await Promise.all([
            supabase
              .from("eventos_programas_asociados")
              .delete()
              .eq("id_evento", eventId),
            supabase
              .from("eventos_ensambles")
              .delete()
              .eq("id_evento", eventId),
            supabase
              .from("eventos_asistencia_custom")
              .delete()
              .eq("id_evento", eventId),
          ]);
        }

        if (formData.selectedProgramas.length > 0) {
          const progsPayload = formData.selectedProgramas.map((progId) => ({
            id_evento: eventId,
            id_programa: progId,
          }));
          await supabase
            .from("eventos_programas_asociados")
            .insert(progsPayload);
        }

        if (formData.selectedEnsambles.length > 0) {
          const ensamblesPayload = formData.selectedEnsambles.map((ensId) => ({
            id_evento: eventId,
            id_ensamble: ensId,
          }));
          await supabase.from("eventos_ensambles").insert(ensamblesPayload);
        }

        if (customAttendance.length > 0) {
          const customPayload = customAttendance.map((item) => ({
            id_evento: eventId,
            id_integrante: item.id_integrante,
            tipo: item.tipo,
            nota: item.nota,
          }));
          await supabase
            .from("eventos_asistencia_custom")
            .insert(customPayload);
        }

        if (onSuccess) onSuccess();

        return initialData
          ? "Ensayo actualizado correctamente"
          : "Ensayo creado exitosamente";
      },
      {
        loading: "Guardando ensayo...",
        success: (msg) => {
          setLoading(false);
          return msg;
        },
        error: (err) => {
          setLoading(false);
          return `Error al guardar: ${err.message}`;
        },
      },
    );
  };

  if (initialLoading)
    return (
      <div className="p-10 flex justify-center">
        <IconLoader className="animate-spin text-indigo-600" />
      </div>
    );

  return (
    <>
      <div className="bg-white p-5 rounded-lg shadow-lg border border-slate-200 w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <IconCalendar className="text-indigo-600" />{" "}
            {initialData ? "Editar Ensayo" : "Nuevo Ensayo"}
          </h2>
          <button
            onClick={handleSafeCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            <span className="text-xs font-bold">ESC</span>
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Fecha
              </label>
              <DateInput
                value={formData.fecha}
                onChange={(v) => setFormData({ ...formData, fecha: v })}
                className="w-full border-slate-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Hora Inicio
              </label>
              <TimeInput
                value={formData.hora_inicio}
                onChange={(v) => setFormData({ ...formData, hora_inicio: v })}
                className="w-full border-slate-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Hora Fin
              </label>
              <TimeInput
                value={formData.hora_fin}
                onChange={(v) => setFormData({ ...formData, hora_fin: v })}
                className="w-full border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Lugar / Sala (Opcional)
            </label>
            <LocationSelectWithCreate
              supabase={supabase}
              options={locationsOptions}
              value={formData.id_locacion}
              onChange={(v) => setFormData({ ...formData, id_locacion: v })}
              onRefresh={fetchLocations}
              placeholder="Sin lugar asignado"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded border border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
              <IconMusic size={14} /> Convocatoria (Ensambles Base)
            </h3>
            <MultiSelect
              placeholder="Seleccionar ensambles..."
              options={ensamblesOptions}
              selectedIds={formData.selectedEnsambles}
              onChange={(ids) =>
                setFormData({ ...formData, selectedEnsambles: ids })
              }
            />
            <p className="text-[9px] text-slate-400 mt-1 ml-1">
              * Tus ensambles coordinados aparecen al principio marcados con ★
            </p>
          </div>

          <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
              <IconUsers size={14} /> Asistencia Particular
            </h3>
            <div className="flex gap-2 items-end mb-3">
              <div className="flex-1">
                <label className="text-[9px] text-slate-400 uppercase mb-1 block">
                  Buscar Integrante
                </label>
                <SearchableSelect
                  options={membersOptions}
                  value={selectedMemberToAdd}
                  onChange={setSelectedMemberToAdd}
                  placeholder="Escribe para buscar..."
                />
              </div>
              <button
                onClick={() => handleAddCustom("invitado")}
                disabled={!selectedMemberToAdd}
                className="h-[38px] px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 flex items-center gap-1 text-xs font-bold disabled:opacity-50"
              >
                <IconUserPlus size={14} /> Invitado
              </button>
              <button
                onClick={() => handleAddCustom("ausente")}
                disabled={!selectedMemberToAdd}
                className="h-[38px] px-3 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 flex items-center gap-1 text-xs font-bold disabled:opacity-50"
              >
                <IconUserX size={14} /> Ausente
              </button>
            </div>
            {customAttendance.length > 0 ? (
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {customAttendance.map((item, idx) => (
                  <div
                    key={`${item.id_integrante}-${idx}`}
                    className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${item.tipo === "invitado" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                      >
                        {item.tipo}
                      </span>
                      <span className="font-medium text-slate-700">
                        {item.label}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveCustom(item.id_integrante)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic text-center py-2 bg-slate-50 rounded border border-dashed border-slate-200">
                No hay excepciones cargadas.
              </div>
            )}
          </div>

          <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
            <h3 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-2">
              <IconMusic size={14} /> Repertorio / Preparación
            </h3>
            <MultiSelect
              placeholder="Vincular con Programas..."
              options={programasOptions}
              selectedIds={formData.selectedProgramas}
              onChange={(ids) =>
                setFormData({ ...formData, selectedProgramas: ids })
              }
            />
            <p className="text-[10px] text-emerald-600 mt-2 ml-1">
              * Se mostrará el repertorio de estos programas en la agenda.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Nota Pública
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="Ej: Solo cuerdas, traer atril..."
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100 items-center">
            {initialData ? (
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
              >
                <IconTrash size={14} /> Eliminar Ensayo
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSafeCancel}
                className="px-4 py-2 text-sm text-slate-600 font-bold hover:bg-slate-100 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <IconLoader className="animate-spin" />
                ) : (
                  <IconSave size={16} />
                )}
                {initialData ? "Guardar Cambios" : "Crear Ensayo"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={onCancel}
        title="Cambios sin guardar"
        message="Has modificado los datos del ensayo. Si sales ahora, se perderán todos los cambios que no hayas guardado."
        confirmText="Descartar y salir"
        cancelText="Continuar editando"
      />
    </>
  );
}
