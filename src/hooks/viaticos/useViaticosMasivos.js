import { useState, useCallback, useEffect } from "react";

import { toast } from "sonner";

import { DESTAQUES_GENERAL_CONFIG_KEY } from "../../utils/destaquesConfigMerge";



export function useViaticosMasivos(supabase, giraId) {

    const [configs, setConfigs] = useState({});

    const [generalConfig, setGeneralConfig] = useState(null);

    const [loading, setLoading] = useState(false);



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

            let general = null;

            data?.forEach((c) => {

                if (c.id_localidad == null) {

                    general = c;

                } else {

                    locMap[String(c.id_localidad)] = c;

                }

            });

            setGeneralConfig(general);

            setConfigs(locMap);

        } catch (error) {

            console.error("Error fetching location configs:", error);

        } finally {

            setLoading(false);

        }

    }, [supabase, giraId]);



    useEffect(() => {

        if (giraId) fetchConfigs();

    }, [giraId, fetchConfigs]);



    const updateLocationConfig = async (locationId, dataPayload) => {

        const isGeneral = locationId === DESTAQUES_GENERAL_CONFIG_KEY;



        if (!isGeneral && (locationId == null || locationId === "unknown")) {

            toast.error("No se puede guardar: la localidad no tiene ID válido.");

            return;

        }



        const locKey = isGeneral ? DESTAQUES_GENERAL_CONFIG_KEY : String(locationId);

        let configEntry = isGeneral

            ? generalConfig

            : (configs[locKey] ?? configs[locationId]);



        Object.keys(dataPayload).forEach((field) => {

            const key = `${locKey}-${field}`;

            setLocUpdatingFields((prev) => new Set(prev).add(key));

            setLocSuccessFields((prev) => {

                const n = new Set(prev);

                n.delete(key);

                return n;

            });

        });



        if (isGeneral) {

            setGeneralConfig((prev) => ({ ...(prev || {}), ...dataPayload }));

        } else {

            setConfigs((prev) => ({

                ...prev,

                [locKey]: { ...(prev[locKey] ?? prev[locationId] ?? {}), ...dataPayload },

            }));

        }



        try {

            let error;



            if (!configEntry?.id) {

                const insertPayload = {

                    id_gira: giraId,

                    ...dataPayload,

                };

                if (isGeneral) {

                    insertPayload.id_localidad = null;

                } else {

                    insertPayload.id_localidad = Number(locationId);

                }



                const { data: created, error: insertError } = await supabase

                    .from("giras_destaques_config")

                    .insert(insertPayload)

                    .select()

                    .single();



                error = insertError;

                if (!error && created) {

                    configEntry = created;

                    if (isGeneral) {

                        setGeneralConfig(created);

                    } else {

                        setConfigs((prev) => ({ ...prev, [locKey]: created }));

                    }

                }

            } else {

                const { error: updateError } = await supabase

                    .from("giras_destaques_config")

                    .update(dataPayload)

                    .eq("id", configEntry.id);



                error = updateError;

            }



            if (error) throw error;



            Object.keys(dataPayload).forEach((field) => {

                const key = `${locKey}-${field}`;

                setLocSuccessFields((prev) => new Set(prev).add(key));

                setTimeout(() => {

                    setLocSuccessFields((prev) => {

                        const n = new Set(prev);

                        n.delete(key);

                        return n;

                    });

                }, 2000);

            });

        } catch (err) {

            console.error("Error updating location config:", err);

            toast.error("Error al guardar configuración masiva");

            fetchConfigs();

        } finally {

            Object.keys(dataPayload).forEach((field) => {

                const key = `${locKey}-${field}`;

                setLocUpdatingFields((prev) => {

                    const n = new Set(prev);

                    n.delete(key);

                    return n;

                });

            });

        }

    };



    return {

        configs,

        generalConfig,

        loading,

        fetchConfigs,

        updateLocationConfig,

        feedback: { locUpdatingFields, locSuccessFields, locErrorFields },

    };

}


