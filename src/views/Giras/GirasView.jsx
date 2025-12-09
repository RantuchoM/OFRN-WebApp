import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  IconPlus, IconAlertCircle, IconMap, IconEdit, IconTrash, IconUsers,
  IconLoader, IconMapPin, IconCalendar, IconMusic, IconFilter,
  IconDrive, IconHotel, IconMoreVertical, IconEye, IconTruck, IconSearch, IconX, IconList
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import GiraForm from "./GiraForm";
import GiraRoster from "./GiraRoster";
import GiraAgenda from "./GiraAgenda";
import ProgramRepertoire from "./ProgramRepertoire";
import ProgramHoteleria from "./ProgramHoteleria";
import LogisticsManager from "./LogisticsManager";
import AgendaGeneral from "./AgendaGeneral"; 
import MusicianCalendar from "./MusicianCalendar"; 

const ActionMenu = ({ onAction, isOpen, setIsOpen, hasDrive, canEdit }) => {
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) { setIsOpen(false); }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setIsOpen]);

  const handleItemClick = (e, action) => { e.preventDefault(); e.stopPropagation(); onAction(e, action); };

  return (
    <div className="relative" ref={menuRef}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className={`p-2 rounded-full transition-colors ${isOpen ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"}`}>
        <IconMoreVertical size={20} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <div className="p-1 space-y-0.5">
            {hasDrive && <button type="button" onMouseDown={(e) => handleItemClick(e, "drive")} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"><IconDrive size={16} /> Abrir Drive</button>}
            <button type="button" onMouseDown={(e) => handleItemClick(e, "agenda")} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"><IconCalendar size={16} /> Agenda</button>
            <button type="button" onMouseDown={(e) => handleItemClick(e, "repertoire")} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"><IconMusic size={16} /> Repertorio</button>
            {canEdit && (
              <>
                <div className="h-px bg-slate-100 my-1"></div>
                <button type="button" onMouseDown={(e) => handleItemClick(e, "hotel")} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"><IconHotel size={16} /> Hotelería</button>
                <button type="button" onMouseDown={(e) => handleItemClick(e, "logistics")} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"><IconTruck size={16} /> Logística</button>
                <button type="button" onMouseDown={(e) => handleItemClick(e, "roster")} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"><IconUsers size={16} /> Personal</button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button type="button" onMouseDown={(e) => handleItemClick(e, "edit")} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"><IconEdit size={16} /> Editar Datos</button>
                <button type="button" onMouseDown={(e) => handleItemClick(e, "delete")} className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"><IconTrash size={16} /> Eliminar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function GirasView({ supabase }) {
  const { user, isEditor } = useAuth();
  const [view, setView] = useState({ mode: 'LIST', data: null });
  const [giras, setGiras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [showRepertoireInCards, setShowRepertoireInCards] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [filterType, setFilterType] = useState("Todos");
  const today = new Date().toISOString().split("T")[0];
  const [filterDateStart, setFilterDateStart] = useState(today);
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ nombre_gira: "", fecha_desde: "", fecha_hasta: "", tipo: "Sinfónico", zona: "" });
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  const [locationsList, setLocationsList] = useState([]);
  const [ensemblesList, setEnsemblesList] = useState([]);

  useEffect(() => {
    fetchGiras();
    fetchLocationsList();
    fetchEnsemblesList();
  }, [user.id]);

  const fetchGiras = async () => {
    setLoading(true);
    try {
      const userRole = user?.rol_sistema || "";
      const isPersonal = userRole === "consulta_personal" || userRole === "personal";
      let myEnsembles = new Set();
      let myFamily = null;
      if (isPersonal) {
        const { data: me } = await supabase.from("integrantes").select("*, instrumentos(familia), integrantes_ensambles(id_ensamble)").eq("id", user.id).single();
        if (me) { myFamily = me.instrumentos?.familia; me.integrantes_ensambles?.forEach((ie) => myEnsembles.add(ie.id_ensamble)); }
      }
      const { data, error } = await supabase.from("programas").select(`*, giras_localidades(id_localidad, localidades(localidad)), giras_fuentes(*), eventos (id, fecha, hora_inicio, locaciones(nombre), tipos_evento(nombre)), giras_integrantes (id_integrante, estado, rol, integrantes (nombre, apellido)), programas_repertorios (id, nombre, orden, repertorio_obras (id, orden, obras (id, titulo, duracion_segundos, estado, compositores (apellido, nombre), obras_compositores (rol, compositores(apellido, nombre)))))`).order("fecha_desde", { ascending: true });
      if (error) throw error;
      let result = data || [];
      if (isPersonal) {
        result = result.filter((gira) => {
          const overrides = gira.giras_integrantes || [];
          const sources = gira.giras_fuentes || [];
          const myOverride = overrides.find((o) => o.id_integrante === user.id);
          if (myOverride && myOverride.estado === "ausente") return false;
          if (myOverride) return true;
          return sources.some(s => (s.tipo === "ENSAMBLE" && myEnsembles.has(s.valor_id)) || (s.tipo === "FAMILIA" && s.valor_texto === myFamily));
        });
      }
      setGiras(result);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const fetchLocationsList = async () => { const { data } = await supabase.from("localidades").select("id, localidad").order("localidad"); if (data) setLocationsList(data); };
  const fetchEnsemblesList = async () => { const { data } = await supabase.from("ensambles").select("id, ensamble"); if (data) setEnsemblesList(data); };

  const handleSave = async () => {
    if (!formData.nombre_gira) return alert("Nombre obligatorio");
    setLoading(true);
    try {
      let targetId = editingId;
      if (editingId) {
        await supabase.from("programas").update(formData).eq("id", editingId);
      } else {
        const { data } = await supabase.from("programas").insert([formData]).select();
        if (data && data.length > 0) targetId = data[0].id;
      }
      if (targetId) {
         await supabase.functions.invoke("manage-drive", { body: { action: "sync_program", programId: targetId } });
      }
      await fetchGiras();
      closeForm();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleDelete = async (e, id) => {
    if (e) e.stopPropagation();
    if (!confirm("¿Eliminar?")) return;
    setLoading(true);
    await supabase.functions.invoke("manage-drive", { body: { action: "delete_program", programId: id } });
    await supabase.from("programas").delete().eq("id", id);
    await fetchGiras();
    setLoading(false);
  };

  const startEdit = async (gira) => {
    setEditingId(gira.id);
    setFormData({ nombre_gira: gira.nombre_gira, fecha_desde: gira.fecha_desde || "", fecha_hasta: gira.fecha_hasta || "", tipo: gira.tipo || "Sinfónico", zona: gira.zona || "" });
    const { data } = await supabase.from("giras_localidades").select("id_localidad").eq("id_gira", gira.id);
    setSelectedLocations(data ? new Set(data.map((d) => d.id_localidad)) : new Set());
    setIsAdding(false);
  };

  const closeForm = () => { setIsAdding(false); setEditingId(null); setFormData({ nombre_gira: "", fecha_desde: "", fecha_hasta: "", tipo: "Sinfónico", zona: "" }); setSelectedLocations(new Set()); };

  const handleMenuAction = (e, action, gira) => {
    e.stopPropagation();
    setOpenMenuId(null);
    switch (action) {
      case "repertoire": setView({ mode: 'REPERTOIRE', data: gira }); break;
      case "agenda": setView({ mode: 'AGENDA', data: gira }); break;
      case "hotel": setView({ mode: 'HOTEL', data: gira }); break;
      case "roster": setView({ mode: 'ROSTER', data: gira }); break;
      case "logistics": setView({ mode: 'LOGISTICS', data: gira }); break;
      case "drive":
        if (gira.google_drive_folder_id) window.open(`https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`, "_blank");
        else alert("Sin carpeta");
        break;
      case "edit": startEdit(gira); break;
      case "delete": handleDelete(null, gira.id); break;
    }
  };

  const filteredGiras = useMemo(() => {
    return giras.filter((g) => {
      if (filterType !== "Todos" && g.tipo !== filterType) return false;
      if (filterDateStart && g.fecha_hasta < filterDateStart) return false;
      if (filterDateEnd && g.fecha_desde > filterDateEnd) return false;
      return true;
    });
  }, [giras, filterType, filterDateStart, filterDateEnd]);

  const formatDate = (dateString) => { if (!dateString) return "-"; const [y, m, d] = dateString.split("-"); return `${d}/${m}`; };
  const getProgramLabel = (g) => g.tipo; 
  const getTourBorderColor = (type) => {
     if(type.includes('Sinfónico')) return 'border-indigo-500';
     if(type.includes('Ensamble')) return 'border-emerald-500';
     return 'border-fuchsia-500';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* NAVBAR */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm shrink-0">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               {view.mode === 'CALENDAR' ? <IconCalendar className="text-indigo-600"/> : 
                view.mode === 'FULL_AGENDA' ? <IconMusic className="text-indigo-600"/> :
                <IconMap className="text-indigo-600" /> 
               }
               <span className="hidden sm:inline">
                   {view.mode === 'CALENDAR' ? 'Calendario' : view.mode === 'FULL_AGENDA' ? 'Agenda Completa' : 'Programas'}
               </span>
            </h2>
            <div className="flex bg-slate-100 p-0.5 rounded-lg ml-2">
              <button onClick={() => setView({ mode: 'LIST', data: null })} className={`p-1.5 rounded-md transition-all ${['LIST','REPERTOIRE','AGENDA','HOTEL','ROSTER','LOGISTICS'].includes(view.mode) ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><IconList size={18}/></button>
              <button onClick={() => setView({ mode: 'CALENDAR', data: null })} className={`p-1.5 rounded-md transition-all ${view.mode === 'CALENDAR' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><IconCalendar size={18}/></button>
              <button onClick={() => setView({ mode: 'FULL_AGENDA', data: null })} className={`p-1.5 rounded-md transition-all ${view.mode === 'FULL_AGENDA' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><IconMusic size={18}/></button>
            </div>
          </div>
          {view.mode === 'LIST' && (
            <div className="flex items-center gap-2 ml-auto">
                <button className="md:hidden p-2 text-slate-500" onClick={() => setShowFiltersMobile(!showFiltersMobile)}><IconFilter size={20}/></button>
                <div className="hidden md:flex items-center gap-2">
                    <input type="date" className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs" value={filterDateStart} onChange={e=>setFilterDateStart(e.target.value)} />
                    <select className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs" value={filterType} onChange={e=>setFilterType(e.target.value)}>
                        <option value="Todos">Todos</option>
                        <option value="Sinfónico">Sinfónico</option>
                        <option value="Ensamble">Ensamble</option>
                    </select>
                </div>
            </div>
          )}
        </div>
        {showFiltersMobile && view.mode === 'LIST' && (
             <div className="md:hidden px-4 pb-3 flex gap-2">
                 <input type="date" className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm" value={filterDateStart} onChange={e=>setFilterDateStart(e.target.value)} />
                 <select className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm" value={filterType} onChange={e=>setFilterType(e.target.value)}>
                        <option value="Todos">Todos</option>
                        <option value="Sinfónico">Sinfónico</option>
                        <option value="Ensamble">Ensamble</option>
                 </select>
             </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {view.mode === 'FULL_AGENDA' && <AgendaGeneral supabase={supabase} />}
        {view.mode === 'CALENDAR' && <MusicianCalendar supabase={supabase} />}
        {view.mode === 'AGENDA' && <GiraAgenda supabase={supabase} gira={view.data} onBack={() => setView({ mode: 'LIST', data: null })} />}
        {view.mode === 'REPERTOIRE' && <ProgramRepertoire supabase={supabase} program={view.data} onBack={() => setView({ mode: 'LIST', data: null })} />}
        {view.mode === 'ROSTER' && <GiraRoster supabase={supabase} gira={view.data} onBack={() => setView({ mode: 'LIST', data: null })} />}
        {view.mode === 'HOTEL' && <ProgramHoteleria supabase={supabase} program={view.data} onBack={() => setView({ mode: 'LIST', data: null })} />}
        {view.mode === 'LOGISTICS' && <LogisticsManager supabase={supabase} gira={view.data} onBack={() => setView({ mode: 'LIST', data: null })} />}

        {view.mode === 'LIST' && (
            <div className="p-4 space-y-4">
                {isEditor && !isAdding && !editingId && (
                    <button onClick={() => { setIsAdding(true); setFormData({ nombre_gira: "", fecha_desde: "", fecha_hasta: "", tipo: "Sinfónico", zona: "" }); setSelectedLocations(new Set()); }} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-500 hover:bg-indigo-50 flex justify-center gap-2 font-medium">
                        <IconPlus size={20} /> Crear Nuevo Programa
                    </button>
                )}
                
                {(isAdding || editingId) && (
                     <GiraForm supabase={supabase} giraId={editingId} formData={formData} setFormData={setFormData} onCancel={closeForm} onSave={handleSave} onRefresh={async () => { await fetchGiras(); closeForm(); }} loading={loading} isNew={isAdding} locationsList={locationsList} selectedLocations={selectedLocations} setSelectedLocations={setSelectedLocations} />
                )}

                {filteredGiras.length === 0 && !loading && <div className="text-center py-10 text-slate-400">No se encontraron programas.</div>}

                {filteredGiras.map((gira) => {
                    if (editingId === gira.id) return null;
                    const label = getProgramLabel(gira);
                    const locs = gira.giras_localidades?.map(l=>l.localidades?.localidad).join(", ");
                    const repertorioData = (gira.programas_repertorios || []).sort((a, b) => (a.orden || 0) - (b.orden || 0));
                    const borderColor = getTourBorderColor(gira.tipo);

                    return (
                        <div key={gira.id} className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden border-l-4 ${borderColor} ${openMenuId === gira.id ? 'z-30 ring-2 ring-indigo-100' : 'z-0'}`}>
                             <div className="pl-2 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div onClick={() => setView({ mode: 'REPERTOIRE', data: gira })} className="cursor-pointer">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold uppercase text-slate-400">{label}</span>
                                            {gira.zona && <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500 font-medium">{gira.zona}</span>}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 leading-tight">{gira.nombre_gira}</h3>
                                    </div>
                                    <ActionMenu onAction={(e, act) => handleMenuAction(e, act, gira)} isOpen={openMenuId === gira.id} setIsOpen={(v) => setOpenMenuId(v ? gira.id : null)} hasDrive={!!gira.google_drive_folder_id} canEdit={isEditor} />
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                     <div className="flex items-center gap-1"><IconCalendar size={14}/> {formatDate(gira.fecha_desde)} - {formatDate(gira.fecha_hasta)}</div>
                                     <div className="flex items-center gap-1 truncate"><IconMapPin size={14}/> {locs || "Sin loc."}</div>
                                </div>
                                {showRepertoireInCards && (
                                   <div className="mt-2 bg-slate-50 rounded p-2 border border-slate-100 text-xs">
                                      {repertorioData.length > 0 ? repertorioData.map(r=><div key={r.id} className="font-medium text-slate-600">• {r.nombre}</div>) : <span className="italic text-slate-400">Sin repertorio</span>}
                                   </div>
                                )}
                             </div>
                        </div>
                    )
                })}
            </div>
        )}
      </div>
    </div>
  );
}