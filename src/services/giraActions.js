import { supabase } from './supabase';

/**
 * Llama a la Edge Function 'manage-gira' para trasladar la gira.
 */
export const moveGira = async (giraId, newStartDate) => {
    try {
        console.log("Invocando Edge Function para mover gira...");
        const { data, error } = await supabase.functions.invoke('manage-gira', {
            body: { 
                action: 'move',
                giraId: giraId, 
                newStartDate: newStartDate 
            }
        });

        if (error) throw error;
        // Supabase functions a veces devuelve data: { error: "..." } en lugar de throw
        if (data && data.error) throw new Error(data.error);

        return { success: true, message: data.message };

    } catch (error) {
        console.error("Error moving gira (Edge Function):", error);
        return { success: false, error: error.message || "Error desconocido" };
    }
};

/**
 * Llama a la Edge Function 'manage-gira' para duplicar la gira.
 */
export const duplicateGira = async (giraId, newStartDate, newName) => {
    try {
        console.log("Invocando Edge Function para duplicar gira...");
        const { data, error } = await supabase.functions.invoke('manage-gira', {
            body: { 
                action: 'duplicate',
                giraId: giraId, 
                newStartDate: newStartDate,
                newName: newName
            }
        });

        if (error) throw error;
        if (data && data.error) {
            // Manejo específico para el código de duplicado si la función lo devuelve
            if (data.error.includes('duplicate key') || data.error.includes('already exists')) {
                 return { success: false, error: 'DUPLICATE_NAME' };
            }
            throw new Error(data.error);
        }

        return { success: true, data: data.data };

    } catch (error) {
        console.error("Error duplicating gira (Edge Function):", error);
        return { success: false, error: error.message || "Error desconocido" };
    }
};

export const deleteGira = async (giraId) => {
    try {
        console.log("Invocando Edge Function para ELIMINAR gira...", giraId);
        
        const { data, error } = await supabase.functions.invoke('manage-gira', {
            body: { 
                action: 'delete',
                giraId: giraId
                // No necesitamos newStartDate ni newName aquí
            }
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);

        return { success: true, message: "Gira eliminada correctamente" };

    } catch (error) {
        console.error("Error deleting gira (Edge Function):", error);
        return { success: false, error: error.message || "Error desconocido" };
    }
};