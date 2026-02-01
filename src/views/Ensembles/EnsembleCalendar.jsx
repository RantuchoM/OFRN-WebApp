import React, { useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, parseISO, differenceInMinutes, roundToNearestMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

export default function EnsembleCalendar({ 
    events, onEventUpdate, onSelectEvent, 
    date, onNavigate, view, onView 
}) {
  
  const calendarEvents = useMemo(() => {
    return events.map(evt => {
        // 1. Limpieza estricta de segundos/ms
        const dateBase = parseISO(evt.fecha);
        const [hStart, mStart] = (evt.hora_inicio || "00:00").split(':').map(Number);
        
        const start = new Date(dateBase);
        start.setHours(hStart, mStart, 0, 0);

        let end;
        if (evt.hora_fin) {
            const [hEnd, mEnd] = evt.hora_fin.split(':').map(Number);
            end = new Date(dateBase);
            end.setHours(hEnd, mEnd, 0, 0);
        } else {
            end = new Date(start.getTime() + 60 * 60 * 1000); 
        }

        if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);

        // 2. EL TRUCO DEL MILISEGUNDO (Solo para el layout)
        // Al restar 1ms, si Evento A termina 10:00 y B empieza 10:00:
        // A termina 09:59:59.999 -> No toca a B -> Se apilan verticalmente.
        // Si A termina 10:30 y B empieza 10:00 -> Se superponen -> Se ponen lado a lado.
        const visualEnd = new Date(end.getTime() - 1); 

        const eventTitle = evt.descripcion || (evt.tipos_evento?.nombre || "Evento");
        const tooltipText = `${eventTitle}\n${evt.hora_inicio.slice(0,5)} - ${evt.hora_fin?.slice(0,5) || '?'}`;

        return {
            id: evt.id,
            title: eventTitle,
            start, 
            end: visualEnd,
            resource: { ...evt, realEnd: end }, // Guardamos el final real para texto
            color: evt.tipos_evento?.color || '#6366f1', 
            isDraggable: !!evt.isMyRehearsal,
            tooltip: tooltipText
        };
    });
  }, [events]);

  const { formats } = useMemo(() => ({
    formats: {
      // Ocultamos la hora automática del calendario para controlarla nosotros
      eventTimeRangeFormat: () => "" 
    }
  }), []);

  const EventComponent = ({ event }) => {
      // Usamos la duración real para decidir qué mostrar
      const duration = differenceInMinutes(event.resource.realEnd, event.start);
      
      // Evento < 30 min: Caja vacía (solo color)
      if (duration < 30) return null; 

      return (
          <div className="flex flex-col h-full overflow-hidden px-1 py-0.5 leading-tight select-none">
              <div className="text-[10px] font-bold truncate">
                  {event.title}
              </div>
              {/* Solo mostrar hora si hay espacio suficiente (>50 min) */}
              {duration >= 50 && (
                  <div className="text-[9px] opacity-90 truncate font-normal">
                      {format(event.start, 'HH:mm')} - {format(event.resource.realEnd, 'HH:mm')}
                  </div>
              )}
          </div>
      );
  };

  const eventPropGetter = (event) => {
    const isMyEvent = event.resource.isMyRehearsal;
    // Detectamos si es corto para aplicar clase CSS específica
    const duration = differenceInMinutes(event.resource.realEnd, event.start);
    const isShort = duration < 30;

    return {
      className: isShort ? 'rbc-event-short' : '',
      style: {
        backgroundColor: event.color,
        borderRadius: '2px',
        opacity: isMyEvent ? 1 : 0.65,
        color: 'white',
        border: isMyEvent ? '1px solid rgba(0,0,0,0.1)' : '2px dashed rgba(100,116,139,0.5)',
        fontSize: '0.75rem', 
        padding: 0,
        margin: 0,
        cursor: isMyEvent ? 'pointer' : 'default',
        boxShadow: 'none',
        // Esto permite que el CSS controle la altura mínima real
        minHeight: '0px' 
      },
      title: event.tooltip 
    };
  };

  const handleEventDrop = ({ event, start, end }) => {
    if (!event.resource.isMyRehearsal) return;
    // Redondeo para limpiar el milisegundo al guardar
    const cleanEnd = roundToNearestMinutes(end, { nearestTo: 15 });
    const cleanStart = roundToNearestMinutes(start, { nearestTo: 15 });
    onEventUpdate(event.id, {
        fecha: format(cleanStart, 'yyyy-MM-dd'),
        hora_inicio: format(cleanStart, 'HH:mm'),
        hora_fin: format(cleanEnd, 'HH:mm')
    });
  };

  const handleEventResize = ({ event, start, end }) => {
    if (!event.resource.isMyRehearsal) return;
    const cleanEnd = roundToNearestMinutes(end, { nearestTo: 15 });
    const cleanStart = roundToNearestMinutes(start, { nearestTo: 15 });
    onEventUpdate(event.id, {
        hora_inicio: format(cleanStart, 'HH:mm'),
        hora_fin: format(cleanEnd, 'HH:mm')
    });
  };

  return (
    <div className="h-[750px] bg-white p-2 rounded-xl shadow-sm border border-slate-200 relative">
      
      {/* CSS EQUILIBRADO:
          1. Eliminamos min-height y padding para permitir eventos finos.
          2. NO tocamos 'width' ni 'left' para permitir que el calendario calcule superposiciones reales.
          3. Ocultamos labels por defecto.
      */}
      <style>{`
        .rbc-event {
            padding: 0 !important;
            min-height: 0px !important; /* Permite eventos de 15 min reales */
        }
        
        .rbc-event-label {
            display: none !important; /* Ocultar texto automático siempre */
        }

        .rbc-event-content {
            font-size: inherit;
            /* width: 100%; <- ELIMINADO para permitir side-by-side */
        }

        /* Ajuste de la grilla */
        .rbc-time-slot {
            min-height: 12px; /* Altura física del slot de 15 min */
        }
        
        /* Opcional: un poco de espacio visual entre eventos */
        .rbc-day-slot .rbc-events-container {
            margin-right: 2px;
        }
      `}</style>

      <DnDCalendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        
        date={date}         
        onNavigate={onNavigate} 
        view={view}         
        onView={onView}     
        
        defaultView="week" 
        views={['month', 'week', 'day']}
        culture="es"
        
        formats={formats}

        messages={{
            next: "Sig", previous: "Ant", today: "Hoy",
            month: "Mes", week: "Semana", day: "Día",
            agenda: "Agenda", date: "Fecha", time: "Hora", event: "Evento"
        }}

        draggableAccessor={(event) => event.isDraggable}
        resizableAccessor={(event) => event.isDraggable}
        resizable={true}
        selectable={true} 
        
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        onSelectEvent={(e) => onSelectEvent(e.resource)}
        
        eventPropGetter={eventPropGetter}
        components={{ event: EventComponent }}
        
        step={15} 
        timeslots={4} 
      />
    </div>
  );
}