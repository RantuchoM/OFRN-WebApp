import { useQuery } from "@tanstack/react-query";
import { supabase } from "../services/supabase";
import { isBirthdayToday } from "../utils/birthdayUtils";

export function useBirthdaysToday() {
  const todayKey = new Date().toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["birthdays-today", todayKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrantes")
        .select("id, apellido, nombre, fecha_nac, fecha_baja, es_simulacion")
        .eq("condicion", "Estable")
        .not("fecha_nac", "is", null);

      if (error) throw error;

      return (data || [])
        .filter((m) => !m.es_simulacion)
        .filter((m) => !m.fecha_baja || m.fecha_baja >= todayKey)
        .filter((m) => isBirthdayToday(m.fecha_nac))
        .sort((a, b) =>
          (a.apellido || "").localeCompare(b.apellido || "", "es"),
        );
    },
    staleTime: 1000 * 60 * 60,
  });
}
