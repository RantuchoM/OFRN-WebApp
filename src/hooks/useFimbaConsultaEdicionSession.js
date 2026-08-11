import { useEffect, useState } from "react";
import {
  FIMBA_CONSULTA_EDICION_EVENT,
  readFimbaConsultaEdicionSession,
} from "../utils/fimbaUserSession";

/** Hook reactivo sobre localStorage.fimba_consulta_edicion (enlace /fimba/c/:token). */
export function useFimbaConsultaEdicionSession() {
  const [session, setSession] = useState(() => readFimbaConsultaEdicionSession());

  useEffect(() => {
    const sync = () => setSession(readFimbaConsultaEdicionSession());
    window.addEventListener(FIMBA_CONSULTA_EDICION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FIMBA_CONSULTA_EDICION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return session;
}
