import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export function useViaticosMasivos(supabase, giraId) {
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(false);

    // Estados de feedback visual específicos para el panel masivo
    const [locUpdatingFields, setLocUpdatingFields] = useState(new Set());
    const [locSuccessFields, setLocSuccessFields] = useState(new Set());
    const [locErrorFields, setLocErrorFields] = useState(new Set());

    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from("giras_destaques_config")
                .select("*")
                .eq("id_gira", giraId);
            
            const locMap = {};
            data?.forEach((c) => {
                locMap[c.id_localidad] = c;
            });
            setConfigs(locMap);
        } catch (error) {
            console.error("Error fetching location configs:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase, giraId]);

    // Cargar al montar o cambiar giraId
    useEffect(() => {
        if (giraId) fetchConfigs();
    }, [giraId, fetchConfigs]);

    const updateLocationConfig = async (locationId, dataPayload) => {
        // En este caso dataPayload es un objeto completo con los campos a actualizar
        // o si queremos actualizar campo por campo, adaptamos.
        // Asumimos que dataPayload viene como { field: value } o múltiples campos.
        
        // Pero espera, DestaquesLocationPanel suele mandar (idConfig, { ...campos }) o (idLocalidad, { ...campos }).
        // Vamos a asumir que recibimos el ID de la CONFIGURACIÓN DE LOCALIDAD (row id), no el id_localidad, 
        // O BIEN recibimos el id_localidad y buscamos la config. 
        // Para ser consistente con el panel anterior, el panel enviaba: onSaveConfig(locationId, data)
        
        // Vamos a soportar actualización optimista campo por campo si dataPayload tiene 1 llave, 
        // o masiva si tiene varias.
        
        const configEntry = configs[locationId]; // Accedemos por ID de localidad
        if (!configEntry) {
            console.error("No config found for location", locationId);
            return;
        }

        const configId = configEntry.id;
        
        // Feedback visual para cada campo enviado
        Object.keys(dataPayload).forEach(field => {
            const key = `${locationId}-${field}`;
            setLocUpdatingFields(prev => new Set(prev).add(key));
            setLocSuccessFields(prev => { const n = new Set(prev); n.delete(key); return n; });
        });

        // Update Optimista Local
        setConfigs(prev => ({
            ...prev,
            [locationId]: { ...prev[locationId], ...dataPayload }
        }));

        try {
            const { error } = await supabase
                .from("giras_destaques_config")
                .update(dataPayload)
                .eq("id", configId);

            if (error) throw error;

            // Éxito visual
            Object.keys(dataPayload).forEach(field => {
                const key = `${locationId}-${field}`;
                setLocSuccessFields(prev => new Set(prev).add(key));
                setTimeout(() => {
                    setLocSuccessFields(prev => { const n = new Set(prev); n.delete(key); return n; });
                }, 2000);
            });

        } catch (err) {
            console.error("Error updating location config:", err);
            toast.error("Error al guardar configuración masiva");
             // Revertir (necesitaríamos el estado anterior, por ahora solo avisamos)
             fetchConfigs(); // Recargar para asegurar consistencia
        } finally {
            Object.keys(dataPayload).forEach(field => {
                const key = `${locationId}-${field}`;
                setLocUpdatingFields(prev => { const n = new Set(prev); n.delete(key); return n; });
            });
        }
    };

    return {
        configs,
        loading,
        fetchConfigs,
        updateLocationConfig,
        feedback: { locUpdatingFields, locSuccessFields, locErrorFields }
    };
}