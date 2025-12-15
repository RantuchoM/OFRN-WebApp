// src/views/Giras/MyPartsViewer.jsx
import React, { useState, useEffect } from "react";
import {
  IconLoader,
  IconDownload,
  IconDrive,
  IconLayers,
  IconAlertCircle // Agregamos ícono para pendiente
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
      // 1. Obtener el instrumento del usuario
      const { data: userData } = await supabase
        .from("integrantes")
        .select("id, nombre, apellido, id_instr") 
        .eq("id", user.id)
        .single();

      const myInstrumentId = userData?.id_instr; 
      setUserInstrument(myInstrumentId ? `Instrumento: ${myInstrumentId}` : "Sin instrumento asignado");

      // 2. Obtener Repertorio
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

      // 3. Procesar datos
      let processed = [];

      (progRepData || []).forEach(cat => {
          if(!cat.repertorio_obras) return;
          const sortedWorks = cat.repertorio_obras.sort((a,b) => a.orden - b.orden);

          sortedWorks.forEach(item => {
              if (item.excluir || !item.obras) return;
              const obra = item.obras;

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

              // Buscar particella
              const myPart = obra.obras_particellas?.find(
                  p => p.id_instrumento === myInstrumentId
              );

              // --- LOGICA DE LIMPIEZA DE URL ---
              let cleanUrl = null;
              if (myPart?.url_archivo) {
                  try {
                      // Intentamos parsear si viene como string JSON
                      if (myPart.url_archivo.trim().startsWith("[")) {
                          const parsed = JSON.parse(myPart.url_archivo);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                              cleanUrl = parsed[0].url;
                          }
                      } else {
                          // Si es texto plano, lo usamos directo
                          cleanUrl = myPart.url_archivo;
                      }
                  } catch (e) {
                      console.warn("Error parseando URL:", e);
                      cleanUrl = myPart.url_archivo; // Fallback
                  }
              }

              // --- DETERMINAR ESTADO ---
              // Estado 1: "No asignado" -> No existe registro en obras_particellas para mi instrumento
              // Estado 2: "Pendiente" -> Existe registro, pero no tiene URL
              // Estado 3: "Disponible" -> Existe registro y tiene URL
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
                
                particella_status: status, // Nuevo campo de estado
                particella_link: cleanUrl,
                particella_nombre: myPart?.nombre_archivo || myInstrumentId,
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
                <div className="p-8 text-center text-slate-400 italic">No hay obras cargadas.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Obra</th>
                                <th className="px-4 py-3 text-center">Carpeta</th>
                                <th className="px-4 py-3">Parte</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {repertoire.map((row) => (
                                <tr key={row.uniqueId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-900 whitespace-pre-wrap">{row.titulo}</div>
                                        <div className="text-xs text-slate-500">{row.compositor}</div>
                                    </td>
                                    
                                    <td className="px-4 py-3 text-center">
                                        {row.link_drive_obra ? (
                                            <a href={row.link_drive_obra} target="_blank" rel="noopener noreferrer" className="inline-flex p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded" title="Carpeta General">
                                                <IconDrive size={18} />
                                            </a>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>

                                    <td className="px-4 py-3 text-slate-600">
                                        {row.particella_status !== "NO_ASSIGNED" ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium text-indigo-600">{row.particella_nombre}</span>
                                                {row.nota_extra && <span className="text-[10px] text-slate-400">{row.nota_extra}</span>}
                                            </div>
                                        ) : <span className="text-slate-400 italic text-xs">No asignado</span>}
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                        {/* LÓGICA DE BOTONES SEGÚN ESTADO */}
                                        {row.particella_status === "AVAILABLE" && (
                                            <a href={row.particella_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold text-xs shadow-sm">
                                                <IconDownload size={14} /> Ver PDF
                                            </a>
                                        )}
                                        {row.particella_status === "PENDING" && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-100 text-[10px] font-bold">
                                                <IconAlertCircle size={12}/> Pendiente
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