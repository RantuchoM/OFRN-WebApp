// src/views/Giras/RoomingManager.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  IconHotel,
  IconArrowRight,
  IconLoader,
  IconPlus,
  IconBed,
  IconTrash,
  IconMapPin,
  IconEdit,
  IconChevronDown,
  IconFileText,
  IconRefresh,
  IconX,
  IconList,
  IconHelpCircle,
  IconAlertTriangle, // <--- AGREGAR ESTE
  IconUser,
  IconHome,
  IconCopy,
} from "../../components/ui/Icons";
import CommentsManager from "../../components/comments/CommentsManager";
import CommentButton from "../../components/comments/CommentButton";
import RoomingReportModal from "./RoomingReport";
import InitialOrderReportModal from "./RoomingInitialOrderReport";
import RoomingInitialAdjustmentModal from "./RoomingInitialAdjustmentModal";
import ImportHotelModal from "./ImportHotelModal";
import { useGiraRoster } from "../../hooks/useGiraRoster";
import { useLogistics } from "../../hooks/useLogistics"; // <--- CAMBIO CLAVE

const normalizeIntegranteId = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeStatus = (value) =>
  String(value || "")
    .toLowerCase()
    .trim();

// Compatibilidad: en rooming consideramos "activos" todos salvo ausente/baja/no_convocado.
// Evita vaciar habitaciones históricas con estados legacy (ej: "presente").
const isActiveForRooming = (person) => {
  const status = normalizeStatus(person?.estado_gira || person?.estado);
  return status !== "ausente" && status !== "baja" && status !== "no_convocado";
};

const hospedajeExclusionErrorMessage = (err) => {
  const code = err?.code;
  const msg = (
    err?.message ||
    err?.error_description ||
    err?.details ||
    ""
  ).trim();
  const hint = err?.hint;
  if (
    code === "23503" ||
    /foreign key constraint/i.test(msg) ||
    /violates foreign key/i.test(msg)
  ) {
    return [
      "No se pudo guardar en «no alojados».",
      "Suele ocurrir si el integrante no existe en la tabla maestra (integrantes) o el id llegó en formato incorrecto.",
      "Revisá en consola el detalle o en Supabase que el id_integrante sea válido.",
    ].join(" ");
  }
  if (code === "23505" || /duplicate key/i.test(msg)) {
    return "Ya estaba registrado como no alojado.";
  }
  if (msg) return `No se pudo marcar como no alojado: ${msg}`;
  if (hint) return `No se pudo marcar como no alojado: ${hint}`;
  return "No se pudo marcar como no alojado (error desconocido). Revisá la consola.";
};

// --- MODAL DE AYUDA ---
const HelpModal = ({ onClose }) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
      >
        <IconX size={20} />
      </button>
      <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
        <IconHelpCircle className="text-indigo-600" /> Cómo usar el Rooming
      </h3>
      <div className="space-y-4 text-sm text-slate-600">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <h4 className="font-bold text-slate-800 mb-1">
            🖱️ Selección y Arrastre
          </h4>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>
              <strong>Click:</strong> Selecciona una persona.
            </li>
            <li>
              <strong>Ctrl + Click:</strong> Selecciona varias personas
              individualmente.
            </li>
            <li>
              <strong>Shift + Click:</strong> Selecciona un rango de personas.
            </li>
            <li>
              <strong>Arrastrar:</strong> Mueve a todas las personas
              seleccionadas a una habitación o a "Nueva".
            </li>
            <li>
              <strong>Esc:</strong> Cancela la selección actual.
            </li>
          </ul>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <h4 className="font-bold text-slate-800 mb-1">
            🏨 Gestión de Habitaciones
          </h4>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>
              Las habitaciones más nuevas aparecen <strong>arriba</strong>.
            </li>
            <li>
              Usa el menú <strong>(...)</strong> en cada tarjeta para editar,
              comentar, mover o eliminar.
            </li>
            <li>
              Puedes arrastrar personas al cuadro punteado para crear una
              habitación nueva automáticamente.
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700"
        >
          Entendido
        </button>
      </div>
    </div>
  </div>
);
// --- MODAL: FALTAN DATOS ---
const MissingDataModal = ({ people, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
        >
          <IconX size={20} />
        </button>
        <h3 className="text-xl font-bold text-amber-700 mb-4 flex items-center gap-2">
          <IconAlertTriangle className="text-amber-600" /> Datos Faltantes
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Las siguientes personas están asignadas a una habitación pero les
          falta información crítica para el hotel:
        </p>
        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold sticky top-0">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Falta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {people.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 font-medium text-slate-700">
                    {p.apellido}, {p.nombre}
                  </td>
                  <td className="p-3 text-red-600 font-bold text-xs">
                    {p.missingFields.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
// --- MODAL: AGREGAR/EDITAR HOTEL ---
const HotelForm = ({
  onSubmit,
  onClose,
  locationsList,
  masterHotels,
  initialData,
}) => {
  const [mode, setMode] = useState(initialData ? "select" : "select");
  const [formData, setFormData] = useState({
    id_hotel: initialData?.id_hotel || "",
    nombre: initialData?.nombre || "",
    id_localidad: initialData?.id_localidad || "",
  });

  const activeLocIds = new Set(
    masterHotels.map((h) => h.id_localidad).filter((id) => id !== null),
  );
  const hasNullLocHotels = masterHotels.some((h) => h.id_localidad === null);
  const visibleLocations = locationsList.filter((l) => activeLocIds.has(l.id));

  const filteredHotels = masterHotels.filter((h) => {
    if (formData.id_localidad === "null") return h.id_localidad === null;
    if (!formData.id_localidad) return true;
    return h.id_localidad === parseInt(formData.id_localidad);
  });
  const handleSubmit = () => {
    // Validaciones
    if (mode === "select" && !formData.id_hotel)
      return alert("Selecciona un hotel");

    if (mode === "create" && (!formData.nombre || !formData.id_localidad))
      return alert("Completa nombre y localidad");

    // Enviar datos al padre
    onSubmit({
      ...formData,
      mode,
      // IMPORTANTE: Pasamos el ID de la relación (programas_hospedajes)
      // para que el padre sepa que es una EDICIÓN y no una creación.
      id: initialData?.id,
    });

    // Cerrar modal (opcional si el padre lo cierra, pero tu código original lo tenía aquí)
    onClose();
    // Nota: En tu implementación de handleSaveHotel ya llamas a setShowHotelForm(false),
    // por lo que podrías quitar este onClose() si quieres evitar parpadeos,
    // pero dejarlo no rompe nada.
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
      <div className="bg-white rounded-lg shadow-xl w-96 p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-lg text-indigo-900">
            {initialData ? "Editar Hotel" : "Agregar Hotel"}
          </h3>
          <button onClick={onClose}>
            <IconX size={20} className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">
              Localidad
            </label>
            <select
              className="w-full border p-2 rounded text-sm bg-white"
              value={formData.id_localidad}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  id_localidad: e.target.value,
                  id_hotel: "",
                })
              }
            >
              <option value="">-- Todas --</option>
              {hasNullLocHotels && (
                <option value="null">-- Sin localidad --</option>
              )}
              {visibleLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.localidad}
                </option>
              ))}
            </select>
          </div>
          {!initialData && (
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setMode("select")}
                className={`flex-1 pb-2 text-xs font-bold ${
                  mode === "select"
                    ? "text-indigo-600 border-b-2"
                    : "text-slate-400"
                }`}
              >
                Existente
              </button>
              <button
                onClick={() => setMode("create")}
                className={`flex-1 pb-2 text-xs font-bold ${
                  mode === "create"
                    ? "text-indigo-600 border-b-2"
                    : "text-slate-400"
                }`}
              >
                Nuevo
              </button>
            </div>
          )}
          {mode === "select" ? (
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                Hotel
              </label>
              <select
                className="w-full border p-2 rounded text-sm bg-white"
                value={formData.id_hotel}
                onChange={(e) =>
                  setFormData({ ...formData, id_hotel: e.target.value })
                }
                disabled={filteredHotels.length === 0}
              >
                <option value="">-- Seleccionar --</option>
                {filteredHotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                Nombre
              </label>
              <input
                type="text"
                className="w-full border p-2 rounded text-sm"
                autoFocus
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: Gran Hotel..."
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
          >
            {initialData ? "Guardar" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL: FUSIONAR HOTELES ---
const MergeHotelModal = ({ sourceHotel, bookings, onConfirm, onClose }) => {
  const [targetBookingId, setTargetBookingId] = useState("");
  const availableHotels = bookings.filter((b) => b.id !== sourceHotel.id);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95"
      onClick={onClose}
    >
      <div
        className="bg-white border rounded-lg shadow-xl w-96 space-y-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <div className="bg-amber-100 text-amber-600 p-2 rounded-full">
            <IconRefresh size={24} />
          </div>
          <div>
            <h5 className="font-bold text-lg text-slate-800">
              Fusionar Hoteles
            </h5>
            <p className="text-xs text-slate-500 mt-1">
              Mover todas las habitaciones de{" "}
              <b>{sourceHotel.hoteles?.nombre}</b> a otro hotel.
            </p>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
            Hotel Destino
          </label>
          <select
            className="w-full border p-2 rounded text-sm bg-slate-50"
            value={targetBookingId}
            onChange={(e) => setTargetBookingId(e.target.value)}
          >
            <option value="">-- Seleccionar --</option>
            {availableHotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.hoteles.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="text-sm text-slate-500">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(sourceHotel.id, targetBookingId)}
            disabled={!targetBookingId}
            className="bg-amber-600 text-white px-4 py-2 rounded text-sm font-bold"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL: TRASLADAR HABITACIÓN ---
const TransferRoomModal = ({
  room,
  masterHotels,
  bookings,
  currentBooking,
  onConfirm,
  onClose,
}) => {
  const [targetHotelId, setTargetHotelId] = useState("");
  const currentHotelId = bookings.find(
    (b) => b.id === currentBooking,
  )?.id_hotel;
  const sortedHotels = [...masterHotels].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95"
      onClick={onClose}
    >
      <div
        className="bg-white border rounded-lg shadow-xl w-80 space-y-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h5 className="font-bold text-sm mb-2 text-indigo-900 flex items-center gap-2">
          <IconArrowRight size={16} /> Trasladar Habitación
        </h5>
        <select
          className="w-full border p-2 rounded text-sm bg-slate-50"
          value={targetHotelId}
          onChange={(e) => setTargetHotelId(e.target.value)}
        >
          <option value="">-- Destino --</option>
          {sortedHotels.map((h) => {
            if (h.id === currentHotelId) return null;
            const isAlreadyInTour = bookings.some((b) => b.id_hotel === h.id);
            return (
              <option key={h.id} value={h.id}>
                {h.nombre} {isAlreadyInTour ? "(En Gira)" : "(Nuevo)"}
              </option>
            );
          })}
        </select>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="text-xs text-slate-500">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(room, targetHotelId)}
            disabled={!targetHotelId}
            className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold"
          >
            Mover
          </button>
        </div>
      </div>
    </div>
  );
};

const RoomForm = ({ onSubmit, onClose, initialData }) => {
  const [tipo, setTipo] = useState(initialData?.tipo || "Común");
  const [esMatrimonial, setEsMatrimonial] = useState(
    initialData?.es_matrimonial || false,
  );
  const [conCuna, setConCuna] = useState(initialData?.con_cuna || false);
  const [notas, setNotas] = useState(initialData?.notas_internas || "");
  const handleSubmit = () => {
    onSubmit({
      id: initialData?.id,
      tipo,
      es_matrimonial: esMatrimonial,
      con_cuna: conCuna,
      notas_internas: notas,
      configuracion: esMatrimonial ? "Matrimonial" : "Simple",
    });
    onClose();
  };
  return (
    <div
      className="p-4 bg-white border rounded-lg shadow-xl w-64 space-y-3 animate-in zoom-in-95"
      onClick={(e) => e.stopPropagation()}
    >
      <h5 className="font-bold text-sm mb-2 text-indigo-900">
        {initialData ? "Editar" : "Nueva Habitación"}
      </h5>
      <div className="space-y-2">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Categoría
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full border p-1.5 rounded text-sm outline-none"
          >
            <option value="Común">Básico</option>
            <option value="Plus">Superior / Suite</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
          <input
            type="checkbox"
            checked={esMatrimonial}
            onChange={(e) => setEsMatrimonial(e.target.checked)}
            className="rounded text-indigo-600"
          />
          <span>Cama Matrimonial</span>
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
          <input
            type="checkbox"
            checked={conCuna}
            onChange={(e) => setConCuna(e.target.checked)}
            className="rounded text-indigo-600"
          />
          <span>Agregar Cuna</span>
        </label>
        <textarea
          placeholder="Notas internas..."
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="w-full border p-1.5 rounded text-xs resize-none h-16 outline-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-indigo-700"
        >
          Guardar
        </button>
      </div>
    </div>
  );
};

// --- COMPONENTE CARD DE MÚSICO ---
const MusicianCard = ({
  m,
  onDragStart,
  isInRoom,
  onRemove,
  isLocal,
  isSelected,
  onClick,
  ocupaCama = true,
  onToggleBed,
}) => {
  const loc = m.localidades?.localidad || "S/D";
  const isLocalWarning = isInRoom && isLocal;
  const isCuna = !ocupaCama;

  return (
    <div
      draggable
      onDragStart={(e) => {
        onDragStart(e, m);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e, m);
      }}
      className={`${
        isCuna
          ? "px-1 py-0.5 rounded-full border text-[9px] flex justify-between items-center shadow-sm cursor-default select-none"
          : "p-1.5 rounded border text-xs flex justify-between items-center shadow-sm cursor-grab active:cursor-grabbing select-none"
      } transition-all duration-100 
        ${
          isSelected
            ? "bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300"
            : isLocalWarning
              ? "bg-orange-100 border-orange-400 text-orange-900 ring-2 ring-orange-300/50 font-medium"
              : isLocal
                ? "bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-80"
                : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
        }
      `}
      title={
        isLocalWarning
          ? "¡Atención! Músico local asignado a hotel"
          : `${m.apellido}, ${m.nombre}`
      }
    >
      <div className="truncate max-w-[120px]">
        <b>{m.apellido}</b> {m.nombre}
        {isCuna && " (Cuna)"}
      </div>
      <div className="flex items-center gap-1">
        {isLocal && (
          <IconMapPin
            size={10}
            className={isLocalWarning ? "text-orange-600" : "text-slate-400"}
          />
        )}
        <span
          className={`text-[9px] px-1 rounded uppercase border ${
            isLocalWarning
              ? "bg-orange-200 border-orange-300 text-orange-800"
              : isSelected
                ? "text-white border-white/30 bg-white/20"
                : "text-slate-400 bg-black/5 border-transparent"
          }`}
        >
          {loc.slice(0, 3)}
        </span>
        {isInRoom && onToggleBed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const next = !ocupaCama;
              onToggleBed(m, next);
            }}
            className={`ml-1 flex items-center justify-center rounded-full border px-1 ${
              isCuna
                ? "bg-amber-100 border-amber-300 text-amber-700"
                : "bg-emerald-50 border-emerald-300 text-emerald-700"
            }`}
            title={isCuna ? "Marcar como ocupa cama" : "Marcar como cuna/adicional"}
          >
            {isCuna ? (
              <IconUser size={10} />
            ) : (
              <IconBed size={10} />
            )}
          </button>
        )}
        {isInRoom && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(m);
            }}
            className={`ml-1 ${
              isSelected
                ? "text-white hover:text-red-200"
                : "text-slate-300 hover:text-red-500"
            }`}
          >
            <IconX size={10} />
          </button>
        )}
      </div>
    </div>
  );
};

