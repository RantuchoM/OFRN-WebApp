import React, { useEffect, useState } from "react";
import UniversalTable from "./UniversalTable";
import {
  IconMap,
  IconMapPin,
  IconHotel,
  IconCalendar,
  IconMusic,
  IconGlobe,
  IconTruck,
  IconUsers,
  IconFileText,
  IconLayout,
  IconTag, 
} from "../../components/ui/Icons";
import SheetEditor from './SheetEditor';

export default function DataView({ supabase }) {
  const [activeTab, setActiveTab] = useState("regiones");
  const [isDirty, setIsDirty] = useState(false);

  // --- ESTADO PARA LOS SELECTS (Catálogos Compartidos) ---
  const [catalogos, setCatalogos] = useState({
    regiones: [],
    localidades: [],
    paises: [],
    categorias: [],
    ensambles: [],
    integrantes: [], 
  });

  const fetchCatalogos = async () => {
    try {
        const { data: reg } = await supabase.from("regiones").select("id, region").order("region");
        const { data: loc } = await supabase.from("localidades").select("id, localidad").order("localidad");
        const { data: pais } = await supabase.from("paises").select("id, nombre").order("nombre");
        const { data: categoria } = await supabase.from("categorias_tipos_eventos").select("id, nombre").order("nombre");
        const { data: ens } = await supabase.from("ensambles").select("id, ensamble").order("ensamble");
        
        const { data: inte, error: inteError } = await supabase
            .from("integrantes")
            .select("id, nombre, apellido") 
            .order("apellido");

        if (inteError) console.error("Error cargando integrantes:", inteError);

        setCatalogos({
          regiones: reg?.map((r) => ({ value: r.id, label: r.region })) || [],
          localidades: loc?.map((l) => ({ value: l.id, label: l.localidad })) || [],
          paises: pais?.map((p) => ({ value: p.id, label: p.nombre })) || [],
          categorias: categoria?.map((p) => ({ value: p.id, label: p.nombre })) || [],
          ensambles: ens?.map((e) => ({ value: e.id, label: e.ensamble })) || [],
          integrantes: inte?.map((i) => ({ 
            value: i.id, 
            label: `${i.apellido}, ${i.nombre}` 
          })) || [],
        });
    } catch (error) {
        console.error("Error general en fetchCatalogos:", error);
    }
  };

  useEffect(() => {
    fetchCatalogos();
  }, []);

  // --- FUNCIÓN SEGURA DE CAMBIO DE PESTAÑA ---
  const handleTabChange = (newTabKey) => {
    if (activeTab === newTabKey) return;

    if (isDirty) {
      if (!window.confirm("Tienes elementos nuevos sin guardar. ¿Seguro que quieres cambiar de tabla y perderlos?")) {
        return;
      }
    }
    setActiveTab(newTabKey);
    setIsDirty(false); 
  };

  // --- CONFIGURACIÓN DE TABLAS ---
  const tableConfigs = {
    
    regiones: {
      label: "Regiones",
      icon: IconMap,
      table: "regiones",
      columns: [{ key: "region", label: "Nombre Región", type: "text" }],
    },
    localidades: {
      label: "Localidades",
      icon: IconMapPin,
      table: "localidades",
      columns: [
        { key: "localidad", label: "Nombre Localidad", type: "text" },
        { key: "cp", label: "Código Postal", type: "text" },
        { key: "id_region", label: "Región", type: "select", options: catalogos.regiones },
      ],
    },
    locaciones: {
      label: "Locaciones / Venues",
      icon: IconMapPin,
      table: "locaciones",
      columns: [
        { key: "nombre", label: "Nombre del Lugar", type: "text" },
        { key: "direccion", label: "Dirección", type: "text" },
        { key: "capacidad", label: "Aforo", type: "text" },
        { key: "id_localidad", label: "Localidad", type: "select", options: catalogos.localidades },
      ],
    },
    hoteles: {
      label: "Hoteles",
      icon: IconHotel,
      table: "hoteles",
      columns: [
        { key: "nombre", label: "Nombre Hotel", type: "text" },
        { key: "direccion", label: "Dirección", type: "text" },
        { key: "id_localidad", label: "Localidad", type: "select", options: catalogos.localidades },
      ],
    },
    tipos_evento: {
      label: "Tipos de Evento",
      icon: IconCalendar,
      table: "tipos_evento",
      columns: [
        { key: "nombre", label: "Nombre Tipo", type: "text" },
        { key: "color", label: "Etiqueta Color", type: "color", defaultValue: "#6366f1" },
        { key: "id_categoria", label: "Categoría", type: "select", options: catalogos.categorias },
      ],
    },
      categorias: {
      label: "Categorías de Eventos",
      icon: IconTag, 
      table: "categorias_tipos_eventos",
      columns: [
        { key: "nombre", label: "Nombre Categoría", type: "text" }
      ],
    },
    instrumentos: {
      label: "Instrumentos",
      icon: IconMusic,
      table: "instrumentos",
      columns: [
        { key: "instrumento", label: "Instrumento", type: "text" },
        {
          key: "familia",
          label: "Familia",
          type: "select",
          options: [
            { value: "Maderas", label: "Maderas" },
            { value: "Bronces", label: "Bronces" },
            { value: "Percusión", label: "Percusión" },
            { value: "Cuerdas", label: "Cuerdas" },
            { value: "Teclas/Otros", label: "Teclas/Otros" },
          ],
        },
        { key: "abreviatura", label: "Abrev.", type: "text" },
        {key: "plaza_extra", label: "Plaza Extra", type: "checkbox" }
      ],
    },
    paises: {
      label: "Países",
      icon: IconGlobe,
      table: "paises",
      columns: [
        { key: "nombre", label: "Nombre País", type: "text" },
        { key: "iso", label: "ISO Code", type: "text" },
      ],
    },
    // --- AQUÍ ESTÁ EL CAMBIO ---
    transportes: {
      label: "Transporte",
      icon: IconTruck,
      table: "transportes",
      columns: [
        { key: "id", label: "ID", type: "number" }, // Generalmente readonly, UniversalTable lo maneja
        { key: "nombre", label: "Nombre", type: "text" },
        // Nueva columna de color:
        { key: "color", label: "Color Chip", type: "color", defaultValue: "#6366f1" } 
      ],
    },
    ensambles: {
      label: "Ensambles",
      icon: IconLayout,
      table: "ensambles",
      columns: [
        { key: "ensamble", label: "Nombre Ensamble", type: "text" },
        { key: "descripcion", label: "Descripción", type: "text" },
      ],
    },
    coordinadores: {
      label: "Coordinadores",
      icon: IconUsers,
      table: "ensambles_coordinadores",
      columns: [
        { key: "id_ensamble", label: "Ensamble Asignado", type: "select", options: catalogos.ensambles },
        { key: "id_integrante", label: "Integrante (Coordinador)", type: "select", options: catalogos.integrantes },
      ],
    },
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
                onClick={() => handleTabChange(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <config.icon
                  size={18}
                  className={isActive ? "text-indigo-600" : "text-slate-400"}
                />
                {config.label}
              </button>
            );
          })}
          
          <div className="my-2 border-t border-slate-100 mx-2"></div>

          <button
            onClick={() => handleTabChange("hoja_calculo")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "hoja_calculo"
                ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <IconFileText size={18} className={activeTab === "hoja_calculo" ? "text-indigo-600" : "text-slate-400"} />
            Hoja de Cálculo / PDF
          </button>
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 min-w-0 h-[600px] md:h-auto">
        {activeTab === "hoja_calculo" && (
           <SheetEditor supabase={supabase} />
        )}

        {currentConfig && (
          <UniversalTable
            key={activeTab}
            supabase={supabase}
            tableName={currentConfig.table}
            columns={currentConfig.columns}
            onDataChange={fetchCatalogos}
            onDirtyChange={setIsDirty}
          />
        )}
      </div>
    </div>
  );
}