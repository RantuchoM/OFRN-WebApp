import { useQuery } from "@tanstack/react-query";
import { supabase } from "../services/supabase";
import {
  getDaysUntilBirthday,
  getLocalDateKey,
  getNextBirthdayDate,
} from "../utils/birthdayUtils";

export function useUpcomingBirthdays(daysAhead = 30) {
  const today = new Date();
  const todayKey = getLocalDateKey(today);

  return useQuery({
    queryKey: ["birthdays-upcoming", todayKey, daysAhead],
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
        .map((m) => ({
          ...m,
          daysUntil: getDaysUntilBirthday(m.fecha_nac, today),
          nextBirthdayDate: getNextBirthdayDate(m.fecha_nac, today),
        }))
        .filter((m) => m.daysUntil !== null && m.daysUntil <= daysAhead)
        .sort((a, b) => {
          if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
          const lastName = (a.apellido || "").localeCompare(
            b.apellido || "",
            "es",
          );
          if (lastName !== 0) return lastName;
          return (a.nombre || "").localeCompare(b.nombre || "", "es");
        });
    },
    staleTime: 1000 * 60 * 60,
  });
}
