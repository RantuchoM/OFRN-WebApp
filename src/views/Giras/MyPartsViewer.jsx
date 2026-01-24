// src/views/Giras/MyPartsViewer.jsx
import React, { useState, useEffect } from "react";
import {
  IconLoader,
  IconDownload,
  IconDrive,
  IconLayers,
  IconAlertCircle
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";

export default function MyPartsViewer({ supabase, gira, onOpenSeating }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [repertoire, setRepertoire] = useState([]);
  const [userInstrument, setUserInstrument] = useState(null);

  useEffect(() => {
    fetchData();
  }, [gira.id, user.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Obtener datos básicos e instrumento del usuario
      const { data: userData } = await supabase
        .from("integrantes")
        .select("id, nombre, apellido, id_instr") 
        .eq("id", user.id)
        .single();

      const myInstrumentId = userData?.id_instr; 
      setUserInstrument(myInstrumentId ? `Instrumento: ${myInstrumentId}` : "Sin instrumento asignado");

      // 2. Obtener el Contenedor (Atril) del usuario para esta gira específica
      const { data: seatingJoin } = await supabase
        .from("seating_contenedores_items")
        .select(`
            id_contenedor,
            seating_contenedores!inner (id_programa)
        `)
        .eq("id_musico", user.id)
        .eq("seating_contenedores.id_programa", gira.id)
        .maybeSingle();
      
      const myContainerId = seatingJoin?.id_contenedor;

      // 3. Obtener todas las asignaciones de particellas de la gira (Crucial para la precisión)
      const { data: asignsData } = await supabase
        .from("seating_asignaciones")
        .select("id_obra, id_particella, id_contenedor, id_musicos_asignados")
        .eq("id_programa", gira.id);

      const assignments = asignsData || [];

      // 4. Obtener Repertorio completo (Incluyendo el ID de las particellas para comparar)
      const { data: progRepData, error } = await supabase
        .from("programas_repertorios")
        .select(`
            id, orden,
            repertorio_obras (
                id, orden, excluir,
                obras (
                    id, titulo, link_drive,
                    obras_compositores (
                        rol,
                        compositores (nombre, apellido)
                    ),
                    compositores (nombre, apellido),
                    obras_particellas (
                        id, nombre_archivo, url_archivo, id_instrumento, nota_organico
                    )
                )
            )
        `)
        .eq("id_programa", gira.id)
        .order("orden", { ascending: true });

      if (error) throw error;

      // 5. Procesar datos triangulando asignaciones
      let processed = [];

      (progRepData || []).forEach(cat => {
          if(!cat.repertorio_obras) return;
          const sortedWorks = cat.repertorio_obras.sort((a,b) => a.orden - b.orden);

          sortedWorks.forEach(item => {
              if (item.excluir || !item.obras) return;
              const obra = item.obras;

              // --- LÓGICA DE TRIANGULACIÓN DE PARTE ---
              const workAsigns = assignments.filter(a => String(a.id_obra) === String(obra.id));
              
              // Prioridad 1: Asignación específica por ID de músico
              const specificAsign = workAsigns.find(a => 
                  a.id_musicos_asignados?.some(mid => String(mid) === String(user.id))
              );

              // Prioridad 2: Asignación por Contenedor/Atril
              const groupAsign = workAsigns.find(a => 
                  myContainerId && String(a.id_contenedor) === String(myContainerId)
              );

              const finalAsign = specificAsign || groupAsign;

              // Buscar la particella física real dentro de la obra
              // Añadimos el filtro de instrumento como "doble check" de seguridad
              const myPart = obra.obras_particellas?.find(p => 
                  finalAsign && 
                  String(p.id) === String(finalAsign.id_particella) &&
                  String(p.id_instrumento) === String(myInstrumentId)
              );

              // Compositor
              let composerName = "Autor Desconocido";
              if (obra.obras_compositores?.length > 0) {
                const comps = obra.obras_compositores
                    .filter(oc => oc.rol === 'compositor' && oc.compositores)
                    .map(oc => `${oc.compositores.nombre} ${oc.compositores.apellido}`);
                if (comps.length > 0) composerName = comps.join(" / ");
              } else if (obra.compositores) {
                composerName = `${obra.compositores.nombre} ${obra.compositores.apellido}`;
              }

              // Limpieza de URL
              let cleanUrl = null;
              if (myPart?.url_archivo) {
                  try {
                      if (myPart.url_archivo.trim().startsWith("[")) {
                          const parsed = JSON.parse(myPart.url_archivo);
                          if (Array.isArray(parsed) && parsed.length > 0) cleanUrl = parsed[0].url;
                      } else {
                          cleanUrl = myPart.url_archivo;
                      }
                  } catch (e) { cleanUrl = myPart.url_archivo; }
              }

              // Estado
              let status = "NO_ASSIGNED";
              if (myPart) {
                  status = cleanUrl ? "AVAILABLE" : "PENDING";
              }

              processed.push({
                id: obra.id,
                uniqueId: item.id,
                orden: item.orden,
                compositor: composerName,
                titulo: obra.titulo,
                link_drive_obra: obra.link_drive,
                
                particella_status: status,
                particella_link: cleanUrl,
                particella_nombre: myPart?.nombre_archivo || (myPart ? "Parte sin nombre" : myInstrumentId),
                nota_extra: myPart?.nota_organico || null
              });
          });
      });

      setRepertoire(processed);

    } catch (error) {
      console.error("Error fetching my parts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><IconLoader className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="flex flex-col h-full animate-in fade-in">
      <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center justify-between mb-4 rounded-lg mx-4 mt-4">
         <div className="text-xs text-indigo-800 font-bold">
            {userInstrument}
         </div>
         {onOpenSeating && (
             <button onClick={onOpenSeating} className="flex items-center gap-2 text-xs font-bold text-indigo-700 hover:underline">
                <IconLayers size={14} /> Ir al Seating
            </button>
         )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {repertoire.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">No hay obras cargadas con partes asignadas para ti.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Obra</th>
                                <th className="px-4 py-3 text-center">Carpeta</th>
                                <th className="px-4 py-3">Parte Asignada</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {repertoire.map((row) => (
                                <tr key={row.uniqueId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-900 whitespace-pre-wrap leading-tight" dangerouslySetInnerHTML={{ __html: row.titulo }} />
                                        <div className="text-[11px] text-slate-500 mt-1">{row.compositor}</div>
                                    </td>
                                    
                                    <td className="px-4 py-3 text-center">
                                        {row.link_drive_obra ? (
                                            <a href={row.link_drive_obra} target="_blank" rel="noopener noreferrer" className="inline-flex p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Carpeta General de la Obra">
                                                <IconDrive size={18} />
                                            </a>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>

                                    <td className="px-4 py-3 text-slate-600">
                                        {row.particella_status !== "NO_ASSIGNED" ? (
                                            <div className="flex flex-col">
                                                <span className="font-bold text-indigo-600 text-xs truncate max-w-[200px]">{row.particella_nombre}</span>
                                                {row.nota_extra && <span className="text-[10px] text-slate-400 italic">{row.nota_extra}</span>}
                                            </div>
                                        ) : <span className="text-slate-400 italic text-xs">No asignado en seating</span>}
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                        {row.particella_status === "AVAILABLE" && (
                                            <a href={row.particella_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold text-xs shadow-sm transition-all active:scale-95">
                                                <IconDownload size={14} /> VER PDF
                                            </a>
                                        )}
                                        {row.particella_status === "PENDING" && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-100 text-[10px] font-bold">
                                                <IconAlertCircle size={12}/> Pendiente de carga
                                            </span>
                                        )}
                                        {row.particella_status === "NO_ASSIGNED" && (
                                            <span className="text-xs text-slate-300 italic">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}