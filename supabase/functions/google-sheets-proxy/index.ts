import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Usamos la librería oficial de Google para Node (compatible con Deno vía npm specifier)
import { google } from "npm:googleapis@126.0.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de Preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, spreadsheetId } = await req.json()

    // 1. Obtener credenciales desde los secretos de Supabase
    const serviceAccountStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!serviceAccountStr) {
      throw new Error('Falta la configuración GOOGLE_SERVICE_ACCOUNT en Supabase Secrets')
    }
    const serviceAccount = JSON.parse(serviceAccountStr)

    // 2. Autenticar con Google
    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    )
    
    await jwtClient.authorize()

    // 3. Obtener los datos reales
    const sheets = google.sheets({ version: 'v4', auth: jwtClient })
    
    // includeGridData: true es lo que trae colores, negritas y valores
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: true, 
      ranges: [], // Si lo dejas vacío trae la primera hoja o todas.
    })

    return new Response(JSON.stringify(response.data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})