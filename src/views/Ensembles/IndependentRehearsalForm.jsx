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
  IconChevronDown,
} from "../../components/ui/Icons";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { integranteKey } from "../../utils/integranteIds";
import {
  buildRehearsalFormFromEvent,
  eventHasEmbeddedRelations,
} from "../../utils/rehearsalProgramas";
import { useRehearsalProgramasOptions } from "../../hooks/useRehearsalProgramasOptions";
import RepertorioPreparacionSelect from "../../components/ensembles/RepertorioPreparacionSelect";

function mapLocationsOptions(data) {
  return (data || []).map((l) => ({
    id: l.id,
    label: `${l.nombre} (${l.localidades?.localidad || "Sin localidad"})`,
    originalName: l.nombre,
  }));
}

function mapEnsamblesOptions(data, myEnsembles) {
  const myIds = new Set((myEnsembles || []).map((e) => e.id));
  const sortedEns = [...(data || [])].sort((a, b) => {
    const aMine = myIds.has(a.id);
    const bMine = myIds.has(b.id);
    if (aMine && !bMine) return -1;
    if (!aMine && bMine) return 1;
    return a.ensamble.localeCompare(b.ensamble);
  });
  return sortedEns.map((e) => ({
    id: e.id,
    label: myIds.has(e.id) ? `★ ${e.ensamble}` : e.ensamble,
  }));
}

function mapMembersOptions(data) {
  return (data || []).map((m) => ({
    id: m.id,
    label: `${m.apellido}, ${m.nombre}`,
  }));
}

function optionLabel(options, id) {
  const option = (options || []).find((opt) => String(opt.id) === String(id));
  return option?.label || `#${id}`;
}

