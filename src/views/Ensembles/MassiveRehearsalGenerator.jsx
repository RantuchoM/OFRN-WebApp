import React, { useState, useEffect } from "react";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import SearchableSelect from "../../components/ui/SearchableSelect";
import MultiSelect from "../../components/ui/MultiSelect";
import { IconCalendar, IconCheck, IconLoader } from "../../components/ui/Icons";
import { eachDayOfInterval, getDay, format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner"; // Usamos sonner para feedback consistente

export default function MassiveRehearsalGenerator({ supabase, onSuccess, onCancel, myEnsembles = [] }) {
  const [loading, setLoading] = useState(false);
  const [ensamblesOptions, setEnsamblesOptions] = useState([]);
  const [locationsOptions, setLocationsOptions] = useState([]);

  // Formulario
  const [formData, setFormData] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    hora_inicio: "15:00",
    hora_fin: "17:00",
    dias_semana: [], 
    id_locacion: "",
    selectedEnsambles: [],
    descripcion: "Ensayo Regular"
  });

  const [previewDates, setPreviewDates] = useState([]);

  // 1. Cargar Datos y Aplicar Lógica de Ensamble
  useEffect(() => {
    const loadData = async () => {
        // Cargar Ensambles
        const { data: ens } = await supabase.from("ensambles").select("id, ensamble").order("ensamble");
        
        // --- LÓGICA DE ORDENAMIENTO Y RESALTADO ---
        const myIds = new Set(myEnsembles.map(e => e.id));
        
        const sortedEns = (ens || []).sort((a, b) => {
            const aMine = myIds.has(a.id);
            const bMine = myIds.has(b.id);
            if (aMine && !bMine) return -1; // Los míos primero
            if (!aMine && bMine) return 1;
            return a.ensamble.localeCompare(b.ensamble);
        });

        const options = sortedEns.map(e => ({ 
            id: e.id, 
            label: myIds.has(e.id) ? `★ ${e.ensamble}` : e.ensamble // Resaltado visual
        }));
        
        setEnsamblesOptions(options);

        // --- LÓGICA DE SELECCIÓN POR DEFECTO ---
        // Si coordino solo 1 -> seleccionado. Si coordino más -> ninguno seleccionado.
        let initialSelection = [];
        if (myEnsembles.length === 1) {
            initialSelection = [myEnsembles[0].id];
        }
        setFormData(prev => ({ ...prev, selectedEnsambles: initialSelection }));
        
        // Cargar Locaciones
        const { data: loc } = await supabase
            .from("locaciones")
            .select("id, nombre, localidades(localidad)")
            .order("nombre");
        
        setLocationsOptions(loc?.map(l => ({ 
            id: l.id, 
            label: `${l.nombre} (${l.localidades?.localidad || "Sin localidad"})` 
        })) || []);
    };
    loadData();
  }, [supabase, myEnsembles]); // Dependencia myEnsembles importante

  // 2. Calcular Fechas Previas (Igual que antes)
  useEffect(() => {
      if (formData.fecha_inicio && formData.fecha_fin && formData.dias_semana.length > 0) {
          try {
              const start = new Date(formData.fecha_inicio);
              const end = new Date(formData.fecha_fin);
              
              if (start <= end) {
                  const allDays = eachDayOfInterval({ start, end });
                  const filtered = allDays.filter(d => formData.dias_semana.includes(getDay(d)));
                  setPreviewDates(filtered);
              } else {
                  setPreviewDates([]);
              }
          } catch (e) {
              setPreviewDates([]);
          }
      } else {
          setPreviewDates([]);
      }
  }, [formData.fecha_inicio, formData.fecha_fin, formData.dias_semana]);

  const toggleDay = (dayIndex) => {
      setFormData(prev => {
          const newDays = prev.dias_semana.includes(dayIndex)
              ? prev.dias_semana.filter(d => d !== dayIndex)
              : [...prev.dias_semana, dayIndex];
          return { ...prev, dias_semana: newDays };
      });
  };

  const handleSubmit = async () => {
      if (previewDates.length === 0) return toast.error("No hay fechas seleccionadas para generar.");
      if (formData.selectedEnsambles.length === 0) return toast.error("Selecciona al menos un ensamble.");
      if (formData.hora_fin <= formData.hora_inicio) return toast.error("La hora de fin debe ser posterior a la de inicio.");

      // --- VALIDACIÓN DE COORDINACIÓN ---
      const myIds = myEnsembles.map(e => e.id);
      const hasMyEnsemble = formData.selectedEnsambles.some(id => myIds.includes(id));
      
      if (!hasMyEnsemble) {
          return toast.error("Debes incluir al menos un ensamble que coordines para crear el evento.");
      }

      if (!confirm(`¿Generar ${previewDates.length} ensayos?`)) return;

      setLoading(true);
      try {
          const eventsPayload = previewDates.map(date => ({
              fecha: format(date, 'yyyy-MM-dd'),
              hora_inicio: formData.hora_inicio,
              hora_fin: formData.hora_fin,
              id_locacion: formData.id_locacion || null,
              id_gira: null,
              id_tipo_evento: 13, 
              descripcion: formData.descripcion
          }));

          const { data: createdEvents, error: insertError } = await supabase
              .from("eventos")
              .insert(eventsPayload)
              .select("id");

          if (insertError) throw insertError;

          const allRelations = [];
          createdEvents.forEach(evt => {
              formData.selectedEnsambles.forEach(ensId => {
                  allRelations.push({
                      id_evento: evt.id,
                      id_ensamble: ensId
                  });
              });
          });

          if (allRelations.length > 0) {
              const { error: relError } = await supabase.from("eventos_ensambles").insert(allRelations);
              if (relError) throw relError; 
          }

          toast.success(`Se generaron ${createdEvents.length} ensayos correctamente.`);
          if (onSuccess) onSuccess();

      } catch (err) {
          toast.error("Error generando ensayos: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  const daysOfWeek = [
      { idx: 1, label: 'Lunes' }, { idx: 2, label: 'Martes' }, { idx: 3, label: 'Miércoles' },
      { idx: 4, label: 'Jueves' }, { idx: 5, label: 'Viernes' }, { idx: 6, label: 'Sábado' }, { idx: 0, label: 'Domingo' }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl border border-slate-200 w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <IconCalendar className="text-indigo-600"/> Generación Masiva
            </h2>
            <p className="text-xs text-slate-500 mt-1">Crea múltiples ensayos recurrentes para un periodo.</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><span className="text-xs font-bold">ESC</span></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* COLUMNA 1: CONFIGURACIÓN */}
          <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Desde</label>
                      <DateInput value={formData.fecha_inicio} onChange={v => setFormData({...formData, fecha_inicio: v})} />
                  </div>
                  <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Hasta</label>
                      <DateInput value={formData.fecha_fin} onChange={v => setFormData({...formData, fecha_fin: v})} />
                  </div>
              </div>

              <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Días de Repetición</label>
                  <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map(d => (
                          <button 
                            key={d.idx}
                            onClick={() => toggleDay(d.idx)}
                            className={`px-3 py-1.5 text-xs rounded border transition-all ${
                                formData.dias_semana.includes(d.idx) 
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-md' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                              {d.label.slice(0,3)}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Hora Inicio</label>
                      <TimeInput value={formData.hora_inicio} onChange={v => setFormData({...formData, hora_inicio: v})} />
                  </div>
                  <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Hora Fin</label>
                      <TimeInput value={formData.hora_fin} onChange={v => setFormData({...formData, hora_fin: v})} />
                  </div>
              </div>

              <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Ensambles</label>
                  <MultiSelect 
                      placeholder="Seleccionar..." 
                      options={ensamblesOptions} 
                      selectedIds={formData.selectedEnsambles} 
                      onChange={ids => setFormData({...formData, selectedEnsambles: ids})} 
                  />
                  <p className="text-[9px] text-slate-400 mt-1">* Tus ensambles aparecen marcados con ★</p>
              </div>

              <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Lugar (Opcional)</label>
                  <SearchableSelect 
                      options={locationsOptions} 
                      value={formData.id_locacion} 
                      onChange={v => setFormData({...formData, id_locacion: v})} 
                      placeholder="Sin lugar asignado"
                  />
              </div>
              <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Nota Pública</label>
                  <input type="text" className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
              </div>

          </div>

          {/* COLUMNA 2: PREVISUALIZACIÓN */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col h-full">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-700 text-sm">Resumen de Fechas</h3>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{previewDates.length} eventos</span>
              </div>
              
              <div className="flex-1 overflow-y-auto border border-slate-200 bg-white rounded-md p-2 space-y-1 max-h-[300px]">
                  {previewDates.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-10 italic">
                          Configura las fechas y días para ver la lista.
                      </div>
                  ) : (
                      previewDates.map((date, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs p-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                              <span className="text-slate-400 font-mono w-4 text-right">{idx + 1}.</span>
                              <span className="font-bold text-slate-700 uppercase w-24">{format(date, "EEE d MMM", {locale: es})}</span>
                              <span className="text-slate-500">{formData.hora_inicio} - {formData.hora_fin}</span>
                          </div>
                      ))
                  )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                  <button 
                    onClick={handleSubmit} 
                    disabled={loading || previewDates.length === 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                      {loading ? <IconLoader className="animate-spin"/> : <IconCheck size={18}/>}
                      {loading ? "Generando..." : "Confirmar Generación Masiva"}
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
}