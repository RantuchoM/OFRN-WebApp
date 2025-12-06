// services/googleCalendar.js (Ejemplo simplificado)

export const syncWithGoogle = async (evento, token) => {
    const eventBody = {
        summary: `Gira: ${evento.titulo}`, // Título
        location: evento.ubicacion,
        description: evento.descripcion,
        start: { dateTime: `${evento.fecha}T${evento.hora_inicio}:00`, timeZone: 'America/Argentina/Buenos_Aires' },
        end: { dateTime: `${evento.fecha}T${evento.hora_fin}:00`, timeZone: 'America/Argentina/Buenos_Aires' }
    };

    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    let method = 'POST';

    // Si ya tiene ID de Google, es una EDICIÓN (PUT), si no, es CREACIÓN (POST)
    if (evento.google_event_id) {
        url += `/${evento.google_event_id}`;
        method = 'PUT';
    }

    const response = await fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`, // El token de Supabase Google Auth
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
    });

    return await response.json(); // Devuelve el objeto de Google (con el nuevo ID)
};