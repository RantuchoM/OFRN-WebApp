import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helpers
const formatDateTime = (dateStr: string, timeStr: string) => {
  if (!timeStr) return dateStr.replace(/-/g, '') + 'T000000';
  return `${dateStr.replace(/-/g, '')}T${timeStr.replace(/:/g, '').substring(0, 6)}`;
}

const formatDateOnly = (dateStr: string) => {
  return dateStr.replace(/-/g, '');
}

const addDays = (dateStr: string, days: number) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

serve(async (req) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get('uid');
  const mode = url.searchParams.get('mode'); // 'full' (default) o 'essential'

  if (!userId) {
    return new Response("Falta el ID de usuario", { status: 400 });
  }

  // 1. Init Supabase
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. Perfil
  const { data: profile, error: profileError } = await supabase
    .from('integrantes')
    .select('*, instrumentos(familia), integrantes_ensambles(id_ensamble)')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return new Response("Usuario no encontrado", { status: 404 });
  }

  const myEnsembles = new Set(profile.integrantes_ensambles?.map((ie: any) => ie.id_ensamble) || []);
  const myFamily = profile.instrumentos?.familia;

  // 3. Obtener EVENTOS (Traer desde hace 1 semana en adelante)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const { data: eventos, error: eventsError } = await supabase
    .from('eventos')
    .select(`
      id, fecha, hora_inicio, hora_fin, descripcion, convocados, 
      tipos_evento(nombre), 
      locaciones(
        nombre, 
        direccion,
        localidades(localidad) 
      ),
      programas(
        id,
        nomenclador,
        mes_letra,
        google_drive_folder_id,
        giras_integrantes(id_integrante, estado, rol),
        giras_fuentes(tipo, valor_id, valor_texto)
      )
    `)
    .gte('fecha', oneWeekAgo.toISOString())
    .order('fecha', { ascending: true });

  if (eventsError) {
    console.error("Error eventos:", eventsError);
    return new Response("Error al leer eventos", { status: 500 });
  }

  // 4. Filtrado
  const eventosFiltrados = (eventos || []).filter((evt: any) => {
    
    // --- FILTRO DE MODO (Suscripción) ---
    if (mode === 'essential') {
        const tipoName = evt.tipos_evento?.nombre?.toLowerCase() || '';
        // Solo permitimos Ensayos y Conciertos
        const isCore = tipoName.includes('ensayo') || 
                       tipoName.includes('concierto') || 
                       tipoName.includes('rehearsal') || 
                       tipoName.includes('concert');
        if (!isCore) return false;
    }

    // --- FILTRO DE PERMISOS (Convocatoria) ---
    let include = false;

    // A. Lógica Convocados (Tags explícitos)
    if (evt.convocados && evt.convocados.length > 0) {
      const tags = evt.convocados;
      if (tags.includes("GRP:TUTTI")) include = true;
      else if (tags.includes("GRP:LOCALES") && profile.is_local) include = true;
      else if (tags.includes(`FAM:${myFamily}`)) include = true;
    } 
    // B. Lógica de Giras/Programas
    else if (evt.programas) {
        const p = evt.programas;
        // Override manual
        const myOverride = p.giras_integrantes?.find((gi: any) => String(gi.id_integrante) === String(userId));
        
        if (myOverride) {
            if (myOverride.estado !== 'ausente') include = true;
        } else {
            // Chequear fuentes
            const fuentes = p.giras_fuentes || [];
            const matchesSource = fuentes.some((s: any) => 
                (s.tipo === 'ENSAMBLE' && myEnsembles.has(s.valor_id)) ||
                (s.tipo === 'FAMILIA' && s.valor_texto === myFamily)
            );
            if (matchesSource) include = true;
        }
    } else {
        // C. Eventos sueltos
        include = true;
    }
    return include;
  });

  // 5. Giras (Para barras de día completo)
  const today = new Date().toISOString().split('T')[0];
  const { data: programas } = await supabase
    .from('giras_integrantes')
    .select(`
      programas(
        id, nombre_gira, fecha_desde, fecha_hasta, 
        nomenclador, mes_letra, tipo, zona, 
        google_drive_folder_id
      )
    `)
    .eq('id_integrante', userId)
    .gte('programas.fecha_hasta', today);

  // 6. Generar ICS
  const calName = mode === 'essential' ? 'OFRN (Esencial)' : 'OFRN (Completa)';
  
  let icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OrquestaManager//App//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 
  ];

  // A. Eventos
  eventosFiltrados.forEach((evt: any) => {
    const tipoNombre = evt.tipos_evento?.nombre || 'Evento';
    const prog = evt.programas;
    const loc = evt.locaciones;
    const city = loc?.localidades?.localidad;

    let summary = `[${tipoNombre.toUpperCase()}]`;
    if (prog && prog.nomenclador) {
        summary += ` | ${prog.nomenclador}`;
        if (prog.mes_letra) summary += ` - ${prog.mes_letra}`;
    } else if (evt.descripcion) {
        summary += ` ${evt.descripcion}`;
    }

    const descLines = [];
    if (evt.descripcion) descLines.push(evt.descripcion);
    if (loc?.nombre) descLines.push(`📍 ${loc.nombre}`);
    if (loc?.direccion || city) {
        const addrPart = loc.direccion || '';
        const cityPart = city ? ` - ${city}` : '';
        descLines.push(`🏠 ${addrPart}${cityPart}`);
    }

    descLines.push(''); 

    if (prog?.google_drive_folder_id) {
        descLines.push(`📂 Drive: https://drive.google.com/drive/folders/${prog.google_drive_folder_id}`);
    }
    if (prog?.id) {
        descLines.push(`🔗 App: https://ofrn-web-app.vercel.app/?tab=giras&view=REPERTOIRE&giraId=${prog.id}`);
    }

    const descriptionBlock = descLines.join('\\n');
    const dtEnd = formatDateTime(evt.fecha, evt.hora_fin || evt.hora_inicio);

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:evt_${evt.id}@orquestamanager.app`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${formatDateTime(evt.fecha, evt.hora_inicio)}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${descriptionBlock}`,
      `LOCATION:${loc?.nombre || ''}, ${city || ''}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  // B. Giras (Barras superiores)
  programas?.forEach((row: any) => {
    const prog = row.programas;
    if (!prog || !prog.fecha_desde) return;

    const dtStart = formatDateOnly(prog.fecha_desde);
    const dtEnd = prog.fecha_hasta ? addDays(prog.fecha_hasta, 1) : addDays(prog.fecha_desde, 1);
    
    // --- NUEVO FORMATO DE TÍTULO ---
    // Título: "TIPO (MAYUS) | Zona. Nomenclador - mes_letra"
    const tipoStr = prog.tipo ? prog.tipo.toUpperCase() : 'GIRA';
    const zonaStr = prog.zona ? `${prog.zona}. ` : '';
    const title = `${tipoStr} | ${zonaStr}${prog.nomenclador || ''} - ${prog.mes_letra || ''}`;

    // --- NUEVA DESCRIPCIÓN CON LINKS ---
    const progDescLines = [];
    if (prog.nombre_gira) progDescLines.push(`Nombre: ${prog.nombre_gira}`);
    progDescLines.push('');
    
    if (prog.google_drive_folder_id) {
        progDescLines.push(`📂 Drive: https://drive.google.com/drive/folders/${prog.google_drive_folder_id}`);
    }
    if (prog.id) {
        progDescLines.push(`🔗 App: https://ofrn-web-app.vercel.app/?tab=giras&view=REPERTOIRE&giraId=${prog.id}`);
    }
    const progDescription = progDescLines.join('\\n');

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:prog_${prog.id}@orquestamanager.app`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${progDescription}`,
      'TRANSP:TRANSPARENT', 
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');

  return new Response(icsLines.join('\r\n'), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agenda_personal.ics"`,
    },
  });
});