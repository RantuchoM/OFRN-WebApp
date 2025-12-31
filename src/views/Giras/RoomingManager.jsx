// src/views/Giras/RoomingManager.jsx
import React, { useState, useEffect, useMemo } from "react";
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
} from "../../components/ui/Icons";
import CommentsManager from "../../components/comments/CommentsManager";
import CommentButton from "../../components/comments/CommentButton";
import RoomingReportModal from "./RoomingReport";
import InitialOrderReportModal from "./RoomingInitialOrderReport"; // <--- NUEVO IMPORT
import { useGiraRoster } from "../../hooks/useGiraRoster";

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
    masterHotels.map((h) => h.id_localidad).filter((id) => id !== null)
  );
  const hasNullLocHotels = masterHotels.some((h) => h.id_localidad === null);
  const visibleLocations = locationsList.filter((l) => activeLocIds.has(l.id));

  const filteredHotels = masterHotels.filter((h) => {
    if (formData.id_localidad === "null") return h.id_localidad === null;
    if (!formData.id_localidad) return true;
    return h.id_localidad === parseInt(formData.id_localidad);
  });

  const handleSubmit = () => {
    if (mode === "select" && !formData.id_hotel)
      return alert("Selecciona un hotel");
    if (mode === "create" && (!formData.nombre || !formData.id_localidad))
      return alert("Completa nombre y localidad");
    onSubmit({ ...formData, mode });
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
    (b) => b.id === currentBooking
  )?.id_hotel;
  const sortedHotels = [...masterHotels].sort((a, b) =>
    a.nombre.localeCompare(b.nombre)
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
    initialData?.es_matrimonial || false
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
            <option value="Común">Estándar</option>
            <option value="Plus">Plus / Suite</option>
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

const MusicianCard = ({ m, onDragStart, isInRoom, onRemove, isLocal }) => {
  const loc = m.localidades?.localidad || "S/D";
  const isLocalWarning = isInRoom && isLocal;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(e, m);
      }}
      className={`p-1.5 rounded border text-xs flex justify-between items-center shadow-sm cursor-grab active:cursor-grabbing select-none transition-colors ${
        isLocalWarning
          ? "bg-orange-100 border-orange-400 text-orange-900 ring-2 ring-orange-300/50 font-medium"
          : isLocal
          ? "bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-80"
          : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
      }`}
      title={
        isLocalWarning
          ? "¡Atención! Músico local asignado a hotel"
          : `${m.apellido}, ${m.nombre}`
      }
    >
      <div className="truncate max-w-[120px]">
        <b>{m.apellido}</b> {m.nombre}
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
              : "text-slate-400 bg-black/5 border-transparent"
          }`}
        >
          {loc.slice(0, 3)}
        </span>
        {isInRoom && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(m);
            }}
            className="text-slate-300 hover:text-red-500 ml-1"
          >
            <IconX size={10} />
          </button>
        )}
      </div>
    </div>
  );
};

const MusicianListColumn = ({
  title,
  color,
  musicians,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [showLocals, setShowLocals] = useState(false);
  const locals = musicians.filter((m) => m.is_local);
  const visitors = musicians.filter((m) => !m.is_local);
  const byCity = visitors.reduce((acc, m) => {
    const city = m.localidades?.localidad || "S/D";
    if (!acc[city]) acc[city] = [];
    acc[city].push(m);
    return acc;
  }, {});
  const sortedCities = Object.keys(byCity).sort();
  return (
    <div
      className={`w-48 flex flex-col bg-${color}-50/50 rounded-xl border border-${color}-100 p-3 overflow-y-auto transition-colors ${
        isDragging ? `bg-${color}-100/50 border-${color}-300 border-dashed` : ""
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <h4 className={`font-bold text-${color}-800 mb-3 flex justify-between`}>
        <span>{title}</span>
        <span className="bg-white px-2 rounded text-xs shadow-sm">
          {visitors.length}
        </span>
      </h4>
      <div className="space-y-3 flex-1">
        {sortedCities.map((city) => (
          <div key={city}>
            <div
              className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 border-b border-${color}-200/50 pb-0.5 text-${color}-700`}
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
        <div className="mt-4 pt-2 border-t border-slate-200/60">
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
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
}) => {
  const isPlus = room.tipo === "Plus";
  const count = room.occupants.length;
  let colorClass = getRoomColor(count);
  const [isOver, setIsOver] = useState(false);
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
      className={`rounded-lg border shadow-sm flex flex-col transition-all duration-200 ${colorClass} ${
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
            {getCapacityLabel(count)}
          </div>
          <div className="text-[9px] opacity-70 flex flex-wrap gap-1 mt-0.5">
            {isPlus && <span className="font-bold text-amber-700">PLUS</span>}
            {room.es_matrimonial && <span>• Matri</span>}
            {room.con_cuna && <span>• Cuna</span>}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <CommentButton
            supabase={supabase}
            entityType="HABITACION"
            entityId={room.id}
            onClick={onComment}
            className="mr-1"
          />
          {onTransfer && (
            <button
              onClick={onTransfer}
              className="text-slate-400 hover:text-indigo-600 p-0.5 rounded hover:bg-white/50 mr-1"
              title="Mover a otro hotel"
            >
              <IconArrowRight size={12} />
            </button>
          )}
          <div className="flex flex-col mr-1">
            {index > 0 && (
              <button
                onClick={() => onMove(index, -1, room)}
                className="text-slate-400 hover:text-indigo-600"
              >
                <IconChevronDown size={12} className="rotate-180" />
              </button>
            )}
            {index < total - 1 && (
              <button
                onClick={() => onMove(index, 1, room)}
                className="text-slate-400 hover:text-indigo-600"
              >
                <IconChevronDown size={12} />
              </button>
            )}
          </div>
          <button
            onClick={onEdit}
            className="text-slate-400 hover:text-indigo-600 p-0.5 rounded hover:bg-white/50"
          >
            <IconEdit size={12} />
          </button>
          <button
            onClick={() => onDelete(room.id)}
            className="text-slate-400 hover:text-red-600 p-0.5 rounded hover:bg-white/50"
          >
            <IconTrash size={12} />
          </button>
        </div>
      </div>
      <div className="p-1.5 space-y-1 min-h-[50px] flex-1">
        {room.occupants.map((m) => (
          <MusicianCard
            key={m.id}
            m={m}
            onDragStart={(e) => onDragStart(e, m, room.id)}
            isInRoom={true}
            onRemove={(mus) => onRemoveMusician(mus, room.id)}
            isLocal={m.is_local}
          />
        ))}
        {count === 0 && (
          <div className="h-full flex items-center justify-center text-slate-400/50 text-xs italic pointer-events-none">
            Arrastra aquí
          </div>
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

// --- COMPONENTE PRINCIPAL ---
export default function RoomingManager({ supabase, program, onBack }) {
  // 1. HOOK CENTRALIZADO (Fuente de verdad)
  const { roster, loading: rosterLoading } = useGiraRoster(supabase, program);

  const [musicians, setMusicians] = useState([]); // Lista de "Sin asignar"
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logisticsRules, setLogisticsRules] = useState([]);
  const [logisticsMap, setLogisticsMap] = useState({});
  const [showReport, setShowReport] = useState(false);
  const [showInitialOrder, setShowInitialOrder] = useState(false); // <--- NUEVO ESTADO

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

  // Recalcular todo cuando cambia el programa o el roster cargado
  useEffect(() => {
    if (program.id && !rosterLoading) fetchInitialData();
  }, [program.id, rosterLoading, roster]); // Dependencia del roster

  const calculateLogisticsForMusician = (person, rules) => {
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
    applicable.sort((a, b) => a.prioridad - b.prioridad);
    let final = {};
    applicable.forEach((r) => {
      if (r.fecha_checkin) final.checkin = r.fecha_checkin;
      if (r.hora_checkin) final.checkin_time = r.hora_checkin;
      if (r.fecha_checkout) final.checkout = r.fecha_checkout;
      if (r.hora_checkout) final.checkout_time = r.hora_checkout;
    });
    return final;
  };

  const enrichRosterWithGender = async (baseRoster) => {
    // El hook puede no traer género, fecha_nac o dni. Los pedimos extra aquí.
    if (baseRoster.length === 0) return [];
    const ids = baseRoster.map((m) => m.id);
    const { data } = await supabase
      .from("integrantes")
      .select("id, genero, dni, fecha_nac")
      .in("id", ids);
    const map = {};
    data?.forEach((d) => (map[d.id] = d));
    return baseRoster.map((m) => ({ ...m, ...map[m.id] })); // Merge
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Cargar Bookings
      const { data: bookingsData } = await supabase
        .from("programas_hospedajes")
        .select("*, hoteles(nombre, localidades(localidad))")
        .eq("id_programa", program.id)
        .order("created_at");
      setBookings(bookingsData || []);
      const bookingIds = (bookingsData || []).map((b) => b.id);

      // 2. Cargar Localidades y Maestro
      const { data: locs } = await supabase
        .from("localidades")
        .select("id, localidad")
        .order("localidad");
      setLocationsList(locs || []);
      const { data: allHotels } = await supabase
        .from("hoteles")
        .select("id, nombre, id_localidad")
        .order("nombre");
      setMasterHotels(allHotels || []);

      // 3. Habitaciones
      let roomsData = [];
      if (bookingIds.length > 0) {
        const { data } = await supabase
          .from("hospedaje_habitaciones")
          .select("*")
          .in("id_hospedaje", bookingIds)
          .order("orden", { ascending: true });
        roomsData = data || [];
      }

      // 4. Reglas
      const { data: rules } = await supabase
        .from("giras_logistica_reglas")
        .select("*")
        .eq("id_gira", program.id);
      const normalizedRules = (rules || []).map((r) => ({
        ...r,
        target_ids:
          r.target_ids && Array.isArray(r.target_ids)
            ? r.target_ids
            : [
                r.id_integrante ||
                  r.id_localidad ||
                  r.id_region ||
                  r.instrumento_familia,
              ].filter(Boolean),
      }));
      setLogisticsRules(normalizedRules);

      // 5. Preparar Roster (Enriquecido)
      const fullMusicians = await enrichRosterWithGender(roster); // Traer género
      const logMap = {};
      const allMusiciansMap = new Map();

      fullMusicians.forEach((m) => {
        // El hook ya calculó 'rol_gira', 'is_local', 'estado_gira'
        // Solo filtramos los ausentes si no queremos asignarles habitación (opcional)
        if (m.estado_gira !== "ausente") {
          logMap[m.id] = calculateLogisticsForMusician(m, normalizedRules);
          allMusiciansMap.set(m.id, m);
        }
      });
      setLogisticsMap(logMap);

      const roomsWithDetails = roomsData.map((room) => {
        const occupants = (room.id_integrantes_asignados || [])
          .map((id) => allMusiciansMap.get(id))
          .filter(Boolean);
        return {
          ...room,
          occupants,
          roomGender: calculateRoomGender(occupants),
        };
      });

      const assignedIds = new Set();
      roomsData.forEach((r) =>
        (r.id_integrantes_asignados || []).forEach((id) => assignedIds.add(id))
      );

      const unassigned = Array.from(allMusiciansMap.values())
        .filter((m) => !assignedIds.has(m.id))
        .sort((a, b) => {
          if (a.is_local !== b.is_local) return a.is_local ? 1 : -1;
          return (a.apellido || "").localeCompare(b.apellido || "");
        });

      setMusicians(unassigned);
      setRooms(roomsWithDetails);
    } catch (error) {
      console.error(error);
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
    await supabase
      .from("hospedaje_habitaciones")
      .update({ id_integrantes_asignados: ids })
      .eq("id", roomId);
  };
  const calculateRoomGender = (occupants) => {
    if (!occupants || occupants.length === 0) return "Mixto";
    // El genero viene del enrichment step
    const genders = new Set(occupants.map((m) => m.genero));
    if (genders.has("F") && !genders.has("M")) return "F";
    if (genders.has("M") && !genders.has("F")) return "M";
    return "Mixto";
  };

  // ... (RESTO DE HANDLERS IGUALES AL ORIGINAL) ...
  const handleSaveHotel = async ({
    id_hotel,
    nombre,
    id_localidad,
    mode,
    id: editingId,
  }) => {
    setLoading(true);
    let idHotelMaestro = id_hotel;
    if (!editingId && mode === "select") {
      const alreadyExists = bookings.some(
        (b) => b.id_hotel === parseInt(id_hotel)
      );
      if (alreadyExists) {
        alert("Hotel ya agregado.");
        setLoading(false);
        return;
      }
    }
    if (mode === "create") {
      const { data: newHotel } = await supabase
        .from("hoteles")
        .insert([{ nombre, id_localidad: id_localidad || null }])
        .select()
        .single();
      if (newHotel) idHotelMaestro = newHotel.id;
    }
    if (idHotelMaestro) {
      const payload = { id_programa: program.id, id_hotel: idHotelMaestro };
      if (editingId)
        await supabase
          .from("programas_hospedajes")
          .update(payload)
          .eq("id", editingId);
      else await supabase.from("programas_hospedajes").insert([payload]);
      await fetchInitialData();
    }
    setLoading(false);
    setShowHotelForm(false);
    setEditingHotelData(null);
  };
  const handleDeleteHotel = async (bookingId) => {
    if (!confirm("¿Eliminar hotel y habitaciones?")) return;
    setLoading(true);
    await supabase.from("programas_hospedajes").delete().eq("id", bookingId);
    await fetchInitialData();
    setLoading(false);
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

  // ... (DRAG HANDLERS SIMPLIFICADOS PARA USAR CAMPOS STANDARIZADOS DEL HOOK) ...
  const handleDragStart = (e, musician, sourceRoomId = null) => {
    e.dataTransfer.setData("text/plain", musician.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedMusician({ ...musician, sourceRoomId });
    setIsDragging(true);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnRoom = (e, targetRoomId) => {
    e.preventDefault();
    if (!draggedMusician) return;
    const targetIndex = rooms.findIndex((r) => r.id === targetRoomId);
    if (targetIndex === -1) return;
    const targetRoom = { ...rooms[targetIndex] };
    if (targetRoom.occupants.find((m) => m.id === draggedMusician.id)) {
      setIsDragging(false);
      return;
    }
    let newRooms = [...rooms];
    let newMusicians = [...musicians];
    if (draggedMusician.sourceRoomId) {
      const srcIndex = newRooms.findIndex(
        (r) => r.id === draggedMusician.sourceRoomId
      );
      if (srcIndex !== -1) {
        const srcRoom = { ...newRooms[srcIndex] };
        srcRoom.occupants = srcRoom.occupants.filter(
          (m) => m.id !== draggedMusician.id
        );
        if (srcRoom.occupants.length === 0) {
          newRooms.splice(srcIndex, 1);
          supabase
            .from("hospedaje_habitaciones")
            .delete()
            .eq("id", srcRoom.id)
            .then();
          if (srcIndex < targetIndex) {
            /* Lógica reordenamiento si es necesario */
          }
        } else {
          srcRoom.roomGender = calculateRoomGender(srcRoom.occupants);
          newRooms[srcIndex] = srcRoom;
          syncRoomOccupants(srcRoom.id, srcRoom.occupants);
        }
      }
    } else
      newMusicians = newMusicians.filter((m) => m.id !== draggedMusician.id);
    const finalTargetIndex = newRooms.findIndex((r) => r.id === targetRoomId);
    if (finalTargetIndex !== -1) {
      const finalTarget = { ...newRooms[finalTargetIndex] };
      finalTarget.occupants = [...finalTarget.occupants, draggedMusician];
      finalTarget.roomGender = calculateRoomGender(finalTarget.occupants);
      newRooms[finalTargetIndex] = finalTarget;
      syncRoomOccupants(targetRoomId, finalTarget.occupants);
    }
    updateLocalState(newRooms, newMusicians);
    setDraggedMusician(null);
    setIsDragging(false);
  };
  const handleDropOnUnassigned = (e) => {
    e.preventDefault();
    if (!draggedMusician || !draggedMusician.sourceRoomId) return;
    let newRooms = [...rooms];
    const srcIndex = newRooms.findIndex(
      (r) => r.id === draggedMusician.sourceRoomId
    );
    if (srcIndex !== -1) {
      const srcRoom = { ...newRooms[srcIndex] };
      srcRoom.occupants = srcRoom.occupants.filter(
        (m) => m.id !== draggedMusician.id
      );
      if (srcRoom.occupants.length === 0) {
        newRooms.splice(srcIndex, 1);
        supabase
          .from("hospedaje_habitaciones")
          .delete()
          .eq("id", srcRoom.id)
          .then();
      } else {
        srcRoom.roomGender = calculateRoomGender(srcRoom.occupants);
        newRooms[srcIndex] = srcRoom;
        syncRoomOccupants(srcRoom.id, srcRoom.occupants);
      }
      const newMusicians = [...musicians, draggedMusician].sort((a, b) => {
        if (a.is_local !== b.is_local) return a.is_local ? 1 : -1;
        return a.apellido.localeCompare(b.apellido);
      });
      updateLocalState(newRooms, newMusicians);
    }
    setDraggedMusician(null);
    setIsDragging(false);
  };
  const handleDropOnNewRoom = async (e, bookingId) => {
    e.preventDefault();
    if (!draggedMusician) return;
    setLoading(true);
    let newRooms = [...rooms];
    let newMusicians = [...musicians];
    if (draggedMusician.sourceRoomId) {
      const srcIndex = newRooms.findIndex(
        (r) => r.id === draggedMusician.sourceRoomId
      );
      if (srcIndex !== -1) {
        const srcRoom = { ...newRooms[srcIndex] };
        srcRoom.occupants = srcRoom.occupants.filter(
          (m) => m.id !== draggedMusician.id
        );
        if (srcRoom.occupants.length === 0) {
          newRooms.splice(srcIndex, 1);
          await supabase
            .from("hospedaje_habitaciones")
            .delete()
            .eq("id", srcRoom.id);
        } else {
          srcRoom.roomGender = calculateRoomGender(srcRoom.occupants);
          newRooms[srcIndex] = srcRoom;
          syncRoomOccupants(srcRoom.id, srcRoom.occupants);
        }
      }
    } else
      newMusicians = newMusicians.filter((m) => m.id !== draggedMusician.id);
    updateLocalState(newRooms, newMusicians);
    const { data } = await supabase
      .from("hospedaje_habitaciones")
      .insert([
        {
          id_hospedaje: bookingId,
          tipo: "Común",
          configuracion: "Simple",
          id_integrantes_asignados: [draggedMusician.id],
          orden: rooms.length + 100,
        },
      ])
      .select()
      .single();
    if (data) {
      const newRoom = {
        ...data,
        occupants: [draggedMusician],
        roomGender: calculateRoomGender([draggedMusician]),
      };
      setRooms((prev) => [...prev, newRoom]);
    }
    setDraggedMusician(null);
    setIsDragging(false);
    setLoading(false);
  };
  const handleRemoveFromRoom = (musician, roomId) => {
    const roomIndex = rooms.findIndex((r) => r.id === roomId);
    if (roomIndex === -1) return;
    let newRooms = [...rooms];
    const targetRoom = { ...newRooms[roomIndex] };
    targetRoom.occupants = targetRoom.occupants.filter(
      (m) => m.id !== musician.id
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
  const handleSaveRoom = async (roomData) => {
    if (roomData.id) {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomData.id ? { ...r, ...roomData } : r))
      );
      await supabase
        .from("hospedaje_habitaciones")
        .update(roomData)
        .eq("id", roomData.id);
    } else {
      setLoading(true);
      const { data } = await supabase
        .from("hospedaje_habitaciones")
        .insert([
          {
            ...roomData,
            id_hospedaje: activeBookingIdForNewRoom,
            id_integrantes_asignados: [],
            orden: rooms.length + 10,
          },
        ])
        .select()
        .single();
      if (data) {
        const newRoom = { ...data, occupants: [], roomGender: "Mixto" };
        setRooms((prev) => [...prev, newRoom]);
      }
      setLoading(false);
    }
    setEditingRoomData(null);
  };
  const handleDeleteRoom = async (id) => {
    const roomToDelete = rooms.find((r) => r.id === id);
    if (!roomToDelete) return;
    const newRooms = rooms.filter((r) => r.id !== id);
    const newMusicians = [...musicians, ...(roomToDelete.occupants || [])].sort(
      (a, b) => {
        if (a.is_local !== b.is_local) return a.is_local ? 1 : -1;
        return a.apellido.localeCompare(b.apellido);
      }
    );
    updateLocalState(newRooms, newMusicians);
    await supabase.from("hospedaje_habitaciones").delete().eq("id", id);
  };
  const handleMoveRoom = async (index, direction, currentRoom) => {
    const hotelRooms = rooms
      .filter((r) => r.id_hospedaje === currentRoom.id_hospedaje)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
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
    newRooms[globalIdxA] = otherRoom;
    newRooms[globalIdxB] = currentRoom;
    setRooms(newRooms);
    await supabase
      .from("hospedaje_habitaciones")
      .update({ orden: otherRoom.orden || 0 })
      .eq("id", currentRoom.id);
    await supabase
      .from("hospedaje_habitaciones")
      .update({ orden: currentRoom.orden || 0 })
      .eq("id", otherRoom.id);
  };

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
    SGL: rooms.filter((r) => r.occupants.length === 1).length,
    DBL: rooms.filter((r) => r.occupants.length === 2).length,
    TPL: rooms.filter((r) => r.occupants.length === 3).length,
    QDP: rooms.filter((r) => r.occupants.length >= 4).length,
    F: rooms.filter((r) => r.roomGender === "F" && r.occupants.length > 0)
      .length,
    M: rooms.filter((r) => r.roomGender === "M" && r.occupants.length > 0)
      .length,
    Mix: rooms.filter((r) => r.roomGender === "Mixto" && r.occupants.length > 0)
      .length,
  };
  const women = musicians.filter((m) => m.genero === "F");
  const men = musicians.filter((m) => m.genero !== "F");

  if (rosterLoading)
    return (
      <div className="text-center p-10">
        <IconLoader className="animate-spin inline text-indigo-600" />
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in relative">
      <div className="bg-white p-3 border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1"
            >
              ← Volver
            </button>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Gestión Integral Rooming
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingHotelData(null);
                setShowHotelForm(true);
              }}
              className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold hover:bg-emerald-100 flex items-center gap-2"
            >
              <IconPlus size={16} /> Agregar Hotel
            </button>
            {/* NUEVO BOTÓN: PEDIDO INICIAL */}
            <button
              onClick={() => setShowInitialOrder(true)}
              className="bg-white text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 shadow-sm"
            >
              <IconList size={16} /> Pedido Inicial
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 text-xs font-bold hover:bg-indigo-100 flex items-center gap-2"
            >
              <IconFileText size={16} /> Reporte
            </button>
          </div>
        </div>
        <div className="flex gap-4 text-[10px] font-bold text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 justify-center flex-wrap">
          <span className="flex items-center gap-1 px-2 py-0.5 bg-white border rounded">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div> SGL:{" "}
            {stats.SGL}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-white border rounded">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div> DBL:{" "}
            {stats.DBL}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-white border rounded">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div> TPL:{" "}
            {stats.TPL}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-white border rounded">
            <div className="w-2 h-2 rounded-full bg-rose-400"></div> 4+:{" "}
            {stats.QDP}
          </span>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <span className="text-pink-600">♀ {stats.F} Habs</span>
          <span className="text-blue-600">♂ {stats.M} Habs</span>
          <span className="text-purple-600">⚤ {stats.Mix} Mixtas</span>
        </div>
      </div>
      {showReport && (
        <RoomingReportModal
          bookings={bookings}
          rooms={rooms}
          onClose={() => setShowReport(false)}
          logisticsMap={logisticsMap}
        />
      )}
      {showInitialOrder && (
        <InitialOrderReportModal
          roster={roster}
          logisticsMap={logisticsMap}
          rooms={rooms}
          onClose={() => setShowInitialOrder(false)}
          // CAMBIO AQUÍ: Usamos Nomenclador | Zona
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
      {loading && rooms.length === 0 ? (
        <div className="text-center p-10">
          <IconLoader className="animate-spin inline text-indigo-600" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex p-4 gap-4">
          <MusicianListColumn
            title="Mujeres"
            color="pink"
            musicians={women}
            isDragging={isDragging}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDropOnUnassigned}
          />
          <div className="flex-1 overflow-y-auto pr-2 space-y-8">
            {bookings.length === 0 && (
              <div className="text-center text-slate-400 p-10 italic border-2 border-dashed border-slate-200 rounded-xl">
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
              const roomsF = hotelRooms.filter((r) => r.roomGender === "F");
              const roomsM = hotelRooms.filter((r) => r.roomGender === "M");
              const roomsMix = hotelRooms.filter(
                (r) => r.roomGender === "Mixto"
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
                        Habitaciones: {hotelRooms.length} | Pax:{" "}
                        {hotelRooms.reduce(
                          (acc, r) => acc + r.occupants.length,
                          0
                        )}
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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-3">
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
                                r.occupants.length
                              )} en ${bk.hoteles.nombre}`,
                            })
                          }
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-3 px-2 border-x border-slate-100">
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
                        className={`flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 text-indigo-300 rounded-xl hover:bg-indigo-50 transition-all h-20 cursor-pointer mb-4 ${
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
                                r.occupants.length
                              )} en ${bk.hoteles.nombre}`,
                            })
                          }
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-3">
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
                                r.occupants.length
                              )} en ${bk.hoteles.nombre}`,
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <MusicianListColumn
            title="Hombres"
            color="blue"
            musicians={men}
            isDragging={isDragging}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDropOnUnassigned}
          />
        </div>
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
