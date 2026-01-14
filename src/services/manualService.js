import { supabase } from "./supabase";

export const manualService = {
  // Obtener lista plana (la recursividad la haremos en el frontend para no matar la DB)
  getAll: async () => {
    const { data, error } = await supabase
      .from("app_manual")
      .select("*")
      .order("sort_order", { ascending: true }); // Orden relativo base

    if (error) throw error;
    return data;
  },

  getBySectionKey: async (sectionKey) => {
    const { data, error } = await supabase
      .from("app_manual")
      .select("*")
      .eq("section_key", sectionKey)
      .single();
    if (error && error.code !== "PGRST116") console.warn(error);
    return data || null;
  },

  // --- CRUD BÁSICO ---
  create: async (payload) => {
    const { id, ...cleanPayload } = payload;
    // Si no tiene padre, asumimos que la "Categoría" es el título mismo (o General)
    if (!cleanPayload.category) {
      cleanPayload.category = "General"; // Fallback para compatibilidad
    }

    if (!cleanPayload.section_key)
      cleanPayload.section_key = `key_${Date.now()}`;

    const { data, error } = await supabase
      .from("app_manual")
      .insert([cleanPayload])
      .select();
    if (error) throw error;
    return data[0];
  },

  update: async (id, payload) => {
    const { data, error } = await supabase
      .from("app_manual")
      .update(payload)
      .eq("id", id)
      .select();
    if (error) throw error;
    return data[0];
  },

  delete: async (id) => {
    // Supabase debería tener ON DELETE CASCADE configurado en la FK parent_id
    // Si no, esto fallará si tiene hijos.
    // Por seguridad, primero borramos hijos (recursividad simple o confiar en DB)
    const { error } = await supabase.from("app_manual").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  // --- ACTUALIZACIÓN DE MOVIMIENTOS ---
  // Esta función recibe el item movido y sus nuevas coordenadas
  moveItem: async (itemId, newParentId, newSortOrder) => {
    const { error } = await supabase
      .from("app_manual")
      .update({
        parent_id: newParentId,
        sort_order: newSortOrder,
        // Opcional: Actualizar category string por compatibilidad,
        // aunque ya no la usaremos para lógica.
      })
      .eq("id", itemId);

    if (error) throw error;
    return true;
  },
  // --- NAVEGACIÓN CONTEXTUAL (ÁRBOL INFINITO) ---
  // --- NAVEGACIÓN CONTEXTUAL ---
  getNavigationContext: async (currentId) => {
    // 1. Traemos todo
    const { data, error } = await supabase
      .from("app_manual")
      .select("id, title, parent_id, sort_order, section_key, category")
      .order("sort_order", { ascending: true });

    if (error) return null;

    // 2. Construir árbol recursivo
    const buildTree = (items) => {
      const map = {};
      const roots = [];

      items.forEach((item) => {
        map[item.id] = { ...item, children: [] };
      });

      items.forEach((item) => {
        if (item.parent_id && map[item.parent_id]) {
          map[item.parent_id].children.push(map[item.id]);
        } else {
          roots.push(map[item.id]);
        }
      });

      const sortNodes = (nodes) => {
        nodes.sort((a, b) => a.sort_order - b.sort_order);
        nodes.forEach((node) => {
          if (node.children.length > 0) sortNodes(node.children);
        });
      };

      sortNodes(roots);
      return { roots, map };
    };

    const { map, roots } = buildTree(data);

    // 3. Aplanar para prev/next
    const flatList = [];
    const flatten = (nodes) => {
      nodes.forEach((node) => {
        flatList.push(node);
        if (node.children.length > 0) flatten(node.children);
      });
    };
    flatten(roots);

    const currentIndex = flatList.findIndex((i) => i.id === currentId);

    // 4. Breadcrumbs
    const breadcrumbs = [];
    let currentParentId = map[currentId]?.parent_id;
    while (currentParentId && map[currentParentId]) {
      breadcrumbs.unshift(map[currentParentId]);
      currentParentId = map[currentParentId].parent_id;
    }

    // --- 5. NUEVO: OBTENER HIJOS DIRECTOS ---
    // Como el mapa ya tiene los 'children' poblados y ordenados, es directo:
    const currentItemNode = map[currentId];
    const directChildren = currentItemNode ? currentItemNode.children : [];

    return {
      prev: flatList[currentIndex - 1] || null,
      next: flatList[currentIndex + 1] || null,
      breadcrumbs: breadcrumbs,
      children: directChildren, // <--- Agregamos esto
    };
  },
  getUiSettings: async (userId) => {
    // userId aquí será un número (ej: 154), no un UUID
    const { data, error } = await supabase
      .from("user_ui_settings")
      .select("hide_manual_triggers")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.warn("Error cargando preferencias UI:", error.message);
      return null;
    }

    // Si no existe registro, devolvemos el default: NO ocultar (mostrar todo)
    if (!data) return { hide_manual_triggers: false };

    return data;
  },

  toggleTriggersVisibility: async (userId, hide) => {
    // Usamos UPSERT. Si el usuario no tiene config, la crea. Si tiene, la actualiza.
    const { data, error } = await supabase
      .from("user_ui_settings")
      .upsert({
        user_id: userId,
        hide_manual_triggers: hide,
        updated_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
