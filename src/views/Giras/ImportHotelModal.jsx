import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  IconX,
  IconLoader,
  IconHotel,
  IconBed,
  IconCopy,
} from "../../components/ui/Icons";

/**
 * Lista programas origen, permite elegir una reserva (programas_hospedajes) y previsualizar habitaciones/ocupantes.
 */
export default function ImportHotelModal({
  supabase,
  currentProgramId,
  onClose,
  onConfirmImport,
  importing = false,
}) {
  const [tipoFiltro, setTipoFiltro] = useState("Sinfónico");
  const [programas, setProgramas] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [previewByBooking, setPreviewByBooking] = useState({});

  const loadProgramas = useCallback(async () => {
    if (!supabase || !currentProgramId) return;
    setLoadingPrograms(true);
    try {
      let q = supabase
        .from("programas")
        .select("id, nomenclador, mes_letra, nombre_gira, zona, tipo, fecha_desde")
        .neq("id", currentProgramId)
        .order("fecha_desde", { ascending: false })
        .limit(250);
      if (tipoFiltro === "Sinfónico") {
        q = q.eq("tipo", "Sinfónico");
      }
      const { data, error } = await q;
      if (error) throw error;
      setProgramas(data || []);
    } catch (e) {
      console.error("[ImportHotelModal] programas:", e);
      setProgramas([]);
    } finally {
      setLoadingPrograms(false);
    }
  }, [supabase, currentProgramId, tipoFiltro]);

  useEffect(() => {
    loadProgramas();
  }, [loadProgramas]);

  useEffect(() => {
    if (!selectedProgramId || !supabase) {
      setBookings([]);
      setSelectedBookingId("");
      setPreviewByBooking({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingBookings(true);
      try {
        const { data: bks, error } = await supabase
          .from("programas_hospedajes")
          .select(
            "id, id_hotel, id_programa, hoteles(nombre, localidades(localidad))",
          )
          .eq("id_programa", selectedProgramId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (cancelled) return;
        const list = bks || [];
        setBookings(list);
        setSelectedBookingId(list[0]?.id ? String(list[0].id) : "");

        if (list.length === 0) {
          setPreviewByBooking({});
          return;
        }
        const hospIds = list.map((b) => b.id);
        const { data: rooms, error: roomsErr } = await supabase
          .from("hospedaje_habitaciones")
          .select("id_hospedaje, id_integrantes_asignados")
          .in("id_hospedaje", hospIds);
        if (roomsErr) throw roomsErr;
        const map = {};
        (rooms || []).forEach((r) => {
          if (!map[r.id_hospedaje]) map[r.id_hospedaje] = { rooms: 0, pax: 0 };
          map[r.id_hospedaje].rooms += 1;
          const ids = r.id_integrantes_asignados || [];
          map[r.id_hospedaje].pax += ids.length;
        });
        if (!cancelled) setPreviewByBooking(map);
      } catch (e) {
        console.error("[ImportHotelModal] bookings:", e);
        if (!cancelled) {
          setBookings([]);
          setPreviewByBooking({});
        }
      } finally {
        if (!cancelled) setLoadingBookings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId, supabase]);

  const selectedBooking = useMemo(
    () => bookings.find((b) => String(b.id) === selectedBookingId),
    [bookings, selectedBookingId],
  );

  const preview = selectedBooking
    ? previewByBooking[selectedBooking.id] || { rooms: 0, pax: 0 }
    : { rooms: 0, pax: 0 };

  const programLabel = (p) =>
    `${p.mes_letra || ""} | ${p.nomenclador || ""} — ${p.nombre_gira || ""}${
      p.zona ? ` (${p.zona})` : ""
    }`;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <IconCopy className="text-indigo-600 shrink-0" size={22} />
              Importar hotel desde otro programa
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Se copian la reserva y todas las habitaciones con sus asignaciones
              de integrantes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1"
            disabled={importing}
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
              Tipo de programa
            </label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              disabled={importing}
            >
              <option value="Sinfónico">Sinfónico (por defecto)</option>
              <option value="todos">Todos los tipos</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
              Programa origen
            </label>
            {loadingPrograms ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                <IconLoader className="animate-spin text-indigo-600" size={18} />
                Cargando programas…
              </div>
            ) : (
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                disabled={importing || programas.length === 0}
              >
                <option value="">
                  {programas.length === 0
                    ? "— Sin programas —"
                    : "— Elegir programa —"}
                </option>
                {programas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {programLabel(p)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedProgramId && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Hotel / reserva a copiar
              </label>
              {loadingBookings ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
                  <IconLoader className="animate-spin text-indigo-600" size={18} />
                  Cargando reservas…
                </div>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Ese programa no tiene hoteles cargados en hospedaje.
                </p>
              ) : (
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  disabled={importing}
                >
                  {bookings.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.hoteles?.nombre || "Hotel"} —{" "}
                      {b.hoteles?.localidades?.localidad || "S/D"}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {selectedBooking && !loadingBookings && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-sm">
              <div className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
                <IconHotel size={16} /> Vista previa
              </div>
              <ul className="space-y-1 text-slate-700 text-xs">
                <li className="flex items-center gap-2">
                  <IconBed size={14} className="text-slate-400 shrink-0" />
                  Habitaciones: <strong>{preview.rooms}</strong>
                </li>
                <li>
                  Plazas asignadas en origen (IDs en habitaciones):{" "}
                  <strong>{preview.pax}</strong>
                </li>
                <li className="text-slate-500 mt-2 pt-2 border-t border-indigo-100">
                  Tras importar, solo verás en cada habitación a los músicos
                  confirmados en esta gira; el resto de IDs queda en la base
                  hasta que reasignes.
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={
              importing ||
              !selectedBookingId ||
              loadingBookings ||
              bookings.length === 0
            }
            onClick={() => onConfirmImport(Number(selectedBookingId))}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {importing ? (
              <>
                <IconLoader className="animate-spin" size={16} />
                Importando…
              </>
            ) : (
              <>
                <IconCopy size={16} /> Importar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
