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
  IconFileText, // <--- Asegúrate de importar un ícono para la hoja (o usa uno existente)
} from "../../components/ui/Icons";
import SheetEditor from './SheetEditor';

export default function DataView({ supabase }) {
  const [activeTab, setActiveTab] = useState("regiones");

  // --- ESTADO PARA LOS SELECTS (Catálogos Compartidos) ---
  const [catalogos, setCatalogos] = useState({
    regiones: [],
    localidades: [],
    paises: [],
    categorias: [],
  });

  const fetchCatalogos = async () => {
    // 1. Regiones
    const { data: reg } = await supabase.from("regiones").select("id, region").order("region");
    // 2. Localidades
    const { data: loc } = await supabase.from("localidades").select("id, localidad").order("localidad");
    // 3. Países
    const { data: pais } = await supabase.from("paises").select("id, nombre").order("nombre");
    // 4. Categorías
    const { data: categoria } = await supabase.from("categorias_tipos_eventos").select("id, nombre").order("nombre");

    setCatalogos({
      regiones: reg?.map((r) => ({ value: r.id, label: r.region })) || [],
      localidades: loc?.map((l) => ({ value: l.id, label: l.localidad })) || [],
      paises: pais?.map((p) => ({ value: p.id, label: p.nombre })) || [],
      categorias: categoria?.map((p) => ({ value: p.id, label: p.nombre })) || [],
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
        { key: "estrellas", label: "Estrellas/Cat", type: "text" },
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
    transportes: {
      label: "Transporte",
      icon: IconTruck,
      table: "transportes",
      columns: [
        { key: "id", label: "ID", type: "number" },
        { key: "nombre", label: "Nombre", type: "text" },
      ],
    },
    // NOTA: No agregamos "hoja_calculo" aquí porque no es una UniversalTable estándar
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
          {/* Botones automáticos para tablas */}
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
                <config.icon
                  size={18}
                  className={isActive ? "text-indigo-600" : "text-slate-400"}
                />
                {config.label}
              </button>
            );
          })}
          
          {/* Separador */}
          <div className="my-2 border-t border-slate-100 mx-2"></div>

          {/* --- NUEVO: Botón Manual para Hoja de Cálculo --- */}
          <button
            onClick={() => setActiveTab("hoja_calculo")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "hoja_calculo"
                ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
             {/* Si no tienes IconFileText, usa IconCalendar o IconMapPin temporalmente */}
            <IconFileText size={18} className={activeTab === "hoja_calculo" ? "text-indigo-600" : "text-slate-400"} />
            Hoja de Cálculo / PDF
          </button>
        </div>
      </div>

      {/* Área Principal (Tabla o Editor) */}
      <div className="flex-1 min-w-0 h-[600px] md:h-auto">
        
        {/* --- NUEVO: Lógica de visualización --- */}
        
        {/* 1. Si el tab es 'hoja_calculo', mostramos el Editor */}
        {activeTab === "hoja_calculo" && (
           <SheetEditor supabase={supabase} />
        )}

        {/* 2. Si hay configuración de tabla (tab normal), mostramos UniversalTable */}
        {currentConfig && (
          <UniversalTable
            key={activeTab}
            supabase={supabase}
            tableName={currentConfig.table}
            columns={currentConfig.columns}
            onDataChange={fetchCatalogos}
          />
        )}
      </div>
    </div>
  );
}