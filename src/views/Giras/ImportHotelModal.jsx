import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  IconX,
  IconLoader,
  IconHotel,
  IconBed,
  IconCopy,
} from "../../components/ui/Icons";
import { formatTramoTitle } from "../../utils/giraTramos";

const BOOKING_SELECT =
  "id, id_hotel, id_programa, id_segmento, hoteles(nombre, localidades(localidad))";

async function fetchRoomPreview(supabase, bookingList) {
  if (!bookingList?.length) return {};
  const hospIds = bookingList.map((b) => b.id);
  const { data: rooms, error } = await supabase
    .from("hospedaje_habitaciones")
    .select("id_hospedaje, id_integrantes_asignados")
    .in("id_hospedaje", hospIds);
  if (error) throw error;
  const map = {};
  (rooms || []).forEach((r) => {
    if (!map[r.id_hospedaje]) map[r.id_hospedaje] = { rooms: 0, pax: 0 };
    map[r.id_hospedaje].rooms += 1;
    const ids = r.id_integrantes_asignados || [];
    map[r.id_hospedaje].pax += ids.length;
  });
  return map;
}

function tramoLabelForBooking(booking, segmentRows, segmentSpecs, defaultSegmentId) {
  const segId = Number(booking.id_segmento ?? defaultSegmentId);
  const idx = segmentRows.findIndex((s) => Number(s.id) === segId);
  if (idx >= 0) {
    const spec = segmentSpecs[idx];
    return formatTramoTitle(idx, spec?.fecha_desde, spec?.fecha_hasta);
  }
  return "Tramo";
}

/**
 * Copia reserva + habitaciones desde otro tramo de la misma gira u otro programa.
 */
