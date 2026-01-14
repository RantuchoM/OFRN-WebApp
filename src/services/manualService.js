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
  },
  getNavigationContext: async (currentId) => {
    // 1. Traemos todo PERO solo las columnas ligeras (sin 'content')
    const { data, error } = await supabase
      .from('app_manual')
      .select('id, title, category, parent_id, sort_order, section_key')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) return null;

    // 2. Aplanamos la lista respetando la jerarquía (Padre -> Hijos)
    const flatList = [];
    const tree = {};

    // Agrupar por categorías
    data.forEach(item => {
      if (!tree[item.category]) tree[item.category] = { roots: [], orphans: [] };
      if (!item.parent_id) tree[item.category].roots.push({ ...item, children: [] });
      else tree[item.category].orphans.push(item);
    });

    // Construir lista plana ordenada
    Object.keys(tree).forEach(cat => {
      const catData = tree[cat];
      
      // Asignar hijos
      catData.orphans.forEach(child => {
        const parent = catData.roots.find(r => r.id === child.parent_id);
        if (parent) parent.children.push(child);
      });

      // Ordenar y aplanar
      catData.roots.sort((a, b) => a.sort_order - b.sort_order);
      catData.roots.forEach(root => {
        flatList.push(root); // Añadir Padre
        // Ordenar hijos y añadirlos inmediatamente después del padre
        root.children.sort((a, b) => a.sort_order - b.sort_order);
        root.children.forEach(child => flatList.push(child));
      });
    });

    // 3. Buscar vecinos
    const currentIndex = flatList.findIndex(i => i.id === currentId);
    if (currentIndex === -1) return null;

    return {
      prev: flatList[currentIndex - 1] || null,
      next: flatList[currentIndex + 1] || null,
      parent: flatList.find(i => i.id === flatList[currentIndex].parent_id) || null
    };
  }
};