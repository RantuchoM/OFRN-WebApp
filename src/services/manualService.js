import { supabase } from './supabase';

export const manualService = {
  // --- LECTURA ---
  getAll: async () => {
    const { data, error } = await supabase
      .from('app_manual')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  getBySectionKey: async (sectionKey) => {
    const { data, error } = await supabase
      .from('app_manual')
      .select('*')
      .eq('section_key', sectionKey)
      .single();
    
    // Si no existe, no lanzamos error, devolvemos null para manejarlo suavemente
    if (error && error.code !== 'PGRST116') {
      console.warn("Error fetching manual section:", error);
    }
    return data || null;
  },

  // --- ESCRITURA ---
  create: async (payload) => {
    // 1. LIMPIEZA CRÍTICA: Quitamos 'id' si es null para que Postgres genere el UUID
    const { id, ...cleanPayload } = payload;

    // 2. Fallback para section_key
    if (!cleanPayload.section_key) {
      cleanPayload.section_key = `key_${Date.now()}`;
    }

    const { data, error } = await supabase
      .from('app_manual')
      .insert([cleanPayload]) // Enviamos el objeto sin la propiedad 'id'
      .select();

    if (error) throw error;
    return data[0];
  },

  update: async (id, payload) => {
    const { data, error } = await supabase
      .from('app_manual')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('app_manual')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },
  // --- NUEVA FUNCIÓN PARA REORDENAR ---
  updateBatchOrder: async (itemsToUpdate) => {
    // Usamos Promise.all para actualizar uno por uno. 
    // Es más seguro que upsert cuando hay campos obligatorios que no estamos enviando.
    const promises = itemsToUpdate.map(item => 
      supabase
        .from('app_manual')
        .update({ sort_order: item.sort_order }) // Solo tocamos el orden
        .eq('id', item.id)
    );

    const results = await Promise.all(promises);
    
    // Verificar si hubo algún error en alguna de las peticiones
    const error = results.find(r => r.error)?.error;
    if (error) throw error;
    
    return true;
  }
};