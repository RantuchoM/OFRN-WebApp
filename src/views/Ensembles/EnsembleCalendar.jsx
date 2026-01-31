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
        // 1. Sanitización de Fechas (00 segundos, 000 ms)
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

        // 2. EL TRUCO DEL MILISEGUNDO (Solo para el layout gráfico)
        // Al restar 1ms, matemáticamente el evento termina 09:59:59.999.
        // Si el siguiente empieza 10:00:00.000, NO se tocan -> Se apilan verticalmente.
        const visualEnd = new Date(end.getTime() - 1); 

        const eventTitle = evt.descripcion || (evt.tipos_evento?.nombre || "Evento");
        const tooltipText = `${eventTitle}\n${evt.hora_inicio.slice(0,5)} - ${evt.hora_fin?.slice(0,5) || '?'}`;

        return {
            id: evt.id,
            title: eventTitle,
            start, 
            end: visualEnd, // Usamos fecha recortada para el motor del calendario
            resource: { ...evt, realEnd: end }, // Guardamos fecha REAL para los textos
            color: evt.tipos_evento?.color || '#6366f1', 
            isDraggable: !!evt.isMyRehearsal,
            tooltip: tooltipText
        };
    });
  }, [events]);

  const { formats } = useMemo(() => ({
    formats: {
      // 3. Formato Personalizado de Hora
      // Como 'end' viene con -1ms, le sumamos 1ms para mostrar la hora correcta en el label (si se mostrara)
      eventTimeRangeFormat: ({ start, end }, culture, localizer) => {
         const originalEnd = new Date(end.getTime() + 1);
         const duration = differenceInMinutes(originalEnd, start);
         
         // Ocultar texto si es muy corto (< 40 min)
         if (duration < 40) return ""; 
         
         return `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(originalEnd, 'HH:mm', culture)}`;
      }
    }
  }), []);

  const EventComponent = ({ event }) => {
      // 4. Usamos la duración REAL (sin el -1ms) para la lógica visual
      const duration = differenceInMinutes(event.resource.realEnd, event.start);
      
      // Si es muy corto (< 30 min), caja vacía (solo color)
      if (duration < 30) return null; 

      return (
          <div className="flex flex-col h-full overflow-hidden px-1 py-0.5 leading-tight select-none" title={event.tooltip}>
              <div className="text-[10px] font-bold truncate">
                  {event.title}
              </div>
              {/* Mostrar hora solo si sobra espacio (>50 min) */}
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
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '2px',
        opacity: isMyEvent ? 1 : 0.65,
        color: 'white',
        border: isMyEvent ? '1px solid rgba(0,0,0,0.1)' : '2px dashed rgba(100,116,139,0.6)',
        fontSize: '0.75rem', 
        padding: 0,
        margin: 0,
        cursor: isMyEvent ? 'pointer' : 'default',
        boxShadow: 'none',
        minHeight: '0px' // Permite contraerse
      },
      title: event.tooltip 
    };
  };

  // Handlers: Redondeamos para eliminar el efecto del -1ms al guardar
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
    <div className="h-[750px] bg-white p-2 rounded-xl shadow-sm border border-slate-200 relative">
      
      {/* CSS para limpiar la visualización */}
      <style>{`
        .rbc-event {
            min-height: 0px !important; /* Altura real */
            padding: 0 !important;
        }
        .rbc-event-label {
            display: none !important; /* Ocultamos label nativo para controlar nosotros */
        }
        .rbc-event-content {
            font-size: inherit;
        }
        .rbc-time-slot {
            min-height: 15px; /* Altura física del slot de 15 min */
        }
        /* Eliminar margen lateral para que se vea continuo si es ancho completo */
        .rbc-day-slot .rbc-events-container {
            margin-right: 0px;
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