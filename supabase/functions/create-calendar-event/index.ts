import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@126.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, evento } = await req.json(); 
    
    const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY")?.replace(/\\n/g, "\n");
    const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");

    if (!clientEmail || !privateKey || !calendarId) throw new Error("Faltan credenciales");

    const jwtClient = new google.auth.JWT(
      clientEmail, undefined, privateKey, ["https://www.googleapis.com/auth/calendar"]
    );
    await jwtClient.authorize();
    const calendar = google.calendar({ version: "v3", auth: jwtClient });

    let result;
    const cleanTime = (t: string) => t ? t.slice(0, 5) : '00:00';

    if (action === "create" || action === "update") {
      const attendeesList = (evento.invitados || []).map((email: string) => ({ email }));

      const eventBody: any = {
        summary: evento.titulo || 'Evento de Orquesta',
        location: evento.ubicacion || '',
        description: evento.descripcion || '',
        start: { dateTime: `${evento.fecha}T${cleanTime(evento.hora_inicio)}:00`, timeZone: "America/Argentina/Buenos_Aires" },
        end: { dateTime: `${evento.fecha}T${cleanTime(evento.hora_fin)}:00`, timeZone: "America/Argentina/Buenos_Aires" },
        attendees: attendeesList,
        guestsCanSeeOtherGuests: false,
      };

      // Función auxiliar para ejecutar la llamada a Google con reintento
      const executeGoogleCall = async (retryWithoutAttendees = false) => {
        // Si es reintento, quitamos los invitados para que no falle
        if (retryWithoutAttendees) {
          delete eventBody.attendees;
          console.log("Reintentando SIN invitados...");
        }

        if (action === "create") {
          return await calendar.events.insert({ calendarId, requestBody: eventBody });
        } else {
          return await calendar.events.update({
            calendarId,
            eventId: evento.google_event_id,
            requestBody: eventBody,
          });
        }
      };

      try {
        // Intento 1: Con todo (incluidos invitados)
        const resp = await executeGoogleCall(false);
        result = { google_id: resp.data.id, status: action === "create" ? "created" : "updated" };
      
      } catch (e: any) {
        // ERROR 403: El robot no tiene permiso para invitar (tu caso actual)
        if (e.code === 403 && e.message.includes("Service accounts cannot invite")) {
          console.warn("Google bloqueó las invitaciones. Creando evento sin invitados.");
          const resp = await executeGoogleCall(true); // Reintentar sin invitados
          result = { google_id: resp.data.id, status: "created_no_invites", warning: "No se pudieron enviar invitaciones (Restricción de Google)." };
        }
        // ERROR 404: El evento no existe (para Updates) -> Lo recreamos
        else if (action === "update" && e.code === 404) {
          console.log("Evento no encontrado (404). Recreando...");
          // Si falló por 404, intentamos insertar de cero (intentando mantener invitados primero)
          try {
             const resp = await calendar.events.insert({ calendarId, requestBody: eventBody });
             result = { google_id: resp.data.id, status: "created_recovery" };
          } catch (insertError: any) {
             // Si al recrear falla por 403 (invitados), reintentamos sin ellos
             if (insertError.code === 403) {
                delete eventBody.attendees;
                const resp = await calendar.events.insert({ calendarId, requestBody: eventBody });
                result = { google_id: resp.data.id, status: "created_recovery_no_invites" };
             } else {
                throw insertError;
             }
          }
        } 
        else {
          throw e; // Otro error, explotar
        }
      }
    } 
    else if (action === "delete" && evento.google_event_id) {
      try {
        await calendar.events.delete({ calendarId, eventId: evento.google_event_id });
      } catch (e: any) {
        if (e.code !== 404) throw e;
      }
      result = { status: "deleted" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});