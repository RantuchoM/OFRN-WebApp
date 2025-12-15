import React, { useEffect, useState } from "react";
import UniversalTable from "./UniversalTable";
import { 
  IconMap, 
  IconMapPin, 
  IconHotel, 
  IconCalendar, 
  IconMusic, 
  IconGlobe 
} from "../../components/ui/Icons";

export default function DataView({ supabase }) {
  const [activeTab, setActiveTab] = useState("regiones");
  
  // --- ESTADO PARA LOS SELECTS (Catálogos Compartidos) ---
  const [catalogos, setCatalogos] = useState({
    regiones: [],
    localidades: [],
    paises: []
  });

  // Función para cargar los catálogos que usan otras tablas
  const fetchCatalogos = async () => {
    // 1. Regiones
    const { data: reg } = await supabase.from("regiones").select("id, region").order("region");
    // 2. Localidades
    const { data: loc } = await supabase.from("localidades").select("id, localidad").order("localidad");
    // 3. Países (asumo tabla paises o similar, si existe)
    const { data: pais } = await supabase.from("paises").select("id, nombre").order("nombre");

    setCatalogos({
      regiones: reg?.map(r => ({ value: r.id, label: r.region })) || [],
      localidades: loc?.map(l => ({ value: l.id, label: l.localidad })) || [],
      paises: pais?.map(p => ({ value: p.id, label: p.nombre })) || []
    });
  };

  useEffect(() => {
    fetchCatalogos();
  }, []);

  // --- CONFIGURACIÓN DE TABLAS ---
  const tableConfigs = {
    regiones: {
      label: "Regiones",
      icon: IconMap,
      table: "regiones",
      columns: [
        { key: "region", label: "Nombre Región", type: "text" }
      ]
    },
    localidades: {
      label: "Localidades",
      icon: IconMapPin,
      table: "localidades",
      columns: [
        { key: "localidad", label: "Nombre Localidad", type: "text" },
        { key: "cp", label: "Código Postal", type: "text" },
        // Aquí usamos el catálogo de regiones cargado arriba
        { key: "id_region", label: "Región", type: "select", options: catalogos.regiones }
      ]
    },
    locaciones: {
      label: "Locaciones / Venues",
      icon: IconMapPin,
      table: "locaciones",
      columns: [
        { key: "nombre", label: "Nombre del Lugar", type: "text" },
        { key: "direccion", label: "Dirección", type: "text" },
        { key: "capacidad", label: "Aforo", type: "text" },
        { key: "id_localidad", label: "Localidad", type: "select", options: catalogos.localidades }
      ]
    },
    hoteles: {
      label: "Hoteles",
      icon: IconHotel,
      table: "hoteles", // Asegúrate que esta tabla exista en tu DB, si no, usa locaciones con un filtro
      columns: [
        { key: "nombre", label: "Nombre Hotel", type: "text" },
        { key: "estrellas", label: "Estrellas/Cat", type: "text" },
        { key: "direccion", label: "Dirección", type: "text" },
        { key: "id_localidad", label: "Localidad", type: "select", options: catalogos.localidades }
      ]
    },
    tipos_evento: {
      label: "Tipos de Evento",
      icon: IconCalendar,
      table: "tipos_evento",
      columns: [
        { key: "nombre", label: "Nombre Tipo", type: "text" },
        // Selector de color solicitado
        { key: "color", label: "Etiqueta Color", type: "color", defaultValue: "#6366f1" } 
      ]
    },
    instrumentos: {
      label: "Instrumentos",
      icon: IconMusic,
      table: "instrumentos",
      columns: [
        { key: "instrumento", label: "Instrumento", type: "text" },
        { key: "familia", label: "Familia", type: "select", options: [
            { value: "Maderas", label: "Maderas" },
            { value: "Metales", label: "Metales" },
            { value: "Percusión", label: "Percusión" },
            { value: "Cuerdas", label: "Cuerdas" },
            { value: "Teclas/Otros", label: "Teclas/Otros" }
        ]},
        { key: "abreviatura", label: "Abrev.", type: "text" }
      ]
    },
     paises: {
      label: "Países",
      icon: IconGlobe,
      table: "paises",
      columns: [
        { key: "nombre", label: "Nombre País", type: "text" },
        { key: "iso", label: "ISO Code", type: "text" }
      ]
    }
  };

  const currentConfig = tableConfigs[activeTab];

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-50 gap-4 p-4">
      {/* Sidebar de Navegación */}
      <div className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800">Administrar Datos</h2>
          <p className="text-xs text-slate-500">Tablas maestras del sistema</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {Object.keys(tableConfigs).map((key) => {
            const config = tableConfigs[key];
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <config.icon size={18} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Área Principal (Tabla) */}
      <div className="flex-1 min-w-0 h-[600px] md:h-auto">
        {currentConfig && (
          <UniversalTable
            key={activeTab} // Forzar remontaje al cambiar de tab para limpiar estados
            supabase={supabase}
            tableName={currentConfig.table}
            columns={currentConfig.columns}
            // Cuando se guarde algo en UniversalTable, recargamos los catálogos globales
            // por si agregamos una Región nueva, que aparezca en el select de Localidades.
            onDataChange={fetchCatalogos}
          />
        )}
      </div>
    </div>
  );
}