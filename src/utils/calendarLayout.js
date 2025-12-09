// src/utils/calendarLayout.js

// Ya no usamos PIXELS_PER_HOUR fijo, calculamos porcentajes relativos al día (0-100%)

export const getTopPercent = (dateString) => {
  if (!dateString) return 0;
  const date = new Date(dateString);
  const minutes = date.getHours() * 60 + date.getMinutes();
  const totalMinutes = 24 * 60; // 1440 minutos en un día
  return (minutes / totalMinutes) * 100;
};

export const getHeightPercent = (startString, endString) => {
  if (!startString || !endString) return 5; // Default un poco de altura
  const start = new Date(startString);
  const end = new Date(endString);
  const diffMinutes = (end - start) / (1000 * 60);
  const totalMinutes = 24 * 60;
  const percent = (diffMinutes / totalMinutes) * 100;
  
  // Mínimo 2% de altura para que siempre se pueda hacer click (aprox 30min visuales)
  return percent < 2 ? 2 : percent; 
};

// La lógica "Tetris" se mantiene igual porque calcula anchos (width/left), que ya eran %
export const processEventsForLayout = (events) => {
  if (!events || events.length === 0) return [];

  const sortedEvents = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
  
  const processed = sortedEvents.map(event => ({ 
    ...event, 
    collisions: [], 
    width: 100, 
    left: 0 
  }));

  for (let i = 0; i < processed.length; i++) {
    for (let j = i + 1; j < processed.length; j++) {
      const eventA = processed[i];
      const eventB = processed[j];

      // Detectar colisión
      if (new Date(eventA.end) > new Date(eventB.start)) {
        eventA.collisions.push(j);
        eventB.collisions.push(i);
      }
    }
  }

  processed.forEach((event, index) => {
    if (event.collisions.length > 0) {
      const distinctCollisions = new Set([...event.collisions, index]);
      const count = distinctCollisions.size;
      const sortedIndexes = [...distinctCollisions].sort((a, b) => a - b);
      const positionIndex = sortedIndexes.indexOf(index);
      
      event.width = 100 / count;
      event.left = positionIndex * event.width;
    }
  });

  return processed;
};