import React, { useEffect, useRef, useState } from "react";
import UniversalTable from "./UniversalTable";
import {
  IconMap,
  IconMapPin,
  IconHotel,
  IconCalendar,
  IconMusic,
  IconGlobe,
  IconTruck,
  IconBus,
  IconBusGrande,
  IconCar,
  IconVan,
  IconPlane,
  IconCalculator,
  IconUsers,
  IconFileText,
  IconLayout,
  IconTag,
  IconBuilding,
  IconAlertTriangle,
  IconChevronDown,
} from "../../components/ui/Icons";
import SheetEditor from "./SheetEditor";

export default function DataView({ supabase }) {
  const [activeTab, setActiveTab] = useState("regiones");
  const [isDirty, setIsDirty] = useState(false);
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const mobilePickerRef = useRef(null);

  // --- ESTADO PARA LOS SELECTS (Catálogos Compartidos) ---
  const [catalogos, setCatalogos] = useState({
    regiones: [],
    localidades: [],
    paises: [],
    categorias: [],
    ensambles: [],
    integrantes: [],
    provincias: [],
  });

  const fetchCatalogos = async () => {
    try {
      const { data: reg } = await supabase
        .from("regiones")
        .select("id, region")
        .order("region");
      const { data: loc } = await supabase
        .from("localidades")
        .select("id, localidad")
        .order("localidad");
      const { data: pais } = await supabase
        .from("paises")
        .select("id, nombre")
        .order("nombre");
      const { data: categoria } = await supabase
        .from("categorias_tipos_eventos")
        .select("id, nombre")
        .order("nombre");
      const { data: ens } = await supabase
        .from("ensambles")
        .select("id, ensamble")
        .order("ensamble");
      const { data: prov } = await supabase
        .from("provincias")
        .select("id, nombre")
        .order("nombre");

      const { data: inte, error: inteError } = await supabase
        .from("integrantes")
        .select("id, nombre, apellido")
        .order("apellido");

      if (inteError) console.error("Error cargando integrantes:", inteError);

      setCatalogos({
        regiones: reg?.map((r) => ({ value: r.id, label: r.region })) || [],
        localidades:
          loc?.map((l) => ({ value: l.id, label: l.localidad })) || [],
        paises: pais?.map((p) => ({ value: p.id, label: p.nombre })) || [],
        categorias:
          categoria?.map((p) => ({ value: p.id, label: p.nombre })) || [],
        ensambles: ens?.map((e) => ({ value: e.id, label: e.ensamble })) || [],
        provincias: prov?.map((p) => ({ value: p.id, label: p.nombre })) || [],
        integrantes:
          inte?.map((i) => ({
            value: i.id,
            label: `${i.apellido}, ${i.nombre}`,
          })) || [],
      });
    } catch (error) {
      console.error("Error general en fetchCatalogos:", error);
    }
  };

  useEffect(() => {
    fetchCatalogos();
  }, []);

  useEffect(() => {
    if (!mobilePickerOpen) return;
    const onDocDown = (e) => {
      if (mobilePickerRef.current && !mobilePickerRef.current.contains(e.target)) {
        setMobilePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [mobilePickerOpen]);

  /** @returns {boolean} true si la pestaña cambió (o ya era la activa) */
  const handleTabChange = (newTabKey) => {
    if (activeTab === newTabKey) return true;
    if (isDirty) {
      if (
        !window.confirm(
          "Tienes elementos nuevos sin guardar. ¿Seguro que quieres cambiar de tabla y perderlos?",
        )
      ) {
        return false;
      }
    }
    setActiveTab(newTabKey);
    setIsDirty(false);
    return true;
  };

  // --- CONFIGURACIÓN DE TABLAS ---
  const tableConfigs = {
    // --- 1. ROLES ---
    roles: {
      label: "Roles y Colores",
      icon: IconTag,
      table: "roles",
      columns: [
        { key: "id", label: "Rol (ID)", type: "text" },
        {
          key: "color",
          label: "Color Distintivo",
          type: "color",
          defaultValue: "#64748b",
        },
        { key: "orden", label: "Orden", type: "int" },
      ],
      warning:
        "🏨 Nota: Por una cuestión de seguridad en los cálculos, no se pueden editar los nombres; pero si necesitan agregar, contáctenme",
    },
    provincias: {
      label: "Provincias",
      icon: IconBuilding,
      table: "provincias",
      columns: [{ key: "nombre", label: "Nombre Provincia", type: "text" }],
    },
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
        {
          key: "id_provincia",
          label: "Provincia",
          type: "select",
          options: catalogos.provincias,
        },
        {
          key: "id_region",
          label: "Región (Logística)",
          type: "select",
          options: catalogos.regiones,
        },
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
        {
          key: "id_localidad",
          label: "Localidad",
          type: "select",
          options: catalogos.localidades,
        },
        { key: "link_mapa", label: "Google Maps", type: "text" },
        { key: "telefono", label: "Teléfono", type: "int8"},
        { key: "mail", label: "E-mail", type: "text" },
      ],
      // --- AVISO ---
      warning:
        "📍 Nota: Si editas el nombre de una locación vinculada a un hotel, el nombre del hotel también se actualizará. Si necesitás crear un hotel, hacelo directamente desde la pestaña 'Hoteles' y luego aparecerá aquí",
    },
    hoteles: {
      label: "Hoteles",
      icon: IconHotel,
      table: "hoteles",
      columns: [
        { key: "nombre", label: "Nombre Hotel", type: "text" },
        { key: "direccion", label: "Dirección", type: "text" },
        {
          key: "id_localidad",
          label: "Localidad",
          type: "select",
          options: catalogos.localidades,
        },
        { key: "email", label: "E-mail", type: "text" },
        { key: "telefono", label: "Teléfono", type: "text" },
      ],
      // --- AVISO ---
      warning:
        "🏨 Nota: Al crear un hotel aquí, se generará automáticamente una locación asociada. No es necesario crearla en la tabla 'locaciones'.",
    },
    tipos_evento: {
      label: "Tipos de Evento",
      icon: IconCalendar,
      table: "tipos_evento",
      columns: [
        { key: "nombre", label: "Nombre Tipo", type: "text" },
        {
          key: "color",
          label: "Etiqueta Color",
          type: "color",
          defaultValue: "#6366f1",
        },
        {
          key: "id_categoria",
          label: "Categoría",
          type: "select",
          options: catalogos.categorias,
        },
      ],
      warning:
        "🏨 Nota: Es importante asignarle una categoría para mejorar el filtrado en las agendas.",
    },
    categorias: {
      label: "Categorías de Eventos",
      icon: IconTag,
      table: "categorias_tipos_eventos",
      columns: [{ key: "nombre", label: "Nombre Categoría", type: "text" }],
    },
    instrumentos: {
      label: "Instrumentos",
      icon: IconMusic,
      table: "instrumentos",
      manualId: true,
      columns: [
        {
          key: "id",
          label: "ID (Código)",
          type: "text",
          placeholder: "Ej: Vln",
          required: true,
        },
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
            { value: "Prod.", label: "Prod." },
          ],
        },
        { key: "abreviatura", label: "Abrev.", type: "text" },
        { key: "plaza_extra", label: "Plaza Extra", type: "checkbox" },
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
      icon: IconBusGrande,
      table: "transportes",
      columns: [
        { key: "id", label: "ID", type: "number" },
        { key: "nombre", label: "Nombre", type: "text" },
        { key: "patente", label: "Patente", type: "text" },
        {
          key: "icon",
          label: "Icono",
          type: "select",
          options: [
            { value: "Bus", label: "Bus" },
            { value: "BusGrande", label: "Bus Grande" },
            { value: "Truck", label: "Truck" },
            { value: "Van", label: "Van" },
            { value: "Plane", label: "Plane" },
            { value: "Car", label: "Car" },
            { value: "Calculator", label: "Calculator" },
          ],
          defaultValue: "Bus",
        },
        {
          key: "color",
          label: "Color Chip",
          type: "color",
          defaultValue: "#6366f1",
        },
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
        {
          key: "id_ensamble",
          label: "Ensamble Asignado",
          type: "select",
          options: catalogos.ensambles,
        },
        {
          key: "id_integrante",
          label: "Integrante (Coordinador)",
          type: "select",
          options: catalogos.integrantes,
        },
      ],
    },
    feriados: {
      label: "Feriados",
      icon: IconAlertTriangle,
      table: "feriados",
      primaryKey: "fecha",
      defaultSort: "fecha",
      columns: [
        { key: "fecha", label: "Fecha", type: "date" },
        { key: "detalle", label: "Detalle", type: "text" },
        {
          key: "es_feriado",
          label: "Es Feriado",
          type: "checkbox",
        },
      ],
      warning:
        "📅 Nota: Los feriados aparecen como advertencia en la agenda. Si 'Es Feriado' está marcado, se muestra en rojo; si no, en amarillo (día no laborable).",
    },
  };

  const currentConfig = tableConfigs[activeTab];

  const mobileNavItems = [
    ...Object.keys(tableConfigs).map((key) => ({
      value: key,
      label: tableConfigs[key].label,
      Icon: tableConfigs[key].icon,
    })),
    {
      value: "hoja_calculo",
      label: "Hoja de Cálculo / PDF",
      Icon: IconFileText,
    },
  ].sort((a, b) =>
    a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
  );

  const selectedMobileItem =
    mobileNavItems.find((i) => i.value === activeTab) ?? mobileNavItems[0];
  const SelectedMobileIcon = selectedMobileItem?.Icon ?? IconFileText;

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 bg-slate-50 gap-4 p-4">
      {/* Móvil / tablet: desplegable con iconos (orden alfabético) */}
      <div
        ref={mobilePickerRef}
        className="block md:hidden w-full shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 p-3 relative z-30"
      >
        <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Tabla activa
        </span>
        <button
          type="button"
          onClick={() => setMobilePickerOpen((o) => !o)}
          className="w-full flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 min-h-[44px] text-left text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        >
          <SelectedMobileIcon
            size={18}
            className="shrink-0 text-indigo-600"
            aria-hidden
          />
          <span className="flex-1 min-w-0 truncate">
            {selectedMobileItem?.label}
          </span>
          <IconChevronDown
            size={18}
            className={`shrink-0 text-slate-400 transition-transform ${mobilePickerOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {mobilePickerOpen && (
          <ul
            className="absolute left-3 right-3 top-full mt-1 max-h-[min(22rem,70vh)] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl z-40"
            role="listbox"
          >
            {mobileNavItems.map((item) => {
              const isActive = activeTab === item.value;
              const ItemIcon = item.Icon;
              return (
                <li key={item.value} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => {
                      if (handleTabChange(item.value)) {
                        setMobilePickerOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <ItemIcon
                      size={18}
                      className={
                        isActive ? "text-indigo-600 shrink-0" : "text-slate-400 shrink-0"
                      }
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Desktop: Sidebar de Navegación */}
      <div className="hidden md:flex w-full md:w-64 bg-white rounded-xl shadow-sm border border-slate-200 flex-col shrink-0 overflow-hidden">
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
            <IconFileText
              size={18}
              className={
                activeTab === "hoja_calculo"
                  ? "text-indigo-600"
                  : "text-slate-400"
              }
            />
            Hoja de Cálculo / PDF
          </button>
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col h-[calc(100vh-200px)] md:h-auto md:min-h-0">
        {activeTab === "hoja_calculo" && (
          <div className="flex-1 min-h-0 overflow-auto">
            <SheetEditor supabase={supabase} />
          </div>
        )}

        {currentConfig && (
          <div className="flex-1 min-h-0 flex flex-col">
            <UniversalTable
              key={activeTab}
              supabase={supabase}
              tableName={currentConfig.table}
              columns={currentConfig.columns}
              primaryKey={currentConfig.primaryKey}
              defaultSort={currentConfig.defaultSort}
              onDataChange={fetchCatalogos}
              onDirtyChange={setIsDirty}
              warningMessage={currentConfig.warning}
            />
          </div>
        )}
      </div>
    </div>
  );
}
