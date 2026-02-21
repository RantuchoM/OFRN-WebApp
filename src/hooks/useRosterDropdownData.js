import { useState, useEffect, useCallback } from "react";

/**
 * Carga los datos necesarios para los dropdowns del roster de gira:
 * ensambles, instrumentos, familias (derivadas de instrumentos), localidades, roles.
 * @param {object} supabase - Cliente Supabase
 * @returns {{
 *   ensemblesList: Array<{ value: string|number, label: string }>,
 *   instrumentsList: Array<{ id, instrumento, familia }>,
 *   familiesList: Array<{ value: string, label: string }>,
 *   localitiesList: Array<{ id, localidad }>,
 *   rolesList: Array<{ id, color, orden }>,
 *   loading: boolean,
 *   refetch: () => Promise<void>
 * }}
 */
export function useRosterDropdownData(supabase) {
  const [ensemblesList, setEnsemblesList] = useState([]);
  const [instrumentsList, setInstrumentsList] = useState([]);
  const [familiesList, setFamiliesList] = useState([]);
  const [localitiesList, setLocalitiesList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDropdownData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [
        { data: ens },
        { data: inst },
        { data: locs },
        { data: rolesData },
      ] = await Promise.all([
        supabase.from("ensambles").select("id, ensamble").order("ensamble"),
        supabase
          .from("instrumentos")
          .select("id, instrumento, familia")
          .order("instrumento"),
        supabase.from("localidades").select("id, localidad").order("localidad"),
        supabase
          .from("roles")
          .select("id, color, orden")
          .order("orden", { ascending: true }),
      ]);

      if (ens) {
        setEnsemblesList(ens.map((e) => ({ value: e.id, label: e.ensamble })));
      }
      if (inst) {
        setInstrumentsList(inst);
        const fams = [...new Set(inst.map((i) => i.familia).filter(Boolean))];
        setFamiliesList(fams.map((f) => ({ value: f, label: f })));
      }
      if (locs) setLocalitiesList(locs);
      if (rolesData) setRolesList(rolesData);
    } catch (err) {
      console.error("useRosterDropdownData:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  return {
    ensemblesList,
    instrumentsList,
    familiesList,
    localitiesList,
    rolesList,
    loading: loading,
    refetch: fetchDropdownData,
  };
}
