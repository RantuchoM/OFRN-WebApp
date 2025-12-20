import React, { useState, useEffect, useMemo } from "react";
import {
  IconPlus,
  IconLoader,
  IconArrowLeft,
  IconDrive,
  IconUsers,
  IconCalendar,
  IconMusic,
  IconSettingsWheel,
  IconMegaphone,
  IconUtensils,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { useSearchParams } from "react-router-dom";

import GiraForm from "./GiraForm";
import GiraRoster from "./GiraRoster";
import GiraAgenda from "./GiraAgenda";
import ProgramRepertoire from "./ProgramRepertoire";
import LogisticsDashboard from "./LogisticsDashboard";
import AgendaGeneral from "./AgendaGeneral";
import MusicianCalendar from "./MusicianCalendar";
import WeeklyCalendar from "./WeeklyCalendar";
import MealsAttendancePersonal from "./MealsAttendancePersonal";
import ProgramSeating from "./ProgramSeating";
import CommentsManager from "../../components/comments/CommentsManager";
import GlobalCommentsViewer from "../../components/comments/GlobalCommentsViewer";
import GiraDifusion from "./GiraDifusion";

// --- NUEVOS COMPONENTES MODULARIZADOS ---
import GirasListControls from "./GirasListControls";
import GiraCard from "./GiraCard";

export default function GirasView({ supabase }) {
  const { user, isEditor } = useAuth();
  const userRole = user?.rol_sistema || "";

  // Detección robusta de invitado
  const isGuest = userRole === "invitado" || user?.id === "guest-general";
  const isPersonal =
    userRole === "consulta_personal" || userRole === "personal" || isGuest;

  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("view") || "LIST";
  const giraId = searchParams.get("giraId");
  const currentTab = searchParams.get("subTab");

  const [giras, setGiras] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedGira = useMemo(() => {
    if (!giraId || giras.length === 0) return null;
    return giras.find((g) => g.id.toString() === giraId);
  }, [giras, giraId]);

  const updateView = (newMode, newGiraId = null, newSubTab = null) => {
    const params = { tab: "giras" };
    if (newMode && newMode !== "LIST") params.view = newMode;
    const gId = newGiraId || giraId || (selectedGira ? selectedGira.id : null);
    if (gId) params.giraId = gId;
    if (newSubTab) params.subTab = newSubTab;
    setSearchParams(params);
  };

  const [commentsState, setCommentsState] = useState(null);
  const [globalCommentsGiraId, setGlobalCommentsGiraId] = useState(null);
  
  // Estado para la UI de lista
  const [showRepertoireInCards, setShowRepertoireInCards] = useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // Filtros
  const [filterType, setFilterType] = useState(
    new Set(["Sinfónico", "Camerata Filarmónica", "Ensamble", "Jazz Band"])
  );
  const PROGRAM_TYPES = [
    "Sinfónico",
    "Camerata Filarmónica",
    "Ensamble",
    "Jazz Band",
  ];
  const today = new Date().toISOString().split("T")[0];
  const [filterDateStart, setFilterDateStart] = useState(today);
  const [filterDateEnd, setFilterDateEnd] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    nombre_gira: "",
    subtitulo: "",
    fecha_desde: "",
    fecha_hasta: "",
    tipo: "Sinfónico",
    zona: "",
    token_publico: "",
  });
  
  // Listas de datos auxiliares
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [ensemblesList, setEnsemblesList] = useState([]);
  const [allIntegrantes, setAllIntegrantes] = useState([]);

  useEffect(() => {
    fetchGiras();
    fetchLocationsList();
    fetchEnsemblesList();
    fetchIntegrantesList();
  }, [user.id]);

  const fetchGiras = async () => {
    setLoading(true);
    try {
      if (isGuest) {
        const tokenToUse = user.token_original;
        if (tokenToUse) {
          const { data, error } = await supabase.rpc(
            "get_gira_by_public_token",
            { token_input: tokenToUse }
          );
          if (error) throw error;
          setGiras(data ? [data] : []);
        }
      } else {
        const isPersonalRoleForDB =
          (userRole === "consulta_personal" || userRole === "personal") &&
          user.id !== "guest-general";

        let myEnsembles = new Set();
        let myFamily = null;

        if (isPersonalRoleForDB) {
          const { data: me } = await supabase
            .from("integrantes")
            .select(
              "*, instrumentos(familia), integrantes_ensambles(id_ensamble)"
            )
            .eq("id", user.id)
            .single();
          if (me) {
            myFamily = me.instrumentos?.familia;
            me.integrantes_ensambles?.forEach((ie) =>
              myEnsembles.add(ie.id_ensamble)
            );
          }
        }

        const { data, error } = await supabase
          .from("programas")
          .select(
            `*, giras_localidades(id_localidad, localidades(localidad)), giras_fuentes(*), eventos (id, fecha, hora_inicio, locaciones(nombre, localidades(localidad)), tipos_evento(nombre)), giras_integrantes (id_integrante, estado, rol, integrantes (nombre, apellido))`
          )
          .order("fecha_desde", { ascending: true });

        if (error) throw error;
        let result = data || [];

        if (isPersonalRoleForDB) {
          result = result.filter((gira) => {
            const overrides = gira.giras_integrantes || [];
            const sources = gira.giras_fuentes || [];
            const myOverride = overrides.find(
              (o) => o.id_integrante === user.id
            );
            if (myOverride && myOverride.estado === "ausente") return false;
            if (myOverride) return true;
            const isIncluded = sources.some(
              (s) =>
                (s.tipo === "ENSAMBLE" && myEnsembles.has(s.valor_id)) ||
                (s.tipo === "FAMILIA" && s.valor_texto === myFamily)
            );
            if (isIncluded) {
              const excludedEnsembles = sources
                .filter((s) => s.tipo === "EXCL_ENSAMBLE")
                .map((s) => s.valor_id);
              if (excludedEnsembles.some((exclId) => myEnsembles.has(exclId)))
                return false;
              return true;
            }
            return false;
          });
        }
        setGiras(result);
      }
    } catch (err) {
      console.error("Error fetching giras:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isGuest && user?.active_gira_id) {
      const needsFiltering =
        giras.length > 0 && giras.some((g) => g.id !== user.active_gira_id);
      if (needsFiltering)
        setGiras((prev) => prev.filter((g) => g.id === user.active_gira_id));

      const GUEST_ALLOWED_VIEWS = ["AGENDA", "REPERTOIRE", "MEALS_PERSONAL"];
      const currentView = searchParams.get("view");
      const currentGiraId = searchParams.get("giraId");

      const isViewAllowed = GUEST_ALLOWED_VIEWS.includes(currentView);
      const isGiraCorrect = currentGiraId === String(user.active_gira_id);

      if (!isViewAllowed || !isGiraCorrect) {
        setSearchParams(
          { tab: "giras", view: "AGENDA", giraId: user.active_gira_id },
          { replace: true }
        );
      }
    }
  }, [isGuest, user, giras, searchParams, setSearchParams]);

  const fetchLocationsList = async () => {
    const { data } = await supabase
      .from("localidades")
      .select("id, localidad")
      .order("localidad");
    if (data) setLocationsList(data);
  };
  const fetchEnsemblesList = async () => {
    const { data } = await supabase.from("ensambles").select("id, ensamble");
    if (data)
      setEnsemblesList(data.map((e) => ({ value: e.id, label: e.ensamble })));
  };
  const fetchIntegrantesList = async () => {
    const { data } = await supabase
      .from("integrantes")
      .select("id, nombre, apellido")
      .order("apellido");
    if (data)
      setAllIntegrantes(
        data.map((i) => ({ value: i.id, label: `${i.apellido}, ${i.nombre}` }))
      );
  };

  const handleSave = async () => {
    if (!formData.nombre_gira) return alert("Nombre obligatorio");
    setLoading(true);
    const payload = { ...formData };
      if (!payload.token_publico) payload.token_publico = null; 
      if (!payload.fecha_desde) payload.fecha_desde = null;
      if (!payload.fecha_hasta) payload.fecha_hasta = null;
    try {
      let targetId = editingId;
      if (editingId) {
        await supabase.from("programas").update(formData).eq("id", editingId);
      } else {
        const { data } = await supabase
          .from("programas")
          .insert([payload])
          .select();
        if (data && data.length > 0) targetId = data[0].id;
      }
      if (targetId) {
        await supabase
          .from("giras_localidades")
          .delete()
          .eq("id_gira", targetId);
        const locPayload = Array.from(selectedLocations).map((lid) => ({
          id_gira: targetId,
          id_localidad: lid,
        }));
        if (locPayload.length > 0)
          await supabase.from("giras_localidades").insert(locPayload);
        await supabase.from("giras_fuentes").delete().eq("id_gira", targetId);
        const srcPayload = selectedSources.map((s) => ({
          id_gira: targetId,
          tipo: s.tipo,
          valor_id: s.valor_id || null,
          valor_texto: s.valor_texto || null,
        }));
        if (srcPayload.length > 0)
          await supabase.from("giras_fuentes").insert(srcPayload);
        await supabase
          .from("giras_integrantes")
          .delete()
          .eq("id_gira", targetId)
          .in("rol", ["director", "solista"]);
        const staffPayload = selectedStaff.map((s) => ({
          id_gira: targetId,
          id_integrante: s.id_integrante,
          rol: s.rol,
          estado: "confirmado",
        }));
        if (staffPayload.length > 0)
          await supabase.from("giras_integrantes").insert(staffPayload);
        await supabase.functions.invoke("manage-drive", {
          body: { action: "sync_program", programId: targetId },
        });
      }
      await fetchGiras();
      closeForm();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    if (e) e.stopPropagation();
    if (!confirm("¿Eliminar?")) return;
    setLoading(true);
    await supabase.functions.invoke("manage-drive", {
      body: { action: "delete_program", programId: id },
    });
    await supabase.from("programas").delete().eq("id", id);
    await fetchGiras();
    setLoading(false);
  };

  const startEdit = async (gira) => {
    setEditingId(gira.id);
    setFormData({
      nombre_gira: gira.nombre_gira,
      subtitulo: gira.subtitulo || "",
      fecha_desde: gira.fecha_desde || "",
      fecha_hasta: gira.fecha_hasta || "",
      tipo: gira.tipo || "Sinfónico",
      zona: gira.zona || "",
      token_publico: gira.token_publico || "",
    });
    const { data } = await supabase
      .from("giras_localidades")
      .select("id_localidad")
      .eq("id_gira", gira.id);
    setSelectedLocations(
      data ? new Set(data.map((d) => d.id_localidad)) : new Set()
    );
    const fuentes = (gira.giras_fuentes || []).map((f) => {
      let label = f.valor_texto;
      if (f.tipo.includes("ENSAMBLE")) {
        const found = ensemblesList.find((e) => e.value === f.valor_id);
        label = found ? found.label : `Ensamble ${f.valor_id}`;
      }
      return {
        tipo: f.tipo,
        valor_id: f.valor_id,
        valor_texto: f.valor_texto,
        label: label,
      };
    });
    setSelectedSources(fuentes);
    const staff = (gira.giras_integrantes || [])
      .filter((i) => ["director", "solista"].includes(i.rol))
      .map((i) => ({
        id_integrante: i.id_integrante,
        rol: i.rol,
        label: i.integrantes
          ? `${i.integrantes.apellido}, ${i.integrantes.nombre}`
          : "Desconocido",
      }));
    setSelectedStaff(staff);
    setIsAdding(false);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      nombre_gira: "",
      subtitulo: "",
      fecha_desde: "",
      fecha_hasta: "",
      tipo: "Sinfónico",
      zona: "",
    });
    setSelectedLocations(new Set());
    setSelectedSources([]);
    setSelectedStaff([]);
  };

  const handleCommentNavigation = (type, entityId) => {
    const currentGira = giras.find((g) => g.id === globalCommentsGiraId);
    if (!currentGira) return;
    setGlobalCommentsGiraId(null);
    if (type === "EVENTO") updateView("AGENDA", currentGira.id);
    else if (type === "OBRA") updateView("REPERTOIRE", currentGira.id);
    else if (type === "HABITACION")
      updateView("LOGISTICS", currentGira.id, "rooming");
  };

  const filteredGiras = useMemo(() => {
    return giras.filter((g) => {
      if (filterType.size > 0 && !filterType.has(g.tipo)) return false;
      if (filterDateStart && g.fecha_hasta < filterDateStart) return false;
      if (filterDateEnd && g.fecha_desde > filterDateEnd) return false;
      return true;
    });
  }, [giras, filterType, filterDateStart, filterDateEnd]);

  const toggleFilterType = (type) => {
    setFilterType((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) newSet.delete(type);
      else newSet.add(type);
      return newSet;
    });
  };

  const allCalendarEvents = useMemo(() => {
    return giras.flatMap((gira) => {
      if (!gira.eventos) return [];
      return gira.eventos.map((evento) => {
        const startStr = `${evento.fecha}T${evento.hora_inicio}`;
        const startDate = new Date(startStr);
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
        return {
          id: evento.id,
          title: gira.nombre_gira,
          subtitle: evento.locaciones?.nombre || "",
          start: startStr,
          end: endDate.toISOString(),
          programLabel: (evento.tipos_evento?.nombre || "Evento").toUpperCase(),
          programType: gira.tipo,
          programName: gira.nombre_gira,
          location: evento.locaciones?.nombre || "Sin lugar",
          giraId: gira.id,
          eventType: evento.tipos_evento?.nombre || "",
        };
      });
    });
  }, [giras]);

  const handleUpdateCalendarEvent = async (eventData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("eventos")
        .update({
          fecha: eventData.start.split("T")[0],
          hora_inicio: eventData.start.split("T")[1],
        })
        .eq("id", eventData.id);
      if (error) throw error;
      await fetchGiras();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const tourNavItems = [
    { mode: "AGENDA", label: "Agenda", icon: IconCalendar },
    { mode: "REPERTOIRE", label: "Repertorio", icon: IconMusic },
    { mode: "MEALS_PERSONAL", label: "Mis Comidas", icon: IconUtensils },
    { mode: "LOGISTICS", label: "Logística", icon: IconSettingsWheel },
    { mode: "ROSTER", label: "Personal", icon: IconUsers },
    { mode: "DIFUSION", label: "Difusión", icon: IconMegaphone },
  ];

  const isDetailView =
    [
      "AGENDA",
      "REPERTOIRE",
      "ROSTER",
      "LOGISTICS",
      "MEALS_PERSONAL",
      "SEATING",
      "DIFUSION",
    ].includes(mode) && selectedGira;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 sticky top-0 shadow-sm shrink-0 z-40">
        {isDetailView ? (
          /* --- VISTA DE DETALLE (Cabecera específica) --- */
          <div className="px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => updateView("LIST")}
                className={`p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors ${
                  isGuest ? "invisible" : ""
                }`}
                title="Volver al listado"
              >
                <IconArrowLeft size={20} />
              </button>
              <div className="flex flex-col overflow-hidden">
                <h2 className="text-m font-bold text-slate-800 truncate leading-tight">{`${selectedGira.mes_letra} | ${selectedGira.nomenclador}. ${selectedGira.nombre_gira}`}</h2>
                <div className="flex items-center gap-2">
                  {isGuest && !user.isGeneral && (
                    <div className="hidden sm:flex animate-in fade-in items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-200 whitespace-nowrap">
                      <IconUsers size={12} />
                      {user.nombre} {user.apellido}
                    </div>
                  )}
                  <span className="font-medium bg-indigo-50 text-indigo-700 px-1.5 rounded text-xs">
                    {selectedGira.tipo}
                  </span>
                  <span className="truncate text-xs text-slate-500">
                    {selectedGira.zona}
                  </span>
                </div>
              </div>
            </div>
            {(isEditor || isPersonal) && (
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar">
                {tourNavItems
                  .filter((item) => {
                    if (item.mode === "MEALS_PERSONAL") {
                      return isGuest && !user.isGeneral;
                    }
                    if (isEditor) return true;
                    return ["AGENDA", "REPERTOIRE"].includes(item.mode);
                  })
                  .map((item) => {
                    const isActive = mode === item.mode;
                    return (
                      <button
                        key={item.mode}
                        onClick={() => updateView(item.mode, selectedGira.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                          isActive
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        }`}
                      >
                        <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />{" "}
                        <span className="hidden md:inline">{item.label}</span>
                      </button>
                    );
                  })}
                {selectedGira.google_drive_folder_id && (
                  <button
                    onClick={() =>
                      window.open(
                        `https://drive.google.com/drive/folders/${selectedGira.google_drive_folder_id}`,
                        "_blank"
                      )
                    }
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap text-green-700 bg-green-50 hover:bg-green-100 border border-green-200"
                    title="Abrir Carpeta de Drive"
                  >
                    <IconDrive size={16} />{" "}
                    <span className="hidden md:inline">Drive</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* --- VISTA DE LISTA/CALENDARIO (Con la barra recuperada) --- */
          <GirasListControls
            mode={mode}
            updateView={updateView}
            showRepertoireInCards={showRepertoireInCards}
            setShowRepertoireInCards={setShowRepertoireInCards}
            showFiltersMobile={showFiltersMobile}
            setShowFiltersMobile={setShowFiltersMobile}
            filterDateStart={filterDateStart}
            setFilterDateStart={setFilterDateStart}
            filterDateEnd={filterDateEnd}
            setFilterDateEnd={setFilterDateEnd}
            filterType={filterType}
            toggleFilterType={toggleFilterType}
            PROGRAM_TYPES={PROGRAM_TYPES}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {mode === "FULL_AGENDA" && <AgendaGeneral supabase={supabase} />}
        {mode === "CALENDAR" && <MusicianCalendar supabase={supabase} />}
        {mode === "WEEKLY" && (
          <WeeklyCalendar
            rawEvents={allCalendarEvents}
            tours={giras}
            updateEventInSupabase={handleUpdateCalendarEvent}
          />
        )}

        {mode === "AGENDA" && selectedGira && (
          <GiraAgenda
            supabase={supabase}
            gira={selectedGira}
            onBack={() => updateView("LIST")}
          />
        )}
        {mode === "REPERTOIRE" && selectedGira && (
          <ProgramRepertoire
            supabase={supabase}
            program={selectedGira}
            initialTab={currentTab}
            onBack={() => updateView("LIST")}
          />
        )}
        {mode === "SEATING" && selectedGira && (
          <ProgramSeating
            supabase={supabase}
            program={selectedGira}
            onBack={() => updateView("LIST")}
          />
        )}
        {mode === "ROSTER" && selectedGira && (
          <GiraRoster
            supabase={supabase}
            gira={selectedGira}
            onBack={() => updateView("LIST")}
          />
        )}
        {mode === "DIFUSION" && selectedGira && (
          <GiraDifusion
            supabase={supabase}
            gira={selectedGira}
            onBack={() => updateView("LIST")}
          />
        )}
        {mode === "LOGISTICS" && selectedGira && !isGuest && (
          <LogisticsDashboard
            supabase={supabase}
            gira={selectedGira}
            initialTab={currentTab}
            onBack={() => updateView("LIST")}
          />
        )}
        {mode === "MEALS_PERSONAL" && selectedGira && (
          <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2 shrink-0">
              {userRole !== "invitado" && (
                <button
                  onClick={() => updateView("LIST")}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
                >
                  <IconArrowLeft size={20} />
                </button>
              )}
              <h2 className="text-lg font-bold text-slate-800">
                Mi Asistencia -{" "}
                <span className="text-slate-500 text-sm font-normal">
                  {selectedGira.nombre_gira}
                </span>
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <MealsAttendancePersonal
                supabase={supabase}
                gira={selectedGira}
                userId={user.id}
              />
            </div>
          </div>
        )}

        {loading && !selectedGira && mode !== "LIST" && mode !== "CALENDAR" && (
          <div className="flex h-full items-center justify-center text-slate-400">
            <IconLoader className="animate-spin mr-2" /> Cargando programa...
          </div>
        )}

        {mode === "LIST" && (
          <div className="p-4 space-y-4">
            {isEditor && !editingId && (
              <>
                {!isAdding && (
                  <button
                    onClick={() => {
                      setIsAdding(true);
                      setFormData({
                        nombre_gira: "",
                        subtitulo: "",
                        fecha_desde: "",
                        fecha_hasta: "",
                        tipo: "Sinfónico",
                        zona: "",
                        token_publico: "",
                      });
                      setSelectedLocations(new Set());
                      setSelectedSources([]);
                      setSelectedStaff([]);
                    }}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-500 hover:bg-indigo-50 flex justify-center gap-2 font-medium"
                  >
                    <IconPlus size={20} /> Crear Nuevo Programa
                  </button>
                )}
                {isAdding && (
                  <GiraForm
                    supabase={supabase}
                    giraId={null}
                    formData={formData}
                    setFormData={setFormData}
                    onCancel={closeForm}
                    onSave={handleSave}
                    onRefresh={async () => {
                      await fetchGiras();
                      closeForm();
                    }}
                    loading={loading}
                    isNew={true}
                    locationsList={locationsList}
                    selectedLocations={selectedLocations}
                    setSelectedLocations={setSelectedLocations}
                    ensemblesList={ensemblesList}
                    allIntegrantes={allIntegrantes}
                    selectedSources={selectedSources}
                    setSelectedSources={setSelectedSources}
                    selectedStaff={selectedStaff}
                    setSelectedStaff={setSelectedStaff}
                  />
                )}
              </>
            )}
            {filteredGiras.length === 0 && !loading && !isAdding && (
              <div className="text-center py-10 text-slate-400">
                No se encontraron programas.
              </div>
            )}
            {filteredGiras.map((gira) => {
              if (editingId === gira.id) {
                return (
                  <GiraForm
                    key={gira.id}
                    supabase={supabase}
                    giraId={gira.id}
                    formData={formData}
                    setFormData={setFormData}
                    onCancel={closeForm}
                    onSave={handleSave}
                    onRefresh={async () => {
                      await fetchGiras();
                      closeForm();
                    }}
                    loading={loading}
                    isNew={false}
                    locationsList={locationsList}
                    selectedLocations={selectedLocations}
                    setSelectedLocations={setSelectedLocations}
                    ensemblesList={ensemblesList}
                    allIntegrantes={allIntegrantes}
                    selectedSources={selectedSources}
                    setSelectedSources={setSelectedSources}
                    selectedStaff={selectedStaff}
                    setSelectedStaff={setSelectedStaff}
                  />
                );
              }
              // --- USO DEL NUEVO COMPONENTE TARJETA ---
              return (
                <GiraCard
                  key={gira.id}
                  gira={gira}
                  updateView={updateView}
                  isEditor={isEditor}
                  isPersonal={isPersonal}
                  userRole={userRole}
                  startEdit={startEdit}
                  handleDelete={handleDelete}
                  setGlobalCommentsGiraId={setGlobalCommentsGiraId}
                  setCommentsState={setCommentsState}
                  activeMenuId={activeMenuId}
                  setActiveMenuId={setActiveMenuId}
                  showRepertoireInCards={showRepertoireInCards}
                  ensemblesList={ensemblesList}
                  supabase={supabase}
                />
              );
            })}
          </div>
        )}
      </div>
      {globalCommentsGiraId && (
        <GlobalCommentsViewer
          supabase={supabase}
          giraId={globalCommentsGiraId}
          onClose={() => setGlobalCommentsGiraId(null)}
          onNavigate={handleCommentNavigation}
        />
      )}
      {commentsState && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]"
          onClick={() => setCommentsState(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="h-full">
            <CommentsManager
              supabase={supabase}
              entityType={commentsState.type}
              entityId={commentsState.id}
              title={commentsState.title}
              onClose={() => setCommentsState(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}