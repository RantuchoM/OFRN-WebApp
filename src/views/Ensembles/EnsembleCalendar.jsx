import React, { forwardRef, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, parseISO, differenceInMinutes, roundToNearestMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  getCalendarEventTitle,
  getEventEnsambles,
  isEnsayoEnsambleEvent,
} from '../../utils/eventDisplayUtils';

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

function buildEventTooltip(evt, title) {
  const parts = [title];
  const ensambles = getEventEnsambles(evt);
  if (isEnsayoEnsambleEvent(evt) && ensambles.length > 0) {
    parts.push(ensambles.map((e) => e.ensamble).join(', '));
  }
  parts.push(
    `${evt.hora_inicio.slice(0, 5)} - ${evt.hora_fin?.slice(0, 5) || '?'}`,
  );
  return parts.join('\n');
}

const EnsembleCalendar = forwardRef(function EnsembleCalendar(
  { events, onEventUpdate, onSelectEvent, date, onNavigate, view, onView },
  ref,
) {
  const calendarEvents = useMemo(() => {
    return events.map(evt => {
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

        const visualEnd = new Date(end.getTime() - 1); 

        const eventTitle = getCalendarEventTitle(evt);
        const tooltipText = buildEventTooltip(evt, eventTitle);

        return {
            id: evt.id,
            title: eventTitle,
            start, 
            end: visualEnd,
            resource: { ...evt, realEnd: end },
            color: evt.tipos_evento?.color || '#6366f1', 
            isDraggable: !!evt.isMyRehearsal,
            tooltip: tooltipText
        };
    });
  }, [events]);

  const { formats } = useMemo(() => ({
    formats: {
      eventTimeRangeFormat: () => "" 
    }
  }), []);

  const EventComponent = ({ event }) => {
      const duration = differenceInMinutes(event.resource.realEnd, event.start);
      const ensambles = getEventEnsambles(event.resource);
      const showEnsambleTags =
        isEnsayoEnsambleEvent(event.resource) && ensambles.length > 0;
      
      if (duration < 30) return null; 

      return (
          <div className="flex flex-col h-full overflow-hidden px-1 py-0.5 leading-tight select-none gap-0.5">
              <div className="text-[10px] font-bold truncate">
                  {event.title}
              </div>
              {showEnsambleTags && (
                <div className="flex flex-wrap gap-1 max-h-[2.8em] overflow-hidden">
                  {ensambles.map((ens) => (
                    <span
                      key={ens.id}
                      className="text-[10px] font-semibold uppercase bg-white/25 px-1.5 py-0.5 rounded truncate max-w-full leading-tight"
                    >
                      {ens.ensamble}
                    </span>
                  ))}
                </div>
              )}
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
        minHeight: '0px' 
      },
      title: event.tooltip 
    };
  };

  const handleEventDrop = ({ event, start, end }) => {
    if (!event.resource.isMyRehearsal) return;
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
    <div
      ref={ref}
      data-calendar-export-root="coordinator-ensemble"
      className="h-[750px] bg-white p-2 rounded-xl shadow-sm border border-slate-200 relative coordinator-calendar-export-root"
    >
      <style>{`
        .rbc-event {
            padding: 0 !important;
            min-height: 0px !important;
        }
        
        .rbc-event-label {
            display: none !important;
        }

        .rbc-event-content {
            font-size: inherit;
        }

        .rbc-time-slot {
            min-height: 12px;
        }
        
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
});

export default EnsembleCalendar;