const SelectionChips = ({ ids = [], options = [], emptyLabel = "Sin selección" }) => {
  if (!ids.length) {
    return (
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded-full border border-dashed border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400">
          {emptyLabel}
        </span>
      </div>
    );
  }

  const visibleIds = ids.slice(0, 3);
  const hiddenCount = ids.length - visibleIds.length;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {visibleIds.map((id) => (
        <span
          key={id}
          className="max-w-full truncate rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700"
          title={optionLabel(options, id)}
        >
          {optionLabel(options, id)}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
};

const AttendanceChips = ({ items = [] }) => {
  if (!items.length) {
    return (
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded-full border border-dashed border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400">
          Sin excepciones
        </span>
      </div>
    );
  }

  const invitados = items.filter((item) => item.tipo === "invitado").length;
  const ausentes = items.filter((item) => item.tipo === "ausente").length;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {invitados > 0 && (
        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          {invitados} invitado{invitados === 1 ? "" : "s"}
        </span>
      )}
      {ausentes > 0 && (
        <span className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
          {ausentes} ausente{ausentes === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
};

const MobileCollapsibleSection = ({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  summary,
  children,
  className = "",
}) => (
  <section className={`rounded border border-slate-200 p-3 ${className}`}>
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-2 text-left"
      aria-expanded={isOpen}
    >
      <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-700">
        <Icon size={14} className="shrink-0" />
        <span className="truncate">{title}</span>
      </span>
      <IconChevronDown
        size={14}
        className={`shrink-0 text-slate-400 transition-transform md:hidden ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </button>
    {summary}
    <div className={`${isOpen ? "block" : "hidden"} md:block mt-2`}>
      {children}
    </div>
  </section>
);

export default function IndependentRehearsalForm({
  supabase,
  onSuccess,
  onCancel,
  initialData = null,
  myEnsembles = [],
  /** Pre-cargados desde Coordinación (caché compartida, evita recalcular rosters). */
  programasOptions: programasOptionsProp = null,
  locationsOptions: locationsOptionsProp = null,
  membersOptions: membersOptionsProp = null,
  ensamblesOptions: ensamblesOptionsProp = null,
  activeMemberIds = null,
}) {
  const { isEditor, isManagement } = useAuth();
  const [loading, setLoading] = useState(false);
  const [staticLoading, setStaticLoading] = useState(
    () =>
      !locationsOptionsProp || !membersOptionsProp || !ensamblesOptionsProp,
  );
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [ensamblesOptions, setEnsamblesOptions] = useState(
    ensamblesOptionsProp || [],
  );
  const [locationsOptions, setLocationsOptions] = useState(
    locationsOptionsProp || [],
  );
  const [membersOptions, setMembersOptions] = useState(
    membersOptionsProp || [],
  );

  const seeded = useMemo(
    () => buildRehearsalFormFromEvent(initialData, myEnsembles),
    [initialData, myEnsembles],
  );

  const [formData, setFormData] = useState(seeded.form);
  const [customAttendance, setCustomAttendance] = useState(
    seeded.customAttendance,
  );
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState("");
  const [mobileSectionsOpen, setMobileSectionsOpen] = useState({
    convocatoria: false,
    asistencia: false,
    repertorio: false,
  });

  const { data: programasFromQuery = [], isLoading: programasQueryLoading, memberIds: resolvedMemberIds } =
    useRehearsalProgramasOptions(supabase, {
      memberIds: activeMemberIds,
      myEnsembles,
      enabled: programasOptionsProp == null,
    });

  const programasOptions = programasOptionsProp ?? programasFromQuery;
  const programasLoading =
    programasOptionsProp == null && programasQueryLoading;

  const activeMembersSet = useMemo(() => {
    const ids = activeMemberIds?.length ? activeMemberIds : resolvedMemberIds;
    return new Set((ids || []).map((id) => integranteKey(id)).filter(Boolean));
  }, [activeMemberIds, resolvedMemberIds]);

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

  const toggleMobileSection = (section) => {
    setMobileSectionsOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const fetchLocations = useCallback(async () => {
    const { data } = await supabase
      .from("locaciones")
      .select("id, nombre, localidades(localidad)")
      .order("nombre");
    setLocationsOptions(mapLocationsOptions(data));
  }, [supabase]);

  useEffect(() => {
    setFormData(seeded.form);
    setCustomAttendance(seeded.customAttendance);
  }, [seeded]);

  useEffect(() => {
    let cancelled = false;

    const loadStaticAndRelations = async () => {
      const needsStatic =
        !locationsOptionsProp || !membersOptionsProp || !ensamblesOptionsProp;
      const needsRelationFetch =
        initialData?.id && !eventHasEmbeddedRelations(initialData);

      if (!needsStatic && !needsRelationFetch) {
        setInitialSnapshot({
          form: seeded.form,
          attendance: seeded.customAttendance,
        });
        setStaticLoading(false);
        return;
      }

      if (needsStatic) setStaticLoading(true);

      try {
        const staticPromise = needsStatic
          ? Promise.all([
              ensamblesOptionsProp
                ? Promise.resolve(null)
                : supabase.from("ensambles").select("id, ensamble").order("ensamble"),
              locationsOptionsProp
                ? Promise.resolve(null)
                : supabase
                    .from("locaciones")
                    .select("id, nombre, localidades(localidad)")
                    .order("nombre"),
              membersOptionsProp
                ? Promise.resolve(null)
                : supabase
                    .from("integrantes")
                    .select("id, nombre, apellido")
                    .order("apellido"),
            ])
          : Promise.resolve([null, null, null]);

        const relationPromise = needsRelationFetch
          ? Promise.all([
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
            ])
          : Promise.resolve(null);

        const [[ensamblesRes, locRes, memRes], relationRes] = await Promise.all([
          staticPromise,
          relationPromise,
        ]);

        if (cancelled) return;

        if (needsStatic) {
          if (ensamblesRes?.data) {
            setEnsamblesOptions(
              mapEnsamblesOptions(ensamblesRes.data, myEnsembles),
            );
          }
          if (locRes?.data) setLocationsOptions(mapLocationsOptions(locRes.data));
          if (memRes?.data) setMembersOptions(mapMembersOptions(memRes.data));
        }

        let finalForm = seeded.form;
        let finalCustom = seeded.customAttendance;

        if (relationRes) {
          const [relsEns, relsProg, relsCustom] = relationRes;
          finalForm = {
            ...seeded.form,
            selectedEnsambles:
              relsEns.data?.map((r) => r.id_ensamble) ||
              seeded.form.selectedEnsambles,
            selectedProgramas:
              relsProg.data?.map((r) => r.id_programa) ||
              seeded.form.selectedProgramas,
          };
          finalCustom =
            relsCustom.data?.map((c) => ({
              id_integrante: c.id_integrante,
              tipo: c.tipo,
              nota: c.nota || "",
              label: `${c.integrantes?.apellido}, ${c.integrantes?.nombre}`,
            })) || [];
          setFormData(finalForm);
          setCustomAttendance(finalCustom);
        }

        setInitialSnapshot({ form: finalForm, attendance: finalCustom });
      } catch (error) {
        console.error("Error cargando datos:", error);
        if (!cancelled) {
          setInitialSnapshot({
            form: seeded.form,
            attendance: seeded.customAttendance,
          });
        }
      } finally {
        if (!cancelled) setStaticLoading(false);
      }
    };

    loadStaticAndRelations();
    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    initialData,
    myEnsembles,
    seeded,
    locationsOptionsProp,
    membersOptionsProp,
    ensamblesOptionsProp,
  ]);

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
        "¿Marcar este ensayo como eliminado? Se ocultará de la vista activa y se eliminará definitivamente en 24 horas.",
      )
    )
      return;

    toast.promise(
      async () => {
        const { error } = await supabase
          .from("eventos")
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
          })
          .eq("id", initialData.id);
        if (error) throw error;
        if (onSuccess) onSuccess();
      },
      {
        loading: "Marcando como eliminado...",
        success:
          "Ensayo marcado como eliminado. Se eliminará definitivamente en 24 horas.",
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

    const myIds = myEnsembles.map((e) => e.id);
    const hasMyEnsemble = formData.selectedEnsambles.some((id) =>
      myIds.includes(id),
    );

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

  if (staticLoading)
    return (
      <div className="p-10 flex justify-center">
        <IconLoader className="animate-spin text-indigo-600" />
      </div>
    );

  return (
    <>
      <div className="bg-white p-4 md:p-5 rounded-lg shadow-lg border border-slate-200 w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3 md:mb-4 border-b pb-2">
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

        <div className="space-y-3 md:space-y-5">
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
              Título
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="Ej: Ensayo regular, solo cuerdas..."
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
            />
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

          <MobileCollapsibleSection
            title="Convocatoria"
            icon={IconMusic}
            isOpen={mobileSectionsOpen.convocatoria}
            onToggle={() => toggleMobileSection("convocatoria")}
            className="bg-slate-50"
            summary={
              <SelectionChips
                ids={formData.selectedEnsambles}
                options={ensamblesOptions}
                emptyLabel="Sin ensamble"
              />
            }
          >
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
          </MobileCollapsibleSection>

          <MobileCollapsibleSection
            title="Asistencia Particular"
            icon={IconUsers}
            isOpen={mobileSectionsOpen.asistencia}
            onToggle={() => toggleMobileSection("asistencia")}
            className="bg-white shadow-sm"
            summary={<AttendanceChips items={customAttendance} />}
          >
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
          </MobileCollapsibleSection>

          <MobileCollapsibleSection
            title="Repertorio / Programación"
            icon={IconMusic}
            isOpen={mobileSectionsOpen.repertorio}
            onToggle={() => toggleMobileSection("repertorio")}
            className="bg-white shadow-sm"
            summary={
              <SelectionChips
                ids={formData.selectedProgramas}
                options={programasOptions}
                emptyLabel="Sin programa"
              />
            }
          >
            {programasLoading ? (
              <div className="bg-emerald-50 p-6 rounded border border-emerald-100 flex items-center justify-center gap-2 text-emerald-700 text-xs font-bold">
                <IconLoader className="animate-spin" size={16} />
                Cargando programas...
              </div>
            ) : (
              <RepertorioPreparacionSelect
                options={programasOptions}
                selectedIds={formData.selectedProgramas}
                onChange={(ids) =>
                  setFormData({ ...formData, selectedProgramas: ids })
                }
                minRehearsalDate={formData.fecha || null}
                supabase={supabase}
                activeMembersSet={activeMembersSet}
              />
            )}
          </MobileCollapsibleSection>

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