// --- LISTA LATERAL (colapsable en móvil) ---
const MusicianListColumn = ({
  title,
  color,
  musicians,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  selectedIds,
  onMusicianClick,
  forceExpanded = false,
}) => {
  const [showLocals, setShowLocals] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(true);
  const locals = musicians.filter((m) => m.is_local);
  const visitors = musicians.filter((m) => !m.is_local);
  const byCity = visitors.reduce((acc, m) => {
    const city = m.localidades?.localidad || "S/D";
    if (!acc[city]) acc[city] = [];
    acc[city].push(m);
    return acc;
  }, {});
  const sortedCities = Object.keys(byCity).sort();

  const colorClasses = {
    pink: {
      bg: "bg-pink-50/50",
      border: "border-pink-100",
      borderDrag: "border-pink-300",
      bgDrag: "bg-pink-100/50",
      text: "text-pink-800",
      badge: "border-pink-200/50 text-pink-700",
    },
    blue: {
      bg: "bg-blue-50/50",
      border: "border-blue-100",
      borderDrag: "border-blue-300",
      bgDrag: "bg-blue-100/50",
      text: "text-blue-800",
      badge: "border-blue-200/50 text-blue-700",
    },
  };
  const c = colorClasses[color] || colorClasses.blue;
  const isCollapsed = forceExpanded ? false : mobileCollapsed;

  return (
    <div
      className={`w-full lg:w-48 flex flex-col rounded-xl border p-3 overflow-hidden transition-colors h-full min-h-0 ${c.bg} ${c.border} ${
        isDragging ? `${c.bgDrag} ${c.border} border-dashed` : ""
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Encabezado: en móvil es botón acordeón, en desktop solo título */}
      <button
        type="button"
        className={`lg:pointer-events-none w-full flex justify-between items-center mb-0 lg:mb-3 text-left`}
        onClick={
          forceExpanded ? undefined : () => setMobileCollapsed((v) => !v)
        }
      >
        <h4 className={`font-bold ${c.text} flex justify-between items-center w-full`}>
          <span>{title}</span>
          <span className="bg-white px-2 rounded text-xs shadow-sm">
            {visitors.length}
          </span>
        </h4>
        {!forceExpanded && (
          <IconChevronDown
            size={18}
            className={`lg:hidden ml-1 transition-transform duration-200 ${
              isCollapsed ? "" : "rotate-180"
            }`}
          />
        )}
      </button>
      {/* Contenido: en móvil solo visible cuando no está colapsado */}
      <div
        className={`space-y-3 flex-1 min-h-0 overflow-y-auto ${
          isCollapsed ? "hidden lg:block" : "block"
        }`}
      >
        {sortedCities.map((city) => (
          <div key={city}>
            <div
              className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 border-b pb-0.5 ${c.badge}`}
            >
              {city}
            </div>
            <div className="space-y-1">
              {byCity[city].map((m) => (
                <MusicianCard
                  key={m.id}
                  m={m}
                  onDragStart={onDragStart}
                  isLocal={false}
                  isSelected={selectedIds.has(m.id)}
                  onClick={(e) => onMusicianClick(e, m, musicians)}
                />
              ))}
            </div>
          </div>
        ))}
        {visitors.length === 0 && (
          <div className="text-xs text-slate-400 italic text-center py-4 opacity-70">
            Todos asignados
          </div>
        )}
      </div>
      {locals.length > 0 && (
        <div className="mt-4 pt-2 border-t border-slate-200/60 lg:block">
          <button
            onClick={() => setShowLocals(!showLocals)}
            className={`w-full flex justify-between items-center px-2 py-1.5 rounded text-xs font-bold transition-all ${
              showLocals
                ? "bg-slate-200 text-slate-600"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            }`}
          >
            <span className="flex items-center gap-1">
              <IconMapPin size={12} /> Locales ({locals.length})
            </span>
            <IconChevronDown
              size={14}
              className={`transition-transform duration-200 ${
                showLocals ? "rotate-180" : ""
              }`}
            />
          </button>
          {showLocals && (
            <div className="mt-2 space-y-1 animate-in slide-in-from-bottom-2 fade-in bg-slate-50 p-1.5 rounded border border-slate-100">
              <div className="text-[9px] text-center text-slate-400 mb-1 italic">
                No requieren hotel
              </div>
              {locals.map((m) => (
                <MusicianCard
                  key={m.id}
                  m={m}
                  onDragStart={onDragStart}
                  isLocal={true}
                  isSelected={selectedIds.has(m.id)}
                  onClick={(e) => onMusicianClick(e, m, musicians)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- HABITACIÓN ---
const RoomCard = ({
  room,
  index,
  total,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDelete,
  onEdit,
  onRemoveMusician,
  onMove,
  onTransfer,
  onComment,
  getCapacityLabel,
  getRoomColor,
  supabase,
  selectedIds,
  onMusicianClick,
  onUpdateAttribute,
  onAssignSelected,
  onToggleOccupancy,
}) => {
  const isPlus = room.tipo === "Plus";
  const bedOccupants = (room.occupants || []).filter(
    (m) => m.ocupa_cama !== false,
  );
  const extraOccupants = (room.occupants || []).filter(
    (m) => m.ocupa_cama === false,
  );
  const bedCount = bedOccupants.length;
  let colorClass = getRoomColor(bedCount);
  const [isOver, setIsOver] = useState(false);
  const [isOverCuna, setIsOverCuna] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // Menu 3 puntos

  const handleToggleAttribute = (e, field, value) => {
    e.stopPropagation();
    if (onUpdateAttribute) {
      onUpdateAttribute(room.id, field, value);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        onDragOver(e);
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        setIsOver(false);
        onDrop(e, room.id);
      }}
      className={`rounded-lg border shadow-sm flex flex-col transition-all duration-200 relative ${colorClass} ${
        isPlus ? "ring-2 ring-amber-400 ring-offset-1" : ""
      } ${isOver ? "ring-4 ring-indigo-400 scale-105 z-10" : ""}`}
    >
      <div className="p-2 border-b border-black/5 flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-1 font-bold text-sm">
            <IconBed
              size={14}
              className={
                room.es_matrimonial ? "text-pink-600" : "text-slate-500"
              }
            />
            {getCapacityLabel(bedCount)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] text-slate-600">
            <button
              type="button"
              className="flex items-center gap-1"
              onClick={(e) =>
                handleToggleAttribute(
                  e,
                  "tipo",
                  room.tipo === "Plus" ? "Común" : "Plus",
                )
              }
            >
              <span className="uppercase">Sup</span>
              <span
                className={`w-8 h-4 rounded-full relative transition-colors ${
                  room.tipo === "Plus" ? "bg-amber-400" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform ${
                    room.tipo === "Plus" ? "translate-x-4" : ""
                  }`}
                />
              </span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1"
              onClick={(e) =>
                handleToggleAttribute(e, "es_matrimonial", !room.es_matrimonial)
              }
            >
              <span className="uppercase">Matr.</span>
              <span
                className={`w-8 h-4 rounded-full relative transition-colors ${
                  room.es_matrimonial ? "bg-pink-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform ${
                    room.es_matrimonial ? "translate-x-4" : ""
                  }`}
                />
              </span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1"
              onClick={(e) =>
                handleToggleAttribute(e, "con_cuna", !room.con_cuna)
              }
            >
              <span className="uppercase">Cuna</span>
              <span
                className={`w-8 h-4 rounded-full relative transition-colors ${
                  room.con_cuna ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform ${
                    room.con_cuna ? "translate-x-4" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* MENÚ 3 PUNTOS */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-full hover:bg-black/10 text-slate-500 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-6 w-36 bg-white rounded-lg shadow-xl border border-slate-200 z-30 py-1 flex flex-col text-xs animate-in fade-in zoom-in-95 origin-top-right">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onComment();
                  }}
                  className="px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <IconFileText size={14} /> Comentarios
                </button>
                {onTransfer && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onTransfer();
                    }}
                    className="px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-t border-slate-100"
                  >
                    <IconArrowRight size={14} /> Trasladar
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-indigo-600 border-t border-slate-100"
                >
                  <IconEdit size={14} /> Editar
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(room.id);
                  }}
                  className="px-3 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                >
                  <IconTrash size={14} /> Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="p-1.5 space-y-1 min-h-[50px] flex-1">
        {bedOccupants.map((m) => (
          <MusicianCard
            key={m.id}
            m={m}
            onDragStart={(e) => onDragStart(e, m, room.id)}
            isInRoom={true}
            onRemove={(mus) => onRemoveMusician(mus, room.id)}
            isLocal={m.is_local}
            isSelected={selectedIds.has(m.id)}
            onClick={(e) => onMusicianClick(e, m, room.occupants)}
            ocupaCama={m.ocupa_cama !== false}
            onToggleBed={
              onToggleOccupancy
                ? (mus, next) => onToggleOccupancy(room.id, mus.id, next)
                : undefined
            }
          />
        ))}
        {bedCount === 0 && extraOccupants.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-400/50 text-xs italic pointer-events-none">
            Arrastra aquí
          </div>
        )}
        {room.con_cuna && (
          <div
            className={`mt-1 pt-1 border-t border-dashed rounded-md min-h-[32px] ${
              isOverCuna
                ? "border-emerald-400 bg-emerald-50/80"
                : "border-slate-200 bg-slate-50/60"
            }`}
            onDragOver={(e) => {
              e.stopPropagation();
              setIsOverCuna(true);
              onDragOver(e);
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              setIsOverCuna(false);
            }}
            onDrop={(e) => {
              e.stopPropagation();
              setIsOverCuna(false);
              onDrop(e, room.id, { toCuna: true });
            }}
          >
            <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-1">
              Adicionales / Cunas
            </div>
            {extraOccupants.length === 0 ? (
              <div
                className={`flex items-center justify-center text-[10px] italic py-1 pointer-events-none ${
                  isOverCuna ? "text-emerald-700 font-semibold" : "text-slate-400"
                }`}
              >
                Arrastrar aquí para cuna
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {extraOccupants.map((m) => (
                  <MusicianCard
                    key={m.id}
                    m={m}
                    onDragStart={(e) => onDragStart(e, room.id)}
                    isInRoom={true}
                    onRemove={(mus) => onRemoveMusician(mus, room.id)}
                    isLocal={m.is_local}
                    isSelected={selectedIds.has(m.id)}
                    onClick={(e) => onMusicianClick(e, m, room.occupants)}
                    ocupaCama={false}
                    onToggleBed={
                      onToggleOccupancy
                        ? (mus, next) => onToggleOccupancy(room.id, mus.id, next)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {/* Botón + en móvil para asignar selección a esta habitación */}
        {onAssignSelected && selectedIds && selectedIds.size > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAssignSelected(room.id);
            }}
            className="lg:hidden absolute bottom-2 right-2 w-8 h-8 rounded-full bg-indigo-600 text-white shadow flex items-center justify-center text-lg font-bold hover:bg-indigo-700"
            title="Asignar selección a esta habitación"
          >
            <IconPlus size={16} />
          </button>
        )}
      </div>
      {room.notas_internas && (
        <div
          className="px-2 py-1 border-t border-black/5 text-[9px] italic opacity-80 truncate bg-white/30"
          title={room.notas_internas}
        >
          {room.notas_internas}
        </div>
      )}
    </div>
  );
};

// --- MODAL ASIGNAR (móvil: lista de hoteles y habitaciones) ---
const AssignRoomModal = ({
  bookings,
  rooms,
  getCapacityLabel,
  onSelectRoom,
  onSelectNewRoom,
  onClose,
}) => {
  const [roomFilter, setRoomFilter] = useState("F"); // F | Mix | M

  const applyFilter = (hotelRooms) => {
    if (roomFilter === "F") return hotelRooms.filter((r) => r.roomGender === "F");
    if (roomFilter === "M") return hotelRooms.filter((r) => r.roomGender === "M");
    if (roomFilter === "Mix")
      return hotelRooms.filter((r) => r.roomGender === "Mixto");
    return hotelRooms;
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-h-[85vh] sm:max-h-[80vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center rounded-t-2xl sm:rounded-t-xl z-10">
          <h3 className="font-bold text-lg text-indigo-900">Asignar a habitación</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {bookings.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              No hay hoteles cargados.
            </p>
          ) : (
            bookings.map((bk) => {
              const hotelRooms = rooms.filter((r) => r.id_hospedaje === bk.id);
              const filteredRooms = applyFilter(hotelRooms);
              const hotelName = bk.hoteles?.nombre || "Hotel";
              const loc = bk.hoteles?.localidades?.localidad;
              return (
                <div key={bk.id} className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold">
                      <IconHotel size={18} />
                      {hotelName}
                      {loc && (
                        <span className="text-slate-500 font-normal text-sm">
                          ({loc})
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setRoomFilter("F")}
                        className={`flex-1 px-2 py-1 rounded-full border ${
                          roomFilter === "F"
                            ? "bg-pink-100 border-pink-300 text-pink-800"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        Femenino
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomFilter("Mix")}
                        className={`flex-1 px-2 py-1 rounded-full border ${
                          roomFilter === "Mix"
                            ? "bg-purple-100 border-purple-300 text-purple-800"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        Mixto
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomFilter("M")}
                        className={`flex-1 px-2 py-1 rounded-full border ${
                          roomFilter === "M"
                            ? "bg-blue-100 border-blue-300 text-blue-800"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        Masculino
                      </button>
                    </div>
                  </div>
                  <div className="pl-6 space-y-2">
                    <button
                      type="button"
                      onClick={() => onSelectNewRoom(bk.id)}
                      className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium text-sm"
                    >
                      <IconPlus size={16} /> Nueva habitación en {hotelName}
                    </button>
                    {filteredRooms.map((r) => {
                      const bedCount = getRoomBedCount(r);
                      return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onSelectRoom(r.id)}
                        className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-left text-sm"
                      >
                        <span className="font-medium text-slate-800">
                          <IconBed size={14} className="inline mr-1 text-slate-500" />
                          {getCapacityLabel(bedCount)}
                          {r.occupants.length > 0 && (
                            <span className="text-slate-500 font-normal ml-1">
                              —{" "}
                              {r.occupants
                                .map((o) => `${o.apellido}, ${o.nombre}`)
                                .join("; ")}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function RoomingManager({
  supabase,
  program,
  onBack,
  onDataChange,
}) {
  const { roster, loading: rosterLoading } = useGiraRoster(supabase, program);
  const {
    summary: logisticsSummary,
    loading: logisticsLoading,
    refresh: refreshLogistics,
  } = useLogistics(supabase, program);
  const [musicians, setMusicians] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logisticsRules, setLogisticsRules] = useState([]);
  const [logisticsMap, setLogisticsMap] = useState({});
  const [showReport, setShowReport] = useState(false);
  const [showInitialOrder, setShowInitialOrder] = useState(false);
  const [showHelp, setShowHelp] = useState(false); // Estado para ayuda

  // Estados UI
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoomData, setEditingRoomData] = useState(null);
  const [activeBookingIdForNewRoom, setActiveBookingIdForNewRoom] =
    useState(null);
  const [roomToTransfer, setRoomToTransfer] = useState(null);
  const [hotelToMerge, setHotelToMerge] = useState(null);
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [editingHotelData, setEditingHotelData] = useState(null);
  const [locationsList, setLocationsList] = useState([]);
  const [masterHotels, setMasterHotels] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedMusician, setDraggedMusician] = useState(null);
  const [commentsState, setCommentsState] = useState(null);
  const [showMissingData, setShowMissingData] = useState(false); // <--- NUEVO ESTADO
  const [showInitialAdjust, setShowInitialAdjust] = useState(false);
  const [initialAdjustments, setInitialAdjustments] = useState(null);
  // --- NUEVOS ESTADOS PARA SELECCIÓN MÚLTIPLE ---
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRoomingPanel, setShowRoomingPanel] = useState(false);
  const [mobileActiveList, setMobileActiveList] = useState(null); // "women" | "men" | null
  const [mobileRoomFilter, setMobileRoomFilter] = useState("F"); // F | Mix | M
  const [excludedHospedajeIds, setExcludedHospedajeIds] = useState([]);
  const [showExcludedPanel, setShowExcludedPanel] = useState(false);
  const [showImportHotelModal, setShowImportHotelModal] = useState(false);
  const [importingHotel, setImportingHotel] = useState(false);
  const hotelsScrollRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setLastSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (program.id && !rosterLoading) fetchInitialData();
  }, [program.id, rosterLoading, roster]);

  // --- LÓGICA DE SELECCIÓN ---
  const handleMusicianClick = (e, musician, contextList) => {
    const newSelected = new Set(selectedIds);
    const id = musician.id;

    if (e.shiftKey && lastSelectedId && contextList) {
      const start = contextList.findIndex((p) => p.id === lastSelectedId);
      const end = contextList.findIndex((p) => p.id === id);
      if (start !== -1 && end !== -1) {
        const low = Math.min(start, end);
        const high = Math.max(start, end);
        for (let i = low; i <= high; i++) {
          newSelected.add(contextList[i].id);
        }
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
        setLastSelectedId(id);
      }
    } else {
      if (!newSelected.has(id) || newSelected.size > 1) {
        newSelected.clear();
        newSelected.add(id);
        setLastSelectedId(id);
      }
    }
    setSelectedIds(newSelected);
  };
  // --- CÁLCULO DE FALTANTES (NUEVO) ---
  const missingDataPeople = useMemo(() => {
    const list = [];
    rooms.forEach((room) => {
      room.occupants.forEach((p) => {
        const missing = [];
        if (!p.dni || p.dni.trim() === "") missing.push("DNI");
        if (!p.fecha_nac) missing.push("F. Nac");

        if (missing.length > 0) {
          list.push({ ...p, missingFields: missing });
        }
      });
    });
    return list;
  }, [rooms]);
  // --- DRAG HANDLERS ---
  const handleDragStart = (e, musician, sourceRoomId = null) => {
    let itemsToDrag = [];
    if (selectedIds.has(musician.id)) {
      itemsToDrag = Array.from(selectedIds);
    } else {
      itemsToDrag = [musician.id];
      setSelectedIds(new Set([musician.id]));
    }
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "PEOPLE_BATCH",
        ids: itemsToDrag,
        sourceRoomId,
      }),
    );
    e.dataTransfer.effectAllowed = "move";
    setDraggedMusician({ ...musician, sourceRoomId });
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  /** Auto-scroll del panel central de hoteles al arrastrar cerca de los bordes. */
  const handleHotelsDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const el = hotelsScrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 60;
    const step = 14;
    if (e.clientY < rect.top + margin) {
      el.scrollTop = Math.max(0, el.scrollTop - step);
    } else if (e.clientY > rect.bottom - margin) {
      el.scrollTop = Math.min(
        el.scrollHeight - el.clientHeight,
        el.scrollTop + step,
      );
    }
  };

  const processDrop = (targetRoomId, draggedIds, options = {}) => {
    let newRooms = [...rooms];
    let newMusicians = [...musicians];

    let targetRoomIndex = -1;
    if (targetRoomId) {
      targetRoomIndex = newRooms.findIndex((r) => r.id === targetRoomId);
      if (targetRoomIndex === -1) return;
    }

    draggedIds.forEach((id) => {
      let sourceRoomIndex = -1;
      let musicianObj = null;

      const mIndex = newMusicians.findIndex((m) => m.id === id);
      if (mIndex !== -1) {
        musicianObj = newMusicians[mIndex];
        newMusicians.splice(mIndex, 1);
      } else {
        for (let i = 0; i < newRooms.length; i++) {
          const occupantIndex = newRooms[i].occupants.findIndex(
            (m) => m.id === id,
          );
          if (occupantIndex !== -1) {
            sourceRoomIndex = i;
            musicianObj = newRooms[i].occupants[occupantIndex];
            const srcRoom = { ...newRooms[i] };
            srcRoom.occupants = [...srcRoom.occupants];
            srcRoom.occupants.splice(occupantIndex, 1);
            srcRoom.roomGender = calculateRoomGender(srcRoom.occupants);
            newRooms[i] = srcRoom;
            syncRoomOccupants(srcRoom.id, srcRoom.occupants);
            break;
          }
        }
      }

      if (musicianObj) {
        if (targetRoomId) {
          const targetRoom = newRooms[targetRoomIndex];
          if (!targetRoom.occupants.find((m) => m.id === id)) {
            const finalMusician = options.toCuna && targetRoom.con_cuna
              ? { ...musicianObj, ocupa_cama: false }
              : { ...musicianObj, ocupa_cama: true };
            targetRoom.occupants = [...targetRoom.occupants, finalMusician];
            targetRoom.roomGender = calculateRoomGender(targetRoom.occupants);
            newRooms[targetRoomIndex] = targetRoom;
          }
        } else {
          // Al volver a la lista sin habitación, limpiamos la marca de ocupa_cama
          newMusicians.push({ ...musicianObj, ocupa_cama: undefined });
        }
      }
    });

    newMusicians.sort((a, b) => {
      if (a.is_local !== b.is_local) return a.is_local ? 1 : -1;
      return a.apellido.localeCompare(b.apellido);
    });

    if (targetRoomId) {
      const finalTarget =
        newRooms[newRooms.findIndex((r) => r.id === targetRoomId)];
      syncRoomOccupants(targetRoomId, finalTarget.occupants);
    }

    updateLocalState(newRooms, newMusicians);
    setSelectedIds(new Set());
    setDraggedMusician(null);
    setIsDragging(false);
  };

  /** API única para asignar selección a habitación (modal móvil y botón + en RoomCard). Hace validación de habitación mixta. */
  const handleMoveToRoom = (targetRoomId, ids) => {
    const idList = Array.isArray(ids) ? ids : Array.from(ids);
    if (idList.length === 0) return;
    if (targetRoomId != null) {
      const targetRoom = rooms.find((r) => r.id === targetRoomId);
      if (targetRoom) {
        const selectedPeople = [];
        idList.forEach((id) => {
          const m = musicians.find((x) => x.id === id) ||
            targetRoom.occupants.find((x) => x.id === id) ||
            rooms.flatMap((r) => r.occupants).find((x) => x.id === id);
          if (m) selectedPeople.push(m);
        });
        const futureOccupants = [...targetRoom.occupants, ...selectedPeople];
        const futureGender = calculateRoomGender(futureOccupants);
        const currentGender = calculateRoomGender(targetRoom.occupants);
        if (futureGender === "Mixto" && currentGender !== "Mixto" && selectedPeople.some((p) => p.genero)) {
          if (!window.confirm("Esta habitación quedaría mixta (hombres y mujeres). ¿Continuar?")) return;
        }
      }
    }
    processDrop(targetRoomId, idList);
  };

  /** Asignar selección a una habitación nueva en el hotel indicado (desde modal móvil). */
  const handleMoveToNewRoom = async (bookingId, ids) => {
    const idList = Array.isArray(ids) ? ids : Array.from(ids);
    if (idList.length === 0) return;
    setLoading(true);
    try {
      const currentMaxOrder =
        rooms.length > 0 ? Math.max(...rooms.map((r) => r.orden || 0)) : 0;
      const { data: newRoomData, error: newRoomErr } = await supabase
        .from("hospedaje_habitaciones")
        .insert([
          {
            id_hospedaje: bookingId,
            tipo: "Común",
            configuracion: "Simple",
            id_integrantes_asignados: [],
            orden: currentMaxOrder + 10,
          },
        ])
        .select()
        .single();
      if (newRoomErr) throw newRoomErr;

      if (newRoomData) {
        const newRoomObj = {
          ...newRoomData,
          occupants: [],
          roomGender: "Mixto",
        };
        setRooms((prev) => [newRoomObj, ...prev]);
        let currentRooms = [newRoomObj, ...rooms];
        let currentMusicians = [...musicians];
        const movedPeople = [];

        idList.forEach((id) => {
          const mIndex = currentMusicians.findIndex((m) => m.id === id);
          if (mIndex !== -1) {
            movedPeople.push(currentMusicians[mIndex]);
            currentMusicians.splice(mIndex, 1);
          } else {
            for (let i = 1; i < currentRooms.length; i++) {
              const r = currentRooms[i];
              const occIdx = r.occupants.findIndex((m) => m.id === id);
              if (occIdx !== -1) {
                const p = r.occupants[occIdx];
                const newSrc = {
                  ...r,
                  occupants: r.occupants.filter((m) => m.id !== id),
                };
                newSrc.roomGender = calculateRoomGender(newSrc.occupants);
                currentRooms[i] = newSrc;
                syncRoomOccupants(newSrc.id, newSrc.occupants);
                movedPeople.push(p);
                break;
              }
            }
          }
        });

        const targetR = {
          ...newRoomObj,
          occupants: movedPeople,
          roomGender: calculateRoomGender(movedPeople),
        };
        currentRooms[0] = targetR;
        syncRoomOccupants(targetR.id, movedPeople);
        if (onDataChange) onDataChange();
        updateLocalState(currentRooms, currentMusicians);
        setSelectedIds(new Set());
        setDraggedMusician(null);
        setIsDragging(false);
        setShowAssignModal(false);
        await fetchInitialData();
        refreshLogistics();
      }
    } catch (err) {
      console.error(err);
      alert(`No se pudo crear la habitación: ${err.message || "error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDropOnRoom = (e, targetRoomId, options = {}) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      if (data.type === "PEOPLE_BATCH" && data.ids) {
        processDrop(targetRoomId, data.ids, options);
      }
    } catch (err) {
      console.error("Error drag data", err);
    }
  };

  const handleDropOnUnassigned = (e) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      if (data.type === "PEOPLE_BATCH" && data.ids) processDrop(null, data.ids);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReactivateExcluded = async (id) => {
    const nid = normalizeIntegranteId(id);
    if (nid == null) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("giras_hospedajes_excluidos")
        .delete()
        .eq("id_programa", program.id)
        .eq("id_integrante", nid);
      if (error) throw error;
      await fetchInitialData();
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error(err);
      alert("No se pudo quitar de la lista de no alojados.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcludeMusicians = async (rawIds) => {
    const ids = [
      ...new Set(
        rawIds.map(normalizeIntegranteId).filter((n) => n != null),
      ),
    ];
    if (!ids.length || !program?.id) return;
    setLoading(true);
    try {
      const pid = normalizeIntegranteId(program.id) ?? program.id;
      const rows = ids.map((id_integrante) => ({
        id_programa: pid,
        id_integrante,
      }));
      const { error: insErr } = await supabase
        .from("giras_hospedajes_excluidos")
        .upsert(rows, { onConflict: "id_programa,id_integrante" });
      if (insErr) throw insErr;

      const idSet = new Set(ids);
      let newRooms = [...rooms];

      for (let i = newRooms.length - 1; i >= 0; i--) {
        const r = newRooms[i];
        const nextOcc = r.occupants.filter(
          (o) => !idSet.has(normalizeIntegranteId(o.id)),
        );
        if (nextOcc.length === r.occupants.length) continue;

        if (nextOcc.length === 0) {
          await supabase.from("hospedaje_habitaciones").delete().eq("id", r.id);
          newRooms.splice(i, 1);
        } else {
          const idsArr = nextOcc.map((m) => m.id);
          const asignacionesConfig = nextOcc.map((m) => ({
            id: m.id,
            ocupa_cama: m.ocupa_cama !== false,
          }));
          const { error } = await supabase
            .from("hospedaje_habitaciones")
            .update({
              id_integrantes_asignados: idsArr,
              asignaciones_config: asignacionesConfig,
            })
            .eq("id", r.id);
          if (error) throw error;
          newRooms[i] = {
            ...r,
            occupants: nextOcc,
            roomGender: calculateRoomGender(nextOcc),
            asignaciones_config: asignacionesConfig,
          };
        }
      }

      const newMusicians = musicians.filter(
        (m) => !idSet.has(normalizeIntegranteId(m.id)),
      );
      setExcludedHospedajeIds((prev) => {
        const s = new Set(prev);
        ids.forEach((id) => s.add(id));
        return Array.from(s);
      });
      updateLocalState(newRooms, newMusicians);
      setSelectedIds(new Set());
      setDraggedMusician(null);
      setIsDragging(false);
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("[handleExcludeMusicians]", err);
      alert(hospedajeExclusionErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDropOnExclude = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      if (data.type === "PEOPLE_BATCH" && data.ids?.length)
        handleExcludeMusicians(data.ids);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDropOnNewRoom = async (e, bookingId) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr) return;

    try {
      const data = JSON.parse(dataStr);
      if (data.type === "PEOPLE_BATCH" && data.ids.length > 0) {
        setLoading(true);
        // Calculamos orden alto para que quede arriba en DB
        const currentMaxOrder =
          rooms.length > 0 ? Math.max(...rooms.map((r) => r.orden || 0)) : 0;

        const { data: newRoomData, error: newRoomErr } = await supabase
          .from("hospedaje_habitaciones")
          .insert([
            {
              id_hospedaje: bookingId,
              tipo: "Común",
              configuracion: "Simple",
              id_integrantes_asignados: [],
              orden: currentMaxOrder + 10,
            },
          ])
          .select()
          .single();
        if (newRoomErr) throw newRoomErr;

        if (newRoomData) {
          const newRoomObj = {
            ...newRoomData,
            occupants: [],
            roomGender: "Mixto",
          };

          // CAMBIO 1: Prepend en estado (poner al principio)
          setRooms((prev) => [newRoomObj, ...prev]);

          // CAMBIO 2: Construir lista local con la nueva habitación AL PRINCIPIO
          let currentRooms = [newRoomObj, ...rooms];
          let currentMusicians = [...musicians];
          const movedPeople = [];

          data.ids.forEach((id) => {
            const mIndex = currentMusicians.findIndex((m) => m.id === id);
            if (mIndex !== -1) {
              movedPeople.push(currentMusicians[mIndex]);
              currentMusicians.splice(mIndex, 1);
            } else {
              // CAMBIO 3: Buscar en rooms existentes (empezando desde índice 1 porque la 0 es la nueva)
              for (let i = 1; i < currentRooms.length; i++) {
                const r = currentRooms[i];
                const occIdx = r.occupants.findIndex((m) => m.id === id);
                if (occIdx !== -1) {
                  const p = r.occupants[occIdx];
                  const newSrc = {
                    ...r,
                    occupants: r.occupants.filter((m) => m.id !== id),
                  };
                  newSrc.roomGender = calculateRoomGender(newSrc.occupants);
                  currentRooms[i] = newSrc;
                  syncRoomOccupants(newSrc.id, newSrc.occupants);
                  movedPeople.push(p);
                  break;
                }
              }
            }
          });

          const targetR = {
            ...newRoomObj,
            occupants: movedPeople,
            roomGender: calculateRoomGender(movedPeople),
          };

          // CAMBIO 4: Actualizar la habitación en la posición 0
          currentRooms[0] = targetR;

          syncRoomOccupants(targetR.id, movedPeople);
          if (onDataChange) onDataChange();
          updateLocalState(currentRooms, currentMusicians);
          setSelectedIds(new Set());
          setDraggedMusician(null);
          setIsDragging(false);
          await fetchInitialData();
          refreshLogistics();
        }
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert(`No se pudo crear la habitación: ${err.message || "error desconocido"}`);
      setLoading(false);
    }
  };

  // --- CALCULO LOGÍSTICA (Versión Corregida con Eventos) ---
  const calculateLogisticsForMusician = (person, rules, allEvents = []) => {
    const applicable = rules.filter((r) => {
      const scope = r.alcance === "Instrumento" ? "Categoria" : r.alcance;
      if (scope === "General") return true;
      const targets = r.target_ids || [];
      if (scope === "Persona" && targets.includes(person.id)) return true;
      if (scope === "Localidad" && targets.includes(person.id_localidad))
        return true;
      if (
        scope === "Region" &&
        person.localidades?.id_region &&
        targets.includes(person.localidades.id_region)
      )
        return true;
      if (scope === "Categoria") {
        const role = person.rol_gira || "musico";
        if (targets.includes("SOLISTAS") && role === "solista") return true;
        if (targets.includes("DIRECTORES") && role === "director") return true;
        if (targets.includes("PRODUCCION") && role === "produccion")
          return true;
        if (targets.includes("LOCALES") && person.is_local) return true;
        if (targets.includes("NO_LOCALES") && !person.is_local) return true;
      }
      return false;
    });

    // Ordenar por prioridad
    applicable.sort((a, b) => a.prioridad - b.prioridad);

    let final = {};
    applicable.forEach((r) => {
      // CHECKIN: Si hay evento vinculado, usar sus datos. Si no, fecha manual.
      // IMPORTANTE: Convertimos IDs a String para comparar seguramente
      if (r.id_evento_checkin) {
        const evt = allEvents.find(
          (e) => String(e.id) === String(r.id_evento_checkin),
        );
        if (evt) {
          final.checkin = { fecha: evt.fecha, hora_inicio: evt.hora_inicio };
        }
      } else if (r.fecha_checkin) {
        final.checkin = { fecha: r.fecha_checkin, hora_inicio: r.hora_checkin };
      }

      // CHECKOUT: Igual lógica
      if (r.id_evento_checkout) {
        const evt = allEvents.find(
          (e) => String(e.id) === String(r.id_evento_checkout),
        );
        if (evt) {
          final.checkout = { fecha: evt.fecha, hora_inicio: evt.hora_inicio };
        }
      } else if (r.fecha_checkout) {
        final.checkout = {
          fecha: r.fecha_checkout,
          hora_inicio: r.hora_checkout,
        };
      }
    });
    return final;
  };

  const enrichRosterWithGender = async (baseRoster) => {
    if (baseRoster.length === 0) return [];
    const ids = baseRoster.map((m) => m.id);
    const { data } = await supabase
      .from("integrantes")
      .select("id, genero, dni, fecha_nac")
      .in("id", ids);
    const map = {};
    data?.forEach((d) => (map[d.id] = d));
    return baseRoster.map((m) => ({ ...m, ...map[m.id] }));
  };
  // EFECTO PRINCIPAL: Cargar datos iniciales y procesar Logística
  useEffect(() => {
    if (program.id && !logisticsLoading) {
      fetchInitialData();
      fetchLocations(); // <--- AGREGAR ESTA LÍNEA
      fetchMasterHotels();
    }
  }, [program.id, logisticsLoading]);
  const fetchLocations = async () => {
    const { data } = await supabase
      .from("localidades")
      .select("id, localidad")
      .order("localidad");
    if (data) setLocationsList(data);
  };

  const fetchMasterHotels = async () => {
    const { data } = await supabase
      .from("hoteles")
      .select("id, nombre, id_localidad")
      .order("nombre");
    if (data) setMasterHotels(data);
  };
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      let excludedSet = new Set();
      const { data: excludedRows, error: excludedErr } = await supabase
        .from("giras_hospedajes_excluidos")
        .select("id_integrante")
        .eq("id_programa", program.id);

      if (excludedErr) {
        console.warn("giras_hospedajes_excluidos:", excludedErr.message);
        setExcludedHospedajeIds([]);
      } else {
        excludedRows?.forEach((row) => excludedSet.add(row.id_integrante));
        setExcludedHospedajeIds(
          (excludedRows || []).map((r) => r.id_integrante),
        );
      }

      // 1. Cargar Bookings (Hoteles de la gira)
      const { data: bookingsData } = await supabase
        .from("programas_hospedajes")
        .select("*, hoteles(nombre, localidades(localidad))")
        .eq("id_programa", program.id)
        .order("created_at");
      setBookings(bookingsData || []);
      const bookingIds = (bookingsData || []).map((b) => b.id);

      // 2. Cargar Habitaciones
      let roomsData = [];
      if (bookingIds.length > 0) {
        const { data } = await supabase
          .from("hospedaje_habitaciones")
          .select("*")
          .in("id_hospedaje", bookingIds)
          .order("orden", { ascending: false });
        roomsData = data || [];
      }

      // 3. PROCESAR LOGÍSTICA (Aquí está la magia)
      // logisticsSummary ya viene calculado desde el hook con fechas de eventos resueltas
      const logMap = {};
      const allMusiciansMap = new Map();

      logisticsSummary.forEach((person) => {
        // Guardamos el objeto completo de logística para el reporte
        logMap[person.id] = person.logistics;
        allMusiciansMap.set(person.id, person);
      });
      // Fallback defensivo: si logística aún no resolvió completo, usamos roster base
      // para no "vaciar" asignaciones válidas al sincronizar habitaciones.
      (roster || []).forEach((person) => {
        if (!allMusiciansMap.has(person.id)) {
          allMusiciansMap.set(person.id, person);
        }
      });
      setLogisticsMap(logMap);

      // 4. Mapear ocupantes a habitaciones usando asignaciones_config
      const roomsToSyncAssignment = [];

      const roomsWithDetails = roomsData.map((room) => {
        const asignacionesRaw = Array.isArray(room.asignaciones_config)
          ? room.asignaciones_config
          : [];
        const configById = new Map();
        asignacionesRaw.forEach((cfg) => {
          if (cfg && cfg.id != null && cfg.id !== "") {
            configById.set(Number(cfg.id), cfg.ocupa_cama !== false);
          }
        });

        const rawIds = Array.isArray(room.id_integrantes_asignados)
          ? room.id_integrantes_asignados
          : [];
        const unresolvedIds = rawIds.filter((id) => !allMusiciansMap.has(id));

        const occupants = rawIds
          .map((id) => allMusiciansMap.get(id))
          .filter((p) => p && isActiveForRooming(p))
          .map((p) => ({
            ...p,
            ocupa_cama: configById.has(Number(p.id))
              ? configById.get(Number(p.id))
              : true,
          }));

        const desiredIds = occupants.map((o) => o.id);
        const newAsignacionesConfig = occupants.map((m) => ({
          id: m.id,
          ocupa_cama: m.ocupa_cama !== false,
        }));

        const staleVsDb =
          desiredIds.length !== rawIds.length ||
          desiredIds.some(
            (id, i) => Number(id) !== Number(rawIds[i]),
          );

        // Si todavía no resolvimos todos los IDs (ej: carga parcial de datos),
        // no sincronizamos para evitar borrar ocupantes de DB por error.
        if (staleVsDb && unresolvedIds.length === 0) {
          roomsToSyncAssignment.push({
            id: room.id,
            id_integrantes_asignados: desiredIds,
            asignaciones_config: newAsignacionesConfig,
          });
        }

        const roomWithMeta = {
          ...room,
          id_integrantes_asignados: desiredIds,
          asignaciones_config: newAsignacionesConfig,
          occupants,
        };

        return {
          ...roomWithMeta,
          roomGender: calculateRoomGender(occupants),
        };
      });

      if (roomsToSyncAssignment.length > 0) {
        for (const patch of roomsToSyncAssignment) {
          const { error: syncErr } = await supabase
            .from("hospedaje_habitaciones")
            .update({
              id_integrantes_asignados: patch.id_integrantes_asignados,
              asignaciones_config: patch.asignaciones_config,
            })
            .eq("id", patch.id);
          if (syncErr)
            console.warn(
              "[Rooming] Sincronizar ocupantes habitación",
              patch.id,
              syncErr.message,
            );
        }
        if (onDataChange) onDataChange();
      }

      // 5. Determinar quiénes faltan asignar (basado en ocupantes efectivos)
      const assignedIds = new Set();
      roomsWithDetails.forEach((r) =>
        (r.occupants || []).forEach((o) => assignedIds.add(o.id)),
      );

      const unassigned = Array.from(allMusiciansMap.values())
        .filter(
          (m) =>
            !assignedIds.has(m.id) &&
            isActiveForRooming(m) &&
            !excludedSet.has(m.id),
        )
        .sort((a, b) => {
          if (a.is_local !== b.is_local) return a.is_local ? 1 : -1;
          return (a.apellido || "").localeCompare(b.apellido || "");
        });
      setMusicians(unassigned);
      setRooms(roomsWithDetails);
    } catch (error) {
      console.error("Error en RoomingManager:", error);
    } finally {
      setLoading(false);
    }
  };
  const updateLocalState = (newRooms, newMusicians) => {
    setRooms(newRooms);
    setMusicians(newMusicians);
  };
  const syncRoomOccupants = async (roomId, occupants) => {
    const ids = occupants.map((m) => m.id);
    const asignacionesConfig = occupants.map((m) => ({
      id: m.id,
      ocupa_cama: m.ocupa_cama !== false,
    }));

    const { error } = await supabase
      .from("hospedaje_habitaciones")
      .update({
        id_integrantes_asignados: ids,
        asignaciones_config: asignacionesConfig,
      })
      .eq("id", roomId);

    if (!error) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? {
                ...r,
                occupants,
                id_integrantes_asignados: ids,
                asignaciones_config: asignacionesConfig,
                roomGender: calculateRoomGender(occupants),
              }
            : r,
        ),
      );
      if (onDataChange) onDataChange();
    }
  };
  const calculateRoomGender = (occupants) => {
    const bedOccupants = (occupants || []).filter(
      (m) => m.ocupa_cama !== false,
    );
    if (bedOccupants.length === 0) return "Mixto";
    const genders = new Set(bedOccupants.map((m) => m.genero));
    if (genders.has("F") && !genders.has("M")) return "F";
    if (genders.has("M") && !genders.has("F")) return "M";
    return "Mixto";
  };

  const handleUpdateRoomAttribute = async (roomId, field, value) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, [field]: value } : r)),
    );
    try {
      const { error } = await supabase
        .from("hospedaje_habitaciones")
        .update({ [field]: value })
        .eq("id", roomId);
      if (!error && onDataChange) onDataChange();
    } catch (err) {
      console.error("Error actualizando habitación:", err);
    }
  };

  // ... (HANDLERS) ...
  const handleSaveHotel = async ({
    id_hotel,
    nombre,
    id_localidad,
    mode,
    id: editingId, // Aquí recibimos el ID que enviamos desde handleSubmit
  }) => {
    setLoading(true);
    let idHotelMaestro = id_hotel;

    // 1. Validación: Evitar duplicados si estamos AGREGANDO uno existente (mode select)
    // Si estamos editando (editingId existe), permitimos cambiar el hotel aunque ya exista otro igual (edge case raro pero posible)
    if (!editingId && mode === "select") {
      const alreadyExists = bookings.some(
        (b) => b.id_hotel === parseInt(id_hotel),
      );
      if (alreadyExists) {
        alert("Este hotel ya está agregado a la gira.");
        setLoading(false);
        return;
      }
    }

    try {
      // 2. Si es modo CREAR, primero insertamos en la tabla maestra de 'hoteles'
      if (mode === "create") {
        const { data: newHotel, error: hotelError } = await supabase
          .from("hoteles")
          .insert([{ nombre, id_localidad: id_localidad || null }])
          .select()
          .single();

        if (hotelError) throw hotelError;
        if (newHotel) idHotelMaestro = newHotel.id;
      }

      // 3. Insertar o Actualizar la relación en 'programas_hospedajes'
      if (idHotelMaestro) {
        const payload = {
          id_programa: program.id,
          id_hotel: idHotelMaestro,
        };

        if (editingId) {
          // --- MODO EDICIÓN (UPDATE) ---
          const { error } = await supabase
            .from("programas_hospedajes")
            .update(payload)
            .eq("id", editingId);

          if (error) throw error;
        } else {
          // --- MODO CREACIÓN (INSERT) ---
          const { error } = await supabase
            .from("programas_hospedajes")
            .insert([payload]);

          if (error) throw error;
        }

        // 4. Recargar datos para reflejar cambios en la UI
        await fetchInitialData();

        // Si creamos un hotel nuevo, recargamos la lista maestra para futuros usos
        if (mode === "create") {
          await fetchMasterHotels();
        }
      }
    } catch (error) {
      console.error("Error guardando hotel:", error);
      alert("Error al guardar el hotel: " + error.message);
    } finally {
      setLoading(false);
      setShowHotelForm(false);
      setEditingHotelData(null);
    }
  };
  const handleDeleteHotel = async (bookingId) => {
    if (!confirm("¿Eliminar hotel y habitaciones?")) return;
    setLoading(true);
    await supabase.from("programas_hospedajes").delete().eq("id", bookingId);
    await fetchInitialData();
    setLoading(false);
  };

  const handleImportHotel = async (sourceBookingId) => {
    if (!sourceBookingId || !program?.id) return;
    setImportingHotel(true);
    try {
      const { data: srcBooking, error: bErr } = await supabase
        .from("programas_hospedajes")
        .select("*")
        .eq("id", sourceBookingId)
        .single();
      if (bErr || !srcBooking) throw new Error("No se encontró la reserva origen.");

      if (bookings.some((b) => b.id_hotel === srcBooking.id_hotel)) {
        alert("Este hotel ya está cargado en el programa actual.");
        return;
      }

      const { id, id_programa, created_at, ...bookingRest } = srcBooking;
      const { data: newBooking, error: insBk } = await supabase
        .from("programas_hospedajes")
        .insert([{ ...bookingRest, id_programa: program.id }])
        .select()
        .single();
      if (insBk) throw insBk;
      if (!newBooking?.id) throw new Error("No se pudo crear la reserva.");

      const { data: srcRooms, error: rErr } = await supabase
        .from("hospedaje_habitaciones")
        .select("*")
        .eq("id_hospedaje", sourceBookingId)
        .order("orden", { ascending: false });
      if (rErr) throw rErr;

      if (srcRooms?.length) {
        const rows = srcRooms.map((r) => {
          const { id, id_hospedaje, created_at, ...rest } = r;
          return {
            ...rest,
            id_hospedaje: newBooking.id,
            id_integrantes_asignados: Array.isArray(r.id_integrantes_asignados)
              ? r.id_integrantes_asignados
              : [],
          };
        });
        const { error: insRooms } = await supabase
          .from("hospedaje_habitaciones")
          .insert(rows);
        if (insRooms) throw insRooms;
      }

      await fetchInitialData();
      refreshLogistics();
      if (onDataChange) onDataChange();
      setShowImportHotelModal(false);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Error al importar hotel.");
    } finally {
      setImportingHotel(false);
    }
  };

  const handleMergeHotels = async (sourceId, targetId) => {
    setLoading(true);
    try {
      await supabase
        .from("hospedaje_habitaciones")
        .update({ id_hospedaje: targetId })
        .eq("id_hospedaje", sourceId);
      await supabase.from("programas_hospedajes").delete().eq("id", sourceId);
      await fetchInitialData();
      setHotelToMerge(null);
    } catch (err) {
      console.error(err);
      alert("Error al fusionar");
    } finally {
      setLoading(false);
    }
  };
  const handleTransferConfirm = async (room, targetHotelId) => {
    setLoading(true);
    try {
      const hotelId = parseInt(targetHotelId);
      let targetBookingId = bookings.find((b) => b.id_hotel === hotelId)?.id;
      if (!targetBookingId) {
        const { data: existing } = await supabase
          .from("programas_hospedajes")
          .select("id")
          .eq("id_programa", program.id)
          .eq("id_hotel", hotelId)
          .maybeSingle();
        if (existing) targetBookingId = existing.id;
        else {
          const { data: newBooking, error } = await supabase
            .from("programas_hospedajes")
            .insert([{ id_programa: program.id, id_hotel: hotelId }])
            .select()
            .single();
          if (error && error.code === "23505") {
            const { data: retry } = await supabase
              .from("programas_hospedajes")
              .select("id")
              .eq("id_programa", program.id)
              .eq("id_hotel", hotelId)
              .single();
            targetBookingId = retry?.id;
          } else targetBookingId = newBooking?.id;
        }
      }
      if (targetBookingId) {
        await supabase
          .from("hospedaje_habitaciones")
          .update({ id_hospedaje: targetBookingId })
          .eq("id", room.id);
        await fetchInitialData();
        setRoomToTransfer(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const handleRemoveFromRoom = (musician, roomId) => {
    const roomIndex = rooms.findIndex((r) => r.id === roomId);
    if (roomIndex === -1) return;
    let newRooms = [...rooms];
    const targetRoom = { ...newRooms[roomIndex] };
    targetRoom.occupants = targetRoom.occupants.filter(
      (m) => m.id !== musician.id,
    );
    if (targetRoom.occupants.length === 0) {
      newRooms.splice(roomIndex, 1);
      supabase.from("hospedaje_habitaciones").delete().eq("id", roomId).then();
    } else {
      targetRoom.roomGender = calculateRoomGender(targetRoom.occupants);
      newRooms[roomIndex] = targetRoom;
      syncRoomOccupants(roomId, targetRoom.occupants);
    }
    const newMusicians = [...musicians, musician].sort((a, b) => {
      if (a.is_local !== b.is_local) return a.is_local ? 1 : -1;
      return a.apellido.localeCompare(b.apellido);
    });
    updateLocalState(newRooms, newMusicians);
  };
  const handleToggleOccupancy = async (roomId, musicianId, ocupaCama) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const updatedOccupants = (room.occupants || []).map((m) =>
      m.id === musicianId ? { ...m, ocupa_cama: ocupaCama } : m,
    );
    const updatedRoom = {
      ...room,
      occupants: updatedOccupants,
      roomGender: calculateRoomGender(updatedOccupants),
    };
    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    await syncRoomOccupants(roomId, updatedOccupants);
  };
  const handleSaveRoom = async (roomData) => {
    try {
      const currentMaxOrder =
        rooms.length > 0 ? Math.max(...rooms.map((r) => r.orden || 0)) : 0;

      if (roomData.id) {
        setRooms((prev) =>
          prev.map((r) => (r.id === roomData.id ? { ...r, ...roomData } : r)),
        );
        const { error: updateErr } = await supabase
          .from("hospedaje_habitaciones")
          .update(roomData)
          .eq("id", roomData.id);
        if (updateErr) throw updateErr;
      } else {
        setLoading(true);
        const { data, error: insertErr } = await supabase
          .from("hospedaje_habitaciones")
          .insert([
            {
              ...roomData,
              id_hospedaje: activeBookingIdForNewRoom,
              id_integrantes_asignados: [],
              orden: currentMaxOrder + 10,
            },
          ])
          .select()
          .single();
        if (insertErr) throw insertErr;

        if (data) {
          const newRoom = { ...data, occupants: [], roomGender: "Mixto" };
          setRooms((prev) => [newRoom, ...prev]);
          await fetchInitialData();
          refreshLogistics();
        }
      }
      if (onDataChange) onDataChange();
      setEditingRoomData(null);
    } catch (err) {
      console.error("Error guardando habitación:", err);
      alert(
        `No se pudo guardar la habitación: ${err.message || "error desconocido"}`,
      );
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteRoom = async (id) => {
    const roomToDelete = rooms.find((r) => r.id === id);
    if (!roomToDelete) return;
    const newRooms = rooms.filter((r) => r.id !== id);
    const newMusicians = [...musicians, ...(roomToDelete.occupants || [])].sort(
      (a, b) => {
        if (a.is_local !== b.is_local) return a.is_local ? 1 : -1;
        return a.apellido.localeCompare(b.apellido);
      },
    );
    updateLocalState(newRooms, newMusicians);
    await supabase.from("hospedaje_habitaciones").delete().eq("id", id);
    if (onDataChange) onDataChange();
  };
  const handleMoveRoom = async (index, direction, currentRoom) => {
    const hotelRooms = rooms
      .filter((r) => r.id_hospedaje === currentRoom.id_hospedaje)
      .sort((a, b) => (b.orden || 0) - (a.orden || 0)); // Visual Sort (Desc)

    const currentIndex = hotelRooms.findIndex((r) => r.id === currentRoom.id);
    if (
      (direction === -1 && currentIndex === 0) ||
      (direction === 1 && currentIndex === hotelRooms.length - 1)
    )
      return;

    const otherRoom = hotelRooms[currentIndex + direction];
    const globalIdxA = rooms.findIndex((r) => r.id === currentRoom.id);
    const globalIdxB = rooms.findIndex((r) => r.id === otherRoom.id);

    const newRooms = [...rooms];
    const ordenA = currentRoom.orden;
    const ordenB = otherRoom.orden;

    newRooms[globalIdxA] = { ...currentRoom, orden: ordenB };
    newRooms[globalIdxB] = { ...otherRoom, orden: ordenA };
    setRooms(newRooms);

    await supabase
      .from("hospedaje_habitaciones")
      .update({ orden: ordenB })
      .eq("id", currentRoom.id);
    await supabase
      .from("hospedaje_habitaciones")
      .update({ orden: ordenA })
      .eq("id", otherRoom.id);
  };

  const getRoomBedCount = (room) =>
    (room.occupants || []).filter((m) => m.ocupa_cama !== false).length;

  const getCapacityLabel = (c) => {
    if (c === 0) return "Vacía";
    if (c === 1) return "Single";
    if (c === 2) return "Doble";
    if (c === 3) return "Triple";
    return `Múltiple (${c})`;
  };
  const getRoomColor = (c) => {
    if (c === 0) return "bg-slate-50 border-slate-200";
    if (c === 1) return "bg-blue-50 border-blue-200 text-blue-800";
    if (c === 2) return "bg-emerald-50 border-emerald-200 text-emerald-800";
    if (c === 3) return "bg-amber-50 border-amber-200 text-amber-800";
    return "bg-rose-50 border-rose-200 text-rose-800";
  };

  const stats = {
    SGL: rooms.filter((r) => getRoomBedCount(r) === 1).length,
    DBL: rooms.filter((r) => getRoomBedCount(r) === 2).length,
    TPL: rooms.filter((r) => getRoomBedCount(r) === 3).length,
    QDP: rooms.filter((r) => getRoomBedCount(r) >= 4).length,
    F: rooms.filter((r) => r.roomGender === "F" && getRoomBedCount(r) > 0)
      .length,
    M: rooms.filter((r) => r.roomGender === "M" && getRoomBedCount(r) > 0)
      .length,
    Mix: rooms.filter(
      (r) => r.roomGender === "Mixto" && getRoomBedCount(r) > 0,
    ).length,
  };

  const women = musicians.filter((m) => m.genero === "F");
  const men = musicians.filter((m) => m.genero !== "F");

  const excludedPeople = useMemo(() => {
    return excludedHospedajeIds
      .map((id) => roster.find((r) => r.id === id))
      .filter(Boolean)
      .sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
  }, [excludedHospedajeIds, roster]);

  // --- CALCULO DE TOTALES POR GÉNERO ---
  const lodgedWomen = rooms.reduce(
    (acc, r) =>
      acc +
      (r.occupants || []).filter(
        (m) => m.genero === "F" && m.ocupa_cama !== false,
      ).length,
    0,
  );
  const lodgedMen = rooms.reduce(
    (acc, r) =>
      acc +
      (r.occupants || []).filter(
        (m) => m.genero !== "F" && m.ocupa_cama !== false,
      ).length,
    0,
  );

  if (rosterLoading)
    return (
      <div className="text-center p-10">
        <IconLoader className="animate-spin inline text-indigo-600" />
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in relative">
      <div className="bg-white px-3 py-2 border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1"
            >
              ← Volver
            </button>
            <h2 className="text-base lg:text-lg font-bold text-slate-800 flex items-center gap-2">
              Rooming
            </h2>
            <button
              onClick={() => setShowHelp(true)}
              className="text-indigo-600 hover:text-indigo-800"
            >
              <IconHelpCircle size={20} />
            </button>
          </div>
          {/* Botonera visible solo en desktop, en móvil pasa al acordeón */}
          <div className="hidden lg:flex gap-1.5">
            {/* --- BOTÓN DE ALERTA (NUEVO) --- */}
            {missingDataPeople.length > 0 && (
              <button
                onClick={() => setShowMissingData(true)}
                className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200 text-[11px] font-bold hover:bg-amber-100 flex items-center gap-1.5"
                title="Ver personas con datos faltantes"
              >
                <IconAlertTriangle size={16} />
                <span>Faltan Datos ({missingDataPeople.length})</span>
              </button>
            )}
            <button
              onClick={() => {
                setEditingHotelData(null);
                setShowHotelForm(true);
              }}
              className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 flex items-center gap-1.5"
            >
              <IconPlus size={16} /> Agregar Hotel
            </button>
            <button
              type="button"
              onClick={() => setShowImportHotelModal(true)}
              className="bg-white text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 text-[11px] font-bold hover:bg-indigo-50 flex items-center gap-1.5"
            >
              <IconCopy size={16} /> Importar hotel
            </button>
            <button
              onClick={() => setShowInitialAdjust(true)}
              className="bg-white text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-1.5 shadow-sm"
            >
              <IconList size={16} /> Pedido Inicial
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 text-[11px] font-bold hover:bg-indigo-100 flex items-center gap-1.5"
            >
              <IconFileText size={16} /> Reporte
            </button>
          </div>
        </div>
        {/* Menú + Mujeres / Varones en una sola línea (móvil) */}
        <div className="mt-1 lg:hidden flex gap-1">
          <button
            type="button"
            onClick={() => setShowRoomingPanel((v) => !v)}
            className="flex-[0.9] flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <span>Menú</span>
            <IconChevronDown
              size={16}
              className={`transition-transform ${showRoomingPanel ? "rotate-180" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() =>
              setMobileActiveList((prev) => (prev === "women" ? null : "women"))
            }
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              mobileActiveList === "women"
                ? "bg-pink-100 border-pink-300 text-pink-800"
                : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            Mujeres
          </button>
          <button
            type="button"
            onClick={() =>
              setMobileActiveList((prev) => (prev === "men" ? null : "men"))
            }
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              mobileActiveList === "men"
                ? "bg-blue-100 border-blue-300 text-blue-800"
                : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            Varones
          </button>
        </div>
        {/* Contenido del acordeón Menú (móvil) */}
        <div className="lg:hidden">
          {showRoomingPanel && (
            <div className="mt-1 space-y-1.5 text-[10px]">
              <div className="flex gap-1.5 flex-wrap bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 justify-center">
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white border rounded">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div> SGL: {stats.SGL}
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white border rounded">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div> DBL: {stats.DBL}
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white border rounded">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div> TPL: {stats.TPL}
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white border rounded">
                  <div className="w-2 h-2 rounded-full bg-rose-400"></div> 4+: {stats.QDP}
                </span>
                <span className="text-pink-600">♀ {stats.F} Habs</span>
                <span className="text-blue-600">♂ {stats.M} Habs</span>
                <span className="text-purple-600">⚤ {stats.Mix} Mixtas</span>
                <span className="text-pink-700 font-black" title="Total Mujeres">
                  F: {lodgedWomen}
                </span>
                <span className="text-blue-700 font-black" title="Total Varones">
                  M: {lodgedMen}
                </span>
                <div className="relative w-full flex justify-center mt-1">
                  <button
                    type="button"
                    title="Soltar aquí a quien no requiere hotel"
                    onClick={() => setShowExcludedPanel((v) => !v)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={handleDropOnExclude}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap transition-colors ${
                      isDragging
                        ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <IconHome size={12} className="shrink-0 text-slate-500" />
                    No alojados ({excludedHospedajeIds.length})
                    <IconChevronDown
                      size={12}
                      className={`shrink-0 transition-transform ${showExcludedPanel ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showExcludedPanel && (
                    <div className="absolute left-0 right-0 top-full z-[60] mt-1 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {excludedPeople.length === 0 ? (
                        <p className="px-3 py-2 text-[10px] text-slate-500">
                          Arrastra un músico al botón «No alojados».
                        </p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto px-2">
                          {excludedPeople.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-2 border-b border-slate-50 py-1.5 text-[10px] last:border-0"
                            >
                              <span className="truncate text-slate-700">
                                {p.apellido}, {p.nombre}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleReactivateExcluded(p.id)}
                                className="shrink-0 font-bold text-indigo-600"
                              >
                                Quitar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                {missingDataPeople.length > 0 && (
                  <button
                    onClick={() => setShowMissingData(true)}
                    className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg border border-amber-200 text-[10px] font-bold flex items-center gap-1"
                    title="Ver personas con datos faltantes"
                  >
                    <IconAlertTriangle size={14} />
                    <span>Faltan Datos ({missingDataPeople.length})</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingHotelData(null);
                    setShowHotelForm(true);
                  }}
                  className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 text-[10px] font-bold flex items-center gap-1"
                >
                  <IconPlus size={14} /> Hotel
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportHotelModal(true)}
                  className="bg-white text-indigo-700 px-2 py-1 rounded-lg border border-indigo-200 text-[10px] font-bold flex items-center gap-1"
                >
                  <IconCopy size={14} /> Importar
                </button>
                <button
                  onClick={() => setShowInitialAdjust(true)}
                  className="bg-white text-slate-600 px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-bold flex items-center gap-1 shadow-sm"
                >
                  <IconList size={14} /> Pedido
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-200 text-[10px] font-bold flex items-center gap-1"
                >
                  <IconFileText size={14} /> Reporte
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Resumen siempre visible en desktop, compactado */}
        <div className="hidden lg:flex gap-3 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 justify-center flex-wrap mt-1">
          <span className="flex items-center gap-1 px-2 py-0.5 bg-white border rounded">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div> SGL: {stats.SGL}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-white border rounded">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div> DBL: {stats.DBL}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-white border rounded">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div> TPL: {stats.TPL}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-white border rounded">
            <div className="w-2 h-2 rounded-full bg-rose-400"></div> 4+: {stats.QDP}
          </span>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <span className="text-pink-600">♀ {stats.F} Habs</span>
          <span className="text-blue-600">♂ {stats.M} Habs</span>
          <span className="text-purple-600">⚤ {stats.Mix} Mixtas</span>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <span className="text-pink-700 font-black" title="Total Mujeres">
            F: {lodgedWomen}
          </span>
          <span className="text-blue-700 font-black" title="Total Varones">
            M: {lodgedMen}
          </span>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <div className="relative">
            <button
              type="button"
              title="Soltar aquí a quien no requiere hotel"
              onClick={() => setShowExcludedPanel((v) => !v)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={handleDropOnExclude}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap transition-colors ${
                isDragging
                  ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <IconHome size={12} className="shrink-0 text-slate-500" />
              No alojados ({excludedHospedajeIds.length})
              <IconChevronDown
                size={12}
                className={`shrink-0 transition-transform ${showExcludedPanel ? "rotate-180" : ""}`}
              />
            </button>
            {showExcludedPanel && (
              <div className="absolute right-0 top-full z-[60] mt-1 min-w-[220px] max-w-[min(100vw-2rem,280px)] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {excludedPeople.length === 0 ? (
                  <p className="px-3 py-2 text-[10px] text-slate-500">
                    Nadie en esta lista. Arrastra un músico al botón «No
                    alojados».
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto px-2">
                    {excludedPeople.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 border-b border-slate-50 py-1.5 text-[10px] last:border-0"
                      >
                        <span className="truncate text-slate-700">
                          {p.apellido}, {p.nombre}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleReactivateExcluded(p.id)}
                          className="shrink-0 font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showReport && (
        <RoomingReportModal
          bookings={bookings}
          rooms={rooms}
          onClose={() => setShowReport(false)}
          logisticsMap={logisticsMap}
        />
      )}
      {showInitialAdjust && (
        <RoomingInitialAdjustmentModal
          roster={roster}
          logisticsMap={logisticsMap}
          onClose={() => setShowInitialAdjust(false)}
          onConfirm={(adjustments) => {
            setInitialAdjustments(adjustments);
            setShowInitialAdjust(false);
            setShowInitialOrder(true);
          }}
        />
      )}
      {showInitialOrder && (
        <InitialOrderReportModal
          roster={roster}
          logisticsMap={logisticsMap}
          rooms={rooms}
          adjustmentsByRange={initialAdjustments || {}}
          onClose={() => setShowInitialOrder(false)}
          programName={`${program.nomenclador || ""} | ${program.zona || ""}`}
        />
      )}
      {(showRoomForm || editingRoomData) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <RoomForm
            initialData={editingRoomData}
            onSubmit={handleSaveRoom}
            onClose={() => {
              setShowRoomForm(false);
              setEditingRoomData(null);
            }}
          />
        </div>
      )}
      {roomToTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <TransferRoomModal
            room={roomToTransfer}
            masterHotels={masterHotels}
            bookings={bookings}
            currentBooking={roomToTransfer.id_hospedaje}
            onConfirm={handleTransferConfirm}
            onClose={() => setRoomToTransfer(null)}
          />
        </div>
      )}
      {hotelToMerge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <MergeHotelModal
            sourceHotel={hotelToMerge}
            bookings={bookings}
            onConfirm={handleMergeHotels}
            onClose={() => setHotelToMerge(null)}
          />
        </div>
      )}
      {showHotelForm && (
        <HotelForm
          onSubmit={handleSaveHotel}
          onClose={() => {
            setShowHotelForm(false);
            setEditingHotelData(null);
          }}
          locationsList={locationsList}
          masterHotels={masterHotels}
          initialData={editingHotelData}
        />
      )}
      {showImportHotelModal && (
        <ImportHotelModal
          supabase={supabase}
          currentProgramId={program.id}
          onClose={() => !importingHotel && setShowImportHotelModal(false)}
          onConfirmImport={handleImportHotel}
          importing={importingHotel}
        />
      )}
      {mobileActiveList && (
        <div className="lg:hidden px-3 pt-1">
          {mobileActiveList === "women" ? (
            <MusicianListColumn
              title="Mujeres"
              color="pink"
              musicians={women}
              isDragging={isDragging}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDropOnUnassigned}
              selectedIds={selectedIds}
              onMusicianClick={handleMusicianClick}
              forceExpanded
            />
          ) : (
            <MusicianListColumn
              title="Hombres"
              color="blue"
              musicians={men}
              isDragging={isDragging}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDropOnUnassigned}
              selectedIds={selectedIds}
              onMusicianClick={handleMusicianClick}
              forceExpanded
            />
          )}
        </div>
      )}
      {loading && rooms.length === 0 ? (
        <div className="text-center p-10">
          <IconLoader className="animate-spin inline text-indigo-600" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 pt-2 lg:h-[calc(100vh-200px)] lg:flex-row">
          {/* Listas laterales solo en desktop; en móvil se manejan con los toggles superiores */}
          <div className="hidden h-full min-h-0 w-48 shrink-0 lg:flex lg:flex-col">
            <MusicianListColumn
              title="Mujeres"
              color="pink"
              musicians={women}
              isDragging={isDragging}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDropOnUnassigned}
              selectedIds={selectedIds}
              onMusicianClick={handleMusicianClick}
            />
          </div>
          <div
            ref={hotelsScrollRef}
            className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1"
            onDragOverCapture={handleHotelsDragOver}
          >
            {bookings.length === 0 && (
              <div className="text-center text-slate-400 p-6 italic border-2 border-dashed border-slate-200 rounded-xl text-sm">
                No hay hoteles cargados.{" "}
                <button
                  onClick={() => setShowHotelForm(true)}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Agregar uno
                </button>
              </div>
            )}
            {bookings.map((bk) => {
              const hotelRooms = rooms.filter((r) => r.id_hospedaje === bk.id);
              const occupiedHotelRooms = hotelRooms.filter(
                (r) => getRoomBedCount(r) > 0,
              );
              const paxCamas = hotelRooms.reduce(
                (acc, r) => acc + getRoomBedCount(r),
                0,
              );
              const roomsF = hotelRooms.filter((r) => r.roomGender === "F");
              const roomsM = hotelRooms.filter((r) => r.roomGender === "M");
              const roomsMix = hotelRooms.filter(
                (r) => r.roomGender === "Mixto",
              );
              return (
                <div
                  key={bk.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative group"
                >
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                      <IconHotel /> {bk.hoteles?.nombre}{" "}
                      <span className="text-slate-400 font-normal text-xs">
                        ({bk.hoteles?.localidades?.localidad})
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-500 font-mono mr-2">
                        Habitaciones: {occupiedHotelRooms.length}
                        {hotelRooms.length > occupiedHotelRooms.length && (
                          <span
                            className="text-slate-400"
                            title="Habitaciones físicas incl. vacías"
                          >
                            {" "}
                            ({hotelRooms.length} total)
                          </span>
                        )}{" "}
                        | Pax (camas): {paxCamas}
                      </div>
                      <button
                        onClick={() => setHotelToMerge(bk)}
                        className="text-slate-300 hover:text-amber-600 p-1"
                        title="Fusionar / Trasladar todo"
                      >
                        <IconRefresh size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingHotelData({
                            id: bk.id,
                            id_hotel: bk.id_hotel,
                            id_localidad: bk.hoteles.id_localidad,
                          });
                          setShowHotelForm(true);
                        }}
                        className="text-slate-300 hover:text-indigo-600 p-1"
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteHotel(bk.id)}
                        className="text-slate-300 hover:text-red-600 p-1"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </div>
                  {/* Filtro de género para habitaciones (móvil) */}
                  <div className="mt-2 mb-2 flex lg:hidden gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setMobileRoomFilter("F")}
                      className={`flex-1 px-2 py-1 rounded-full border ${
                        mobileRoomFilter === "F"
                          ? "bg-pink-100 border-pink-300 text-pink-800"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      Femenino
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileRoomFilter("Mix")}
                      className={`flex-1 px-2 py-1 rounded-full border ${
                        mobileRoomFilter === "Mix"
                          ? "bg-purple-100 border-purple-300 text-purple-800"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      Mixto
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileRoomFilter("M")}
                      className={`flex-1 px-2 py-1 rounded-full border ${
                        mobileRoomFilter === "M"
                          ? "bg-blue-100 border-blue-300 text-blue-800"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      Masculino
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div
                      className={`flex flex-col gap-3 ${
                        mobileRoomFilter === "F" ? "" : "hidden lg:flex"
                      }`}
                    >
                      <h5 className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                        Femeninas
                      </h5>
                      {roomsF.map((r, idx) => (
                        <RoomCard
                          key={r.id}
                          room={r}
                          index={idx}
                          total={roomsF.length}
                          isDragging={isDragging}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDropOnRoom}
                          onDelete={handleDeleteRoom}
                          onEdit={() => setEditingRoomData(r)}
                          onRemoveMusician={handleRemoveFromRoom}
                          onMove={(dir, room) => handleMoveRoom(idx, dir, room)}
                          onTransfer={() => setRoomToTransfer(r)}
                          getCapacityLabel={getCapacityLabel}
                          getRoomColor={getRoomColor}
                          supabase={supabase}
                          onComment={() =>
                            setCommentsState({
                              type: "HABITACION",
                              id: r.id,
                              title: `Hab ${getCapacityLabel(
                                r.occupants.length,
                              )} en ${bk.hoteles.nombre}`,
                            })
                          }
                          selectedIds={selectedIds}
                          onMusicianClick={handleMusicianClick}
                          onUpdateAttribute={handleUpdateRoomAttribute}
                          onAssignSelected={(roomId) => handleMoveToRoom(roomId, Array.from(selectedIds))}
                          onToggleOccupancy={handleToggleOccupancy}
                        />
                      ))}
                    </div>
                    <div
                      className={`flex flex-col gap-3 lg:px-2 lg:border-x border-slate-100 ${
                        mobileRoomFilter === "Mix" ? "" : "hidden lg:flex"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setActiveBookingIdForNewRoom(bk.id);
                          setEditingRoomData(null);
                          setShowRoomForm(true);
                        }}
                        className="w-full py-2 mb-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-100 font-bold flex justify-center gap-2 text-xs"
                      >
                        <IconPlus size={16} /> Nueva
                      </button>
                      <div
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnNewRoom(e, bk.id)}
                        className={`hidden lg:flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 text-indigo-300 rounded-xl hover:bg-indigo-50 transition-all h-20 cursor-pointer mb-4 ${
                          isDragging ? "bg-indigo-50 border-indigo-400" : ""
                        }`}
                      >
                        <IconPlus size={20} />{" "}
                        <span className="text-[10px] font-bold mt-1">
                          Arrastrar para crear
                        </span>
                      </div>
                      <h5 className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                        Mixtas / Vacías
                      </h5>
                      {roomsMix.map((r, idx) => (
                        <RoomCard
                          key={r.id}
                          room={r}
                          index={idx}
                          total={roomsMix.length}
                          isDragging={isDragging}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDropOnRoom}
                          onDelete={handleDeleteRoom}
                          onEdit={() => setEditingRoomData(r)}
                          onRemoveMusician={handleRemoveFromRoom}
                          onMove={(dir, room) => handleMoveRoom(idx, dir, room)}
                          onTransfer={() => setRoomToTransfer(r)}
                          getCapacityLabel={getCapacityLabel}
                          getRoomColor={getRoomColor}
                          supabase={supabase}
                          onComment={() =>
                            setCommentsState({
                              type: "HABITACION",
                              id: r.id,
                              title: `Hab ${getCapacityLabel(
                                r.occupants.length,
                              )} en ${bk.hoteles.nombre}`,
                            })
                          }
                          selectedIds={selectedIds}
                          onMusicianClick={handleMusicianClick}
                          onUpdateAttribute={handleUpdateRoomAttribute}
                          onAssignSelected={(roomId) => handleMoveToRoom(roomId, Array.from(selectedIds))}
                          onToggleOccupancy={handleToggleOccupancy}
                        />
                      ))}
                    </div>
                    <div
                      className={`flex flex-col gap-3 ${
                        mobileRoomFilter === "M" ? "" : "hidden lg:flex"
                      }`}
                    >
                      <h5 className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                        Masculinas
                      </h5>
                      {roomsM.map((r, idx) => (
                        <RoomCard
                          key={r.id}
                          room={r}
                          index={idx}
                          total={roomsM.length}
                          isDragging={isDragging}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDropOnRoom}
                          onDelete={handleDeleteRoom}
                          onEdit={() => setEditingRoomData(r)}
                          onRemoveMusician={handleRemoveFromRoom}
                          onMove={(dir, room) => handleMoveRoom(idx, dir, room)}
                          onTransfer={() => setRoomToTransfer(r)}
                          getCapacityLabel={getCapacityLabel}
                          getRoomColor={getRoomColor}
                          supabase={supabase}
                          onComment={() =>
                            setCommentsState({
                              type: "HABITACION",
                              id: r.id,
                              title: `Hab ${getCapacityLabel(
                                r.occupants.length,
                              )} en ${bk.hoteles.nombre}`,
                            })
                          }
                          selectedIds={selectedIds}
                          onMusicianClick={handleMusicianClick}
                          onUpdateAttribute={handleUpdateRoomAttribute}
                          onAssignSelected={(roomId) => handleMoveToRoom(roomId, Array.from(selectedIds))}
                          onToggleOccupancy={handleToggleOccupancy}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden h-full min-h-0 w-48 shrink-0 lg:flex lg:flex-col">
            <MusicianListColumn
              title="Hombres"
              color="blue"
              musicians={men}
              isDragging={isDragging}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDropOnUnassigned}
              selectedIds={selectedIds}
              onMusicianClick={handleMusicianClick}
            />
          </div>
        </div>
      )}
      {/* Barra de acción móvil: solo cuando hay selección y en pantalla pequeña */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-slate-200 shadow-lg px-4 py-3 flex items-center justify-between gap-3 safe-area-pb">
          <span className="text-sm font-medium text-slate-700">
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
            >
              Asignar
            </button>
          </div>
        </div>
      )}
      {showAssignModal &&
        createPortal(
          <AssignRoomModal
            bookings={bookings}
            rooms={rooms}
            getCapacityLabel={getCapacityLabel}
            onSelectRoom={(roomId) => {
              handleMoveToRoom(roomId, Array.from(selectedIds));
              setShowAssignModal(false);
            }}
            onSelectNewRoom={(bookingId) => {
              handleMoveToNewRoom(bookingId, Array.from(selectedIds));
            }}
            onClose={() => setShowAssignModal(false)}
          />,
          document.body,
        )}
      {showMissingData && (
        <MissingDataModal
          people={missingDataPeople}
          onClose={() => setShowMissingData(false)}
        />
      )}
      {commentsState && (
        <div
          className="fixed inset-0 z-[60] flex justify-end bg-black/20 backdrop-blur-[1px]"
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