export default function ImportHotelModal({
  supabase,
  currentProgramId,
  onClose,
  onConfirmImport,
  importing = false,
  multiTramoEnabled = false,
  activeSegmentRowId = null,
  defaultSegmentId = null,
  segmentRows = [],
  segmentSpecs = [],
}) {
  const [sourceScope, setSourceScope] = useState(
    multiTramoEnabled ? "same_gira" : "other_gira",
  );
  const [tipoFiltro, setTipoFiltro] = useState("Sinfónico");
  const [programas, setProgramas] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [previewByBooking, setPreviewByBooking] = useState({});

  const activeSegId = Number(activeSegmentRowId ?? defaultSegmentId ?? 0);

  const loadProgramas = useCallback(async () => {
    if (!supabase || !currentProgramId) return;
    setLoadingPrograms(true);
    try {
      let q = supabase
        .from("programas")
        .select(
          "id, nomenclador, mes_letra, nombre_gira, zona, tipo, fecha_desde",
        )
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

  const loadSameGiraBookings = useCallback(async () => {
    if (!supabase || !currentProgramId || !multiTramoEnabled) return;
    setLoadingBookings(true);
    try {
      const { data: bks, error } = await supabase
        .from("programas_hospedajes")
        .select(BOOKING_SELECT)
        .eq("id_programa", currentProgramId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const list = (bks || []).filter((b) => {
        const segId = Number(b.id_segmento ?? defaultSegmentId);
        return segId !== activeSegId;
      });
      setBookings(list);
      setSelectedBookingId(list[0]?.id ? String(list[0].id) : "");
      setPreviewByBooking(
        list.length ? await fetchRoomPreview(supabase, list) : {},
      );
    } catch (e) {
      console.error("[ImportHotelModal] same-gira bookings:", e);
      setBookings([]);
      setPreviewByBooking({});
      setSelectedBookingId("");
    } finally {
      setLoadingBookings(false);
    }
  }, [
    supabase,
    currentProgramId,
    multiTramoEnabled,
    defaultSegmentId,
    activeSegId,
  ]);

  const loadOtherGiraBookings = useCallback(
    async (programId) => {
      if (!supabase || !programId) return;
      setLoadingBookings(true);
      try {
        const { data: bks, error } = await supabase
          .from("programas_hospedajes")
          .select(BOOKING_SELECT)
          .eq("id_programa", programId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        const list = bks || [];
        setBookings(list);
        setSelectedBookingId(list[0]?.id ? String(list[0].id) : "");
        setPreviewByBooking(
          list.length ? await fetchRoomPreview(supabase, list) : {},
        );
      } catch (e) {
        console.error("[ImportHotelModal] other-gira bookings:", e);
        setBookings([]);
        setPreviewByBooking({});
        setSelectedBookingId("");
      } finally {
        setLoadingBookings(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (sourceScope === "other_gira") {
      loadProgramas();
    }
  }, [sourceScope, loadProgramas]);

  useEffect(() => {
    setSelectedProgramId("");
    setBookings([]);
    setSelectedBookingId("");
    setPreviewByBooking({});
  }, [sourceScope]);

  useEffect(() => {
    if (sourceScope === "same_gira") {
      loadSameGiraBookings();
    }
  }, [sourceScope, loadSameGiraBookings]);

  useEffect(() => {
    if (sourceScope !== "other_gira" || !selectedProgramId) return;
    loadOtherGiraBookings(selectedProgramId);
  }, [sourceScope, selectedProgramId, loadOtherGiraBookings]);

  const selectedBooking = useMemo(
    () => bookings.find((b) => String(b.id) === selectedBookingId),
    [bookings, selectedBookingId],
  );

  const aggregatePreview = useMemo(() => {
    if (!bookings.length) return { hotels: 0, rooms: 0, pax: 0 };
    return bookings.reduce(
      (acc, b) => {
        const p = previewByBooking[b.id] || { rooms: 0, pax: 0 };
        acc.hotels += 1;
        acc.rooms += p.rooms;
        acc.pax += p.pax;
        return acc;
      },
      { hotels: 0, rooms: 0, pax: 0 },
    );
  }, [bookings, previewByBooking]);

  const preview = selectedBooking
    ? previewByBooking[selectedBooking.id] || { rooms: 0, pax: 0 }
    : { rooms: 0, pax: 0 };

  const canImportAll = bookings.length > 1;

  const programLabel = (p) =>
    `${p.mes_letra || ""} | ${p.nomenclador || ""} — ${p.nombre_gira || ""}${
      p.zona ? ` (${p.zona})` : ""
    }`;

  const bookingLabel = (b) => {
    const hotel = b.hoteles?.nombre || "Hotel";
    const loc = b.hoteles?.localidades?.localidad || "S/D";
    if (sourceScope === "same_gira") {
      const tramo = tramoLabelForBooking(
        b,
        segmentRows,
        segmentSpecs,
        defaultSegmentId,
      );
      return `${hotel} — ${loc} (${tramo})`;
    }
    return `${hotel} — ${loc}`;
  };

  const title =
    sourceScope === "same_gira"
      ? "Copiar hotel desde otro tramo"
      : "Importar hotel desde otro programa";

  const subtitle =
    sourceScope === "same_gira"
      ? "Se copia la reserva al tramo actual con habitaciones y asignaciones."
      : "Se copian la reserva y todas las habitaciones con sus asignaciones de integrantes.";

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
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
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
          {multiTramoEnabled && (
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                disabled={importing}
                onClick={() => setSourceScope("same_gira")}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-md transition-colors ${
                  sourceScope === "same_gira"
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Esta gira
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={() => setSourceScope("other_gira")}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-md transition-colors ${
                  sourceScope === "other_gira"
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Otra gira
              </button>
            </div>
          )}

          {sourceScope === "other_gira" && (
            <>
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
                    <IconLoader
                      className="animate-spin text-indigo-600"
                      size={18}
                    />
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
            </>
          )}

          {(sourceScope === "same_gira" ||
            (sourceScope === "other_gira" && selectedProgramId)) && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                {sourceScope === "same_gira"
                  ? "Hotel en otro tramo"
                  : "Hotel / reserva a copiar"}
              </label>
              {loadingBookings ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
                  <IconLoader
                    className="animate-spin text-indigo-600"
                    size={18}
                  />
                  Cargando reservas…
                </div>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  {sourceScope === "same_gira"
                    ? "No hay hoteles en otros tramos de esta gira."
                    : "Ese programa no tiene hoteles cargados en hospedaje."}
                </p>
              ) : (
                <>
                  {canImportAll && (
                    <p className="text-[11px] text-slate-500 mb-2">
                      {bookings.length} hoteles disponibles — podés copiar uno o
                      todos al tramo actual.
                    </p>
                  )}
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    disabled={importing}
                  >
                    {bookings.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {bookingLabel(b)}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {canImportAll && !loadingBookings && bookings.length > 0 && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-sm">
              <div className="font-bold text-emerald-900 flex items-center gap-2 mb-2">
                <IconHotel size={16} /> Copiar todos
              </div>
              <ul className="space-y-1 text-slate-700 text-xs">
                <li>
                  Hoteles: <strong>{aggregatePreview.hotels}</strong>
                </li>
                <li className="flex items-center gap-2">
                  <IconBed size={14} className="text-slate-400 shrink-0" />
                  Habitaciones totales:{" "}
                  <strong>{aggregatePreview.rooms}</strong>
                </li>
                <li>
                  Plazas asignadas en origen:{" "}
                  <strong>{aggregatePreview.pax}</strong>
                </li>
              </ul>
            </div>
          )}

          {selectedBooking && !loadingBookings && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-sm">
              <div className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
                <IconHotel size={16} />
                {canImportAll ? "Vista previa (seleccionado)" : "Vista previa"}
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
                  Tras copiar, solo verás en cada habitación a los músicos
                  confirmados en esta gira; el resto de IDs queda en la base
                  hasta que reasignes.
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium mr-auto"
          >
            Cancelar
          </button>
          {canImportAll && (
            <button
              type="button"
              disabled={importing || loadingBookings || bookings.length === 0}
              onClick={() =>
                onConfirmImport(bookings.map((b) => Number(b.id)))
              }
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              {importing ? (
                <>
                  <IconLoader className="animate-spin" size={16} />
                  Copiando…
                </>
              ) : (
                <>
                  <IconCopy size={16} />
                  Copiar todos ({bookings.length})
                </>
              )}
            </button>
          )}
          <button
            type="button"
            disabled={
              importing ||
              !selectedBookingId ||
              loadingBookings ||
              bookings.length === 0
            }
            onClick={() => onConfirmImport([Number(selectedBookingId)])}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {importing ? (
              <>
                <IconLoader className="animate-spin" size={16} />
                Copiando…
              </>
            ) : (
              <>
                <IconCopy size={16} />
                {canImportAll
                  ? "Copiar seleccionado"
                  : sourceScope === "same_gira"
                    ? "Copiar al tramo actual"
                    : "Importar"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
