import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; 
// CONFIGURACIÓN
const VIEWS_DIR = './src/views'; 

// MAPEO DE ARCHIVOS -> RUTAS LÓGICAS
// La IA usará la 'clave' para encontrar el archivo y el 'valor' para saber dónde está el usuario
const ROUTE_MAP = {
  // --- MÓDULO DE REPERTORIO ---
  'Repertoire/RepertoireView.jsx': '/repertorio',
  'Repertoire/ComposersManager.jsx': '/compositores',
  'Repertoire/TagsManager.jsx': '/etiquetas', // Gestión de etiquetas/tags
  
  // --- MÓDULO DE GIRAS Y PROGRAMACIÓN ---
  'Giras/GirasView.jsx': '/giras',
  'Giras/LogisticsDashboard.jsx': '/logistica', // Dashboard de logística
  'Giras/Viaticos/ViaticosManager.jsx': '/viaticos', // Gestión específica de viáticos
  
  // --- MÓDULO DE PERSONAS (RRHH) ---
  'Users/UsersManager.jsx': '/usuarios', // Usuarios del sistema (staff)
  'Musicians/MusiciansView.jsx': '/musicos', // Base de datos de músicos (integrantes)
  
  // --- RECURSOS Y CONFIGURACIÓN ---
  'Locations/LocationsView.jsx': '/lugares', // Sedes y lugares
  'Ensembles/EnsemblesView.jsx': '/ensambles', // Formaciones/Ensambles
  'Data/DataView.jsx': '/datos', // Importación/Exportación de datos masivos
  
  // --- GENERAL Y SISTEMA ---
  'Dashboard/DashboardGeneral.jsx': '/', // Pantalla de inicio (Home)
  'Feedback/FeedbackAdmin.jsx': '/feedback', // Admin de feedback
  'Manual/ManualIndex.jsx': '/manual', // El manual interno
  'LoginView/LoginView.jsx': '/login'
};

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateManual() {
  console.log("🤖 Generando documentación en tabla 'app_docs'...");

  for (const [filePath, routeName] of Object.entries(ROUTE_MAP)) {
    const fullPath = path.join(VIEWS_DIR, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Archivo no encontrado: ${fullPath}`);
      continue;
    }

    console.log(`📄 Analizando ${filePath}...`);
    const code = fs.readFileSync(fullPath, 'utf-8');

    const prompt = `
      Analiza este código React. Genera un resumen MUY BREVE (máx 5 lineas) explicando QUÉ puede hacer el usuario en esta pantalla.
      Destaca botones importantes, filtros y acciones clave.
      Código:
      ${code.substring(0, 15000)}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const description = response.choices[0].message.content;

      // GUARDAR EN LA NUEVA TABLA 'app_docs'
      const { error } = await supabase
        .from('app_docs') // <--- CAMBIO AQUÍ
        .upsert({ 
            route: routeName,       // Columna nueva
            content: description,   // Columna nueva
            updated_at: new Date()
        }, { onConflict: 'route' });

      if (error) throw error;
      console.log(`✅ Documentación actualizada para: ${routeName}`);
      
    } catch (err) {
      console.error(`❌ Error en ${routeName}:`, err.message);
    }
  }
}

generateManual();