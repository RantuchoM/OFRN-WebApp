import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.20.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();

    // --- MODO: FIND_WORK_METADATA (año de composición + IMSLP) ---
    if (body?.type === 'FIND_WORK_METADATA') {
      const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
      const wantsIMSLP = !!body.linkDriveEmpty;
      if (!openaiKey) {
        return new Response(JSON.stringify({ year: null, imslpUrl: null, error: 'OPENAI_API_KEY no configurada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const openai = new OpenAI({ apiKey: openaiKey });
      const titulo = (body.titulo || '').trim();
      const compositorApellido = (body.compositorApellido || '').trim();
      const compositorNombre = (body.compositorNombre || '').trim();
      // Debe haber al menos título y algún dato de compositor (nombre o apellido)
      if (!titulo || (!compositorApellido && !compositorNombre)) {
        return new Response(JSON.stringify({ year: null, imslpUrl: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const compositorLabel = compositorNombre && compositorApellido
        ? `${compositorNombre} ${compositorApellido}`
        : (compositorApellido || compositorNombre);
      const systemContent = wantsIMSLP
        ? 'Eres un experto en música clásica. Debes identificar la obra EXACTA usando el nombre y apellido del compositor y el título completo (incluyendo movimientos y/o año si aparecen). NO INVENTES INFORMACIÓN. Usa solo fuentes confiables (catálogos oficiales, IMSLP, etc.). Si no puedes estar al menos en un 90% seguro de la obra y del año de composición, o hay varias obras posibles o las fuentes se contradicen, responde con {"year": null, "imslpUrl": null}. Si encuentras una única obra clara, responde ÚNICAMENTE con un objeto JSON válido, por ejemplo: {"year": 1896, "imslpUrl": "https://imslp.org/wiki/..."}. El campo "year" debe ser un número entero entre 1000 y 2100 o null. El campo "imslpUrl" debe ser la URL EXACTA de IMSLP para esa obra o null si no existe o no estás seguro. No incluyas texto adicional.'
        : 'Eres un experto en música clásica. Debes identificar la obra EXACTA usando el nombre y apellido del compositor y el título completo (incluyendo movimientos y/o año si aparecen). NO INVENTES INFORMACIÓN. Si no puedes estar al menos en un 90% seguro del año de composición o las fuentes se contradicen, responde {"year": null}. Responde ÚNICAMENTE con un objeto JSON válido: {"year": número} donde "year" es un entero entre 1000 y 2100 o null. No incluyas texto adicional.';
      let rawContent = '{}';
      try {
        const comp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemContent },
            {
              role: 'user',
              content: wantsIMSLP
                ? `Obra EXACTA "${titulo}" de ${compositorLabel}. Usa SOLO información que puedas verificar en fuentes confiables. Si no estás seguro, "year" e "imslpUrl" deben ser null. Respuesta JSON.`
                : `¿En qué año se compuso la obra EXACTA "${titulo}" de ${compositorLabel}? Si no estás seguro del año exacto, devuelve "year": null. Responde solo el JSON.`,
            },
          ],
          response_format: { type: 'json_object' },
        });
        rawContent = comp.choices[0]?.message?.content || '{}';
      } catch (openaiErr) {
        console.error('FIND_WORK_METADATA OpenAI:', openaiErr);
        return new Response(JSON.stringify({ year: null, imslpUrl: null, error: 'Error al llamar a OpenAI' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const content = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      let year: number | null = null;
      let imslpUrl: string | null = null;
      try {
        const parsed = JSON.parse(content);
        const rawYear = parsed?.year;
        const y = typeof rawYear === 'number'
          ? Math.floor(rawYear)
          : (typeof rawYear === 'string' ? parseInt(rawYear, 10) : null);
        if (!Number.isNaN(y) && y >= 1000 && y <= 2100) year = y;
        const urlRaw = parsed?.imslpUrl ?? parsed?.imslp_url;
        if (wantsIMSLP && typeof urlRaw === 'string') {
          const u = urlRaw.trim();
          if (u.startsWith('http://') || u.startsWith('https://')) imslpUrl = u;
        }
      } catch (e) {
        console.error('FIND_WORK_METADATA parse:', e);
      }
      return new Response(JSON.stringify({ year, imslpUrl }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- MODO: FIND_TITLE_WITH_MOVEMENTS (sugerencia de título con movimientos) ---
    if (body?.type === 'FIND_TITLE_WITH_MOVEMENTS') {
      const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
      if (!openaiKey) {
        return new Response(
          JSON.stringify({ titleWithMovements: null, error: 'OPENAI_API_KEY no configurada' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const openai = new OpenAI({ apiKey: openaiKey });
      const titulo = (body.titulo || '').trim();
      const compositorApellido = (body.compositorApellido || '').trim();
      const compositorNombre = (body.compositorNombre || '').trim();
      if (!titulo || (!compositorApellido && !compositorNombre)) {
        return new Response(
          JSON.stringify({
            titleWithMovements: null,
            error: 'Debe indicar título y al menos un compositor para buscar sugerencias.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const compositorLabel = compositorNombre && compositorApellido
        ? `${compositorNombre} ${compositorApellido}`
        : (compositorApellido || compositorNombre);

      const systemContent =
        'Eres un experto en música clásica y editor de programas de concierto. Tu tarea es PROPONER UN TEXTO DE TÍTULO legible para el público, usando SOLO la información contenida en el título dado y en el nombre del compositor. ' +
        'NO INVENTES NUEVAS OBRAS, MOVIMIENTOS, NÚMEROS DE CATÁLOGO NI AÑOS QUE NO APAREZCAN YA EN EL TEXTO. ' +
        'Puedes: mejorar mayúsculas, tildes, signos de puntuación y maquetar los movimientos en líneas separadas con numerales romanos si ya se deducen claramente del texto. ' +
        'Si no puedes estar al menos en un 90% seguro de la estructura del título y movimientos SOLO a partir del texto dado, responde {"titleWithMovements": null}. ' +
        'Responde ÚNICAMENTE con un JSON válido: {"titleWithMovements": string | null}. No incluyas comentarios ni explicación.';

      let rawContent = '{}';
      try {
        const comp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemContent },
            {
              role: 'user',
              content:
                `Título de trabajo actual: "${titulo}".\n` +
                `Compositor: ${compositorLabel}.\n` +
                'Usa SOLO estos datos. No añadas nada que no esté ya implícito en el texto. Devuelve un JSON con "titleWithMovements".',
            },
          ],
          response_format: { type: 'json_object' },
        });
        rawContent = comp.choices[0]?.message?.content || '{}';
      } catch (e) {
        console.error('FIND_TITLE_WITH_MOVEMENTS OpenAI:', e);
        return new Response(
          JSON.stringify({
            titleWithMovements: null,
            error: 'Error al llamar a OpenAI para sugerir el título.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const content = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      let titleWithMovements: string | null = null;
      try {
        const parsed = JSON.parse(content);
        const rawTitle = parsed?.titleWithMovements ?? parsed?.title_with_movements;
        if (typeof rawTitle === 'string' && rawTitle.trim().length > 0) {
          titleWithMovements = rawTitle.trim();
        }
      } catch (e) {
        console.error('FIND_TITLE_WITH_MOVEMENTS parse:', e);
      }

      return new Response(
        JSON.stringify({ titleWithMovements }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { messages, userId, currentPath } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''; 
    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // --- FASE 1: HIDRATACIÓN DE IDENTIDAD ---
    let userProfile = "Usuario Invitado";
    let userInstrument = "No especificado";
    let integranteId = null; // ID numérico de la tabla 'integrantes'

    if (userId) {
      // 1. Buscar en 'perfiles' para obtener el 'id_integrante'
      // (Asumiendo que userId es el UUID de Supabase Auth)
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id_integrante, nombre_completo, rol')
        .eq('id', userId) // El ID de la tabla perfiles suele ser el UUID del usuario
        .single();

      if (perfil && perfil.id_integrante) {
         integranteId = perfil.id_integrante;
         
         // 2. Buscar detalles en 'integrantes'
         const { data: integrante } = await supabase
            .from('integrantes')
            .select('nombre, apellido, id_instr')
            .eq('id', integranteId)
            .single();

         if (integrante) {
             userProfile = `${integrante.nombre} ${integrante.apellido}`;
             userInstrument = integrante.id_instr || "Staff"; // id_instr parece ser el instrumento
         }
      } else {
         // Fallback si no hay perfil vinculado
         userProfile = perfil?.nombre_completo || "Usuario Staff";
      }
    }

    // --- FASE 2: CONTEXTO "DÓNDE ESTOY" ---
    let contextDetail = "";
    
    // Si la URL es tipo /giras/15, buscamos en 'programas'
    if (currentPath.includes('/giras/')) {
        const parts = currentPath.split('/');
        const giraId = parts[parts.length - 1]; 
        
        if (!isNaN(Number(giraId))) {
            const { data: prog } = await supabase
                .from('programas')
                .select('nombre_gira, fecha_desde, subtitulo')
                .eq('id', giraId)
                .single();
            
            if (prog) {
                contextDetail = `GIRA ACTUAL: "${prog.nombre_gira}" (${prog.subtitulo || ''}). Fecha inicio: ${prog.fecha_desde}.`;
            }
        }
    } 
    // Si es /repertorio/88, buscamos en 'obras'
    else if (currentPath.includes('/repertorio/')) {
        const parts = currentPath.split('/');
        const obraId = parts[parts.length - 1];
        if (!isNaN(Number(obraId))) {
             const { data: obra } = await supabase
                .from('obras')
                .select('titulo, compositores(apellido)')
                .eq('id', obraId)
                .single();
             
             if (obra) {
                 // Nota: compositores es un objeto porque es una relación
                 const compositor = obra.compositores ? obra.compositores.apellido : 'Desconocido';
                 contextDetail = `OBRA ACTUAL: "${obra.titulo}" de ${compositor}`;
             }
        }
    }

    // --- FASE 3: MANUAL ---
    const routeKey = currentPath.split('/')[1] ? `/${currentPath.split('/')[1]}` : '/';
    const { data: manualData } = await supabase
      .from('app_docs')
      .select('content')
      .in('route', ['/general', routeKey]);

    const docsContext = manualData?.map(d => d.content).join('\n') || "";

    // --- FASE 4: SYSTEM PROMPT ---
    const systemPrompt = `
      Eres el Asistente de la Orquesta Filarmónica (OFRN).
      
      PERFIL DEL USUARIO:
      - Nombre: ${userProfile}
      - Instrumento: ${userInstrument}
      - ID Interno: ${integranteId || "N/A"}
      
      SITUACIÓN:
      - Ruta: "${currentPath}"
      - Contexto: ${contextDetail || "Navegación general"}
      
      MANUAL:
      ${docsContext}

      INSTRUCCIONES:
      1. Si preguntan "¿Qué toco?", usa 'get_my_assignments'.
      2. Si preguntan por obras generales, usa 'search_works'.
      3. Responde cortésmente: "Hola ${userProfile.split(' ')[0]}..."
    `;

    // 5. Herramientas
    const tools = [
      {
        type: "function",
        function: {
          name: "get_my_assignments",
          description: "Busca qué obras tiene asignadas este músico específico.",
          parameters: { type: "object", properties: {} }, 
        },
      },
      {
        type: "function",
        function: {
          name: "search_works",
          description: "Busca obras en el archivo general.",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
        },
      },
    ];

    // 6. Ejecución OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools: tools,
      tool_choice: "auto",
    });

    const msg = completion.choices[0].message;

    if (msg.tool_calls) {
      const toolCall = msg.tool_calls[0];
      let toolResult = "";

      if (toolCall.function.name === "get_my_assignments") {
        if (!integranteId) {
            toolResult = "Error: No se pudo identificar tu ID de músico en el sistema. Contacta a RRHH.";
        } else {
            // Buscamos en 'seating_asignaciones' donde el array 'id_musicos_asignados' contenga al integrante
            const { data: seating } = await supabase
              .from('seating_asignaciones')
              .select(`
                id_obra,
                programas_repertorios (
                    nombre, 
                    programas (nombre_gira, fecha_desde)
                )
              `)
              .contains('id_musicos_asignados', [integranteId])
              .limit(10);
              
            toolResult = JSON.stringify(seating || "No tienes asignaciones registradas.");
        }
      }
      
      else if (toolCall.function.name === "search_works") {
        const args = JSON.parse(toolCall.function.arguments);
        const { data } = await supabase
            .from('obras')
            .select('titulo, compositores(apellido), instrumentacion')
            .ilike('titulo', `%${args.query}%`)
            .limit(5);
        toolResult = JSON.stringify(data || []);
      }

      // Segunda llamada
      const finalRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          msg,
          { role: "tool", tool_call_id: toolCall.id, content: toolResult }
        ]
      });

      return new Response(JSON.stringify(finalRes.choices[0].message), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    return new Response(JSON.stringify(msg), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
