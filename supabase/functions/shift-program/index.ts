import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@126.0.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { programId, daysShift } = await req.json();

    // 1. Init Clientes
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY")?.replace(/\\n/g, "\n");
    const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");

    if (!clientEmail || !privateKey) throw new Error("Faltan credenciales");

    // 2. Mover Fechas en Base de Datos (Llamada RPC)
    const { error: rpcError } = await supabase.rpc('shift_program_dates', {
      p_program_id: programId,
      p_days_shift: daysShift
    });
    if (rpcError) throw new Error("Error moviendo fechas en DB: " + rpcError.message);

    // 3. Obtener eventos que tienen Google ID para sincronizarlos
    const { data: events, error: eventsError } = await supabase
      .from('eventos')
      .select('*')
      .eq('id_gira', programId)
      .not('google_event_id', 'is', null);

    if (eventsError) throw eventsError;

    // 4. Actualizar Google Calendar
    if (events && events.length > 0) {
      const jwtClient = new google.auth.JWT(
        clientEmail, undefined, privateKey, ["https://www.googleapis.com/auth/calendar"]
      );
      await jwtClient.authorize();
      const calendar = google.calendar({ version: "v3", auth: jwtClient });

      console.log(`Actualizando ${events.length} eventos en Calendar...`);

      for (const evt of events) {
        try {
          // Necesitamos obtener el evento actual para mantener otros datos (descripción, etc)
          // O simplemente hacemos patch de las fechas.
          const cleanTime = (t: string) => t ? t.slice(0, 5) : '00:00';
          
          await calendar.events.patch({
            calendarId,
            eventId: evt.google_event_id,
            requestBody: {
              start: { dateTime: `${evt.fecha}T${cleanTime(evt.hora_inicio)}:00`, timeZone: "America/Argentina/Buenos_Aires" },
              end: { dateTime: `${evt.fecha}T${cleanTime(evt.hora_fin)}:00`, timeZone: "America/Argentina/Buenos_Aires" }
            }
          });
        } catch (e) {
          console.error(`Error actualizando evento ${evt.id} en Google:`, e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: `Gira movida ${daysShift} días.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});