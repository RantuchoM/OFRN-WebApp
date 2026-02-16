import React, { useMemo, useState, useRef } from "react";
import {
  IconLoader,
  IconX,
  IconCheck,
  IconEdit,
  IconTrash,
  IconCopy,
  IconSettings,
} from "../ui/Icons";
import DateInput from "../ui/DateInput";
import TimeInput from "../ui/TimeInput";
import SearchableSelect from "../ui/SearchableSelect";
import ConfirmModal from "../ui/ConfirmModal";
import { useAuth } from "../../context/AuthContext";

export default function EventForm({
  formData,
  setFormData,
  onSave,
  onClose,
  onDelete,
  onDuplicate,
  loading,
  eventTypes = [],
  locations = [],
  isNew = false,
}) {
  const { isEditor, isManagement } = useAuth();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // 1. Referencia inicial y detección de cambios
  const initialData = useMemo(() => ({ ...formData }), []);
  const isDirty = useMemo(() => {
    return JSON.stringify(initialData) !== JSON.stringify(formData);
  }, [formData, initialData]);

  // 2. Opciones de ubicación
  const locationOptions = useMemo(() => {
    return locations.map((l) => ({
      id: l.id,
      label: `${l.nombre} (${l.localidades?.localidad || l.localidad?.localidad || "S/D"})`,
    }));
  }, [locations]);
  // 2. CREAR LA REFERENCIA
  const editorRef = useRef(null);

  // 3. FUNCIÓN CORREGIDA (Usa la ref y verifica que exista)
  const handleExecCommand = (command) => {
    // 1. Asegurar que tenemos la referencia antes de nada
    if (!editorRef.current) return;

    // 2. Ejecutar el comando. Esto modificará el DOM del div.
    document.execCommand(command, false, null);

    // 3. Forzar el foco de vuelta al editor para mantener la selección
    // (Esto es crucial para poder hacer click en "B" y luego en "I" seguido)
    editorRef.current.focus();

    // 4. Actualizar el estado manualmente leyendo el DOM actual
    // Lo hacemos AQUÍ directamente para tener la versión más fresca
    const newHtml = editorRef.current.innerHTML;
    setFormData((prev) => ({ ...prev, descripcion: newHtml }));
  };
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getSelectedTypeColor = () => {
    if (!formData.id_tipo_evento) return "transparent";
    const type = eventTypes.find(
      (t) => String(t.id) === String(formData.id_tipo_evento),
    );
    return type?.color || "#94a3b8";
  };

  // 3. FUNCIONES DE CIERRE (Ajustadas a tu ConfirmModal)
  const handleSafeClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onClose(); // Si no hay cambios, cerramos directo
    }
  };

  return (
    <div
      className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh] relative"
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <IconEdit size={18} /> {isNew ? "Nuevo Evento" : "Editar Evento"}
        </h3>
        <button
          onClick={handleSafeClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* BODY */}
      <div className="p-5 space-y-5 overflow-y-auto">
        <div className="col-span-2">
          <div className="flex justify-between items-end mb-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">
              Descripción / Título
            </label>

            <div className="flex gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
              <button
                type="button"
                // onMouseDown evita que el editor pierda el foco al hacer click en el botón
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleExecCommand("bold");
                }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-700 font-bold text-xs transition-colors"
                title="Negrita"
              >
                B
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleExecCommand("italic");
                }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-700 italic text-xs transition-colors"
                title="Cursiva"
              >
                I
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleExecCommand("underline");
                }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-700 underline text-xs transition-colors"
                title="Subrayado"
              >
                U
              </button>
            </div>
          </div>

          <div className="w-full border border-slate-300 rounded overflow-hidden focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-500 transition-all">
            <div
              ref={editorRef}
              id="rich-editor"
              contentEditable
              suppressContentEditableWarning={true}
              className="p-3 text-sm outline-none min-h-[80px] max-h-[150px] overflow-y-auto bg-white whitespace-pre-wrap"
              // CORRECCIÓN CLAVE AQUÍ:
              onInput={(e) => {
                // 1. Capturamos el valor INMEDIATAMENTE en una variable
                // No usamos e.currentTarget dentro del setFormData porque el evento puede limpiarse
                const htmlContent = e.currentTarget.innerHTML;

                // 2. Actualizamos el estado usando esa variable
                setFormData((prev) => ({ ...prev, descripcion: htmlContent }));
              }}
              // Manejo del foco inicial (solo si está vacío y tenemos datos)
              onFocus={() => {
                if (
                  editorRef.current &&
                  !editorRef.current.innerHTML &&
                  formData.descripcion
                ) {
                  editorRef.current.innerHTML = formData.descripcion;
                }
              }}
            />
          </div>

          {/* Efecto para cargar el valor inicial una sola vez al montar o cambiar el evento */}
          {React.useEffect(() => {
            // Solo si tenemos referencia y datos
            if (editorRef.current && formData.descripcion !== undefined) {
              // Y SOLO si el contenido visual es diferente al dato (para evitar loops)
              if (editorRef.current.innerHTML !== formData.descripcion) {
                // Y CRUCIAL: Solo si NO estamos escribiendo en él activamente
                if (document.activeElement !== editorRef.current) {
                  editorRef.current.innerHTML = formData.descripcion;
                }
              }
            }
          }, [formData.id, formData.descripcion])}
          {/* Dependencia formData.id para que se resetee al cambiar de evento, pero no en cada letra */}

          <p className="text-[9px] text-slate-400 mt-1 text-right">
            Escribe libremente. Usa los botones para formato.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <DateInput
            label="Fecha*"
            value={formData.fecha || ""}
            onChange={(val) => handleChange("fecha", val)}
          />

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Tipo de Evento
            </label>
            <div className="relative">
              <div
                className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-slate-200 shadow-sm pointer-events-none z-10"
                style={{ backgroundColor: getSelectedTypeColor() }}
              ></div>
              <select
                className="w-full border border-slate-300 rounded-lg py-2 pl-7 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                value={formData.id_tipo_evento || ""}
                onChange={(e) => handleChange("id_tipo_evento", e.target.value)}
              >
                <option value="">-- Seleccionar --</option>
                {eventTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TimeInput
            label="Hora Inicio*"
            value={formData.hora_inicio || ""}
            onChange={(val) => handleChange("hora_inicio", val)}
          />
          <TimeInput
            label="Hora Fin"
            value={formData.hora_fin || ""}
            onChange={(val) => handleChange("hora_fin", val)}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Ubicación / Sala
          </label>
          <SearchableSelect
            options={locationOptions}
            value={formData.id_locacion}
            onChange={(val) => handleChange("id_locacion", val)}
            placeholder="Buscar ubicación..."
            className="w-full"
          />
        </div>

        {(isEditor || isManagement) && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.tecnica ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-300 group-hover:border-indigo-400"}`}
              >
                {formData.tecnica && (
                  <IconCheck size={14} className="text-white" strokeWidth={3} />
                )}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={formData.tecnica || false}
                onChange={(e) => handleChange("tecnica", e.target.checked)}
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                  <IconSettings size={12} className="text-slate-400" /> Evento
                  Técnico
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Visible solo para gestión técnica y producción
                </span>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <div className="flex gap-2">
          {!isNew && (
            <>
              {onDelete && (
                <button
                  onClick={onDelete}
                  disabled={loading}
                  className="p-2 text-red-500 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                >
                  <IconTrash size={16} />{" "}
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              )}
              {onDuplicate && (
                <button
                  onClick={onDuplicate}
                  disabled={loading}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                >
                  <IconCopy size={16} />{" "}
                  <span className="hidden sm:inline">Duplicar</span>
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSafeClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            {loading ? (
              <IconLoader className="animate-spin" />
            ) : (
              <IconCheck size={18} />
            )}
            {isNew ? "Crear" : "Guardar"}
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN - Usando tus props: isOpen, onClose, onConfirm */}
      <ConfirmModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)} // 'onClose' vuelve al formulario
        onConfirm={onClose} // 'onConfirm' ejecuta el cierre real del formulario
        title="Cambios sin guardar"
        message="Tienes modificaciones pendientes. Si sales ahora, se perderán todos los cambios realizados en este evento."
        confirmText="Descartar y salir"
        cancelText="Continuar editando"
      />
    </div>
  );
}
